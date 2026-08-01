// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {TamagakiSBT} from "./TamagakiSBT.sol";

/// @title RecoverySupportCouncil
/// @notice Non-binding community sentiment for recovery priorities. It cannot move funds.
contract RecoverySupportCouncil is AccessControl {
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    uint16 public constant VOICE_CREDITS_PER_PROPOSAL = 100;
    uint8 public constant MAX_VOTES = 10;

    struct Proposal {
        bytes32 metadataHash;
        uint64 votingStarts;
        uint64 votingEnds;
        uint64 forVotes;
        uint64 againstVotes;
    }

    TamagakiSBT public immutable tamagakiSBT;
    uint256 public proposalCount;
    mapping(uint256 proposalId => Proposal) public proposals;
    mapping(uint256 proposalId => mapping(address voter => bool voted)) public hasVoted;
    mapping(uint256 proposalId => mapping(address voter => uint16 credits)) public voiceCreditsSpent;

    error NoTamagaki();
    error VotingClosed();
    error AlreadyVoted();
    error InvalidVoteWeight();
    error InvalidVotingWindow();

    event AdvisoryProposalCreated(
        uint256 indexed proposalId, bytes32 indexed metadataHash, uint64 votingStarts, uint64 votingEnds
    );
    event AdvisoryVoteCast(
        uint256 indexed proposalId, address indexed voter, bool support, uint8 votes, uint16 voiceCreditsSpent
    );

    constructor(address admin, TamagakiSBT tamagakiSBT_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROPOSER_ROLE, admin);
        tamagakiSBT = tamagakiSBT_;
    }

    function createProposal(bytes32 metadataHash, uint64 votingStarts, uint64 votingEnds)
        external
        onlyRole(PROPOSER_ROLE)
        returns (uint256 proposalId)
    {
        if (votingStarts >= votingEnds) revert InvalidVotingWindow();
        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal(metadataHash, votingStarts, votingEnds, 0, 0);
        emit AdvisoryProposalCreated(proposalId, metadataHash, votingStarts, votingEnds);
    }

    /// @notice Casts 1-10 weighted votes. The voice-credit cost is votes squared.
    function vote(uint256 proposalId, bool support, uint8 votes) external {
        Proposal storage proposal = proposals[proposalId];
        if (block.timestamp < proposal.votingStarts || block.timestamp > proposal.votingEnds) revert VotingClosed();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (tamagakiSBT.balanceOf(msg.sender) == 0) revert NoTamagaki();
        if (votes == 0 || votes > MAX_VOTES) revert InvalidVoteWeight();
        uint16 credits = uint16(votes) * uint16(votes);
        if (credits > VOICE_CREDITS_PER_PROPOSAL) revert InvalidVoteWeight();
        hasVoted[proposalId][msg.sender] = true;
        voiceCreditsSpent[proposalId][msg.sender] = credits;
        if (support) proposal.forVotes += votes; else proposal.againstVotes += votes;
        emit AdvisoryVoteCast(proposalId, msg.sender, support, votes, credits);
    }
}
