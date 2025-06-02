const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("node:fs").promises;
const path = require("node:path");
const { exec } = require("node:child_process");
const axios = require("axios");
const mongoose = require("mongoose");

// Import the Summary model
const Summary = require("../models/summarySchema");

// Path to the summarization prompt file
const summariesDir = path.join(__dirname, "..", "summaries");

// Logger function for database operations
function logDbOperation(operation, channelId, model, success, error = null) {
    const status = success ? "SUCCESS" : "ERROR";
    const message = `[DB:${operation}] ${status} - Channel: ${channelId}, Model: ${model}`;
    if (success) {
        console.log(message);
    } else {
        console.error(`${message} - Error: ${error}`);
    }
}

// Function to generate random hex color
function getRandomColor() {
  return Math.floor(Math.random()*16777215);
}

// Function to format the title based on channel type
function formatTitle(channel) {
  if (channel.isThread()) {
    return `Thread Summary - #${channel.parent.name} > ${channel.name}`;
  } else {
    return `Channel Summary - #${channel.name}`;
  }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("summarize")
        .setDescription("Summarizes the message history of a channel or thread.")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("The channel or thread to summarize.")
                .setRequired(true)
                .addChannelTypes(
                    ChannelType.GuildText,      // Text channels
                    ChannelType.PublicThread,   // Public threads
                    ChannelType.PrivateThread,  // Private threads
                    ChannelType.AnnouncementThread // Announcement threads
                )
        )
        .addStringOption(option =>
            option.setName("model")
                .setDescription("The OpenRouter model to use for summarization.")
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName("force_resummarize")
                .setDescription("Force a new summary even if one already exists.")
                .setRequired(false)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");
        const model = interaction.options.getString("model") || "google/gemini-2.0-flash-exp:free";
        const forceResummarizeRaw = interaction.options.getBoolean("force_resummarize");
        const forceResummarize = forceResummarizeRaw === true;
        
        console.log(`[Summarize Command] force_resummarize option value: ${forceResummarizeRaw}, converted to: ${forceResummarize}`);
        
        // Send initial message that will be edited later
        const initialEmbed = new EmbedBuilder()
            .setColor(getRandomColor())
            .setTitle(formatTitle(channel))
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
            // Check if we already have a summary for this model in MongoDB
            let modelSummaries = [];
            let currentIndex = 0;
            let foundRequestedModel = false;
            
            if (forceResummarize) {
                console.log(`[Summarize Command] Force resummarize option enabled for channel ${channel.id} using model ${model}`);
            }
            
            try {
                // Try to find the summary in MongoDB
                const dbSummary = await Summary.findOne({
                    channelId: channel.id,
                    model: model
                });
                
                if (dbSummary && !forceResummarize) {
                    // Found in MongoDB and not forcing resummarization
                    foundRequestedModel = true;
                    console.log(`[Summarize Command] Using cached summary for channel ${channel.id} using model ${model}`);
                    
                    // Get all summaries for this channel for navigation
                    const allChannelSummaries = await Summary.find({ channelId: channel.id })
                        .sort({ timestamp: -1 });
                    
                    modelSummaries = allChannelSummaries.map((summary) => ({
                        model: summary.model,
                        _id: summary._id,
                        timestamp: summary.timestamp
                    }));
                    
                    // Find the index of the current model
                    currentIndex = modelSummaries.findIndex(s => s.model === model);
                    if (currentIndex === -1) currentIndex = 0;
                    
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
                        .setTitle(formatTitle(channel))
                        .setDescription(dbSummary.summary)
                        .setFooter({
                            text: `Model ${currentIndex + 1}/${modelSummaries.length} | ${model}`
                        });
                    
                    await interaction.editReply({
                        embeds: [summaryEmbed],
                        components: [updatedRow]
                    });
                    
                    logDbOperation("FIND", channel.id, model, true);
                    console.log(`[Summarize Command] Sent cached summary for channel ${channel.id} using model ${model}`);
                    
                    // Set up a collector for button interactions
                    setupButtonCollector(interaction, message, channel.id, modelSummaries, currentIndex, channel);
                    
                    return;
                } else if (dbSummary && forceResummarize) {
                    console.log(`[Summarize Command] Existing summary found but force_resummarize is enabled. Generating new summary for channel ${channel.id} using model ${model}`);
                    // Continue with the summarization process
                }
            } catch (dbError) {
                console.error(`[Summarize Command] Database error while checking for cached summaries:`, dbError);
                logDbOperation("FIND", channel.id, model, false, dbError);
                
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

            let response;
            try {
                console.log(`[Summarize Command] Making API request to OpenRouter with model: ${model}`);
                response = await axios.post(openRouterApiUrl, {
                    model: model,
                    messages: [
                        { role: "user", content: summarizationPrompt },
                        { role: "user", content: chatHistory }
                    ]
                }, {
                    headers: {
                        "Authorization": `Bearer ${openRouterApiKey}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 120000 // 2 minute timeout for long summaries
                });
                
                console.log(`[Summarize Command] Received response from OpenRouter for model: ${model}`);
            } catch (apiError) {
                console.error(`[Summarize Command] API error with OpenRouter:`, apiError.message);
                
                if (apiError.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error(`[Summarize Command] API error status:`, apiError.response.status);
                    console.error(`[Summarize Command] API error data:`, JSON.stringify(apiError.response.data, null, 2));
                } else if (apiError.request) {
                    // The request was made but no response was received
                    console.error(`[Summarize Command] No response received from API`);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error(`[Summarize Command] Error setting up request:`, apiError.message);
                }
                
                throw new Error(`API error with model ${model}: ${apiError.message}`);
            }

            // Handle different response formats from different models
            let summary;
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                // Standard OpenAI/OpenRouter format
                if (response.data.choices[0].message && response.data.choices[0].message.content) {
                    summary = response.data.choices[0].message.content;
                }
                // Gemini and some other models might use a different format
                else if (response.data.choices[0].content) {
                    summary = response.data.choices[0].content;
                }
                // Some models might return text directly
                else if (response.data.choices[0].text) {
                    summary = response.data.choices[0].text;
                }
                else {
                    // If we can't find the content in the expected places, log the response structure
                    console.error(`[Summarize Command] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
                    throw new Error(`Unexpected response format from model ${model}. Check logs for details.`);
                }
            } else if (response.data && response.data.response) {
                // Some APIs might return response directly
                summary = response.data.response;
            } else {
                console.error(`[Summarize Command] Invalid response structure:`, JSON.stringify(response.data, null, 2));
                throw new Error(`Invalid response from model ${model}. Check logs for details.`);
            }
            
            console.log(`[Summarize Command] Successfully received summary for channel ${channel.id}.`);

            // Calculate approximate context length (characters in chat history)
            const contextLength = chatHistory.length;

            // Store the summary in MongoDB
            try {
                // Validate summary before saving
                if (!summary || typeof summary !== 'string' || summary.trim() === '') {
                    throw new Error('Summary is empty or invalid');
                }
                
                // Create the document
                const summaryDoc = {
                    channelId: channel.id,
                    channelName: channel.name,
                    model: model,
                    summary: summary,
                    contextLength: contextLength,
                    timestamp: new Date(),
                    metadata: {
                        guildId: channel.guild.id,
                        requestedBy: interaction.user.id,
                        requestedByUsername: interaction.user.username,
                        modelVersion: response.data.model || model,
                        isThread: channel.isThread(),
                        // Include parent channel info if it's a thread
                        parentChannelId: channel.isThread() ? channel.parentId : null,
                        parentChannelName: channel.isThread() ? channel.parent?.name : null,
                        threadType: channel.isThread() ? channel.type : null
                    }
                };
                
                // Use findOneAndUpdate with upsert to avoid duplicates
                const savedSummary = await Summary.findOneAndUpdate(
                    { channelId: channel.id, model: model },
                    summaryDoc,
                    { upsert: true, new: true }
                );
                
                if (!savedSummary) {
                    throw new Error('Failed to save summary to database');
                }
                
                logDbOperation("SAVE", channel.id, model, true);
                console.log(`[Summarize Command] Saved summary to MongoDB for channel ${channel.id} using model ${model}.`);
                
                
                // Get all summaries for this channel for navigation
                const allChannelSummaries = await Summary.find({ channelId: channel.id })
                    .sort({ timestamp: -1 });
                
                modelSummaries = allChannelSummaries.map((summary, index) => ({
                    model: summary.model,
                    _id: summary._id,
                    timestamp: summary.timestamp
                }));
                
                // Find the index of the current model
                currentIndex = modelSummaries.findIndex(s => s.model === model);
                if (currentIndex === -1) currentIndex = 0;
            } catch (dbError) {
                console.error(`[Summarize Command] Error saving summary to MongoDB:`, dbError);
                logDbOperation("SAVE", channel.id, model, false, dbError);
                
                // Log additional details for debugging
                if (dbError.name === 'ValidationError') {
                    for (const field in dbError.errors) {
                        console.error(`[Summarize Command] Validation error in field ${field}:`, dbError.errors[field].message);
                    }
                }
                
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("Database Error")
                    .setDescription(`An error occurred while saving the summary to the database: ${dbError.message}`);
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

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
                .setTitle(formatTitle(channel))
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
            setupButtonCollector(interaction, message, channel.id, modelSummaries, currentIndex, channel);

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
async function setupButtonCollector(interaction, message, channelId, modelSummaries, currentIndex, channel) {
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
        
        try {
            // Get summary from MongoDB
            const query = modelInfo._id
                ? { _id: modelInfo._id }
                : { channelId: channelId, model: modelInfo.model };
            
            const dbSummary = await Summary.findOne(query);
            
            if (!dbSummary) {
                throw new Error(`Summary not found for model ${modelInfo.model}`);
            }
            
            logDbOperation("FIND", channelId, modelInfo.model, true);
            
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
                .setTitle(formatTitle(channel))
                .setDescription(dbSummary.summary)
                .setFooter({
                    text: `Model ${currentIndex + 1}/${modelSummaries.length} | ${dbSummary.model}`
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