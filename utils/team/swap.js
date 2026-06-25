const db = require('../../database/db');
const { isAdmin } = require('../permissions');
const { updateTeamEmbed } = require('../teamEmbed');

module.exports = async function swap(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can swap players.', ephemeral: true });
  }

  const u1 = interaction.options.getUser('user1');
  const u2 = interaction.options.getUser('user2');

  if (u1.id === u2.id) {
    return interaction.reply({ content: 'Cannot swap a player with themselves.', ephemeral: true });
  }

  const m1 = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(u1.id);
  const m2 = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(u2.id);

  if (!m1) return interaction.reply({ content: `<@${u1.id}> is not in any team.`, ephemeral: true });
  if (!m2) return interaction.reply({ content: `<@${u2.id}> is not in any team.`, ephemeral: true });

  if (m1.team_id === m2.team_id) {
    return interaction.reply({ content: 'Both players are already on the same team.', ephemeral: true });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM team_members WHERE user_id IN (?, ?)').run(u1.id, u2.id);
    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(m2.team_id, u1.id);
    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(m1.team_id, u2.id);
  })();

  const t1 = db.prepare('SELECT name FROM teams WHERE id = ?').get(m1.team_id);
  const t2 = db.prepare('SELECT name FROM teams WHERE id = ?').get(m2.team_id);

  await interaction.reply({
    content:
      `Swapped <@${u1.id}> (→ **${t2.name}**) and <@${u2.id}> (→ **${t1.name}**).`,
  });

  await updateTeamEmbed(m1.team_id, client);
  await updateTeamEmbed(m2.team_id, client);
};
