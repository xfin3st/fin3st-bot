const { Client, GatewayIntentBits, Collection, Options } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Erstelle einen neuen Client mit Performance-Optimierungen
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    restTimeOffset: 0,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    makeCache: Options.cacheWithLimits({
        ...Options.defaultMakeCacheSettings,
        'MessageManager': 0,
        'ChannelManager': 100,
        'GuildManager': 10,
        'UserManager': 1000,
    })
});

// Sammlung für Befehle
client.commands = new Collection();

// Lade Befehle
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Lade Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Verbindung herstellen
client.login(process.env.DISCORD_TOKEN);

// NACH client.login() - Befehle automatisch registrieren
client.once('clientReady', async () => {
    try {
        console.log('🔄 Starte Befehlsregistrierung...');
        
        const commands = [];
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            commands.push(command.data.toJSON());
        }

        // Global registrieren (dauert bis zu 1 Stunde)
        await client.application.commands.set(commands);
        
        // ODER für einen bestimmten Server (sofort) - Einen auskommentieren!
        // const guild = client.guilds.cache.get(process.env.GUILD_ID);
        // await guild.commands.set(commands);

        console.log(`✅ ${commands.length} Befehle registriert!`);
    } catch (error) {
        console.error('❌ Fehler beim Registrieren:', error);
    }
});