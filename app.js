const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

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
      pending: [],
      expansions: [
        {
          id: crypto.randomUUID(),
          name: "贸易与阴谋",
          minPlayers: 2,
          maxPlayers: 5,
          addedDuration: 20,
          enabled: true,
          rules: ["新订单板块在阶段E开始时补充"]
        }
      ]
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
      pending: [],
      expansions: [
        {
          id: crypto.randomUUID(),
          name: "失落的舰队",
          minPlayers: 1,
          maxPlayers: 4,
          addedDuration: 30,
          enabled: false,
          rules: ["失落舰队移动不触发被动充能"]
        }
      ]
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
      pending: ["水晶瓷砖扩展的计分方式"],
      expansions: []
    }
  ]
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  fitLabel: document.querySelector("#fitLabel"),
  fitCount: document.querySelector("#fitCount"),
  visibleCount: document.querySelector("#visibleCount")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  let loaded;
  if (!saved) {
    loaded = structuredClone(defaultState);
  } else {
    try {
      loaded = { ...structuredClone(defaultState), ...JSON.parse(saved) };
    } catch {
      loaded = structuredClone(defaultState);
    }
  }
  loaded.games.forEach((game) => ExpansionData.normalizeGame(game));
  return loaded;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getSearchText(game) {
  const expansionText = (game.expansions || [])
    .map((expansion) => `${expansion.name}${expansion.rules.join("")}`)
    .join("");
  const baseText = ["forgets", "disputes", "setup", "scoring"].map((key) => game[key].join("")).join("");
  return `${game.name}${baseText}${game.pending.join("")}${expansionText}`;
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const matchesKeyword = !keyword || getSearchText(game).includes(keyword);
    const matchesPlayer = player === "all" || ExpansionCore.isPlayerCountCompatible(game, Number(player));
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + ExpansionCore.countActiveRules(game), 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";

  const player = els.playerFilter.value;
  if (player === "all") {
    els.fitLabel.textContent = "当前适配";
    els.fitCount.textContent = "-";
  } else {
    const fitCount = state.games.filter((game) => ExpansionCore.isPlayerCountCompatible(game, Number(player))).length;
    els.fitLabel.textContent = `适配${player}人`;
    els.fitCount.textContent = `${fitCount}款`;
  }
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        const range = ExpansionCore.getEffectivePlayerRange(game);
        const duration = ExpansionCore.getEffectiveDuration(game);
        const enabledCount = ExpansionCore.getEnabledExpansions(game).length;
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill ${range.valid ? "" : "unfit"}">${range.valid ? `${range.min}-${range.max}人` : "人数无交集"}</span>
                <span class="pill">${duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
                ${enabledCount ? `<span class="pill">扩展×${enabledCount}</span>` : ""}
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  const range = ExpansionCore.getEffectivePlayerRange(game);
  const duration = ExpansionCore.getEffectiveDuration(game);
  const enabled = ExpansionCore.getEnabledExpansions(game);
  const player = els.playerFilter.value;
  const fitPill =
    player === "all"
      ? ""
      : ExpansionCore.isPlayerCountCompatible(game, Number(player))
        ? `<span class="pill fit">${player}人适配</span>`
        : `<span class="pill unfit">${player}人不适配</span>`;
  const baseNote = enabled.length
    ? `<p class="base-note">基础版 ${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟；已启用 ${enabled.length} 个扩展，人数取交集、时长按增加最多的一项叠加。</p>`
    : "";
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill ${range.valid ? "" : "unfit"}">${range.valid ? `${range.min}-${range.max}人` : "人数无交集"}</span>
          <span class="pill">${duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
          ${enabled.length ? `<span class="pill">扩展×${enabled.length}</span>` : ""}
          ${fitPill}
        </div>
        ${baseNote}
      </div>
      ${renderExpansionSection(game)}
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      ${renderPendingSection(game)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderExpansionSection(game) {
  const items = game.expansions
    .map((expansion) => {
      const rules = expansion.rules
        .map(
          (rule, index) => `
            <li>
              <span>${escapeHtml(rule)}</span>
              <button type="button" title="删除" data-exp-rule-delete="${expansion.id}" data-exp-rule-index="${index}">×</button>
            </li>
          `
        )
        .join("");
      return `
        <div class="expansion-item ${expansion.enabled ? "" : "disabled"}">
          <div class="expansion-head">
            <strong>${escapeHtml(expansion.name)}</strong>
            <span class="pill">${expansion.minPlayers}-${expansion.maxPlayers}人</span>
            <span class="pill">+${expansion.addedDuration}分钟</span>
            <span class="pill ${expansion.enabled ? "fit" : "warn"}">${expansion.enabled ? "已启用" : "已停用"}</span>
          </div>
          <ul class="rule-list">${rules || `<li><span>暂无扩展规则。</span></li>`}</ul>
          <form class="exp-rule-form" data-exp-rule-form="${expansion.id}">
            <input placeholder="补充这条扩展带来的规则" required />
            <button type="submit">添加</button>
          </form>
          <div class="expansion-actions">
            <button type="button" data-exp-toggle="${expansion.id}">${expansion.enabled ? "停用" : "启用"}</button>
            <button type="button" data-exp-retire="${expansion.id}" title="移除扩展包，带来的规则转入待归类">不再使用</button>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="rule-section expansion-section">
      <h3>扩展包</h3>
      <p class="base-note">启用多个时人数取交集，时长按增加最多的一项叠加；停用后仍显示但不参与计算。</p>
      ${items || `<p class="empty">还没有登记扩展包。</p>`}
      <form class="expansion-form" id="expansionForm">
        <input id="expNameInput" placeholder="扩展包名称" required />
        <div class="expansion-grid">
          <input id="expMinInput" type="number" min="1" max="12" value="1" placeholder="最少人数" title="最少人数" required />
          <input id="expMaxInput" type="number" min="1" max="12" value="4" placeholder="最多人数" title="最多人数" required />
          <input id="expDurationInput" type="number" min="0" value="30" placeholder="增加时长(分钟)" title="增加时长(分钟)" required />
        </div>
        <button class="primary" type="submit">登记扩展包</button>
      </form>
    </section>
  `;
}

function renderPendingSection(game) {
  const items = game.pending
    .map(
      (item, index) => `
        <li>
          <span>${escapeHtml(item)}</span>
          <select data-pending-assign="${index}">
            <option value="">归类到…</option>
            <option value="forgets">容易忘的规则</option>
            <option value="disputes">常见争议</option>
            <option value="setup">开局准备</option>
            <option value="scoring">计分提醒</option>
          </select>
          <button type="button" title="删除" data-pending-delete="${index}">×</button>
        </li>
      `
    )
    .join("");
  return `
    <section class="rule-section">
      <h3>待归类</h3>
      <p class="base-note">不再使用的扩展包留下的规则，归类后进入上方对应卡片。</p>
      <ul class="rule-list">${items || `<li><span>暂无内容。</span></li>`}</ul>
    </section>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"],
    pending: [],
    expansions: []
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (event.target.id === "ruleForm") {
    event.preventDefault();
    const key = document.querySelector("#ruleTypeInput").value;
    const text = document.querySelector("#ruleTextInput").value.trim();
    if (!text) return;
    game[key].push(text);
    renderAll();
    return;
  }

  if (event.target.id === "expansionForm") {
    event.preventDefault();
    const name = document.querySelector("#expNameInput").value.trim();
    if (!name) return;
    game.expansions.push(
      ExpansionData.createExpansion({
        name,
        minPlayers: document.querySelector("#expMinInput").value,
        maxPlayers: document.querySelector("#expMaxInput").value,
        addedDuration: document.querySelector("#expDurationInput").value
      })
    );
    renderAll();
    return;
  }

  const expansionId = event.target.dataset.expRuleForm;
  if (expansionId) {
    event.preventDefault();
    const expansion = game.expansions.find((item) => item.id === expansionId);
    const text = event.target.querySelector("input").value.trim();
    if (expansion && text) expansion.rules.push(text);
    renderAll();
  }
});

els.detailView.addEventListener("change", (event) => {
  const assignSelect = event.target.closest("[data-pending-assign]");
  if (!assignSelect || !assignSelect.value) return;
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const [text] = game.pending.splice(Number(assignSelect.dataset.pendingAssign), 1);
  if (text) game[assignSelect.value].push(text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  const ruleButton = event.target.closest("[data-rule-key]");
  if (ruleButton) {
    game[ruleButton.dataset.ruleKey].splice(Number(ruleButton.dataset.ruleIndex), 1);
    renderAll();
    return;
  }

  const pendingDelete = event.target.closest("[data-pending-delete]");
  if (pendingDelete) {
    game.pending.splice(Number(pendingDelete.dataset.pendingDelete), 1);
    renderAll();
    return;
  }

  const expToggle = event.target.closest("[data-exp-toggle]");
  if (expToggle) {
    const expansion = game.expansions.find((item) => item.id === expToggle.dataset.expToggle);
    if (expansion) expansion.enabled = !expansion.enabled;
    renderAll();
    return;
  }

  const expRetire = event.target.closest("[data-exp-retire]");
  if (expRetire) {
    ExpansionData.retireExpansion(game, expRetire.dataset.expRetire);
    renderAll();
    return;
  }

  const expRuleDelete = event.target.closest("[data-exp-rule-delete]");
  if (expRuleDelete) {
    const expansion = game.expansions.find((item) => item.id === expRuleDelete.dataset.expRuleDelete);
    if (expansion) expansion.rules.splice(Number(expRuleDelete.dataset.expRuleIndex), 1);
    renderAll();
    return;
  }

  if (event.target.closest("#playedTodayBtn")) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
    return;
  }

  if (event.target.closest("#deleteGameBtn")) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
