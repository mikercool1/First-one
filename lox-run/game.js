// Fish Friday: Mike's Friday lox route through Wilmot Woods, in a black Mazda CX-50.
// Levels never end: each one is a little faster and needs more houses. Lose your last bagel and it's over.
// One canvas. Houses and trees are painted once into sprites (day + night
// versions) and reused every frame; the car, sky and effects are drawn live.

(() => {
  // ---------- menu ----------
  const LOX = [
    { id: "plain", name: "Plain", color: "#E9876A", base: "#FF9E80" },
    { id: "pastrami", name: "Pastrami", color: "#6B3A2C", base: "#D0634A" },
    { id: "togarashi", name: "Togarashi", color: "#D2332A", base: "#FF8360" },
    { id: "korean", name: "Korean", color: "#1F8F58", base: "#FF7744" },
  ];
  const LOXBY = Object.fromEntries(LOX.map((l) => [l.id, l]));

  // Each level: which lox are on the menu, how many houses to deliver, pace, and where the sun is.
  // Level n (0-based): which lox are on the menu, houses to deliver, pace, and where the sun is.
  const GOALS = [4, 12, 15];
  function LV(n) {
    const types = n === 0 ? ["plain", "pastrami"] : n === 1 ? ["plain", "pastrami", "togarashi"] : ["plain", "pastrami", "togarashi", "korean"];
    const goal = GOALS[n] ?? 15 + (n - 2) * 3;
    const speed = Math.min(150 + n * 16, 340);
    const sky0 = 0.02 + n * 0.17;
    return { types, goal, speed, sky: [sky0, sky0 + 0.17] };
  }
  const GOOD = "Good Shabbos!", BAD = "Oy vey!";
  const MIKE_LINES = {
    start: ["Okay. Route is mapped.", "Full tank. Let's go.", "Candle lighting is at 7:12. Plenty of time."],
    level: ["New item on the menu. I researched it.", "Okay, adding a lox. Adjusting the spreadsheet."],
    faster: ["Picking up the pace.", "Same route, less time. I can do this.", "Faster. Fine. I optimized for this."],
    life: ["Streak bonus. Extra bagel.", "Five in a row. That's a bagel."],
    streak: ["Optimal route confirmed.", "I mapped this.", "See? Research.", "Twelve seconds per stop. Incredible."],
    wrong: ["Wait. That can't be right.", "Hold on, let me check.", "That's… not in the spreadsheet."],
    miss: ["I'll circle back.", "Recalculating."],
  };

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixA = (a, b, t) => { const A = hex(a), B = hex(b); return A.map((v, i) => v + (B[i] - v) * t); };
  const mix = (a, b, t) => `rgb(${mixA(a, b, t).map(Math.round).join(",")})`;
  const rgba = (arr, al) => `rgba(${arr.map(Math.round).join(",")},${al})`;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const UI_FONT = "Manrope, 'Segoe UI', system-ui, sans-serif";

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // deterministic noise so sprites look the same on redraw
  function seeded(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  const svgImg = (svg) => { const i = new Image(); i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); return i; };
  const FACES = {};
  for (const id of ["mike", "adam", "billy", "marshall"]) {
    FACES[id] = {};
    for (const m of ["neutral", "happy", "annoyed", "talk", "sad"]) FACES[id][m] = svgImg(avatarSVG(id, m, { token: true, noProps: true, noBg: id === "mike" }));
  }

  // ---------- storage ----------
  let bestLevel = 0, muted = false;
  try { bestLevel = +localStorage.getItem("fishFriday.bestLevel") || 0; muted = localStorage.getItem("loxRun.muted") === "1"; } catch {}

  // ---------- sound ----------
  let ac = null;
  function tone(f, d = 0.1, type = "sine", v = 0.06, delay = 0, slide = 0) {
    if (muted) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const sfx = {
    toss: () => tone(320, 0.16, "triangle", 0.045, 0, 2.2),
    good: (n) => { const b = 700 * Math.pow(1.06, Math.min(n, 12)); tone(b, 0.1, "sine", 0.07); tone(b * 1.5, 0.22, "sine", 0.05, 0.08); tone(b * 2, 0.3, "sine", 0.025, 0.16); },
    bad: () => { tone(196, 0.24, "triangle", 0.06); tone(147, 0.32, "triangle", 0.05, 0.12); },
    miss: () => tone(440, 0.35, "sine", 0.05, 0, 0.5),
    over: () => [523, 440, 392, 262].forEach((f, i) => tone(f, 0.4, "sine", 0.06, i * 0.18)),
    win: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, "sine", 0.06, i * 0.15)),
  };

  // ---------- canvas + layout ----------
  const cv = $("#cv"), cx = cv.getContext("2d");
  let W = 0, H = 0, S = 1, DPR = 1, RS = 2, BASE = 0, ROAD = 0, CAR_X = 150;
  const YARD = 58, WALK = 16, TREELAWN = 14, CURB = 5;
  const CAR_S = 0.86;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const cw = cv.clientWidth, ch = cv.clientHeight;
    cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
    S = Math.min(ch / 640, cw / 520);
    W = cw / S; H = ch / S;
    // keep the road and the car clear of the lox buttons
    const barH = (Math.max($("#bar").offsetHeight, 96) + 16) / S;
    ROAD = H - barH - 22;
    BASE = ROAD - (YARD + WALK + TREELAWN + CURB + 34);
    CAR_X = clamp(W * 0.2, 120, 240);
    if (G && !G.demo) updateHUD();
    const nrs = clamp(Math.ceil(DPR * S * 2) / 2, 1, 2.5);
    if (nrs !== RS) { RS = nrs; spriteCache.clear(); if (G) G.houses.forEach((h) => (h.spr = null)); }
  }
  addEventListener("resize", () => { resize(); });

  // ---------- sprites ----------
  const spriteCache = new Map();
  function makeSprite(w, h, paint) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * RS); c.height = Math.ceil(h * RS);
    const g = c.getContext("2d"); g.scale(RS, RS); paint(g); return c;
  }
  // night version: same pixels, tinted blue-dark, plus whatever glows are painted on top
  function nightOf(day, tint, glow) {
    const c = document.createElement("canvas"); c.width = day.width; c.height = day.height;
    const g = c.getContext("2d");
    g.drawImage(day, 0, 0);
    g.globalCompositeOperation = "source-atop"; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-over"; g.scale(RS, RS);
    if (glow) glow(g);
    return c;
  }

  // ---------- day cycle ----------
  const SKY = [
    { t: 0.0, top: "#8CC3EC", bot: "#F6E3CF", sun: 0.28, light: 0 },
    { t: 0.22, top: "#5E9FD8", bot: "#D9ECF7", sun: 0.85, light: 0 },
    { t: 0.44, top: "#E48F63", bot: "#F9D39A", sun: 0.3, light: 0.12 },
    { t: 0.58, top: "#4B3C7A", bot: "#EE8E78", sun: 0.02, light: 0.6 },
    { t: 0.76, top: "#0E1433", bot: "#2E2B58", sun: -0.3, light: 1 },
    { t: 0.9, top: "#30376C", bot: "#E8A28E", sun: 0.04, light: 0.55 },
    { t: 1.0, top: "#8CC3EC", bot: "#F6E3CF", sun: 0.28, light: 0 },
  ];
  const DAY_LEN = 120;
  function sky(tt) { return skyAt((tt / DAY_LEN) % 1); }
  function skyAt(p) {
    p = ((p % 1) + 1) % 1;
    let i = 0; while (SKY[i + 1].t < p) i++;
    const a = SKY[i], b = SKY[i + 1], k = (p - a.t) / (b.t - a.t), e = k * k * (3 - 2 * k);
    return { top: mix(a.top, b.top, e), bot: mix(a.bot, b.bot, e), topA: mixA(a.top, b.top, e), botA: mixA(a.bot, b.bot, e), sun: a.sun + (b.sun - a.sun) * e, light: a.light + (b.light - a.light) * e };
  }
  const NIGHT_TINT = "rgba(16,22,58,0.68)";

  // ---------- house painter ----------
  const STYLES = ["colonial", "colonial", "tudor", "stone", "shingle", "farmhouse"];
  const PAL = {
    colonial: { walls: ["#F4F2EC", "#EFE6CC", "#DDE4E8", "#CDD6C4", "#E9E4DA"], roof: ["#4A5059", "#3E4550", "#56514C"], shutters: ["#1E2227", "#22324A", "#243A2F", "#1E2227"], doors: ["#1E2227", "#7C1F24", "#22324A"] },
    tudor: { walls: ["#EEE4CF", "#E8DCC2"], roof: ["#4B3B33", "#3F3A3A"], beam: "#4A3426", stone: "#A39C92", doors: ["#5A3A26"] },
    stone: { walls: ["#B9B1A5", "#A9A399", "#C4B8A4"], roof: ["#3B4149", "#44464D"], shutters: ["#1E2227", "#2C3A33"], doors: ["#1E2227", "#2D3F52"] },
    shingle: { walls: ["#8E9CA7", "#A58D71", "#7F8C84"], roof: ["#3E444B"], trim: "#FBFAF6", doors: ["#1E2227", "#7C1F24"] },
    farmhouse: { walls: ["#F6F6F3", "#ECEBE6"], roof: ["#23262B"], doors: ["#1A1C1F"] },
  };

  function genHouse(x) {
    const style = pick(STYLES), p = PAL[style];
    const w = Math.round(rand(230, 290));
    const wallH = style === "shingle" ? 138 : 150;
    const roofH = { colonial: 62, tudor: 92, stone: 64, shingle: 84, farmhouse: 88 }[style];
    const garage = Math.random() < 0.6 ? (Math.random() < 0.5 ? "left" : "right") : null;
    const hdef = {
      style, w, wallH, roofH, garage, seed: Math.floor(rand(1, 1e6)),
      wall: pick(p.walls), roof: pick(p.roof), shutter: p.shutters ? pick(p.shutters) : null, door: pick(p.doors),
      chimney: Math.random() < 0.75 ? (Math.random() < 0.5 ? "l" : "r") : null,
      brick: pick(["#8E4B3A", "#7E4636", "#9A5A45"]),
    };
    const gw = garage ? 112 : 0;
    const P = 26;
    hdef.sw = w + gw + P * 2; hdef.sh = wallH + roofH + 60;
    hdef.bodyX = P + (garage === "left" ? gw : 0);
    hdef.garageX = garage === "left" ? P : garage === "right" ? P + w : null;
    hdef.doorX = hdef.bodyX + w / 2;
    hdef.x = x;
    return hdef;
  }

  function paintWindow(g, H, x, y, w, h, opts = {}) {
    const frame = opts.frame || "#FBFAF6";
    if (H.shutter && !opts.noShutters) {
      g.fillStyle = H.shutter;
      g.fillRect(x - w * 0.42 - 2, y - 1, w * 0.42, h + 2); g.fillRect(x + w + 2, y - 1, w * 0.42, h + 2);
      g.fillStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < 4; i++) { g.fillRect(x - w * 0.42 - 2, y + 3 + i * (h / 4), w * 0.42, 1); g.fillRect(x + w + 2, y + 3 + i * (h / 4), w * 0.42, 1); }
    }
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const gl = g.createLinearGradient(x, y, x + w, y + h);
    gl.addColorStop(0, "#C4D6E2"); gl.addColorStop(0.5, "#7F9BB2"); gl.addColorStop(1, "#4E657B");
    g.fillStyle = gl; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,.28)";
    g.beginPath(); g.moveTo(x, y + h * 0.55); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x, y + h * 0.8); g.fill();
    g.strokeStyle = opts.muntin || frame; g.lineWidth = opts.muntinW || 1.4;
    const cols = opts.cols ?? 3, rows = opts.rows ?? 4;
    g.beginPath();
    for (let i = 1; i < cols; i++) { g.moveTo(x + (w * i) / cols, y); g.lineTo(x + (w * i) / cols, y + h); }
    for (let j = 1; j < rows; j++) { g.moveTo(x, y + (h * j) / rows); g.lineTo(x + w, y + (h * j) / rows); }
    g.stroke();
    g.fillStyle = frame; g.fillRect(x - 5, y + h + 2, w + 10, 4);
    (H.win = H.win || []).push([x, y, w, h]);
  }

  function roofShape(g, x0, x1, top, h, fill, texture = "shingle") {
    const inset = h * 0.85;
    g.beginPath(); g.moveTo(x0 - 12, top + 4); g.lineTo(x0 - 12 + inset, top - h); g.lineTo(x1 + 12 - inset, top - h); g.lineTo(x1 + 12, top + 4); g.closePath();
    const gr = g.createLinearGradient(0, top - h, 0, top);
    gr.addColorStop(0, mix(fill, "#FFFFFF", 0.1)); gr.addColorStop(1, mix(fill, "#000000", 0.18));
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    if (texture === "shingle") { g.strokeStyle = "rgba(0,0,0,.16)"; g.lineWidth = 1; for (let y = top; y > top - h; y -= 6) { g.beginPath(); g.moveTo(x0 - 20, y); g.lineTo(x1 + 20, y); g.stroke(); } }
    if (texture === "metal") { g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 1.2; for (let x = x0 - 20; x < x1 + 20; x += 9) { g.beginPath(); g.moveTo(x, top - h); g.lineTo(x, top + 4); g.stroke(); } }
    g.restore();
    g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(x0 - 12, top + 2, x1 - x0 + 24, 3);
  }

  function gable(g, cxp, base, gw, gh, fill, trim, face) {
    g.beginPath(); g.moveTo(cxp - gw / 2 - 10, base + 4); g.lineTo(cxp, base - gh - 8); g.lineTo(cxp + gw / 2 + 10, base + 4); g.closePath();
    g.fillStyle = fill; g.fill();
    g.beginPath(); g.moveTo(cxp - gw / 2, base); g.lineTo(cxp, base - gh); g.lineTo(cxp + gw / 2, base); g.closePath();
    g.fillStyle = face; g.fill();
    g.strokeStyle = trim; g.lineWidth = 3; g.stroke();
  }

  function siding(g, x, y, w, h, kind, R) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (kind === "clap") { g.strokeStyle = "rgba(0,0,0,.07)"; g.lineWidth = 1; for (let yy = y + 5; yy < y + h; yy += 5.5) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } }
    if (kind === "batten") { g.fillStyle = "rgba(0,0,0,.06)"; for (let xx = x + 4; xx < x + w; xx += 11) g.fillRect(xx, y, 1.6, h); }
    if (kind === "shake") { for (let yy = y; yy < y + h; yy += 7) for (let xx = x - (yy % 14 ? 0 : 5); xx < x + w; xx += 10) { g.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.08})`; g.fillRect(xx, yy, 9, 6.5); } }
    if (kind === "stone") {
      for (let yy = y; yy < y + h; yy += 11) for (let xx = x - R() * 14; xx < x + w; xx += 12 + R() * 12) {
        const sw = 11 + R() * 14, sh = 8 + R() * 4, t = R();
        g.fillStyle = t < 0.33 ? "rgba(255,255,255,.12)" : t < 0.66 ? "rgba(0,0,0,.08)" : "rgba(120,90,60,.10)";
        rr(g, xx, yy + R() * 2, sw, sh, 3); g.fill();
        g.strokeStyle = "rgba(60,55,50,.25)"; g.lineWidth = 0.8; g.stroke();
      }
    }
    g.restore();
  }

  function paintHouse(g, Hd) {
    const R = seeded(Hd.seed);
    Hd.win = [];
    const gy = Hd.sh - 8, x0 = Hd.bodyX, x1 = x0 + Hd.w, top = gy - Hd.wallH;
    const st = Hd.style;
    // ground contact shadow
    const cs = g.createLinearGradient(0, gy - 16, 0, gy + 8);
    cs.addColorStop(0, "rgba(0,0,0,0)"); cs.addColorStop(1, "rgba(0,0,0,.22)");
    g.fillStyle = cs; g.fillRect(12, gy - 16, Hd.sw - 24, 24);

    // chimney (behind roof)
    if (Hd.chimney) {
      const chx = Hd.chimney === "l" ? x0 + 34 : x1 - 58;
      g.fillStyle = st === "stone" ? "#9E978C" : Hd.brick; g.fillRect(chx, top - Hd.roofH - 26, 24, Hd.roofH + 20);
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(chx + 16, top - Hd.roofH - 26, 8, Hd.roofH + 20);
      g.fillStyle = "#3A3A3A"; g.fillRect(chx - 3, top - Hd.roofH - 30, 30, 6);
    }

    // garage wing
    if (Hd.garage) {
      const gx = Hd.garageX, gwid = 112, gh = 88, gt = gy - gh;
      roofShape(g, gx + 6, gx + gwid - 6, gt, 40, Hd.roof, st === "farmhouse" ? "metal" : "shingle");
      g.fillStyle = Hd.wall; g.fillRect(gx, gt, gwid, gh);
      siding(g, gx, gt, gwid, gh, st === "stone" ? "stone" : st === "farmhouse" ? "batten" : st === "shingle" ? "shake" : "clap", R);
      for (let i = 0; i < 2; i++) {
        const dx = gx + 10 + i * 50, dw = 42, dt = gt + 22;
        g.fillStyle = "#FBFAF6"; g.fillRect(dx - 2, dt - 2, dw + 4, gy - dt + 2);
        g.fillStyle = st === "farmhouse" ? "#2B2E33" : mix(Hd.wall, "#FFFFFF", 0.35); g.fillRect(dx, dt, dw, gy - dt);
        g.strokeStyle = "rgba(0,0,0,.14)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(dx + dw / 2, dt); g.lineTo(dx + dw / 2, gy); for (let r = 1; r < 4; r++) { g.moveTo(dx, dt + r * 16); g.lineTo(dx + dw, dt + r * 16); } g.stroke();
        g.fillStyle = "#6F8497"; for (let k = 0; k < 3; k++) g.fillRect(dx + 3 + k * 13, dt + 3, 10, 8);
      }
    }

    // main roof
    roofShape(g, x0, x1, top, Hd.roofH, Hd.roof, st === "farmhouse" ? "metal" : "shingle");
    // dormers (stone + shingle)
    if (st === "stone" || st === "shingle") {
      const n = st === "stone" ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const dx = x0 + (Hd.w / (n + 1)) * (i + 1) - 16, dy = top - Hd.roofH * 0.62;
        g.fillStyle = Hd.roof; g.beginPath(); g.moveTo(dx - 6, dy); g.lineTo(dx + 16, dy - 18); g.lineTo(dx + 38, dy); g.fill();
        g.fillStyle = st === "shingle" ? PAL.shingle.trim : "#F1EEE7"; g.fillRect(dx, dy, 32, 30);
        paintWindow(g, { shutter: null, win: Hd.win }, dx + 6, dy + 5, 20, 22, { noShutters: true, cols: 2, rows: 3 });
      }
    }

    // walls
    g.fillStyle = Hd.wall; g.fillRect(x0, top, Hd.w, Hd.wallH);
    const kind = st === "stone" ? "stone" : st === "farmhouse" ? "batten" : st === "shingle" ? "shake" : st === "tudor" ? null : "clap";
    if (kind) siding(g, x0, top, Hd.w, Hd.wallH, kind, R);
    if (st === "tudor") {
      g.fillStyle = PAL.tudor.stone; g.fillRect(x0, gy - 58, Hd.w, 58);
      siding(g, x0, gy - 58, Hd.w, 58, "stone", R);
      g.strokeStyle = PAL.tudor.beam; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x0, gy - 60); g.lineTo(x1, gy - 60); g.moveTo(x0, top + 4); g.lineTo(x1, top + 4);
      for (let xx = x0 + 18; xx < x1; xx += 34) { g.moveTo(xx, top + 4); g.lineTo(xx, gy - 60); }
      g.stroke();
    }
    // corner boards + frieze
    g.fillStyle = st === "farmhouse" ? "#F6F6F3" : "rgba(255,255,255,.75)";
    if (st !== "stone" && st !== "tudor") { g.fillRect(x0, top, 5, Hd.wallH); g.fillRect(x1 - 5, top, 5, Hd.wallH); g.fillRect(x0, top, Hd.w, 6); }
    // side light shading
    const sh = g.createLinearGradient(x0, 0, x1, 0);
    sh.addColorStop(0, "rgba(255,255,255,.08)"); sh.addColorStop(1, "rgba(0,0,0,.10)");
    g.fillStyle = sh; g.fillRect(x0, top, Hd.w, Hd.wallH);
    // eave shadow
    g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(x0, top, Hd.w, 7);

    // front gables
    if (st === "tudor") {
      const gx = x0 + Hd.w * 0.3;
      gable(g, gx, top + 4, Hd.w * 0.42, Hd.roofH + 22, Hd.roof, PAL.tudor.beam, Hd.wall);
      g.save(); g.beginPath(); g.moveTo(gx - Hd.w * 0.21, top + 4); g.lineTo(gx, top - Hd.roofH - 18); g.lineTo(gx + Hd.w * 0.21, top + 4); g.clip();
      g.strokeStyle = PAL.tudor.beam; g.lineWidth = 4; g.beginPath();
      for (let k = -3; k <= 3; k++) { g.moveTo(gx + k * 16, top + 4); g.lineTo(gx + k * 16, top - Hd.roofH); }
      g.moveTo(gx - 40, top - 10); g.lineTo(gx, top - 50); g.lineTo(gx + 40, top - 10);
      g.stroke(); g.restore();
    }
    if (st === "shingle" || st === "farmhouse") {
      const gx = x0 + Hd.w / 2;
      gable(g, gx, top + 4, Hd.w * 0.46, Hd.roofH + 10, Hd.roof, st === "farmhouse" ? "#F6F6F3" : PAL.shingle.trim, Hd.wall);
      g.save(); g.beginPath(); g.moveTo(gx - Hd.w * 0.23, top + 4); g.lineTo(gx, top - Hd.roofH - 6); g.lineTo(gx + Hd.w * 0.23, top + 4); g.clip();
      siding(g, gx - Hd.w * 0.23, top - Hd.roofH - 6, Hd.w * 0.46, Hd.roofH + 12, st === "farmhouse" ? "batten" : "shake", R);
      g.restore();
      if (st === "shingle") { g.fillStyle = PAL.shingle.trim; g.beginPath(); g.arc(gx, top - 26, 13, Math.PI, 0); g.fill(); g.fillStyle = "#6F8497"; g.beginPath(); g.arc(gx, top - 26, 10, Math.PI, 0); g.fill(); }
      else paintWindow(g, { shutter: null, win: Hd.win }, gx - 12, top - 48, 24, 34, { noShutters: true, frame: "#1C1E22", cols: 1, rows: 2, muntin: "#1C1E22" });
    }

    // windows: 2 floors, door in the middle below
    const fw = st === "farmhouse" ? 30 : 24, fh = st === "farmhouse" ? 44 : 36;
    const opts = st === "farmhouse" ? { frame: "#1C1E22", muntin: "#1C1E22", cols: 2, rows: 2, noShutters: true }
      : st === "tudor" ? { frame: "#4A3426", muntin: "rgba(40,30,20,.5)", cols: 3, rows: 4, noShutters: true, muntinW: 0.8 } : {};
    const cols = Hd.w > 260 ? 5 : 4;
    const upY = top + 22, dnY = top + Hd.wallH * 0.56;
    for (let i = 0; i < cols; i++) {
      const wx = x0 + (Hd.w / cols) * (i + 0.5) - fw / 2;
      if (st === "tudor" && i < 2) { if (i === 0) paintWindow(g, Hd, x0 + Hd.w * 0.3 - 20, top - 36, 40, 30, opts); continue; }
      paintWindow(g, Hd, wx, upY, fw, fh, opts);
      const center = Math.abs(wx + fw / 2 - Hd.doorX) < Hd.w / cols / 1.5;
      if (!center) paintWindow(g, Hd, wx, dnY, fw, fh + 4, opts);
    }

    // front door + portico
    const dw = 30, dh = 50, dx = Hd.doorX - dw / 2, dy = gy - dh - 6;
    if (st === "colonial" || st === "stone") {
      g.fillStyle = "#FBFAF6"; g.fillRect(dx - 22, dy - 26, dw + 44, 6);
      g.beginPath(); g.moveTo(dx - 26, dy - 24); g.lineTo(dx + dw / 2, dy - 46); g.lineTo(dx + dw + 26, dy - 24); g.closePath(); g.fill();
      g.fillStyle = "rgba(0,0,0,.08)"; g.beginPath(); g.moveTo(dx - 18, dy - 26); g.lineTo(dx + dw / 2, dy - 40); g.lineTo(dx + dw + 18, dy - 26); g.fill();
      g.fillStyle = "#FBFAF6"; g.fillRect(dx - 18, dy - 20, 6, dh + 20); g.fillRect(dx + dw + 12, dy - 20, 6, dh + 20);
      g.fillStyle = "rgba(0,0,0,.1)"; g.fillRect(dx - 13, dy - 20, 1.5, dh + 20); g.fillRect(dx + dw + 17, dy - 20, 1.5, dh + 20);
    }
    g.fillStyle = "#FBFAF6"; g.fillRect(dx - 4, dy - (st === "tudor" ? 8 : 14), dw + 8, dh + 14);
    if (st === "tudor") { g.fillStyle = Hd.door; g.beginPath(); g.moveTo(dx, dy + dh); g.lineTo(dx, dy + 10); g.quadraticCurveTo(dx + dw / 2, dy - 12, dx + dw, dy + 10); g.lineTo(dx + dw, dy + dh); g.fill(); }
    else {
      g.fillStyle = "#7F9BB2"; g.fillRect(dx, dy - 10, dw, 8);
      g.fillStyle = Hd.door; g.fillRect(dx, dy, dw, dh);
      g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 1; g.strokeRect(dx + 4, dy + 5, dw - 8, dh / 2 - 8); g.strokeRect(dx + 4, dy + dh / 2 + 2, dw - 8, dh / 2 - 8);
    }
    g.fillStyle = "#D8B44A"; g.beginPath(); g.arc(dx + dw - 6, dy + dh / 2 + 2, 2.2, 0, 7); g.fill();
    // lanterns
    for (const lx of [dx - 9, dx + dw + 9]) { g.fillStyle = "#1C1E22"; g.fillRect(lx - 3, dy + 6, 6, 11); g.fillStyle = "#F4E2A8"; g.fillRect(lx - 2, dy + 8, 4, 7); }
    Hd.lanterns = [[dx - 9, dy + 11], [dx + dw + 9, dy + 11]];
    // steps
    g.fillStyle = st === "farmhouse" ? "#C9C6BF" : "#BDB5AA"; g.fillRect(dx - 14, gy - 6, dw + 28, 6); g.fillStyle = "#D4CEC4"; g.fillRect(dx - 10, gy - 10, dw + 20, 4);

    // foundation plantings: boxwoods + hydrangeas, gap at the door
    for (let xx = 18; xx < Hd.sw - 18; xx += 16 + R() * 6) {
      if (Math.abs(xx - Hd.doorX) < 30) continue;
      if (Hd.garage && xx > Hd.garageX + 6 && xx < Hd.garageX + 106) continue;
      const r = 9 + R() * 5;
      const bg = g.createRadialGradient(xx - 3, gy - r - 3, 1, xx, gy - r, r * 1.3);
      bg.addColorStop(0, "#6FA35E"); bg.addColorStop(1, "#2F5A2F");
      g.fillStyle = bg; g.beginPath(); g.arc(xx, gy - r + 2, r, 0, 7); g.fill();
      if (R() < 0.3) { g.fillStyle = R() < 0.5 ? "#A9B8E6" : "#F2F0F4"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(xx - 5 + R() * 10, gy - r - 1 + R() * 8, 2.4, 0, 7); g.fill(); } }
    }
  }

  function houseSprites(Hd) {
    const day = makeSprite(Hd.sw, Hd.sh, (g) => paintHouse(g, Hd));
    const R = seeded(Hd.seed + 7);
    const night = nightOf(day, NIGHT_TINT, (g) => {
      for (const [x, y, w, h] of Hd.win) {
        if (R() < 0.28) continue;
        const gl = g.createLinearGradient(x, y, x, y + h);
        gl.addColorStop(0, "#FFE2A8"); gl.addColorStop(1, "#F2A95A");
        g.fillStyle = gl; g.fillRect(x, y, w, h);
        const halo = g.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * 1.6);
        halo.addColorStop(0, "rgba(255,200,120,.35)"); halo.addColorStop(1, "rgba(255,200,120,0)");
        g.fillStyle = halo; g.fillRect(x - w * 1.6, y - h, w * 4.2, h * 3);
      }
      for (const [x, y] of Hd.lanterns) {
        const halo = g.createRadialGradient(x, y, 1, x, y, 30);
        halo.addColorStop(0, "rgba(255,214,140,.9)"); halo.addColorStop(0.2, "rgba(255,214,140,.35)"); halo.addColorStop(1, "rgba(255,214,140,0)");
        g.fillStyle = halo; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill();
      }
    });
    return { day, night };
  }

  // ---------- tree painter ----------
  function paintTree(g, kind, w, h, seed) {
    const R = seeded(seed), cxp = w / 2, gy = h - 4;
    const sh = g.createRadialGradient(cxp, gy, 2, cxp, gy, w * 0.45);
    sh.addColorStop(0, "rgba(0,0,0,.25)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh; g.fillRect(0, gy - 14, w, 18);
    if (kind === "spruce") {
      g.fillStyle = "#4A3426"; g.fillRect(cxp - 4, gy - 30, 8, 30);
      const tiers = 7;
      for (let i = 0; i < tiers; i++) {
        const ty = gy - 18 - i * ((h - 30) / tiers), tw = (w * 0.48) * (1 - i / (tiers + 1.5));
        const gr = g.createLinearGradient(cxp - tw, 0, cxp + tw, 0);
        gr.addColorStop(0, "#3C6B45"); gr.addColorStop(0.5, "#2A5236"); gr.addColorStop(1, "#1C3A28");
        g.fillStyle = gr; g.beginPath(); g.moveTo(cxp - tw, ty); g.quadraticCurveTo(cxp, ty - 10, cxp + tw, ty); g.lineTo(cxp, ty - (h - 30) / tiers - 26); g.closePath(); g.fill();
      }
      return;
    }
    // deciduous: trunk + layered canopy
    const tg = g.createLinearGradient(cxp - 8, 0, cxp + 8, 0);
    tg.addColorStop(0, "#6B5040"); tg.addColorStop(1, "#3E2E24");
    g.fillStyle = tg; g.beginPath(); g.moveTo(cxp - 9, gy); g.lineTo(cxp - 5, gy - h * 0.45); g.lineTo(cxp + 5, gy - h * 0.45); g.lineTo(cxp + 10, gy); g.fill();
    g.strokeStyle = "#4E3A2E"; g.lineWidth = 4; g.beginPath(); g.moveTo(cxp, gy - h * 0.35); g.lineTo(cxp - w * 0.2, gy - h * 0.55); g.moveTo(cxp, gy - h * 0.4); g.lineTo(cxp + w * 0.18, gy - h * 0.6); g.stroke();
    const cy = gy - h * 0.62, rx = w * 0.44, ry = h * 0.36;
    const tones = kind === "maple" ? ["#2F5A2C", "#437A38", "#5E9A48", "#86B865"] : ["#294F2C", "#3B6E3A", "#548C47", "#7AAE5E"];
    for (let pass = 0; pass < 4; pass++) {
      const n = [26, 22, 16, 10][pass];
      g.fillStyle = tones[pass];
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R());
        let px = cxp + Math.cos(a) * rx * d * (1 - pass * 0.12), py = cy + Math.sin(a) * ry * d * (1 - pass * 0.12);
        if (pass >= 2) { px -= rx * 0.12 * pass * 0.5; py -= ry * 0.14 * pass * 0.5; }
        const r = (kind === "maple" ? 22 : 20) * (1 - pass * 0.15) * (0.7 + R() * 0.5);
        g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
      }
    }
    g.fillStyle = "rgba(255,255,230,.10)";
    for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(cxp - rx * 0.4 + (R() - 0.5) * rx, cy - ry * 0.3 + (R() - 0.5) * ry, 1.5 + R() * 2, 0, 7); g.fill(); }
  }
  const TREE_KINDS = [["oak", 200, 230], ["oak", 170, 200], ["maple", 150, 180], ["spruce", 110, 210], ["oak", 230, 260], ["maple", 130, 150]];
  function treeSprite(i) {
    const key = "tree" + i + "@" + RS;
    if (!spriteCache.has(key)) {
      const [kind, w, h] = TREE_KINDS[i];
      const day = makeSprite(w, h, (g) => paintTree(g, kind, w, h, 1234 + i * 77));
      spriteCache.set(key, { day, night: nightOf(day, "rgba(10,16,40,0.74)"), w, h });
    }
    return spriteCache.get(key);
  }

  // soft cloud sprites
  function cloudSprite(i) {
    const key = "cloud" + i + "@" + RS;
    if (!spriteCache.has(key)) {
      const w = 300, h = 130, R = seeded(99 + i * 13);
      const day = makeSprite(w, h, (g) => {
        for (let k = 0; k < 14; k++) {
          const x = 60 + R() * 180, y = 78 + (R() - 0.5) * 16 - Math.sin(((x - 60) / 180) * Math.PI) * 16, r = 16 + R() * 20;
          const gr = g.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r);
          gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(0.7, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }
      });
      spriteCache.set(key, { day, dusk: nightOf(day, "rgba(240,150,130,.55)"), night: nightOf(day, "rgba(60,64,110,.8)"), w, h });
    }
    return spriteCache.get(key);
  }

  // asphalt texture
  let asphalt = null;
  function asphaltPattern() {
    if (asphalt) return asphalt;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), R = seeded(4242);
    g.fillStyle = "#50535B"; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "255,255,255" : "0,0,0"},${R() * 0.09})`; g.fillRect(R() * 128, R() * 128, 1 + R() * 1.5, 1 + R() * 1.5); }
    asphalt = cx.createPattern(c, "repeat");
    return asphalt;
  }

  // ---------- neighbors ----------
  const SKINS = ["#F2C9A5", "#E0AC84", "#C68E63", "#8D5A3B", "#F6D5B8", "#B5794F"];
  const HAIRS = ["#2B1B12", "#5B3A24", "#A24E26", "#D8B36A", "#A7A7A7", "#1F1F1F", "#7A5230"];

  // ---------- game state ----------
  let G = null;
  function newGame(demo, level = 0) {
    G = {
      demo, t: 0, cam: 0, speed: 150, houses: [], packs: [], parts: [], floats: [],
      level, done: 0, phase: "play", delivered: 0, combo: 0, bestCombo: 0, lives: 1, over: false, shake: 0, oys: 0,
      nextX: 330, mikeMood: "happy", mikeMoodT: 0, throwT: 0, counts: {}, friendsServed: 0,
      skyP: LV(level).sky[0],
    };
    while (G.nextX < W + 800) addHouse();
    updateHUD();
  }

  function addHouse() {
    const gap = rand(90, 170);
    const Hd = genHouse(G.nextX);
    const orderChance = G.demo ? 0.75 : 0.72;
    if (G.nextX > 480 && G.phase === "play" && Math.random() < orderChance) {
      const friend = Math.random() < 0.15 ? pick(["adam", "billy", "marshall"]) : null;
      const types = G.demo ? LOX.map((l) => l.id) : LV(G.level).types;
      Hd.order = { type: pick(types), state: "open", friend, face: { skin: pick(SKINS), hair: pick(HAIRS), style: Math.floor(rand(0, 4)) }, mood: "neutral", line: null, lineT: 0 };
    }
    Hd.backTree = Math.random() < 0.85 ? { i: Math.floor(rand(0, TREE_KINDS.length)), dx: Hd.sw + gap * rand(0.2, 0.6) } : null;
    Hd.streetTree = Math.random() < 0.55 ? { i: pick([0, 1, 2, 4, 5]), dx: rand(-20, Hd.sw * 0.25) } : null;
    Hd.lamp = Math.random() < 0.5;
    Hd.driveSide = Hd.garage || (Math.random() < 0.5 ? "left" : "right");
    G.houses.push(Hd);
    G.nextX += Hd.sw + gap;
  }

  const doorWorldX = (h) => h.x + h.doorX;

  // ---------- input ----------
  function toss(typeId) {
    if (!G || G.over || G.demo || G.phase !== "play") return;
    const lo = CAR_X + 20, hi = W * 0.95;
    const target = G.houses.filter((h) => h.order && h.order.state === "open").map((h) => ({ h, sx: doorWorldX(h) - G.cam })).filter((o) => o.sx > lo && o.sx < hi).sort((a, b) => a.sx - b.sx)[0];
    G.throwT = 0.3; sfx.toss();
    const from = { x: G.cam + CAR_X + 20 * CAR_S, y: ROAD - 84 * CAR_S };
    if (target) {
      const h = target.h; h.order.state = "flying";
      const to = { x: doorWorldX(h), y: BASE - 12 };
      G.packs.push({ type: typeId, from, to, t: 0, dur: clamp((to.x - from.x) / 650, 0.4, 0.8), house: h, arc: rand(110, 150) });
    } else {
      G.packs.push({ type: typeId, from, to: { x: from.x + 200 + G.speed * 0.4, y: BASE + YARD * 0.6 }, t: 0, dur: 0.55, house: null, arc: 90 });
    }
    const btn = document.querySelector(`.lox-btn[data-id="${typeId}"]`);
    if (btn) { btn.classList.remove("hit"); void btn.offsetWidth; btn.classList.add("hit"); }
  }

  function land(p) {
    const h = p.house;
    if (!h) { burst(p.to.x, p.to.y, "#E8E2D6", 8); return; }
    const o = h.order;
    if (o.type === p.type) {
      o.state = "done"; o.mood = "happy";
      G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.delivered++; G.done++;
      G.counts[p.type] = (G.counts[p.type] || 0) + 1;
      o.line = GOOD; o.lineT = 2.4;
      floatText(`${G.done} / ${LV(G.level).goal}`, p.to.x, p.to.y - 70, "#FFE3A0", 24);
      if (G.combo >= 3) floatText(`${G.combo}× streak`, p.to.x, p.to.y - 100, "#FFFFFF", 16);
      burst(p.to.x, p.to.y - 10, LOXBY[p.type].color, 24, true);
      sparkle(p.to.x, p.to.y - 20, 14);
      sfx.good(G.combo);
      if (o.friend) G.friendsServed++;
      if (G.combo % 5 === 0) { G.lives++; mikeSay(pick(MIKE_LINES.life)); floatText("+1 bagel", G.cam + CAR_X + 40, ROAD - 150, "#FFE3A0", 22); }
      setMike("happy", 1.2);
      if (G.done >= LV(G.level).goal) levelComplete();
    } else {
      o.state = "wrong"; o.mood = "annoyed";
      o.line = BAD; o.lineT = 2.2; G.oys++;
      burst(p.to.x, p.to.y, "#8B8B8B", 10);
      loseLife("Wrong lox"); sfx.bad(); mikeSay(pick(MIKE_LINES.wrong)); setMike("sad", 1.4);
    }
    updateHUD();
  }

  function loseLife(msg) {
    if (G.over || G.phase !== "play") return;
    G.combo = 0; G.lives--; G.shake = reduced ? 0 : 0.3;
    floatText(msg, G.cam + CAR_X + 60, ROAD - 180, "#FF8A7A", 22);
    updateHUD();
    if (G.lives <= 0) gameOver();
  }

  // ---------- effects ----------
  function burst(x, y, color, n, confetti) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0), v = rand(120, 360);
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, life: rand(0.7, 1.2), age: 0, size: rand(3, 7), color: confetti && Math.random() < 0.35 ? pick(["#FFFFFF", "#FFD66B"]) : color, rot: rand(0, 6), vr: rand(-10, 10), sq: confetti });
    }
  }
  function sparkle(x, y, n) {
    for (let i = 0; i < n; i++) G.parts.push({ x: x + rand(-30, 30), y: y + rand(-30, 10), vx: rand(-30, 30), vy: rand(-80, -30), g: 0, life: rand(0.5, 1), age: 0, size: rand(5, 10), star: true, rot: 0, vr: 0 });
  }
  function floatText(text, x, y, color, size) { G.floats.push({ text, x, y, color, size, age: 0, life: 1.3 }); }
  function setMike(m, t) { G.mikeMood = m; G.mikeMoodT = t; }
  let sayT = 0;
  function mikeSay(text) {
    const b = $("#mikeSays"); b.textContent = text; b.hidden = false;
    b.style.left = Math.round((CAR_X - 10) * S) + "px";
    b.style.bottom = Math.round($(".stage").clientHeight - (ROAD - 118 * CAR_S) * S) + "px";
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    clearTimeout(sayT); sayT = setTimeout(() => (b.hidden = true), 2200);
  }

  // ---------- update ----------
  function update(dt) {
    G.t += dt;
    const fit = clamp(W / 820, 0.74, 1);
    if (G.demo) G.speed = 160 * fit;
    else if (G.phase === "break") G.speed = 120 * fit;
    else if (!G.over) G.speed = (LV(G.level).speed + G.done * 2.5) * fit;
    if (!G.demo) {
      const L = LV(G.level);
      const target = G.phase === "break" ? L.sky[1] : L.sky[0] + (L.sky[1] - L.sky[0]) * (G.done / L.goal);
      G.skyP += (target - G.skyP) * Math.min(1, dt * 0.6);
    }
    G.cam += G.speed * dt;
    while (G.nextX < G.cam + W + 500) addHouse();
    G.houses = G.houses.filter((h) => h.x + h.sw + 400 > G.cam);
    if (G.mikeMoodT > 0 && (G.mikeMoodT -= dt) <= 0) G.mikeMood = "happy";
    if (G.throwT > 0) G.throwT -= dt;
    if (G.shake > 0) G.shake -= dt;

    for (const h of G.houses) {
      const o = h.order; if (!o) continue;
      if (o.lineT > 0) o.lineT -= dt;
      if (o.state === "open" && !G.over && G.phase === "play" && doorWorldX(h) - G.cam < CAR_X - 40) {
        o.state = "missed"; o.mood = "sad";
        if (G.demo) continue;
        o.line = BAD; o.lineT = 2; G.oys++;
        sfx.miss(); mikeSay(pick(MIKE_LINES.miss)); setMike("sad", 1);
        loseLife("Missed");
      }
      if (G.demo && o.state === "open") {
        const sx = doorWorldX(h) - G.cam;
        if (sx < W * 0.6 && sx > CAR_X + 40) {
          o.state = "flying"; G.throwT = 0.3;
          G.packs.push({ type: o.type, from: { x: G.cam + CAR_X + 20 * CAR_S, y: ROAD - 84 * CAR_S }, to: { x: doorWorldX(h), y: BASE - 12 }, t: 0, dur: 0.6, house: h, arc: 130, demo: true });
        }
      }
    }
    for (const p of G.packs) {
      p.t += dt;
      if (p.t >= p.dur && !p.done) {
        p.done = true;
        if (p.demo) { p.house.order.state = "done"; p.house.order.mood = "happy"; burst(p.to.x, p.to.y - 10, LOXBY[p.type].color, 18, true); sparkle(p.to.x, p.to.y - 20, 8); }
        else land(p);
      }
    }
    G.packs = G.packs.filter((p) => !p.done);
    for (const q of G.parts) { q.age += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
    G.parts = G.parts.filter((q) => q.age < q.life);
    for (const f of G.floats) { f.age += dt; f.y -= 46 * dt; }
    G.floats = G.floats.filter((f) => f.age < f.life);
  }

  // ---------- drawing ----------
  function drawSprite(pair, x, y, w, h, light) {
    cx.drawImage(pair.day, x, y, w, h);
    if (light > 0.01) { cx.globalAlpha = light; cx.drawImage(pair.night, x, y, w, h); cx.globalAlpha = 1; }
  }

  function drawSky(k) {
    const g = cx.createLinearGradient(0, 0, 0, BASE + 40);
    g.addColorStop(0, k.top); g.addColorStop(1, k.bot);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    if (k.light > 0.35) {
      for (let i = 0; i < 90; i++) {
        const x = (i * 97.3 + 13) % W, y = (i * 53.7 + i * i * 0.3) % (BASE * 0.7);
        cx.globalAlpha = clamp((k.light - 0.35) * 1.6, 0, 1) * (0.5 + 0.5 * Math.sin(G.t * 2 + i * 1.7));
        cx.fillStyle = "#FFFFFF"; cx.fillRect(x, y, i % 7 ? 1.2 : 2, i % 7 ? 1.2 : 2);
      }
      cx.globalAlpha = 1;
    }
    const sx = W * 0.74, sy = BASE - k.sun * BASE * 0.9;
    if (k.sun > -0.25) {
      cx.save(); cx.globalCompositeOperation = "lighter";
      const glow = cx.createRadialGradient(sx, sy, 8, sx, sy, 240);
      glow.addColorStop(0, "rgba(255,236,190,.55)"); glow.addColorStop(0.3, "rgba(255,210,150,.18)"); glow.addColorStop(1, "rgba(255,210,150,0)");
      cx.fillStyle = glow; cx.fillRect(sx - 240, sy - 240, 480, 480);
      // golden-hour rays
      if (k.sun < 0.45 && k.light < 0.7) {
        cx.fillStyle = `rgba(255,220,160,${0.05 * (1 - k.light)})`;
        for (let i = 0; i < 6; i++) { const a = -2.4 + i * 0.28 + Math.sin(G.t * 0.2 + i) * 0.02; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(sx + Math.cos(a) * 900, sy + Math.sin(a) * 900); cx.lineTo(sx + Math.cos(a + 0.08) * 900, sy + Math.sin(a + 0.08) * 900); cx.fill(); }
      }
      cx.restore();
      cx.fillStyle = k.sun < 0.4 ? "#FFD891" : "#FFF6DA"; cx.beginPath(); cx.arc(sx, sy, 30, 0, 7); cx.fill();
    }
    if (k.light > 0.45) {
      const mx = W * 0.22, my = BASE * 0.24, a = clamp((k.light - 0.45) * 2, 0, 1);
      cx.save(); cx.globalCompositeOperation = "lighter";
      const mg = cx.createRadialGradient(mx, my, 10, mx, my, 110);
      mg.addColorStop(0, `rgba(200,210,255,${0.25 * a})`); mg.addColorStop(1, "rgba(200,210,255,0)");
      cx.fillStyle = mg; cx.fillRect(mx - 110, my - 110, 220, 220); cx.restore();
      cx.fillStyle = `rgba(250,248,236,${a})`; cx.beginPath(); cx.arc(mx, my, 20, 0, 7); cx.fill();
      cx.fillStyle = k.top; cx.globalAlpha = a; cx.beginPath(); cx.arc(mx + 8, my - 5, 17, 0, 7); cx.fill(); cx.globalAlpha = 1;
    }
    // clouds
    for (let i = 0; i < 5; i++) {
      const c = cloudSprite(i % 3), span = W + 400;
      const x = ((i * 330 - G.cam * 0.05 - G.t * 5) % span + span) % span - 260;
      const y = 30 + (i % 3) * 58, s = 0.8 + (i % 2) * 0.35;
      const dusk = clamp(1 - Math.abs(k.light - 0.45) * 3, 0, 1);
      cx.globalAlpha = 0.9; cx.drawImage(c.day, x, y, c.w * s, c.h * s);
      if (dusk > 0) { cx.globalAlpha = dusk * 0.9; cx.drawImage(c.dusk, x, y, c.w * s, c.h * s); }
      if (k.light > 0.5) { cx.globalAlpha = (k.light - 0.5) * 1.8; cx.drawImage(c.night, x, y, c.w * s, c.h * s); }
      cx.globalAlpha = 1;
    }
  }

  function drawDistance(k) {
    // far ridge of trees in atmospheric haze, then a nearer tree line
    const haze = k.botA;
    const lift = Math.max(0, BASE - 430);
    const layers = [
      { par: 0.04, y: BASE - 150 - lift * 0.75, amp: 30, col: "#93A89A", mixSky: 0.78, r: 44, step: 56 },
      { par: 0.08, y: BASE - 105 - lift * 0.45, amp: 22, col: "#7F9B8A", mixSky: 0.62, r: 34, step: 44 },
      { par: 0.22, y: BASE - 62 - lift * 0.2, amp: 16, col: "#4F7757", mixSky: 0.38, r: 30, step: 36 },
      { par: 0.42, y: BASE - 22, amp: 12, col: "#355E3E", mixSky: 0.16, r: 26, step: 30 },
    ];
    for (const L of layers) {
      const base = mixA(L.col, "#0E1530", k.light * 0.8);
      const c = base.map((v, i) => v + (haze[i] - v) * L.mixSky);
      cx.fillStyle = rgba(c, 1);
      const off = G.cam * L.par;
      cx.beginPath(); cx.moveTo(0, BASE + 10);
      for (let i = -1; i < W / L.step + 2; i++) {
        const n = Math.floor(off / L.step) + i, x = n * L.step - off;
        const hh = L.y - Math.abs(Math.sin(n * 1.7)) * L.amp - ((n * 7919) % 11);
        cx.arc(x, hh, L.r + ((n * 131) % 9), Math.PI, 0);
      }
      cx.lineTo(W, BASE + 10); cx.closePath(); cx.fill();
      cx.fillRect(0, L.y, W, BASE + 10 - L.y);
    }
  }

  function drawGround(k) {
    const d = k.light * 0.85;
    // lawn with mowing stripes
    const lawnTop = BASE - 2, lawnH = YARD + 2;
    const lg = cx.createLinearGradient(0, lawnTop, 0, lawnTop + lawnH);
    lg.addColorStop(0, mix("#5F9A4C", "#16291F", d)); lg.addColorStop(1, mix("#78AE5C", "#1C3326", d));
    cx.fillStyle = lg; cx.fillRect(0, lawnTop, W, lawnH);
    cx.fillStyle = `rgba(255,255,255,${0.05 * (1 - d)})`;
    const so = G.cam % 64;
    for (let x = -so; x < W; x += 64) { cx.beginPath(); cx.moveTo(x, lawnTop); cx.lineTo(x + 32, lawnTop); cx.lineTo(x + 44, lawnTop + lawnH); cx.lineTo(x + 12, lawnTop + lawnH); cx.fill(); }
    // driveways + walkways per house
    for (const h of G.houses) {
      const sx = h.x - G.cam; if (sx > W + 50 || sx + h.sw < -150) continue;
      const wx = sx + h.doorX;
      cx.fillStyle = mix("#CFC6B5", "#2C2D40", d);
      cx.beginPath(); cx.moveTo(wx - 9, BASE); cx.lineTo(wx + 9, BASE); cx.lineTo(wx + 12, BASE + YARD); cx.lineTo(wx - 12, BASE + YARD); cx.fill();
      cx.strokeStyle = `rgba(0,0,0,${0.08})`; cx.lineWidth = 1;
      for (let y = BASE + 8; y < BASE + YARD; y += 9) { cx.beginPath(); cx.moveTo(wx - 12, y); cx.lineTo(wx + 12, y); cx.stroke(); }
      const gx = h.garage ? sx + h.garageX + 56 : h.driveSide === "left" ? sx + 10 : sx + h.sw - 10;
      const dg = cx.createLinearGradient(0, BASE, 0, BASE + YARD);
      dg.addColorStop(0, mix("#B9B2A6", "#26283A", d)); dg.addColorStop(1, mix("#A8A196", "#202233", d));
      cx.fillStyle = dg;
      cx.beginPath(); cx.moveTo(gx - 50, BASE); cx.lineTo(gx + 50, BASE); cx.lineTo(gx + 64, BASE + YARD + WALK + TREELAWN); cx.lineTo(gx - 64, BASE + YARD + WALK + TREELAWN); cx.fill();
      cx.fillStyle = "rgba(0,0,0,.05)"; cx.fillRect(gx - 50, BASE, 100, 4);
    }
    // sidewalk
    const sw = BASE + YARD;
    cx.fillStyle = mix("#E2DDD3", "#34364C", d); cx.fillRect(0, sw, W, WALK);
    cx.fillStyle = mix("#CFC9BD", "#2A2C40", d);
    const o2 = G.cam % 34; for (let x = -o2; x < W; x += 34) cx.fillRect(x, sw, 1.5, WALK);
    // tree lawn + granite curb
    cx.fillStyle = mix("#6FA457", "#1A3024", d); cx.fillRect(0, sw + WALK, W, TREELAWN);
    cx.fillStyle = mix("#C9C4BA", "#3A3C52", d); cx.fillRect(0, sw + WALK + TREELAWN, W, CURB);
    cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(0, sw + WALK + TREELAWN + CURB, W, 3);
    // road
    const ry = sw + WALK + TREELAWN + CURB;
    cx.save(); cx.translate(-(G.cam % 128), 0);
    cx.fillStyle = asphaltPattern(); cx.fillRect(0, ry, W + 128, H - ry);
    cx.restore();
    const rg = cx.createLinearGradient(0, ry, 0, H);
    rg.addColorStop(0, `rgba(10,12,28,${0.05 + d * 0.55})`); rg.addColorStop(1, `rgba(10,12,28,${0.25 + d * 0.5})`);
    cx.fillStyle = rg; cx.fillRect(0, ry, W, H - ry);
    // manhole covers
    cx.fillStyle = "rgba(0,0,0,.18)";
    const mo = G.cam % 700; for (let x = 480 - mo; x < W + 100; x += 700) { cx.beginPath(); cx.ellipse(x, ROAD + 18, 16, 4, 0, 0, 7); cx.fill(); }
  }

  function drawMailboxesLamps(k) {
    const d = k.light, curbY = BASE + YARD + WALK + TREELAWN;
    for (const h of G.houses) {
      const sx = h.x - G.cam; if (sx > W + 60 || sx + h.sw < -60) continue;
      // mailbox (flag up while their order is open)
      const mx = sx + h.doorX + (h.driveSide === "left" ? 40 : -40);
      cx.fillStyle = "#23262B"; cx.fillRect(mx - 1.5, curbY - 26, 3, 26);
      cx.fillStyle = mix("#1B1D22", "#0A0B10", d * 0.5); rr(cx, mx - 9, curbY - 36, 18, 11, 5); cx.fill();
      cx.fillStyle = "rgba(255,255,255,.18)"; cx.fillRect(mx - 7, curbY - 34, 14, 1.5);
      const up = h.order && h.order.state === "open";
      cx.fillStyle = "#C8342B"; cx.save(); cx.translate(mx + 8, curbY - 30); cx.rotate(up ? -1.5 : 0); cx.fillRect(0, -1.5, 10, 3); cx.fillRect(7, -4, 3, 5); cx.restore();
      // colonial lamp post
      if (h.lamp) {
        const lx = sx + h.sw - 6, top = curbY - 86;
        cx.fillStyle = "#1B1D22"; cx.fillRect(lx - 2.5, top + 16, 5, 86 - 16); cx.fillRect(lx - 6, curbY - 4, 12, 4);
        cx.beginPath(); cx.moveTo(lx - 8, top + 16); cx.lineTo(lx + 8, top + 16); cx.lineTo(lx + 6, top); cx.lineTo(lx - 6, top); cx.fill();
        cx.beginPath(); cx.moveTo(lx - 9, top); cx.lineTo(lx, top - 8); cx.lineTo(lx + 9, top); cx.fill();
        cx.fillStyle = d > 0.3 ? "#FFE1A0" : "#DCE3EA"; cx.fillRect(lx - 4, top + 2, 8, 12);
        if (d > 0.3) {
          cx.save(); cx.globalCompositeOperation = "lighter";
          const g2 = cx.createRadialGradient(lx, top + 8, 2, lx, top + 8, 90);
          g2.addColorStop(0, `rgba(255,214,150,${0.55 * d})`); g2.addColorStop(1, "rgba(255,214,150,0)");
          cx.fillStyle = g2; cx.fillRect(lx - 90, top - 82, 180, 180);
          cx.restore();
        }
      }
    }
  }

  function drawWilmotSign(k) {
    const x = 60 - G.cam; if (x < -300 || x > W + 50) return;
    const y = BASE + YARD - 4, d = k.light * 0.7;
    cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(x + 110, y + 2, 120, 6, 0, 0, 7); cx.fill();
    cx.fillStyle = mix("#B5AC9F", "#2F3144", d); rr(cx, x, y - 46, 220, 46, 6); cx.fill();
    cx.fillStyle = mix("#9C9387", "#262838", d); for (const px of [x - 6, x + 206]) { rr(cx, px, y - 62, 20, 62, 4); cx.fill(); }
    cx.fillStyle = mix("#2E3B2F", "#0F1512", d); rr(cx, x + 22, y - 38, 176, 28, 4); cx.fill();
    cx.fillStyle = mix("#E5D39A", "#9B8C62", d); cx.font = "600 15px Fraunces, Georgia, serif"; cx.textAlign = "center"; cx.fillText("WILMOT WOODS", x + 110, y - 19);
    for (let i = 0; i < 9; i++) { cx.fillStyle = i % 2 ? "#E7B8C8" : "#F6F1F4"; cx.beginPath(); cx.arc(x + 14 + i * 24, y - 2, 5, 0, 7); cx.fill(); }
  }

  function drawFace(o, x, y, r) {
    if (o.friend) {
      const im = FACES[o.friend][o.mood];
      cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.clip();
      if (im && im.complete) cx.drawImage(im, x - r, y - r, r * 2, r * 2);
      cx.restore();
      cx.strokeStyle = CHARACTERS[o.friend].color; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.stroke();
      return;
    }
    const f = o.face;
    const bg = cx.createLinearGradient(0, y - r, 0, y + r); bg.addColorStop(0, "#F3EEE6"); bg.addColorStop(1, "#E2D9CB");
    cx.fillStyle = bg; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill();
    cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.clip();
    cx.fillStyle = "#3B4A63"; cx.beginPath(); cx.ellipse(x, y + r * 1.05, r * 0.85, r * 0.55, 0, 0, 7); cx.fill();
    cx.fillStyle = f.skin; cx.beginPath(); cx.ellipse(x, y + 1, r * 0.55, r * 0.64, 0, 0, 7); cx.fill();
    cx.fillStyle = f.hair; cx.beginPath();
    if (f.style === 0) cx.ellipse(x, y - r * 0.36, r * 0.6, r * 0.36, 0, Math.PI, 0);
    else if (f.style === 1) { cx.ellipse(x, y - r * 0.2, r * 0.66, r * 0.58, 0, Math.PI * 0.95, Math.PI * 2.05); cx.rect(x - r * 0.66, y - r * 0.2, r * 0.2, r * 0.9); cx.rect(x + r * 0.46, y - r * 0.2, r * 0.2, r * 0.9); }
    else if (f.style === 2) { for (let i = -2; i <= 2; i++) cx.arc(x + i * r * 0.22, y - r * 0.52, r * 0.2, 0, 7); }
    else cx.ellipse(x, y - r * 0.42, r * 0.52, r * 0.22, 0, Math.PI, 0);
    cx.fill(); cx.restore();
    cx.fillStyle = "#2A1C14";
    cx.beginPath(); cx.arc(x - r * 0.22, y + 1, 1.6, 0, 7); cx.arc(x + r * 0.22, y + 1, 1.6, 0, 7); cx.fill();
    cx.strokeStyle = "#8A3A2E"; cx.lineWidth = 1.6; cx.lineCap = "round"; cx.beginPath();
    if (o.mood === "happy") cx.arc(x, y + 5, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (o.mood === "annoyed" || o.mood === "sad") cx.arc(x, y + 11, r * 0.17, 1.2 * Math.PI, 1.8 * Math.PI);
    else { cx.moveTo(x - 3.5, y + 8); cx.lineTo(x + 3.5, y + 8); }
    cx.stroke();
  }

  function drawLox(c, type, x, y, s, rot = 0) {
    const L = LOXBY[type];
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(1, 10, 30, 6, 0, 0, 7); c.fill();
    c.beginPath();
    c.moveTo(-30, 6); c.bezierCurveTo(-24, -20, 18, -24, 32, -6); c.bezierCurveTo(22, 6, -6, 18, -30, 6); c.closePath();
    const g = c.createLinearGradient(-30, -20, 30, 16);
    g.addColorStop(0, L.base); g.addColorStop(1, type === "pastrami" ? "#9E3F2E" : "#F2663F");
    c.fillStyle = g; c.fill();
    if (type === "pastrami") { c.lineWidth = 5; c.strokeStyle = "#2E1A15"; c.stroke(); }
    c.save(); c.clip();
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(-24 + i * 9, 12); c.quadraticCurveTo(-14 + i * 9, -4, -4 + i * 9, -22); c.stroke(); }
    const dots = (col, n, r) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(((i * 37) % 54) - 26, ((i * 23) % 26) - 14, r, 0, 7); c.fill(); } };
    if (type === "togarashi") { dots("#A8140E", 14, 1.8); dots("#F4A000", 6, 1.3); dots("#1B1B1B", 5, 0.9); }
    if (type === "pastrami") dots("#1B1B1B", 16, 1.5);
    if (type === "korean") { c.fillStyle = "rgba(255,255,255,.28)"; c.fillRect(-30, -20, 60, 7); dots("#FFF6DC", 10, 1.3); c.strokeStyle = "#2DA85A"; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-16 + i * 11, -2 + (i % 2) * 6, 2.5, 0, 7); c.stroke(); } }
    c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.ellipse(-6, -10, 14, 3, -0.3, 0, 7); c.fill();
    c.restore(); c.restore();
  }

  function drawOrder(h) {
    const o = h.order; if (!o) return;
    const x = doorWorldX(h) - G.cam;
    const roofTop = BASE - h.wallH - h.roofH - 30;
    const bob = reduced ? 0 : Math.sin(G.t * 2.6 + h.x) * 3;
    const y = roofTop - 30 + bob;
    const inRange = o.state === "open" && x > CAR_X + 20 && x < W * 0.95;
    const bw = 152, bh = 58, col = LOXBY[o.type].color;
    cx.save(); cx.translate(x, y);
    if (inRange && !reduced) { const s = 1.04 + Math.sin(G.t * 7) * 0.02; cx.scale(s, s); }
    const done = o.state === "done", bad = o.state === "wrong" || o.state === "missed";
    cx.shadowColor = inRange ? col : "rgba(0,0,0,.25)"; cx.shadowBlur = inRange ? 24 : 14; cx.shadowOffsetY = inRange ? 0 : 4;
    cx.fillStyle = "rgba(255,255,255,.96)";
    rr(cx, -bw / 2, -bh / 2, bw, bh, 16); cx.fill();
    cx.beginPath(); cx.moveTo(-7, bh / 2 - 1); cx.lineTo(0, bh / 2 + 10); cx.lineTo(7, bh / 2 - 1); cx.fill();
    cx.shadowColor = "transparent"; cx.shadowBlur = 0; cx.shadowOffsetY = 0;
    if (inRange) { cx.strokeStyle = col; cx.lineWidth = 2.5; rr(cx, -bw / 2, -bh / 2, bw, bh, 16); cx.stroke(); }
    drawFace(o, -bw / 2 + 29, 0, 19);
    cx.textAlign = "left";
    if (done) {
      cx.fillStyle = "#1F8F58"; cx.beginPath(); cx.arc(-8, 0, 12, 0, 7); cx.fill();
      cx.strokeStyle = "#FFFFFF"; cx.lineWidth = 3; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(-14, 0); cx.lineTo(-9.5, 5); cx.lineTo(-2, -5); cx.stroke();
      cx.fillStyle = "#1F2A24"; cx.font = `700 12px ${UI_FONT}`; cx.fillText("Delivered", 9, 4);
    } else if (bad) {
      cx.fillStyle = "#9A3A30"; cx.font = `700 12px ${UI_FONT}`; cx.fillText(o.state === "missed" ? "Missed" : "Wrong order", -14, 4);
    } else {
      drawLox(cx, o.type, 24, -8, 0.62);
      cx.fillStyle = col; cx.beginPath(); cx.arc(-15, 15, 3.5, 0, 7); cx.fill();
      cx.fillStyle = "#23232F"; cx.font = `800 11px ${UI_FONT}`; cx.fillText(LOXBY[o.type].name.toUpperCase(), -8, 19);
    }
    cx.restore();
    if (o.line && o.lineT > 0) {
      cx.save(); cx.globalAlpha = clamp(o.lineT, 0, 1);
      cx.font = `700 13px ${UI_FONT}`;
      const tw = cx.measureText(o.line).width + 24;
      cx.fillStyle = "rgba(20,22,38,.92)"; rr(cx, x - tw / 2, y - bh / 2 - 38, tw, 28, 14); cx.fill();
      cx.fillStyle = "#FFFFFF"; cx.textAlign = "center"; cx.fillText(o.line, x, y - bh / 2 - 19);
      cx.restore();
    }
  }

  // Black Mazda CX-50, side view facing right. Origin: ground under the car's center.
  const BODY = (() => {
    const p = new Path2D();
    p.moveTo(-104, -26); p.lineTo(-107, -46); p.quadraticCurveTo(-107, -60, -101, -64);
    p.lineTo(-92, -80); p.quadraticCurveTo(-88, -87, -78, -87); p.lineTo(12, -89);
    p.quadraticCurveTo(22, -89, 29, -83); p.lineTo(55, -61); p.quadraticCurveTo(82, -57, 99, -51);
    p.quadraticCurveTo(109, -47, 109, -38); p.lineTo(107, -24); p.lineTo(93, -21);
    p.arc(66, -21, 27, 0, Math.PI, true); p.lineTo(-37, -21); p.arc(-64, -21, 27, 0, Math.PI, true); p.closePath();
    return p;
  })();
  const GLASS = (() => {
    const p = new Path2D();
    p.moveTo(-88, -66); p.lineTo(-82, -79); p.quadraticCurveTo(-79, -83, -72, -83); p.lineTo(11, -85);
    p.quadraticCurveTo(19, -85, 24, -80); p.lineTo(46, -63); p.lineTo(-88, -63); p.closePath();
    return p;
  })();

  function drawCar(k) {
    const x = CAR_X, y = ROAD, s = CAR_S, t = G.t;
    const bounce = reduced ? 0 : Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.25;
    const night = k.light;
    // headlight beams (drawn first, under the car)
    if (night > 0.25) {
      cx.save(); cx.globalCompositeOperation = "lighter";
      const bx = x + 108 * s, by = y - 40 * s;
      const beam = cx.createLinearGradient(bx, 0, bx + 380, 0);
      beam.addColorStop(0, `rgba(255,246,220,${0.35 * night})`); beam.addColorStop(1, "rgba(255,246,220,0)");
      cx.fillStyle = beam; cx.beginPath(); cx.moveTo(bx, by - 3); cx.lineTo(bx + 380, by - 40); cx.lineTo(bx + 380, y + 26); cx.lineTo(bx, by + 6); cx.fill();
      const pool = cx.createRadialGradient(bx + 160, y + 10, 5, bx + 160, y + 10, 150);
      pool.addColorStop(0, `rgba(255,240,210,${0.22 * night})`); pool.addColorStop(1, "rgba(255,240,210,0)");
      cx.fillStyle = pool; cx.beginPath(); cx.ellipse(bx + 160, y + 10, 170, 22, 0, 0, 7); cx.fill();
      cx.restore();
    }
    // shadow
    const sh = cx.createRadialGradient(x, y + 2, 10, x, y + 2, 120 * s);
    sh.addColorStop(0, "rgba(0,0,0,.45)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    cx.fillStyle = sh; cx.beginPath(); cx.ellipse(x, y + 2, 118 * s, 10, 0, 0, 7); cx.fill();

    cx.save(); cx.translate(x, y + bounce); cx.scale(s, s);
    // body paint: deep black metallic
    const paint = cx.createLinearGradient(0, -89, 0, -20);
    paint.addColorStop(0, "#4A505B"); paint.addColorStop(0.18, "#1E2127"); paint.addColorStop(0.55, "#0B0C10"); paint.addColorStop(1, "#1B1D23");
    cx.fillStyle = paint; cx.fill(BODY);
    cx.save(); cx.clip(BODY);
    // sky reflection along the flank
    const refl = cx.createLinearGradient(0, -62, 0, -40);
    refl.addColorStop(0, rgba(k.botA, 0.28)); refl.addColorStop(1, rgba(k.botA, 0));
    cx.fillStyle = refl; cx.fillRect(-110, -62, 220, 22);
    const sweep = cx.createLinearGradient(-110, 0, 110, 0);
    const sp = clamp((((G.cam * 0.4) % 400) + 400) % 400 / 400, 0, 1);
    sweep.addColorStop(clamp(sp - 0.12, 0, 1), "rgba(255,255,255,0)"); sweep.addColorStop(sp, "rgba(255,255,255,.10)"); sweep.addColorStop(clamp(sp + 0.12, 0, 1), "rgba(255,255,255,0)");
    cx.fillStyle = sweep; cx.fillRect(-110, -90, 220, 70);
    // lower cladding + arch cladding (CX-50's rugged trim)
    cx.fillStyle = "#15161A"; cx.fillRect(-110, -32, 220, 12);
    cx.strokeStyle = "#15161A"; cx.lineWidth = 7;
    cx.beginPath(); cx.arc(66, -21, 27, Math.PI, 0); cx.stroke(); cx.beginPath(); cx.arc(-64, -21, 27, Math.PI, 0); cx.stroke();
    cx.restore();
    // shoulder highlight
    cx.strokeStyle = "rgba(255,255,255,.32)"; cx.lineWidth = 1.2;
    cx.beginPath(); cx.moveTo(-100, -61); cx.quadraticCurveTo(0, -58, 97, -50); cx.stroke();
    cx.strokeStyle = "rgba(255,255,255,.14)"; cx.beginPath(); cx.moveTo(56, -60); cx.quadraticCurveTo(82, -56, 100, -50); cx.stroke();
    // door seams + handles
    cx.strokeStyle = "rgba(0,0,0,.7)"; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(-20, -62); cx.lineTo(-22, -26); cx.moveTo(30, -61); cx.quadraticCurveTo(36, -44, 33, -26); cx.moveTo(-60, -63); cx.lineTo(-64, -48); cx.stroke();
    cx.fillStyle = "#3A3E46"; rr(cx, -36, -55, 11, 3, 1.5); cx.fill(); rr(cx, 14, -55, 11, 3, 1.5); cx.fill();

    // glass + Mike at the wheel
    const gl = cx.createLinearGradient(-88, -85, 46, -63);
    gl.addColorStop(0, "#26303F"); gl.addColorStop(1, "#0A0D14");
    cx.fillStyle = gl; cx.fill(GLASS);
    cx.save(); cx.clip(GLASS);
    const face = FACES.mike[G.mikeMood] || FACES.mike.happy;
    if (face.complete) cx.drawImage(face, -14, -98, 40, 40);
    cx.fillStyle = "rgba(15,20,32,.28)"; cx.fillRect(-90, -90, 140, 30);
    cx.fillStyle = rgba(k.topA, 0.22);
    cx.beginPath(); cx.moveTo(-70, -85); cx.lineTo(-52, -85); cx.lineTo(-74, -63); cx.lineTo(-92, -63); cx.fill();
    cx.beginPath(); cx.moveTo(26, -85); cx.lineTo(34, -85); cx.lineTo(14, -63); cx.lineTo(6, -63); cx.fill();
    cx.restore();
    // pillars + roof rails
    cx.fillStyle = "#08090C";
    cx.beginPath(); cx.moveTo(-22, -85); cx.lineTo(-17, -85); cx.lineTo(-19, -63); cx.lineTo(-24, -63); cx.fill();
    cx.beginPath(); cx.moveTo(-68, -84); cx.lineTo(-58, -84); cx.lineTo(-64, -63); cx.lineTo(-76, -63); cx.fill();
    cx.fillStyle = "#1A1B20"; rr(cx, -80, -94, 90, 3.5, 1.5); cx.fill();
    cx.fillRect(-76, -91, 4, 3); cx.fillRect(4, -91, 4, 3);
    // mirror
    cx.fillStyle = "#101116"; cx.beginPath(); cx.moveTo(38, -66); cx.quadraticCurveTo(48, -70, 50, -62); cx.lineTo(40, -60); cx.fill();
    // Mike's arm while tossing
    if (G.throwT > 0) {
      const p = 1 - G.throwT / 0.3;
      cx.strokeStyle = "#26324F"; cx.lineWidth = 7; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(18, -68); cx.lineTo(30 + p * 10, -92 - p * 14); cx.stroke();
      cx.fillStyle = "#F4C7A1"; cx.beginPath(); cx.arc(31 + p * 10, -95 - p * 14, 4.5, 0, 7); cx.fill();
    }
    // lights
    cx.fillStyle = night > 0.25 ? "#FFFFFF" : "#E7F2FF";
    cx.beginPath(); cx.moveTo(92, -52); cx.lineTo(106, -47); cx.lineTo(105, -44); cx.lineTo(91, -48); cx.fill();
    cx.fillStyle = "#B3141F"; cx.beginPath(); cx.moveTo(-106, -62); cx.lineTo(-99, -64); cx.lineTo(-98, -58); cx.lineTo(-106, -56); cx.fill();
    if (night > 0.25) {
      cx.save(); cx.globalCompositeOperation = "lighter";
      for (const [lx, ly, c] of [[100, -48, "255,246,220"], [-103, -60, "255,40,50"]]) {
        const g2 = cx.createRadialGradient(lx, ly, 1, lx, ly, 26);
        g2.addColorStop(0, `rgba(${c},${0.8 * night})`); g2.addColorStop(1, `rgba(${c},0)`);
        cx.fillStyle = g2; cx.fillRect(lx - 26, ly - 26, 52, 52);
      }
      cx.restore();
    }
    // wheels
    const spin = G.cam / 17;
    for (const wx of [-64, 66]) {
      cx.fillStyle = "#0E0F12"; cx.beginPath(); cx.arc(wx, -21, 21, 0, 7); cx.fill();
      cx.strokeStyle = "#1E2025"; cx.lineWidth = 2; cx.beginPath(); cx.arc(wx, -21, 18.5, 0, 7); cx.stroke();
      const rim = cx.createRadialGradient(wx - 3, -24, 1, wx, -21, 14);
      rim.addColorStop(0, "#5B616B"); rim.addColorStop(1, "#23262C");
      cx.fillStyle = rim; cx.beginPath(); cx.arc(wx, -21, 13.5, 0, 7); cx.fill();
      cx.strokeStyle = "#8C939E"; cx.lineWidth = 2.6;
      for (let i = 0; i < 5; i++) { const a = spin + (i * 2 * Math.PI) / 5; cx.beginPath(); cx.moveTo(wx + Math.cos(a) * 3, -21 + Math.sin(a) * 3); cx.lineTo(wx + Math.cos(a) * 12.5, -21 + Math.sin(a) * 12.5); cx.stroke(); }
      cx.fillStyle = "#15161A"; cx.beginPath(); cx.arc(wx, -21, 3, 0, 7); cx.fill();
    }
    cx.restore();
  }

  function drawPack(p) {
    const k = clamp(p.t / p.dur, 0, 1);
    const gx = p.from.x + (p.to.x - p.from.x) * k - G.cam, gy = p.from.y + (p.to.y - p.from.y) * k;
    const x = gx, y = gy - Math.sin(k * Math.PI) * p.arc;
    cx.fillStyle = "rgba(0,0,0,.16)"; cx.beginPath(); cx.ellipse(gx, gy + 14, 12 * (1 - Math.sin(k * Math.PI) * 0.5), 3, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.rotate(k * Math.PI * 2.5);
    const pg = cx.createLinearGradient(0, -10, 0, 10); pg.addColorStop(0, "#FFFFFF"); pg.addColorStop(1, "#E6E1D8");
    cx.fillStyle = pg; rr(cx, -15, -10, 30, 20, 4); cx.fill();
    cx.fillStyle = LOXBY[p.type].color; cx.fillRect(-15, -2.5, 30, 5);
    cx.fillStyle = "#C8A45A"; cx.beginPath(); cx.arc(0, 0, 3.5, 0, 7); cx.fill();
    cx.restore();
  }

  function drawFX() {
    for (const q of G.parts) {
      const a = 1 - q.age / q.life;
      cx.save(); cx.globalAlpha = a; cx.translate(q.x - G.cam, q.y); cx.rotate(q.rot);
      if (q.star) {
        cx.globalCompositeOperation = "lighter"; cx.fillStyle = "#FFE7A8";
        const r = q.size * (0.5 + a * 0.5);
        cx.beginPath(); cx.moveTo(0, -r); cx.lineTo(r * 0.2, -r * 0.2); cx.lineTo(r, 0); cx.lineTo(r * 0.2, r * 0.2); cx.lineTo(0, r); cx.lineTo(-r * 0.2, r * 0.2); cx.lineTo(-r, 0); cx.lineTo(-r * 0.2, -r * 0.2); cx.fill();
      } else if (q.sq) { cx.fillStyle = q.color; cx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); }
      else { cx.fillStyle = q.color; cx.beginPath(); cx.arc(0, 0, q.size / 2, 0, 7); cx.fill(); }
      cx.restore();
    }
    for (const f of G.floats) {
      const a = 1 - f.age / f.life, s = 1 + Math.max(0, 0.25 - f.age) * 1.6;
      cx.save(); cx.globalAlpha = a; cx.translate(f.x - G.cam, f.y); cx.scale(s, s);
      cx.font = `800 ${f.size}px ${UI_FONT}`; cx.textAlign = "center";
      cx.shadowColor = "rgba(0,0,0,.45)"; cx.shadowBlur = 8; cx.shadowOffsetY = 2;
      cx.fillStyle = f.color; cx.fillText(f.text, 0, 0);
      cx.restore();
    }
  }

  function draw() {
    const k = G.demo ? sky(G.t + 8) : skyAt(G.skyP);
    cx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
    cx.imageSmoothingQuality = "high";
    if (G.shake > 0) cx.translate(rand(-5, 5) * G.shake * 2, rand(-3, 3) * G.shake * 2);
    drawSky(k);
    drawDistance(k);
    // trees between and behind houses
    for (const h of G.houses) if (h.backTree) {
      const T = treeSprite(h.backTree.i), tx = h.x + h.backTree.dx - G.cam - T.w / 2;
      if (tx < W + 20 && tx + T.w > -20) drawSprite(T, tx, BASE - T.h + 6, T.w, T.h, k.light);
    }
    for (const h of G.houses) {
      const sx = h.x - G.cam; if (sx > W + 20 || sx + h.sw < -20) continue;
      if (!h.spr) h.spr = houseSprites(h);
      drawSprite(h.spr, sx, BASE - h.sh + 8, h.sw, h.sh, k.light);
    }
    drawGround(k);
    drawWilmotSign(k);
    drawMailboxesLamps(k);
    // street trees in the tree lawn, in front of the houses
    for (const h of G.houses) if (h.streetTree) {
      const T = treeSprite(h.streetTree.i), tx = h.x + h.streetTree.dx - G.cam - T.w / 2;
      const ty = BASE + YARD + WALK + TREELAWN - T.h + 4;
      if (tx < W + 20 && tx + T.w > -20) drawSprite(T, tx, ty, T.w, T.h, k.light);
    }
    for (const h of G.houses) { const sx = doorWorldX(h) - G.cam; if (sx > -120 && sx < W + 120) drawOrder(h); }
    drawCar(k);
    for (const p of G.packs) drawPack(p);
    drawFX();
    // cinematic grade: vignette + warm/cool wash
    const v = cx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(8,10,24,${0.28 + k.light * 0.18})`);
    cx.fillStyle = v; cx.fillRect(-20, -20, W + 40, H + 40);
  }

  // ---------- HUD / screens ----------
  const BAGEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="13" rx="11" ry="8.5" fill="#C98A4B"/><ellipse cx="12" cy="11.5" rx="10.5" ry="7.5" fill="#E2A864"/><ellipse cx="12" cy="11.5" rx="3.2" ry="2.1" fill="#8A5A2E"/><g fill="#FFF3D9"><circle cx="7" cy="9" r=".8"/><circle cx="16" cy="8" r=".8"/><circle cx="18" cy="12" r=".8"/><circle cx="6" cy="13" r=".8"/><circle cx="11" cy="7" r=".7"/><circle cx="13" cy="16" r=".8"/></g></svg>';
  function updateHUD() {
    const L = LV(G.level);
    $("#goal").innerHTML = `<small>Level ${G.level + 1}</small> ${Math.min(G.done, L.goal)}<span>/${L.goal}</span>`;
    $("#goalBar").style.width = (Math.min(G.done, L.goal) / L.goal) * 100 + "%";
    const shown = Math.min(G.lives, 5);
    $("#lives").innerHTML = Array.from({ length: Math.max(shown, 1) }, (_, i) => `<span class="${i < G.lives ? "" : "gone"}">${BAGEL}</span>`).join("") + (G.lives > 5 ? `<b>\u00d7${G.lives}</b>` : "");
    const c = $("#combo");
    c.textContent = G.combo >= 2 ? `${G.combo}× streak` : "";
    c.classList.toggle("hot", G.combo >= 5);
  }

  function statsHTML(rows) { return rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join(""); }

  function levelComplete() {
    G.phase = "break";
    for (const h of G.houses) if (h.order && h.order.state === "open") h.order = null;
    const cur = LV(G.level), next = LV(G.level + 1);
    const added = next.types.length > cur.types.length ? LOXBY[next.types[next.types.length - 1]] : null;
    bestLevel = Math.max(bestLevel, G.level + 2); try { localStorage.setItem("fishFriday.bestLevel", bestLevel); } catch {}
    setTimeout(() => {
      $("#lvlKicker").textContent = `Level ${G.level + 1} complete`;
      $("#lvlTitle").textContent = `Level ${G.level + 2}`;
      $("#lvlNew").innerHTML = added
        ? `<span class="plate">${plateImg(added.id)}</span><span><b>${added.name}</b> joins the menu</span>`
        : `<span class="faster">\u00bb</span><span>The street gets <b>a little faster</b></span>`;
      $("#lvlGoal").textContent = `Deliver to ${next.goal} houses. Bagels: ${G.lives}.`;
      $("#levelUp").hidden = false; $("#bar").classList.add("off");
    }, 900);
  }
  function nextLevel() {
    $("#levelUp").hidden = true;
    const added = LV(G.level + 1).types.length > LV(G.level).types.length;
    G.level++; G.done = 0; G.phase = "play";
    buildBar(); $("#bar").classList.remove("off");
    updateHUD(); mikeSay(pick(added ? MIKE_LINES.level : MIKE_LINES.faster));
  }

  function gameOver() {
    G.over = true; sfx.over();
    bestLevel = Math.max(bestLevel, G.level + 1); try { localStorage.setItem("fishFriday.bestLevel", bestLevel); } catch {}
    $("#overLevel").textContent = `Made it to level ${G.level + 1}`;
    $("#overStats").innerHTML = statsHTML([["This level", `${G.done} of ${LV(G.level).goal}`], ["Orders delivered", G.delivered], ["Longest streak", G.bestCombo], ["Best level ever", bestLevel]]);
    $("#retryBtn").textContent = `TRY LEVEL ${G.level + 1} AGAIN`;
    setTimeout(() => { $("#over").hidden = false; $("#bar").classList.add("off"); }, 700);
  }

  function start(level = 0) {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    ["#title", "#over", "#levelUp"].forEach((id) => ($(id).hidden = true));
    $("#hud").hidden = false;
    newGame(false, level);
    buildBar(); $("#bar").classList.remove("off");
    resize(); updateHUD();
    mikeSay(pick(MIKE_LINES.start));
  }

  // buttons + legend
  const PLATES = {};
  LOX.forEach((l) => {
    const ic = document.createElement("canvas"); ic.width = 150; ic.height = 96;
    const c2 = ic.getContext("2d"); c2.scale(2, 2); drawLox(c2, l.id, 37, 25, 1);
    PLATES[l.id] = ic.toDataURL();
  });
  const plateImg = (id) => `<img alt="" src="${PLATES[id]}">`;
  let barTypes = [];
  function buildBar() {
    const bar = $("#bar"); bar.textContent = "";
    barTypes = LV(G.level).types;
    bar.style.setProperty("--n", barTypes.length);
    barTypes.forEach((id, i) => {
      const l = LOXBY[id];
      const b = document.createElement("button");
      b.className = "lox-btn"; b.type = "button"; b.dataset.id = id; b.style.setProperty("--c", l.color);
      b.innerHTML = `<span class="plate">${plateImg(id)}</span><span class="nm">${l.name}</span><kbd>${i + 1}</kbd>`;
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); toss(id); });
      b.addEventListener("click", (e) => { if (e.detail === 0) toss(id); });
      bar.append(b);
    });
  }
  LOX.forEach((l, i) => {
    const leg = document.createElement("li");
    leg.innerHTML = `<span class="plate">${plateImg(l.id)}</span><span style="--c:${l.color}">${l.name}</span><small>Level ${Math.max(1, i)}+</small>`;
    $("#legend").append(leg);
  });
  addEventListener("keydown", (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= barTypes.length && !e.repeat && G && !G.demo && G.phase === "play") toss(barTypes[n - 1]);
    if (e.key === "Enter" || e.key === " ") {
      if (!$("#title").hidden) { e.preventDefault(); start(0); }
      else if (!$("#over").hidden) { e.preventDefault(); start(G.level); }
      else if (!$("#levelUp").hidden) { e.preventDefault(); nextLevel(); }
    }
  });
  $("#startBtn").onclick = () => start(0);
  $("#retryBtn").onclick = () => start(G.level);
  $("#restartBtn").onclick = () => start(0);
  $("#lvlBtn").onclick = nextLevel;
  const syncMute = () => { $("#muteBtn").innerHTML = muted ? "&#128263;" : "&#128266;"; $("#muteBtn").setAttribute("aria-label", muted ? "Sound off" : "Sound on"); };
  $("#muteBtn").onclick = () => { muted = !muted; try { localStorage.setItem("loxRun.muted", muted ? "1" : "0"); } catch {} syncMute(); };
  syncMute();
  $("#bestLine").textContent = bestLevel > 1 ? `Best: level ${bestLevel}` : "";

  // test hook (only with #autotest in the URL)
  if (location.hash === "#autotest") window.__fish = () => ({ G, barTypes, CAR_X, W, door: doorWorldX, LV, ROAD, S });

  // ---------- main loop ----------
  resize();
  newGame(true);
  $("#hud").hidden = true;
  let last = performance.now();
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    if (!document.hidden) { update(dt); draw(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
