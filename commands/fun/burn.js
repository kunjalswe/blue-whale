const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("burn")
    .setDescription("Burn a user with style!")
    .addUserOption(option => option.setName('user').setDescription('The user to burn').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');

    const burnGif = "https://c.tenor.com/lcehRTIw1_8AAAAC/tenor.gif";
    const embed = new EmbedBuilder()
      .setTitle("🔥 Burn Time!")
      .setDescription(`${interaction.user} just burned ${target}!`)
      .setImage(burnGif)
      .setColor(0xED4245)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};