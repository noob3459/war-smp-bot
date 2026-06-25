const db = require('../database/db');

// Every key the /settings command can manage
const CONFIG_META = {
  // Channels
  'channel.notifications':    { label: 'Staff Notifications Channel', category: 'Channels', hint: 'Channel ID — where staff pings are sent (falls back to staff_review)' },
  'channel.admin':            { label: 'Admin Control Channel',     category: 'Channels', hint: 'Channel ID — where /admin-panel is posted' },
  'channel.welcome':          { label: 'Welcome Channel',          category: 'Channels', hint: 'Channel ID' },
  'channel.leave':            { label: 'Leave Channel',            category: 'Channels', hint: 'Channel ID' },
  'channel.staff_review':     { label: 'Staff Review Channel',     category: 'Channels', hint: 'Channel ID' },
  'channel.team_embeds':      { label: 'Team Embeds Channel',      category: 'Channels', hint: 'Channel ID' },
  'channel.ticket_archive':   { label: 'Ticket Archive Channel',   category: 'Channels', hint: 'Channel ID' },
  'channel.ticket_category':  { label: 'Ticket Category ID',       category: 'Channels', hint: 'Category ID' },
  'channel.events':           { label: 'Events Channel',           category: 'Channels', hint: 'Channel ID — where event embeds are posted' },
  'channel.drafts':           { label: 'Draft Channel',            category: 'Channels', hint: 'Channel ID — where live draft embeds are posted' },
  'channel.seasons':          { label: 'Seasons Channel',          category: 'Channels', hint: 'Channel ID — season start/end announcements' },
  // Log channels
  'log.all':          { label: 'Main Log Channel',      category: 'Logging', hint: 'Fallback if specific log channel is unset' },
  'log.deletions':    { label: 'Deleted Messages Log',  category: 'Logging', hint: 'Channel ID' },
  'log.edits':        { label: 'Edited Messages Log',   category: 'Logging', hint: 'Channel ID' },
  'log.joins':        { label: 'Member Joins Log',      category: 'Logging', hint: 'Channel ID' },
  'log.leaves':       { label: 'Member Leaves Log',     category: 'Logging', hint: 'Channel ID' },
  'log.nicknames':    { label: 'Nickname Changes Log',  category: 'Logging', hint: 'Channel ID' },
  'log.roles':        { label: 'Role Changes Log',      category: 'Logging', hint: 'Channel ID' },
  'log.moderation':   { label: 'Moderation Log',        category: 'Logging', hint: 'Channel ID' },
  'log.applications': { label: 'Applications Log',      category: 'Logging', hint: 'Channel ID' },
  'log.teams':        { label: 'Teams Log',             category: 'Logging', hint: 'Channel ID' },
  'log.staff':        { label: 'Staff Actions Log',     category: 'Logging', hint: 'Channel ID' },
  // Roles
  'role.verified':    { label: 'Verified Role',   category: 'Roles', hint: 'Role ID' },
  'role.unverified':  { label: 'Unverified Role', category: 'Roles', hint: 'Role ID' },
  'role.applicant':   { label: 'Applicant Role',  category: 'Roles', hint: 'Role ID' },
  'role.member':      { label: 'Member Role',     category: 'Roles', hint: 'Role ID' },
  'role.captain':     { label: 'Captain Role',    category: 'Roles', hint: 'Role ID' },
  'role.admin':       { label: 'Admin Role',      category: 'Roles', hint: 'Role ID' },
  'role.mute':        { label: 'Muted Role',      category: 'Roles', hint: 'Role ID — must have SendMessages denied on all channels' },
  'role.staff':       { label: 'Staff Role',      category: 'Roles', hint: 'Role ID — pinged for all staff notifications' },
  // Messages
  'msg.welcome':   { label: 'Welcome Message', category: 'Messages', hint: 'Use {user}, {server}, {count}' },
  'msg.leave':     { label: 'Leave Message',   category: 'Messages', hint: 'Use {user}, {server}' },
  'msg.auto_dm':   { label: 'Auto DM',         category: 'Messages', hint: 'Sent to every new member. Empty = off.' },
  // Notification toggles
  'notifications.staff': { label: 'Staff Notifications', category: 'Notifications', hint: 'true/false — ping staff role on key events' },
  // AutoMod toggles
  'automod.spam':         { label: 'Spam Detection',        category: 'AutoMod', hint: 'true/false' },
  'automod.duplicates':   { label: 'Duplicate Messages',    category: 'AutoMod', hint: 'true/false' },
  'automod.invites':      { label: 'Invite Filter',         category: 'AutoMod', hint: 'true/false' },
  'automod.scam_links':   { label: 'Scam Link Filter',      category: 'AutoMod', hint: 'true/false' },
  'automod.mass_mention': { label: 'Mass Mention Filter',   category: 'AutoMod', hint: 'true/false' },
  'automod.bad_words':    { label: 'Bad Word Filter',       category: 'AutoMod', hint: 'true/false' },
  'automod.caps_spam':    { label: 'Caps Spam Filter',      category: 'AutoMod', hint: 'true/false' },
  'automod.emoji_spam':   { label: 'Emoji Spam Filter',     category: 'AutoMod', hint: 'true/false' },
  'automod.anti_raid':    { label: 'Anti-Raid Protection',  category: 'AutoMod', hint: 'true/false' },
  'automod.bad_words_list':{ label: 'Bad Words List',       category: 'AutoMod', hint: 'Comma-separated list' },
};

const DEFAULTS = {
  'notifications.staff':  'true',
  'automod.spam':         'true',
  'automod.duplicates':   'true',
  'automod.invites':      'true',
  'automod.scam_links':   'true',
  'automod.mass_mention': 'true',
  'automod.bad_words':    'false',
  'automod.caps_spam':    'true',
  'automod.emoji_spam':   'true',
  'automod.anti_raid':    'true',
  'automod.bad_words_list': '',
};

function get(key) {
  const row = db.prepare('SELECT value FROM guild_config WHERE key = ?').get(key);
  return row?.value ?? DEFAULTS[key] ?? null;
}

function set(key, value) {
  db.prepare('INSERT OR REPLACE INTO guild_config (key, value) VALUES (?, ?)').run(key, value);
}

function del(key) {
  db.prepare('DELETE FROM guild_config WHERE key = ?').run(key);
}

function getAll() {
  return Object.fromEntries(
    db.prepare('SELECT key, value FROM guild_config ORDER BY key').all().map(r => [r.key, r.value]),
  );
}

function isEnabled(key) {
  const v = get(key);
  return v === 'true' || v === '1' || v === 'enabled';
}

module.exports = { get, set, del, getAll, isEnabled, CONFIG_META, DEFAULTS };
