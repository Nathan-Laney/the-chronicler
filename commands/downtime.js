const { SlashCommandBuilder } = require("discord.js");
const characterModel = require("../models/characterSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("downtime")
    .setDescription("Manage character downtime.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add downtime to a character.")
        .addStringOption((option) =>
          option
            .setName("character_name")
            .setDescription("The character to add downtime to.")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("days")
            .setDescription("The number of downtime days to add.")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("spend")
        .setDescription("Spend downtime from a character.")
        .addStringOption((option) =>
          option
            .setName("character_name")
            .setDescription("The character to spend downtime from.")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("days")
            .setDescription("The number of downtime days to spend.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option
            .setName("activity")
            .setDescription("What the character did during downtime.")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const characterName = interaction.options.getString("character_name");
    const days = interaction.options.getInteger("days");
    const activity = interaction.options.getString("activity");
    const userId = interaction.user.id;

    // Find the character
    const character = await characterModel.findOne({
      ownerId: userId,
      characterName: characterName,
    });

    if (!character) {
      return interaction.editReply({
        content: `Character **${characterName}** not found!`,
      });
    }

    if (subcommand === "add") {
      // Add downtime to the character
      const result = await characterModel.findOneAndUpdate(
        {
          ownerId: userId,
          characterName: characterName,
        },
        {
          $inc: { downtime: days },
        },
        { new: true }
      );

      if (!result) {
        return interaction.editReply("Error updating character downtime.");
      }

      return interaction.editReply(
        `Added **${days}** days of downtime to **${characterName}**. They now have a total of **${result.downtime}** days of downtime.`
      );
    } else if (subcommand === "spend") {
      // Check if character has enough downtime
      if (character.downtime < days) {
        return interaction.editReply(
          `**${characterName}** doesn't have enough downtime. They currently have **${character.downtime}** days.`
        );
      }

      // Create activity record with timestamp
      const activityRecord = activity
        ? `${new Date().toISOString().split('T')[0]}: Spent ${days} days on ${activity}`
        : `${new Date().toISOString().split('T')[0]}: Spent ${days} days`;
      
      // Spend downtime from the character and record the activity
      const result = await characterModel.findOneAndUpdate(
        {
          ownerId: userId,
          characterName: characterName,
        },
        {
          $inc: { downtime: -days },
          $push: { downtimeActivities: activityRecord }
        },
        { new: true }
      );

      if (!result) {
        return interaction.editReply("Error updating character downtime.");
      }

      // Get the total number of activities
      const activityCount = result.downtimeActivities?.length || 0;
      
      return interaction.editReply(
        `**${characterName}** spent **${days}** days of downtime${
          activity ? ` on **${activity}**` : ""
        }. They have **${result.downtime}** days of downtime remaining.\n` +
        `This activity has been recorded in their history (total activities: ${activityCount}). ` +
        `Use \`/character activities ${characterName}\` to view all downtime activities.`
      );
    }
  },
};