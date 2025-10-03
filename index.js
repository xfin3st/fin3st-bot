const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startYouTubeAlerts } = require('./features/youtubeAlerts');

// Funktion zum Laden von Umgebungsvariablen aus verschiedenen Quellen
function loadEnvironmentVariables() {
    console.log('🔄 Lade Umgebungsvariablen...');
    
    const envPaths = [
        path.join(__dirname, '.env'),
        path.join(__dirname, 'stack.env'),
        '/etc/secrets/.env',
        '/app/.env',
        '/config/.env'
    ];

    let envLoaded = false;

    try {
        for (const envPath of envPaths) {
            if (fs.existsSync(envPath)) {
                require('dotenv').config({ path: envPath });
                console.log(`✅ dotenv geladen von: ${envPath}`);
                envLoaded = true;
                break;
            }
        }
    } catch (dotenvError) {
        console.log('⚠️ dotenv fehlgeschlagen:', dotenvError.message);
    }

    if (!envLoaded) {
        console.log('⚠️ Keine .env Datei gefunden, verwende Prozessvariablen');
    }
}

loadEnvironmentVariables();

// DEBUG-Ausgabe
console.log('\n🔍 Finale Umgebungsvariablen:');
const importantVars = ['DISCORD_TOKEN', 'TICKET_CATEGORY_ID', 'SUPPORT_ROLE_ID', 'GUILD_ID', 'NODE_ENV'];
importantVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`${varName}: ✅ ${varName === 'DISCORD_TOKEN' ? value.replace(/.(?=.{4})/g, '*') : value}`);
    } else {
        console.log(`${varName}: ❌ Fehlt`);
    }
});

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ KRITISCH: DISCORD_TOKEN fehlt!');
    process.exit(1);
}

// Client erstellen
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
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.commands = new Collection();

// Commands laden
const commandsPath = path.join(__dirname, 'commands');
let commandList = [];
try {
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            client.commands.set(command.data.name, command);
            commandList.push(command.data.toJSON());
            console.log(`✅ Befehl geladen: ${command.data.name}`);
        }
    } else {
        console.log('⚠️ commands-Ordner nicht gefunden');
    }
} catch (error) {
    console.log('⚠️ Fehler beim Laden der Commands:', error.message);
}

// Events laden
const eventsPath = path.join(__dirname, 'events');
try {
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            delete require.cache[require.resolve(filePath)];
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✅ Event geladen: ${event.name}`);
        }
    } else {
        console.log('⚠️ events-Ordner nicht gefunden');
    }
} catch (error) {
    console.log('⚠️ Fehler beim Laden der Events:', error.message);
}

// Bot starten
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ FEHLER BEIM LOGIN:', error.message);
    process.exit(1);
});

// Ready Event
client.once('ready', async () => {
    console.log(`\n🎉 Bot erfolgreich eingeloggt als ${client.user.tag}`);
    console.log(`📊 Servern: ${client.guilds.cache.size}`);
    console.log(`👥 Nutzer: ${client.users.cache.size}`);

    console.log(`\n⚙️ Konfiguration:`);
    console.log(`🏠 Guild ID: ${process.env.GUILD_ID || 'Nicht gesetzt'}`);
    console.log(`🎫 Ticket Kategorie: ${process.env.TICKET_CATEGORY_ID || 'Nicht gesetzt'}`);
    console.log(`🛡️ Support Rolle: ${process.env.SUPPORT_ROLE_ID || 'Nicht gesetzt'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

    // YouTube Alerts starten (nur RSS, kein API-Key nötig)
    if (process.env.YOUTUBE_CHANNEL_ID && process.env.ALERT_CHANNEL_ID) {
        const ytCfg = {
            channelId: process.env.YOUTUBE_CHANNEL_ID,
            alertChannelId: process.env.ALERT_CHANNEL_ID,
            pingRoleId: process.env.PING_ROLE_ID || null,
            intervalMinutes: Number(process.env.INTERVAL_MINUTES || 5)
        };
        startYouTubeAlerts(client, ytCfg);
        console.log(`✅ YouTube Alerts aktiv für Channel ${ytCfg.channelId}, Intervall ${ytCfg.intervalMinutes}min`);
    } else {
        console.log('ℹ️ YouTube Alerts nicht konfiguriert (prüfe YOUTUBE_CHANNEL_ID, ALERT_CHANNEL_ID).');
    }

    // Nur Guild-Commands registrieren
    try {
        if (process.env.GUILD_ID) {
            const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
            if (guild) {
                await guild.commands.set(commandList);
                console.log(`✅ ${commandList.length} Befehle nur auf Server "${guild.name}" registriert!`);
            } else {
                console.log('❌ Konnte Guild nicht finden – prüfe deine GUILD_ID!');
            }
        } else {
            console.log('⚠️ Keine GUILD_ID gesetzt – keine Befehle registriert.');
        }
    } catch (error) {
        console.error('❌ Fehler beim Registrieren der Guild-Commands:', error.message);
    }
});

// Fehler-Handling
client.on('error', (error) => console.error('❌ Client Error:', error.message));
client.on('warn', (warning) => console.warn('⚠️ Client Warning:', warning));
process.on('unhandledRejection', (error) => console.error('❌ Unhandled Rejection:', error.message));
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Bot wird heruntergefahren...');
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n🛑 Bot wird beendet...');
    client.destroy();
    process.exit(0);
});