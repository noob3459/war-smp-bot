const { AttachmentBuilder } = require('discord.js');

async function generate(channel) {
  const fetched  = await channel.messages.fetch({ limit: 100 });
  const messages = [...fetched.values()].reverse();

  const lines = [
    `═══════════════════════════════════════════`,
    `  Ticket Transcript — #${channel.name}`,
    `  Generated: ${new Date().toUTCString()}`,
    `═══════════════════════════════════════════`,
    '',
    ...messages.map(m => {
      const time = new Date(m.createdTimestamp).toISOString();
      const atts = m.attachments.size ? ` [+${m.attachments.size} attachment]` : '';
      const embs = m.embeds.length    ? ' [embed]' : '';
      return `[${time}] ${m.author.tag}: ${m.content || '(no text)'}${atts}${embs}`;
    }),
    '',
    `═══════════════════════════════════════════`,
  ];

  const buffer = Buffer.from(lines.join('\n'), 'utf-8');
  return new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });
}

module.exports = { generate };
