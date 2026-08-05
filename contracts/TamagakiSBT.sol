// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title TamagakiSBT
/// @notice Non-transferable proof that an address participated in Kumamoto recovery support.
/// @dev Implements ERC-5192. Core records use hashes; the explicit demo-artwork path stores user-approved public text.
contract TamagakiSBT is ERC721, AccessControl {
    using Strings for uint256;

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
    struct Artwork {
        string displayName;
        string dedicationMessage;
        string assetLabel;
        uint256 amount;
        uint8 assetDecimals;
        bool showAmount;
    }
    mapping(uint256 tokenId => Artwork) private _artwork;

    error Soulbound();
    error DuplicateSupport(bytes32 supportId);
    error UnknownToken(uint256 tokenId);
    error StatusRegression();
    error TextTooLong();
    error InvalidText();
    error InvalidDecimals();
    error EmptyText();

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

    function mintWithMetadata(
        address recipient,
        bytes32 supportId,
        bytes32 publicMetadataHash,
        string calldata displayName,
        string calldata dedicationMessage,
        string calldata assetLabel,
        uint256 amount,
        uint8 assetDecimals,
        bool showAmount
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (bytes(displayName).length == 0) revert EmptyText();
        _validateText(displayName, 72);
        _validateText(dedicationMessage, 180);
        _validateText(assetLabel, 16);
        if (assetDecimals > 18) revert InvalidDecimals();
        if (tokenBySupportId[supportId] != 0) revert DuplicateSupport(supportId);
        tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        _tamagaki[tokenId] = Tamagaki(supportId, publicMetadataHash, SupportStatus.Received);
        _artwork[tokenId] = Artwork(
            displayName,
            dedicationMessage,
            assetLabel,
            amount,
            assetDecimals,
            showAmount
        );
        tokenBySupportId[supportId] = tokenId;
        emit Locked(tokenId);
    }

    function artwork(uint256 tokenId) external view returns (Artwork memory) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        return _artwork[tokenId];
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

    function lastMintedTokenId() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function isValidVotingToken(address voter, uint256 tokenId, uint256 cutoffTokenId)
        external
        view
        returns (bool)
    {
        return tokenId != 0 && tokenId <= cutoffTokenId && _ownerOf(tokenId) == voter
            && _tamagaki[tokenId].status != SupportStatus.Invalidated;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        Artwork storage art = _artwork[tokenId];
        if (bytes(art.displayName).length == 0) return super.tokenURI(tokenId);

        string memory svg = _renderSvg(tokenId, art);
        string memory amountAttribute = art.showAmount
            ? string.concat(',{"trait_type":"Amount","value":"', _formatAmount(art.amount, art.assetDecimals), '"}')
            : "";
        string memory json = string.concat(
            '{"name":"Kumamoto Digital Tamagaki #', tokenId.toString(),
            '","description":"Non-transferable proof of participation in the Kumamoto Relief DAO prototype.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[{"trait_type":"Asset","value":"', _escapeJson(art.assetLabel),
            '"}', amountAttribute, ',{"trait_type":"Soulbound","value":"true"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
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

    function _renderSvg(uint256 tokenId, Artwork storage art) private view returns (string memory) {
        string memory amountLine = art.showAmount
            ? string.concat(_formatAmount(art.amount, art.assetDecimals), " ", _escapeXml(art.assetLabel))
            : unicode"金額非公開";
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 1000">',
            '<defs><linearGradient id="r" x2="1"><stop stop-color="#861b13"/><stop offset=".45" stop-color="#c83c27"/><stop offset="1" stop-color="#8f1e15"/></linearGradient></defs>',
            '<rect x="12" y="10" width="336" height="980" rx="8" fill="#68140e"/>',
            '<rect x="20" y="18" width="320" height="964" rx="5" fill="url(#r)"/>',
            '<path d="M34 22V978M326 22V978" stroke="#f09b75" stroke-opacity=".25" stroke-width="5"/>',
            '<rect x="20" y="18" width="320" height="158" rx="5" fill="#151311"/>',
            unicode'<text x="180" y="111" text-anchor="middle" font-family="serif" font-size="32" font-weight="700" letter-spacing="2" fill="#fff5dc">熊本災害支援</text>',
            '<text x="180" y="218" text-anchor="middle" font-family="sans-serif" font-size="18" letter-spacing="3" fill="#ffd1b5">No. ', tokenId.toString(), '</text>',
            '<text x="180" y="290" text-anchor="start" writing-mode="vertical-rl" style="text-orientation:upright" font-family="serif" font-size="34" font-weight="700" letter-spacing="4" fill="#fff7e6">', _escapeXml(art.displayName), '</text>',
            '<line x1="48" y1="825" x2="312" y2="825" stroke="#f5b49a" stroke-opacity=".55"/>',
            '<text x="180" y="868" text-anchor="middle" font-family="serif" font-size="19" fill="#ffe2ce">', amountLine, '</text>',
            '<text x="180" y="914" text-anchor="middle" font-family="serif" font-size="13" fill="#ffe2ce">', _escapeXml(art.dedicationMessage), '</text>',
            '<g fill="none" stroke="#ffd1b5" stroke-width="3"><rect x="64" y="940" width="29" height="17" rx="8" transform="rotate(-28 78 948)"/><rect x="82" y="940" width="29" height="17" rx="8" transform="rotate(28 96 948)"/></g>',
            unicode'<text x="213" y="956" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#ffd1b5">TAMAGAKI SBT</text>',
            '</svg>'
        );
    }

    function _formatAmount(uint256 amount, uint8 decimals) private pure returns (string memory) {
        if (decimals == 0) return amount.toString();
        uint256 unit = 10 ** decimals;
        uint256 whole = amount / unit;
        uint256 precision = decimals > 4 ? 4 : decimals;
        uint256 scale = 10 ** precision;
        uint256 fraction = (amount % unit) * scale / unit;
        if (fraction == 0) return whole.toString();
        bytes memory raw = bytes(fraction.toString());
        bytes memory padded = new bytes(precision);
        uint256 offset = precision - raw.length;
        for (uint256 i; i < offset; ++i) padded[i] = "0";
        for (uint256 i; i < raw.length; ++i) padded[offset + i] = raw[i];
        uint256 length = precision;
        while (length > 0 && padded[length - 1] == "0") --length;
        bytes memory trimmed = new bytes(length);
        for (uint256 i; i < length; ++i) trimmed[i] = padded[i];
        return string.concat(whole.toString(), ".", string(trimmed));
    }

    function _validateText(string calldata value, uint256 maxLength) private pure {
        bytes calldata data = bytes(value);
        if (data.length > maxLength) revert TextTooLong();
        for (uint256 i; i < data.length; ++i) {
            if (uint8(data[i]) < 0x20) revert InvalidText();
        }
    }

    function _escapeXml(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        bytes memory output = new bytes(input.length * 6);
        uint256 length;
        for (uint256 i; i < input.length; ++i) {
            bytes memory replacement;
            if (input[i] == "&") replacement = bytes("&amp;");
            else if (input[i] == "<") replacement = bytes("&lt;");
            else if (input[i] == ">") replacement = bytes("&gt;");
            else if (input[i] == '"') replacement = bytes("&quot;");
            else replacement = abi.encodePacked(input[i]);
            for (uint256 j; j < replacement.length; ++j) output[length++] = replacement[j];
        }
        assembly { mstore(output, length) }
        return string(output);
    }

    function _escapeJson(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        bytes memory output = new bytes(input.length * 2);
        uint256 length;
        for (uint256 i; i < input.length; ++i) {
            if (input[i] == '"' || input[i] == "\\") output[length++] = "\\";
            output[length++] = input[i];
        }
        assembly { mstore(output, length) }
        return string(output);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
