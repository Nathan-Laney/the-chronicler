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
                .setName("character_name")
                .setDescription("The character to add XP to.")
                .setRequired(true)
                .setAutocomplete(true)
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
                .setRequired(false)
                .setAutocomplete(true)
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
                .setRequired(false)
                .setAutocomplete(true)
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
                .setName("character_name")
                .setDescription("The character to remove XP from.")
                .setRequired(true)
                .setAutocomplete(true)
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
                .setRequired(false)
                .setAutocomplete(true)
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
                .setRequired(false)
                .setAutocomplete(true)
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("transfer")
        .setDescription("Transfer XP from your bank to a character.")
        .addStringOption((option) =>
          option
            .setName("character_name")
            .setDescription("The character to transfer XP to.")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount of XP to transfer.")
            .setRequired(true)
            .setMinValue(1)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    const user = interaction.user.id;
    const amount = interaction.options.getInteger("amount");
    const mission = interaction.options.getString("mission");

    if (subcommand === "bank") {
      const username = interaction.member.displayName;
      const profile = await profileModel.findOne({ userId: user });
      if (!profile) {
        return interaction.editReply("This profile does not exist!");
      }

      let update;
      if (group === "add") {
        update = { $inc: { experience: amount } };
        if (mission) {
          update.$push = { missions: mission };
        }
      } else if (group === "remove") {
        update = {
          $inc: { experience: -amount },
        };
        if (mission) {
          update.$pull = { missions: mission };
        }
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
        `${group === "add" ? "Added" : "Removed"} \`${amount}\` XP ${
          group === "add" ? "to" : "from"
        } **${username}**'s bank${mission ? ` from **${mission}**` : ""}. You now have \`${newExperience}\` XP in your bank.`
      );
    }

    if (subcommand === "character") {
      const character_name = interaction.options.getString("character_name");
      const character = await characterModel.findOne({
        ownerId: user,
        characterName: character_name,
      });
      if (!character) {
        return interaction.editReply("This character does not exist!");
      }

      const oldExperience = character.experience;

      let update;
      if (group === "add") {
        update = {
          $inc: {
            experience: amount,
            downtime: amount * 2 // Add 2 days of downtime per 1 XP
          }
        };
        if (mission) {
          update.$push = { missions: mission };
        }
      } else if (group === "remove") {
        update = {
          $inc: { experience: -amount },
        };
        if (mission) {
          update.$pull = { missions: mission };
        }
      }

      const result = await characterModel.findOneAndUpdate(
        {
          ownerId: user,
          characterName: character_name,
        },
        update,
        { new: true }
      );

      if (!result) {
        return interaction.editReply("This character does not exist!");
      }

      const newExperience = result.experience;
      const earnings = calculateGainedGPAndLevel(oldExperience, newExperience);
      const finalUpdate = await characterModel.findOneAndUpdate(
        {
          ownerId: user,
          characterName: character_name,
        },
        {
          $set: { level: earnings.characterLevel },
        },
        { new: true }
      );

      return interaction.editReply(
        `${group === "add" ? "Added" : "Removed"} **${amount}** XP ${
          group === "add" ? "to" : "from"
        } **${character_name}**${
          mission ? ` from **${mission}**` : ""
        }. \n**${character_name}** now has a total of **${newExperience}** XP, ${
          group === "add" ? "gains" : "loses"
        } **${earnings.gpGained}** GP and is now level **${
          earnings.characterLevel
        }**${group === "add" ? `, and gained **${amount * 2}** days of downtime` : ""}.`
      );
    }
    if (subcommand === "transfer") {
      const character_name = interaction.options.getString("character_name");
      const profile = await profileModel.findOne({ userId: user });

      if (!profile) {
        return interaction.editReply("This profile does not exist!");
      }

      if (profile.experience < amount) {
        return interaction.editReply(
          `You do not have enough XP in your bank. You currently have ${profile.experience} XP in your bank.`
        );
      }

      const character = await characterModel.findOne({
        ownerId: user,
        characterName: character_name,
      });

      if (!character) {
        return interaction.editReply("This character does not exist!");
      }

      const oldExperience = character.experience;

      // Deduct XP from the user's bank and add it to the character's experience
      const updatedProfile = await profileModel.findOneAndUpdate(
        { userId: user },
        { $inc: { experience: -amount } },
        { new: true } // Ensure we get the updated profile
      );

      if (!updatedProfile) {
        return interaction.editReply(
          "Error updating your profile. Please try again."
        );
      }

      const result = await characterModel.findOneAndUpdate(
        {
          ownerId: user,
          characterName: character_name,
        },
        {
          $inc: {
            experience: amount,
            downtime: amount * 2 // Add 2 days of downtime per 1 XP
          },
        },
        { new: true } // Ensure we get the updated character
      );

      if (!result) {
        // If updating character XP fails, revert the XP deduction
        await profileModel.findOneAndUpdate(
          { userId: user },
          { $inc: { experience: amount } }
        );
        return interaction.editReply(
          "Error updating character XP. Transaction reverted."
        );
      }
      const newExperience = result.experience;
      const earnings = calculateGainedGPAndLevel(oldExperience, newExperience);

      // Update the character's level
      const updatedCharacter = await characterModel.findOneAndUpdate(
        {
          ownerId: user,
          characterName: character_name,
        },
        {
          $set: { level: earnings.characterLevel },
        },
        { new: true }
      );

      if (!updatedCharacter) {
        return interaction.editReply(
          "Error updating character level. Please try again."
        );
      }

      return interaction.editReply(
        `Transferred **${amount}** XP from your bank to **${character_name}**. You have \`${updatedProfile.experience}\` XP left in your bank.\n**${character_name}** now has a total of **${newExperience}** XP, gains **${earnings.gpGained}** GP, and is now level **${earnings.characterLevel}**. They also gained **${amount * 2}** days of downtime.`
      );
    }
  },
};
