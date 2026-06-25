const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffapply')
    .setDescription('Apply for a staff position on WAR SMP'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('WAR SMP — Staff Application')
      .setDescription(
        'Interested in joining the WAR SMP staff team? Click the button below to submit your application.\n' +
        'Senior staff will review applications and follow up via Discord.',
      )
      .addFields({
        name: 'Requirements',
        value: '- Active WAR SMP member\n- 14+ years old\n- Prior moderation experience preferred\n- Available 10+ hours/week',
      })
      .setColor(0xf1c40f)
      .setFooter({ text: 'WAR SMP Staff Applications' })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('staffapply_open')
      .setLabel('Open Staff Application')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
