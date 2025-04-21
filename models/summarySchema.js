const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    index: true
  },
  channelName: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true,
    index: true
  },
  summary: {
    type: String,
    required: true
  },
  contextLength: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Compound index for efficient queries by channel and model
summarySchema.index({ channelId: 1, model: 1 }, { unique: true });

const model = mongoose.model("summaries", summarySchema);
module.exports = model;