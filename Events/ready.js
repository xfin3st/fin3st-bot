const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Eingeloggt als ${client.user.tag}!`);
        
        // Setze den Status des Bots
        client.user.setActivity('deinem Server', { type: 'WATCHING' });
    },
};
