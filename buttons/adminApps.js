const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { STATUS_COLORS, toDate } = require('../utils/applicationEmbed');
const { buildReviewButtons } = require('../utils/applicationEmbed');

const STATUS_EMOJI = {
  pending:   '🟡',
  accepted:  '🟢',
  denied:    '🔴',
  withdrawn: '⚫',
};

const STATUS_LABEL = {
  pending:   'Pending Review',
  accepted:  'Accepted',
  denied:    'Denied',
  withdrawn: 'Withdrawn',
};

function buildSingleAppEmbed(app, user, index, total, status) {
  const submittedTs = Math.floor(toDate(app.submitted_at).getTime() / 1000);
  const color = STATUS_COLORS[app.status] ?? 0x99aab5;
  const emoji = STATUS_EMOJI[app.status] ?? '⚪';

  const embed = new EmbedBuilder()
    .setTitle(`${emoji}  Application #${app.id}`)
    .setColor(color)
    .setThumbnail(user?.displayAvatarURL() ?? null)
    .setFooter({ text: `${index + 1} / ${total} ${status.charAt(0).toUpperCase() + status.slice(1)} • App #${app.id}` })
    .setTimestamp();

  // Header info block
  const statusBadge = STATUS_LABEL[app.status] ?? app.status;
  embed.setDescription(
    `**Status:** ${emoji} ${statusBadge}\n` +
    `**Submitted:** <t:${submittedTs}:R> *(${new Date(app.submitted_at.replace(' ', 'T') + 'Z').toUTCString().slice(5, 22)})*`,
  );

  embed.addFields(
    { name: '👤  Discord',   value: `<@${app.user_id}>\n\`${app.username}\``, inline: true },
    { name: '⛏  Minecraft',  value: app.ign ?? 'N/A',                         inline: true },
    { name: '🌍  Timezone',  value: app.timezone ?? 'N/A',                     inline: true },
    { name: '⚔️  PvP',       value: app.pvp_rating    ? `${app.pvp_rating}/10`      : 'N/A', inline: true },
    { name: '🏗  Building',  value: app.building_rating ? `${app.building_rating}/10` : 'N/A', inline: true },
    { name: '🕒  Hrs/Week',  value: app.hours_per_week ?? 'N/A',               inline: true },
  );

  if (app.team) {
    embed.addFields({ name: '⚔️  Assigned Team', value: app.team, inline: true });
  }

  if (app.reviewed_by) {
    const reviewedTs = Math.floor(toDate(app.reviewed_at).getTime() / 1000);
    embed.addFields({
      name: '👁  Reviewed By',
      value: `<@${app.reviewed_by}> — <t:${reviewedTs}:R>`,
      inline: false,
    });
  }

  if (app.denial_reason) {
    embed.addFields({ name: '📝  Denial Reason', value: app.denial_reason, inline: false });
  }

  return embed;
}

function buildNavRow(status, index, total, appId, isPending) {
  const prev = index > 0;
  const next = index < total - 1;

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_apps_page:${status}:${index - 1}`)
      .setLabel('◀  Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!prev),
    new ButtonBuilder()
      .setCustomId(`admin_apps_page:${status}:${index + 1}`)
      .setLabel('Next  ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!next),
  );

  return navRow;
}

async function handleBrowser(interaction, status, index, client) {
  const isUpdate = interaction.replied || interaction.deferred;
  if (!isUpdate) await interaction.deferReply({ ephemeral: true });
  if (!client) client = interaction.client;

  const total = db.prepare(`SELECT COUNT(*) AS c FROM applications WHERE type = 'player' AND status = ?`).get(status).c;

  if (!total) {
    const method = isUpdate ? 'editReply' : 'editReply';
    return interaction[method]({
      embeds: [new EmbedBuilder()
        .setTitle(`${STATUS_EMOJI[status] ?? '⚪'}  ${status.charAt(0).toUpperCase() + status.slice(1)} Applications`)
        .setDescription('No applications found.')
        .setColor(STATUS_COLORS[status] ?? 0x99aab5)],
      components: [],
    });
  }

  const clampedIndex = Math.max(0, Math.min(index, total - 1));
  const app = db.prepare(`
    SELECT * FROM applications WHERE type = 'player' AND status = ? ORDER BY id DESC LIMIT 1 OFFSET ?
  `).get(status, clampedIndex);

  if (!app) return interaction.editReply({ content: 'Application not found.', components: [] });

  let user = null;
  try { user = await client.users.fetch(app.user_id); } catch {}

  const embed = buildSingleAppEmbed(app, user, clampedIndex, total, status);
  const navRow = buildNavRow(status, clampedIndex, total, app.id, app.status === 'pending');

  const components = [navRow];

  if (app.status === 'pending') {
    components.push(...buildReviewButtons(app.id, false));
  } else if (app.status === 'accepted') {
    // Accepted view — assign team + history
    const acceptedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`review_team:${app.id}`)
        .setLabel('Assign Team')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId(`review_profile:${app.id}`)
        .setLabel('View Profile')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👤'),
      new ButtonBuilder()
        .setCustomId(`review_history:${app.id}`)
        .setLabel('History')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜'),
    );
    components.push(acceptedRow);
  } else if (app.status === 'denied') {
    // Denied view — allow reopening
    const deniedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`app_reopen:${app.id}`)
        .setLabel('Reopen Application')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId(`review_profile:${app.id}`)
        .setLabel('View Profile')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👤'),
      new ButtonBuilder()
        .setCustomId(`review_history:${app.id}`)
        .setLabel('History')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜'),
    );
    components.push(deniedRow);
  }

  await interaction.editReply({ embeds: [embed], components });
}

module.exports = {
  customId: 'admin_apps',

  handleBrowser,

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    const action = interaction.customId.split(':')[1];

    if (['pending', 'accepted', 'denied', 'withdrawn'].includes(action)) {
      return handleBrowser(interaction, action, 0, client);
    }

    if (action === 'search') {
      const modal = new ModalBuilder()
        .setCustomId('admin_search_modal')
        .setTitle('Search Applications');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('query')
            .setLabel('Search by Discord ID, IGN, App ID, or Status')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g.  PlayerName  or  42  or  accepted')
            .setRequired(true)
            .setMaxLength(100),
        ),
      );
      return interaction.showModal(modal);
    }
  },
};
