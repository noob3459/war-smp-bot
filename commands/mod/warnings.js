const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getWarnings } = require('../../utils/modActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View active warnings for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to check').setRequired(true)),

  async execute(interaction) {
    const target   = interaction.options.getUser('user');
    const warnings = getWarnings(target.id);

    const embed = new EmbedBuilder()
      .setTitle(`Warnings — ${target.tag}`)
      .setColor(warnings.length ? 0xf39c12 : 0x00cc88)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    if (!warnings.length) {
      embed.setDescription('This member has no active warnings.');
    } else {
      embed.setDescription(
        warnings.map(w =>
          `**#${w.id}** — ${w.reason}\n*by <@${w.mod_id}> • <t:${Math.floor(new Date(w.created_at + 'Z').getTime() / 1000)}:R>*`,
        ).join('\n\n'),
      );
      embed.setFooter({ text: `${warnings.length} active warning${warnings.length !== 1 ? 's' : ''}` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
