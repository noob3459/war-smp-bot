const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed, parseColor } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');
const cfg = require('../utils/config');

module.exports = {
  customId: 'team_remove_select',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    const userId = interaction.values[0];
    await interaction.deferUpdate();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.', components: [] });

    const membership = db.prepare('SELECT * FROM team_members WHERE user_id = ? AND team_id = ?').get(userId, team.id);
    if (!membership) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Not Found').setDescription('That player is no longer on this team.').setColor(0xe74c3c)],
        components: [],
      });
    }

    db.prepare('DELETE FROM team_members WHERE user_id = ?').run(userId);

    // Remove captain if they were captain
    if (team.captain_discord_id === userId) {
      db.prepare('UPDATE teams SET captain_discord_id = NULL WHERE id = ?').run(team.id);
    }

    // Remove team role if configured
    const teamRoleId = cfg.get(`role.team_${team.id}`) ?? cfg.get(`role.${team.name.toLowerCase().replace(/\s+/g, '_')}`);
    if (teamRoleId) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.remove(teamRoleId);
      } catch {}
    }

    // Remove captain role if they were captain
    if (team.captain_discord_id === userId && cfg.get('role.captain')) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.remove(cfg.get('role.captain'));
      } catch {}
    }

    await updateTeamEmbed(team.id, client).catch(() => {});

    const app = db.prepare("SELECT ign, username FROM applications WHERE user_id = ? AND type = 'player'").get(userId);
    const displayName = app?.ign ?? app?.username ?? userId;

    await notifyStaff(client, {
      title: '👥  Player Removed from Team',
      description: `**${displayName}** has been removed from **${team.name}**.`,
      color: 0xe74c3c,
      fields: [
        { name: 'Player',     value: `<@${userId}>`,              inline: true },
        { name: 'Team',       value: team.name,                   inline: true },
        { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('✅  Player Removed')
        .setDescription(`<@${userId}> has been removed from **${team.name}**.`)
        .addFields(
          { name: 'Minecraft', value: app?.ign ?? 'N/A', inline: true },
          { name: 'Team',      value: team.name,          inline: true },
        )
        .setColor(0xe74c3c)
        .setTimestamp()],
      components: [],
    });
  },
};
