const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { formatTimeline, getHistory } = require('../utils/applicationHistory');

module.exports = {
  customId: 'review_history',

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, appId] = interaction.customId.split(':');
    await interaction.deferReply({ ephemeral: true });

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));
    if (!application) {
      return interaction.editReply({ content: 'Application not found.' });
    }

    const history   = getHistory(Number(appId));
    const timeline  = formatTimeline(history);

    const embed = new EmbedBuilder()
      .setTitle(`📜 Application History — #${appId}`)
      .setDescription(timeline)
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Applicant', value: `<@${application.user_id}>`, inline: true },
        { name: 'IGN',       value: application.ign,              inline: true },
        { name: 'Status',    value: application.status,           inline: true },
      )
      .setFooter({ text: `${history.length} events recorded` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
