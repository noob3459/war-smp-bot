const {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed, parseColor } = require('../utils/teamEmbed');
const { getActiveSeason } = require('../utils/season');

const NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];

module.exports = {
  customId: 'team_panel',

  async execute(interaction, client) {
    const parts  = interaction.customId.split(':');
    const action = parts[1];
    const teamId = parseInt(parts[2]);

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return interaction.reply({ content: 'Team not found.', ephemeral: true });
    }

    // ── members ───────────────────────────────────────────────────────────────
    if (action === 'members') {
      await interaction.deferReply({ ephemeral: true });
      const members = db.prepare(`
        SELECT tm.user_id, a.ign, a.pvp_rating, a.building_rating, a.hours_per_week
        FROM team_members tm
        LEFT JOIN applications a ON a.user_id = tm.user_id AND a.type = 'player' AND a.status = 'accepted'
        WHERE tm.team_id = ?
      `).all(teamId);

      const embed = new EmbedBuilder()
        .setTitle(`👥  ${team.name} — Full Roster`)
        .setColor(parseColor(team.color))
        .setTimestamp();

      if (!members.length) {
        embed.setDescription('No members yet.');
      } else {
        const lines = members.map((m, i) => {
          const crown = team.captain_discord_id === m.user_id ? ' 👑' : '';
          const ign   = m.ign ? ` *(${m.ign})*` : '';
          return `${NUMS[i] ?? `${i + 1}.`} <@${m.user_id}>${crown}${ign}`;
        });
        embed.setDescription(lines.join('\n'));
        embed.setFooter({ text: `${members.length} / ${team.max_players} members` });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── stats ─────────────────────────────────────────────────────────────────
    if (action === 'stats') {
      await interaction.deferReply({ ephemeral: true });
      const history = db.prepare('SELECT * FROM team_stats WHERE team_id = ? ORDER BY season_id DESC LIMIT 5').all(teamId);

      const embed = new EmbedBuilder()
        .setTitle(`📊  ${team.name} — Season Statistics`)
        .setColor(parseColor(team.color))
        .setTimestamp();

      if (!history.length) {
        embed.setDescription('No statistics recorded yet.');
      } else {
        for (const s of history) {
          const seasonRow = db.prepare('SELECT name FROM seasons WHERE id = ?').get(s.season_id);
          const kd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2);
          embed.addFields({
            name: seasonRow?.name ?? `Season ${s.season_id}`,
            value: `🏆 **${s.wins}W** ❌ **${s.losses}L** ⚔️ ${s.kills}K/${s.deaths}D (${kd} KDR)`,
            inline: false,
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── assign ────────────────────────────────────────────────────────────────
    if (action === 'assign') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: 'Administrator only.', ephemeral: true });
      }

      const count = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(teamId).c;
      if (count >= team.max_players) {
        return interaction.reply({
          content: `**${team.name}** is full (${count}/${team.max_players}).`,
          ephemeral: true,
        });
      }

      // Accepted players not already on any team
      const eligible = db.prepare(`
        SELECT a.user_id, a.ign, a.username, a.pvp_rating
        FROM applications a
        WHERE a.type = 'player' AND a.status = 'accepted'
          AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = a.user_id)
        ORDER BY a.ign
        LIMIT 25
      `).all();

      if (!eligible.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('No Eligible Players')
            .setDescription('All accepted players are already assigned to teams, or no applications have been accepted yet.')
            .setColor(0xe74c3c)],
          ephemeral: true,
        });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`team_assign_select:${teamId}`)
        .setPlaceholder('Choose a player to assign...')
        .addOptions(eligible.map(p => ({
          label: p.ign ?? p.username,
          description: `@${p.username} • PvP: ${p.pvp_rating ?? '?'}/10`,
          value: p.user_id,
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(`➕  Assign Player to ${team.name}`)
          .setDescription(`Select an accepted player to add.\n**Slots:** ${count}/${team.max_players}`)
          .setColor(parseColor(team.color))],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    // ── remove ────────────────────────────────────────────────────────────────
    if (action === 'remove') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: 'Administrator only.', ephemeral: true });
      }

      const members = db.prepare(`
        SELECT tm.user_id, a.ign, a.username
        FROM team_members tm
        LEFT JOIN applications a ON a.user_id = tm.user_id AND a.type = 'player'
        WHERE tm.team_id = ?
        ORDER BY a.ign
        LIMIT 25
      `).all(teamId);

      if (!members.length) {
        return interaction.reply({
          content: `**${team.name}** has no members to remove.`,
          ephemeral: true,
        });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`team_remove_select:${teamId}`)
        .setPlaceholder('Choose a player to remove...')
        .addOptions(members.map(m => ({
          label: m.ign ?? m.username ?? `User ${m.user_id}`,
          description: `<@${m.user_id}>`,
          value: m.user_id,
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(`➖  Remove Player from ${team.name}`)
          .setDescription('Select the player to remove from this team.')
          .setColor(parseColor(team.color))],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    // ── captain ───────────────────────────────────────────────────────────────
    if (action === 'captain') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: 'Administrator only.', ephemeral: true });
      }

      const members = db.prepare(`
        SELECT tm.user_id, a.ign, a.username
        FROM team_members tm
        LEFT JOIN applications a ON a.user_id = tm.user_id AND a.type = 'player'
        WHERE tm.team_id = ?
        ORDER BY a.ign
        LIMIT 25
      `).all(teamId);

      if (!members.length) {
        return interaction.reply({
          content: `**${team.name}** has no members. Add players first.`,
          ephemeral: true,
        });
      }

      const currentCap = team.captain_discord_id;
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`team_captain_select:${teamId}`)
        .setPlaceholder('Choose the new captain...')
        .addOptions(members.map(m => ({
          label: m.ign ?? m.username ?? `User ${m.user_id}`,
          description: m.user_id === currentCap ? 'Current Captain' : `<@${m.user_id}>`,
          value: m.user_id,
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(`👑  Set Captain — ${team.name}`)
          .setDescription(`**Current Captain:** ${currentCap ? `<@${currentCap}>` : 'None'}\n\nSelect the new captain.`)
          .setColor(parseColor(team.color))],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    // ── message ───────────────────────────────────────────────────────────────
    if (action === 'message') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ content: 'Administrator only.', ephemeral: true });
      }

      const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId(`team_panel_message_modal:${teamId}`)
        .setTitle(`Message ${team.name}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('message')
            .setLabel('Message to send to all team members')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000),
        ),
      );
      return interaction.showModal(modal);
    }
  },
};
