const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { STATUS_COLORS, STATUS_LABELS, toDate } = require('../../utils/applicationEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myapplication')
    .setDescription('View your current player application status'),

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' ORDER BY submitted_at DESC LIMIT 1`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        content: "You haven't submitted a player application yet. Use `/apply` to get started.",
        ephemeral: true,
      });
    }

    const submittedTs = Math.floor(toDate(application.submitted_at).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle('Your Application')
      .addFields(
        { name: 'IGN',              value: application.ign,                                 inline: true  },
        { name: 'Status',           value: STATUS_LABELS[application.status] ?? 'Unknown',  inline: true  },
        { name: 'Timezone',         value: application.timezone       ?? 'N/A',             inline: true  },
        { name: 'PvP Rating',       value: `${application.pvp_rating ?? 'N/A'} / 10`,      inline: true  },
        { name: 'Building Rating',  value: `${application.building_rating ?? 'N/A'} / 10`, inline: true  },
        { name: 'Hours Per Week',   value: application.hours_per_week ?? 'N/A',             inline: true  },
        { name: 'Submitted',        value: `<t:${submittedTs}:R>`,                          inline: true  },
      )
      .setColor(STATUS_COLORS[application.status] ?? 0x99aab5)
      .setTimestamp();

    if (application.team) {
      embed.addFields({ name: 'Assigned Team', value: application.team, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
