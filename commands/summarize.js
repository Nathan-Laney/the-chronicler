const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("node:fs").promises;
const path = require("node:path");
const { exec } = require("node:child_process");
const axios = require("axios");

const summariesDir = path.join(__dirname, "..", "summaries");

// Function to generate random hex color
function getRandomColor() {
  return Math.floor(Math.random()*16777215);
}

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
        const channel = interaction.options.getChannel("channel");
        const model = interaction.options.getString("model") || "deepseek/deepseek-chat-v3-0324:free";
        
        // Create a directory for this channel's summaries if it doesn't exist
        const channelSummaryDir = path.join(summariesDir, channel.id);
        await fs.mkdir(channelSummaryDir, { recursive: true });
        
        // Path to the index file that tracks all models for this channel
        const indexFilePath = path.join(channelSummaryDir, "index.json");
        
        // Send initial message that will be edited later
        const initialEmbed = new EmbedBuilder()
            .setColor(getRandomColor())
            .setTitle(`Channel Summary - #${channel.name}`)
            .setDescription("The Chronicler is summarizing the channel history...")
            .setFooter({ text: "Please wait while the summary is being generated" });
        
        // Create navigation buttons
        const prevButton = new ButtonBuilder()
            .setCustomId('prev_summary')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);
            
        const nextButton = new ButtonBuilder()
            .setCustomId('next_summary')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);
            
        const row = new ActionRowBuilder()
            .addComponents(prevButton, nextButton);
        
        const message = await interaction.reply({
            embeds: [initialEmbed],
            components: [row],
            fetchReply: true
        });

        try {
            // Check if we already have a summary for this model
            let modelSummaries = [];
            let currentIndex = 0;
            let foundRequestedModel = false;
            
            try {
                // Try to read the index file
                const indexData = await fs.readFile(indexFilePath, "utf8");
                modelSummaries = JSON.parse(indexData);
                
                // Check if we already have a summary for the requested model
                for (let i = 0; i < modelSummaries.length; i++) {
                    if (modelSummaries[i].model === model) {
                        currentIndex = i;
                        foundRequestedModel = true;
                        break;
                    }
                }
            } catch (error) {
                // If the index file doesn't exist, create an empty array
                if (error.code === "ENOENT") {
                    modelSummaries = [];
                } else {
                    console.error(`[Summarize Command] Error reading index file for channel ${channel.id}:`, error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("Error")
                        .setDescription("An error occurred while checking cached summaries.");
                    
                    await interaction.editReply({
                        embeds: [errorEmbed],
                        components: []
                    });
                    return;
                }
            }
            
            // If we found the requested model in cache, display it
            if (foundRequestedModel) {
                const cachedSummaryPath = path.join(channelSummaryDir, `${model.replace(/\//g, '_')}.json`);
                try {
                    const cachedData = await fs.readFile(cachedSummaryPath, "utf8");
                    const cachedJson = JSON.parse(cachedData);
                    
                    // Update navigation buttons
                    prevButton.setDisabled(currentIndex === 0);
                    nextButton.setDisabled(currentIndex === modelSummaries.length - 1);
                    
                    const updatedRow = new ActionRowBuilder()
                        .addComponents(
                            prevButton,
                            nextButton
                        );
                    
                    const summaryEmbed = new EmbedBuilder()
                        .setColor(getRandomColor())
                        .setTitle(`Channel Summary - #${channel.name}`)
                        .setDescription(cachedJson.summary)
                        .setFooter({
                            text: `Model ${currentIndex + 1}/${modelSummaries.length} | ${model}`
                        });
                    
                    await interaction.editReply({
                        embeds: [summaryEmbed],
                        components: [updatedRow]
                    });
                    
                    console.log(`[Summarize Command] Sent cached summary for channel ${channel.id} using model ${model}`);
                    
                    // Set up a collector for button interactions
                    setupButtonCollector(interaction, message, channelSummaryDir, modelSummaries, currentIndex, channel);
                    
                    return;
                } catch (error) {
                    console.error(`[Summarize Command] Error reading cached summary for model ${model}:`, error);
                }
            }

            // Ensure the summaries directory exists
            await fs.mkdir(summariesDir, { recursive: true });

            // Export channel history using DiscordChatExporter CLI
            const exportFilePath = path.join(summariesDir, `${channel.id}_history.txt`);
            const discordToken = process.env.DISCORD_TOKEN; // Assuming DISCORD_TOKEN is in your .env
            if (!discordToken) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("Error")
                    .setDescription("Discord bot token not found in environment variables.");
                
                await interaction.editReply({ embeds: [errorEmbed] });
                console.error("[Summarize Command] DISCORD_TOKEN not found.");
                return;
            }

            const discordChatExporterPath = process.env.DISCORD_CHAT_EXPORTER_PATH;
            if (!discordChatExporterPath) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("Error")
                    .setDescription("Discord Chat Exporter CLI path not found in environment variables. Please set DISCORD_CHAT_EXPORTER_PATH.");
                
                await interaction.editReply({ embeds: [errorEmbed] });
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
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("Error")
                    .setDescription("The exported chat history is empty. Cannot summarize an empty channel.");
                
                await interaction.editReply({ embeds: [errorEmbed] });
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
                
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("Error")
                    .setDescription("An error occurred while reading the summarization prompt file.");
                
                await interaction.editReply({ embeds: [errorEmbed] });
                // Clean up the history file
                await fs.unlink(exportFilePath);
                return;
            }


            // Send to OpenRouter for summarization
            console.log(`[Summarize Command] Sending chat history to OpenRouter for summarization (model: ${model})...`);
            const openRouterApiKey = process.env.OPENROUTER_API_KEY; // Assuming OPENROUTER_API_KEY is in your .env
            if (!openRouterApiKey) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("Error")
                    .setDescription("OpenRouter API key not found in environment variables.");
                
                await interaction.editReply({ embeds: [errorEmbed] });
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

            // Cache the summary with model information
            const cacheData = {
                summary: summary,
                model: model,
                timestamp: new Date().toISOString()
            };
            
            // Save the summary to a file named after the model
            const modelFileName = model.replace(/\//g, '_');
            const modelSummaryPath = path.join(channelSummaryDir, `${modelFileName}.json`);
            await fs.writeFile(modelSummaryPath, JSON.stringify(cacheData), "utf8");
            
            // Update the index file
            if (!foundRequestedModel) {
                modelSummaries.push({
                    model: model,
                    fileName: `${modelFileName}.json`,
                    timestamp: new Date().toISOString()
                });
                currentIndex = modelSummaries.length - 1;
            }
            
            await fs.writeFile(indexFilePath, JSON.stringify(modelSummaries), "utf8");
            console.log(`[Summarize Command] Cached summary for channel ${channel.id} using model ${model}.`);

            // Update navigation buttons
            prevButton.setDisabled(currentIndex === 0);
            nextButton.setDisabled(currentIndex === modelSummaries.length - 1);
            
            const updatedRow = new ActionRowBuilder()
                .addComponents(
                    prevButton,
                    nextButton
                );

            // Create an embed for the summary
            const summaryEmbed = new EmbedBuilder()
                .setColor(getRandomColor())
                .setTitle(`Channel Summary - #${channel.name}`)
                .setDescription(summary)
                .setFooter({
                    text: `Model ${currentIndex + 1}/${modelSummaries.length} | ${model}`
                });

            // Send the summary to the user
            await interaction.editReply({
                embeds: [summaryEmbed],
                components: [updatedRow]
            });
            
            // Set up a collector for button interactions
            setupButtonCollector(interaction, message, channelSummaryDir, modelSummaries, currentIndex, channel);

            // Clean up the history file
            await fs.unlink(exportFilePath);
            console.log(`[Summarize Command] Cleaned up history file ${exportFilePath}.`);

        } catch (error) {
            console.error(`[Summarize Command] An error occurred during summarization for channel ${channel.id}:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Error")
                .setDescription(`An error occurred while summarizing the channel: ${error.message || error}`);
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
    
    // This function will be called when a user interacts with the autocomplete
    async autocomplete(interaction) {
        // You could implement autocomplete for models here if needed
    }
};

// Helper function to set up button collector for navigation
async function setupButtonCollector(interaction, message, channelSummaryDir, modelSummaries, currentIndex, channel) {
    // Create a filter for the collector to only collect button interactions from the original user
    const filter = i =>
        (i.customId === 'prev_summary' || i.customId === 'next_summary') &&
        i.user.id === interaction.user.id;
    
    // Create a collector that will last for 15 minutes
    const collector = message.createMessageComponentCollector({
        filter,
        time: 15 * 60 * 1000 // 15 minutes
    });
    
    collector.on('collect', async i => {
        // Update the current index based on which button was clicked
        if (i.customId === 'prev_summary') {
            currentIndex = Math.max(0, currentIndex - 1);
        } else if (i.customId === 'next_summary') {
            currentIndex = Math.min(modelSummaries.length - 1, currentIndex + 1);
        }
        
        // Get the model info for the current index
        const modelInfo = modelSummaries[currentIndex];
        
        // Read the summary for this model
        try {
            const summaryPath = path.join(channelSummaryDir, modelInfo.fileName);
            const summaryData = await fs.readFile(summaryPath, "utf8");
            const summaryJson = JSON.parse(summaryData);
            
            // Update navigation buttons
            const prevButton = new ButtonBuilder()
                .setCustomId('prev_summary')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === 0);
                
            const nextButton = new ButtonBuilder()
                .setCustomId('next_summary')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === modelSummaries.length - 1);
                
            const row = new ActionRowBuilder()
                .addComponents(prevButton, nextButton);
            
            // Create an updated embed
            const updatedEmbed = new EmbedBuilder()
                .setColor(getRandomColor())
                .setTitle(`Channel Summary - #${channel.name}`)
                .setDescription(summaryJson.summary)
                .setFooter({
                    text: `Model ${currentIndex + 1}/${modelSummaries.length} | ${modelInfo.model}`
                });
            
            // Update the message
            await i.update({
                embeds: [updatedEmbed],
                components: [row]
            });
            
        } catch (error) {
            console.error(`[Summarize Command] Error navigating to summary at index ${currentIndex}:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Error")
                .setDescription("An error occurred while navigating to the requested summary.");
            
            await i.update({
                embeds: [errorEmbed],
                components: []
            });
        }
    });
    
    collector.on('end', () => {
        // When the collector ends (timeout), remove the buttons
        const disabledPrevButton = new ButtonBuilder()
            .setCustomId('prev_summary')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);
            
        const disabledNextButton = new ButtonBuilder()
            .setCustomId('next_summary')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);
            
        const disabledRow = new ActionRowBuilder()
            .addComponents(disabledPrevButton, disabledNextButton);
        
        // Try to update the message, but don't throw if it fails (message might be too old)
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
}