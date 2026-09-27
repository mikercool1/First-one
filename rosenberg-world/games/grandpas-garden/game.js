// Grandpa's Garden: pick the red tomatoes, leave the green ones, beat the clock.
// Four raised beds, one per kid. You pick the front bed; the other three kids race you in theirs.
(() => {
  "use strict";
  const A = window.RW.art;
  const { shade, rr, ell, lin, rad, shadow, text } = A;
  const TAU = Math.PI * 2;
  const FONT = A.FONT;

  // Nobody carries the radio or the spoon into the garden.
  for (const id in A.CHARS) A.CHARS[id].prop = null;
  A.CHARS.simon.color = "#7FB85A"; // background for his portrait

  // ---------- levels ----------
  // Every range is in seconds. See README.md for how the targets were worked out.
  const LEVELS = [
    { name: "Easy",   plants: 4, perPlant: 2, grow: [4.0, 5.0], ripe: [3.5, 4.0], regrow: [3.0, 5.0], target: 20, cpu: [2.6, 2.1, 1.8] },
    { name: "Medium", plants: 4, perPlant: 3, grow: [3.0, 4.0], ripe: [2.5, 3.5], regrow: [2.0, 4.0], target: 35, cpu: [1.7, 1.35, 1.2] },
    { name: "Hard",   plants: 5, perPlant: 3, grow: [2.5, 3.5], ripe: [2.0, 2.5], regrow: [1.5, 3.0], target: 50, cpu: [1.15, 0.95, 0.85] },
  ];
  const ROUND = 60;
  const KIDS = ["reuben", "jonah", "ellie", "max"];
  // Where each slot hangs on its plant, in plant units (1 = plant spacing), up is negative.
  const SLOTS = {
    2: [[-0.2, -0.62], [0.21, -1.0]],
    3: [[-0.22, -0.5], [0.23, -0.8], [-0.12, -1.12]],
  };
  const COL = { green: "#74B83A", blush: "#F0A43A", red: "#E5372B", over: "#B3241C" };

  // ---------- helpers ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = ([a, b]) => a + Math.random() * (b - a);
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const easeOut = (t) => 1 - (1 - t) * (1 - t);
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
    return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
  }
  function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const $ = (id) => document.getElementById(id);

  // ---------- saved progress ----------
  const SAVE_KEY = "grandpas-garden-v1";
  let save = { kid: "reuben", level: 0, best: [0, 0, 0], beaten: [false, false, false], muted: false };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = { ...save, ...s }; } catch (e) { /* private mode */ }
  // inside Rosenberg World, whoever is playing picks (they can still switch)
  if (window.RosenbergBridge && KIDS.includes(window.RosenbergBridge.player)) save.kid = window.RosenbergBridge.player;
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

  // ---------- sound (synthesized) ----------
  let actx = null;
  function audio() {
    if (save.muted) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type = "sine", vol = 0.2, slide = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.2, freq = 600) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "lowpass"; f.frequency.value = freq; g.gain.value = vol;
    src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const SFX = {
    pick: () => { tone(520, 0.09, "sine", 0.25, 500); tone(1040, 0.08, "triangle", 0.1, 200, 0.07); },
    early: () => { tone(160, 0.2, "square", 0.08, -40); },
    splat: () => noise(0.18, 0.18, 500),
    tick: () => tone(1400, 0.03, "square", 0.05),
    beep: (hi) => tone(hi ? 880 : 520, hi ? 0.35 : 0.15, "triangle", 0.2),
    goal: () => [660, 830, 990].forEach((f, i) => tone(f, 0.16, "triangle", 0.18, 0, i * 0.08)),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.2, 0, i * 0.12)),
    lose: () => [440, 392, 330].forEach((f, i) => tone(f, 0.3, "triangle", 0.16, 0, i * 0.16)),
  };

  // ---------- canvas ----------
  const cv = $("stage"), stageCtx = cv.getContext("2d");
  let c = stageCtx;   // every draw helper paints on `c`; withCtx() borrows them for the small menu canvases
  function withCtx(g, fn) { const keep = c; c = g; try { fn(); } finally { c = keep; } }
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- game state ----------
  let state = "menu";       // menu | brief | count | play | end
  let lvlIdx = save.level;
  let level = LEVELS[lvlIdx];
  let rows = [];            // rows[0] is the player's bed at the front
  let clock = 0;            // seconds of play elapsed
  let countT = 0;
  let endT = 0;
  let now = 0;              // animation time
  let floaters = [];
  let simon = { say: "", sayT: 0, pose: null, poseT: 0 };
  let stats = { picked: 0, fell: 0, early: 0 };
  let flags = {};
  let lastTick = 0;
  const clouds = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.04 + Math.random() * 0.14, s: 0.6 + Math.random() * 0.7, v: 0.004 + Math.random() * 0.006, seed: i + 3 }));
  const butterflies = Array.from({ length: 3 }, (_, i) => ({ p: Math.random() * 10, col: ["#FFB347", "#B18CFF", "#FFFFFF"][i] }));

  function makeRow(kid, i, tau) {
    const spots = [];
    const slots = SLOTS[level.perPlant];
    for (let p = 0; p < level.plants; p++) {
      slots.forEach(([sx, sy], k) => {
        // Stagger the start so the first reds come a second or two in, not all at once.
        const s = { plant: p, sx: sx + (Math.random() - 0.5) * 0.06, sy, st: "bud", left: 0, dur: 1, age: 0, pop: 0 };
        if (Math.random() < 0.6) { s.st = "green"; s.dur = rand(level.grow); s.left = s.dur * (0.15 + Math.random() * 0.85); s.age = s.dur - s.left; }
        else { s.st = "bud"; s.dur = rand(level.regrow); s.left = Math.random() * s.dur; s.age = s.dur - s.left; }
        spots.push(s);
      });
    }
    return {
      kid, i, spots, basket: 0, splats: [], falling: [], flying: [],
      cpu: tau ? { tau, next: 0.8 + Math.random() * 0.6, react: 0.5 + Math.random() * 0.25, miss: 0.1 } : null,
      pose: null, poseT: 0, seed: 17 + i * 31,
    };
  }

  function setupRound() {
    level = LEVELS[lvlIdx];
    const rivals = KIDS.filter((k) => k !== save.kid);
    const taus = shuffle(level.cpu.slice());
    rows = [makeRow(save.kid, 0, 0), ...rivals.map((k, j) => makeRow(k, j + 1, taus[j]))];
    clock = 0; floaters = []; stats = { picked: 0, fell: 0, early: 0 }; flags = {}; lastTick = 0;
    simon = { say: "", sayT: 0, pose: null, poseT: 0 };
    buildRace();
    updateHud(true);
  }

  // ---------- layout (2.5D) ----------
  // Four beds recede toward a vanishing point in the middle. Everything in a bed is measured in
  // plant units U, scaled by that bed's depth.
  const DEPTH = [1, 0.8, 0.64, 0.52];
  let L = null;
  function layout() {
    const n = level.plants;
    const hudEl = $("hud");
    const hudBottom = hudEl.hidden ? 70 : hudEl.getBoundingClientRect().bottom;
    const frontY = H * 0.9 - Math.max(0, 70 - H * 0.1);
    const wide = W > H;
    const sumBack = DEPTH[1] + DEPTH[2] + DEPTH[3];
    let U = Math.min((W * (wide ? 0.86 : 0.96)) / (n + 1.25), (frontY - Math.max(hudBottom + 40, H * 0.26)) / (1.3 * sumBack + 1.45 * DEPTH[3]));
    const gap = clamp((frontY - Math.max(hudBottom + 60, H * 0.3) - 1.45 * U * DEPTH[3]) / (U * sumBack), 1.3, 2.6);
    const cx = W / 2 + (wide ? W * 0.05 : 0);
    const ys = [frontY];
    for (let i = 1; i < 4; i++) ys.push(ys[i - 1] - gap * U * DEPTH[i]);
    const beds = ys.map((y, i) => {
      const s = DEPTH[i], u = U * s;
      const left = cx - ((n + 1.25) * u) / 2;
      return { y, s, u, left, kidX: left + (n + 0.88) * u, basketX: left + (n + 0.3) * u };
    });
    const fenceY = ys[3] - 0.42 * U * DEPTH[3];
    const backLeft = beds[3].left;
    const simonH = clamp(Math.min(1.9 * U, fenceY - hudBottom - 30), 60, 260);
    const simonX = clamp(Math.min(W * 0.12, backLeft - simonH * 0.28), simonH * 0.25 + 8, W * 0.2);
    L = { U, beds, fenceY, cx, simonX, simonY: fenceY + simonH * 0.06, simonH, hudBottom, wide };
    return L;
  }

  // Where a tomato hangs right now, including the plant's sway.
  function spotPos(row, s) {
    const b = L.beds[row.i];
    const px = b.left + (s.plant + 0.5) * b.u;
    const sway = Math.sin(now * 1.3 + row.seed + s.plant * 1.7) * 0.03 * -s.sy;
    return [px + (s.sx + sway) * b.u, b.y + s.sy * b.u - 0.1 * b.u];
  }

  // ---------- tomato growth ----------
  function tickSpots(row, dt) {
    for (const s of row.spots) {
      s.left -= dt; s.age += dt; s.pop = Math.max(0, s.pop - dt);
      if (s.left > 0) continue;
      if (s.st === "bud") { s.st = "green"; s.dur = rand(level.grow); }
      else if (s.st === "green") { s.st = "red"; s.dur = rand(level.ripe); s.pop = 0.5; }
      else if (s.st === "red") { dropTomato(row, s); continue; }
      s.left = s.dur; s.age = 0;
    }
  }
  function resetSpot(s) { s.st = "bud"; s.dur = rand(level.regrow); s.left = s.dur; s.age = 0; }
  function dropTomato(row, s) {
    const [x, y] = spotPos(row, s);
    const b = L.beds[row.i];
    row.falling.push({ x: (x - b.left) / b.u, y: (y - b.y) / b.u, vy: 0, rot: 0, floor: -0.08 - Math.random() * 0.1 });
    resetSpot(s);
    if (row.i === 0) {
      stats.fell++;
      flags.recentFalls = (flags.recentFalls || []).filter((t) => clock - t < 5).concat(clock);
      if (flags.recentFalls.length >= 3 && clock - (flags.fallSaid || -99) > 9 && row.basket < level.target) { say("They're falling off! Quick, pick the red ones!", 2.2); flags.fallSaid = clock; }
    }
  }
  function tickFalling(row, dt) {
    for (const f of row.falling) {
      f.vy += 9 * dt; f.y += f.vy * dt; f.rot += dt * 4;
      if (f.y >= f.floor) {
        row.splats.push({ x: f.x, y: f.floor, t: 0, seed: Math.random() * 1000 });
        f.dead = true;
        if (row.i === 0) SFX.splat();
      }
    }
    row.falling = row.falling.filter((f) => !f.dead);
    for (const sp of row.splats) sp.t += dt;
    row.splats = row.splats.filter((sp) => sp.t < 2.6);
  }

  // ---------- picking ----------
  function pick(row, s) {
    const [x, y] = spotPos(row, s);
    const b = L.beds[row.i];
    row.flying.push({ x0: (x - b.left) / b.u, y0: (y - b.y) / b.u, t: 0, dur: 0.42 });
    resetSpot(s);
    row.basket++;
    row.pose = "reach"; row.poseT = 0;
    if (row.i === 0) {
      stats.picked++;
      SFX.pick();
      floaters.push({ x, y: y - b.u * 0.1, text: "+1", col: "#E5372B", t: 0 });
      const n = row.basket, T = level.target;
      if (n === T) { say("That's enough for Grandma's salad! Keep going!", 2.6); SFX.goal(); simon.pose = "cheer"; simon.poseT = 0; }
      else if (n === Math.ceil(T / 2)) say("Halfway there! " + (T - n) + " more!", 2);
      updateHud();
      bump();
    }
  }
  function pickEarly(row, s) {
    const [x, y] = spotPos(row, s);
    const b = L.beds[row.i];
    row.falling.push({ x: (x - b.left) / b.u, y: (y - b.y) / b.u, vy: -1.2, rot: 0, floor: -0.08, green: true });
    resetSpot(s);
    stats.early++;
    const lost = row.basket > 0;
    row.basket = Math.max(0, row.basket - 1);
    row.pose = "shrug"; row.poseT = 0;
    SFX.early();
    floaters.push({ x, y, text: lost ? "-1" : "Not yet!", col: "#4E8A2A", t: 0 });
    const lines = ["Not yet! Let it turn red!", "That one's still green!", "Patience! Wait for red!"];
    say(lines[stats.early % lines.length], 2);
    simon.pose = "shrug"; simon.poseT = 0;
    updateHud();
  }
  function tickCpu(row) {
    const ai = row.cpu;
    if (clock < ai.next) return;
    let best = null;
    for (const s of row.spots) if (s.st === "red" && s.age >= ai.react && (!best || s.left < best.left)) best = s;
    if (!best) return;
    if (Math.random() < ai.miss) { ai.next = clock + ai.tau; return; }
    pick(row, best);
    ai.next = clock + ai.tau * (0.8 + Math.random() * 0.4);
  }

  function onTap(e) {
    audio();
    if (state !== "play" || !L) return;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const row = rows[0];
    const reach = Math.max(0.38 * L.U, 26);
    let red = null, redD = reach, green = null, greenD = reach * 0.75;
    for (const s of row.spots) {
      if (s.st === "bud") continue;
      const [sx, sy] = spotPos(row, s);
      const d = Math.hypot(sx - x, sy - y);
      if (s.st === "red" && d < redD) { red = s; redD = d; }
      if (s.st === "green" && d < greenD) { green = s; greenD = d; }
    }
    // Be kind: a red one anywhere near the finger wins over a green one.
    if (red) pick(row, red);
    else if (green) pickEarly(row, green);
  }
  cv.addEventListener("pointerdown", onTap);

  function say(textStr, dur = 2.2) { simon.say = textStr; simon.sayT = dur; }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    now += dt;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (state === "count") {
      const before = Math.ceil(3 - countT);
      countT += dt;
      const after = Math.ceil(3 - countT);
      if (after !== before && after > 0) SFX.beep(false);
      if (countT >= 3) { state = "play"; SFX.beep(true); say(`I need ${level.target} for Grandma's salad!`, 2.8); }
    }
    if (state === "play") {
      clock += dt;
      for (const row of rows) { tickSpots(row, dt); if (row.cpu) tickCpu(row); }
      const left = ROUND - clock;
      if (left <= 10 && !flags.ten) {
        flags.ten = true;
        const need = level.target - rows[0].basket;
        say(need > 0 ? `10 seconds! ${need} more!` : "10 seconds! Grab as many as you can!", 2.2);
      }
      if (left <= 5 && Math.ceil(left) !== lastTick) { lastTick = Math.ceil(left); SFX.tick(); }
      if (clock >= ROUND) finish();
      updateTimer();
    }
    if (state === "end") endT += dt;
    for (const row of rows) {
      tickFalling(row, dt);
      for (const f of row.flying) f.t += dt;
      row.flying = row.flying.filter((f) => f.t < f.dur);
      if (row.pose) { row.poseT += dt; if (row.poseT > (row.pose === "cheer" ? 99 : 0.45)) row.pose = null; }
    }
    if (simon.pose) { simon.poseT += dt; if (simon.poseT > (state === "end" ? 99 : 1.4)) simon.pose = null; }
    if (simon.sayT > 0) simon.sayT -= dt;
    for (const f of floaters) f.t += dt;
    floaters = floaters.filter((f) => f.t < 0.9);
    for (const cl of clouds) { cl.x += cl.v * dt; if (cl.x > 1.2) cl.x = -0.2; }
  }

  // ---------- drawing ----------
  function draw() {
    c = stageCtx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout();
    drawBackdrop();
    drawSimon();
    for (let i = rows.length - 1; i >= 0; i--) drawRow(rows[i]);
    drawButterflies();
    drawFloaters();
    drawSpeech();
    if (state === "count") drawCountdown();
    if (state === "end" && endT < 1.6) drawBanner("Time's up!");
  }

  function drawBackdrop() {
    const hz = L.fenceY - L.U * 0.55 * DEPTH[3];
    c.fillStyle = lin(c, 0, 0, 0, hz, ["#7EC8F2", "#BFE6FA", "#E9F7FF"]);
    c.fillRect(0, 0, W, hz + 2);
    // sun
    const sx = W * 0.86, sy = Math.max(L.hudBottom + 30, hz * 0.35), sr = Math.min(W, H) * 0.06;
    c.fillStyle = rad(c, sx, sy, 0, sx, sy, sr * 2.6, [[0, "rgba(255,240,170,.9)"], [1, "rgba(255,240,170,0)"]]);
    c.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
    c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fillStyle = rad(c, sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr, ["#FFF6B8", "#FFD23F"]); c.fill();
    // clouds
    for (const cl of clouds) {
      const x = cl.x * W, y = cl.y * H + L.hudBottom * 0.4, s = cl.s * Math.min(W, H) * 0.07;
      c.fillStyle = "rgba(255,255,255,.92)";
      [[0, 0, 1], [0.9, 0.15, 0.75], [-0.85, 0.2, 0.7], [0.35, -0.35, 0.8]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); });
    }
    // hills
    c.fillStyle = "#A6D77A";
    c.beginPath(); c.moveTo(0, hz);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, hz - Math.sin(x / W * 5 + 1) * H * 0.025 - H * 0.03);
    c.lineTo(W, hz); c.closePath(); c.fill();
    // trees on the hill
    const rnd = seeded(7);
    for (let i = 0; i < 7; i++) {
      const x = (i + 0.3 + rnd() * 0.4) / 7 * W, r = L.U * (0.18 + rnd() * 0.12);
      if (x < L.simonX + L.simonH * 0.4 && x > L.simonX - L.simonH * 0.4) continue;
      c.fillStyle = "#6E4A2E"; c.fillRect(x - r * 0.12, hz - r * 1.1, r * 0.24, r * 1.2);
      c.beginPath(); c.arc(x, hz - r * 1.5, r, 0, TAU); c.fillStyle = rad(c, x - r * 0.3, hz - r * 1.8, 0, x, hz - r * 1.5, r, ["#8BD06A", "#4E9E45"]); c.fill();
    }
    // lawn
    c.fillStyle = lin(c, 0, hz, 0, H, ["#A8DA78", "#8CCB5E", "#6FB449"]);
    c.fillRect(0, hz, W, H - hz);
    // mowing stripes in the aisles
    c.fillStyle = "rgba(255,255,255,.06)";
    for (let i = 0; i < 4; i++) { const b = L.beds[i]; c.fillRect(0, b.y + 0.3 * b.u, W, 0.18 * b.u); }
    // white picket fence along the back
    const fy = L.fenceY, fh = L.U * 0.55 * DEPTH[3], pw = fh * 0.22;
    c.fillStyle = "#F4F1E8";
    c.fillRect(0, fy - fh * 0.72, W, fh * 0.1);
    c.fillRect(0, fy - fh * 0.32, W, fh * 0.1);
    for (let x = pw * 0.5; x < W; x += pw * 2) {
      c.beginPath(); c.moveTo(x, fy); c.lineTo(x, fy - fh * 0.85); c.lineTo(x + pw / 2, fy - fh); c.lineTo(x + pw, fy - fh * 0.85); c.lineTo(x + pw, fy); c.closePath();
      c.fillStyle = "#FFFFFF"; c.fill();
      c.fillStyle = "rgba(120,110,90,.18)"; c.fillRect(x + pw * 0.72, fy - fh * 0.85, pw * 0.28, fh * 0.85);
      c.fillStyle = "#F4F1E8";
    }
    // sunflowers leaning over the fence
    const r2 = seeded(11);
    for (let i = 0; i < 6; i++) {
      const x = W * (0.55 + i * 0.08 + r2() * 0.03), h = fh * (1.3 + r2() * 0.5), fr = fh * 0.18;
      if (x > W - 10) continue;
      c.strokeStyle = "#4E8A2A"; c.lineWidth = Math.max(1.5, fh * 0.05);
      c.beginPath(); c.moveTo(x, fy); c.quadraticCurveTo(x + fr, fy - h * 0.5, x, fy - h); c.stroke();
      c.fillStyle = "#FFC928";
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU + now * 0.1; ell(c, x + Math.cos(a) * fr, fy - h + Math.sin(a) * fr, fr * 0.55, fr * 0.24, a); c.fill(); }
      c.beginPath(); c.arc(x, fy - h, fr * 0.6, 0, TAU); c.fillStyle = "#6B4220"; c.fill();
    }
  }

  function drawSimon() {
    const x = L.simonX, y = L.simonY, h = L.simonH;
    const s = A.CHARS.simon;
    const k = h / (s.L + s.T + s.R * 2.9);
    shadow(c, x, y, h * 0.22, h * 0.05, 0.25);
    c.save();
    c.translate(x, y); c.scale(k, k);
    const talking = simon.sayT > 0;
    const pose = simon.pose || (talking ? "wave" : null);
    A.drawChar(c, s, { t: now, move: 0, side: 0.45, dir: 1, pose, pt: simon.poseT, blink: (now % 3.7) < 0.12, mouth: talking && Math.sin(now * 16) > 0 ? "open" : undefined });
    // straw garden hat
    const hop = pose === "cheer" ? Math.abs(Math.sin(now * 9)) * 5 : 0;
    const bob = Math.sin(now * 2.3) * 0.7;
    const hy = -(s.L + s.T + s.R * 0.72) - s.R * 0.62 - bob - hop;
    c.save(); c.translate(s.R * 0.08, hy);
    ell(c, 0, 0, s.R * 1.6, s.R * 0.38); c.fillStyle = "#E3BE6A"; c.fill();
    c.strokeStyle = "rgba(150,110,40,.45)"; c.lineWidth = 1; ell(c, 0, 0, s.R * 1.25, s.R * 0.26); c.stroke();
    c.beginPath(); c.moveTo(-s.R * 0.85, 0); c.bezierCurveTo(-s.R * 0.85, -s.R * 1.05, s.R * 0.85, -s.R * 1.05, s.R * 0.85, 0); c.closePath();
    c.fillStyle = lin(c, 0, -s.R, 0, 0, ["#F4D98C", "#D9AE55"]); c.fill();
    c.fillStyle = "#C0392B"; c.fillRect(-s.R * 0.86, -s.R * 0.28, s.R * 1.72, s.R * 0.2);
    c.restore();
    c.restore();
  }

  function drawSpeech() {
    // Grandpa's name tag goes on top of the beds so it never gets hidden.
    const fsz = Math.max(11, L.simonH * 0.075);
    c.font = `700 ${fsz}px ${FONT}`;
    const lx = Math.max(L.simonX, c.measureText("Grandpa Simon").width / 2 + 6);
    text(c, "Grandpa Simon", lx, L.simonY + Math.max(12, L.simonH * 0.08), fsz, "#FFFFFF", { stroke: "rgba(43,35,64,.55)", strokeW: 3, weight: 700 });

    if (simon.sayT <= 0 || !simon.say) return;
    const a = clamp(simon.sayT / 0.25, 0, 1);
    const fs = clamp(L.U * 0.2, 15, 24);
    c.font = `700 ${fs}px ${FONT}`;
    const maxW = Math.min(W * 0.5, 360);
    const words = simon.say.split(" "), lines = [];
    let cur = "";
    for (const w of words) { const t2 = cur ? cur + " " + w : w; if (c.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; }
    lines.push(cur);
    const bw = Math.max(...lines.map((l) => c.measureText(l).width)) + fs * 1.3, bh = lines.length * fs * 1.2 + fs * 0.8;
    let bx = L.simonX + L.simonH * 0.22, by = L.simonY - L.simonH * 1.02 - bh;
    by = Math.max(L.hudBottom + 6, by);
    bx = Math.min(bx, W - bw - 10);
    c.save();
    c.globalAlpha = a;
    c.translate(bx, by);
    c.fillStyle = "rgba(43,35,64,.15)"; rr(c, 2, 5, bw, bh, fs * 0.8); c.fill();
    c.fillStyle = "#FFFFFF"; rr(c, 0, 0, bw, bh, fs * 0.8); c.fill();
    c.strokeStyle = "#2B2340"; c.lineWidth = 2.5; c.stroke();
    // tail toward Grandpa's head
    const tx = Math.max(fs, L.simonX - bx + L.simonH * 0.08);
    c.beginPath(); c.moveTo(tx - fs * 0.4, bh - 1); c.lineTo(tx - fs * 0.6, bh + fs * 0.7); c.lineTo(tx + fs * 0.3, bh - 1); c.closePath();
    c.fillStyle = "#FFFFFF"; c.fill(); c.stroke();
    c.fillStyle = "#FFFFFF"; c.fillRect(tx - fs * 0.38, bh - 4, fs * 0.66, 5);
    lines.forEach((l, i) => text(c, l, bw / 2, fs * 0.4 + fs * 0.6 + i * fs * 1.2, fs, "#2B2340", { weight: 700 }));
    c.restore();
  }

  function drawBed(b) {
    const n = level.plants, u = b.u;
    const x0 = b.left - 0.08 * u, x1 = b.left + (n + 0.08) * u;
    const top = b.y - 0.36 * u, soilBot = b.y + 0.06 * u, bot = b.y + 0.26 * u;
    shadow(c, (x0 + x1) / 2, bot, (x1 - x0) * 0.55, 0.12 * u, 0.25);
    // back board
    c.fillStyle = "#9A6538"; c.fillRect(x0 + 0.04 * u, top - 0.06 * u, x1 - x0 - 0.08 * u, 0.08 * u);
    // soil
    c.fillStyle = lin(c, 0, top, 0, soilBot, ["#5A3B24", "#7A5234"]);
    c.fillRect(x0, top, x1 - x0, soilBot - top);
    c.fillStyle = "rgba(40,24,12,.35)";
    const r = seeded(b.y | 0);
    for (let i = 0; i < 26 * n; i++) { c.beginPath(); c.arc(x0 + r() * (x1 - x0), top + r() * (soilBot - top), Math.max(0.6, u * 0.012), 0, TAU); c.fill(); }
    // front planks
    c.fillStyle = lin(c, 0, soilBot, 0, bot, ["#C98C55", "#A8703F"]);
    c.fillRect(x0 - 0.03 * u, soilBot, x1 - x0 + 0.06 * u, bot - soilBot);
    c.strokeStyle = "rgba(90,50,20,.35)"; c.lineWidth = Math.max(1, u * 0.012);
    c.beginPath(); c.moveTo(x0 - 0.03 * u, (soilBot + bot) / 2); c.lineTo(x1 + 0.03 * u, (soilBot + bot) / 2); c.stroke();
    for (let k = 1; k < n; k++) { const x = b.left + k * u + (k % 2 ? 0.2 : -0.2) * u; c.beginPath(); c.moveTo(x, soilBot); c.lineTo(x, (soilBot + bot) / 2); c.stroke(); }
    c.fillStyle = "#E3AE72"; c.fillRect(x0 - 0.03 * u, soilBot, x1 - x0 + 0.06 * u, Math.max(1.5, 0.03 * u));
    // corner posts
    c.fillStyle = "#8E5A30";
    c.fillRect(x0 - 0.06 * u, top - 0.06 * u, 0.09 * u, bot - top + 0.06 * u);
    c.fillRect(x1 - 0.03 * u, top - 0.06 * u, 0.09 * u, bot - top + 0.06 * u);
  }

  function drawSplat(b, sp) {
    const x = b.left + sp.x * b.u, y = b.y + sp.y * b.u, u = b.u;
    const a = sp.t < 1.8 ? 1 : 1 - (sp.t - 1.8) / 0.8;
    const grow = easeOut(Math.min(1, sp.t / 0.15));
    c.save(); c.globalAlpha = a;
    const r = seeded(sp.seed | 0);
    c.fillStyle = "#C8261D";
    ell(c, x, y, 0.13 * u * grow, 0.045 * u * grow); c.fill();
    for (let i = 0; i < 6; i++) { const ang = r() * TAU, d = (0.1 + r() * 0.1) * u * grow; ell(c, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.35, 0.025 * u, 0.014 * u); c.fill(); }
    c.fillStyle = "#F7D55C";
    for (let i = 0; i < 5; i++) { ell(c, x + (r() - 0.5) * 0.16 * u, y + (r() - 0.5) * 0.04 * u, 0.012 * u, 0.007 * u); c.fill(); }
    c.restore();
  }

  function drawPlant(row, b, p) {
    const u = b.u, px = b.left + (p + 0.5) * u, base = b.y - 0.1 * u;
    const sw = (h) => Math.sin(now * 1.3 + row.seed + p * 1.7) * 0.03 * h * u;
    // stake
    c.fillStyle = "#A87B4F"; c.fillRect(px - 0.025 * u + sw(1.35) * 0.3, base - 1.4 * u, 0.05 * u, 1.45 * u);
    c.fillStyle = "#C79A67"; c.fillRect(px - 0.025 * u + sw(1.35) * 0.3, base - 1.4 * u, 0.018 * u, 1.45 * u);
    // vine
    c.strokeStyle = "#4E8A2A"; c.lineWidth = Math.max(1.5, 0.035 * u); c.lineCap = "round";
    c.beginPath(); c.moveTo(px, base);
    c.bezierCurveTo(px - 0.2 * u + sw(0.5), base - 0.45 * u, px + 0.22 * u + sw(0.9), base - 0.8 * u, px + sw(1.3), base - 1.3 * u); c.stroke();
    // leaves (seeded so every plant is a little different)
    const r = seeded(row.seed * 97 + p * 13);
    const cols = ["#3E8E35", "#4FA23F", "#5DB548", "#357F2E"];
    for (let i = 0; i < 16; i++) {
      const hy = 0.15 + r() * 1.2, lx = (r() - 0.5) * 0.7 * (1 - hy * 0.25);
      const lr = (0.1 + r() * 0.08) * u;
      const x = px + lx * u + sw(hy), y = base - hy * u;
      c.fillStyle = cols[i % 4];
      ell(c, x, y, lr * 1.25, lr * 0.8, (r() - 0.5) * 1.4); c.fill();
    }
    c.fillStyle = "rgba(255,255,255,.12)";
    for (let i = 0; i < 4; i++) { const hy = 0.3 + i * 0.28; ell(c, px - 0.12 * u + sw(hy), base - hy * u - 0.04 * u, 0.08 * u, 0.04 * u, -0.4); c.fill(); }
  }

  // A single tomato. p = how far through its stage it is.
  function drawTomato(x, y, r, col, o = {}) {
    c.save();
    c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    if (o.scale) c.scale(o.scale, o.scale);
    // stem up to the vine
    if (o.stem !== false) { c.strokeStyle = "#4E8A2A"; c.lineWidth = Math.max(1, r * 0.18); c.beginPath(); c.moveTo(0, -r * 0.8); c.quadraticCurveTo(r * 0.2, -r * 1.4, r * 0.05, -r * 1.8); c.stroke(); }
    ell(c, 0, 0, r * 1.08, r * 0.95);
    c.fillStyle = rad(c, -r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.1, [shade(col, 0.35), col, shade(col, -0.3)]);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = Math.max(0.8, r * 0.07);
    c.beginPath(); c.moveTo(-r * 0.25, -r * 0.8); c.quadraticCurveTo(-r * 0.4, 0, -r * 0.2, r * 0.85); c.moveTo(r * 0.3, -r * 0.8); c.quadraticCurveTo(r * 0.45, 0, r * 0.25, r * 0.85); c.stroke();
    c.fillStyle = "rgba(255,255,255,.55)"; ell(c, -r * 0.42, -r * 0.4, r * 0.24, r * 0.14, -0.6); c.fill();
    // calyx
    c.fillStyle = "#3F8A2E";
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr2 = i % 2 ? r * 0.12 : r * 0.5; const px = Math.cos(a) * rr2, py = -r * 0.82 + Math.sin(a) * rr2 * 0.5; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fill();
    c.restore();
  }
  function drawFlower(x, y, r) {
    c.fillStyle = "#FFD83D";
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; ell(c, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.25, a); c.fill(); }
    c.fillStyle = "#E89A1C"; c.beginPath(); c.arc(x, y, r * 0.3, 0, TAU); c.fill();
  }

  function drawSpot(row, b, s) {
    const [x, y] = spotPos(row, s);
    const R = 0.125 * b.u;
    if (s.st === "bud") {
      if (s.age > 0.4) drawFlower(x, y - R * 0.3, R * 0.55 * Math.min(1, (s.age - 0.4) * 3));
      return;
    }
    const p = 1 - s.left / s.dur;
    if (s.st === "green") {
      const size = lerp(0.4, 1, easeOut(Math.min(1, p / 0.35)));
      const col = p < 0.72 ? COL.green : mix(COL.green, COL.blush, (p - 0.72) / 0.28);
      drawTomato(x, y, R * size, col);
      return;
    }
    // red: pop in, glint, then shake and darken just before it drops
    const warn = clamp((0.8 - s.left) / 0.8, 0, 1);
    const col = warn > 0 ? mix(COL.red, COL.over, warn) : COL.red;
    const pop = s.pop > 0 ? 1 + Math.sin((1 - s.pop / 0.5) * Math.PI) * 0.28 : 1;
    const rot = warn > 0 ? Math.sin(now * 38) * 0.28 * warn : 0;
    if (row.i === 0) {
      c.fillStyle = `rgba(255,240,150,${0.35 + Math.sin(now * 6) * 0.12})`;
      c.beginPath(); c.arc(x, y, R * 1.55, 0, TAU); c.fill();
    }
    drawTomato(x, y, R * 1.05, col, { scale: pop, rot });
    if (s.pop > 0) {
      const a = s.pop / 0.5;
      c.save(); c.globalAlpha = a; c.fillStyle = "#FFFFFF";
      A.starPath(c, x + R * 0.8, y - R * 0.8, R * 0.55 * (1.2 - a * 0.4), 4, 0.35, now * 3); c.fill();
      c.restore();
    }
  }

  function drawBasket(x, y, u, n, color) {
    const w = 0.5 * u, h = 0.3 * u;
    shadow(c, x, y + 0.02 * u, w * 0.6, 0.06 * u, 0.3);
    // handle
    c.strokeStyle = "#9C6A34"; c.lineWidth = Math.max(2, 0.04 * u);
    c.beginPath(); c.ellipse(x, y - h, w * 0.42, h * 0.95, 0, Math.PI, TAU); c.stroke();
    // tomatoes piled inside
    const shown = Math.min(n, 10), tr = 0.07 * u;
    const pile = [];
    const LAYERS = [4, 3, 2, 1];
    for (let i = 0, layer = 0, idx = 0; i < shown; i++) {
      pile.push([x + (idx - (LAYERS[layer] - 1) / 2) * tr * 1.55, y - h - layer * tr * 1.05]);
      if (++idx >= LAYERS[layer]) { layer++; idx = 0; }
    }
    for (const [tx, ty] of pile) drawTomato(tx, ty, tr, COL.red, { stem: false });
    // body
    c.beginPath(); c.moveTo(x - w / 2, y - h); c.lineTo(x + w / 2, y - h); c.lineTo(x + w * 0.4, y); c.lineTo(x - w * 0.4, y); c.closePath();
    c.fillStyle = lin(c, 0, y - h, 0, y, ["#E0A860", "#B7803F"]); c.fill();
    c.save(); c.clip();
    c.strokeStyle = "rgba(120,70,25,.45)"; c.lineWidth = Math.max(1, 0.015 * u);
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x - w, y - h + (h * k) / 4); c.lineTo(x + w, y - h + (h * k) / 4); c.stroke(); }
    for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(x + k * w * 0.12, y - h); c.lineTo(x + k * w * 0.1, y); c.stroke(); }
    c.restore();
    c.fillStyle = color; rr(c, x - w * 0.52, y - h - 0.03 * u, w * 1.04, 0.06 * u, 0.03 * u); c.fill();
  }

  function drawRow(row) {
    const b = L.beds[row.i];
    drawBed(b);
    for (const sp of row.splats) drawSplat(b, sp);
    for (let p = 0; p < level.plants; p++) drawPlant(row, b, p);
    for (const s of row.spots) drawSpot(row, b, s);
    for (const f of row.falling) drawTomato(b.left + f.x * b.u, b.y + f.y * b.u, 0.125 * b.u, f.green ? COL.green : COL.over, { rot: f.rot, stem: false });
    // the kid, with their basket
    const s = A.CHARS[row.kid];
    const kx = b.kidX, ky = b.y + 0.2 * b.u;
    const k = (1.02 * b.u) / 100;
    const bx = b.basketX, by = b.y + 0.24 * b.u;
    drawBasket(bx, by, b.u, row.basket, s.color);
    shadow(c, kx, ky, 0.22 * b.u, 0.05 * b.u, 0.28);
    c.save(); c.translate(kx, ky); c.scale(k, k);
    const won = state === "end" && row.basket >= level.target;
    A.drawChar(c, s, { t: now + row.i * 0.7, move: 0, side: 0, dir: 1, pose: row.pose || (won ? "cheer" : null), pt: row.poseT, blink: ((now + row.i) % 4.1) < 0.12 });
    c.restore();
    // tomatoes flying into the basket
    for (const f of row.flying) {
      const t = f.t / f.dur, e = easeOut(t);
      const x0 = b.left + f.x0 * b.u, y0 = b.y + f.y0 * b.u;
      const x1 = bx, y1 = by - 0.35 * b.u;
      const x = lerp(x0, x1, e), y = lerp(y0, y1, t) - Math.sin(t * Math.PI) * 0.5 * b.u;
      drawTomato(x, y, 0.12 * b.u * (1 - t * 0.35), COL.red, { stem: false, rot: t * 6 });
    }
    // basket count bubble above the kid
    const fs = Math.max(12, 0.2 * b.u);
    const label = String(row.basket);
    c.font = `700 ${fs}px ${FONT}`;
    const tw = c.measureText(label).width + fs * 0.9;
    const ty = ky - (s.L + s.T + s.R * 2.3) * k - fs * 0.9;
    c.fillStyle = "#FFFFFF"; rr(c, kx - tw / 2, ty - fs * 0.62, tw, fs * 1.24, fs * 0.62); c.fill();
    c.strokeStyle = s.color; c.lineWidth = 2.5; c.stroke();
    text(c, label, kx, ty + fs * 0.04, fs, "#2B2340", { weight: 700 });
    if (row.i === 0 && state !== "end") text(c, "YOU", kx, ky + Math.max(12, 0.16 * b.u), Math.max(11, 0.15 * b.u), "#FFFFFF", { stroke: "rgba(43,35,64,.6)", strokeW: 3, weight: 700 });
  }

  function drawButterflies() {
    for (const bf of butterflies) {
      const t = now * 0.15 + bf.p;
      const x = (Math.sin(t * 1.3) * 0.45 + 0.5) * W, y = L.fenceY - L.U * 0.3 + Math.sin(t * 2.1) * L.U * 0.5;
      const f = Math.abs(Math.sin(now * 14 + bf.p)) * 0.8 + 0.2, s = Math.max(4, L.U * 0.06);
      c.fillStyle = bf.col;
      ell(c, x - s * f * 0.7, y, s * f, s * 0.7); c.fill();
      ell(c, x + s * f * 0.7, y, s * f, s * 0.7); c.fill();
      c.fillStyle = "#2B2340"; c.fillRect(x - 0.8, y - s * 0.6, 1.6, s * 1.2);
    }
  }

  function drawFloaters() {
    for (const f of floaters) {
      const a = 1 - f.t / 0.9;
      c.save(); c.globalAlpha = a;
      text(c, f.text, f.x, f.y - f.t * L.U * 0.6, Math.max(18, L.U * 0.24), f.col, { stroke: "#FFFFFF", strokeW: 5, weight: 700 });
      c.restore();
    }
  }

  function drawBanner(str, sub) {
    const s = Math.min(W, H);
    const pop = easeOut(Math.min(1, (state === "count" ? (countT % 1) : endT) / 0.25));
    c.save();
    c.translate(W / 2, H * 0.48);
    c.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
    text(c, str, 0, 0, s * 0.16, "#FFFFFF", { stroke: "#C0392B", strokeW: s * 0.025, shadow: "rgba(43,35,64,.3)", shadowY: s * 0.012, weight: 700 });
    if (sub) text(c, sub, 0, s * 0.12, s * 0.05, "#FFFFFF", { stroke: "rgba(43,35,64,.6)", strokeW: 5, weight: 700 });
    c.restore();
  }
  function drawCountdown() {
    const n = Math.ceil(3 - countT);
    drawBanner(n > 0 ? String(n) : "Pick!", `Get ${level.target} red tomatoes`);
  }

  // ---------- HUD ----------
  function tomatoIcon(canvas) {
    const w = canvas.width;
    withCtx(canvas.getContext("2d"), () => { c.clearRect(0, 0, w, w); drawTomato(w / 2, w * 0.56, w * 0.33, COL.red, { stem: false }); });
  }

  function updateTimer() {
    const left = Math.max(0, Math.ceil(ROUND - clock));
    const el = $("timer");
    if (el.dataset.v !== String(left)) { el.dataset.v = String(left); el.firstChild.nodeValue = String(left); }
    el.classList.toggle("hurry", state === "play" && left <= 10);
  }
  function updateHud(reset) {
    $("count").textContent = rows[0] ? rows[0].basket : 0;
    $("target").textContent = level.target;
    $("goal").classList.toggle("done", rows[0] && rows[0].basket >= level.target);
    $("lvlName").textContent = `Level ${lvlIdx + 1} · ${level.name}`;
    if (reset) updateTimer();
    for (const row of rows) { const el = document.querySelector(`[data-chip="${row.kid}"] b`); if (el) el.textContent = row.basket; }
  }
  function bump() { const g = $("goal"); g.classList.remove("bump"); void g.offsetWidth; g.classList.add("bump"); }
  function face(canvas, id, pose) { A.portrait(canvas, id, { t: 0.4, pose }); }
  function buildRace() {
    const el = $("race");
    el.innerHTML = "";
    for (const row of rows) {
      const chip = document.createElement("div");
      chip.className = "chip" + (row.i === 0 ? " me" : "");
      chip.dataset.chip = row.kid;
      const f = document.createElement("canvas"); f.width = f.height = 52; face(f, row.kid);
      chip.append(f, Object.assign(document.createElement("span"), { className: "nm", textContent: A.CHARS[row.kid].name }), Object.assign(document.createElement("b"), { textContent: "0" }));
      el.append(chip);
    }
  }

  // ---------- screens ----------
  function show(id) { ["menu", "brief", "result"].forEach((k) => ($(k).hidden = k !== id)); }

  function buildMenu() {
    const kids = $("kids");
    kids.innerHTML = "";
    for (const id of KIDS) {
      const b = document.createElement("button");
      b.className = "kid"; b.setAttribute("aria-pressed", String(save.kid === id));
      const f = document.createElement("canvas"); f.width = f.height = 176; face(f, id);
      b.append(f, document.createTextNode(A.CHARS[id].name));
      b.onclick = () => { save.kid = id; persist(); audio(); SFX.pick(); buildMenu(); };
      kids.append(b);
    }
    const lv = $("levels");
    lv.innerHTML = "";
    LEVELS.forEach((L2, i) => {
      const b = document.createElement("button");
      b.className = "lvl"; b.setAttribute("aria-pressed", String(lvlIdx === i));
      b.innerHTML = `<b>${i + 1} · ${L2.name}</b><span>${L2.target} tomatoes</span><span class="best">${save.best[i] ? (save.beaten[i] ? "✓ " : "") + "Best " + save.best[i] : ""}</span>`;
      b.onclick = () => { lvlIdx = i; save.level = i; persist(); audio(); SFX.pick(); buildMenu(); };
      lv.append(b);
    });
    document.querySelectorAll("[data-rule]").forEach((cvs) => {
      const g = cvs.getContext("2d"), w = cvs.width, kind = cvs.dataset.rule;
      g.clearRect(0, 0, w, w);
      withCtx(g, () => {
      if (kind === "fall") {
        drawTomato(w * 0.5, w * 0.42, w * 0.24, COL.over, { stem: false, rot: 0.5 });
        g.strokeStyle = "rgba(43,35,64,.35)"; g.lineWidth = 3; g.lineCap = "round";
        [[-0.12, 0.08], [0, 0.1], [0.12, 0.08]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(w * (0.5 + dx), w * (0.08 + dy)); g.lineTo(w * (0.5 + dx), w * (0.02 + dy)); g.stroke(); });
        g.fillStyle = "#C8261D"; g.beginPath(); g.ellipse(w * 0.5, w * 0.86, w * 0.3, w * 0.07, 0, 0, TAU); g.fill();
      } else drawTomato(w * 0.5, w * 0.58, w * 0.3, kind === "red" ? COL.red : COL.green);
      });
    });
  }

  function openBrief() {
    setupRound();
    state = "brief";
    $("hud").hidden = false;
    show("brief");
    $("briefLvl").textContent = `Level ${lvlIdx + 1} · ${level.name}`;
    face($("briefFace"), "simon", "wave");
    $("briefSay").innerHTML = `I need <b>${level.target}</b> tomatoes for Grandma's salad!`;
    const secs = level.ripe[1] >= 3.9 ? "about 4 seconds" : level.ripe[1] >= 3 ? "about 3 seconds" : "only 2 seconds";
    $("briefTip").textContent = `Red tomatoes stay on the vine for ${secs}. Tap them before they fall. Leave the green ones alone!`;
    updateHud(true);
  }
  function startCount() {
    audio();
    show(null);
    state = "count"; countT = 0;
    SFX.beep(false);
  }
  // ?debug exposes the state so a test can play a round.
  if (/[?&]debug\b/.test(location.search)) window.GG = { get rows() { return rows; }, spotPos: (row, s) => spotPos(row, s), get state() { return state; } };

  function finish() {
    state = "end"; endT = 0; clock = ROUND;
    updateTimer();
    const me = rows[0], won = me.basket >= level.target;
    if (me.basket > save.best[lvlIdx]) save.best[lvlIdx] = me.basket;
    if (won) save.beaten[lvlIdx] = true;
    persist();
    simon.pose = won ? "cheer" : "shrug"; simon.poseT = 0;
    say(won ? "10-4! Grandma's salad is ready!" : "Time's up! Let's try again!", 3);
    won ? SFX.win() : SFX.lose();
    try { if (window.RosenbergBridge) window.RosenbergBridge.report({ score: me.basket, stars: won ? lvlIdx + 1 : 0 }); } catch (e) { /* standalone */ }
    setTimeout(() => { if (state === "end") showResult(); }, 1700);
  }
  function showResult() {
    const me = rows[0], T = level.target, won = me.basket >= T;
    show("result");
    $("resTitle").textContent = won ? "Grandma's salad is ready!" : "Not quite enough for the salad";
    face($("resFace"), "simon", won ? "cheer" : "shrug");
    $("resSay").innerHTML = won
      ? `10-4! You picked <b>${me.basket}</b>. I only needed ${T}. Grandma's going to love it!`
      : `You picked <b>${me.basket}</b>. I need ${T}. Only ${T - me.basket} more. Try again!`;
    drawBowl($("bowl"), Math.min(me.basket, T), T);
    const sorted = rows.slice().sort((a, b) => b.basket - a.basket || a.i - b.i);
    const places = ["1st", "2nd", "3rd", "4th"];
    const st = $("standings"); st.innerHTML = "";
    sorted.forEach((row, k) => {
      const d = document.createElement("div");
      d.className = "stand" + (row.i === 0 ? " me" : "");
      const f = document.createElement("canvas"); f.width = f.height = 72; face(f, row.kid, k === 0 ? "cheer" : null);
      const pl = Object.assign(document.createElement("span"), { className: "place", textContent: places[k] });
      const nm = document.createTextNode(A.CHARS[row.kid].name + (row.i === 0 ? " (you)" : ""));
      const n = Object.assign(document.createElement("span"), { className: "n", textContent: row.basket + " 🍅" });
      d.append(pl, f, nm, n);
      st.append(d);
    });
    $("stats").innerHTML = `<span>Picked ${stats.picked}</span><span>Fell off ${stats.fell}</span><span>Picked too early ${stats.early}</span>`;
    const nextBtn = $("next");
    nextBtn.hidden = !(won && lvlIdx < LEVELS.length - 1);
    $("again").textContent = won ? "Play again" : "Try again";
    $("again").className = nextBtn.hidden ? "btn" : "btn alt";
  }
  function drawBowl(canvas, n, T) {
    const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    g.clearRect(0, 0, w, h);
    const cx = w / 2, top = h * 0.42;
    // lettuce
    const r = seeded(5);
    for (let i = 0; i < 14; i++) { g.fillStyle = ["#7CC85A", "#5DB548", "#9ED86F"][i % 3]; g.beginPath(); g.ellipse(cx + (r() - 0.5) * w * 0.62, top - r() * h * 0.12, w * 0.09, h * 0.08, r() * 3, 0, TAU); g.fill(); }
    // tomatoes: one per 10% of the goal
    const shown = Math.round((n / T) * 10);
    withCtx(g, () => { for (let i = 0; i < shown; i++) drawTomato(cx + (i - (shown - 1) / 2) * w * 0.065, top - h * 0.1 - (i % 2) * h * 0.06, w * 0.04, COL.red, { stem: false }); });
    // bowl
    g.beginPath(); g.moveTo(w * 0.12, top); g.quadraticCurveTo(cx, h * 1.08, w * 0.88, top); g.closePath();
    const gr = g.createLinearGradient(0, top, 0, h); gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(1, "#D9E4F2"); g.fillStyle = gr; g.fill();
    g.fillStyle = "#4C8BD9"; g.fillRect(w * 0.12, top - 3, w * 0.76, 8);
    g.fillStyle = "#2B2340"; g.font = `700 ${h * 0.12}px ${FONT}`; g.textAlign = "center"; g.fillText("Grandma's salad", cx, h * 0.83);
  }

  // ---------- wiring ----------
  function muteIcon() {
    $("mute").innerHTML = save.muted
      ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l4-3v10l-4-3H3zM13 8l4 4M17 8l-4 4"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l4-3v10l-4-3H3zM13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10"/></svg>';
    $("mute").setAttribute("aria-label", save.muted ? "Sound off" : "Sound on");
  }
  $("mute").onclick = () => { save.muted = !save.muted; persist(); muteIcon(); };
  $("start").onclick = () => { audio(); openBrief(); };
  $("go").onclick = startCount;
  $("again").onclick = openBrief;
  $("next").onclick = () => { lvlIdx = Math.min(LEVELS.length - 1, lvlIdx + 1); save.level = lvlIdx; persist(); openBrief(); };
  const toMenu = () => { state = "menu"; $("hud").hidden = true; buildMenu(); show("menu"); setupRound(); };
  $("menuBtn").onclick = toMenu;
  $("home").onclick = toMenu;
  // Pause the clock when the tab is hidden: the tomatoes shouldn't fall while nobody is looking.
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  tomatoIcon($("goalTom"));
  muteIcon();
  setupRound();
  buildMenu();
  show("menu");
  requestAnimationFrame((ts) => { last = ts; frame(ts); });
})();
