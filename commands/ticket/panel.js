const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const TICKET_TYPES = [
  { id: 'general',     label: 'General Support',      emoji: '❓' },
  { id: 'report',      label: 'Report Player',         emoji: '🚨' },
  { id: 'appeal',      label: 'Appeal Punishment',     emoji: '⚖️' },
  { id: 'application', label: 'Application Help',      emoji: '📝' },
  { id: 'staff',       label: 'Contact Staff',         emoji: '👮' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Post the ticket panel to this channel'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'panel') return;

    const embed = new EmbedBuilder()
      .setTitle('Support Tickets')
      .setDescription(
        'Need help? Open a ticket by clicking the button that best matches your request.\n\n' +
        TICKET_TYPES.map(t => `${t.emoji} **${t.label}**`).join('\n'),
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'One open ticket per person' });

    const row = new ActionRowBuilder().addComponents(
      ...TICKET_TYPES.map(t =>
        new ButtonBuilder()
          .setCustomId(`ticket_open:${t.id}`)
          .setLabel(t.label)
          .setEmoji(t.emoji)
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
  },
};
