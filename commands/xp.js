const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");
const characterModel = require("../models/characterSchema");
const calculateGainedGPAndLevel = require("../experienceTable");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Manage your XP.")
    .addSubcommandGroup((group) =>
      group
        .setName("add")
        .setDescription("Add XP.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("character")
            .setDescription("Add XP to a character.")
            .addStringOption((option) =>
              option
                .setName("target")
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
            .setName("bank")
            .setDescription("Add XP to your bank.")
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
    )
    .addSubcommandGroup((group) =>
      group
        .setName("remove")
        .setDescription("Remove XP.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("character")
            .setDescription("Remove XP from a character.")
            .addStringOption((option) =>
              option
                .setName("target")
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
                .setDescription("The mission from which you received XP.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("bank")
            .setDescription("Remove XP from your bank.")
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
                .setDescription("The mission from which you received XP.")
                .setRequired(true)
            )
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    const user = interaction.user.id;
    const amount = interaction.options.getInteger("amount");
    const mission = interaction.options.getString("mission");

    if (subcommand === "bank") {
      const target = interaction.member.nickname;
      const profile = await profileModel.findOne({ userId: user });
      if (!profile) {
        return interaction.editReply("This profile does not exist!");
      }

      let update;
      if (group === "add") {
        update = { $inc: { experience: amount }, $push: { missions: mission } };
      } else if (group === "remove") {
        update = {
          $inc: { experience: -amount },
          $pull: { missions: mission },
        };
      }

      const result = await profileModel.findOneAndUpdate(
        { userId: user },
        update,
        { new: true }
      );

      if (!result) {
        return interaction.editReply("This profile does not exist!");
      }

      const newExperience = result.experience;
      return interaction.editReply(
        `${group === "add" ? "Added" : "Removed"} ${amount} XP ${
          group === "add" ? "to" : "from"
        } ${target}'s bank from ${mission}.`
      );
    }

    if (subcommand === "character") {
      const target = interaction.options.getString("target");
      const character = await characterModel.findOne({
        ownerId: user,
        characterName: target,
      });
      if (!character) {
        return interaction.editReply("This character does not exist!");
      }

      const oldExperience = character.experience;

      let update;
      if (group === "add") {
        update = { $inc: { experience: amount }, $push: { missions: mission } };
      } else if (group === "remove") {
        update = {
          $inc: { experience: -amount },
          $pull: { missions: mission },
        };
      }

      const result = await characterModel.findOneAndUpdate(
        {
          ownerId: user,
          characterName: target,
        },
        update,
        { new: true }
      );

      if (!result) {
        return interaction.editReply("This character does not exist!");
      }

      const newExperience = result.experience;
      const experienceGained = newExperience - oldExperience;
      const earnings = calculateGainedGPAndLevel(oldExperience, newExperience);

      return interaction.editReply(
        `${group === "add" ? "Added" : "Removed"} **${amount}** XP ${
          group === "add" ? "to" : "from"
        } **${target}** from \`${mission}\`. \n**${target}** now has a total of **${newExperience}** XP, ${
          group === "add" ? "gains" : "loses"
        } **${earnings.gpGained}** GP and is now level **${
          earnings.characterLevel
        }**.`
      );
    }
  },
};
