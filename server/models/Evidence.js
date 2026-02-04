const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema(
  {
    evidenceId: {
      type: Number,
      required: true,
      unique: true,
    },
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
    ipfsHash: {
      type: String,
      required: true,
      unique: true,
    },
    blockchainHash: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String,
      default: "",
    },
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
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
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
    description: {
      type: String,
      default: "",
    },
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

