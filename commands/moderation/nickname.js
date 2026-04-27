const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Set or reset a user\'s nickname')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user whose nickname you want to change')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('nickname')
        .setDescription('The new nickname (leave blank to reset)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageNicknames),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return interaction.reply({ content: '❌ You do not have permission to manage nicknames.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const newNickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    if (!member.manageable) {
      return interaction.reply({ content: '❌ I cannot change this user\'s nickname. They may have a higher role than me.', ephemeral: true });
    }

    try {
      await member.setNickname(newNickname);

      const embed = new EmbedBuilder()
        .setTitle('Nickname Updated')
        .setColor(0x2B2D31)
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'New Nickname', value: newNickname || '*Reset to original*', inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to update the nickname.', ephemeral: true });
    }
  },
};
