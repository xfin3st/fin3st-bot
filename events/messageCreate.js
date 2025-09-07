const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    execute(message) {
        // Ignoriere Nachrichten von Bots
        if (message.author.bot) return;
        
        // Einfacher Ping-Befehl
        if (message.content.toLowerCase() === '!ping') {
            message.reply('🏓 Pong!');
        }
        
        // Automod: Beleidigungen filtern
        const badWords = ['hasswort1', 'hasswort2']; // Ersetze mit echten Beleidigungen
        const containsBadWord = badWords.some(word => 
            message.content.toLowerCase().includes(word)
        );
        
        if (containsBadWord) {
            message.delete();
            message.channel.send(`${message.author}, bitte verwende keine Beleidigungen!`)
                .then(msg => {
                    setTimeout(() => msg.delete(), 5000);
                });
        }
    },
};