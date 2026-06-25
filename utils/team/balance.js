const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { isAdmin } = require('../permissions');
const { balancePlayers, balanceSummary } = require('../teamBalancer');
const { updateTeamEmbed } = require('../teamEmbed');

module.exports = async function balance(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can balance teams.', ephemeral: true });
  }

  await interaction.deferReply();

  const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
  if (teams.length < 2) {
    return interaction.editReply({ content: 'At least 2 teams are required to balance.' });
  }

  const players = db.prepare(`
    SELECT tm.user_id, tm.team_id,
           COALESCE(a.pvp_rating,      '5')  AS pvp_rating,
           COALESCE(a.building_rating, '5')  AS building_rating,
           COALESCE(a.hours_per_week,  '10') AS hours_per_week,
           a.timezone
    FROM team_members tm
    LEFT JOIN applications a
      ON a.user_id = tm.user_id AND a.type = 'player' AND a.status = 'accepted'
  `).all();

  if (!players.length) {
    return interaction.editReply({ content: 'No players are currently assigned to any team.' });
  }

  const assignments = balancePlayers(players, teams);

  // Apply atomically
  db.transaction(() => {
    db.prepare('DELETE FROM team_members').run();
    const ins = db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)');
    for (const { userId, teamId } of assignments) ins.run(teamId, userId);
  })();

  const summary = balanceSummary(assignments, teams);

  const embed = new EmbedBuilder()
    .setTitle('Teams Balanced')
    .setDescription('Players have been redistributed to keep scores as even as possible.')
    .addFields(
      summary.map(s => ({
        name:   s.name,
        value:  `${s.count} players — avg score **${s.avgScore}**`,
        inline: true,
      })),
    )
    .addFields({ name: 'Total Players Moved', value: String(assignments.length), inline: false })
    .setColor(0x00cc88)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  for (const team of teams) await updateTeamEmbed(team.id, client);
};
