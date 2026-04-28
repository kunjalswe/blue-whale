const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link'),
  async execute(interaction) {
    const inviteLink = "https://discord.com/oauth2/authorize?client_id=1493187478792962108&permissions=8&integration_type=0&scope=applications.commands+bot";
    const supportLink = "https://discord.gg/gkvUgWhRa9";

    const embed = new EmbedBuilder()
      .setTitle('Invite Bot')
      .setDescription('Click the buttons below to invite the bot or join our support server.')
      .setColor(0x3498DB)
      

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setURL(inviteLink)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Support Server')
        .setURL(supportLink)
        .setStyle(ButtonStyle.Link)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};