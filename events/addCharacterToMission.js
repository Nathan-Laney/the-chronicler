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

            if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('add_character_to_mission_')) {
                return;
            }

            console.log('DEBUG - Processing character selection');
            await interaction.deferUpdate();

            const [_, __, ___, missionName, userId] = interaction.customId.split('_');
            const selectedCharacterId = interaction.values[0];
            console.log('DEBUG - Selection details:', {
                missionName,
                userId,
                selectedCharacterId,
                guildId: interaction.guild.id
            });

            // Find the mission
            const mission = await missionModel.findOne({
                missionName: missionName,
                gmId: interaction.user.id,
                guildId: interaction.guild.id,
            });
            console.log('DEBUG - Found mission:', mission ? 'yes' : 'no');

            if (!mission) {
                console.log('DEBUG - Mission not found or user not GM');
                return interaction.editReply({
                    content: `Mission "${missionName}" not found! Make sure you are the GM of this mission.`,
                    components: [],
                    embeds: []
                });
            }

            // Get the character
            const character = await characterModel.findOne({
                characterId: selectedCharacterId,
                guildId: interaction.guild.id,
            });
            console.log('DEBUG - Found character:', character ? 'yes' : 'no');

            if (!character) {
                console.log('DEBUG - Character not found');
                return interaction.editReply({
                    content: 'Character not found!',
                    components: [],
                    embeds: []
                });
            }

            // Check if character is already in an active mission
            const activeMission = await missionModel.findOne({
                guildId: interaction.guild.id,
                missionStatus: "active",
                characterIds: character.characterId,
            });
            console.log('DEBUG - Character already in mission:', activeMission ? 'yes' : 'no');

            if (activeMission) {
                console.log('DEBUG - Character already in active mission:', activeMission.missionName);
                return interaction.editReply({
                    content: `Character **${character.characterName}** is already in an active mission: **${activeMission.missionName}**!`,
                    components: [],
                    embeds: []
                });
            }

            // Add the character to the mission
            mission.characterIds.push(character.characterId);
            mission.characterNames.push(character.characterName);
            mission.players.push(character.ownerId);
            await mission.save();
            console.log('DEBUG - Successfully added character to mission');

            const embed = {
                color: getRandomColor(),
                title: 'Player Added Successfully',
                description: `Added **${character.characterName}** to mission **${mission.missionName}**!`,
                fields: [
                    {
                        name: 'Current Players',
                        value: mission.characterNames.join('\n') || 'None'
                    }
                ]
            };

            console.log('DEBUG - Sending success message');
            return interaction.editReply({
                embeds: [embed],
                components: []
            });
        } catch (error) {
            console.error('Error in addCharacterToMission:', error);
            return interaction.editReply({
                content: 'An error occurred while processing your request.',
                components: [],
                embeds: []
            });
        }
    }
};
