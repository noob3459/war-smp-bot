const db = require('../database/db');
const { buildReviewEmbed } = require('../utils/applicationEmbed');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');

module.exports = {
  customId: 'team_select',

  async execute(interaction, client) {
    const [, appId] = interaction.customId.split(':');
    const selectedTeam = interaction.values[0];
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application) {
      return interaction.update({ content: 'Application not found.', components: [] });
    }

    db.prepare('UPDATE applications SET team = ? WHERE id = ?').run(selectedTeam, application.id);

    // Update the review embed to show the new team
    if (application.review_channel_id && application.review_message_id) {
      try {
        const channel = await client.channels.fetch(application.review_channel_id);
        const message = await channel.messages.fetch(application.review_message_id);
        const updatedApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(application.id);
        const user = await client.users.fetch(application.user_id).catch(() => null);
        const { embed, components } = buildReviewEmbed(updatedApp, user);
        await message.edit({ embeds: [embed], components });
      } catch (err) {
        console.error('[teamSelect] Could not update review embed:', err.message);
      }
    }

    logHistory(application.id, 'team_assigned', interaction.user.id, interaction.user.tag, selectedTeam);

    await notifyStaff(client, {
      title: 'Team Assigned',
      description: `Application #${application.id} has been assigned to **${selectedTeam}**.`,
      color: 0x3498db,
      fields: [
        { name: 'Applicant',   value: `<@${application.user_id}>`, inline: true },
        { name: 'Team',        value: selectedTeam,                 inline: true },
        { name: 'Assigned By', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.update({
      content: `Assigned **${selectedTeam}** to Application #${appId}.`,
      components: [],
    });
  },
};
