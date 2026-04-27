const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlocks the current channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to unlock')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for unlocking the channel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      const embed = new EmbedBuilder()
        .setTitle('Channel Unlocked')
        .setDescription(`${targetChannel} has been unlocked by <@${interaction.user.id}>.`)
        .setColor(0x57F287)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to unlock the channel.', ephemeral: true });
    }
  },
};
