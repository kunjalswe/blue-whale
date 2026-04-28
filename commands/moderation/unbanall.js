const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unbanall')
    .setDescription('Unban ALL banned users in the server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permission to unban everyone.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const bans = await interaction.guild.bans.fetch();
      if (bans.size === 0) {
        return interaction.editReply({ content: '❌ There are no banned users in this server.' });
      }

      let count = 0;
      for (const [userId, ban] of bans) {
        await interaction.guild.members.unban(userId).catch(() => {});
        count++;
      }

      const embed = new EmbedBuilder()
        .setTitle('Unban All Complete')
        .setDescription(`Successfully unbanned **${count}** users.`)
        .setColor(0x3498DB)
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred while fetching or unbanning users.' });
    }
  },
};
