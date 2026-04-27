const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship two users and get a compatibility percentage")
    .addUserOption(option => option.setName('user1').setDescription('First user').setRequired(true))
    .addUserOption(option => option.setName('user2').setDescription('Second user').setRequired(true)),
  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');

    if (user1.id === user2.id) {
      return interaction.reply("❌ You cannot ship a user with themselves!");
    }

    const percentage = Math.floor(Math.random() * 101);
    const loveBarLength = 10;
    const filledLength = Math.round((percentage / 100) * loveBarLength);
    const emptyLength = loveBarLength - filledLength;
    const loveBar = "❤️".repeat(filledLength) + "🖤".repeat(emptyLength);
    let color;
    if (percentage >= 70) color = 0x57F287;
    else if (percentage >= 40) color = 0xFEE75C;
    else color = 0xED4245;

    const embed = new EmbedBuilder()
      .setTitle("Shipping Calculator")
      .setDescription(`${user1} ❤️ ${user2}\nCompatibility: **${percentage}%**\n${loveBar}`)
      .setColor(color)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
