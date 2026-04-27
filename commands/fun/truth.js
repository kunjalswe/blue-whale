const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("truth")
    .setDescription("Get a random truth question"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const res = await fetch("https://api.truthordarebot.xyz/v1/truth");
      const data = await res.json();
      const embed = new EmbedBuilder()
        .setTitle("🤔Truth")
        .setDescription(data.question)
        .setColor(0x2ECC71)
        .setFooter({ text: "Be honest 👀" })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      if (interaction.deferred) {
        await interaction.editReply("❌ Could not fetch a truth question.");
      } else {
        await interaction.reply({ content: "❌ Could not fetch a truth question.", ephemeral: true });
      }
    }
  }
};
