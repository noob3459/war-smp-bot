const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');
const { getActiveDraft, getCurrentTeamId, advanceDraft, getAvailablePlayers, recordPick, getDraftPicks } = require('../utils/draftUtils');
const { recordTeamHistory } = require('../utils/season');
const { getActiveSeason } = require('../utils/season');

function buildDraftEmbed(draft, picks, availablePlayers) {
  const { EmbedBuilder } = require('discord.js');
  const order  = JSON.parse(draft.draft_order);
  const teamId = getCurrentTeamId(draft);
  const team   = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);

  const embed = new EmbedBuilder()
    .setTitle(`Live Draft — Round ${draft.current_round}`)
    .setColor(teamId ? 0x5865f2 : 0x00cc88)
    .setTimestamp();

  if (teamId && team) {
    embed.setDescription(
      `**Now picking:** **${team.name}** ` +
      `${team.captain_discord_id ? `(<@${team.captain_discord_id}>)` : ''}` +
      `\nPick **${draft.total_picks + 1}** of this draft`,
    );
    const orderDisplay = order.map(tid => {
      const t = db.prepare('SELECT * FROM teams WHERE id = ?').get(tid);
      return tid === teamId ? `**→ ${t?.name}**` : t?.name;
    }).join(' → ');
    embed.addFields({ name: `Round ${draft.current_round} Order${draft.snake ? ' (Snake)' : ''}`, value: orderDisplay, inline: false });
  } else {
    embed.setDescription('**Draft complete!** All available players have been assigned.');
  }

  if (picks.length) {
    const lines = picks.slice(-10).map(p =>
      `**#${p.pick_num}** Rd${p.round} — **${p.team_name}** picked **${p.username}**`,
    );
    embed.addFields({ name: 'Recent Picks', value: lines.join('\n'), inline: false });
  }

  if (availablePlayers.length) {
    embed.setFooter({ text: `${availablePlayers.length} player${availablePlayers.length !== 1 ? 's' : ''} remaining` });
  }

  return embed;
}

module.exports = {
  customId: 'draft_pick',

  async execute(interaction, client) {
    await interaction.deferUpdate();

    const draftId = parseInt(interaction.customId.split(':')[1]);
    const draft   = db.prepare('SELECT * FROM draft_sessions WHERE id = ?').get(draftId);

    if (!draft || draft.status !== 'active') {
      return interaction.followUp({ content: 'This draft is no longer active.', ephemeral: true });
    }

    // Verify the interaction user is the captain of the current team
    const currentTeamId = getCurrentTeamId(draft);
    const currentTeam   = db.prepare('SELECT * FROM teams WHERE id = ?').get(currentTeamId);

    if (!currentTeam || currentTeam.captain_discord_id !== interaction.user.id) {
      return interaction.followUp({
        content: `It is **${currentTeam?.name ?? 'another team'}**'s turn to pick.`,
        ephemeral: true,
      });
    }

    const selectedUserId = interaction.values[0];
    // Verify player is still available (not already on a team)
    const onTeam = db.prepare('SELECT 1 FROM team_members WHERE user_id = ?').get(selectedUserId);
    if (onTeam) {
      return interaction.followUp({ content: 'That player is already on a team. Please select another.', ephemeral: true });
    }

    const player = db.prepare('SELECT * FROM applications WHERE user_id = ? AND type = "player" AND status = "accepted" LIMIT 1').get(selectedUserId);
    if (!player) {
      return interaction.followUp({ content: 'Player not found in accepted applications.', ephemeral: true });
    }

    // Add player to team
    db.prepare('INSERT OR REPLACE INTO team_members (user_id, team_id) VALUES (?, ?)').run(selectedUserId, currentTeamId);

    // Record team history
    const season = getActiveSeason();
    recordTeamHistory(selectedUserId, currentTeamId, currentTeam.name, season?.id ?? null, true);

    // Record pick
    recordPick(draftId, draft.current_round, draft.total_picks + 1, currentTeamId, selectedUserId, player.username);

    // Advance draft
    advanceDraft(draftId);

    // Get fresh draft state
    const updatedDraft   = db.prepare('SELECT * FROM draft_sessions WHERE id = ?').get(draftId);
    const picks          = getDraftPicks(draftId);
    const availablePlayers = getAvailablePlayers();

    // Check if draft is complete
    if (!availablePlayers.length) {
      db.prepare("UPDATE draft_sessions SET status = 'completed' WHERE id = ?").run(draftId);
      const embed = buildDraftEmbed({ ...updatedDraft, status: 'completed' }, picks, []);
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    // Build updated embed + menu
    const embed = buildDraftEmbed(updatedDraft, picks, availablePlayers);
    const menu  = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`draft_pick:${draftId}`)
        .setPlaceholder('Select a player to draft...')
        .addOptions(
          availablePlayers.slice(0, 25).map(p => ({
            label: p.username.slice(0, 100),
            description: `IGN: ${p.ign ?? 'N/A'} | PvP: ${p.pvp_rating ?? '?'}/10`.slice(0, 100),
            value: p.user_id,
          })),
        ),
    );

    await interaction.editReply({ embeds: [embed], components: [menu] });
  },
};
