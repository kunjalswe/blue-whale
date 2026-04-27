const { getDB } = require('../../../Database/database.js');
const { buildGiveawayEmbed } = require('../../../utils/giveaway.js');

async function handleJoin(interaction, client) {
  const db = await getDB();
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const messageId = interaction.message.id;

  // Fetch giveaway from DB
  const giveaway = await db.get(
    'SELECT * FROM giveaways WHERE giveaway_id = ? AND guild_id = ?',
    [messageId, guildId]
  );

  if (!giveaway) {
    return interaction.reply({ content: '❌ Giveaway not found in the database.', ephemeral: true });
  }

  if (giveaway.status !== 'active') {
    return interaction.reply({ content: '❌ This giveaway is no longer active.', ephemeral: true });
  }

  // Check role requirements
  const config = await db.get('SELECT * FROM giveaway_config WHERE guild_id = ?', [guildId]);
  if (config) {
    const member = interaction.member;
    const hasRequired = config.required_role_id ? member.roles.cache.has(config.required_role_id) : true;
    const hasBypass = config.bypass_role_id ? member.roles.cache.has(config.bypass_role_id) : false;

    if (!hasRequired && !hasBypass) {
      return interaction.reply({
        content: `❌ You need the <@&${config.required_role_id}> role to enter this giveaway.`,
        ephemeral: true,
      });
    }
  }

  // Check if already joined
  let participants = JSON.parse(giveaway.participants || '[]');
  if (participants.includes(userId)) {
    return interaction.reply({ content: '❌ You have already joined this giveaway!', ephemeral: true });
  }

  // Add user to participants
  participants.push(userId);
  await db.run(
    'UPDATE giveaways SET participants = ? WHERE giveaway_id = ?',
    [JSON.stringify(participants), messageId]
  );

  // Update message with new participant count
  const updatedGiveaway = { ...giveaway, participants: JSON.stringify(participants) };
  await interaction.update({
    embeds: [buildGiveawayEmbed(updatedGiveaway)],
  });

  await interaction.followUp({ content: '🎉 You have successfully joined the giveaway!', ephemeral: true });
}

module.exports = { handleJoin };
