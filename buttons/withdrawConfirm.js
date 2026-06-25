const { EmbedBuilder } = require('discord.js');
const db  = require('../database/db');
const cfg = require('../utils/config');
const { buildReviewEmbed, buildReviewButtons } = require('../utils/applicationEmbed');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');
const { fetchPanelMessage } = require('../utils/panelManager');
const { buildApplyPanelEmbed, buildApplyPanelComponents } = require('../commands/panel/applyPanel');

module.exports = {
  customId: 'withdraw_confirm',

  async execute(interaction, client) {
    const [, appId] = interaction.customId.split(':');
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application || application.user_id !== interaction.user.id) {
      return interaction.update({ content: 'Application not found.', embeds: [], components: [] });
    }

    if (application.status !== 'pending') {
      return interaction.update({ content: 'This application is no longer pending.', embeds: [], components: [] });
    }

    db.prepare(`UPDATE applications SET status = 'withdrawn' WHERE id = ?`).run(application.id);

    const applicantRole = cfg.get('role.applicant');
    if (applicantRole) {
      try {
        await interaction.member.roles.remove(applicantRole);
      } catch (err) {
        console.error('[withdrawConfirm] Could not remove Applicant role:', err.message);
      }
    }

    // Disable review embed in staff channel
    if (application.review_channel_id && application.review_message_id) {
      try {
        const channel = await client.channels.fetch(application.review_channel_id);
        const message = await channel.messages.fetch(application.review_message_id);
        const updatedApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(application.id);
        const user = await client.users.fetch(application.user_id).catch(() => null);
        const { embed } = buildReviewEmbed(updatedApp, user);
        await message.edit({ embeds: [embed], components: buildReviewButtons(application.id, true) });
      } catch (err) {
        console.error('[withdrawConfirm] Could not update review embed:', err.message);
      }
    }

    logHistory(application.id, 'withdrawn', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: 'Application Withdrawn',
      description: `<@${interaction.user.id}> withdrew Application #${application.id}.`,
      color: 0x95a5a6,
      fields: [
        { name: 'Applicant', value: `<@${application.user_id}>`, inline: true },
        { name: 'IGN',       value: application.ign,              inline: true },
      ],
    });

    // Refresh panel stats
    const applyPanel = await fetchPanelMessage('apply_panel', client);
    if (applyPanel) {
      await applyPanel.message.edit({
        embeds:     [buildApplyPanelEmbed()],
        components: buildApplyPanelComponents(),
      }).catch(() => {});
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Application Withdrawn')
          .setDescription('Your application has been successfully withdrawn.')
          .setColor(0x95a5a6),
      ],
      components: [],
    });
  },
};
