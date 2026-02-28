const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();

const { analyzeInfrastructure } = require("./gemini");

if (!process.env.MAPBOX_TOKEN) {
  console.error("MAPBOX_TOKEN is required in .env file");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const REPORTS_FILE = path.join(__dirname, "reports.json");
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb" }));
app.use(express.static("public"));

async function initializeReports() {
  try {
    await fs.access(REPORTS_FILE);
  } catch {
    await fs.writeFile(REPORTS_FILE, JSON.stringify([], null, 2));
  }
}

async function getReports() {
  try {
    const data = await fs.readFile(REPORTS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Simple file lock to prevent concurrent write corruption
let writeLock = false;
async function saveReports(reports) {
  while (writeLock) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  writeLock = true;
  try {
    await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2));
  } finally {
    writeLock = false;
  }
}

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await getReports();
    res.json(reports);
  } catch (error) {
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

    const report = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      infra_type,
      comment: sanitizedComment,
      latitude: lat,
      longitude: lng,
      analysis,
      image_base64: image_base64.substring(0, 100) + "...",
    };

    const reports = await getReports();
    reports.push(report);
    await saveReports(reports);

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
    const reports = await getReports();
    const isGhost = (r) => r.analysis.ghost_score >= 60;

    const stats = {
      total_reports: reports.length,
      infra_ghosts: reports.filter(isGhost).length,
      functional: reports.filter((r) => r.analysis.ghost_level === "Functional").length,
      partial: reports.filter((r) => r.analysis.ghost_level === "Partial").length,
      by_type: {},
      top_failing_types: [],
      affected_locations: [],
    };

    reports.forEach((r) => {
      if (!stats.by_type[r.infra_type]) {
        stats.by_type[r.infra_type] = { total: 0, ghosts: 0, ghost_percentage: 0 };
      }
      stats.by_type[r.infra_type].total++;
      if (isGhost(r)) stats.by_type[r.infra_type].ghosts++;
    });

    Object.keys(stats.by_type).forEach((type) => {
      stats.by_type[type].ghost_percentage = Math.round(
        (stats.by_type[type].ghosts / stats.by_type[type].total) * 100
      );
    });

    stats.top_failing_types = Object.entries(stats.by_type)
      .sort((a, b) => b[1].ghost_percentage - a[1].ghost_percentage)
      .slice(0, 3)
      .map(([type, data]) => ({ type, ...data }));

    const locationMap = {};
    reports.filter(isGhost).forEach((r) => {
      const key = `${r.latitude.toFixed(4)},${r.longitude.toFixed(4)}`;
      locationMap[key] = (locationMap[key] || 0) + 1;
    });

    stats.affected_locations = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([loc, count]) => ({ location: loc, ghost_count: count }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_TOKEN || "" });
});

app.listen(PORT, async () => {
  await initializeReports();
  console.log(`InfraGhost AI running on http://localhost:${PORT}`);
});

