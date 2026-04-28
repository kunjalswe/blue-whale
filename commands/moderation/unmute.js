const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to unmute members.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: '❌ This user is not currently muted.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I cannot unmute this user.', ephemeral: true });
    }

    try {
      await member.timeout(null, 'Manual unmute by moderator');

      const embed = new EmbedBuilder()
        .setTitle('User Unmuted')
        .setColor(0x3498DB)
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to unmute the user.', ephemeral: true });
    }
  },
};
