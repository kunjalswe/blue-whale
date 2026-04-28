const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const os = require('os');
const path = require('path');
const checkDiskSpace = require('check-disk-space').default;
const { getDB } = require('../../Database/database.js');
const cache = require('../../utils/cache.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Detailed health check and system performance metrics"),

  async execute(interaction, client) {
    try {
      if (!client.ws) return interaction.reply({ content: "❌ WebSocket not connected.", ephemeral: true });

      // 🏓 Latency Check
      const sent = await interaction.reply({ content: "🔍 Analyzing system health...", fetchReply: true });
      const messageLatency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.max(0, Math.round(client.ws.ping));

      // 💾 DB & Cache Check
      const dbStart = Date.now();
      const db = await getDB();
      await db.get('SELECT 1');
      const dbLatency = Date.now() - dbStart;

      const cacheSize = cache.cache.size;
      const inflightCount = cache.inflight.size;

      // 🧠 System Metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = (usedMem / totalMem) * 100;

      // 💾 Accurate Disk Check (based on bot drive)
      const botDrive = process.platform === "win32" ? path.resolve(__dirname).split(path.sep)[0] + path.sep : "/";
      const disk = await checkDiskSpace(botDrive);
      const diskPercent = ((disk.size - disk.free) / disk.size) * 100;

      // 🟢 Health Status Logic
      const getStatus = (val, mid, high) => val < mid ? "🟢 Healthy" : (val < high ? "🟡 Moderate" : "🔴 Critical");
      const apiStatus = getStatus(apiLatency, 100, 250);
      const dbStatus = getStatus(dbLatency, 15, 60);

      // 📊 Progress Bar Generator
      const createBar = (percent) => {
        const size = 10;
        const filled = Math.min(size, Math.round((size * percent) / 100));
        return "▰".repeat(filled) + "▱".repeat(size - filled);
      };

      // ⚙️ Bot Instance Memory
      const botMem = process.memoryUsage();

      const embed = new EmbedBuilder()
        .setTitle("🛡️ System Health & Performance")
        .setColor(dbLatency > 60 ? 0xE74C3C : 0x3498DB)
        .addFields(
          {
            name: "📡 Connection",
            value: `**API:** \`${apiLatency}ms\` (${apiStatus})\n**Msg:** \`${messageLatency}ms\``,
            inline: true
          },
          {
            name: "🗄️ Database",
            value: `**Lat:** \`${dbLatency}ms\` (${dbStatus})\n**Type:** \`SQLite3\``,
            inline: true
          },
          {
            name: "⚡ Optimization",
            value: `**Warm:** \`${cacheSize}\` Guilds\n**In-flight:** \`${inflightCount}\``,
            inline: true
          },
          {
            name: "🤖 Bot Instance",
            value: `**RSS:** \`${(botMem.rss / 1024 / 1024).toFixed(1)}MB\`\n**Heap:** \`${(botMem.heapUsed / 1024 / 1024).toFixed(1)}MB\``,
            inline: true
          },
          {
            name: "⏳ Uptime",
            value: `\`${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s\``,
            inline: true
          },
          {
            name: "📈 Host Load",
            value: `\`${os.loadavg().map(v => v.toFixed(2)).join(", ")}\``,
            inline: true
          },
          {
            name: `🧠 Host RAM (${(totalMem / 1024 / 1024 / 1024).toFixed(0)}GB Total)`,
            value: `\`${createBar(memPercent)}\` **${memPercent.toFixed(1)}%** Used`,
            inline: false
          },
          {
            name: `💾 Host Storage (${botDrive})`,
            value: `\`${createBar(diskPercent)}\` **${diskPercent.toFixed(1)}%** Used (\`${(disk.free / 1024 / 1024 / 1024).toFixed(1)}GB\` Free)`,
            inline: false
          }
        )
        .setFooter({ text: `Environment: ${process.platform} • Status: ${apiLatency < 200 ? "Stable" : "Degraded"}` })
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [embed] });

    } catch (error) {
      console.error("[PING ERROR]", error);
      await interaction.editReply({ content: "❌ Error fetching system health data.", embeds: [] });
    }
  },
};