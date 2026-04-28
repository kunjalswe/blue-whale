const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Display detailed information about a user")
    .addUserOption(option => option.setName('user').setDescription('The user to get information about').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const joinedDate = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "N/A";
    const createdDate = `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`;

    const roles = member
      ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.name).join(", ")
      : "N/A";

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Joined Server", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "N/A", inline: true },
        { name: "User ID", value: `\`${user.id}\``, inline: true }
      )
      .setColor(0x3498DB)
      
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
