// Splash Down: an inner-tube ride down three water slides.
// The slide is drawn old-arcade-racer style: a strip of segments projected from a camera
// that rides just behind you, painted far to near. Each segment is a ring of quads around
// the tube, so the walls, tunnels and the curve of the trough all come from one routine.

(() => {
  const { SEG, R, LIP, SLIDES, build, yAt, newRider, step, autopilot, par, PHYS } = window.WS;

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, k = 1) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(hover: none), (pointer: coarse)").matches;
  const fmt = (t) => t.toFixed(1);
  const DISPLAY = "'Lilita One', 'Arial Rounded MT Bold', system-ui, sans-serif";

  // ---------- save ----------
  const KEY = "splashDown.v1";
  const save = { best: {}, muted: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {} };

  // ---------- canvas + camera ----------
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, F = 1, HZ = 0, CAM_H = 900, CAM_BACK = 1200, PIVOT = 0;
  const NEAR = 60, DRAW = 140;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const portrait = W < H;
    CAM_BACK = portrait ? 1100 : 1300;
    CAM_H = portrait ? 950 : 620;
    HZ = H * 0.44;
    // pick the focal length so the tube fills most of the width where the rider is
    F = ((portrait ? 0.95 : 0.52) * W * CAM_BACK) / (2 * R);
    F = Math.min(F, ((H * 0.8 - HZ) * CAM_BACK) / CAM_H);
    PIVOT = HZ + (CAM_H * F) / CAM_BACK;
    hills = null;
  }

  // ---------- look ----------
  const THEMES = {
    morning: { sky: ["#4FBEF7", "#A8E3FF", "#FFF4D6"], sun: [0.8, 0.16, "255,246,200"], haze: [214, 240, 250], ground: ["#A6EBDD", "#3CC0AE", "#16827C"], hill: "#3F9E7E", hill2: "#7ACB9F", palm: "#1F6A55" },
    noon: { sky: ["#1F8BF0", "#6CC6FF", "#D9F3FF"], sun: [0.25, 0.1, "255,255,235"], haze: [200, 232, 252], ground: ["#8FE2F0", "#29B3D1", "#0E6F96"], hill: "#2E7FA0", hill2: "#5FB7C9", palm: "#135572" },
    sunset: { sky: ["#241447", "#A8437C", "#FFAE6A"], sun: [0.34, 0.36, "255,214,150"], haze: [236, 146, 128], ground: ["#E08A7A", "#6B3B6E", "#24163F"], hill: "#4A2458", hill2: "#7A3A6A", palm: "#1A0E2C" },
  };
  const RIM = [250, 250, 246], SHELL = [226, 232, 238], WATER = [150, 228, 255];

  // A strip of distant hills, palms and other slides, painted once and scrolled with the curves.
  let hills = null;
  function paintHills(th) {
    const w = Math.max(1100, Math.round(W * 1.3)), h = Math.round(clamp(H * 0.2, 90, 200));
    const c = document.createElement("canvas");
    c.width = w * DPR; c.height = h * DPR;
    const g = c.getContext("2d");
    g.scale(DPR, DPR);
    const wave = (amp, base, freqs, col) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const t = (x / w) * Math.PI * 2;
        g.lineTo(x, h - base - amp * (0.5 + 0.5 * Math.sin(t * freqs[0] + 1) * Math.cos(t * freqs[1])));
      }
      g.lineTo(w, h); g.fill();
    };
    wave(h * 0.35, h * 0.25, [2, 3], th.hill2);
    // other slides' towers and loops in the distance
    g.strokeStyle = th.hill; g.fillStyle = th.hill; g.lineWidth = 7; g.lineCap = "round";
    for (const [fx, tall] of [[0.18, 0.9], [0.52, 0.75], [0.8, 1]]) {
      const x = fx * w, top = h * (1 - tall);
      g.fillRect(x - 10, top, 20, h - top);
      g.beginPath(); g.moveTo(x, top + 6);
      for (let k = 0; k < 40; k++) g.lineTo(x + 26 + k * 3 + 18 * Math.sin(k / 4), top + 6 + k * (h - top) / 42 + 14 * Math.cos(k / 4));
      g.stroke();
    }
    wave(h * 0.22, h * 0.05, [3, 2], th.hill);
    g.fillStyle = th.palm; g.strokeStyle = th.palm;
    for (let i = 0; i < 16; i++) {
      const x = ((i * 0.618) % 1) * w, s = 0.6 + ((i * 0.37) % 1) * 0.7, top = h - 70 * s;
      g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 8 * s, h - 35 * s, x + 4 * s, top); g.stroke();
      for (let f = 0; f < 6; f++) {
        const a = -Math.PI / 2 + (f - 2.5) * 0.55;
        g.beginPath(); g.moveTo(x + 4 * s, top);
        g.quadraticCurveTo(x + 4 * s + Math.cos(a) * 22 * s, top + Math.sin(a) * 18 * s - 8 * s, x + 4 * s + Math.cos(a) * 34 * s, top + Math.sin(a) * 14 * s + 12 * s);
        g.lineWidth = 5 * s; g.stroke();
      }
    }
    hills = { c, w, h, theme: th };
  }

  // ---------- sprites ----------
  function sprite(size, draw) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d"); draw(g, size); return c;
  }
  const DUCK = sprite(256, (g) => {
    g.translate(128, 150);
    g.fillStyle = "rgba(0,0,0,.12)"; g.beginPath(); g.ellipse(0, 88, 92, 16, 0, 0, 7); g.fill();
    g.fillStyle = "#FFCE1F"; g.strokeStyle = "#E0A400"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-96, 20); g.quadraticCurveTo(-108, -30, -76, -20); g.quadraticCurveTo(-40, 20, 0, 18);
    g.quadraticCurveTo(70, 10, 92, 30); g.quadraticCurveTo(96, 88, 0, 88); g.quadraticCurveTo(-92, 88, -96, 20); g.fill(); g.stroke();
    g.beginPath(); g.arc(34, -38, 54, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#FF8A1F"; g.beginPath(); g.moveTo(78, -44); g.quadraticCurveTo(122, -40, 118, -22); g.quadraticCurveTo(96, -14, 76, -22); g.fill();
    g.fillStyle = "#1B1B1B"; g.beginPath(); g.arc(46, -52, 9, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(49, -55, 3.2, 0, 7); g.fill();
    g.strokeStyle = "#E0A400"; g.beginPath(); g.moveTo(-40, 40); g.quadraticCurveTo(0, 30, 30, 50); g.stroke();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(14, -66, 18, 9, -0.5, 0, 7); g.fill();
  });
  const BALL = sprite(256, (g) => {
    g.translate(128, 128);
    const cols = ["#FF4D4D", "#FFFFFF", "#2F8CFF", "#FFD23F", "#FFFFFF", "#2FC77A"];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, 0);
      g.ellipse(0, 0, 118, 118, 0, (i / 6) * Math.PI * 2 - 1.2, ((i + 1) / 6) * Math.PI * 2 - 1.2); g.fill();
    }
    g.fillStyle = "#fff"; g.beginPath(); g.arc(-20, -30, 22, 0, 7); g.fill();
    const sh = g.createRadialGradient(-40, -50, 10, 0, 0, 122);
    sh.addColorStop(0, "rgba(255,255,255,.45)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(0,0,0,.28)");
    g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 118, 0, 7); g.fill();
  });

  // the rider, from behind, sitting in an inner tube. Units are world units; 0,0 is where the tube touches the water.
  function drawRider(g, x, y, sc, rot, lean, armsUp, t, alpha = 1) {
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
    g.fillStyle = "rgba(255,255,255,.55)";
    g.beginPath(); g.ellipse(0, -8, 320, 70, 0, 0, 7); g.fill();
    const tube = (a0, a1) => {
      g.lineWidth = 92; g.strokeStyle = "#FF5E62";
      g.beginPath(); g.ellipse(0, -80, 245, 96, 0, a0, a1); g.stroke();
      g.lineWidth = 22; g.strokeStyle = "rgba(255,255,255,.4)";
      g.beginPath(); g.ellipse(0, -100, 245, 90, 0, a0 + 0.15, a1 - 0.15); g.stroke();
    };
    tube(Math.PI, Math.PI * 2);
    g.save();
    g.translate(0, -90); g.rotate(lean * 0.3); g.translate(0, 90);
    // arms: hold the handles, or fling them up when you're flying
    const sh = [[-80, -285], [80, -285]];
    const hands = [[lerp(-215, -200, armsUp), lerp(-120, -470, armsUp) + Math.sin(t * 9) * 12 * armsUp], [lerp(215, 200, armsUp), lerp(-120, -470, armsUp) + Math.cos(t * 9) * 12 * armsUp]];
    g.lineCap = "round"; g.lineWidth = 46; g.strokeStyle = "#E9A97F";
    for (let i = 0; i < 2; i++) {
      g.beginPath(); g.moveTo(sh[i][0], sh[i][1]);
      g.quadraticCurveTo(sh[i][0] * 1.9, lerp(-200, -380, armsUp), hands[i][0], hands[i][1]); g.stroke();
    }
    // rash guard
    g.fillStyle = "#FFD23F";
    g.beginPath(); g.moveTo(-92, -300); g.quadraticCurveTo(0, -330, 92, -300); g.lineTo(80, -70); g.quadraticCurveTo(0, -50, -80, -70); g.closePath(); g.fill();
    g.fillStyle = "#1FA6D6"; g.fillRect(-86, -210, 172, 34);
    // head from behind: hair, ears, goggle strap
    g.fillStyle = "#E9A97F";
    g.beginPath(); g.arc(-66, -380, 16, 0, 7); g.arc(66, -380, 16, 0, 7); g.fill();
    g.fillStyle = "#4A2E1E"; g.beginPath(); g.arc(0, -392, 70, 0, 7); g.fill();
    g.fillStyle = "#3A6FF7"; g.fillRect(-70, -402, 140, 18);
    g.restore();
    tube(0, Math.PI);
    g.restore();
  }

  // ---------- audio ----------
  let ac = null, master = null, rushGain = null, rushFilter = null;
  function audio() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    master = ac.createGain(); master.gain.value = save.muted ? 0 : 0.8; master.connect(ac.destination);
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    rushFilter = ac.createBiquadFilter(); rushFilter.type = "lowpass"; rushFilter.frequency.value = 600;
    rushGain = ac.createGain(); rushGain.gain.value = 0;
    src.connect(rushFilter).connect(rushGain).connect(master); src.start();
  }
  let noiseBuf = null;
  function tone(f1, f2, dur, type = "sine", vol = 0.2, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(dur, f1, f2, vol, type = "lowpass", delay = 0) {
    if (!ac || !noiseBuf) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.Q.value = 0.8;
    fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(gn).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const sfx = {
    duck() { tone(900, 1500, 0.08, "square", 0.06); tone(1300, 1900, 0.07, "square", 0.05, 0.07); },
    bonk() { tone(260, 90, 0.2, "sine", 0.4); hiss(0.15, 2000, 400, 0.2); },
    boost() { hiss(0.5, 600, 6000, 0.25, "bandpass"); tone(300, 900, 0.3, "sawtooth", 0.05); },
    whistle() { for (const f of [2300, 2380]) { tone(f, f, 0.18, "square", 0.05); tone(f, f, 0.3, "square", 0.05, 0.22); } },
    splash() { hiss(1.4, 4000, 200, 0.7); hiss(0.4, 800, 200, 0.5, "lowpass", 0.05); tone(160, 60, 0.4, "sine", 0.3); },
    beep(hi) { tone(hi ? 1320 : 660, hi ? 1320 : 660, hi ? 0.35 : 0.14, "triangle", 0.25); },
    star(i) { tone(880 * [1, 1.25, 1.5][i], 880 * [1, 1.25, 1.5][i] * 2, 0.18, "triangle", 0.15); },
    whoa() { tone(500, 380, 0.25, "triangle", 0.06); },
  };
  function syncMute() {
    $("#muteBtn").innerHTML = save.muted
      ? '<svg viewBox="0 0 24 24" fill="#fff"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="#fff"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
    $("#muteBtn").setAttribute("aria-label", save.muted ? "Sound off" : "Sound on");
    if (master) master.gain.value = save.muted ? 0 : 0.8;
  }

  // ---------- input ----------
  const keys = { l: false, r: false };
  const pads = { l: new Set(), r: new Set() };
  const steerInput = () => (keys.r || pads.r.size ? 1 : 0) - (keys.l || pads.l.size ? 1 : 0);
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") { keys.l = true; e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { keys.r = true; e.preventDefault(); }
    else if ((k === "p" || k === "escape") && (G.state === "ride" || G.state === "count" || G.state === "wipe")) togglePause();
    else if ((k === "enter" || k === " ") && G.state === "results" && !$("#results").hidden) { e.preventDefault(); (G.slideIdx < SLIDES.length - 1 && !$("#nextBtn").hidden ? $("#nextBtn") : $("#againBtn")).click(); }
  });
  addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") keys.l = false;
    if (k === "arrowright" || k === "d") keys.r = false;
  });
  for (const [id, side] of [["#padL", "l"], ["#padR", "r"]]) {
    const el = $(id);
    const off = (e) => { pads[side].delete(e.pointerId); el.classList.toggle("on", pads[side].size > 0); };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); pads[side].add(e.pointerId); el.classList.add("on"); audio(); });
    el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // ---------- game state ----------
  const G = {
    state: "title", slideIdx: 0, C: null, p: null, t: 0, timer: 0, clock: 0, penalty: 0,
    ducks: 0, wipes: 0, topSpeed: 0, safe: 0, camTh: 0, skyX: 0, paused: false,
    fly: null, // wipeout or finish animation
    demo: null,
  };
  const parts = [], pops = [];

  function startDemo() {
    const C = build(SLIDES[G.slideIdx]), p = newRider();
    p.speed = 3000;
    G.demo = { C, p };
  }

  function startRide(i) {
    audio();
    G.slideIdx = i;
    G.C = build(SLIDES[i]);
    G.p = newRider();
    Object.assign(G, { state: "count", timer: 3, clock: 0, penalty: 0, ducks: 0, wipes: 0, topSpeed: 0, safe: 0, camTh: 0, fly: null, paused: false, lastBeep: 4 });
    parts.length = 0; pops.length = 0;
    for (const o of ["#title", "#results", "#paused"]) $(o).hidden = true;
    for (const o of ["#hud", "#progress", "#speedo"]) $(o).hidden = false;
    $("#pads").hidden = false;
    hills = null;
  }

  function toMenu() {
    G.state = "title"; G.paused = false;
    for (const o of ["#hud", "#progress", "#speedo", "#lean", "#results", "#paused", "#pads"]) $(o).hidden = true;
    $("#title").hidden = false;
    renderMenu();
    startDemo();
    hills = null;
    if (rushGain) rushGain.gain.value = 0;
  }

  function togglePause() {
    G.paused = !G.paused;
    $("#paused").hidden = !G.paused;
    $("#pausedSlide").textContent = SLIDES[G.slideIdx].name;
    if (G.paused) { $("#resumeBtn").focus(); if (rushGain) rushGain.gain.value = 0; }
  }

  function unlocked(i) { return i === 0 || !!save.best[SLIDES[i - 1].id]; }

  const WAVE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>';
  const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function starsHTML(n) { return [0, 1, 2].map((i) => `<span class="${i < n ? "on" : ""}">★</span>`).join(""); }
  function renderMenu() {
    const list = $("#slideList");
    list.innerHTML = "";
    SLIDES.forEach((s, i) => {
      const b = save.best[s.id], open = unlocked(i);
      const btn = document.createElement("button");
      btn.className = "slide-card"; btn.type = "button"; btn.disabled = !open;
      btn.style.setProperty("--c", css(s.id === "black" ? [40, 42, 56] : s.body));
      btn.style.setProperty("--c2", s.id === "black" ? "#FFC400" : css(mixRGB(s.body, [255, 255, 255], 0.45)));
      btn.innerHTML = `<span class="dot"${s.id === "black" ? ' style="box-shadow: inset 0 -4px 0 #FFC400"' : ""}>${open ? WAVE_ICON : LOCK_ICON}</span>
        <span><span class="lvl">${s.level}</span><h3>${s.name}</h3><p>${open ? s.blurb : `Finish ${SLIDES[i - 1].name} to unlock.`}</p></span>
        <span class="stars">${starsHTML(b ? b.stars : 0)}<small>${b ? `Best ${fmt(b.time)}s` : `Par ${par(s)}s`}</small></span>`;
      btn.onclick = () => startRide(i);
      btn.onmouseenter = () => { if (open && G.state === "title" && G.slideIdx !== i) { G.slideIdx = i; startDemo(); hills = null; } };
      list.appendChild(btn);
    });
  }

  // ---------- update ----------
  const H_STEP = 1 / 120;
  function handle(ev, p) {
    for (const e of ev) {
      if (e === "boost") { sfx.boost(); pop("BOOST!", "#FFD23F"); }
      else if (e === "wipe") wipeout();
      else if (e === "finish") finish();
      else if (e.kind === "duck") { G.ducks++; sfx.duck(); pop("+1", "#FFE14D", true); }
      else if (e.kind === "ball") { sfx.bonk(); pop("BONK!", "#FF6B6B"); shake = 0.35; }
      if (G.state !== "ride") break;
    }
  }

  function wipeout() {
    G.state = "wipe"; G.timer = 1.5; G.wipes++; G.penalty += 3;
    G.fly = { kind: "wipe", t: 0, dir: Math.sign(G.p.th) || 1, th: G.p.th };
    sfx.whistle(); shake = 0.5;
    pop("WIPEOUT!  +3s", "#FF6B6B");
    $("#timeChip").classList.add("pen");
    setTimeout(() => $("#timeChip").classList.remove("pen"), 1200);
  }

  function finish() {
    G.state = "finish"; G.timer = 0;
    G.fly = { kind: "finish", t: 0, z: G.p.z, y: G.C.endY, vy: -G.C.segs[G.C.segs.length - 1].slope * G.p.speed, speed: G.p.speed, splashed: false, camZ: G.p.z - CAM_BACK };
  }

  function results() {
    G.state = "results";
    const s = SLIDES[G.slideIdx], C = G.C, total = G.clock + G.penalty, p = par(s);
    const duckGoal = Math.ceil(C.ducks * 0.6);
    const stars = 1 + (G.ducks >= duckGoal ? 1 : 0) + (total <= p ? 1 : 0);
    if (window.RosenbergBridge) RosenbergBridge.report({ score: G.ducks, stars });
    const prev = save.best[s.id];
    const better = !prev || stars > prev.stars || (stars === prev.stars && total < prev.time);
    const fastest = !prev || total < prev.time;
    if (better || fastest) {
      save.best[s.id] = { stars: Math.max(stars, prev ? prev.stars : 0), time: Math.min(total, prev ? prev.time : Infinity), ducks: Math.max(G.ducks, prev ? prev.ducks : 0) };
      persist();
    }
    $("#resSlide").textContent = s.name;
    $("#resStars").innerHTML = starsHTML(stars);
    $("#resBest").innerHTML = prev && fastest ? '<span class="new-best">New best time</span>' : "";
    const row = (label, val, note, ok) => `<li><span>${label}</span><span><b>${val}</b>${note ? `<em class="${ok ? "" : "miss"}">${note}</em>` : ""}</span></li>`;
    $("#resStats").innerHTML =
      row("Time", fmt(total) + "s", total <= p ? `★ under par ${p}s` : `par ${p}s`, total <= p) +
      row("Rubber ducks", `${G.ducks} / ${C.ducks}`, G.ducks >= duckGoal ? "★ 60%+" : `need ${duckGoal}`, G.ducks >= duckGoal) +
      row("Wipeouts", G.wipes, G.wipes ? `+${G.wipes * 3}s` : "clean ride", !G.wipes) +
      row("Top speed", Math.round(G.topSpeed / 110) + " mph");
    const next = G.slideIdx + 1;
    $("#nextBtn").hidden = next >= SLIDES.length;
    $("#results").hidden = false;
    for (const o of ["#hud", "#progress", "#speedo", "#lean", "#pads"]) $(o).hidden = true;
    for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 250 + i * 180);
    ($("#nextBtn").hidden ? $("#againBtn") : $("#nextBtn")).focus({ preventScroll: true });
  }

  let shake = 0;
  function update(dt) {
    G.t += dt;
    shake = Math.max(0, shake - dt);
    if (G.state === "title" && G.demo) {
      const { C, p } = G.demo;
      for (let a = 0; a < dt; a += H_STEP) {
        const ev = step(p, C, autopilot(p, C), H_STEP);
        if (ev.includes("finish") || ev.includes("wipe")) { startDemo(); break; }
      }
      G.camTh += (p.th - G.camTh) * Math.min(1, dt * 5);
      spray(G.demo.p, dt);
      G.skyX += curveAt(C, p.z) * p.speed * dt * 0.0009;
    } else if (G.state === "count") {
      G.timer -= dt;
      const n = Math.ceil(G.timer);
      if (n < G.lastBeep && n > 0) { sfx.beep(false); G.lastBeep = n; }
      if (G.timer <= 0) { G.state = "ride"; sfx.beep(true); G.p.speed = 2400; pop("GO!", "#FFD23F"); }
    } else if (G.state === "ride") {
      const s = steerInput();
      G.clock += dt;
      for (let a = 0; a < dt && G.state === "ride"; a += H_STEP) handle(step(G.p, G.C, s, H_STEP), G.p);
      G.topSpeed = Math.max(G.topSpeed, G.p.speed);
      G.safe = Math.max(0, G.safe - dt);
      const danger = !segAt(G.C, G.p.z).tunnel && Math.abs(G.p.th) > 1.2;
      if (danger && !G.wasDanger) sfx.whoa();
      G.wasDanger = danger;
    } else if (G.state === "wipe") {
      G.timer -= dt; G.fly.t += dt;
      const p = G.p;
      p.speed = Math.max(900, p.speed - 5000 * dt);
      p.z = Math.min(G.C.length - SEG * 6, p.z + p.speed * dt);
      p.th *= Math.max(0, 1 - dt * 3); p.om = 0;
      if (G.timer <= 0) { G.state = "ride"; p.th = 0; p.om = 0; p.steer = 0; p.speed = PHYS.VMIN; G.safe = 1.2; G.fly = null; }
    } else if (G.state === "finish") {
      const f = G.fly;
      G.timer += dt; f.t += dt;
      if (!f.splashed) {
        f.z += f.speed * dt; f.vy -= 9000 * dt; f.y += f.vy * dt;
        f.speed *= 1 - dt * 0.4;
        if (f.y < G.C.endY - 900) { f.splashed = true; f.at = G.timer; sfx.splash(); f.burst = true; }
      } else if (G.timer - f.at > 1.3 && $("#results").hidden) results();
    }
    if (G.state === "ride" || G.state === "count") spray(G.p, dt);
    if (G.state === "ride" || G.state === "wipe") {
      G.camTh += (G.p.th - G.camTh) * Math.min(1, dt * 5);
      G.skyX += curveAt(G.C, G.p.z) * G.p.speed * dt * 0.0009;
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 1400 * dt * q.g;
      if (q.life <= 0) parts.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].life -= dt; if (pops[i].life <= 0) pops.splice(i, 1); }

    // sound of the water under you
    if (rushGain && ac) {
      const riding = !G.paused && (G.state === "ride" || G.state === "count");
      const v = riding ? G.p.speed : 0;
      rushGain.gain.setTargetAtTime(riding ? clamp(0.05 + v / 40000, 0, 0.3) : 0, ac.currentTime, 0.1);
      const inTunnel = riding && segAt(G.C, G.p.z).tunnel;
      rushFilter.frequency.setTargetAtTime(inTunnel ? 350 + v * 0.05 : 500 + v * 0.18, ac.currentTime, 0.1);
    }
  }
  const segAt = (C, z) => C.segs[clamp(Math.floor(z / SEG), 0, C.segs.length - 1)];
  const curveAt = (C, z) => segAt(C, z).curve;

  // spray is spawned in screen space around the rider, which render() leaves in G.rider
  function spray(p, dt) {
    const r = G.rider;
    if (!r || reduced) return;
    const n = Math.min(6, (p.speed / 1200) * dt * 60 * 0.6);
    for (let i = 0; i < n; i++) {
      if (Math.random() > n - i) break;
      const side = Math.random() < 0.5 ? -1 : 1;
      const lx = side * 250 * r.sc, ang = r.rot;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      parts.push({
        x: r.x + lx * ca, y: r.y + lx * sa - 40 * r.sc, g: 1,
        vx: side * rand(120, 320) * ca + rand(-40, 40), vy: -rand(160, 420) + side * 200 * sa,
        life: rand(0.25, 0.5), max: 0.5, r: rand(3, 7) * (r.sc * 5 + 0.4), c: "255,255,255",
      });
    }
  }
  function burst(x, y, sc, n, big) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2), s = rand(300, big ? 1500 : 800);
      parts.push({ x, y, vx: Math.cos(a) * s * 0.7, vy: Math.sin(a) * s, g: 1.2, life: rand(0.5, 1.2), max: 1.2, r: rand(4, 11) * sc, c: Math.random() < 0.6 ? "255,255,255" : "170,235,255" });
    }
  }
  function pop(text, color, small) {
    const r = G.rider;
    pops.push({ text, color, life: 1, x: r ? r.x : W / 2, y: r ? r.y - (small ? 180 : 260) * r.sc : H / 2, small });
  }

  // ---------- render ----------
  const PJ = [];
  const ringTab = (K, a) => { const s = [], c = []; for (let j = 0; j <= K; j++) { const t = -a + (2 * a * j) / K; s.push(Math.sin(t)); c.push(1 - Math.cos(t)); } return { K, s, c, a }; };
  const LOD = [
    { open: ringTab(14, LIP), tube: ringTab(24, Math.PI) },
    { open: ringTab(8, LIP), tube: ringTab(14, Math.PI) },
    { open: ringTab(6, LIP), tube: ringTab(10, Math.PI) },
  ];

  function render() {
    const inRide = G.state !== "title";
    const C = inRide ? G.C : G.demo && G.demo.C;
    const p = inRide ? G.p : G.demo && G.demo.p;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!C) { ctx.fillStyle = "#0B4A6F"; ctx.fillRect(0, 0, W, H); return; }
    const slide = C.slide, th = THEMES[slide.theme];
    if (!hills || hills.theme !== th) paintHills(th);

    // camera
    const camTh = clamp(G.camTh, -2.4, 2.4);
    const finishing = G.state === "finish" || G.state === "results";
    const camZ = finishing && G.fly ? G.fly.camZ : p.z - CAM_BACK;
    const camX = R * Math.sin(camTh) * 0.5;
    const camY = yAt(C, Math.max(0, camZ)) + CAM_H + R * (1 - Math.cos(camTh)) * 0.42;
    const roll = clamp(camTh * 0.45, -1.2, 1.2);

    ctx.save();
    if (shake > 0 && !reduced) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 10);
    ctx.translate(W / 2, PIVOT); ctx.rotate(roll); ctx.translate(-W / 2, -PIVOT);
    drawBackground(th, slide);

    // project segments
    const segs = C.segs, N = segs.length;
    const base = Math.max(0, Math.floor(camZ / SEG));
    const frac = camZ / SEG - base;
    let x = 0, dx = -(segs[Math.min(base, N - 1)].curve * frac);
    let count = 0;
    for (let k = 0; k < DRAW && base + k < N; k++) {
      const s = segs[base + k];
      const z1 = (base + k) * SEG - camZ;
      const o = PJ[k] || (PJ[k] = {});
      o.s = s; o.k = k; o.z1 = z1;
      let xa = x, xb = x + dx, ya = s.y, yb = s.y2, za = z1, zb = z1 + SEG;
      x += dx; dx += s.curve;
      count = k + 1;
      o.rx1 = xa; o.rx2 = xb;
      if (zb <= NEAR) { o.skip = true; continue; }
      o.skip = false;
      if (za < NEAR) { const t = (NEAR - za) / SEG; xa = lerp(xa, xb, t); ya = lerp(ya, yb, t); za = NEAR; }
      const s1 = F / za, s2 = F / zb;
      o.x1 = W / 2 + (xa - camX) * s1; o.y1 = HZ - (ya - camY) * s1; o.k1 = s1;
      o.x2 = W / 2 + (xb - camX) * s2; o.y2 = HZ - (yb - camY) * s2; o.k2 = s2;
    }
    const endVisible = base + count >= N;
    const end = { x, dx, z: N * SEG - camZ };
    if (endVisible) drawPool(C, end, camX, camY);

    ctx.lineJoin = "round";
    for (let k = count - 1; k >= 0; k--) {
      const o = PJ[k];
      if (o.skip) continue;
      drawSegment(o, slide, th, k / DRAW);
    }

    // rider
    const riderShown = inRide ? !(G.state === "finish" && G.fly && G.fly.splashed) && G.state !== "results" : true;
    G.rider = null;
    if (G.state === "finish" || G.state === "results") {
      const f = G.fly, zr = f.z - camZ;
      const xr = end.x + (end.dx * (f.z - C.length)) / SEG;
      const sc = F / Math.max(NEAR, zr);
      G.rider = { x: W / 2 + (xr - camX) * sc, y: HZ - (f.y - camY) * sc, sc, rot: 0 };
      if (f.burst) { burst(G.rider.x, G.rider.y, clamp(sc * 3, 0.4, 2), 90, true); f.burst = false; }
      if (riderShown) drawRider(ctx, G.rider.x, G.rider.y, sc, 0, 0, 1, G.t);
    } else {
      const kk = PJ.findIndex((o, i) => i < count && o.z1 <= CAM_BACK && o.z1 + SEG > CAM_BACK);
      if (kk >= 0 && !PJ[kk].skip) {
        const o = PJ[kk], t = (CAM_BACK - o.z1) / SEG;
        const cx = lerp(o.rx1, o.rx2, t), cy = lerp(o.s.y, o.s.y2, t);
        const sc = F / CAM_BACK;
        const rth = p.th, rr = R - 30;
        const bx = W / 2 + (cx - camX + Math.sin(rth) * rr) * sc;
        const by = HZ - (cy - camY + (1 - Math.cos(rth)) * rr) * sc;
        G.rider = { x: bx, y: by, sc, rot: -rth };
        const lean = inRide ? (p.steer || 0) : autopilot(p, C);
        const armsUp = clamp((p.speed - 4600) / 1800, 0, 1);
        if (G.state === "wipe") {
          const f = G.fly, u = f.t;
          const fx = bx + f.dir * u * W * 0.9, fy = by - u * H * 0.9 + u * u * H * 0.55;
          drawRider(ctx, fx, fy, sc * (1 - u * 0.3), -f.th + f.dir * u * 9, 0, 1, G.t, clamp(1.3 - u, 0, 1));
        } else if (!(G.safe > 0 && Math.floor(G.t * 12) % 2)) {
          drawRider(ctx, bx, by, sc, -rth, lean, armsUp, G.t);
        }
      }
    }

    for (const q of parts) {
      ctx.fillStyle = `rgba(${q.c},${clamp(q.life / q.max, 0, 1) * 0.85})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill();
    }
    ctx.restore();

    drawOverlays(p);
  }

  function drawBackground(th, slide) {
    const ext = Math.hypot(W, H);
    const g = ctx.createLinearGradient(0, HZ - H * 0.7, 0, HZ);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(-ext, HZ - ext * 1.5, W + ext * 2, ext * 1.5 + 2);
    // sun
    const sx = W * th.sun[0] - ((G.skyX * 0.3) % (W * 2)), sy = HZ - H * (0.44 - th.sun[1]);
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.25);
    sg.addColorStop(0, `rgba(${th.sun[2]},1)`); sg.addColorStop(0.12, `rgba(${th.sun[2]},.95)`); sg.addColorStop(0.14, `rgba(${th.sun[2]},.35)`); sg.addColorStop(1, `rgba(${th.sun[2]},0)`);
    ctx.fillStyle = sg; ctx.fillRect(sx - H * 0.25, sy - H * 0.25, H * 0.5, H * 0.5);
    // clouds
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < 5; i++) {
      const cw = W * 0.8 + 400;
      const cx = ((((i * 0.37 + 0.1) * cw - G.skyX * 0.5 + G.t * 6) % cw) + cw) % cw - 200, cy = HZ - H * (0.12 + ((i * 0.53) % 1) * 0.26);
      const s = 0.6 + ((i * 0.71) % 1) * 0.6;
      ctx.beginPath(); ctx.ellipse(cx, cy, 60 * s, 16 * s, 0, 0, 7); ctx.ellipse(cx + 30 * s, cy - 10 * s, 36 * s, 18 * s, 0, 0, 7); ctx.ellipse(cx - 28 * s, cy - 6 * s, 30 * s, 14 * s, 0, 0, 7); ctx.fill();
    }
    // the park below the horizon
    const gg = ctx.createLinearGradient(0, HZ, 0, HZ + H * 0.6);
    gg.addColorStop(0, th.ground[0]); gg.addColorStop(0.35, th.ground[1]); gg.addColorStop(1, th.ground[2]);
    ctx.fillStyle = gg; ctx.fillRect(-ext, HZ, W + ext * 2, ext * 2);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2;
    for (let i = 1; i < 7; i++) {
      const yy = HZ + H * 0.04 * i * i * 0.35;
      const off = ((G.t * 30 * i) % 80);
      ctx.setLineDash([18 + i * 6, 40 + i * 10]); ctx.lineDashOffset = -off - G.skyX * 0.2 * i;
      ctx.beginPath(); ctx.moveTo(-ext, yy); ctx.lineTo(W + ext, yy); ctx.stroke();
    }
    ctx.setLineDash([]);
    // hills strip, sitting on the horizon
    const tw = hills.w, off = (((G.skyX % tw) + tw) % tw);
    for (let xx = -ext - off; xx < W + ext; xx += tw) ctx.drawImage(hills.c, xx, HZ - hills.h + 2, tw, hills.h);
  }

  function drawPool(C, end, camX, camY) {
    const py = C.endY - 900;
    const quad = (x0, x1, z0, z1, y, col) => {
      const a = Math.max(NEAR, z0), b = Math.max(NEAR + 1, z1);
      const xa0 = end.x + (end.dx * (a - end.z)) / SEG, xb0 = end.x + (end.dx * (b - end.z)) / SEG;
      const pt = (xx, zz, xc) => [W / 2 + (xc + xx - camX) * (F / zz), HZ - (y - camY) * (F / zz)];
      const q = [pt(x0, a, xa0), pt(x1, a, xa0), pt(x1, b, xb0), pt(x0, b, xb0)];
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
      ctx.closePath(); ctx.fill();
    };
    quad(-7000, 7000, end.z - 1500, end.z + 16000, py - 60, "#F2DDB0");
    quad(-5200, 5200, end.z - 600, end.z + 14000, py, "#36CBE9");
    for (const lx of [-2600, 0, 2600]) quad(lx - 60, lx + 60, end.z + 400, end.z + 14000, py + 5, "rgba(255,255,255,.7)");
    quad(-900, 900, end.z - 200, end.z + 2400, py + 3, "rgba(255,255,255,.35)");
  }

  function drawSegment(o, slide, th, dist) {
    const s = o.s, lod = LOD[o.k < 45 ? 0 : o.k < 100 ? 1 : 2];
    const ring = s.tunnel ? lod.tube : lod.open;
    const fog = Math.pow(dist, 1.5) * 0.85;
    const haze = th.haze;
    const R1 = R * o.k1, R2 = R * o.k2;

    // support pillar under the open slide
    if (!s.tunnel && s.i % 7 === 0) {
      const pw = 70 * o.k1, top = o.y1 + 40 * o.k1;
      ctx.fillStyle = css(mixRGB([214, 220, 226], haze, fog));
      ctx.fillRect(o.x1 - pw, top, pw * 2, H * 2);
      ctx.fillStyle = css(mixRGB([170, 180, 190], haze, fog));
      ctx.fillRect(o.x1 + pw * 0.35, top, pw * 0.65, H * 2);
    }

    const stripe = s.i % 6 === 0;
    const light = s.tunnel && s.i % 10 === 0;
    const body = s.tunnel ? slide.tunnel : stripe ? slide.band : slide.body;
    const flow = Math.floor(G.t * 14);
    const seams = o.k < 60;
    ctx.lineWidth = 1;
    for (let j = 0; j < ring.K; j++) {
      const ax1 = o.x1 + ring.s[j] * R1, ay1 = o.y1 - ring.c[j] * R1;
      const bx1 = o.x1 + ring.s[j + 1] * R1, by1 = o.y1 - ring.c[j + 1] * R1;
      const ax2 = o.x2 + ring.s[j] * R2, ay2 = o.y2 - ring.c[j] * R2;
      const bx2 = o.x2 + ring.s[j + 1] * R2, by2 = o.y2 - ring.c[j + 1] * R2;
      const cross = (bx1 - ax1) * (ay2 - ay1) - (by1 - ay1) * (ax2 - ax1);
      const mid = -ring.a + ((j + 0.5) / ring.K) * 2 * ring.a;
      let col, k;
      if (cross > 0) { col = s.tunnel ? mixRGB(slide.tunnel, [255, 255, 255], 0.35) : SHELL; k = 0.8 + 0.2 * Math.cos(mid); }
      else {
        const am = Math.abs(mid);
        if (s.boost && am < 0.5) col = (s.i + flow) % 2 ? [255, 226, 60] : [255, 140, 20];
        else if (am < 0.42) col = mixRGB(body, WATER, (s.i + flow) % 5 === 0 ? 0.72 : 0.55);
        else col = light ? mixRGB(slide.tunnel, [255, 240, 190], 0.7) : body;
        k = s.tunnel ? 0.6 + 0.3 * Math.cos(mid) + (light ? 0.25 : 0) : 0.74 + 0.26 * Math.cos(mid);
      }
      ctx.fillStyle = ctx.strokeStyle = css(mixRGB([col[0] * k, col[1] * k, col[2] * k], haze, fog));
      ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.lineTo(ax2, ay2); ctx.closePath();
      ctx.fill();
      if (seams) ctx.stroke(); // hides hairline gaps between quads; far away they're too small to see
    }
    // white lip along both edges of an open trough
    if (!s.tunnel) {
      ctx.strokeStyle = css(mixRGB(RIM, haze, fog)); ctx.lineWidth = Math.max(1, 55 * (o.k1 + o.k2) * 0.5);
      ctx.lineCap = "round";
      for (const e of [0, ring.K]) {
        ctx.beginPath();
        ctx.moveTo(o.x1 + ring.s[e] * R1, o.y1 - ring.c[e] * R1);
        ctx.lineTo(o.x2 + ring.s[e] * R2, o.y2 - ring.c[e] * R2);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }

    // ducks and beach balls sit in the middle of their segment
    if (s.items.length) {
      const mx = (o.x1 + o.x2) / 2, my = (o.y1 + o.y2) / 2, mk = (o.k1 + o.k2) / 2;
      for (const it of s.items) {
        if (it.taken) continue;
        const rr = (R - 20) * mk;
        const ix = mx + Math.sin(it.phi) * rr, iy = my - (1 - Math.cos(it.phi)) * rr;
        const bob = Math.sin(G.t * 5 + s.i) * 18 * mk;
        const size = (it.kind === "duck" ? 330 : 360) * mk;
        if (size < 1.5) continue;
        ctx.save();
        ctx.translate(ix, iy); ctx.rotate(-it.phi);
        ctx.globalAlpha = 1 - fog * 0.6;
        if (it.kind === "ball") {
          ctx.translate(0, -size * 0.45 + bob); ctx.rotate(G.t * 2 + s.i);
          ctx.drawImage(BALL, -size / 2, -size / 2, size, size);
        } else ctx.drawImage(DUCK, -size / 2, -size * 0.9 + bob, size, size);
        ctx.restore();
      }
    }
  }

  function drawOverlays(p) {
    const riding = G.state === "ride" || G.state === "count" || G.state === "wipe";
    // speed lines
    if (riding && p.speed > 5200 && !reduced) {
      const n = Math.floor((p.speed - 5200) / 250);
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), r0 = rand(0.45, 0.6) * Math.hypot(W, H) * 0.5, r1 = r0 + rand(40, 120);
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, HZ + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, HZ + Math.sin(a) * r1); ctx.stroke();
      }
    }
    // red edges when you're about to go over the lip
    if (G.state === "ride") {
      const d = segAt(G.C, p.z).tunnel ? 0 : clamp((Math.abs(p.th) - 1.1) / (LIP - 1.1), 0, 1);
      if (d > 0) {
        const side = Math.sign(p.th);
        const gx = side > 0 ? W : 0;
        const g = ctx.createLinearGradient(gx, 0, W / 2, 0);
        g.addColorStop(0, `rgba(255,40,50,${0.55 * d})`); g.addColorStop(0.5, "rgba(255,40,50,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const lean = $("#lean");
      if (d > 0.15) { lean.hidden = false; lean.textContent = p.th > 0 ? "◀ LEAN LEFT" : "LEAN RIGHT ▶"; }
      else lean.hidden = true;
    } else $("#lean").hidden = true;

    // pops
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const q of pops) {
      const u = 1 - q.life;
      ctx.globalAlpha = clamp(q.life * 2, 0, 1);
      ctx.font = `${q.small ? 30 : 44}px ${DISPLAY}`;
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(8,34,64,.75)"; ctx.fillStyle = q.color;
      const y = q.y - u * 70, s = 1 + Math.max(0, 0.25 - u) * 2;
      ctx.save(); ctx.translate(q.x, y); ctx.scale(s, s);
      ctx.strokeText(q.text, 0, 0); ctx.fillText(q.text, 0, 0); ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (G.state === "count") {
      const n = Math.ceil(G.timer), f = G.timer - Math.floor(G.timer);
      ctx.save(); ctx.translate(W / 2, H * 0.3); const s = 1 + f * 0.6; ctx.scale(s, s);
      ctx.font = `${Math.min(W, H) * 0.24}px ${DISPLAY}`; ctx.globalAlpha = clamp(f * 2.5, 0, 1);
      ctx.lineWidth = 10; ctx.strokeStyle = "rgba(8,34,64,.7)"; ctx.fillStyle = "#fff";
      ctx.strokeText(n, 0, 0); ctx.fillText(n, 0, 0); ctx.restore(); ctx.globalAlpha = 1;
      ctx.font = `22px ${DISPLAY}`; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(8,34,64,.7)"; ctx.lineWidth = 5;
      const hint = coarse ? "Hold left or right to lean" : "← → to lean";
      ctx.strokeText(hint, W / 2, H * 0.3 + Math.min(W, H) * 0.17); ctx.fillText(hint, W / 2, H * 0.3 + Math.min(W, H) * 0.17);
    }
  }

  // ---------- HUD ----------
  let hudCache = "";
  function hud() {
    if (G.state === "title" || G.state === "results") return;
    const C = G.C, p = G.p;
    const t = fmt(G.clock + G.penalty), d = `${G.ducks}`, mph = Math.round(p.speed / 110);
    const key = t + d + mph;
    if (key === hudCache) return;
    hudCache = key;
    $("#time").textContent = t;
    $("#ducks").textContent = d;
    $("#mph").textContent = G.state === "count" ? 0 : mph;
    $("#speedo").classList.toggle("boost", p.boost > 0);
    const pr = clamp(p.z / C.length, 0, 1) * 100;
    $("#progFill").style.width = pr + "%";
    $("#progDot").style.left = pr + "%";
  }

  // ---------- wiring ----------
  $("#muteBtn").onclick = () => { save.muted = !save.muted; persist(); audio(); syncMute(); };
  $("#pauseBtn").onclick = togglePause;
  $("#resumeBtn").onclick = togglePause;
  $("#quitBtn").onclick = toMenu;
  $("#againBtn").onclick = () => startRide(G.slideIdx);
  $("#nextBtn").onclick = () => startRide(G.slideIdx + 1);
  $("#menuBtn").onclick = toMenu;
  document.addEventListener("visibilitychange", () => { if (document.hidden && !G.paused && (G.state === "ride" || G.state === "count" || G.state === "wipe")) togglePause(); });
  addEventListener("blur", () => { keys.l = keys.r = false; pads.l.clear(); pads.r.clear(); });
  addEventListener("resize", resize);

  resize();
  syncMute();
  if (coarse) $("#keysHint").textContent = "Hold the left or right side of the screen to lean.";
  const firstOpen = SLIDES.reduce((a, s, i) => (unlocked(i) ? i : a), 0);
  G.slideIdx = firstOpen;
  toMenu();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!G.paused) update(dt);
    render();
    hud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // for poking at it from the console
  window.SplashDown = { G, startRide, render };
})();
