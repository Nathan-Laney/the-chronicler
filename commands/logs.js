const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logAnalyzer = require("../utils/log-analyzer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("View and analyze command logs.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Restrict to administrators
    
    // Subcommand to view recent logs
    .addSubcommand((subcommand) =>
      subcommand
        .setName("recent")
        .setDescription("View recent command logs.")
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of logs to retrieve (default: 10, max: 25)")
            .setRequired(false)
        )
    )
    
    // Subcommand to view logs for a specific command
    .addSubcommand((subcommand) =>
      subcommand
        .setName("command")
        .setDescription("View logs for a specific command.")
        .addStringOption((option) =>
          option
            .setName("command_name")
            .setDescription("The name of the command to view logs for.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of logs to retrieve (default: 10, max: 25)")
            .setRequired(false)
        )
    )
    
    // Subcommand to view logs for a specific user
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("View logs for a specific user.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to view logs for.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of logs to retrieve (default: 10, max: 25)")
            .setRequired(false)
        )
    )
    
    // Subcommand to view failed command executions
    .addSubcommand((subcommand) =>
      subcommand
        .setName("failures")
        .setDescription("View failed command executions.")
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of logs to retrieve (default: 10, max: 25)")
            .setRequired(false)
        )
    )
    
    // Subcommand to view command statistics
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats")
        .setDescription("View command usage statistics.")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    
    try {
      // Handle different subcommands
      switch (subcommand) {
        case "recent":
          await handleRecentLogs(interaction);
          break;
        case "command":
          await handleCommandLogs(interaction);
          break;
        case "user":
          await handleUserLogs(interaction);
          break;
        case "failures":
          await handleFailedLogs(interaction);
          break;
        case "stats":
          await handleCommandStats(interaction);
          break;
      }
    } catch (error) {
      console.error(`Error executing logs command: ${error}`);
      await interaction.editReply({
        content: `An error occurred while retrieving logs: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

/**
 * Handle the 'recent' subcommand
 * @param {Object} interaction - Discord interaction
 */
async function handleRecentLogs(interaction) {
  const limit = Math.min(interaction.options.getInteger("limit") || 10, 25);
  const logs = await logAnalyzer.getRecentLogs(limit);
  
  if (logs.length === 0) {
    await interaction.editReply({
      content: "No logs found.",
      ephemeral: true
    });
    return;
  }
  
  const embed = {
    title: "Recent Command Logs",
    color: 0x0099ff,
    fields: logs.map(log => ({
      name: `${log.commandName} (${log.success ? "✅" : "❌"})`,
      value: `**User:** ${log.username}\n**Command:** \`${log.commandText}\`\n**Time:** ${log.timestamp.toISOString()}\n**Duration:** ${log.executionTimeMs}ms`,
      inline: false
    })),
    footer: {
      text: `Showing ${logs.length} of ${await logAnalyzer.CommandLog.countDocuments()} logs`
    }
  };
  
  await interaction.editReply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle the 'command' subcommand
 * @param {Object} interaction - Discord interaction
 */
async function handleCommandLogs(interaction) {
  const commandName = interaction.options.getString("command_name");
  const limit = Math.min(interaction.options.getInteger("limit") || 10, 25);
  const logs = await logAnalyzer.getCommandLogs(commandName, limit);
  
  if (logs.length === 0) {
    await interaction.editReply({
      content: `No logs found for command "${commandName}".`,
      ephemeral: true
    });
    return;
  }
  
  const embed = {
    title: `Logs for Command "${commandName}"`,
    color: 0x0099ff,
    fields: logs.map(log => ({
      name: `${log.timestamp.toISOString()} (${log.success ? "✅" : "❌"})`,
      value: `**User:** ${log.username}\n**Command:** \`${log.commandText}\`\n**Duration:** ${log.executionTimeMs}ms`,
      inline: false
    })),
    footer: {
      text: `Showing ${logs.length} logs`
    }
  };
  
  await interaction.editReply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle the 'user' subcommand
 * @param {Object} interaction - Discord interaction
 */
async function handleUserLogs(interaction) {
  const user = interaction.options.getUser("user");
  const limit = Math.min(interaction.options.getInteger("limit") || 10, 25);
  const logs = await logAnalyzer.getUserLogs(user.id, limit);
  
  if (logs.length === 0) {
    await interaction.editReply({
      content: `No logs found for user ${user.tag}.`,
      ephemeral: true
    });
    return;
  }
  
  const embed = {
    title: `Command Logs for ${user.tag}`,
    color: 0x0099ff,
    fields: logs.map(log => ({
      name: `${log.commandName} (${log.success ? "✅" : "❌"})`,
      value: `**Command:** \`${log.commandText}\`\n**Time:** ${log.timestamp.toISOString()}\n**Duration:** ${log.executionTimeMs}ms`,
      inline: false
    })),
    footer: {
      text: `Showing ${logs.length} logs`
    }
  };
  
  await interaction.editReply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle the 'failures' subcommand
 * @param {Object} interaction - Discord interaction
 */
async function handleFailedLogs(interaction) {
  const limit = Math.min(interaction.options.getInteger("limit") || 10, 25);
  const logs = await logAnalyzer.getFailedLogs(limit);
  
  if (logs.length === 0) {
    await interaction.editReply({
      content: "No failed command executions found.",
      ephemeral: true
    });
    return;
  }
  
  const embed = {
    title: "Failed Command Executions",
    color: 0xff0000,
    fields: logs.map(log => ({
      name: `${log.commandName} - ${log.timestamp.toISOString()}`,
      value: `**User:** ${log.username}\n**Command:** \`${log.commandText}\`\n**Error:** ${log.errorMessage}`,
      inline: false
    })),
    footer: {
      text: `Showing ${logs.length} failed executions`
    }
  };
  
  await interaction.editReply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle the 'stats' subcommand
 * @param {Object} interaction - Discord interaction
 */
async function handleCommandStats(interaction) {
  const stats = await logAnalyzer.getCommandStats();
  
  if (stats.length === 0) {
    await interaction.editReply({
      content: "No command statistics available.",
      ephemeral: true
    });
    return;
  }
  
  // Calculate total commands and success rate
  const totalCommands = stats.reduce((sum, cmd) => sum + cmd.count, 0);
  const totalSuccess = stats.reduce((sum, cmd) => sum + cmd.successCount, 0);
  const successRate = ((totalSuccess / totalCommands) * 100).toFixed(2);
  
  // Create fields for top 10 commands
  const commandFields = stats.slice(0, 10).map(cmd => {
    const cmdSuccessRate = ((cmd.successCount / cmd.count) * 100).toFixed(2);
    return {
      name: cmd._id,
      value: `**Uses:** ${cmd.count}\n**Success Rate:** ${cmdSuccessRate}%\n**Avg Time:** ${cmd.avgExecutionTime.toFixed(2)}ms`,
      inline: true
    };
  });
  
  const embed = {
    title: "Command Usage Statistics",
    color: 0x0099ff,
    description: `**Total Commands:** ${totalCommands}\n**Overall Success Rate:** ${successRate}%`,
    fields: commandFields,
    footer: {
      text: "Top 10 commands by usage"
    }
  };
  
  await interaction.editReply({
    embeds: [embed],
    ephemeral: true
  });
}