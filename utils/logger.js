/**
 * Logger utility for command execution logging
 * Provides helper functions for the command logging system
 */

const CommandLog = require('../models/logSchema');

/**
 * Truncates a string if it exceeds the maximum length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Truncated text with indicator if truncation occurred
 */
function truncateText(text, maxLength = 5000) {
  if (!text) return '';
  
  // Convert to string if not already
  const textStr = String(text);
  
  if (textStr.length <= maxLength) return textStr;
  
  // If text exceeds max length, truncate and add indicator
  const halfLength = Math.floor((maxLength - 30) / 2);
  const beginning = textStr.substring(0, halfLength);
  const ending = textStr.substring(textStr.length - halfLength);
  
  return `${beginning}\n\n... [TRUNCATED - ${textStr.length - maxLength} characters omitted] ...\n\n${ending}`;
}

/**
 * Formats command options into a readable string
 * @param {Object} options - Command options from interaction
 * @returns {string} - Formatted command text
 */
function formatCommandText(commandName, options) {
  if (!options || Object.keys(options).length === 0) {
    return `/${commandName}`;
  }
  
  // Start with the command name
  let commandText = `/${commandName}`;
  
  // Handle subcommand groups and subcommands
  const subcommandGroup = options.getSubcommandGroup(false);
  const subcommand = options.getSubcommand(false);
  
  if (subcommandGroup) {
    commandText += ` ${subcommandGroup}`;
  }
  
  if (subcommand) {
    commandText += ` ${subcommand}`;
  }
  
  // Get all options
  const optionsData = [];
  
  // Process string options
  options.data.forEach(option => {
    if (option.value !== undefined && option.value !== null) {
      optionsData.push(`${option.name}:"${option.value}"`);
    }
  });
  
  // Add options to command text if any exist
  if (optionsData.length > 0) {
    commandText += ` ${optionsData.join(' ')}`;
  }
  
  return commandText;
}

/**
 * Extracts command options from interaction
 * @param {Object} options - Command options from interaction
 * @returns {Object} - Structured command options
 */
function extractCommandOptions(options) {
  if (!options || !options.data) return {};
  
  const result = {};
  
  // Handle subcommand groups and subcommands
  const subcommandGroup = options.getSubcommandGroup(false);
  const subcommand = options.getSubcommand(false);
  
  if (subcommandGroup) {
    result.subcommandGroup = subcommandGroup;
  }
  
  if (subcommand) {
    result.subcommand = subcommand;
  }
  
  // Extract all option values
  options.data.forEach(option => {
    if (option.value !== undefined && option.value !== null) {
      result[option.name] = option.value;
    }
  });
  
  return result;
}

/**
 * Formats error information for logging
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error information
 */
function formatError(error) {
  return {
    message: error.message || 'Unknown error',
    stack: error.stack || 'No stack trace available'
  };
}

/**
 * Creates a command log entry in the database
 * @param {Object} logData - Log data to be stored
 * @returns {Promise<Object>} - Created log entry
 */
async function createLogEntry(logData) {
  try {
    const log = new CommandLog(logData);
    return await log.save();
  } catch (error) {
    console.error('Error creating command log entry:', error);
    // Still attempt to log the error, but with minimal information
    try {
      const fallbackLog = new CommandLog({
        commandName: logData.commandName || 'unknown',
        commandText: 'Error creating log entry',
        userId: logData.userId || 'unknown',
        username: logData.username || 'unknown',
        timezone: logData.timezone || 'UTC',
        success: false,
        errorMessage: `Error creating log entry: ${error.message}`,
        stackTrace: error.stack || 'No stack trace available'
      });
      return await fallbackLog.save();
    } catch (secondError) {
      console.error('Critical error in logging system:', secondError);
      return null;
    }
  }
}

/**
 * Gets the current timezone string
 * @returns {string} - Timezone string (e.g., "America/New_York")
 */
function getCurrentTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

module.exports = {
  truncateText,
  formatCommandText,
  extractCommandOptions,
  formatError,
  createLogEntry,
  getCurrentTimezone
};