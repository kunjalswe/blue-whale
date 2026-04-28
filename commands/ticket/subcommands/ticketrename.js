const { PermissionsBitField } = require('discord.js');
const { getDB } = require('../../../Database/database.js');

async function run(interaction) {
  const db = await getDB();
  const newName = interaction.options.getString('name');

  // Verify this channel is a ticket
  const ticket = await db.get(
    'SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ? AND status = ?',
    [interaction.channel.id, interaction.guild.id, 'open']
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ This command can only be used inside an open ticket channel.', ephemeral: true });
  }

  // Check permissions
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);
  const isSupportOrAdmin =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (config && interaction.member.roles.cache.has(config.support_role_id));

  if (!isSupportOrAdmin) {
    return interaction.reply({ content: '❌ You do not have permission to rename this ticket.', ephemeral: true });
  }

  try {
    const sanitized = newName.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 100);
    await interaction.channel.setName(sanitized);
    return interaction.reply({ content: `✅ Ticket renamed to **${sanitized}**.` });
  } catch (err) {
    console.error('[Ticket Rename] Error:', err);
    return interaction.reply({ content: '❌ Failed to rename the ticket channel.', ephemeral: true });
  }
}

module.exports = { run };
