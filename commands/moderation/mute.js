const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');
const { parseDuration, formatDuration } = require('../../utils/duration.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user for a given duration')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Duration (e.g. 10s, 10m, 1h, 1d)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to mute members.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I cannot mute this user. They may have a higher role than me.', ephemeral: true });
    }

    const durationMs = parseDuration(durationInput);
    if (!durationMs) {
      return interaction.reply({ 
        content: '❌ Invalid duration format! Use e.g. `10s`, `10m`, `1h`, `1d`.', 
        ephemeral: true 
      });
    }

    // Discord timeout limit is 28 days
    if (durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: '❌ Duration cannot exceed 28 days.', ephemeral: true });
    }

    try {
      await member.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setTitle('User Muted')
        .setColor(0x3498DB)
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'Duration', value: formatDuration(durationMs), inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ An error occurred while trying to mute the user.', ephemeral: true });
    }
  },
};
