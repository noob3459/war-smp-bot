const { Events } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // embed resolve, not an edit

    await log(client, 'edits', {
      title: 'Message Edited',
      color: 0xf39c12,
      fields: [
        { name: 'Author',  value: `<@${newMessage.author.id}> (${newMessage.author.tag})`, inline: true  },
        { name: 'Channel', value: `<#${newMessage.channelId}>`,                             inline: true  },
        { name: 'Jump',    value: `[View message](${newMessage.url})`,                      inline: true  },
        { name: 'Before',  value: (oldMessage.content?.slice(0, 512)) || '*(empty)*',       inline: false },
        { name: 'After',   value: newMessage.content?.slice(0, 512)   || '*(empty)*',       inline: false },
      ],
    });
  },
};
