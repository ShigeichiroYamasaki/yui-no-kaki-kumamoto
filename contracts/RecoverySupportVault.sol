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
    address public constant NATIVE_ASSET = address(0);

    TamagakiSBT public immutable tamagakiSBT;
    address public beneficiary;
    uint256 public supportNonce;

    mapping(address asset => bool allowed) public allowedAsset;
    mapping(address asset => uint256 amount) public totalReceived;
    mapping(bytes32 supportId => bool exists) public supportExists;
    mapping(bytes32 batchId => bool transferred) public transferredBatch;

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
    event BeneficiaryUpdated(address indexed previousBeneficiary, address indexed newBeneficiary);

    constructor(address admin, address beneficiary_, TamagakiSBT tamagakiSBT_) {
        if (admin == address(0) || beneficiary_ == address(0) || address(tamagakiSBT_) == address(0)) {
            revert ZeroAddress();
        }
        beneficiary = beneficiary_;
        tamagakiSBT = tamagakiSBT_;
        allowedAsset[NATIVE_ASSET] = true;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function supportNative(
        bytes32 countryCodeHash,
        bytes32 messageHash,
        address sbtRecipient,
        bytes32 publicMetadataHash
    ) external payable whenNotPaused nonReentrant returns (bytes32 supportId, uint256 tokenId) {
        if (!allowedAsset[NATIVE_ASSET]) revert AssetNotAllowed(NATIVE_ASSET);
        if (msg.value == 0) revert ZeroAmount();
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
        if (!allowedAsset[address(asset)]) revert AssetNotAllowed(address(asset));
        if (amount == 0) revert ZeroAmount();
        asset.safeTransferFrom(msg.sender, address(this), amount);
        (supportId, tokenId) = _recordSupport(
            msg.sender, address(asset), amount, countryCodeHash, messageHash, sbtRecipient, publicMetadataHash
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
        if (!allowedAsset[address(asset)]) revert AssetNotAllowed(address(asset));
        if (amount == 0) revert ZeroAmount();
        asset.safeTransferFrom(msg.sender, address(this), amount);
        string memory symbol = IERC20Metadata(address(asset)).symbol();
        uint8 decimals = IERC20Metadata(address(asset)).decimals();
        supportId = _createSupportId(msg.sender, address(asset), amount);
        MetadataSupport memory record = MetadataSupport(
            msg.sender, address(asset), amount, countryCodeHash, messageHash,
            sbtRecipient, publicMetadataHash, symbol, decimals
        );
        tokenId = _recordSupportWithMetadata(supportId, record, artworkInput);
    }

    function transferBatch(bytes32 batchId, address asset, uint256 amount)
        external
        onlyRole(TREASURER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (transferredBatch[batchId]) revert DuplicateBatch(batchId);
        if (amount == 0) revert ZeroAmount();
        transferredBatch[batchId] = true;

        if (asset == NATIVE_ASSET) {
            (bool ok,) = beneficiary.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(asset).safeTransfer(beneficiary, amount);
        }
        emit BatchTransferred(batchId, asset, amount, beneficiary);
    }

    function setAllowedAsset(address asset, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowedAsset[asset] = allowed;
        emit AllowedAssetUpdated(asset, allowed);
    }

    function setBeneficiary(address newBeneficiary) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newBeneficiary == address(0)) revert ZeroAddress();
        address previous = beneficiary;
        beneficiary = newBeneficiary;
        emit BeneficiaryUpdated(previous, newBeneficiary);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
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
