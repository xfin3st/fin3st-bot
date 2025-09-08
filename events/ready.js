const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Eingeloggt als ${client.user.tag}!`);
        console.log(`🌐 Bot ist auf ${client.guilds.cache.size} Servern`);

        // Status mit mehr Details
        const activities = [
            { name: 'https://fin3st.de 👑', type: ActivityType.Watching },
            { name: `${client.guilds.cache.size} Servern`, type: ActivityType.Watching },
            { name: `${client.users.cache.size} Nutzern`, type: ActivityType.Listening }
        ];

        // Rotierende Statusnachrichten
        let activityIndex = 0;
        setInterval(() => {
            client.user.setActivity(activities[activityIndex]);
            activityIndex = (activityIndex + 1) % activities.length;
        }, 30000); // Wechselt alle 30 Sekunden

        // Setze den initialen Status
        client.user.setPresence({
            activities: [activities[0]],
            status: 'online'
        });

        // Logge weitere Informationen
        console.log(`📊 Insgesamt ${client.users.cache.size} Nutzer erreichbar`);
        console.log(`🔄 Bot startete um: ${new Date().toLocaleString('de-DE')}`);
    }
};