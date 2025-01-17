const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle the initial command
        if (interaction.commandName === 'mission' && interaction.options.getSubcommand() === 'addplayer') {
            const userId = interaction.options.getUser("user").id;
            const missionName = interaction.options.getString("mission_name");
            
            // Get all characters for the user
            const characters = await characterModel.find({
                ownerId: userId,
                guildId: interaction.guild.id
            });

            if (!characters.length) {
                return interaction.reply({
                    content: `No characters found for user <@${userId}>!`,
                    ephemeral: true
                });
            }

            // Create the select menu
            const select = new StringSelectMenuBuilder()
                .setCustomId(`mission_addplayer_select_${userId}_${missionName || 'latest'}`)
                .setPlaceholder('Select a character')
                .addOptions(
                    characters.map(char => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(char.characterName)
                            .setDescription(`Level ${char.level} character`)
                            .setValue(char.characterId)
                    )
                );

            // Create the submit button
            const button = new ButtonBuilder()
                .setCustomId(`mission_addplayer_submit_${userId}_${missionName || 'latest'}`)
                .setLabel('Add to Mission')
                .setStyle(ButtonStyle.Primary);

            // Create and send the message with components
            const row1 = new ActionRowBuilder().addComponents(select);
            const row2 = new ActionRowBuilder().addComponents(button);

            await interaction.reply({
                content: `Select a character for <@${userId}>:`,
                components: [row1, row2],
                ephemeral: true
            });
        }
        
        // Handle the select menu interaction
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('mission_addplayer_select_')) {
            // Store the selected value in the button's custom ID
            const [_, __, ___, userId, missionName] = interaction.customId.split('_');
            const selectedCharId = interaction.values[0];
            
            // Update the button's custom ID to include the selected character
            const button = ButtonBuilder
                .from(interaction.message.components[1].components[0])
                .setCustomId(`mission_addplayer_submit_${userId}_${missionName}_${selectedCharId}`);
            
            const row1 = ActionRowBuilder.from(interaction.message.components[0]);
            const row2 = new ActionRowBuilder().addComponents(button);

            await interaction.update({
                components: [row1, row2]
            });
        }
        
        // Handle the submit button interaction
        else if (interaction.isButton() && interaction.customId.startsWith('mission_addplayer_submit_')) {
            const [_, __, ___, userId, missionNameOrLatest, characterId] = interaction.customId.split('_');
            
            if (!characterId) {
                return interaction.reply({
                    content: 'Please select a character first!',
                    ephemeral: true
                });
            }

            // Find the mission
            let mission;
            if (missionNameOrLatest === 'latest') {
                mission = await missionModel.findOne({
                    guildId: interaction.guild.id,
                    missionStatus: "active",
                }).sort({ createdAt: -1 });
            } else {
                mission = await missionModel.findOne({
                    missionName: missionNameOrLatest,
                    guildId: interaction.guild.id,
                });
            }

            if (!mission) {
                return interaction.reply({
                    content: 'Mission not found!',
                    ephemeral: true
                });
            }

            // Get the character
            const character = await characterModel.findOne({
                characterId: characterId,
                ownerId: userId,
                guildId: interaction.guild.id,
            });

            if (!character) {
                return interaction.reply({
                    content: 'Character not found!',
                    ephemeral: true
                });
            }

            // Check if character is already in an active mission
            const activeMission = await missionModel.findOne({
                guildId: interaction.guild.id,
                missionStatus: "active",
                characterIds: character.characterId,
            });

            if (activeMission) {
                return interaction.reply({
                    content: `Character **${character.characterName}** is already in an active mission: **${activeMission.missionName}**!`,
                    ephemeral: true
                });
            }

            // Add character to mission
            mission.characterNames.push(character.characterName);
            mission.characterIds.push(character.characterId);
            await mission.save();

            // Remove the components and show success message
            await interaction.update({
                content: `Player <@${userId}> with character **${character.characterName}** added to mission **${mission.missionName}**!`,
                components: []
            });
        }
    },
};
