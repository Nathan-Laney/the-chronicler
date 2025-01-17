const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

function getRandomColor() {
    return Math.floor(Math.random()*16777215);
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            console.log('DEBUG - Received interaction:', {
                type: interaction.type,
                customId: interaction.customId,
                isStringSelectMenu: interaction.isStringSelectMenu()
            });

            if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('select_mission_for_player_')) {
                return;
            }

            console.log('DEBUG - Processing mission selection');
            await interaction.deferUpdate();

            const [_, __, ___, userId] = interaction.customId.split('_');
            const selectedMission = interaction.values[0];
            console.log('DEBUG - Selected mission:', {
                userId,
                selectedMission,
                guildId: interaction.guild.id
            });

            // Get all characters for the user
            const characters = await characterModel.find({
                ownerId: userId,
                guildId: interaction.guild.id
            });
            console.log('DEBUG - Found characters:', characters.length);

            if (!characters.length) {
                console.log('DEBUG - No characters found for user');
                return interaction.editReply({
                    content: `No characters found for user <@${userId}>!`,
                    components: [],
                    embeds: []
                });
            }

            // Create the character select menu
            const characterSelect = new StringSelectMenuBuilder()
                .setCustomId(`add_character_to_mission_${selectedMission}_${userId}`)
                .setPlaceholder('Select a character')
                .addOptions(
                    characters.map(char => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(char.characterName)
                            .setDescription(`Level ${char.level} character`)
                            .setValue(char.characterId)
                    )
                );

            const row = new ActionRowBuilder().addComponents(characterSelect);

            const embed = {
                color: getRandomColor(),
                title: 'Add Player to Mission',
                description: `Mission selected: **${selectedMission}**\nNow select which character to add.`,
            };

            console.log('DEBUG - Updating message with character selection');
            return interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Error in selectMissionForPlayer:', error);
            return interaction.editReply({
                content: 'An error occurred while processing your request.',
                components: [],
                embeds: []
            });
        }
    }
};
