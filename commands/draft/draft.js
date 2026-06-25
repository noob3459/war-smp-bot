const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const cfg = require('../../utils/config');
const { getActiveDraft, getCurrentTeamId, getAvailablePlayers, getDraftPicks } = require('../../utils/draftUtils');
const { getActiveSeason } = require('../../utils/season');
const { isAdmin } = require('../../utils/permissions');

function buildDraftEmbed(draft, picks, availablePlayers) {
  const order   = JSON.parse(draft.draft_order);
  const teamId  = getCurrentTeamId(draft);
  const team    = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  const captain = team?.captain_discord_id;

  const embed = new EmbedBuilder()
    .setTitle(`Live Draft — Round ${draft.current_round}`)
    .setColor(0x5865f2)
    .setTimestamp();

  // Current pick
  embed.setDescription(
    `**Now picking:** ${team ? `**${team.name}**` : 'Unknown team'} ` +
    `${captain ? `(<@${captain}>)` : ''}` +
    `\nPick **${draft.total_picks + 1}** of this draft`,
  );

  // Draft order display
  const orderDisplay = order.map(tid => {
    const t = db.prepare('SELECT * FROM teams WHERE id = ?').get(tid);
    return tid === teamId ? `**→ ${t?.name ?? tid}**` : (t?.name ?? tid);
  }).join(' → ');
  embed.addFields({ name: `Round ${draft.current_round} Order${draft.snake ? ' (Snake)' : ''}`, value: orderDisplay, inline: false });

  // Recent picks (last 10)
  if (picks.length) {
    const pickLines = picks.slice(-10).map(p =>
      `**#${p.pick_num}** Rd${p.round} — **${p.team_name}** picked **${p.username}** (${p.ign ?? p.user_id})`,
    );
    embed.addFields({ name: 'Recent Picks', value: pickLines.join('\n'), inline: false });
  }

  embed.setFooter({ text: `${availablePlayers.length} player${availablePlayers.length !== 1 ? 's' : ''} remaining` });
  return embed;
}

function buildPickMenu(draftId, players) {
  const options = players.slice(0, 25).map(p => ({
    label: p.username.slice(0, 100),
    description: `IGN: ${p.ign ?? 'N/A'} | PvP: ${p.pvp_rating ?? '?'}/10 | Build: ${p.building_rating ?? '?'}/10`.slice(0, 100),
    value: p.user_id,
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`draft_pick:${draftId}`)
      .setPlaceholder('Select a player to draft...')
      .addOptions(options),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('draft')
    .setDescription('Team draft management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s
      .setName('start')
      .setDescription('Start a player draft (Admin)')
      .addBooleanOption(o => o.setName('snake').setDescription('Use snake draft order (default: true)')),
    )
    .addSubcommand(s => s.setName('status').setDescription('View current draft state'))
    .addSubcommand(s => s.setName('cancel').setDescription('Cancel the active draft (Admin)')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── start ─────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: 'Only admins can start a draft.', ephemeral: true });

      const existing = getActiveDraft();
      if (existing) return interaction.reply({ content: 'A draft is already in progress. Cancel it first with `/draft cancel`.', ephemeral: true });

      const players = getAvailablePlayers();
      if (!players.length) return interaction.reply({ content: 'No accepted players available to draft (no accepted applications without a team).', ephemeral: true });

      const teams = db.prepare('SELECT * FROM teams WHERE captain_discord_id IS NOT NULL').all();
      if (teams.length < 2) return interaction.reply({ content: 'At least 2 teams with assigned captains are required to start a draft.', ephemeral: true });

      const snake  = interaction.options.getBoolean('snake') ?? true;
      const season = getActiveSeason();

      // Randomize draft order
      const order = [...teams.map(t => t.id)].sort(() => Math.random() - 0.5);

      const result  = db.prepare(
        'INSERT INTO draft_sessions (season_id, draft_order, snake, channel_id, created_by) VALUES (?, ?, ?, ?, ?)',
      ).run(season?.id ?? null, JSON.stringify(order), snake ? 1 : 0, interaction.channelId, interaction.user.id);

      const draft    = db.prepare('SELECT * FROM draft_sessions WHERE id = ?').get(result.lastInsertRowid);
      const embed    = buildDraftEmbed(draft, [], players);
      const menu     = buildPickMenu(draft.id, players);

      const ch  = cfg.get('channel.drafts');
      let target = interaction.channel;
      if (ch) {
        try { target = await client.channels.fetch(ch); } catch { /* use current channel */ }
      }

      const msg = await target.send({ embeds: [embed], components: [menu] });
      db.prepare('UPDATE draft_sessions SET channel_id = ?, message_id = ? WHERE id = ?').run(target.id, msg.id, draft.id);

      if (target.id !== interaction.channelId) {
        return interaction.reply({ content: `Draft started in <#${target.id}>.`, ephemeral: true });
      }
      return interaction.reply({ content: 'Draft started!', ephemeral: true });
    }

    // ── status ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const draft = getActiveDraft();
      if (!draft) return interaction.reply({ content: 'No draft is currently active.', ephemeral: true });

      const picks   = getDraftPicks(draft.id);
      const players = getAvailablePlayers();
      return interaction.reply({ embeds: [buildDraftEmbed(draft, picks, players)], ephemeral: true });
    }

    // ── cancel ────────────────────────────────────────────────────────────────
    if (sub === 'cancel') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: 'Only admins can cancel a draft.', ephemeral: true });

      const draft = getActiveDraft();
      if (!draft) return interaction.reply({ content: 'No active draft to cancel.', ephemeral: true });

      db.prepare("UPDATE draft_sessions SET status = 'cancelled' WHERE id = ?").run(draft.id);

      // Disable the draft message
      if (draft.channel_id && draft.message_id) {
        try {
          const ch  = await client.channels.fetch(draft.channel_id);
          const msg = await ch.messages.fetch(draft.message_id);
          await msg.edit({ content: '~~Draft cancelled.~~', components: [] });
        } catch { /* already deleted */ }
      }

      return interaction.reply({ content: 'Draft cancelled.', ephemeral: true });
    }
  },
};
