const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency"),
  async execute(interaction, client) {
    try {
      if (!client.ws) return interaction.reply({ content: "Bot not fully connected yet!", ephemeral: true });

      const tempMsg = await interaction.reply({ content: "🏓 Pinging...", fetchReply: true });

      const messageLatency = tempMsg.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.max(0, Math.round(client.ws.ping));

      const embed = new EmbedBuilder()
        .setTitle('Pong!')
        .setDescription(`**Message Latency:** \`${messageLatency}ms\`\n**Websocket Latency:** \`${apiLatency}ms\``)
        .setColor(0x2B2D31)
        .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Something went wrong while pinging!", ephemeral: true });
      } else {
        await interaction.reply({ content: "Something went wrong while pinging!", ephemeral: true });
      }
    }
  }
};