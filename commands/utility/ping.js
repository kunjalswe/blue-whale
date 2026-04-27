const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const os = require('os');
const checkDiskSpace = require('check-disk-space').default;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency + system stats"),

  async execute(interaction, client) {
    try {
      if (!client.ws) {
        return interaction.reply({
          content: "Bot not fully connected yet!",
          ephemeral: true,
        });
      }

      // 🏓 Initial reply
      await interaction.reply({ content: "🏓 Pinging system..." });
      const tempMsg = await interaction.fetchReply();

      // ───── LATENCY ─────
      const messageLatency =
        tempMsg.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.max(0, Math.round(client.ws.ping));

      // ───── RAM (SYSTEM) ─────
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // ───── BOT MEMORY ─────
      const memory = process.memoryUsage();

      // ───── STORAGE (FIXED FOR WINDOWS) ─────
      const disk = await checkDiskSpace(
        process.platform === "win32" ? "C:\\" : "/"
      );

      // ───── LOAD ─────
      const load = os.loadavg();

      const embed = new EmbedBuilder()
        .setTitle("📊 Bot & VPS Status")
        .setColor(0x2B2D31)
        .addFields(
          {
            name: "🏓 Latency",
            value: `Message: \`${messageLatency}ms\`\nWebSocket: \`${apiLatency}ms\``,
            inline: false,
          },
          {
            name: "🧠 RAM (System)",
            value: `Used: \`${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB\`\nFree: \`${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB\``,
            inline: true,
          },
          {
            name: "💾 Storage",
            value: `Used: \`${((disk.size - disk.free) / 1024 / 1024 / 1024).toFixed(2)} GB\`\nFree: \`${(disk.free / 1024 / 1024 / 1024).toFixed(2)} GB\``,
            inline: true,
          },
          {
            name: "⚙️ Bot Process",
            value: `Heap Used: \`${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB\`\nUptime: \`${Math.floor(process.uptime())}s\``,
            inline: false,
          },
          {
            name: "📈 Load Average",
            value: load.map(v => v.toFixed(2)).join(", "),
            inline: false,
          }
        )
        .setFooter({ text: "Modern • Blur Aesthetic System Panel" })
        .setTimestamp();

      await interaction.editReply({
        content: null,
        embeds: [embed],
      });

    } catch (error) {
      console.error(error);

      const msg = "Something went wrong while fetching system stats!";

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};