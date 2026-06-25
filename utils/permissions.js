const db  = require('../database/db');
const cfg = require('./config');

function isAdmin(member) {
  if (member.permissions.has('Administrator')) return true;
  const adminRole = cfg.get('role.admin');
  if (adminRole && member.roles.cache.has(adminRole)) return true;
  return false;
}

function isCaptain(userId, teamId = null) {
  const query = teamId
    ? 'SELECT 1 FROM teams WHERE id = ? AND captain_discord_id = ?'
    : 'SELECT 1 FROM teams WHERE captain_discord_id = ?';
  const args = teamId ? [teamId, userId] : [userId];
  return !!db.prepare(query).get(...args);
}

function isAdminOrCaptain(member, teamId = null) {
  return isAdmin(member) || isCaptain(member.user.id, teamId);
}

module.exports = { isAdmin, isCaptain, isAdminOrCaptain };
