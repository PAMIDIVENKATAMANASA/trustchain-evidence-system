const express = require("express");
const path = require("path");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const Evidence = require("../models/Evidence");

const router = express.Router();

// ---------------------------------------------------------------------------
// Multer configuration: store files on disk in /server/uploads (no IPFS yet)
// ---------------------------------------------------------------------------
const uploadsDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// ---------------------------------------------------------------------------
// POST /api/evidence/upload
// Officer uploads a file – we store file metadata + description in MongoDB
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

      // Generate a simple numeric evidenceId (auto-increment)
      const lastEvidence = await Evidence.findOne().sort({ evidenceId: -1 });
      const nextEvidenceId = lastEvidence ? lastEvidence.evidenceId + 1 : 1;

      const evidence = new Evidence({
        evidenceId: nextEvidenceId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
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

      res.status(201).json({
        message: "Evidence uploaded successfully (metadata stored in DB only)",
        evidence,
      });
    } catch (error) {
      console.error("Evidence upload error (Week 3 simple mode):", error);
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
// Other roles (judge/lawyer): can see all (same as original behaviour)
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

    res.json({
      count: evidenceList.length,
      evidence: evidenceList,
    });
  } catch (error) {
    console.error("Get evidence error:", error);
    res.status(500).json({ message: "Error fetching evidence" });
  }
});

module.exports = router;

