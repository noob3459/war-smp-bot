const db = require('../../database/db');
const { isAdmin } = require('../permissions');
const { updateTeamEmbed } = require('../teamEmbed');

module.exports = async function assign(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can assign players to teams.', ephemeral: true });
  }

  const target   = interaction.options.getUser('user');
  const teamName = interaction.options.getString('team');
  const team     = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);

  if (!team) {
    return interaction.reply({ content: `Team **${teamName}** not found.`, ephemeral: true });
  }

  const memberCount = db.prepare('SELECT COUNT(*) as c FROM team_members WHERE team_id = ?').get(team.id).c;
  if (memberCount >= team.max_players) {
    return interaction.reply({
      content: `**${team.name}** is full (${memberCount} / ${team.max_players}).`,
      ephemeral: true,
    });
  }

  // Remove from current team (if any) and assign to new one
  const previousMembership = db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').get(target.id);
  db.prepare('INSERT OR REPLACE INTO team_members (team_id, user_id) VALUES (?, ?)').run(team.id, target.id);

  await interaction.reply({ content: `<@${target.id}> has been assigned to **${team.name}**.` });

  // Update both team embeds if the player moved from another team
  if (previousMembership && previousMembership.team_id !== team.id) {
    await updateTeamEmbed(previousMembership.team_id, client);
  }
  await updateTeamEmbed(team.id, client);
};
