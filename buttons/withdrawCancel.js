module.exports = {
  customId: 'withdraw_cancel',

  async execute(interaction) {
    await interaction.update({ content: 'Withdrawal cancelled.', embeds: [], components: [] });
  },
};
