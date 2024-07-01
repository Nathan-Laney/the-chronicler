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
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user whose characters you want to list.")
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const characterName = interaction.options.getString("character_name");
      try {
        const characterData = await characterModel.findOne({
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

          const character = await characterModel.create({
            ownerId: interaction.user.id,
            characterId: new mongoose.mongo.ObjectId(),
            guildId: interaction.guild.id,
            characterName: characterName,
            level: 3,
            experience: 0,
          });

          await interaction.reply({
            content: `Character ${character.characterName} created.`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "Character already exists.",
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error(`Error creating character: ${error}`);
        await interaction.reply({
          content: "An error occurred while creating the character.",
          ephemeral: true,
        });
      }
    } else if (subcommand === "delete") {
      const characterName = interaction.options.getString("character_name");
      try {
        const characterData = await characterModel.findOne({
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

        // Add half of the character's experience to the owner's bank, rounded down.
        const experienceToAdd = Math.floor(characterData.experience / 2);
        const updatedProfile = await profileModel.findOneAndUpdate(
          { userId: interaction.user.id },
          { $inc: { experience: experienceToAdd } },
          { new: true }
        );

        await characterModel.deleteOne({
          ownerId: interaction.user.id,
          characterName: characterName,
        });

        await interaction.reply({
          content: `Character **${characterName}** deleted. *They had a good run.*\n**${characterName}** had \`${characterData.experience}\` XP when they were removed. Retiring characters returns half XP, rounded down.\nYou gain \`${experienceToAdd}\` experience, and now have \`${updatedProfile.experience}\` XP in your bank.`,
        });
      } catch (error) {
        console.error(`Error deleting character: ${error}`);
        await interaction.reply({
          content: "An error occurred while deleting the character.",
          ephemeral: true,
        });
      }
    } else if (subcommand === "list") {
      const targetUser = interaction.options.getUser("user") || interaction.user;
      try {
        const characterData = await characterModel.find({
          ownerId: targetUser.id,
        });
    
        if (characterData.length === 0) {
          await interaction.reply({
            content: `${
              targetUser.id === interaction.user.id
                ? "You don't"
                : `${targetUser.username} doesn't`
            } have any characters.`,
          });
          return;
        }
    
        let characterList = "";
        characterData.forEach((character) => {
          characterList += `\`${character.characterName}\`\nXP: **${character.experience}**, Level **${character.level}**, \nMissions: ${character.missions.join(", ")}\n\n`;
        });
    
        await interaction.reply({
          content: `> **${targetUser.username}'s Characters**\n${characterList}`,
        });
      } catch (error) {
        console.error(`Error fetching character data: ${error}`);
        await interaction.reply({
          content: "An error occurred while fetching the character data.",
          ephemeral: true,
        });
      }
    }
  }
};