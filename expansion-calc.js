// 计算规则层
// 纯函数：根据基础版 + 已启用扩展，算出有效人数交集、叠加时长和适配状态。
// 不碰 localStorage，也不碰 DOM。

function getEnabledExpansions(game) {
  return (game.expansions || []).filter((exp) => exp.enabled);
}

// 启用多个扩展时，支持人数取基础版与所有启用扩展的交集
function getEffectiveRange(game) {
  const enabled = getEnabledExpansions(game);
  const min = Math.max(game.minPlayers, ...enabled.map((exp) => exp.minPlayers));
  const max = Math.min(game.maxPlayers, ...enabled.map((exp) => exp.maxPlayers));
  return { min, max, valid: min <= max };
}

// 时长只叠加启用扩展中"增加最多"的那一项
function getEffectiveDuration(game) {
  const extra = getEnabledExpansions(game).reduce(
    (max, exp) => Math.max(max, Number(exp.extraDuration) || 0),
    0
  );
  return game.duration + extra;
}

// 只有当前人数落在交集内才算适配
function isPlayerCountCompatible(game, count) {
  const range = getEffectiveRange(game);
  return range.valid && count >= range.min && count <= range.max;
}

function getBaseRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

// 参与统计的规则：基础版 + 启用中扩展带来的规则；停用扩展和待归类不算
function getCountableRules(game) {
  return [
    ...getBaseRules(game),
    ...getEnabledExpansions(game).flatMap((exp) => exp.rules || [])
  ];
}

// 扩展不再使用时，它带来的规则留在基础版"待归类"，不能直接丢掉
function retireExpansion(game, expansionId) {
  const expansion = (game.expansions || []).find((exp) => exp.id === expansionId);
  if (!expansion) return;
  game.pendingRules = [...(game.pendingRules || []), ...(expansion.rules || [])];
  game.expansions = game.expansions.filter((exp) => exp.id !== expansionId);
}
