const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");

const { getDB } = require("../../Database/database.js");
const cache = require("../../utils/cache.js");

module.exports = {
  category: "automod",
  data: new SlashCommandBuilder()
    .setName("antilink")
    .setDescription("Manage anti-link system")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageGuild
    )

    .addSubcommand((sub) =>
      sub.setName("enable").setDescription("Enable anti-link")
    )

    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Disable anti-link")
    )

    .addSubcommandGroup((group) =>
      group
        .setName("whitelist")
        .setDescription("Manage whitelist")

        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add user/role")
            .addMentionableOption((opt) =>
              opt
                .setName("target")
                .setDescription("User or role")
                .setRequired(true)
            )
        )

        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove user/role")
            .addMentionableOption((opt) =>
              opt
                .setName("target")
                .setDescription("User or role")
                .setRequired(true)
            )
        )

        .addSubcommand((sub) =>
          sub.setName("list").setDescription("Show whitelist")
        )
    )

    .addSubcommandGroup((group) =>
      group
        .setName("settings")
        .setDescription("Settings")

        .addSubcommand((sub) =>
          sub
            .setName("adminbypass")
            .setDescription("Toggle admin bypass")
            .addBooleanOption((opt) =>
              opt
                .setName("on")
                .setDescription("Enable or disable admin bypass")
                .setRequired(true)
            )
        )
    ),

  async execute(interaction) {
    const db = await getDB();
    const guildId = interaction.guild.id;

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // ---------------- ENABLE / DISABLE ----------------
    if (!group) {
      if (sub === "enable") {
        await db.run(
          `INSERT INTO antilink_config (guildId, enabled, adminBypass)
           VALUES (?, 1, 1)
           ON CONFLICT(guildId) DO UPDATE SET enabled = 1`,
          [guildId]
        );

        // Update cache after successful DB write
        const currentConfig = await db.get(`SELECT * FROM antilink_config WHERE guildId = ?`, [guildId]);
        cache.set(`antilink_config:${guildId}`, currentConfig);

        return interaction.reply({
          content: "✅ Anti-link enabled",
          ephemeral: true,
        });
      }

      if (sub === "disable") {
        await db.run(
          `INSERT INTO antilink_config (guildId, enabled, adminBypass)
           VALUES (?, 0, 1)
           ON CONFLICT(guildId) DO UPDATE SET enabled = 0`,
          [guildId]
        );

        // Update cache after successful DB write
        const currentConfig = await db.get(`SELECT * FROM antilink_config WHERE guildId = ?`, [guildId]);
        cache.set(`antilink_config:${guildId}`, currentConfig);

        return interaction.reply({
          content: "❌ Anti-link disabled",
          ephemeral: true,
        });
      }
    }

    // ---------------- WHITELIST ----------------
    if (group === "whitelist") {
      const target = interaction.options.getMentionable("target");

      const isRole = !!target.name;
      const type = isRole ? "role" : "user";

      if (sub === "add") {
        try {
          await db.run(
            `INSERT INTO antilink_whitelist (guildId, targetId, type)
             VALUES (?, ?, ?)`,
            [guildId, target.id, type]
          );

          // Update cache
          const currentWhitelist = await db.all(`SELECT * FROM antilink_whitelist WHERE guildId = ?`, [guildId]);
          cache.set(`antilink_whitelist:${guildId}`, currentWhitelist);

          return interaction.reply({
            content: `✅ Added ${target}`,
            ephemeral: true,
          });
        } catch {
          return interaction.reply({
            content: "❌ Already exists",
            ephemeral: true,
          });
        }
      }

      if (sub === "remove") {
        await db.run(
          `DELETE FROM antilink_whitelist
           WHERE guildId = ? AND targetId = ?`,
          [guildId, target.id]
        );

        // Update cache
        const currentWhitelist = await db.all(`SELECT * FROM antilink_whitelist WHERE guildId = ?`, [guildId]);
        cache.set(`antilink_whitelist:${guildId}`, currentWhitelist);

        return interaction.reply({
          content: `🗑️ Removed ${target}`,
          ephemeral: true,
        });
      }

      if (sub === "list") {
        const rows = await db.all(
          `SELECT * FROM antilink_whitelist WHERE guildId = ?`,
          [guildId]
        );

        if (!rows.length) {
          return interaction.reply({
            content: "Whitelist empty",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("Anti-Link Whitelist")
          .setColor(0x3498DB)
          .setDescription(
            rows
              .map((r) =>
                r.type === "user"
                  ? `<@${r.targetId}>`
                  : `<@&${r.targetId}>`
              )
              .join("\n")
          )
          

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
    }

    // ---------------- SETTINGS ----------------
    if (group === "settings") {
      if (sub === "adminbypass") {
        const value = interaction.options.getBoolean("on");

        await db.run(
          `INSERT INTO antilink_config (guildId, enabled, adminBypass)
           VALUES (?, 0, ?)
           ON CONFLICT(guildId) DO UPDATE SET adminBypass = ?`,
          [guildId, value ? 1 : 0, value ? 1 : 0]
        );

        // Update cache
        const currentConfig = await db.get(`SELECT * FROM antilink_config WHERE guildId = ?`, [guildId]);
        cache.set(`antilink_config:${guildId}`, currentConfig);

        return interaction.reply({
          content: `Admin bypass: ${value ? "ON" : "OFF"}`,
          ephemeral: true,
        });
      }
    }
  },

  // ---------------- MESSAGE HANDLER ----------------
  init(client) {
    client.on("messageCreate", async (message) => {
      if (!message.guild || message.author.bot) return;

      const content = message.content.toLowerCase();
      const guildId = message.guild.id;

      // 🚨 STEP 1: Blacklisted words (CACHED)
      const blacklistedWords = await cache.getOrSet(`blacklist:${guildId}`, async () => {
        const db = await getDB();
        return await db.all('SELECT word FROM automod_blacklist WHERE guild_id = ?', [guildId]);
      }) || [];

      if (blacklistedWords.length > 0) {
        const foundWord = blacklistedWords.find(b =>
          content.includes(b.word.toLowerCase())
        );

        if (foundWord) {
          // Check config (CACHED)
          const config = await cache.getOrSet(`antilink_config:${guildId}`, async () => {
            const db = await getDB();
            return await db.get(`SELECT * FROM antilink_config WHERE guildId = ?`, [guildId]);
          });

          const isAdmin =
            message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

          if (!isAdmin) {
            await message.delete().catch(() => { });

            const warnEmbed = new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle("🚫 Message Blocked")
              .setDescription(
                `${message.author}, your message contained a blacklisted word (\`${foundWord.word}\`).`
              );

            const warnMsg = await message.channel.send({
              content: `${message.author}`,
              embeds: [warnEmbed],
            });

            setTimeout(() => warnMsg.delete().catch(() => { }), 7000);
            return;
          }
        }
      }

      // 🚫 STEP 2: Detect ALL links (including Discord invites)
      const hasLink = /(https?:\/\/|www\.)[^\s]+/i.test(content);
      if (!hasLink) return;

      // config check (CACHED)
      const config = await cache.getOrSet(`antilink_config:${guildId}`, async () => {
        const db = await getDB();
        return await db.get(`SELECT * FROM antilink_config WHERE guildId = ?`, [guildId]);
      });

      if (!config || config.enabled === 0) return;

      // whitelist check (CACHED)
      const whitelist = await cache.getOrSet(`antilink_whitelist:${guildId}`, async () => {
        const db = await getDB();
        return await db.all(`SELECT * FROM antilink_whitelist WHERE guildId = ?`, [guildId]);
      }) || [];

      const isWhitelisted = whitelist.some((w) => {
        if (w.type === "user") return w.targetId === message.author.id;
        if (w.type === "role") return message.member.roles.cache.has(w.targetId);
      });

      if (isWhitelisted) return;

      // admin bypass
      if (config.adminBypass === 1) {
        if (
          message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
          message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
        ) {
          return;
        }
      }

      // 🚫 DELETE EVERYTHING (links + invites)
      await message.delete().catch(() => { });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🚫 Links Blocked")
        .setDescription(
          `${message.author}, links are not allowed in this server.`
        );

      const warn = await message.channel.send({
        content: `${message.author}`,
        embeds: [embed],
      });

      setTimeout(() => warn.delete().catch(() => { }), 7000);
    });
  },
};