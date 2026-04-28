const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a specific user by ID')
    .addStringOption(option => 
      option.setName('userid')
        .setDescription('The ID of the user to unban')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to unban members.', ephemeral: true });
    }

    const userId = interaction.options.getString('userid');

    try {
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        return interaction.reply({ content: '❌ This user is not banned or the ID is invalid.', ephemeral: true });
      }

      await interaction.guild.members.unban(userId);

      const embed = new EmbedBuilder()
        .setTitle('User Unbanned')
        .setColor(0x3498DB)
        .addFields(
          { name: 'User', value: `${bannedUser.user.tag}`, inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to unban the user. Make sure the ID is valid.', ephemeral: true });
    }
  },
};
