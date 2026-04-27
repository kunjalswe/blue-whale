const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Check how long the bot has been online"),
  async execute(interaction, client) {
    const uptime = client.uptime;
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
      .setTitle("Bot Uptime")
      .setDescription(`**${days}d ${hours}h ${minutes}m ${seconds}s**`)
      .setColor(0x2B2D31)
      .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};