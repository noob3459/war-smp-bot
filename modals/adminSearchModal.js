const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { STATUS_COLORS, toDate } = require('../utils/applicationEmbed');

module.exports = {
  customId: 'admin_search_modal',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const query = interaction.fields.getTextInputValue('query').trim();

    let apps = [];

    // Numeric = app ID
    if (/^\d+$/.test(query)) {
      apps = db.prepare(`SELECT * FROM applications WHERE id = ?`).all(Number(query));
    }

    // @mention or raw ID
    if (!apps.length) {
      const userId = query.replace(/[<@!>]/g, '');
      if (/^\d{15,20}$/.test(userId)) {
        apps = db.prepare(`SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC LIMIT 10`).all(userId);
      }
    }

    // Status keyword
    if (!apps.length) {
      const statuses = ['pending', 'accepted', 'denied', 'withdrawn'];
      const matchStatus = statuses.find(s => s.startsWith(query.toLowerCase()));
      if (matchStatus) {
        apps = db.prepare(`SELECT * FROM applications WHERE status = ? ORDER BY id DESC LIMIT 10`).all(matchStatus);
      }
    }

    // IGN partial match
    if (!apps.length) {
      apps = db.prepare(`SELECT * FROM applications WHERE ign LIKE ? ORDER BY id DESC LIMIT 10`).all(`%${query}%`);
    }

    // Team name
    if (!apps.length) {
      apps = db.prepare(`SELECT * FROM applications WHERE team LIKE ? ORDER BY id DESC LIMIT 10`).all(`%${query}%`);
    }

    // Username partial match
    if (!apps.length) {
      apps = db.prepare(`SELECT * FROM applications WHERE username LIKE ? ORDER BY id DESC LIMIT 10`).all(`%${query}%`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Search Results — "${query}"`)
      .setColor(0x5865f2)
      .setFooter({ text: `${apps.length} result(s)` })
      .setTimestamp();

    if (!apps.length) {
      embed.setDescription('No applications found for that query.');
    } else {
      for (const app of apps) {
        const ts = Math.floor(toDate(app.submitted_at).getTime() / 1000);
        const team = app.team ? ` • ${app.team}` : '';
        embed.addFields({
          name: `#${app.id} — ${app.ign} (${app.type})`,
          value: `<@${app.user_id}> • **${app.status}** • <t:${ts}:d>${team}`,
          inline: false,
        });
      }
    }

    // Quick navigation buttons for first result
    const components = [];
    if (apps.length === 1) {
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`review_profile:${apps[0].id}`)
            .setLabel('View Profile')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👤'),
          new ButtonBuilder()
            .setCustomId(`review_history:${apps[0].id}`)
            .setLabel('View History')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📜'),
        ),
      );
    }

    await interaction.editReply({ embeds: [embed], components });
  },
};
