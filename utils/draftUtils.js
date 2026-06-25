const db = require('../database/db');

function getActiveDraft() {
  return db.prepare("SELECT * FROM draft_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
}

function getCurrentTeamId(draft) {
  const order = JSON.parse(draft.draft_order);
  const { current_round: round, current_index: index, snake } = draft;

  if (!snake) return order[index % order.length];

  // Snake: even rounds reverse the order (1-indexed)
  const isReverse = round % 2 === 0;
  return isReverse ? order[order.length - 1 - index] : order[index];
}

function advanceDraft(draftId) {
  const draft = db.prepare('SELECT * FROM draft_sessions WHERE id = ?').get(draftId);
  const order = JSON.parse(draft.draft_order);
  const nextIndex = draft.current_index + 1;

  if (nextIndex >= order.length) {
    db.prepare('UPDATE draft_sessions SET current_round = current_round + 1, current_index = 0 WHERE id = ?').run(draftId);
  } else {
    db.prepare('UPDATE draft_sessions SET current_index = ? WHERE id = ?').run(nextIndex, draftId);
  }

  db.prepare('UPDATE draft_sessions SET total_picks = total_picks + 1 WHERE id = ?').run(draftId);
}

function getAvailablePlayers() {
  return db.prepare(`
    SELECT DISTINCT a.user_id, a.username, a.ign, a.pvp_rating, a.building_rating, a.hours_per_week, a.timezone
    FROM applications a
    LEFT JOIN team_members tm ON tm.user_id = a.user_id
    WHERE a.type = 'player' AND a.status = 'accepted' AND tm.user_id IS NULL
    ORDER BY CAST(a.pvp_rating AS REAL) DESC
  `).all();
}

function recordPick(draftId, round, pickNum, teamId, userId, username) {
  db.prepare(
    'INSERT INTO draft_picks (draft_id, round, pick_num, team_id, user_id, username) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(draftId, round, pickNum, teamId, userId, username);
}

function getDraftPicks(draftId) {
  return db.prepare(`
    SELECT dp.*, t.name AS team_name, t.color
    FROM draft_picks dp JOIN teams t ON t.id = dp.team_id
    WHERE dp.draft_id = ? ORDER BY dp.pick_num ASC
  `).all(draftId);
}

module.exports = { getActiveDraft, getCurrentTeamId, advanceDraft, getAvailablePlayers, recordPick, getDraftPicks };
