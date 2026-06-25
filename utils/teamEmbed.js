const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db  = require('../database/db');
const cfg = require('./config');
const { getActiveSeason } = require('./season');

const NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
const SEP  = '━━━━━━━━━━━━━━━━━━━━━━';

function parseColor(str) {
  if (!str) return 0x99aab5;
  const n = parseInt(str.replace('#', ''), 16);
  return isNaN(n) ? 0x99aab5 : n;
}

function fieldAvg(rows, key) {
  const vals = rows.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function buildTeamEmbed(team, members) {
  const avgPvp = fieldAvg(members, 'pvp_rating');
  const avgBld = fieldAvg(members, 'building_rating');
  const avgHrs = fieldAvg(members, 'hours_per_week');

  const season = getActiveSeason();
  let wins = 'N/A', losses = 'N/A';
  if (season) {
    const stats = db.prepare('SELECT * FROM team_stats WHERE team_id = ? AND season_id = ?').get(team.id, season.id);
    if (stats) { wins = String(stats.wins); losses = String(stats.losses); }
  }

  const readyCount = members.length
    ? db.prepare('SELECT COUNT(*) AS c FROM readiness WHERE team_id = ? AND ready = 1').get(team.id).c
    : 0;

  const captainStr = team.captain_discord_id ? `<@${team.captain_discord_id}>` : '*None assigned*';
  const rosterLines = members.length
    ? members.map((m, i) => {
        const crown = m.user_id === team.captain_discord_id ? ' 👑' : '';
        return `${NUMS[i] ?? `${i + 1}.`} <@${m.user_id}>${crown}`;
      }).join('\n')
    : '*No members yet*';

  const description =
    `${SEP}\n` +
    `👑 **Captain:** ${captainStr}\n\n` +
    `👥 **Members — ${members.length} / ${team.max_players}**\n` +
    `${SEP}\n` +
    rosterLines;

  return new EmbedBuilder()
    .setTitle(`🛡 ${team.name.toUpperCase()}`)
    .setDescription(description)
    .setColor(parseColor(team.color))
    .addFields(
      { name: '⚔️ Avg PvP',      value: avgPvp === null ? 'N/A' : `${avgPvp.toFixed(1)}/10`,   inline: true },
      { name: '🏗️ Avg Building', value: avgBld === null ? 'N/A' : `${avgBld.toFixed(1)}/10`,   inline: true },
      { name: '🕒 Avg Activity',  value: avgHrs === null ? 'N/A' : `${avgHrs.toFixed(1)} hrs`,  inline: true },
      { name: '🏆 Wins',          value: wins,                                                    inline: true },
      { name: '❌ Losses',         value: losses,                                                  inline: true },
      { name: '🟢 Ready',         value: `${readyCount} / ${members.length || 0}`,               inline: true },
    )
    .setFooter({ text: `WAR SMP • ${season ? season.name : 'No active season'}` })
    .setTimestamp();
}

function buildTeamPanelComponents(teamId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`team_panel:members:${teamId}`).setLabel('Members').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
      new ButtonBuilder().setCustomId(`team_panel:assign:${teamId}`).setLabel('Assign').setStyle(ButtonStyle.Success).setEmoji('➕'),
      new ButtonBuilder().setCustomId(`team_panel:remove:${teamId}`).setLabel('Remove').setStyle(ButtonStyle.Danger).setEmoji('➖'),
      new ButtonBuilder().setCustomId(`team_panel:captain:${teamId}`).setLabel('Captain').setStyle(ButtonStyle.Primary).setEmoji('👑'),
      new ButtonBuilder().setCustomId(`team_panel:stats:${teamId}`).setLabel('Stats').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`team_panel:message:${teamId}`).setLabel('Message Team').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
    ),
  ];
}

async function updateTeamEmbed(teamId, client) {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return;

  const members = db.prepare(`
    SELECT tm.user_id, a.pvp_rating, a.building_rating, a.hours_per_week, a.timezone
    FROM team_members tm
    LEFT JOIN applications a
      ON a.user_id = tm.user_id AND a.type = 'player' AND a.status = 'accepted'
    WHERE tm.team_id = ?
  `).all(teamId);

  const embed = buildTeamEmbed(team, members);

  // Try editing existing embed message
  if (team.embed_channel_id && team.embed_message_id) {
    try {
      const ch = await client.channels.fetch(team.embed_channel_id);
      const msg = await ch.messages.fetch(team.embed_message_id);
      await msg.edit({ embeds: [embed], components: buildTeamPanelComponents(teamId) });
      return;
    } catch {
      // Message was deleted — fall through to post a new one
    }
  }

  // Post fresh embed to configured team embeds channel
  const channelId = cfg.get('channel.team_embeds');
  if (!channelId) return;

  try {
    const ch = await client.channels.fetch(channelId);
    const components = buildTeamPanelComponents(teamId);
    const msg = await ch.send({ embeds: [embed], components });
    db.prepare('UPDATE teams SET embed_message_id = ?, embed_channel_id = ? WHERE id = ?')
      .run(msg.id, ch.id, teamId);
  } catch (err) {
    console.error(`[teamEmbed] Could not post embed for team ${teamId}:`, err.message);
  }
}

module.exports = { buildTeamEmbed, buildTeamPanelComponents, updateTeamEmbed, parseColor };
