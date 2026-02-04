const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const Evidence = require("../models/Evidence");
const { downloadFromIPFS, calculateFileHash } = require("../services/ipfs");
const { getOriginalHash } = require("../services/blockchain");
const { ethers } = require("ethers");

const router = express.Router();

// Verify evidence integrity (Judge only)
router.post(
  "/:evidenceId",
  authenticate,
  authorize("judge"),
  async (req, res) => {
    try {
      const { evidenceId } = req.params;
      const evidenceIdNum = parseInt(evidenceId);

      // Step 1: Get evidence metadata from MongoDB
      const evidence = await Evidence.findOne({ evidenceId: evidenceIdNum });

      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Step 2: Download file from IPFS
      const ipfsResult = await downloadFromIPFS(evidence.ipfsHash);

      // Step 3: Calculate hash of downloaded file (same method as upload)
      const currentFileHash = calculateFileHash(ipfsResult.buffer);
      const currentHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(currentFileHash));

      // Step 4: Get original hash from blockchain
      const blockchainData = await getOriginalHash(evidenceIdNum);

      if (!blockchainData.exists) {
        return res.status(404).json({ message: "Evidence not found on blockchain" });
      }

      // Step 5: Compare hashes (both should be bytes32 from file hash)
      const originalHash = blockchainData.hash;
      const isAuthentic = currentHashBytes32.toLowerCase() === originalHash.toLowerCase();

      // Update evidence status
      evidence.status = isAuthentic ? "verified" : "tampered";
      await evidence.save();

      res.json({
        evidenceId: evidenceIdNum,
        fileName: evidence.fileName,
        verificationResult: isAuthentic ? "100% Authentic" : "Tampered",
        isAuthentic: isAuthentic,
        details: {
          originalHash: originalHash,
          currentHash: currentHashBytes32,
          fileHash: currentFileHash,
          ipfsHash: evidence.ipfsHash,
          collector: evidence.collectorName,
          timestamp: evidence.timestamp,
          blockchainTimestamp: new Date(parseInt(blockchainData.timestamp) * 1000),
        },
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({
        message: "Error during verification",
        error: error.message,
      });
    }
  }
);

// Get verification history for an evidence
router.get(
  "/:evidenceId/history",
  authenticate,
  authorize("judge"),
  async (req, res) => {
    try {
      const { evidenceId } = req.params;
      const evidence = await Evidence.findOne({ evidenceId: parseInt(evidenceId) });

      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      res.json({
        evidenceId: evidence.evidenceId,
        status: evidence.status,
        lastVerified: evidence.updatedAt,
        collector: evidence.collectorName,
        timestamp: evidence.timestamp,
      });
    } catch (error) {
      console.error("Get verification history error:", error);
      res.status(500).json({ message: "Error fetching verification history" });
    }
  }
);

module.exports = router;

