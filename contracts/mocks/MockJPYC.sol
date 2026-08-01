// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockJPYC is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 100_000 ether;
    uint256 public constant FAUCET_COOLDOWN = 1 days;
    mapping(address account => uint256 timestamp) public nextFaucetAt;

    error FaucetCooldown(uint256 nextAvailableAt);
    event FaucetClaimed(address indexed account, uint256 amount);

    constructor() ERC20("Mock JPYC", "mJPYC") {}

    function faucet() external {
        uint256 nextAvailable = nextFaucetAt[msg.sender];
        if (block.timestamp < nextAvailable) revert FaucetCooldown(nextAvailable);
        nextFaucetAt[msg.sender] = block.timestamp + FAUCET_COOLDOWN;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}
