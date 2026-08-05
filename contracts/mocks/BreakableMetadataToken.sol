// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BreakableMetadataToken is ERC20 {
    bool public metadataBroken;

    constructor() ERC20("Breakable Token", "BRK") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function breakMetadata() external {
        metadataBroken = true;
    }

    function symbol() public view override returns (string memory) {
        if (metadataBroken) revert("metadata unavailable");
        return super.symbol();
    }

    function decimals() public view override returns (uint8) {
        if (metadataBroken) revert("metadata unavailable");
        return super.decimals();
    }
}
