const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Send feedback about the bot")
    .addStringOption(option => option.setName('message').setDescription('Your feedback message').setRequired(true)),
  async execute(interaction, client) {
    const feedbackChannelId = "1498224810650501171";
    const feedbackChannel = await client.channels.fetch(feedbackChannelId).catch(() => null);

    if (!feedbackChannel) {
      return interaction.reply({ content: "❌ Feedback channel not found.", ephemeral: true });
    }

    const now = Date.now();
    const cooldownAmount = 60 * 1000;

    if (cooldowns.has(interaction.user.id)) {
      const expiration = cooldowns.get(interaction.user.id) + cooldownAmount;
      if (now < expiration) {
        const remaining = Math.ceil((expiration - now) / 1000);
        return interaction.reply({ content: `⏳ You must wait **${remaining} seconds** before sending another feedback.`, ephemeral: true });
      }
    }

    const feedback = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle("📩 New Feedback Received")
      .setColor(0x5865F2)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .addFields(
        { name: "User ID", value: `${interaction.user.id}`, inline: true },
        { name: "Feedback", value: feedback }
      )
      .setFooter({ text: "Feedback Bot" })
      .setTimestamp();

    try {
      await feedbackChannel.send({ embeds: [embed] });
      await interaction.reply({ content: "✅ Your feedback has been sent successfully! Thank you 💜", ephemeral: true });
      cooldowns.set(interaction.user.id, now);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Failed to send feedback. Make sure I have permission to send messages in the feedback channel.", ephemeral: true });
    }
  }
};