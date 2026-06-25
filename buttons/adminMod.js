const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');

const PAGE_SIZE = 8;

module.exports = {
  customId: 'admin_mod',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const action = interaction.customId.split(':')[1];
    await interaction.deferReply({ ephemeral: true });

    // ── warnings ─────────────────────────────────────────────────────────────
    if (action === 'warnings') {
      const warns = db.prepare(
        `SELECT * FROM mod_logs WHERE action = 'warn' AND active = 1 ORDER BY created_at DESC LIMIT ?`,
      ).all(PAGE_SIZE);

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Active Warnings')
        .setColor(0xf39c12)
        .setTimestamp();

      if (!warns.length) {
        embed.setDescription('No active warnings.');
      } else {
        for (const w of warns) {
          const ts = Math.floor(new Date(w.created_at.replace(' ', 'T') + 'Z').getTime() / 1000);
          embed.addFields({
            name: `#${w.id} — ${w.username}`,
            value: `<@${w.user_id}> • By <@${w.mod_id}> <t:${ts}:R>${w.reason ? `\n> ${w.reason}` : ''}`,
            inline: false,
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── punishments ───────────────────────────────────────────────────────────
    if (action === 'punishments') {
      const punishments = db.prepare(
        `SELECT * FROM mod_logs WHERE action IN ('ban','mute','timeout') ORDER BY created_at DESC LIMIT ?`,
      ).all(PAGE_SIZE);

      const embed = new EmbedBuilder()
        .setTitle('🔨 Recent Punishments')
        .setColor(0xe74c3c)
        .setTimestamp();

      if (!punishments.length) {
        embed.setDescription('No punishments found.');
      } else {
        for (const p of punishments) {
          const ts = Math.floor(new Date(p.created_at.replace(' ', 'T') + 'Z').getTime() / 1000);
          const status = p.active ? '🔴 Active' : '🟢 Inactive';
          embed.addFields({
            name: `#${p.id} — ${p.action.toUpperCase()} — ${p.username}`,
            value: `${status} • <@${p.user_id}> • By <@${p.mod_id}> <t:${ts}:R>${p.reason ? `\n> ${p.reason}` : ''}`,
            inline: false,
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── tickets ───────────────────────────────────────────────────────────────
    if (action === 'tickets') {
      const tickets = db.prepare(
        `SELECT * FROM tickets WHERE status = 'open' ORDER BY created_at DESC LIMIT ?`,
      ).all(PAGE_SIZE);

      const total = db.prepare(`SELECT COUNT(*) AS c FROM tickets WHERE status = 'open'`).get().c;

      const embed = new EmbedBuilder()
        .setTitle(`🎫 Open Tickets (${total})`)
        .setColor(0x5865f2)
        .setTimestamp();

      if (!tickets.length) {
        embed.setDescription('No open tickets.');
      } else {
        for (const t of tickets) {
          const ts = Math.floor(new Date(t.created_at.replace(' ', 'T') + 'Z').getTime() / 1000);
          embed.addFields({
            name: `#${t.id} — ${t.type}`,
            value: `<@${t.user_id}> • <#${t.channel_id}> • Opened <t:${ts}:R>`,
            inline: false,
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── logs ──────────────────────────────────────────────────────────────────
    if (action === 'logs') {
      const recent = db.prepare(
        `SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT ?`,
      ).all(PAGE_SIZE);

      const embed = new EmbedBuilder()
        .setTitle('📋 Recent Mod Logs')
        .setColor(0x99aab5)
        .setTimestamp();

      if (!recent.length) {
        embed.setDescription('No mod logs found.');
      } else {
        for (const r of recent) {
          const ts = Math.floor(new Date(r.created_at.replace(' ', 'T') + 'Z').getTime() / 1000);
          embed.addFields({
            name: `#${r.id} — ${r.action.toUpperCase()} — ${r.username}`,
            value: `<@${r.user_id}> • By <@${r.mod_id}> <t:${ts}:R>${r.reason ? `\n> ${r.reason}` : ''}`,
            inline: false,
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
