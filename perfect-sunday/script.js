// Perfect Sunday: game engine and screens.
// Data lives in characters.js, worlds.js and events.js; this file only runs the game.

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clampHP = (n) => Math.max(0, n);
  const WIN_AT = 10;

  // ---------- saved stats (per browser) ----------
  const STORE_KEY = "perfectSunday.v1";
  const store = (() => {
    let d = { played: 0, wins: {}, picks: {}, muted: false, fast: false };
    try { d = Object.assign(d, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch {}
    return {
      d,
      save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch {} },
    };
  })();

  // ---------- sound (tiny synth, starts after first tap) ----------
  let actx = null;
  // iPhone/iPad Safari keeps audio silent until the audio context is resumed inside a tap,
  // so unlock it on every tap or key press (cheap once it is running). "playback" lets
  // sound play even when the phone's silent switch is on; the in-game mute still works.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  function unlockAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== "running") actx.resume();
      const b = actx.createBuffer(1, 1, 22050), s = actx.createBufferSource();
      s.buffer = b; s.connect(actx.destination); s.start(0);
    } catch {}
  }
  ["pointerdown", "touchend", "keydown", "click"].forEach((ev) => addEventListener(ev, unlockAudio, { capture: true, passive: true }));
  function audio() {
    if (store.d.muted) return null;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    return actx;
  }
  function tone(freq, dur = 0.08, type = "sine", vol = 0.07, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    click: () => tone(660, 0.05, "triangle", 0.05),
    roll: () => { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 300, 0.04, "square", 0.025, i * 0.07); },
    step: () => tone(520, 0.05, "triangle", 0.04),
    flip: () => { tone(900, 0.03, "triangle", 0.04); tone(1200, 0.03, "triangle", 0.03, 0.04); },
    up: () => { tone(523, 0.1, "triangle", 0.06); tone(659, 0.1, "triangle", 0.06, 0.08); tone(784, 0.16, "triangle", 0.06, 0.16); },
    down: () => { tone(392, 0.14, "sawtooth", 0.035); tone(294, 0.2, "sawtooth", 0.035, 0.12); },
    special: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, "square", 0.04, i * 0.06)); },
    win: () => { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.14)); },
  };

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
    window.scrollTo(0, 0);
  }

  // Title
  function renderTitle() {
    const row = $("#titleFaces"); row.textContent = "";
    CHAR_ORDER.forEach((id, i) => {
      const f = el("div", "title-face", avatarSVG(id, "happy"));
      f.style.animationDelay = i * 0.12 + "s";
      row.append(f);
    });
    const d = store.d;
    const favId = Object.keys(d.picks).sort((a, b) => d.picks[b] - d.picks[a])[0];
    const winsTxt = CHAR_ORDER.filter((id) => d.wins[id]).map((id) => `${CHARACTERS[id].name} ${d.wins[id]}`).join(" · ");
    $("#record").textContent = d.played
      ? `Games played: ${d.played}${winsTxt ? " · Wins: " + winsTxt : ""}${favId ? " · Favorite: " + CHARACTERS[favId].name : ""}`
      : "";
  }

  // Character select
  let chosenChar = null, chosenWorld = null;
  function renderChars() {
    const grid = $("#charGrid"); grid.textContent = "";
    for (const id of CHAR_ORDER) {
      const c = CHARACTERS[id];
      const card = el("button", "char-card");
      card.type = "button";
      card.style.setProperty("--c", c.color);
      card.style.setProperty("--cbg", c.bg);
      card.innerHTML = `
        <div class="char-portrait">${avatarSVG(id, id === "mike" ? "talk" : "neutral")}</div>
        <div class="char-body">
          <h3>${c.name}</h3>
          <p class="blurb">${c.blurb}</p>
          <div class="chips">${c.interests.map((x) => `<span>${x}</span>`).join("")}</div>
          <div class="ability"><b>Passive: ${c.passive.name}</b><span>${c.passive.text}</span></div>
          <div class="ability special"><b>Special: ${c.special.name}</b><span>${c.special.text}</span></div>
          <span class="pick-cta">Play as ${c.name}</span>
        </div>`;
      card.addEventListener("pointerenter", () => (card.querySelector(".char-portrait").innerHTML = avatarSVG(id, "happy")));
      card.addEventListener("pointerleave", () => (card.querySelector(".char-portrait").innerHTML = avatarSVG(id, id === "mike" ? "talk" : "neutral")));
      card.onclick = () => { sfx.click(); chosenChar = id; renderWorlds(); show("screen-worlds"); };
      grid.append(card);
    }
  }

  function renderWorlds() {
    const grid = $("#worldGrid"); grid.textContent = "";
    for (const wid of WORLD_ORDER) {
      const w = WORLDS[wid];
      const b = el("button", "world-card");
      b.type = "button";
      b.innerHTML = `<div class="world-scene">${sceneSVG(wid)}</div><div class="world-meta"><h3>${w.name}</h3><p>${w.area}</p><span class="home">${avatarTokenHTML(w.home)} ${w.homeNote}</span></div>`;
      b.onclick = () => { sfx.click(); startGame(chosenChar, wid); };
      grid.append(b);
    }
  }

  const avatarTokenHTML = (id, mood = "neutral") => `<span class="tok" style="--c:${CHARACTERS[id].color}">${avatarSVG(id, mood, { token: true, noProps: true })}</span>`;

  // ---------- game state ----------
  let G = null;

  function startGame(humanId, worldId) {
    gen++;
    store.d.picks[humanId] = (store.d.picks[humanId] || 0) + 1; store.save();
    const order = [humanId, ...CHAR_ORDER.filter((id) => id !== humanId)];
    G = {
      world: worldId,
      board: buildBoard(worldId),
      players: order.map((id) => ({ id, human: id === humanId, pos: 0, hp: 0, skip: false, specialUsed: false, cd: 0, mood: "neutral" })),
      turn: 0,
      turns: 0,
      stats: {},
      recent: [],
      over: false,
      humanId,
    };
    document.body.dataset.world = worldId;
    buildBoardDOM();
    renderHUD();
    placeTokens();
    $("#log").textContent = "";
    show("screen-game");
    say(humanId, `${WORLDS[worldId].name}. First to ${WIN_AT} Happiness has the perfect ${DAY}.`);
    setTimeout(loop, 700);
  }

  const P = (id) => G.players.find((p) => p.id === id);
  const cur = () => G.players[G.turn];
  const nm = (id) => CHARACTERS[id].name;

  // ---------- board ----------
  // 20 spaces around a 6x6 grid, clockwise from the top-left corner.
  function tileCell(i) {
    if (i <= 5) return [1, i + 1];
    if (i <= 9) return [i - 4, 6];
    if (i <= 15) return [6, 6 - (i - 10)];
    return [6 - (i - 15), 1];
  }

  function buildBoardDOM() {
    const board = $("#board"); board.textContent = "";
    G.board.forEach((sp) => {
      const t = SPACE_TYPES[sp.t];
      const [r, c] = tileCell(sp.i);
      const tile = el("div", "tile t-" + sp.type);
      tile.style.gridRow = r; tile.style.gridColumn = c;
      tile.innerHTML = `<span class="ti">${t.icon}</span><span class="tl">${sp.label}</span>${sp.i === 0 ? '<span class="start">START</span>' : ""}`;
      tile.title = `${t.name}: ${sp.label}`;
      board.append(tile);
    });
    const center = el("div", "board-center");
    center.innerHTML = `
      <div class="center-scene">${sceneSVG(G.world)}</div>
      <div class="center-ui">
        <div class="world-tag">${WORLDS[G.world].name}</div>
        <div class="die" id="die" aria-label="Die"></div>
        <button class="btn primary roll" id="rollBtn" type="button" hidden>Roll</button>
        <div class="turn-tag" id="turnTag"></div>
      </div>`;
    board.append(center);
    const layer = el("div", "token-layer"); layer.id = "tokens";
    G.players.forEach((p) => {
      const t = el("div", "token", avatarSVG(p.id, "neutral", { token: true, noProps: true }));
      t.dataset.id = p.id; t.style.setProperty("--c", CHARACTERS[p.id].color);
      layer.append(t);
    });
    board.append(layer);
    setDie(1);
  }

  const OFFS = [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.22], [0.22, 0.22]];
  function placeTokens() {
    const board = $("#board"); const tiles = board.querySelectorAll(".tile");
    G.players.forEach((p, idx) => {
      const tile = tiles[p.pos]; const tok = board.querySelector(`.token[data-id="${p.id}"]`);
      const x = tile.offsetLeft + tile.offsetWidth / 2 + OFFS[idx][0] * tile.offsetWidth;
      const y = tile.offsetTop + tile.offsetHeight / 2 + OFFS[idx][1] * tile.offsetHeight;
      tok.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      tok.classList.toggle("active", p === cur() && !G.over);
    });
  }
  window.addEventListener("resize", () => G && placeTokens());

  const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function dieFace(n) { let h = ""; for (let i = 1; i <= 9; i++) h += `<i class="${PIPS[n].includes(i) ? "on" : ""}"></i>`; return h; }
  function setDie(n, node = $("#die")) { node.innerHTML = dieFace(n); }
  async function rollDie(node = $("#die")) {
    sfx.roll();
    node.classList.add("rolling");
    const n = 1 + Math.floor(Math.random() * 6);
    for (let i = 0; i < 8; i++) { setDie(1 + Math.floor(Math.random() * 6), node); await sleep(70); }
    setDie(n, node); node.classList.remove("rolling"); node.classList.add("landed");
    setTimeout(() => node.classList.remove("landed"), 400);
    return n;
  }

  // ---------- HUD ----------
  function renderHUD() {
    const hud = $("#hud"); hud.textContent = "";
    G.players.forEach((p) => {
      const c = CHARACTERS[p.id];
      const chip = el("div", "pchip" + (p === cur() ? " active" : ""));
      chip.dataset.id = p.id;
      chip.style.setProperty("--c", c.color);
      chip.innerHTML = `
        <div class="pav">${avatarSVG(p.id, p.mood, { token: true, noProps: true })}</div>
        <div class="pinfo">
          <div class="pname">${c.name}${p.human ? ' <em>you</em>' : ""}</div>
          <div class="pbar"><i style="width:${Math.min(100, (p.hp / WIN_AT) * 100)}%"></i></div>
          <div class="pflags">${p.specialUsed ? "" : '<span title="Special ready">★</span>'}${p.skip ? '<span title="Misses next turn">💤</span>' : ""}</div>
        </div>
        <div class="php">${p.hp}</div>`;
      hud.append(chip);
    });
  }

  function setMood(id, mood, ms = 1800) {
    const p = P(id); if (!p) return;
    p.mood = mood;
    const chip = document.querySelector(`.pchip[data-id="${id}"] .pav`);
    if (chip) chip.innerHTML = avatarSVG(id, mood, { token: true, noProps: true });
    const tok = document.querySelector(`.token[data-id="${id}"]`);
    if (tok) tok.innerHTML = avatarSVG(id, mood, { token: true, noProps: true });
    clearTimeout(p._moodT);
    if (mood !== "neutral") p._moodT = setTimeout(() => setMood(id, "neutral"), ms);
  }

  function popHP(id, delta) {
    const chip = document.querySelector(`.pchip[data-id="${id}"]`); if (!chip) return;
    const f = el("span", "hp-float " + (delta > 0 ? "up" : "down"), (delta > 0 ? "+" : "") + delta);
    chip.append(f); setTimeout(() => f.remove(), 1200);
    chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump");
  }

  // Speech panel under the board
  function say(id, text) {
    $("#speaker").innerHTML = avatarSVG(id, P(id)?.mood || "neutral");
    $("#speaker").style.setProperty("--c", CHARACTERS[id].color);
    const b = $("#bubble"); b.textContent = text;
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  }
  function log(html) {
    const li = el("li", null, html);
    const list = $("#log"); list.prepend(li);
    while (list.children.length > 5) list.lastChild.remove();
  }

  // ---------- timing ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // A quit or restart bumps gen; any turn still running from the old game just stops.
  let gen = 0;
  const wait = async (ms) => {
    const g = gen;
    await sleep(!cur().human && store.d.fast ? ms * 0.45 : ms);
    if (g !== gen) await new Promise(() => {});
  };

  // ---------- main loop ----------
  async function loop() {
    while (!G.over) {
      const p = cur();
      renderHUD(); placeTokens();
      $("#turnTag").textContent = p.human ? "Your turn" : `${nm(p.id)}'s turn`;
      if (p.skip) {
        p.skip = false; renderHUD();
        say(p.id, p.id === "mike" ? "Still in the rabbit hole. Forty more tabs." : "Still recovering. Skipping this turn.");
        log(`<b>${nm(p.id)}</b> misses a turn`);
        await wait(1500);
        nextTurn(); continue;
      }
      say(p.id, pick(CHARACTERS[p.id].lines.turn));
      if (p.human) await waitForRoll(); else await wait(650);
      const from = p.pos;
      const n = await rollDie();
      await wait(250);
      await move(p, n);
      await resolveSpace(p, from);
      if (checkWin()) return;
      G.turns++;
      nextTurn();
    }
  }
  function nextTurn() { G.turn = (G.turn + 1) % G.players.length; }

  function waitForRoll() {
    return new Promise((res) => {
      const b = $("#rollBtn"); b.hidden = false; b.focus({ preventScroll: true });
      b.onclick = () => { b.hidden = true; sfx.click(); res(); };
    });
  }

  async function move(p, n) {
    let lapped = false;
    for (let i = 0; i < n; i++) {
      p.pos = (p.pos + 1) % G.board.length;
      if (p.pos === 0) lapped = true;
      placeTokens(); sfx.step();
      await wait(190);
    }
    if (lapped) G.stats.laps = (G.stats.laps || 0) + 1;
  }

  // ---------- cards ----------
  function fits(card, id) {
    if (!card.for || card.for === "any") return true;
    return Array.isArray(card.for) ? card.for.includes(id) : card.for === id;
  }
  function drawCard(spaceType, p, excludeId) {
    const pool = CARDS.filter((c) => c.space === spaceType && (c.world === "any" || c.world === G.world) && fits(c, p.id) && c.id !== excludeId);
    const home = WORLDS[G.world].home;
    const weights = pool.map((c) => {
      let w = c.weight ?? 1;
      if (c.world === G.world) w *= 2.2;                       // local flavor shows up often
      if (p.id === home && c.for !== "any") w *= 1.4;          // mild home-field advantage
      if (c.for !== "any" && c.for) w *= 1.3;                  // character cards are the fun ones
      if (G.recent.includes(c.id)) w *= 0.08;                  // avoid repeats
      return w;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { chosen = pool[i]; break; } }
    G.recent.push(chosen.id); if (G.recent.length > 14) G.recent.shift();
    return chosen;
  }

  const fill = (s, ctx) => (s || "").replace(/\{self\}/g, nm(ctx.p.id)).replace(/\{target\}/g, ctx.target ? nm(ctx.target) : "a friend");

  function expandFx(fx, ctx) {
    const map = {};
    const add = (id, n) => { if (id && n) map[id] = (map[id] || 0) + n; };
    for (const [k, v] of Object.entries(fx || {})) {
      if (k === "self") add(ctx.p.id, v);
      else if (k === "target") add(ctx.target, v);
      else if (k === "all") G.players.forEach((q) => add(q.id, v));
      else if (k === "others") G.players.filter((q) => q.id !== ctx.p.id).forEach((q) => add(q.id, v));
      else add(k, v);
    }
    for (const k of Object.keys(map)) if (!map[k]) delete map[k];
    return map;
  }

  function mergeStats(into, s) { for (const [k, v] of Object.entries(s || {})) into[k] = (into[k] || 0) + v; }

  // Card UI
  let continueFn = null;
  function openCard(card, space, ctx) {
    const layer = $("#cardLayer"); layer.hidden = false;
    const t = SPACE_TYPES[space.t];
    const c = $("#card");
    c.style.setProperty("--tc", t.color);
    c.className = "card t-" + space.type;
    c.innerHTML = `
      <div class="card-head"><span class="card-icon">${t.icon}</span><span class="card-kind">${t.name}</span><span class="card-who">${avatarTokenHTML(ctx.p.id)} ${nm(ctx.p.id)}</span></div>
      <h2 class="card-title"></h2>
      <p class="card-text"></p>
      <div class="card-dyn"></div>
      <div class="card-out"></div>
      <div class="card-btns"></div>`;
    c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip");
    sfx.flip();
    refreshCardText(card, ctx);
  }
  function refreshCardText(card, ctx) {
    $("#card .card-title").textContent = fill(card.title, ctx);
    $("#card .card-text").textContent = fill(card.text, ctx);
  }
  function closeCard() { $("#cardLayer").hidden = true; $("#fxLayer").textContent = ""; }
  const dyn = () => $("#card .card-dyn");

  function addLine(whoId, text) {
    const row = el("div", "line");
    row.innerHTML = `${avatarTokenHTML(whoId, "talk")}<span class="lb"></span>`;
    row.querySelector(".lb").textContent = text;
    row.style.setProperty("--c", CHARACTERS[whoId].color);
    dyn().append(row);
  }
  function addNote(text, cls = "") { const n = el("p", "note " + cls); n.textContent = text; dyn().append(n); return n; }

  function buttons(opts) {
    const box = $("#card .card-btns"); box.textContent = "";
    return new Promise((res) => {
      opts.forEach((o, i) => {
        const b = el("button", "btn " + (o.cls || (i === 0 ? "primary" : "ghost")));
        b.type = "button"; b.innerHTML = o.label;
        b.onclick = () => { sfx.click(); box.textContent = ""; res(i); };
        box.append(b);
      });
      box.querySelector("button")?.focus({ preventScroll: true });
    });
  }

  async function choose(ctx, options, prompt) {
    if (prompt) addNote(prompt, "prompt");
    if (ctx.p.human) return options[await buttons(options.map((o) => ({ label: o.label })))];
    const ws = options.map((o) => o.cpu?.[ctx.p.id] ?? 1);
    let r = Math.random() * ws.reduce((a, b) => a + b, 0), idx = 0;
    for (; idx < ws.length - 1; idx++) { r -= ws[idx]; if (r <= 0) break; }
    await wait(700);
    addNote(`${nm(ctx.p.id)} chooses: ${options[idx].label.replace(/<[^>]+>/g, "")}`, "cpu-pick");
    await wait(500);
    return options[idx];
  }

  async function pickTarget(ctx) {
    const others = G.players.filter((q) => q.id !== ctx.p.id).map((q) => q.id);
    if (ctx.p.human) {
      addNote("Pick a friend:", "prompt");
      const i = await buttons(others.map((id) => ({ label: `${avatarTokenHTML(id)} ${nm(id)}`, cls: "ghost friend-btn" })));
      return others[i];
    }
    const ws = others.map((id) => (ctx.p.id === "billy" && id === "mike" ? 3 : 1));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0), i = 0;
    for (; i < ws.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
    return others[i];
  }

  async function cardRoll() {
    const d = el("div", "die mini"); dyn().append(d);
    await wait(250);
    return rollDie(d);
  }

  function playFX(kind) {
    const L = $("#fxLayer"); L.textContent = "";
    if (kind === "coyote") {
      L.innerHTML = `<div class="fx-coyote"><svg viewBox="0 0 80 40"><path d="M6 20 Q14 8 32 10 L50 10 L58 2 L60 10 L64 2 L66 12 Q68 22 58 22 L20 22 L4 30 Q0 22 6 20 Z" fill="#9E7B55"/><path d="M14 22 L10 36 M24 22 L26 36 M46 22 L44 36 M56 22 L60 36" stroke="#9E7B55" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="10" r="1.6" fill="#222"/></svg></div>`;
    } else if (kind === "lego") {
      for (let i = 0; i < 14; i++) {
        const b = el("span", "fx-brick");
        b.style.left = Math.random() * 100 + "%"; b.style.animationDelay = Math.random() * 0.6 + "s";
        b.style.background = pick(["#E5322D", "#2F6FE4", "#FFC31F", "#27A14A"]);
        L.append(b);
      }
    } else if (kind === "golf") {
      L.innerHTML = `<div class="fx-golf"><span></span></div>`;
    } else if (kind === "phone") {
      const ph = el("div", "fx-phone", `<div class="scr"><i></i><i></i><i></i><b>Searching…</b></div>`);
      dyn().prepend(ph);
    }
  }

  function receipt() {
    const items = [["“A little top”", 480, 1400], ["Cashmere wrap", 900, 2600], ["Italian loafers", 700, 1500], ["Small bag (not small)", 1800, 4200], ["A belt, apparently", 350, 800]];
    const chosen = items.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
    let total = 0;
    const rows = chosen.map(([n, lo, hi]) => { const v = Math.round((lo + Math.random() * (hi - lo)) / 10) * 10 - 0.01; total += v; return `<div><span>${n}</span><span>$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>`; }).join("");
    G.stats.debbie = (G.stats.debbie || 0) + total;
    const r = el("div", "receipt", `<div class="rh">MADISON AVE · FOR DEBBIE</div>${rows}<div class="rt"><span>TOTAL</span><span>$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`);
    dyn().append(r);
  }

  // Resolve one card fully in the card UI. Returns {map, ctx} without applying when dry.
  async function playCard(p, card, space, allowSpecial, opts = {}) {
    const ctx = { p, card, target: null, stats: {}, tags: [...(card.tags || [])], skip: null };
    openCard(card, space, ctx);
    await wait(420);

    if (card.target) { ctx.target = await pickTarget(ctx); refreshCardText(card, ctx); if (!p.human) addNote(`${nm(p.id)} picks ${nm(ctx.target)}.`, "cpu-pick"); }
    if (card.special && card.special !== "receipt") playFX(card.special);
    if (card.special === "receipt") receipt();
    const resolveWho = (w) => (w === "self" ? p.id : w === "target" ? ctx.target : w);
    for (const [w, t] of card.lines || []) { const id = resolveWho(w); if (id) { addLine(id, fill(t, ctx)); await wait(260); } }
    if (card.react?.[p.id]) addLine(p.id, card.react[p.id]);
    mergeStats(ctx.stats, card.stats);

    let branch = card;
    // Mike's passive: Rabbit Hole
    if (p.id === "mike" && space.type === "event" && Math.random() < 0.55) {
      const opt = await choose(ctx, [{ label: "🔎 Look into it", cpu: { mike: 7 } }, { label: "Take the card", cpu: { mike: 1 } }], "Rabbit Hole: Mike could look into it instead.");
      if (opt.label.includes("Look")) {
        playFX("phone");
        const n = await cardRoll();
        branch = n <= 2
          ? { text: "Rabbit hole. Mike learns everything and loses the rest of the day.", fx: { self: 1 }, skip: "self", stats: { rabbitHoles: 1, lookedUp: 1 } }
          : { text: "Mike discovers something genuinely useful. He tells everyone.", fx: { self: 2 }, stats: { rabbitHoles: 1, lookedUp: 1 } };
        addNote(branch.text, "result");
      }
    }
    if (branch.choices) {
      const c = await choose(ctx, branch.choices);
      branch = c;
      if (c.text) addNote(fill(c.text, ctx), "result");
      for (const [w, t] of c.lines || []) { const id = resolveWho(w); if (id) addLine(id, fill(t, ctx)); }
    }
    if (branch.roll) {
      const n = await cardRoll();
      const b = branch.roll.find((r) => n <= r.max);
      branch = b;
      addNote(fill(b.text, ctx), "result");
      for (const [w, t] of b.lines || []) { const id = resolveWho(w); if (id) addLine(id, fill(t, ctx)); }
      await wait(250);
    }
    if (branch !== card) { mergeStats(ctx.stats, branch.stats); ctx.tags.push(...(branch.tags || [])); }
    ctx.skip = branch.skip || card.skip || null;
    const fxSrc = branch.fxFor?.[p.id] ?? branch.fx ?? {};
    let map = expandFx(fxSrc, ctx);

    // Passives: +1 when a card matches what someone loves (short cooldown so it doesn't trigger constantly)
    const bonus = [];
    for (const id of Object.keys(map)) {
      const q = P(id), tags = CHARACTERS[id].passive.tags;
      if (map[id] > 0 && q.cd <= 0 && ctx.tags.some((t) => tags.includes(t))) {
        map[id] += 1; q.cd = 3; bonus.push(id);
      }
    }
    if (card.stamp) { const s = el("div", "stamp"); s.textContent = card.stamp; dyn().append(s); sfx.special(); await wait(600); }

    if (opts.dry) return { map, ctx, bonus };

    // Special abilities: offered when the card would cost you Happiness
    if (allowSpecial && (map[p.id] || 0) < 0 && !p.specialUsed) {
      const sp = CHARACTERS[p.id].special;
      let use;
      if (p.human) {
        addNote(`${sp.name} is available: ${sp.text}`, "prompt");
        use = (await buttons([{ label: `★ Use ${sp.name}`, cls: "special" }, { label: "Take the hit", cls: "ghost" }])) === 0;
      } else {
        const loss = -map[p.id];
        use = loss >= 2 || p.hp >= 5 || Math.random() < 0.3;
        if (use) await wait(400);
      }
      if (use) {
        p.specialUsed = true; G.stats.specials = (G.stats.specials || 0) + 1; sfx.special();
        log(`<b>${nm(p.id)}</b> uses ★ ${sp.name}`);
        if (p.id === "adam") {
          addLine("adam", "Youths.");
          addNote("Adam shakes his head. The negative effect becomes zero.", "result");
          setMood("adam", "annoyed");
          map[p.id] = 0; delete map[p.id];
        } else if (p.id === "marshall") {
          addLine("marshall", sp.line);
          await wait(1100); closeCard();
          return playCard(p, drawCard(space.type, p, card.id), space, false);
        } else if (p.id === "billy") {
          playFX("golf"); addLine("billy", "Mulligan.");
          await wait(1300); closeCard();
          return { mulligan: true };
        } else if (p.id === "mike") {
          addLine("mike", sp.line); playFX("phone");
          await wait(1200);
          const first = { map, ctx, bonus, title: fill(card.title, ctx) };
          const card2 = drawCard(space.type, p, card.id);
          const second = await playCard(p, card2, space, false, { dry: true });
          second.title = fill(card2.title, second.ctx);
          const better = (second.map[p.id] || 0) > (first.map[p.id] || 0) ? second : first;
          addNote(`Mike compares both options and keeps “${better.title}.”`, "result");
          return finish(p, better.map, better.ctx, better.bonus);
        }
      }
    }
    return finish(p, map, ctx, bonus);
  }

  async function finish(p, map, ctx, bonus) {
    // outcome chips
    const out = $("#card .card-out"); out.textContent = "";
    const ids = Object.keys(map);
    if (!ids.length) out.innerHTML = `<span class="chip zero">No change</span>`;
    ids.forEach((id) => {
      const v = map[id];
      const chip = el("span", "chip " + (v > 0 ? "up" : "down"), `${avatarTokenHTML(id, v > 0 ? "happy" : "sad")} ${nm(id)} ${v > 0 ? "+" : ""}${v}${bonus.includes(id) ? ` <small>${CHARACTERS[id].passive.name}</small>` : ""}`);
      out.append(chip);
    });
    if (ctx.skip) { const sid = ctx.skip === "self" ? p.id : ctx.skip; P(sid).skip = true; out.append(el("span", "chip zero", `${nm(sid)} misses next turn`)); }
    mergeStats(G.stats, ctx.stats);
    applyMap(map);
    const mine = map[p.id] || 0;
    const lines = CHARACTERS[p.id].lines;
    say(p.id, mine > 0 ? pick(lines.happy) : mine < 0 ? pick(lines.sad) : fill(ctx.card.title, ctx));
    log(`<b>${nm(p.id)}</b> · ${fill(ctx.card.title, ctx)} ${ids.map((id) => `<span class="${map[id] > 0 ? "up" : "down"}">${nm(id)} ${map[id] > 0 ? "+" : ""}${map[id]}</span>`).join(" ")}`);

    if (p.human) await buttons([{ label: "Continue" }]);
    else await autoContinue();
    closeCard();
    return { map };
  }

  function autoContinue() {
    return new Promise((res) => {
      const box = $("#card .card-btns");
      const b = el("button", "btn ghost small", "Tap to continue"); b.type = "button"; box.append(b);
      const t = setTimeout(done, store.d.fast ? 1300 : 2600);
      function done() { clearTimeout(t); $("#cardLayer").onclick = null; res(); }
      $("#cardLayer").onclick = done;
    });
  }

  function applyMap(map) {
    for (const [id, v] of Object.entries(map)) {
      const q = P(id); if (!q || !v) continue;
      q.hp = clampHP(q.hp + v);
      setMood(id, v > 0 ? "happy" : v <= -2 ? "annoyed" : "sad");
      popHP(id, v);
    }
    const anyUp = Object.values(map).some((v) => v > 0), anyDown = Object.values(map).some((v) => v < 0);
    if (anyUp) sfx.up(); else if (anyDown) sfx.down();
    renderHUD();
  }

  async function resolveSpace(p, fromPos) {
    const space = G.board[p.pos];
    const res = await playCard(p, drawCard(space.type, p), space, true);
    if (res.mulligan) {
      p.pos = fromPos; placeTokens();
      say(p.id, "Taking that one again.");
      await wait(700);
      const n = await rollDie();
      await move(p, n);
      const sp2 = G.board[p.pos];
      await playCard(p, drawCard(sp2.type, p), sp2, false);
    }
    p.cd = Math.max(0, p.cd - 1);
  }

  // ---------- victory ----------
  function checkWin() {
    const winners = G.players.filter((q) => q.hp >= WIN_AT);
    if (!winners.length) return false;
    winners.sort((a, b) => b.hp - a.hp || (a === cur() ? -1 : 1));
    G.over = true;
    showVictory(winners[0].id);
    return true;
  }

  function showVictory(id) {
    const c = CHARACTERS[id];
    store.d.played++; store.d.wins[id] = (store.d.wins[id] || 0) + 1; store.save();
    const scr = $("#screen-win");
    scr.dataset.who = id;
    const bg = $("#winBg"); bg.textContent = "";
    if (id === "mike") {
      for (let i = 0; i < 48; i++) {
        const t = el("div", "tab", pick(["Best hotel upgrade tactics", "Zillow – sold 2019", "Yankees 1998 bullpen", "Calories in aioli", "Tuesday check-in data", "Property tax records", "Is it a taco?", "Coyote range NY"]));
        t.style.left = Math.random() * 90 + "%"; t.style.top = Math.random() * 92 + "%"; t.style.transform = `rotate(${Math.random() * 16 - 8}deg)`;
        bg.append(t);
      }
    } else if (id === "adam") {
      for (let i = 0; i < 26; i++) {
        const b = el("span", "fx-brick still"); b.style.left = Math.random() * 96 + "%"; b.style.top = Math.random() * 96 + "%";
        b.style.background = pick(["#E5322D", "#2F6FE4", "#FFC31F", "#27A14A"]); b.style.transform = `rotate(${Math.random() * 40 - 20}deg)`;
        bg.append(b);
      }
    }
    $("#winPortrait").innerHTML = avatarSVG(id, "happy");
    $("#winTitle").innerHTML = `${c.name.toUpperCase()} HAS ACHIEVED<br>THE PERFECT ${DAY.toUpperCase()}`;
    $("#winSub").textContent = c.victory.sub;
    $("#winFooter").textContent = c.victory.footer;
    const human = G.humanId;
    $("#winYou").textContent = human === id ? "You won." : `You played as ${nm(human)}: ${P(human).hp} Happiness. So close.`;
    // funny stats
    const list = $("#winStats"); list.textContent = "";
    const entries = Object.entries(G.stats).filter(([k, v]) => STAT_LABELS[k] && v > 0 && k !== "laps").sort((a, b) => b[1] - a[1]).slice(0, 4);
    const fillers = ["youths", "coyotes", "golf", "lookedUp", "citarella"].filter((k) => !entries.find((e) => e[0] === k));
    while (entries.length < 3 && fillers.length) entries.push([fillers.shift(), 0]);
    entries.push(["turns", G.turns + 1]);
    for (const [k, v] of entries) {
      const label = k === "turns" ? "Turns taken" : STAT_LABELS[k];
      const val = k === "debbie" ? "$" + Math.round(v).toLocaleString("en-US") : v;
      list.append(el("li", null, `<span>${label}</span><b>${val}</b>`));
    }
    const final = $("#winScores"); final.textContent = "";
    [...G.players].sort((a, b) => b.hp - a.hp).forEach((q) => final.append(el("span", "fs", `${avatarTokenHTML(q.id, q.id === id ? "happy" : "neutral")} ${nm(q.id)} <b>${q.hp}</b>`)));
    closeCard();
    show("screen-win");
    sfx.win();
    confetti();
  }

  function confetti() {
    const cv = $("#confetti"); const cx = cv.getContext("2d");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cv.width = innerWidth; cv.height = innerHeight; cv.hidden = false;
    const cols = ["#FF5C8A", "#FFB81C", "#2F86F6", "#16B3A0", "#8B6CD9", "#FFFFFF"];
    const parts = Array.from({ length: 160 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.6, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: Math.random() * 0.2 - 0.1, w: 6 + Math.random() * 6, c: pick(cols) }));
    const t0 = performance.now();
    (function frame(t) {
      cx.clearRect(0, 0, cv.width, cv.height);
      for (const q of parts) { q.x += q.vx; q.y += q.vy; q.r += q.vr; cx.save(); cx.translate(q.x, q.y); cx.rotate(q.r); cx.fillStyle = q.c; cx.fillRect(-q.w / 2, -q.w / 4, q.w, q.w / 2); cx.restore(); }
      if (t - t0 < 4500) requestAnimationFrame(frame); else cv.hidden = true;
    })(t0);
  }

  // ---------- wiring ----------
  function syncToggles() {
    $("#muteBtn").textContent = store.d.muted ? "🔇" : "🔊";
    $("#muteBtn").setAttribute("aria-label", store.d.muted ? "Sound off" : "Sound on");
    $("#fastBtn").classList.toggle("on", !!store.d.fast);
  }
  $("#playBtn").onclick = () => { audio(); sfx.click(); renderChars(); show("screen-chars"); };
  $("#howBtn").onclick = () => { sfx.click(); $("#howto").hidden = false; };
  $("#howClose").onclick = () => { $("#howto").hidden = true; };
  $("#howto").onclick = (e) => { if (e.target.id === "howto") $("#howto").hidden = true; };
  $("#backToTitle").onclick = () => { renderTitle(); show("screen-title"); };
  $("#backToChars").onclick = () => show("screen-chars");
  $("#surpriseBtn").onclick = () => { sfx.click(); startGame(chosenChar, pick(WORLD_ORDER)); };
  $("#muteBtn").onclick = () => { store.d.muted = !store.d.muted; store.save(); syncToggles(); };
  $("#fastBtn").onclick = () => { store.d.fast = !store.d.fast; store.save(); syncToggles(); };
  $("#quitBtn").onclick = () => { $("#quitConfirm").hidden = false; };
  $("#quitNo").onclick = () => { $("#quitConfirm").hidden = true; };
  $("#quitYes").onclick = () => { $("#quitConfirm").hidden = true; G.over = true; gen++; closeCard(); renderTitle(); show("screen-title"); };
  $("#againBtn").onclick = () => { renderChars(); show("screen-chars"); };
  $("#rematchBtn").onclick = () => startGame(G.humanId, G.world);
  $("#homeBtn").onclick = () => { renderTitle(); show("screen-title"); };

  // How-to legend
  $("#legend").innerHTML = Object.values(SPACE_TYPES).map((t) => `<li><span class="lg" style="background:${t.color}">${t.icon}</span>${t.name}</li>`).join("");

  syncToggles();
  renderTitle();
  show("screen-title");
})();
