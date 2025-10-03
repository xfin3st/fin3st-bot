const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, getAllRewards } = require('../features/levels');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-rewards')
    .setDescription('Synchronisiert alle Level-Rollen mit den aktuellen Rewards.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rewards = getAllRewards(interaction.guild.id);
    if (!rewards.length) {
      return interaction.editReply('❌ Keine Rewards gesetzt.');
    }

    let applied = 0;
    let skipped = 0;
    let logLines = [];

    for (const [id, member] of interaction.guild.members.cache) {
      const rec = getUser(interaction.guild.id, id);
      if (!rec) continue;

      for (const reward of rewards) {
        if (rec.level >= reward.level && !member.roles.cache.has(reward.roleId)) {
          try {
            await member.roles.add(reward.roleId);
            applied++;
            logLines.push(`✅ ${member.user.tag} → <@&${reward.roleId}> (Level ${rec.level})`);
            console.log(`✅ Rolle ${reward.roleId} an ${member.user.tag} vergeben (Level ${rec.level})`);
            await sleep(1000);
          } catch (e) {
            skipped++;
            console.error(`❌ Fehler bei Rolle ${reward.roleId} für ${member.user.tag}:`, e.message);
            logLines.push(`❌ ${member.user.tag} → <@&${reward.roleId}> (Fehler: ${e.message})`);
          }
        } else if (rec.level >= reward.level) {
          skipped++;
          console.log(`ℹ️ ${member.user.tag} erfüllt Level ${reward.level}, hat Rolle aber schon oder keine Rechte`);
          logLines.push(`ℹ️ ${member.user.tag} erfüllt Level ${reward.level}, hat Rolle aber schon oder Bot hat keine Rechte`);
        }
      }
    }

    if (!applied && !skipped) {
      return interaction.editReply('ℹ️ Rewards synchronisiert, aber es wurden keine Änderungen vorgenommen.');
    }

    const replyMsg = 
      `✅ Rewards synchronisiert.\n` +
      `• **${applied}** Rollen vergeben\n` +
      `• **${skipped}** übersprungen\n\n` +
      logLines.join('\n');

    return interaction.editReply(
      replyMsg.length > 1900 ? replyMsg.slice(0, 1900) + '\n… (gekürzt)' : replyMsg
    );
  }
};