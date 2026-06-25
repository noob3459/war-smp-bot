const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');
const cfg = require('../utils/config');

module.exports = {
  customId: 'admin_captain_member_select',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    const newCaptainId = interaction.values[0];
    await interaction.deferUpdate();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.', components: [] });

    const captainRole = cfg.get('role.captain');

    if (team.captain_discord_id && team.captain_discord_id !== newCaptainId && captainRole) {
      const stillCaptainElsewhere = db.prepare(
        'SELECT 1 FROM teams WHERE captain_discord_id = ? AND id != ?',
      ).get(team.captain_discord_id, team.id);

      if (!stillCaptainElsewhere) {
        try {
          const prev = await interaction.guild.members.fetch(team.captain_discord_id);
          await prev.roles.remove(captainRole);
        } catch {}
      }
    }

    db.prepare('UPDATE teams SET captain_discord_id = ? WHERE id = ?').run(newCaptainId, team.id);

    if (captainRole) {
      try {
        const member = await interaction.guild.members.fetch(newCaptainId);
        await member.roles.add(captainRole);
      } catch {}
    }

    await updateTeamEmbed(team.id, client).catch(() => {});

    const app = db.prepare("SELECT ign, username FROM applications WHERE user_id = ? AND type = 'player'").get(newCaptainId);
    const displayName = app?.ign ?? app?.username ?? newCaptainId;

    await notifyStaff(client, {
      title: '👑  New Team Captain',
      description: `**${displayName}** is now captain of **${team.name}**.`,
      color: 0xf39c12,
      fields: [
        { name: 'Captain', value: `<@${newCaptainId}>`,        inline: true },
        { name: 'Team',    value: team.name,                   inline: true },
        { name: 'Set By',  value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('✅  Captain Assigned')
        .setDescription(`<@${newCaptainId}> is now the captain of **${team.name}**.`)
        .addFields(
          { name: 'Minecraft', value: app?.ign ?? 'N/A', inline: true },
          { name: 'Team',      value: team.name,          inline: true },
        )
        .setColor(0xf39c12).setTimestamp()],
      components: [],
    });
  },
};
