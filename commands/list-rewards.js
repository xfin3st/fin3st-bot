const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllRewards } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-rewards')
    .setDescription('Zeigt alle gesetzten Level-Rewards an.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // nur Admins
    .setDMPermission(false), // nur auf Server

  async execute(interaction) {
    const rewards = getAllRewards(interaction.guild.id);

    if (!rewards.length) {
      return interaction.reply({ content: '❌ Es sind aktuell keine Level-Rewards gesetzt.', ephemeral: true });
    }

    const lines = rewards.map(r => `🔹 Level **${r.level}** → <@&${r.roleId}>`);

    return interaction.reply({
      content: `📜 **Aktuelle Level-Rewards:**\n\n${lines.join('\n')}`,
      ephemeral: false
    });
  }
};