const db = require('../database/db');

const ACTION_LABELS = {
  submitted:       'Application Submitted',
  edited:          'Application Edited',
  accepted:        'Application Accepted',
  denied:          'Application Denied',
  withdrawn:       'Application Withdrawn',
  changes_requested: 'Changes Requested',
  team_assigned:   'Team Assigned',
  reopened:        'Application Reopened',
};

function logHistory(appId, action, actorId = null, actorName = null, note = null) {
  db.prepare(`
    INSERT INTO application_history (app_id, action, actor_id, actor_name, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(appId, action, actorId, actorName, note);
}

function getHistory(appId) {
  return db.prepare(
    'SELECT * FROM application_history WHERE app_id = ? ORDER BY created_at ASC',
  ).all(appId);
}

function formatTimeline(history) {
  if (!history.length) return 'No history recorded.';
  return history.map(h => {
    const ts = Math.floor(new Date(h.created_at.replace(' ', 'T') + 'Z').getTime() / 1000);
    const label = ACTION_LABELS[h.action] ?? h.action;
    const actor = h.actor_id ? `<@${h.actor_id}>` : 'System';
    const note = h.note ? ` — ${h.note}` : '';
    return `<t:${ts}:d> **${label}** by ${actor}${note}`;
  }).join('\n');
}

module.exports = { logHistory, getHistory, formatTimeline, ACTION_LABELS };
