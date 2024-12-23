const { SlashCommandBuilder } = require("discord.js");
const missionModel = require("../models/missionSchema");
const characterModel = require("../models/characterSchema");
const profileModel = require("../models/profileSchema");

// Function to generate random hex color
function getRandomColor() {
  return Math.floor(Math.random()*16777215);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mission")
    .setDescription("Manage missions.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new mission.")
        .addStringOption((option) =>
          option
            .setName("mission_name")
            .setDescription("The name of the mission.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("addplayer")
        .setDescription("Add a player to the mission.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add to the mission.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("The character name of the user.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("mission_name")
            .setDescription("The name of the mission to add the player to.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Get information about a mission.")
        .addStringOption((option) =>
          option
            .setName("mission_name")
            .setDescription("The name of the mission to report on.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("complete")
        .setDescription("Complete a mission.")
        .addStringOption((option) =>
          option
            .setName("mission_name")
            .setDescription("The name of the mission to complete.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const missionName = interaction.options.getString("mission_name");
      const gmId = interaction.user.id;

      const newMission = new missionModel({
        missionName,
        players: [],
        characterNames: [],
        characterIds: [],
        gmId,
        missionStatus: "active",
      });

      await newMission.save();

      // Add the mission to the GM's profile
      const gmProfile = await profileModel.findOne({
        userId: gmId,
        guildId: interaction.guild.id,
      });

      if (gmProfile) {
        gmProfile.missions.push(missionName);
        await gmProfile.save();
      }

      return interaction.reply({
        content: `Mission **${missionName}** created successfully!`,
        ephemeral: true,
      });
    } else if (subcommand === "addplayer") {
      const userId = interaction.options.getUser("user").id;
      const characterName = interaction.options.getString("character");
      const missionName = interaction.options.getString("mission_name");

      let mission;

      if (missionName) {
        mission = await missionModel.findOne({ missionName, gmId: interaction.user.id });
      } else {
        mission = await missionModel.findOne({ gmId: interaction.user.id });
      }

      if (!mission) {
        return interaction.reply({
          content: "No mission found for the GM.",
          ephemeral: true,
        });
      }

      // Get the character ID from the character model
      const character = await characterModel.findOne({
        characterName,
        ownerId: userId,
        guildId: interaction.guild.id,
      });

      if (!character) {
        return interaction.reply({
          content: `Character **${characterName}** not found for user <@${userId}>!`,
          ephemeral: true,
        });
      }

      // Check if the character is already in an active mission
      const activeMission = await missionModel.findOne({
        characterIds: { $in: [character.characterId] },
        missionStatus: "active",
      });

      if (activeMission) {
        return interaction.reply({
          content: `Character **${characterName}** is already in an active mission: **${activeMission.missionName}**!`,
          ephemeral: true,
        });
      }

      mission.players.push(userId);
      mission.characterNames.push(characterName);
      mission.characterIds.push(character.characterId); // Add character ID to the mission
      await mission.save();

      return interaction.reply({
        content: `Player <@${userId}> with character **${characterName}** added to mission **${mission.missionName}**!`,
        ephemeral: true,
      });
    } else if (subcommand === "info") {
      const missionName = interaction.options.getString("mission_name");
      let mission;

      if (missionName) {
        mission = await missionModel.findOne({ missionName, gmId: interaction.user.id });
      } else {
        mission = await missionModel.findOne({ gmId: interaction.user.id });
      }

      if (!mission) {
        return interaction.reply({
          content: "No mission found for the GM.",
          ephemeral: true,
        });
      }

      const playersInfo = mission.players.map((playerId, index) => {
        return `<@${playerId}> - ${mission.characterNames[index]}`;
      }).join("\n");

      const embed = {
        color: getRandomColor(),
        title: `Mission: ${mission.missionName}`,
        fields: [
          {
            name: "Game Master",
            value: `<@${mission.gmId}>`,
            inline: true,
          },
          {
            name: "Status",
            value: mission.missionStatus,
            inline: true,
          },
          {
            name: "Players",
            value: playersInfo || "No players added yet.",
          },
        ],
      };

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } else if (subcommand === "complete") {
      const missionName = interaction.options.getString("mission_name");
      const mission = await missionModel.findOne({ missionName, gmId: interaction.user.id });

      if (!mission) {
        return interaction.reply({
          content: "No mission found for the GM.",
          ephemeral: true,
        });
      }

      // Set the mission status to complete
      mission.missionStatus = "complete";
      await mission.save();

      // Add the mission name to each character's missions array that was in the mission
      for (let i = 0; i < mission.players.length; i++) {
        const playerId = mission.players[i];
        const characterName = mission.characterNames[i];

        const character = await characterModel.findOne({
          characterName,
          ownerId: playerId,
          guildId: interaction.guild.id,
        });

        if (character) {
          character.missions.push(mission.missionName);
          await character.save();
        }
      }

      return interaction.reply({
        content: `Mission **${mission.missionName}** has been marked as complete, and it has been added to each character's missions list. Thanks for playing!`,
      });
    }
  },
};