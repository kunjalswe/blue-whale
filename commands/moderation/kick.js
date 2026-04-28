const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for kicking').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || "No reason provided";

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: "❌ You don't have permission to kick members.", ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: "❌ I cannot kick this user. They might have a higher role than me.", ephemeral: true });
    }

    try {
      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setTitle("User Kicked")
        .setColor(0x3498DB)
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Reason", value: reason, inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendModLog(interaction.guild, embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "❌ Failed to kick the user.", ephemeral: true });
    }
  }
};
