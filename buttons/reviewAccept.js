const { EmbedBuilder } = require('discord.js');
const db  = require('../database/db');
const cfg = require('../utils/config');
const { buildReviewEmbed, buildReviewButtons } = require('../utils/applicationEmbed');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');
const { fetchPanelMessage } = require('../utils/panelManager');
const { buildApplyPanelEmbed, buildApplyPanelComponents } = require('../commands/panel/applyPanel');

module.exports = {
  customId: 'review_accept',

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
      SET status = 'accepted', reviewed_at = datetime('now'), reviewed_by = ?
      WHERE id = ?
    `).run(interaction.user.id, application.id);

    // Role changes
    try {
      const member = await interaction.guild.members.fetch(application.user_id);
      const memberRole    = cfg.get('role.member');
      const applicantRole = cfg.get('role.applicant');
      if (memberRole)    await member.roles.add(memberRole);
      if (applicantRole) await member.roles.remove(applicantRole);
    } catch (err) {
      console.error('[reviewAccept] Could not update roles:', err.message);
    }

    // DM applicant
    try {
      const user = await client.users.fetch(application.user_id);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Application Accepted')
            .setDescription(
              'Congratulations! Your **WAR SMP** player application has been **accepted**. ' +
              'Welcome to the server — check the Discord for next steps.',
            )
            .setColor(0x00cc88)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[reviewAccept] Could not DM applicant:', err.message);
    }

    logHistory(application.id, 'accepted', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: 'Application Accepted',
      description: `Application #${application.id} has been **accepted** by <@${interaction.user.id}>.`,
      color: 0x00cc88,
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
