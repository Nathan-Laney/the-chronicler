const characterModel = require("../models/characterSchema");
const missionModel = require("../models/missionSchema");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isAutocomplete()) return;

        const focusedOption = interaction.options.getFocused(true);

        // Handle character name autocompletion
        if (focusedOption.name === 'character' || focusedOption.name === 'character_name') {
            let user;
            
            // For mission addplayer, we use the selected user
            if (interaction.commandName === 'mission' && interaction.options.getSubcommand() === 'addplayer') {
                user = interaction.options.getUser('user');
            } else {
                // For character commands, we use the interaction user
                user = interaction.user;
            }
            
            if (!user) return;

            // Get all characters for the user
            const characters = await characterModel.find({ 
                ownerId: user.id,
                guildId: interaction.guildId 
            });

            let choices = [];
            
            // For create command, don't show existing names to avoid duplicates
            if (interaction.commandName === 'character' && interaction.options.getSubcommand() === 'create') {
                if (focusedOption.value.trim()) {
                    choices.push({
                        name: focusedOption.value,
                        value: focusedOption.value
                    });
                }
            } else {
                // Add current input as first choice if it's not empty
                if (focusedOption.value.trim()) {
                    choices.push({
                        name: `Custom: ${focusedOption.value}`,
                        value: focusedOption.value
                    });
                }

                // Add matching existing characters
                const filtered = characters
                    .filter(char => char.characterName.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .map(char => ({
                        name: `Existing: ${char.characterName}`,
                        value: char.characterName
                    }));
                
                choices = [...choices, ...filtered];
            }

            await interaction.respond(choices.slice(0, 25));  // Discord has a limit of 25 choices
        }
        
        // Handle mission name autocompletion
        else if (focusedOption.name === 'mission' || focusedOption.name === 'mission_name') {
            // For addplayer and removeplayer, only show active missions
            const activeOnly = interaction.commandName === 'mission' && 
                (interaction.options.getSubcommand() === 'addplayer' || 
                 interaction.options.getSubcommand() === 'removeplayer');

            // Get missions based on command context
            const missions = await missionModel.find({ 
                guildId: interaction.guildId,
                ...(activeOnly ? { missionStatus: 'active' } : {})
            });

            let choices = [];
            
            // Add current input as first choice if it's not empty
            if (focusedOption.value.trim()) {
                choices.push({
                    name: `Custom: ${focusedOption.value}`,
                    value: focusedOption.value
                });
            }

            // Add matching existing missions
            const filtered = missions
                .filter(mission => mission.missionName.toLowerCase().includes(focusedOption.value.toLowerCase()))
                .map(mission => {
                    let status = mission.missionStatus === 'active' ? '🟢' : '⭕';
                    let details = '';
                    
                    // For info command, show player count
                    if (interaction.commandName === 'mission' && interaction.options.getSubcommand() === 'info') {
                        const playerCount = mission.characterNames?.length || 0;
                        details = ` | ${playerCount} player${playerCount !== 1 ? 's' : ''}`;
                    }
                    
                    return {
                        name: `${status} ${mission.missionName}${details}`,
                        value: mission.missionName
                    };
                });
            
            choices = [...choices, ...filtered].slice(0, 25);  // Discord has a limit of 25 choices

            await interaction.respond(choices);
        }
    },
};
