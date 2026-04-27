const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
const { getDB } = require('../../Database/database.js');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system management')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

    // ── setup ──
    .addSubcommand(sub =>
      sub.setName('setup').setDescription('Set up the ticket system with an interactive menu')
    )

    // ── add ──
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a user to the current ticket')
        .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true))
    )

    // ── remove ──
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the current ticket')
        .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
    )

    // ── rename ──
    .addSubcommand(sub =>
      sub
        .setName('rename')
        .setDescription('Rename the current ticket channel')
        .addStringOption(o => o.setName('name').setDescription('New name').setRequired(true))
    )

    // ── close ──
    .addSubcommand(sub =>
      sub.setName('close').setDescription('Close the current ticket and generate a transcript')
    )

    // ── config ──
    .addSubcommand(sub =>
      sub.setName('config').setDescription('View the current ticket system configuration')
    )

    // ── reset ──
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Completely reset the ticket system for this server')
    ),

  // ─────────────────────────────────────────────────────
  //  EXECUTE
  // ─────────────────────────────────────────────────────
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'setup':
        return require('./ticketsetup.js').run(interaction, client);
      case 'add':
        return require('./ticketadd.js').run(interaction, client);
      case 'remove':
        return require('./ticketremove.js').run(interaction, client);
      case 'rename':
        return require('./ticketrename.js').run(interaction, client);
      case 'close':
        return require('./ticketclose.js').run(interaction, client);
      case 'config':
        return require('./ticketconfig.js').run(interaction, client);
      case 'reset':
        return require('./ticketreset.js').run(interaction, client);
    }
  },

  // ─────────────────────────────────────────────────────
  //  INIT — register button & select-menu listeners
  // ─────────────────────────────────────────────────────
  init(client) {
    client.on('interactionCreate', async (interaction) => {
      // Skip interactions that aren't ours (performance guard)
      const id = interaction.customId;
      if (!id || !id.startsWith('ticket_')) return;
      if (!interaction.guild) return;

      try {
        // ── Buttons ──
        if (interaction.isButton()) {
          const { handleCreate, handleClaim, handleClose, handleCloseConfirm, handleCloseCancel, handleResetConfirm, handleResetCancel } = require('./handlers/buttonHandler.js');
          const selectHandler = require('./handlers/selectHandler.js');

          switch (id) {
            case 'ticket_create': return await handleCreate(interaction, client);
            case 'ticket_claim': return await handleClaim(interaction, client);
            case 'ticket_close': return await handleClose(interaction, client);
            case 'ticket_close_confirm': return await handleCloseConfirm(interaction, client);
            case 'ticket_close_cancel': return await handleCloseCancel(interaction, client);
            case 'ticket_reset_confirm': return await handleResetConfirm(interaction, client);
            case 'ticket_reset_cancel': return await handleResetCancel(interaction, client);

            // Setup Buttons
            case 'ticket_setup_title': return await selectHandler.showTitleModal(interaction);
            case 'ticket_setup_description': return await selectHandler.showDescModal(interaction);
            case 'ticket_setup_image': return await selectHandler.showImageModal(interaction);
          }
        }

        // ── Select Menus ──
        if (interaction.isStringSelectMenu() && id === 'ticket_setup_menu') {
          return await require('./handlers/selectHandler.js').handleSetupMenu(interaction, client);
        }

        // ── Role Select Menu ──
        if (interaction.isRoleSelectMenu() && id === 'ticket_setup_role') {
          return await require('./handlers/selectHandler.js').handleRoleSelect(interaction, client);
        }

        // ── Channel Select Menu ──
        if (interaction.isChannelSelectMenu()) {
          if (id === 'ticket_setup_channel' || id === 'ticket_setup_category' || id === 'ticket_setup_log') {
            return await require('./handlers/selectHandler.js').handleChannelSelect(interaction, client);
          }
        }

        // ── Modals ──
        if (interaction.isModalSubmit()) {
          const selectHandler = require('./handlers/selectHandler.js');
          switch (id) {
            case 'ticket_setup_title_modal': return await selectHandler.handleTitleModal(interaction, client);
            case 'ticket_setup_desc_modal': return await selectHandler.handleDescModal(interaction, client);
            case 'ticket_setup_image_modal': return await selectHandler.handleImageModal(interaction, client);
            case 'ticket_setup_emoji_modal': return await selectHandler.handleEmojiModal(interaction, client);
          }
        }
      } catch (err) {
        console.error('[Ticket] Interaction error:', err);
        try {
          const reply = { content: '❌ An error occurred while processing this action.', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch { }
      }
    });

    console.log('✅ Ticket system listeners initialised.');
  },
};
