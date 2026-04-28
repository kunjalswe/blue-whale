const { getDB } = require('../../../Database/database.js');
const { scheduleGiveaway, buildGiveawayEmbed, buildGiveawayButtons } = require('../../../utils/giveaway.js');

async function run(interaction, client) {
  const messageId = interaction.options.getString('message_id');
  const db = await getDB();

  const giveaway = await db.get(
    'SELECT * FROM giveaways WHERE giveaway_id = ? AND guild_id = ?',
    [messageId, interaction.guild.id]
  );

  if (!giveaway) {
    return interaction.reply({ content: '❌ Giveaway not found. Check the message ID.', ephemeral: true });
  }

  if (giveaway.status !== 'paused') {
    return interaction.reply({ content: `❌ This giveaway is **${giveaway.status}**. Only paused giveaways can be resumed.`, ephemeral: true });
  }

  // Calculate new end time from remaining
  const remaining = giveaway.paused_remaining || 60000;
  const newEndTime = Date.now() + remaining;

  // Update DB
  await db.run(
    'UPDATE giveaways SET status = ?, end_time = ?, paused_remaining = NULL WHERE giveaway_id = ?',
    ['active', newEndTime, messageId]
  );

  // Update the message
  const updatedGiveaway = { ...giveaway, status: 'active', end_time: newEndTime };

  try {
    const channel = interaction.guild.channels.cache.get(giveaway.channel_id);
    if (channel) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) {
        await msg.edit({
          embeds: [buildGiveawayEmbed(updatedGiveaway)],
          components: [buildGiveawayButtons(false)],
        });
      }
    }
  } catch {}

  // Re-schedule auto-end
  scheduleGiveaway(client, updatedGiveaway);

  await interaction.reply({
    content: `▶️ Giveaway for **${giveaway.prize}** has been resumed!\nNew end time: <t:${Math.floor(newEndTime / 1000)}:R>`,
    ephemeral: true,
  });
}

module.exports = { run };
