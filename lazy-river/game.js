// Lazy River: Reuben, Jonah and Ellie float one lap of a resort lazy river.
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
  const FAST = location.hash.includes("fast") ? 5 : 1;   // test hook
  const TAU = Math.PI * 2;
  const W = 400;   // river world is 400 units wide
  const R = 25;    // tube radius

  const store = {
    get(k, d) { try { const v = localStorage.getItem("lazyRiver." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("lazyRiver." + k, JSON.stringify(v)); } catch {} },
  };

  // ---------- the three riders ----------
  const RIDERS = {
    reuben: { name: "Reuben", tube: "#FF8A1F", stripe: "#FFFFFF", suit: "#2563EB", suit2: "#1D3F9E", hair: "#6B4423", skin: "#F2C29B", style: "short", trunks: true },
    jonah:  { name: "Jonah",  tube: "#22C55E", stripe: "#FDE047", suit: "#E23B3B", suit2: "#9B1C1C", hair: "#2B1B12", skin: "#EDBB92", style: "curly", trunks: true },
    ellie:  { name: "Ellie",  tube: "#F0529C", stripe: "#FFFFFF", suit: "#8B5CF6", suit2: "#6D28D9", hair: "#B7793A", skin: "#F6CFAE", style: "pigtails", trunks: false },
  };
  const ORDER = ["reuben", "jonah", "ellie"];

  // ---------- the river: zones around one lap ----------
  const ZONES = {
    smooth: { name: "Smooth Seas", sub: "Kick back and scoop up shells", speed: 85, hw: 150, water: [56, 204, 214], rough: 0, dark: 0, color: "#38CCD6" },
    rough:  { name: "Rough Seas", sub: "Hold on tight and dodge the rocks!", speed: 165, hw: 118, water: [30, 124, 178], rough: 1, dark: 0, color: "#1E6FA8" },
    grotto: { name: "Waterfall Grotto", sub: "Find the gap or get soaked", speed: 95, hw: 128, water: [26, 104, 124], rough: 0.1, dark: 1, color: "#1F4F5E" },
    whirl:  { name: "Whirlpool Cove", sub: "Swirls pull you in. Steer wide!", speed: 90, hw: 165, water: [44, 180, 204], rough: 0.15, dark: 0, color: "#7C6FE0" },
    surge:  { name: "Wave Surge", sub: "Ride the waves. Wheee!", speed: 105, hw: 150, water: [40, 158, 216], rough: 0.35, dark: 0, color: "#FFB547" },
  };
  const LAP = [["smooth", 2200], ["rough", 2600], ["smooth", 1200], ["grotto", 2100], ["whirl", 2200], ["surge", 2000], ["rough", 2400], ["smooth", 1500]];
  const STARTS = []; let LAP_LEN = 0;
  for (const [, len] of LAP) { STARTS.push(LAP_LEN); LAP_LEN += len; }
  const FINISH = LAP_LEN - 420;
  const zoneIndex = (s) => { let i = 0; while (i < LAP.length - 1 && s >= STARTS[i + 1]) i++; return i; };

  function params(s, out) {
    s = Math.max(0, s);
    const i = zoneIndex(s), z = ZONES[LAP[i][0]], pz = i ? ZONES[LAP[i - 1][0]] : z;
    const t = smooth(clamp((s - STARTS[i]) / 320, 0, 1));
    out.i = i;
    out.speed = lerp(pz.speed, z.speed, t); out.hw = lerp(pz.hw, z.hw, t);
    out.r = lerp(pz.water[0], z.water[0], t); out.g = lerp(pz.water[1], z.water[1], t); out.b = lerp(pz.water[2], z.water[2], t);
    out.rough = lerp(pz.rough, z.rough, t); out.dark = lerp(pz.dark, z.dark, t);
    return out;
  }
  const P0 = {}, P1 = {}, P2 = {};
  const centerX = (s, hw) => 200 + (200 - hw - 26) * (0.7 * Math.sin(s / 520) + 0.3 * Math.sin(s / 190 + 1));
  function riverAt(s) { params(s, P2); return { cx: centerX(s, P2.hw), hw: P2.hw }; }
  const posX = (s, u) => { const q = riverAt(s); return q.cx + u * q.hw; };

  // ---------- state ----------
  const canvas = $("#river"), ctx = canvas.getContext("2d");
  let dpr = 1, scale = 1, viewH = 800, baseY = 560;
  const G = {
    running: false, paused: false, attract: true, t: 0, camS: 0, rider: store.get("rider", "reuben"),
    objs: [], decor: [], overheads: [], waves: [], parts: [], pops: [],
    riders: [], score: 0, stats: null, zoneI: -1, crew: false, shake: 0, nextWave: 0,
    finishing: false, finishT: 0, boingCd: 0,
  };
  if (!RIDERS[G.rider]) G.rider = "reuben";

  function makeRider(key, isPlayer, slot) {
    return { key, rd: RIDERS[key], isPlayer, x: 200 + slot.dx, py: slot.dy, vx: 0, vy: 0, slot, rot: 0, spinT: 0, liftT: 0,
      inv: 0, wet: 0, whirlCd: 0, phase: Math.random() * 10, chill: 0, ripple: Math.random() * 2 };
  }
  function setupRiders() {
    const others = ORDER.filter((k) => k !== G.rider);
    G.riders = [
      makeRider(G.rider, true, { dx: 0, dy: 0 }),
      makeRider(others[0], false, { dx: -62, dy: 52 }),
      makeRider(others[1], false, { dx: 62, dy: 60 }),
    ];
  }

  // ---------- building one lap ----------
  function rockShape(r) { const pts = []; for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; const rr = r * rand(0.78, 1.08); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.85]); } return pts; }
  function add(type, s, u, extra) {
    const o = Object.assign({ type, s, u, x: posX(s, u), dead: false, seed: Math.random() * 100 }, extra);
    G.objs.push(o); return o;
  }
  const VALUE = { shell: 1, star: 3, conch: 10, gem: 5 };

  function buildLap() {
    G.objs = []; G.decor = []; G.overheads = []; G.waves = [];
    LAP.forEach(([k, len], i) => {
      const a = STARTS[i], b = a + len;
      if (k === "smooth") {
        for (let s = a + 220; s < b - 120; s += rand(70, 120)) {
          if (Math.random() < 0.22) { // a curving line of shells
            const u0 = rand(-0.6, 0.6), du = rand(-0.12, 0.12);
            for (let j = 0; j < 4; j++) add("shell", s + j * 34, clamp(u0 + du * j, -0.82, 0.82));
            s += 110;
          } else add("shell", s, rand(-0.8, 0.8));
        }
        for (let s = a + 380; s < b - 150; s += rand(380, 520)) add("star", s, rand(-0.75, 0.75));
        if (i === 0 || i === LAP.length - 1) add("conch", a + len * rand(0.55, 0.75), rand(-0.7, 0.7));
        const critters = Math.floor(len / 800) + 1;
        for (let j = 0; j < critters; j++) add(Math.random() < 0.6 ? "turtle" : "ray", a + rand(300, len - 200), rand(-0.6, 0.6), { swim: rand(28, 42) });
        for (let j = 0; j < 2; j++) add("fish", a + rand(200, len - 100), rand(-0.6, 0.6), { swim: rand(20, 50) });
        if (len > 1400) add("ball", a + rand(500, len - 300), rand(-0.5, 0.5), { vx: 0, vs: 0, spin: 0, bumped: false });
      } else if (k === "rough") {
        for (let s = a + 260; s < b - 160; s += rand(150, 210)) {
          const n = Math.random() < 0.45 ? 2 : 1, us = [];
          while (us.length < n) { const u = rand(-0.8, 0.8); if (us.every((v) => Math.abs(v - u) > 0.7)) us.push(u); }
          us.forEach((u) => { const r = rand(17, 25); add("rock", s + rand(-20, 20), u, { r, pts: rockShape(r) }); });
          let su = 0, tries = 0;
          do { su = rand(-0.8, 0.8); tries++; } while (tries < 20 && us.some((v) => Math.abs(v - su) < 0.45));
          add("shell", s + 85, su);
        }
        add("star", a + len * 0.5, 0);
      } else if (k === "grotto") {
        G.overheads.push({ type: "cave", s: a + 40 }, { type: "cave", s: b + 150, exit: true });
        for (let s = a + 420; s < b - 220; s += rand(340, 420)) {
          add("falls", s, 0, { gu: rand(-0.55, 0.55), gw: 92, hit: {} });
          add("gem", s + 150, rand(-0.7, 0.7), { hue: pick(["#7CF3FF", "#C9A2FF", "#8CFFB4"]) });
          add("gem", s - 140, rand(-0.7, 0.7), { hue: pick(["#7CF3FF", "#C9A2FF", "#8CFFB4"]) });
        }
      } else if (k === "whirl") {
        let side = Math.random() < 0.5 ? -1 : 1;
        for (let s = a + 420; s < b - 260; s += rand(380, 450)) {
          const u = side * rand(0.28, 0.48); side = -side;
          const w = add("whirl", s, u, { r: 64 });
          if (Math.random() < 0.5) add("star", s, u);
          for (let j = 0; j < 5; j++) { const ang = Math.PI + side * (0.4 + j * 0.35); add("shell", s + Math.sin(ang) * 88, clamp(u + (Math.cos(ang) * 88) / 165, -0.85, 0.85)); }
          w.side = side;
        }
      } else if (k === "surge") {
        for (let s = a + 300; s < b - 200; s += rand(110, 170)) add("shell", s, rand(-0.8, 0.8));
        for (let j = 0; j < 2; j++) add("ball", a + rand(300, len - 300), rand(-0.6, 0.6), { vx: 0, vs: 0, spin: 0, bumped: false });
        add("star", a + len * rand(0.3, 0.7), rand(-0.6, 0.6));
      }
    });
    G.objs.sort((p, q) => p.s - q.s);
    // bridges overhead
    [STARTS[0] + 1500, STARTS[2] + 650, STARTS[4] + 1150, STARTS[7] + 450].forEach((s) => {
      const heads = []; const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) heads.push({ u: rand(-0.9, 0.9), c: pick(["#FF6B5B", "#FFD166", "#3BC6A0", "#6C8CFF", "#F58CC8", "#FFFFFF"]), skin: pick(["#F2C29B", "#C98E63", "#8A5A3C", "#F6D5B8"]), p: Math.random() * 6 });
      G.overheads.push({ type: "bridge", s, heads });
    });
    G.overheads.push({ type: "finish", s: FINISH });
    // bank decoration
    for (const side of [-1, 1]) {
      for (let s = -700; s < LAP_LEN + 900; s += rand(52, 92)) {
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

  // ---------- sound ----------
  const Snd = (() => {
    let ac = null, master, noiseBuf, ambF, ambG, musicG, muted = store.get("muted", false), next = 0, step = 0, tempo = 100, mode = "smooth", timer = 0;
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
      timer = setInterval(sched, 30);
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
    const CH = [[261.63, 329.63, 392.0], [349.23, 440.0, 523.25], [392.0, 493.88, 587.33], [261.63, 329.63, 392.0]];
    const BASS = [130.81, 174.61, 196.0, 130.81];
    const RHY = [1, 0, 1, 1, 0, 1, 1, 0];
    const TEMPO = { smooth: 100, rough: 132, grotto: 84, whirl: 104, surge: 114 };
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
      bling: guard((big) => { const t = now(); tone(big ? 988 : 1319, t, 0.12, "sine", 0.22); tone(big ? 1319 : 1760, t + 0.06, big ? 0.35 : 0.16, "sine", 0.2); if (big) tone(1976, t + 0.14, 0.4, "sine", 0.16); }),
      bonk: guard(() => { const t = now(); tone(220, t, 0.25, "sine", 0.5, null, 70); noise(t, 0.2, "lowpass", 900, 0.3); }),
      splash: guard((big) => { const t = now(); noise(t, big ? 0.9 : 0.45, "bandpass", 1200, big ? 0.5 : 0.25, 400, 0.8); noise(t + 0.05, 0.6, "highpass", 3000, 0.12); }),
      whoosh: guard(() => { const t = now(); noise(t, 0.9, "bandpass", 300, 0.4, 2200, 3); tone(500, t, 0.8, "sine", 0.12, null, 150); }),
      boing: guard(() => { const t = now(); tone(260, t, 0.22, "sine", 0.25, null, 520); }),
      wave: guard(() => { const t = now(); noise(t, 0.8, "lowpass", 400, 0.35, 1600, 1); tone(392, t + 0.1, 0.18, "sine", 0.18, null, 784); }),
      hi: guard(() => { const t = now(); tone(880, t, 0.1, "sine", 0.18, null, 1320); tone(1320, t + 0.09, 0.14, "sine", 0.15, null, 990); }),
      zone: guard((rough) => { const t = now(); if (rough) { [196, 185, 175].forEach((f, i) => tone(f, t + i * 0.12, 0.3, "sawtooth", 0.06)); noise(t, 1.2, "lowpass", 300, 0.3, 1800, 1); } else [523, 659, 784].forEach((f, i) => pan(f, t + i * 0.09, 0.4)); }),
      fanfare: guard(() => { const t = now(); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => pan(f, t + i * 0.13, 0.5)); }),
    };
  })();

  // ---------- input ----------
  const input = { active: false, x: 200, left: false, right: false, idle: 0 };
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
    if ((e.key === "p" || e.key === "P" || e.key === "Escape") && G.running) setPaused(!G.paused);
  });
  addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
  });

  // ---------- effects ----------
  function pop(text, x, y, color = "#fff", size = 18) { G.pops.push({ text, x, y, color, size, t: 0 }); }
  function burst(x, y, n, color, speed = 120, kind = "drop") {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(0.3, 1) * speed; G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: rand(0.5, 0.9), t: 0, r: rand(1.5, 3.5), color, kind, rot: rand(0, TAU) }); }
  }
  const riderS = (r) => G.camS - r.py;
  const riderY = (r) => baseY + r.py;
  const objY = (s) => baseY - (s - G.camS);

  function addScore(n, x, y, label) {
    const mult = G.crew ? 2 : 1, v = n * mult;
    G.score += v;
    pop(`${label ? label + " " : ""}+${v}`, x, y, mult > 1 ? "#FFD166" : "#FFFFFF", v >= 10 ? 24 : 18);
    const el = $("#score"); el.textContent = G.score; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  }

  // ---------- update ----------
  function riverForces(r, dt, isPlayer) {
    const s = riderS(r);
    params(s, P1);
    if (P1.rough > 0) {
      r.vx += P1.rough * 190 * Math.sin(G.t * 1.25 + s / 230 + r.phase) * dt;
      r.vy += P1.rough * 70 * Math.sin(G.t * 2.1 + r.phase * 2) * dt;
      if (Math.random() < P1.rough * dt * 1.2) r.vx += rand(-90, 90);
    }
    for (const o of G.objs) {
      if (o.type !== "whirl" || Math.abs(o.s - s) > o.r * 1.9) continue;
      const dx = o.x - r.x, dy = G.camS - o.s - r.py, d = Math.hypot(dx, dy) || 1, reach = o.r * 1.75;
      if (d > reach) continue;
      const f = 1 - d / reach, pull = (isPlayer ? 330 : 240) * f, swirl = 260 * f;
      r.vx += (dx / d * pull - dy / d * swirl) * dt;
      r.vy += (dy / d * pull + dx / d * swirl) * dt;
      if (d < 16 && r.whirlCd <= 0) spinOut(r, o);
    }
    // stay inside the river walls
    const cx = centerX(s, P1.hw), lo = cx - P1.hw + R - 3, hi = cx + P1.hw - R + 3;
    if (r.x < lo) { r.x = lo; r.vx = Math.abs(r.vx) * 0.4 + 20; }
    if (r.x > hi) { r.x = hi; r.vx = -Math.abs(r.vx) * 0.4 - 20; }
    return P1.rough;
  }

  function spinOut(r, o) {
    r.whirlCd = 2.2; r.spinT = 1.3;
    const a = rand(0, TAU); r.vx = Math.cos(a) * 60 + (r.x < o.x ? -260 : 260); r.vy = Math.sin(a) * 120;
    Snd.whoosh();
    if (r.isPlayer) {
      G.stats.spins++;
      const lost = Math.min(2, G.score); G.score -= lost; $("#score").textContent = G.score;
      pop(lost ? `Spun out! −${lost}` : "Spun out!", r.x, riderY(r) - 40, "#E4DBFF", 20);
      for (let i = 0; i < lost; i++) burst(r.x, riderY(r), 1, "#FFC3B1", 180, "shell");
    } else pop(`${r.rd.name}: Wheee-oh!`, r.x, riderY(r) - 36, "#E4DBFF", 14);
  }

  function bonk(r, o) {
    r.inv = 1.1; r.spinT = Math.max(r.spinT, 0.45);
    const dx = r.x - o.x, dy = r.py - (G.camS - o.s), d = Math.hypot(dx, dy) || 1;
    r.vx = (dx / d) * 260; r.vy = (dy / d) * 160 + 60;
    Snd.bonk(); burst((r.x + o.x) / 2, (riderY(r) + objY(o.s)) / 2, 12, "#FFFFFF", 150);
    if (r.isPlayer) {
      G.stats.bonks++; G.shake = 0.5;
      const lost = Math.min(3, G.score); G.score -= lost; $("#score").textContent = G.score;
      pop(lost ? `Bonk! −${lost}` : "Bonk!", r.x, riderY(r) - 42, "#FFB4A8", 22);
      for (let i = 0; i < lost; i++) burst(r.x, riderY(r), 1, "#FFC3B1", 200, "shell");
    } else pop(`${r.rd.name}: Oof!`, r.x, riderY(r) - 36, "#FFFFFF", 14);
  }

  function lift(r) {
    r.liftT = 0.9;
    if (r.isPlayer) { G.stats.waves++; Snd.wave(); addScore(2, r.x, riderY(r) - 44, "Wheee!"); }
    burst(r.x, riderY(r) + 10, 8, "#FFFFFF", 110);
  }

  function updateRider(r, dt) {
    const p = G.riders[0];
    r.inv = Math.max(0, r.inv - dt); r.wet = Math.max(0, r.wet - dt); r.whirlCd = Math.max(0, r.whirlCd - dt);
    r.liftT = Math.max(0, r.liftT - dt); r.ripple += dt;
    if (r.isPlayer) {
      let desired = 0, active = false;
      if (input.left || input.right) { desired = (input.right - input.left) * 240; active = true; }
      else if (input.active) { desired = clamp((input.x - r.x) * 5, -320, 320); active = true; }
      const acc = active ? (desired - r.vx) * 6 : -r.vx * 1.4;
      r.vx += acc * dt;
      r.vy += (-r.py * 3 - r.vy * 2) * dt;
      input.idle = active && Math.abs(desired) > 30 ? 0 : input.idle + dt;
    } else {
      let tx = p.x + r.slot.dx;
      const s = riderS(r);
      for (const o of G.objs) {
        if (o.s < s || o.s > s + 180) continue;
        if (o.type === "rock" && Math.abs(o.x - r.x) < o.r + R + 20) tx = r.x + (r.x < o.x ? -90 : 90);
        if (o.type === "whirl" && Math.abs(o.x - r.x) < o.r + 10) tx = r.x + (r.x < o.x ? -110 : 110);
        if (o.type === "falls" && o.s < s + 160 && hash(o.seed + r.phase) > 0.45) tx = posX(o.s, o.gu);
      }
      params(s, P1);
      const grip = 1 - 0.65 * P1.rough;
      r.vx += (clamp((tx - r.x) * 2.2, -170, 170) - r.vx) * 2.4 * grip * dt;
      r.vy += ((r.slot.dy - r.py) * 2.2 - r.vy * 1.6) * dt;
    }
    const rough = riverForces(r, dt, r.isPlayer);
    r.x += r.vx * dt; r.py += r.vy * dt;
    r.py = clamp(r.py, -baseY + 70, viewH - baseY - 40);
    // wobble and spin
    if (r.spinT > 0) { r.spinT -= dt; r.rot += 13 * dt; if (r.spinT <= 0) r.rot = ((r.rot % TAU) + TAU) % TAU; }
    else {
      let target = Math.sin(G.t * 0.8 + r.phase) * 0.12 + rough * Math.sin(G.t * 3 + r.phase) * 0.25 + r.vx * 0.0009;
      let diff = ((target - r.rot + Math.PI) % TAU + TAU) % TAU - Math.PI;
      r.rot += diff * Math.min(1, 4 * dt);
    }
  }

  function tubeBumps() {
    const rs = G.riders;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j], dx = b.x - a.x, dy = b.py - a.py, d = Math.hypot(dx, dy) || 1, min = R * 2 - 2;
      if (d >= min) continue;
      const nx = dx / d, ny = dy / d, push = (min - d) / 2;
      a.x -= nx * push; a.py -= ny * push; b.x += nx * push; b.py += ny * push;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        const imp = -rel * 0.9;
        a.vx -= nx * imp; a.vy -= ny * imp; b.vx += nx * imp; b.vy += ny * imp;
        if (imp > 50 && G.boingCd <= 0) { Snd.boing(); G.boingCd = 0.3; burst(a.x + nx * R, riderY(a) + ny * R, 5, "#FFFFFF", 70); }
      }
    }
  }

  function collide(r, dt) {
    const s = riderS(r), y = riderY(r);
    for (const o of G.objs) {
      if (o.dead) continue;
      const ds = o.s - s;
      if (o.type === "falls") {
        if (!o.hit[r.key] && ds <= 0) {
          o.hit[r.key] = true;
          const gx = posX(o.s, o.gu), dry = Math.abs(r.x - gx) < o.gw / 2 - 6;
          if (dry) { if (r.isPlayer) addScore(3, r.x, y - 44, "Stayed dry!"); }
          else {
            r.wet = 2.4; Snd.splash(r.isPlayer); burst(r.x, y - 10, r.isPlayer ? 26 : 14, "#DDF8FF", 170);
            if (r.isPlayer) { G.stats.soaks++; pop("SPLASH! Soaked!", r.x, y - 46, "#BFF6FF", 22); G.shake = 0.25; }
            else pop(`${r.rd.name} got soaked!`, r.x, y - 38, "#BFF6FF", 14);
          }
        }
        continue;
      }
      if (ds > 120 || ds < -120) continue;
      const dx = o.x - r.x, dy = objY(o.s) - y, d = Math.hypot(dx, dy);
      if (o.type === "rock") { if (d < R + o.r - 5 && r.inv <= 0) bonk(r, o); continue; }
      if (o.type === "ball") {
        if (d < R + 14) {
          const nx = dx / (d || 1), ny = dy / (d || 1);
          o.vx = nx * 220 + r.vx * 0.5; o.vs = -ny * 220; o.spin = rand(-8, 8);
          if (G.boingCd <= 0) { Snd.boing(); G.boingCd = 0.25; }
          if (r.isPlayer && !o.bumped) { o.bumped = true; addScore(1, o.x, objY(o.s) - 24, "Boing!"); }
        }
        continue;
      }
      if (!r.isPlayer) continue;
      if (VALUE[o.type] && d < R + 16) {
        o.dead = true;
        const v = VALUE[o.type];
        if (o.type === "shell") G.stats.shells++;
        if (o.type === "gem") G.stats.gems++;
        addScore(v, o.x, objY(o.s) - 20, o.type === "conch" ? "Golden conch!" : o.type === "star" ? "Starfish!" : o.type === "gem" ? "Gem!" : "");
        Snd.bling(v >= 3);
        burst(o.x, objY(o.s), v >= 3 ? 14 : 6, o.type === "gem" ? o.hue : "#FFF3C4", 110, "spark");
      }
      if ((o.type === "turtle" || o.type === "ray") && !o.greeted && d < 80) {
        o.greeted = true; G.stats.critters++; Snd.hi();
        addScore(2, o.x, objY(o.s) - 26, o.type === "turtle" ? "Hi, turtle!" : "Hi, stingray!");
      }
    }
  }

  function updateObjs(dt, speed) {
    for (const o of G.objs) {
      if (o.dead || Math.abs(o.s - G.camS) > 1200) continue;
      if (o.type === "turtle" || o.type === "ray" || o.type === "fish") {
        o.s += o.swim * dt; o.u = clamp(o.u + Math.sin(G.t * 0.4 + o.seed) * 0.05 * dt, -0.75, 0.75); o.x = posX(o.s, o.u);
      } else if (o.type === "ball") {
        o.s += (speed * 0.55 + o.vs) * dt;
        const q = riverAt(o.s); o.x += o.vx * dt;
        const lo = q.cx - q.hw + 14, hi = q.cx + q.hw - 14;
        if (o.x < lo) { o.x = lo; o.vx = Math.abs(o.vx) * 0.6; } if (o.x > hi) { o.x = hi; o.vx = -Math.abs(o.vx) * 0.6; }
        o.vx *= 1 - 1.2 * dt; o.vs *= 1 - 1.2 * dt; o.spin *= 1 - 0.8 * dt; o.rot = (o.rot || 0) + o.spin * dt;
      }
    }
  }

  function updateWaves(dt) {
    const zk = LAP[zoneIndex(G.camS)][0], i = zoneIndex(G.camS);
    if (zk === "surge" && G.camS < STARTS[i] + LAP[i][1] - 450) {
      G.nextWave -= dt;
      if (G.nextWave <= 0) { G.waves.push({ s: G.camS + baseY + 60, hit: {} }); G.nextWave = rand(2.1, 2.9); }
    }
    for (const w of G.waves) {
      w.s -= 125 * dt;
      for (const r of G.riders) if (!w.hit[r.key] && w.s <= riderS(r)) { w.hit[r.key] = true; lift(r); r.vy += 90; }
    }
    G.waves = G.waves.filter((w) => w.s > G.camS - (viewH - baseY) - 100);
  }

  function update(dt) {
    G.t += dt; G.shake = Math.max(0, G.shake - dt); G.boingCd = Math.max(0, G.boingCd - dt);
    params(G.camS, P0);
    let speed = P0.speed * FAST;
    if (G.finishing) { G.finishT += dt; speed *= Math.max(0.15, 1 - G.finishT * 0.7); if (G.finishT > 2) return endLap(); }
    G.camS += speed * dt;

    const zi = zoneIndex(G.camS);
    if (zi !== G.zoneI) { G.zoneI = zi; enterZone(LAP[zi][0]); }

    for (const r of G.riders) updateRider(r, dt);
    tubeBumps();
    updateObjs(dt, speed);
    updateWaves(dt);
    for (const r of G.riders) collide(r, dt);

    // float party: everyone close together
    const p = G.riders[0];
    const crew = G.riders.slice(1).every((b) => Math.hypot(b.x - p.x, b.py - p.py) < 125);
    if (crew !== G.crew) { G.crew = crew; $("#crew").hidden = !crew; }
    if (crew) G.stats.crewTime += dt;

    updateFx(dt);
    const prog = clamp(G.camS / FINISH, 0, 1);
    $("#mapDot").style.left = (prog * 100).toFixed(2) + "%";
    if (!G.finishing && G.camS >= FINISH) { G.finishing = true; Snd.fanfare(); showBanner("Lap complete!", "Nice floating, crew!", ""); burst(p.x, riderY(p) - 20, 40, pick(["#FFD166", "#FF6B5B", "#3BC6A0"]), 220, "confetti"); }
  }

  function updateFx(dt) {
    for (const q of G.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.kind === "confetti" ? 120 : 260) * dt; q.rot += dt * 6; }
    G.parts = G.parts.filter((q) => q.t < q.life);
    for (const q of G.pops) { q.t += dt; q.y -= 38 * dt; }
    G.pops = G.pops.filter((q) => q.t < 1.3);
  }

  // ---------- zone banners ----------
  let bannerTimer = 0;
  function showBanner(title, sub, cls) {
    const b = $("#banner");
    $("#bannerTitle").textContent = title; $("#bannerSub").textContent = sub;
    b.className = "banner show " + (cls || "");
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove("show"), 1900);
  }
  function enterZone(k) {
    const z = ZONES[k];
    showBanner(z.name, z.sub, k === "rough" || k === "grotto" ? k : "");
    const chip = $("#zoneChip"); chip.textContent = z.name; chip.className = "pill zone " + (k === "rough" || k === "grotto" ? k : "");
    Snd.setMode(k); Snd.zone(k === "rough");
    if (k === "surge") G.nextWave = 1.2;
  }

  // ---------- drawing: characters ----------
  function ring(c, r0, r1, a0, a1) { c.beginPath(); c.arc(0, 0, r1, a0, a1); c.arc(0, 0, r0, a1, a0, true); c.closePath(); }
  function drawRider(c, x, y, rd, st) {
    const lift = st.lift || 0, t = st.t || 0, sc = (st.scale || 1) * (1 + 0.22 * lift);
    c.save(); c.translate(x, y);
    // shadow on the water
    c.fillStyle = "rgba(0,40,70,.25)"; c.beginPath(); c.ellipse(5 + 12 * lift, 8 + 16 * lift, 27 * sc, 22 * sc, 0, 0, TAU); c.fill();
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
  function moodOf(r) {
    if (r.spinT > 0.1) return "dizzy";
    if (r.inv > 0.3) return "ouch";
    if (r.wet > 0) return "wet";
    if (r.liftT > 0.15) return "wheee";
    params(riderS(r), P1);
    if (P1.rough > 0.5) return "wow";
    if (P1.rough < 0.05 && P1.dark < 0.3 && (r.isPlayer ? input.idle > 1.6 : Math.abs(r.vx) < 30) && Math.sin(G.t * 0.25 + r.phase) > -0.3) return "chill";
    return "happy";
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
    for (const d of G.decor) {
      if (!inView(d.s, 90)) continue;
      const y = objY(d.s), x = d.x;
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
    for (const d of G.decor) {
      if ((d.type !== "crystal" && d.type !== "lantern") || !inView(d.s, 90)) continue;
      const y = objY(d.s), r = d.type === "lantern" ? 46 : 36, fl = 0.85 + 0.15 * Math.sin(G.t * 5 + d.seed);
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

  function drawItems(c) {
    for (const o of G.objs) {
      if (o.dead || !inView(o.s)) continue;
      const y = objY(o.s), t = G.t + o.seed;
      switch (o.type) {
        case "shell": {
          c.save(); c.translate(o.x, y + Math.sin(t * 2) * 1.5); c.rotate(Math.sin(t) * 0.15);
          c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 14 + (t * 6) % 6, 0, TAU); c.stroke();
          c.fillStyle = "#FFC3B1"; c.beginPath(); c.moveTo(0, 8); c.arc(0, 8, 14, -Math.PI * 0.85, -Math.PI * 0.15); c.closePath(); c.fill();
          c.strokeStyle = "#E07D63"; c.lineWidth = 1.2; c.beginPath();
          for (let k = 1; k < 6; k++) { const a = -Math.PI * 0.85 + (k / 6) * Math.PI * 0.7; c.moveTo(0, 8); c.lineTo(Math.cos(a) * 14, 8 + Math.sin(a) * 14); }
          c.stroke(); c.fillStyle = "#E89A84"; c.fillRect(-3, 6, 6, 4);
          c.restore(); break;
        }
        case "star": {
          c.save(); c.translate(o.x, y); c.rotate(t * 0.6);
          c.fillStyle = "rgba(255,210,120,.3)"; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill();
          c.fillStyle = "#FF8A3D"; c.beginPath();
          for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? 6 : 14; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          c.closePath(); c.fill();
          c.fillStyle = "#FFD08A"; for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * 7, Math.sin(a) * 7, 1.3, 0, TAU); c.fill(); }
          c.restore(); break;
        }
        case "conch": {
          c.save(); c.translate(o.x, y + Math.sin(t * 2) * 2);
          const gr = c.createRadialGradient(0, 0, 0, 0, 0, 30); gr.addColorStop(0, "rgba(255,230,120,.7)"); gr.addColorStop(1, "rgba(255,230,120,0)");
          c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill();
          c.fillStyle = "#F5B82E"; c.beginPath(); c.moveTo(-12, 4); c.quadraticCurveTo(-6, -16, 12, -12); c.quadraticCurveTo(14, 4, 2, 12); c.closePath(); c.fill();
          c.fillStyle = "#FFE08A"; c.beginPath(); c.ellipse(2, -2, 6, 7, 0.5, 0, TAU); c.fill();
          c.strokeStyle = "#C98A10"; c.lineWidth = 1.2; c.beginPath(); c.arc(2, -2, 3, 0, 5); c.stroke();
          sparkle(c, 12 * Math.cos(t * 2), -14, 3 + Math.sin(t * 5)); sparkle(c, -12, 10 * Math.sin(t * 2), 2.5);
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
        case "ball": {
          c.save(); c.translate(o.x, y);
          c.fillStyle = "rgba(0,40,70,.22)"; c.beginPath(); c.ellipse(4, 6, 14, 12, 0, 0, TAU); c.fill();
          c.rotate(o.rot || 0);
          const cols = ["#FF4D4D", "#FFFFFF", "#FFD23F", "#FFFFFF", "#3D7BFF", "#FFFFFF"];
          cols.forEach((col, k) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 13, (k / 6) * TAU, ((k + 1) / 6) * TAU); c.closePath(); c.fill(); });
          c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill();
          c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(-5, -5, 3, 0, TAU); c.fill();
          c.restore(); break;
        }
      }
    }
  }
  function sparkle(c, x, y, s) { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * 0.4, y - s * 0.4); c.lineTo(x + s * 2, y); c.lineTo(x + s * 0.4, y + s * 0.4); c.lineTo(x, y + s * 2); c.lineTo(x - s * 0.4, y + s * 0.4); c.lineTo(x - s * 2, y); c.lineTo(x - s * 0.4, y - s * 0.4); c.fill(); }

  function drawRiders(c) {
    const list = G.riders.slice().sort((a, b) => a.py - b.py);
    for (const r of list) {
      const y = riderY(r), rr = (r.ripple % 1.8) / 1.8;
      c.strokeStyle = `rgba(255,255,255,${0.4 * (1 - rr)})`; c.lineWidth = 1.6;
      c.beginPath(); c.arc(r.x, y + 2, R + 3 + rr * 18, 0, TAU); c.stroke();
      if (r.inv > 0 && Math.floor(r.inv * 10) % 2) c.globalAlpha = 0.6;
      drawRider(c, r.x, y, r.rd, { rot: r.rot, lift: r.liftT > 0 ? Math.sin(Math.PI * (1 - r.liftT / 0.9)) : 0, mood: moodOf(r), t: G.t + r.phase, wet: r.wet });
      c.globalAlpha = 1;
      c.font = "800 10px Nunito, system-ui, sans-serif"; c.textAlign = "center";
      c.lineWidth = 3; c.strokeStyle = "rgba(10,50,80,.55)"; c.strokeText(r.rd.name, r.x, y + 40);
      c.fillStyle = r.isPlayer ? "#FFE58A" : "#FFFFFF"; c.fillText(r.rd.name, r.x, y + 40);
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
    for (const o of G.overheads) {
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
      } else if (o.type === "finish") {
        const q = riverAt(o.s), L = q.cx - q.hw - 14, Rr = q.cx + q.hw + 14;
        c.fillStyle = "#7A5230"; c.fillRect(L - 4, y - 10, 8, 20); c.fillRect(Rr - 4, y - 10, 8, 20);
        const n = Math.floor((Rr - L) / 10);
        for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) { c.fillStyle = (k + j) % 2 ? "#123049" : "#FFFFFF"; c.fillRect(L + k * 10, y - 8 + j * 8, 10, 8); }
        c.fillStyle = "#FF6B5B"; roundRect(c, 200 - 64, y - 30, 128, 22, 8); c.fill();
        c.fillStyle = "#fff"; c.font = "800 14px 'Baloo 2', system-ui, sans-serif"; c.textAlign = "center"; c.fillText("LAP COMPLETE", 200, y - 14);
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

  function render() {
    const c = ctx;
    c.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    c.save();
    if (G.shake > 0 && !reduced) c.translate((Math.random() - 0.5) * G.shake * 14, (Math.random() - 0.5) * G.shake * 10);
    drawBase(c); drawWater(c); drawCreatures(c); drawDecor(c); drawDark(c);
    drawWhirls(c); drawWaves(c); drawItems(c); drawRiders(c); drawOverheads(c); drawFx(c);
    c.restore();
  }

  // ---------- layout ----------
  function resize() {
    const r = $("#stage").getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    scale = r.width / W; viewH = r.height / scale; baseY = viewH * 0.7;
  }
  addEventListener("resize", resize);

  // ---------- flow ----------
  function freshStats() { return { shells: 0, gems: 0, critters: 0, waves: 0, soaks: 0, bonks: 0, spins: 0, crewTime: 0 }; }
  function start() {
    Snd.init(); Snd.resume(); Snd.quiet(false);
    store.set("rider", G.rider);
    buildLap(); setupRiders();
    Object.assign(G, { running: true, paused: false, attract: false, t: 0, camS: 0, score: 0, stats: freshStats(), zoneI: -1, crew: false, parts: [], pops: [], finishing: false, finishT: 0 });
    input.idle = 0; input.active = false;
    $("#score").textContent = "0";
    $("#startScreen").hidden = true; $("#endScreen").hidden = true; $("#pauseScreen").hidden = true; $("#hud").hidden = false; $("#crew").hidden = true;
  }
  function endLap() {
    G.running = false; Snd.quiet(true);
    $("#hud").hidden = true; $("#banner").classList.remove("show");
    const st = G.stats, score = G.score;
    const bests = store.get("best", {}); const prev = bests[G.rider] || 0;
    if (score > prev) { bests[G.rider] = score; store.set("best", bests); }
    $("#endScore").textContent = score;
    $("#endRank").textContent = score >= 200 ? "Lazy River Legend" : score >= 130 ? "Captain of the Current" : score >= 70 ? "Tube Pro" : "Splash Rookie";
    $("#endBest").textContent = score > prev && prev > 0 ? `New best for ${RIDERS[G.rider].name}! (old best: ${prev})` : score > prev ? `${RIDERS[G.rider].name}'s first lap is on the board.` : `${RIDERS[G.rider].name}'s best: ${prev}`;
    const rows = [["Turtles & rays waved at", st.critters], ["Waves ridden", st.waves], ["Grotto gems", st.gems], ["Times soaked", st.soaks], ["Rocks bonked", st.bonks], ["Whirlpool spins", st.spins]];
    $("#endStats").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("") + `<div style="grid-column:1/-1"><dt>Float party time (crew together)</dt><dd>${Math.round(st.crewTime)}s</dd></div>`;
    $("#endScreen").hidden = false;
    toAttract();
  }
  function toAttract() { G.attract = true; }
  function setPaused(p) {
    G.paused = p; $("#pauseScreen").hidden = !p; Snd.quiet(p);
    if (!p) Snd.resume();
  }

  // Idle river behind the menus
  function attract(dt) {
    G.t += dt; G.camS += 45 * dt;
    if (G.camS > STARTS[1] - 500) G.camS = 200;
    const q = riverAt(G.camS);
    G.riders.forEach((r, k) => {
      r.x = lerp(r.x, q.cx + [0, -62, 62][k] + Math.sin(G.t * 0.6 + k * 2) * 18, 0.05);
      r.py = lerp(r.py, [0, 52, 60][k] - 120 + Math.sin(G.t * 0.5 + k) * 8, 0.05);
      r.rot = Math.sin(G.t * 0.7 + r.phase) * 0.2; r.liftT = 0; r.inv = 0; r.spinT = 0; r.ripple += dt;
    });
    updateFx(dt);
  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (G.running && !G.paused) update(dt);
    else if (G.attract && !G.running) attract(dt);
    render();
  }

  // ---------- menus ----------
  function buildMenus() {
    const box = $("#riders");
    ORDER.forEach((k) => {
      const b = document.createElement("button");
      b.className = "rider"; b.type = "button"; b.dataset.k = k; b.setAttribute("aria-pressed", String(k === G.rider));
      const cv = document.createElement("canvas"); cv.width = 156; cv.height = 156;
      const c = cv.getContext("2d");
      const gr = c.createRadialGradient(78, 70, 10, 78, 78, 78); gr.addColorStop(0, "#6FE0E6"); gr.addColorStop(1, "#23A6C6");
      c.fillStyle = gr; c.beginPath(); c.arc(78, 78, 76, 0, TAU); c.fill();
      c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 3; c.beginPath(); c.arc(78, 84, 66, 0.2, 1.2); c.stroke();
      drawRider(c, 78, 78, RIDERS[k], { scale: 2.1, mood: k === "ellie" ? "chill" : k === "jonah" ? "wheee" : "happy", t: 0.5 });
      b.append(cv, document.createTextNode(RIDERS[k].name));
      b.addEventListener("click", () => {
        G.rider = k; store.set("rider", k);
        box.querySelectorAll(".rider").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.k === k)));
        setupRiders();
      });
      box.append(b);
    });
    const seen = new Set();
    $("#zoneList").innerHTML = LAP.map(([k]) => k).filter((k) => !seen.has(k) && seen.add(k))
      .map((k) => `<li><i style="background:${ZONES[k].color}"></i><b>${ZONES[k].name}</b><span>${ZONES[k].sub}</span></li>`).join("");
    $("#mapTrack").innerHTML = LAP.map(([k, len], i) => {
      const seg = i === LAP.length - 1 ? len - (LAP_LEN - FINISH) : len;
      return `<i style="flex:${seg};background:${ZONES[k].color}"></i>`;
    }).join("");
  }

  const muteBtn = $("#muteBtn");
  function syncMute() { muteBtn.classList.toggle("muted", Snd.muted); muteBtn.setAttribute("aria-label", Snd.muted ? "Sound on" : "Sound off"); }
  muteBtn.addEventListener("click", () => { Snd.init(); Snd.setMuted(!Snd.muted); syncMute(); });
  $("#pauseBtn").addEventListener("click", () => setPaused(true));
  $("#resumeBtn").addEventListener("click", () => setPaused(false));
  $("#quitBtn").addEventListener("click", () => { setPaused(false); G.running = false; $("#hud").hidden = true; $("#startScreen").hidden = false; toAttract(); });
  $("#startBtn").addEventListener("click", start);
  $("#againBtn").addEventListener("click", start);
  $("#switchBtn").addEventListener("click", () => { $("#endScreen").hidden = true; $("#startScreen").hidden = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && G.running && !G.paused) setPaused(true); });

  resize(); buildMenus(); syncMute(); buildLap(); setupRiders(); G.camS = 200;
  requestAnimationFrame(frame);

  // test hook
  window.__lazyRiver = { G, start, endLap };
})();
