const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { getWarnings } = require('../../utils/modActions');
const { getActiveSeason } = require('../../utils/season');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View a player profile')
    .addUserOption(o => o.setName('user').setDescription('User to view (defaults to yourself)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild.members.cache.get(target.id);

    // Team
    const teamMembership = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(target.id);
    const team           = teamMembership ? db.prepare('SELECT * FROM teams WHERE id = ?').get(teamMembership.team_id) : null;

    // Latest accepted player application (for ratings)
    const app = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' AND status = 'accepted' ORDER BY id DESC LIMIT 1`,
    ).get(target.id) ?? db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' ORDER BY id DESC LIMIT 1`,
    ).get(target.id);

    // Application history count
    const appCount = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE user_id = ? AND type = 'player'").get(target.id).c;

    // Warnings
    const warnings = getWarnings(target.id);

    // Team history
    const history = db.prepare(`
      SELECT th.*, s.name AS season_name
      FROM team_history th LEFT JOIN seasons s ON s.id = th.season_id
      WHERE th.user_id = ? ORDER BY th.joined_at DESC LIMIT 5
    `).all(target.id);

    // Season stats
    const season = getActiveSeason();
    const playerStats = season
      ? db.prepare('SELECT * FROM player_stats WHERE user_id = ? AND season_id = ?').get(target.id, season.id)
      : null;

    const embed = new EmbedBuilder()
      .setTitle(`Profile — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(team ? 0x5865f2 : 0x99aab5)
      .setTimestamp();

    // Team info
    embed.addFields({
      name: 'Team',
      value: team
        ? `${team.name}${team.captain_discord_id === target.id ? ' 👑 Captain' : ''}`
        : 'Not on a team',
      inline: true,
    });

    // Join date
    if (member?.joinedAt) {
      embed.addFields({ name: 'Joined Server', value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`, inline: true });
    }

    embed.addFields({ name: 'Warnings', value: String(warnings.length), inline: true });

    // Application stats
    if (app) {
      embed.addFields(
        { name: 'IGN',            value: app.ign       ?? 'N/A', inline: true },
        { name: 'Timezone',       value: app.timezone  ?? 'N/A', inline: true },
        { name: 'PvP Rating',     value: app.pvp_rating      ? `${app.pvp_rating}/10`      : 'N/A', inline: true },
        { name: 'Building Rating',value: app.building_rating  ? `${app.building_rating}/10` : 'N/A', inline: true },
        { name: 'Hours/Week',     value: app.hours_per_week  ?? 'N/A', inline: true },
        { name: 'Applications',   value: String(appCount),             inline: true },
      );
    } else {
      embed.addFields({ name: 'Applications', value: `${appCount} — no accepted app on file`, inline: true });
    }

    // Season stats
    if (playerStats) {
      const kd = playerStats.deaths > 0 ? (playerStats.kills / playerStats.deaths).toFixed(2) : playerStats.kills.toFixed(2);
      embed.addFields({
        name: `Season Stats — ${season.name}`,
        value: `Kills: **${playerStats.kills}** | Deaths: **${playerStats.deaths}** | K/D: **${kd}** | Events: **${playerStats.participation}**`,
        inline: false,
      });
    }

    // Team history
    if (history.length) {
      embed.addFields({
        name: 'Team History',
        value: history.map(h => {
          const left = h.left_at ? `→ <t:${Math.floor(new Date(h.left_at + 'Z').getTime() / 1000)}:d>` : '→ *present*';
          const season = h.season_name ? ` (${h.season_name})` : '';
          return `**${h.team_name}**${season} ${left}`;
        }).join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
