// diagnose-commands.js
const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('🔍 Überprüfe Befehle auf Dopplungen:');
const commandNames = {};

for (const file of commandFiles) {
    try {
        const command = require(path.join(commandsPath, file));
        if (command.data && command.data.name) {
            console.log(`- ${command.data.name} (aus ${file})`);
            
            if (commandNames[command.data.name]) {
                console.log(`❌ DOPPELT: ${command.data.name} in ${file} und ${commandNames[command.data.name]}`);
            } else {
                commandNames[command.data.name] = file;
            }
        }
    } catch (error) {
        console.log(`❌ Fehler in ${file}:`, error.message);
    }
}

console.log('\n✅ Einmalige Befehle:', Object.keys(commandNames));
