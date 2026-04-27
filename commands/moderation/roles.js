const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Safe role management system')

    // ADD
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role').setRequired(true))
    )

    // REMOVE
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const role = interaction.options.getRole('role');

    // 🔒 Bot permission check
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: '❌ I don’t have **Manage Roles** permission.',
        ephemeral: true
      });
    }

    // 🔒 Role hierarchy safety
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: '❌ That role is higher than my highest role.',
        ephemeral: true
      });
    }

    try {

      // ================= ADD ROLE =================
      if (sub === 'add') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          return interaction.reply({ content: '❌ No permission.', ephemeral: true });
        }

        if (member.roles.cache.has(role.id)) {
          return interaction.reply({
            content: '⚠️ User already has this role.',
            ephemeral: true
          });
        }

        await member.roles.add(role);

        const embed = new EmbedBuilder()
          .setTitle('Role Added')
          .setColor(0x2B2D31)
          .addFields(
            { name: 'User', value: user.tag, inline: true },
            { name: 'Role', value: role.name, inline: true }
          )
          .setFooter({ text: `Moderator: ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
      }

      // ================= REMOVE ROLE =================
      if (sub === 'remove') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          return interaction.reply({ content: '❌ No permission.', ephemeral: true });
        }

        if (!member.roles.cache.has(role.id)) {
          return interaction.reply({
            content: '⚠️ User does not have this role.',
            ephemeral: true
          });
        }

        await member.roles.remove(role);

        const embed = new EmbedBuilder()
          .setTitle('Role Removed')
          .setColor(0x2B2D31)
          .addFields(
            { name: 'User', value: user.tag, inline: true },
            { name: 'Role', value: role.name, inline: true }
          )
          .setFooter({ text: `Moderator: ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
      }

    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: '❌ Something went wrong.',
        ephemeral: true
      });
    }
  }
};