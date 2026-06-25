const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdrawapplication')
    .setDescription('Withdraw your pending player application'),

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' AND status = 'pending'`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        content: "You don't have a pending application to withdraw.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Withdraw Application')
      .setDescription('Are you sure you want to withdraw your application? This cannot be undone.')
      .setColor(0xe74c3c);

    const confirm = new ButtonBuilder()
      .setCustomId(`withdraw_confirm:${application.id}`)
      .setLabel('Yes, Withdraw')
      .setStyle(ButtonStyle.Danger);

    const cancel = new ButtonBuilder()
      .setCustomId('withdraw_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(confirm, cancel)],
      ephemeral: true,
    });
  },
};
