const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const cfg = require('../../utils/config');
const { getActiveSeason } = require('../../utils/season');

function buildDashboardEmbeds(guild) {
  const season = getActiveSeason();
  const now    = Math.floor(Date.now() / 1000);

  // ── Applications ──────────────────────────────────────────────────────────
  const pending   = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'   AND type = 'player'").get().c;
  const accepted  = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'accepted'  AND type = 'player'").get().c;
  const denied    = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'denied'    AND type = 'player'").get().c;
  const withdrawn = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'withdrawn' AND type = 'player'").get().c;

  const todayAccepted = db.prepare(`
    SELECT COUNT(*) AS c FROM applications
    WHERE type = 'player' AND status = 'accepted' AND date(reviewed_at) = date('now')
  `).get().c;
  const todayDenied = db.prepare(`
    SELECT COUNT(*) AS c FROM applications
    WHERE type = 'player' AND status = 'denied' AND date(reviewed_at) = date('now')
  `).get().c;

  // ── Tickets ───────────────────────────────────────────────────────────────
  const openTickets   = db.prepare("SELECT COUNT(*) AS c FROM tickets WHERE status = 'open'").get().c;
  const closedTickets = db.prepare("SELECT COUNT(*) AS c FROM tickets WHERE status = 'closed'").get().c;

  // ── Moderation ────────────────────────────────────────────────────────────
  const activeWarns = db.prepare("SELECT COUNT(*) AS c FROM mod_logs WHERE action = 'warn' AND active = 1").get().c;
  const weekActions = db.prepare(
    "SELECT action, COUNT(*) AS c FROM mod_logs WHERE created_at >= datetime('now', '-7 days') GROUP BY action ORDER BY c DESC LIMIT 4",
  ).all();

  // ── Teams ─────────────────────────────────────────────────────────────────
  const teams = db.prepare(`
    SELECT t.name, t.captain_discord_id, t.color, t.max_players, COUNT(tm.user_id) AS mc
    FROM teams t LEFT JOIN team_members tm ON tm.team_id = t.id
    GROUP BY t.id ORDER BY t.name
  `).all();
  const totalRoster = teams.reduce((s, t) => s + t.mc, 0);

  // ── Readiness ─────────────────────────────────────────────────────────────
  const ready    = db.prepare("SELECT COUNT(*) AS c FROM readiness WHERE ready = 1").get().c;
  const notReady = db.prepare("SELECT COUNT(*) AS c FROM readiness WHERE ready = 0").get().c;

  // ── Events ────────────────────────────────────────────────────────────────
  const upcomingEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status IN ('scheduled','active')").get().c;
  const activeDraft    = db.prepare("SELECT * FROM draft_sessions WHERE status = 'active' LIMIT 1").get();

  // ── Uptime ────────────────────────────────────────────────────────────────
  const uptimeSec = Math.floor(process.uptime());
  const uptimeStr = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

  // ─────────────────────────────────────────────────────────────────────────
  const overviewEmbed = new EmbedBuilder()
    .setTitle(`📊  WAR SMP — Admin Dashboard`)
    .setDescription(`**${guild.name}** • <t:${now}:R>`)
    .setThumbnail(guild.iconURL())
    .setColor(0x5865f2)
    .setTimestamp()
    .addFields(
      { name: '🏆  Season',      value: season ? `**${season.name}**` : '*None active*',     inline: true },
      { name: '👥  Members',     value: `**${guild.memberCount}**`,                          inline: true },
      { name: '🤖  Uptime',      value: uptimeStr,                                           inline: true },
    );

  const appsEmbed = new EmbedBuilder()
    .setTitle('📋  Applications')
    .setColor(0xf39c12)
    .addFields(
      { name: '🟡  Pending',   value: `**${pending}**`,        inline: true },
      { name: '🟢  Accepted',  value: `**${accepted}**`,       inline: true },
      { name: '🔴  Denied',    value: `**${denied}**`,         inline: true },
      { name: '⚫  Withdrawn', value: `**${withdrawn}**`,      inline: true },
      { name: '✅  Today Acc', value: `**${todayAccepted}**`,  inline: true },
      { name: '❌  Today Den', value: `**${todayDenied}**`,    inline: true },
    );

  const liveEmbed = new EmbedBuilder()
    .setTitle('⚡  Live Status')
    .setColor(0x00cc88)
    .addFields(
      { name: '🎫  Open Tickets',   value: `**${openTickets}**`,  inline: true },
      { name: '✅  Closed Tickets', value: `**${closedTickets}**`, inline: true },
      { name: '⚠️  Active Warns',   value: `**${activeWarns}**`,  inline: true },
      { name: '✅  Ready',          value: `**${ready}**`,         inline: true },
      { name: '❌  Not Ready',      value: `**${notReady}**`,      inline: true },
      { name: '📅  Events',         value: `**${upcomingEvents}**`, inline: true },
      { name: '⚡  Draft',          value: activeDraft ? `Active (Round ${activeDraft.current_round})` : '*None*', inline: true },
    );

  if (weekActions.length) {
    liveEmbed.addFields({
      name: '🔨  Mod Actions (7d)',
      value: weekActions.map(a => `**${a.action}:** ${a.c}`).join('  •  '),
      inline: false,
    });
  }

  const teamLines = teams.map(t => {
    const fill = `${t.mc}/${t.max_players}`;
    const cap  = t.captain_discord_id ? ` 👑 <@${t.captain_discord_id}>` : '';
    const bar  = buildBar(t.mc, t.max_players);
    return `**${t.name}** — ${fill}${cap}\n${bar}`;
  }).join('\n') || '*No teams yet*';

  const teamsEmbed = new EmbedBuilder()
    .setTitle('👥  Teams Overview')
    .setDescription(teamLines)
    .setColor(0x9b59b6)
    .setFooter({ text: `${totalRoster} players across ${teams.length} teams` });

  return [overviewEmbed, appsEmbed, liveEmbed, teamsEmbed];
}

function buildBar(current, max) {
  if (!max) return '';
  const filled = Math.round((current / max) * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${current}/${max}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Admin dashboard — live server-wide overview')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const embeds = buildDashboardEmbeds(interaction.guild);

    const refreshRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
    );

    await interaction.editReply({ embeds, components: [refreshRow] });
  },

  buildDashboardEmbeds,
};
