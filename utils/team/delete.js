const db = require('../../database/db');
const { isAdmin } = require('../permissions');

module.exports = async function deleteTeam(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can delete teams.', ephemeral: true });
  }

  const teamName = interaction.options.getString('team');
  const team = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);

  if (!team) {
    return interaction.reply({ content: `Team **${teamName}** not found.`, ephemeral: true });
  }

  // Delete the live embed message from Discord
  if (team.embed_channel_id && team.embed_message_id) {
    try {
      const ch  = await client.channels.fetch(team.embed_channel_id);
      const msg = await ch.messages.fetch(team.embed_message_id);
      await msg.delete();
    } catch (err) {
      console.error('[team delete] Could not remove embed message:', err.message);
    }
  }

  // FK cascade removes team_members rows
  db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);

  await interaction.reply({ content: `Team **${team.name}** has been deleted.`, ephemeral: true });
};
