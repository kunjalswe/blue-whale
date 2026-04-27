const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("arrest")
    .setDescription("Arrest a user with a fun GIF")
    .addUserOption(option => option.setName('user').setDescription('The user to arrest').setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const embed = new EmbedBuilder()
      .setTitle("🚨 Arrest!")
      .setDescription(`${user} has been arrested!`)
      .setImage("https://gifdb.com/images/high/prison-handcuffs-arrested-n0qeu7kjy95k8gst.gif")
      .setColor(0xED4245)
      .setTimestamp()
      .setFooter({ text: `Arrested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
    await interaction.reply({ embeds: [embed] });
  },
};
