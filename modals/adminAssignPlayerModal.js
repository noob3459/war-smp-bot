const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');
const { log } = require('../utils/logger');

module.exports = {
  customId: 'admin_assign_player_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const rawId   = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();
    const teamName = interaction.fields.getTextInputValue('team_name').trim();

    const team = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(teamName);
    if (!team) {
      return interaction.editReply({ content: `Team **${teamName}** not found. Check the name and try again.` });
    }

    let user;
    try { user = await client.users.fetch(rawId); } catch {
      return interaction.editReply({ content: `Could not find a user with ID \`${rawId}\`.` });
    }

    const memberCount = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(team.id).c;
    if (memberCount >= team.max_players) {
      return interaction.editReply({ content: `**${team.name}** is full (${memberCount}/${team.max_players}).` });
    }

    // Remove from previous team
    const prev = db.prepare(`
      SELECT t.name FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = ?
    `).get(rawId);

    if (prev) {
      db.prepare('DELETE FROM team_members WHERE user_id = ?').run(rawId);
    }

    db.prepare('INSERT OR REPLACE INTO team_members (user_id, team_id) VALUES (?, ?)').run(rawId, team.id);

    // Update team embed
    await updateTeamEmbed(team.id, client).catch(() => {});
    if (prev) {
      const prevTeam = db.prepare('SELECT id FROM teams WHERE name = ?').get(prev.name);
      if (prevTeam) await updateTeamEmbed(prevTeam.id, client).catch(() => {});
    }

    await log(client, 'teams', {
      title: 'Player Assigned to Team',
      color: 0x00cc88,
      fields: [
        { name: 'Player',  value: `${user.tag} (<@${rawId}>)`, inline: true },
        { name: 'Team',    value: team.name,                    inline: true },
        { name: 'Admin',   value: interaction.user.tag,          inline: true },
      ],
    });

    await notifyStaff(client, {
      title: 'Player Assigned To Team',
      description: `<@${rawId}> has been assigned to **${team.name}**.`,
      color: 0x00cc88,
      fields: [
        { name: 'Player',      value: `<@${rawId}>`,          inline: true },
        { name: 'Team',        value: team.name,               inline: true },
        { name: 'Assigned By', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Player Assigned')
        .addFields(
          { name: 'Player', value: `<@${rawId}>`, inline: true },
          { name: 'Team',   value: team.name,     inline: true },
        )
        .setColor(0x00cc88).setTimestamp()],
    });
  },
};
