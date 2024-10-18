const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const profileModel = require("../models/profileSchema");
const characterModel = require("../models/characterSchema");

// Define a slash command to manage characters.
module.exports = {
  data: new SlashCommandBuilder()
    // Set the name of the slash command.
    .setName("character")
    // Set the description for the slash command.
    .setDescription("Manage characters.")

    // Add a subcommand to create a new character.
    .addSubcommand((subcommand) =>
      subcommand
        // Set the name of the subcommand.
        .setName("create")
        // Set the description for the subcommand.
        .setDescription("Create a new character.")

        // Add an option to specify the character's name.
        .addStringOption((option) =>
          option
            // Set the name of the option.
            .setName("character_name")
            // Set the description for the option.
            .setDescription("The name of the character.")

            // Mark this option as required.
            .setRequired(true)
        )
    )

    // Add a subcommand to delete an existing character.
    .addSubcommand((subcommand) =>
      subcommand
        // Set the name of the subcommand.
        .setName("delete")
        // Set the description for the subcommand.
        .setDescription("Delete a character.")

        // Add an option to specify the character's name.
        .addStringOption((option) =>
          option
            // Set the name of the option.
            .setName("character_name")
            // Set the description for the option.
            .setDescription("The name of the character.")

            // Mark this option as required.
            .setRequired(true)
        )
    )

    // Add a subcommand to list all characters owned by a user.
    .addSubcommand((subcommand) =>
      subcommand
        // Set the name of the subcommand.
        .setName("list")
        // Set the description for the subcommand.
        .setDescription("List all characters that a user owns.")

        // Add an option to specify the user whose characters should be listed.
        .addUserOption((option) =>
          option
            // Set the name of the option.
            .setName("user")
            // Set the description for the option.
            .setDescription("The user whose characters you want to list.")
        )
    )

    // Add a subcommand group for managing character classes.
    .addSubcommandGroup((group) =>
      group
        // Set the name of the subgroup.
        .setName("class")
        // Set the description for the subgroup.
        .setDescription("Manage character classes.")

        // Add a subcommand to add a class to an existing character.
        .addSubcommand((subcommand) =>
          subcommand
            // Set the name of the subcommand.
            .setName("set")
            // Set the description for the subcommand.
            .setDescription("Add a class to a character.")

            // Add options to specify the character's name and the class to add.
            .addStringOption((option) =>
              option
                // Set the name of the option.
                .setName("character_name")
                // Set the description for the option.
                .setDescription("The name of the character.")

                // Mark this option as required.
                .setRequired(true)
            )

            .addStringOption((option) =>
              option
                // Set the name of the option.
                .setName("class")
                // Set the description for the option.
                .setDescription("The class to add.")

                // Mark this option as required.
                .setRequired(true)
            )
        )
    )

    // Add a subcommand group for managing character missions.
    .addSubcommandGroup((group) =>
      group
        // Set the name of the subgroup.
        .setName("mission")
        // Set the description for the subgroup.
        .setDescription("Manage character missions.")

        // Add a subcommand to add a mission to an existing character.
        .addSubcommand((subcommand) =>
          subcommand
            // Set the name of the subcommand.
            .setName("add")
            // Set the description for the subcommand.
            .setDescription("Add a mission to a character.")

            // Add options to specify the character's name and the mission to add.
            .addStringOption((option) =>
              option
                // Set the name of the option.
                .setName("character_name")
                // Set the description for the option.
                .setDescription("The name of the character.")

                // Mark this option as required.
                .setRequired(true)
            )

            .addStringOption((option) =>
              option
                // Set the name of the option.
                .setName("mission")
                // Set the description for the option.
                .setDescription("The mission to add.")

                // Mark this option as required.
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Remove a mission from a character.")
            .addStringOption((option) =>
              option
                .setName("character_name")
                .setDescription("The name of the character.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("mission")
                .setDescription("The mission to remove.")
                .setRequired(true)
            )
        )
    ),
  async execute(interaction) {
    // Get the subcommand name
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();

    /**
     * Handle character creation.
     */
    if (subcommand === "create") {
      // Get the character name from the options
      const characterName = interaction.options.getString("character_name");

      try {
        // Find a character with the same owner and name
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

          // Create a new character
          const character = await characterModel.create({
            ownerId: interaction.user.id,
            characterId: new mongoose.mongo.ObjectId(),
            guildId: interaction.guild.id,
            characterName: characterName,
            level: 3,
            experience: 0,
          });

          // Reply to the user with a success message
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

        // Reply to the user with an error message
        await interaction.reply({
          content: "An error occurred while creating the character.",
          ephemeral: true,
        });
      }
      /**
       * Handle character deletion.
       */
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
      /**
       * Handle listing characters.
       */
    } else if (subcommand === "list") {
      const targetUser = interaction.options.getUser("user") || interaction.user;
      const username = interaction.user;
      try {
        const characterData = await characterModel.find({
          ownerId: targetUser.id,
        });

        if (characterData.length === 0) {
          await interaction.reply({
            content: `${targetUser.id === interaction.user.id
              ? "You don't"
              : `${username} doesn't`
              } have any characters.`,
          });
          return;
        }

        let characterList = "";
        characterData.forEach((character) => {
          characterList += `\`${character.characterName}\`\nLevel: ${character.level}\nXP: ${character.experience}\nClass: ${character.class || "Not Set"}\nMissions: ${character.missions.join(", ")}\n\n`;
        });

        await interaction.reply({
          content: `> **${username}'s Characters**\n${characterList}`,
        });
      } catch (error) {
        console.error(`Error fetching character data: ${error}`);
        await interaction.reply({
          content: "An error occurred while fetching the character data.",
          ephemeral: true,
        });
      }
      /**
       * Handle adding or removing missions.
       */

      // If subcommand group is mission,
    } else if (subcommandGroup === "mission") {
      if (subcommand === "add" || subcommand === "remove") {
        const characterName = interaction.options.getString("character_name");
        const mission = interaction.options.getString("mission");
        try {
          const character = await characterModel.findOne({
            ownerId: interaction.user.id,
            characterName: characterName,
          });

          if (!character) {
            await interaction.reply({
              content: "Character not found.",
              ephemeral: true,
            });
            return;
          }

          if (subcommand === "add") {
            await characterModel.updateOne(
              { ownerId: interaction.user.id, characterName: characterName },
              { $push: { missions: mission } }
            );
            await interaction.reply({
              content: `Mission **${mission}** added to character **${characterName}**.`,
              ephemeral: true,
            });
          } else if (subcommand === "remove") {
            await characterModel.updateOne(
              { ownerId: interaction.user.id, characterName: characterName },
              { $pull: { missions: mission } }
            );
            await interaction.reply({
              content: `Mission **${mission}** removed from character **${characterName}**.`,
              ephemeral: true,
            });
          }
        } catch (error) {
          console.error(`Error updating character missions: ${error}`);
          await interaction.reply({
            content: "An error occurred while updating the character missions.",
            ephemeral: true,
          });
        }
      }
      /**
       * Handle setting class.
       */

      // if subcommand group is class...

    } else if (subcommandGroup === "class") {
      if (subcommand === "set") {
        const characterName = interaction.options.getString("character_name");
        try {
          const character = await characterModel.findOne({
            ownerId: interaction.user.id,
            characterName: characterName,
          });

          if (!character) {
            await interaction.reply({
              content: "Character not found.",
              ephemeral: true,
            });
            return;
          }

          const classString = interaction.options.getString("class");
          await characterModel.updateOne(
            { ownerId: interaction.user.id, characterName: characterName },
            { $set: { class: classString } }
          );

          await interaction.reply({
            content: `Character **${characterName}**'s class set to \`${classString}\`.`,

          });
        } catch (error) {
          console.error(`Error setting character's class: ${error}`);
          await interaction.reply({
            content: "An error occurred while setting the character's class.",
            ephemeral: true,
          });
        }
      }
    }
  },
};

