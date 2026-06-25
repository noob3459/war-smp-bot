const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const db = require('../../database/db');
const { isAdmin } = require('../../utils/permissions');
const { setPanel } = require('../../utils/panelManager');

function buildApplyPanelEmbed() {
  const total     = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE type = 'player'").get().c;
  const pending   = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE type = 'player' AND status = 'pending'").get().c;
  const accepted  = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE type = 'player' AND status = 'accepted'").get().c;
  const denied    = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE type = 'player' AND status = 'denied'").get().c;

  // Average review time (accepted + denied only)
  const reviewTimes = db.prepare(`
    SELECT (julianday(reviewed_at) - julianday(submitted_at)) * 24 AS hours
    FROM applications
    WHERE type = 'player' AND status IN ('accepted','denied') AND reviewed_at IS NOT NULL
  `).all();

  let avgReview = 'N/A';
  if (reviewTimes.length) {
    const avg = reviewTimes.reduce((s, r) => s + r.hours, 0) / reviewTimes.length;
    avgReview = avg < 1 ? `${Math.round(avg * 60)}m` : `${avg.toFixed(1)}h`;
  }

  return new EmbedBuilder()
    .setTitle('⚔️ WAR SMP Whitelist Application')
    .setDescription(
      'Welcome to WAR SMP!\n\n' +
      'Complete an application to be considered for whitelist.\n\n' +
      '**Applications are used to:**\n' +
      '• Balance teams\n' +
      '• Match skill levels\n' +
      '• Match activity levels\n' +
      '• Match time zones\n' +
      '• Build a competitive community',
    )
    .addFields(
      { name: '━━━━━━━━━━━━━━━━━━━━━━', value: '**Live Statistics**', inline: false },
      { name: 'Applicants',          value: String(total),    inline: true },
      { name: 'Pending',             value: String(pending),  inline: true },
      { name: 'Accepted',            value: String(accepted), inline: true },
      { name: 'Denied',              value: String(denied),   inline: true },
      { name: 'Avg Review Time',     value: avgReview,        inline: true },
    )
    .setColor(0xe74c3c)
    .setFooter({ text: 'WAR SMP • Whitelist Applications' })
    .setTimestamp();
}

function buildApplyPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('apply_open').setLabel('Apply').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('panel_my_app').setLabel('My Application').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_edit_app').setLabel('Edit Application').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
      new ButtonBuilder().setCustomId('panel_withdraw_app').setLabel('Withdraw Application').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    ),
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply-panel')
    .setDescription('Post the permanent player application panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  buildApplyPanelEmbed,
  buildApplyPanelComponents,

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const embed      = buildApplyPanelEmbed();
    const components = buildApplyPanelComponents();

    const msg = await interaction.channel.send({ embeds: [embed], components });
    setPanel('apply_panel', interaction.channel.id, msg.id);

    await interaction.editReply({ content: 'Application panel posted and saved.' });
  },
};
