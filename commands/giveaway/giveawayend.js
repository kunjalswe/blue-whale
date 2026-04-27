const { getDB } = require('../../Database/database.js');
const { endGiveaway } = require('../../utils/giveaway.js');

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

  if (giveaway.status === 'ended') {
    return interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const winners = await endGiveaway(client, messageId);

  if (!winners) {
    return interaction.editReply({ content: '❌ Failed to end the giveaway.' });
  }

  const winnerText = winners.length > 0
    ? winners.map(id => `<@${id}>`).join(', ')
    : 'No valid participants';

  await interaction.editReply({
    content: `✅ Giveaway for **${giveaway.prize}** has been ended.\n**Winner(s):** ${winnerText}`,
  });
}

module.exports = { run };
