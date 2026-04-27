const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { getDB } = require('../../../Database/database.js');
const { getDraft, clearDraft, buildSetupEmbed, buildSetupMenu } = require('../ticketsetup.js');

/**
 * Safely update the setup panel message.
 * Uses interaction.update() for component interactions,
 * and a deferUpdate + editReply fallback for modal submissions.
 */
async function safeUpdateSetup(interaction, payload) {
  try {
    // Modal submissions from message components support update()
    // but it can be unreliable — try it first, fall back gracefully
    if (interaction.isModalSubmit()) {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate().catch(() => {});
        await interaction.editReply(payload);
      } else {
        // Modal wasn't from a message component — reply ephemerally instead
        await interaction.reply({ ...payload, ephemeral: true });
      }
    } else {
      await interaction.update(payload);
    }
  } catch (err) {
    console.error('[Ticket Setup] safeUpdateSetup error:', err.message);
    // Last resort — try replying if nothing else worked
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ ...payload, ephemeral: true });
      } else {
        await interaction.editReply(payload).catch(() => {});
      }
    } catch {}
  }
}

// ─────────────────────────────────────────────────────
//  MAIN SETUP SELECT MENU
// ─────────────────────────────────────────────────────
async function handleSetupMenu(interaction, client) {
  const selected = interaction.values[0];

  switch (selected) {
    case 'support_role':
      return showRoleSelect(interaction);
    case 'ticket_channel':
      return showChannelSelect(interaction, 'ticket_setup_channel', 'Select the channel for the ticket panel', [ChannelType.GuildText]);
    case 'ticket_category':
      return showChannelSelect(interaction, 'ticket_setup_category', 'Select the category for new tickets', [ChannelType.GuildCategory]);
    case 'ticket_title':
      return showTitleModal(interaction);
    case 'ticket_description':
      return showDescModal(interaction);
    case 'ticket_image':
      return showImageModal(interaction);
    case 'ticket_emoji':
      return showEmojiModal(interaction);
    case 'log_channel':
      return showChannelSelect(interaction, 'ticket_setup_log', 'Select the log channel for transcripts', [ChannelType.GuildText]);
    case 'finish_setup':
      return finishSetup(interaction, client);
  }
}

// ─────────────────────────────────────────────────────
//  ROLE SELECT
// ─────────────────────────────────────────────────────
async function showRoleSelect(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('ticket_setup_role')
      .setPlaceholder('Select the support role')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.update({
    content: '👮 **Select the support role:**',
    embeds: [],
    components: [row],
  });
}

async function handleRoleSelect(interaction, client) {
  const roleId = interaction.values[0];
  const draft = getDraft(interaction);
  draft.support_role_id = roleId;

  await safeUpdateSetup(interaction, {
    content: '',
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupMenu()],
  });
}

// ─────────────────────────────────────────────────────
//  CHANNEL SELECT (reused for channel, category, log)
// ─────────────────────────────────────────────────────
async function showChannelSelect(interaction, customId, placeholder, channelTypes) {
  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setChannelTypes(channelTypes)
      .setMinValues(1)
      .setMaxValues(1)
  );

  const labels = {
    ticket_setup_channel: '📢 **Select the ticket panel channel:**',
    ticket_setup_category: '📂 **Select the ticket category:**',
    ticket_setup_log: '📋 **Select the log channel for transcripts:**',
  };

  await interaction.update({
    content: labels[customId] || 'Select a channel:',
    embeds: [],
    components: [row],
  });
}

async function handleChannelSelect(interaction, client) {
  const channelId = interaction.values[0];
  const draft = getDraft(interaction);
  const customId = interaction.customId;

  if (customId === 'ticket_setup_channel') {
    draft.ticket_channel_id = channelId;
  } else if (customId === 'ticket_setup_category') {
    draft.ticket_category_id = channelId;
  } else if (customId === 'ticket_setup_log') {
    draft.log_channel_id = channelId;
  }

  await safeUpdateSetup(interaction, {
    content: '',
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupMenu()],
  });
}

// ─────────────────────────────────────────────────────
//  MODALS — Title, Description, Image, Emoji
// ─────────────────────────────────────────────────────
async function showTitleModal(interaction) {
  const draft = getDraft(interaction);
  const modal = new ModalBuilder()
    .setCustomId('ticket_setup_title_modal')
    .setTitle('Set Ticket Panel Title');

  const input = new TextInputBuilder()
    .setCustomId('title_input')
    .setLabel('Panel Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Support Ticket')
    .setValue(draft.ticket_title)
    .setRequired(true)
    .setMaxLength(256);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleTitleModal(interaction, client) {
  const draft = getDraft(interaction);
  draft.ticket_title = interaction.fields.getTextInputValue('title_input');

  await safeUpdateSetup(interaction, {
    content: '',
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupMenu()],
  });
}

async function showDescModal(interaction) {
  const draft = getDraft(interaction);
  const modal = new ModalBuilder()
    .setCustomId('ticket_setup_desc_modal')
    .setTitle('Set Ticket Panel Description');

  const input = new TextInputBuilder()
    .setCustomId('desc_input')
    .setLabel('Panel Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g. Click the button below to open a support ticket.')
    .setValue(draft.ticket_description)
    .setRequired(true)
    .setMaxLength(4096);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleDescModal(interaction, client) {
  const draft = getDraft(interaction);
  draft.ticket_description = interaction.fields.getTextInputValue('desc_input');

  await safeUpdateSetup(interaction, {
    content: '',
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupMenu()],
  });
}

async function showImageModal(interaction) {
  const draft = getDraft(interaction);
  const modal = new ModalBuilder()
    .setCustomId('ticket_setup_image_modal')
    .setTitle('Set Ticket Panel Image (Optional)');

  const input = new TextInputBuilder()
    .setCustomId('image_input')
    .setLabel('Image URL (leave blank to remove)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com/image.png')
    .setValue(draft.ticket_image || '')
    .setRequired(false)
    .setMaxLength(2048);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleImageModal(interaction, client) {
  const draft = getDraft(interaction);
  const url = interaction.fields.getTextInputValue('image_input').trim();
  draft.ticket_image = url || null;

  await safeUpdateSetup(interaction, {
    content: '',
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupMenu()],
  });
}

async function showEmojiModal(interaction) {
  const draft = getDraft(interaction);
  const modal = new ModalBuilder()
    .setCustomId('ticket_setup_emoji_modal')
    .setTitle('Set Ticket Button Emoji');

  const input = new TextInputBuilder()
    .setCustomId('emoji_input')
    .setLabel('Emoji')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 🎫')
    .setValue(draft.ticket_emoji)
    .setRequired(true)
    .setMaxLength(32);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleEmojiModal(interaction, client) {
  const draft = getDraft(interaction);
  draft.ticket_emoji = interaction.fields.getTextInputValue('emoji_input').trim() || '🎫';

  await safeUpdateSetup(interaction, {
    content: '',
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupMenu()],
  });
}

// ─────────────────────────────────────────────────────
//  FINISH SETUP
// ─────────────────────────────────────────────────────
async function finishSetup(interaction, client) {
  const draft = getDraft(interaction);

  // Validate required fields
  const missing = [];
  if (!draft.support_role_id) missing.push('Support Role');
  if (!draft.ticket_channel_id) missing.push('Ticket Channel');
  if (!draft.ticket_category_id) missing.push('Ticket Category');
  if (!draft.log_channel_id) missing.push('Log Channel');

  if (missing.length > 0) {
    return interaction.update({
      content: `❌ **Missing required fields:** ${missing.join(', ')}\n\nPlease configure them before finishing setup.`,
      embeds: [buildSetupEmbed(draft)],
      components: [buildSetupMenu()],
    });
  }

  await interaction.update({
    content: '⏳ Saving configuration and sending panel...',
    embeds: [],
    components: [],
  });

  const db = await getDB();
  const guildId = interaction.guild.id;

  try {
    // Delete old panel message if it exists
    const existing = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [guildId]);
    if (existing && existing.panel_message_id && existing.ticket_channel_id) {
      try {
        const oldChannel = interaction.guild.channels.cache.get(existing.ticket_channel_id);
        if (oldChannel) {
          const oldMsg = await oldChannel.messages.fetch(existing.panel_message_id).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }
      } catch {}
    }

    // Send the panel embed
    const panelChannel = interaction.guild.channels.cache.get(draft.ticket_channel_id);
    if (!panelChannel) {
      return interaction.editReply({ content: '❌ The selected ticket channel no longer exists. Please run setup again.' });
    }

    const panelEmbed = new EmbedBuilder()
      .setTitle(draft.ticket_title)
      .setDescription(draft.ticket_description)
      .setColor(0x2B2D31)
      .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
      .setTimestamp();

    if (draft.ticket_image) {
      panelEmbed.setImage(draft.ticket_image);
    }

    const panelButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(draft.ticket_emoji),
    );

    const panelMsg = await panelChannel.send({ embeds: [panelEmbed], components: [panelButton] });

    // Upsert config
    await db.run(
      `INSERT INTO ticket_config (guild_id, support_role_id, ticket_channel_id, ticket_category_id, ticket_title, ticket_description, ticket_image, ticket_emoji, log_channel_id, panel_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         support_role_id = excluded.support_role_id,
         ticket_channel_id = excluded.ticket_channel_id,
         ticket_category_id = excluded.ticket_category_id,
         ticket_title = excluded.ticket_title,
         ticket_description = excluded.ticket_description,
         ticket_image = excluded.ticket_image,
         ticket_emoji = excluded.ticket_emoji,
         log_channel_id = excluded.log_channel_id,
         panel_message_id = excluded.panel_message_id`,
      [
        guildId,
        draft.support_role_id,
        draft.ticket_channel_id,
        draft.ticket_category_id,
        draft.ticket_title,
        draft.ticket_description,
        draft.ticket_image,
        draft.ticket_emoji,
        draft.log_channel_id,
        panelMsg.id,
      ]
    );

    clearDraft(interaction);

    await interaction.editReply({
      content: `✅ **Ticket system configured successfully!**\n\nPanel sent to <#${draft.ticket_channel_id}>.`,
    });
  } catch (err) {
    console.error('[Ticket Setup] Finish error:', err);
    await interaction.editReply({ content: '❌ An error occurred while saving the configuration. Check the console.' });
  }
}

module.exports = {
  handleSetupMenu,
  handleRoleSelect,
  handleChannelSelect,
  handleTitleModal,
  handleDescModal,
  handleImageModal,
  handleEmojiModal,
};
