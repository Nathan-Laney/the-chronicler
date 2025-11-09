const { Events } = require("discord.js");
const profileModel = require("../models/profileSchema");
const logger = require("../utils/logger");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    // Variables for command logging
    let commandStartTime = Date.now();
    let commandSuccess = false;
    let commandOutput = "";
    let errorInfo = null;
    
    // Get command information
    const commandName = interaction.commandName;
    const commandOptions = interaction.options;
    const commandText = logger.formatCommandText(commandName, commandOptions);
    const extractedOptions = logger.extractCommandOptions(commandOptions);

    // Grab the profile data of the user who sent the command
    let profileData;
    try {
      profileData = await profileModel.findOne({ userId: interaction.user.id });
      if (!profileData) {
        console.log(
          "Creating a new profile for user " +
            interaction.user.id +
            " in guild " +
            interaction.guild.id
        );
        let profile = await profileModel.create({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          experience: 0,
        });
        profileData = profile;
      }
    } catch (error) {
      console.error(
        `Error fetching profile data in interactionCreate event: ${error}`
      );
      
      // Log profile data fetch error
      errorInfo = logger.formatError(error);
      commandOutput += `Error fetching profile data: ${error.message}\n`;
    }

    const command = interaction.client.commands.get(commandName);

    if (!command) {
      console.error(
        `No command matching ${commandName} was found.`
      );
      
      // Log command not found error
      commandOutput += `No command matching ${commandName} was found.`;
      
      // Create log entry for command not found
      await logger.createLogEntry({
        commandName: commandName,
        commandText: commandText,
        commandOptions: extractedOptions,
        userId: interaction.user.id,
        username: interaction.user.tag,
        timestamp: new Date(),
        timezone: logger.getCurrentTimezone(),
        executionTimeMs: Date.now() - commandStartTime,
        output: logger.truncateText(commandOutput, 5000),
        success: false,
        errorMessage: `Command not found: ${commandName}`,
        stackTrace: ""
      });
      
      return;
    }

    // Create a proxy for console.log to capture command output
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = function() {
      const args = Array.from(arguments);
      const logMessage = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      commandOutput += logMessage + '\n';
      originalConsoleLog.apply(console, arguments);
    };
    
    console.error = function() {
      const args = Array.from(arguments);
      const logMessage = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      commandOutput += '[ERROR] ' + logMessage + '\n';
      originalConsoleError.apply(console, arguments);
    };

    try {
      // Execute the command
      await command.execute(interaction, profileData);
      commandSuccess = true;
    } catch (error) {
      console.error(`Error executing ${commandName}`);
      console.error(error);
      
      // Capture error information
      errorInfo = logger.formatError(error);
      commandSuccess = false;
    } finally {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      // Calculate execution time
      const executionTimeMs = Date.now() - commandStartTime;
      
      // Create log entry
      await logger.createLogEntry({
        commandName: commandName,
        commandText: commandText,
        commandOptions: extractedOptions,
        userId: interaction.user.id,
        username: interaction.user.tag,
        timestamp: new Date(),
        timezone: logger.getCurrentTimezone(),
        executionTimeMs: executionTimeMs,
        output: logger.truncateText(commandOutput, 5000),
        success: commandSuccess,
        errorMessage: errorInfo ? errorInfo.message : "",
        stackTrace: errorInfo ? errorInfo.stack : ""
      });
    }
  },
};