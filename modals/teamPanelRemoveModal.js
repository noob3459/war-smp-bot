const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');

module.exports = {
  customId: 'team_panel_remove_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    await interaction.deferReply({ ephemeral: true });

    const rawId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();
    const team  = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.' });

    const member = db.prepare('SELECT * FROM team_members WHERE user_id = ? AND team_id = ?').get(rawId, team.id);
    if (!member) {
      return interaction.editReply({ content: `<@${rawId}> is not on **${team.name}**.` });
    }

    db.prepare('DELETE FROM team_members WHERE user_id = ?').run(rawId);
    await updateTeamEmbed(team.id, client).catch(() => {});

    await notifyStaff(client, {
      title: 'Player Removed From Team',
      description: `<@${rawId}> was removed from **${team.name}**.`,
      color: 0xe74c3c,
      fields: [
        { name: 'Player',     value: `<@${rawId}>`,              inline: true },
        { name: 'Team',       value: team.name,                   inline: true },
        { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Player Removed')
        .addFields(
          { name: 'Player', value: `<@${rawId}>`, inline: true },
          { name: 'Team',   value: team.name,     inline: true },
        )
        .setColor(0xe74c3c).setTimestamp()],
    });
  },
};
