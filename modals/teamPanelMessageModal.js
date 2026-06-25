const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { parseColor } = require('../utils/teamEmbed');

module.exports = {
  customId: 'team_panel_message_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, teamId] = interaction.customId.split(':');
    await interaction.deferReply({ ephemeral: true });

    const text = interaction.fields.getTextInputValue('message').trim();
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(Number(teamId));
    if (!team) return interaction.editReply({ content: 'Team not found.' });

    const members = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(team.id);

    if (!members.length) {
      return interaction.editReply({ content: `**${team.name}** has no members to message.` });
    }

    let sent = 0, failed = 0;
    for (const m of members) {
      try {
        const u = await client.users.fetch(m.user_id);
        await u.send({
          embeds: [new EmbedBuilder()
            .setTitle(`📢 Message from WAR SMP Staff — ${team.name}`)
            .setDescription(text)
            .setColor(parseColor(team.color))
            .setTimestamp()],
        });
        sent++;
      } catch {
        failed++;
      }
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`Message Sent to ${team.name}`)
        .addFields(
          { name: 'Delivered', value: String(sent),   inline: true },
          { name: 'Failed',    value: String(failed), inline: true },
        )
        .setColor(parseColor(team.color)).setTimestamp()],
    });
  },
};
