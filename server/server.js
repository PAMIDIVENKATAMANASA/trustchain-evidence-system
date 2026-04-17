const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
// CORS: allow Vercel frontend + localhost for development
const allowedOrigins = [
  process.env.FRONTEND_URL,       // Vercel production URL
  'http://localhost:3000',         // Local Vite dev server
  'http://localhost:5173',         // Vite default port
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    // In production, also allow any *.vercel.app domain for preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

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
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    // Drop stale unique index on ipfsHash (was unique in old schema, now non-unique)
    mongoose.connection.db.collection('evidences').dropIndex('ipfsHash_1')
      .then(() => console.log('✅ Dropped stale ipfsHash_1 unique index'))
      .catch(err => {
        if (err.codeName === 'IndexNotFound') {
          console.log('ℹ️  ipfsHash_1 index already removed — no action needed');
        } else {
          console.warn('⚠️  Could not drop ipfsHash_1 index:', err.message);
        }
      });
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
