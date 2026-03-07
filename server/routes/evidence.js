const express = require("express");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const Evidence = require("../models/Evidence");
const { uploadToIPFS, getPublicGatewayURL } = require("../services/ipfs");

const router = express.Router();

// ---------------------------------------------------------------------------
// Multer configuration: use memory storage for IPFS upload
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// ---------------------------------------------------------------------------
// POST /api/evidence/upload
// Officer uploads a file – upload to IPFS and store metadata in MongoDB
// ---------------------------------------------------------------------------
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

      // Step 1: Upload file to IPFS
      let ipfsResult;
      try {
        ipfsResult = await uploadToIPFS(req.file.buffer, req.file.originalname);
        console.log(`✅ File uploaded to IPFS: ${ipfsResult.cid}`);
      } catch (ipfsError) {
        console.error("IPFS upload error:", ipfsError);
        return res.status(500).json({
          message: "Error uploading to IPFS",
          error: ipfsError.message,
        });
      }

      // Step 2: Generate evidenceId (auto-increment)
      const lastEvidence = await Evidence.findOne().sort({ evidenceId: -1 });
      const nextEvidenceId = lastEvidence ? lastEvidence.evidenceId + 1 : 1;

      // Step 3: Create evidence record with IPFS hash
      const evidence = new Evidence({
        evidenceId: nextEvidenceId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        ipfsHash: ipfsResult.cid,
        collectorId: officer._id,
        collectorName: officer.name,
        collectorAddress: officer.walletAddress || "",
        timestamp: new Date(),
        gpsCoordinates: {
          latitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
          longitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
        },
        description: description || "",
        status: "sealed",
      });

      await evidence.save();

      // Step 4: Return response with IPFS gateway URL
      const ipfsGatewayURL = getPublicGatewayURL(ipfsResult.cid);
      const ipfsPublicURL = `https://ipfs.io/ipfs/${ipfsResult.cid}`;

      res.status(201).json({
        message: "Evidence uploaded and stored on IPFS successfully",
        evidence: {
          ...evidence.toObject(),
          ipfsHash: ipfsResult.cid,
          ipfsGatewayURL: ipfsGatewayURL,
          ipfsPublicURL: ipfsPublicURL,
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

// ---------------------------------------------------------------------------
// GET /api/evidence
// Officer: sees only their own evidence
// Other roles (judge/lawyer): can see all
// Includes IPFS gateway URLs in response
// ---------------------------------------------------------------------------
router.get("/", authenticate, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "officer") {
      query.collectorId = req.user._id;
    }

    const evidenceList = await Evidence.find(query)
      .populate("collectorId", "name email")
      .sort({ createdAt: -1 });

    // Add IPFS gateway URLs to each evidence record
    const evidenceWithIPFS = evidenceList.map((item) => {
      const evidenceObj = item.toObject();
      if (evidenceObj.ipfsHash) {
        evidenceObj.ipfsGatewayURL = getPublicGatewayURL(evidenceObj.ipfsHash);
        evidenceObj.ipfsPublicURL = `https://ipfs.io/ipfs/${evidenceObj.ipfsHash}`;
      }
      return evidenceObj;
    });

    res.json({
      count: evidenceWithIPFS.length,
      evidence: evidenceWithIPFS,
    });
  } catch (error) {
    console.error("Get evidence error:", error);
    res.status(500).json({ message: "Error fetching evidence" });
  }
});

module.exports = router;

