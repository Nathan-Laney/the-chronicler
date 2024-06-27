const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    default: 0,
  },
  missions: {
    type: Array,
    default: [],
  },
});

const model = mongoose.model("profiles", profileSchema);
module.exports = model;
