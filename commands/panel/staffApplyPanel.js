const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { setPanel } = require('../../utils/panelManager');

function buildStaffApplyPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🛡️ WAR SMP Staff Application')
    .setDescription(
      'Interested in joining the WAR SMP staff team?\n\n' +
      '**Staff are responsible for:**\n' +
      '• Reviewing player applications\n' +
      '• Managing teams and drafts\n' +
      '• Moderating the community\n' +
      '• Organizing events and seasons\n\n' +
      '**Requirements:**\n' +
      '• Active WAR SMP member\n' +
      '• 14+ years old\n' +
      '• Prior moderation experience preferred\n' +
      '• Available 10+ hours/week',
    )
    .setColor(0xf1c40f)
    .setFooter({ text: 'WAR SMP • Staff Applications' })
    .setTimestamp();
}

function buildStaffApplyPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('staffapply_open').setLabel('Apply for Staff').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
      new ButtonBuilder().setCustomId('panel_view_staff_app').setLabel('View My Staff Application').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_edit_staff_app').setLabel('Edit Staff Application').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
      new ButtonBuilder().setCustomId('panel_withdraw_staff_app').setLabel('Withdraw Staff Application').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    ),
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff-apply-panel')
    .setDescription('Post the permanent staff application panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  buildStaffApplyPanelEmbed,
  buildStaffApplyPanelComponents,

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const embed      = buildStaffApplyPanelEmbed();
    const components = buildStaffApplyPanelComponents();

    const msg = await interaction.channel.send({ embeds: [embed], components });
    setPanel('staff_apply_panel', interaction.channel.id, msg.id);

    await interaction.editReply({ content: 'Staff application panel posted and saved.' });
  },
};
