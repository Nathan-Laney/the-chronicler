# Discord Channel Summarizer Slash Command Plan

**Goal:** Implement a `/summarize` slash command for the Discord bot that exports channel history, summarizes it using OpenRouter, and caches the results.

## Steps:

1.  **Create `commands/summarize.js`:** Create a new file for the command.
2.  **Define Slash Command:**
    *   Use `SlashCommandBuilder` to create the `/summarize` command.
    *   Add a required `channel` option of type `Channel`.
    *   Add an optional `model` option of type `String` for the OpenRouter model, with a default value.
3.  **Implement `execute` function:**
    *   Acknowledge the interaction immediately as the process might take time.
    *   Get the `channel` and `model` options from the interaction.
    *   Define the cache file path based on the channel ID (e.g., `./summaries/<channel_id>.txt`).
    *   **Check Cache:**
        *   Check if the cache file exists for the given channel ID in the `./summaries` directory.
        *   If it exists, read the cached summary and send it as a reply to the interaction.
        *   If it doesn't exist, proceed to the next step.
    *   **Export Channel History:**
        *   Construct the `DiscordChatExporter.CLI` command to export the specified channel's history to a TXT file in the `./summaries` directory.
        *   Use `child_process.exec` or `child_process.spawn` to run the command. Handle potential errors during execution.
        *   Ensure the necessary environment variables (like Discord token) are available to the CLI tool.
    *   **Read Exported File:**
        *   Read the content of the exported TXT file.
    *   **Send to OpenRouter for Summarization:**
        *   Construct the API request to OpenRouter using the specified model and the exported chat history as input.
        *   Use a library like `axios` to make the HTTP POST request to the OpenRouter API endpoint.
        *   Include the OpenRouter API key in the request headers (using an environment variable).
        *   Handle potential API errors or failures.
    *   **Process and Cache Summary:**
        *   Extract the summarized content from the API response.
        *   Save the summarized content to the cache file (`./summaries/<channel_id>.txt`).
    *   **Send Reply:**
        *   Send the summarized content as a reply to the interaction.
    *   **Clean up:** Optionally, remove the temporary exported history file if it's no longer needed after summarization and caching.
4.  **Update `deploy-commands.js`:** Ensure the new `summarize.js` file is included in the command deployment process (this should happen automatically if it's in the `commands` directory).
5.  **Environment Variables:**
    *   Add `OPENROUTER_API_KEY` to the `.env` file (or equivalent configuration).
    *   Ensure `DISCORD_TOKEN` is available for both the bot and DiscordChatExporter.
6.  **Dependencies:**
    *   Add instructions for installing DiscordChatExporter CLI.
    *   Add instructions for installing any necessary Node.js packages (e.g., `axios` for API requests, `dotenv` if not already present).
7.  **Error Handling and Logging:**
    *   Add comprehensive error handling for file operations, CLI execution, and API calls.
    *   Use `console.error` or a logging library to log errors and important steps for debugging.
8.  **Instructions:** Provide clear instructions on how to set up environment variables and install dependencies.

## Process Diagram:

```mermaid
graph TD
    A[User runs /summarize command] --> B{Check Cache};
    B -- Cache Exists --> C[Read Cached Summary];
    C --> D[Send Summary to User];
    B -- Cache Miss --> E[Execute DiscordChatExporter CLI];
    E --> F{Export Successful?};
    F -- Yes --> G[Read Exported File];
    F -- No --> H[Send Error to User];
    G --> I[Send History to OpenRouter API];
    I --> J{API Call Successful?};
    J -- Yes --> K[Process API Response];
    K --> L[Cache Summary];
    L --> D;
    J -- No --> H;