const { getDB } = require('../../Database/database.js');
const { pickWinners } = require('../../utils/giveaway.js');

async function run(interaction) {
  const messageId = interaction.options.getString('message_id');
  const newWinnerCount = interaction.options.getInteger('winners');
  const db = await getDB();

  const giveaway = await db.get(
    'SELECT * FROM giveaways WHERE giveaway_id = ? AND guild_id = ?',
    [messageId, interaction.guild.id]
  );

  if (!giveaway) {
    return interaction.reply({ content: '❌ Giveaway not found. Check the message ID.', ephemeral: true });
  }

  if (giveaway.status !== 'ended') {
    return interaction.reply({ content: '❌ Only ended giveaways can be rerolled.', ephemeral: true });
  }

  const participants = JSON.parse(giveaway.participants || '[]');
  if (participants.length === 0) {
    return interaction.reply({ content: '❌ No participants to reroll from.', ephemeral: true });
  }

  const count = newWinnerCount || giveaway.winners_count;
  const winners = pickWinners(participants, count);

  const winnerText = winners.map(id => `<@${id}>`).join(', ');

  // Announce in the giveaway channel
  try {
    const channel = interaction.guild.channels.cache.get(giveaway.channel_id);
    if (channel) {
      await channel.send({
        content: `🎉 **Giveaway Rerolled!**\nNew winner(s) for **${giveaway.prize}**: ${winnerText}`,
      });
    }
  } catch {}

  await interaction.reply({
    content: `✅ Rerolled **${count}** winner(s) for **${giveaway.prize}**:\n${winnerText}`,
    ephemeral: true,
  });
}

module.exports = { run };
