const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');
const { addModLog } = require('./modActions');
const { log } = require('./logger');

// ── In-memory tracking (acceptable for spam; resets on restart) ──────────────
const msgTimestamps = new Map();   // userId → [timestamp, ...]
const lastContent   = new Map();   // userId → { text, count }
const joinTimestamps = [];

// Clean stale entries every 60 s
setInterval(() => {
  const cutoff = Date.now() - 30_000;
  for (const [id, ts] of msgTimestamps) {
    const kept = ts.filter(t => t > cutoff);
    if (kept.length) msgTimestamps.set(id, kept);
    else msgTimestamps.delete(id);
  }
}, 60_000);

// ── Scam / invite patterns ───────────────────────────────────────────────────
const INVITE_RE  = /discord(?:\.gg|app\.com\/invite)\/[a-zA-Z0-9-]+/i;
const SCAM_PATTERNS = [
  /discord\.gift\/[a-zA-Z0-9]+/i,
  /steam\w*\.com\/gift/i,
  /free\s*nitro/i,
  /airdrop.*crypto/i,
];

// ── Main check ───────────────────────────────────────────────────────────────
async function check(message) {
  if (!message.guild || message.author.bot) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content;
  const uid     = message.author.id;
  const now     = Date.now();
  const hits    = [];

  // 1 · Spam (5 messages in 5 s)
  if (cfg.isEnabled('automod.spam')) {
    const ts = msgTimestamps.get(uid) ?? [];
    const recent = ts.filter(t => now - t < 5_000);
    recent.push(now);
    msgTimestamps.set(uid, recent);
    if (recent.length >= 5) hits.push('spam');
  }

  // 2 · Duplicate messages (3 identical in a row)
  if (cfg.isEnabled('automod.duplicates')) {
    const prev = lastContent.get(uid);
    const norm = content.toLowerCase().trim();
    if (prev?.text === norm) {
      prev.count++;
      if (prev.count >= 3) hits.push('duplicate-message');
    } else {
      lastContent.set(uid, { text: norm, count: 1 });
    }
  }

  // 3 · Invite links
  if (cfg.isEnabled('automod.invites') && INVITE_RE.test(content)) {
    hits.push('invite-link');
  }

  // 4 · Scam links
  if (cfg.isEnabled('automod.scam_links') && SCAM_PATTERNS.some(p => p.test(content))) {
    hits.push('scam-link');
  }

  // 5 · Mass mentions (5+ distinct targets)
  if (cfg.isEnabled('automod.mass_mention')) {
    const count = message.mentions.users.size + message.mentions.roles.size;
    if (count >= 5) hits.push(`mass-mention(${count})`);
  }

  // 6 · Bad words
  if (cfg.isEnabled('automod.bad_words')) {
    const list = (cfg.get('automod.bad_words_list') ?? '')
      .split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    const lower = content.toLowerCase();
    if (list.length && list.some(w => lower.includes(w))) hits.push('bad-word');
  }

  // 7 · Caps spam (>70 % capital letters, message > 10 chars)
  if (cfg.isEnabled('automod.caps_spam') && content.length > 10) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    const caps    = content.replace(/[^A-Z]/g, '');
    if (letters.length > 0 && caps.length / letters.length > 0.70) hits.push('caps-spam');
  }

  // 8 · Emoji spam (10+ emoji)
  if (cfg.isEnabled('automod.emoji_spam')) {
    const emojiCount = [...(content.matchAll(/\p{Emoji}/gu))].length;
    if (emojiCount >= 10) hits.push(`emoji-spam(${emojiCount})`);
  }

  if (!hits.length) return;

  // Delete message
  try { await message.delete(); } catch { /* already gone */ }

  const label = hits.join(', ');

  // Warn + DM on aggressive violations
  if (hits.some(h => h.startsWith('spam') || h.startsWith('scam') || h.startsWith('mass'))) {
    addModLog({
      userId: uid, username: message.author.tag,
      modId: message.client.user.id, modName: 'AutoMod',
      action: 'warn', reason: `AutoMod: ${label}`,
    });
    message.author.send({
      embeds: [new EmbedBuilder()
        .setTitle('AutoMod Warning')
        .setDescription(`Your message in **${message.guild.name}** was removed.\n**Reason:** ${label}`)
        .setColor(0xf39c12).setTimestamp()],
    }).catch(() => {});
  }

  await log(message.client, 'moderation', {
    title: 'AutoMod',
    color: 0xf39c12,
    fields: [
      { name: 'User',     value: `<@${uid}> (${message.author.tag})`, inline: true },
      { name: 'Channel',  value: `<#${message.channelId}>`,           inline: true },
      { name: 'Triggers', value: label,                               inline: false },
      { name: 'Content',  value: `\`\`\`${content.slice(0, 400)}\`\`\``, inline: false },
    ],
  });
}

// ── Anti-raid join check ─────────────────────────────────────────────────────
async function checkJoin(member) {
  if (!cfg.isEnabled('automod.anti_raid')) return;

  const now = Date.now();
  joinTimestamps.push(now);
  const recent = joinTimestamps.filter(t => now - t < 10_000);
  joinTimestamps.length = 0;
  joinTimestamps.push(...recent);

  if (recent.length >= 10) {
    await log(member.client, 'moderation', {
      title: '⚠️ Anti-Raid Alert',
      description: `**${recent.length}** members joined within 10 seconds — possible raid.`,
      color: 0xe74c3c,
      fields: [
        { name: 'Latest', value: `<@${member.id}> (${member.user.tag})`, inline: true },
      ],
    });
  }
}

module.exports = { check, checkJoin };
