const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getDB } = require('../../Database/database.js');

module.exports = {
  category: 'automod',
  data: new SlashCommandBuilder()
    .setName('blacklistword')
    .setDescription('Manage the blacklisted words for this server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a word to the blacklist')
        .addStringOption(o => o.setName('word').setDescription('The word to blacklist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a word from the blacklist')
        .addStringOption(o => o.setName('word').setDescription('The word to remove').setRequired(true))
    ),

  async execute(interaction) {
    const db = await getDB();
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const word = interaction.options.getString('word').toLowerCase().trim();

    if (sub === 'add') {
      try {
        await db.run(
          'INSERT INTO automod_blacklist (guild_id, word) VALUES (?, ?)',
          [guildId, word]
        );
        
        const embed = new EmbedBuilder()
          .setTitle('Word Blacklisted')
          .setColor(0x3498DB)
          .setDescription(`Successfully added \`${word}\` to the blacklist.`)
          
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return interaction.reply({
            content: `❌ The word \`${word}\` is already blacklisted.`,
            ephemeral: true
          });
        }
        throw err;
      }
    }

    if (sub === 'remove') {
      const result = await db.run(
        'DELETE FROM automod_blacklist WHERE guild_id = ? AND word = ?',
        [guildId, word]
      );

      if (result.changes === 0) {
        return interaction.reply({
          content: `❌ The word \`${word}\` was not found in the blacklist.`,
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Word Removed')
        .setColor(0x3498DB)
        .setDescription(`Successfully removed \`${word}\` from the blacklist.`)
        
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  // Note: The message listener integration is handled in antilink.js to avoid duplicate listeners
};
