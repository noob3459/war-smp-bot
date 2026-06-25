const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { toDate } = require('../utils/applicationEmbed');

module.exports = {
  customId: 'review_profile',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const [, appId] = interaction.customId.split(':');
    await interaction.deferReply({ ephemeral: true });

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));
    if (!application) {
      return interaction.editReply({ content: 'Application not found.' });
    }

    // All applications this user has submitted
    const allApps = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC`,
    ).all(application.user_id);

    // Team membership
    const teamMember = db.prepare(`
      SELECT t.name, tm.joined_at
      FROM team_members tm JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = ?
    `).get(application.user_id);

    // Mod history
    const modCount = db.prepare(
      `SELECT COUNT(*) AS c FROM mod_logs WHERE user_id = ?`,
    ).get(application.user_id).c;

    let user;
    try { user = await client.users.fetch(application.user_id); } catch {}

    const embed = new EmbedBuilder()
      .setTitle(`👤 Player Profile — ${application.username}`)
      .setThumbnail(user?.displayAvatarURL() ?? null)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Discord',          value: `<@${application.user_id}>`,             inline: true },
        { name: 'Current IGN',      value: application.ign,                          inline: true },
        { name: 'Timezone',         value: application.timezone ?? 'N/A',            inline: true },
        { name: 'PvP Rating',       value: `${application.pvp_rating ?? 'N/A'}/10`,  inline: true },
        { name: 'Building Rating',  value: `${application.building_rating ?? 'N/A'}/10`, inline: true },
        { name: 'Hrs/Week',         value: application.hours_per_week ?? 'N/A',      inline: true },
        { name: 'Current Team',     value: teamMember?.name ?? 'None',               inline: true },
        { name: 'Mod Actions',      value: String(modCount),                         inline: true },
        { name: 'Total Applications', value: String(allApps.length),                 inline: true },
      )
      .setTimestamp();

    if (allApps.length > 1) {
      const appList = allApps.slice(0, 5).map(a => {
        const ts = Math.floor(toDate(a.submitted_at).getTime() / 1000);
        return `#${a.id} (${a.type}) — **${a.status}** <t:${ts}:d>`;
      }).join('\n');
      embed.addFields({ name: 'Application History', value: appList, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
