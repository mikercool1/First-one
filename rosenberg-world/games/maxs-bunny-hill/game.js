// Max's Bunny Hill: a 2.5D sled run down an icy hill.
// Scoop up bunnies (they stack on Max's hat), dodge snowmen, spin off ramps.
// The hill is a pseudo-3D "road": segments projected with a steady downhill grade.
// Scenery sprites are painted once into offscreen canvases and scaled every frame;
// Max, his bunny tower and the effects are drawn live.

(() => {
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SHORT = location.hash.includes("short");   // test hook: a tiny hill

  // ---------- world ----------
  const SEG = 200;              // world units per segment
  const ROAD_W = 2000;          // half-width of the groomed piste
  const DRAW = 230;             // segments drawn ahead
  const CAM_DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);
  const MAX_SPEED = SEG * 56, BOOST_SPEED = MAX_SPEED * 1.4, SNOW_SPEED = MAX_SPEED * 0.42;
  const GRAV = 3600, HOP_V = 2000;
  const PLAYER_W = 640, PLAYER_HIT = 380;
  const RES = 0.3;              // sprite canvas pixels per world unit

  const TRICK_NAMES = { 1: "360!", 2: "720!!", 3: "1080!!!", 4: "BUNNY TORNADO!" };
  const CRASH_WORDS = ["BONK!", "SNOW FACE!", "OOF!", "SORRY, FROSTY!", "WHOOPSIE!", "SPLAT!"];
  const SIGNS = [["CAUTION:", "VERY ICY"], ["BUNNY", "CROSSING"], ["NO", "YETIS"], ["WHEEE", "ZONE"], ["SNOWMEN", "DON'T MOVE"], ["HOLD ON TO", "YOUR BUNNIES"], ["HOT COCOA", "AHEAD"], ["MAX WAS", "HERE"]];

  // ---------- storage ----------
  let best = 0, muted = false;
  try { best = +localStorage.getItem("maxsBunnyHill.best") || 0; muted = localStorage.getItem("maxsBunnyHill.muted") === "1"; } catch {}

  // ---------- sound ----------
  let ac = null, slide = null;
  const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch {} return ac; };
  function tone(f, d = 0.1, type = "sine", v = 0.06, delay = 0, slideTo = 0) {
    if (muted || !audio()) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(f * slideTo, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  }
  let noiseBuf = null;
  function noiseBuffer() {
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  }
  function puff(d = 0.25, v = 0.08, f = 900) {
    if (muted || !audio()) return;
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
    s.buffer = noiseBuffer(); fl.type = "lowpass"; fl.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g).connect(ac.destination); s.start(t); s.stop(t + d + 0.05);
  }
  function startSlide() {
    if (muted || slide || !audio()) return;
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuffer(); s.loop = true; fl.type = "bandpass"; fl.Q.value = 0.8; fl.frequency.value = 900; g.gain.value = 0;
    s.connect(fl).connect(g).connect(ac.destination); s.start();
    slide = { s, fl, g };
  }
  function stopSlide() { if (slide) { try { slide.s.stop(); } catch {} slide = null; } }
  const sfx = {
    bunny: (n) => { const b = 520 * Math.pow(1.04, Math.min(n, 16)); tone(b, 0.14, "sine", 0.07, 0, 2.1); tone(b * 2, 0.1, "triangle", 0.03, 0.07, 1.4); },
    gold: () => [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.18, "triangle", 0.05, i * 0.06)),
    bonk: () => { tone(200, 0.3, "square", 0.05, 0, 0.35); puff(0.35, 0.12, 700); },
    hop: () => tone(260, 0.22, "triangle", 0.05, 0, 2.4),
    land: () => { tone(110, 0.12, "sine", 0.09, 0, 0.6); puff(0.12, 0.05, 1200); },
    trick: (n) => [0, 4, 7, 12].slice(0, n + 1).forEach((s, i) => tone(660 * Math.pow(2, s / 12), 0.22, "sine", 0.06, i * 0.07)),
    cocoa: () => [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, "square", 0.025, i * 0.05)),
    boop: () => tone(900, 0.1, "square", 0.035, 0, 0.5),
    finish: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, "triangle", 0.06, i * 0.12)),
  };

  // ---------- canvas ----------
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, HY = 0, U = 0, camH = 1200, playerZ = 1000;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    HY = H * (W > H ? 0.33 : 0.29);
    U = (H - HY) * 0.76;
    const fill = W > H ? 0.46 : 0.66;                // how much of the screen the piste fills at Max
    camH = clamp(ROAD_W * U / (fill * W), 900, 5200);
    playerZ = camH * CAM_DEPTH;
    buildBackdrop();
  }
  addEventListener("resize", resize);

  // ---------- sprite painting (world units, origin top-left) ----------
  function sprite(w, h, paint) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
    const g = c.getContext("2d"); g.scale(RES, RES); g.lineCap = "round"; g.lineJoin = "round";
    paint(g, w, h);
    return { img: c, w, h };
  }
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function snowBall(c, x, y, r) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.7, "#F1F6FD"); g.addColorStop(1, "#C9DAF0");
    c.fillStyle = g; ell(c, x, y, r, r); c.fill();
  }

  // A bunny facing the camera. Origin bottom-centre, about 44 tall at s = 1.
  function drawBunny(c, x, y, s, gold = false, hop = 0) {
    const fur = gold ? "#FFD04A" : "#FFFFFF", edge = gold ? "#D99A12" : "#C9D6EA", inner = gold ? "#FFB23E" : "#FFB3CB";
    c.save(); c.translate(x, y); c.scale(s, s * (1 + hop * 0.12));
    c.lineWidth = 1.4; c.strokeStyle = edge;
    const earT = hop * 0.35;
    for (const k of [-1, 1]) {
      c.save(); c.translate(k * 5, -38); c.rotate(k * (0.18 + earT));
      c.fillStyle = fur; ell(c, 0, -9, 4.2, 11); c.fill(); c.stroke();
      c.fillStyle = inner; ell(c, 0, -8, 2, 7.5); c.fill(); c.restore();
    }
    c.fillStyle = fur; ell(c, 0, -13, 15, 13); c.fill(); c.stroke();
    ell(c, 0, -30, 11.5, 10.5); c.fill(); c.stroke();
    c.fillStyle = gold ? "#FFE89A" : "#F4F7FC"; ell(c, 0, -11, 8, 8); c.fill();
    c.fillStyle = fur; for (const k of [-1, 1]) { ell(c, k * 8, -1.5, 6, 3); c.fill(); c.stroke(); }
    c.fillStyle = "#1B2A4A"; for (const k of [-1, 1]) { ell(c, k * 4.3, -31, 1.9, 2.2); c.fill(); }
    c.fillStyle = "#fff"; for (const k of [-1, 1]) { ell(c, k * 4.3 + 0.6, -31.8, 0.7, 0.7); c.fill(); }
    c.fillStyle = "#FF7AA8"; ell(c, 0, -27.3, 1.8, 1.2); c.fill();
    c.fillStyle = "rgba(255,122,168,.35)"; for (const k of [-1, 1]) { ell(c, k * 7, -26.5, 2.4, 1.5); c.fill(); }
    c.strokeStyle = "rgba(27,42,74,.35)"; c.lineWidth = 0.6;
    c.beginPath(); for (const k of [-1, 1]) { c.moveTo(k * 3, -27); c.lineTo(k * 10, -28.5); c.moveTo(k * 3, -26.5); c.lineTo(k * 10, -25.5); } c.stroke();
    if (gold) { c.fillStyle = "#FFF6C8"; for (const [sx, sy] of [[-14, -44], [15, -36], [-17, -18]]) star(c, sx, sy, 3.2); }
    c.restore();
  }
  function star(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * 0.35 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    c.closePath(); c.fill();
  }

  const SPR = {};
  function buildSprites() {
    SPR.tree = [0, 1, 2].map((v) => sprite(900, 1500, (c, w, h) => {
      const cx = w / 2;
      c.fillStyle = "rgba(90,120,170,.18)"; ell(c, cx + 60, h - 24, w * 0.4, 34); c.fill();
      c.fillStyle = "#6B4A2F"; c.fillRect(cx - 42, h - 230, 84, 216);
      const greens = [["#1E6B53", "#175542"], ["#23775A", "#1A5E47"], ["#2A8563", "#1F6A4F"]][v];
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const base = h - 170 - i * (h - 420) / tiers, top = base - h * 0.36, hw = w * 0.48 * (1 - i * 0.2);
        c.fillStyle = greens[0]; c.beginPath(); c.moveTo(cx, top); c.lineTo(cx + hw, base); c.lineTo(cx - hw, base); c.closePath(); c.fill();
        c.fillStyle = greens[1]; c.beginPath(); c.moveTo(cx, top); c.lineTo(cx + hw, base); c.lineTo(cx + hw * 0.1, base); c.closePath(); c.fill();
        // snow cap with a scalloped edge
        const sy = top + (base - top) * 0.46, sw = hw * 0.46;
        c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(cx, top - 6); c.lineTo(cx + sw + 8, sy);
        for (let k = 3; k >= -3; k--) c.quadraticCurveTo(cx + (k + 0.5) * sw / 3.3, sy + 34 + (k % 2) * 14, cx + k * sw / 3.3, sy);
        c.lineTo(cx - sw - 8, sy); c.closePath(); c.fill();
        c.fillStyle = "#FFFFFF"; for (let k = -2; k <= 2; k++) { ell(c, cx + k * hw * 0.42, base - 8, hw * 0.16, 16); c.fill(); }
      }
    }));
    SPR.snowman = [0, 1].map((v) => sprite(420, 560, (c, w) => {
      const cx = w / 2;
      c.fillStyle = "rgba(90,120,170,.2)"; ell(c, cx, 545, 150, 18); c.fill();
      c.strokeStyle = "#6B4A2F"; c.lineWidth = 12;
      c.beginPath(); c.moveTo(cx - 70, 290); c.lineTo(cx - 170, 190); c.moveTo(cx - 140, 220); c.lineTo(cx - 180, 230); c.moveTo(cx - 150, 208); c.lineTo(cx - 160, 160);
      c.moveTo(cx + 70, 290); c.lineTo(cx + 170, 190); c.moveTo(cx + 140, 220); c.lineTo(cx + 185, 215); c.moveTo(cx + 152, 205); c.lineTo(cx + 150, 158); c.stroke();
      snowBall(c, cx, 440, 110); snowBall(c, cx, 285, 82); snowBall(c, cx, 160, 62);
      c.fillStyle = "#2B2F3A"; for (const y of [255, 290, 325]) { ell(c, cx, y, 9, 9); c.fill(); }
      c.fillStyle = v ? "#2F80ED" : "#E8454B"; rr(c, cx - 66, 205, 132, 30, 14); c.fill(); c.fillRect(cx + 26, 220, 30, 90);
      if (v) {
        c.fillStyle = "#1B2A4A"; rr(c, cx - 50, 132, 44, 24, 8); c.fill(); rr(c, cx + 6, 132, 44, 24, 8); c.fill(); c.fillRect(cx - 8, 138, 16, 6);
        c.fillStyle = "#FF4F8B"; ell(c, cx, 88, 60, 22); c.fill(); rr(c, cx - 52, 60, 104, 40, 20); c.fill(); c.fillStyle = "#fff"; ell(c, cx, 48, 18, 18); c.fill();
      } else {
        c.fillStyle = "#2B2F3A"; ell(c, cx - 22, 145, 8, 9); c.fill(); ell(c, cx + 22, 145, 8, 9); c.fill();
        c.fillStyle = "#1B1D24"; c.fillRect(cx - 70, 102, 140, 14); c.fillRect(cx - 46, 30, 92, 76); c.fillStyle = "#E8454B"; c.fillRect(cx - 46, 86, 92, 14);
      }
      c.fillStyle = "#2B2F3A"; for (let k = -2; k <= 2; k++) { ell(c, cx + k * 12, 186 + Math.abs(k) * -4 + 4, 4.5, 4.5); c.fill(); }
      c.fillStyle = "#FF8A1E"; c.beginPath(); c.moveTo(cx - 4, 156); c.lineTo(cx + 64, 170); c.lineTo(cx - 4, 176); c.closePath(); c.fill();
    }));
    SPR.bunny = [0, 1].map((f) => sprite(240, 290, (c, w, h) => { drawBunny(c, w / 2, h - 12, 5.2, false, f); }));
    SPR.gold = [0, 1].map((f) => sprite(240, 290, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h - 120, 10, w / 2, h - 120, 140); g.addColorStop(0, "rgba(255,230,120,.55)"); g.addColorStop(1, "rgba(255,230,120,0)");
      c.fillStyle = g; c.fillRect(0, 0, w, h); drawBunny(c, w / 2, h - 12, 5.2, true, f);
    }));
    SPR.balloon = sprite(320, 760, (c, w, h) => {
      c.strokeStyle = "#8C98B0"; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, 230); c.quadraticCurveTo(w / 2 - 30, 360, w / 2 + 6, 500); c.stroke();
      const g = c.createRadialGradient(w / 2 - 40, 80, 10, w / 2, 130, 120); g.addColorStop(0, "#FFC2D8"); g.addColorStop(1, "#FF4F8B");
      c.fillStyle = g; ell(c, w / 2, 130, 100, 115); c.fill();
      c.fillStyle = "#E0336F"; c.beginPath(); c.moveTo(w / 2 - 14, 250); c.lineTo(w / 2 + 14, 250); c.lineTo(w / 2, 238); c.fill();
      c.fillStyle = "rgba(255,255,255,.6)"; ell(c, w / 2 - 40, 90, 20, 34, -0.4); c.fill();
      drawBunny(c, w / 2, h - 10, 5.4, true, 0.6);
    });
    SPR.cocoa = sprite(260, 300, (c, w) => {
      const cx = w / 2;
      const g = c.createRadialGradient(cx, 180, 10, cx, 180, 140); g.addColorStop(0, "rgba(255,210,120,.6)"); g.addColorStop(1, "rgba(255,210,120,0)");
      c.fillStyle = g; c.fillRect(0, 0, w, 300);
      c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 10;
      for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(cx + k * 34, 100); c.bezierCurveTo(cx + k * 34 - 22, 70, cx + k * 34 + 22, 50, cx + k * 34, 18); c.stroke(); }
      c.strokeStyle = "#C7353B"; c.lineWidth = 16; c.beginPath(); c.arc(cx + 72, 190, 34, -1.2, 1.2); c.stroke();
      c.fillStyle = "#E8454B"; rr(c, cx - 76, 110, 150, 170, 26); c.fill();
      c.fillStyle = "#fff"; c.fillRect(cx - 76, 170, 150, 22); c.fillStyle = "#FFD04A"; for (let k = -2; k <= 2; k++) star(c, cx + k * 28 - 1, 238, 9);
      c.fillStyle = "#6B3A22"; ell(c, cx - 1, 114, 72, 14); c.fill();
      c.fillStyle = "#FFFFFF"; for (const [mx, my] of [[-30, 106], [4, 100], [30, 110], [-8, 116]]) { rr(c, cx + mx - 14, my - 12, 28, 24, 6); c.fill(); }
    });
    SPR.ramp = sprite(820, 300, (c, w, h) => {
      const g = c.createLinearGradient(0, 40, 0, h); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#BFD9F4");
      c.fillStyle = "rgba(90,120,170,.25)"; c.beginPath(); c.moveTo(0, h); c.lineTo(w, h); c.lineTo(w - 60, h - 20); c.lineTo(60, h - 20); c.fill();
      c.fillStyle = g; c.beginPath(); c.moveTo(10, h - 6); c.lineTo(w - 10, h - 6); c.lineTo(w - 90, 70); c.lineTo(90, 70); c.closePath(); c.fill();
      c.fillStyle = "#A9C8EA"; c.beginPath(); c.moveTo(w - 10, h - 6); c.lineTo(w - 90, 70); c.lineTo(w - 120, 70); c.lineTo(w - 70, h - 6); c.fill();
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#FFFFFF" : "#FF4F8B"; const x0 = 90 + i * (w - 180) / 8; c.fillRect(x0, 46, (w - 180) / 8 + 1, 30); }
      c.strokeStyle = "#FFC83D"; c.lineWidth = 22;
      for (const y of [150, 220]) { c.beginPath(); c.moveTo(w / 2 - 90, y + 40); c.lineTo(w / 2, y); c.lineTo(w / 2 + 90, y + 40); c.stroke(); }
    });
    SPR.flag = ["#FF7A1A", "#2F80ED"].map((col) => sprite(200, 600, (c) => {
      c.fillStyle = "#9AA8BF"; c.fillRect(18, 20, 12, 575);
      c.fillStyle = col; c.beginPath(); c.moveTo(30, 28); c.quadraticCurveTo(110, 40, 186, 84); c.quadraticCurveTo(110, 118, 30, 146); c.closePath(); c.fill();
      c.fillStyle = "#fff"; ell(c, 24, 20, 12, 12); c.fill();
    }));
    SPR.penguin = [0, 1].map((f) => sprite(280, 360, (c, w, h) => {
      const cx = w / 2;
      c.fillStyle = "#FF9A1E"; ell(c, cx - 36, h - 14, 34, 13); c.fill(); ell(c, cx + 36, h - 14, 34, 13); c.fill();
      c.fillStyle = "#1E2433";
      c.save(); c.translate(cx - 86, 180); c.rotate(f ? -0.9 : 0.4); ell(c, 0, 40, 22, 62); c.fill(); c.restore();
      c.save(); c.translate(cx + 86, 180); c.rotate(f ? 0.9 : -0.4); ell(c, 0, 40, 22, 62); c.fill(); c.restore();
      ell(c, cx, 220, 96, 128); c.fill();
      c.fillStyle = "#FFFFFF"; ell(c, cx, 240, 68, 104); c.fill(); ell(c, cx - 26, 104, 26, 30); c.fill(); ell(c, cx + 26, 104, 26, 30); c.fill();
      c.fillStyle = "#1E2433"; ell(c, cx - 22, 106, 9, 12); c.fill(); ell(c, cx + 22, 106, 9, 12); c.fill();
      c.fillStyle = "#fff"; ell(c, cx - 19, 101, 3, 4); c.fill(); ell(c, cx + 25, 101, 3, 4); c.fill();
      c.fillStyle = "#FF9A1E"; c.beginPath(); c.moveTo(cx - 20, 132); c.lineTo(cx + 20, 132); c.lineTo(cx, 158); c.fill();
      c.fillStyle = "#E8454B"; rr(c, cx - 76, 160, 152, 24, 12); c.fill();
    }));
    SPR.yeti = sprite(780, 1180, (c, w, h) => {
      const cx = w / 2;
      c.fillStyle = "#EAF2FF";
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; ell(c, cx + Math.cos(a) * 250, 640 + Math.sin(a) * 430, 90, 90); c.fill(); }
      ell(c, cx, 640, 270, 450); c.fill();
      c.save(); c.translate(cx + 250, 480); c.rotate(-0.6); ell(c, 0, -150, 80, 200); c.fill(); c.restore();
      c.fillStyle = "#8FA7CF"; ell(c, cx, 380, 150, 130); c.fill();
      c.fillStyle = "#fff"; ell(c, cx - 55, 350, 38, 44); c.fill(); ell(c, cx + 55, 350, 38, 44); c.fill();
      c.fillStyle = "#1B2A4A"; ell(c, cx - 48, 360, 17, 20); c.fill(); ell(c, cx + 48, 360, 17, 20); c.fill();
      c.fillStyle = "#3A1E3A"; c.beginPath(); c.arc(cx, 420, 72, 0.1, Math.PI - 0.1); c.fill();
      c.fillStyle = "#fff"; c.fillRect(cx - 40, 424, 22, 22); c.fillRect(cx + 18, 424, 22, 22);
      c.fillStyle = "#FF7AA8"; ell(c, cx, 480, 30, 12); c.fill();
    });
    const signBoard = (lines, fill, ink) => sprite(860, 740, (c, w, h) => {
      c.fillStyle = "#8A5A36"; c.fillRect(170, 300, 40, h - 300); c.fillRect(w - 210, 300, 40, h - 300);
      c.fillStyle = "rgba(90,120,170,.2)"; ell(c, w / 2, h - 12, 330, 16); c.fill();
      c.fillStyle = ink; rr(c, 30, 60, w - 60, 290, 40); c.fill();
      c.fillStyle = fill; rr(c, 46, 76, w - 92, 258, 30); c.fill();
      c.fillStyle = "#FFFFFF"; rr(c, 20, 40, w - 40, 44, 22); c.fill(); for (let k = 0; k < 6; k++) { ell(c, 80 + k * 140, 70, 60, 26); c.fill(); }
      c.fillStyle = ink; c.textAlign = "center"; c.textBaseline = "middle";
      const fontFor = (t) => { let fs = 104; c.font = `400 ${fs}px "Lilita One", sans-serif`; while (c.measureText(t).width > w - 150 && fs > 50) { fs -= 4; c.font = `400 ${fs}px "Lilita One", sans-serif`; } };
      fontFor(lines[0]); c.fillText(lines[0], w / 2, 160); fontFor(lines[1]); c.fillText(lines[1], w / 2, 262);
    });
    SPR.signs = SIGNS.map((l) => signBoard(l, "#FFD84D", "#1B2A4A"));
    SPR.goMax = signBoard(["GO", "MAX!"], "#FFFFFF", "#FF4F8B");
    const arch = (label, checkered) => sprite(5400, 1800, (c, w, h) => {
      const L = w / 2 - 2250, R = w / 2 + 2250;
      for (const x of [L, R]) {
        c.fillStyle = "#fff"; c.fillRect(x - 70, 380, 140, h - 380);
        c.fillStyle = checkered ? "#1B2A4A" : "#FF4F8B";
        for (let y = 400; y < h; y += 160) { c.beginPath(); c.moveTo(x - 70, y); c.lineTo(x + 70, y + 60); c.lineTo(x + 70, y + 120); c.lineTo(x - 70, y + 60); c.fill(); }
        c.fillStyle = "rgba(90,120,170,.25)"; ell(c, x, h - 10, 150, 22); c.fill();
      }
      c.fillStyle = "#1B2A4A"; rr(c, L - 180, 90, R - L + 360, 420, 70); c.fill();
      if (checkered) {
        c.save(); rr(c, L - 150, 120, R - L + 300, 360, 50); c.clip();
        for (let x = L - 150, i = 0; x < R + 150; x += 90, i++) for (let y = 120, j = 0; y < 480; y += 90, j++) { c.fillStyle = (i + j) % 2 ? "#1B2A4A" : "#FFFFFF"; c.fillRect(x, y, 91, 91); }
        c.restore(); c.fillStyle = "#FFFFFF"; rr(c, w / 2 - 900, 150, 1800, 300, 50); c.fill();
      } else { c.fillStyle = "#FF4F8B"; rr(c, L - 150, 120, R - L + 300, 360, 50); c.fill(); }
      c.fillStyle = checkered ? "#FF4F8B" : "#FFFFFF"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `400 250px "Lilita One", sans-serif`;
      c.fillText(label, w / 2, 312);
      if (!checkered) { drawBunny(c, L + 180, 470, 7); drawBunny(c, R - 180, 470, 7); }
      c.fillStyle = "#FFFFFF"; rr(c, L - 190, 70, R - L + 380, 60, 30); c.fill(); for (let x = L - 150; x < R + 150; x += 220) { ell(c, x, 100, 110, 40); c.fill(); }
    });
    SPR.start = arch("MAX'S BUNNY HILL", false);
    SPR.finish = arch("FINISH!", true);
    SPR.lodge = sprite(3600, 2400, (c, w, h) => {
      const cx = w / 2;
      c.fillStyle = "#8A5A36"; c.fillRect(cx + 700, 260, 240, 700);
      c.fillStyle = "#fff"; rr(c, cx + 680, 230, 280, 70, 30); c.fill();
      c.fillStyle = "rgba(255,255,255,.75)"; for (const [x, y, r] of [[cx + 830, 180, 70], [cx + 900, 90, 90], [cx + 1010, 20, 70]]) { ell(c, x, y, r, r); c.fill(); }
      for (let y = 1000, i = 0; y < h - 40; y += 90, i++) { c.fillStyle = i % 2 ? "#9A6440" : "#A8704A"; rr(c, cx - 1300, y, 2600, 92, 40); c.fill(); }
      c.fillStyle = "#6B4A2F"; c.beginPath(); c.moveTo(cx - 1500, 1060); c.lineTo(cx, 360); c.lineTo(cx + 1500, 1060); c.closePath(); c.fill();
      c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(cx - 1560, 1060); c.lineTo(cx, 300); c.lineTo(cx + 1560, 1060);
      for (let k = 12; k >= -12; k--) c.quadraticCurveTo(cx + (k + 0.5) * 130, 1130 + (k % 2) * 30, cx + k * 130, 1060);
      c.closePath(); c.fill();
      c.fillStyle = "#A8704A"; c.beginPath(); c.moveTo(cx - 520, 1000); c.lineTo(cx, 620); c.lineTo(cx + 520, 1000); c.closePath(); c.fill();
      const win = (x, y, ww, hh) => { c.fillStyle = "#5A3A22"; rr(c, x - 16, y - 16, ww + 32, hh + 32, 20); c.fill(); const g = c.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, "#FFF1B8"); g.addColorStop(1, "#FFB347"); c.fillStyle = g; rr(c, x, y, ww, hh, 12); c.fill(); c.fillStyle = "#5A3A22"; c.fillRect(x + ww / 2 - 7, y, 14, hh); c.fillRect(x, y + hh / 2 - 7, ww, 14); };
      win(cx - 1050, 1380, 380, 330); win(cx + 670, 1380, 380, 330); win(cx - 150, 760, 300, 200);
      c.fillStyle = "#5A3A22"; rr(c, cx - 250, 1500, 500, h - 1540, 40); c.fill(); c.fillStyle = "#E8454B"; rr(c, cx - 220, 1530, 440, h - 1570, 30); c.fill();
      c.fillStyle = "#FFD04A"; ell(c, cx + 150, 1950, 24, 24); c.fill();
      c.fillStyle = "#1B2A4A"; rr(c, cx - 560, 1170, 1120, 220, 40); c.fill(); c.fillStyle = "#FFFFFF"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `400 150px "Lilita One", sans-serif`; c.fillText("HOT COCOA", cx, 1285);
      const bulbs = ["#FF4F8B", "#FFC83D", "#4CC9F0", "#7BE07B"];
      for (let i = 0; i <= 24; i++) { const t = i / 24, x = cx - 1500 + t * 3000, y = 1080 + Math.sin(t * Math.PI * 6) * 30 + 40; c.fillStyle = bulbs[i % 4]; ell(c, x, y, 26, 34); c.fill(); }
    });
  }

  // ---------- backdrop (sky, mountains, far valley) ----------
  let backdrop = null;
  function buildBackdrop() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.ceil(W), h = Math.ceil(HY + 60);
    const c = document.createElement("canvas"); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    // ridges are sums of triangle waves with whole-number periods, so the strip tiles as it scrolls
    const tri = (t) => 1 - 2 * Math.abs((((t % 1) + 1) % 1) - 0.5);
    const ridge = (base, amp, col, waves) => {
      const path = new Path2D(); path.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) { const t = x / w; let v = 0; for (const [f, a, ph] of waves) v += a * tri(t * f + ph); path.lineTo(x, base - amp * v); }
      path.lineTo(w, h); path.closePath();
      g.fillStyle = col; g.fill(path);
      g.save(); g.clip(path); g.fillStyle = "rgba(255,255,255,.92)"; g.fillRect(0, 0, w, base - amp * 0.72); g.restore();
    };
    ridge(HY + 8, HY * 0.55, "#A9C3E6", [[3, 0.6, 0.1], [7, 0.3, 0.4], [13, 0.12, 0.2]]);
    ridge(HY + 18, HY * 0.32, "#C6D8F0", [[4, 0.55, 0.7], [9, 0.3, 0.1], [17, 0.12, 0.5]]);
    g.fillStyle = "#7FA3C9";
    for (let x = 0; x < w; x += 12) { const hh = 8 + ((x * 7919) % 11); g.beginPath(); g.moveTo(x, HY + 2); g.lineTo(x + 6, HY + 2 - hh); g.lineTo(x + 12, HY + 2); g.fill(); }
    g.fillStyle = "#DDE9F6"; g.fillRect(0, HY + 2, w, h - HY);
    g.fillStyle = "#9DB9D8";
    for (let x = 0; x < w; x += 9) { const hh = 6 + ((x * 104729) % 9); g.beginPath(); g.moveTo(x, HY + 30); g.lineTo(x + 4.5, HY + 30 - hh); g.lineTo(x + 9, HY + 30); g.fill(); }
    backdrop = c;
  }

  const clouds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: 0.12 + Math.random() * 0.45, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 }));
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, HY + 40);
    g.addColorStop(0, "#4FA8F5"); g.addColorStop(0.7, "#A9D8FF"); g.addColorStop(1, "#E4F3FF");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 40);
    // sun
    const sx = W * 0.78 - S.sky * 60, sy = HY * 0.28;
    const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90); sg.addColorStop(0, "rgba(255,248,210,1)"); sg.addColorStop(0.25, "rgba(255,240,170,.9)"); sg.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = sg; ctx.fillRect(sx - 90, sy - 90, 180, 180);
    ctx.fillStyle = "rgba(255,255,255,.92)";
    for (const cl of clouds) {
      const x = (((cl.x - S.sky * 0.05) % 1.3 + 1.3) % 1.3) * (W + 300) - 150, y = cl.y * HY, s = cl.s * Math.min(1.4, W / 700);
      for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [60, 0, 24], [30, 8, 26]]) { ell(ctx, x + dx * s, y + dy * s, r * s * 1.2, r * s); ctx.fill(); }
    }
    if (backdrop) {
      const off = (((-S.sky * 40) % W) + W) % W, bh = HY + 60;
      ctx.drawImage(backdrop, off - W, 0, W, bh); ctx.drawImage(backdrop, off, 0, W, bh);
    }
    ctx.fillStyle = "#DDE9F6"; ctx.fillRect(0, HY + 40, W, H - HY);
  }

  // ---------- track ----------
  let segs = [], FINISH = 0, TRACK_LEN = 0;
  function addSection(len, curve, bump, grade) {
    for (let n = 0; n < len; n++) {
      const t = n / len, ease = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
      segs.push({ i: segs.length, curve: curve * ease * ease * (3 - 2 * ease), bumpAmp: bump * Math.sin(Math.PI * t), grade, sprites: [] });
    }
  }
  function add(i, spr) { if (segs[i]) segs[i].sprites.push(Object.assign({ x: 0, alive: true, lift: 0 }, spr)); }
  const kinds = {
    tree: (v) => ({ kind: "tree", s: SPR.tree[v], hit: 420, tall: 1100 }),
    snowman: () => ({ kind: "snowman", s: SPR.snowman[Math.random() < 0.3 ? 1 : 0], hit: 300, tall: 470 }),
    bunny: () => ({ kind: "bunny", s: SPR.bunny[0], hit: 260, frames: SPR.bunny, ph: Math.random() * TAU }),
    gold: () => ({ kind: "gold", s: SPR.gold[0], hit: 260, frames: SPR.gold, ph: Math.random() * TAU }),
    cocoa: () => ({ kind: "cocoa", s: SPR.cocoa, hit: 260, lift: 60, ph: Math.random() * TAU }),
    ramp: () => ({ kind: "ramp", s: SPR.ramp, hit: 720 }),
    balloon: () => ({ kind: "balloon", s: SPR.balloon, hit: 380, lift: 1250, ph: Math.random() * TAU }),
    penguin: () => ({ kind: "penguin", s: SPR.penguin[0], frames: SPR.penguin, hit: 240, tall: 300, ph: Math.random() * TAU }),
  };
  function buildTrack() {
    segs = [];
    const total = SHORT ? 320 : 2300;
    addSection(70, 0, 0, 0.2);
    while (segs.length < total) {
      const len = irand(50, 120), straight = Math.random() < 0.22;
      addSection(len, straight ? 0 : rand(1.2, 3.4) * pick([-1, 1]), Math.random() < 0.35 ? rand(80, 170) : 0, rand(0.3, 0.4));
    }
    FINISH = segs.length;
    addSection(60, 0, 0, 0.2); addSection(80, 0, 0, 0.06); addSection(DRAW + 40, 0, 0, 0);
    TRACK_LEN = segs.length * SEG;

    // heights and lateral curve offsets, precomputed
    let yb = 0, X = 0, D = 0;
    for (const s of segs) {
      s.z1 = s.i * SEG; s.z2 = s.z1 + SEG;
      s.yb1 = yb; yb -= s.grade * SEG; s.yb2 = yb;
      s.b1 = s.bumpAmp * Math.sin(s.i * TAU / 13); s.b2 = s.bumpAmp * Math.sin((s.i + 1) * TAU / 13);
      s.X = X; s.D = D; X += D; D += s.curve;
      s.band = Math.floor(s.i / 3) % 2;
    }

    // ---- scenery ----
    add(14, { kind: "arch", s: SPR.start });
    add(FINISH, { kind: "arch", s: SPR.finish });
    add(FINISH + 150, { kind: "lodge", s: SPR.lodge });
    add(FINISH - 30, { kind: "sign", s: SPR.goMax, x: -1.55 });
    add(FINISH - 60, { kind: "sign", s: SPR.goMax, x: 1.55 });
    for (let i = 4; i < segs.length; i++) {
      if (i % 10 === 0 && i < FINISH + 20 && Math.abs(i - 14) > 3 && Math.abs(i - FINISH) > 3) {
        add(i, { kind: "flag", s: SPR.flag[(i / 10) % 2], x: -1.08 }); add(i, { kind: "flag", s: SPR.flag[(i / 10 + 1) % 2], x: 1.08 });
      }
      const nTrees = i > FINISH + 110 && i < FINISH + 190 ? 0 : Math.random() < 0.6 ? (Math.random() < 0.3 ? 2 : 1) : 0;
      for (let k = 0; k < nTrees; k++) add(i, Object.assign(kinds.tree(irand(0, 2)), { x: pick([-1, 1]) * (1.32 + Math.pow(Math.random(), 1.4) * 1.9) }));
    }
    const signOrder = SIGNS.map((_, i) => i).sort(() => Math.random() - 0.5);
    let si = 0;
    for (let i = 160; i < FINISH - 120; i += irand(230, 320)) {
      const idx = signOrder[si++ % signOrder.length], side = pick([-1, 1]);
      add(i, { kind: "sign", s: SPR.signs[idx], x: side * 1.5 });
      if (SIGNS[idx][1] === "YETIS") add(i + 40, { kind: "yeti", s: SPR.yeti, x: -side * 1.75, hit: 460, tall: 1000 });
    }

    // ---- things to scoop up and things to avoid ----
    const bunny = (i, x) => add(i, Object.assign(kinds.bunny(), { x }));
    const snowman = (i, x) => add(i, Object.assign(kinds.snowman(), { x }));
    const patterns = [
      { w: 5, f: (i) => { const x = rand(-0.7, 0.7), d = rand(-0.05, 0.05), n = irand(4, 6); for (let k = 0; k < n; k++) bunny(i + k * 3, clamp(x + d * k, -0.85, 0.85)); return n * 3; } },
      { w: 4, f: (i) => { const ph = rand(0, TAU); for (let k = 0; k < 8; k++) bunny(i + k * 3, 0.6 * Math.sin(ph + k * 0.6)); return 24; } },
      { w: 3, hard: 1, f: (i) => { snowman(i, -0.5); snowman(i, 0.5); bunny(i, 0); bunny(i + 3, 0); return 6; } },
      { w: 3, hard: 1, f: (i) => { const xs = [-0.78, -0.26, 0.26, 0.78], gap = irand(0, 3); xs.forEach((x, k) => (k === gap ? (bunny(i, x), bunny(i + 3, x)) : snowman(i, x))); return 6; } },
      { w: 2, hard: 1, f: (i) => { for (let k = 0; k < 4; k++) { const s = k % 2 ? 1 : -1; snowman(i + k * 12, s * 0.4); bunny(i + k * 12, -s * 0.45); } return 48; } },
      { w: 3, f: (i) => { const x = rand(-0.45, 0.45); bunny(i, x); bunny(i + 3, x); add(i + 7, Object.assign(kinds.ramp(), { x })); add(i + 32, Object.assign(kinds.balloon(), { x })); return 44; } },
      { w: 2, f: (i) => { const x = rand(-0.6, 0.6); add(i, Object.assign(kinds.cocoa(), { x })); snowman(i + 4, clamp(x + pick([-0.5, 0.5]), -0.85, 0.85)); return 6; } },
      { w: 2, f: (i) => { add(i, Object.assign(kinds.bunny(), { x: 0, x0: 0, amp: 0.8, freq: rand(1, 1.6) })); bunny(i + 6, rand(-0.5, 0.5)); return 8; } },
      { w: 2, f: (i) => { for (let k = 0; k < 3; k++) add(i + k * 4, Object.assign(kinds.penguin(), { x0: rand(-0.4, 0.4), amp: rand(0.3, 0.6), freq: rand(0.6, 1.1) })); return 12; } },
      { w: 1, hard: 1, f: (i) => { const s = pick([-1, 1]); snowman(i, s * 0.55); snowman(i + 2, s * 0.2); add(i + 4, Object.assign(kinds.gold(), { x: s * 0.9 })); return 6; } },
    ];
    let i = 100, lastRamp = -999;
    while (i < FINISH - 70) {
      const p = i / FINISH;
      const pool = patterns.filter((q, k) => !(k === 5 && i - lastRamp < 180)).flatMap((q) => Array(Math.max(1, Math.round(q.w * (q.hard ? 0.4 + p * 1.6 : 1)))).fill(q));
      const q = pool[Math.floor(Math.random() * pool.length)];
      if (q === patterns[5]) lastRamp = i;
      i += q.f(i) + irand(Math.round(14 - p * 6), Math.round(24 - p * 8));
    }
  }

  // ---------- state ----------
  let S = null;
  function newRun() {
    buildTrack();
    S = {
      phase: "title", pos: 0, speed: 0, px: 0, vx: 0, h: 0, vh: 0, spin: 0, spinStart: 0, air: false, airFromRamp: false,
      tumble: 0, inv: 0, boost: 0, tower: [], trickPts: 0, boops: 0, bestTrick: "", bestN: 0, wipeouts: 0, time: 0,
      camX: 0, camBump: 0, camLift: 0, sky: 0, shake: 0, t: 0, lean: 0, sway: 0, swayV: 0, finishT: 0, endShown: false, lastSeg: 0, mph: 0,
    };
  }
  const towerValue = () => S.tower.reduce((a, b) => a + (b ? 5 : 1), 0);
  const score = () => towerValue() * 100 + S.trickPts + S.boops * 50;

  // ---------- input ----------
  const keys = { left: false, right: false, down: false };
  let hopQueued = false;
  const KEYMAP = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowDown: "down", s: "down", S: "down" };
  addEventListener("keydown", (e) => {
    if (!S) return;
    if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (S.phase === "play" && !e.repeat) hopQueued = true;
      else if (e.key === " " && !$("#title").hidden) start();
      else if (e.key === " " && !$("#end").hidden) start();
    }
    if (e.key === "Enter") { if (!$("#title").hidden || !$("#end").hidden) { e.preventDefault(); start(); } }
  });
  addEventListener("keyup", (e) => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
  addEventListener("blur", () => { keys.left = keys.right = keys.down = false; });
  function hold(btn, onDown, onUp) {
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); btn.classList.add("down"); onDown(); });
    const up = () => { btn.classList.remove("down"); onUp && onUp(); };
    btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up); btn.addEventListener("lostpointercapture", up);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  hold($("#leftBtn"), () => (keys.left = true), () => (keys.left = false));
  hold($("#rightBtn"), () => (keys.right = true), () => (keys.right = false));
  hold($("#hopBtn"), () => { if (S && S.phase === "play") hopQueued = true; });

  // ---------- effects ----------
  const parts = [], pops = [];
  function popup(text, x, y, opts = {}) { pops.push(Object.assign({ text, x, y, t: 0, life: 1.1, size: 30, color: "#fff", stroke: "#1B2A4A" }, opts)); }
  function callout(text, color = "#FF4F8B", size) { popup(text, W / 2, H * 0.42, { size: size || clamp(W * 0.1, 36, 72), color, stroke: "#fff", life: 1.3, big: true }); }
  function burst(x, y, n, kind, spread = 1) {
    for (let k = 0; k < n; k++) {
      const a = rand(-Math.PI, 0), v = rand(120, 420) * spread;
      parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: rand(0.6, 1.2), t: 0, size: rand(3, 8), rot: rand(0, TAU), vr: rand(-8, 8), color: pick(["#FF4F8B", "#FFC83D", "#4CC9F0", "#7BE07B", "#FFFFFF"]) });
    }
  }
  const flakes = Array.from({ length: 90 }, () => ({ x: rand(-1.2, 1.2), y: rand(-1, 1), z: rand(0.1, 1) }));

  // ---------- helpers on the track ----------
  const segAt = (z) => segs[clamp(Math.floor(z / SEG), 0, segs.length - 1)];
  function surfaceY(z) { const s = segAt(z), f = (z - s.z1) / SEG; return lerp(s.yb1, s.yb2, f) + lerp(s.b1, s.b2, f); }
  function bumpAt(z) { const s = segAt(z), f = (z - s.z1) / SEG; return lerp(s.b1, s.b2, f); }
  function baseY(z) { const s = segAt(z), f = (z - s.z1) / SEG; return lerp(s.yb1, s.yb2, f); }
  function lateral(z) { const s = segAt(z), f = (z - s.z1) / SEG; return { X: s.X + s.D * f + s.curve * f * f / 2, D: s.D + s.curve * f }; }

  // ---------- game flow ----------
  function start() {
    if (!ready) return;
    audio();
    newRun();
    ["#title", "#end"].forEach((id) => ($(id).hidden = true));
    $("#hud").hidden = false; $("#pad").classList.remove("off");
    parts.length = 0; pops.length = 0;
    S.phase = "play"; S.speed = 1800;
    callout("WHEEEE!", "#FF4F8B");
    startSlide(); updateHUD(true);
  }

  function collect(sp, sx, sy) {
    sp.alive = false;
    const gold = sp.kind === "gold" || sp.kind === "balloon";
    S.tower.push(gold);
    if (gold) { sfx.gold(); callout(sp.kind === "balloon" ? "BALLOON BUNNY!" : "GOLDEN BUNNY!", "#FFC83D"); burst(sx, sy, 22, "confetti"); }
    else { sfx.bunny(S.tower.length); popup(pick(["+1 bunny", "boing!", "hi bunny!", "+1 bunny", "snuggle!"]), sx, sy - 40, { size: 24, color: "#fff" }); }
    const el = $("#bunCount"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  }

  function crash(word, loseFrac = 0.5, minLose = 1) {
    if (S.inv > 0 || S.tumble > 0) return;
    S.tumble = 1.1; S.inv = 2.2; S.speed *= 0.28; S.vx *= -0.3; S.wipeouts++;
    S.air = false; S.h = 0; S.vh = 0; S.spin = 0;
    const lose = Math.min(S.tower.length, Math.max(minLose, Math.ceil(S.tower.length * loseFrac)));
    const m = maxScreen();
    for (let k = 0; k < lose; k++) {
      const gold = S.tower.pop();
      parts.push({ kind: "bunny", gold, x: m.x, y: m.y - m.k * (130 + Math.min(8, S.tower.length + k) * 20) * PLAYER_W / 100, vx: rand(-380, 380), vy: rand(-620, -300), life: 1.6, t: 0, rot: 0, vr: rand(-6, 6), size: m.k * PLAYER_W / 100 * 0.6 });
    }
    burst(m.x, m.y - 30, 26, "snow", 1.2);
    S.shake = reduced ? 0 : 16;
    sfx.bonk();
    callout(word, "#2F80ED");
    if (lose) popup(lose === 1 ? "a bunny hopped off!" : `${lose} bunnies hopped off!`, W / 2, H * 0.42 + clamp(W * 0.1, 36, 72) * 0.9, { size: 20, life: 1.5 });
    updateHUD(true);
  }

  function land() {
    S.air = false; S.h = 0; S.vh = 0;
    const turns = S.spin / TAU, whole = Math.round(turns), off = Math.abs(turns - whole) * 360;
    if (off > 95) { S.spin = 0; S.inv = 0; crash(pick(["SIDEWAYS SPLAT!", "CRASH LANDING!", "BUTT FIRST!"]), 0, 2); return; }
    S.spin = 0; sfx.land();
    const m = maxScreen(); burst(m.x, m.y, 14, "snow", 0.8);
    const n = Math.abs(whole);
    if (n >= 1) {
      const pts = [0, 250, 600, 1200, 2000][Math.min(n, 4)] + Math.max(0, n - 4) * 1000;
      S.trickPts += pts; sfx.trick(Math.min(n, 3));
      const name = TRICK_NAMES[Math.min(n, 4)];
      if (!S.bestTrick || n > S.bestN) { S.bestTrick = name.replace(/!+$/, ""); S.bestN = n; }
      callout(name, "#FFC83D"); popup(`+${pts}`, W / 2, H * 0.42 + clamp(W * 0.1, 36, 72) * 0.9, { size: 26, color: "#FFC83D" });
    } else if (S.airFromRamp) { S.trickPts += 100; popup("BIG AIR! +100", m.x, m.y - m.k * 900, { size: 26, color: "#fff" }); }
    updateHUD(true);
  }

  function finish() {
    S.phase = "finish"; S.finishT = 0;
    sfx.finish(); callout("YOU MADE IT!", "#FF4F8B");
    burst(W / 2, H * 0.5, 80, "confetti", 1.6);
    $("#pad").classList.add("off");
  }

  function showEnd() {
    S.endShown = true; stopSlide();
    const bunnies = towerValue(), timeBonus = Math.max(0, Math.round((SHORT ? 20 : 75) - S.time)) * 20;
    const total = score() + timeBonus;
    const isBest = total > best; if (isBest) { best = total; try { localStorage.setItem("maxsBunnyHill.best", best); } catch {} }
    $("#endTitle").textContent = S.wipeouts === 0 ? "Not one wipeout!" : bunnies >= 30 ? "Bunny tower champion!" : "Max made it!";
    $("#endScore").textContent = total.toLocaleString("en-US");
    $("#newBest").hidden = !isBest;
    const golds = S.tower.filter(Boolean).length;
    const rows = [
      ["Bunnies on the hat", `${S.tower.length}${golds ? ` (${golds} golden)` : ""}`],
      ["Best trick", S.bestTrick || "None yet"],
      ["Penguins booped", S.boops],
      ["Wipeouts", S.wipeouts],
      ["Time", `${S.time.toFixed(1)}s${timeBonus ? ` (+${timeBonus})` : ""}`],
    ];
    if (!isBest && best) rows.push(["Best ever", best.toLocaleString("en-US")]);
    $("#endStats").innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
    $("#endQuote").textContent = S.tower.length === 0 ? "The bunnies are proud of you anyway." : S.tower.length < 10 ? "A cozy little bunny pile. Hot cocoa time!" : S.tower.length < 25 ? "That is a LOT of bunnies on one hat." : "Max is now officially a bunny tower.";
    $("#end").hidden = false; $("#hud").hidden = true;
    $("#bestLine").textContent = best ? `Best: ${best.toLocaleString("en-US")} points` : "";
    // Rosenberg World: 1 star for reaching the bottom, more for a big bunny tower and no wipeouts
    const stars = 1 + (S.tower.length >= 10 ? 1 : 0) + (S.tower.length >= 25 ? 1 : 0) + (S.wipeouts === 0 ? 1 : 0);
    if (window.RosenbergBridge) RosenbergBridge.report({ score: total, stars });
  }

  // ---------- update ----------
  function update(dt) {
    S.t += dt;
    for (const f of flakes) {
      f.z -= dt * (0.08 + (S.speed / MAX_SPEED) * 0.9); f.y += dt * 0.08;
      if (f.z < 0.08 || f.y > 1.2) { f.z = 1; f.x = rand(-1.2, 1.2); f.y = rand(-1, 0.6); }
    }
    for (const p of parts) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      p.vy += (p.kind === "confetti" ? 300 : p.kind === "spray" ? 500 : 900) * dt; p.vx *= p.kind === "confetti" ? 0.99 : 1;
    }
    for (let k = parts.length - 1; k >= 0; k--) if (parts[k].t > parts[k].life) parts.splice(k, 1);
    for (const p of pops) p.t += dt;
    for (let k = pops.length - 1; k >= 0; k--) if (pops[k].t > pops[k].life) pops.splice(k, 1);
    S.shake *= Math.pow(0.02, dt);

    if (S.phase === "title") { S.sky += dt * 0.02; return; }

    const seg = segAt(S.pos + playerZ);
    const speedPct = S.speed / MAX_SPEED;
    const offPiste = Math.abs(S.px) > 1.05;
    const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (S.phase === "play") S.time += dt;

    // speed
    const cap = S.phase === "finish" ? 0 : offPiste ? SNOW_SPEED : S.boost > 0 ? BOOST_SPEED : MAX_SPEED;
    if (S.phase === "finish") S.speed = Math.max(0, S.speed - 6500 * dt);
    else if (S.tumble > 0) S.speed = Math.max(0, S.speed - 2000 * dt);
    else if (S.speed < cap) S.speed = Math.min(cap, S.speed + (S.boost > 0 ? 7000 : 3200) * dt * (keys.down ? 0 : 1));
    else S.speed = Math.max(cap, S.speed - (offPiste ? 9000 : 4000) * dt);
    if (keys.down && !S.air && S.phase === "play") S.speed = Math.max(1500, S.speed - 5000 * dt);
    S.boost = Math.max(0, S.boost - dt);

    // icy steering: steer pushes sideways velocity; ice barely slows it
    if (S.tumble <= 0) {
      const grip = S.air ? 0.25 : 1;
      S.vx += steer * 3.4 * grip * dt;
      S.vx *= Math.pow(S.air ? 0.8 : offPiste ? 0.2 : 0.55, dt);
    } else S.vx *= Math.pow(0.1, dt);
    S.vx = clamp(S.vx, -1.7, 1.7);
    if (!S.air) S.vx -= seg.curve * speedPct * speedPct * 0.1 * dt;   // curves fling you outward
    S.px += S.vx * dt;
    if (Math.abs(S.px) > 2.9) { S.px = Math.sign(S.px) * 2.9; S.vx = 0; }
    S.lean = lerp(S.lean, clamp(S.vx * 0.5 + steer * 0.2, -0.6, 0.6), 1 - Math.pow(0.001, dt));
    // bunny tower is a wobbly spring
    S.swayV += (-S.sway * 40 - S.vx * 18 * (S.air ? 0.3 : 1) - (steer * 6)) * dt; S.swayV *= Math.pow(0.12, dt); S.sway += S.swayV * dt;
    S.sway = clamp(S.sway, -1.2, 1.2);

    // air
    if (hopQueued) {
      hopQueued = false;
      if (!S.air && S.tumble <= 0 && S.phase === "play") { S.air = true; S.airFromRamp = false; S.vh = HOP_V; S.spin = 0; sfx.hop(); }
    }
    if (S.air) {
      S.vh -= GRAV * dt; S.h += S.vh * dt;
      if (steer) S.spin += steer * 3.2 * Math.PI * dt;
      else S.spin = lerp(S.spin, Math.round(S.spin / TAU) * TAU, 1 - Math.pow(0.002, dt));   // let go and Max straightens out
      if (S.h <= 0) land();
    }
    S.tumble = Math.max(0, S.tumble - dt); S.inv = Math.max(0, S.inv - dt);

    // move and check what we passed through
    const before = S.pos + playerZ;
    S.pos = Math.min(S.pos + S.speed * dt, TRACK_LEN - (DRAW + 2) * SEG);
    const after = S.pos + playerZ;
    const now = S.t;
    for (let i = Math.floor(before / SEG); i <= Math.floor(after / SEG); i++) {
      const sg = segs[i]; if (!sg) continue;
      for (const sp of sg.sprites) {
        if (!sp.alive || !sp.hit) continue;
        const x = spriteX(sp, now);
        if (Math.abs(x - S.px) * ROAD_W > (sp.hit + PLAYER_HIT) / 2) continue;
        const m = () => maxScreen();
        switch (sp.kind) {
          case "bunny": case "gold": if (S.h < 280 && S.tumble <= 0) { const q = m(); collect(sp, q.x, q.y - q.k * 700); } break;
          case "balloon": if (S.h > 520 && S.tumble <= 0) { const q = m(); collect(sp, q.x, q.y - q.k * 900); } break;
          case "cocoa": if (S.h < 320 && S.tumble <= 0) { sp.alive = false; S.boost = 2.6; S.speed = Math.max(S.speed, MAX_SPEED); sfx.cocoa(); callout("COCOA POWER!", "#E8454B"); const q = m(); burst(q.x, q.y - 60, 16, "confetti"); } break;
          case "ramp": if (!S.air && S.tumble <= 0) { S.air = true; S.airFromRamp = true; S.vh = 2500 + speedPct * 1300; S.spin = 0; sfx.hop(); tone(520, 0.35, "triangle", 0.04, 0.05, 2); popup(pick(["WHEEEE!", "SEND IT!", "UP UP UP!", "YAHOO!"]), W / 2, H * 0.3, { size: 34, color: "#FFC83D" }); } break;
          case "snowman": if (S.h < sp.tall && S.inv <= 0) { sp.alive = false; const q = m(); burst(q.x, q.y - q.k * 200, 30, "snow", 1.4); parts.push({ kind: "carrot", x: q.x, y: q.y - q.k * 300, vx: rand(-300, 300), vy: -700, life: 1.4, t: 0, rot: 0, vr: 14, size: q.k * 5 }); crash(pick(CRASH_WORDS)); } break;
          case "tree": if (S.h < sp.tall && S.inv <= 0) { crash(pick(["TREE HUG!", "BONK!", "PINE FACE!"])); S.vx = -Math.sign(S.px) * 1.2; } break;
          case "yeti": if (S.h < sp.tall && S.inv <= 0) { crash("YETI HUG!", 0, 0); S.vx = -Math.sign(S.px) * 1.2; } break;
          case "penguin": if (S.h < sp.tall && S.tumble <= 0) { sp.alive = false; S.boops++; S.speed *= 0.85; sfx.boop(); const q = m(); parts.push({ kind: "penguin", x: q.x, y: q.y - q.k * 150, vx: rand(-400, 400), vy: -800, life: 1.4, t: 0, rot: 0, vr: pick([-10, 10]), size: q.k }); popup("BOOP! +50", q.x, q.y - q.k * 800, { size: 26 }); } break;
        }
      }
    }

    // snow spray from the runners
    if (!S.air && S.speed > 1500 && S.tumble <= 0) {
      const m = maxScreen(), n = speedPct * 1.4 + Math.abs(S.vx) * 1.6 + (offPiste ? 3 : 0) + (keys.down ? 2 : 0);
      for (let k = 0; k < n; k++) {
        const side = k % 2 ? 1 : -1;
        parts.push({ kind: "spray", x: m.x + side * m.k * rand(180, 300), y: m.y - 4, vx: side * rand(40, 180) - S.vx * 220, vy: rand(-260, -60), life: rand(0.25, 0.55), t: 0, size: rand(2, 5) * (offPiste ? 1.6 : 1) });
      }
    }
    if (S.boost > 0 && Math.random() < 0.6) { const m = maxScreen(); parts.push({ kind: "confetti", x: m.x + rand(-60, 60), y: m.y - rand(20, 100) * m.k * 6, vx: rand(-80, 80), vy: rand(-40, 60), life: 0.6, t: 0, size: rand(3, 6), rot: 0, vr: 5, color: pick(["#FFFFFF", "#FFE0A8"]) }); }

    // camera
    S.camX = lerp(S.camX, S.px * ROAD_W * 0.82, 1 - Math.pow(0.004, dt));
    S.camBump = lerp(S.camBump, bumpAt(S.pos + playerZ), 1 - Math.pow(0.02, dt));
    S.camLift = lerp(S.camLift, S.h * 0.85, 1 - Math.pow(0.0002, dt));   // the camera rises with big air so Max stays on screen
    S.sky += seg.curve * speedPct * dt * 0.35;

    // sound
    if (slide && ac) {
      const v = S.air || S.phase === "title" ? 0 : clamp(speedPct, 0, 1.4) * (offPiste ? 0.07 : 0.045) + (keys.down ? 0.03 : 0);
      slide.g.gain.setTargetAtTime(muted ? 0 : v, ac.currentTime, 0.06);
      slide.fl.frequency.setTargetAtTime(offPiste ? 500 : 700 + 1500 * speedPct, ac.currentTime, 0.1);
    }

    if (S.phase === "play" && after >= FINISH * SEG) finish();
    if (S.phase === "finish") { S.finishT += dt; if (!S.endShown && (S.speed <= 0 && S.finishT > 1.2)) showEnd(); }
    updateHUD();
  }

  function spriteX(sp, t) { return sp.amp ? sp.x0 + Math.sin(t * sp.freq + sp.ph) * sp.amp : sp.x; }

  // where Max is on screen, and pixels per world unit at his depth
  function maxScreen() {
    const k = U / camH;
    const x = W / 2 + (S.px * ROAD_W - S.camX) * k;
    const pz = S.pos + playerZ;
    const camY = baseY(pz) + S.camBump + S.camLift + camH;
    const y = HY + (camY - surfaceY(pz)) * k;
    return { x, y, k };
  }

  // ---------- HUD ----------
  let hudCache = "";
  function updateHUD(force) {
    const mph = Math.round(S.speed / MAX_SPEED * 24);
    const prog = clamp((S.pos + playerZ) / (FINISH * SEG), 0, 1);
    const key = `${S.tower.length}|${score()}|${mph}|${Math.round(prog * 400)}`;
    if (!force && key === hudCache) return; hudCache = key;
    $("#bunCount").textContent = towerValue();
    $("#score").textContent = `${score().toLocaleString("en-US")} pts`;
    $("#speed").innerHTML = `${mph}<small>MPH</small>`;
    $("#progBar").style.width = prog * 100 + "%"; $("#progSled").style.left = prog * 100 + "%";
  }

  // ---------- render ----------
  const FOG = [221, 233, 246];
  const mixFog = (rgb, f) => `rgb(${rgb.map((v, i) => Math.round(v + (FOG[i] - v) * f)).join(",")})`;
  const COL = {
    snow: [[255, 255, 255], [243, 248, 254]],
    piste: [[214, 234, 252], [202, 225, 248]],
    edge: [[176, 206, 236], [176, 206, 236]],
  };

  function render() {
    ctx.save();
    if (S.shake > 0.5) ctx.translate(rand(-S.shake, S.shake), rand(-S.shake, S.shake));
    drawSky();

    const pz = S.pos + playerZ;
    const base = segAt(S.pos);
    const P = lateral(pz);
    const camY = baseY(pz) + S.camBump + S.camLift + camH;
    const camZ = S.pos;
    let maxy = H;
    const k0 = U * CAM_DEPTH;
    const proj = (z, y) => {
      const dz = z - camZ, sc = k0 / dz, L = lateral(z);
      const x = L.X - P.X - P.D * ((z - pz) / SEG);
      return { x: W / 2 + (x - S.camX) * sc, y: HY + (camY - y) * sc, w: ROAD_W * sc, sc };
    };
    const drawn = [];
    for (let n = 0; n < DRAW; n++) {
      const s = segs[base.i + n]; if (!s) break;
      if (s.z2 - camZ < 60) continue;
      const a = proj(Math.max(s.z1, camZ + 60), lerp(s.yb1, s.yb2, 0) + s.b1), b = proj(s.z2, s.yb2 + s.b2);
      s.p1 = a; s.p2 = b; s.clip = maxy; s.fog = Math.pow(n / DRAW, 1.6);
      drawn.push(s);
      if (b.y >= maxy || b.y >= a.y) continue;
      const y1 = Math.min(a.y, maxy), fog = s.fog;
      ctx.fillStyle = mixFog(COL.snow[s.band], fog); ctx.fillRect(0, b.y, W, y1 - b.y + 1);
      const quad = (x1, w1, x2, w2, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 - w1, a.y); ctx.lineTo(x1 + w1, a.y); ctx.lineTo(x2 + w2, b.y); ctx.lineTo(x2 - w2, b.y); ctx.closePath(); ctx.fill(); };
      quad(a.x, a.w * 1.06, b.x, b.w * 1.06, mixFog(COL.edge[0], fog));
      quad(a.x, a.w, b.x, b.w, mixFog(COL.piste[s.band], fog));
      if (s.i % 6 < 2) quad(a.x, a.w * 0.012, b.x, b.w * 0.012, mixFog([232, 244, 255], fog));
      if (s.i >= FINISH - 1 && s.i <= FINISH) quad(a.x, a.w, b.x, b.w, mixFog([255, 79, 139], fog));
      maxy = b.y;
    }

    // sprites back to front, with Max slotted in at his segment
    const pSegI = Math.floor(pz / SEG);
    let maxDrawn = false;
    for (let d = drawn.length - 1; d >= 0; d--) {
      const s = drawn[d];
      if (!maxDrawn && s.i < pSegI) { drawMax(); maxDrawn = true; }
      if (!s.sprites.length) continue;
      const alpha = clamp((1 - s.fog) * 4, 0, 1);
      for (const sp of s.sprites) {
        if (!sp.alive) continue;
        const pr = s.p1, sc = pr.sc;
        let img = sp.s;
        if (sp.frames) img = sp.frames[(Math.sin(S.t * 6 + sp.ph) > 0.2) ? 1 : 0];
        const x = pr.x + spriteX(sp, S.t) * ROAD_W * sc;
        let lift = sp.lift;
        if (sp.kind === "bunny" || sp.kind === "gold") lift += Math.max(0, Math.sin(S.t * 6 + sp.ph)) * 70;
        if (sp.kind === "cocoa" || sp.kind === "balloon") lift += Math.sin(S.t * 2.5 + sp.ph) * 40;
        const wpx = img.w * sc, hpx = img.h * sc, bottom = pr.y - lift * sc;
        if (wpx < 1.2 || x + wpx / 2 < 0 || x - wpx / 2 > W) continue;
        ctx.globalAlpha = alpha;
        if (lift > 200) { ctx.fillStyle = "rgba(90,120,170,.2)"; ell(ctx, x, pr.y, wpx * 0.3, wpx * 0.06); ctx.fill(); }
        const clipBottom = Math.max(0, bottom - s.clip);
        if (clipBottom < hpx) {
          const frac = 1 - clipBottom / hpx;
          ctx.drawImage(img.img, 0, 0, img.img.width, img.img.height * frac, x - wpx / 2, bottom - hpx, wpx, hpx * frac);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (!maxDrawn) drawMax();

    drawFlakes();
    drawParts();
    drawPops();
    if (S.boost > 0) drawSpeedLines();
    ctx.restore();
  }

  function drawFlakes() {
    ctx.fillStyle = "#FFFFFF";
    const fast = S.speed / MAX_SPEED;
    for (const f of flakes) {
      const x = W / 2 + (f.x / f.z) * W * 0.5, y = H * 0.45 + (f.y / f.z) * H * 0.5;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const r = clamp(1.6 / f.z, 1, 7);
      ctx.globalAlpha = clamp(1.2 - f.z, 0.2, 0.9);
      if (fast > 0.6 && !reduced) {
        const dx = (x - W / 2) * 0.04 * fast, dy = (y - H * 0.45) * 0.04 * fast;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = r; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x, y); ctx.stroke();
      } else { ell(ctx, x, y, r, r); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawSpeedLines() {
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 3;
    for (let k = 0; k < 14; k++) {
      const a = rand(0, TAU), r1 = Math.max(W, H) * rand(0.35, 0.5), r2 = r1 + rand(40, 120);
      ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r1, H * 0.5 + Math.sin(a) * r1); ctx.lineTo(W / 2 + Math.cos(a) * r2, H * 0.5 + Math.sin(a) * r2); ctx.stroke();
    }
  }
  function drawParts() {
    for (const p of parts) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = clamp(a * 1.5, 0, 1);
      if (p.kind === "snow" || p.kind === "spray") { ctx.fillStyle = "#FFFFFF"; ell(ctx, p.x, p.y, p.size, p.size); ctx.fill(); }
      else if (p.kind === "confetti") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); ctx.restore(); }
      else if (p.kind === "bunny") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); drawBunny(ctx, 0, 20 * p.size, p.size, p.gold, 1); ctx.restore(); }
      else if (p.kind === "carrot") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = "#FF8A1E"; ctx.beginPath(); ctx.moveTo(-p.size * 2, -p.size); ctx.lineTo(p.size * 10, 0); ctx.lineTo(-p.size * 2, p.size); ctx.fill(); ctx.restore(); }
      else if (p.kind === "penguin") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); const im = SPR.penguin[1]; ctx.drawImage(im.img, -im.w * p.size / 2, -im.h * p.size / 2, im.w * p.size, im.h * p.size); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawPops() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const p of pops) {
      const t = p.t / p.life, grow = p.big ? Math.min(1, p.t / 0.18) : 1;
      const sc = p.big ? (grow < 1 ? 0.4 + grow * 0.8 : 1.2 - Math.min(0.2, (p.t - 0.18) * 0.6)) : 1;
      ctx.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
      ctx.save(); ctx.translate(p.x, p.y - (p.big ? 0 : t * 60)); ctx.scale(sc, sc);
      ctx.font = `400 ${p.size}px "Lilita One", "Arial Rounded MT Bold", sans-serif`;
      ctx.lineWidth = Math.max(4, p.size * 0.16); ctx.strokeStyle = p.stroke; ctx.lineJoin = "round"; ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Max ----------
  // Drawn in "M units": the sled is ~100 wide, origin at the ground under the sled.
  function drawMax() {
    const m = maxScreen(), u = m.k * PLAYER_W / 100;
    const hPx = S.h * m.k;
    if (S.inv > 0 && S.tumble <= 0 && Math.floor(S.t * 12) % 2) ctx.globalAlpha = 0.45;
    // shadow on the snow
    ctx.fillStyle = "rgba(60,90,140,.22)"; ell(ctx, m.x, m.y, u * 52 * (1 - Math.min(0.5, S.h / 3000)), u * 10); ctx.fill();
    ctx.save();
    ctx.translate(m.x, m.y - hPx);
    ctx.scale(u, u);
    if (S.tumble > 0) {
      const t = 1 - S.tumble / 1.1;
      ctx.translate(0, -60 - Math.sin(t * Math.PI) * 60); ctx.rotate(t * TAU * 2 * (S.vx >= 0 ? 1 : -1)); ctx.translate(0, 60);
    }
    const spinC = Math.cos(S.spin), front = spinC < 0;
    ctx.scale(Math.max(0.18, Math.abs(spinC)), 1);
    ctx.rotate(S.lean * 0.12);
    drawSled(front);
    ctx.save(); ctx.translate(0, -20); ctx.rotate(S.lean * 0.22); ctx.translate(0, 20);
    drawKid(front);
    drawTower();
    ctx.restore();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawSled(front) {
    const c = ctx;
    // runners
    c.fillStyle = "#6B7A93";
    for (const s of [-1, 1]) { rr(c, s * 38 - 4, -16, 8, 16, 3); c.fill(); }
    c.strokeStyle = "#6B7A93"; c.lineWidth = 5; c.beginPath(); c.moveTo(-44, -2); c.lineTo(44, -2); c.stroke();
    if (!front) {
      // the curled front of the sled peeks out past Max
      c.fillStyle = "#C92F3C"; rr(c, -40, -58, 80, 34, 14); c.fill();
      c.strokeStyle = "#FFC83D"; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -52); c.quadraticCurveTo(0, -42, 30, -52); c.stroke();
    }
    c.fillStyle = "#E8454B"; c.beginPath(); c.moveTo(-50, -34); c.lineTo(50, -34); c.lineTo(45, -12); c.lineTo(-45, -12); c.closePath(); c.fill();
    c.fillStyle = "#FF6A6E"; rr(c, -52, -38, 104, 9, 4); c.fill();
    c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(-45, -18, 90, 6);
    c.fillStyle = "#fff"; c.font = `400 13px "Lilita One", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("MAX", 0, -22);
    if (front) { c.fillStyle = "#C92F3C"; rr(c, -40, -40, 80, 30, 14); c.fill(); }
  }
  function drawKid(front) {
    const c = ctx, air = S.air, flop = clamp(S.speed / MAX_SPEED, 0, 1.4), t = S.t;
    const coat = "#2E7CF6", coatD = "#2263C9", mitt = "#FF4F8B";
    // scarf tails stream back toward us
    c.strokeStyle = "#FFB020"; c.lineWidth = 9;
    const wave = Math.sin(t * 16) * 5 * (0.3 + flop);
    c.beginPath(); c.moveTo(10, -88); c.bezierCurveTo(24 + wave, -76, 16 - wave, -62, 30 + wave * 1.4 - S.lean * 20, -50 + flop * 8); c.stroke();
    c.strokeStyle = "#FF8A1E"; c.lineWidth = 3; c.beginPath(); c.moveTo(22 + wave, -70); c.lineTo(28 + wave, -68); c.stroke();
    // arms (behind the body when holding on, up in the air when flying)
    const arm = (s) => {
      c.strokeStyle = coatD; c.lineWidth = 14;
      const hx = air ? s * 44 : s * 42, hy = air ? -128 + Math.sin(t * 12 + s) * 4 : -36;
      c.beginPath(); c.moveTo(s * 22, -76); c.quadraticCurveTo(s * 42, air ? -96 : -64, hx, hy); c.stroke();
      c.fillStyle = mitt; ell(c, hx, hy, 8, 8); c.fill();
    };
    arm(-1); arm(1);
    // puffy coat
    c.fillStyle = coat; ell(c, 0, -60, 31, 30); c.fill();
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 2.4;
    for (const y of [-72, -58, -44]) { c.beginPath(); c.ellipse(0, y + 6, 28, 8, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }
    if (front) { c.strokeStyle = "#1B4FA8"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -84); c.lineTo(0, -34); c.stroke(); c.fillStyle = "#FFC83D"; ell(c, 0, -64, 3, 3); c.fill(); }
    // scarf wrap
    c.fillStyle = "#FFB020"; rr(c, -22, -94, 44, 12, 6); c.fill();
    // head
    c.fillStyle = "#F6C9A0"; for (const s of [-1, 1]) { ell(c, s * 21, -104, 5, 6); c.fill(); }
    if (front) {
      c.fillStyle = "#F6C9A0"; ell(c, 0, -106, 21, 21); c.fill();
      c.fillStyle = "#1B2A4A"; for (const s of [-1, 1]) { ell(c, s * 7.5, -108, 2.8, air ? 4 : 3.2); c.fill(); }
      c.fillStyle = "rgba(255,110,140,.45)"; for (const s of [-1, 1]) { ell(c, s * 12, -101, 4, 2.6); c.fill(); }
      c.fillStyle = "#8A2A3A";
      if (air || S.tumble > 0) { ell(c, 0, -97, 5, 6); c.fill(); }
      else { c.beginPath(); c.arc(0, -101, 8, 0.15, Math.PI - 0.15); c.fill(); }
    } else {
      c.fillStyle = "#6B4226"; ell(c, 0, -98, 17, 9); c.fill();
    }
    // bunny-ear hat, ears blown back by the wind
    c.fillStyle = "#F7F7FB"; c.beginPath(); c.arc(0, -108, 22, Math.PI, 0); c.lineTo(22, front ? -110 : -100); c.lineTo(-22, front ? -110 : -100); c.closePath(); c.fill();
    c.fillStyle = "#FF8FB8"; rr(c, -23, front ? -116 : -106, 46, 8, 4); c.fill();
    const earLen = 34 * (1 - 0.38 * Math.min(1, flop)) + (air ? 6 : 0), wob = Math.sin(t * 9) * 0.08 * (0.4 + flop);
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * 9, -126); c.rotate(s * (0.18 + flop * 0.35) + wob + S.sway * 0.25);
      c.fillStyle = "#F7F7FB"; ell(c, 0, -earLen / 2, 7, earLen / 2 + 2); c.fill();
      c.strokeStyle = "#D5DFEE"; c.lineWidth = 1.5; c.stroke();
      if (front) { c.fillStyle = "#FFB3CB"; ell(c, 0, -earLen / 2, 3.4, earLen / 2 - 3); c.fill(); }
      c.restore();
    }
  }
  function drawTower() {
    const n = S.tower.length; if (!n) return;
    const shown = Math.min(n, 8), c = ctx;
    let x = 0, y = -126, rot = 0;
    for (let i = 0; i < shown; i++) {
      const lean = S.sway * 0.05 + Math.sin(S.t * 5 + i * 0.7) * 0.012 * (i + 1);
      rot = clamp(rot + lean * 0.35, -0.7, 0.7);
      c.save(); c.translate(x, y); c.rotate(rot);
      drawBunny(c, 0, 0, 0.5, S.tower[i], S.air ? 0.8 : 0);
      c.restore();
      x += Math.sin(rot) * 20; y -= Math.cos(rot) * 20;
    }
    if (n > shown) {
      c.save(); c.translate(x, y - 8); c.rotate(rot);
      c.font = `400 22px "Lilita One", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 5; c.strokeStyle = "#1B2A4A"; c.strokeText(`+${n - shown}`, 0, 0); c.fillStyle = "#FFC83D"; c.fillText(`+${n - shown}`, 0, 0);
      c.restore();
    }
  }

  // ---------- screens ----------
  function buildLegend() {
    const shot = (spr, lift = 0) => { const c = document.createElement("canvas"), sc = 120 / Math.max(spr.w, spr.h); c.width = spr.w * sc * 2; c.height = spr.h * sc * 2; c.getContext("2d").drawImage(spr.img, 0, 0, c.width, c.height); return c.toDataURL(); };
    const items = [[SPR.bunny[0], "Scoop", "+100"], [SPR.gold[0], "Golden", "+500"], [SPR.cocoa, "Cocoa", "zoom!"], [SPR.ramp, "Ramp", "spin!"], [SPR.snowman[0], "Snowman", "bonk"]];
    $("#legend").innerHTML = items.map(([s, a, b]) => `<li><img alt="" src="${shot(s)}"><span>${a}</span><small>${b}</small></li>`).join("");
  }
  const syncMute = () => { $("#muteBtn").innerHTML = muted ? "&#128263;" : "&#128266;"; $("#muteBtn").setAttribute("aria-label", muted ? "Sound off" : "Sound on"); };
  $("#muteBtn").onclick = () => {
    muted = !muted; try { localStorage.setItem("maxsBunnyHill.muted", muted ? "1" : "0"); } catch {}
    syncMute(); if (muted) stopSlide(); else if (S.phase === "play") startSlide();
  };
  syncMute();
  $("#startBtn").onclick = start;
  $("#againBtn").onclick = start;
  $("#bestLine").textContent = best ? `Best: ${best.toLocaleString("en-US")} points` : "";
  document.addEventListener("visibilitychange", () => { if (document.hidden && slide && ac) slide.g.gain.setTargetAtTime(0, ac.currentTime, 0.02); });

  // test hook (only with #autotest in the URL)
  if (location.hash.includes("autotest")) window.__hill = () => ({ S, segs, FINISH, keys, start, playerZ, SEG, hop: () => (hopQueued = true) });

  // ---------- boot ----------
  let ready = false, last = performance.now();
  function boot() {
    if (ready) return; ready = true;
    buildSprites(); buildLegend(); resize(); newRun();
    requestAnimationFrame(frame);
  }
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    if (!document.hidden) { update(dt); render(); }
    requestAnimationFrame(frame);
  }
  // wait (briefly) for the display font so signs and banners paint with it
  Promise.race([document.fonts ? document.fonts.load('400 40px "Lilita One"') : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(boot, boot);
})();
