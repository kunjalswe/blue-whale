const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Display bot statistics"),
  async execute(interaction, client) {
    const totalSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const memoryMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const guilds = client.guilds.cache.size;

    let userCount = 0;
    for (const guild of client.guilds.cache.values()) {
      userCount += guild.memberCount;
    }

    const sent = Date.now();
    await interaction.reply({ content: "🏓 Checking Stats...", fetchReply: true });
    const messageLatency = Date.now() - sent;

    const embed = new EmbedBuilder()
      .setTitle("Bot Statistics")
      .addFields(
        { name: "Uptime", value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: "Ping", value: `Message: \`${messageLatency}ms\`\nAPI: \`${Math.round(client.ws.ping)}ms\``, inline: true },
        { name: "Memory", value: `\`${memoryMB} MB\``, inline: true },
        { name: "Servers", value: `\`${guilds}\``, inline: true },
        { name: "Users", value: `\`${userCount}\``, inline: true },
        { name: "Node.js", value: `\`${process.version}\``, inline: true }
      )
      .setColor(0x3498DB)
      
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};