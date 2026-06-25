const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const { updateTeamEmbed } = require('../utils/teamEmbed');
const { notifyStaff } = require('../utils/staffNotify');
const { log } = require('../utils/logger');

module.exports = {
  customId: 'admin_team_create_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const name       = interaction.fields.getTextInputValue('name').trim();
    const color      = interaction.fields.getTextInputValue('color').trim();
    const maxPlayers = parseInt(interaction.fields.getTextInputValue('max_players')) || 10;

    const existing = db.prepare('SELECT id FROM teams WHERE name = ?').get(name);
    if (existing) {
      return interaction.editReply({ content: `A team named **${name}** already exists.` });
    }

    const hexColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#99aab5';

    const { lastInsertRowid: teamId } = db.prepare(
      'INSERT INTO teams (name, color, max_players) VALUES (?, ?, ?)',
    ).run(name, hexColor, Math.min(50, Math.max(1, maxPlayers)));

    await updateTeamEmbed(teamId, client).catch(() => {});

    await log(client, 'teams', {
      title: 'Team Created',
      color: 0x00cc88,
      fields: [
        { name: 'Team',       value: name,                              inline: true },
        { name: 'Color',      value: hexColor,                          inline: true },
        { name: 'Max Players', value: String(maxPlayers),               inline: true },
        { name: 'Created By', value: interaction.user.tag,              inline: true },
      ],
    });

    await notifyStaff(client, {
      title: 'Team Created',
      description: `**${name}** has been added by ${interaction.user}.`,
      color: 0x00cc88,
      fields: [
        { name: 'Color',      value: hexColor,        inline: true },
        { name: 'Max Players', value: String(maxPlayers), inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Team Created')
        .addFields(
          { name: 'Name',       value: name,           inline: true },
          { name: 'Color',      value: hexColor,       inline: true },
          { name: 'Max Players', value: String(maxPlayers), inline: true },
        )
        .setColor(0x00cc88).setTimestamp()],
    });
  },
};
