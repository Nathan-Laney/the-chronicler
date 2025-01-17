const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
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
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true); // Initially disabled until a character is selected

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
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }
                
                const [_, __, ___, userId, missionName] = interaction.customId.split('_');
                const selectedCharId = interaction.values[0];
                
                // Get the character details for the message
                const character = await characterModel.findOne({
                    characterId: selectedCharId,
                    ownerId: userId,
                    guildId: interaction.guild.id,
                });

                // Update the button's custom ID to include the selected character
                const button = ButtonBuilder
                    .from(interaction.message.components[1].components[0])
                    .setCustomId(`mission_addplayer_submit_${userId}_${missionName}_${selectedCharId}`)
                    .setDisabled(false); // Enable the button now that a character is selected
                
                const row1 = ActionRowBuilder.from(interaction.message.components[0]);
                const row2 = new ActionRowBuilder().addComponents(button);

                await interaction.editReply({
                    content: `Selected character: **${character.characterName}** (Level ${character.level})\nClick "Add to Mission" to confirm.`,
                    components: [row1, row2]
                });
            }
            
            // Handle the submit button interaction
            else if (interaction.isButton() && interaction.customId.startsWith('mission_addplayer_submit_')) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }
                
                const [_, __, ___, userId, missionNameOrLatest, characterId] = interaction.customId.split('_');
                
                if (!characterId) {
                    return interaction.editReply({
                        content: 'Please select a character first!',
                        components: []
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
                    return interaction.editReply({
                        content: 'Mission not found!',
                        components: []
                    });
                }

                // Get the character
                const character = await characterModel.findOne({
                    characterId: characterId,
                    ownerId: userId,
                    guildId: interaction.guild.id,
                });

                if (!character) {
                    return interaction.editReply({
                        content: 'Character not found!',
                        components: []
                    });
                }

                // Check if character is already in an active mission
                const activeMission = await missionModel.findOne({
                    guildId: interaction.guild.id,
                    missionStatus: "active",
                    characterIds: character.characterId,
                });

                if (activeMission) {
                    return interaction.editReply({
                        content: `Character **${character.characterName}** is already in an active mission: **${activeMission.missionName}**!`,
                        components: []
                    });
                }

                // Add character to mission
                mission.characterNames.push(character.characterName);
                mission.characterIds.push(character.characterId);
                await mission.save();

                // Remove the components and show success message
                await interaction.editReply({
                    content: `Player <@${userId}> with character **${character.characterName}** added to mission **${mission.missionName}**!`,
                    components: []
                });
            }
        } catch (error) {
            console.error('Error in mission add player menu:', error);
            try {
                const response = {
                    content: 'An error occurred while processing your request.',
                    components: [],
                    ephemeral: true
                };
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply(response);
                } else {
                    await interaction.editReply(response);
                }
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    },
};
