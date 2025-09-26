// features/youtubeAlerts.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

// Für Node >=18 ist fetch global. Falls du Node 16 nutzt,
// installiere zusätzlich "node-fetch" und entkommentiere die nächste Zeile:
// const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const LAST_FILE = path.join(process.cwd(), 'youtube_last.json');

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

function rssUrl(channelId) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function ytThumb(videoId) {
  // hqdefault ist stabil; maxresdefault existiert nicht immer
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

async function fetchLatestEntry(channelId) {
  const res = await fetch(rssUrl(channelId), { headers: { 'User-Agent': 'DiscordBot/1.0' } });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  // Einfaches Parsing des ersten <entry>
  const idMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  if (!idMatch) return null;

  const titleMatch = xml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);
  const linkMatch = xml.match(/<entry>[\s\S]*?<link[^>]+href="([^"]+)"/);
  const publishedMatch = xml.match(/<entry>[\s\S]*?<published>([^<]+)<\/published>/);

  return {
    videoId: idMatch[1],
    title: titleMatch ? titleMatch[1] : 'Neues Video',
    url: linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${idMatch[1]}`,
    publishedIso: publishedMatch ? publishedMatch[1] : null,
  };
}

/**
 * Startet den YouTube-Alert-Poller.
 * @param {import('discord.js').Client} client
 * @param {{channelId:string, alertChannelId:string, intervalMinutes:number, pingRoleId?:string}} cfg
 */
async function startYouTubeAlerts(client, cfg) {
  // Channel sicher fetchen (nicht nur aus Cache)
  let alertsChan = null;
  try {
    alertsChan = await client.channels.fetch(cfg.alertChannelId);
  } catch {
    alertsChan = client.channels.cache.get(cfg.alertChannelId) || null;
  }
  if (!alertsChan) {
    console.error('YouTubeAlerts: alertChannelId nicht gefunden oder keine Rechte.');
    return;
  }

  const last = await readLast();

  async function checkOnce() {
    try {
      const latest = await fetchLatestEntry(cfg.channelId);
      if (!latest) return;

      // Bei erstem Start ohne gespeicherte ID posten wir genau EINMAL das neueste Video
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

        const mention = cfg.pingRoleId ? `<@&${cfg.pingRoleId}> ` : '';
        await alertsChan.send({ content: `${mention}Neues Video ist online!`, embeds: [embed] });

        last.latestId = latest.videoId;
        await writeLast(last);
      }
    } catch (e) {
      console.error('YouTubeAlerts check failed:', e);
    }
  }

  // beim Start sofort prüfen, danach im Intervall
  await checkOnce();
  const intervalMs = Math.max(1, Number(cfg.intervalMinutes || 5)) * 60_000;
  setInterval(checkOnce, intervalMs);
}

module.exports = { startYouTubeAlerts };