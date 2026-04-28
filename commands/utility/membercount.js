const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Display the server's member count"),
  async execute(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch();

    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;

    const embed = new EmbedBuilder()
      .setTitle("Server Members")
      .setColor(0x3498DB)
      .addFields(
        { name: "Humans", value: `${humans}`, inline: true },
        { name: "Bots", value: `${bots}`, inline: true },
        { name: "Total", value: `${total}`, inline: true }
      )
      
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};