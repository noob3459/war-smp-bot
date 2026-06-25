const db = require('../database/db');
const { fetchPanelMessage } = require('./panelManager');
const { buildApplyPanelEmbed, buildApplyPanelComponents } = require('../commands/panel/applyPanel');

function addReminder({ type, targetId = null, channelId, message, remindAt }) {
  return db.prepare(
    'INSERT INTO reminders (type, target_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?, ?)',
  ).run(type, targetId, channelId, message, remindAt);
}

async function refreshDashboard(client) {
  const panel = await fetchPanelMessage('dashboard', client);
  if (!panel) return;

  try {
    const { buildDashboardEmbed } = require('../buttons/adminServer');
    const embed = await buildDashboardEmbed(client, panel.channel.guild);
    await panel.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('[Scheduler] Dashboard refresh failed:', err.message);
  }
}

async function refreshApplyPanel(client) {
  const panel = await fetchPanelMessage('apply_panel', client);
  if (!panel) return;

  try {
    await panel.message.edit({
      embeds:     [buildApplyPanelEmbed()],
      components: buildApplyPanelComponents(),
    });
  } catch (err) {
    console.error('[Scheduler] Apply panel refresh failed:', err.message);
  }
}

function startScheduler(client) {
  let tick60Count = 0;

  async function tick() {
    tick60Count++;

    // ── Reminders ─────────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const due = db.prepare(
      "SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ? ORDER BY remind_at ASC LIMIT 20",
    ).all(now);

    for (const reminder of due) {
      db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(reminder.id);
      try {
        const channel = await client.channels.fetch(reminder.channel_id);
        await channel.send(reminder.message);
      } catch (err) {
        console.error(`[Scheduler] Reminder #${reminder.id} failed:`, err.message);
      }
    }

    // ── Live dashboard (every 60s) ─────────────────────────────────────────
    await refreshDashboard(client);

    // ── Apply panel stats (every 5 minutes) ───────────────────────────────
    if (tick60Count % 5 === 0) {
      await refreshApplyPanel(client);
    }
  }

  setInterval(tick, 60_000);
  console.log('[Scheduler] Started — reminders + dashboard refresh every 60s');
}

module.exports = { addReminder, startScheduler };
