const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const cfg = require('../utils/config');
const { isAdmin } = require('../utils/permissions');
const { createBackup } = require('../utils/backup');
const { getActiveSeason } = require('../utils/season');
const { setPanel, getPanel } = require('../utils/panelManager');

async function buildDashboardEmbed(client, guild) {
  const season = getActiveSeason();

  const pendingApps  = db.prepare(`SELECT COUNT(*) AS c FROM applications WHERE status='pending' AND type='player'`).get().c;
  const openTickets  = db.prepare(`SELECT COUNT(*) AS c FROM tickets WHERE status='open'`).get().c;
  const readyCount   = db.prepare(`SELECT COUNT(*) AS c FROM readiness WHERE ready=1`).get().c;
  const totalReady   = db.prepare(`SELECT COUNT(*) AS c FROM readiness`).get().c;
  const upcomingEvts = db.prepare(`SELECT COUNT(*) AS c FROM events WHERE status IN ('scheduled','active')`).get().c;
  const activeDraft  = db.prepare(`SELECT * FROM draft_sessions WHERE status='active' LIMIT 1`).get();
  const warnsToday   = db.prepare(`SELECT COUNT(*) AS c FROM mod_logs WHERE action='warn' AND created_at >= date('now')`).get().c;
  const appsToday    = db.prepare(`SELECT COUNT(*) AS c FROM applications WHERE type='player' AND submitted_at >= date('now')`).get().c;
  const ticketsToday = db.prepare(`SELECT COUNT(*) AS c FROM tickets WHERE created_at >= date('now')`).get().c;

  const reviewTimes  = db.prepare(`
    SELECT (julianday(reviewed_at) - julianday(submitted_at)) * 24 AS hours
    FROM applications WHERE type='player' AND status IN ('accepted','denied') AND reviewed_at IS NOT NULL
  `).all();
  const avgReview = reviewTimes.length
    ? (reviewTimes.reduce((s, r) => s + r.hours, 0) / reviewTimes.length).toFixed(1) + 'h'
    : 'N/A';

  const uptimeSec = Math.floor(process.uptime());
  const uptime = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

  let onlineCount = 0;
  try {
    const members = await guild.members.fetch();
    const staffRoleId = cfg.get('role.staff');
    if (staffRoleId) {
      onlineCount = members.filter(m =>
        m.roles.cache.has(staffRoleId) && m.presence?.status !== 'offline',
      ).size;
    }
  } catch {}

  return new EmbedBuilder()
    .setTitle(`📊 Live Staff Dashboard — ${guild.name}`)
    .setThumbnail(guild.iconURL())
    .setColor(0x5865f2)
    .setDescription('Auto-refreshes every 60 seconds.')
    .addFields(
      { name: '📋 Pending Applications', value: String(pendingApps),                                          inline: true },
      { name: '🎫 Open Tickets',         value: String(openTickets),                                          inline: true },
      { name: '✅ Players Ready',         value: `${readyCount} / ${totalReady}`,                              inline: true },
      { name: '📅 Upcoming Events',       value: String(upcomingEvts),                                         inline: true },
      { name: '⚡ Draft Status',          value: activeDraft ? `Round ${activeDraft.current_round}` : 'None',  inline: true },
      { name: '🏆 Season',               value: season?.name ?? 'None',                                       inline: true },
      { name: '⚠️ Warnings Today',        value: String(warnsToday),                                           inline: true },
      { name: '👮 Staff Online',          value: String(onlineCount),                                          inline: true },
      { name: '🤖 Bot Uptime',            value: uptime,                                                       inline: true },
      { name: '📝 Applications Today',    value: String(appsToday),                                            inline: true },
      { name: '🎫 Tickets Today',         value: String(ticketsToday),                                         inline: true },
      { name: '⏱ Avg Review Time',        value: avgReview,                                                    inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Last refreshed' });
}

module.exports = {
  customId: 'admin_server',

  buildDashboardEmbed,

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const action = interaction.customId.split(':')[1];

    // ── dashboard ─────────────────────────────────────────────────────────────
    if (action === 'dashboard') {
      await interaction.deferReply({ ephemeral: true });

      const embed = await buildDashboardEmbed(client, interaction.guild);

      // Post or update the persistent dashboard
      const existing = getPanel('dashboard');
      if (existing) {
        try {
          const ch  = await client.channels.fetch(existing.channel_id);
          const msg = await ch.messages.fetch(existing.message_id);
          await msg.edit({ embeds: [embed] });
          return interaction.editReply({ content: 'Dashboard refreshed.' });
        } catch {
          // Message gone — post new one
        }
      }

      const msg = await interaction.channel.send({ embeds: [embed] });
      setPanel('dashboard', interaction.channel.id, msg.id);
      return interaction.editReply({ content: 'Live dashboard posted.' });
    }

    // ── settings ──────────────────────────────────────────────────────────────
    if (action === 'settings') {
      await interaction.deferReply({ ephemeral: true });

      const stored = cfg.getAll();
      const { CONFIG_META } = cfg;
      const cats = [...new Set(Object.values(CONFIG_META).map(m => m.category))];
      const embeds = [];

      for (const cat of cats) {
        const keys = Object.keys(CONFIG_META).filter(k => CONFIG_META[k].category === cat);
        if (!keys.length) continue;
        const fields = keys.map(k => ({
          name:   CONFIG_META[k].label,
          value:  stored[k] ? `\`${stored[k]}\`` : '*not set*',
          inline: true,
        }));
        embeds.push(
          new EmbedBuilder().setTitle(`⚙️ Settings — ${cat}`).addFields(fields).setColor(0x5865f2).setTimestamp(),
        );
      }

      return interaction.editReply({ embeds: embeds.slice(0, 10) });
    }

    // ── backup ────────────────────────────────────────────────────────────────
    if (action === 'backup') {
      await interaction.deferReply({ ephemeral: true });

      const { attachment, snapshot } = createBackup();
      const rowCount = Object.keys(snapshot)
        .filter(k => Array.isArray(snapshot[k]))
        .reduce((s, k) => s + snapshot[k].length, 0);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('💾 Backup Created')
          .setDescription('Download the file below. Store it somewhere safe.')
          .addFields(
            { name: 'Total Rows', value: String(rowCount), inline: true },
            { name: 'Timestamp',  value: snapshot.created_at.slice(0, 19), inline: true },
          )
          .setColor(0x00cc88).setTimestamp()],
        files: [attachment],
      });
    }

    // ── restore ───────────────────────────────────────────────────────────────
    if (action === 'restore') {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🔁 Restore Data')
          .setDescription('Use `/backup restore` and attach your backup `.json` file to restore data.')
          .setColor(0xf39c12)],
        ephemeral: true,
      });
    }
  },
};
