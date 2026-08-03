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
    mapping(bytes32 batchId => bytes32 successorBatchId) public deliverySuccessor;
    mapping(bytes32 reportId => bytes32 successorReportId) public reportSuccessor;

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
    event DeliverySuperseded(bytes32 indexed previousBatchId, bytes32 indexed successorBatchId);
    event ProjectReportSuperseded(bytes32 indexed previousReportId, bytes32 indexed successorReportId);

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

    function supersedeDelivery(
        bytes32 previousBatchId,
        bytes32 successorBatchId,
        uint256 yenAmount,
        bytes32 receiptHash
    ) external onlyRole(REPORTER_ROLE) {
        if (deliveries[previousBatchId].confirmedAt == 0) revert AlreadyRecorded(previousBatchId);
        if (deliverySuccessor[previousBatchId] != bytes32(0) || deliveries[successorBatchId].confirmedAt != 0) {
            revert AlreadyRecorded(successorBatchId);
        }
        deliverySuccessor[previousBatchId] = successorBatchId;
        uint64 confirmedAt = uint64(block.timestamp);
        deliveries[successorBatchId] = Delivery(yenAmount, receiptHash, confirmedAt);
        emit DeliverySuperseded(previousBatchId, successorBatchId);
        emit DeliveryConfirmed(successorBatchId, yenAmount, receiptHash, confirmedAt);
    }

    function supersedeProjectReport(
        bytes32 previousReportId,
        bytes32 successorReportId,
        bytes32 projectId,
        uint16 progressBps,
        uint256 allocatedYen,
        bytes32 documentHash
    ) external onlyRole(REPORTER_ROLE) {
        if (reports[previousReportId].publishedAt == 0) revert AlreadyRecorded(previousReportId);
        if (reportSuccessor[previousReportId] != bytes32(0) || reports[successorReportId].publishedAt != 0) {
            revert AlreadyRecorded(successorReportId);
        }
        if (progressBps > 10_000) revert InvalidProgress(progressBps);
        reportSuccessor[previousReportId] = successorReportId;
        uint64 publishedAt = uint64(block.timestamp);
        reports[successorReportId] = ProjectReport(
            projectId, progressBps, allocatedYen, documentHash, publishedAt
        );
        emit ProjectReportSuperseded(previousReportId, successorReportId);
        emit ProjectReportPublished(
            successorReportId, projectId, progressBps, allocatedYen, documentHash, publishedAt
        );
    }
}
