// events/levelsMessage.js
const { addXp, setUserNameCache, maybeGiveLevelRole } = require('../features/levels');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    try {
      // Nur Guild-Text, kein Bot, keine Systemnachrichten
      if (!message.guild || message.author.bot) return;

      // Anti-Spam & Cooldown
      const COOLDOWN = Number(process.env.LEVEL_COOLDOWN_SECONDS || 60) * 1000; // default 60s
      const now = Date.now();

      // lightweight per-process cache
      if (!client.__lvl_cd) client.__lvl_cd = new Map(); // key: guildId:userId -> ts
      const key = `${message.guild.id}:${message.author.id}`;
      const last = client.__lvl_cd.get(key) || 0;
      if (now - last < COOLDOWN) return;
      client.__lvl_cd.set(key, now);

      // Zufällige XP-Spanne
      const XP_MIN = Number(process.env.LEVEL_XP_MIN || 10);
      const XP_MAX = Number(process.env.LEVEL_XP_MAX || 15);
      const gain = Math.max(XP_MIN, Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN);

      // Username cachen fürs Leaderboard
      const display = message.member?.displayName || message.author.username;
      setUserNameCache(message.guild.id, message.author.id, display);

      const { leveledUp, level } = await addXp({
        guild: message.guild,
        user: message.author,
        amount: gain,
        memberNameForCache: display,
      });

      if (leveledUp) {
        // schicker Level-Up
        const msg = `🎉 **${display}** ist jetzt **Level ${level}**!`;
        const channelToUse = process.env.LEVEL_UP_CHANNEL_ID
          ? (message.guild.channels.cache.get(process.env.LEVEL_UP_CHANNEL_ID) || await message.guild.channels.fetch(process.env.LEVEL_UP_CHANNEL_ID).catch(() => null))
          : message.channel;

        if (channelToUse) {
          channelToUse.send(msg).catch(() => null);
        }

        // evtl. Level-Rolle vergeben
        const role = await maybeGiveLevelRole(message.member);
        if (role && channelToUse) {
          channelToUse.send(`🏅 Rolle **${role.name}** vergeben!`).catch(() => null);
        }
      }
    } catch (e) {
      console.error('levelsMessage error:', e);
    }
  }
};