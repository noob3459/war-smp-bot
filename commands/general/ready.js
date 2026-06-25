const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ready')
    .setDescription('Mark yourself as ready for the upcoming match or event'),

  async execute(interaction) {
    const member = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(interaction.user.id);
    if (!member) return interaction.reply({ content: 'You are not on a team.', ephemeral: true });

    db.prepare(`
      INSERT INTO readiness (user_id, team_id, ready, updated_at)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, team_id) DO UPDATE SET ready = 1, updated_at = datetime('now')
    `).run(interaction.user.id, member.team_id);

    const team      = db.prepare('SELECT * FROM teams WHERE id = ?').get(member.team_id);
    const teamSize  = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(member.team_id).c;
    const readyCount = db.prepare('SELECT COUNT(*) AS c FROM readiness WHERE team_id = ? AND ready = 1').get(member.team_id).c;
    const allReady  = readyCount >= teamSize;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Ready!')
        .setDescription(`You are marked as **ready** for **${team.name}**.`)
        .addFields({ name: 'Team Readiness', value: `${readyCount} / ${teamSize} ready${allReady ? ' ✅' : ''}`, inline: true })
        .setColor(allReady ? 0x00cc88 : 0xf39c12)
        .setTimestamp()],
      ephemeral: false,
    });
  },
};
