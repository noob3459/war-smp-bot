const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { buildTeamEmbed, buildTeamPanelComponents } = require('../utils/teamEmbed');

module.exports = {
  customId: 'admin_team_open',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    await interaction.deferReply({ ephemeral: true });

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.' });

    const members = db.prepare(`
      SELECT tm.user_id, a.pvp_rating, a.building_rating, a.hours_per_week, a.timezone, a.ign
      FROM team_members tm
      LEFT JOIN applications a
        ON a.user_id = tm.user_id AND a.type = 'player' AND a.status = 'accepted'
      WHERE tm.team_id = ?
    `).all(Number(teamId));

    const embed = buildTeamEmbed(team, members);
    const components = buildTeamPanelComponents(Number(teamId));

    await interaction.editReply({ embeds: [embed], components });
  },
};
