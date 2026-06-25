const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { setPanel } = require('../../utils/panelManager');

// Each section is its own message so we stay within Discord's 5-row limit
// and each panel can be independently refreshed.

function buildAppsPanel() {
  const db = require('../../database/db');
  const pending   = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status='pending'   AND type='player'").get().c;
  const accepted  = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status='accepted'  AND type='player'").get().c;
  const denied    = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status='denied'    AND type='player'").get().c;
  const withdrawn = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status='withdrawn' AND type='player'").get().c;

  const embed = new EmbedBuilder()
    .setTitle('📋  Applications')
    .setDescription('Browse, review, and manage player applications.')
    .setColor(0x5865f2)
    .addFields(
      { name: '🟡  Pending',   value: `**${pending}**`,   inline: true },
      { name: '🟢  Accepted',  value: `**${accepted}**`,  inline: true },
      { name: '🔴  Denied',    value: `**${denied}**`,    inline: true },
      { name: '⚫  Withdrawn', value: `**${withdrawn}**`, inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_apps:pending').setLabel(`Pending (${pending})`).setStyle(ButtonStyle.Primary).setEmoji('🟡'),
    new ButtonBuilder().setCustomId('admin_apps:accepted').setLabel('Accepted').setStyle(ButtonStyle.Success).setEmoji('🟢'),
    new ButtonBuilder().setCustomId('admin_apps:denied').setLabel('Denied').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
    new ButtonBuilder().setCustomId('admin_apps:withdrawn').setLabel('Withdrawn').setStyle(ButtonStyle.Secondary).setEmoji('⚫'),
    new ButtonBuilder().setCustomId('admin_apps:search').setLabel('Search').setStyle(ButtonStyle.Secondary).setEmoji('🔍'),
  );

  return { embeds: [embed], components: [row] };
}

function buildTeamsPanel() {
  const embed = new EmbedBuilder()
    .setTitle('👥  Teams')
    .setDescription('Create, manage, and balance player teams.')
    .setColor(0xf39c12);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_teams:view').setLabel('Team Browser').setStyle(ButtonStyle.Primary).setEmoji('📂'),
    new ButtonBuilder().setCustomId('admin_teams:assign').setLabel('Assign Player').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId('admin_teams:remove').setLabel('Remove Player').setStyle(ButtonStyle.Danger).setEmoji('➖'),
    new ButtonBuilder().setCustomId('admin_teams:captain').setLabel('Set Captain').setStyle(ButtonStyle.Primary).setEmoji('👑'),
    new ButtonBuilder().setCustomId('admin_teams:swap').setLabel('Swap Players').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_teams:create').setLabel('Create Team').setStyle(ButtonStyle.Success).setEmoji('✨'),
    new ButtonBuilder().setCustomId('admin_teams:balance').setLabel('Auto Balance').setStyle(ButtonStyle.Secondary).setEmoji('⚖️'),
    new ButtonBuilder().setCustomId('admin_teams:stats').setLabel('Statistics').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
  );

  return { embeds: [embed], components: [row1, row2] };
}

function buildModPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Moderation')
    .setDescription('Manage warnings, punishments, tickets, and logs.')
    .setColor(0xe74c3c);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_mod:warnings').setLabel('Warnings').setStyle(ButtonStyle.Secondary).setEmoji('⚠️'),
    new ButtonBuilder().setCustomId('admin_mod:punishments').setLabel('Punishments').setStyle(ButtonStyle.Danger).setEmoji('🔨'),
    new ButtonBuilder().setCustomId('admin_mod:tickets').setLabel('Tickets').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    new ButtonBuilder().setCustomId('admin_mod:logs').setLabel('Logs').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
  );

  return { embeds: [embed], components: [row] };
}

function buildEventsPanel() {
  const embed = new EmbedBuilder()
    .setTitle('📅 Events')
    .setDescription('Create events, control the draft, and manage seasons.')
    .setColor(0x9b59b6);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_events:create').setLabel('Create Event').setStyle(ButtonStyle.Success).setEmoji('📅'),
    new ButtonBuilder().setCustomId('admin_events:draft').setLabel('Draft Controls').setStyle(ButtonStyle.Primary).setEmoji('⚡'),
    new ButtonBuilder().setCustomId('admin_events:season').setLabel('Season Controls').setStyle(ButtonStyle.Primary).setEmoji('🏆'),
    new ButtonBuilder().setCustomId('admin_events:ready').setLabel('Ready Status').setStyle(ButtonStyle.Secondary).setEmoji('✅'),
  );

  return { embeds: [embed], components: [row] };
}

function buildServerPanel() {
  const embed = new EmbedBuilder()
    .setTitle('⚙️  Server')
    .setDescription('Dashboard, settings, backup, and restore.')
    .setColor(0x2ecc71);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_server:dashboard').setLabel('Dashboard').setStyle(ButtonStyle.Primary).setEmoji('📊'),
    new ButtonBuilder().setCustomId('dashboard_refresh').setLabel('Live Stats').setStyle(ButtonStyle.Primary).setEmoji('⚡'),
    new ButtonBuilder().setCustomId('admin_server:settings').setLabel('Settings').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
    new ButtonBuilder().setCustomId('admin_server:backup').setLabel('Backup').setStyle(ButtonStyle.Success).setEmoji('💾'),
    new ButtonBuilder().setCustomId('admin_server:restore').setLabel('Restore').setStyle(ButtonStyle.Danger).setEmoji('🔁'),
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-panel')
    .setDescription('Post the permanent administrator control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const sections = [
      { key: 'admin_panel_apps',    payload: buildAppsPanel() },
      { key: 'admin_panel_teams',   payload: buildTeamsPanel() },
      { key: 'admin_panel_mod',     payload: buildModPanel() },
      { key: 'admin_panel_events',  payload: buildEventsPanel() },
      { key: 'admin_panel_server',  payload: buildServerPanel() },
    ];

    for (const { key, payload } of sections) {
      const msg = await interaction.channel.send(payload);
      setPanel(key, interaction.channel.id, msg.id);
    }

    await interaction.editReply({ content: 'Admin control panel posted. All 5 sections are now live.' });
  },
};
