const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  AttachmentBuilder,
} = require('discord.js');
const { getDB } = require('../../Database/database.js');
const { generateTranscript, buildSummaryEmbed } = require('../../utils/transcript.js');

/**
 * /ticket close — asks for confirmation, then closes the ticket.
 */
async function run(interaction) {
  const db = await getDB();

  // Verify this channel is a ticket
  const ticket = await db.get(
    'SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ? AND status = ?',
    [interaction.channel.id, interaction.guild.id, 'open']
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ This command can only be used inside an open ticket channel.', ephemeral: true });
  }

  // Check permissions — admin, support role, or ticket owner
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);
  const isSupportOrAdmin =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (config && interaction.member.roles.cache.has(config.support_role_id));
  const isOwner = ticket.owner_id === interaction.user.id;

  if (!isSupportOrAdmin && !isOwner) {
    return interaction.reply({ content: '❌ You do not have permission to close this ticket.', ephemeral: true });
  }

  // Send confirmation
  const confirmEmbed = new EmbedBuilder()
    .setTitle('Close Ticket')
    .setDescription('Are you sure you want to close this ticket? A transcript will be generated and the channel will be deleted.')
    .setColor(0x2B2D31)
    .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [row] });
}

/**
 * Actually close the ticket — called by the confirm button handler.
 */
async function closeTicket(interaction, client) {
  const db = await getDB();

  const ticket = await db.get(
    'SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ? AND status = ?',
    [interaction.channel.id, interaction.guild.id, 'open']
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ This ticket has already been closed.', ephemeral: true });
  }

  await interaction.deferUpdate();

  // Update the embed to show closing
  const closingEmbed = new EmbedBuilder()
    .setTitle('Closing Ticket...')
    .setDescription('Generating transcript, please wait...')
    .setColor(0x2B2D31)
    .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
    .setTimestamp();

  await interaction.editReply({ embeds: [closingEmbed], components: [] });

  try {
    // Generate transcript
    const { html, messageCount } = await generateTranscript(interaction.channel);

    // Update DB
    await db.run(
      'UPDATE tickets SET status = ?, closed_at = CURRENT_TIMESTAMP WHERE ticket_id = ?',
      ['closed', interaction.channel.id]
    );

    // Send transcript to log channel
    const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);
    if (config && config.log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
      if (logChannel) {
        const buffer = Buffer.from(html, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.html` });
        const summaryEmbed = buildSummaryEmbed(ticket, interaction.user.id, messageCount);

        await logChannel.send({ embeds: [summaryEmbed], files: [attachment] });
      }
    }

    // Send DM to ticket owner (best effort)
    try {
      const owner = await client.users.fetch(ticket.owner_id);
      const dmEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setDescription(`Your ticket in **${interaction.guild.name}** has been closed by <@${interaction.user.id}>.`)
        .setColor(0x2B2D31)
        .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
        .setTimestamp();
      await owner.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch {}

    // Delete the channel after a short delay
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (err) {
        console.error('[Ticket Close] Failed to delete channel:', err);
      }
    }, 3000);
  } catch (err) {
    console.error('[Ticket Close] Error:', err);
    await interaction.followUp({ content: '❌ An error occurred while closing the ticket.', ephemeral: true });
  }
}

module.exports = { run, closeTicket };
