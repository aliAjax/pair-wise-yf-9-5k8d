// 扩展资料层
// 只负责数据长什么样、默认数据、localStorage 读写和旧数据迁移。
// 计算规则见 expansion-calc.js，页面接入见 app.js。

const storageKey = "zfl18-boardgame-rule-cards";

function createExpansion(name, minPlayers, maxPlayers, extraDuration, rules = []) {
  return {
    id: crypto.randomUUID(),
    name,
    minPlayers,
    maxPlayers,
    extraDuration,
    enabled: true,
    rules
  };
}

const defaultState = {
  selectedId: "",
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"],
      expansions: [
        {
          ...createExpansion("奥尔良：入侵", 2, 5, 30, ["入侵模式每轮结束先结算共同防御威胁", "统帅标记顺时针轮换，跳过会少一轮收益"]),
          enabled: true
        },
        {
          ...createExpansion("奥尔良：新随从", 2, 4, 15, ["新随从能力结算前先读附录示例"]),
          enabled: false
        }
      ],
      pendingRules: ["旧版合作扩遗留：合作模式共享商站计分"]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"],
      expansions: [
        {
          ...createExpansion("盖亚计划：失落的舰队", 1, 4, 20, ["失落舰队板块放置后不触发邻近充能"]),
          enabled: true
        }
      ],
      pendingRules: []
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"],
      expansions: [],
      pendingRules: []
    }
  ]
};

function normalizeGame(game) {
  const expansions = Array.isArray(game.expansions) ? game.expansions : [];
  return {
    ...game,
    expansions: expansions.map((exp) => ({
      minPlayers: 1,
      maxPlayers: 12,
      extraDuration: 0,
      enabled: true,
      rules: [],
      ...exp
    })),
    pendingRules: Array.isArray(game.pendingRules) ? game.pendingRules : []
  };
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = { ...structuredClone(defaultState), ...JSON.parse(saved) };
    parsed.games = (parsed.games || []).map(normalizeGame);
    return parsed;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
