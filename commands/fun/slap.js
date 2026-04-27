const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("slap")
    .setDescription("Slap a user")
    .addUserOption(option => option.setName('user').setDescription('The user to slap').setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    if (user.id === interaction.user.id) {
      return interaction.reply("🤨 You can’t slap yourself.");
    }
    const embed = new EmbedBuilder()
      .setDescription(`👋 **${interaction.user.username} slapped ${user.username}!**`)
      .setImage(
        "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyZWc4Z3h6MHh4bnFsZnkyaGw1czlrdjZ6bng1ZHFxczU0b3kwbmlsZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Gf3AUz3eBNbTW/giphy.gif"
      )
      .setColor(0xED4245)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};