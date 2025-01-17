const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

function getRandomColor() {
    return Math.floor(Math.random()*16777215);
}

module.exports = async (interaction) => {
    try {
        if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('select_mission_for_player_')) {
            return;
        }

        await interaction.deferUpdate();

        const [_, __, ___, userId] = interaction.customId.split('_');
        const selectedMission = interaction.values[0];

        // Get all characters for the user
        const characters = await characterModel.find({
            ownerId: userId,
            guildId: interaction.guild.id
        });

        if (!characters.length) {
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
};
