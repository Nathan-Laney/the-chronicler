const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = async (interaction) => {
    try {
        // Handle the select menu interactions
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('missionAddPlayer_')) {
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
                characterSelect.data.values = [selectedValue];
            } else {
                missionSelect.data.placeholder = selectedValue;
                missionSelect.data.values = [selectedValue];
            }

            // Enable the button if both selections are made
            const hasCharacter = characterSelect.data.placeholder !== 'Select a character';
            const hasMission = missionSelect.data.placeholder !== 'Select a mission';
            
            const newButton = ButtonBuilder.from(button)
                .setDisabled(!(hasCharacter && hasMission))
                .setCustomId(`confirmAddPlayer_${userId}`);

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

            const [_, userId] = interaction.customId.split('_');

            // Get selections from the stored components
            const characterSelect = interaction.message.components[0].components[0];
            const missionSelect = interaction.message.components[1].components[0];
            
            const selectedCharacterId = characterSelect.data.values[0];
            const selectedMissionName = missionSelect.data.values[0];

            // Find the mission
            const mission = await missionModel.findOne({
                missionName: selectedMissionName,
                gmId: interaction.user.id,
                guildId: interaction.guild.id,
            });

            if (!mission) {
                return interaction.editReply({
                    content: `Mission "${selectedMissionName}" not found! Make sure you are the GM of this mission.`,
                    components: []
                });
            }

            // Get the character
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
};
