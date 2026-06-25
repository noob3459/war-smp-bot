const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');
const { buildReviewButtons } = require('../utils/applicationEmbed');

module.exports = {
  customId: 'app_reopen',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, appId] = interaction.customId.split(':');
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!app) return interaction.reply({ content: 'Application not found.', ephemeral: true });
    if (app.status !== 'denied') {
      return interaction.reply({ content: `This application is **${app.status}**, not denied.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    db.prepare(`
      UPDATE applications SET status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE id = ?
    `).run(app.id);

    logHistory(app.id, 'reopened', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: '🔄  Application Reopened',
      description: `Application #${app.id} has been reopened and set back to **Pending**.`,
      color: 0xf39c12,
      fields: [
        { name: 'Applicant',  value: `<@${app.user_id}>`, inline: true },
        { name: 'IGN',        value: app.ign,              inline: true },
        { name: 'Reopened By', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('✅  Application Reopened')
        .setDescription(`Application #${app.id} from <@${app.user_id}> is now **Pending** again.`)
        .setColor(0xf39c12)
        .setTimestamp()],
    });
  },
};
