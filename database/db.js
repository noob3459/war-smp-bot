const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'war-smp.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Core tables ─────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            TEXT    NOT NULL,
    username           TEXT    NOT NULL,
    ign                TEXT    NOT NULL,

    timezone           TEXT,
    pvp_rating         TEXT,
    building_rating    TEXT,
    hours_per_week     TEXT,

    age                TEXT,
    staff_role         TEXT,
    experience         TEXT,
    availability       TEXT,

    team               TEXT,
    type               TEXT NOT NULL CHECK(type IN ('player', 'staff')),
    status             TEXT NOT NULL DEFAULT 'pending'
                            CHECK(status IN ('pending', 'accepted', 'denied', 'withdrawn')),

    review_message_id  TEXT,
    review_channel_id  TEXT,

    submitted_at       TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at        TEXT,
    reviewed_by        TEXT
  );

  CREATE TABLE IF NOT EXISTS teams (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL UNIQUE,
    description         TEXT
  );

  CREATE TABLE IF NOT EXISTS team_members (
    user_id   TEXT    PRIMARY KEY,
    team_id   INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    joined_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Migrate teams table (safe: only adds missing columns) ────────────────────

function addCol(table, col, def) {
  const has = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
  if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}

addCol('teams', 'color',             `TEXT NOT NULL DEFAULT '#99aab5'`);
addCol('teams', 'captain_discord_id', 'TEXT');
addCol('teams', 'max_players',        'INTEGER NOT NULL DEFAULT 10');
addCol('teams', 'created_at',         `TEXT DEFAULT (datetime('now'))`);
addCol('teams', 'embed_message_id',   'TEXT');
addCol('teams', 'embed_channel_id',   'TEXT');

// ── Phase-4 tables ──────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mod_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    username   TEXT NOT NULL,
    mod_id     TEXT NOT NULL,
    mod_name   TEXT NOT NULL,
    action     TEXT NOT NULL,
    reason     TEXT,
    duration   TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL UNIQUE,
    user_id    TEXT NOT NULL,
    username   TEXT NOT NULL,
    type       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at  TEXT,
    closed_by  TEXT,
    reason     TEXT
  );
`);

// ── Phase-5 tables ──────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS seasons (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at   TEXT,
    started_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_stats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id       INTEGER NOT NULL,
    season_id     INTEGER NOT NULL,
    wins          INTEGER NOT NULL DEFAULT 0,
    losses        INTEGER NOT NULL DEFAULT 0,
    kills         INTEGER NOT NULL DEFAULT 0,
    deaths        INTEGER NOT NULL DEFAULT 0,
    participation INTEGER NOT NULL DEFAULT 0,
    UNIQUE(team_id, season_id),
    FOREIGN KEY (team_id)   REFERENCES teams(id)   ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS player_stats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       TEXT    NOT NULL,
    season_id     INTEGER NOT NULL,
    kills         INTEGER NOT NULL DEFAULT 0,
    deaths        INTEGER NOT NULL DEFAULT 0,
    participation INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, season_id),
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT    NOT NULL,
    team_id   INTEGER,
    team_name TEXT NOT NULL,
    season_id INTEGER,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    left_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    description  TEXT,
    scheduled_at TEXT,
    status       TEXT NOT NULL DEFAULT 'scheduled',
    channel_id   TEXT,
    message_id   TEXT,
    created_by   TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_participants (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id  INTEGER NOT NULL,
    user_id   TEXT    NOT NULL,
    username  TEXT    NOT NULL,
    attended  INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS draft_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id     INTEGER,
    status        TEXT    NOT NULL DEFAULT 'active',
    draft_order   TEXT    NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 1,
    current_index INTEGER NOT NULL DEFAULT 0,
    total_picks   INTEGER NOT NULL DEFAULT 0,
    snake         INTEGER NOT NULL DEFAULT 1,
    channel_id    TEXT,
    message_id    TEXT,
    created_by    TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (season_id) REFERENCES seasons(id)
  );

  CREATE TABLE IF NOT EXISTS draft_picks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id  INTEGER NOT NULL,
    round     INTEGER NOT NULL,
    pick_num  INTEGER NOT NULL,
    team_id   INTEGER NOT NULL,
    user_id   TEXT    NOT NULL,
    username  TEXT    NOT NULL,
    picked_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (draft_id) REFERENCES draft_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS readiness (
    user_id    TEXT    NOT NULL,
    team_id    INTEGER NOT NULL,
    ready      INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, team_id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    target_id  TEXT,
    channel_id TEXT NOT NULL,
    message    TEXT NOT NULL,
    remind_at  TEXT NOT NULL,
    sent       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Phase-6 tables ──────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS application_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id     INTEGER NOT NULL,
    action     TEXT    NOT NULL,
    actor_id   TEXT,
    actor_name TEXT,
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS panel_messages (
    key        TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed default teams on first run ─────────────────────────────────────────

const teamCount = db.prepare('SELECT COUNT(*) as c FROM teams').get().c;
if (teamCount === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO teams (name, color, max_players) VALUES (?, ?, ?)');
  [
    ['Red Team',   '#e74c3c', 10],
    ['Blue Team',  '#3498db', 10],
    ['Green Team', '#2ecc71', 10],
  ].forEach(([n, c, m]) => ins.run(n, c, m));
}

module.exports = db;
