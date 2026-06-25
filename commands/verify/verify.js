const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verification management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Post the verification panel to this channel'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'panel') return;

    const embed = new EmbedBuilder()
      .setTitle('Server Verification')
      .setDescription(
        'Welcome! Click the button below to verify your account and gain access to the server.\n\n' +
        'By verifying, you agree to follow the server rules.',
      )
      .setColor(0x00cc88);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_member')
        .setLabel('Verify Me')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Verification panel posted.', ephemeral: true });
  },
};
