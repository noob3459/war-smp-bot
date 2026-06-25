const { Events } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild) return;
    if (message.partial) return; // uncached — no content to log
    if (message.author?.bot) return;

    await log(client, 'deletions', {
      title: 'Message Deleted',
      color: 0xe74c3c,
      fields: [
        { name: 'Author',  value: `<@${message.author.id}> (${message.author.tag})`, inline: true  },
        { name: 'Channel', value: `<#${message.channelId}>`,                          inline: true  },
        { name: 'Content', value: message.content?.slice(0, 1024) || '*(attachment / embed only)*', inline: false },
      ],
    });
  },
};
