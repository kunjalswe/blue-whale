const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');

module.exports = {
  category: "automod",
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage roles given to members automatically upon joining')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a role to the autorole list')
        .addRoleOption(o => o.setName('role').setDescription('The role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a role from the autorole list')
        .addRoleOption(o => o.setName('role').setDescription('The role to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Show current autorole configuration')
    ),

  async execute(interaction) {
    const db = await getDB();
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const role = interaction.options.getRole('role');

      // Check limit
      const current = await db.all('SELECT role_id FROM autoroles WHERE guild_id = ?', [guildId]);
      if (current.length >= 3) {
        return interaction.reply({ content: '❌ You can only have a maximum of **3** autoroles per server.', ephemeral: true });
      }

      // Check if already added
      if (current.some(r => r.role_id === role.id)) {
        return interaction.reply({ content: '❌ This role is already in the autorole list.', ephemeral: true });
      }

      // Check role hierarchy
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: '❌ I cannot assign this role because it is higher than or equal to my highest role.', ephemeral: true });
      }

      await db.run('INSERT INTO autoroles (guild_id, role_id) VALUES (?, ?)', [guildId, role.id]);
      
      return interaction.reply({ content: `✅ Successfully added ${role} to the autorole list.`, ephemeral: true });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const result = await db.run('DELETE FROM autoroles WHERE guild_id = ? AND role_id = ?', [guildId, role.id]);

      if (result.changes === 0) {
        return interaction.reply({ content: '❌ This role is not in the autorole list.', ephemeral: true });
      }

      return interaction.reply({ content: `✅ Successfully removed ${role} from the autorole list.`, ephemeral: true });
    }

    if (sub === 'config') {
      const roles = await db.all('SELECT role_id FROM autoroles WHERE guild_id = ?', [guildId]);
      
      if (roles.length === 0) {
        return interaction.reply({ content: 'ℹ️ No autoroles configured for this server.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Autorole Configuration')
        .setDescription('New members will automatically receive these roles:')
        .setColor(0x3498DB)
        .addFields({ 
          name: 'Roles', 
          value: roles.map(r => `<@&${r.role_id}>`).join('\n') 
        })
        .setFooter({ text: `Limit: ${roles.length}/3` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  // ─────────────────────────────────────────────────────
  //  INIT — register member join listener
  // ─────────────────────────────────────────────────────
  init(client) {
    client.on('guildMemberAdd', async (member) => {
      if (member.user.bot) return;

      try {
        const db = await getDB();
        const roles = await db.all('SELECT role_id FROM autoroles WHERE guild_id = ?', [member.guild.id]);

        if (roles.length > 0) {
          const roleIds = roles.map(r => r.role_id);
          // Filter out roles the bot can't assign (hierarchy check)
          const validRoleIds = roleIds.filter(id => {
            const role = member.guild.roles.cache.get(id);
            return role && role.position < member.guild.members.me.roles.highest.position;
          });

          if (validRoleIds.length > 0) {
            await member.roles.add(validRoleIds, 'Autorole system').catch(err => {
              console.error(`[Autorole] Failed to add roles to ${member.user.tag}:`, err.message);
            });
          }
        }
      } catch (err) {
        console.error('[Autorole] DB error in guildMemberAdd:', err);
      }
    });

    console.log('✅ Autorole system initialised.');
  }
};
