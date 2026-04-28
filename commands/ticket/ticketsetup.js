const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getDB } = require('../../Database/database.js');

// In-memory draft storage keyed by `guildId-userId`
const setupDrafts = new Map();

function getDraftKey(interaction) {
  return `${interaction.guild.id}-${interaction.user.id}`;
}

function getDraft(interaction) {
  const key = getDraftKey(interaction);
  if (!setupDrafts.has(key)) {
    setupDrafts.set(key, {
      support_role_id: null,
      ticket_channel_id: null,
      ticket_category_id: null,
      ticket_title: 'Support Ticket',
      ticket_description: 'Click the button below to create a support ticket.',
      ticket_image: null,
      ticket_emoji: '🎫',
      log_channel_id: null,
    });
  }
  return setupDrafts.get(key);
}

function clearDraft(interaction) {
  setupDrafts.delete(getDraftKey(interaction));
}

/**
 * Build the setup embed showing the current draft values.
 */
function buildSetupEmbed(draft) {
  return new EmbedBuilder()
    .setAuthor({ name: 'Ticket System Setup', iconURL: 'https://cdn.dribbble.com/userupload/32130511/file/original-a5ae53cfdc4bf822c6e5afc90f4c8660.png?resize=752x&vertical=center' })
    .setDescription('Configure your ticket system using the menu below. Once finished, click **Finish Setup** to deploy the panel.')
    .setColor(0x3498DB)
    .addFields(
      { name: '📂 Infrastructure', value: `**Category:** ${draft.ticket_category_id ? `<#${draft.ticket_category_id}>` : '`Not set`'}\n**Channel:** ${draft.ticket_channel_id ? `<#${draft.ticket_channel_id}>` : '`Not set`'}\n**Logs:** ${draft.log_channel_id ? `<#${draft.log_channel_id}>` : '`Not set`'}`, inline: false },
      { name: '👮 Staff Configuration', value: `**Support Role:** ${draft.support_role_id ? `<@&${draft.support_role_id}>` : '`Not set`'}`, inline: true },
      { name: '🎨 Appearance', value: `**Emoji:** ${draft.ticket_emoji}\n**Image:** ${draft.ticket_image ? `[View Image](${draft.ticket_image})` : '`None`'}`, inline: true },
      { name: '📝 Content', value: `**Title:** \`${draft.ticket_title}\`\n**Description:** \`${draft.ticket_description.length > 50 ? draft.ticket_description.substring(0, 47) + '...' : draft.ticket_description}\``, inline: false },
    )
    .setFooter({ text: "Premium Ticket System" })
    .setTimestamp();
}

function buildSetupButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_setup_title').setLabel('Set Title').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
    new ButtonBuilder().setCustomId('ticket_setup_description').setLabel('Set Description').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
    new ButtonBuilder().setCustomId('ticket_setup_image').setLabel('Set Image').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
  );
}

/**
 * Build the main setup select menu.
 */
function buildSetupMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_setup_menu')
      .setPlaceholder('⚙️ More options / Finish setup')
      .addOptions([
        { label: 'Support Role', description: 'Set the support/staff role', value: 'support_role', emoji: '👮' },
        { label: 'Ticket Channel', description: 'Channel where the panel will be sent', value: 'ticket_channel', emoji: '📢' },
        { label: 'Ticket Category', description: 'Category for new ticket channels', value: 'ticket_category', emoji: '📂' },
        { label: 'Ticket Emoji', description: 'Emoji for the create button', value: 'ticket_emoji', emoji: '😀' },
        { label: 'Log Channel', description: 'Channel where transcripts are sent', value: 'log_channel', emoji: '📋' },
        { label: '✅ Finish Setup', description: 'Save config and send the panel', value: 'finish_setup', emoji: '✅' },
      ])
  );
}

// ─────────────────────────────────────────────────────
//  /ticket setup — entry point
// ─────────────────────────────────────────────────────
async function run(interaction) {
  // Load existing config into the draft so we can "overwrite" safely
  const db = await getDB();
  const existing = await db.get('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guild.id]);

  const draft = getDraft(interaction);
  if (existing) {
    draft.support_role_id = existing.support_role_id;
    draft.ticket_channel_id = existing.ticket_channel_id;
    draft.ticket_category_id = existing.ticket_category_id;
    draft.ticket_title = existing.ticket_title || 'Support Ticket';
    draft.ticket_description = existing.ticket_description || 'Click the button below to create a support ticket.';
    draft.ticket_image = existing.ticket_image;
    draft.ticket_emoji = existing.ticket_emoji || '🎫';
    draft.log_channel_id = existing.log_channel_id;
  }

  await interaction.reply({
    embeds: [buildSetupEmbed(draft)],
    components: [buildSetupButtons(), buildSetupMenu()],
    ephemeral: true,
  });
}

module.exports = {
  run,
  getDraft,
  clearDraft,
  buildSetupEmbed,
  buildSetupMenu,
  buildSetupButtons,
  setupDrafts,
};
