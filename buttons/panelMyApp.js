const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { STATUS_COLORS, STATUS_LABELS, toDate } = require('../utils/applicationEmbed');

module.exports = {
  customId: 'panel_my_app',

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' ORDER BY id DESC LIMIT 1`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('No Application Found')
          .setDescription('You have not submitted a player application yet. Click **📝 Apply** to get started.')
          .setColor(0x95a5a6)],
        ephemeral: true,
      });
    }

    const submittedTs = Math.floor(toDate(application.submitted_at).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`Your Application — #${application.id}`)
      .setColor(STATUS_COLORS[application.status] ?? 0x99aab5)
      .addFields(
        { name: 'Status',          value: STATUS_LABELS[application.status] ?? application.status, inline: true },
        { name: 'IGN',             value: application.ign,                                          inline: true },
        { name: 'Timezone',        value: application.timezone      ?? 'N/A',                       inline: true },
        { name: 'PvP Rating',      value: `${application.pvp_rating ?? 'N/A'} / 10`,               inline: true },
        { name: 'Building Rating', value: `${application.building_rating ?? 'N/A'} / 10`,          inline: true },
        { name: 'Hours / Week',    value: application.hours_per_week ?? 'N/A',                      inline: true },
        { name: 'Submitted',       value: `<t:${submittedTs}:R>`,                                   inline: true },
      )
      .setFooter({ text: `Application ID: ${application.id}` })
      .setTimestamp(toDate(application.submitted_at));

    if (application.team) {
      embed.addFields({ name: 'Assigned Team', value: application.team, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
