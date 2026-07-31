// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title TamagakiSBT
/// @notice Non-transferable proof that an address participated in Kumamoto recovery support.
/// @dev Implements the ERC-5192 locked(uint256) interface and deliberately stores no PII.
contract TamagakiSBT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes4 private constant ERC5192_INTERFACE_ID = 0xb45a3c0e;

    enum SupportStatus {
        Received,
        Included,
        Delivered,
        Reported,
        Invalidated
    }

    struct Tamagaki {
        bytes32 supportId;
        bytes32 publicMetadataHash;
        SupportStatus status;
    }

    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;
    mapping(uint256 tokenId => Tamagaki) private _tamagaki;
    mapping(bytes32 supportId => uint256 tokenId) public tokenBySupportId;

    error Soulbound();
    error DuplicateSupport(bytes32 supportId);
    error UnknownToken(uint256 tokenId);
    error StatusRegression();

    event Locked(uint256 tokenId);
    event SupportStatusUpdated(uint256 indexed tokenId, SupportStatus previousStatus, SupportStatus newStatus);
    event PublicMetadataHashUpdated(uint256 indexed tokenId, bytes32 previousHash, bytes32 newHash);

    constructor(address admin, string memory baseTokenURI) ERC721("Kumamoto Digital Tamagaki", "KDT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REPORTER_ROLE, admin);
        _baseTokenURI = baseTokenURI;
    }

    function mint(address recipient, bytes32 supportId, bytes32 publicMetadataHash)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        if (tokenBySupportId[supportId] != 0) revert DuplicateSupport(supportId);
        tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        _tamagaki[tokenId] = Tamagaki(supportId, publicMetadataHash, SupportStatus.Received);
        tokenBySupportId[supportId] = tokenId;
        emit Locked(tokenId);
    }

    function updateStatus(uint256 tokenId, SupportStatus newStatus) external onlyRole(REPORTER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        SupportStatus previous = _tamagaki[tokenId].status;
        if (newStatus != SupportStatus.Invalidated && uint8(newStatus) < uint8(previous)) revert StatusRegression();
        _tamagaki[tokenId].status = newStatus;
        emit SupportStatusUpdated(tokenId, previous, newStatus);
    }

    function updatePublicMetadataHash(uint256 tokenId, bytes32 newHash) external onlyRole(REPORTER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        bytes32 previous = _tamagaki[tokenId].publicMetadataHash;
        _tamagaki[tokenId].publicMetadataHash = newHash;
        emit PublicMetadataHashUpdated(tokenId, previous, newHash);
    }

    function tamagaki(uint256 tokenId) external view returns (Tamagaki memory) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        return _tamagaki[tokenId];
    }

    function locked(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        return true;
    }

    function setBaseURI(string calldata newBaseTokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return interfaceId == ERC5192_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
