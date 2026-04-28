const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a specified number of messages')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: '❌ You do not have permission to purge messages.', ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');

    try {
      // Fetch and delete the messages
      const deleted = await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setTitle('Messages Purged')
        .setColor(0x3498DB)
        .addFields(
          { name: 'Channel', value: `${interaction.channel}`, inline: true },
          { name: 'Amount', value: `${deleted.size}`, inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      // Reply with a confirmation that auto-deletes
      await interaction.reply({ content: `✅ Successfully deleted **${deleted.size}** messages.`, ephemeral: true });
      
      // Log to modlogs
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to purge messages. Note: Messages older than 14 days cannot be bulk deleted.', ephemeral: true });
    }
  },
};
