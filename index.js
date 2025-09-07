const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Erstelle einen neuen Client (OHNE manuelle Cache-Limits)
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
    const loadedCommands = new Set(); // Um Dopplungen zu vermeiden

    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            
            // Prüfe auf doppelte Befehlsnamen
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

// Verbindung herstellen
client.login(process.env.DISCORD_TOKEN);

// NACH client.login() - Befehle automatisch registrieren MIT Fehlerbehandlung
client.once('clientReady', async () => {
    try {
        console.log('🔄 Starte Befehlsregistrierung...');
        
        const commands = [];
        const commandNames = new Set(); // Für Dopplungserkennung

        // Prüfe ob commands Ordner existiert
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const command = require(path.join(commandsPath, file));
                    
                    // Verhindere doppelte Befehlsnamen
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

        // ZUERST: Vorhandene Befehle löschen um Dopplungen zu vermeiden
        await client.application.commands.set([]);
        console.log('✅ Alte Befehle gelöscht');

        // DANN: Neue Befehle registrieren
        await client.application.commands.set(commands);
        
        console.log(`✅ ${commands.length} Befehle erfolgreich registriert!`);
        
    } catch (error) {
        console.error('❌ Fehler beim Registrieren:', error);
        
        // Fallback: Nur für diesen Server registrieren
        try {
            const guild = client.guilds.cache.first();
            if (guild) {
                await guild.commands.set(commands);
                console.log(`✅ ${commands.length} Befehle auf Server "${guild.name}" registriert!`);
            }
        } catch (fallbackError) {
            console.error('❌ Auch Fallback-Registrierung fehlgeschlagen:', fallbackError);
        }
    }
});