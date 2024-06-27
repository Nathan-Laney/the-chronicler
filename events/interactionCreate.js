const { Events } = require("discord.js");
const profileModel = require("../models/profileSchema");
 
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        // Grab the profile data of the user who sent the command
        let profileData;
        try {
            profileData = await profileModel.find({ userId: interaction.user.id });
            if (!profileData) {
                let profile = await profileModel.create({
                    userId: interaction.user.id,
                    guildId: interaction.guild.id,
                    experience: 0
                });
                profileData = profile;
            }
        } catch (error) {
            console.error(`Error fetching profile data in interactionCreate event: ${error}`);
        }
 
        const command = interaction.client.commands.get(interaction.commandName);
 
        if (!command) {
            console.error(
                `No command matching ${interaction.commandName} was found.`
            );
            return;
        }
 
        try {
            await command.execute(interaction, profileData);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);
        }
    },
};