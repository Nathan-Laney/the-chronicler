const mongoose = require("mongoose");

const missionSchema = new mongoose.Schema({
  missionId: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 15), // Randomly generated ID
  },
  missionName: {
    type: String,
    required: true,
  },
  players: {
    type: [String], // Array of user IDs
    default: [],
  },
  characterNames: {
    type: [String], // Array of character names
    default: [],
  },
  characterIds: {
    type: [String], // Array of character IDs
    default: [],
  },
  gmId: {
    type: String,
    required: true,
  },
  missionStatus: {
    type: String,
    default: 'active',
  },
});

const model = mongoose.model("missions", missionSchema);
module.exports = model;