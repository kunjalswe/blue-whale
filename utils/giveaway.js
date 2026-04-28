const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDB } = require('../Database/database.js');

// ─────────────────────────────────────────────────────
//  DURATION PARSER
// ─────────────────────────────────────────────────────

/**
 * Parse a human-readable duration string into milliseconds.
 * Supports: 10m, 1h, 2h30m, 1d, 1d12h, 3d6h30m, etc.
 * @param {string} input - Duration string
 * @returns {number|null} Milliseconds, or null if invalid
 */
function parseDuration(input) {
  if (!input || typeof input !== 'string') return null;

  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return null;

  const regex = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/;
  const match = cleaned.match(regex);

  if (!match) return null;
  if (!match[1] && !match[2] && !match[3]) return null;

  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);

  const ms = (days * 86400000) + (hours * 3600000) + (minutes * 60000);
  if (ms <= 0) return null;
  if (ms > 30 * 86400000) return null; // Max 30 days

  return ms;
}

/**
 * Format milliseconds into a human-readable string.
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '0m';
}

// ─────────────────────────────────────────────────────
//  GIVEAWAY EMBED BUILDER
// ─────────────────────────────────────────────────────

function buildGiveawayEmbed(giveaway, ended = false) {
  const participants = JSON.parse(giveaway.participants || '[]');
  const endTimestamp = Math.floor(giveaway.end_time / 1000);

  if (ended) {
    const winners = giveaway._winners; // Attached by caller
    const winnerText = winners && winners.length > 0
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'No valid participants';

    return new EmbedBuilder()
      .setTitle('Giveaway Ended')
      .setDescription(
        `**Prize:** ${giveaway.prize}\n` +
        `**Winner(s):** ${winnerText}\n` +
        `**Host:** <@${giveaway.host_id}>\n` +
        `**Entries:** ${participants.length}`
      )
      .setColor(0x3498DB)
      
      .setTimestamp();
  }

  if (giveaway.status === 'paused') {
    return new EmbedBuilder()
      .setTitle('Giveaway — PAUSED')
      .setDescription(
        `**Prize:** ${giveaway.prize}\n` +
        `**Host:** <@${giveaway.host_id}>\n` +
        `**Winners:** ${giveaway.winners_count}\n` +
        `**Remaining:** ${formatDuration(giveaway.paused_remaining)}\n` +
        `**Entries:** ${participants.length}\n\n` +
        `⏸️ *This giveaway is currently paused.*`
      )
      .setColor(0x3498DB)
      
      .setTimestamp();
  }

  return new EmbedBuilder()
    .setTitle('Giveaway')
    .setDescription(
      `**Prize:** ${giveaway.prize}\n` +
      `**Host:** <@${giveaway.host_id}>\n` +
      `**Winners:** ${giveaway.winners_count}\n` +
      `**Ends:** <t:${endTimestamp}:R>\n` +
      `**Entries:** ${participants.length}\n\n` +
      `Click the button below to enter!`
    )
    .setColor(0x3498DB)
    
    .setTimestamp();
}

function buildGiveawayButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_join')
      .setLabel('Join Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎉')
      .setDisabled(disabled)
  );
}

// ─────────────────────────────────────────────────────
//  WINNER PICKER
// ─────────────────────────────────────────────────────

/**
 * Pick random unique winners from participants.
 * @param {string[]} participants - Array of user IDs
 * @param {number} count - Number of winners to pick
 * @returns {string[]} Array of winner user IDs
 */
function pickWinners(participants, count) {
  if (!participants || participants.length === 0) return [];
  const pool = [...participants];
  const winners = [];
  const needed = Math.min(count, pool.length);

  for (let i = 0; i < needed; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }

  return winners;
}

// ─────────────────────────────────────────────────────
//  GIVEAWAY TIMER SYSTEM
// ─────────────────────────────────────────────────────

const activeTimers = new Map();

/**
 * Schedule an auto-end for a giveaway.
 */
function scheduleGiveaway(client, giveaway) {
  // Clear any existing timer
  clearGiveawayTimer(giveaway.giveaway_id);

  const remaining = giveaway.end_time - Date.now();
  if (remaining <= 0) {
    // Already expired — end immediately
    endGiveaway(client, giveaway.giveaway_id);
    return;
  }

  // Cap setTimeout at 2^31-1 ms (~24.8 days). For longer durations, re-schedule.
  const maxTimeout = 2147483647;
  const delay = Math.min(remaining, maxTimeout);

  const timer = setTimeout(async () => {
    if (remaining > maxTimeout) {
      // Re-fetch and re-schedule
      const db = await getDB();
      const g = await db.get('SELECT * FROM giveaways WHERE giveaway_id = ?', [giveaway.giveaway_id]);
      if (g && g.status === 'active') {
        scheduleGiveaway(client, g);
      }
    } else {
      await endGiveaway(client, giveaway.giveaway_id);
    }
  }, delay);

  activeTimers.set(giveaway.giveaway_id, timer);
}

function clearGiveawayTimer(giveawayId) {
  const existing = activeTimers.get(giveawayId);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(giveawayId);
  }
}

/**
 * End a giveaway — pick winners, update message, update DB.
 */
async function endGiveaway(client, giveawayId) {
  clearGiveawayTimer(giveawayId);

  const db = await getDB();
  const giveaway = await db.get('SELECT * FROM giveaways WHERE giveaway_id = ?', [giveawayId]);
  if (!giveaway || giveaway.status === 'ended') return null;

  const participants = JSON.parse(giveaway.participants || '[]');
  const winners = pickWinners(participants, giveaway.winners_count);

  // Update DB
  await db.run(
    'UPDATE giveaways SET status = ? WHERE giveaway_id = ?',
    ['ended', giveawayId]
  );

  // Update the message
  try {
    const guild = client.guilds.cache.get(giveaway.guild_id);
    if (!guild) return winners;

    const channel = guild.channels.cache.get(giveaway.channel_id);
    if (!channel) return winners;

    const message = await channel.messages.fetch(giveawayId).catch(() => null);
    if (message) {
      giveaway._winners = winners;
      await message.edit({
        embeds: [buildGiveawayEmbed(giveaway, true)],
        components: [buildGiveawayButtons(true)],
      });
    }

    // Announce winners
    const winnerText = winners.length > 0
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'No valid participants';

    await channel.send({
      content: winners.length > 0
        ? `🎉 **Congratulations** ${winnerText}! You won **${giveaway.prize}**!`
        : `😢 No one entered the giveaway for **${giveaway.prize}**.`,
    });
  } catch (err) {
    console.error('[Giveaway] Error ending giveaway:', err);
  }

  return winners;
}

/**
 * Resume all active giveaways on bot startup.
 */
async function resumeAllGiveaways(client) {
  const db = await getDB();
  const activeGiveaways = await db.all('SELECT * FROM giveaways WHERE status = ?', ['active']);

  let resumed = 0;
  for (const giveaway of activeGiveaways) {
    if (giveaway.end_time <= Date.now()) {
      // Expired while offline — end it
      await endGiveaway(client, giveaway.giveaway_id);
    } else {
      scheduleGiveaway(client, giveaway);
      resumed++;
    }
  }

  if (activeGiveaways.length > 0) {
    console.log(`🎉 Resumed ${resumed} active giveaway(s), ended ${activeGiveaways.length - resumed} expired giveaway(s).`);
  }
}

module.exports = {
  parseDuration,
  formatDuration,
  buildGiveawayEmbed,
  buildGiveawayButtons,
  pickWinners,
  scheduleGiveaway,
  clearGiveawayTimer,
  endGiveaway,
  resumeAllGiveaways,
};
