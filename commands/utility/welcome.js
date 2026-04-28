const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { getDB } = require("../../Database/database.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Manage the welcome channel")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("set")
        .setDescription("Set the welcome channel")
        .addChannelOption(option => option.setName('channel').setDescription('The channel for welcome messages').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove the welcome channel")
    ),
  async execute(interaction) {
    const db = await getDB();
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === "remove") {
      const server = await db.get('SELECT * FROM welcome WHERE guildId = ?', [guildId]);
      if (!server) return interaction.reply({ content: "❌ No welcome channel is set.", ephemeral: true });
      
      await db.run('DELETE FROM welcome WHERE guildId = ?', [guildId]);
      return interaction.reply("✅ Welcome channel removed.");
    }
    
    if (subcommand === "set") {
      const server = await db.get('SELECT * FROM welcome WHERE guildId = ?', [guildId]);
      if (server) {
        return interaction.reply({ content: "❌ This server already has a welcome channel. Remove it first.", ephemeral: true });
      }
      const channel = interaction.options.getChannel('channel');
      
      await db.run('INSERT INTO welcome (guildId, channelId) VALUES (?, ?)', [guildId, channel.id]);
      await interaction.reply(`✅ Welcome channel set to ${channel}`);
    }
  },
  init: (client) => {
    client.on("guildMemberAdd", async (member) => {
      const db = await getDB().catch(() => null);
      if (!db) return;
      
      const server = await db.get('SELECT * FROM welcome WHERE guildId = ?', [member.guild.id]);
      if (!server) return;
      
      const channel = member.guild.channels.cache.get(server.channelId);
      if (!channel) return;
      
      const embed = new EmbedBuilder()
        .setTitle(`Welcome ${member.user.displayName}!`)
        .setDescription(`Welcome to **${member.guild.name}**! Enjoy your stay.`)
        .setImage("https://i.pinimg.com/originals/8b/35/72/8b357283fd26e3bb18cc1983c0ebdb9c.gif")
        .setColor(0x3498DB)
        
        .setTimestamp();
        
      channel.send({ embeds: [embed] }).catch(()=>{});
    });
  }
};