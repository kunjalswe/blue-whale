const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("sigma")
    .setDescription("Show the sigma level of a user in percentage")
    .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const percentage = Math.floor(Math.random() * 101);
    const embed = new EmbedBuilder()
      .setTitle("🗿 Sigma Level")
      .setDescription(`${user} is **${percentage}% sigma**!`)
      .setColor(0x5865F2)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
