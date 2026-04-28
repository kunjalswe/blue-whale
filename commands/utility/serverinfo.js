const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Display detailed information about the server"),
  async execute(interaction) {
    const { guild } = interaction;

    const owner = await guild.fetchOwner();
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => r.name)
      .join(", ") || "None";

    const channels = {
      total: guild.channels.cache.size,
      text: guild.channels.cache.filter((ch) => ch.type === 0).size,
      voice: guild.channels.cache.filter((ch) => ch.type === 2).size,
      threads: guild.channels.cache.filter((ch) => ch.isThread()).size,
    };

    const emojis = {
      total: guild.emojis.cache.size,
      animated: guild.emojis.cache.filter((e) => e.animated).size,
      static: guild.emojis.cache.filter((e) => !e.animated).size,
    };

    const embed = new EmbedBuilder()
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "Owner", value: owner.user.tag, inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        { name: "Channels", value: `Text: ${channels.text} | Voice: ${channels.voice}`, inline: true },
        { name: "Boosts", value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount} Boosts)`, inline: true },
        { name: "Server ID", value: `\`${guild.id}\``, inline: true }
      )
      .setColor(0x3498DB)
      
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
