const { Events } = require('discord.js');
const automod = require('../utils/automod');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author?.bot || !message.guild) return;
    await automod.check(message);
  },
};
