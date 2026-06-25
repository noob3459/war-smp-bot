const db = require('../database/db');

function getPanel(key) {
  return db.prepare('SELECT * FROM panel_messages WHERE key = ?').get(key);
}

function setPanel(key, channelId, messageId) {
  db.prepare(`
    INSERT OR REPLACE INTO panel_messages (key, channel_id, message_id, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(key, channelId, messageId);
}

async function fetchPanelMessage(key, client) {
  const panel = getPanel(key);
  if (!panel) return null;
  try {
    const channel = await client.channels.fetch(panel.channel_id);
    const message = await channel.messages.fetch(panel.message_id);
    return { channel, message };
  } catch {
    return null;
  }
}

module.exports = { getPanel, setPanel, fetchPanelMessage };
