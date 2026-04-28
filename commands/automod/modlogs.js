const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('Manage the moderation logs channel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the channel for moderation logs')
        .addChannelOption(option => option.setName('channel').setDescription('The channel for logs').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the current moderation logs channel')
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permission to configure modlogs.', ephemeral: true });
    }

    const db = await getDB();
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      const channel = interaction.options.getChannel('channel');

      try {
        const existing = await db.get('SELECT * FROM modlogs WHERE guildId = ?', [guildId]);
        if (existing) {
          await db.run('UPDATE modlogs SET channelId = ? WHERE guildId = ?', [channel.id, guildId]);
        } else {
          await db.run('INSERT INTO modlogs (guildId, channelId) VALUES (?, ?)', [guildId, channel.id]);
        }

        const embed = new EmbedBuilder()
          .setTitle('Modlogs Configured')
          .setColor(0x3498DB)
          .setDescription(`All moderation actions will now be logged in ${channel}.`)
          
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Error setting modlogs:', error);
        await interaction.reply({ content: '❌ A database error occurred while saving the modlogs channel.', ephemeral: true });
      }
    }

    if (subcommand === 'remove') {
      try {
        const existing = await db.get('SELECT * FROM modlogs WHERE guildId = ?', [guildId]);
        if (!existing) {
          return interaction.reply({ content: '❌ No modlogs channel is currently set for this server.', ephemeral: true });
        }

        await db.run('DELETE FROM modlogs WHERE guildId = ?', [guildId]);

        const embed = new EmbedBuilder()
          .setTitle('Modlogs Removed')
          .setColor(0x3498DB)
          .setDescription('Moderation actions will no longer be logged.')
          
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Error removing modlogs:', error);
        await interaction.reply({ content: '❌ A database error occurred while removing the modlogs channel.', ephemeral: true });
      }
    }
  },
};
