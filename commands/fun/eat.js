const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("eat")
    .setDescription("Eat a user playfully!")
    .addUserOption(option => option.setName('user').setDescription('The user to eat').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.reply("❌ You can't eat yourself!");
    }

    const embed = new EmbedBuilder()
      .setTitle("🍽️ Nom Nom!")
      .setDescription(`${interaction.user} took a big bite out of ${target}!`)
      .setImage("https://i.pinimg.com/originals/ca/eb/32/caeb32ef58807c7563460d96a3f7ecc9.gif")
      .setColor(0xED4245)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
