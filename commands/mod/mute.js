const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const cfg = require('../../utils/config');
const { addModLog, parseDuration, formatDuration } = require('../../utils/modActions');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member (adds Muted role)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 30m, 7d (omit = permanent)'))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const target   = interaction.options.getMember('user');
    const durStr   = interaction.options.getString('duration');
    const reason   = interaction.options.getString('reason') ?? 'No reason provided';
    const muteRole = cfg.get('role.mute');

    if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!muteRole) return interaction.reply({ content: '`role.mute` is not configured. Use `/settings set role.mute <ID>`.', ephemeral: true });

    const durMs = parseDuration(durStr);
    const durFmt = durMs ? formatDuration(durMs) : 'Permanent';

    await target.roles.add(muteRole);
    addModLog({ userId: target.id, username: target.user.tag, modId: interaction.user.id, modName: interaction.user.tag, action: 'mute', reason, duration: durFmt });

    if (durMs) setTimeout(() => target.roles.remove(muteRole).catch(() => {}), durMs);

    target.user.send({
      embeds: [new EmbedBuilder()
        .setTitle('You Have Been Muted')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Duration:** ${durFmt}\n**Reason:** ${reason}`)
        .setColor(0x95a5a6).setTimestamp()],
    }).catch(() => {});

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Member Muted')
        .addFields(
          { name: 'User',     value: `<@${target.id}>`, inline: true },
          { name: 'Duration', value: durFmt,             inline: true },
          { name: 'Reason',   value: reason,             inline: false },
        ).setColor(0x95a5a6).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Member Muted', color: 0x95a5a6,
      fields: [
        { name: 'User',      value: `<@${target.id}> (${target.user.tag})`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,            inline: true },
        { name: 'Duration',  value: durFmt,                                 inline: true },
        { name: 'Reason',    value: reason,                                 inline: false },
      ],
    });
  },
};
