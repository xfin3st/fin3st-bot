// features/levels.js
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'levels.sqlite');

// Stelle sicher, dass /data existiert
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// SQLite DB öffnen
const db = new Database(DB_FILE);

// Tabelle anlegen falls nicht vorhanden
db.prepare(`
CREATE TABLE IF NOT EXISTS levels (
  guildId TEXT NOT NULL,
  userId TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  lastLevelUpAt INTEGER DEFAULT 0,
  name TEXT,
  PRIMARY KEY (guildId, userId)
)`).run();

// --------------------------------------------------
// Level-Formeln
// --------------------------------------------------
function xpForLevel(level) {
  return Math.floor(5 * level * level + 50 * level + 100);
}

function totalXpForLevel(level) {
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

// --------------------------------------------------
// Public API
// --------------------------------------------------
function addXp({ guild, user, amount, memberNameForCache }) {
  if (!guild?.id || !user?.id) return { leveledUp: false };

  const row = db.prepare(`SELECT xp FROM levels WHERE guildId=? AND userId=?`)
    .get(guild.id, user.id);

  let xp = row ? row.xp : 0;
  const beforeLevel = levelFromTotalXp(xp);

  xp += amount;
  const afterLevel = levelFromTotalXp(xp);

  if (row) {
    db.prepare(`UPDATE levels SET xp=?, name=?, lastLevelUpAt=? WHERE guildId=? AND userId=?`)
      .run(
        xp,
        memberNameForCache || row.name,
        afterLevel > beforeLevel ? Date.now() : row.lastLevelUpAt,
        guild.id,
        user.id
      );
  } else {
    db.prepare(`INSERT INTO levels (guildId, userId, xp, lastLevelUpAt, name) VALUES (?,?,?,?,?)`)
      .run(guild.id, user.id, xp, afterLevel > beforeLevel ? Date.now() : 0, memberNameForCache || null);
  }

  return { leveledUp: afterLevel > beforeLevel, level: afterLevel, xp };
}

function getUser(guildId, userId) {
  const row = db.prepare(`SELECT * FROM levels WHERE guildId=? AND userId=?`).get(guildId, userId);
  if (!row) return null;

  const level = levelFromTotalXp(row.xp);
  const xpIntoLevel = row.xp - totalXpForLevel(level);
  const xpNeed = xpForLevel(level);

  return {
    xp: row.xp,
    level,
    xpIntoLevel,
    xpNeed,
    xpToNext: xpNeed - xpIntoLevel,
    lastLevelUpAt: row.lastLevelUpAt,
    name: row.name,
  };
}

function setUserNameCache(guildId, userId, name) {
  const row = db.prepare(`SELECT xp FROM levels WHERE guildId=? AND userId=?`).get(guildId, userId);
  if (row) {
    db.prepare(`UPDATE levels SET name=? WHERE guildId=? AND userId=?`).run(name, guildId, userId);
  } else {
    db.prepare(`INSERT INTO levels (guildId, userId, xp, lastLevelUpAt, name) VALUES (?,?,?,?,?)`)
      .run(guildId, userId, 0, 0, name);
  }
}

function getLeaderboard(guildId, limit = 10) {
  const rows = db.prepare(`SELECT * FROM levels WHERE guildId=? ORDER BY xp DESC LIMIT ?`).all(guildId, limit);
  return rows.map(r => ({
    userId: r.userId,
    name: r.name,
    xp: r.xp,
    level: levelFromTotalXp(r.xp),
  }));
}

// Dummy für Kompatibilität (Rollensystem später machbar mit extra Tabelle)
async function maybeGiveLevelRole() {
  return null;
}

module.exports = {
  addXp,
  getUser,
  getLeaderboard,
  setUserNameCache,
  xpForLevel,
  totalXpForLevel,
  levelFromTotalXp,
  maybeGiveLevelRole
};