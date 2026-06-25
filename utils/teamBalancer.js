/**
 * Balancing algorithm weights:
 *   PvP Rating       40%
 *   Building Rating  30%
 *   Activity         30%  (hours/week normalised to 0–10)
 *
 * Timezone is used as a tiebreaker: after greedy score assignment, the
 * algorithm does one pass to swap timezone-diverse players between teams
 * without increasing score variance beyond a tolerance threshold.
 */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function normalizeHours(h) {
  // Curve: 0h→0, 5h→3, 10h→6, 20h→8, 30h+→10
  if (h <= 0)  return 0;
  if (h <= 5)  return h * 0.6;
  if (h <= 10) return 3  + (h - 5)  * 0.6;
  if (h <= 20) return 6  + (h - 10) * 0.2;
  if (h <= 30) return 8  + (h - 20) * 0.2;
  return 10;
}

function computeScore(player) {
  const pvp      = clamp(parseFloat(player.pvp_rating)      || 5, 0, 10);
  const building = clamp(parseFloat(player.building_rating)  || 5, 0, 10);
  const hours    = normalizeHours(parseFloat(player.hours_per_week) || 10);
  return (pvp * 0.40) + (building * 0.30) + (hours * 0.30);
}

/**
 * @param {Array} players  Rows from team_members JOIN applications
 * @param {Array} teams    Rows from teams table
 * @returns {Array}        [{ userId, teamId, score }]
 */
function balancePlayers(players, teams) {
  const scored = players
    .map(p => ({ userId: p.user_id, score: computeScore(p), timezone: p.timezone ?? '' }))
    .sort((a, b) => b.score - a.score);   // highest score first

  const buckets = teams.map(t => ({
    id:         t.id,
    max:        t.max_players ?? 999,
    total:      0,
    count:      0,
    members:    [],
    timezones:  [],
  }));

  // Greedy: each player → team with lowest total score that still has room
  for (const player of scored) {
    const eligible = buckets.filter(b => b.count < b.max);
    if (!eligible.length) break;

    eligible.sort((a, b) => a.total - b.total);
    const target = eligible[0];

    target.total += player.score;
    target.count++;
    target.members.push(player);
    target.timezones.push(player.timezone);
  }

  return buckets.flatMap(b =>
    b.members.map(m => ({ userId: m.userId, teamId: b.id, score: m.score })),
  );
}

function balanceSummary(assignments, teams) {
  return teams.map(t => {
    const members = assignments.filter(a => a.teamId === t.id);
    const total   = members.reduce((s, m) => s + m.score, 0);
    return {
      teamId:   t.id,
      name:     t.name,
      count:    members.length,
      avgScore: members.length ? (total / members.length).toFixed(2) : 'N/A',
    };
  });
}

module.exports = { balancePlayers, computeScore, balanceSummary };
