const db  = require('../../database/db');
const cfg = require('../config');
const { isAdmin } = require('../permissions');
const { updateTeamEmbed } = require('../teamEmbed');

module.exports = async function captain(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can assign captains.', ephemeral: true });
  }

  const target   = interaction.options.getUser('user');
  const teamName = interaction.options.getString('team');
  const team     = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);

  if (!team) {
    return interaction.reply({ content: `Team **${teamName}** not found.`, ephemeral: true });
  }

  // Strip Captain role from the outgoing captain if they hold no other captaincy
  if (team.captain_discord_id && team.captain_discord_id !== target.id && cfg.get('role.captain')) {
    const stillCaptainElsewhere = db.prepare(
      'SELECT 1 FROM teams WHERE captain_discord_id = ? AND id != ?',
    ).get(team.captain_discord_id, team.id);

    if (!stillCaptainElsewhere) {
      try {
        const prev = await interaction.guild.members.fetch(team.captain_discord_id);
        await prev.roles.remove(cfg.get('role.captain'));
      } catch (err) {
        console.error('[team captain] Could not remove old captain role:', err.message);
      }
    }
  }

  db.prepare('UPDATE teams SET captain_discord_id = ? WHERE id = ?').run(target.id, team.id);

  // Assign Captain role to new captain
  if (cfg.get('role.captain')) {
    try {
      const member = await interaction.guild.members.fetch(target.id);
      await member.roles.add(cfg.get('role.captain'));
    } catch (err) {
      console.error('[team captain] Could not assign Captain role:', err.message);
    }
  }

  const isMember = db.prepare(
    'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?',
  ).get(team.id, target.id);

  const warning = !isMember
    ? '\n> ⚠️ This user is not currently a member of this team.'
    : '';

  await interaction.reply({ content: `<@${target.id}> is now the captain of **${team.name}**.${warning}` });
  await updateTeamEmbed(team.id, client);
};
