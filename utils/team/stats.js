const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { getTeamStats, getActiveSeason } = require('../season');
const { parseColor } = require('../teamEmbed');

module.exports = async function stats(interaction) {
  const teamName = interaction.options.getString('team');
  const team     = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);

  if (!team) return interaction.reply({ content: `Team **${teamName}** not found.`, ephemeral: true });

  const season      = getActiveSeason();
  const allSeasons  = getTeamStats(team.id);            // all-time rows
  const currentStats = season ? getTeamStats(team.id, season.id) : null;

  const embed = new EmbedBuilder()
    .setTitle(`Stats — ${team.name}`)
    .setColor(parseColor(team.color))
    .setTimestamp();

  // Current season
  if (season) {
    const cs = currentStats ?? { wins: 0, losses: 0, kills: 0, deaths: 0, participation: 0 };
    const kd = cs.deaths > 0 ? (cs.kills / cs.deaths).toFixed(2) : cs.kills.toFixed(2);
    embed.addFields(
      { name: `Current Season — ${season.name}`, value: '​', inline: false },
      { name: 'W / L',   value: `${cs.wins} / ${cs.losses}`, inline: true },
      { name: 'K / D',   value: `${cs.kills} / ${cs.deaths} (${kd})`, inline: true },
      { name: 'Events',  value: String(cs.participation), inline: true },
    );
  } else {
    embed.setDescription('*No active season.*');
  }

  // All-time summary
  if (allSeasons.length) {
    const totals = allSeasons.reduce((acc, s) => {
      acc.wins   += s.wins;
      acc.losses += s.losses;
      acc.kills  += s.kills;
      acc.deaths += s.deaths;
      return acc;
    }, { wins: 0, losses: 0, kills: 0, deaths: 0 });

    const atKd = totals.deaths > 0 ? (totals.kills / totals.deaths).toFixed(2) : totals.kills.toFixed(2);
    embed.addFields(
      { name: 'All-Time (across all seasons)', value: '​', inline: false },
      { name: 'W / L',    value: `${totals.wins} / ${totals.losses}`, inline: true },
      { name: 'K / D',    value: `${totals.kills} / ${totals.deaths} (${atKd})`, inline: true },
      { name: 'Seasons',  value: String(allSeasons.length), inline: true },
    );
  }

  // Per-season breakdown
  if (allSeasons.length > 1) {
    const rows = allSeasons.map(s =>
      `**${s.season_name}** — ${s.wins}W/${s.losses}L | ${s.kills}K/${s.deaths}D`,
    ).join('\n');
    embed.addFields({ name: 'Season Breakdown', value: rows.slice(0, 1024), inline: false });
  }

  // Readiness
  const teamSize    = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(team.id).c;
  const readyCount  = db.prepare('SELECT COUNT(*) AS c FROM readiness WHERE team_id = ? AND ready = 1').get(team.id).c;
  embed.addFields({ name: 'Readiness', value: `${readyCount} / ${teamSize} ready`, inline: true });

  await interaction.reply({ embeds: [embed] });
};
