const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readFile, writeFile, mkdir } = require('fs/promises');
const path = require('path');

// Pfad zur Datei, wo die letzte Video-ID gespeichert ist
const LAST_FILE = path.join(process.cwd(), 'data', 'youtube_last.json');

async function readLast() {
  try {
    const txt = await readFile(LAST_FILE, 'utf8');
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

async function writeLast(obj) {
  await mkdir(path.dirname(LAST_FILE), { recursive: true });
  await writeFile(LAST_FILE, JSON.stringify(obj, null, 2), 'utf8');
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-yt')
    .setDescription('Postet sofort das neueste YouTube-Video'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const apiKey = process.env.YOUTUBE_API_KEY;
    const playlistId = process.env.YOUTUBE_PLAYLIST_ID; // ⚠️ statt channelId
    const alertChannelId = process.env.ALERT_CHANNEL_ID;
    const pingRoleId = process.env.PING_ROLE_ID || null;

    if (!apiKey || !playlistId || !alertChannelId) {
      return interaction.editReply('❌ API Key oder Playlist-ID fehlt.');
    }

    const latest = await fetchLatestEntry(playlistId, apiKey);
    if (!latest) return interaction.editReply('❌ Kein Video gefunden.');

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

    const alertsChan = await interaction.client.channels.fetch(alertChannelId);

    // Embed + Ping in EINER Nachricht
    const content = pingRoleId
      ? `<@&${pingRoleId}> 🎬 **${latest.title}** ist online!`
      : null;

    await alertsChan.send({ content, embeds: [embed] });

    // Letzte ID speichern
    const last = await readLast();
    last.latestId = latest.videoId;
    await writeLast(last);

    await interaction.editReply('✅ Neueste Video wurde gepostet!');
  },
};
