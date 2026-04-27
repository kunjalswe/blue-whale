const { EmbedBuilder } = require('discord.js');
const { getDB } = require('../Database/database.js');

async function sendModLog(guild, embed) {
  try {
    const db = await getDB();
    const server = await db.get('SELECT * FROM modlogs WHERE guildId = ?', [guild.id]);
    
    if (!server) return; // No modlogs channel set

    const channel = guild.channels.cache.get(server.channelId);
    if (!channel) return; // Channel was deleted but still in DB

    // Set a uniform timestamp on the log embed if not already set
    if (!embed.data.timestamp) embed.setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending modlog:', error);
  }
}

module.exports = { sendModLog };
