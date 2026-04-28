require("dotenv").config();
const { Client, GatewayIntentBits, Collection, ActivityType, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();
const commandsArray = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  if (!fs.statSync(commandsPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      if (!command.category) command.category = folder.toLowerCase();
      client.commands.set(command.data.name, command);
      commandsArray.push(command.data.toJSON());
      console.log(`✅ Loaded command: /${command.data.name} (from ${folder})`);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

let statusInterval;
function updateStatus(client) {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(`/help • ${serverCount} servers`, { type: ActivityType.Watching });
}

client.on("ready", async () => {
  updateStatus(client);
  console.log(`Logged in as ${client.user.tag}`);

  // Refresh status every 15 minutes to keep it visible
  if (!statusInterval) {
    statusInterval = setInterval(() => updateStatus(client), 15 * 60 * 1000);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`Started refreshing ${commandsArray.length} application (/) commands.`);
    const data = await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsArray },
    );
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const cooldownAmount = 3500;
  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(command.data.name);
  const cooldownExpiration = timestamps.get(interaction.user.id) || 0;

  if (now < cooldownExpiration) {
    const timeLeft = ((cooldownExpiration - now) / 1000).toFixed(1);
    return interaction.reply({ content: `⏱ Please wait ${timeLeft}s before using \`${command.data.name}\` again.`, ephemeral: true });
  }

  timestamps.set(interaction.user.id, now + cooldownAmount);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.on("guildCreate", () => updateStatus(client));
client.on("guildDelete", () => updateStatus(client));

const count = require("./commands/minigames/count.js");
if (count.init) count.init(client);

const welcome = require("./commands/utility/welcome.js");
if (welcome.init) welcome.init(client);

const mediaonly = require("./commands/automod/mediaonly.js");
if (mediaonly.init) mediaonly.init(client);



const antilink = require("./commands/automod/antilink.js");
if (antilink.init) antilink.init(client);

const ticket = require("./commands/ticket/ticket.js");
if (ticket.init) ticket.init(client);

const giveaway = require("./commands/giveaway/giveaway.js");
if (giveaway.init) giveaway.init(client);



const autorole = require("./commands/automod/autorole.js");
if (autorole.init) autorole.init(client);

const { getDB } = require("./Database/database.js");
getDB().then(() => console.log("Connected to SQLite Database!")).catch(console.error);

// ───── GRACEFUL SHUTDOWN ─────
const shutdown = async (signal) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing bot safely...`);
  
  if (statusInterval) clearInterval(statusInterval);
  
  try {
    const db = await getDB();
    await db.close();
    console.log("✅ Database connection closed.");
  } catch (err) {
    console.warn("⚠️ Warning: Database was already closed or couldn't be closed.");
  }

  client.destroy();
  console.log("👋 Bot logged out. Goodbye!");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(process.env.DISCORD_TOKEN);