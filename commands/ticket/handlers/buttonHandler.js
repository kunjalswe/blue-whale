const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
const { getDB } = require('../../../Database/database.js');
const { closeTicket } = require('../ticketclose.js');
const { executeReset } = require('../ticketreset.js');

// ─────────────────────────────────────────────────────
//  CREATE TICKET — panel button
// ─────────────────────────────────────────────────────
async function handleCreate(interaction, client) {
  const db = await getDB();
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  // Get config
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [guildId]);
  if (!config) {
    return interaction.reply({ content: '❌ The ticket system is not configured. Ask an admin to run `/ticket setup`.', ephemeral: true });
  }

  // Check for existing open ticket (one per user)
  const existing = await db.get(
    'SELECT * FROM tickets WHERE guild_id = ? AND owner_id = ? AND status = ?',
    [guildId, userId, 'open']
  );

  if (existing) {
    return interaction.reply({
      content: `❌ You already have an open ticket: <#${existing.ticket_id}>. Please close it before creating a new one.`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Create the ticket channel under the category
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.substring(0, 100),
      type: ChannelType.GuildText,
      parent: config.ticket_category_id,
      permissionOverwrites: [
        // Deny everyone
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        // Allow the ticket creator
        {
          id: userId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
        // Allow support role
        {
          id: config.support_role_id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.ManageMessages,
          ],
        },
        // Allow bot
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
      ],
    });

    // Insert into DB
    await db.run(
      'INSERT INTO tickets (ticket_id, guild_id, owner_id, status) VALUES (?, ?, ?, ?)',
      [ticketChannel.id, guildId, userId, 'open']
    );

    // Send the ticket welcome embed
    const ticketEmbed = new EmbedBuilder()
      .setAuthor({ name: 'Support Ticket Created', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`Hello <@${userId}>, welcome to your support ticket!`)
      .addFields(
        { name: '🎫 Ticket Information', value: `**Creator:** <@${userId}>\n**Category:** <#${config.ticket_category_id}>`, inline: true },
        { name: '🕒 Details', value: `**Opened At:** <t:${Math.floor(Date.now() / 1000)}:R>\n**Status:** 🟢 Open`, inline: true },
        { name: '📋 Instructions', value: 'Please explain your issue in detail. A staff member will be with you shortly. You can use the buttons below to manage this ticket.', inline: false }
      )
      .setColor(0x2B2D31)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Staff can claim this ticket below' })
      .setTimestamp();

    const ticketButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📩'),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
    );

    await ticketChannel.send({ content: `<@${userId}> | <@&${config.support_role_id}>`, embeds: [ticketEmbed], components: [ticketButtons] });

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` });
  } catch (err) {
    console.error('[Ticket Create] Error:', err);
    await interaction.editReply({ content: '❌ Failed to create the ticket. Make sure the bot has the required permissions and the category exists.' });
  }
}

// ─────────────────────────────────────────────────────
//  CLAIM TICKET
// ─────────────────────────────────────────────────────
async function handleClaim(interaction, client) {
  const db = await getDB();

  const ticket = await db.get(
    'SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ? AND status = ?',
    [interaction.channel.id, interaction.guild.id, 'open']
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ This is not an open ticket channel.', ephemeral: true });
  }

  // Already claimed?
  if (ticket.claimed_by) {
    return interaction.reply({ content: `❌ This ticket has already been claimed by <@${ticket.claimed_by}>.`, ephemeral: true });
  }

  // Must have support role
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);
  const isSupport =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (config && interaction.member.roles.cache.has(config.support_role_id));

  if (!isSupport) {
    return interaction.reply({ content: '❌ Only support staff can claim tickets.', ephemeral: true });
  }

  // Claim it
  await db.run('UPDATE tickets SET claimed_by = ? WHERE ticket_id = ?', [interaction.user.id, interaction.channel.id]);

  const claimEmbed = new EmbedBuilder()
    .setTitle('📩 Ticket Claimed')
    .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.\nThey will be assisting you.`)
    .setColor(0x57F287)
    .setTimestamp();

  // Update the buttons — disable the claim button
  const updatedRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(`Claimed by ${interaction.user.username}`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('📩')
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
  );

  await interaction.update({ components: [updatedRow] });
  await interaction.channel.send({ embeds: [claimEmbed] });
}

// ─────────────────────────────────────────────────────
//  CLOSE TICKET (button in ticket channel)
// ─────────────────────────────────────────────────────
async function handleClose(interaction, client) {
  const db = await getDB();

  const ticket = await db.get(
    'SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ? AND status = ?',
    [interaction.channel.id, interaction.guild.id, 'open']
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ This is not an open ticket channel.', ephemeral: true });
  }

  // Permission check — admin, support role, or ticket owner
  const config = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);
  const isSupportOrAdmin =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (config && interaction.member.roles.cache.has(config.support_role_id));
  const isOwner = ticket.owner_id === interaction.user.id;

  if (!isSupportOrAdmin && !isOwner) {
    return interaction.reply({ content: '❌ You do not have permission to close this ticket.', ephemeral: true });
  }

  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ Close Ticket')
    .setDescription('Are you sure you want to close this ticket? A transcript will be generated and the channel will be deleted.')
    .setColor(0xFEE75C)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [row] });
}

// ─────────────────────────────────────────────────────
//  CLOSE CONFIRM
// ─────────────────────────────────────────────────────
async function handleCloseConfirm(interaction, client) {
  await closeTicket(interaction, client);
}

// ─────────────────────────────────────────────────────
//  CLOSE CANCEL
// ─────────────────────────────────────────────────────
async function handleCloseCancel(interaction) {
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle('❌ Close Cancelled')
        .setDescription('The ticket will remain open.')
        .setColor(0x99AAB5)
        .setTimestamp(),
    ],
    components: [],
  });
}

// ─────────────────────────────────────────────────────
//  RESET CONFIRM
// ─────────────────────────────────────────────────────
async function handleResetConfirm(interaction, client) {
  await executeReset(interaction, client);
}

// ─────────────────────────────────────────────────────
//  RESET CANCEL
// ─────────────────────────────────────────────────────
async function handleResetCancel(interaction) {
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle('❌ Reset Cancelled')
        .setDescription('The ticket system was not changed.')
        .setColor(0x99AAB5)
        .setTimestamp(),
    ],
    components: [],
  });
}

module.exports = {
  handleCreate,
  handleClaim,
  handleClose,
  handleCloseConfirm,
  handleCloseCancel,
  handleResetConfirm,
  handleResetCancel,
};
