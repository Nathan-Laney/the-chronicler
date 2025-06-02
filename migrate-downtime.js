require("dotenv").config();
const mongoose = require("mongoose");
const characterModel = require("./models/characterSchema");

const { MONGODB_SRV: database } = process.env;

// Connect to MongoDB
mongoose
  .connect(database, {})
  .then(() => {
    console.log("Connected to MongoDB");
    migrateDowntime();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  });

async function migrateDowntime() {
  try {
    // Find all characters
    const characters = await characterModel.find({});
    console.log(`Found ${characters.length} characters to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each character
    for (const character of characters) {
      // Calculate downtime based on XP (2 days per 1 XP)
      const downtimeDays = character.experience * 2;
      
      // Skip if character already has downtime calculated or should not be updated
      // (e.g., if downtime is already set or if downtimeDays is 0)
      if ((downtimeDays === 0) || (character.downtime && character.downtime > 0)) {
        console.log(`Skipping ${character.characterName} - already has ${character.downtime} downtime days`);
        skippedCount++;
        continue;
      }

      // Update the character's downtime
      await characterModel.updateOne(
        { _id: character._id },
        { $set: { downtime: downtimeDays } }
      );

      console.log(
        `Updated ${character.characterName} - XP: ${character.experience}, Downtime: ${downtimeDays} days`
      );
      updatedCount++;
    }

    console.log(`Migration complete!`);
    console.log(`Updated ${updatedCount} characters`);
    console.log(`Skipped ${skippedCount} characters`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}