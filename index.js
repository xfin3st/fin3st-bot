const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

    // 1. Versuche dotenv zu verwenden
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
        console.log('⚠️  dotenv fehlgeschlagen:', dotenvError.message);
    }

    // 2. MANUELLES Laden als Fallback
    if (!envLoaded) {
        for (const envPath of envPaths) {
            if (fs.existsSync(envPath)) {
                try {
                    console.log(`📁 Manuelles Laden versuchen: ${envPath}`);
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const envLines = envContent.split('\n');
                    
                    for (const line of envLines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine && !trimmedLine.startsWith('#')) {
                            const equalsIndex = trimmedLine.indexOf('=');
                            if (equalsIndex > 0) {
                                const key = trimmedLine.substring(0, equalsIndex).trim();
                                const value = trimmedLine.substring(equalsIndex + 1).trim();
                                
                                // Entferne Anführungszeichen falls vorhanden
                                const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
                                
                                if (key && cleanValue) {
                                    process.env[key] = cleanValue;
                                    console.log(`   ${key}=${cleanValue.replace(/.(?=.{4})/g, '*')}`);
                                }
                            }
                        }
                    }
                    console.log(`✅ Manuell geladen von: ${envPath}`);
                    envLoaded = true;
                    break;
                } catch (readError) {
                    console.log(`❌ Fehler beim manuellen Laden von ${envPath}:`, readError.message);
                }
            }
        }
    }

    if (!envLoaded) {
        console.log('⚠️  Keine .env Datei gefunden, verwende Prozessvariablen');
    }
}

// Umgebungsvariablen laden
loadEnvironmentVariables();

// DEBUG: Zeige alle relevanten Umgebungsvariablen
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

// Fallback für kritische Variablen
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ KRITISCH: DISCORD_TOKEN fehlt!');
    process.exit(1);
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
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const loadedCommands = new Set();

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                // Cache leeren für Hot-Reloading
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);
                
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
    } else {
        console.log('⚠️  commands Ordner nicht gefunden');
    }
} catch (error) {
    console.log('⚠️  Fehler beim commands Ordner:', error.message);
}

// Lade Events MIT Fehlerbehandlung
const eventsPath = path.join(__dirname, 'events');
try {
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            try {
                const filePath = path.join(eventsPath, file);
                // Cache leeren für Hot-Reloading
                delete require.cache[require.resolve(filePath)];
                const event = require(filePath);
                
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                console.log(`✅ Event geladen: ${event.name}`);
            } catch (error) {
                console.error(`❌ Fehler beim Laden von Event ${file}:`, error.message);
            }
        }
    } else {
        console.log('⚠️  events Ordner nicht gefunden');
    }
} catch (error) {
    console.log('⚠️  Fehler beim events Ordner:', error.message);
}

// Verbindung herstellen MIT Fehlerbehandlung
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ FEHLER BEIM LOGIN:', error.message);
    console.log('💡 Mögliche Ursachen:');
    console.log('1. DISCORD_TOKEN ist ungültig oder abgelaufen');
    console.log('2. Bot hat keine Berechtigungen');
    console.log('3. Netzwerkprobleme');
    process.exit(1);
});

// Ready Event
client.once('clientReady', async () => {
    console.log(`\n🎉 Bot erfolgreich eingeloggt als ${client.user.tag}`);
    console.log(`📊 Servern: ${client.guilds.cache.size}`);
    console.log(`👥 Nutzer: ${client.users.cache.size}`);
    
    // Zeige konfigurierte Werte
    console.log(`\n⚙️  Konfiguration:`);
    console.log(`🏠 Guild ID: ${process.env.GUILD_ID || 'Nicht gesetzt'}`);
    console.log(`🎫 Ticket Kategorie: ${process.env.TICKET_CATEGORY_ID || 'Nicht gesetzt'}`);
    console.log(`🛡️ Support Rolle: ${process.env.SUPPORT_ROLE_ID || 'Nicht gesetzt'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Befehle registrieren
    try {
        console.log('\n🔄 Starte Befehlsregistrierung...');
        
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
        console.error('❌ Fehler beim globalen Registrieren:', error.message);
        
        // Fallback: Für spezifischen Server registrieren
        try {
            let targetGuild = null;
            
            if (process.env.GUILD_ID) {
                targetGuild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
            }
            
            if (!targetGuild) {
                targetGuild = client.guilds.cache.first();
            }
            
            if (targetGuild) {
                await targetGuild.commands.set(commands);
                console.log(`✅ ${commands.length} Befehle auf Server "${targetGuild.name}" registriert!`);
            } else {
                console.log('⚠️  Kein Server für Fallback-Registrierung verfügbar');
            }
        } catch (fallbackError) {
            console.error('❌ Fallback-Registrierung fehlgeschlagen:', fallbackError.message);
        }
    }
});

// Erweiterte Error Handling
client.on('error', (error) => {
    console.error('❌ Client Error:', error.message);
});

client.on('warn', (warning) => {
    console.warn('⚠️  Client Warning:', warning);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error.message);
});

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