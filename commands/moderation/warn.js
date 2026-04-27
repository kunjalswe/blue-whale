const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warning system (add/check/remove)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a warning to a user')
        .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('View all warnings of a user')
        .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a specific warning or the latest one')
        .addUserOption(option => option.setName('user').setDescription('The user to remove a warning from').setRequired(true))
        .addIntegerOption(option => option.setName('warning_id').setDescription('The specific warning ID to remove (optional)').setRequired(false))
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to manage warnings.', ephemeral: true });
    }

    const db = await getDB();
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      const reason = interaction.options.getString('reason');

      if (user.bot) {
        return interaction.reply({ content: '❌ You cannot warn a bot.', ephemeral: true });
      }

      if (user.id === interaction.user.id) {
        return interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });
      }

      try {
        const result = await db.run(
          'INSERT INTO warnings (userId, guildId, moderatorId, reason) VALUES (?, ?, ?, ?)',
          [user.id, guildId, interaction.user.id, reason]
        );

        const warningId = result.lastID;

        const embed = new EmbedBuilder()
          .setTitle('User Warned')
          .setColor(0x2B2D31)
          .addFields(
            { name: 'User', value: `${user.tag}`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Warning ID', value: warningId.toString(), inline: true }
          )
          .setFooter({ text: `Moderator: ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction.guild, embed);
      } catch (error) {
        console.error('Error adding warning:', error);
        await interaction.reply({ content: '❌ Database error: Could not save the warning.', ephemeral: true });
      }
    }

    if (subcommand === 'check') {
      await interaction.deferReply();

      try {
        const warnings = await db.all(
          'SELECT * FROM warnings WHERE userId = ? AND guildId = ? ORDER BY timestamp DESC',
          [user.id, guildId]
        );

        if (!warnings || warnings.length === 0) {
          return interaction.editReply({ content: `✅ ${user.tag} has no warnings.` });
        }

        const embed = new EmbedBuilder()
          .setTitle(`Warnings for ${user.tag}`)
          .setDescription(`Total Warnings: **${warnings.length}**`)
          .setColor(0x2B2D31)
          .setThumbnail(user.displayAvatarURL())
          .setFooter({ text: "Modern & Minimalistic • Blur Aesthetic" })
          .setTimestamp();

        const warningsList = warnings.map((w, index) => {
          const date = new Date(w.timestamp + 'Z');
          return `**${index + 1}.** [ID: \`${w.id}\`]\n**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>\n**Date:** <t:${Math.floor(date.getTime() / 1000)}:R>`;
        }).join('\n\n');

        if (warningsList.length > 4000) {
          embed.setDescription(`Total Warnings: **${warnings.length}**\n\n${warningsList.substring(0, 3900)}... (truncated)`);
        } else {
          embed.setDescription(`Total Warnings: **${warnings.length}**\n\n${warningsList}`);
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error fetching warnings:', error);
        await interaction.editReply({ content: '❌ Database error: Could not fetch warnings.' });
      }
    }

    if (subcommand === 'remove') {
      const warningId = interaction.options.getInteger('warning_id');
      await interaction.deferReply();

      try {
        if (warningId) {
          const result = await db.run(
            'DELETE FROM warnings WHERE id = ? AND guildId = ?',
            [warningId, guildId]
          );
          
          if (result.changes === 0) {
            return interaction.editReply({ content: '❌ Warning not found or does not belong to this server.' });
          }

          return interaction.editReply({ content: `✅ Successfully deleted warning \`${warningId}\` from ${user.tag}.` });
        } else {
          const latestWarning = await db.get(
            'SELECT id FROM warnings WHERE userId = ? AND guildId = ? ORDER BY timestamp DESC LIMIT 1',
            [user.id, guildId]
          );

          if (!latestWarning) {
            return interaction.editReply({ content: `❌ ${user.tag} has no warnings to remove.` });
          }

          await db.run('DELETE FROM warnings WHERE id = ?', [latestWarning.id]);

          return interaction.editReply({ content: `✅ Successfully deleted the latest warning from ${user.tag}.` });
        }
      } catch (error) {
        console.error('Error removing warning:', error);
        await interaction.editReply({ content: '❌ Database error: Could not remove the warning.' });
      }
    }
  },
};
