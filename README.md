# The Chronicler Bot Commands

This document outlines the available slash commands for The Chronicler bot and their functions.

## `/admin`
Administration commands for server owners to manage XP of others. (Requires Administrator Permissions)

### Subcommand Group: `xp`
Manage XP.
-   **`/admin xp addbank`**: Add XP to a user's bank.
    -   `user`: The user to add XP to.
    -   `amount`: The amount of XP to add.
    -   `mission`: The mission from which XP was received.
-   **`/admin xp removebank`**: Remove XP from a user's bank.
    -   `user`: The user to remove XP from.
    -   `amount`: The amount of XP to remove.
    -   `mission` (optional): The mission to remove association from.
-   **`/admin xp addcharacter`**: Add XP to a user's character.
    -   `user`: The user whose character will receive XP.
    -   `character_name`: The character to add XP to.
    -   `amount`: The amount of XP to add.
    -   `mission`: The mission from which XP was received.
-   **`/admin xp removecharacter`**: Remove XP from a user's character.
    -   `user`: The user whose character will lose XP.
    -   `character_name`: The character to remove XP from.
    -   `amount`: The amount of XP to remove.
    -   `mission` (optional): The mission to remove association from.

### Subcommand Group: `character`
Character management commands for administrators.
-   **`/admin character add`**: Create a new character for a user.
    -   `user`: The user to create the character for.
    -   `character_name`: The name of the character.
-   **`/admin character remove`**: Delete a character for a user.
    -   `user`: The user whose character will be deleted.
    -   `character_name`: The name of the character to delete.

---

## `/bank`
Prints the user's banked XP.

---

## `/character`
Manage your characters.

-   **`/character create`**: Create a new character.
    -   `character_name`: The name of the character.
    -   `class` (optional): The initial class of the character.
-   **`/character delete`**: Delete one of your characters.
    -   `character_name`: The name of the character to delete.
-   **`/character list`**: List all characters that a user owns.
    -   `user` (optional): The user whose characters you want to list (defaults to yourself).
-   **`/character info`**: View character information.
    -   `character_name`: The name of the character to view.
    -   `user` (optional): The user who owns the character (defaults to yourself).
-   **`/character description`**: Set the description for one of your characters.
    -   `character_name`: The name of the character.
    -   `description`: The description to set.
-   **`/character rename`**: Rename one of your characters.
    -   `current_name`: The current name of the character.
    -   `new_name`: The new name for the character.
-   **`/character activities`**: View a character's downtime activities.
    -   `character_name`: The name of the character.

### Subcommand Group: `class`
Manage character classes.
-   **`/character class set`**: Set or change a class for a character.
    -   `character_name`: The name of the character.
    -   `class`: The class to set.

### Subcommand Group: `mission`
Manage character missions (completed).
-   **`/character mission add`**: Add a completed mission to a character's record.
    -   `character_name`: The name of the character.
    -   `mission`: The mission to add.
-   **`/character mission remove`**: Remove a completed mission from a character's record.
    -   `character_name`: The name of the character.
    -   `mission`: The mission to remove.

---

## `/downtime`
Manage character downtime.

-   **`/downtime add`**: Add downtime to a character.
    -   `character_name`: The character to add downtime to.
    -   `days`: The number of downtime days to add.
-   **`/downtime spend`**: Spend downtime from a character.
    -   `character_name`: The character to spend downtime from.
    -   `days`: The number of downtime days to spend.
    -   `activity` (optional): What the character did during downtime.

---

## `/mission`
Manage missions (as a Game Master).

-   **`/mission list`**: List all active and completed missions in the server.
-   **`/mission create`**: Create a new mission (you will be the GM).
    -   `mission_name`: The name of the mission.
-   **`/mission addplayer`**: Add a player (and their character) to one of your active missions.
    -   `user`: The user to add to the mission. (A follow-up prompt will ask which of your missions and which of their characters).
-   **`/mission removeplayer`**: Remove a player from one of your active missions.
    -   `mission_name`: The name of the mission. (A follow-up prompt will ask which player to remove).
-   **`/mission info`**: Get information about a mission.
    -   `mission_name` (optional): The name of the mission. If not provided, shows your most recent active mission.
    -   `user` (optional): The GM whose mission to view (defaults to you if `mission_name` is also not provided).
-   **`/mission complete`**: Mark one of your missions as complete.
    -   `mission_name`: The name of the mission to complete.
-   **`/mission delete`**: Delete one of your missions.
    -   `mission_name`: The name of the mission to delete.
-   **`/mission rename`**: Rename a mission you are the GM of.
    -   `current_name`: The current name of the mission.
    -   `new_name`: The new name for the mission.
-   **`/mission description`**: Set the description for a mission you are the GM of.
    -   `mission_name`: The name of the mission.
    -   `description`: The description text for the mission.

---

## `/logs`
View and analyze command logs. (Requires Administrator Permissions)

- **`/logs recent`**: View recent command logs.
  - `limit` (optional): Number of logs to retrieve (default: 10, max: 25).
- **`/logs command`**: View logs for a specific command.
  - `command_name`: The name of the command to view logs for.
  - `limit` (optional): Number of logs to retrieve (default: 10, max: 25).
- **`/logs user`**: View logs for a specific user.
  - `user`: The user to view logs for.
  - `limit` (optional): Number of logs to retrieve (default: 10, max: 25).
- **`/logs failures`**: View failed command executions.
  - `limit` (optional): Number of logs to retrieve (default: 10, max: 25).
- **`/logs stats`**: View command usage statistics.

---

## `/ping`
Replies with Pong! (Used to check if the bot is responsive).

---

## `/stats`
Returns a distribution chart of all characters in the database.
-   `grouping` (optional): Choose between 'single' level or 'grouped' by 3-level intervals (default: 'single').
-   `analyze` (optional): Analyze characters by 'level' or 'class' (default: 'level').
-   `available_only` (optional): Include only characters not in an active mission (default: false).

---

## `/summarize`
Summarizes the message history of a channel using an AI model.
-   `channel`: The text channel to summarize.
-   `model` (optional): The OpenRouter model to use for summarization (default: `google/gemini-2.0-flash-exp:free`).
-   `force_resummarize` (optional): Force a new summary even if one already exists (default: `false`).

The command now supports navigation between different model summaries using interactive buttons, allowing users to compare summaries generated by different AI models. Summaries are stored in a database for quick access.

---

## `/xp`
Manage your XP.

### Subcommand Group: `add`
Add XP.
-   **`/xp add character`**: Add XP to one of your characters (e.g., from sources outside a GM-awarded mission).
    -   `character_name`: The character to add XP to.
    -   `amount`: The amount of XP to add.
    -   `mission` (optional): A note or source for this XP.
    -   *Note: Characters automatically gain 2 days of downtime for every 1 XP added.*
-   **`/xp add bank`**: Add XP to your bank (e.g., from sources outside a GM-awarded mission).
    -   `amount`: The amount of XP to add.
    -   `mission` (optional): A note or source for this XP.

### Subcommand Group: `remove`
Remove XP.
-   **`/xp remove character`**: Remove XP from one of your characters.
    -   `character_name`: The character to remove XP from.
    -   `amount`: The amount of XP to remove.
    -   `mission` (optional): A note or reason for this XP removal.
-   **`/xp remove bank`**: Remove XP from your bank.
    -   `amount`: The amount of XP to remove.
    -   `mission` (optional): A note or reason for this XP removal.

### Subcommand: `transfer`
-   **`/xp transfer`**: Transfer XP from your bank to one of your characters.
    -   `character_name`: The character to transfer XP to.
    -   `amount`: The amount of XP to transfer.
    -   *Note: Characters automatically gain 2 days of downtime for every 1 XP transferred.*
