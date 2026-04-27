const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");

async function initDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    -- =====================
    -- WARNINGS
    -- =====================
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      moderatorId TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================
    -- MODLOGS
    -- =====================
    CREATE TABLE IF NOT EXISTS modlogs (
      guildId TEXT PRIMARY KEY,
      channelId TEXT NOT NULL
    );

    -- =====================
    -- COUNT SYSTEM
    -- =====================
    CREATE TABLE IF NOT EXISTS count (
      guildId TEXT PRIMARY KEY,
      channelId TEXT NOT NULL,
      messageCount INTEGER DEFAULT 0,
      webhookId TEXT,
      webhookToken TEXT
    );

    -- =====================
    -- WELCOME
    -- =====================
    CREATE TABLE IF NOT EXISTS welcome (
      guildId TEXT PRIMARY KEY,
      channelId TEXT NOT NULL
    );

    -- =====================
    -- MEDIA ONLY
    -- =====================
    CREATE TABLE IF NOT EXISTS mediaonly (
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      PRIMARY KEY (guildId, channelId)
    );

    -- =====================
    -- ANTIINVITE CONFIG
    -- =====================
    CREATE TABLE IF NOT EXISTS antiinvite_config (
      guildId TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      adminBypass INTEGER DEFAULT 1
    );

    -- =====================
    -- ANTIINVITE WHITELIST
    -- =====================
    CREATE TABLE IF NOT EXISTS antiinvite_whitelist (
      guildId TEXT NOT NULL,
      targetId TEXT NOT NULL,
      type TEXT NOT NULL,
      PRIMARY KEY (guildId, targetId)
    );

    -- =====================
    -- ANTILINK CONFIG
    -- =====================
    CREATE TABLE IF NOT EXISTS antilink_config (
      guildId TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      adminBypass INTEGER DEFAULT 1
    );

    -- =====================
    -- ANTILINK WHITELIST
    -- =====================
    CREATE TABLE IF NOT EXISTS antilink_whitelist (
      guildId TEXT NOT NULL,
      targetId TEXT NOT NULL,
      type TEXT NOT NULL,
      PRIMARY KEY (guildId, targetId)
    );

    -- =====================
    -- TICKET CONFIG
    -- =====================
    CREATE TABLE IF NOT EXISTS ticket_config (
      guild_id TEXT PRIMARY KEY,
      support_role_id TEXT,
      ticket_channel_id TEXT,
      ticket_category_id TEXT,
      ticket_title TEXT DEFAULT 'Support Ticket',
      ticket_description TEXT DEFAULT 'Click the button below to create a support ticket.',
      ticket_image TEXT,
      ticket_emoji TEXT DEFAULT '🎫',
      log_channel_id TEXT,
      panel_message_id TEXT
    );

    -- =====================
    -- TICKETS
    -- =====================
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      claimed_by TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    );

    -- =====================
    -- GIVEAWAY CONFIG
    -- =====================
    CREATE TABLE IF NOT EXISTS giveaway_config (
      guild_id TEXT PRIMARY KEY,
      giveaway_channel_id TEXT,
      required_role_id TEXT,
      bypass_role_id TEXT,
      manager_role_id TEXT
    );

    -- =====================
    -- GIVEAWAYS
    -- =====================
    CREATE TABLE IF NOT EXISTS giveaways (
      giveaway_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winners_count INTEGER DEFAULT 1,
      participants TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      end_time INTEGER NOT NULL,
      paused_remaining INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add manager_role_id if it doesn't exist
  try {
    await db.run('ALTER TABLE giveaway_config ADD COLUMN manager_role_id TEXT');
  } catch (e) {
    // Column already exists or other error
  }

  // =====================
  // AUTOMOD BLACKLIST
  // =====================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS automod_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      word TEXT NOT NULL,
      UNIQUE(guild_id, word)
    );

    CREATE TABLE IF NOT EXISTS temp_bans (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      unban_time INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS autoroles (
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, role_id)
    );
  `);

  return db;
}

// -------------------- SINGLETON --------------------
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
}

module.exports = { getDB };