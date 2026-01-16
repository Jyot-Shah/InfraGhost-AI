const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();

const { analyzeInfrastructure } = require("./gemini");

if (!process.env.MAPBOX_TOKEN) {
  console.error("❌ MAPBOX_TOKEN is required in .env file");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const REPORTS_FILE = path.join(__dirname, "reports.json");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
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

async function saveReports(reports) {
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await getReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

app.post("/api/submit-report", async (req, res) => {
  try {
    const { infra_type, comment, latitude, longitude, image_base64 } = req.body;

    if (!infra_type || !image_base64 || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`🔍 Analyzing ${infra_type} at [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`);

    const analysis = await analyzeInfrastructure(image_base64, infra_type, comment);

    const report = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      infra_type,
      comment: comment || "No comment",
      latitude,
      longitude,
      analysis,
      image_base64: image_base64.substring(0, 100) + "...",
    };

    const reports = await getReports();
    reports.push(report);
    await saveReports(reports);

    res.json({ success: true, report });
  } catch (error) {
    console.error("Report submission error:", error.message);
    res.status(500).json({ error: error.message });
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

