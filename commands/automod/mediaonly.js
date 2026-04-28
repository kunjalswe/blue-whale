const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');
const cache = require('../../utils/cache.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mediaonly')
    .setDescription('Configure a channel to only allow media (attachments)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable media-only mode in the current channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable media-only mode in the current channel')
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permission to use this command.', ephemeral: true });
    }

    const db = await getDB();
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'enable') {
      try {
        const existing = await db.get('SELECT * FROM mediaonly WHERE guildId = ? AND channelId = ?', [guildId, channelId]);
        if (!existing) {
          await db.run('INSERT INTO mediaonly (guildId, channelId) VALUES (?, ?)', [guildId, channelId]);
        }
        
        // Update cache
        cache.set(`mediaonly:${guildId}:${channelId}`, true);

        const embed = new EmbedBuilder()
          .setTitle('Media-Only Enabled')
          .setColor(0x3498DB)
          .setDescription(`This channel has been set to **media-only**. Messages without attachments will be automatically deleted. Admins can bypass this restriction.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Error enabling mediaonly:', error);
        await interaction.reply({ content: '❌ A database error occurred.', ephemeral: true });
      }
    } else if (subcommand === 'disable') {
      try {
        await db.run('DELETE FROM mediaonly WHERE guildId = ? AND channelId = ?', [guildId, channelId]);
        
        // Update cache
        cache.delete(`mediaonly:${guildId}:${channelId}`);

        const embed = new EmbedBuilder()
          .setTitle('Media-Only Disabled')
          .setColor(0x3498DB)
          .setDescription(`This channel is no longer restricted to media-only.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Error disabling mediaonly:', error);
        await interaction.reply({ content: '❌ A database error occurred.', ephemeral: true });
      }
    }
  },

  init(client) {
    client.on('messageCreate', async (message) => {
      if (message.author.bot || !message.guild) return;

      const guildId = message.guild.id;
      const channelId = message.channel.id;

      // Check if user is admin (Bypass)
      if (message.member && (message.member.permissions.has(PermissionsBitField.Flags.Administrator) || message.member.permissions.has(PermissionsBitField.Flags.ManageGuild))) {
        return;
      }

      // Check if message has attachments
      if (message.attachments.size > 0) {
        return;
      }

      // If no attachments, check if channel is media-only (CACHED)
      try {
        const isMediaOnly = await cache.getOrSet(`mediaonly:${guildId}:${channelId}`, async () => {
          const db = await getDB();
          const row = await db.get('SELECT * FROM mediaonly WHERE guildId = ? AND channelId = ?', [guildId, channelId]);
          return !!row;
        });
        
        if (isMediaOnly) {
          await message.delete().catch(() => {});
        }
      } catch (error) {
        console.error('Error checking mediaonly in messageCreate:', error);
      }
    });
  }
};
