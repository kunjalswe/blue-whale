const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the ban')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to ban members.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
    }

    if (member) {
      if (!member.bannable) {
        return interaction.reply({ content: '❌ I cannot ban this user. They may have a higher role than me.', ephemeral: true });
      }
    }

    try {
      await interaction.guild.members.ban(user.id, { reason });

      const embed = new EmbedBuilder()
        .setTitle('User Banned')
        .setColor(0x3498DB)
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to ban the user.', ephemeral: true });
    }
  },
};
