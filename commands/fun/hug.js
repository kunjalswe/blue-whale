const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Give a user a warm hug")
    .addUserOption(option => option.setName('user').setDescription('The user to hug').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    
    if (target.id === interaction.user.id) {
      return interaction.reply("🫂 Self-hug detected. That’s wholesome.");
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFC0CB)
      .setDescription(`🤗 **${interaction.user} hugged ${target}!**`)
      .setImage("https://c.tenor.com/J7eGDvGeP9IAAAAC/tenor.gif")
      .setFooter({ text: "A warm hug 💖" })
      .setTimestamp();
      
    await interaction.reply({ embeds: [embed] });
  }
};
