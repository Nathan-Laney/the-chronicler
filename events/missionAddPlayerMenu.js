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
                
                // Get all characters for the user
                const characters = await characterModel.find({
                    ownerId: userId,
                    guildId: interaction.guild.id
                });

                // Get all missions the command user is GM of
                const missions = await missionModel.find({
                    gmId: interaction.user.id,
                    guildId: interaction.guild.id,
                    missionStatus: "active"
                });

                if (!characters.length) {
                    return interaction.reply({
                        content: `No characters found for user <@${userId}>!`,
                        ephemeral: true
                    });
                }

                if (!missions.length) {
                    return interaction.reply({
                        content: "You don't have any active missions. Create a mission first!",
                        ephemeral: true
                    });
                }

                // Create the character select menu
                const characterSelect = new StringSelectMenuBuilder()
                    .setCustomId(`missionAddPlayer_character_${userId}`)
                    .setPlaceholder('Select a character')
                    .addOptions(
                        characters.map(char => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(char.characterName)
                                .setDescription(`Level ${char.level} character`)
                                .setValue(char.characterId)
                        )
                    );

                // Create the mission select menu
                const missionSelect = new StringSelectMenuBuilder()
                    .setCustomId(`missionAddPlayer_mission_${userId}`)
                    .setPlaceholder('Select a mission')
                    .addOptions(
                        missions.map(mission => ({
                            label: mission.missionName,
                            description: `${mission.characterNames.length} players`,
                            value: mission.missionName
                        }))
                    );

                // Create the submit button (initially disabled)
                const button = new ButtonBuilder()
                    .setCustomId(`confirmAddPlayer_${userId}`)
                    .setLabel('Add to Mission')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const row1 = new ActionRowBuilder().addComponents(characterSelect);
                const row2 = new ActionRowBuilder().addComponents(missionSelect);
                const row3 = new ActionRowBuilder().addComponents(button);

                await interaction.reply({
                    content: `Select a character for <@${userId}> and a mission to add them to:`,
                    components: [row1, row2, row3],
                    ephemeral: true
                });
            }
            
            // Handle the select menu interactions
            else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('missionAddPlayer_')) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }

                const [_, type, userId] = interaction.customId.split('_');
                const selectedValue = interaction.values[0];

                // Store the selection in the message components
                const components = interaction.message.components;
                const characterSelect = components[0].components[0];
                const missionSelect = components[1].components[0];
                const button = components[2].components[0];

                // Update the appropriate select menu with the selection
                if (type === 'character') {
                    characterSelect.data.placeholder = (await characterModel.findOne({ characterId: selectedValue })).characterName;
                } else {
                    missionSelect.data.placeholder = selectedValue;
                }

                // Enable the button if both selections are made
                const hasCharacter = characterSelect.data.placeholder !== 'Select a character';
                const hasMission = missionSelect.data.placeholder !== 'Select a mission';
                
                const newButton = ButtonBuilder.from(button)
                    .setDisabled(!(hasCharacter && hasMission))
                    .setCustomId(`confirmAddPlayer_${userId}_${characterSelect.data.placeholder}_${missionSelect.data.placeholder}`);

                const row1 = new ActionRowBuilder().addComponents(characterSelect);
                const row2 = new ActionRowBuilder().addComponents(missionSelect);
                const row3 = new ActionRowBuilder().addComponents(newButton);

                await interaction.editReply({
                    components: [row1, row2, row3]
                });
            }
            
            // Handle the submit button interaction
            else if (interaction.isButton() && interaction.customId.startsWith('confirmAddPlayer_')) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }

                const [_, userId, characterName, ...missionNameParts] = interaction.customId.split('_');
                const missionName = missionNameParts.join('_');

                // Find the mission
                const mission = await missionModel.findOne({
                    missionName: missionName,
                    gmId: interaction.user.id,
                    guildId: interaction.guild.id,
                });

                if (!mission) {
                    return interaction.editReply({
                        content: `Mission "${missionName}" not found! Make sure you are the GM of this mission.`,
                        components: []
                    });
                }

                // Get the character from the stored placeholder
                const characterSelect = interaction.message.components[0].components[0];
                const selectedCharacterId = characterSelect.data.values?.[0];
                
                const character = await characterModel.findOne({
                    characterId: selectedCharacterId,
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
                mission.players.push(userId);
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
