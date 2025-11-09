# Command Logging System

This document describes the comprehensive command logging system implemented in the bot. The system automatically logs all command executions to the database, capturing detailed information about each command, its execution, and any errors that occur.

## Overview

The command logging system is implemented as middleware in the interaction handler, which means it automatically logs all commands without requiring changes to individual command files. This ensures consistent logging across all commands and simplifies maintenance.

## Log Data Structure

Each command execution is logged with the following information:

| Field | Description |
|-------|-------------|
| `commandName` | The name of the executed command |
| `commandText` | The complete command text with all parameters and flags |
| `commandOptions` | Structured object containing all command options |
| `userId` | The Discord ID of the user who executed the command |
| `username` | The username of the user who executed the command |
| `timestamp` | Precise execution timestamp |
| `timezone` | Timezone information |
| `output` | Command output (truncated to 5000 characters if needed) |
| `success` | Boolean indicating if the command executed successfully |
| `errorMessage` | Error message if the command failed |
| `stackTrace` | Stack trace for debugging when failures occur |
| `executionTimeMs` | Time taken to execute the command in milliseconds |

## Database Schema

The logs are stored in a dedicated collection called `command_logs` in the MongoDB database. The schema includes appropriate indexes for efficient querying:

- Index on `commandName` for filtering by command
- Index on `userId` for filtering by user
- Index on `timestamp` for time-based queries
- Index on `success` for filtering successful/failed commands
- Compound index on `userId`, `commandName`, and `timestamp` for common query patterns

## Querying Logs

### Basic Queries

Here are some example MongoDB queries for retrieving logs:

```javascript
// Get all logs for a specific command
const commandLogs = await CommandLog.find({ commandName: 'character' });

// Get all logs for a specific user
const userLogs = await CommandLog.find({ userId: '123456789012345678' });

// Get all failed command executions
const failedLogs = await CommandLog.find({ success: false });

// Get logs from a specific time period
const recentLogs = await CommandLog.find({
  timestamp: { 
    $gte: new Date('2025-06-01'), 
    $lte: new Date('2025-06-02') 
  }
});

// Get logs for a specific user and command
const userCommandLogs = await CommandLog.find({
  userId: '123456789012345678',
  commandName: 'character'
});
```

### Advanced Queries

```javascript
// Get the most recent 10 command executions
const recentCommands = await CommandLog.find()
  .sort({ timestamp: -1 })
  .limit(10);

// Get average execution time for each command
const avgExecutionTimes = await CommandLog.aggregate([
  { $group: {
    _id: '$commandName',
    avgExecutionTime: { $avg: '$executionTimeMs' },
    count: { $sum: 1 }
  }},
  { $sort: { avgExecutionTime: -1 }}
]);

// Get command usage statistics by user
const userStats = await CommandLog.aggregate([
  { $group: {
    _id: { userId: '$userId', username: '$username' },
    commandCount: { $sum: 1 },
    successCount: { 
      $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
    },
    failureCount: { 
      $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
    }
  }},
  { $sort: { commandCount: -1 }}
]);
```

## Error Handling

The logging system is designed to be robust and handle errors gracefully:

1. If an error occurs during command execution, it is captured and logged
2. If an error occurs during the logging process itself, a fallback logging mechanism attempts to record the error
3. Console output is captured and included in the logs

## Performance Considerations

The logging system is designed to have minimal impact on performance:

1. Logs are written asynchronously to avoid blocking command execution
2. Large outputs are truncated to 5000 characters to limit database size
3. Appropriate indexes are created for efficient querying
4. The logging system uses a separate collection to avoid impacting other database operations

## Future Enhancements

Potential future enhancements to the logging system:

1. Log rotation/archiving strategy for older logs
2. Analytics dashboard for command usage
3. Alerting for frequent command failures
4. Performance optimization for high-volume command usage