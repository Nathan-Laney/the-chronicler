const{SlashCommandBuilder}=require("discord.js")

module.exports={
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Prints the user's balance"),
    async execute(interaction, profileData){
        const {experience} = profileData;
        const username = interaction.user.username;

        await interaction.reply(`${username}, your balance is ${experience}.`);
    }
}