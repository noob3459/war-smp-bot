const db = require('../../database/db');
const { isAdmin } = require('../permissions');
const { updateTeamEmbed } = require('../teamEmbed');

module.exports = async function rename(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can rename teams.', ephemeral: true });
  }

  const teamName = interaction.options.getString('team');
  const newName  = interaction.options.getString('newname').trim();
  const team     = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);

  if (!team) {
    return interaction.reply({ content: `Team **${teamName}** not found.`, ephemeral: true });
  }

  const clash = db.prepare('SELECT id FROM teams WHERE LOWER(name) = LOWER(?) AND id != ?').get(newName, team.id);
  if (clash) {
    return interaction.reply({ content: `A team named **${newName}** already exists.`, ephemeral: true });
  }

  db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(newName, team.id);

  await interaction.reply({ content: `**${team.name}** renamed to **${newName}**.` });
  await updateTeamEmbed(team.id, client);
};
