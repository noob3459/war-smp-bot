const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const STATUS_COLORS = {
  pending:   0xf39c12,
  accepted:  0x00cc88,
  denied:    0xe74c3c,
  withdrawn: 0x95a5a6,
};

const STATUS_LABELS = {
  pending:   'Pending',
  accepted:  'Accepted',
  denied:    'Denied',
  withdrawn: 'Withdrawn',
};

function buildReviewEmbed(application, user) {
  const submittedAt = toDate(application.submitted_at);
  const submittedTs = Math.floor(submittedAt.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle(`Application #${application.id} — ${STATUS_LABELS[application.status] ?? 'Unknown'}`)
    .setThumbnail(user?.displayAvatarURL() ?? null)
    .setColor(STATUS_COLORS[application.status] ?? 0x99aab5)
    .addFields(
      { name: 'Discord User',       value: `<@${application.user_id}> (${application.username})`, inline: false },
      { name: 'Minecraft Username', value: application.ign,                                        inline: true  },
      { name: 'Timezone',           value: application.timezone       ?? 'N/A',                    inline: true  },
      { name: 'PvP Rating',         value: `${application.pvp_rating ?? 'N/A'} / 10`,              inline: true  },
      { name: 'Building Rating',    value: `${application.building_rating ?? 'N/A'} / 10`,         inline: true  },
      { name: 'Hours Per Week',     value: application.hours_per_week ?? 'N/A',                    inline: true  },
      { name: 'Submitted',          value: `<t:${submittedTs}:F>`,                                 inline: true  },
    )
    .setFooter({ text: `Application ID: ${application.id}` })
    .setTimestamp(submittedAt);

  if (application.team) {
    embed.addFields({ name: 'Assigned Team', value: application.team, inline: true });
  }

  if (application.reviewed_by) {
    const reviewedTs = Math.floor(toDate(application.reviewed_at).getTime() / 1000);
    embed.addFields({ name: 'Reviewed', value: `<@${application.reviewed_by}> — <t:${reviewedTs}:R>`, inline: false });
  }

  const components = buildReviewButtons(application.id, application.status !== 'pending');
  return { embed, components };
}

function buildReviewButtons(appId, disabled = false) {
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_accept:${appId}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`review_deny:${appId}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`review_changes:${appId}`)
      .setLabel('Request Changes')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✏️')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`review_team:${appId}`)
      .setLabel('Assign Team')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⚔️')
      .setDisabled(disabled),
  );

  const infoRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_profile:${appId}`)
      .setLabel('View Profile')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤'),
    new ButtonBuilder()
      .setCustomId(`review_history:${appId}`)
      .setLabel('View History')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜'),
  );

  return [actionRow, infoRow];
}

function toDate(sqliteStr) {
  if (!sqliteStr) return new Date();
  return new Date(sqliteStr.replace(' ', 'T') + 'Z');
}

module.exports = { buildReviewEmbed, buildReviewButtons, STATUS_COLORS, STATUS_LABELS, toDate };
