// Lazy River Pirates: race Dad around the lazy river, weaving past (and plundering) the rafters.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FAST = location.hash.includes("fast") ? 6 : 1;   // test hook
  const TAU = Math.PI * 2;
  const W = 400;   // river world is 400 units wide
  const R = 25;    // tube radius
  const SR = 13;   // swimmer radius

  const store = {
    get(k, d) { try { const v = localStorage.getItem("lazyRiver." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("lazyRiver." + k, JSON.stringify(v)); } catch {} },
  };

  // ---------- the pirates ----------
  const KIDS = {
    reuben: { name: "Reuben", skin: "#F2C29B", hair: "#6B4423", style: "short", suit: "#2563EB", suit2: "#1D3F9E", band: "#E23B3B", dots: "#FFFFFF" },
    jonah:  { name: "Jonah",  skin: "#EDBB92", hair: "#2B1B12", style: "curly", suit: "#22A35A", suit2: "#146B3A", band: "#1B2430", dots: "#FFFFFF" },
    ellie:  { name: "Ellie",  skin: "#F6CFAE", hair: "#B7793A", style: "pigtails", suit: "#8B5CF6", suit2: "#6D28D9", band: "#F0529C", dots: "#FFE066" },
  };
  const DAD = { name: "Dad", skin: "#EAB98F", hair: "#5A4030", style: "short", suit: "#1B2430", suit2: "#111820", stripes: true, adult: true };
  const ORDER = ["reuben", "jonah", "ellie"];

  const DAD_LINES = {
    start: ["Arr! Race ye 'round the river, matey!", "Pirates don't need tubes! Swim!"],
    idle: ["Weave 'round the landlubbers!", "Those rafters be guardin' treasure!", "Dive under 'em, matey!", "Arrr!", "Yo ho ho!", "Grab the sparkly loot!"],
    plunder: ["Heh heh, mine now!", "Booty for the captain!", "Sorry, sir! Pirate business!", "Yo ho ho!", "Into me treasure chest!"],
    bump: ["Blimey! Sorry!", "Pardon me, landlubber!", "Shiver me timbers!", "Oops! Excuse me!"],
    passed: ["Ye sneaky scallywag!", "Come back here, matey!", "Arr, ye swim like a dolphin!"],
    passing: ["See ye at the finish!", "Catch me if ye can!", "Ahoy! Comin' through!"],
    rough: "Rough seas! Hold fast!", grotto: "A secret pirate cave! Arr!", whirl: "Whirlpools! Don't get sucked in!", surge: "Ride the waves, matey!",
    lap: ["Another lap, me hearty!", "Round we go again!"],
  };

  // ---------- the river: zones around one lap, three laps a race ----------
  const ZONES = {
    smooth: { name: "Smooth Seas", sub: "Easy water. Plunder away!", current: 55, hw: 150, water: [56, 204, 214], rough: 0, dark: 0, color: "#38CCD6", every: [140, 190], two: 0.45 },
    rough:  { name: "Rough Seas", sub: "Fast water, rocks and bumpy rafts!", current: 130, hw: 125, water: [30, 124, 178], rough: 1, dark: 0, color: "#1E6FA8", every: [230, 300], two: 0.15 },
    grotto: { name: "Waterfall Grotto", sub: "Find the gap, or dive through!", current: 70, hw: 132, water: [26, 104, 124], rough: 0.1, dark: 1, color: "#1F4F5E", every: [190, 250], two: 0.3 },
    whirl:  { name: "Whirlpool Cove", sub: "Swirls pull you in. Swim wide!", current: 65, hw: 165, water: [44, 180, 204], rough: 0.15, dark: 0, color: "#7C6FE0", every: [170, 220], two: 0.35 },
    surge:  { name: "Wave Surge", sub: "Catch a wave for a speed boost!", current: 80, hw: 150, water: [40, 158, 216], rough: 0.35, dark: 0, color: "#FFB547", every: [160, 210], two: 0.4 },
  };
  const LAP = [["smooth", 4900], ["rough", 4500], ["smooth", 2500], ["grotto", 4100], ["whirl", 4000], ["surge", 3600], ["rough", 3800], ["smooth", 2500]];
  const LAPS = 3;
  const STARTS = []; let LAP_LEN = 0;
  for (const [, len] of LAP) { STARTS.push(LAP_LEN); LAP_LEN += len; }
  const RACE_LEN = LAP_LEN * LAPS;
  const local = (s) => ((s % LAP_LEN) + LAP_LEN) % LAP_LEN;
  const lapOf = (s) => clamp(Math.floor(s / LAP_LEN), 0, LAPS - 1);
  const zoneIndex = (sl) => { let i = 0; while (i < LAP.length - 1 && sl >= STARTS[i + 1]) i++; return i; };

  function params(s, out) {
    const sl = local(s), i = zoneIndex(sl), z = ZONES[LAP[i][0]], pz = ZONES[LAP[(i + LAP.length - 1) % LAP.length][0]];
    const t = smooth(clamp((sl - STARTS[i]) / 320, 0, 1));
    out.i = i;
    out.current = lerp(pz.current, z.current, t); out.hw = lerp(pz.hw, z.hw, t);
    out.r = lerp(pz.water[0], z.water[0], t); out.g = lerp(pz.water[1], z.water[1], t); out.b = lerp(pz.water[2], z.water[2], t);
    out.rough = lerp(pz.rough, z.rough, t); out.dark = lerp(pz.dark, z.dark, t);
    return out;
  }
  const P0 = {}, P1 = {}, P2 = {};
  // the river's bends repeat exactly once per lap
  const centerX = (s, hw) => { const ph = (TAU * local(s)) / LAP_LEN; return 200 + (200 - hw - 26) * (0.7 * Math.sin(10 * ph) + 0.3 * Math.sin(27 * ph + 1)); };
  function riverAt(s) { params(s, P2); return { cx: centerX(s, P2.hw), hw: P2.hw }; }
  const posX = (s, u) => { const q = riverAt(s); return q.cx + u * q.hw; };

  // ---------- state ----------
  const canvas = $("#river"), ctx = canvas.getContext("2d");
  let dpr = 1, scale = 1, viewH = 800, baseY = 560;
  const G = {
    running: false, paused: false, t: 0, camS: 0, kid: store.get("kid", "reuben"),
    objs: [], over: [], decor: [], rafts: [], waves: [], parts: [], pops: [],
    you: null, dad: null, zoneKey: "", lap: 0, shake: 0, spawnS: 0, nextWave: 0, boingCd: 0,
    raceT: 0, ending: false, endT: 0, lead: 0, talkCd: 0, idleTalk: 10, dadLine: null, stats: null,
  };
  if (!KIDS[G.kid]) G.kid = "reuben";

  function makeSwimmer(look, isDad, x, s) {
    return { look, isDad, key: isDad ? "dad" : "you", x, s, vx: 0, vs: 0, slowT: 0, diveT: 0, diveCd: 0, boost: 0, rot: 0, spinT: 0, whirlCd: 0,
      t: Math.random() * 5, score: 0, happyT: 0, ouchT: 0, target: x, thinkT: 0, distractT: 0, greedy: true, greedT: 3, finishT: null };
  }

  // ---------- building the course ----------
  let uid = 0;
  function rockShape(r) { const pts = []; for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; const rr = r * rand(0.78, 1.08); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.85]); } return pts; }
  function add(type, s, u, extra) {
    const o = Object.assign({ id: uid++, type, s, u, x: posX(s, u), dead: false, seed: Math.random() * 100, hit: {} }, extra);
    G.objs.push(o); return o;
  }
  function coinLine(s, n) { const u0 = rand(-0.65, 0.65), du = rand(-0.1, 0.1); for (let j = 0; j < n; j++) add("coin", s + j * 30, clamp(u0 + du * j, -0.82, 0.82)); }
  const lowerBound = (arr, s) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (arr[m].s < s) a = m + 1; else b = m; } return a; };
  function eachObj(lo, hi, fn) { for (let i = lowerBound(G.objs, lo); i < G.objs.length && G.objs[i].s <= hi; i++) fn(G.objs[i]); }

  function buildRace() {
    G.objs = []; G.over = [];
    for (let L = 0; L < LAPS; L++) {
      const base = L * LAP_LEN;
      LAP.forEach(([k, len], i) => {
        const a = base + STARTS[i], b = a + len;
        if (k === "smooth") {
          for (let s = a + (L === 0 && i === 0 ? 700 : 260); s < b - 150; s += rand(260, 380)) coinLine(s, 4);
          if (Math.random() < 0.7) add("chest", a + len * rand(0.3, 0.8), rand(-0.6, 0.6));
          for (let j = 0; j < Math.floor(len / 1400); j++) add(Math.random() < 0.6 ? "turtle" : "ray", a + rand(300, len - 200), rand(-0.6, 0.6));
          add("fish", a + rand(200, len - 100), rand(-0.6, 0.6));
        } else if (k === "rough") {
          for (let s = a + 380; s < b - 200; s += rand(260, 340)) {
            const n = Math.random() < 0.4 ? 2 : 1, us = [];
            while (us.length < n) { const u = rand(-0.78, 0.78); if (us.every((v) => Math.abs(v - u) > 0.75)) us.push(u); }
            us.forEach((u) => { const r = rand(17, 24); add("rock", s + rand(-20, 20), u, { r, pts: rockShape(r) }); });
            let su = 0, tries = 0;
            do { su = rand(-0.8, 0.8); tries++; } while (tries < 20 && us.some((v) => Math.abs(v - su) < 0.45));
            add("coin", s + 120, su); add("coin", s + 150, su);
          }
        } else if (k === "grotto") {
          G.over.push({ type: "cave", s: a + 40 }, { type: "cave", s: b + 150, exit: true });
          for (let s = a + 480; s < b - 250; s += rand(420, 520)) {
            const gu = rand(-0.55, 0.55);
            add("falls", s, 0, { gu, gw: 96 });
            add("gem", s + 170, rand(-0.7, 0.7), { hue: pick(["#7CF3FF", "#C9A2FF", "#8CFFB4"]) });
            add("gem", s - 160, gu, { hue: pick(["#7CF3FF", "#C9A2FF", "#8CFFB4"]) });
          }
        } else if (k === "whirl") {
          let side = Math.random() < 0.5 ? -1 : 1;
          for (let s = a + 450; s < b - 300; s += rand(480, 560)) {
            const u = side * rand(0.28, 0.46); side = -side;
            add("whirl", s, u, { r: 62, side });
            for (let j = 0; j < 5; j++) { const ang = Math.PI + -side * (0.4 + j * 0.35); add("coin", s + Math.sin(ang) * 86, clamp(u + (Math.cos(ang) * 86) / 165, -0.85, 0.85)); }
          }
        } else if (k === "surge") {
          for (let s = a + 300; s < b - 200; s += rand(280, 380)) coinLine(s, 3);
        }
      });
      [2400, STARTS[2] + 1250, STARTS[4] + 2000, STARTS[7] + 1250].forEach((ls) => {
        const heads = []; const n = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < n; j++) heads.push({ u: rand(-0.9, 0.9), c: pick(["#FF6B5B", "#FFD166", "#3BC6A0", "#6C8CFF", "#F58CC8", "#FFFFFF"]), skin: pick(SKINS), p: Math.random() * 6 });
        G.over.push({ type: "bridge", s: base + ls, heads });
      });
      G.over.push({ type: "lapline", s: base + LAP_LEN, n: L + 2 });
    }
    G.over.push({ type: "lapline", s: 0, n: 1 });
    G.objs.sort((p, q) => p.s - q.s);
  }

  // bank decoration: one lap's worth, repeated every lap
  function buildDecor() {
    G.decor = [];
    for (const side of [-1, 1]) {
      for (let s = 0; s < LAP_LEN; s += rand(52, 92)) {
        params(s, P1);
        let type;
        if (P1.dark > 0.5) type = pick(["crystal", "crystal", "lantern", "stal", "stal"]);
        else { const h = Math.random(); type = h < 0.38 ? "palm" : h < 0.58 ? "umbrella" : h < 0.72 ? "lounger" : h < 0.88 ? "flowers" : "bush"; }
        const d = type === "palm" ? rand(16, 60) : rand(8, 48);
        const cx = centerX(s, P1.hw);
        const x = side < 0 ? cx - P1.hw - 12 - d : cx + P1.hw + 12 + d;
        G.decor.push({ type, s, x, side, seed: Math.random() * 1000, rot: rand(0, TAU), c: pick(["#1FB5C2", "#FF6B5B", "#FFB547", "#F58CC8"]) });
      }
    }
    G.decor.sort((p, q) => p.s - q.s);
  }
  function visibleDecor(m) {
    const lo = G.camS - (viewH - baseY) - m, hi = G.camS + baseY + m, out = [];
    for (let L = Math.floor(lo / LAP_LEN); L <= Math.floor(hi / LAP_LEN); L++) {
      const base = L * LAP_LEN;
      for (let i = lowerBound(G.decor, lo - base); i < G.decor.length && G.decor[i].s <= hi - base; i++) out.push([G.decor[i], G.decor[i].s + base]);
    }
    return out;
  }

  // ---------- rafters ----------
  const SKINS = ["#F6D5B8", "#F2C29B", "#E0A878", "#C98E63", "#8A5A3C", "#6B4226"];
  const HAIRS = ["#2B1B12", "#5A3A22", "#B7793A", "#E8C77A", "#9A9A9A", "#C0462A", "#1B1B1B"];
  const TUBES = [["#FF8A1F", "#FFFFFF"], ["#22C55E", "#FDE047"], ["#3D7BFF", "#FFFFFF"], ["#F0529C", "#FFFFFF"], ["#FFD23F", "#FF6B5B"], ["#14B8A6", "#E0F7FA"], ["#A855F7", "#FDE68A"]];
  const SUITS = [["#E23B3B", "#9B1C1C"], ["#2563EB", "#1D3F9E"], ["#F59E0B", "#B45309"], ["#10B981", "#047857"], ["#EC4899", "#9D174D"], ["#111827", "#374151"], ["#FFFFFF", "#CBD5E1"]];
  function randomPerson() {
    const [tube, stripe] = pick(TUBES), [suit, suit2] = pick(SUITS);
    return { tube, stripe, suit, suit2, skin: pick(SKINS), hair: pick(HAIRS), style: pick(["short", "short", "curly", "pigtails", "bald"]), trunks: Math.random() < 0.5 };
  }
  const LOOT = [
    { k: "shades", n: "sunglasses", v: 8 }, { k: "hat", n: "sun hat", v: 8 }, { k: "flop", n: "flip-flop", v: 5 },
    { k: "juice", n: "juice box", v: 6 }, { k: "snack", n: "snacks", v: 6 }, { k: "duck", n: "rubber duck", v: 10 },
    { k: "ball", n: "beach ball", v: 7 }, { k: "gold", n: "golden duck", v: 25 },
  ];
  const randomLoot = () => (Math.random() < 0.05 ? LOOT[7] : pick(LOOT.slice(0, 7)));
  function spawnRaft(s, u, dbl) {
    const q = riverAt(s);
    G.rafts.push({ s, x: q.cx + u * q.hw, dbl, drift: rand(72, 88), people: dbl ? [randomPerson(), randomPerson()] : [randomPerson()], rot: 0, vx: 0,
      loot: Math.random() < 0.32 ? randomLoot() : null, lootSide: Math.random() < 0.5 ? -1 : 1, bumpCd: {}, reactT: 0, mood: "wow",
      calm: Math.random() < 0.5 ? "chill" : "happy", seed: Math.random() * 100 });
  }
  function spawnRow(s) {
    params(s, P1);
    const z = ZONES[LAP[P1.i][0]], n = Math.random() < z.two ? 2 : 1, us = [];
    let tries = 0;
    while (us.length < n && tries++ < 20) { const u = rand(-0.72, 0.72); if (us.every((v) => Math.abs(v - u) > 0.8)) us.push(u); }
    for (const u of us) {
      const x = posX(s, u);
      let bad = false;
      eachObj(s - 160, s + 160, (o) => { if ((o.type === "whirl" || o.type === "rock") && Math.abs(o.x - x) < (o.r || 30) + 55) bad = true; });
      if (!bad) spawnRaft(s + rand(-30, 30), u, Math.random() < 0.35 && P1.hw > 130);
    }
    return rand(z.every[0], z.every[1]);
  }
  function spawnAhead() {
    const front = Math.min(G.you.s + 1500, RACE_LEN - 250);
    while (G.spawnS < front) G.spawnS += spawnRow(G.spawnS);
    G.rafts = G.rafts.filter((r) => r.s > G.you.s - 1200);
  }
  function tubes(r) {
    const y = objY(r.s);
    if (!r.dbl) return [[r.x, y]];
    const c = Math.cos(r.rot) * 26, s = Math.sin(r.rot) * 26;
    return [[r.x - c, y - s], [r.x + c, y + s]];
  }
  const lootPos = (r) => [r.x + r.lootSide * (r.dbl ? 60 : 33), objY(r.s) + 4];

  function updateRafts(dt) {
    for (const r of G.rafts) {
      params(r.s, P1);
      r.s += r.drift * FAST * dt;
      const half = r.dbl ? 52 : 26;
      r.vx += (P1.rough * 120 * Math.sin(G.t * 1.1 + r.seed) + Math.sin(G.t * 0.3 + r.seed) * 10) * dt;
      r.vx *= 1 - 1.5 * dt; r.x += r.vx * dt;
      const cx = centerX(r.s, P1.hw), lo = cx - P1.hw + half, hi = cx + P1.hw - half;
      if (r.x < lo) { r.x = lo; r.vx = Math.abs(r.vx) * 0.5; }
      if (r.x > hi) { r.x = hi; r.vx = -Math.abs(r.vx) * 0.5; }
      r.rot = Math.sin(G.t * (0.3 + P1.rough * 0.9) + r.seed) * (r.dbl ? 0.3 : 0.5);
      r.reactT = Math.max(0, r.reactT - dt);
    }
    // rafts nudge each other apart instead of overlapping
    for (let i = 0; i < G.rafts.length; i++) for (let j = i + 1; j < G.rafts.length; j++) {
      const a = G.rafts[i], b = G.rafts[j], ds = b.s - a.s;
      if (ds > 60 || ds < -60) continue;
      const dx = b.x - a.x, min = (a.dbl ? 52 : 26) + (b.dbl ? 52 : 26);
      if (Math.abs(dx) < min && Math.abs(ds) < 50) { const push = (dx < 0 ? -1 : 1) * 40 * dt; a.x -= push; b.x += push; }
    }
  }

  // ---------- sound ----------
  const Snd = (() => {
    let ac = null, master, noiseBuf, ambF, ambG, musicG, muted = store.get("muted", false), next = 0, step = 0, tempo = 100, mode = "smooth";
    function init() {
      if (ac) return;
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; return; }
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const amb = ac.createBufferSource(); amb.buffer = noiseBuf; amb.loop = true;
      ambF = ac.createBiquadFilter(); ambF.type = "lowpass"; ambF.frequency.value = 450;
      ambG = ac.createGain(); ambG.gain.value = 0.05;
      amb.connect(ambF).connect(ambG).connect(master); amb.start();
      musicG = ac.createGain(); musicG.gain.value = 0.2; musicG.connect(master);
      next = ac.currentTime + 0.1;
      setInterval(sched, 30);
    }
    function resume() { if (ac && ac.state === "suspended") ac.resume(); }
    function tone(f, t0, dur, type, vol, dest, f2) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noise(t0, dur, type, f, vol, f2, q, dest) {
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur); fl.Q.value = q || 1;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.06, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(fl).connect(g).connect(dest || master); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    }
    // steel pan: a sine with bright, fast-fading partials
    function pan(f, t0, vol) { tone(f, t0, 0.65, "sine", vol, musicG); tone(f * 2, t0, 0.3, "sine", vol * 0.35, musicG); tone(f * 3.01, t0, 0.14, "sine", vol * 0.12, musicG); }
    // a minor-key shanty: Am F G Am
    const CH = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [220, 261.63, 329.63]];
    const BASS = [110, 87.31, 98, 110];
    const RHY = [1, 0, 1, 1, 0, 1, 1, 0];
    const TEMPO = { smooth: 108, rough: 138, grotto: 88, whirl: 112, surge: 120 };
    function sched() {
      if (!ac || !G.running || G.paused) { if (ac) next = Math.max(next, ac.currentTime + 0.05); return; }
      while (next < ac.currentTime + 0.12) { play(step, next); next += 60 / tempo / 2; step = (step + 1) % 32; }
    }
    function play(st, t) {
      const bar = Math.floor(st / 8) % 4, s8 = st % 8, ch = CH[bar];
      if (mode === "grotto") {
        if (s8 % 4 === 0) pan(ch[(st >> 2) % 3] * 2, t, 0.3);
        if (s8 === 0) tone(BASS[bar], t, 1.2, "triangle", 0.25, musicG);
        if (s8 === 6) pan(ch[2] * 4, t, 0.08);
        return;
      }
      if (RHY[s8]) pan(ch[(s8 + bar * 2) % 3] * (s8 >= 4 ? 2 : 1), t, 0.34);
      if (s8 === 0 || s8 === 3 || s8 === 4) tone(BASS[bar] * (s8 === 3 ? 1.5 : 1), t, 0.28, "triangle", 0.3, musicG);
      noise(t, 0.05, "highpass", 6500, s8 % 2 ? 0.05 : 0.025, 0, 1, musicG);
      if (mode === "rough" && (s8 === 0 || s8 === 4 || s8 === 6 || s8 === 7)) tone(150, t, 0.18, "sine", 0.45, musicG, 60);
      if (mode === "surge" && s8 === 4) noise(t, 0.12, "bandpass", 1800, 0.12, 0, 2, musicG);
    }
    function setMode(k) {
      mode = k; tempo = TEMPO[k] || 100;
      if (!ac) return;
      const t = ac.currentTime;
      ambF.frequency.setTargetAtTime(k === "rough" ? 1500 : k === "surge" ? 900 : k === "grotto" ? 700 : 450, t, 0.4);
      ambG.gain.setTargetAtTime(k === "rough" ? 0.13 : k === "grotto" ? 0.09 : 0.05, t, 0.4);
    }
    function setMuted(m) { muted = m; store.set("muted", m); if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.05); }
    const now = () => ac.currentTime;
    const guard = (fn) => (...a) => { if (ac && !muted) fn(...a); };
    return {
      init, resume, setMode, setMuted, get muted() { return muted; },
      quiet(q) { if (ambG && ac) ambG.gain.setTargetAtTime(q ? 0.0001 : 0.05, ac.currentTime, 0.2); },
      coin: guard(() => { const t = now(); tone(1319, t, 0.1, "square", 0.05); tone(1760, t + 0.05, 0.16, "square", 0.05); }),
      plunder: guard((big) => { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.18, "sine", 0.2)); if (big) [1319, 1760, 2093].forEach((f, i) => tone(f, t + 0.22 + i * 0.07, 0.25, "sine", 0.16)); }),
      treasure: guard(() => { const t = now(); [523, 659, 784, 1047, 1319].forEach((f, i) => pan(f, t + i * 0.07, 0.4)); }),
      bonk: guard(() => { const t = now(); tone(220, t, 0.25, "sine", 0.5, null, 70); noise(t, 0.2, "lowpass", 900, 0.3); }),
      splash: guard(() => { const t = now(); noise(t, 0.8, "bandpass", 1200, 0.45, 400, 0.8); noise(t + 0.05, 0.6, "highpass", 3000, 0.12); }),
      dive: guard(() => { const t = now(); tone(600, t, 0.3, "sine", 0.25, null, 180); noise(t, 0.4, "lowpass", 1400, 0.2, 300, 1); [0.15, 0.3, 0.42].forEach((d) => tone(rand(900, 1400), t + d, 0.06, "sine", 0.08, null, 2000)); }),
      whoosh: guard(() => { const t = now(); noise(t, 0.9, "bandpass", 300, 0.4, 2200, 3); tone(500, t, 0.8, "sine", 0.12, null, 150); }),
      boing: guard(() => { const t = now(); tone(260, t, 0.22, "sine", 0.25, null, 520); }),
      wave: guard(() => { const t = now(); noise(t, 0.8, "lowpass", 400, 0.35, 1600, 1); tone(392, t + 0.1, 0.18, "sine", 0.18, null, 784); }),
      hi: guard(() => { const t = now(); tone(880, t, 0.1, "sine", 0.18, null, 1320); tone(1320, t + 0.09, 0.14, "sine", 0.15, null, 990); }),
      zone: guard((rough) => { const t = now(); if (rough) { [196, 185, 175].forEach((f, i) => tone(f, t + i * 0.12, 0.3, "sawtooth", 0.06)); noise(t, 1.2, "lowpass", 300, 0.3, 1800, 1); } else [440, 523, 659].forEach((f, i) => pan(f, t + i * 0.09, 0.4)); }),
      bell: guard(() => { const t = now(); [0, 0.35].forEach((d) => { tone(1568, t + d, 0.9, "sine", 0.25); tone(2352, t + d, 0.5, "sine", 0.08); }); }),
      win: guard(() => { const t = now(); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => pan(f, t + i * 0.13, 0.5)); }),
      lose: guard(() => { const t = now(); [392, 370, 349, 330].forEach((f, i) => tone(f, t + i * 0.28, i === 3 ? 0.8 : 0.3, "triangle", 0.25, null, i === 3 ? 300 : 0)); }),
    };
  })();

  // ---------- input ----------
  const input = { active: false, x: 200, left: false, right: false };
  function pointerX(e) { const r = canvas.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; }
  canvas.addEventListener("pointerdown", (e) => { input.active = true; input.x = pointerX(e); try { canvas.setPointerCapture(e.pointerId); } catch {} });
  canvas.addEventListener("pointermove", (e) => { if (input.active || e.pointerType === "mouse") { input.x = pointerX(e); if (e.pointerType === "mouse") input.active = true; } });
  const release = (e) => { if (e.pointerType !== "mouse" || e.type === "pointerleave") input.active = false; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", release);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { input.left = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { input.right = true; e.preventDefault(); }
    if ((e.key === " " || e.key === "ArrowUp") && G.running && !G.paused) { startDive(G.you); e.preventDefault(); }
    if ((e.key === "p" || e.key === "P" || e.key === "Escape") && G.running) setPaused(!G.paused);
  });
  addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
  });
  $("#diveBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); if (G.running && !G.paused) startDive(G.you); });

  // ---------- effects ----------
  function pop(text, x, y, color = "#fff", size = 18) { G.pops.push({ text, x, y, color, size, t: 0 }); }
  function burst(x, y, n, color, speed = 120, kind = "drop") {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(0.3, 1) * speed; G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: rand(0.5, 0.9), t: 0, r: rand(1.5, 3.5), color, kind, rot: rand(0, TAU) }); }
  }
  const objY = (s) => baseY - (s - G.camS);
  const onScreen = (sw) => Math.abs(sw.s - G.you.s) < 950;
  function bumpScore() { const el = $("#score"); el.textContent = G.you.score; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  function gain(sw, v, x, y, label, color = "#FFFFFF", size = 18) {
    sw.score += v;
    if (!sw.isDad) { pop(`${label ? label + " " : ""}+${v}`, x, y, color, size); bumpScore(); }
  }
  function dadSay(text, force) {
    if (!force && G.talkCd > 0) return;
    G.dadLine = { text: Array.isArray(text) ? pick(text) : text, t: 0 }; G.talkCd = 4.5;
  }

  // ---------- swimming ----------
  function startDive(sw) {
    if (!sw || sw.diveCd > 0 || sw.diveT > 0) return;
    sw.diveT = 1.1; sw.diveCd = 4.2;
    if (!sw.isDad) Snd.dive();
    if (onScreen(sw)) burst(sw.x, objY(sw.s), 10, "#FFFFFF", 110);
  }
  function dadSwim() { const gap = G.dad.s - G.you.s; return 94 - clamp(gap / 30, -20, 24); }

  function dadThink(d, dt) {
    d.thinkT -= dt; d.distractT -= dt; d.greedT -= dt;
    if (d.greedT <= 0) { d.greedy = Math.random() < 0.45; d.greedT = rand(3, 7); }
    if (d.thinkT > 0) return;
    d.thinkT = 0.18;
    if (d.distractT > 0) return;
    if (Math.random() < 0.03) { d.distractT = rand(0.5, 1.1); return; }   // even captains daydream
    params(d.s + 120, P1);
    const cx = centerX(d.s + 120, P1.hw), hw = P1.hw - 20;
    let best = d.target, bestCost = Infinity;
    for (let k = 0; k <= 10; k++) {
      const x = cx - hw + (2 * hw * k) / 10;
      let cost = Math.abs(x - d.x) * 0.12 - (Math.abs(x - d.target) < 20 ? 8 : 0);
      for (const r of G.rafts) {
        const ahead = r.s - d.s;
        if (ahead < -30 || ahead > 300) continue;
        const w = 1 - ahead / 450;
        const pts = r.dbl ? [r.x - 26 * Math.cos(r.rot), r.x + 26 * Math.cos(r.rot)] : [r.x];
        for (const px of pts) { const dx = Math.abs(px - x); if (dx < 46) cost += (46 - dx) * 3 * w; }
        if (r.loot && d.greedy && Math.abs(r.x + r.lootSide * (r.dbl ? 60 : 33) - x) < 14) cost -= 30 * w;
      }
      eachObj(d.s - 20, d.s + 320, (o) => {
        const dx = Math.abs(o.x - x);
        if (o.type === "rock" && dx < o.r + 26) cost += 120;
        else if (o.type === "whirl" && dx < o.r * 1.2) cost += 160;
        else if (o.type === "falls" && !o.hit.dad && Math.abs(posX(o.s, o.gu) - x) > o.gw / 2 - 12) cost += 80;
        else if ((o.type === "coin" || o.type === "gem" || o.type === "chest") && !o.dead && dx < 14) cost -= o.type === "chest" ? 30 : 6;
      });
      if (cost < bestCost) { bestCost = cost; best = x; }
    }
    d.target = best;
    if (d.diveCd <= 0) for (const r of G.rafts) {
      const ahead = r.s - d.s;
      if (ahead > 10 && ahead < 70 && Math.abs(r.x - d.x) < (r.dbl ? 60 : 34) && Math.random() < 0.5) { startDive(d); break; }
    }
  }

  function updateSwimmer(sw, dt) {
    sw.t += dt;
    for (const k of ["slowT", "diveT", "diveCd", "spinT", "whirlCd", "happyT", "ouchT"]) sw[k] = Math.max(0, sw[k] - dt);
    sw.boost *= 1 - 1.4 * dt;
    params(sw.s, P1);
    const full = !sw.isDad || onScreen(sw);
    if (!sw.isDad) {
      let desired = 0, active = false;
      if (input.left || input.right) { desired = (input.right - input.left) * 240; active = true; }
      else if (input.active) { desired = clamp((input.x - sw.x) * 5, -320, 320); active = true; }
      sw.vx += (active ? (desired - sw.vx) * 7 : -sw.vx * 2) * dt;
    } else if (full) {
      dadThink(sw, dt);
      sw.vx += (clamp((sw.target - sw.x) * 4.5, -250, 250) - sw.vx) * 6 * dt;
    } else {
      // far away: Dad swims on without the details
      sw.vx = (centerX(sw.s, P1.hw) - sw.x) * 2;
      if (Math.random() < dt * FAST * 0.1) sw.score += pick([5, 6, 7, 8, 10]);
      if (Math.random() < dt * FAST * 0.06) sw.slowT = 0.6;
    }
    if (full && P1.rough > 0) {
      sw.vx += P1.rough * 150 * Math.sin(G.t * 1.25 + sw.s / 230 + (sw.isDad ? 2 : 0)) * dt;
      if (Math.random() < P1.rough * dt) sw.vx += rand(-80, 80);
    }
    if (full) eachObj(sw.s - 150, sw.s + 150, (o) => {
      if (o.type !== "whirl") return;
      const dx = o.x - sw.x, dy = sw.s - o.s, d = Math.hypot(dx, dy) || 1, reach = o.r * 1.8;
      if (d > reach) return;
      const f = 1 - d / reach, pull = 300 * f, swirl = 240 * f * o.side;
      sw.vx += (dx / d * pull - dy / d * swirl) * dt;
      sw.vs -= (dy / d * pull + dx / d * swirl) * dt;
      if (d < 16 && sw.whirlCd <= 0) spinOut(sw, o);
    });
    const swim = (sw.isDad ? dadSwim() : 95) * (sw.slowT > 0 ? 0.3 : 1) * (sw.diveT > 0 ? 1.6 : 1);
    sw.vs *= 1 - 2 * dt;
    const done = sw.finishT != null ? 0.35 : 1;
    sw.s += (P1.current + (swim + sw.boost) * done + sw.vs) * FAST * dt;
    sw.x += sw.vx * dt;
    const cx = centerX(sw.s, P1.hw), lo = cx - P1.hw + SR + 6, hi = cx + P1.hw - SR - 6;
    if (sw.x < lo) { sw.x = lo; sw.vx = Math.abs(sw.vx) * 0.3; }
    if (sw.x > hi) { sw.x = hi; sw.vx = -Math.abs(sw.vx) * 0.3; }
    if (sw.spinT > 0) sw.rot += 12 * dt;
    else { const diff = ((clamp(sw.vx * 0.0018, -0.4, 0.4) - sw.rot + Math.PI) % TAU + TAU) % TAU - Math.PI; sw.rot += diff * Math.min(1, 6 * dt); }
    if (full) collideSwimmer(sw);
  }

  function spinOut(sw, o) {
    sw.whirlCd = 2.2; sw.spinT = 1.1; sw.slowT = 0.9;
    sw.vx = sw.x < o.x ? -260 : 260; sw.vs = -60;
    if (!sw.isDad) { Snd.whoosh(); G.stats.spins++; pop("Whoa! Spun out!", sw.x, objY(sw.s) - 44, "#E4DBFF", 20); }
    else dadSay("Whoooa! Arr, me head!", true);
  }

  function collideSwimmer(sw) {
    const key = sw.key, y = objY(sw.s), diving = sw.diveT > 0;
    for (const r of G.rafts) {
      if (Math.abs(r.s - sw.s) > 95) continue;
      if (r.loot) {
        const [lx, ly] = lootPos(r);
        let got = Math.hypot(lx - sw.x, ly - y) < 24, sneak = false;
        if (diving && Math.hypot(lx - sw.x, ly - y) < 34) { got = true; sneak = true; }
        if (got) plunder(sw, r, sneak, lx, ly);
      }
      if (diving) continue;
      for (const [tx, ty] of tubes(r)) {
        const dx = sw.x - tx, dy = objY(sw.s) - ty, d = Math.hypot(dx, dy) || 1, min = R + SR - 3;
        if (d >= min) continue;
        // no swimming through tubes: slide back out to the edge
        sw.x = tx + (dx / d) * min; sw.s -= (ty + (dy / d) * min) - objY(sw.s);
        if (!((r.bumpCd[key] || 0) > G.t)) bumpRaft(sw, r, dx / d, dy / d);
      }
    }
    eachObj(sw.s - 110, sw.s + 110, (o) => {
      if (o.dead) return;
      if (o.type === "falls") {
        if (!o.hit[key] && sw.s >= o.s) {
          o.hit[key] = true;
          const gx = posX(o.s, o.gu);
          if (diving || Math.abs(sw.x - gx) < o.gw / 2 - 6) { if (!sw.isDad) pop(diving ? "Dove through!" : "Through the gap!", sw.x, y - 44, "#BFF6FF", 16); }
          else {
            sw.slowT = 0.8; burst(sw.x, y - 10, 20, "#DDF8FF", 170);
            if (!sw.isDad) { Snd.splash(); G.stats.splashes++; pop("SPLASH!", sw.x, y - 46, "#BFF6FF", 24); G.shake = 0.25; }
            else dadSay("Blimey, that's cold!", true);
          }
        }
        return;
      }
      const dx = o.x - sw.x, dy = objY(o.s) - y, d = Math.hypot(dx, dy);
      if (o.type === "rock") {
        if (d < SR + o.r - 2 && !(o.hit[key] > G.t)) {
          o.hit[key] = G.t + 1; sw.slowT = 0.8; sw.vx = -dx / (d || 1) * 220; sw.vs = -40;
          burst(sw.x, y, 10, "#FFFFFF", 140);
          if (!sw.isDad) { Snd.bonk(); G.stats.bumps++; sw.ouchT = 0.8; G.shake = 0.4; pop("Bonk!", sw.x, y - 42, "#FFB4A8", 22); }
          else dadSay(DAD_LINES.bump, true);
        }
        return;
      }
      if (o.type === "coin" || o.type === "gem" || o.type === "chest") {
        if (d < SR + (o.type === "chest" ? 20 : 13)) {
          o.dead = true;
          const v = o.type === "chest" ? 20 : o.type === "gem" ? 3 : 1;
          gain(sw, v, o.x, objY(o.s) - 20, o.type === "chest" ? "Treasure chest!" : "", o.type === "chest" ? "#FFD166" : "#FFF3C4", o.type === "chest" ? 24 : 16);
          if (!sw.isDad) { G.stats.coins += v; o.type === "chest" ? Snd.treasure() : Snd.coin(); }
          else if (o.type === "chest") dadSay("A treasure chest! Arrr!", true);
          burst(o.x, objY(o.s), o.type === "coin" ? 5 : 16, o.type === "gem" ? o.hue : "#FFE27A", 110, "spark");
        }
        return;
      }
      if ((o.type === "turtle" || o.type === "ray") && !sw.isDad && !o.greeted && d < 80) {
        o.greeted = true; Snd.hi();
        gain(sw, 2, o.x, objY(o.s) - 26, o.type === "turtle" ? "Ahoy, turtle!" : "Ahoy, stingray!");
      }
    });
  }

  function plunder(sw, r, sneak, lx, ly) {
    const loot = r.loot, v = loot.v * (sneak ? 2 : 1);
    r.loot = null; r.reactT = 2.2; r.mood = "wow";
    const who = sw.isDad ? "Dad" : "pirate";
    pop(pick([`Hey! My ${loot.n}!`, `My ${loot.n}!`, `Hey, ${who}!`, "Come back here!", "Not again!"]), r.x, objY(r.s) - 42, "#FFFFFF", 13);
    burst(lx, ly, 14, "#FFE27A", 130, "spark");
    if (!sw.isDad) {
      G.stats.loot++; if (sneak) G.stats.sneaks++; sw.happyT = 1.2;
      gain(sw, v, lx, ly - 22, sneak ? "Sneak plunder!" : "Arrr!", "#FFD166", v >= 15 ? 24 : 20);
      Snd.plunder(sneak || v >= 15);
    } else { gain(sw, v); if (onScreen(sw)) dadSay(DAD_LINES.plunder); }
  }

  function bumpRaft(sw, r, nx, ny) {
    r.bumpCd[sw.key] = G.t + 1; r.reactT = 1.5; r.mood = "ouch"; r.vx -= nx * 70;
    sw.slowT = 0.6; sw.vx += nx * 170; sw.vs -= ny * 50;
    burst(sw.x - nx * SR, objY(sw.s) - ny * SR, 7, "#FFFFFF", 90);
    if (G.boingCd <= 0) { Snd.boing(); G.boingCd = 0.25; }
    if (!sw.isDad) {
      G.stats.bumps++; sw.ouchT = 0.7; G.shake = 0.15;
      pop(pick(["Watch it!", "Hey!", "Oof!", "Excuse you!", "Careful, pirate!"]), r.x, objY(r.s) - 40, "#FFFFFF", 13);
    } else if (Math.random() < 0.6) dadSay(DAD_LINES.bump);
  }

  // ---------- waves ----------
  function updateWaves(dt) {
    params(G.you.s, P0);
    const i = P0.i, zk = LAP[i][0], sl = local(G.you.s);
    if (zk === "surge" && sl < STARTS[i] + LAP[i][1] - 450) {
      G.nextWave -= dt;
      if (G.nextWave <= 0) { G.waves.push({ s: G.you.s + baseY + 60, hit: {} }); G.nextWave = rand(2.3, 3.1) / FAST; }
    }
    for (const w of G.waves) {
      w.s -= 125 * FAST * dt;
      for (const sw of [G.you, G.dad]) if (!w.hit[sw.key] && w.s <= sw.s && onScreen(sw)) {
        w.hit[sw.key] = true; sw.boost = 120;
        burst(sw.x, objY(sw.s) + 10, 10, "#FFFFFF", 120);
        if (!sw.isDad) { G.stats.waves++; Snd.wave(); pop("Wave boost!", sw.x, objY(sw.s) - 44, "#FFFFFF", 18); }
      }
    }
    G.waves = G.waves.filter((w) => w.s > G.you.s - (viewH - baseY) - 100);
  }

  // ---------- the race ----------
  function update(dt) {
    G.t += dt; G.raceT += dt * FAST;
    G.shake = Math.max(0, G.shake - dt); G.boingCd = Math.max(0, G.boingCd - dt); G.talkCd = Math.max(0, G.talkCd - dt);
    const you = G.you, dad = G.dad;
    updateSwimmer(you, dt);
    updateSwimmer(dad, dt);
    // you and Dad bump shoulders instead of overlapping
    const sx = dad.x - you.x, sy = you.s - dad.s, sd = Math.hypot(sx, sy) || 1;
    if (sd < SR * 2 + 4) { const push = (SR * 2 + 4 - sd) / 2, nx = sx / sd; you.x -= nx * push; dad.x += nx * push; you.vx -= nx * 30; dad.vx += nx * 30; }
    G.camS = you.s;
    spawnAhead(); updateRafts(dt); updateWaves(dt);

    // laps and zones
    const lap = lapOf(you.s);
    params(you.s, P0);
    const zk = LAP[P0.i][0], key = lap + ":" + P0.i;
    if (key !== G.zoneKey && you.s < RACE_LEN) {
      const newLap = lap !== G.lap;
      G.zoneKey = key; G.lap = lap;
      if (newLap) { showBanner(`Lap ${lap + 1} of ${LAPS}`, lap === LAPS - 1 ? "Last lap! Give it everything!" : "Round the river again!", ""); Snd.bell(); dadSay(lap === LAPS - 1 ? "Last lap, matey! Swim for it!" : DAD_LINES.lap, true); }
      else if (G.t > 1) { showBanner(ZONES[zk].name, ZONES[zk].sub, zk === "rough" || zk === "grotto" ? zk : ""); Snd.zone(zk === "rough"); if (DAD_LINES[zk]) dadSay(DAD_LINES[zk], true); }
      enterZone(zk);
      $("#lapChip").textContent = `Lap ${lap + 1}/${LAPS}`;
    }

    // who's winning?
    const gap = dad.s - you.s;
    const lead = gap > 25 ? 1 : gap < -25 ? -1 : G.lead;
    if (lead !== G.lead) { if (G.lead !== 0 && you.finishT == null && dad.finishT == null) dadSay(lead > 0 ? DAD_LINES.passing : DAD_LINES.passed, true); G.lead = lead; }
    G.idleTalk -= dt;
    if (G.idleTalk <= 0) { dadSay(DAD_LINES.idle); G.idleTalk = rand(14, 24); }
    if (G.dadLine) { G.dadLine.t += dt; if (G.dadLine.t > 3.2) G.dadLine = null; }

    // finish line
    if (dad.finishT == null && dad.s >= RACE_LEN) {
      dad.finishT = G.raceT;
      if (you.finishT == null) { showBanner("Dad finished!", "Keep swimming, you're almost there!", ""); dadSay("Arr! Beat ye! Now finish, matey!", true); }
    }
    if (you.finishT == null && you.s >= RACE_LEN) {
      you.finishT = G.raceT; G.ending = true; G.endT = 0;
      const won = dad.finishT == null;
      if (won) { Snd.win(); showBanner("You win!", "You beat Dad to the finish!", ""); dadSay("Shiver me timbers! Ye beat me!", true); }
      else { Snd.lose(); showBanner("Finished!", "Dad got there first this time.", ""); }
      burst(you.x, objY(you.s) - 20, 50, "#FFD166", 240, "confetti"); burst(you.x, objY(you.s) - 20, 30, "#FF6B5B", 220, "confetti");
    }
    if (G.ending) { G.endT += dt; if (G.endT > 3) return endRace(); }

    updateFx(dt);
    updateHud();
  }

  function updateHud() {
    const you = G.you, dad = G.dad;
    $("#youDot").style.left = (clamp(you.s / RACE_LEN, 0, 1) * 100).toFixed(2) + "%";
    $("#dadDot").style.left = (clamp(dad.s / RACE_LEN, 0, 1) * 100).toFixed(2) + "%";
    const gap = dad.s - you.s;
    const chip = $("#raceChip"), first = gap <= 0;
    const html = `<b>${first ? "1st" : "2nd"}</b>&nbsp;place`;
    if (chip.innerHTML !== html) { chip.innerHTML = html; chip.classList.toggle("first", first); }
    const ready = 1 - you.diveCd / 4.2;
    $("#diveRing").style.setProperty("--ready", ready.toFixed(3));
    $("#diveBtn").classList.toggle("cooling", ready < 1);
  }

  function updateFx(dt) {
    for (const q of G.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.kind === "confetti" ? 120 : 260) * dt; q.rot += dt * 6; }
    G.parts = G.parts.filter((q) => q.t < q.life);
    for (const q of G.pops) { q.t += dt; q.y -= 38 * dt; }
    G.pops = G.pops.filter((q) => q.t < 1.3);
  }

  // ---------- banners ----------
  let bannerTimer = 0;
  function showBanner(title, sub, cls) {
    const b = $("#banner");
    $("#bannerTitle").textContent = title; $("#bannerSub").textContent = sub;
    b.className = "banner show " + (cls || "");
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove("show"), 2000);
  }
  function enterZone(k) {
    const chip = $("#zoneChip"); chip.textContent = ZONES[k].name; chip.className = "zone-tag " + (k === "rough" || k === "grotto" ? k : "");
    Snd.setMode(k);
    if (k === "surge") G.nextWave = 1.2 / FAST;
  }

  // ---------- drawing: characters ----------
  function ring(c, r0, r1, a0, a1) { c.beginPath(); c.arc(0, 0, r1, a0, a1); c.arc(0, 0, r0, a1, a0, true); c.closePath(); }
  function drawRider(c, x, y, rd, st) {
    const lift = st.lift || 0, t = st.t || 0, sc = (st.scale || 1) * (1 + 0.22 * lift);
    c.save(); c.translate(x, y);
    // shadow on the water
    if (!st.noShadow) { c.fillStyle = "rgba(0,40,70,.25)"; c.beginPath(); c.ellipse(5 + 12 * lift, 8 + 16 * lift, 27 * sc, 22 * sc, 0, 0, TAU); c.fill(); }
    c.scale(sc, sc); c.rotate(st.rot || 0);
    // tube
    ring(c, 13, 25, 0, TAU); c.fillStyle = rd.tube; c.fill();
    c.fillStyle = rd.stripe; for (let k = 0; k < 8; k += 2) { ring(c, 13, 25, (k / 8) * TAU + 0.2, ((k + 1) / 8) * TAU + 0.2); c.fill(); }
    c.lineWidth = 1.2; c.strokeStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.stroke();
    c.fillStyle = "rgba(0,50,80,.35)"; c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill();
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, 20.5, -2.6, -1.5); c.stroke();
    // legs dangling over the front of the tube
    const kick = Math.sin(t * 2.4) * 1.4;
    c.strokeStyle = rd.skin; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-4, 5); c.lineTo(-6.5 - kick, 23); c.moveTo(4, 5); c.lineTo(6.5 - kick, 23); c.stroke();
    if (rd.trunks) { c.strokeStyle = rd.suit2; c.lineWidth = 7.5; c.lineCap = "butt"; c.beginPath(); c.moveTo(-4, 4); c.lineTo(-4.8, 11); c.moveTo(4, 4); c.lineTo(4.8, 11); c.stroke(); c.lineCap = "round"; }
    c.fillStyle = shade(rd.skin, -18); c.beginPath(); c.ellipse(-6.8 - kick, 25.5, 3.4, 2.6, 0, 0, TAU); c.ellipse(6.8 - kick, 25.5, 3.4, 2.6, 0, 0, TAU); c.fill();
    // body
    c.fillStyle = rd.suit; c.beginPath(); c.ellipse(0, -1, 9.5, 10, 0, 0, TAU); c.fill();
    c.fillStyle = rd.suit2; c.fillRect(-9, -1.5, 18, 2.6);
    // arms resting on the tube
    c.strokeStyle = rd.skin; c.lineWidth = 4.8;
    c.beginPath(); c.moveTo(-7.5, -5); c.quadraticCurveTo(-17, -6, -20.5, 1); c.moveTo(7.5, -5); c.quadraticCurveTo(17, -6, 20.5, 1); c.stroke();
    c.fillStyle = rd.skin; c.beginPath(); c.arc(-20.8, 2.5, 2.9, 0, TAU); c.arc(20.8, 2.5, 2.9, 0, TAU); c.fill();
    // head
    if (rd.style === "pigtails") {
      c.fillStyle = rd.hair; c.beginPath(); c.arc(-12.5, -11, 4.8, 0, TAU); c.arc(12.5, -11, 4.8, 0, TAU); c.fill();
      c.fillStyle = "#FDE047"; c.beginPath(); c.arc(-9.6, -12.6, 1.8, 0, TAU); c.arc(9.6, -12.6, 1.8, 0, TAU); c.fill();
    }
    c.fillStyle = rd.skin; c.beginPath(); c.arc(0, -14, 9.6, 0, TAU); c.fill();
    drawHair(c, rd);
    drawFace(c, st.mood || "happy", t, st.wet);
    c.restore();
  }
  function drawHair(c, rd) {
    if (rd.style === "bald") { c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(-3, -18, 2.4, 0, TAU); c.fill(); return; }
    c.fillStyle = rd.hair;
    if (rd.style === "short") {
      c.beginPath(); c.arc(0, -14, 10.2, Math.PI * 0.95, Math.PI * 2.05);
      c.quadraticCurveTo(4, -20.5, -1, -18.6); c.quadraticCurveTo(-6, -19.8, -10.1, -12.6); c.closePath(); c.fill();
    } else if (rd.style === "curly") {
      c.beginPath(); c.arc(0, -14, 10, Math.PI * 0.95, Math.PI * 2.05); c.quadraticCurveTo(0, -21, -10, -12.4); c.closePath(); c.fill();
      c.beginPath();
      for (let a = Math.PI * 0.92; a <= Math.PI * 2.09; a += 0.3) c.arc(Math.cos(a) * 10, -14 + Math.sin(a) * 10, 3.4, 0, TAU);
      c.arc(-4, -21, 3.5, 0, TAU); c.arc(3, -21.5, 3.5, 0, TAU); c.fill();
    } else {
      c.beginPath(); c.arc(0, -14, 10.2, Math.PI * 0.85, Math.PI * 2.15);
      c.quadraticCurveTo(6, -17, 0, -17.8); c.quadraticCurveTo(-6, -17, -9.6, -10.5); c.closePath(); c.fill();
      // hibiscus clip
      c.fillStyle = "#FF5E7E"; c.beginPath();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.moveTo(6.5, -21); c.arc(6.5 + Math.cos(a) * 2.2, -21 + Math.sin(a) * 2.2, 1.9, 0, TAU); }
      c.fill(); c.fillStyle = "#FFE066"; c.beginPath(); c.arc(6.5, -21, 1, 0, TAU); c.fill();
    }
  }
  function drawFace(c, mood, t, wet) {
    const ink = "#2A1A12";
    c.fillStyle = "rgba(255,120,120,.35)"; c.beginPath(); c.arc(-6, -11.2, 2, 0, TAU); c.arc(6, -11.2, 2, 0, TAU); c.fill();
    c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1.3; c.lineCap = "round";
    const blink = (t + 1.3) % 3.7 < 0.12;
    if (mood === "chill") {
      // sunglasses
      c.fillStyle = "#1B2430"; c.beginPath(); c.ellipse(-3.9, -14.6, 3.3, 2.5, 0, 0, TAU); c.ellipse(3.9, -14.6, 3.3, 2.5, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-1, -15); c.lineTo(1, -15); c.stroke();
      c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(-4.8, -15.4, 0.9, 0, TAU); c.arc(3, -15.4, 0.9, 0, TAU); c.fill();
    } else if (mood === "ouch") {
      for (const ex of [-3.8, 3.8]) { c.beginPath(); c.moveTo(ex - 1.5, -16); c.lineTo(ex + 1.5, -13.2); c.moveTo(ex + 1.5, -16); c.lineTo(ex - 1.5, -13.2); c.stroke(); }
    } else if (mood === "dizzy") {
      for (const ex of [-3.8, 3.8]) { c.beginPath(); c.arc(ex, -14.6, 1.8, t * 12, t * 12 + 4.8); c.stroke(); }
    } else if (mood === "wet") {
      c.beginPath(); c.moveTo(-5.3, -15.6); c.lineTo(-2.8, -14.5); c.lineTo(-5.3, -13.4); c.moveTo(5.3, -15.6); c.lineTo(2.8, -14.5); c.lineTo(5.3, -13.4); c.stroke();
    } else if (blink) {
      c.beginPath(); c.moveTo(-5, -14.5); c.lineTo(-2.6, -14.5); c.moveTo(2.6, -14.5); c.lineTo(5, -14.5); c.stroke();
    } else {
      c.beginPath(); c.arc(-3.8, -14.6, mood === "wow" ? 1.9 : 1.45, 0, TAU); c.arc(3.8, -14.6, mood === "wow" ? 1.9 : 1.45, 0, TAU); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(-3.3, -15.1, 0.5, 0, TAU); c.arc(4.3, -15.1, 0.5, 0, TAU); c.fill();
    }
    c.fillStyle = "#7A2630";
    if (mood === "wow" || mood === "dizzy") { c.beginPath(); c.ellipse(0, -9.4, 2.2, 2.6, 0, 0, TAU); c.fill(); }
    else if (mood === "ouch") { c.beginPath(); c.moveTo(-3, -9.5); c.lineTo(-1.5, -10.5); c.lineTo(0, -9.5); c.lineTo(1.5, -10.5); c.lineTo(3, -9.5); c.stroke(); }
    else if (mood === "wheee" || mood === "wet") { c.beginPath(); c.moveTo(-3.8, -10.8); c.quadraticCurveTo(0, -5.2, 3.8, -10.8); c.closePath(); c.fill(); }
    else { c.beginPath(); c.arc(0, -11, 3.2, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    if (wet > 0) {
      c.fillStyle = "rgba(170,230,255,.9)";
      for (let k = 0; k < 3; k++) { const dy = ((t * 30 + k * 7) % 14); c.beginPath(); c.ellipse(-9 + k * 9, -22 + dy, 1.3, 2, 0, 0, TAU); c.fill(); }
    }
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    return rgb(clamp((n >> 16) + amt, 0, 255), clamp(((n >> 8) & 255) + amt, 0, 255), clamp((n & 255) + amt, 0, 255));
  }

  // ---------- drawing: world ----------
  const SAND = [244, 226, 188], ROCKC = [58, 66, 74], COPE = [255, 249, 236], COPE_D = [92, 98, 108];

  const ROWS = [];
  function drawBase(c) {
    const step = 4, cam = G.camS;
    // pass 1: work out every row; pass 2: banks; pass 3: water, so rows never paint over their neighbours
    let n = 0;
    for (let y = -step; y < viewH + step; y += step, n++) {
      const s = cam + (baseY - y);
      params(s, P1);
      const row = ROWS[n] || (ROWS[n] = {});
      row.y = y; row.s = s; row.L = centerX(s, P1.hw) - P1.hw; row.Rr = row.L + 2 * P1.hw;
      row.g = clamp(P1.dark, 0, 1); row.rough = P1.rough; row.r = P1.r; row.gg = P1.g; row.b = P1.b;
    }
    for (let k = 0; k < n; k++) {
      const w = ROWS[k], g = w.g;
      c.fillStyle = rgb(lerp(SAND[0], ROCKC[0], g), lerp(SAND[1], ROCKC[1], g), lerp(SAND[2], ROCKC[2], g));
      c.fillRect(0, w.y, W, step + 0.6);
    }
    for (let k = 0; k < n; k++) {
      const w = ROWS[k], g = w.g;
      c.fillStyle = rgb(w.r, w.gg, w.b); c.fillRect(w.L, w.y, w.Rr - w.L, step + 0.6);
      c.fillStyle = rgb(lerp(COPE[0], COPE_D[0], g), lerp(COPE[1], COPE_D[1], g), lerp(COPE[2], COPE_D[2], g));
      c.fillRect(w.L - 9, w.y, 9, step + 0.6); c.fillRect(w.Rr, w.y, 9, step + 0.6);
    }
    // soft shade along the walls, as one smooth shape per side
    for (const [a, b] of [[0, 14], [-14, 0]]) {
      c.beginPath();
      for (let k = 0; k < n; k++) { const w = ROWS[k], x = (b ? w.L : w.Rr) + a; k ? c.lineTo(x, w.y) : c.moveTo(x, w.y); }
      for (let k = n - 1; k >= 0; k--) { const w = ROWS[k], x = (b ? w.L : w.Rr) + b; c.lineTo(x, w.y); }
      c.fillStyle = "rgba(0,50,80,.13)"; c.fill();
    }
    for (let k = 0; k < n; k++) {
      const w = ROWS[k];
      if (w.rough > 0.3 && ((w.s / step) | 0) % 3 === 0) {
        c.fillStyle = `rgba(255,255,255,${0.55 * w.rough})`;
        const r = 2 + 2 * Math.sin(w.s * 0.3 + G.t * 8);
        c.beginPath(); c.arc(w.L + 3, w.y, r, 0, TAU); c.arc(w.Rr - 3, w.y, r, 0, TAU); c.fill();
      }
    }
    // sand speckles (they scroll past, so you can feel the speed)
    const sTop = cam + baseY + 20, sBot = cam - (viewH - baseY) - 20;
    c.fillStyle = "rgba(150,110,60,.22)";
    for (let k = Math.floor(sBot / 18); k * 18 < sTop; k++) {
      const s = k * 18; const q = riverAt(s); const y = baseY - (s - cam);
      for (let j = 0; j < 4; j++) {
        const x = hash(k * 13 + j) * W;
        if (x > q.cx - q.hw - 12 && x < q.cx + q.hw + 12) continue;
        c.fillRect(x, y + hash(k + j * 5) * 18, 2, 2);
      }
    }
  }

  function drawWater(c) {
    const cam = G.camS, sTop = cam + baseY + 30, sBot = cam - (viewH - baseY) - 30;
    c.lineCap = "round";
    for (let k = Math.floor(sBot / 34); k * 34 < sTop; k++) {
      const s0 = k * 34; params(s0, P1);
      const cx = centerX(s0, P1.hw), n = 3 + Math.round(P1.rough * 5);
      for (let j = 0; j < n; j++) {
        const s = s0 + hash(k * 3 + j) * 30, x = cx + (hash(k * 31 + j * 7.3) * 2 - 1) * (P1.hw - 16), y = baseY - (s - cam);
        const wob = Math.sin(G.t * 2 + k + j) * 1.5;
        if (P1.rough > 0.4 && j % 2 === 0) {
          c.strokeStyle = `rgba(255,255,255,${0.35 + 0.35 * P1.rough})`; c.lineWidth = 2.2;
          c.beginPath(); c.moveTo(x - 9, y + 5 + wob); c.lineTo(x, y - 3); c.lineTo(x + 9, y + 5 - wob); c.stroke();
          c.fillStyle = `rgba(255,255,255,${0.3 * P1.rough})`; c.beginPath(); c.arc(x + 12, y + 8, 3 + wob, 0, TAU); c.arc(x - 13, y + 9, 2.5 - wob * 0.5, 0, TAU); c.fill();
        } else {
          c.strokeStyle = `rgba(255,255,255,${0.26 + 0.1 * P1.rough})`; c.lineWidth = 1.8;
          c.beginPath(); c.moveTo(x - 8, y); c.quadraticCurveTo(x, y + 4 + wob, x + 8, y); c.stroke();
        }
      }
      // sun glints
      if (P1.dark < 0.5) {
        const gx = cx + (hash(k * 17) * 2 - 1) * (P1.hw - 20), gy = baseY - (s0 + 12 - cam);
        const a = Math.pow(Math.max(0, Math.sin(G.t * 2.5 + k * 1.7)), 10);
        if (a > 0.05) { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.moveTo(gx, gy - 5); c.lineTo(gx + 1.2, gy - 1.2); c.lineTo(gx + 5, gy); c.lineTo(gx + 1.2, gy + 1.2); c.lineTo(gx, gy + 5); c.lineTo(gx - 1.2, gy + 1.2); c.lineTo(gx - 5, gy); c.lineTo(gx - 1.2, gy - 1.2); c.fill(); }
      }
    }
  }

  const inView = (s, m = 80) => s < G.camS + baseY + m && s > G.camS - (viewH - baseY) - m;

  function drawCreatures(c) {
    for (const o of G.objs) {
      if (!inView(o.s) || (o.type !== "turtle" && o.type !== "ray" && o.type !== "fish")) continue;
      const y = objY(o.s), t = G.t + o.seed;
      c.save(); c.translate(o.x, y); c.globalAlpha = 0.72;
      if (o.type === "turtle") {
        const f = Math.sin(t * 3) * 0.5;
        c.fillStyle = "#6FAE5E";
        for (const [fx, fy, a] of [[-11, -7, -0.6 - f], [11, -7, 0.6 + f], [-9, 9, -2.4 + f], [9, 9, 2.4 - f]]) { c.save(); c.translate(fx, fy); c.rotate(a); c.beginPath(); c.ellipse(0, -4, 3.2, 7, 0, 0, TAU); c.fill(); c.restore(); }
        c.beginPath(); c.ellipse(0, -15, 4.5, 5, 0, 0, TAU); c.fill();
        c.fillStyle = "#3F7A45"; c.beginPath(); c.ellipse(0, 0, 11, 13.5, 0, 0, TAU); c.fill();
        c.strokeStyle = "#2C5A33"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5, -7); c.lineTo(5, -7); c.lineTo(7, 1); c.lineTo(0, 7); c.lineTo(-7, 1); c.closePath(); c.stroke();
        c.fillStyle = "#1B2B20"; c.beginPath(); c.arc(-2, -17, 0.9, 0, TAU); c.arc(2, -17, 0.9, 0, TAU); c.fill();
        if (o.greeted) { c.globalAlpha = 1; c.fillStyle = "#FF6B8A"; heart(c, 0, -28, 4 + Math.sin(t * 6)); }
      } else if (o.type === "ray") {
        const f = Math.sin(t * 2.5) * 4;
        c.fillStyle = "#6E6A7A";
        c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(14, -12, 22, -2 + f); c.quadraticCurveTo(12, 6, 0, 10); c.quadraticCurveTo(-12, 6, -22, -2 + f); c.quadraticCurveTo(-14, -12, 0, -16); c.fill();
        c.strokeStyle = "#6E6A7A"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(Math.sin(t * 3) * 4, 20, 0, 30); c.stroke();
        c.fillStyle = "#1B1B25"; c.beginPath(); c.arc(-3, -9, 1, 0, TAU); c.arc(3, -9, 1, 0, TAU); c.fill();
        if (o.greeted) { c.globalAlpha = 1; c.fillStyle = "#FF6B8A"; heart(c, 0, -26, 4 + Math.sin(t * 6)); }
      } else {
        for (let k = 0; k < 7; k++) {
          const fx = Math.sin(k * 2.1) * 16 + Math.sin(t * 2 + k) * 3, fy = Math.cos(k * 1.3) * 14;
          c.fillStyle = k % 3 ? "#FFA43B" : "#FFE066";
          c.beginPath(); c.ellipse(fx, fy, 2.4, 4.5, 0, 0, TAU); c.moveTo(fx, fy + 3.5); c.lineTo(fx - 2.6, fy + 8); c.lineTo(fx + 2.6, fy + 8); c.fill();
        }
      }
      c.restore();
    }
  }
  function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.4); c.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); c.fill(); }


  function drawDecor(c) {
    for (const [d, ds] of visibleDecor(90)) {
      const y = objY(ds), x = d.x;
      c.save(); c.translate(x, y);
      switch (d.type) {
        case "palm": {
          c.fillStyle = "rgba(60,40,10,.18)"; c.beginPath(); c.ellipse(10, 10, 30, 26, 0, 0, TAU); c.fill();
          for (let k = 0; k < 8; k++) {
            const a = d.rot + (k / 8) * TAU + Math.sin(G.t * 0.8 + k + d.seed) * 0.04;
            c.save(); c.rotate(a);
            c.fillStyle = k % 2 ? "#2F9E4F" : "#3DB35C";
            c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -9, 34, -2); c.quadraticCurveTo(16, 5, 0, 0); c.fill();
            c.strokeStyle = "rgba(20,80,40,.5)"; c.lineWidth = 1; c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(15, -3, 32, -2); c.stroke();
            c.restore();
          }
          c.fillStyle = "#7A5230"; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill();
          c.fillStyle = "#5B3A1E"; c.beginPath(); c.arc(-3, 2, 2.6, 0, TAU); c.arc(3, 2, 2.6, 0, TAU); c.arc(0, -3, 2.6, 0, TAU); c.fill();
          break;
        }
        case "umbrella": {
          c.fillStyle = "rgba(60,40,10,.18)"; c.beginPath(); c.arc(8, 8, 21, 0, TAU); c.fill();
          for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? "#FFFFFF" : d.c; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 20, d.rot + (k / 8) * TAU, d.rot + ((k + 1) / 8) * TAU); c.closePath(); c.fill(); }
          c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.stroke();
          c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, 2.5, 0, TAU); c.fill();
          break;
        }
        case "lounger": {
          c.rotate(Math.sin(d.seed) * 0.25);
          c.fillStyle = "rgba(60,40,10,.15)"; c.fillRect(-5, -14, 20, 38);
          c.fillStyle = "#FFFFFF"; roundRect(c, -8, -18, 16, 36, 4); c.fill();
          c.fillStyle = d.c; roundRect(c, -6.5, -4, 13, 18, 2); c.fill();
          c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(-6.5, 2, 13, 2.2);
          c.fillStyle = "#EDE6D8"; roundRect(c, -6.5, -16, 13, 9, 3); c.fill();
          break;
        }
        case "flowers": {
          c.fillStyle = "#3E9B55"; c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + d.rot; c.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 7, 4, a, 0, TAU); } c.fill();
          for (let k = 0; k < 3; k++) {
            const fx = Math.cos(d.rot + k * 2.1) * 6, fy = Math.sin(d.rot + k * 2.1) * 6;
            c.fillStyle = k === 1 ? "#FFB547" : "#FF4F7B"; c.beginPath();
            for (let m = 0; m < 5; m++) { const a = (m / 5) * TAU; c.moveTo(fx, fy); c.arc(fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2, 2.8, 0, TAU); }
            c.fill(); c.fillStyle = "#FFF1A8"; c.beginPath(); c.arc(fx, fy, 1.2, 0, TAU); c.fill();
          }
          break;
        }
        case "bush": {
          c.fillStyle = "rgba(60,40,10,.15)"; c.beginPath(); c.arc(6, 6, 16, 0, TAU); c.fill();
          c.fillStyle = "#2E8E4C"; c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + d.rot; c.arc(Math.cos(a) * 8, Math.sin(a) * 8, 8, 0, TAU); } c.fill();
          c.fillStyle = "#44AE62"; c.beginPath(); c.arc(-3, -3, 7, 0, TAU); c.fill();
          break;
        }
        case "stal": {
          c.fillStyle = "#2A3038"; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
          c.fillStyle = "#4B535E"; c.beginPath(); c.arc(-2, -2, 9, 0, TAU); c.fill();
          c.fillStyle = "#6A7380"; c.beginPath(); c.arc(-3, -3, 4, 0, TAU); c.fill();
          break;
        }
        case "crystal": {
          for (let k = 0; k < 4; k++) {
            c.save(); c.rotate(d.rot + k * 0.7);
            c.fillStyle = k % 2 ? "#7CF3FF" : "#B69CFF";
            c.beginPath(); c.moveTo(0, 0); c.lineTo(4, -6); c.lineTo(0, -20 - k * 2); c.lineTo(-4, -6); c.closePath(); c.fill();
            c.restore();
          }
          break;
        }
        case "lantern": {
          c.fillStyle = "#4A3A2A"; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
          c.fillStyle = "#FFD27A"; c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.fill();
          break;
        }
      }
      c.restore();
    }
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }


  function drawDark(c) {
    const cam = G.camS, step = 8;
    let any = false;
    for (let y = -step; y < viewH + step; y += step) {
      params(cam + (baseY - y), P1);
      if (P1.dark < 0.02) continue;
      any = true; c.fillStyle = `rgba(4,14,26,${0.5 * P1.dark})`; c.fillRect(0, y, W, step + 0.5);
    }
    if (!any) return;
    c.save(); c.globalCompositeOperation = "lighter";
    for (const [d, ds] of visibleDecor(90)) {
      if (d.type !== "crystal" && d.type !== "lantern") continue;
      const y = objY(ds), r = d.type === "lantern" ? 46 : 36, fl = 0.85 + 0.15 * Math.sin(G.t * 5 + d.seed);
      const gr = c.createRadialGradient(d.x, y, 0, d.x, y, r);
      gr.addColorStop(0, d.type === "lantern" ? `rgba(255,190,90,${0.45 * fl})` : `rgba(120,220,255,${0.35 * fl})`); gr.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(d.x, y, r, 0, TAU); c.fill();
    }
    c.restore();
  }

  function drawWhirls(c) {
    for (const o of G.objs) {
      if (o.type !== "whirl" || !inView(o.s, 120)) continue;
      const y = objY(o.s), r = o.r;
      c.save(); c.translate(o.x, y);
      const gr = c.createRadialGradient(0, 0, 2, 0, 0, r * 1.2);
      gr.addColorStop(0, "rgba(10,40,90,.85)"); gr.addColorStop(0.35, "rgba(30,90,150,.5)"); gr.addColorStop(1, "rgba(60,160,210,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r * 1.2, 0, TAU); c.fill();
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2.6; c.lineCap = "round";
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        for (let a = 0; a <= 2.3 * Math.PI; a += 0.15) {
          const rr = r * (1.05 - a / (2.5 * Math.PI)), ang = a + (k * Math.PI) / 2 - G.t * 2.6 * (o.side || 1);
          const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr * 0.92;
          a === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.stroke();
      }
      c.restore();
    }
  }

  function drawWaves(c) {
    for (const w of G.waves) {
      if (!inView(w.s, 60)) continue;
      const y = objY(w.s), q = riverAt(w.s), L = q.cx - q.hw, Rr = q.cx + q.hw;
      const gr = c.createLinearGradient(0, y - 34, 0, y + 6);
      gr.addColorStop(0, "rgba(10,80,140,0)"); gr.addColorStop(0.7, "rgba(10,80,140,.4)"); gr.addColorStop(0.9, "rgba(120,220,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,.35)");
      c.fillStyle = gr; c.fillRect(L, y - 44, Rr - L, 50);
      c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath();
      for (let x = L + 6; x < Rr; x += 12) c.arc(x, y + 2 + Math.sin(x * 0.2 + G.t * 6) * 2, 5.5, 0, TAU);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath();
      for (let x = L + 12; x < Rr; x += 18) c.arc(x, y + 9, 3, 0, TAU);
      c.fill();
    }
  }

  function drawOverheads(c) {
    for (const o of G.objs) {
      if (o.type !== "falls" || !inView(o.s, 60)) continue;
      const y = objY(o.s), q = riverAt(o.s), L = q.cx - q.hw - 10, Rr = q.cx + q.hw + 10, gx = posX(o.s, o.gu), g0 = gx - o.gw / 2, g1 = gx + o.gw / 2;
      // light shining through the gap
      c.fillStyle = "rgba(255,240,180,.18)"; c.beginPath(); c.moveTo(g0, y - 16); c.lineTo(g1, y - 16); c.lineTo(g1 + 10, y + 60); c.lineTo(g0 - 10, y + 60); c.closePath(); c.fill();
      for (const [a, b] of [[L, g0], [g1, Rr]]) {
        if (b - a < 2) continue;
        c.fillStyle = "rgba(220,245,255,.8)"; c.fillRect(a, y - 16, b - a, 26);
        c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 1.6;
        c.beginPath();
        for (let x = a + 3; x < b - 1; x += 5) { const off = ((G.t * 90 + x * 7) % 26); c.moveTo(x, y - 16 + off * 0.4); c.lineTo(x, y - 16 + off); }
        c.stroke();
        c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath();
        for (let x = a + 4; x < b; x += 9) c.arc(x, y + 11 + Math.sin(x + G.t * 9) * 1.5, 4.5, 0, TAU);
        c.fill();
      }
      c.fillStyle = "#3A424C"; c.fillRect(L - 20, y - 26, Rr - L + 40, 11);
      c.fillStyle = "#56606C"; c.fillRect(L - 20, y - 26, Rr - L + 40, 4);
      // arrow over the gap
      c.fillStyle = "rgba(255,230,140,.95)"; c.beginPath(); c.moveTo(gx, y - 34); c.lineTo(gx - 7, y - 44); c.lineTo(gx + 7, y - 44); c.closePath(); c.fill();
    }
    for (const o of G.over) {
      if (!inView(o.s, 80)) continue;
      const y = objY(o.s);
      if (o.type === "bridge") {
        const q = riverAt(o.s), L = q.cx - q.hw - 36, Rr = q.cx + q.hw + 36;
        c.fillStyle = "rgba(0,40,70,.22)"; c.fillRect(L + 10, y - 14, Rr - L, 44);
        c.fillStyle = "#EFE3CC"; c.fillRect(L, y - 24, Rr - L, 44);
        c.strokeStyle = "rgba(150,120,80,.25)"; c.lineWidth = 1; c.beginPath();
        for (let x = L + 12; x < Rr; x += 12) { c.moveTo(x, y - 20); c.lineTo(x, y + 16); } c.stroke();
        c.fillStyle = "#B98C5A"; c.fillRect(L, y - 27, Rr - L, 5); c.fillRect(L, y + 18, Rr - L, 5);
        for (const h of o.heads) {
          const hx = q.cx + h.u * q.hw, wave = Math.sin(G.t * 6 + h.p) * 0.5;
          c.fillStyle = h.c; c.beginPath(); c.ellipse(hx, y - 2, 7, 5, 0, 0, TAU); c.fill();
          c.strokeStyle = h.skin; c.lineWidth = 2.4; c.beginPath(); c.moveTo(hx + 5, y - 4); c.lineTo(hx + 9 + wave * 3, y + 6); c.stroke();
          c.fillStyle = h.skin; c.beginPath(); c.arc(hx, y - 3, 4.2, 0, TAU); c.fill();
        }
      } else if (o.type === "cave") {
        c.fillStyle = "#2B3139"; c.beginPath(); c.moveTo(0, y - 36);
        for (let x = 0; x <= W; x += 16) c.lineTo(x, y - 36 + hash(x + o.s) * 10);
        for (let x = W; x >= 0; x -= 16) c.lineTo(x, y + 26 + hash(x * 3 + o.s) * 14);
        c.closePath(); c.fill();
        c.fillStyle = "#3F4852"; c.fillRect(0, y - 20, W, 8);
        c.fillStyle = "#3E8F4E"; for (let x = 8; x < W; x += 26) { c.beginPath(); c.arc(x, y - 34 + hash(x) * 6, 5 + hash(x * 7) * 4, 0, TAU); c.fill(); }
        c.fillStyle = "#FFE7A8"; c.font = "800 13px 'Baloo 2', system-ui, sans-serif"; c.textAlign = "center";
        c.fillText(o.exit ? "BACK INTO THE SUN" : "WATERFALL GROTTO", 200, y + 2);
      } else if (o.type === "lapline") {
        const q = riverAt(o.s), L = q.cx - q.hw - 14, Rr = q.cx + q.hw + 14, last = o.n > LAPS;
        c.fillStyle = "#7A5230"; c.fillRect(L - 4, y - 10, 8, 20); c.fillRect(Rr - 4, y - 10, 8, 20);
        const n = Math.floor((Rr - L) / 10);
        for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) { c.fillStyle = (k + j) % 2 ? (last ? "#123049" : "#FF6B5B") : "#FFFFFF"; c.fillRect(L + k * 10, y - 8 + j * 8, 10, 8); }
        const label = o.n === 1 ? "START" : last ? "FINISH" : `LAP ${o.n}`;
        c.fillStyle = last ? "#123049" : "#FF6B5B"; roundRect(c, 200 - 50, y - 32, 100, 22, 8); c.fill();
        c.fillStyle = "#fff"; c.font = "800 14px 'Baloo 2', system-ui, sans-serif"; c.textAlign = "center"; c.fillText(label, 200, y - 16);
      }
    }
  }

  function drawFx(c) {
    for (const q of G.parts) {
      const a = 1 - q.t / q.life;
      c.globalAlpha = a;
      if (q.kind === "shell") { c.fillStyle = q.color; c.beginPath(); c.moveTo(q.x, q.y + 4); c.arc(q.x, q.y + 4, 7, -Math.PI * 0.85, -Math.PI * 0.15); c.fill(); }
      else if (q.kind === "confetti") { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.color; c.fillRect(-3, -1.5, 6, 3); c.restore(); }
      else if (q.kind === "spark") { sparkleC(c, q.x, q.y, q.r * 0.8, q.color); }
      else { c.fillStyle = q.color; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    c.textAlign = "center";
    for (const q of G.pops) {
      const a = q.t < 0.9 ? 1 : 1 - (q.t - 0.9) / 0.4, s = q.t < 0.12 ? 0.6 + q.t * 3.3 : 1;
      c.globalAlpha = clamp(a, 0, 1);
      c.font = `800 ${Math.round(q.size * s)}px 'Baloo 2', system-ui, sans-serif`;
      c.lineWidth = 4; c.strokeStyle = "rgba(10,48,73,.75)"; c.strokeText(q.text, clamp(q.x, 60, W - 60), q.y);
      c.fillStyle = q.color; c.fillText(q.text, clamp(q.x, 60, W - 60), q.y);
    }
    c.globalAlpha = 1;
  }
  function sparkleC(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * 0.5, y - s * 0.5); c.lineTo(x + s * 2, y); c.lineTo(x + s * 0.5, y + s * 0.5); c.lineTo(x, y + s * 2); c.lineTo(x - s * 0.5, y + s * 0.5); c.lineTo(x - s * 2, y); c.lineTo(x - s * 0.5, y - s * 0.5); c.fill(); }


  // ---------- drawing: swimmers ----------
  function drawSwimmer(c, x, y, sw, opts = {}) {
    const L = sw.look, t = sw.t, sc = (opts.scale || 1) * (L.adult ? 1.22 : 1), diving = sw.diveT > 0;
    c.save(); c.translate(x, y); c.scale(sc, sc); c.rotate(sw.rot || 0);
    if (diving) {
      c.globalAlpha = 0.4;
    } else if (!opts.still) {
      // kick splash
      c.fillStyle = "rgba(255,255,255,.75)";
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(Math.sin(t * 14 + k * 1.7) * 6, 30 + k * 5, 3.6 - k * 0.6, 0, TAU); c.fill(); }
    }
    const kick = opts.still ? 0 : Math.sin(t * 14) * 3, ph = opts.still ? 1.2 : t * 6.5;
    // legs
    c.strokeStyle = L.skin; c.lineWidth = 5.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(-4, 12); c.lineTo(-5 + kick, 28); c.moveTo(4, 12); c.lineTo(5 - kick, 28); c.stroke();
    c.strokeStyle = L.suit2; c.lineWidth = 7.5; c.lineCap = "butt";
    c.beginPath(); c.moveTo(-4, 10); c.lineTo(-4.4, 17); c.moveTo(4, 10); c.lineTo(4.4, 17); c.stroke(); c.lineCap = "round";
    // body
    c.fillStyle = L.suit; c.beginPath(); c.ellipse(0, 4, 9.5, 12.5, 0, 0, TAU); c.fill();
    if (L.stripes) {
      c.save(); c.clip(); c.fillStyle = "#F4F1EA";
      for (let k = -8; k < 18; k += 5) c.fillRect(-10, k, 20, 2.2);
      c.restore();
    }
    // arms: freestyle strokes
    for (const side of [-1, 1]) {
      const reach = Math.sin(ph + (side > 0 ? Math.PI : 0));
      const hx = side * (11 + 3 * Math.cos(ph)), hy = -6 - 18 * reach;
      c.strokeStyle = L.skin; c.lineWidth = 4.6;
      c.beginPath(); c.moveTo(side * 7.5, -4); c.quadraticCurveTo(side * 14, -2 - 8 * reach, hx, hy); c.stroke();
      c.fillStyle = L.skin; c.beginPath(); c.arc(hx, hy, 2.8, 0, TAU); c.fill();
      if (!diving && reach > 0.85 && !opts.still) { c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(hx, hy - 4, 3.5, 0, TAU); c.arc(hx + side * 4, hy - 1, 2.5, 0, TAU); c.fill(); }
    }
    // head, bandana (or Dad's captain hat) on top
    const hr = L.adult ? 9.4 : 8.8;
    c.fillStyle = L.hair;
    if (L.style === "pigtails") { c.beginPath(); c.arc(-10, -9, 4.2, 0, TAU); c.arc(10, -9, 4.2, 0, TAU); c.fill(); }
    c.fillStyle = L.skin; c.beginPath(); c.arc(0, -12, hr, 0, TAU); c.fill();
    if (L.adult) {
      c.strokeStyle = "#6B4A34"; c.lineWidth = 2.6; c.beginPath(); c.arc(0, -12, hr - 1, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke();
      drawSwimFace(c, sw, -11.6, true);
      c.fillStyle = "#6B4A34"; c.beginPath(); c.moveTo(-5, -8.4); c.quadraticCurveTo(0, -10.4, 5, -8.4); c.quadraticCurveTo(0, -7.6, -5, -8.4); c.fill();
      c.fillStyle = "#15171C"; c.beginPath(); c.moveTo(-17, -14); c.quadraticCurveTo(-8, -17, 0, -28); c.quadraticCurveTo(8, -17, 17, -14); c.quadraticCurveTo(0, -18.5, -17, -14); c.fill();
      c.strokeStyle = "#E8B84A"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-17, -14); c.quadraticCurveTo(0, -18.5, 17, -14); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -21, 2.6, 0, TAU); c.fill(); c.fillRect(-1.6, -19.2, 3.2, 1.8);
      c.fillStyle = "#15171C"; c.fillRect(-1.5, -21.8, 1.1, 1.1); c.fillRect(0.4, -21.8, 1.1, 1.1);
    } else {
      c.fillStyle = L.hair;
      if (L.style === "curly") { c.beginPath(); for (const a of [0.97, 1.08, 1.2, 1.8, 1.92, 2.03]) c.arc(Math.cos(a * Math.PI) * hr, -12 + Math.sin(a * Math.PI) * hr, 2.6, 0, TAU); c.fill(); }
      else { c.beginPath(); c.ellipse(-hr + 1.2, -12.5, 2.2, 3.6, 0, 0, TAU); c.ellipse(hr - 1.2, -12.5, 2.2, 3.6, 0, 0, TAU); c.fill(); }
      drawSwimFace(c, sw, -11.4, false);
      // pirate bandana, knot flapping off the side
      c.fillStyle = L.band; c.beginPath(); c.arc(0, -12, hr + 0.5, Math.PI * 0.97, Math.PI * 2.03); c.quadraticCurveTo(0, -12.5, -hr - 0.5, -11.8); c.fill();
      const fl = Math.sin(t * 9) * 1.5;
      c.beginPath(); c.moveTo(hr - 1, -15); c.lineTo(hr + 6, -19 + fl); c.lineTo(hr + 4, -14); c.lineTo(hr + 7, -10 - fl); c.lineTo(hr - 1, -12); c.fill();
      c.fillStyle = L.dots; for (const [dx, dy] of [[-4.5, -16], [0, -18.5], [4.5, -16], [-1.5, -14.5], [2.8, -13.8]]) { c.beginPath(); c.arc(dx, dy, 0.9, 0, TAU); c.fill(); }
    }
    c.restore();
    if (diving) {
      c.fillStyle = "rgba(255,255,255,.8)";
      for (let k = 0; k < 4; k++) { const by = y - 10 - ((t * 40 + k * 9) % 34); c.beginPath(); c.arc(x + Math.sin(t * 5 + k * 2) * 8, by, 2 + (k % 2), 0, TAU); c.fill(); }
    }
  }
  function drawSwimFace(c, sw, ey, patch) {
    const ink = "#2A1A12", my = ey + 4;
    c.fillStyle = "rgba(255,120,120,.35)"; c.beginPath(); c.arc(-5.6, ey + 2.6, 1.9, 0, TAU); c.arc(5.6, ey + 2.6, 1.9, 0, TAU); c.fill();
    c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1.3; c.lineCap = "round";
    if (sw.ouchT > 0) {
      for (const ex of [-3.4, 3.4]) { c.beginPath(); c.moveTo(ex - 1.3, ey - 1.3); c.lineTo(ex + 1.3, ey + 1.3); c.moveTo(ex + 1.3, ey - 1.3); c.lineTo(ex - 1.3, ey + 1.3); c.stroke(); }
    } else if (sw.spinT > 0) {
      for (const ex of [-3.4, 3.4]) { c.beginPath(); c.arc(ex, ey, 1.6, sw.t * 12, sw.t * 12 + 4.8); c.stroke(); }
    } else if (sw.happyT > 0) {
      for (const ex of [-3.4, 3.4]) { c.beginPath(); c.arc(ex, ey + 0.8, 1.6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    } else {
      c.beginPath(); c.arc(-3.4, ey, 1.4, 0, TAU); c.arc(3.4, ey, 1.4, 0, TAU); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(-2.9, ey - 0.5, 0.5, 0, TAU); c.arc(3.9, ey - 0.5, 0.5, 0, TAU); c.fill();
    }
    if (patch) {
      c.fillStyle = "#15171C"; c.beginPath(); c.ellipse(-3.4, ey, 2.6, 2.3, 0, 0, TAU); c.fill();
      c.strokeStyle = "#15171C"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-9, ey - 4); c.lineTo(8.6, ey - 5.5); c.stroke();
    }
    c.fillStyle = "#7A2630"; c.strokeStyle = "#7A2630";
    if (sw.ouchT > 0 || sw.spinT > 0) { c.beginPath(); c.ellipse(0, my + 0.5, 1.8, 2.1, 0, 0, TAU); c.fill(); }
    else if (sw.happyT > 0 || sw.diveT > 0) { c.beginPath(); c.moveTo(-3.4, my - 0.6); c.quadraticCurveTo(0, my + 4.4, 3.4, my - 0.6); c.closePath(); c.fill(); }
    else if (!patch) { c.lineWidth = 1.3; c.beginPath(); c.arc(0, my - 1.8, 2.8, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  }

  // ---------- drawing: rafters and their loot ----------
  function drawRafts(c) {
    for (const r of G.rafts) {
      if (!inView(r.s, 90)) continue;
      const y = objY(r.s), mood = r.reactT > 0 ? r.mood : r.calm;
      if (r.dbl) {
        c.save(); c.translate(r.x, y); c.rotate(r.rot);
        c.fillStyle = "rgba(0,40,70,.2)"; c.beginPath(); c.ellipse(6, 9, 56, 24, 0, 0, TAU); c.fill();
        drawRider(c, -26, 0, r.people[0], { mood, t: G.t + r.seed, rot: -0.1, noShadow: true });
        drawRider(c, 26, 0, r.people[1], { mood: r.reactT > 0 ? r.mood : "happy", t: G.t + r.seed + 2, rot: 0.1, noShadow: true });
        c.fillStyle = "#D6DCE4"; roundRect(c, -5, -6, 10, 12, 3); c.fill();
        c.restore();
      } else drawRider(c, r.x, y, r.people[0], { mood, t: G.t + r.seed, rot: r.rot });
      if (r.loot) {
        const [lx, ly] = lootPos(r), pulse = 0.5 + 0.5 * Math.sin(G.t * 5 + r.seed);
        c.strokeStyle = `rgba(255,214,90,${0.5 + 0.4 * pulse})`; c.lineWidth = 2.5;
        c.beginPath(); c.arc(lx, ly, 14 + pulse * 3, 0, TAU); c.stroke();
        drawLoot(c, r.loot.k, lx, ly);
        sparkle(c, lx + 10, ly - 12, 1.5 + pulse);
      }
    }
  }
  function drawLoot(c, k, x, y) {
    c.save(); c.translate(x, y);
    switch (k) {
      case "shades":
        c.fillStyle = "#15171C"; c.beginPath(); c.ellipse(-5, 0, 4.6, 3.6, 0, 0, TAU); c.ellipse(5, 0, 4.6, 3.6, 0, 0, TAU); c.fill();
        c.strokeStyle = "#15171C"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-1, -1); c.lineTo(1, -1); c.stroke();
        c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(-6.5, -1.2, 1.1, 0, TAU); c.arc(3.5, -1.2, 1.1, 0, TAU); c.fill(); break;
      case "hat":
        c.fillStyle = "#E9C77B"; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
        c.fillStyle = "#D9AF55"; c.beginPath(); c.arc(0, 0, 5.5, 0, TAU); c.fill();
        c.strokeStyle = "#E23B3B"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 6.3, 0, TAU); c.stroke(); break;
      case "flop":
        c.rotate(0.4); c.fillStyle = "#3D7BFF"; c.beginPath(); c.ellipse(0, 0, 4.8, 9.5, 0, 0, TAU); c.fill();
        c.strokeStyle = "#fff"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, 1); c.lineTo(0, -5); c.lineTo(4, 1); c.stroke(); break;
      case "juice":
        c.fillStyle = "#FF8A3D"; roundRect(c, -5, -7, 10, 14, 1.5); c.fill();
        c.fillStyle = "#fff"; c.fillRect(-5, -1, 10, 4);
        c.strokeStyle = "#fff"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(2, -7); c.lineTo(4, -12); c.stroke(); break;
      case "snack":
        c.fillStyle = "#E23B3B"; c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.lineTo(7, 8); c.lineTo(-7, 8); c.closePath(); c.fill();
        c.fillStyle = "#FFD23F"; c.fillRect(-6.5, -2, 13, 4); c.fillStyle = "#fff"; c.fillRect(-6, -8, 12, 2); break;
      case "ball": {
        const cols = ["#FF4D4D", "#FFFFFF", "#FFD23F", "#FFFFFF", "#3D7BFF", "#FFFFFF"];
        cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 8.5, (i / 6) * TAU + G.t, ((i + 1) / 6) * TAU + G.t); c.closePath(); c.fill(); });
        break;
      }
      case "gold": case "duck": {
        const body = k === "gold" ? "#F5B82E" : "#FFD93D";
        if (k === "gold") { const gr = c.createRadialGradient(0, 0, 0, 0, 0, 24); gr.addColorStop(0, "rgba(255,220,100,.7)"); gr.addColorStop(1, "rgba(255,220,100,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.fill(); }
        c.fillStyle = body; c.beginPath(); c.ellipse(1, 3, 8, 6, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(-3, -4, 4.6, 0, TAU); c.fill();
        c.fillStyle = "#FF8A1F"; c.beginPath(); c.moveTo(-7, -4); c.lineTo(-11, -3); c.lineTo(-7, -2); c.fill();
        c.fillStyle = "#1B1B25"; c.beginPath(); c.arc(-4, -5, 0.9, 0, TAU); c.fill();
        break;
      }
    }
    c.restore();
  }

  // ---------- drawing: things in the water ----------
  function drawItems(c) {
    for (const o of G.objs) {
      if (o.dead || !inView(o.s)) continue;
      const y = objY(o.s), t = G.t + o.seed;
      switch (o.type) {
        case "coin": {
          c.save(); c.translate(o.x, y + Math.sin(t * 2) * 1.5); c.scale(Math.max(0.25, Math.abs(Math.cos(t * 2.4))), 1);
          c.fillStyle = "#C98A10"; c.beginPath(); c.arc(0, 1, 8.5, 0, TAU); c.fill();
          c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(0, 0, 8.5, 0, TAU); c.fill();
          c.strokeStyle = "#E0A21A"; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 5.4, 0, TAU); c.stroke();
          c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(-3, -3, 1.6, 0, TAU); c.fill();
          c.restore(); break;
        }
        case "chest": {
          c.save(); c.translate(o.x, y + Math.sin(t * 1.6) * 2); c.rotate(Math.sin(t) * 0.1);
          const gr = c.createRadialGradient(0, 0, 0, 0, 0, 34); gr.addColorStop(0, "rgba(255,220,100,.6)"); gr.addColorStop(1, "rgba(255,220,100,0)");
          c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.fill();
          c.fillStyle = "#7A4A22"; roundRect(c, -14, -10, 28, 20, 3); c.fill();
          c.fillStyle = "#9C6232"; roundRect(c, -14, -10, 28, 8, 3); c.fill();
          c.fillStyle = "#E8B84A"; c.fillRect(-14, -3, 28, 2.4); c.fillRect(-8, -10, 2.4, 20); c.fillRect(5.6, -10, 2.4, 20);
          c.fillStyle = "#FFD23F"; roundRect(c, -3, -4, 6, 7, 1.5); c.fill();
          sparkle(c, 14 * Math.cos(t * 2), -14, 2.5 + Math.sin(t * 5));
          c.restore(); break;
        }
        case "gem": {
          c.save(); c.translate(o.x, y + Math.sin(t * 2) * 2);
          c.globalCompositeOperation = "lighter";
          const gr = c.createRadialGradient(0, 0, 0, 0, 0, 26); gr.addColorStop(0, o.hue + "AA"); gr.addColorStop(1, o.hue + "00");
          c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fill();
          c.globalCompositeOperation = "source-over";
          c.fillStyle = o.hue; c.beginPath(); c.moveTo(0, -12); c.lineTo(9, -3); c.lineTo(0, 12); c.lineTo(-9, -3); c.closePath(); c.fill();
          c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.moveTo(0, -12); c.lineTo(4, -3); c.lineTo(0, 2); c.lineTo(-4, -3); c.closePath(); c.fill();
          c.restore(); break;
        }
        case "rock": {
          c.save(); c.translate(o.x, y);
          // foam piles up on the upstream side, a wake trails downstream
          c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(0, o.r * 0.6, o.r * 1.25, o.r * 0.6, 0, 0, Math.PI); c.fill();
          c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 2.5;
          c.beginPath(); c.moveTo(-o.r * 0.8, -o.r * 0.4); c.quadraticCurveTo(-o.r * 1.3, -o.r, -o.r * 1.2, -o.r * 1.7); c.moveTo(o.r * 0.8, -o.r * 0.4); c.quadraticCurveTo(o.r * 1.3, -o.r, o.r * 1.2, -o.r * 1.7); c.stroke();
          c.fillStyle = "#6E7784"; c.beginPath(); o.pts.forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill();
          c.fillStyle = "#98A2AE"; c.beginPath(); o.pts.forEach(([px, py], k) => (k ? c.lineTo(px * 0.6 - 3, py * 0.6 - 3) : c.moveTo(px * 0.6 - 3, py * 0.6 - 3))); c.closePath(); c.fill();
          c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(-o.r * 0.35, -o.r * 0.35, 2.4, 0, TAU); c.fill();
          c.restore(); break;
        }
      }
    }
  }
  function sparkle(c, x, y, s) { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * 0.4, y - s * 0.4); c.lineTo(x + s * 2, y); c.lineTo(x + s * 0.4, y + s * 0.4); c.lineTo(x, y + s * 2); c.lineTo(x - s * 0.4, y + s * 0.4); c.lineTo(x - s * 2, y); c.lineTo(x - s * 0.4, y - s * 0.4); c.fill(); }

  function drawSwimmers(c) {
    // the one further back (lower on screen) is drawn last so it sits on top
    const list = [G.you, G.dad].filter((sw) => inView(sw.s, 60)).sort((a, b) => b.s - a.s);
    for (const sw of list) {
      const y = objY(sw.s);
      drawSwimmer(c, sw.x, y, sw);
      c.font = "800 10px Nunito, system-ui, sans-serif"; c.textAlign = "center";
      c.lineWidth = 3; c.strokeStyle = "rgba(10,50,80,.6)"; c.strokeText(sw.look.name, sw.x, y + 44);
      c.fillStyle = sw.isDad ? "#FFFFFF" : "#FFE58A"; c.fillText(sw.look.name, sw.x, y + 44);
    }
  }

  function drawDadTalk(c) {
    const d = G.dad, y = objY(d.s), top = 150, bottom = viewH - 70;
    // arrow when Dad is off screen
    if (y < top - 20 || y > viewH + 10) {
      const up = y < top, ay = up ? top - 8 : viewH - 120, ax = clamp(d.x, 40, W - 40);
      c.fillStyle = "rgba(21,23,28,.85)"; roundRect(c, ax - 34, ay - 12, 68, 24, 12); c.fill();
      c.fillStyle = "#fff"; c.font = "800 12px Nunito, system-ui, sans-serif"; c.textAlign = "center";
      c.fillText(up ? "Dad ▲" : "Dad ▼", ax, ay + 4);
    }
    if (!G.dadLine) return;
    const txt = G.dadLine.text, a = clamp(Math.min(G.dadLine.t * 6, (3.2 - G.dadLine.t) * 4), 0, 1);
    c.font = "800 12.5px Nunito, system-ui, sans-serif";
    const w = Math.min(c.measureText(txt).width + 20, W - 24);
    const bx = clamp(d.x, w / 2 + 10, W - w / 2 - 10), by = clamp(y - 72, top + 22, bottom);
    c.globalAlpha = a;
    c.fillStyle = "#FFFFFF"; roundRect(c, bx - w / 2, by - 15, w, 28, 12); c.fill();
    if (y - 72 > top + 22 && y < viewH) { c.beginPath(); c.moveTo(clamp(d.x, bx - w / 2 + 14, bx + w / 2 - 14) - 6, by + 12); c.lineTo(clamp(d.x, 20, W - 20), by + 24); c.lineTo(clamp(d.x, bx - w / 2 + 14, bx + w / 2 - 14) + 6, by + 12); c.fill(); }
    c.fillStyle = "#15171C"; c.textAlign = "center"; c.fillText(txt, bx, by + 4, W - 40);
    c.globalAlpha = 1;
  }

  function render() {
    const c = ctx;
    c.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    c.save();
    if (G.shake > 0 && !reduced) c.translate((Math.random() - 0.5) * G.shake * 14, (Math.random() - 0.5) * G.shake * 10);
    drawBase(c); drawWater(c); drawCreatures(c); drawDecor(c); drawDark(c);
    drawWhirls(c); drawWaves(c); drawItems(c); drawRafts(c); drawSwimmers(c); drawOverheads(c); drawFx(c);
    if (G.running) drawDadTalk(c);
    c.restore();
  }

  // ---------- layout ----------
  function resize() {
    const r = $("#stage").getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    scale = r.width / W; viewH = r.height / scale; baseY = viewH * 0.68;
  }
  addEventListener("resize", resize);

  // ---------- flow ----------
  function freshStats() { return { loot: 0, sneaks: 0, coins: 0, bumps: 0, splashes: 0, spins: 0, waves: 0 }; }
  function setupRace() {
    buildRace();
    G.rafts = []; G.waves = []; G.parts = []; G.pops = [];
    const q = riverAt(0);
    G.you = makeSwimmer(KIDS[G.kid], false, q.cx + 40, 0);
    G.dad = makeSwimmer(DAD, true, q.cx - 40, 0);
    G.camS = 0; G.spawnS = 420;
    spawnAhead();
  }
  function start() {
    Snd.init(); Snd.resume(); Snd.quiet(false);
    store.set("kid", G.kid);
    setupRace();
    Object.assign(G, { running: true, paused: false, t: 0, raceT: 0, stats: freshStats(), zoneKey: "", lap: 0, lead: 0, ending: false, endT: 0, talkCd: 0, idleTalk: 12, dadLine: null });
    input.active = false;
    $("#score").textContent = "0"; $("#youDot").textContent = KIDS[G.kid].name[0];
    $("#lapChip").textContent = `Lap 1/${LAPS}`;
    $("#startScreen").hidden = true; $("#endScreen").hidden = true; $("#pauseScreen").hidden = true; $("#hud").hidden = false; $("#diveBtn").hidden = false;
    dadSay(DAD_LINES.start, true);
  }
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
  function endRace() {
    G.running = false; G.ending = false; Snd.quiet(true);
    $("#hud").hidden = true; $("#diveBtn").hidden = true; $("#banner").classList.remove("show");
    const you = G.you, dad = G.dad, st = G.stats, name = KIDS[G.kid].name;
    const dadT = dad.finishT != null ? dad.finishT : you.finishT + Math.max(1, (RACE_LEN - dad.s) / 150);
    const won = you.finishT < dadT, margin = Math.max(1, Math.round(Math.abs(dadT - you.finishT)));
    $("#endKicker").textContent = `Race over in ${clock(you.finishT)}`;
    $("#endTitle").textContent = won ? "You beat Dad!" : "Dad won this time!";
    $("#endSub").textContent = won ? `By ${margin} second${margin > 1 ? "s" : ""}. Captain Dad has to walk the plank!` : `By ${margin} second${margin > 1 ? "s" : ""}. "Arr! Rematch, matey?"`;
    $("#endYouName").textContent = name;
    $("#endScore").textContent = you.score; $("#endDad").textContent = dad.score;
    const bests = store.get("best", {}), prev = bests[G.kid] || { treasure: 0, wins: 0 };
    const now = { treasure: Math.max(prev.treasure || 0, you.score), wins: (prev.wins || 0) + (won ? 1 : 0) };
    bests[G.kid] = now; store.set("best", bests);
    $("#endBest").textContent = `${you.score > (prev.treasure || 0) && prev.treasure ? "New treasure record! " : ""}${now.wins ? `${name} has beaten Dad ${now.wins} time${now.wins === 1 ? "" : "s"}.` : `${name} is still hunting that first win over Dad.`} Best haul: ${now.treasure}.`;
    const rows = [["Loot plundered", st.loot], ["Sneak plunders", st.sneaks], ["Coins & gems", st.coins], ["Rafts bumped", st.bumps], ["Splashes", st.splashes], ["Waves caught", st.waves]];
    $("#endStats").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    $("#endScreen").hidden = false;
  }
  function setPaused(p) {
    G.paused = p; $("#pauseScreen").hidden = !p; Snd.quiet(p);
    if (!p) Snd.resume();
  }

  // the river keeps flowing behind the menus
  function attract(dt) {
    G.t += dt;
    for (const sw of [G.you, G.dad]) {
      sw.t += dt; params(sw.s, P1);
      sw.s += (P1.current + 40) * dt;
      sw.x = lerp(sw.x, centerX(sw.s, P1.hw) + (sw.isDad ? -45 : 45), 0.03);
    }
    G.camS = G.you.s - 160;
    spawnAhead(); updateRafts(dt); updateFx(dt);
    if (G.you.s > STARTS[1] - 600) setupRace();
  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (G.running && !G.paused) update(dt);
    else if (!G.running) attract(dt);
    render();
  }

  // ---------- menus ----------
  function buildMenus() {
    const box = $("#riders");
    ORDER.forEach((k) => {
      const b = document.createElement("button");
      b.className = "rider"; b.type = "button"; b.dataset.k = k; b.setAttribute("aria-pressed", String(k === G.kid));
      const cv = document.createElement("canvas"); cv.width = 156; cv.height = 156;
      const c = cv.getContext("2d");
      const gr = c.createRadialGradient(78, 70, 10, 78, 78, 78); gr.addColorStop(0, "#6FE0E6"); gr.addColorStop(1, "#23A6C6");
      c.fillStyle = gr; c.beginPath(); c.arc(78, 78, 76, 0, TAU); c.fill();
      c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 3; c.beginPath(); c.arc(78, 84, 66, 0.2, 1.2); c.stroke();
      drawSwimmer(c, 78, 90, { look: KIDS[k], t: 0.3, rot: 0, diveT: 0, ouchT: 0, spinT: 0, happyT: 1 }, { scale: 2.3, still: true });
      b.append(cv, document.createTextNode(KIDS[k].name));
      b.addEventListener("click", () => {
        G.kid = k; store.set("kid", k);
        box.querySelectorAll(".rider").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.k === k)));
        G.you.look = KIDS[k];
      });
      box.append(b);
    });
    const segs = LAP.map(([k, len]) => `<i style="flex:${len};background:${ZONES[k].color}"></i>`).join("");
    $("#mapTrack").innerHTML = Array.from({ length: LAPS }, () => segs).join('<i class="lapmark"></i>');
  }

  const muteBtn = $("#muteBtn");
  function syncMute() { muteBtn.classList.toggle("muted", Snd.muted); muteBtn.setAttribute("aria-label", Snd.muted ? "Sound on" : "Sound off"); }
  muteBtn.addEventListener("click", () => { Snd.init(); Snd.setMuted(!Snd.muted); syncMute(); });
  $("#pauseBtn").addEventListener("click", () => setPaused(true));
  $("#resumeBtn").addEventListener("click", () => setPaused(false));
  $("#quitBtn").addEventListener("click", () => { setPaused(false); G.running = false; $("#hud").hidden = true; $("#diveBtn").hidden = true; $("#startScreen").hidden = false; setupRace(); });
  $("#startBtn").addEventListener("click", start);
  $("#againBtn").addEventListener("click", start);
  $("#switchBtn").addEventListener("click", () => { $("#endScreen").hidden = true; $("#startScreen").hidden = false; setupRace(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && G.running && !G.paused) setPaused(true); });

  resize(); buildDecor(); buildMenus(); syncMute(); setupRace();
  requestAnimationFrame(frame);

  // test hook
  window.__lazyRiver = { G, start, endRace, RACE_LEN, LAP_LEN };
})();
