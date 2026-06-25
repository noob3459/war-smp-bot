const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { getActiveSeason } = require('../utils/season');

module.exports = {
  customId: 'admin_events',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const action = interaction.customId.split(':')[1];

    // ── create event ─────────────────────────────────────────────────────────
    if (action === 'create') {
      const modal = new ModalBuilder()
        .setCustomId('admin_create_event_modal')
        .setTitle('Create Event');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Event Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('scheduled_at')
            .setLabel('Scheduled Date/Time (UTC — YYYY-MM-DD HH:MM)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('e.g. 2025-08-15 18:00'),
        ),
      );
      return interaction.showModal(modal);
    }

    // ── draft controls ────────────────────────────────────────────────────────
    if (action === 'draft') {
      await interaction.deferReply({ ephemeral: true });
      const draft = db.prepare(`SELECT * FROM draft_sessions WHERE status = 'active' LIMIT 1`).get();

      const embed = new EmbedBuilder()
        .setTitle('⚡ Draft Controls')
        .setColor(0x9b59b6)
        .setTimestamp();

      if (draft) {
        embed.setDescription(
          `**Active Draft** — Round ${draft.current_round}\n\n` +
          `Use \`/draft end\` to end the draft.\nUse \`/draft skip\` to skip the current pick.`,
        );
      } else {
        embed.setDescription('No active draft. Use `/draft start` to begin a new draft.');
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── season controls ───────────────────────────────────────────────────────
    if (action === 'season') {
      await interaction.deferReply({ ephemeral: true });
      const season = getActiveSeason();

      const embed = new EmbedBuilder()
        .setTitle('🏆 Season Controls')
        .setColor(0xf39c12)
        .setTimestamp();

      if (season) {
        const ts = Math.floor(new Date(season.started_at.replace(' ', 'T') + 'Z').getTime() / 1000);
        embed.setDescription(
          `**Active Season:** ${season.name}\nStarted: <t:${ts}:R>\n\n` +
          `Use \`/season end\` to end the current season.`,
        );
      } else {
        embed.setDescription('No active season. Use `/season start <name>` to begin a new season.');
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── ready status ──────────────────────────────────────────────────────────
    if (action === 'ready') {
      await interaction.deferReply({ ephemeral: true });

      const teams = db.prepare(`
        SELECT t.id, t.name, t.max_players,
          COUNT(tm.user_id) AS member_count,
          SUM(CASE WHEN r.ready = 1 THEN 1 ELSE 0 END) AS ready_count
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN readiness r ON r.user_id = tm.user_id AND r.team_id = t.id
        GROUP BY t.id ORDER BY t.name
      `).all();

      const totalReady = teams.reduce((s, t) => s + (t.ready_count || 0), 0);
      const totalMembers = teams.reduce((s, t) => s + t.member_count, 0);

      const embed = new EmbedBuilder()
        .setTitle('✅ Ready Status')
        .setDescription(`**${totalReady} / ${totalMembers}** players are ready`)
        .setColor(totalReady === totalMembers && totalMembers > 0 ? 0x00cc88 : 0xf39c12)
        .setTimestamp();

      for (const t of teams) {
        const ready = t.ready_count || 0;
        const bar = ready === t.member_count ? '🟢' : '🟡';
        embed.addFields({
          name: `${bar} ${t.name}`,
          value: `${ready} / ${t.member_count} ready`,
          inline: true,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
