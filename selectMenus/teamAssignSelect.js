const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed, parseColor } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');
const cfg = require('../utils/config');

module.exports = {
  customId: 'team_assign_select',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    const userId = interaction.values[0];
    await interaction.deferUpdate();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.', components: [] });

    const count = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(team.id).c;
    if (count >= team.max_players) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Team Full').setDescription(`**${team.name}** is full (${count}/${team.max_players}).`).setColor(0xe74c3c)],
        components: [],
      });
    }

    const alreadyOn = db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').get(userId);
    if (alreadyOn) {
      const otherTeam = db.prepare('SELECT name FROM teams WHERE id = ?').get(alreadyOn.team_id);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Already Assigned').setDescription(`This player is already on **${otherTeam?.name ?? 'another team'}**.`).setColor(0xe74c3c)],
        components: [],
      });
    }

    db.prepare('INSERT OR REPLACE INTO team_members (user_id, team_id) VALUES (?, ?)').run(userId, team.id);

    // Assign team role if configured
    const teamRoleId = cfg.get(`role.team_${team.id}`) ?? cfg.get(`role.${team.name.toLowerCase().replace(/\s+/g, '_')}`);
    if (teamRoleId) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(teamRoleId);
      } catch {}
    }

    await updateTeamEmbed(team.id, client).catch(() => {});

    const app = db.prepare("SELECT ign, username FROM applications WHERE user_id = ? AND type = 'player' AND status = 'accepted'").get(userId);
    const displayName = app?.ign ?? app?.username ?? userId;

    await notifyStaff(client, {
      title: '👥  Player Assigned to Team',
      description: `**${displayName}** has been added to **${team.name}**.`,
      color: 0x00cc88,
      fields: [
        { name: 'Player',      value: `<@${userId}>`,              inline: true },
        { name: 'Minecraft',   value: app?.ign ?? 'N/A',           inline: true },
        { name: 'Team',        value: team.name,                   inline: true },
        { name: 'Assigned By', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('✅  Player Assigned')
        .setDescription(`<@${userId}> has been added to **${team.name}**.`)
        .addFields(
          { name: 'Minecraft', value: app?.ign ?? 'N/A',       inline: true },
          { name: 'Team',      value: team.name,                inline: true },
          { name: 'Slots',     value: `${count + 1}/${team.max_players}`, inline: true },
        )
        .setColor(0x00cc88)
        .setTimestamp()],
      components: [],
    });
  },
};
