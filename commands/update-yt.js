const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readFile, writeFile, mkdir } = require('fs/promises');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

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

async function fetchLatestEntry(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DiscordBot/1.0' } });
  if (!res.ok) throw new Error(`YouTube RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  const entry = data.feed?.entry?.[0] || data.feed?.entry;
  if (!entry) return null;

  return {
    videoId: entry['yt:videoId'],
    title: entry.title,
    url: entry.link?.["@_href"] || `https://www.youtube.com/watch?v=${entry['yt:videoId']}`,
    publishedIso: entry.published,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-yt')
    .setDescription('Postet sofort das neueste YouTube-Video (RSS)'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = process.env.YOUTUBE_CHANNEL_ID; // UC...
    const alertChannelId = process.env.ALERT_CHANNEL_ID;
    const pingRoleId = process.env.PING_ROLE_ID || null;

    if (!channelId || !alertChannelId) {
      return interaction.editReply('❌ Channel-ID oder ALERT_CHANNEL_ID fehlt.');
    }

    const latest = await fetchLatestEntry(channelId);
    if (!latest) return interaction.editReply('❌ Kein Video gefunden.');

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

    const alertsChan = await interaction.client.channels.fetch(alertChannelId);

    const content = pingRoleId
      ? `<@&${pingRoleId}> 🎬 **${latest.title}** ist online!`
      : null;

    await alertsChan.send({ content, embeds: [embed] });

    const last = await readLast();
    last.latestId = latest.videoId;
    await writeLast(last);

    await interaction.editReply('✅ Neueste Video wurde gepostet (RSS)!');
  },
};
