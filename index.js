const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// HIER DIE ÄNDERUNG:
client.once('clientReady', () => {
    console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
    client.user.setActivity('mit Portainer', { type: 'PLAYING' });
});

client.on('messageCreate', message => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('🏓 Pong!');
    }
});

client.login(process.env.DISCORD_TOKEN);