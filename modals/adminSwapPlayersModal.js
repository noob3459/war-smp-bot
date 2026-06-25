const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');
const { log } = require('../utils/logger');

module.exports = {
  customId: 'admin_swap_players_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const id1 = interaction.fields.getTextInputValue('user1_id').replace(/[<@!>]/g, '').trim();
    const id2 = interaction.fields.getTextInputValue('user2_id').replace(/[<@!>]/g, '').trim();

    if (id1 === id2) {
      return interaction.editReply({ content: 'Cannot swap a player with themselves.' });
    }

    const m1 = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(id1);
    const m2 = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(id2);

    if (!m1) return interaction.editReply({ content: `<@${id1}> is not on any team.` });
    if (!m2) return interaction.editReply({ content: `<@${id2}> is not on any team.` });
    if (m1.team_id === m2.team_id) {
      return interaction.editReply({ content: 'Both players are already on the same team.' });
    }

    const t1 = db.prepare('SELECT * FROM teams WHERE id = ?').get(m1.team_id);
    const t2 = db.prepare('SELECT * FROM teams WHERE id = ?').get(m2.team_id);

    db.prepare('UPDATE team_members SET team_id = ? WHERE user_id = ?').run(m2.team_id, id1);
    db.prepare('UPDATE team_members SET team_id = ? WHERE user_id = ?').run(m1.team_id, id2);

    await updateTeamEmbed(t1.id, client).catch(() => {});
    await updateTeamEmbed(t2.id, client).catch(() => {});

    let u1tag = id1, u2tag = id2;
    try { u1tag = (await client.users.fetch(id1)).tag; } catch {}
    try { u2tag = (await client.users.fetch(id2)).tag; } catch {}

    await log(client, 'teams', {
      title: 'Players Swapped',
      color: 0x3498db,
      fields: [
        { name: 'Player 1', value: `${u1tag} → ${t2.name}`, inline: true },
        { name: 'Player 2', value: `${u2tag} → ${t1.name}`, inline: true },
        { name: 'Admin',    value: interaction.user.tag,     inline: true },
      ],
    });

    await notifyStaff(client, {
      title: 'Players Swapped Between Teams',
      description: `<@${id1}> and <@${id2}> have been swapped.`,
      color: 0x3498db,
      fields: [
        { name: `<@${id1}>`, value: `→ ${t2.name}`, inline: true },
        { name: `<@${id2}>`, value: `→ ${t1.name}`, inline: true },
        { name: 'Admin',     value: `<@${interaction.user.id}>`, inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Players Swapped')
        .addFields(
          { name: `<@${id1}>`, value: `→ **${t2.name}**`, inline: true },
          { name: `<@${id2}>`, value: `→ **${t1.name}**`, inline: true },
        )
        .setColor(0x3498db).setTimestamp()],
    });
  },
};
