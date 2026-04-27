const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");

const gifURL = "https://cdn.pixabay.com/animation/2023/06/11/13/24/13-24-42-244_512.gif";
const colors = ["Red", "Blue", "Green", "Yellow", "Purple"];
const names = [
  "King", "Queen", "Prince", "Princess", "Dog", "Cat", "Elephant", "Tiger", "Lion", "Fox",
  "Bear", "Wolf", "Panda", "Dragon", "Knight", "Wizard", "Pirate", "Samurai", "Ninja", "Angel",
  "Demon", "Fairy", "Vampire", "Ghost", "Phoenix", "Unicorn", "Shark", "Whale", "Eagle", "Falcon",
  "Cheetah", "Leopard", "Otter", "Rabbit", "Squirrel", "Deer", "Moose", "Giraffe", "Monkey", "Raccoon",
  "Sloth", "Koala", "Penguin", "Turtle", "Dolphin", "Octopus", "Crab", "Horse", "Camel", "Frog",
  "Hawk", "Crow", "Parrot", "Peacock", "Owl", "Bat", "Elephant Queen", "King Cobra", "Lion King", "Doggo",
  "Kitty", "Bear King", "Tiger Queen", "Dragon Lord", "Wizard Master", "Pirate Captain", "Samurai Lord", "Ninja Master", "Angel Wings", "Demon Lord",
  "Fairy Princess", "Vampire King", "Ghost Spirit", "Phoenix Fire", "Unicorn Horn", "Shark Tooth", "Whale Song", "Eagle Eye", "Falcon Wing", "Cheetah Speed",
  "Leopard Spot", "Otter Float", "Rabbit Hop", "Squirrel Nut", "Deer Stag", "Moose Antler", "Giraffe Neck", "Monkey Banana", "Raccoon Mask", "Sloth Hang",
  "Koala Hug", "Penguin Slide", "Turtle Shell", "Dolphin Splash", "Octopus Tentacle", "Crab Claw", "Horse Gallop", "Camel Hump", "Frog Jump", "Hawk Talon"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("butterfly")
    .setDescription("Pick a color and get a random fun name!"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🦋 Butterfly Butterfly!")
      .setDescription("Which color do you like? Click one below:")
      .setImage(gifURL)
      .setColor(0x5865F2);

    const row = new ActionRowBuilder();
    colors.forEach((color, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`color_${i}`)
          .setLabel(color)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = msg.createMessageComponentCollector({
      max: 1,
      time: 60_000
    });

    collector.on("collect", async i => {
      if (!i.isButton()) return;
      if (i.user.id !== interaction.user.id) return i.reply({ content: "Not for you.", ephemeral: true });

      const index = parseInt(i.customId.split("_")[1]);
      const chosenColor = colors[index] || "Unknown";
      const randomName = names[Math.floor(Math.random() * names.length)];

      const replyEmbed = new EmbedBuilder()
        .setTitle("🦋 Your Random Name!")
        .setDescription(`${i.user}, your chosen color is **${chosenColor}**\nYou got the name: **${randomName}**!`)
        .setColor(0x57F287);

      await i.update({ embeds: [replyEmbed], components: [] });
    });

    collector.on("end", async collected => {
      if (collected.size === 0) {
        await interaction.editReply({ content: "⏳ Time's up! No color was selected.", embeds: [], components: [] });
      }
    });
  }
};