const mongoose = require("mongoose");

// Schema for command logs in the 'log' namespace
const logSchema = new mongoose.Schema({
  // Command information
  commandName: {
    type: String,
    required: true,
    index: true
  },
  commandText: {
    type: String,
    required: true
  },
  commandOptions: {
    type: Object,
    default: {}
  },
  
  // User information
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  
  // Execution details
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  timezone: {
    type: String,
    required: true
  },
  executionTimeMs: {
    type: Number,
    default: 0
  },
  
  // Output and status
  output: {
    type: String,
    default: ""
  },
  success: {
    type: Boolean,
    required: true,
    index: true
  },
  errorMessage: {
    type: String,
    default: ""
  },
  stackTrace: {
    type: String,
    default: ""
  }
}, { collection: 'command_logs' });

// Create compound indexes for common query patterns
logSchema.index({ userId: 1, commandName: 1, timestamp: -1 });
logSchema.index({ success: 1, timestamp: -1 });

const model = mongoose.model("CommandLog", logSchema);
module.exports = model;