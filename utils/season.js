const db = require('../database/db');

function getActiveSeason() {
  return db.prepare("SELECT * FROM seasons WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
}

function ensureTeamStats(teamId, seasonId) {
  db.prepare('INSERT OR IGNORE INTO team_stats (team_id, season_id) VALUES (?, ?)').run(teamId, seasonId);
}

function recordMatchResult({ winnerTeamId, loserTeamId, seasonId, winnerKills = 0, loserKills = 0 }) {
  ensureTeamStats(winnerTeamId, seasonId);
  ensureTeamStats(loserTeamId, seasonId);

  db.prepare(`
    UPDATE team_stats SET wins = wins + 1, kills = kills + ?, deaths = deaths + ?,
    participation = participation + 1 WHERE team_id = ? AND season_id = ?
  `).run(winnerKills, loserKills, winnerTeamId, seasonId);

  db.prepare(`
    UPDATE team_stats SET losses = losses + 1, kills = kills + ?, deaths = deaths + ?,
    participation = participation + 1 WHERE team_id = ? AND season_id = ?
  `).run(loserKills, winnerKills, loserTeamId, seasonId);
}

function getTeamStats(teamId, seasonId = null) {
  if (seasonId) {
    return db.prepare('SELECT * FROM team_stats WHERE team_id = ? AND season_id = ?').get(teamId, seasonId);
  }
  return db.prepare(`
    SELECT ts.*, s.name AS season_name
    FROM team_stats ts JOIN seasons s ON s.id = ts.season_id
    WHERE ts.team_id = ? ORDER BY ts.season_id DESC
  `).all(teamId);
}

function getAllTeamStats(seasonId) {
  return db.prepare(`
    SELECT ts.*, t.name AS team_name, t.color
    FROM team_stats ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = ?
    ORDER BY ts.wins DESC, ts.kills DESC
  `).all(seasonId);
}

function recordTeamHistory(userId, teamId, teamName, seasonId, joined = true) {
  if (joined) {
    db.prepare('INSERT INTO team_history (user_id, team_id, team_name, season_id) VALUES (?, ?, ?, ?)').run(userId, teamId, teamName, seasonId ?? null);
  } else {
    db.prepare(`
      UPDATE team_history SET left_at = datetime('now')
      WHERE user_id = ? AND team_id = ? AND left_at IS NULL
    `).run(userId, teamId);
  }
}

module.exports = { getActiveSeason, ensureTeamStats, recordMatchResult, getTeamStats, getAllTeamStats, recordTeamHistory };
