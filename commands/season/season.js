const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const cfg = require('../../utils/config');
const { getActiveSeason, getAllTeamStats } = require('../../utils/season');
const { addReminder } = require('../../utils/scheduler');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season')
    .setDescription('Season management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s
      .setName('start')
      .setDescription('Start a new season')
      .addStringOption(o => o.setName('name').setDescription('Season name (e.g. "Season 1")').setRequired(true))
      .addStringOption(o => o.setName('end_date').setDescription('Scheduled end date — YYYY-MM-DD HH:MM (UTC)')),
    )
    .addSubcommand(s => s
      .setName('end')
      .setDescription('End the current active season and archive team stats'),
    )
    .addSubcommand(s => s
      .setName('reset')
      .setDescription('End the season AND clear all team rosters'),
    )
    .addSubcommand(s => s
      .setName('result')
      .setDescription('Record a match result for the current season')
      .addStringOption(o => o.setName('winner').setDescription('Winning team name').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('loser').setDescription('Losing team name').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('winner_kills').setDescription('Kills by winning team'))
      .addIntegerOption(o => o.setName('loser_kills').setDescription('Kills by losing team')),
    )
    .addSubcommand(s => s
      .setName('standings')
      .setDescription('Show current season standings'),
    ),

  async autocomplete(interaction) {
    const val   = interaction.options.getFocused().toLowerCase();
    const teams = db.prepare('SELECT name FROM teams WHERE LOWER(name) LIKE ? LIMIT 25').all(`%${val}%`);
    await interaction.respond(teams.map(t => ({ name: t.name, value: t.name })));
  },

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── start ─────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      const active = getActiveSeason();
      if (active) {
        return interaction.reply({ content: `There is already an active season: **${active.name}**. End it first with \`/season end\`.`, ephemeral: true });
      }

      const name    = interaction.options.getString('name');
      const endDate = interaction.options.getString('end_date');
      const result  = db.prepare(
        "INSERT INTO seasons (name, started_by) VALUES (?, ?)",
      ).run(name, interaction.user.id);
      const seasonId = result.lastInsertRowid;

      // Seed stats rows for all existing teams
      const teams = db.prepare('SELECT id FROM teams').all();
      for (const t of teams) {
        db.prepare('INSERT OR IGNORE INTO team_stats (team_id, season_id) VALUES (?, ?)').run(t.id, seasonId);
      }

      // Schedule end reminder if date given
      if (endDate) {
        const parsed = new Date(endDate.replace(' ', 'T') + ':00Z');
        if (!isNaN(parsed)) {
          const warningTime = new Date(parsed.getTime() - 24 * 60 * 60 * 1000);
          const channelId   = cfg.get('channel.seasons');
          if (channelId) {
            addReminder({
              type: 'season_end_warning', channelId,
              message: `⚠️ **Reminder** — Season **${name}** is scheduled to end in 24 hours!`,
              remindAt: warningTime.toISOString(),
            });
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('Season Started')
        .setDescription(`**${name}** has begun. Good luck, teams!`)
        .setColor(0x00cc88).setTimestamp();
      if (endDate) embed.addFields({ name: 'Scheduled End', value: endDate, inline: true });

      const seasonCh = cfg.get('channel.seasons');
      if (seasonCh) {
        try { await (await client.channels.fetch(seasonCh)).send({ embeds: [embed] }); } catch { /* ignore */ }
      }

      return interaction.reply({ embeds: [embed] });
    }

    // ── end ───────────────────────────────────────────────────────────────────
    if (sub === 'end' || sub === 'reset') {
      const active = getActiveSeason();
      if (!active) return interaction.reply({ content: 'No active season to end.', ephemeral: true });

      await interaction.deferReply();

      db.prepare("UPDATE seasons SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(active.id);

      if (sub === 'reset') {
        // Close out team history for all current members
        const members = db.prepare('SELECT user_id, team_id FROM team_members').all();
        const histStmt = db.prepare("UPDATE team_history SET left_at = datetime('now') WHERE user_id = ? AND team_id = ? AND left_at IS NULL");
        for (const m of members) histStmt.run(m.user_id, m.team_id);
        db.prepare('DELETE FROM team_members').run();
        db.prepare('DELETE FROM readiness').run();
      }

      const stats = getAllTeamStats(active.id);
      const rows  = stats.map(s =>
        `**${s.team_name}** — ${s.wins}W / ${s.losses}L | ${s.kills}K / ${s.deaths}D`,
      ).join('\n') || 'No match results recorded.';

      const embed = new EmbedBuilder()
        .setTitle(`Season Ended: ${active.name}`)
        .setDescription(rows)
        .addFields({ name: 'Rosters', value: sub === 'reset' ? 'Cleared ✓' : 'Preserved', inline: true })
        .setColor(0xe74c3c).setTimestamp();

      const seasonCh = cfg.get('channel.seasons');
      if (seasonCh) {
        try { await (await client.channels.fetch(seasonCh)).send({ embeds: [embed] }); } catch { /* ignore */ }
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── result ────────────────────────────────────────────────────────────────
    if (sub === 'result') {
      const active = getActiveSeason();
      if (!active) return interaction.reply({ content: 'No active season. Start one with `/season start`.', ephemeral: true });

      const winName = interaction.options.getString('winner');
      const losName = interaction.options.getString('loser');
      const wKills  = interaction.options.getInteger('winner_kills') ?? 0;
      const lKills  = interaction.options.getInteger('loser_kills')  ?? 0;

      const winner = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(winName);
      const loser  = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(losName);

      if (!winner) return interaction.reply({ content: `Team **${winName}** not found.`, ephemeral: true });
      if (!loser)  return interaction.reply({ content: `Team **${losName}** not found.`, ephemeral: true });
      if (winner.id === loser.id) return interaction.reply({ content: 'Winner and loser cannot be the same team.', ephemeral: true });

      const { recordMatchResult } = require('../../utils/season');
      recordMatchResult({ winnerTeamId: winner.id, loserTeamId: loser.id, seasonId: active.id, winnerKills: wKills, loserKills: lKills });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Match Result Recorded')
          .addFields(
            { name: 'Winner', value: `${winner.name} (${wKills}K / ${lKills}D)`, inline: true },
            { name: 'Loser',  value: `${loser.name} (${lKills}K / ${wKills}D)`,  inline: true },
            { name: 'Season', value: active.name,                                  inline: true },
          ).setColor(0x00cc88).setTimestamp()],
      });
    }

    // ── standings ─────────────────────────────────────────────────────────────
    if (sub === 'standings') {
      const active = getActiveSeason();
      if (!active) return interaction.reply({ content: 'No active season.', ephemeral: true });

      const stats = getAllTeamStats(active.id);
      if (!stats.length) return interaction.reply({ content: 'No match results recorded yet.', ephemeral: true });

      const rows = stats.map((s, i) => {
        const kd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2);
        return `**${i + 1}. ${s.team_name}** — ${s.wins}W/${s.losses}L — K/D: ${kd}`;
      }).join('\n');

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(`Standings — ${active.name}`)
          .setDescription(rows)
          .setColor(0xf39c12).setTimestamp()],
      });
    }
  },
};
