const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Eingeloggt als ${client.user.tag}!`);
        
        const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Eingeloggt als ${client.user.tag}!`);
        
        // Setze den Status des Bots
        client.user.setActivity('deinem Server', { type: 'WATCHING' });
        
         // Standard-Presence beim Start
  client.user.setPresence({
    activities: [
      {
        name: 'https://fin3st.de 👑', // dein Text hier
        type: 3               // 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 5 = Competing
      }
    ],
    status: 'online' // online | idle | dnd | invisible
    },
};