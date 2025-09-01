const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const profileModel = require("../models/profileSchema");
const characterModel = require("../models/characterSchema");
const archivedCharacterModel = require("../models/archivedCharacterSchema");
const missionModel = require("../models/missionSchema");
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
        .addSubcommand((subcommand) =>
          subcommand
            .setName("archive")
            .setDescription("Archive a character.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user whose character to archive.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The name of the character to archive.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("archive-all")
            .setDescription("Archive all characters for a user.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user whose characters to archive.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("restore")
            .setDescription("Restore a character from archive.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user whose character to restore.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The name of the character to restore.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("restore-all")
            .setDescription("Restore all archived characters for a user.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user whose characters to restore.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list-archived")
            .setDescription("List archived characters for a user.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user whose archived characters to list.")
                .setRequired(true)
            )
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    const username = interaction.user.displayName;
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
          } ${username}'s bank from ${mission}.`
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
          `Character **${characterName}** has been created for **${username}**.`
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
          `Character **${characterName}** has been deleted for **${username}**.`
        );
      }

      if (subcommand === "archive") {
        try {
          // Find the character to archive
          const character = await characterModel.findOne({
            ownerId: targetUser.id,
            characterName: characterName,
            guildId: interaction.guild.id,
          });

          if (!character) {
            return interaction.editReply("This character does not exist!");
          }

          // Check if character is in an active mission
          const activeMission = await missionModel.findOne({
            characterIds: character.characterId,
            missionStatus: "active",
          });

          if (activeMission) {
            return interaction.editReply(
              `Cannot archive **${characterName}** - they are currently in active mission: **${activeMission.missionName}**`
            );
          }

          // Create archived character record
          const archivedCharacter = new archivedCharacterModel({
            characterName: character.characterName,
            characterId: character.characterId,
            ownerId: character.ownerId,
            guildId: character.guildId,
            experience: character.experience,
            downtime: character.downtime,
            level: character.level,
            missions: character.missions,
            downtimeActivities: character.downtimeActivities,
            class: character.class,
            description: character.description,
            archivedBy: interaction.user.id,
          });

          await archivedCharacter.save();

          // Remove from active characters
          await characterModel.findOneAndDelete({
            ownerId: targetUser.id,
            characterName: characterName,
            guildId: interaction.guild.id,
          });

          return interaction.editReply(
            `Character **${characterName}** (Level ${character.level}, ${character.experience} XP) has been archived for **${targetUser.displayName || targetUser.username}**.`
          );
        } catch (error) {
          console.error(`Error archiving character: ${error}`);
          return interaction.editReply(
            "An error occurred while archiving the character."
          );
        }
      }

      if (subcommand === "archive-all") {
        try {
          // Find all characters for the user
          const characters = await characterModel.find({
            ownerId: targetUser.id,
            guildId: interaction.guild.id,
          });

          if (characters.length === 0) {
            return interaction.editReply(
              `**${targetUser.displayName || targetUser.username}** has no characters to archive.`
            );
          }

          // Check for characters in active missions
          const activeCharacterIds = [];
          for (const character of characters) {
            const activeMission = await missionModel.findOne({
              characterIds: character.characterId,
              missionStatus: "active",
            });
            if (activeMission) {
              activeCharacterIds.push({
                name: character.characterName,
                mission: activeMission.missionName,
              });
            }
          }

          if (activeCharacterIds.length > 0) {
            const activeList = activeCharacterIds
              .map((char) => `• **${char.name}** (in ${char.mission})`)
              .join("\n");
            return interaction.editReply(
              `Cannot archive all characters. The following are in active missions:\n${activeList}`
            );
          }

          // Archive all characters
          const archivedCharacters = [];
          for (const character of characters) {
            const archivedCharacter = new archivedCharacterModel({
              characterName: character.characterName,
              characterId: character.characterId,
              ownerId: character.ownerId,
              guildId: character.guildId,
              experience: character.experience,
              downtime: character.downtime,
              level: character.level,
              missions: character.missions,
              downtimeActivities: character.downtimeActivities,
              class: character.class,
              description: character.description,
              archivedBy: interaction.user.id,
            });

            await archivedCharacter.save();
            archivedCharacters.push(character.characterName);
          }

          // Remove all characters from active collection
          await characterModel.deleteMany({
            ownerId: targetUser.id,
            guildId: interaction.guild.id,
          });

          return interaction.editReply(
            `Archived **${archivedCharacters.length}** characters for **${targetUser.displayName || targetUser.username}**:\n• ${archivedCharacters.join("\n• ")}`
          );
        } catch (error) {
          console.error(`Error archiving all characters: ${error}`);
          return interaction.editReply(
            "An error occurred while archiving characters."
          );
        }
      }

      if (subcommand === "restore") {
        try {
          // Find the archived character
          const archivedCharacter = await archivedCharacterModel.findOne({
            ownerId: targetUser.id,
            characterName: characterName,
            guildId: interaction.guild.id,
          });

          if (!archivedCharacter) {
            return interaction.editReply(
              "This archived character does not exist!"
            );
          }

          // Check if a character with the same name already exists
          const existingCharacter = await characterModel.findOne({
            ownerId: targetUser.id,
            characterName: characterName,
            guildId: interaction.guild.id,
          });

          if (existingCharacter) {
            return interaction.editReply(
              `Cannot restore **${characterName}** - a character with this name already exists.`
            );
          }

          // Create restored character record
          const restoredCharacter = new characterModel({
            characterName: archivedCharacter.characterName,
            characterId: archivedCharacter.characterId,
            ownerId: archivedCharacter.ownerId,
            guildId: archivedCharacter.guildId,
            experience: archivedCharacter.experience,
            downtime: archivedCharacter.downtime,
            level: archivedCharacter.level,
            missions: archivedCharacter.missions,
            downtimeActivities: archivedCharacter.downtimeActivities,
            class: archivedCharacter.class,
            description: archivedCharacter.description,
          });

          await restoredCharacter.save();

          // Remove from archived characters
          await archivedCharacterModel.findOneAndDelete({
            ownerId: targetUser.id,
            characterName: characterName,
            guildId: interaction.guild.id,
          });

          return interaction.editReply(
            `Character **${characterName}** (Level ${archivedCharacter.level}, ${archivedCharacter.experience} XP) has been restored for **${targetUser.displayName || targetUser.username}**.`
          );
        } catch (error) {
          console.error(`Error restoring character: ${error}`);
          return interaction.editReply(
            "An error occurred while restoring the character."
          );
        }
      }

      if (subcommand === "restore-all") {
        try {
          // Find all archived characters for the user
          const archivedCharacters = await archivedCharacterModel.find({
            ownerId: targetUser.id,
            guildId: interaction.guild.id,
          });

          if (archivedCharacters.length === 0) {
            return interaction.editReply(
              `**${targetUser.displayName || targetUser.username}** has no archived characters to restore.`
            );
          }

          // Check for naming conflicts
          const activeCharacters = await characterModel.find({
            ownerId: targetUser.id,
            guildId: interaction.guild.id,
          });

          const activeNames = activeCharacters.map((char) => char.characterName);
          const conflicts = archivedCharacters.filter((char) =>
            activeNames.includes(char.characterName)
          );

          if (conflicts.length > 0) {
            const conflictList = conflicts
              .map((char) => `• **${char.characterName}**`)
              .join("\n");
            return interaction.editReply(
              `Cannot restore all characters. The following names conflict with existing characters:\n${conflictList}`
            );
          }

          // Restore all characters
          const restoredCharacters = [];
          for (const archivedCharacter of archivedCharacters) {
            const restoredCharacter = new characterModel({
              characterName: archivedCharacter.characterName,
              characterId: archivedCharacter.characterId,
              ownerId: archivedCharacter.ownerId,
              guildId: archivedCharacter.guildId,
              experience: archivedCharacter.experience,
              downtime: archivedCharacter.downtime,
              level: archivedCharacter.level,
              missions: archivedCharacter.missions,
              downtimeActivities: archivedCharacter.downtimeActivities,
              class: archivedCharacter.class,
              description: archivedCharacter.description,
            });

            await restoredCharacter.save();
            restoredCharacters.push(archivedCharacter.characterName);
          }

          // Remove all from archived collection
          await archivedCharacterModel.deleteMany({
            ownerId: targetUser.id,
            guildId: interaction.guild.id,
          });

          return interaction.editReply(
            `Restored **${restoredCharacters.length}** characters for **${targetUser.displayName || targetUser.username}**:\n• ${restoredCharacters.join("\n• ")}`
          );
        } catch (error) {
          console.error(`Error restoring all characters: ${error}`);
          return interaction.editReply(
            "An error occurred while restoring characters."
          );
        }
      }

      if (subcommand === "list-archived") {
        try {
          // Find all archived characters for the user
          const archivedCharacters = await archivedCharacterModel.find({
            ownerId: targetUser.id,
            guildId: interaction.guild.id,
          });

          if (archivedCharacters.length === 0) {
            return interaction.editReply(
              `**${targetUser.displayName || targetUser.username}** has no archived characters.`
            );
          }

          // Create embed for archived characters
          const embed = {
            color: 0x808080, // Gray color for archived
            title: `Archived Characters - ${targetUser.displayName || targetUser.username}`,
            fields: [],
          };

          for (const character of archivedCharacters) {
            const archivedDate = new Date(character.archivedAt).toLocaleDateString();
            embed.fields.push({
              name: `\`${character.characterName}\``,
              value:
                `**Level:** ${character.level}\n` +
                `**Class:** ${character.class || "Not Set"}\n` +
                `**XP:** ${character.experience}\n` +
                `**Downtime:** ${character.downtime || 0} days\n` +
                `**Archived:** ${archivedDate}\n` +
                `**Completed Missions:** ${
                  character.missions.length > 0
                    ? character.missions.join(", ")
                    : "None"
                }`,
              inline: false,
            });
          }

          return interaction.editReply({
            embeds: [embed],
          });
        } catch (error) {
          console.error(`Error listing archived characters: ${error}`);
          return interaction.editReply(
            "An error occurred while listing archived characters."
          );
        }
      }
    }
  },
};
