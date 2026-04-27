const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription("Get a 'Would You Rather' question"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const res = await fetch("https://api.truthordarebot.xyz/v1/wyr");
      const data = await res.json();
      if (!data.question) {
        return interaction.editReply("❌ Failed to load a question.");
      }
      const parts = data.question.split(" or ");
      const embed = new EmbedBuilder()
        .setTitle("🤔 Would You Rather")
        .setDescription(
          parts.length === 2
            ? `**A)** ${parts[0].replace("Would you rather ", "")}\n\n**B)** ${parts[1].replace("?", "")}`
            : data.question
        )
        .setColor(0x5865F2)
        .setFooter({ text: "Choose wisely…" })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.deferred) {
        await interaction.editReply("❌ Could not fetch a Would You Rather question.");
      } else {
        await interaction.reply({ content: "❌ Could not fetch a Would You Rather question.", ephemeral: true });
      }
    }
  }
};
