const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setLevelReward, getAllRewards } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-reward')
    .setDescription('Setzt eine Belohnungsrolle für ein bestimmtes Level.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(o => 
      o.setName('level')
       .setDescription('Das Level, ab dem die Rolle vergeben wird')
       .setRequired(true)
       .setMinValue(1)
    )
    .addRoleOption(o => 
      o.setName('rolle')
       .setDescription('Die Rolle, die vergeben werden soll')
       .setRequired(true)
    ),

  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('rolle');

    setLevelReward(interaction.guild.id, level, role.id);

    // Alle Rewards aus DB holen
    const rewards = getAllRewards(interaction.guild.id);

    const lines = rewards.map(r => {
      const roleMention = `<@&${r.roleId}>`;
      return `🔹 Level **${r.level}** → ${roleMention}`;
    });

    return interaction.reply({ 
      content: `✅ Belohnung gesetzt: Ab Level **${level}** gibt es die Rolle ${role}.\n\n📜 Aktuelle Rewards:\n${lines.join('\n')}`, 
      ephemeral: false 
    });
  }
};