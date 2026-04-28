const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a specific warning from a user')
    .addUserOption(option => option.setName('user').setDescription('The user to unwarn').setRequired(true))
    .addIntegerOption(option => option.setName('warning_id').setDescription('The specific warning ID to remove (optional)').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to manage warnings.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const warningId = interaction.options.getInteger('warning_id');
    const guildId = interaction.guild.id;

    await interaction.deferReply();
    const db = await getDB();

    try {
      if (warningId) {
        const result = await db.run(
          'DELETE FROM warnings WHERE id = ? AND guildId = ?',
          [warningId, guildId]
        );
        
        if (result.changes === 0) {
          return interaction.editReply({ content: '❌ Warning not found or does not belong to this server.' });
        }

        const embed = new EmbedBuilder()
          .setTitle('Warning Removed')
          .setColor(0x3498DB)
          .setDescription(`Successfully deleted warning \`${warningId}\` from ${user}.`)
          .setFooter({ text: `Moderator: ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
      } else {
        const latestWarning = await db.get(
          'SELECT id FROM warnings WHERE userId = ? AND guildId = ? ORDER BY timestamp DESC LIMIT 1',
          [user.id, guildId]
        );

        if (!latestWarning) {
          return interaction.editReply({ content: `❌ ${user.tag} has no warnings to remove.` });
        }

        await db.run('DELETE FROM warnings WHERE id = ?', [latestWarning.id]);

        const embed = new EmbedBuilder()
          .setTitle('Latest Warning Removed')
          .setColor(0x3498DB)
          .setDescription(`Successfully deleted the latest warning from ${user}.`)
          .setFooter({ text: `Moderator: ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
      }
    } catch (error) {
      console.error('Error removing warning:', error);
      await interaction.editReply({ content: '❌ Database error: Could not remove the warning.' });
    }
  },
};
