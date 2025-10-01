// features/youtubeAlerts.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// Pfad für Cache
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

async function fetchLatestEntry(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DiscordBot/1.0' } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`YouTube RSS fetch failed: ${res.status} - ${txt}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  const entry = data.feed?.entry?.[0] || data.feed?.entry;
  if (!entry) return null;

  const videoId = entry['yt:videoId'];
  const title = entry.title;
  const urlVideo = entry.link?.["@_href"] || `https://www.youtube.com/watch?v=${videoId}`;
  const publishedIso = entry.published;

  return { videoId, title, url: urlVideo, publishedIso };
}

/**
 * Startet den YouTube-Alert-Poller über RSS-Feed.
 * @param {import('discord.js').Client} client
 */
async function startYouTubeAlerts(client, config = {}) {
  const channelId = config.channelId || process.env.YOUTUBE_CHANNEL_ID;
  const alertChannelId = config.alertChannelId || process.env.ALERT_CHANNEL_ID;
  const pingRoleId = config.pingRoleId || process.env.PING_ROLE_ID || null;
  const intervalMinutes = Number(config.intervalMinutes || process.env.INTERVAL_MINUTES || 5);

  if (!channelId || !alertChannelId) {
    console.error('❌ YouTubeAlerts: fehlende Variablen (YOUTUBE_CHANNEL_ID, ALERT_CHANNEL_ID)');
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
      const latest = await fetchLatestEntry(channelId);
      if (!latest) return;

      if (!last.latestId) {
        last.latestId = latest.videoId;
        await writeLast(last);
        return;
      }

      if (last.latestId !== latest.videoId) {
        const ts = latest.publishedIso
          ? Math.floor(new Date(latest.publishedIso).getTime() / 1000)
          : null;

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
          .setFooter({ text: 'YouTube Alert (RSS)' })
          .setTimestamp(new Date());

        const content = pingRoleId
          ? `<@&${pingRoleId}> 🎬 **${latest.title}** ist online!`
          : null;

        await alertsChan.send({ content, embeds: [embed] });

        last.latestId = latest.videoId;
        await writeLast(last);
      }
    } catch (e) {
      console.error('❌ YouTubeAlerts check failed:', e.message);
    }
  }

  await checkOnce();
  const intervalMs = Math.max(1, intervalMinutes) * 60_000;
  setInterval(checkOnce, intervalMs);

  console.log(`✅ YouTube Alerts (RSS) gestartet für Channel ${channelId} (Intervall: ${intervalMinutes}min)`);
}

module.exports = { startYouTubeAlerts };
