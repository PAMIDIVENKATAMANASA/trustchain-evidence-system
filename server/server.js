const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require("./routes/auth");
const evidenceRoutes = require("./routes/evidence");
const verificationRoutes = require("./routes/verification");
const aiRoutes = require("./routes/ai");

app.use("/api/auth", authRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "TrustChain API is running" });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/trustchain";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 30000, // 30 seconds
    retryWrites: true,
    w: 'majority',
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Check your MONGODB_URI in server/.env");
    console.error("💡 Verify internet connection and MongoDB Atlas network access");
  });

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TrustChain Server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;

