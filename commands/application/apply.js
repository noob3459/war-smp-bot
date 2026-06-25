const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Apply to join WAR SMP'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('WAR SMP — Player Application')
      .setDescription(
        'Want to join WAR SMP? Click the button below to fill out your application.\n' +
        'Staff will review it and reach out to you here on Discord.',
      )
      .addFields({
        name: 'Before You Apply',
        value: '- Must have an active Minecraft Java account\n- Read and agree to the server rules\n- Microphone recommended',
      })
      .setColor(0xe74c3c)
      .setFooter({ text: 'WAR SMP Applications' })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('apply_open')
      .setLabel('Open Application')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
