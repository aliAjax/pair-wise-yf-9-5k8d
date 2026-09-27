// 扩展包资料层：只负责扩展包与待归类规则的数据结构和迁移，不涉及计算和页面渲染。
const ExpansionData = (() => {
  function createExpansion({ name, minPlayers, maxPlayers, addedDuration }) {
    const min = Number(minPlayers) || 1;
    return {
      id: crypto.randomUUID(),
      name,
      minPlayers: min,
      maxPlayers: Math.max(min, Number(maxPlayers) || min),
      addedDuration: Math.max(0, Number(addedDuration) || 0),
      enabled: true,
      rules: []
    };
  }

  function normalizeExpansion(expansion) {
    const minPlayers = Number(expansion.minPlayers) || 1;
    return {
      id: expansion.id || crypto.randomUUID(),
      name: expansion.name || "未命名扩展",
      minPlayers,
      maxPlayers: Math.max(minPlayers, Number(expansion.maxPlayers) || minPlayers),
      addedDuration: Math.max(0, Number(expansion.addedDuration) || 0),
      enabled: expansion.enabled !== false,
      rules: Array.isArray(expansion.rules) ? expansion.rules : []
    };
  }

  // 旧存档没有扩展包和待归类字段，加载时补齐。
  function normalizeGame(game) {
    game.pending = Array.isArray(game.pending) ? game.pending : [];
    game.expansions = Array.isArray(game.expansions) ? game.expansions.map(normalizeExpansion) : [];
    return game;
  }

  // 扩展包不再使用：移除扩展本身，但它带来的规则留在基础版待归类，不能直接丢掉。
  function retireExpansion(game, expansionId) {
    const expansion = game.expansions.find((item) => item.id === expansionId);
    if (!expansion) return;
    game.pending.push(...expansion.rules);
    game.expansions = game.expansions.filter((item) => item.id !== expansionId);
  }

  return { createExpansion, normalizeExpansion, normalizeGame, retireExpansion };
})();
