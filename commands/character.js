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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all characters that a user owns.")
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "create") {
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
    } else if (subcommand === "delete") {
      const characterName = interaction.options.getString("character_name");
      try {
        let characterData = await characterModel.findOne({
          ownerId: interaction.user.id,
          characterName: characterName,
        });
        if (!characterData) {
          await interaction.reply({
            content: "Character not found.",
            ephemeral: true,
          });
          return;
        }
        await characterModel.deleteOne({
          ownerId: interaction.user.id,
          characterName: characterName,
        });
        await interaction.reply({
          content: `Character **${characterName}** deleted. *They had a good run.*\n**${characterName}** had \`${characterData.experience}\` XP when they were removed.`,
          //   ephemeral: true,
        });
      } catch (error) {
        console.error(
          `Error deleting character data in interactionCreate event: ${error}`
        );
      }
    } else if (subcommand === "list") {
      let characterData;
      try {
        characterData = await characterModel.find({
          ownerId: interaction.user.id,
        });
        if (characterData.length === 0) {
          await interaction.reply({
            content: "You don't have any characters.",
            // ephemeral: true,
          });
          return;
        }
        let characterList = "";
        characterData.forEach((character) => {
          characterList += `\`${character.characterName}\`\n`;
        });
        await interaction.reply({
          content: `> **${interaction.member.nickname}'s Characters**\n${characterList}`,
          //   ephemeral: true,
        });
      } catch (error) {
        console.error(
          `Error fetching character data in interactionCreate event: ${error}`
        );
      }
    }
  },
};
