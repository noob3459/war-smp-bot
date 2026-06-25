const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addModLog } = require('../../utils/modActions');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .addIntegerOption(o => o.setName('delete_days').setDescription('Days of messages to delete (0–7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction, client) {
    const target     = interaction.options.getMember('user');
    const reason     = interaction.options.getString('reason') ?? 'No reason provided';
    const delDays    = interaction.options.getInteger('delete_days') ?? 0;

    if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: 'I cannot ban this member.', ephemeral: true });

    target.user.send({
      embeds: [new EmbedBuilder()
        .setTitle('You Have Been Banned')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}`)
        .setColor(0xe74c3c).setTimestamp()],
    }).catch(() => {});

    await target.ban({ reason, deleteMessageSeconds: delDays * 86400 });
    addModLog({ userId: target.id, username: target.user.tag, modId: interaction.user.id, modName: interaction.user.tag, action: 'ban', reason });

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Member Banned')
        .addFields(
          { name: 'User',            value: target.user.tag, inline: true },
          { name: 'Messages Deleted', value: `${delDays}d`,  inline: true },
          { name: 'Reason',           value: reason,         inline: false },
        ).setColor(0xe74c3c).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Member Banned', color: 0xe74c3c,
      fields: [
        { name: 'User',      value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,         inline: true },
        { name: 'Reason',    value: reason,                              inline: false },
      ],
    });
  },
};
