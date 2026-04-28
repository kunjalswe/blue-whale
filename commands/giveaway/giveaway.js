const {
  SlashCommandBuilder,
  PermissionsBitField,
} = require('discord.js');

module.exports = {
  category: 'giveaway',
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway system management')


    // ── start ──
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(o =>
          o.setName('prize').setDescription('What are you giving away?').setRequired(true)
        )
        .addStringOption(o =>
          o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 2h30m, 1d)').setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName('winners').setDescription('Number of winners (default: 1)').setMinValue(1).setMaxValue(20).setRequired(false)
        )
    )

    // ── config ──
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Configure giveaway settings for this server')
        .addChannelOption(o =>
          o.setName('channel').setDescription('Default giveaway channel').setRequired(false)
        )
        .addRoleOption(o =>
          o.setName('required_role').setDescription('Role required to enter giveaways (optional)').setRequired(false)
        )
        .addRoleOption(o =>
          o.setName('bypass_role').setDescription('Role that bypasses requirements (optional)').setRequired(false)
        )
        .addRoleOption(o =>
          o.setName('manager_role').setDescription('Role allowed to manage giveaways (optional)').setRequired(false)
        )
    )

    // ── pause ──
    .addSubcommand(sub =>
      sub
        .setName('pause')
        .setDescription('Pause an active giveaway')
        .addStringOption(o =>
          o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    )

    // ── resume ──
    .addSubcommand(sub =>
      sub
        .setName('resume')
        .setDescription('Resume a paused giveaway')
        .addStringOption(o =>
          o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    )

    // ── end ──
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End a giveaway immediately')
        .addStringOption(o =>
          o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    )

    // ── reroll ──
    .addSubcommand(sub =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners of an ended giveaway')
        .addStringOption(o =>
          o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName('winners').setDescription('Number of new winners (default: original count)').setMinValue(1).setMaxValue(20).setRequired(false)
        )
    )

    // ── delete ──
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a giveaway and its message')
        .addStringOption(o =>
          o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    ),

  // ─────────────────────────────────────────────────────
  //  EXECUTE
  // ─────────────────────────────────────────────────────
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const { getDB } = require('../../Database/database.js');
    const db = await getDB();

    // Permission Check
    const config = await db.get('SELECT * FROM giveaway_config WHERE guild_id = ?', [interaction.guild.id]);
    const hasManageGuild = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
    const hasManagerRole = config && config.manager_role_id ? interaction.member.roles.cache.has(config.manager_role_id) : false;

    if (!hasManageGuild && !hasManagerRole) {
      return interaction.reply({
        content: '❌ You do not have permission to use giveaway commands. You need `Manage Server` permission or the Giveaway Manager role.',
        ephemeral: true
      });
    }

    switch (sub) {
      case 'start':
        return require('./subcommands/giveawaystart.js').run(interaction, client);
      case 'config':
        return require('./subcommands/giveawayconfig.js').run(interaction, client);
      case 'pause':
        return require('./subcommands/giveawaypause.js').run(interaction, client);
      case 'resume':
        return require('./subcommands/giveawayresume.js').run(interaction, client);
      case 'end':
        return require('./subcommands/giveawayend.js').run(interaction, client);
      case 'reroll':
        return require('./subcommands/giveawayreroll.js').run(interaction, client);
      case 'delete':
        return require('./subcommands/giveawaydelete.js').run(interaction, client);
    }
  },

  // ─────────────────────────────────────────────────────
  //  INIT — button listener + resume active giveaways
  // ─────────────────────────────────────────────────────
  init(client) {
    const { resumeAllGiveaways } = require('../../utils/giveaway.js');

    // Resume all active giveaways on startup
    client.once('ready', async () => {
      await resumeAllGiveaways(client);
    });

    // Button handler
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (interaction.customId !== 'giveaway_join') return;
      if (!interaction.guild) return;

      try {
        await require('./handlers/buttonHandler.js').handleJoin(interaction, client);
      } catch (err) {
        console.error('[Giveaway] Button error:', err);
        try {
          const reply = { content: '❌ An error occurred.', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch {}
      }
    });

    console.log('✅ Giveaway system listeners initialised.');
  },
};
