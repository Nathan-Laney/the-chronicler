const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");
const characterModel = require("../models/characterSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addxp")
    .setDescription("Add XP to a user.")
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
            .setDescription("The mission from which you recieved XP.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bank")
        .setDescription("Bank this XP.")
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
            .setDescription("The mission from which you recieved XP.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "bank") {
      const target = interaction.member.nickname;
      const user = interaction.user.id;
      const amount = interaction.options.getInteger("amount");
      const mission = interaction.options.getString("mission");
      console.log(
        "Adding " + amount + " XP to " + user + " bank from " + mission + "."
      );

      // console.log("Amount: ", amount);
      const profile = await profileModel.findOne({ userId: user });
      // console.log("Profile: ", profile);
      // console.log("Experience before update: ", profile.experience);
      const oldExperience = profile.experience;

      const result = await profileModel.findOneAndUpdate(
        {
          userId: user,
        },
        {
          $inc: {
            experience: amount,
          },
          $push: {
            missions: mission,
          },
        },
        {
          new: true, // This option returns the modified document rather than the original.
        }
      );

      const newExperience = result.experience;

      // if (!result) {
      //     return interaction.editReply("This character does not exist!.");
      // }
      return interaction.editReply(
        `Added ${amount} XP to ${target}'s bank from ${mission}.`
      );
    }
    if (subcommand === "character") {
      const target = interaction.options.getString("target");
      const user = interaction.user;
      const amount = interaction.options.getInteger("amount");
      const mission = interaction.options.getString("mission");
      console.log(
        "Adding " +
          amount +
          " XP to " +
          user.id +
          " character " +
          target +
          " from " +
          mission +
          "."
      );

      const character = await characterModel.findOne({
        ownerId: user.id,
        characterName: target,
      });
      // console.log("Profile: ", profile);
      // console.log("Experience before update: ", profile.experience);
      const oldExperience = character.experience;
      const result = await characterModel.findOneAndUpdate(
        {
          ownerId: user.id,
          characterName: target,
        },
        {
          $set: {
            experience: amount,
          },
        },
        {
          new: true, // This option returns the modified document rather than the original.
        }
      );

      const newExperience = result.experience;

      if (!result) {
        return interaction.editReply("This character does not exist!");
      }
      return interaction.editReply(
        `Added ${amount} XP to ${target} from ${mission}.`
      );
    }
  },
};
