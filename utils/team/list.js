const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { parseColor } = require('../teamEmbed');

module.exports = async function list(interaction) {
  const teams = db.prepare(`
    SELECT t.*, COUNT(tm.user_id) AS member_count
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `).all();

  if (!teams.length) {
    return interaction.reply({ content: 'No teams have been created yet.', ephemeral: true });
  }

  const fields = teams.map(t => ({
    name:   t.name,
    value:  [
      `**Captain:** ${t.captain_discord_id ? `<@${t.captain_discord_id}>` : 'None'}`,
      `**Members:** ${t.member_count} / ${t.max_players}`,
      `**Color:** ${t.color ?? 'N/A'}`,
    ].join('\n'),
    inline: true,
  }));

  const embed = new EmbedBuilder()
    .setTitle('WAR SMP — Teams')
    .setColor(0x5865f2)
    .addFields(fields)
    .setFooter({ text: `${teams.length} team${teams.length !== 1 ? 's' : ''}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
};
