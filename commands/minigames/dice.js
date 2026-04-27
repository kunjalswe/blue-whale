const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll a dice and see if you win!")
    .addIntegerOption(option => option.setName('number').setDescription('Choose a number between 1 and 6').setRequired(true)),
  async execute(interaction) {
    const chosen = interaction.options.getInteger('number');
    if (chosen < 1 || chosen > 6) {
      return interaction.reply({ content: "❌ Number must be between 1 and 6.", ephemeral: true });
    }
    const rollingGif =
      "https://i.pinimg.com/originals/3a/34/6b/3a346b536b6a6f5de274bbbff7908ec0.gif";
    const diceImages = {
      1: "https://www.media4math.com/sites/default/files/library_asset/images/MathClipArt--Single-Die-with-1-Showing.png",
      2: "https://www.media4math.com/sites/default/files/library_asset/images/MathClipArt--Single-Die-with-2-Showing.png",
      3: "https://www.media4math.com/sites/default/files/library_asset/images/MathClipArt--Single-Die-with-3-Showing.png",
      4: "https://www.media4math.com/sites/default/files/library_asset/images/MathClipArt--Single-Die-with-4-Showing.png",
      5: "https://www.media4math.com/sites/default/files/library_asset/images/MathClipArt--Single-Die-with-5-Showing.png",
      6: "https://www.media4math.com/sites/default/files/library_asset/images/MathClipArt--Single-Die-with-6-Showing.png",
    };
    const rollingEmbed = new EmbedBuilder()
      .setTitle("🎲 Dice Roll")
      .setDescription(`${interaction.user} is rolling the dice...`)
      .setImage(rollingGif)
      .setColor(0x5865F2);
    const diceMessage = await interaction.reply({ embeds: [rollingEmbed], fetchReply: true });
    setTimeout(async () => {
      const result = Math.floor(Math.random() * 6) + 1;
      const win = result === chosen;
      const resultEmbed = new EmbedBuilder()
        .setTitle("🎲 Dice Roll Result")
        .setDescription(
          `${interaction.user} chose **${chosen}**\n🎯 The dice landed on **${result}**`
        )
        .setImage(diceImages[result])
        .setColor(win ? 0x57F287 : 0xED4245)
        .setFooter({ text: win ? "You won! 🎉" : "Better luck next time!" });
      await interaction.editReply({ embeds: [resultEmbed] });
    }, 2000);
  },
};
