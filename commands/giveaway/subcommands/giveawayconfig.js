const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../../../Database/database.js');

async function run(interaction) {
  const db = await getDB();
  const guildId = interaction.guild.id;

  const channel = interaction.options.getChannel('channel');
  const requiredRole = interaction.options.getRole('required_role');
  const bypassRole = interaction.options.getRole('bypass_role');
  const managerRole = interaction.options.getRole('manager_role');

  // If no options provided, show current config
  if (!channel && !requiredRole && !bypassRole && !managerRole) {
    const config = await db.get('SELECT * FROM giveaway_config WHERE guild_id = ?', [guildId]);

    if (!config) {
      return interaction.reply({
        content: '❌ No giveaway configuration set. Use `/giveaway config` with options to configure.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Giveaway Configuration')
      .setColor(0x3498DB)
      .addFields(
        { name: 'Channel', value: config.giveaway_channel_id ? `<#${config.giveaway_channel_id}>` : '`Not set`', inline: true },
        { name: 'Required Role', value: config.required_role_id ? `<@&${config.required_role_id}>` : '`None`', inline: true },
        { name: 'Bypass Role', value: config.bypass_role_id ? `<@&${config.bypass_role_id}>` : '`None`', inline: true },
        { name: 'Manager Role', value: config.manager_role_id ? `<@&${config.manager_role_id}>` : '`None`', inline: true },
      )
      
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Upsert config
  const existing = await db.get('SELECT * FROM giveaway_config WHERE guild_id = ?', [guildId]);

  const newChannel = channel ? channel.id : (existing?.giveaway_channel_id || null);
  const newRequired = requiredRole ? requiredRole.id : (existing?.required_role_id || null);
  const newBypass = bypassRole ? bypassRole.id : (existing?.bypass_role_id || null);
  const newManager = managerRole ? managerRole.id : (existing?.manager_role_id || null);

  await db.run(
    `INSERT INTO giveaway_config (guild_id, giveaway_channel_id, required_role_id, bypass_role_id, manager_role_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET
       giveaway_channel_id = excluded.giveaway_channel_id,
       required_role_id = excluded.required_role_id,
       bypass_role_id = excluded.bypass_role_id,
       manager_role_id = excluded.manager_role_id`,
    [guildId, newChannel, newRequired, newBypass, newManager]
  );

  const embed = new EmbedBuilder()
    .setTitle('Giveaway Configuration Updated')
    .setColor(0x3498DB)
    .addFields(
      { name: 'Channel', value: newChannel ? `<#${newChannel}>` : '`Not set`', inline: true },
      { name: 'Required Role', value: newRequired ? `<@&${newRequired}>` : '`None`', inline: true },
      { name: 'Bypass Role', value: newBypass ? `<@&${newBypass}>` : '`None`', inline: true },
      { name: 'Manager Role', value: newManager ? `<@&${newManager}>` : '`None`', inline: true },
    )
    
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { run };
