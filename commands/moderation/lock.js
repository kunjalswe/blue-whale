const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Locks the current channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to lock')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for locking the channel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      const embed = new EmbedBuilder()
        .setTitle('Channel Locked')
        .setDescription(`${targetChannel} has been locked by <@${interaction.user.id}>.`)
        .setColor(0xED4245)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to lock the channel.', ephemeral: true });
    }
  },
};
