const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const Evidence = require("../models/Evidence");
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
        return res.status(404).json({ message: "Evidence not found in database" });
      }

      // Step 2: Use the stored fileHash (computed at upload time) — no IPFS download needed.
      // This avoids the local IPFS daemon dependency during verification.
      if (!evidence.fileHash) {
        return res.status(400).json({
          message: "Evidence record has no stored file hash. Was it uploaded before blockchain integration?",
        });
      }

      const currentHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(evidence.fileHash));

      // Step 3: Get original hash from blockchain.
      // blockchainEvidenceId is the real Solidity counter stored at upload time.
      // Fall back to evidenceIdNum for old records without this field.
      const onChainId = (evidence.blockchainEvidenceId != null)
        ? evidence.blockchainEvidenceId
        : evidenceIdNum;

      let blockchainData;
      try {
        blockchainData = await getOriginalHash(onChainId);
      } catch (bcError) {
        return res.status(502).json({
          message: "Could not reach blockchain RPC. Check BLOCKCHAIN_RPC_URL in server/.env",
          error: bcError.message,
        });
      }

      if (!blockchainData.exists) {
        return res.status(404).json({
          message: `Evidence not found on blockchain (chain ID ${onChainId}). The record may pre-date blockchain integration.`,
          onChainId,
        });
      }

      // Step 4: Compare hashes
      const originalHash = blockchainData.hash;
      const isAuthentic = currentHashBytes32.toLowerCase() === originalHash.toLowerCase();

      // Update evidence status
      evidence.status = isAuthentic ? "verified" : "tampered";
      await evidence.save();

      res.json({
        evidenceId: evidenceIdNum,
        fileName: evidence.fileName,
        verificationResult: isAuthentic ? "100% Authentic" : "Tampered",
        isAuthentic,
        details: {
          originalHash,
          currentHash: currentHashBytes32,
          fileHash: evidence.fileHash,
          ipfsHash: evidence.ipfsHash,
          collector: evidence.collectorName,
          timestamp: evidence.timestamp,
          blockchainTimestamp: new Date(parseInt(blockchainData.timestamp) * 1000),
          onChainId,
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

