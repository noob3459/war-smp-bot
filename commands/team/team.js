const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');

const create   = require('../../utils/team/create');
const del      = require('../../utils/team/delete');
const rename   = require('../../utils/team/rename');
const list     = require('../../utils/team/list');
const info     = require('../../utils/team/info');
const assign   = require('../../utils/team/assign');
const remove   = require('../../utils/team/remove');
const swap     = require('../../utils/team/swap');
const balance  = require('../../utils/team/balance');
const captain  = require('../../utils/team/captain');
const stats    = require('../../utils/team/stats');

const HANDLERS = { create, delete: del, rename, list, info, assign, remove, swap, balance, captain, stats };

const teamOpt = o => o.setName('team').setDescription('Team name').setRequired(true).setAutocomplete(true);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Team management')
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a new team (Admin)')
      .addStringOption(o => o.setName('name').setDescription('Team name').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Hex color, e.g. #e74c3c').setRequired(true))
      .addIntegerOption(o => o.setName('maxplayers').setDescription('Max players (1–50)').setRequired(true).setMinValue(1).setMaxValue(50)),
    )
    .addSubcommand(s => s
      .setName('delete')
      .setDescription('Delete a team (Admin)')
      .addStringOption(teamOpt),
    )
    .addSubcommand(s => s
      .setName('rename')
      .setDescription('Rename a team (Admin)')
      .addStringOption(teamOpt)
      .addStringOption(o => o.setName('newname').setDescription('New name').setRequired(true)),
    )
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all teams'),
    )
    .addSubcommand(s => s
      .setName('info')
      .setDescription('Show a team\'s live stats')
      .addStringOption(teamOpt),
    )
    .addSubcommand(s => s
      .setName('assign')
      .setDescription('Assign a player to a team (Admin)')
      .addUserOption(o => o.setName('user').setDescription('Player').setRequired(true))
      .addStringOption(teamOpt),
    )
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a player from their team (Admin)')
      .addUserOption(o => o.setName('user').setDescription('Player').setRequired(true)),
    )
    .addSubcommand(s => s
      .setName('swap')
      .setDescription('Swap two players between teams (Admin)')
      .addUserOption(o => o.setName('user1').setDescription('First player').setRequired(true))
      .addUserOption(o => o.setName('user2').setDescription('Second player').setRequired(true)),
    )
    .addSubcommand(s => s
      .setName('balance')
      .setDescription('Auto-balance all players across teams (Admin)'),
    )
    .addSubcommand(s => s
      .setName('captain')
      .setDescription('Assign a team captain (Admin)')
      .addUserOption(o => o.setName('user').setDescription('Player to make captain').setRequired(true))
      .addStringOption(teamOpt),
    )
    .addSubcommand(s => s
      .setName('stats')
      .setDescription('View a team\'s win/loss record and statistics')
      .addStringOption(teamOpt),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'team') {
      const teams = db.prepare(
        "SELECT name FROM teams WHERE name LIKE ? ORDER BY name LIMIT 25",
      ).all(`%${focused.value}%`);
      await interaction.respond(teams.map(t => ({ name: t.name, value: t.name })));
    }
  },

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const handler = HANDLERS[sub];
    if (handler) return handler(interaction, client);
  },
};
