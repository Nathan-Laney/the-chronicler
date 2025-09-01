const mongoose = require("mongoose");

const archivedProfileSchema = new mongoose.Schema({
  characterName: {
    type: String,
    required: true,
  },
  characterId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    default: 0,
  },
  downtime: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 3,
  },
  missions: {
    type: Array,
    default: [],
  },
  downtimeActivities: {
    type: Array,
    default: [],
  },
  class: {
    type: String,
    required: false,
  }, 
  description: {
    type: String,
    required: false,
  },
  archivedAt: {
    type: Date,
    default: Date.now,
  },
  archivedBy: {
    type: String,
    required: true,
  },
});

const model = mongoose.model("archived-characters", archivedProfileSchema);
module.exports = model;
