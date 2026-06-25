const { EmbedBuilder } = require('discord.js');
const db  = require('../database/db');
const cfg = require('../utils/config');
const { buildReviewEmbed, buildReviewButtons } = require('../utils/applicationEmbed');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');
const { fetchPanelMessage } = require('../utils/panelManager');
const { buildApplyPanelEmbed, buildApplyPanelComponents } = require('../commands/panel/applyPanel');

module.exports = {
  customId: 'review_deny',

  async execute(interaction, client) {
    const [, appId] = interaction.customId.split(':');
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application) {
      return interaction.reply({ content: 'Application not found.', ephemeral: true });
    }

    if (application.status !== 'pending') {
      return interaction.reply({
        content: `This application is already **${application.status}**.`,
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    db.prepare(`
      UPDATE applications
      SET status = 'denied', reviewed_at = datetime('now'), reviewed_by = ?
      WHERE id = ?
    `).run(interaction.user.id, application.id);

    // Remove Applicant role
    try {
      const member = await interaction.guild.members.fetch(application.user_id);
      const applicantRole = cfg.get('role.applicant');
      if (applicantRole) await member.roles.remove(applicantRole);
    } catch (err) {
      console.error('[reviewDeny] Could not remove Applicant role:', err.message);
    }

    // DM applicant
    try {
      const user = await client.users.fetch(application.user_id);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Application Denied')
            .setDescription(
              'Unfortunately, your **WAR SMP** player application has been **denied** at this time. ' +
              'You may re-apply in the future.',
            )
            .setColor(0xe74c3c)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[reviewDeny] Could not DM applicant:', err.message);
    }

    logHistory(application.id, 'denied', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: 'Application Denied',
      description: `Application #${application.id} has been **denied** by <@${interaction.user.id}>.`,
      color: 0xe74c3c,
      fields: [
        { name: 'Applicant', value: `<@${application.user_id}>`, inline: true },
        { name: 'IGN',       value: application.ign,              inline: true },
        { name: 'Reviewer',  value: `<@${interaction.user.id}>`, inline: true },
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

    // Update review embed with disabled buttons
    const updatedApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(application.id);
    const user = await client.users.fetch(application.user_id).catch(() => null);
    const { embed } = buildReviewEmbed(updatedApp, user);
    await interaction.editReply({ embeds: [embed], components: buildReviewButtons(application.id, true) });
  },
};
