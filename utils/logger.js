const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

const LOG_KEYS = {
  deletions:    'log.deletions',
  edits:        'log.edits',
  joins:        'log.joins',
  leaves:       'log.leaves',
  nicknames:    'log.nicknames',
  roles:        'log.roles',
  moderation:   'log.moderation',
  applications: 'log.applications',
  teams:        'log.teams',
  staff:        'log.staff',
};

/**
 * Post a structured log embed.
 * @param {Client} client
 * @param {string} type  One of LOG_KEYS
 * @param {{ title?, description?, color?, fields?, footer?, thumbnail? }} data
 */
async function log(client, type, data) {
  const channelId = cfg.get(LOG_KEYS[type]) ?? cfg.get('log.all');
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);

    const embed = new EmbedBuilder().setTimestamp().setColor(data.color ?? 0x5865f2);
    if (data.title)       embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.fields)      embed.addFields(data.fields);
    if (data.footer)      embed.setFooter({ text: data.footer });
    if (data.thumbnail)   embed.setThumbnail(data.thumbnail);

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[Logger] Failed to send "${type}" log:`, err.message);
  }
}

module.exports = { log };
