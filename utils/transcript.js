const { EmbedBuilder } = require('discord.js');

/**
 * Generate an HTML transcript from a Discord text channel.
 * Fetches up to 500 messages, renders them in a dark-themed HTML page.
 */
async function generateTranscript(channel) {
  let allMessages = [];
  let lastId = null;

  // Fetch messages in batches (max 100 per API call)
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    allMessages.push(...messages.values());
    lastId = messages.last().id;

    if (messages.size < 100 || allMessages.length >= 500) break;
  }

  // Sort oldest first
  allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const html = buildHTML(channel, allMessages);
  return { html, messageCount: allMessages.length };
}

function buildHTML(channel, messages) {
  const escapedName = escapeHTML(channel.name);
  const guildName = escapeHTML(channel.guild.name);
  const guildIcon = channel.guild.iconURL({ size: 64 }) || '';

  let messagesHTML = '';

  for (const msg of messages) {
    const time = new Date(msg.createdTimestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const authorName = escapeHTML(msg.author.tag);
    const authorAvatar = msg.author.displayAvatarURL({ size: 32 });
    const isBot = msg.author.bot;

    let contentHTML = escapeHTML(msg.content || '');
    // Convert Discord formatting
    contentHTML = contentHTML
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    // Embeds
    let embedsHTML = '';
    for (const embed of msg.embeds) {
      const embedColor = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865f2';
      embedsHTML += `<div class="embed" style="border-left-color: ${embedColor};">`;
      if (embed.title) embedsHTML += `<div class="embed-title">${escapeHTML(embed.title)}</div>`;
      if (embed.description) embedsHTML += `<div class="embed-desc">${escapeHTML(embed.description)}</div>`;
      if (embed.fields && embed.fields.length > 0) {
        embedsHTML += '<div class="embed-fields">';
        for (const field of embed.fields) {
          embedsHTML += `<div class="embed-field ${field.inline ? 'inline' : ''}"><div class="field-name">${escapeHTML(field.name)}</div><div class="field-value">${escapeHTML(field.value)}</div></div>`;
        }
        embedsHTML += '</div>';
      }
      embedsHTML += '</div>';
    }

    // Attachments
    let attachmentsHTML = '';
    for (const [, att] of msg.attachments) {
      if (att.contentType && att.contentType.startsWith('image/')) {
        attachmentsHTML += `<div class="attachment"><img src="${att.url}" alt="attachment" /></div>`;
      } else {
        attachmentsHTML += `<div class="attachment"><a href="${att.url}" target="_blank">📎 ${escapeHTML(att.name)}</a></div>`;
      }
    }

    messagesHTML += `
      <div class="message">
        <div class="msg-header">
          <img class="avatar" src="${authorAvatar}" alt="avatar" />
          <span class="author${isBot ? ' bot' : ''}">${authorName}${isBot ? ' <span class="bot-tag">BOT</span>' : ''}</span>
          <span class="timestamp">${time}</span>
        </div>
        ${contentHTML ? `<div class="msg-content">${contentHTML}</div>` : ''}
        ${embedsHTML}
        ${attachmentsHTML}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcript — #${escapedName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1f22; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.5; }
  .header { background: #2b2d31; padding: 24px 32px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #3f4147; }
  .header img { width: 48px; height: 48px; border-radius: 50%; }
  .header-info h1 { font-size: 20px; color: #f2f3f5; font-weight: 600; }
  .header-info p { font-size: 13px; color: #949ba4; }
  .messages { padding: 16px 32px; }
  .message { padding: 8px 0; display: flex; flex-direction: column; }
  .message:hover { background: #2e3035; border-radius: 6px; }
  .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .avatar { width: 28px; height: 28px; border-radius: 50%; }
  .author { font-weight: 600; color: #f2f3f5; font-size: 15px; }
  .author.bot { color: #5865f2; }
  .bot-tag { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 500; vertical-align: middle; }
  .timestamp { color: #949ba4; font-size: 12px; }
  .msg-content { padding-left: 36px; word-wrap: break-word; }
  .msg-content code { background: #2b2d31; padding: 2px 6px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 14px; }
  .embed { margin: 8px 0 0 36px; background: #2b2d31; border-left: 4px solid #5865f2; border-radius: 4px; padding: 12px 16px; max-width: 520px; }
  .embed-title { font-weight: 700; color: #f2f3f5; margin-bottom: 4px; }
  .embed-desc { color: #dcddde; font-size: 14px; }
  .embed-fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .embed-field { min-width: 100%; }
  .embed-field.inline { min-width: 30%; flex: 1; }
  .field-name { font-weight: 700; color: #f2f3f5; font-size: 13px; }
  .field-value { color: #dcddde; font-size: 14px; }
  .attachment { margin: 6px 0 0 36px; }
  .attachment img { max-width: 400px; max-height: 300px; border-radius: 8px; }
  .attachment a { color: #00a8fc; text-decoration: none; }
  .footer { background: #2b2d31; padding: 16px 32px; text-align: center; color: #949ba4; font-size: 13px; border-top: 1px solid #3f4147; margin-top: 32px; }
</style>
</head>
<body>
  <div class="header">
    ${guildIcon ? `<img src="${guildIcon}" alt="guild icon" />` : ''}
    <div class="header-info">
      <h1>#${escapedName}</h1>
      <p>${guildName} • ${messages.length} messages</p>
    </div>
  </div>
  <div class="messages">
    ${messagesHTML}
  </div>
  <div class="footer">
    Transcript generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
  </div>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the summary embed sent alongside the transcript file.
 */
function buildSummaryEmbed(ticket, closedBy, messageCount) {
  return new EmbedBuilder()
    .setTitle('Ticket Transcript')
    .setColor(0x3498DB)
    .addFields(
      { name: 'Opened By', value: `<@${ticket.owner_id}>`, inline: true },
      { name: 'Closed By', value: `<@${closedBy}>`, inline: true },
      { name: 'Messages', value: `${messageCount}`, inline: true }
    )
    
    .setTimestamp();
}

module.exports = { generateTranscript, buildSummaryEmbed };
