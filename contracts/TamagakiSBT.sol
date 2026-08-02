// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title TamagakiSBT
/// @notice Non-transferable proof that an address participated in Kumamoto recovery support.
/// @dev Implements the ERC-5192 locked(uint256) interface and deliberately stores no PII.
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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownToken(tokenId);
        Artwork storage art = _artwork[tokenId];
        if (bytes(art.displayName).length == 0) return super.tokenURI(tokenId);

        string memory svg = _renderSvg(tokenId, art);
        string memory json = string.concat(
            '{"name":"Kumamoto Digital Tamagaki #', tokenId.toString(),
            '","description":"Non-transferable proof of participation in the Kumamoto Relief DAO prototype.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[{"trait_type":"Asset","value":"', _escapeJson(art.assetLabel),
            '"},{"trait_type":"Amount","value":"', _formatAmount(art.amount, art.assetDecimals),
            '"},{"trait_type":"Soulbound","value":"true"}]}'
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
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">',
            '<defs><linearGradient id="w" x2="1" y2="1"><stop stop-color="#f8e8bd"/><stop offset="1" stop-color="#d8b66b"/></linearGradient></defs>',
            '<rect width="600" height="900" rx="22" fill="url(#w)"/>',
            '<path d="M35 30H565V870H35Z" fill="none" stroke="#74551f" stroke-width="8"/>',
            '<path d="M65 62H535V838H65Z" fill="none" stroke="#9b7938" stroke-width="2"/>',
            unicode'<text x="300" y="120" text-anchor="middle" font-family="serif" font-size="28" fill="#272015">熊本災害支援DAO</text>',
            unicode'<text x="300" y="180" text-anchor="middle" font-family="serif" font-size="34" fill="#272015">復興支援 玉垣</text>',
            '<line x1="105" y1="215" x2="495" y2="215" stroke="#74551f"/>',
            '<text x="300" y="310" text-anchor="middle" font-family="serif" font-size="52" font-weight="700" fill="#18130c">', _escapeXml(art.displayName), '</text>',
            '<text x="300" y="405" text-anchor="middle" font-family="serif" font-size="38" fill="#18130c">', amountLine, '</text>',
            '<line x1="105" y1="445" x2="495" y2="445" stroke="#74551f"/>',
            '<text x="300" y="520" text-anchor="middle" font-family="serif" font-size="24" fill="#272015">', _escapeXml(art.dedicationMessage), '</text>',
            unicode'<path d="M115 715L175 650L225 692L285 612L330 670L390 575L485 715Z" fill="none" stroke="#8c6429" stroke-width="5"/>',
            unicode'<text x="300" y="760" text-anchor="middle" font-family="serif" font-size="22" fill="#74551f">熊本城とともに、復興の歩みを</text>',
            '<text x="300" y="825" text-anchor="middle" font-family="serif" font-size="25" fill="#272015">Tamagaki SBT #', tokenId.toString(), '</text>',
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
