const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  customId: 'review_team',

  async execute(interaction) {
    const [, appId] = interaction.customId.split(':');
    const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();

    if (teams.length === 0) {
      return interaction.reply({
        content: 'No teams have been created yet. Add teams to the database first.',
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`team_select:${appId}`)
      .setPlaceholder('Choose a team to assign...')
      .addOptions(
        teams.map(t => ({
          label: t.name,
          value: t.name,
          ...(t.description ? { description: t.description } : {}),
        })),
      );

    await interaction.reply({
      content: 'Select a team to assign to this applicant:',
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },
};
