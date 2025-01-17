const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
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

            // Find all characters for this user in the mission
            const userCharactersInMission = mission.characterIds
                .map((charId, index) => ({
                    id: charId,
                    name: mission.characterNames[index],
                    index: index
                }))
                .filter(async (char) => {
                    const character = await characterModel.findOne({ 
                        characterId: char.id,
                        ownerId: userId
                    });
                    return character !== null;
                });

            if (!userCharactersInMission.length) {
                return interaction.reply({
                    content: `Player <@${userId}> has no characters in mission **${mission.missionName}**!`,
                    ephemeral: true
                });
            }

            // Create the select menu
            const select = new StringSelectMenuBuilder()
                .setCustomId(`mission_removeplayer_select_${userId}_${mission.missionName}`)
                .setPlaceholder('Select a character to remove')
                .addOptions(
                    userCharactersInMission.map(char => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(char.name)
                            .setDescription(`Remove from ${mission.missionName}`)
                            .setValue(`${char.id}_${char.index}`)
                    )
                );

            // Create the submit button
            const button = new ButtonBuilder()
                .setCustomId(`mission_removeplayer_submit_${userId}_${mission.missionName}`)
                .setLabel('Remove from Mission')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true); // Initially disabled until a character is selected

            // Create and send the message with components
            const row1 = new ActionRowBuilder().addComponents(select);
            const row2 = new ActionRowBuilder().addComponents(button);

            await interaction.reply({
                content: `Select which character to remove from mission **${mission.missionName}**:`,
                components: [row1, row2],
                ephemeral: true
            });
        }
        
        // Handle the select menu interaction
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('mission_removeplayer_select_')) {
            try {
                await interaction.deferUpdate();
                
                const [_, __, ___, userId, ...missionNameParts] = interaction.customId.split('_');
                const missionName = missionNameParts.join('_');
                const [selectedCharId, charIndex] = interaction.values[0].split('_');
                
                // Get the character details for the message
                const character = await characterModel.findOne({
                    characterId: selectedCharId,
                    ownerId: userId,
                    guildId: interaction.guild.id,
                });

                // Update the button's custom ID to include the selected character and index
                const button = ButtonBuilder
                    .from(interaction.message.components[1].components[0])
                    .setCustomId(`mission_removeplayer_submit_${userId}_${missionName}_${selectedCharId}_${charIndex}`)
                    .setDisabled(false); // Enable the button now that a character is selected
                
                const row1 = ActionRowBuilder.from(interaction.message.components[0]);
                const row2 = new ActionRowBuilder().addComponents(button);

                await interaction.editReply({
                    content: `Remove **${character.characterName}** from mission **${missionName}**?\nClick "Remove from Mission" to confirm.`,
                    components: [row1, row2]
                });
            } catch (error) {
                console.error('Error handling select menu interaction:', error);
            }
        }
        
        // Handle the submit button interaction
        else if (interaction.isButton() && interaction.customId.startsWith('mission_removeplayer_submit_')) {
            await interaction.deferUpdate();
            
            const [_, __, ___, userId, ...parts] = interaction.customId.split('_');
            const charIndex = parts.pop();
            const selectedCharId = parts.pop();
            const missionName = parts.join('_');
            
            if (!selectedCharId || charIndex === undefined) {
                return interaction.editReply({
                    content: 'Please select a character first!',
                    components: []
                });
            }

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

            // Get the character
            const character = await characterModel.findOne({
                characterId: selectedCharId,
                ownerId: userId,
                guildId: interaction.guild.id,
            });

            if (!character) {
                return interaction.editReply({
                    content: 'Character not found!',
                    components: []
                });
            }

            // Remove character from mission
            mission.characterNames.splice(parseInt(charIndex), 1);
            mission.characterIds.splice(parseInt(charIndex), 1);
            mission.players.splice(parseInt(charIndex), 1);
            await mission.save();

            // Remove the components and show success message
            await interaction.editReply({
                content: `Player <@${userId}>'s character **${character.characterName}** has been removed from mission **${mission.missionName}**!`,
                components: []
            });
        }
    },
};
