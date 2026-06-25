const db = require('../../database/db');
const { buildTeamEmbed } = require('../teamEmbed');
const { isAdminOrCaptain } = require('../permissions');

module.exports = async function info(interaction) {
  const teamName = interaction.options.getString('team');
  const team     = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);

  if (!team) {
    return interaction.reply({ content: `Team **${teamName}** not found.`, ephemeral: true });
  }

  // Captains can view their own team; admins can view any
  const allowed = isAdminOrCaptain(interaction.member, team.id);
  if (!allowed) {
    return interaction.reply({ content: 'Only admins and team captains can view team details.', ephemeral: true });
  }

  const members = db.prepare(`
    SELECT tm.user_id, a.pvp_rating, a.building_rating, a.hours_per_week, a.timezone
    FROM team_members tm
    LEFT JOIN applications a
      ON a.user_id = tm.user_id AND a.type = 'player' AND a.status = 'accepted'
    WHERE tm.team_id = ?
  `).all(team.id);

  const embed = buildTeamEmbed(team, members);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};
