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
    .setTitle('Ticket System Setup')
    .setDescription('Use the select menu below to configure each option. Select **Finish Setup** when done.')
    .setColor(0x2B2D31)
    .addFields(
      { name: 'Support Role', value: draft.support_role_id ? `<@&${draft.support_role_id}>` : '`Not set`', inline: true },
      { name: 'Ticket Channel', value: draft.ticket_channel_id ? `<#${draft.ticket_channel_id}>` : '`Not set`', inline: true },
      { name: 'Ticket Category', value: draft.ticket_category_id ? `<#${draft.ticket_category_id}>` : '`Not set`', inline: true },
      { name: 'Title', value: `\`${draft.ticket_title}\``, inline: true },
      { name: 'Description', value: draft.ticket_description.length > 100 ? `\`${draft.ticket_description.substring(0, 97)}...\`` : `\`${draft.ticket_description}\``, inline: true },
      { name: 'Image', value: draft.ticket_image ? `[Link](${draft.ticket_image})` : '`Not set (optional)`', inline: true },
      { name: 'Emoji', value: draft.ticket_emoji, inline: true },
      { name: 'Log Channel', value: draft.log_channel_id ? `<#${draft.log_channel_id}>` : '`Not set`', inline: true },
    )
    .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
    .setTimestamp();
}

/**
 * Build the main setup select menu.
 */
function buildSetupMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_setup_menu')
      .setPlaceholder('⚙️ Select an option to configure')
      .addOptions([
        { label: 'Support Role', description: 'Set the support/staff role', value: 'support_role', emoji: '👮' },
        { label: 'Ticket Channel', description: 'Channel where the panel will be sent', value: 'ticket_channel', emoji: '📢' },
        { label: 'Ticket Category', description: 'Category for new ticket channels', value: 'ticket_category', emoji: '📂' },
        { label: 'Ticket Title', description: 'Title on the ticket panel embed', value: 'ticket_title', emoji: '📝' },
        { label: 'Ticket Description', description: 'Description on the ticket panel embed', value: 'ticket_description', emoji: '📄' },
        { label: 'Ticket Image (Optional)', description: 'Image URL for the panel embed', value: 'ticket_image', emoji: '🖼️' },
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
    components: [buildSetupMenu()],
    ephemeral: true,
  });
}

module.exports = {
  run,
  getDraft,
  clearDraft,
  buildSetupEmbed,
  buildSetupMenu,
  setupDrafts,
};
