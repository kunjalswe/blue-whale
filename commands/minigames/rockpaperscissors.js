const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("rockpaperscissors")
    .setDescription("Play Rock Paper Scissors with the bot or another user")
    .addUserOption(option => option.setName('opponent').setDescription('User to challenge (leave blank to play against bot)').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('opponent');
    if (!user) {
      await playWithBot(interaction);
    } else {
      if (user.id === interaction.user.id) {
        return interaction.reply({ content: "❌ You cannot play against yourself!", ephemeral: true });
      }
      await playWithUser(interaction, user);
    }
  },
};
async function playWithBot(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("✊✋✌️ Rock Paper Scissors")
    .setDescription("Choose your move:")
    .setColor(0x5865F2);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("rock").setLabel("✊").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("paper").setLabel("✋").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("scissors").setLabel("✌️").setStyle(ButtonStyle.Danger)
  );
  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const collector = msg.createMessageComponentCollector({ time: 15000 });
  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: "This is not your game!", ephemeral: true });
    }
    const userChoice = i.customId;
    const choices = ["rock", "paper", "scissors"];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result, color;
    if (userChoice === botChoice) {
      result = "It's a tie!";
      color = 0xFEE75C;
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) {
      result = "You win! 🎉";
      color = 0x57F287;
    } else {
      result = "You lose! 😢";
      color = 0xED4245;
    }
    const resultEmbed = new EmbedBuilder()
      .setTitle("✊✋✌️ Rock Paper Scissors Result")
      .setDescription(
        `You chose: **${userChoice}**\nBot chose: **${botChoice}**\n\n**${result}**`
      )
      .setColor(color)
      .setTimestamp();
    await i.update({ embeds: [resultEmbed], components: [] });
    collector.stop();
  });
  collector.on("end", (collected) => {
    if (!collected.size) interaction.editReply({ content: "⏰ Time's up!", components: [] }).catch(()=>{});
  });
}
async function playWithUser(interaction, opponent) {
  const embed = new EmbedBuilder()
    .setTitle("✊✋✌️ Rock Paper Scissors Challenge")
    .setDescription(`${opponent}, ${interaction.user} challenged you! Click your move below:`)
    .setColor(0x5865F2);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("rock").setLabel("✊").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("paper").setLabel("✋").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("scissors").setLabel("✌️").setStyle(ButtonStyle.Danger)
  );
  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const choices = {};
  const collector = msg.createMessageComponentCollector({ time: 20000 });
  collector.on("collect", async (i) => {
    if (![interaction.user.id, opponent.id].includes(i.user.id)) {
      return i.reply({ content: "You are not part of this game!", ephemeral: true });
    }
    choices[i.user.id] = i.customId;
    await i.reply({ content: `You chose: **${i.customId}**`, ephemeral: true });
    if (choices[interaction.user.id] && choices[opponent.id]) {
      const userChoice = choices[interaction.user.id];
      const oppChoice = choices[opponent.id];
      let result, color;
      if (userChoice === oppChoice) {
        result = "It's a tie!";
        color = 0xFEE75C;
      } else if (
        (userChoice === "rock" && oppChoice === "scissors") ||
        (userChoice === "paper" && oppChoice === "rock") ||
        (userChoice === "scissors" && oppChoice === "paper")
      ) {
        result = `${interaction.user} wins! 🎉`;
        color = 0x57F287;
      } else {
        result = `${opponent} wins! 🎉`;
        color = 0xED4245;
      }
      const resultEmbed = new EmbedBuilder()
        .setTitle("✊✋✌️ Rock Paper Scissors Result")
        .setDescription(
          `${interaction.user} chose: **${userChoice}**\n${opponent} chose: **${oppChoice}**\n\n**${result}**`
        )
        .setColor(color)
        .setTimestamp();
      await interaction.editReply({ embeds: [resultEmbed], components: [] });
      collector.stop();
    }
  });
  collector.on("end", () => {
    if (!choices[interaction.user.id] || !choices[opponent.id]) {
      interaction.editReply({ content: "⏰ Time's up! Game canceled.", components: [] }).catch(()=>{});
    }
  });
}
