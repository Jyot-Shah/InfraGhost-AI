const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const { connectDB } = require("./db");
const Report = require("./models/Report");
const { analyzeInfrastructure } = require("./gemini");

if (!process.env.MAPBOX_TOKEN) {
  console.error("MAPBOX_TOKEN is required in .env file");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_INFRA_TYPES = ["water", "toilet", "streetlight", "ramp"];

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://api.mapbox.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://api.mapbox.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://api.mapbox.com", "https://*.mapbox.com"],
      connectSrc: ["'self'", "https://api.mapbox.com", "https://*.mapbox.com", "https://events.mapbox.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict in production
const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? process.env.ALLOWED_ORIGIN || true
    : true,
  methods: ["GET", "POST"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // tighter limit for AI analysis endpoint
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions, please try again later" },
});

app.use("/api/", apiLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
app.use(express.static("public"));

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).lean();
    // Transform for frontend compatibility
    const transformed = reports.map((r) => ({
      id: r._id.toString(),
      timestamp: r.createdAt,
      infra_type: r.infra_type,
      comment: r.comment,
      latitude: r.latitude,
      longitude: r.longitude,
      analysis: r.analysis,
    }));
    res.json(transformed);
  } catch (error) {
    console.error("Fetch reports error:", error.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

app.post("/api/submit-report", submitLimiter, async (req, res) => {
  try {
    const { infra_type, comment, latitude, longitude, image_base64 } = req.body;

    if (!infra_type || !image_base64 || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate infra_type against allowlist
    if (!ALLOWED_INFRA_TYPES.includes(infra_type)) {
      return res.status(400).json({ error: "Invalid infrastructure type" });
    }

    // Validate coordinates
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Sanitize comment — strip HTML tags
    const sanitizedComment = (comment || "No comment")
      .replace(/<[^>]*>/g, "")
      .substring(0, 200);

    console.log(`🔍 Analyzing ${infra_type} at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);

    const analysis = await analyzeInfrastructure(image_base64, infra_type, sanitizedComment);

    const doc = await Report.create({
      infra_type,
      comment: sanitizedComment,
      latitude: lat,
      longitude: lng,
      analysis,
    });

    const report = doc.toJSON();
    res.json({ success: true, report });
  } catch (error) {
    console.error("Report submission error:", error.message);
    // Don't leak internal error details to client
    const clientMessage = error.code === "TOKEN_LIMIT_EXCEEDED"
      ? "Image too large for analysis. Please use a smaller image."
      : "Failed to analyze infrastructure. Please try again.";
    res.status(500).json({ error: clientMessage });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    // Use MongoDB aggregation for efficient stats computation
    const [counts] = await Report.aggregate([
      {
        $group: {
          _id: null,
          total_reports: { $sum: 1 },
          infra_ghosts: {
            $sum: { $cond: [{ $gte: ["$analysis.ghost_score", 60] }, 1, 0] },
          },
          functional: {
            $sum: { $cond: [{ $eq: ["$analysis.ghost_level", "Functional"] }, 1, 0] },
          },
          partial: {
            $sum: { $cond: [{ $eq: ["$analysis.ghost_level", "Partial"] }, 1, 0] },
          },
        },
      },
    ]);

    const byTypeAgg = await Report.aggregate([
      {
        $group: {
          _id: "$infra_type",
          total: { $sum: 1 },
          ghosts: {
            $sum: { $cond: [{ $gte: ["$analysis.ghost_score", 60] }, 1, 0] },
          },
        },
      },
    ]);

    const by_type = {};
    byTypeAgg.forEach((t) => {
      by_type[t._id] = {
        total: t.total,
        ghosts: t.ghosts,
        ghost_percentage: Math.round((t.ghosts / t.total) * 100),
      };
    });

    const top_failing_types = Object.entries(by_type)
      .sort((a, b) => b[1].ghost_percentage - a[1].ghost_percentage)
      .slice(0, 3)
      .map(([type, data]) => ({ type, ...data }));

    const locationAgg = await Report.aggregate([
      { $match: { "analysis.ghost_score": { $gte: 60 } } },
      {
        $group: {
          _id: {
            $concat: [
              { $toString: { $round: ["$latitude", 4] } },
              ",",
              { $toString: { $round: ["$longitude", 4] } },
            ],
          },
          ghost_count: { $sum: 1 },
        },
      },
      { $sort: { ghost_count: -1 } },
      { $limit: 5 },
    ]);

    const affected_locations = locationAgg.map((l) => ({
      location: l._id,
      ghost_count: l.ghost_count,
    }));

    const stats = {
      total_reports: counts?.total_reports || 0,
      infra_ghosts: counts?.infra_ghosts || 0,
      functional: counts?.functional || 0,
      partial: counts?.partial || 0,
      by_type,
      top_failing_types,
      affected_locations,
    };

    res.json(stats);
  } catch (error) {
    console.error("Stats error:", error.message);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

app.get("/api/health", async (req, res) => {
  const mongoose = require("mongoose");
  const dbState = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting
  res.json({
    status: dbState === 1 ? "ok" : "degraded",
    db: dbState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/config", (req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_TOKEN || "" });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`InfraGhost AI running on http://localhost:${PORT}`);
  });
}

startServer();

