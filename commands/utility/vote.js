const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Send voting links for the bot"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Support the Bot")
      .setDescription("Support us by voting on these platforms:")
      .setColor(0x2B2D31)
      .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("TopGG")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1459719961592201216/vote"),
      new ButtonBuilder()
        .setLabel("Discord Bot List")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discordbotlist.com/bots/blue-whale-0803/upvote")
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
