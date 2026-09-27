// 页面接入层
// 负责渲染和事件，把扩展资料层（expansion-data.js）和计算规则层（expansion-calc.js）接到页面上。

const today = new Date();

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

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getSearchText(game) {
  return [
    game.name,
    ...getBaseRules(game),
    ...(game.expansions || []).flatMap((exp) => [exp.name, ...(exp.rules || [])]),
    ...(game.pendingRules || [])
  ].join("");
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const matchesKeyword = !keyword || getSearchText(game).includes(keyword);
    const matchesPlayer = player === "all" || isPlayerCountCompatible(game, Number(player));
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
  const allRuleCount = state.games.reduce((sum, game) => sum + getCountableRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  const player = els.playerFilter.value;
  const fitCount =
    player === "all" ? null : state.games.filter((game) => isPlayerCountCompatible(game, Number(player))).length;
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
  els.fitLabel.textContent = player === "all" ? "人数适配" : `${player}人适配`;
  els.fitCount.textContent = fitCount === null ? "-" : `${fitCount}款`;
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        const range = getEffectiveRange(game);
        const rangeText = range.valid ? `${range.min}-${range.max}人` : "人数冲突";
        const expansionTotal = (game.expansions || []).length;
        const expansionPill = expansionTotal
          ? `<span class="pill exp">扩展${getEnabledExpansions(game).length}/${expansionTotal}</span>`
          : "";
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
                <span class="pill">${rangeText}</span>
                <span class="pill">${getEffectiveDuration(game)}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
                ${expansionPill}
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

  const range = getEffectiveRange(game);
  const rangeText = range.valid ? `${range.min}-${range.max}人` : "人数冲突";
  const enabledCount = getEnabledExpansions(game).length;
  const expansionTotal = (game.expansions || []).length;
  const player = els.playerFilter.value;
  const fitPill =
    player === "all"
      ? ""
      : isPlayerCountCompatible(game, Number(player))
        ? `<span class="pill fit">当前${player}人·适配</span>`
        : `<span class="pill unfit">当前${player}人·不适配</span>`;
  const expansionNote = expansionTotal
    ? `<p class="detail-note">扩展启用${enabledCount}/${expansionTotal} · 基础版${game.minPlayers}-${game.maxPlayers}人 / ${game.duration}分钟</p>`
    : "";

  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${rangeText}</span>
          <span class="pill">${getEffectiveDuration(game)}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
          ${fitPill}
        </div>
        ${expansionNote}
      </div>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      ${renderExpansionSection(game)}
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

function renderExpansionSection(game) {
  const cards = (game.expansions || [])
    .map((exp) => {
      const disabled = exp.enabled ? "" : "disabled";
      const statePill = exp.enabled
        ? `<span class="pill fit">参与计算</span>`
        : `<span class="pill unfit">已停用·不参与计算</span>`;
      return `
        <div class="expansion-card ${disabled}">
          <div class="expansion-head">
            <strong>${escapeHtml(exp.name)}</strong>
            <div class="expansion-actions">
              <button type="button" data-exp-toggle="${exp.id}">${exp.enabled ? "停用" : "启用"}</button>
              <button type="button" title="移除扩展，规则转入待归类" data-exp-remove="${exp.id}">移除</button>
            </div>
          </div>
          <div class="game-meta">
            <span class="pill">${exp.minPlayers}-${exp.maxPlayers}人</span>
            <span class="pill">+${exp.extraDuration}分钟</span>
            ${statePill}
          </div>
          <ul class="rule-list">
            ${
              (exp.rules || [])
                .map(
                  (rule, index) => `
                    <li>
                      <span>${escapeHtml(rule)}</span>
                      <button type="button" title="删除" data-exp-rule-del="${exp.id}" data-rule-index="${index}">×</button>
                    </li>
                  `
                )
                .join("") || `<li><span>暂无扩展规则。</span></li>`
            }
          </ul>
          <form class="exp-rule-form" data-exp-id="${exp.id}">
            <input name="expRuleText" placeholder="给这个扩展补一条规则" required />
            <button type="submit">添加</button>
          </form>
        </div>
      `;
    })
    .join("");

  return `
    <section class="rule-section">
      <h3>扩展包</h3>
      ${cards || `<p class="empty">还没有登记扩展包。</p>`}
      <form class="expansion-form" id="expansionForm">
        <input id="expNameInput" placeholder="扩展名，例：奥尔良：入侵" required />
        <div class="triple">
          <label>
            最少人数
            <input id="expMinInput" type="number" min="1" max="12" value="2" required />
          </label>
          <label>
            最多人数
            <input id="expMaxInput" type="number" min="1" max="12" value="4" required />
          </label>
          <label>
            增加时长
            <input id="expDurationInput" type="number" min="0" value="30" required />
          </label>
        </div>
        <button class="primary" type="submit">登记扩展包</button>
      </form>
    </section>
  `;
}

function renderPendingSection(game) {
  const items = (game.pendingRules || [])
    .map(
      (rule, index) => `
        <li class="pending-item">
          <span>${escapeHtml(rule)}</span>
          <div class="pending-actions">
            <select data-pending-select="${index}">
              <option value="forgets">容易忘的规则</option>
              <option value="disputes">常见争议</option>
              <option value="setup">开局准备</option>
              <option value="scoring">计分提醒</option>
            </select>
            <button type="button" data-pending-classify="${index}">归类</button>
            <button type="button" title="删除" data-pending-del="${index}">×</button>
          </div>
        </li>
      `
    )
    .join("");

  return `
    <section class="rule-section">
      <h3>待归类（来自移除的扩展）</h3>
      <ul class="rule-list">
        ${items || `<li><span>暂无待归类规则。</span></li>`}
      </ul>
    </section>
  `;
}

function renderAll() {
  saveState(state);
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
    expansions: [],
    pendingRules: []
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
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (event.target.id === "ruleForm") {
    const key = document.querySelector("#ruleTypeInput").value;
    const text = document.querySelector("#ruleTextInput").value.trim();
    if (!text) return;
    game[key].push(text);
    renderAll();
  }

  if (event.target.id === "expansionForm") {
    const name = document.querySelector("#expNameInput").value.trim();
    const minPlayers = Number(document.querySelector("#expMinInput").value);
    const maxPlayers = Math.max(minPlayers, Number(document.querySelector("#expMaxInput").value));
    const extraDuration = Math.max(0, Number(document.querySelector("#expDurationInput").value));
    if (!name) return;
    game.expansions.push(createExpansion(name, minPlayers, maxPlayers, extraDuration));
    renderAll();
  }

  if (event.target.matches(".exp-rule-form")) {
    const expansion = (game.expansions || []).find((exp) => exp.id === event.target.dataset.expId);
    const input = event.target.querySelector("input[name='expRuleText']");
    const text = input.value.trim();
    if (!expansion || !text) return;
    expansion.rules.push(text);
    renderAll();
  }
});

els.detailView.addEventListener("click", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const toggleButton = event.target.closest("[data-exp-toggle]");
  const removeButton = event.target.closest("[data-exp-remove]");
  const expRuleButton = event.target.closest("[data-exp-rule-del]");
  const classifyButton = event.target.closest("[data-pending-classify]");
  const pendingDelButton = event.target.closest("[data-pending-del]");

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }

  if (toggleButton) {
    const expansion = (game.expansions || []).find((exp) => exp.id === toggleButton.dataset.expToggle);
    if (expansion) expansion.enabled = !expansion.enabled;
    renderAll();
  }

  if (removeButton) {
    retireExpansion(game, removeButton.dataset.expRemove);
    renderAll();
  }

  if (expRuleButton) {
    const expansion = (game.expansions || []).find((exp) => exp.id === expRuleButton.dataset.expRuleDel);
    if (expansion) expansion.rules.splice(Number(expRuleButton.dataset.ruleIndex), 1);
    renderAll();
  }

  if (classifyButton) {
    const index = Number(classifyButton.dataset.pendingClassify);
    const select = document.querySelector(`[data-pending-select="${index}"]`);
    const key = select?.value;
    if (key && game.pendingRules[index] != null) {
      game[key].push(game.pendingRules[index]);
      game.pendingRules.splice(index, 1);
    }
    renderAll();
  }

  if (pendingDelButton) {
    game.pendingRules.splice(Number(pendingDelButton.dataset.pendingDel), 1);
    renderAll();
  }
});

setDefaultDate();
renderAll();
