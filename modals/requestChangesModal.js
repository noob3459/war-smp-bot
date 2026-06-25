const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');

module.exports = {
  customId: 'review_changes_modal',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const [, appId] = interaction.customId.split(':');
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application) {
      return interaction.editReply({ content: 'Application not found.' });
    }

    const feedback = interaction.fields.getTextInputValue('feedback');

    logHistory(application.id, 'changes_requested', interaction.user.id, interaction.user.tag, feedback.slice(0, 100));

    await notifyStaff(client, {
      title: 'Changes Requested',
      description: `Staff requested changes on Application #${application.id} from <@${application.user_id}>.`,
      color: 0xf39c12,
      fields: [
        { name: 'Reviewer',    value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Application', value: `#${application.id}`,        inline: true },
      ],
    });

    try {
      const user = await client.users.fetch(application.user_id);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Changes Requested — WAR SMP Application')
            .setDescription('Staff have reviewed your application and are requesting the following changes:')
            .addFields({ name: 'Staff Feedback', value: feedback })
            .setColor(0xf39c12)
            .setFooter({ text: 'Please use /editapplication to update your answers.' })
            .setTimestamp(),
        ],
      });

      await interaction.editReply({
        content: `Feedback sent to <@${application.user_id}> successfully.`,
      });
    } catch (err) {
      console.error('[requestChangesModal] Could not DM applicant:', err.message);
      await interaction.editReply({
        content: 'Failed to send feedback — the user may have DMs disabled.',
      });
    }
  },
};
