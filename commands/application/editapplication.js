const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editapplication')
    .setDescription('Edit your pending player application'),

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' AND status = 'pending'`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        content: "You don't have a pending application to edit.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Edit Your Application')
      .setDescription('Click below to open the edit form. Your current answers will be pre-filled.')
      .addFields(
        { name: 'IGN',      value: application.ign,              inline: true },
        { name: 'Timezone', value: application.timezone ?? 'N/A', inline: true },
      )
      .setColor(0xf39c12);

    const button = new ButtonBuilder()
      .setCustomId(`edit_open:${application.id}`)
      .setLabel('Edit Application')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️');

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(button)],
      ephemeral: true,
    });
  },
};
