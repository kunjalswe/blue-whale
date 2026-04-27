const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleicon')
    .setDescription('Change a role\'s icon')
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('The role to change')
        .setRequired(true))
    .addAttachmentOption(option => 
      option.setName('icon')
        .setDescription('The new icon image for the role')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: '❌ You do not have permission to manage roles.', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    const attachment = interaction.options.getAttachment('icon');

    if (!interaction.guild.features.includes('ROLE_ICONS')) {
      return interaction.reply({ content: '❌ This server does not have the required Boost Level (2) to set role icons.', ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: '❌ I cannot edit this role because its position is higher than or equal to my highest role.', ephemeral: true });
    }

    if (!attachment.contentType?.startsWith('image/')) {
      return interaction.reply({ content: '❌ Please provide a valid image file.', ephemeral: true });
    }

    try {
      await role.setIcon(attachment.url, `Role icon updated by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Role Icon Updated')
        .setColor(role.color || 0x5865F2)
        .setDescription(`Successfully updated the icon for ${role}.`)
        .setThumbnail(attachment.url)
        .addFields({ name: 'Moderator', value: interaction.user.tag, inline: true })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to update the role icon.', ephemeral: true });
    }
  },
};
