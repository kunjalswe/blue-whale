const { getDB } = require('../../Database/database.js');
const { clearGiveawayTimer } = require('../../utils/giveaway.js');

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

  await interaction.deferReply({ ephemeral: true });

  // Clear timer if active
  clearGiveawayTimer(messageId);

  // Delete the message
  try {
    const channel = interaction.guild.channels.cache.get(giveaway.channel_id);
    if (channel) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) await msg.delete().catch(() => {});
    }
  } catch {}

  // Remove from DB
  await db.run('DELETE FROM giveaways WHERE giveaway_id = ?', [messageId]);

  await interaction.editReply({
    content: `✅ Giveaway for **${giveaway.prize}** has been deleted.`,
  });
}

module.exports = { run };
