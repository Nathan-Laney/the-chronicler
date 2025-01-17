const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const missionModel = require("../models/missionSchema");

function getRandomColor() {
    return Math.floor(Math.random()*16777215);
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // Only handle the select menu interaction
            if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('missionRemovePlayer_')) {
                return;
            }

            console.log('DEBUG - Processing player removal selection');
            await interaction.deferUpdate();

            const [_, missionName] = interaction.customId.split('_');
            const selectedIndex = parseInt(interaction.values[0]);

            console.log('DEBUG - Selection details:', {
                missionName,
                selectedIndex,
                guildId: interaction.guild.id
            });

            // Find the mission
            const mission = await missionModel.findOne({
                missionName,
                guildId: interaction.guild.id,
                missionStatus: "active"
            });

            if (!mission) {
                console.log('DEBUG - Mission not found');
                return interaction.editReply({
                    content: `Could not find active mission "${missionName}".`,
                    components: [],
                    embeds: []
                });
            }

            // Remove the player
            const removedCharacterName = mission.characterNames[selectedIndex];
            const removedPlayerId = mission.players[selectedIndex];
            mission.players.splice(selectedIndex, 1);
            mission.characterNames.splice(selectedIndex, 1);
            mission.characterIds.splice(selectedIndex, 1);
            await mission.save();

            console.log('DEBUG - Player removed:', {
                characterName: removedCharacterName,
                playerId: removedPlayerId
            });

            const embed = {
                color: getRandomColor(),
                title: 'Player Removed Successfully',
                description: `Removed **${removedCharacterName}** from mission **${mission.missionName}**`,
                fields: [
                    {
                        name: 'Current Players',
                        value: mission.characterNames.join('\n') || 'None'
                    }
                ]
            };

            return interaction.editReply({
                embeds: [embed],
                components: []
            });
        } catch (error) {
            console.error('Error in missionRemovePlayerMenu:', error);
            const response = {
                content: 'An error occurred while processing your request.',
                components: [],
                embeds: []
            };
            
            if (interaction.deferred) {
                return interaction.editReply(response);
            } else {
                return interaction.reply({ ...response });
            }
        }
    }
};
