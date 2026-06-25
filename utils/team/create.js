const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { isAdmin } = require('../permissions');
const { updateTeamEmbed, parseColor } = require('../teamEmbed');

module.exports = async function create(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Only admins can create teams.', ephemeral: true });
  }

  const name       = interaction.options.getString('name').trim();
  const colorInput = interaction.options.getString('color').trim();
  const maxPlayers = interaction.options.getInteger('maxplayers');

  const hexStr = colorInput.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hexStr)) {
    return interaction.reply({
      content: 'Invalid color — use a 6-digit hex value like `#e74c3c`.',
      ephemeral: true,
    });
  }

  const existing = db.prepare('SELECT id FROM teams WHERE LOWER(name) = LOWER(?)').get(name);
  if (existing) {
    return interaction.reply({ content: `A team named **${name}** already exists.`, ephemeral: true });
  }

  const color = `#${hexStr}`;
  const { lastInsertRowid: teamId } = db.prepare(
    'INSERT INTO teams (name, color, max_players) VALUES (?, ?, ?)',
  ).run(name, color, maxPlayers);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Team Created')
        .setColor(parseColor(color))
        .addFields(
          { name: 'Name',        value: name,            inline: true },
          { name: 'Color',       value: color,           inline: true },
          { name: 'Max Players', value: String(maxPlayers), inline: true },
        )
        .setTimestamp(),
    ],
  });

  await updateTeamEmbed(teamId, client);
};
