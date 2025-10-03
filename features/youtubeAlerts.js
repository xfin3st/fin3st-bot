const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

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

  return {
    videoId: entry['yt:videoId'],
    title: entry.title,
    url: entry.link?.["@_href"] || `https://www.youtube.com/watch?v=${entry['yt:videoId']}`,
    publishedIso: entry.published
  };
}

async function createEmbed(latest, pingRoleId) {
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

  return { content, embed };
}

function createChecker(client, config) {
  const channelId = config.channelId || process.env.YOUTUBE_CHANNEL_ID;
  const alertChannelId = config.alertChannelId || process.env.ALERT_CHANNEL_ID;
  const pingRoleId = config.pingRoleId || process.env.PING_ROLE_ID || null;
  const logChannelId = config.logChannelId || process.env.LOG_CHANNEL_ID || null;

  let alertsChan = null;
  let logChan = null;
  let last = null;

  async function init() {
    if (!alertsChan) {
      try {
        alertsChan = await client.channels.fetch(alertChannelId);
      } catch {
        alertsChan = client.channels.cache.get(alertChannelId) || null;
      }
    }
    if (!alertsChan) {
      console.error('❌ YouTubeAlerts: alertChannelId nicht gefunden.');
      return false;
    }

    if (logChannelId && !logChan) {
      try {
        logChan = await client.channels.fetch(logChannelId);
      } catch {
        logChan = client.channels.cache.get(logChannelId) || null;
      }
    }

    if (!last) {
      last = await readLast();
    }
    return true;
  }

  async function log(msg) {
    console.log(msg);
    if (logChan) {
      try {
        await logChan.send(msg);
      } catch {}
    }
  }

  async function checkOnce(manual = false) {
    if (!(await init())) return;

    try {
      const latest = await fetchLatestEntry(channelId);
      if (!latest) return;

      if (!last.latestId) {
        last.latestId = latest.videoId;
        last.lastPostedAt = Date.now();
        await writeLast(last);

        if (process.env.POST_ON_FIRST_RUN === 'true') {
          const { content, embed } = await createEmbed(latest, pingRoleId);
          await alertsChan.send({ content, embeds: [embed] });
          await log(`✅ Erstes Video direkt gepostet: ${latest.title}`);
        } else {
          if (manual) {
            await alertsChan.send("ℹ️ Kein gespeichertes Video vorhanden – Cache gesetzt.");
          }
          await log(`ℹ️ Erstes Video nur als Cache gesetzt: ${latest.title}`);
        }

        return;
      }

      // ✅ Doppelte Posts verhindern (innerhalb 10 Min)
      const alreadyPosted = last.latestId === latest.videoId;
      const within10min = last.lastPostedAt && (Date.now() - last.lastPostedAt < 10 * 60 * 1000);

      if (alreadyPosted && within10min) {
        if (manual) {
          await alertsChan.send("ℹ️ Bereits gepostet, keine Doppelpost erlaubt.");
        }
        return;
      }

      if (!alreadyPosted) {
        const { content, embed } = await createEmbed(latest, pingRoleId);
        await alertsChan.send({ content, embeds: [embed] });

        last.latestId = latest.videoId;
        last.lastPostedAt = Date.now();
        await writeLast(last);

        await log(`✅ Neues Video gepostet: ${latest.title}`);
      } else if (manual) {
        await alertsChan.send("ℹ️ Kein neues Video gefunden.");
      }
    } catch (e) {
      console.error('❌ YouTubeAlerts check failed:', e.message);
      if (manual && alertsChan) {
        await alertsChan.send(`❌ Fehler beim Check: ${e.message}`);
      }
      await log(`❌ Fehler beim YouTube-Check: ${e.message}`);
    }
  }

  return { checkOnce };
}

async function startYouTubeAlerts(client, config = {}) {
  const intervalMinutes = Number(config.intervalMinutes || process.env.INTERVAL_MINUTES || 5);
  const { checkOnce } = createChecker(client, config);

  await checkOnce();
  const intervalMs = Math.max(1, intervalMinutes) * 60_000;
  setInterval(checkOnce, intervalMs);

  console.log(`✅ YouTube Alerts gestartet (Intervall: ${intervalMinutes}min)`);
  return { checkOnce };
}

module.exports = { startYouTubeAlerts, createChecker };