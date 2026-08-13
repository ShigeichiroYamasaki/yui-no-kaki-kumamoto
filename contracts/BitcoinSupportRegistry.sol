// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {TamagakiSBT} from "./TamagakiSBT.sol";

/// @title BitcoinSupportRegistry
/// @notice Threshold-attests native Bitcoin or Lightning support and mints its Tamagaki SBT on Base.
/// @dev This contract never receives BTC and must never be given Bitcoin, Lightning, or treasury signing keys.
contract BitcoinSupportRegistry is AccessControl, Pausable, EIP712 {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 public constant SUPPORT_INTENT_TYPEHASH = keccak256(
        "SupportIntent(uint8 route,uint256 amount,address recipient,bytes32 publicMetadataHash,uint64 expiresAt,bytes32 nonce)"
    );
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(bytes32 intentHash,uint8 route,bytes32 sourceId,uint32 sourceIndex,uint256 amount,uint64 verifierEpoch,uint64 observedAt,uint64 confirmationReference)"
    );

    enum Route {
        Bitcoin,
        Lightning
    }

    enum Status {
        None,
        Accepted,
        SBTIssued,
        Invalidated
    }

    struct SupportIntent {
        Route route;
        uint256 amount;
        address recipient;
        bytes32 publicMetadataHash;
        uint64 expiresAt;
        bytes32 nonce;
    }

    struct Attestation {
        bytes32 intentHash;
        Route route;
        bytes32 sourceId;
        uint32 sourceIndex;
        uint256 amount;
        uint64 verifierEpoch;
        uint64 observedAt;
        uint64 confirmationReference;
    }

    struct ArtworkInput {
        string displayName;
        string dedicationMessage;
        bool showAmount;
    }

    struct SupportRecord {
        Route route;
        bytes32 sourceId;
        uint32 sourceIndex;
        uint256 amount;
        address recipient;
        bytes32 publicMetadataHash;
        uint64 observedAt;
        uint64 confirmationReference;
        uint64 verifierEpoch;
        uint256 tokenId;
        Status status;
    }

    TamagakiSBT public immutable tamagakiSBT;
    uint256 public immutable expectedChainId;
    uint256 public threshold;
    uint64 public verifierEpoch = 1;

    mapping(address verifier => bool active) public isVerifier;
    address[] private _verifiers;
    mapping(bytes32 intentHash => SupportRecord record) private _records;
    mapping(bytes32 evidenceKey => bytes32 intentHash) public intentByEvidence;
    mapping(bytes32 nonce => bool used) public usedNonce;

    error WrongChain(uint256 expected, uint256 actual);
    error InvalidConfiguration();
    error InvalidIntent();
    error IntentExpired();
    error InvalidSupporterSignature();
    error InvalidAttestation();
    error InsufficientAttestations(uint256 supplied, uint256 required);
    error InvalidVerifier(address signer);
    error SignersNotStrictlyOrdered();
    error DuplicateEvidence(bytes32 evidenceKey);
    error DuplicateNonce(bytes32 nonce);
    error UnknownSupport(bytes32 intentHash);
    error AlreadyInvalidated(bytes32 intentHash);

    event VerifierSetUpdated(uint64 indexed verifierEpoch, uint256 threshold, address[] verifiers);
    event SupportAttested(
        bytes32 indexed intentHash,
        Route indexed route,
        bytes32 indexed sourceId,
        uint32 sourceIndex,
        uint256 amount,
        address recipient,
        uint64 observedAt,
        uint64 confirmationReference,
        uint64 verifierEpoch
    );
    event BitcoinTamagakiIssued(bytes32 indexed intentHash, uint256 indexed tokenId, address indexed recipient);
    event SupportInvalidated(bytes32 indexed intentHash, uint256 indexed tokenId, bytes32 reasonHash);

    constructor(
        address admin,
        TamagakiSBT sbt,
        uint256 initialThreshold,
        address[] memory initialVerifiers,
        uint256 chainId
    ) EIP712("Kumamoto Bitcoin Support", "2") {
        if (admin == address(0) || address(sbt) == address(0)) revert InvalidConfiguration();
        if (chainId != 0 && block.chainid != chainId) revert WrongChain(chainId, block.chainid);
        tamagakiSBT = sbt;
        expectedChainId = chainId;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _replaceVerifierSet(initialVerifiers, initialThreshold, false);
    }

    function attestAndMint(
        SupportIntent calldata intent,
        bytes calldata supporterSignature,
        Attestation calldata attestation,
        bytes[] calldata verifierSignatures,
        ArtworkInput calldata artwork
    ) external whenNotPaused returns (uint256 tokenId) {
        if (intent.recipient == address(0) || intent.amount == 0 || intent.nonce == bytes32(0)) {
            revert InvalidIntent();
        }
        bytes32 intentHash = hashIntent(intent);
        if (!SignatureChecker.isValidSignatureNow(intent.recipient, intentHash, supporterSignature)) {
            revert InvalidSupporterSignature();
        }
        if (usedNonce[intent.nonce]) revert DuplicateNonce(intent.nonce);
        if (
            attestation.intentHash != intentHash || attestation.verifierEpoch != verifierEpoch
                || attestation.route != intent.route || attestation.sourceId == bytes32(0)
                || attestation.amount != intent.amount || attestation.observedAt == 0
                || attestation.confirmationReference == 0
        ) revert InvalidAttestation();
        if (attestation.observedAt > intent.expiresAt) revert IntentExpired();
        if (attestation.route == Route.Lightning && attestation.sourceIndex != 0) revert InvalidAttestation();
        bytes32 evidenceKey = evidenceKeyFor(attestation.route, attestation.sourceId, attestation.sourceIndex);
        if (intentByEvidence[evidenceKey] != bytes32(0)) revert DuplicateEvidence(evidenceKey);
        _verifyAttestations(attestation, verifierSignatures);

        bytes32 artworkHash = keccak256(
            abi.encode(artwork.displayName, artwork.dedicationMessage, artwork.showAmount)
        );
        if (artworkHash != intent.publicMetadataHash) revert InvalidIntent();

        usedNonce[intent.nonce] = true;
        intentByEvidence[evidenceKey] = intentHash;
        _storeAccepted(intentHash, intent, attestation);
        tokenId = _mintTamagaki(intentHash, intent, artwork);
        _records[intentHash].tokenId = tokenId;
        _records[intentHash].status = Status.SBTIssued;

        _emitSupportAttested(intentHash, intent, attestation);
        emit BitcoinTamagakiIssued(intentHash, tokenId, intent.recipient);
    }

    function invalidate(bytes32 intentHash, bytes32 reasonHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        SupportRecord storage record = _records[intentHash];
        if (record.status == Status.None) revert UnknownSupport(intentHash);
        if (record.status == Status.Invalidated) revert AlreadyInvalidated(intentHash);
        record.status = Status.Invalidated;
        tamagakiSBT.updateStatus(record.tokenId, TamagakiSBT.SupportStatus.Invalidated);
        emit SupportInvalidated(intentHash, record.tokenId, reasonHash);
    }

    function replaceVerifierSet(address[] calldata newVerifiers, uint256 newThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _replaceVerifierSet(newVerifiers, newThreshold, true);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function hashIntent(SupportIntent calldata intent) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SUPPORT_INTENT_TYPEHASH,
                    intent.route,
                    intent.amount,
                    intent.recipient,
                    intent.publicMetadataHash,
                    intent.expiresAt,
                    intent.nonce
                )
            )
        );
    }

    function hashAttestation(Attestation calldata attestation) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTESTATION_TYPEHASH,
                    attestation.intentHash,
                    attestation.route,
                    attestation.sourceId,
                    attestation.sourceIndex,
                    attestation.amount,
                    attestation.verifierEpoch,
                    attestation.observedAt,
                    attestation.confirmationReference
                )
            )
        );
    }

    function evidenceKeyFor(Route route, bytes32 sourceId, uint32 sourceIndex) public pure returns (bytes32) {
        return keccak256(abi.encode(route, sourceId, sourceIndex));
    }

    function support(bytes32 intentHash) external view returns (SupportRecord memory) {
        SupportRecord memory record = _records[intentHash];
        if (record.status == Status.None) revert UnknownSupport(intentHash);
        return record;
    }

    function verifiers() external view returns (address[] memory) {
        return _verifiers;
    }

    function _verifyAttestations(Attestation calldata attestation, bytes[] calldata signatures) private view {
        if (signatures.length < threshold) revert InsufficientAttestations(signatures.length, threshold);
        bytes32 digest = hashAttestation(attestation);
        address previous;
        for (uint256 i; i < signatures.length; ++i) {
            address signer = ECDSA.recover(digest, signatures[i]);
            if (signer <= previous) revert SignersNotStrictlyOrdered();
            if (!isVerifier[signer]) revert InvalidVerifier(signer);
            previous = signer;
        }
    }

    function _storeAccepted(
        bytes32 intentHash,
        SupportIntent calldata intent,
        Attestation calldata attestation
    ) private {
        _records[intentHash] = SupportRecord({
            route: attestation.route,
            sourceId: attestation.sourceId,
            sourceIndex: attestation.sourceIndex,
            amount: attestation.amount,
            recipient: intent.recipient,
            publicMetadataHash: intent.publicMetadataHash,
            observedAt: attestation.observedAt,
            confirmationReference: attestation.confirmationReference,
            verifierEpoch: verifierEpoch,
            tokenId: 0,
            status: Status.Accepted
        });
    }

    function _mintTamagaki(bytes32 intentHash, SupportIntent calldata intent, ArtworkInput calldata artwork)
        private
        returns (uint256)
    {
        return tamagakiSBT.mintWithMetadata(
            intent.recipient,
            intentHash,
            intent.publicMetadataHash,
            artwork.displayName,
            artwork.dedicationMessage,
            intent.route == Route.Bitcoin ? "BTC" : "BTC-LN",
            intent.amount,
            intent.route == Route.Bitcoin ? 8 : 11,
            artwork.showAmount
        );
    }

    function _emitSupportAttested(
        bytes32 intentHash,
        SupportIntent calldata intent,
        Attestation calldata attestation
    ) private {
        emit SupportAttested(
            intentHash,
            attestation.route,
            attestation.sourceId,
            attestation.sourceIndex,
            attestation.amount,
            intent.recipient,
            attestation.observedAt,
            attestation.confirmationReference,
            verifierEpoch
        );
    }

    function _replaceVerifierSet(address[] memory newVerifiers, uint256 newThreshold, bool incrementEpoch) private {
        if (newThreshold == 0 || newThreshold > newVerifiers.length) revert InvalidConfiguration();
        for (uint256 i; i < _verifiers.length; ++i) isVerifier[_verifiers[i]] = false;
        delete _verifiers;
        for (uint256 i; i < newVerifiers.length; ++i) {
            address verifier = newVerifiers[i];
            if (verifier == address(0) || isVerifier[verifier]) revert InvalidConfiguration();
            isVerifier[verifier] = true;
            _verifiers.push(verifier);
        }
        threshold = newThreshold;
        if (incrementEpoch) ++verifierEpoch;
        emit VerifierSetUpdated(verifierEpoch, newThreshold, newVerifiers);
    }
}
