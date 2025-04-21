const { SlashCommandBuilder, ChannelType } = require("discord.js");
const fs = require("node:fs").promises;
const path = require("node:path");
const { exec } = require("node:child_process");
const axios = require("axios");

const summariesDir = path.join(__dirname, "..", "summaries");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("summarize")
        .setDescription("Summarizes the message history of a channel.")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("The channel to summarize.")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText) // Restrict to text channels
        )
        .addStringOption(option =>
            option.setName("model")
                .setDescription("The OpenRouter model to use for summarization.")
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply(); // Defer the reply as summarization can take time

        const channel = interaction.options.getChannel("channel");
        const model = interaction.options.getString("model") || "deepseek/deepseek-chat-v3-0324:free";
        const cacheFilePath = path.join(summariesDir, `${channel.id}.txt`);

        try {
            // Check if summary is cached
            try {
                const cachedSummary = await fs.readFile(cacheFilePath, "utf8");
                await interaction.editReply(`Cached Summary for #${channel.name}:\n\n${cachedSummary}`);
                console.log(`[Summarize Command] Sent cached summary for channel ${channel.id}`);
                return;
            } catch (error) {
                // Cache file not found, proceed with export and summarization
                if (error.code !== "ENOENT") {
                    console.error(`[Summarize Command] Error reading cache file for channel ${channel.id}:`, error);
                    await interaction.editReply("An error occurred while checking the cache.");
                    return;
                }
            }

            // Ensure the summaries directory exists
            await fs.mkdir(summariesDir, { recursive: true });

            // Export channel history using DiscordChatExporter CLI
            const exportFilePath = path.join(summariesDir, `${channel.id}_history.txt`);
            const discordToken = process.env.DISCORD_TOKEN; // Assuming DISCORD_TOKEN is in your .env
            if (!discordToken) {
                await interaction.editReply("Discord bot token not found in environment variables.");
                console.error("[Summarize Command] DISCORD_TOKEN not found.");
                return;
            }

            const discordChatExporterPath = process.env.DISCORD_CHAT_EXPORTER_PATH;
            if (!discordChatExporterPath) {
                await interaction.editReply("Discord Chat Exporter CLI path not found in environment variables. Please set DISCORD_CHAT_EXPORTER_PATH.");
                console.error("[Summarize Command] DISCORD_CHAT_EXPORTER_PATH not found.");
                return;
            }

            const exportCommand = `"${discordChatExporterPath}" export -c ${channel.id} -t "${discordToken}" -o "${exportFilePath}" -f PlainText`;

            console.log(`[Summarize Command] Exporting chat history for channel ${channel.id} using ${discordChatExporterPath}...`);
            await new Promise((resolve, reject) => {
                exec(exportCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`[Summarize Command] Error exporting chat history for channel ${channel.id}:`, error);
                        console.error(`[Summarize Command] stderr: ${stderr}`);
                        reject("An error occurred while exporting chat history.");
                        return;
                    }
                    console.log(`[Summarize Command] Successfully exported chat history for channel ${channel.id}.`);
                    resolve();
                });
            });

            // Read the exported file
            const chatHistory = await fs.readFile(exportFilePath, "utf8");
            if (!chatHistory.trim()) {
                 await interaction.editReply("The exported chat history is empty. Cannot summarize an empty channel.");
                 console.log(`[Summarize Command] Exported chat history is empty for channel ${channel.id}.`);
                 // Clean up the empty history file
                 await fs.unlink(exportFilePath);
                 return;
            }


            // Read the summarization prompt file
            const promptFilePath = path.join(summariesDir, "summarization_prompt.txt");
            let summarizationPrompt;
            try {
                summarizationPrompt = await fs.readFile(promptFilePath, "utf8");
                console.log(`[Summarize Command] Successfully read summarization prompt from ${promptFilePath}.`);
            } catch (error) {
                console.error(`[Summarize Command] Error reading summarization prompt file ${promptFilePath}:`, error);
                await interaction.editReply("An error occurred while reading the summarization prompt file.");
                // Clean up the history file
                await fs.unlink(exportFilePath);
                return;
            }


            // Send to OpenRouter for summarization
            console.log(`[Summarize Command] Sending chat history to OpenRouter for summarization (model: ${model})...`);
            const openRouterApiKey = process.env.OPENROUTER_API_KEY; // Assuming OPENROUTER_API_KEY is in your .env
            if (!openRouterApiKey) {
                await interaction.editReply("OpenRouter API key not found in environment variables.");
                console.error("[Summarize Command] OPENROUTER_API_KEY not found.");
                // Clean up the history file
                await fs.unlink(exportFilePath);
                return;
            }

            const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";

            const response = await axios.post(openRouterApiUrl, {
                model: model,
                messages: [
                    { role: "user", content: summarizationPrompt },
                    { role: "user", content: chatHistory }
                ]
            }, {
                headers: {
                    "Authorization": `Bearer ${openRouterApiKey}`,
                    "Content-Type": "application/json"
                }
            });

            const summary = response.data.choices[0].message.content;
            console.log(`[Summarize Command] Successfully received summary for channel ${channel.id}.`);

            // Cache the summary
            await fs.writeFile(cacheFilePath, summary, "utf8");
            console.log(`[Summarize Command] Cached summary for channel ${channel.id}.`);

            // Send the summary to the user
            await interaction.editReply(`Summary for #${channel.name}:\n\n${summary}`);

            // Clean up the history file
            await fs.unlink(exportFilePath);
            console.log(`[Summarize Command] Cleaned up history file ${exportFilePath}.`);

        } catch (error) {
            console.error(`[Summarize Command] An error occurred during summarization for channel ${channel.id}:`, error);
            await interaction.editReply(`An error occurred while summarizing the channel: ${error.message || error}`);
        }
    },
};