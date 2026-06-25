const { AttachmentBuilder } = require('discord.js');
const db = require('../database/db');

function createBackup() {
  const snapshot = {
    version: 2,
    created_at: new Date().toISOString(),
    teams:              db.prepare('SELECT * FROM teams').all(),
    team_members:       db.prepare('SELECT * FROM team_members').all(),
    applications:       db.prepare('SELECT * FROM applications').all(),
    seasons:            db.prepare('SELECT * FROM seasons').all(),
    team_stats:         db.prepare('SELECT * FROM team_stats').all(),
    team_history:       db.prepare('SELECT * FROM team_history').all(),
    events:             db.prepare('SELECT * FROM events').all(),
    event_participants: db.prepare('SELECT * FROM event_participants').all(),
    mod_logs:           db.prepare('SELECT * FROM mod_logs').all(),
    guild_config:       db.prepare('SELECT * FROM guild_config').all(),
    tickets:            db.prepare('SELECT * FROM tickets').all(),
    draft_sessions:     db.prepare('SELECT * FROM draft_sessions').all(),
    draft_picks:        db.prepare('SELECT * FROM draft_picks').all(),
  };

  const buffer   = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8');
  const filename = `warsmp-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  return { attachment: new AttachmentBuilder(buffer, { name: filename }), snapshot };
}

// Restores only the safest, most portable table: guild_config.
// Full restore (teams, applications, etc.) is intentionally gated behind explicit flags.
const RESTORABLE = ['guild_config', 'seasons', 'team_stats', 'team_history', 'events', 'event_participants', 'mod_logs'];

function restoreBackup(data, tables = ['guild_config']) {
  const invalid = tables.filter(t => !RESTORABLE.includes(t));
  if (invalid.length) throw new Error(`Cannot restore: ${invalid.join(', ')}`);

  const run = db.transaction(() => {
    for (const table of tables) {
      const rows = data[table];
      if (!Array.isArray(rows) || !rows.length) continue;

      db.prepare(`DELETE FROM ${table}`).run();
      const cols = Object.keys(rows[0]).join(', ');
      const vals = Object.keys(rows[0]).map(() => '?').join(', ');
      const ins  = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals})`);
      for (const row of rows) ins.run(...Object.values(row));
    }
  });

  run();
}

module.exports = { createBackup, restoreBackup, RESTORABLE };
