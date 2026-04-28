const { getDB } = require('../../../Database/database.js');
const {
  buildGiveawayEmbed,
  buildGiveawayButtons,
  clearGiveawayTimer,
  formatDuration,
} = require('../../../utils/giveaway.js');

async function run(interaction) {
  const messageId = interaction.options.getString('message_id');
  const db = await getDB();

  const giveaway = await db.get(
    'SELECT * FROM giveaways WHERE giveaway_id = ? AND guild_id = ?',
    [messageId, interaction.guild.id]
  );

  if (!giveaway) {
    return interaction.reply({ content: '❌ Giveaway not found. Check the message ID.', ephemeral: true });
  }

  if (giveaway.status !== 'active') {
    return interaction.reply({ content: `❌ This giveaway is already **${giveaway.status}**. Only active giveaways can be paused.`, ephemeral: true });
  }

  // Calculate remaining time
  const remaining = giveaway.end_time - Date.now();
  if (remaining <= 0) {
    return interaction.reply({ content: '❌ This giveaway has already expired.', ephemeral: true });
  }

  // Clear the timer
  clearGiveawayTimer(messageId);

  // Update DB
  await db.run(
    'UPDATE giveaways SET status = ?, paused_remaining = ? WHERE giveaway_id = ?',
    ['paused', remaining, messageId]
  );

  // Update the message
  try {
    const channel = interaction.guild.channels.cache.get(giveaway.channel_id);
    if (channel) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) {
        const updatedGiveaway = { ...giveaway, status: 'paused', paused_remaining: remaining };
        await msg.edit({
          embeds: [buildGiveawayEmbed(updatedGiveaway)],
          components: [buildGiveawayButtons(true)],
        });
      }
    }
  } catch {}

  await interaction.reply({
    content: `⏸️ Giveaway for **${giveaway.prize}** has been paused. Remaining time: **${formatDuration(remaining)}**.\nUse \`/giveaway resume\` to continue.`,
    ephemeral: true,
  });
}

module.exports = { run };
