const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');

async function run(interaction) {
  const db = await getDB();
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);

  if (!config) {
    return interaction.reply({
      content: '❌ No ticket system has been configured for this server. Run `/ticket setup` first.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('Ticket Configuration')
    .setColor(0x3498DB)
    .addFields(
      { name: 'Support Role', value: config.support_role_id ? `<@&${config.support_role_id}>` : '`Not set`', inline: true },
      { name: 'Ticket Channel', value: config.ticket_channel_id ? `<#${config.ticket_channel_id}>` : '`Not set`', inline: true },
      { name: 'Log Channel', value: config.log_channel_id ? `<#${config.log_channel_id}>` : '`Not set`', inline: true },
      { name: '📝 Title', value: `\`${config.ticket_title || 'Support Ticket'}\``, inline: true },
      { name: '📄 Description', value: `\`${(config.ticket_description || 'N/A').substring(0, 100)}\``, inline: true },
      { name: '🖼️ Image', value: config.ticket_image ? `[Link](${config.ticket_image})` : '`Not set`', inline: true },
      { name: '😀 Emoji', value: config.ticket_emoji || '🎫', inline: true },
      { name: '📂 Category', value: config.ticket_category_id ? `<#${config.ticket_category_id}>` : '`Not set`', inline: true },
      { name: '📨 Panel Message', value: config.panel_message_id ? `\`${config.panel_message_id}\`` : '`Not sent`', inline: true },
    )
    
    .setTimestamp();

  // Count open tickets
  const openCount = await db.get(
    'SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = ?',
    [interaction.guild.id, 'open']
  );
  const totalCount = await db.get(
    'SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?',
    [interaction.guild.id]
  );

  embed.addFields(
    { name: '🎫 Open Tickets', value: `\`${openCount.count}\``, inline: true },
    { name: '📊 Total Tickets', value: `\`${totalCount.count}\``, inline: true },
  );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { run };
