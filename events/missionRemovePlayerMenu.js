const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // Handle the initial command
            if (interaction.commandName === 'mission' && interaction.options.getSubcommand() === 'removeplayer') {
                const userId = interaction.options.getUser("user").id;
                const missionName = interaction.options.getString("mission_name");
                
                // Find the mission
                let mission;
                if (missionName) {
                    mission = await missionModel.findOne({
                        missionName,
                        guildId: interaction.guild.id,
                        missionStatus: "active"
                    });
                } else {
                    mission = await missionModel.findOne({
                        guildId: interaction.guild.id,
                        missionStatus: "active",
                    }).sort({ createdAt: -1 });
                }

                if (!mission) {
                    return interaction.reply({
                        content: missionName 
                            ? `Could not find active mission "${missionName}".`
                            : "No active missions found. Please specify a mission name.",
                        ephemeral: true
                    });
                }

                // Create dropdown with current players
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`missionRemovePlayer_${mission.missionName}`)
                    .setPlaceholder('Select a player to remove')
                    .addOptions(
                        mission.players.map((playerId, index) => ({
                            label: mission.characterNames[index],
                            description: `Player: <@${playerId}>`,
                            value: `${index}`
                        }))
                    );

                // Create confirm button
                const confirmButton = new ButtonBuilder()
                    .setCustomId(`confirmRemovePlayer_${mission.missionName}`)
                    .setLabel('Remove Selected Player')
                    .setStyle(ButtonStyle.Danger);

                const row1 = new ActionRowBuilder().addComponents(selectMenu);
                const row2 = new ActionRowBuilder().addComponents(confirmButton);

                await interaction.reply({
                    content: `Select a player to remove from mission "${mission.missionName}":`,
                    components: [row1, row2],
                    ephemeral: true
                });
            }
            
            // Handle the select menu interaction
            else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('missionRemovePlayer_')) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }
                
                const missionName = interaction.customId.split('_')[1];
                const selectedIndex = parseInt(interaction.values[0]);
                
                // Get the character details for the message
                const mission = await missionModel.findOne({
                    missionName,
                    guildId: interaction.guild.id,
                });

                // Update the button's custom ID to include the selected character and index
                const button = ButtonBuilder
                    .from(interaction.message.components[1].components[0])
                    .setCustomId(`confirmRemovePlayer_${missionName}_${selectedIndex}`)
                    .setDisabled(false); // Enable the button now that a character is selected
                
                const row1 = ActionRowBuilder.from(interaction.message.components[0]);
                const row2 = new ActionRowBuilder().addComponents(button);

                await interaction.editReply({
                    content: `Remove player <@${mission.players[selectedIndex]}> from mission **${missionName}**?\nClick "Remove Selected Player" to confirm.`,
                    components: [row1, row2]
                });
            }
            
            // Handle the submit button interaction
            else if (interaction.isButton() && interaction.customId.startsWith('confirmRemovePlayer_')) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }
                
                const [_, __, missionName, selectedIndex] = interaction.customId.split('_');
                
                // Find the mission
                const mission = await missionModel.findOne({
                    missionName: missionName,
                    guildId: interaction.guild.id,
                });

                if (!mission) {
                    return interaction.editReply({
                        content: 'Mission not found!',
                        components: []
                    });
                }

                // Remove player from mission
                mission.players.splice(parseInt(selectedIndex), 1);
                mission.characterNames.splice(parseInt(selectedIndex), 1);
                await mission.save();

                // Remove the components and show success message
                await interaction.editReply({
                    content: `Player <@${mission.players[selectedIndex]}> has been removed from mission **${missionName}**!`,
                    components: []
                });
            }
        } catch (error) {
            console.error('Error in mission remove player menu:', error);
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
