const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// DEBUG: Zeige alle verfügbaren Umgebungsvariablen
console.log('🔍 Überprüfe Umgebungsvariablen:');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '✅ Vorhanden' : '❌ Fehlt');
console.log('TICKET_CATEGORY_ID:', process.env.TICKET_CATEGORY_ID || '❌ Fehlt');
console.log('SUPPORT_ROLE_ID:', process.env.SUPPORT_ROLE_ID || '❌ Fehlt');
console.log('GUILD_ID:', process.env.GUILD_ID || '❌ Fehlt');

// Versuche .env manuell zu laden falls nicht vorhanden
if (!process.env.DISCORD_TOKEN) {
    console.log('🔄 Versuche .env manuell zu laden...');
    try {
        // Prüfe verschiedene .env Dateien
        const envPaths = [
            path.join(__dirname, '.env'),
            path.join(__dirname, 'stack.env'),
            '/etc/secrets/.env'
        ];
        
        let envLoaded = false;
        for (const envPath of envPaths) {
            if (fs.existsSync(envPath)) {
                require('dotenv').config({ path: envPath });
                console.log(`✅ .env geladen von: ${envPath}`);
                envLoaded = true;
                break;
            }
        }
        
        if (!envLoaded) {
            console.log('⚠️  Keine .env Datei gefunden');
        }
    } catch (error) {
        console.log('❌ Fehler beim Laden von .env:', error.message);
    }
}

// Erstelle einen neuen Client
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

// Sammlung für Befehle
client.commands = new Collection();

// Lade Befehle MIT Fehlerbehandlung
const commandsPath = path.join(__dirname, 'commands');
try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const loadedCommands = new Set();

    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            
            if (loadedCommands.has(command.data.name)) {
                console.log(`❌ Überspringe doppelten Befehl: ${command.data.name} (in ${file})`);
                continue;
            }
            
            client.commands.set(command.data.name, command);
            loadedCommands.add(command.data.name);
            console.log(`✅ Befehl geladen: ${command.data.name}`);
            
        } catch (error) {
            console.error(`❌ Fehler beim Laden von ${file}:`, error.message);
        }
    }
} catch (error) {
    console.log('⚠️  commands Ordner nicht gefunden:', error.message);
}

// Lade Events MIT Fehlerbehandlung
const eventsPath = path.join(__dirname, 'events');
try {
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            try {
                const event = require(path.join(eventsPath, file));
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args));
                } else {
                    client.on(event.name, (...args) => event.execute(...args));
                }
                console.log(`✅ Event geladen: ${event.name}`);
            } catch (error) {
                console.error(`❌ Fehler beim Laden von Event ${file}:`, error.message);
            }
        }
    } else {
        console.log('⚠️  events Ordner nicht gefunden, überspringe...');
    }
} catch (error) {
    console.log('⚠️  Fehler beim Laden von events:', error.message);
}

// Verbindung herstellen MIT Fehlerbehandlung
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ FEHLER BEIM LOGIN:', error);
    console.log('💡 Mögliche Ursachen:');
    console.log('1. DISCORD_TOKEN ist nicht in der .env Datei');
    console.log('2 .env Datei ist nicht korrekt formatiert');
    console.log('3. Bot-Token ist ungültig');
    process.exit(1);
});

// NACH client.login() - Befehle automatisch registrieren
client.once('ready', async () => {
    console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
    console.log(`🏠 Guild ID: ${process.env.GUILD_ID}`);
    console.log(`🎫 Ticket Kategorie: ${process.env.TICKET_CATEGORY_ID}`);
    console.log(`🛡️ Support Rolle: ${process.env.SUPPORT_ROLE_ID}`);
    
    try {
        console.log('🔄 Starte Befehlsregistrierung...');
        
        const commands = [];
        const commandNames = new Set();

        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const command = require(path.join(commandsPath, file));
                    
                    if (commandNames.has(command.data.name)) {
                        console.log(`❌ Überspringe doppelten Befehl: ${command.data.name}`);
                        continue;
                    }
                    
                    commands.push(command.data.toJSON());
                    commandNames.add(command.data.name);
                    console.log(`✅ Befehl vorbereitet: ${command.data.name}`);
                    
                } catch (error) {
                    console.error(`❌ Fehler in ${file}:`, error.message);
                }
            }
        }

        // Global registrieren
        await client.application.commands.set(commands);
        console.log(`✅ ${commands.length} Befehle global registriert!`);
        
    } catch (error) {
        console.error('❌ Fehler beim globalen Registrieren:', error);
        
        // Fallback: Für spezifischen Server registrieren
        try {
            if (process.env.GUILD_ID) {
                const guild = await client.guilds.fetch(process.env.GUILD_ID);
                await guild.commands.set(commands);
                console.log(`✅ ${commands.length} Befehle auf Server "${guild.name}" registriert!`);
            } else {
                const guild = client.guilds.cache.first();
                if (guild) {
                    await guild.commands.set(commands);
                    console.log(`✅ ${commands.length} Befehle auf Server "${guild.name}" registriert!`);
                }
            }
        } catch (fallbackError) {
            console.error('❌ Auch Fallback-Registrierung fehlgeschlagen:', fallbackError);
        }
    }
});

// Error Handling
client.on('error', (error) => {
    console.error('❌ Client Error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});