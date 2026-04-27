const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("Kiss a user")
    .addUserOption(option => option.setName('user').setDescription('The user to kiss').setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    
    if (user.id === interaction.user.id) {
      return interaction.reply("😳 You can’t kiss yourself.");
    }
    
    const embed = new EmbedBuilder()
      .setDescription(`💋 **${interaction.user.username} kissed ${user.username}!**`)
      .setImage("https://media.tenor.com/BZyWzw2d5tAAAAAM/hyakkano-100-girlfriends.gif")
      .setColor(0xFF69B4)
      .setFooter({ text: "Blue Whale" });
      
    await interaction.reply({ embeds: [embed] });
  }
};
