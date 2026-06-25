const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { parseColor } = require('../utils/teamEmbed');
const { getActiveSeason, getAllTeamStats } = require('../utils/season');

const TEAM_COLORS = {
  pending:   0x99aab5,
  accepted:  0x00cc88,
};

module.exports = {
  customId: 'admin_teams',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const action = interaction.customId.split(':')[1];

    // ── view / browser ───────────────────────────────────────────────────────
    if (action === 'view') {
      await interaction.deferReply({ ephemeral: true });
      const teams = db.prepare(`
        SELECT t.*, COUNT(tm.user_id) AS member_count
        FROM teams t LEFT JOIN team_members tm ON tm.team_id = t.id
        GROUP BY t.id ORDER BY t.name
      `).all();

      if (!teams.length) {
        return interaction.editReply({ content: 'No teams have been created yet.' });
      }

      const embeds = teams.map(t => {
        const capLine = t.captain_discord_id ? `👑 <@${t.captain_discord_id}>` : '👑 *No captain*';
        const fill    = `${t.member_count}/${t.max_players}`;
        return new EmbedBuilder()
          .setTitle(`${t.name}`)
          .setDescription(`${capLine}\n👥 **${fill} Players**`)
          .setColor(parseColor(t.color))
          .setFooter({ text: `Team ID: ${t.id}` });
      });

      // One "Open Panel" button per team — max 5 rows × 5 buttons = 25 teams
      const rows = [];
      for (let i = 0; i < Math.min(teams.length, 25); i++) {
        const rowIdx = Math.floor(i / 5);
        if (!rows[rowIdx]) rows[rowIdx] = new ActionRowBuilder();
        rows[rowIdx].addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_team_open:${teams[i].id}`)
            .setLabel(teams[i].name)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📂'),
        );
      }

      return interaction.editReply({ embeds: embeds.slice(0, 10), components: rows });
    }

    // ── stats ────────────────────────────────────────────────────────────────
    if (action === 'stats') {
      await interaction.deferReply({ ephemeral: true });
      const season = getActiveSeason();
      if (!season) {
        return interaction.editReply({ content: 'No active season. Start a season to view statistics.' });
      }
      const stats = getAllTeamStats(season.id);
      const embed = new EmbedBuilder()
        .setTitle(`📊  Team Statistics — ${season.name}`)
        .setColor(0x9b59b6)
        .setTimestamp();

      for (const s of stats) {
        const kd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2);
        embed.addFields({
          name: s.team_name,
          value: `🏆 **${s.wins}W** ❌ **${s.losses}L** ⚔️ ${s.kills}K/${s.deaths}D (${kd} KDR)`,
          inline: false,
        });
      }
      if (!stats.length) embed.setDescription('No statistics recorded yet.');
      return interaction.editReply({ embeds: [embed] });
    }

    // ── balance ──────────────────────────────────────────────────────────────
    if (action === 'balance') {
      const embed = new EmbedBuilder()
        .setTitle('⚖️  Balance Teams')
        .setDescription(
          'Auto-balancing redistributes all players across teams based on PvP, building, and activity scores.\n\n' +
          '**Use `/team balance` to confirm and execute.**',
        )
        .setColor(0xf39c12);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── assign — Step 1: Choose Team ─────────────────────────────────────────
    if (action === 'assign') {
      const teams = db.prepare(`
        SELECT t.*, COUNT(tm.user_id) AS member_count
        FROM teams t LEFT JOIN team_members tm ON tm.team_id = t.id
        GROUP BY t.id ORDER BY t.name
      `).all();

      if (!teams.length) {
        return interaction.reply({ content: 'No teams exist yet. Create a team first.', ephemeral: true });
      }

      const eligibleCount = db.prepare(`
        SELECT COUNT(*) AS c FROM applications a
        WHERE a.type = 'player' AND a.status = 'accepted'
          AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = a.user_id)
      `).get().c;

      if (!eligibleCount) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('No Eligible Players')
            .setDescription('All accepted players are already assigned to teams.')
            .setColor(0xe74c3c)],
          ephemeral: true,
        });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('admin_assign_team_select')
        .setPlaceholder('Step 1 — Choose a team...')
        .addOptions(teams.slice(0, 25).map(t => ({
          label: t.name,
          description: `${t.member_count}/${t.max_players} players`,
          value: String(t.id),
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('➕  Assign Player — Step 1')
          .setDescription('Choose a team to assign a player to.')
          .setColor(0x5865f2)],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    // ── remove — Step 1: Choose Team ─────────────────────────────────────────
    if (action === 'remove') {
      const teams = db.prepare(`
        SELECT t.*, COUNT(tm.user_id) AS member_count
        FROM teams t
        INNER JOIN team_members tm ON tm.team_id = t.id
        GROUP BY t.id HAVING member_count > 0 ORDER BY t.name
      `).all();

      if (!teams.length) {
        return interaction.reply({ content: 'No teams have any members to remove.', ephemeral: true });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('admin_remove_team_select')
        .setPlaceholder('Step 1 — Choose a team...')
        .addOptions(teams.slice(0, 25).map(t => ({
          label: t.name,
          description: `${t.member_count} player${t.member_count === 1 ? '' : 's'}`,
          value: String(t.id),
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('➖  Remove Player — Step 1')
          .setDescription('Choose the team to remove a player from.')
          .setColor(0xe74c3c)],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    // ── captain — Step 1: Choose Team ────────────────────────────────────────
    if (action === 'captain') {
      const teams = db.prepare(`
        SELECT t.*, COUNT(tm.user_id) AS member_count
        FROM teams t
        INNER JOIN team_members tm ON tm.team_id = t.id
        GROUP BY t.id HAVING member_count > 0 ORDER BY t.name
      `).all();

      if (!teams.length) {
        return interaction.reply({ content: 'No teams have members yet.', ephemeral: true });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('admin_captain_team_select')
        .setPlaceholder('Step 1 — Choose a team...')
        .addOptions(teams.slice(0, 25).map(t => ({
          label: t.name,
          description: t.captain_discord_id ? 'Has captain' : 'No captain',
          value: String(t.id),
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('👑  Set Captain — Step 1')
          .setDescription('Choose the team to assign a captain to.')
          .setColor(0xf39c12)],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    // ── swap ─────────────────────────────────────────────────────────────────
    if (action === 'swap') {
      const modal = new ModalBuilder()
        .setCustomId('admin_swap_players_modal')
        .setTitle('Swap Players Between Teams');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user1_id')
            .setLabel('First Player Discord ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 123456789012345678')
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user2_id')
            .setLabel('Second Player Discord ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 987654321098765432')
            .setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }

    // ── create ───────────────────────────────────────────────────────────────
    if (action === 'create') {
      const modal = new ModalBuilder()
        .setCustomId('admin_team_create_modal')
        .setTitle('Create New Team');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Team Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(30),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Color (hex, e.g. #e74c3c)')
            .setStyle(TextInputStyle.Short)
            .setValue('#99aab5')
            .setRequired(true)
            .setMaxLength(7),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('max_players')
            .setLabel('Max Players (1–50)')
            .setStyle(TextInputStyle.Short)
            .setValue('10')
            .setRequired(true)
            .setMaxLength(2),
        ),
      );
      return interaction.showModal(modal);
    }
  },
};
