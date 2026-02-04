const express = require("express");
const { authenticate } = require("../middleware/auth");
const Evidence = require("../models/Evidence");
const { downloadFromIPFS } = require("../services/ipfs");

const router = express.Router();

// AI Analysis endpoint (simulated - does not modify original file)
router.post(
  "/analyze/:evidenceId",
  authenticate,
  async (req, res) => {
    try {
      const { evidenceId } = req.params;
      const { analysisType } = req.body;

      const evidence = await Evidence.findOne({ evidenceId: parseInt(evidenceId) });

      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Download file from IPFS for analysis
      const ipfsResult = await downloadFromIPFS(evidence.ipfsHash);

      // Simulate AI analysis based on file type
      let analysisResult = {
        evidenceId: evidence.evidenceId,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        analysisType: analysisType || "general",
        timestamp: new Date(),
        originalFileHash: evidence.ipfsHash,
        note: "This is a simulated AI analysis. Original file remains unchanged on IPFS.",
      };

      // Simulate different analysis types
      if (analysisType === "transcribe" && evidence.fileType.startsWith("audio/")) {
        analysisResult.result = {
          transcription: "This is a simulated transcription of the audio file. In production, this would use speech-to-text AI services.",
          confidence: 0.95,
          duration: "00:02:30",
        };
      } else if (analysisType === "blur" && evidence.fileType.startsWith("video/")) {
        analysisResult.result = {
          processedFrames: 150,
          blurredRegions: ["face_1", "license_plate_1"],
          note: "Sensitive areas have been identified and can be blurred in a processed copy. Original remains intact.",
        };
      } else if (analysisType === "object-detection" && evidence.fileType.startsWith("image/")) {
        analysisResult.result = {
          detectedObjects: ["person", "vehicle", "building"],
          confidence: 0.87,
          boundingBoxes: [
            { object: "person", x: 100, y: 150, width: 50, height: 100 },
            { object: "vehicle", x: 200, y: 200, width: 150, height: 80 },
          ],
        };
      } else {
        analysisResult.result = {
          message: "General analysis completed",
          fileSize: evidence.fileSize,
          metadata: {
            type: evidence.fileType,
            uploaded: evidence.timestamp,
          },
        };
      }

      res.json(analysisResult);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({
        message: "Error during AI analysis",
        error: error.message,
      });
    }
  }
);

// Get available analysis types
router.get("/types", authenticate, (req, res) => {
  res.json({
    analysisTypes: [
      {
        type: "transcribe",
        description: "Transcribe audio files to text",
        supportedFormats: ["audio/*"],
      },
      {
        type: "blur",
        description: "Identify and blur sensitive areas in video",
        supportedFormats: ["video/*"],
      },
      {
        type: "object-detection",
        description: "Detect objects in images",
        supportedFormats: ["image/*"],
      },
      {
        type: "general",
        description: "General file analysis",
        supportedFormats: ["*"],
      },
    ],
  });
});

module.exports = router;

