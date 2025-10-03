const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, getAllRewards } = require('../features/levels');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-rewards')
    .setDescription('Synchronisiert alle Level-Rollen mit den aktuellen Rewards.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // nur Admins
    .setDMPermission(false), // kein DM-Befehl

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rewards = getAllRewards(interaction.guild.id);
    if (!rewards.length) {
      return interaction.editReply('❌ Keine Rewards gesetzt.');
    }

    let applied = 0;
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
            await sleep(1000); // Delay gegen Spam
          } catch (e) {
            console.error(`❌ Fehler bei Rolle ${reward.roleId} für ${member.user.tag}:`, e.message);
            logLines.push(`❌ Fehler bei ${member.user.tag} → <@&${reward.roleId}>`);
          }
        } else if (rec.level >= reward.level) {
          console.log(`ℹ️ ${member.user.tag} erfüllt Level ${reward.level}, hat Rolle aber schon oder keine Rechte`);
        }
      }
    }

    if (!applied) {
      return interaction.editReply('ℹ️ Rewards synchronisiert, aber es wurden keine neuen Rollen vergeben.');
    }

    const replyMsg = `✅ Rewards synchronisiert. Insgesamt **${applied}** Rollen vergeben:\n\n${logLines.join('\n')}`;

    return interaction.editReply(
      replyMsg.length > 1900 ? replyMsg.slice(0, 1900) + '\n… (gekürzt)' : replyMsg
    );
  }
};