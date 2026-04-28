const { WebhookClient, EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { getDB } = require("../../Database/database.js");
const cache = require("../../utils/cache.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("count")
    .setDescription("Manage the counting game")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("set")
        .setDescription("Set the counting channel")
        .addChannelOption(option => option.setName('channel').setDescription('The channel for counting').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove the counting channel")
    ),
  async execute(interaction) {
    const db = await getDB();
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === "remove") {
      const server = await db.get('SELECT * FROM count WHERE guildId = ?', [guildId]);
      if (!server) return interaction.reply({ content: "❌ No counting channel is set.", ephemeral: true });
      
      await db.run('DELETE FROM count WHERE guildId = ?', [guildId]);
      // Update cache
      cache.delete(`count:${guildId}`);
      return interaction.reply("✅ Counting channel removed.");
    }
    
    if (subcommand === "set") {
      const channel = interaction.options.getChannel('channel');
      const server = await db.get('SELECT * FROM count WHERE guildId = ?', [guildId]);
      
      if (server) return interaction.reply({ content: "❌ Counting is already enabled in this server.", ephemeral: true });
      
      await db.run(
        'INSERT INTO count (guildId, channelId, messageCount, webhookId, webhookToken) VALUES (?, ?, ?, ?, ?)',
        [guildId, channel.id, 0, null, null]
      );
      
      // Update cache
      const serverData = await db.get('SELECT * FROM count WHERE guildId = ?', [guildId]);
      cache.set(`count:${guildId}`, serverData);
      
      const embed = new EmbedBuilder()
        .setTitle("🔢 Counting Enabled")
        .setDescription(`Counting will start from **1** in ${channel}`)
        .setColor(0x57F287);
      await interaction.reply({ embeds: [embed] });
    }
  },
  init: (client) => {
    client.on("messageCreate", async (message) => {
      if (!message.guild || message.author.bot) return;
      
      const guildId = message.guild.id;

      // Check if guild has counting enabled (CACHED)
      const server = await cache.getOrSet(`count:${guildId}`, async () => {
        const db = await getDB();
        return await db.get('SELECT * FROM count WHERE guildId = ?', [guildId]);
      });

      if (!server) return;
      if (message.channel.id !== server.channelId) return;
      
      const content = message.content.trim();
      const number = Number(content);
      if (isNaN(number)) return message.delete().catch(() => {});
      if (number !== server.messageCount + 1) return message.delete().catch(() => {});
      
      // Update DB
      const db = await getDB();
      await db.run('UPDATE count SET messageCount = ? WHERE guildId = ?', [number, guildId]);
      
      // Update Cache immediately
      server.messageCount = number;
      cache.set(`count:${guildId}`, server);

      try {
        const channel = message.channel;
        let webhook;
        if (server.webhookId && server.webhookToken) {
          webhook = new WebhookClient({ id: server.webhookId, token: server.webhookToken });
        } else {
          const webhooks = await channel.fetchWebhooks();
          webhook = webhooks.find(w => w.name === "CountWebhook");
          if (!webhook) {
            webhook = await channel.createWebhook({ name: "CountWebhook" });
          }
          await db.run(
            'UPDATE count SET webhookId = ?, webhookToken = ? WHERE guildId = ?',
            [webhook.id, webhook.token, guildId]
          );
          // Update cache with webhook info
          server.webhookId = webhook.id;
          server.webhookToken = webhook.token;
          cache.set(`count:${guildId}`, server);
        }
        await message.delete().catch(() => {});
        const displayName = message.member ? message.member.displayName : message.author.username;
        await webhook.send({
          content: `**${number}**`,
          username: displayName,
          avatarURL: message.author.displayAvatarURL({ dynamic: true })
        });
      } catch (err) {
        console.error("Count webhook error:", err);
      }
    });
  }
};
