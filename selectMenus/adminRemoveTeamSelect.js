const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { parseColor } = require('../utils/teamEmbed');

module.exports = {
  customId: 'admin_remove_team_select',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const teamId = interaction.values[0];
    const team   = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.update({ content: 'Team not found.', components: [] });

    const members = db.prepare(`
      SELECT tm.user_id, a.ign, a.username
      FROM team_members tm
      LEFT JOIN applications a ON a.user_id = tm.user_id AND a.type = 'player'
      WHERE tm.team_id = ?
      ORDER BY a.ign
      LIMIT 25
    `).all(Number(teamId));

    if (!members.length) {
      return interaction.update({
        embeds: [new EmbedBuilder().setTitle('No Members').setDescription(`**${team.name}** has no members.`).setColor(0xe74c3c)],
        components: [],
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`admin_remove_player_select:${teamId}`)
      .setPlaceholder('Step 2 — Choose a player to remove...')
      .addOptions(members.map(m => ({
        label: m.ign ?? m.username ?? `User ${m.user_id}`,
        description: m.user_id === team.captain_discord_id ? 'Captain' : `<@${m.user_id}>`,
        value: m.user_id,
      })));

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setTitle('➖  Remove Player — Step 2')
        .setDescription(`Team: **${team.name}**\n\nSelect the player to remove.`)
        .setColor(parseColor(team.color))],
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  },
};
