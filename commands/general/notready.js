const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notready')
    .setDescription('Mark yourself as not ready'),

  async execute(interaction) {
    const member = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(interaction.user.id);
    if (!member) return interaction.reply({ content: 'You are not on a team.', ephemeral: true });

    db.prepare(`
      INSERT INTO readiness (user_id, team_id, ready, updated_at)
      VALUES (?, ?, 0, datetime('now'))
      ON CONFLICT(user_id, team_id) DO UPDATE SET ready = 0, updated_at = datetime('now')
    `).run(interaction.user.id, member.team_id);

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(member.team_id);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Not Ready')
        .setDescription(`You are marked as **not ready** for **${team.name}**.`)
        .setColor(0xe74c3c).setTimestamp()],
      ephemeral: false,
    });
  },
};
