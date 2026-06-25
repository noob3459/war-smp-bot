const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { deactivateLog, getModLog } = require('../../utils/modActions');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning by case ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(o => o.setName('case_id').setDescription('Warning case ID').setRequired(true).setMinValue(1)),

  async execute(interaction, client) {
    const id      = interaction.options.getInteger('case_id');
    const entry   = getModLog(id);

    if (!entry || entry.action !== 'warn') {
      return interaction.reply({ content: `Case #${id} is not a warning.`, ephemeral: true });
    }
    if (!entry.active) {
      return interaction.reply({ content: `Case #${id} has already been removed.`, ephemeral: true });
    }

    deactivateLog(id);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Warning Removed')
        .addFields(
          { name: 'Case ID', value: `#${id}`,          inline: true },
          { name: 'User',    value: `<@${entry.user_id}>`, inline: true },
          { name: 'Reason',  value: entry.reason,       inline: false },
        )
        .setColor(0x00cc88).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Warning Removed', color: 0x00cc88,
      fields: [
        { name: 'Case ID',    value: `#${id}`,                              inline: true },
        { name: 'User',       value: `<@${entry.user_id}>`,                 inline: true },
        { name: 'Removed By', value: `<@${interaction.user.id}>`,           inline: true },
      ],
    });
  },
};
