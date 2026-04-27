const { SlashCommandBuilder } = require('discord.js');
const fetch = require("node-fetch");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Roast a user using an API")
    .addUserOption(option => option.setName('user').setDescription('The user to roast').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    try {
      const res = await fetch("https://evilinsult.com/generate_insult.php?lang=en&type=json");
      const data = await res.json();
      let roast = data.insult || "You exist. That's the roast.";
      roast = roast.replace(/fuck|shit|bitch/gi, "****");
      await interaction.reply(`**${target.username}**, ${roast}`);
    } catch (error) {
      console.error("Roast error:", error);
      await interaction.reply("❌ Roast API is not responding.");
    }
  }
};