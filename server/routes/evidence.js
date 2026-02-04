const express = require("express");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const Evidence = require("../models/Evidence");
const { uploadToIPFS, calculateFileHash, downloadFromIPFS, getPublicGatewayURL } = require("../services/ipfs");
const { addEvidence, getSignerAddress } = require("../services/blockchain");
const { ethers } = require("ethers");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Upload evidence (Officer only)
router.post(
  "/upload",
  authenticate,
  authorize("officer"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { description, gpsLatitude, gpsLongitude } = req.body;
      const officer = req.user;

      // Step 1: Calculate file hash (SHA256) for integrity verification
      const fileHash = calculateFileHash(req.file.buffer);
      const fileHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(fileHash));

      // Step 2: Upload file to IPFS
      const ipfsResult = await uploadToIPFS(req.file.buffer, req.file.originalname);

      // Step 3: Determine collector blockchain address
      // If officer has a walletAddress, use it; otherwise fall back to a non-zero default (signer address)
      let collectorAddress = officer.walletAddress;
      if (!collectorAddress || collectorAddress === "0x0000000000000000000000000000000000000000") {
        collectorAddress =
          process.env.DEFAULT_COLLECTOR_ADDRESS || (await getSignerAddress());
      }

      // Step 4: Add evidence hash to blockchain (store file hash, not IPFS CID)
      const blockchainResult = await addEvidence(fileHashBytes32, collectorAddress);
      
      // Log network info for debugging
      if (blockchainResult.network === "localhost") {
        console.warn("⚠️  WARNING: Using localhost blockchain. Transactions won't appear on Etherscan!");
        console.warn("   Update server/.env: BLOCKCHAIN_RPC_URL=https://rpc.sepolia.org");
      }

      // Step 5: Check if evidenceId already exists (handle duplicate key error)
      const evidenceId = parseInt(blockchainResult.evidenceId);
      let evidence = await Evidence.findOne({ evidenceId });

      if (evidence) {
        // Evidence with this ID already exists
        // Check if it's the same transaction (retry scenario)
        if (evidence.blockchainHash === blockchainResult.transactionHash) {
          // Same transaction - return existing evidence
          console.log(`ℹ️  Evidence ${evidenceId} already exists with same transaction hash. Returning existing record.`);
        } else {
          // Different transaction - this is a conflict
          console.error(`❌ Evidence ID ${evidenceId} conflict: existing tx ${evidence.blockchainHash}, new tx ${blockchainResult.transactionHash}`);
          return res.status(409).json({
            message: "Evidence ID conflict. Please try uploading again.",
            error: "Duplicate evidenceId with different transaction hash"
          });
        }
      } else {
        // Create new evidence record
        evidence = new Evidence({
          evidenceId: evidenceId,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          ipfsHash: ipfsResult.cid,
          blockchainHash: blockchainResult.transactionHash,
          fileHash: fileHash, // Store original file hash for reference
          collectorId: officer._id,
          collectorName: officer.name,
          collectorAddress: collectorAddress,
          timestamp: new Date(),
          gpsCoordinates: {
            latitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
            longitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
          },
          description: description || "",
          status: "sealed",
        });

        await evidence.save();
      }

      res.status(201).json({
        message: "Evidence uploaded and sealed successfully",
        evidence: {
          evidenceId: evidence.evidenceId,
          fileName: evidence.fileName,
          ipfsHash: evidence.ipfsHash,
          ipfsGatewayURL: getPublicGatewayURL(evidence.ipfsHash),
          ipfsPublicURL: `https://ipfs.io/ipfs/${evidence.ipfsHash}`, // Public IPFS gateway
          blockchainHash: evidence.blockchainHash,
          etherscanUrl: blockchainResult.etherscanUrl || null, // Etherscan link if on Sepolia
          network: blockchainResult.network || "unknown",
          timestamp: evidence.timestamp,
          status: evidence.status,
        },
      });
    } catch (error) {
      console.error("Evidence upload error:", error);
      res.status(500).json({
        message: "Error uploading evidence",
        error: error.message,
      });
    }
  }
);

// Get all evidence (Judge and Lawyer can see all, Officer sees only their own)
router.get("/", authenticate, async (req, res) => {
  try {
    let query = {};

    // Officers can only see their own evidence
    if (req.user.role === "officer") {
      query.collectorId = req.user._id;
    }

    const evidence = await Evidence.find(query)
      .populate("collectorId", "name email")
      .sort({ createdAt: -1 });

    // Add Etherscan URLs for Sepolia network
    const evidenceWithLinks = evidence.map((item) => {
      const evidenceObj = item.toObject();
      // Generate Etherscan URL if we have a blockchain hash and it's Sepolia
      if (evidenceObj.blockchainHash && !evidenceObj.blockchainHash.includes('localhost')) {
        evidenceObj.etherscanUrl = `https://sepolia.etherscan.io/tx/${evidenceObj.blockchainHash}`;
      }
      return evidenceObj;
    });

    res.json({
      count: evidenceWithLinks.length,
      evidence: evidenceWithLinks,
    });
  } catch (error) {
    console.error("Get evidence error:", error);
    res.status(500).json({ message: "Error fetching evidence" });
  }
});

// Download/View evidence file from IPFS (Judge and Lawyer can access)
// IMPORTANT: This route must come BEFORE /:evidenceId to avoid route conflicts
router.get("/:evidenceId/download", authenticate, async (req, res) => {
  try {
    const { evidenceId } = req.params;
    let query = { evidenceId: parseInt(evidenceId) };

    // Officers can only see their own evidence
    if (req.user.role === "officer") {
      query.collectorId = req.user._id;
    }

    const evidence = await Evidence.findOne(query);

    if (!evidence) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    // Download file from IPFS
    const ipfsResult = await downloadFromIPFS(evidence.ipfsHash);

    // Set appropriate headers for file download/view
    const fileName = evidence.fileName;
    const fileType = evidence.fileType || "application/octet-stream";

    res.setHeader("Content-Type", fileType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader("Content-Length", ipfsResult.buffer.length);

    // Send file buffer
    res.send(ipfsResult.buffer);
  } catch (error) {
    console.error("Error downloading evidence file:", error);
    res.status(500).json({
      message: "Error downloading evidence file",
      error: error.message,
    });
  }
});

// Get single evidence by ID
// IMPORTANT: This route must come AFTER /:evidenceId/download to avoid route conflicts
router.get("/:evidenceId", authenticate, async (req, res) => {
  try {
    const { evidenceId } = req.params;
    let query = { evidenceId: parseInt(evidenceId) };

    // Officers can only see their own evidence
    if (req.user.role === "officer") {
      query.collectorId = req.user._id;
    }

    const evidence = await Evidence.findOne(query).populate(
      "collectorId",
      "name email"
    );

    if (!evidence) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    // Add public gateway URL to response
    const evidenceWithGateway = {
      ...evidence.toObject(),
      ipfsGatewayURL: getPublicGatewayURL(evidence.ipfsHash),
    };
    
    res.json({ evidence: evidenceWithGateway });
  } catch (error) {
    console.error("Get evidence error:", error);
    res.status(500).json({ message: "Error fetching evidence" });
  }
});

module.exports = router;

