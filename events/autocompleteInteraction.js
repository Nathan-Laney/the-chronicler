const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isAutocomplete()) return;

    const focusedOption = interaction.options.getFocused(true);
    const commandName = interaction.commandName; // Get command name
    const subcommand = interaction.options.getSubcommand(false); // Get subcommand safely

    // Handle character name autocompletion
    if (
      focusedOption.name === "character_name" || // Check specific name first
      (commandName === "character" && focusedOption.name === "current_name") // Check rename case
    ) {
      let user;

      // For mission addplayer, we use the selected user
      if (commandName === "mission" && subcommand === "addplayer") {
        user = interaction.options.getUser("user");
      } else {
        // For other character commands (including rename current_name), use the interaction user
        user = interaction.user;
      }

      if (!user) return;

      // Get all characters for the user
      const characters = await characterModel.find({
        ownerId: user.id,
        guildId: interaction.guildId,
      });

      let choices = [];

      // Handle specific subcommands
      if (commandName === "character" && subcommand === "create") {
        // For create command, suggest the typed name for creation
        if (focusedOption.value.trim()) {
          choices.push({
            name: `Create: ${focusedOption.value}`, // Clarify action
            value: focusedOption.value,
          });
        }
      } else if (
        commandName === "character" &&
        subcommand === "rename" &&
        focusedOption.name === "current_name"
      ) {
        // For rename 'current_name', only show matching existing characters owned by the user
        choices = characters
          .filter((char) =>
            char.characterName
              .toLowerCase()
              .includes(focusedOption.value.toLowerCase())
          )
          .map((char) => ({
            name: char.characterName, // Simpler display name
            value: char.characterName,
          }));
      } else {
        // Default behavior for other character_name fields (e.g., info, delete)
        // Add current input as first choice if it's not empty
        if (focusedOption.value.trim()) {
          choices.push({
            name: `Custom: ${focusedOption.value}`,
            value: focusedOption.value,
          });
        }
        // Add matching existing characters
        const filtered = characters
          .filter((char) =>
            char.characterName
              .toLowerCase()
              .includes(focusedOption.value.toLowerCase())
          )
          .map((char) => ({
            name: `Existing: ${char.characterName}`,
            value: char.characterName,
          }));
        choices = [...choices, ...filtered];
      }

      await interaction.respond(choices.slice(0, 25)); // Discord has a limit of 25 choices
    }

    // Handle mission name autocompletion
    else if (
      focusedOption.name === "mission_name" || // Check specific name first
      (commandName === "mission" && focusedOption.name === "current_name") // Check rename case
    ) {
      // For removeplayer and rename, only show missions user GMs
      const needsGmFilter =
        subcommand === "removeplayer" || subcommand === "rename";

      // Get missions based on command context
      const missions = await missionModel.find({
        guildId: interaction.guildId,
        ...(needsGmFilter ? { gmId: interaction.user.id } : {}), // Apply GM filter if needed
      });

      let choices = [];

      // For rename 'current_name', only show matching existing missions GMed by the user
      if (
        commandName === "mission" &&
        subcommand === "rename" &&
        focusedOption.name === "current_name"
      ) {
        choices = missions
          .filter((mission) =>
            mission.missionName
              .toLowerCase()
              .includes(focusedOption.value.toLowerCase())
          )
          .map((mission) => {
            const status = mission.missionStatus === "active" ? "🟢" : "⭕";
            const playerCount = mission.characterNames?.length || 0;
            const details = ` | ${playerCount} player${
              playerCount !== 1 ? "s" : ""
            }`;
            return {
              name: `${status} ${mission.missionName}${details}`,
              value: mission.missionName,
            };
          });
      } else {
        // Default behavior for other mission_name fields (e.g., info, complete, delete)
        // Add current input as first choice if it's not empty
        if (focusedOption.value.trim()) {
          // Removed !isRemovePlayer check as it's handled by needsGmFilter now indirectly
          choices.push({
            name: `Custom: ${focusedOption.value}`,
            value: focusedOption.value,
          });
        }
        // Add matching existing missions
        const filtered = missions
          .filter((mission) =>
            mission.missionName
              .toLowerCase()
              .includes(focusedOption.value.toLowerCase())
          )
          .map((mission) => {
            const status = mission.missionStatus === "active" ? "🟢" : "⭕";
            const playerCount = mission.characterNames?.length || 0;
            const details = ` | ${playerCount} player${
              playerCount !== 1 ? "s" : ""
            }`;
            return {
              name: `${status} ${mission.missionName}${details}`,
              value: mission.missionName,
            };
          });
        choices = [...choices, ...filtered];
      }

      await interaction.respond(choices.slice(0, 25)); // Discord has a limit of 25 choices
    }
  },
};
