const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
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
  level: {
    type: Number,
    default: 3,
  },
  missions: {
    type: Array,
    default: [],
  },
  class: {
    type: String,
    required: false,
  }, 
});

const model = mongoose.model("characters", profileSchema);
module.exports = model;
