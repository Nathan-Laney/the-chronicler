const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const profileModel = require("../models/profileSchema");
const characterModel = require("../models/characterSchema");
const calculateGainedGPAndLevel = require("../experienceTable");
const mongoose = require("mongoose");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription(
      "Administration commands for server owners to manage XP of others."
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) =>
      group
        .setName("xp")
        .setDescription("Manage XP.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("addbank")
            .setDescription("Add XP to the bank.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to add XP to.")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("The amount of XP to add.")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((option) =>
              option
                .setName("mission")
                .setDescription("The mission from which you received XP.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("removebank")
            .setDescription("Remove XP from the bank.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to remove XP from.")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("The amount of XP to remove.")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((option) =>
              option
                .setName("mission")
                .setDescription("The mission you want removed (if any).")
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("addcharacter")
            .setDescription("Add XP to a character.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to add XP to.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The character to add XP to.")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("The amount of XP to add.")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((option) =>
              option
                .setName("mission")
                .setDescription("The mission from which you received XP.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("removecharacter")
            .setDescription("Remove XP from a character.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to remove XP from.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The character to remove XP from.")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("The amount of XP to remove.")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((option) =>
              option
                .setName("mission")
                .setDescription("The mission you want removed (if any).")
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("character")
        .setDescription("Character management commands.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Create a new character.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to create the character for.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The name of the character.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Delete a character.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to delete the character for.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The name of the character.")
                .setRequired(true)
            )
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const mission = interaction.options.getString("mission");
    const characterName = interaction.options.getString("character_name");

    if (targetUser) {
      let targetProfile = await profileModel.findOne({ userId: targetUser.id });
      if (!targetProfile) {
        targetProfile = await profileModel.create({
          userId: targetUser.id,
          guildId: interaction.guild.id,
          experience: 0,
        });
      }
    }
    if (group === "xp") {
      if (subcommand === "addbank" || subcommand === "removebank") {
        const profile = await profileModel.findOne({ userId: targetUser.id });
        if (!profile) {
          return interaction.editReply("This profile does not exist!");
        }

        const update = {
          $inc: { experience: subcommand === "addbank" ? amount : -amount },
          ...(subcommand === "addbank"
            ? { $push: { missions: mission } }
            : { $pull: { missions: mission } }),
        };

        const result = await profileModel.findOneAndUpdate(
          { userId: targetUser.id },
          update,
          { new: true }
        );

        if (!result) {
          return interaction.editReply("This profile does not exist!");
        }

        return interaction.editReply(
          `${subcommand === "addbank" ? "Added" : "Removed"} ${amount} XP ${
            subcommand === "addbank" ? "to" : "from"
          } ${targetUser.username}'s bank from ${mission}.`
        );
      }

      if (subcommand === "addcharacter" || subcommand === "removecharacter") {
        // console.log(targetUser.id, characterName, amount, mission);
        const character = await characterModel.findOne({
          ownerId: targetUser.id,
          characterName: characterName,
        });
        if (!character) {
          //   console.log("You were right");
          return interaction.editReply("This character does not exist!");
        }

        const oldExperience = character.experience;

        const update = {
          $inc: {
            experience: subcommand === "addcharacter" ? amount : -amount,
          },
          ...(subcommand === "addcharacter"
            ? { $push: { missions: mission } }
            : { $pull: { missions: mission } }),
        };

        const result = await characterModel.findOneAndUpdate(
          {
            ownerId: targetUser.id,
            characterName: characterName,
          },
          update,
          { new: true }
        );

        if (!result) {
          return interaction.editReply("This character does not exist!");
        }

        const newExperience = result.experience;
        const earnings = calculateGainedGPAndLevel(
          oldExperience,
          newExperience
        );
        const finalUpdate = await characterModel.findOneAndUpdate(
          {
            ownerId: targetUser.id,
            characterName: characterName,
          },
          {
            $set: { level: earnings.characterLevel },
          },
          { new: true }
        );

        return interaction.editReply(
          `${
            subcommand === "addcharacter" ? "Added" : "Removed"
          } **${amount}** XP ${
            subcommand === "addcharacter" ? "to" : "from"
          } **${characterName}** from \`${mission}\`. \n**${characterName}** now has a total of **${newExperience}** XP, ${
            subcommand === "addcharacter" ? "gains" : "loses"
          } **${earnings.gpGained}** GP and is now level **${
            earnings.characterLevel
          }**.`
        );
      }
    }

    if (group === "character") {
      if (subcommand === "add") {
        const newCharacter = new characterModel({
          ownerId: targetUser.id,
          characterId: new mongoose.mongo.ObjectId(),
          guildId: interaction.guild.id,
          characterName: characterName,
          experience: 0,
          missions: [],
        });

        await newCharacter.save();
        return interaction.editReply(
          `Character **${characterName}** has been created for **${targetUser.username}**.`
        );
      }

      if (subcommand === "remove") {
        const character = await characterModel.findOneAndDelete({
          ownerId: targetUser.id,
          characterName: characterName,
        });

        if (!character) {
          return interaction.editReply("This character does not exist!");
        }

        return interaction.editReply(
          `Character **${characterName}** has been deleted for **${targetUser.username}**.`
        );
      }
    }
  },
};
