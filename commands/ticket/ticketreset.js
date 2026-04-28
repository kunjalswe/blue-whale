const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');
const { getDB } = require('../../Database/database.js');

async function run(interaction) {
  // Admin-only
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Only administrators can reset the ticket system.', ephemeral: true });
  }

  const db = await getDB();
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);

  if (!config) {
    return interaction.reply({ content: '❌ No ticket system is configured for this server.', ephemeral: true });
  }

  // Count data that will be lost
  const openTickets = await db.get(
    'SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = ?',
    [interaction.guild.id, 'open']
  );
  const totalTickets = await db.get(
    'SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?',
    [interaction.guild.id]
  );

  const confirmEmbed = new EmbedBuilder()
    .setTitle('Reset Ticket System')
    .setDescription('Are you sure you want to reset the ticket system? This will delete the database configuration and the panel message.')
    .setColor(0x3498DB)
    
    .setTimestamp()
    .addFields(
      { name: '🎫 Open Tickets', value: `\`${openTickets.count}\``, inline: true },
      { name: '📊 Total Records', value: `\`${totalTickets.count}\``, inline: true },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_reset_confirm')
      .setLabel('Yes, Reset Everything')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️'),
    new ButtonBuilder()
      .setCustomId('ticket_reset_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );

  const reply = await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true, fetchReply: true });

  // Auto-expire after 30 seconds
  setTimeout(async () => {
    try {
      const expiredEmbed = EmbedBuilder.from(confirmEmbed)
        .setFooter({ text: 'This confirmation has expired.' })
        .setColor(0x3498DB);
      await interaction.editReply({ embeds: [expiredEmbed], components: [] });
    } catch {}
  }, 30_000);
}

/**
 * Execute the actual reset.
 */
async function executeReset(interaction, client) {
  await interaction.deferUpdate();

  const db = await getDB();
  const guildId = interaction.guild.id;

  try {
    // 1. Get config to find & invalidate the panel message
    const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [guildId]);

    if (config && config.panel_message_id && config.ticket_channel_id) {
      try {
        const panelChannel = interaction.guild.channels.cache.get(config.ticket_channel_id);
        if (panelChannel) {
          const panelMsg = await panelChannel.messages.fetch(config.panel_message_id).catch(() => null);
          if (panelMsg) {
            await panelMsg.delete().catch(() => {});
          }
        }
      } catch {}
    }

    // 2. Delete all open ticket channels
    const openTickets = await db.all(
      'SELECT ticket_id FROM tickets WHERE guild_id = ? AND status = ?',
      [guildId, 'open']
    );

    for (const ticket of openTickets) {
      try {
        const channel = interaction.guild.channels.cache.get(ticket.ticket_id);
        if (channel) await channel.delete('Ticket system reset').catch(() => {});
      } catch {}
    }

    // 3. Wipe DB
    await db.run('DELETE FROM tickets WHERE guild_id = ?', [guildId]);
    await db.run('DELETE FROM ticket_config WHERE guild_id = ?', [guildId]);

    const successEmbed = new EmbedBuilder()
      .setTitle('Ticket System Reset')
      .setDescription('The ticket system has been completely reset.')
      .setColor(0x3498DB)
      
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed], components: [] });
  } catch (err) {
    console.error('[Ticket Reset] Error:', err);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Reset Failed')
          .setDescription('An error occurred while resetting the ticket system. Check the console for details.')
          .setColor(0xED4245),
      ],
      components: [],
    });
  }
}

module.exports = { run, executeReset };
