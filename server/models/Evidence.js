const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema(
  {
    // Simple numeric evidence identifier (auto-incremented on create)
    evidenceId: {
      type: Number,
      required: true,
      unique: true,
    },

    // Basic file metadata (Week 3 requirement)
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },

    // Optional fields reserved for later IPFS / blockchain integration
    ipfsHash: {
      type: String,
      required: false,
      unique: false,
    },
    blockchainHash: {
      type: String,
      required: false,
    },
    fileHash: {
      type: String,
      default: "",
    },

    // Who uploaded the evidence (officer)
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collectorName: {
      type: String,
      required: true,
    },
    collectorAddress: {
      type: String,
      required: false,
      default: "",
    },

    // When the evidence was collected
    timestamp: {
      type: Date,
      required: true,
    },

    // Optional GPS coordinates (if provided by frontend)
    gpsCoordinates: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },

    // Officer-provided description
    description: {
      type: String,
      default: "",
    },

    // Simple status field – blockchain / verification can extend this later
    status: {
      type: String,
      enum: ["sealed", "verified", "tampered"],
      default: "sealed",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Evidence", evidenceSchema);

