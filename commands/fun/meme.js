const fetch = require("node-fetch");
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Get a funny meme from Reddit"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const response = await fetch("https://meme-api.com/gimme");
      const data = await response.json();
      if (!data || !data.url) return interaction.editReply("❌ Couldn't fetch a meme.");
      const embed = new EmbedBuilder()
        .setTitle(data.title || "🤣 Meme")
        .setImage(data.url)
        .setURL(data.postLink)
        .setColor(0x5865F2)
        .setFooter({ text: `From r/${data.subreddit}` })
        .setTimestamp();
      await interaction.editReply({ content: "📤 Here is your generated meme:", embeds: [embed] });
    } catch (err) {
      console.error(err);
      if (interaction.deferred) {
        await interaction.editReply("❌ Failed to fetch a meme.");
      } else {
        await interaction.reply("❌ Failed to fetch a meme.");
      }
    }
  }
};