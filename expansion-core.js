// 扩展包计算规则层：纯函数，只根据游戏资料算出有效人数、时长和适配结果，不接触页面和存储。
const ExpansionCore = (() => {
  function getEnabledExpansions(game) {
    return (game.expansions || []).filter((expansion) => expansion.enabled);
  }

  // 启用多个扩展时，支持人数取交集；交集为空时 valid 为 false。
  function getEffectivePlayerRange(game) {
    const range = { min: game.minPlayers, max: game.maxPlayers };
    for (const expansion of getEnabledExpansions(game)) {
      range.min = Math.max(range.min, expansion.minPlayers);
      range.max = Math.min(range.max, expansion.maxPlayers);
    }
    range.valid = range.min <= range.max;
    return range;
  }

  // 时长按增加最多的一项叠加到基础版。
  function getEffectiveDuration(game) {
    const maxAdded = getEnabledExpansions(game).reduce(
      (max, expansion) => Math.max(max, expansion.addedDuration),
      0
    );
    return game.duration + maxAdded;
  }

  // 只有当前人数落在交集内才算适配。
  function isPlayerCountCompatible(game, playerCount) {
    const range = getEffectivePlayerRange(game);
    return range.valid && playerCount >= range.min && playerCount <= range.max;
  }

  // 统计用的规则总数：基础版规则 + 待归类 + 启用中扩展带来的规则（停用的不参与计算）。
  function countActiveRules(game) {
    const baseRules = ["forgets", "disputes", "setup", "scoring"].reduce(
      (sum, key) => sum + (game[key] || []).length,
      0
    );
    const expansionRules = getEnabledExpansions(game).reduce(
      (sum, expansion) => sum + expansion.rules.length,
      0
    );
    return baseRules + (game.pending || []).length + expansionRules;
  }

  return { getEnabledExpansions, getEffectivePlayerRange, getEffectiveDuration, isPlayerCountCompatible, countActiveRules };
})();
