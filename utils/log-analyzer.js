/**
 * Command Log Analyzer Utility
 * 
 * This utility provides functions for querying and analyzing command logs.
 * It can be used to generate reports, find errors, and analyze command usage.
 */

const CommandLog = require('../models/logSchema');
const mongoose = require('mongoose');

/**
 * Get recent command logs
 * @param {number} limit - Maximum number of logs to retrieve
 * @returns {Promise<Array>} - Array of log entries
 */
async function getRecentLogs(limit = 20) {
  return await CommandLog.find()
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Get logs for a specific command
 * @param {string} commandName - Name of the command
 * @param {number} limit - Maximum number of logs to retrieve
 * @returns {Promise<Array>} - Array of log entries
 */
async function getCommandLogs(commandName, limit = 100) {
  return await CommandLog.find({ commandName })
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Get logs for a specific user
 * @param {string} userId - Discord user ID
 * @param {number} limit - Maximum number of logs to retrieve
 * @returns {Promise<Array>} - Array of log entries
 */
async function getUserLogs(userId, limit = 100) {
  return await CommandLog.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Get failed command executions
 * @param {number} limit - Maximum number of logs to retrieve
 * @returns {Promise<Array>} - Array of log entries
 */
async function getFailedLogs(limit = 100) {
  return await CommandLog.find({ success: false })
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Get logs from a specific time period
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of log entries
 */
async function getLogsByDateRange(startDate, endDate) {
  return await CommandLog.find({
    timestamp: { 
      $gte: startDate, 
      $lte: endDate 
    }
  }).sort({ timestamp: -1 });
}

/**
 * Get command usage statistics
 * @returns {Promise<Array>} - Array of command usage statistics
 */
async function getCommandStats() {
  return await CommandLog.aggregate([
    { $group: {
      _id: '$commandName',
      count: { $sum: 1 },
      successCount: { 
        $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
      },
      failureCount: { 
        $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
      },
      avgExecutionTime: { $avg: '$executionTimeMs' },
      minExecutionTime: { $min: '$executionTimeMs' },
      maxExecutionTime: { $max: '$executionTimeMs' }
    }},
    { $sort: { count: -1 }}
  ]);
}

/**
 * Get user activity statistics
 * @returns {Promise<Array>} - Array of user activity statistics
 */
async function getUserStats() {
  return await CommandLog.aggregate([
    { $group: {
      _id: { userId: '$userId', username: '$username' },
      commandCount: { $sum: 1 },
      successCount: { 
        $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
      },
      failureCount: { 
        $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
      },
      uniqueCommands: { $addToSet: '$commandName' }
    }},
    { $project: {
      userId: '$_id.userId',
      username: '$_id.username',
      commandCount: 1,
      successCount: 1,
      failureCount: 1,
      uniqueCommandCount: { $size: '$uniqueCommands' }
    }},
    { $sort: { commandCount: -1 }}
  ]);
}

/**
 * Get hourly command usage distribution
 * @returns {Promise<Array>} - Array of hourly command usage statistics
 */
async function getHourlyDistribution() {
  return await CommandLog.aggregate([
    { $group: {
      _id: { $hour: '$timestamp' },
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 }}
  ]);
}

/**
 * Get daily command usage distribution
 * @returns {Promise<Array>} - Array of daily command usage statistics
 */
async function getDailyDistribution() {
  return await CommandLog.aggregate([
    { $group: {
      _id: { 
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      },
      count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }}
  ]);
}

/**
 * Generate a comprehensive log report
 * @returns {Promise<Object>} - Report object with various statistics
 */
async function generateReport() {
  const [
    totalCount,
    commandStats,
    userStats,
    hourlyDistribution,
    recentFailures
  ] = await Promise.all([
    CommandLog.countDocuments(),
    getCommandStats(),
    getUserStats(),
    getHourlyDistribution(),
    getFailedLogs(10)
  ]);
  
  return {
    totalCommands: totalCount,
    commandStats,
    userStats: userStats.slice(0, 10), // Top 10 users
    hourlyDistribution,
    recentFailures
  };
}

/**
 * Print a formatted report to the console
 */
async function printReport() {
  const report = await generateReport();
  
  console.log('=== COMMAND LOG REPORT ===');
  console.log(`Total Commands: ${report.totalCommands}`);
  
  console.log('\n=== TOP COMMANDS ===');
  report.commandStats.slice(0, 10).forEach(cmd => {
    console.log(`${cmd._id}: ${cmd.count} executions (${cmd.failureCount} failures)`);
  });
  
  console.log('\n=== TOP USERS ===');
  report.userStats.forEach(user => {
    console.log(`${user.username}: ${user.commandCount} commands (${user.uniqueCommandCount} unique)`);
  });
  
  console.log('\n=== RECENT FAILURES ===');
  report.recentFailures.forEach(failure => {
    console.log(`${failure.timestamp.toISOString()} - ${failure.commandName}: ${failure.errorMessage}`);
  });
}

module.exports = {
  getRecentLogs,
  getCommandLogs,
  getUserLogs,
  getFailedLogs,
  getLogsByDateRange,
  getCommandStats,
  getUserStats,
  getHourlyDistribution,
  getDailyDistribution,
  generateReport,
  printReport
};