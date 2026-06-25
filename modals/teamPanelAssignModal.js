const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed, parseColor } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');

module.exports = {
  customId: 'team_panel_assign_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    await interaction.deferReply({ ephemeral: true });

    const rawId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();
    const team  = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.' });

    let user;
    try { user = await client.users.fetch(rawId); } catch {
      return interaction.editReply({ content: `Could not find user \`${rawId}\`.` });
    }

    const count = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(team.id).c;
    if (count >= team.max_players) {
      return interaction.editReply({ content: `**${team.name}** is full (${count}/${team.max_players}).` });
    }

    db.prepare('INSERT OR REPLACE INTO team_members (user_id, team_id) VALUES (?, ?)').run(rawId, team.id);
    await updateTeamEmbed(team.id, client).catch(() => {});

    await notifyStaff(client, {
      title: 'Player Assigned To Team',
      description: `<@${rawId}> was added to **${team.name}**.`,
      color: 0x00cc88,
      fields: [
        { name: 'Player',      value: `<@${rawId}>`,              inline: true },
        { name: 'Team',        value: team.name,                   inline: true },
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
