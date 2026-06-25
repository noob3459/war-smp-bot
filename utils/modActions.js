const db = require('../database/db');

const DURATION_RE = /^(\d+)\s*(s|sec|m|min|h|hr|d|day|w|wk)s?$/i;
const MS = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };

function parseDuration(str) {
  if (!str) return null;
  const m = DURATION_RE.exec(str.trim());
  if (!m) return null;
  return parseInt(m[1]) * MS[m[2][0].toLowerCase()];
}

function formatDuration(ms) {
  if (!ms) return 'Permanent';
  const abs = Math.abs(ms);
  if (abs < 6e4)   return `${Math.round(abs / 1e3)}s`;
  if (abs < 36e5)  return `${Math.round(abs / 6e4)}m`;
  if (abs < 864e5) return `${Math.round(abs / 36e5)}h`;
  if (abs < 6048e5)return `${Math.round(abs / 864e5)}d`;
  return `${Math.round(abs / 6048e5)}w`;
}

function addModLog({ userId, username, modId, modName, action, reason, duration }) {
  return db.prepare(`
    INSERT INTO mod_logs (user_id, username, mod_id, mod_name, action, reason, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, username, modId, modName, action,
    reason   ?? 'No reason provided',
    duration ?? null,
  );
}

function getWarnings(userId) {
  return db.prepare(
    `SELECT * FROM mod_logs WHERE user_id = ? AND action = 'warn' AND active = 1 ORDER BY created_at DESC`,
  ).all(userId);
}

function deactivateLog(id) {
  return db.prepare('UPDATE mod_logs SET active = 0 WHERE id = ?').run(id);
}

function getModLog(id) {
  return db.prepare('SELECT * FROM mod_logs WHERE id = ?').get(id);
}

module.exports = { parseDuration, formatDuration, addModLog, getWarnings, deactivateLog, getModLog };
