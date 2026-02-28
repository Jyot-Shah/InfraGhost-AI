/**
 * Seed script — migrates existing reports.json data into MongoDB Atlas.
 *
 * Usage:
 *   node seed.js
 *
 * Requires MONGO_URI in your .env file.
 * Run once after setting up your Atlas cluster to import historical data.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const Report = require("./models/Report");

const REPORTS_FILE = path.join(__dirname, "reports.json");

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    const raw = await fs.readFile(REPORTS_FILE, "utf8");
    const reports = JSON.parse(raw);

    if (!reports.length) {
      console.log("No reports to seed.");
      await mongoose.connection.close();
      return;
    }

    // Transform reports.json entries to match the Mongoose schema
    const docs = reports.map((r) => ({
      infra_type: r.infra_type,
      comment: r.comment || "No comment",
      latitude: r.latitude,
      longitude: r.longitude,
      analysis: r.analysis,
      createdAt: r.timestamp ? new Date(r.timestamp) : new Date(),
    }));

    const result = await Report.insertMany(docs, { ordered: false });
    console.log(`Seeded ${result.length} reports into MongoDB Atlas`);
  } catch (error) {
    if (error.code === 11000) {
      console.log("Some documents already existed (duplicates skipped).");
    } else {
      console.error("Seed error:", error.message);
    }
  } finally {
    await mongoose.connection.close();
    console.log("Connection closed.");
  }
}

seed();
