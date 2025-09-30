// features/youtubeAlerts.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

// Für Node >=18 ist fetch global. Falls du Node 16 nutzt,
// installiere zusätzlich "node-fetch" und entkommentiere die nächste Zeile:
// const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const LAST_FILE = path.join(process.cwd(), 'data', 'youtube_last.json');

async function readLast() {
  try {
    const txt = await fs.readFile(LAST_FILE, 'utf8');
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

async function writeLast(obj) {
  await fs.mkdir(path.dirname(LAST_FILE), { recursive: true });
  await fs.writeFile(LAST_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function ytThumb(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

async function fetchLatestEntry(playlistId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&key=${apiKey}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DiscordBot/1.0' } });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`YouTube API fetch failed: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;

  const video = data.items[0].snippet;
  if (!video || !video.resourceId?.videoId) return null;

  return {
    videoId: video.resourceId.videoId,
    title: video.title || 'Neues Video',
    url: `https://www.youtube.com/watch?v=${video.resourceId.videoId}`,
    publishedIso: video.publishedAt || null,
  };
}

/**
 * Startet den YouTube-Alert-Poller.
 * Holt Config direkt aus Environment Variablen (Portainer).
 * @param {import('discord.js').Client} client
 */
async function startYouTubeAlerts(client) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const playlistId = process.env.YOUTUBE_PLAYLIST_ID; // ⚠️ statt channelId jetzt Playlist-ID (UU...)
  const alertChannelId = process.env.ALERT_CHANNEL_ID;
  const pingRoleId = process.env.PING_ROLE_ID || null;
  const intervalMinutes = Number(process.env.INTERVAL_MINUTES || 5);

  if (!apiKey || !playlistId || !alertChannelId) {
    console.error('❌ YouTubeAlerts: fehlende Variablen (YOUTUBE_API_KEY, YOUTUBE_PLAYLIST_ID, ALERT_CHANNEL_ID)');
    return;
  }

  let alertsChan = null;
  try {
    alertsChan = await client.channels.fetch(alertChannelId);
  } catch {
    alertsChan = client.channels.cache.get(alertChannelId) || null;
  }
  if (!alertsChan) {
    console.error('❌ YouTubeAlerts: alertChannelId nicht gefunden oder keine Rechte.');
    return;
  }

  const last = await readLast();

  async function checkOnce() {
    try {
      const latest = await fetchLatestEntry(playlistId, apiKey);
      if (!latest) return;

      // Wenn noch kein gespeicherter Wert vorhanden ist → nur merken, nicht posten
      if (!last.latestId) {
        last.latestId = latest.videoId;
        await writeLast(last);
        return;
      }

      // Nur posten, wenn sich die Video-ID geändert hat
      if (last.latestId !== latest.videoId) {
        const ts = latest.publishedIso ? Math.floor(new Date(latest.publishedIso).getTime() / 1000) : null;

        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(latest.title)
          .setURL(latest.url)
          .setImage(ytThumb(latest.videoId))
          .setDescription(
            ts
              ? `Neu bei **JP Performance** – veröffentlicht <t:${ts}:R>.\n\n▶️ ${latest.url}`
              : `Neu bei **JP Performance**!\n\n▶️ ${latest.url}`
          )
          .setFooter({ text: 'YouTube Alert' })
          .setTimestamp(new Date());

        // Embed + Ping in EINER Nachricht
        const content = pingRoleId
          ? `<@&${pingRoleId}> 🎬 **${latest.title}** ist online!`
          : null;

        await alertsChan.send({ content, embeds: [embed] });

        // Neuste ID speichern
        last.latestId = latest.videoId;
        await writeLast(last);
      }
    } catch (e) {
      console.error('❌ YouTubeAlerts check failed:', e.message);
    }
  }

  // Beim Start sofort prüfen, danach im Intervall
  await checkOnce();
  const intervalMs = Math.max(1, intervalMinutes) * 60_000;
  setInterval(checkOnce, intervalMs);

  console.log(`✅ YouTube Alerts gestartet für Playlist ${playlistId} (Intervall: ${intervalMinutes}min)`);
}

module.exports = { startYouTubeAlerts };
