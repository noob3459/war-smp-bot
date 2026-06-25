const { EmbedBuilder } = require('discord.js');
const db  = require('../database/db');
const cfg = require('../utils/config');
const { buildReviewEmbed } = require('../utils/applicationEmbed');
const { logHistory } = require('../utils/applicationHistory');
const { notifyNewApplication } = require('../utils/staffNotify');
const { fetchPanelMessage } = require('../utils/panelManager');
const { buildApplyPanelEmbed, buildApplyPanelComponents } = require('../commands/panel/applyPanel');

module.exports = {
  customId: 'apply_submit',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    // Duplicate check — one pending application per user
    const existing = db.prepare(
      `SELECT id FROM applications WHERE user_id = ? AND type = 'player' AND status = 'pending'`,
    ).get(interaction.user.id);

    if (existing) {
      return interaction.editReply({
        content:
          'You already have a pending application. Use `/myapplication` to check its status, ' +
          '`/editapplication` to update it, or `/withdrawapplication` to cancel it.',
      });
    }

    const ign          = interaction.fields.getTextInputValue('ign');
    const timezone     = interaction.fields.getTextInputValue('timezone');
    const pvpRating    = interaction.fields.getTextInputValue('pvp_rating');
    const buildRating  = interaction.fields.getTextInputValue('building_rating');
    const hoursPerWeek = interaction.fields.getTextInputValue('hours_per_week');

    const { lastInsertRowid: appId } = db.prepare(`
      INSERT INTO applications (user_id, username, ign, timezone, pvp_rating, building_rating, hours_per_week, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'player')
    `).run(interaction.user.id, interaction.user.tag, ign, timezone, pvpRating, buildRating, hoursPerWeek);

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);

    // Assign Applicant role
    const applicantRole = cfg.get('role.applicant');
    if (applicantRole) {
      try {
        await interaction.member.roles.add(applicantRole);
      } catch (err) {
        console.error('[applyModal] Could not assign Applicant role:', err.message);
      }
    }

    // Post to staff review channel
    const reviewChannelId = cfg.get('channel.staff_review');
    if (reviewChannelId) {
      try {
        const channel = await client.channels.fetch(reviewChannelId);
        const { embed, components } = buildReviewEmbed(application, interaction.user);
        const msg = await channel.send({ embeds: [embed], components });

        db.prepare(
          'UPDATE applications SET review_message_id = ?, review_channel_id = ? WHERE id = ?',
        ).run(msg.id, channel.id, appId);
      } catch (err) {
        console.error('[applyModal] Could not post to review channel:', err.message);
      }
    }

    // History + staff notification
    logHistory(appId, 'submitted', interaction.user.id, interaction.user.tag);
    await notifyNewApplication(client, application, interaction.user);

    // Refresh application panel live stats
    const panel = await fetchPanelMessage('apply_panel', client);
    if (panel) {
      await panel.message.edit({
        embeds:     [buildApplyPanelEmbed()],
        components: buildApplyPanelComponents(),
      }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle('Application Submitted')
      .setDescription(
        'Your application has been submitted and is now under review. ' +
        'You will receive a DM when a decision is made.',
      )
      .addFields(
        { name: 'IGN',      value: ign,      inline: true },
        { name: 'Timezone', value: timezone, inline: true },
        { name: 'Status',   value: 'Pending', inline: true },
      )
      .setColor(0x00cc88)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
