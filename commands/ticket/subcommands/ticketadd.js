const { PermissionsBitField } = require('discord.js');
const { getDB } = require('../../../Database/database.js');

async function run(interaction) {
  const db = await getDB();
  const user = interaction.options.getUser('user');

  // Verify this channel is a ticket
  const ticket = await db.get(
    'SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ? AND status = ?',
    [interaction.channel.id, interaction.guild.id, 'open']
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ This command can only be used inside an open ticket channel.', ephemeral: true });
  }

  // Check permissions — must be admin or support role
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);
  const isSupportOrAdmin =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (config && interaction.member.roles.cache.has(config.support_role_id));

  if (!isSupportOrAdmin) {
    return interaction.reply({ content: '❌ You do not have permission to add users to this ticket.', ephemeral: true });
  }

  // Add user to the channel
  try {
    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    return interaction.reply({ content: `✅ <@${user.id}> has been added to this ticket.` });
  } catch (err) {
    console.error('[Ticket Add] Error:', err);
    return interaction.reply({ content: '❌ Failed to add the user to this ticket.', ephemeral: true });
  }
}

module.exports = { run };
