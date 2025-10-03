// dashboard.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { getLeaderboard, getAllRewards, setLevelReward, addXp } = require('./features/levels');

const app = express();

// -------- Sessions --------
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret',
  resave: false,
  saveUninitialized: false,
}));

// -------- Passport --------
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy(
  {
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: ['identify', 'guilds'],
  },
  (accessToken, refreshToken, profile, done) => done(null, profile)
));

// -------- Auth Routes --------
app.get('/login', passport.authenticate('discord'));
app.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// -------- Helpers --------
function isGuildAdmin(discordProfile) {
  const ADMIN = 0x8n; // Administrator Bit
  const g = discordProfile.guilds?.find(g => g.id === process.env.GUILD_ID);
  if (!g) return false;
  try {
    const perms = BigInt(g.permissions);
    return (perms & ADMIN) === ADMIN;
  } catch {
    const permsNum = Number(g.permissions || 0);
    return (permsNum & 0x8) === 0x8;
  }
}

function checkAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/login');
  if (!isGuildAdmin(req.user)) return res.status(403).send('❌ Keine Berechtigung (kein Admin dieser Guild)');
  return next();
}

// -------- Static Frontend (nur nach Login) --------
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/login') || req.path.startsWith('/callback') || req.path.startsWith('/logout')) {
    return next();
  }
  if (!req.isAuthenticated()) return res.redirect('/login');
  if (!isGuildAdmin(req.user)) return res.status(403).send('❌ Keine Berechtigung (kein Admin)');
  return express.static(path.join(__dirname, 'frontend'))(req, res, next);
});

// -------- API --------
app.use(express.json());

app.get('/api/me', checkAuth, (req, res) => {
  const u = req.user;
  const id = u.id;
  const username = u.username || (u.global_name || 'Unbekannt');
  const avatarHash = u.avatar;
  const avatarURL = avatarHash
    ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  res.json({
    id,
    username,
    avatarURL,
    guildAdmin: isGuildAdmin(u),
  });
});

app.get('/api/leaderboard', checkAuth, (req, res) => {
  const guildId = process.env.GUILD_ID;
  const lb = getLeaderboard(guildId, 10);
  res.json(lb);
});

app.get('/api/rewards', checkAuth, (req, res) => {
  const guildId = process.env.GUILD_ID;
  res.json(getAllRewards(guildId));
});

app.post('/api/rewards', checkAuth, (req, res) => {
  const guildId = process.env.GUILD_ID;
  const { level, roleId } = req.body;
  if (!level || !roleId) return res.status(400).json({ error: 'Level und roleId erforderlich' });
  setLevelReward(guildId, Number(level), String(roleId));
  res.json({ success: true });
});

// -------- XP Management --------
app.post('/api/xp-add', checkAuth, (req, res) => {
  const guildId = process.env.GUILD_ID;
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId und amount erforderlich' });

  try {
    const result = addXp({
      guild: { id: guildId },
      user: { id: userId },
      amount: Number(amount),
      memberNameForCache: null,
    });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/xp-remove', checkAuth, (req, res) => {
  const guildId = process.env.GUILD_ID;
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId und amount erforderlich' });

  try {
    const result = addXp({
      guild: { id: guildId },
      user: { id: userId },
      amount: -Math.abs(Number(amount)), // immer negativ
      memberNameForCache: null,
    });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------- Start --------
const PORT = Number(process.env.DASHBOARD_PORT || 3010);
app.listen(PORT, () => {
  console.log(`🌐 Dashboard läuft auf http://localhost:${PORT}`);
});