const express = require("express");
const router = express.Router();

// Import routes
const authRoutes = require("./auth");
const jobRoutes = require("./jobs");
const workerRoutes = require("./workers");
const employerRoutes = require("./employers");
const interviewRoutes = require("./interviews");
const schemeRoutes = require("./schemes");
const resumeRoutes = require("./resumes");
const documentRoutes = require("./documents");
const notificationRoutes = require("./notifications");
const adminRoutes = require("./admin");

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API version
router.get("/version", (req, res) => {
  res.json({
    version: "1.0.0",
    name: "HackForge API",
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/jobs", jobRoutes);
router.use("/workers", workerRoutes);
router.use("/employers", employerRoutes);
router.use("/interviews", interviewRoutes);
router.use("/schemes", schemeRoutes);
router.use("/resumes", resumeRoutes);
router.use("/documents", documentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
