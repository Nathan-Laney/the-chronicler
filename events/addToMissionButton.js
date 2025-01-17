const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = async (interaction) => {
    try {
        if (!interaction.isButton() || interaction.customId !== 'add_to_mission') {
            return;
        }

        await interaction.deferUpdate();

        // Get the selected values from the select menus
        const characterId = interaction.message.components[0].components[0].data.values?.[0];
        const missionName = interaction.message.components[1].components[0].data.values?.[0];

        if (!characterId || !missionName) {
            return interaction.editReply({
                content: 'Please select both a character and a mission first!',
                components: interaction.message.components
            });
        }

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

        // Get the character
        const character = await characterModel.findOne({
            characterId: characterId,
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

        // Add the character to the mission
        mission.characterIds.push(character.characterId);
        mission.characterNames.push(character.characterName);
        mission.players.push(character.ownerId);
        await mission.save();

        return interaction.editReply({
            content: `Successfully added **${character.characterName}** to mission **${mission.missionName}**!`,
            components: []
        });
    } catch (error) {
        console.error('Error in addToMissionButton:', error);
        return interaction.editReply({
            content: 'An error occurred while processing your request.',
            components: []
        });
    }
};
