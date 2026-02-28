const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    infra_type: {
      type: String,
      required: true,
      enum: ["water", "toilet", "streetlight", "ramp"],
      index: true,
    },
    comment: {
      type: String,
      maxlength: 200,
      default: "No comment",
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    analysis: {
      exists: { type: Boolean, required: true },
      usable: { type: Boolean, required: true },
      reason: { type: String, required: true },
      usability_score: { type: Number, required: true, min: 0, max: 100 },
      ghost_score: { type: Number, required: true, min: 0, max: 100 },
      ghost_level: {
        type: String,
        required: true,
        enum: ["InfraGhost", "Partial", "Functional"],
        index: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        // Map _id to id for frontend compatibility
        ret.id = ret._id.toString();
        ret.timestamp = ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

reportSchema.index({ "analysis.ghost_score": 1 });
reportSchema.index({ "analysis.ghost_level": 1, infra_type: 1 });

module.exports = mongoose.model("Report", reportSchema);
