// features/levels.js
const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');
const REWARDS_FILE = path.join(DATA_DIR, 'level_rewards.json');

// In-Memory-Cache
let db = { }; // { [guildId]: { [userId]: { xp, level, lastLevelUpAt, lastMsgAt } } }
let rewards = {}; // { [guildId]: { [level]: roleId } }
let isLoaded = false;
let saving = false;

// ---------- helpers ----------
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadDB() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(LEVELS_FILE, 'utf8');
    db = JSON.parse(raw);
  } catch {
    db = {};
  }

  try {
    const rawRewards = await fs.readFile(REWARDS_FILE, 'utf8');
    rewards = JSON.parse(rawRewards);
  } catch {
    // default: leer
    rewards = {};
  }

  isLoaded = true;
}

async function saveDB() {
  if (saving) return;
  saving = true;
  try {
    await fs.writeFile(LEVELS_FILE, JSON.stringify(db, null, 2), 'utf8');
  } finally {
    saving = false;
  }
}

function guildBucket(guildId) {
  if (!db[guildId]) db[guildId] = {};
  return db[guildId];
}

function userBucket(guildId, userId) {
  const g = guildBucket(guildId);
  if (!g[userId]) g[userId] = { xp: 0, level: 0, lastLevelUpAt: 0, lastMsgAt: 0, name: null };
  return g[userId];
}

// XP/Level-Formel (klassisch & fair)
function xpForLevel(level) {
  // z. B. 5 * level^2 + 50 * level + 100
  return Math.floor(5 * level * level + 50 * level + 100);
}

function totalXpForLevel(level) {
  // kumuliert bis VOR diesem Level
  let sum = 0;
  for (let i = 0; i < level; i++) sum += xpForLevel(i);
  return sum;
}

function levelFromTotalXp(total) {
  let lvl = 0;
  let need = xpForLevel(lvl);
  while (total >= need) {
    total -= need;
    lvl++;
    need = xpForLevel(lvl);
  }
  return lvl;
}

// ---------- public API ----------
async function initLevels() {
  if (!isLoaded) await loadDB();
  // Auto-Save alle 30s (robust bei Neustarts)
  setInterval(saveDB, 30_000).unref?.();
}

async function addXp({ guild, user, amount, memberNameForCache }) {
  if (!isLoaded) await initLevels();
  if (!guild?.id || !user?.id) return { leveledUp: false };

  const u = userBucket(guild.id, user.id);
  if (memberNameForCache && !u.name) u.name = memberNameForCache;

  const beforeTotal = u.xp;
  u.xp += amount;
  const beforeLevel = u.level;
  const afterLevel = levelFromTotalXp(u.xp);

  let leveledUp = false;
  if (afterLevel > beforeLevel) {
    u.level = afterLevel;
    u.lastLevelUpAt = Date.now();
    leveledUp = true;
  }

  await saveDB();
  return { leveledUp, beforeTotal, afterTotal: u.xp, level: u.level };
}

function getUser(guildId, userId) {
  if (!isLoaded) return null;
  const u = db[guildId]?.[userId] || null;
  if (!u) return null;

  const level = levelFromTotalXp(u.xp);
  const xpIntoLevel = u.xp - totalXpForLevel(level);
  const xpNeed = xpForLevel(level);
  const xpToNext = xpNeed - xpIntoLevel;

  return {
    xp: u.xp,
    level,
    xpIntoLevel,
    xpNeed,
    xpToNext,
    lastLevelUpAt: u.lastLevelUpAt || 0,
    name: u.name || null,
  };
}

function setUserNameCache(guildId, userId, name) {
  const u = userBucket(guildId, userId);
  u.name = name;
}

function getLeaderboard(guildId, limit = 10) {
  const g = db[guildId] || {};
  const arr = Object.entries(g).map(([uid, rec]) => ({
    userId: uid,
    name: rec.name || null,
    xp: rec.xp,
    level: levelFromTotalXp(rec.xp),
  }));
  arr.sort((a, b) => b.xp - a.xp);
  return arr.slice(0, Math.min(25, Math.max(1, limit)));
}

async function maybeGiveLevelRole(member) {
  // rewards[guildId] = { "5": "roleId", "10": "roleId" ... }
  const map = rewards[member.guild.id];
  if (!map) return null;

  const u = getUser(member.guild.id, member.id);
  if (!u) return null;

  const roleId = map[String(u.level)];
  if (!roleId) return null;

  const role = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);
  if (!role) return null;

  // Nur geben, wenn noch nicht vorhanden
  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId).catch(() => null);
    return role;
  }
  return null;
}

module.exports = {
  initLevels,
  addXp,
  getUser,
  getLeaderboard,
  setUserNameCache,
  xpForLevel,
  totalXpForLevel,
  levelFromTotalXp,
  maybeGiveLevelRole,
  REWARDS_FILE,
};