// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TamagakiSBT} from "./TamagakiSBT.sol";

/// @title RecoverySupportVault
/// @notice Receives approved assets and can forward them only to the designated Kumamoto beneficiary.
contract RecoverySupportVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UNPAUSER_ROLE = keccak256("UNPAUSER_ROLE");
    address public constant NATIVE_ASSET = address(0);
    uint64 public constant BENEFICIARY_CHANGE_DELAY = 2 days;

    TamagakiSBT public immutable tamagakiSBT;
    address public beneficiary;
    address public pendingBeneficiary;
    uint64 public beneficiaryExecutableAt;
    uint256 public supportNonce;

    mapping(address asset => bool allowed) public allowedAsset;
    struct AssetPolicy {
        uint256 balanceCap;
        uint256 batchCap;
        uint256 dailyCap;
        bytes32 codeHash;
        bytes32 symbolHash;
        uint8 decimals;
    }
    mapping(address asset => AssetPolicy policy) public assetPolicy;
    mapping(address asset => uint256 amount) public totalReceived;
    mapping(address asset => mapping(uint256 day => uint256 amount)) public dailyOutflow;
    mapping(bytes32 supportId => bool exists) public supportExists;
    mapping(bytes32 batchId => bool transferred) public transferredBatch;
    mapping(bytes32 batchId => bytes32 root) public batchSupportRoot;
    mapping(bytes32 batchId => bytes32 hash) public batchInstructionHash;

    struct ArtworkInput {
        string displayName;
        string dedicationMessage;
        bool showAmount;
    }
    struct MetadataSupport {
        address supporter;
        address asset;
        uint256 amount;
        bytes32 countryCodeHash;
        bytes32 messageHash;
        address sbtRecipient;
        bytes32 publicMetadataHash;
        string assetLabel;
        uint8 assetDecimals;
    }

    error AssetNotAllowed(address asset);
    error ZeroAmount();
    error ZeroAddress();
    error DuplicateBatch(bytes32 batchId);
    error TransferFailed();
    error InvalidRecipient();
    error InvalidAssetContract(address asset);
    error AssetConfigurationChanged(address asset);
    error BalanceCapExceeded(address asset, uint256 balance, uint256 cap);
    error BatchCapExceeded(address asset, uint256 amount, uint256 cap);
    error DailyCapExceeded(address asset, uint256 amount, uint256 cap);
    error InvalidManifest();
    error ExpiredBatch(uint64 validUntil);
    error BeneficiaryDelayActive(uint64 executableAt);
    error NoPendingBeneficiary();

    event SupportReceived(
        bytes32 indexed supportId,
        address indexed supporter,
        address indexed asset,
        uint256 amount,
        bytes32 countryCodeHash,
        bytes32 messageHash,
        uint256 tokenId
    );
    event BatchTransferred(bytes32 indexed batchId, address indexed asset, uint256 amount, address indexed beneficiary);
    event AllowedAssetUpdated(address indexed asset, bool allowed);
    event AssetPolicyUpdated(
        address indexed asset, bool allowed, uint256 balanceCap, uint256 batchCap, uint256 dailyCap,
        bytes32 codeHash, bytes32 symbolHash, uint8 decimals
    );
    event BeneficiaryProposed(address indexed currentBeneficiary, address indexed proposedBeneficiary, uint64 executableAt);
    event BeneficiaryProposalCancelled(address indexed proposedBeneficiary);
    event BeneficiaryUpdated(address indexed previousBeneficiary, address indexed newBeneficiary);

    constructor(address admin, address beneficiary_, TamagakiSBT tamagakiSBT_) {
        if (admin == address(0) || beneficiary_ == address(0) || address(tamagakiSBT_) == address(0)) {
            revert ZeroAddress();
        }
        beneficiary = beneficiary_;
        tamagakiSBT = tamagakiSBT_;
        allowedAsset[NATIVE_ASSET] = true;
        assetPolicy[NATIVE_ASSET] = AssetPolicy(
            type(uint256).max, type(uint256).max, type(uint256).max, bytes32(0), bytes32(0), 18
        );
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(UNPAUSER_ROLE, admin);
    }

    function supportNative(
        bytes32 countryCodeHash,
        bytes32 messageHash,
        address sbtRecipient,
        bytes32 publicMetadataHash
    ) external payable whenNotPaused nonReentrant returns (bytes32 supportId, uint256 tokenId) {
        if (!allowedAsset[NATIVE_ASSET]) revert AssetNotAllowed(NATIVE_ASSET);
        if (msg.value == 0) revert ZeroAmount();
        _validateRecipient(sbtRecipient);
        _checkBalanceCap(NATIVE_ASSET, address(this).balance);
        (supportId, tokenId) = _recordSupport(
            msg.sender, NATIVE_ASSET, msg.value, countryCodeHash, messageHash, sbtRecipient, publicMetadataHash
        );
    }

    function supportERC20(
        IERC20 asset,
        uint256 amount,
        bytes32 countryCodeHash,
        bytes32 messageHash,
        address sbtRecipient,
        bytes32 publicMetadataHash
    ) external whenNotPaused nonReentrant returns (bytes32 supportId, uint256 tokenId) {
        if (amount == 0) revert ZeroAmount();
        _validateRecipient(sbtRecipient);
        _validateAsset(address(asset));
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = asset.balanceOf(address(this)) - beforeBalance;
        if (received == 0) revert ZeroAmount();
        _checkBalanceCap(address(asset), beforeBalance + received);
        (supportId, tokenId) = _recordSupport(
            msg.sender, address(asset), received, countryCodeHash, messageHash, sbtRecipient, publicMetadataHash
        );
    }

    function supportNativeWithMetadata(
        bytes32 countryCodeHash,
        bytes32 messageHash,
        address sbtRecipient,
        bytes32 publicMetadataHash,
        ArtworkInput calldata artworkInput
    ) external payable whenNotPaused nonReentrant returns (bytes32 supportId, uint256 tokenId) {
        if (!allowedAsset[NATIVE_ASSET]) revert AssetNotAllowed(NATIVE_ASSET);
        if (msg.value == 0) revert ZeroAmount();
        _validateRecipient(sbtRecipient);
        _checkBalanceCap(NATIVE_ASSET, address(this).balance);
        supportId = _createSupportId(msg.sender, NATIVE_ASSET, msg.value);
        MetadataSupport memory record = MetadataSupport(
            msg.sender, NATIVE_ASSET, msg.value, countryCodeHash, messageHash,
            sbtRecipient, publicMetadataHash, "ETH", 18
        );
        tokenId = _recordSupportWithMetadata(supportId, record, artworkInput);
    }

    function supportERC20WithMetadata(
        IERC20 asset,
        uint256 amount,
        bytes32 countryCodeHash,
        bytes32 messageHash,
        address sbtRecipient,
        bytes32 publicMetadataHash,
        ArtworkInput calldata artworkInput
    ) external whenNotPaused nonReentrant returns (bytes32 supportId, uint256 tokenId) {
        if (amount == 0) revert ZeroAmount();
        _validateRecipient(sbtRecipient);
        _validateAsset(address(asset));
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = asset.balanceOf(address(this)) - beforeBalance;
        if (received == 0) revert ZeroAmount();
        _checkBalanceCap(address(asset), beforeBalance + received);
        string memory symbol = IERC20Metadata(address(asset)).symbol();
        uint8 decimals = IERC20Metadata(address(asset)).decimals();
        supportId = _createSupportId(msg.sender, address(asset), received);
        MetadataSupport memory record = MetadataSupport(
            msg.sender, address(asset), received, countryCodeHash, messageHash,
            sbtRecipient, publicMetadataHash, symbol, decimals
        );
        tokenId = _recordSupportWithMetadata(supportId, record, artworkInput);
    }

    function transferBatch(
        bytes32 batchId,
        address asset,
        uint256 amount,
        bytes32 supportRoot,
        bytes32 instructionHash,
        uint64 validUntil
    )
        external
        onlyRole(TREASURER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (transferredBatch[batchId]) revert DuplicateBatch(batchId);
        if (amount == 0) revert ZeroAmount();
        if (supportRoot == bytes32(0) || instructionHash == bytes32(0)) revert InvalidManifest();
        if (block.timestamp > validUntil) revert ExpiredBatch(validUntil);
        _validateAsset(asset);
        AssetPolicy storage policy = assetPolicy[asset];
        if (amount > policy.batchCap) revert BatchCapExceeded(asset, amount, policy.batchCap);
        uint256 day = block.timestamp / 1 days;
        uint256 nextDailyOutflow = dailyOutflow[asset][day] + amount;
        if (nextDailyOutflow > policy.dailyCap) revert DailyCapExceeded(asset, nextDailyOutflow, policy.dailyCap);
        transferredBatch[batchId] = true;
        batchSupportRoot[batchId] = supportRoot;
        batchInstructionHash[batchId] = instructionHash;
        dailyOutflow[asset][day] = nextDailyOutflow;

        if (asset == NATIVE_ASSET) {
            (bool ok,) = beneficiary.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(asset).safeTransfer(beneficiary, amount);
        }
        emit BatchTransferred(batchId, asset, amount, beneficiary);
    }

    function configureAsset(address asset, bool allowed, uint256 balanceCap, uint256 batchCap, uint256 dailyCap)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (allowed && (balanceCap == 0 || batchCap == 0 || dailyCap == 0)) revert ZeroAmount();
        bytes32 codeHash;
        bytes32 symbolHash;
        uint8 decimals = 18;
        if (asset != NATIVE_ASSET) {
            codeHash = asset.codehash;
            if (codeHash == bytes32(0)) revert InvalidAssetContract(asset);
            string memory symbol = IERC20Metadata(asset).symbol();
            decimals = IERC20Metadata(asset).decimals();
            if (decimals > 18) revert AssetConfigurationChanged(asset);
            symbolHash = keccak256(bytes(symbol));
        }
        allowedAsset[asset] = allowed;
        assetPolicy[asset] = AssetPolicy(balanceCap, batchCap, dailyCap, codeHash, symbolHash, decimals);
        emit AllowedAssetUpdated(asset, allowed);
        emit AssetPolicyUpdated(asset, allowed, balanceCap, batchCap, dailyCap, codeHash, symbolHash, decimals);
    }

    function proposeBeneficiary(address newBeneficiary) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newBeneficiary == address(0)) revert ZeroAddress();
        pendingBeneficiary = newBeneficiary;
        beneficiaryExecutableAt = uint64(block.timestamp) + BENEFICIARY_CHANGE_DELAY;
        emit BeneficiaryProposed(beneficiary, newBeneficiary, beneficiaryExecutableAt);
    }

    function cancelBeneficiaryProposal() external onlyRole(DEFAULT_ADMIN_ROLE) {
        address proposed = pendingBeneficiary;
        if (proposed == address(0)) revert NoPendingBeneficiary();
        pendingBeneficiary = address(0);
        beneficiaryExecutableAt = 0;
        emit BeneficiaryProposalCancelled(proposed);
    }

    function executeBeneficiaryChange() external onlyRole(DEFAULT_ADMIN_ROLE) {
        address newBeneficiary = pendingBeneficiary;
        if (newBeneficiary == address(0)) revert NoPendingBeneficiary();
        if (block.timestamp < beneficiaryExecutableAt) revert BeneficiaryDelayActive(beneficiaryExecutableAt);
        address previous = beneficiary;
        beneficiary = newBeneficiary;
        pendingBeneficiary = address(0);
        beneficiaryExecutableAt = 0;
        emit BeneficiaryUpdated(previous, newBeneficiary);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(UNPAUSER_ROLE) {
        _unpause();
    }

    function _validateRecipient(address sbtRecipient) private view {
        if (sbtRecipient != address(0) && sbtRecipient != msg.sender) revert InvalidRecipient();
    }

    function _validateAsset(address asset) private view {
        if (!allowedAsset[asset]) revert AssetNotAllowed(asset);
        if (asset == NATIVE_ASSET) return;
        AssetPolicy storage policy = assetPolicy[asset];
        if (
            asset.codehash != policy.codeHash
                || IERC20Metadata(asset).decimals() != policy.decimals
                || keccak256(bytes(IERC20Metadata(asset).symbol())) != policy.symbolHash
        ) revert AssetConfigurationChanged(asset);
    }

    function _checkBalanceCap(address asset, uint256 balance) private view {
        uint256 cap = assetPolicy[asset].balanceCap;
        if (balance > cap) revert BalanceCapExceeded(asset, balance, cap);
    }

    function _recordSupport(
        address supporter,
        address asset,
        uint256 amount,
        bytes32 countryCodeHash,
        bytes32 messageHash,
        address sbtRecipient,
        bytes32 publicMetadataHash
    ) private returns (bytes32 supportId, uint256 tokenId) {
        supportId = _createSupportId(supporter, asset, amount);
        supportExists[supportId] = true;
        totalReceived[asset] += amount;
        if (sbtRecipient != address(0)) {
            tokenId = tamagakiSBT.mint(sbtRecipient, supportId, publicMetadataHash);
        }
        emit SupportReceived(
            supportId, supporter, asset, amount, countryCodeHash, messageHash, tokenId
        );
    }

    function _createSupportId(address supporter, address asset, uint256 amount) private returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), ++supportNonce, supporter, asset, amount));
    }

    function _recordSupportWithMetadata(
        bytes32 supportId,
        MetadataSupport memory record,
        ArtworkInput calldata artworkInput
    ) private returns (uint256 tokenId) {
        supportExists[supportId] = true;
        totalReceived[record.asset] += record.amount;
        if (record.sbtRecipient != address(0)) {
            tokenId = tamagakiSBT.mintWithMetadata(
                record.sbtRecipient, supportId, record.publicMetadataHash,
                artworkInput.displayName, artworkInput.dedicationMessage,
                record.assetLabel, record.amount, record.assetDecimals, artworkInput.showAmount
            );
        }
        emit SupportReceived(
            supportId, record.supporter, record.asset, record.amount,
            record.countryCodeHash, record.messageHash, tokenId
        );
    }
}
