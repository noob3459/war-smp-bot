const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { buildReviewEmbed } = require('../utils/applicationEmbed');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');
const { fetchPanelMessage } = require('../utils/panelManager');
const { buildApplyPanelEmbed, buildApplyPanelComponents } = require('../commands/panel/applyPanel');

module.exports = {
  customId: 'edit_submit',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const [, appId] = interaction.customId.split(':');
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application || application.user_id !== interaction.user.id) {
      return interaction.editReply({ content: 'Application not found.' });
    }

    if (application.status !== 'pending') {
      return interaction.editReply({ content: 'You can only edit a pending application.' });
    }

    const ign          = interaction.fields.getTextInputValue('ign');
    const timezone     = interaction.fields.getTextInputValue('timezone');
    const pvpRating    = interaction.fields.getTextInputValue('pvp_rating');
    const buildRating  = interaction.fields.getTextInputValue('building_rating');
    const hoursPerWeek = interaction.fields.getTextInputValue('hours_per_week');

    db.prepare(`
      UPDATE applications
      SET ign = ?, timezone = ?, pvp_rating = ?, building_rating = ?, hours_per_week = ?
      WHERE id = ?
    `).run(ign, timezone, pvpRating, buildRating, hoursPerWeek, application.id);

    // Sync the review embed
    if (application.review_channel_id && application.review_message_id) {
      try {
        const channel = await client.channels.fetch(application.review_channel_id);
        const message = await channel.messages.fetch(application.review_message_id);
        const updatedApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(application.id);
        const user = await client.users.fetch(application.user_id).catch(() => null);
        const { embed, components } = buildReviewEmbed(updatedApp, user);
        await message.edit({ embeds: [embed], components });
      } catch (err) {
        console.error('[editApplicationModal] Could not sync review embed:', err.message);
      }
    }

    logHistory(application.id, 'edited', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: 'Application Edited',
      description: `<@${interaction.user.id}> edited their player application.`,
      color: 0xf39c12,
      fields: [
        { name: 'Application', value: `#${application.id}`, inline: true },
        { name: 'IGN',         value: ign,                  inline: true },
      ],
    });

    // Refresh live panel stats
    const panel = await fetchPanelMessage('apply_panel', client);
    if (panel) {
      await panel.message.edit({
        embeds:     [buildApplyPanelEmbed()],
        components: buildApplyPanelComponents(),
      }).catch(() => {});
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Application Updated')
          .setDescription('Your application has been updated and the review board has been notified.')
          .addFields(
            { name: 'IGN',      value: ign,      inline: true },
            { name: 'Timezone', value: timezone, inline: true },
          )
          .setColor(0x00cc88)
          .setTimestamp(),
      ],
    });
  },
};
