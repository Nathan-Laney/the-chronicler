const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // Handle the initial command
            if (interaction.commandName === 'mission' && interaction.options.getSubcommand() === 'removeplayer') {
                const missionName = interaction.options.getString("mission_name");
                
                // Find the mission
                const mission = await missionModel.findOne({
                    missionName,
                    guildId: interaction.guild.id,
                    missionStatus: "active"
                });

                if (!mission) {
                    return interaction.reply({
                        content: `Could not find active mission "${missionName}".`,
                        ephemeral: true
                    });
                }

                // Check if user is GM or has admin permissions
                const member = await interaction.guild.members.fetch(interaction.user.id);
                if (mission.gmId !== interaction.user.id && !member.permissions.has("Administrator")) {
                    return interaction.reply({
                        content: "You must be the GM of this mission or have administrator permissions to remove players.",
                        ephemeral: true
                    });
                }

                if (!mission.players.length) {
                    return interaction.reply({
                        content: "This mission has no players to remove.",
                        ephemeral: true
                    });
                }

                // Create dropdown with current players
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`missionRemovePlayer_${mission.missionName}`)
                    .setPlaceholder('Select a player to remove')
                    .addOptions(
                        mission.players.map((playerId, index) => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(mission.characterNames[index])
                                .setDescription(`Player ID: ${playerId}`)
                                .setValue(`${index}`)
                        )
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const embed = {
                    color: getRandomColor(),
                    title: `Remove Player from ${mission.missionName}`,
                    description: 'Select a player to remove from the mission:',
                    fields: [
                        {
                            name: 'Current Players',
                            value: mission.characterNames.join('\n') || 'None'
                        }
                    ]
                };

                return interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            }

            // Handle the select menu interaction
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('missionRemovePlayer_')) {
                await interaction.deferUpdate();

                const [_, missionName] = interaction.customId.split('_');
                const selectedIndex = parseInt(interaction.values[0]);

                // Find the mission
                const mission = await missionModel.findOne({
                    missionName,
                    guildId: interaction.guild.id,
                    missionStatus: "active"
                });

                if (!mission) {
                    return interaction.editReply({
                        content: `Could not find active mission "${missionName}".`,
                        components: [],
                        embeds: []
                    });
                }

                // Remove the player
                const removedCharacterName = mission.characterNames[selectedIndex];
                mission.players.splice(selectedIndex, 1);
                mission.characterNames.splice(selectedIndex, 1);
                mission.characterIds.splice(selectedIndex, 1);
                await mission.save();

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
                    components: [],
                });
            }
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
                return interaction.reply({ ...response, ephemeral: true });
            }
        }
    }
};

function getRandomColor() {
    return Math.floor(Math.random()*16777215);
}
