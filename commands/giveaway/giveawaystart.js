const { getDB } = require('../../Database/database.js');
const {
  parseDuration,
  buildGiveawayEmbed,
  buildGiveawayButtons,
  scheduleGiveaway,
} = require('../../utils/giveaway.js');

async function run(interaction, client) {
  const prize = interaction.options.getString('prize');
  const durationStr = interaction.options.getString('duration');
  const winnersCount = interaction.options.getInteger('winners') || 1;

  // Parse duration
  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    return interaction.reply({
      content:
        '❌ **Invalid duration format!**\n\n' +
        '**Valid examples:**\n' +
        '`10m` → 10 minutes\n' +
        '`1h` → 1 hour\n' +
        '`2h30m` → 2 hours 30 minutes\n' +
        '`1d` → 1 day\n' +
        '`1d12h` → 1 day 12 hours\n\n' +
        '**Max duration:** 30 days',
      ephemeral: true,
    });
  }

  const db = await getDB();
  const guildId = interaction.guild.id;

  // Determine channel — use config channel or current channel
  const config = await db.get('SELECT * FROM giveaway_config WHERE guild_id = ?', [guildId]);
  const channelId = (config && config.giveaway_channel_id) || interaction.channel.id;
  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    return interaction.reply({
      content: '❌ The configured giveaway channel no longer exists. Run `/giveaway config` to set a new one.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const endTime = Date.now() + durationMs;

    // Build the giveaway data object for embed building
    const giveawayData = {
      host_id: interaction.user.id,
      prize,
      winners_count: winnersCount,
      participants: '[]',
      status: 'active',
      end_time: endTime,
    };

    // Send giveaway message
    const msg = await channel.send({
      embeds: [buildGiveawayEmbed(giveawayData)],
      components: [buildGiveawayButtons()],
    });

    // Store in DB
    await db.run(
      `INSERT INTO giveaways (giveaway_id, guild_id, channel_id, host_id, prize, winners_count, participants, status, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [msg.id, guildId, channelId, interaction.user.id, prize, winnersCount, '[]', 'active', endTime]
    );

    // Schedule auto-end
    const fullGiveaway = await db.get('SELECT * FROM giveaways WHERE giveaway_id = ?', [msg.id]);
    scheduleGiveaway(client, fullGiveaway);

    await interaction.editReply({
      content: `✅ Giveaway started in <#${channelId}>!\n**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>`,
    });
  } catch (err) {
    console.error('[Giveaway Start] Error:', err);
    await interaction.editReply({ content: '❌ Failed to start the giveaway. Check bot permissions.' });
  }
}

module.exports = { run };
