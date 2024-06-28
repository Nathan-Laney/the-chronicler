const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const profileModel = require("../models/profileSchema");
const characterModel = require("../models/characterSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("character")
    .setDescription("Manage characters.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new character.")

        .addStringOption((option) =>
          option
            .setName("character_name")
            .setDescription("The name of the character.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a character.")
        .addStringOption((option) =>
          option
            .setName("character_name")
            .setDescription("The name of the character.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    let characterData;
    const characterName = interaction.options.getString("character_name");
    try {
      characterData = await characterModel.findOne({
        ownerId: interaction.user.id,
        characterName: characterName,
      });
      if (!characterData) {
        console.log(
          "Creating a new character for user " +
            interaction.user.id +
            " in guild " +
            interaction.guild.id
        );
        let character = await characterModel.create({
          ownerId: interaction.user.id,
          characterId: new mongoose.mongo.ObjectId(),
          guildId: interaction.guild.id,
          characterName: characterName,
          level: 3,
          experience: 0,
        });
        characterData = character;
        await interaction.reply({
          content: `Character ${characterData.characterName} created.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Character already exists.",
          ephemeral: true,
        });
        return;
      }
    } catch (error) {
      console.error(
        `Error fetching character data in interactionCreate event: ${error}`
      );
    }
  },
};
