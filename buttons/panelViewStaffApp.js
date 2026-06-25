const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { STATUS_COLORS, STATUS_LABELS, toDate } = require('../utils/applicationEmbed');

module.exports = {
  customId: 'panel_view_staff_app',

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'staff' ORDER BY id DESC LIMIT 1`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('No Staff Application Found')
          .setDescription('You have not submitted a staff application yet. Click **🛡️ Apply for Staff** to get started.')
          .setColor(0x95a5a6)],
        ephemeral: true,
      });
    }

    const submittedTs = Math.floor(toDate(application.submitted_at).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`Your Staff Application — #${application.id}`)
      .setColor(STATUS_COLORS[application.status] ?? 0x99aab5)
      .addFields(
        { name: 'Status',       value: STATUS_LABELS[application.status] ?? application.status, inline: true },
        { name: 'IGN',          value: application.ign,                                          inline: true },
        { name: 'Role Applied', value: application.staff_role ?? 'N/A',                          inline: true },
        { name: 'Age',          value: application.age ?? 'N/A',                                 inline: true },
        { name: 'Availability', value: application.availability ?? 'N/A',                        inline: true },
        { name: 'Experience',   value: application.experience ?? 'N/A',                          inline: false },
        { name: 'Submitted',    value: `<t:${submittedTs}:R>`,                                   inline: true },
      )
      .setFooter({ text: `Application ID: ${application.id}` })
      .setTimestamp(toDate(application.submitted_at));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
