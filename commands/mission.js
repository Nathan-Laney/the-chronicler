const { SlashCommandBuilder } = require("discord.js");
const missionModel = require("../models/missionSchema");
const characterModel = require("../models/characterSchema");
const profileModel = require("../models/profileSchema");
const { StringSelectMenuBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuOptionBuilder } = require("discord.js");

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
        .setName("list")
        .setDescription("List all active and completed missions.")
    )
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removeplayer")
        .setDescription("Remove a player from the mission.")
        .addStringOption((option) =>
          option
            .setName("mission_name")
            .setDescription("The name of the mission to remove a player from.")
            .setRequired(true)
            .setAutocomplete(true)
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
            .setAutocomplete(true)
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The GM whose mission to view (defaults to you).")
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a mission.")
        .addStringOption((option) =>
          option
            .setName("mission_name")
            .setDescription("The name of the mission to delete.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      const activeMissions = await missionModel.find({ missionStatus: "active", guildId: interaction.guild.id });
      const completedMissions = await missionModel.find({ missionStatus: "complete", guildId: interaction.guild.id });

      const embed = {
        color: getRandomColor(),
        title: "Mission List",
        fields: [],
      };

      // Group missions by GM's display name
      const gmMissions = {};

      for (const mission of activeMissions) {
        const member = await interaction.guild.members.fetch(mission.gmId);
        const displayName = member.displayName || member.user.username || "Error, show Wolf this text. 29014";
        if (!gmMissions[displayName]) {
          gmMissions[displayName] = { active: [], completed: [] };
        }
        gmMissions[displayName].active.push(mission.missionName);
      }

      for (const mission of completedMissions) {
        const member = await interaction.guild.members.fetch(mission.gmId);
        const displayName = member.displayName || member.user.username || "Error, show Wolf this text. 92102";
        if (!gmMissions[displayName]) {
          gmMissions[displayName] = { active: [], completed: [] };
        }
        gmMissions[displayName].completed.push(mission.missionName);
      }

      // Add fields to embed
      for (const [gm, missions] of Object.entries(gmMissions)) {
        if (missions.active.length > 0) {
          embed.fields.push({
            name: `Active Missions for ${gm}`,
            value: missions.active.join(", "),
            inline: false,
          });
        }
        if (missions.completed.length > 0) {
          embed.fields.push({
            name: `Completed Missions for ${gm}`,
            value: missions.completed.join(", "),
            inline: false,
          });
        }
      }

      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === "create") {
      const missionName = interaction.options.getString("mission_name");
      const gmId = interaction.user.id;
      const guildId = interaction.guild.id;

      const newMission = new missionModel({
        missionName,
        guildId,
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
      });
    } else if (subcommand === "addplayer") {
      const targetUser = interaction.options.getUser("user");
      console.log('DEBUG - Target user:', targetUser);
      
      // Get all missions the command user is GM of
      const missions = await missionModel.find({
          gmId: interaction.user.id,
          guildId: interaction.guild.id,
          missionStatus: "active"
      });

      if (!missions.length) {
          return interaction.reply({
              content: "You don't have any active missions. Create a mission first!",
              ephemeral: true
          });
      }

      // Create the mission select menu
      const missionSelect = new StringSelectMenuBuilder()
          .setCustomId(`select_mission_for_player_${targetUser.id}`)
          .setPlaceholder('Select a mission')
          .addOptions(
              missions.map(mission => 
                  new StringSelectMenuOptionBuilder()
                      .setLabel(mission.missionName)
                      .setDescription(`${mission.characterNames.length} players`)
                      .setValue(mission.missionName)
              )
          );

      const row = new ActionRowBuilder().addComponents(missionSelect);

      const embed = {
          color: getRandomColor(),
          title: 'Add Player to Mission',
          description: `Select which mission to add <@${targetUser.id}> to.`,
      };

      return interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
      });
    } else if (subcommand === "removeplayer") {
      // Let the event handler handle this
      return;
    } else if (subcommand === "info") {
      const missionName = interaction.options.getString("mission_name");
      const targetUser = interaction.options.getUser("user") || interaction.user;

      let mission;
      if (missionName) {
        mission = await missionModel.findOne({ 
          missionName,
          guildId: interaction.guild.id
        });
      } else {
        mission = await missionModel.findOne({
          gmId: targetUser.id,
          guildId: interaction.guild.id,
          missionStatus: "active",
        }).sort({ createdAt: -1 });
      }

      if (!mission) {
        return interaction.reply({
          content: missionName
            ? `Could not find mission "${missionName}".`
            : `Could not find any active missions${targetUser.id !== interaction.user.id ? ` for ${targetUser}` : ''}.`,
          ephemeral: true,
        });
      }

      const embed = {
        color: getRandomColor(),
        title: mission.missionName,
        fields: [
          {
            name: "Status",
            value: mission.missionStatus.charAt(0).toUpperCase() + mission.missionStatus.slice(1),
            inline: true,
          },
          {
            name: "Game Master",
            value: `<@${mission.gmId}>`,
            inline: true,
          },
          {
            name: "Players",
            value:
              mission.characterNames.length > 0
                ? mission.characterNames.join("\n")
                : "No players yet",
          },
        ],
      };

      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === "complete") {
      const missionName = interaction.options.getString("mission_name");
      const mission = await missionModel.findOne({ missionName, guildId: interaction.guild.id });

      // Check if the user is the GM or has admin permissions
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (mission.gmId !== interaction.user.id && !member.permissions.has("ADMINISTRATOR")) {
        return interaction.reply({
          content: "You do not have permission to complete this mission.",
          ephemeral: true,
        });
      }

      if (!mission) {
        return interaction.reply({
          content: "No mission found for the specified name.",
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
    } else if (subcommand === "delete") {
      const missionName = interaction.options.getString("mission_name");
      const mission = await missionModel.findOne({ missionName, guildId: interaction.guild.id });

      // Check if the user is the GM or has admin permissions
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (mission.gmId !== interaction.user.id && !member.permissions.has("ADMINISTRATOR")) {
        return interaction.reply({
          content: "You do not have permission to delete this mission.",
          ephemeral: true,
        });
      }

      if (!mission) {
        return interaction.reply({
          content: "No mission found for the specified name.",
          ephemeral: true,
        });
      }

      // Remove the mission from all players
      const players = mission.players;
      for (const playerId of players) {
        const character = await characterModel.findOne({
          ownerId: playerId,
          guildId: interaction.guild.id,
        });
        if (character) {
          character.missions = character.missions.filter(m => m !== missionName);
          await character.save();
        }
      }

      // Remove the mission from the GM's profile
      const gmProfile = await profileModel.findOne({
        userId: mission.gmId,
        guildId: interaction.guild.id,
      });
      if (gmProfile) {
        gmProfile.missions = gmProfile.missions.filter(m => m !== missionName);
        await gmProfile.save();
      }

      // Delete the mission from the database
      await missionModel.deleteOne({ missionName, guildId: interaction.guild.id });

      return interaction.reply({
        content: `Mission **${missionName}** has been deleted successfully!`,
      });
    }
  },
};