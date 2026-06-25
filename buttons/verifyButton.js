const { EmbedBuilder } = require('discord.js');
const cfg = require('../utils/config');

module.exports = {
  customId: 'verify_member',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const verifiedId   = cfg.get('role.verified');
    const unverifiedId = cfg.get('role.unverified');

    if (!verifiedId) {
      return interaction.editReply('Verification is not fully configured. Ask an admin to run `/settings set role.verified <ID>`.');
    }

    if (interaction.member.roles.cache.has(verifiedId)) {
      return interaction.editReply('You are already verified!');
    }

    try {
      await interaction.member.roles.add(verifiedId);
      if (unverifiedId) await interaction.member.roles.remove(unverifiedId).catch(() => {});
    } catch (err) {
      console.error('[verifyButton]', err);
      return interaction.editReply('Failed to assign the Verified role. Please contact an admin.');
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Verified!')
        .setDescription('You now have access to the server. Welcome!')
        .setColor(0x00cc88).setTimestamp()],
    });
  },
};
