const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("dare")
    .setDescription("Get a random dare"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const res = await fetch("https://api.truthordarebot.xyz/v1/dare");
      const data = await res.json();
      const embed = new EmbedBuilder()
        .setTitle("Dare")
        .setDescription(data.question)
        .setColor(0xE74C3C)
        .setFooter({ text: "Do it if you dare ✔" })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.deferred) {
        await interaction.editReply("❌ Failed to fetch a dare. Try again later.");
      } else {
        await interaction.reply({ content: "❌ Failed to fetch a dare. Try again later.", ephemeral: true });
      }
    }
  }
};