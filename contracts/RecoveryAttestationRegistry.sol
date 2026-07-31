// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RecoveryAttestationRegistry
/// @notice Anchors Kumamoto receipt confirmations and recovery reports without publishing the documents themselves.
contract RecoveryAttestationRegistry is AccessControl {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    struct Delivery {
        uint256 yenAmount;
        bytes32 receiptHash;
        uint64 confirmedAt;
    }

    struct ProjectReport {
        bytes32 projectId;
        uint16 progressBps;
        uint256 allocatedYen;
        bytes32 documentHash;
        uint64 publishedAt;
    }

    mapping(bytes32 batchId => Delivery) public deliveries;
    mapping(bytes32 reportId => ProjectReport) public reports;

    error AlreadyRecorded(bytes32 id);
    error InvalidProgress(uint16 progressBps);

    event DeliveryConfirmed(
        bytes32 indexed batchId, uint256 yenAmount, bytes32 indexed receiptHash, uint64 confirmedAt
    );
    event ProjectReportPublished(
        bytes32 indexed reportId,
        bytes32 indexed projectId,
        uint16 progressBps,
        uint256 allocatedYen,
        bytes32 documentHash,
        uint64 publishedAt
    );

    constructor(address admin, address reporter) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REPORTER_ROLE, reporter);
    }

    function confirmDelivery(bytes32 batchId, uint256 yenAmount, bytes32 receiptHash)
        external
        onlyRole(REPORTER_ROLE)
    {
        if (deliveries[batchId].confirmedAt != 0) revert AlreadyRecorded(batchId);
        uint64 confirmedAt = uint64(block.timestamp);
        deliveries[batchId] = Delivery(yenAmount, receiptHash, confirmedAt);
        emit DeliveryConfirmed(batchId, yenAmount, receiptHash, confirmedAt);
    }

    function publishProjectReport(
        bytes32 reportId,
        bytes32 projectId,
        uint16 progressBps,
        uint256 allocatedYen,
        bytes32 documentHash
    ) external onlyRole(REPORTER_ROLE) {
        if (reports[reportId].publishedAt != 0) revert AlreadyRecorded(reportId);
        if (progressBps > 10_000) revert InvalidProgress(progressBps);
        uint64 publishedAt = uint64(block.timestamp);
        reports[reportId] = ProjectReport(projectId, progressBps, allocatedYen, documentHash, publishedAt);
        emit ProjectReportPublished(
            reportId, projectId, progressBps, allocatedYen, documentHash, publishedAt
        );
    }
}
