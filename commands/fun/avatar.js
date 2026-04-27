const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get a user's avatar")
    .addUserOption(option => option.setName('user').setDescription('The user to get the avatar of').setRequired(false)),
  async execute(interaction, client) {
    try {
      const user = interaction.options.getUser('user') || interaction.user;
      
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${user.username}'s Avatar`,
          iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
        .setColor(0x2f3136)
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Unable to fetch avatar.", ephemeral: true });
    }
  }
};