const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('hide')
    .setDescription('Hides the current channel from members')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to hide')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for hiding the channel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false
      });

      const embed = new EmbedBuilder()
        .setTitle('Channel Hidden')
        .setDescription(`${targetChannel} is now hidden from members.`)
        .setColor(0x3498DB)
        .addFields(
          { name: 'Moderator', value: `<@${interaction.user.id}>` },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to hide the channel.', ephemeral: true });
    }
  },
};
