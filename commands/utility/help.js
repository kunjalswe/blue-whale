const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ComponentType,
} = require("discord.js");

// Map folder names to emojis for the help menu
const categoryEmojis = {
  utility: "⚙️",
  minigames: "🎮",
  fun: "🎉",
  moderation: "🛡️",
  automod: "🤖",
  ticket: "🎫",
  giveaway: "🎊",
};

// Map folder names to display names
const categoryNames = {
  utility: "Utility",
  minigames: "Minigames",
  fun: "Fun",
  moderation: "Moderation",
  automod: "Automod",
  ticket: "Ticket",
  giveaway: "Giveaway",
};

const THEME_COLOR = 0x3498DB; // Blue Theme
const SUPPORT_LINK = "https://discord.gg/PPEEZAUUWT";
const INVITE_LINK = "https://discord.com/oauth2/authorize?client_id=1493187478792962108&permissions=8&integration_type=0&scope=applications.commands+bot";

async function sendGeneralHelp(interaction, client) {
  const categories = {};
  client.commands.forEach((command) => {
    const category = command.category || "others";
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(`\`/${command.data.name}\``);
  });

  const mainEmbed = new EmbedBuilder()
    .setColor(THEME_COLOR)
    .setTitle("Help Menu")
    .setDescription("Select a category from the dropdown below to view available commands.\nUse `/help <command>` for detailed info about a specific command.")
    .setThumbnail(client.user.displayAvatarURL())
    

  const sortedCategories = Object.keys(categories).sort((a, b) => {
    const order = ["utility", "moderation", "automod", "ticket", "giveaway", "fun", "minigames"];
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId("help-menu")
    .setPlaceholder("Select a category")
    .addOptions(
      sortedCategories.map((cat) => ({
        label: `${categoryNames[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: cat,
        emoji: categoryEmojis[cat] || "📂",
        description: `View all ${cat} commands`,
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("Support Server").setStyle(ButtonStyle.Link).setURL(SUPPORT_LINK),
    new ButtonBuilder().setLabel("Invite Bot").setStyle(ButtonStyle.Link).setURL(INVITE_LINK)
  );

  const msg = await interaction.reply({
    embeds: [mainEmbed],
    components: [row, buttonRow],
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: "❌ This menu is not for you.", ephemeral: true });
    }

    const selected = i.values[0];
    const cmds = categories[selected];
    const emoji = categoryEmojis[selected] || "📂";
    const name = categoryNames[selected] || selected.charAt(0).toUpperCase() + selected.slice(1);

    const embed = new EmbedBuilder()
      .setColor(THEME_COLOR)
      .setTitle(`${emoji} ${name} Commands`)
      .setDescription(cmds.join(", "))
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "Use /help <command> for more info" });

    await i.update({ embeds: [embed], components: [row, buttonRow] });
  });

  collector.on("end", async () => {
    await interaction.editReply({ components: [buttonRow] }).catch(() => {});
  });
}

async function sendDetailedHelp(interaction, client, commandName) {
  const command = client.commands.get(commandName.toLowerCase());

  if (!command) {
    return interaction.reply({ content: `❌ Command \`${commandName}\` not found.`, ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(THEME_COLOR)
    .setTitle(`Command: /${command.data.name}`)
    .setDescription(command.data.description || "No description available.")
    .addFields({ name: "Category", value: categoryNames[command.category] || command.category || "General", inline: true });

  // Permissions
  if (command.data.default_member_permissions) {
    const permBit = BigInt(command.data.default_member_permissions);
    const { PermissionsBitField } = require("discord.js");
    const perms = new PermissionsBitField(permBit).toArray();
    if (perms.length > 0) {
      embed.addFields({ name: "Permissions", value: perms.map(p => `\`${p}\``).join(", "), inline: true });
    }
  }

  // Subcommands
  const subcommands = command.data.options.filter(opt => opt.type === 1 || opt.type === 2);
  if (subcommands.length > 0) {
    const subList = subcommands.map(s => `**${s.name}**: ${s.description}`).join("\n");
    embed.addFields({ name: "Subcommands", value: subList });
  }

  // Usage
  let usage = `/${command.data.name}`;
  if (subcommands.length > 0) {
    usage += ` <subcommand> [options]`;
  } else {
    const options = command.data.options.filter(opt => opt.type !== 1 && opt.type !== 2);
    if (options.length > 0) {
      usage += " " + options.map(o => o.required ? `<${o.name}>` : `[${o.name}]`).join(" ");
    }
  }
  embed.addFields({ name: "Usage", value: `\`${usage}\`` });

  await interaction.reply({ embeds: [embed] });
}

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows the help menu or detailed info about a command")
    .addStringOption(o => o.setName("command").setDescription("Specific command to get info about").setRequired(false)),
  async execute(interaction, client) {
    const cmdName = interaction.options.getString("command");
    if (cmdName) {
      await sendDetailedHelp(interaction, client, cmdName);
    } else {
      await sendGeneralHelp(interaction, client);
    }
  },
};