const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { parseColor } = require('../utils/teamEmbed');

module.exports = {
  customId: 'admin_assign_team_select',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const teamId = interaction.values[0];
    const team   = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.update({ content: 'Team not found.', components: [] });

    const count = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(team.id).c;
    if (count >= team.max_players) {
      return interaction.update({
        embeds: [new EmbedBuilder().setTitle('Team Full').setDescription(`**${team.name}** is full (${count}/${team.max_players}).`).setColor(0xe74c3c)],
        components: [],
      });
    }

    const eligible = db.prepare(`
      SELECT a.user_id, a.ign, a.username, a.pvp_rating, a.building_rating
      FROM applications a
      WHERE a.type = 'player' AND a.status = 'accepted'
        AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = a.user_id)
      ORDER BY a.ign
      LIMIT 25
    `).all();

    if (!eligible.length) {
      return interaction.update({
        embeds: [new EmbedBuilder().setTitle('No Eligible Players').setDescription('All accepted players are already assigned to teams.').setColor(0xe74c3c)],
        components: [],
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`admin_assign_player_select:${teamId}`)
      .setPlaceholder('Step 2 — Choose a player...')
      .addOptions(eligible.map(p => ({
        label: p.ign ?? p.username,
        description: `@${p.username} • PvP: ${p.pvp_rating ?? '?'}/10 • Build: ${p.building_rating ?? '?'}/10`,
        value: p.user_id,
      })));

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setTitle(`➕  Assign Player — Step 2`)
        .setDescription(`Team: **${team.name}** *(${count}/${team.max_players} players)*\n\nSelect an accepted player to assign.`)
        .setColor(parseColor(team.color))],
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  },
};
