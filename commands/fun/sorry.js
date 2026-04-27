const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorry")
    .setDescription("Apologize to someone with a cute GIF")
    .addUserOption(option => option.setName('user').setDescription('The user to apologize to').setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const embed = new EmbedBuilder()
      .setTitle("🙏 Apology")
      .setDescription(`${interaction.user} says sorry to ${user}`)
      .setImage("https://media.tenor.com/EwXUn5eMTswAAAAM/i%27m-sorry-meow-forgive-me-cats.gif")
      .setColor(0xFFB6C1)
      .setTimestamp()
      .setFooter({ text: `Sent by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
    await interaction.reply({ embeds: [embed] });
  },
};
