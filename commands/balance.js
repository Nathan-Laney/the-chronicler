const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bank")
    .setDescription("Prints the user's banked XP"),
  async execute(interaction, profileData) {
    const { experience } = profileData;
    const username = interaction.member.nickname;

    await interaction.reply(
      `**${username}**, you have \`${experience}\` XP in the bank.`
    );
  },
};
