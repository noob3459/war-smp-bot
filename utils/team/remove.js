const db = require('../../database/db');
const { isAdmin } = require('../permissions');
const { updateTeamEmbed } = require('../teamEmbed');

module.exports = async function remove(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can remove players from teams.', ephemeral: true });
  }

  const target     = interaction.options.getUser('user');
  const membership = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(target.id);

  if (!membership) {
    return interaction.reply({ content: `<@${target.id}> is not in any team.`, ephemeral: true });
  }

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(membership.team_id);
  db.prepare('DELETE FROM team_members WHERE user_id = ?').run(target.id);

  await interaction.reply({ content: `<@${target.id}> has been removed from **${team.name}**.` });
  await updateTeamEmbed(team.id, client);
};
