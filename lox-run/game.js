// Lox Run: Mike's Sunday lox delivery route.
// One canvas, drawn fresh every frame. Friend faces come from friends.js.

(() => {
  // ---------- lox menu ----------
  const LOX = [
    { id: "plain", name: "Plain", color: "#F28A6B", base: "#FF9A78", key: ["1", "a"] },
    { id: "togarashi", name: "Togarashi", color: "#E0342B", base: "#FF7E5C", key: ["2", "s"] },
    { id: "pastrami", name: "Pastrami", color: "#6A3A2B", base: "#D0634A", key: ["3", "d"] },
    { id: "korean", name: "Korean", color: "#1E9E5A", base: "#FF7440", key: ["4", "f"] },
  ];
  const LOXBY = Object.fromEntries(LOX.map((l) => [l.id, l]));

  const FRIEND_LINES = {
    adam: { good: ["Quietly. Thank you.", "Good. No youths?"], bad: ["Youths.", "This is not what I ordered."] },
    billy: { good: ["Nice packaging.", "Acceptable. Very."], bad: ["That's terrible.", "Who packed this?"] },
    marshall: { good: ["Great. Now come see the river.", "This is what I'm saying."], bad: ["Where is this from?", "Hm."] },
  };
  const MIKE_LINES = {
    streak: ["Optimal route confirmed.", "I mapped this.", "Tuesday-level efficiency.", "See? Research."],
    wrong: ["Wait. That can't be right.", "Hold on, let me check.", "That's… not in the spreadsheet."],
    miss: ["I'll circle back.", "Recalculating."],
  };

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  const mixA = (a, b, t) => hex(a).map((v, i) => v + (hex(b)[i] - v) * t);
  const rgba = (arr, al) => `rgba(${arr.map(Math.round).join(",")},${al})`;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const img = (svg) => { const i = new Image(); i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); return i; };
  const FACES = {};
  for (const id of ["mike", "adam", "billy", "marshall"]) {
    FACES[id] = {};
    for (const m of ["neutral", "happy", "annoyed", "talk", "sad"]) FACES[id][m] = img(avatarSVG(id, m, { token: true, noProps: true, noBg: id === "mike" }));
  }

  // ---------- storage ----------
  let best = 0;
  try { best = +localStorage.getItem("loxRun.best") || 0; } catch {}
  let muted = false;
  try { muted = localStorage.getItem("loxRun.muted") === "1"; } catch {}

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
    toss: () => tone(300, 0.18, "triangle", 0.05, 0, 2.4),
    good: (n) => { const b = 660 * Math.pow(1.06, Math.min(n, 12)); tone(b, 0.09, "triangle", 0.07); tone(b * 1.5, 0.16, "triangle", 0.06, 0.07); },
    bad: () => { tone(180, 0.22, "sawtooth", 0.05); tone(120, 0.3, "sawtooth", 0.04, 0.1); },
    miss: () => tone(420, 0.3, "sine", 0.05, 0, 0.5),
    over: () => [523, 440, 349, 262].forEach((f, i) => tone(f, 0.28, "triangle", 0.06, i * 0.16)),
  };

  // ---------- canvas ----------
  const cv = $("#cv"), cx = cv.getContext("2d");
  let W = 0, H = 0, S = 1, DPR = 1, BASE = 0, ROAD = 0, MIKE_X = 120;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const cw = cv.clientWidth, ch = cv.clientHeight;
    cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
    S = Math.min(ch / 620, cw / 520);
    W = cw / S; H = ch / S;
    const barH = ($("#bar").offsetHeight || 110) / S;
    ROAD = H - barH - 34;      // where the bike wheels touch
    BASE = ROAD - 62;          // where houses sit
    MIKE_X = Math.min(150, W * 0.22);
  }
  addEventListener("resize", resize);

  // ---------- day cycle (morning -> noon -> golden -> dusk -> night -> dawn) ----------
  const SKY = [
    { t: 0.0, top: "#7CC4FF", bot: "#FFE4C4", sun: 0.25, light: 0 },
    { t: 0.22, top: "#4DA6FF", bot: "#CDEBFF", sun: 0.85, light: 0 },
    { t: 0.45, top: "#FF9A62", bot: "#FFD58C", sun: 0.35, light: 0.15 },
    { t: 0.6, top: "#5B3F8F", bot: "#FF8570", sun: 0.02, light: 0.6 },
    { t: 0.78, top: "#131A3F", bot: "#3A2E6B", sun: -0.3, light: 1 },
    { t: 0.92, top: "#3A3F7A", bot: "#F7A28B", sun: 0.05, light: 0.5 },
    { t: 1.0, top: "#7CC4FF", bot: "#FFE4C4", sun: 0.25, light: 0 },
  ];
  const DAY_LEN = 110; // seconds for a full cycle
  function sky(tt) {
    const p = (tt / DAY_LEN) % 1;
    let i = 0; while (SKY[i + 1].t < p) i++;
    const a = SKY[i], b = SKY[i + 1], k = (p - a.t) / (b.t - a.t);
    const e = k * k * (3 - 2 * k);
    return { top: mix(a.top, b.top, e), bot: mix(a.bot, b.bot, e), topA: mixA(a.top, b.top, e), botA: mixA(a.bot, b.bot, e), sun: a.sun + (b.sun - a.sun) * e, light: a.light + (b.light - a.light) * e, p };
  }

  // ---------- world ----------
  const HOUSE_STYLES = [
    { kind: "brownstone", walls: ["#9C5B3E", "#8A4E36", "#B06B48", "#7C4A38"], trim: "#F2E6D0" },
    { kind: "colonial", walls: ["#F4F1EA", "#DCE6F0", "#F6E7C8", "#E3EEDF"], trim: "#FFFFFF", roof: ["#3E4A63", "#5A3F36", "#2F3B4F"] },
    { kind: "craftsman", walls: ["#6FA38A", "#D98E5F", "#7C93C4", "#C9A15A"], trim: "#FFF7E8", roof: ["#4A3B35", "#3B4252"] },
    { kind: "modern", walls: ["#EDEDED", "#2F3441", "#D9D2C5"], trim: "#FFB84D" },
  ];
  const SKINS = ["#F2C9A5", "#E0AC84", "#C68E63", "#8D5A3B", "#F6D5B8", "#B5794F"];
  const HAIRS = ["#2B1B12", "#5B3A24", "#A24E26", "#D8B36A", "#9A9A9A", "#1F1F1F", "#7A5230"];

  let G;
  function newGame(demo) {
    G = {
      demo, t: 0, cam: 0, speed: 150, houses: [], props: [], packs: [], parts: [], floats: [],
      tips: 0, delivered: 0, combo: 0, bestCombo: 0, lives: 3, over: false, shake: 0,
      nextX: 260, nextProp: 80, mikeMood: "happy", mikeMoodT: 0, throwT: 0, counts: {}, friendsServed: 0,
    };
    while (G.nextX < W + 600) addHouse();
    updateHUD();
  }

  function addHouse() {
    const st = pick(HOUSE_STYLES);
    const w = st.kind === "brownstone" ? rand(120, 150) : rand(170, 230);
    const h = st.kind === "brownstone" ? rand(210, 260) : st.kind === "modern" ? rand(140, 180) : rand(150, 200);
    const orderChance = G.demo ? 0.7 : clamp(0.55 + G.t / 300, 0.55, 0.85);
    const hasOrder = G.nextX > 420 && Math.random() < orderChance;
    const friend = hasOrder && Math.random() < 0.16 ? pick(["adam", "billy", "marshall"]) : null;
    G.houses.push({
      x: G.nextX, w, h, st,
      wall: pick(st.walls), roof: st.roof ? pick(st.roof) : null,
      floors: st.kind === "brownstone" ? 3 : 2,
      door: pick(["#B8322A", "#2D4B73", "#2E6B4F", "#23223F", "#C98B2E"]),
      lit: Array.from({ length: 12 }, () => Math.random() < 0.7),
      tree: Math.random() < 0.6 ? rand(-30, 30) : null,
      order: hasOrder ? {
        type: pick(LOX).id, state: "open", friend,
        face: { skin: pick(SKINS), hair: pick(HAIRS), style: Math.floor(rand(0, 4)) },
        mood: "neutral", line: null, lineT: 0,
      } : null,
    });
    G.nextX += w + rand(30, 110);
  }

  // ---------- input ----------
  function toss(typeId) {
    if (!G || G.over) return;
    if (G.demo) return;
    const lo = MIKE_X + 60, hi = W * 0.92;
    const target = G.houses.filter((h) => h.order && h.order.state === "open").map((h) => ({ h, sx: h.x + h.w / 2 - G.cam })).filter((o) => o.sx > lo && o.sx < hi).sort((a, b) => a.sx - b.sx)[0];
    G.throwT = 0.28;
    sfx.toss();
    const from = { x: G.cam + MIKE_X + 34, y: ROAD - 70 };
    if (target) {
      const h = target.h; h.order.state = "flying";
      const to = { x: h.x + h.w / 2, y: BASE - 8 };
      const dur = clamp((to.x - from.x) / 700, 0.35, 0.75);
      G.packs.push({ type: typeId, from, to, t: 0, dur, house: h, arc: rand(90, 140) });
    } else {
      G.packs.push({ type: typeId, from, to: { x: from.x + 220 + G.speed * 0.4, y: ROAD - 10 }, t: 0, dur: 0.5, house: null, arc: 90 });
    }
    const btn = document.querySelector(`.lox-btn[data-id="${typeId}"]`);
    if (btn) { btn.classList.remove("hit"); void btn.offsetWidth; btn.classList.add("hit"); }
  }

  function land(p) {
    const h = p.house;
    if (!h) { burst(p.to.x, p.to.y, "#DDDDDD", 8); return; }
    const o = h.order, ok = o.type === p.type;
    if (ok) {
      o.state = "done"; o.mood = "happy";
      G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.delivered++;
      G.counts[p.type] = (G.counts[p.type] || 0) + 1;
      const tip = Math.round((6 + Math.random() * 4) * (1 + Math.min(G.combo - 1, 8) * 0.25)) + (o.friend ? 5 : 0);
      G.tips += tip;
      floatText(`+$${tip}`, p.to.x, p.to.y - 60, "#FFD447", 30);
      if (G.combo >= 3) floatText(`${G.combo}× streak`, p.to.x, p.to.y - 96, "#FFFFFF", 20);
      burst(p.to.x, p.to.y - 10, LOXBY[p.type].color, 26, true);
      coins(p.to.x, p.to.y - 20, Math.min(3 + G.combo, 10));
      sfx.good(G.combo);
      if (o.friend) { G.friendsServed++; o.line = pick(FRIEND_LINES[o.friend].good); o.lineT = 2.4; }
      if (G.combo > 0 && G.combo % 5 === 0) { mikeSay(pick(MIKE_LINES.streak)); if (G.lives < 3) { G.lives++; floatText("+1 🥯", G.cam + MIKE_X, ROAD - 150, "#FFFFFF", 24); } }
      setMike("happy", 1.2);
    } else {
      o.state = "wrong"; o.mood = "annoyed";
      o.line = o.friend ? pick(FRIEND_LINES[o.friend].bad) : `I ordered ${LOXBY[o.type].name}!`; o.lineT = 2.2;
      burst(p.to.x, p.to.y, "#888888", 10);
      loseLife("Wrong lox!");
      sfx.bad(); mikeSay(pick(MIKE_LINES.wrong)); setMike("sad", 1.4);
    }
    updateHUD();
  }

  function loseLife(msg) {
    if (G.over) return;
    G.combo = 0; G.lives--; G.shake = reduced ? 0 : 0.35;
    floatText(msg, G.cam + MIKE_X + 60, ROAD - 170, "#FF6B5E", 26);
    updateHUD();
    if (G.lives <= 0) gameOver();
  }

  // ---------- effects ----------
  function burst(x, y, color, n, confetti) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0), v = rand(120, 380);
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, life: rand(0.6, 1.1), age: 0, size: rand(3, 7), color: confetti && Math.random() < 0.4 ? pick(["#FFFFFF", "#FFD447", "#7FD1FF"]) : color, rot: rand(0, 6), vr: rand(-10, 10), sq: confetti });
    }
  }
  function coins(x, y, n) {
    for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: rand(-160, 160), vy: rand(-420, -250), g: 900, life: 1.1, age: 0, size: 7, coin: true, rot: rand(0, 6), vr: rand(-8, 8) });
  }
  function floatText(text, x, y, color, size) { G.floats.push({ text, x, y, color, size, age: 0, life: 1.3 }); }
  function setMike(m, t) { G.mikeMood = m; G.mikeMoodT = t; }
  let sayT = 0;
  function mikeSay(text) {
    const b = $("#mikeSays"); b.textContent = text; b.hidden = false;
    b.style.left = Math.round((MIKE_X + 22) * S) + "px";
    b.style.bottom = Math.round(($(".stage").clientHeight - (ROAD - 150) * S)) + "px";
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    clearTimeout(sayT); sayT = setTimeout(() => (b.hidden = true), 2200);
  }

  // ---------- update ----------
  function update(dt) {
    G.t += dt;
    // narrow (phone) screens show fewer houses, so the street moves slower there
    const fit = clamp(W / 820, 0.72, 1);
    if (!G.over) G.speed = (G.demo ? 170 : clamp(160 + G.t * 2.2, 160, 380)) * fit;
    G.cam += G.speed * dt;
    while (G.nextX < G.cam + W + 400) addHouse();
    G.houses = G.houses.filter((h) => h.x + h.w > G.cam - 300);
    if (G.mikeMoodT > 0 && (G.mikeMoodT -= dt) <= 0) G.mikeMood = "happy";
    if (G.throwT > 0) G.throwT -= dt;
    if (G.shake > 0) G.shake -= dt;

    // missed houses
    for (const h of G.houses) {
      const o = h.order; if (!o) continue;
      if (o.lineT > 0) o.lineT -= dt;
      if (o.state === "open" && !G.over && h.x + h.w / 2 - G.cam < MIKE_X - 30) {
        o.state = "missed"; o.mood = "sad";
        if (G.demo) continue;
        o.line = o.friend ? pick(FRIEND_LINES[o.friend].bad) : "Hello? My lox?"; o.lineT = 2;
        sfx.miss(); mikeSay(pick(MIKE_LINES.miss)); setMike("sad", 1);
        loseLife("Missed!");
      }
    }
    // demo: Mike auto-delivers so the title screen looks alive
    if (G.demo) {
      for (const h of G.houses) {
        const o = h.order; if (!o || o.state !== "open") continue;
        const sx = h.x + h.w / 2 - G.cam;
        if (sx < W * 0.62 && sx > MIKE_X + 60) {
          o.state = "flying"; G.throwT = 0.28;
          G.packs.push({ type: o.type, from: { x: G.cam + MIKE_X + 34, y: ROAD - 70 }, to: { x: h.x + h.w / 2, y: BASE - 8 }, t: 0, dur: 0.55, house: h, arc: 120, demo: true });
        }
      }
    }
    for (const p of G.packs) {
      p.t += dt;
      if (p.house) p.to.x = p.house.x + p.house.w / 2;
      if (p.t >= p.dur && !p.done) {
        p.done = true;
        if (p.demo) { p.house.order.state = "done"; p.house.order.mood = "happy"; burst(p.to.x, p.to.y - 10, LOXBY[p.type].color, 20, true); coins(p.to.x, p.to.y - 20, 4); }
        else land(p);
      }
    }
    G.packs = G.packs.filter((p) => !p.done);
    for (const q of G.parts) { q.age += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
    G.parts = G.parts.filter((q) => q.age < q.life);
    for (const f of G.floats) { f.age += dt; f.y -= 50 * dt; }
    G.floats = G.floats.filter((f) => f.age < f.life);
  }

  // ---------- drawing ----------
  function rr(x, y, w, h, r) { cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, r) : cx.rect(x, y, w, h); }

  function drawSky(k) {
    const g = cx.createLinearGradient(0, 0, 0, BASE);
    g.addColorStop(0, k.top); g.addColorStop(1, k.bot);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // stars
    if (k.light > 0.4) {
      cx.fillStyle = `rgba(255,255,255,${(k.light - 0.4) * 1.4})`;
      for (let i = 0; i < 60; i++) {
        const x = (i * 97.3 + 13) % W, y = (i * 53.7) % (BASE * 0.6);
        const tw = 0.6 + 0.4 * Math.sin(G.t * 2 + i);
        cx.globalAlpha = tw * clamp((k.light - 0.4) * 1.6, 0, 1); cx.fillRect(x, y, 1.6, 1.6);
      }
      cx.globalAlpha = 1;
    }
    // sun or moon
    const sy = BASE - k.sun * BASE * 0.85;
    if (k.sun > -0.2) {
      const sx = W * 0.72;
      const glow = cx.createRadialGradient(sx, sy, 10, sx, sy, 160);
      glow.addColorStop(0, "rgba(255,240,200,.75)"); glow.addColorStop(1, "rgba(255,240,200,0)");
      cx.fillStyle = glow; cx.beginPath(); cx.arc(sx, sy, 160, 0, 7); cx.fill();
      cx.fillStyle = k.sun < 0.4 ? "#FFD27A" : "#FFF3C4"; cx.beginPath(); cx.arc(sx, sy, 34, 0, 7); cx.fill();
    }
    if (k.light > 0.5) {
      const mx = W * 0.2, my = BASE * 0.22;
      cx.fillStyle = `rgba(255,250,230,${(k.light - 0.5) * 2})`; cx.beginPath(); cx.arc(mx, my, 22, 0, 7); cx.fill();
      cx.fillStyle = k.top; cx.beginPath(); cx.arc(mx + 9, my - 5, 19, 0, 7); cx.fill();
    }
    // clouds
    cx.fillStyle = rgba(mixA("#FFFFFF", "#8C7FB5", k.light * 0.8), 0.85);
    for (let i = 0; i < 6; i++) {
      const span = W + 300;
      const x = ((i * 260 - G.cam * 0.06 - G.t * 6) % span + span) % span - 150;
      const y = 50 + (i % 3) * 55;
      cloud(x, y, 0.8 + (i % 2) * 0.4);
    }
  }
  function cloud(x, y, s) {
    cx.beginPath();
    cx.arc(x, y, 22 * s, 0, 7); cx.arc(x + 26 * s, y - 12 * s, 28 * s, 0, 7); cx.arc(x + 58 * s, y, 22 * s, 0, 7);
    cx.rect(x, y - 2, 58 * s, 22 * s); cx.fill();
  }

  function drawFar(k) {
    // distant skyline, tinted toward the sky for depth
    const col = rgba(mixA("#6D7FA8", "#1A1F40", k.light), 0.55);
    cx.fillStyle = col;
    const off = G.cam * 0.15;
    for (let i = -1; i < W / 60 + 2; i++) {
      const n = Math.floor(off / 60) + i;
      const hh = 60 + ((n * 7919) % 90);
      const x = n * 60 - off;
      cx.fillRect(x, BASE - 40 - hh, 52, hh + 40);
      if (k.light > 0.4 && (n % 3 === 0)) {
        cx.fillStyle = `rgba(255,214,120,${(k.light - 0.4) * 0.9})`;
        for (let r = 0; r < hh / 16; r++) if ((n + r) % 2) cx.fillRect(x + 10 + (r % 3) * 12, BASE - 30 - hh + r * 14, 5, 6);
        cx.fillStyle = col;
      }
    }
    // tree line
    const tc = rgba(mixA("#4E9A5E", "#1B3230", k.light), 1);
    cx.fillStyle = tc;
    const o2 = G.cam * 0.45;
    for (let i = -1; i < W / 38 + 2; i++) {
      const n = Math.floor(o2 / 38) + i, x = n * 38 - o2;
      const r = 26 + ((n * 131) % 16);
      cx.beginPath(); cx.arc(x, BASE - 30, r, 0, 7); cx.fill();
    }
    cx.fillRect(0, BASE - 30, W, 30);
  }

  function drawHouse(h, k) {
    const x = h.x - G.cam, y = BASE, w = h.w, hh = h.h;
    const dark = k.light;
    // shadow
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.fillRect(x + 6, y - hh + 8, w, hh);
    // walls
    cx.fillStyle = mix(h.wall, "#1C2140", dark * 0.55); cx.fillRect(x, y - hh, w, hh);
    const shade = cx.createLinearGradient(x, 0, x + w, 0);
    shade.addColorStop(0, "rgba(255,255,255,.10)"); shade.addColorStop(1, "rgba(0,0,0,.14)");
    cx.fillStyle = shade; cx.fillRect(x, y - hh, w, hh);
    // roof
    if (h.roof) {
      cx.fillStyle = mix(h.roof, "#101326", dark * 0.5);
      cx.beginPath(); cx.moveTo(x - 12, y - hh + 2); cx.lineTo(x + w / 2, y - hh - w * 0.32); cx.lineTo(x + w + 12, y - hh + 2); cx.closePath(); cx.fill();
      cx.fillStyle = mix(h.roof, "#101326", dark * 0.5 + 0.15); cx.fillRect(x + w * 0.7, y - hh - w * 0.28, 16, 40);
    } else {
      cx.fillStyle = mix(h.st.trim, "#1C2140", dark * 0.5); cx.fillRect(x - 6, y - hh - 12, w + 12, 14);
    }
    // windows
    const cols = h.st.kind === "brownstone" ? 2 : 3, rows = h.floors;
    const ww = w * 0.16, wh = hh / (rows + 1) * 0.5;
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wx = x + (w / (cols + 1)) * (c + 1) - ww / 2, wy = y - hh + 20 + r * (hh - 60) / rows;
      if (r === rows - 1 && c === Math.floor(cols / 2) && cols === 3) { n++; continue; }
      const lit = h.lit[n++] && dark > 0.3;
      cx.fillStyle = mix(h.st.trim, "#2A2F4F", dark * 0.5); cx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
      if (lit) {
        cx.fillStyle = "#FFD27A"; cx.fillRect(wx, wy, ww, wh);
        const gl = cx.createRadialGradient(wx + ww / 2, wy + wh / 2, 2, wx + ww / 2, wy + wh / 2, ww * 1.4);
        gl.addColorStop(0, `rgba(255,210,122,${0.35 * dark})`); gl.addColorStop(1, "rgba(255,210,122,0)");
        cx.fillStyle = gl; cx.fillRect(wx - ww, wy - wh, ww * 3, wh * 3);
      } else {
        const wg = cx.createLinearGradient(wx, wy, wx + ww, wy + wh);
        wg.addColorStop(0, mix("#BFE3FF", "#2B3560", dark)); wg.addColorStop(1, mix("#7FB2DE", "#1B2244", dark));
        cx.fillStyle = wg; cx.fillRect(wx, wy, ww, wh);
      }
    }
    // door + stoop
    const dw = h.st.kind === "brownstone" ? w * 0.26 : w * 0.18, dh = 54;
    const dx = x + w / 2 - dw / 2;
    if (h.st.kind === "brownstone") {
      cx.fillStyle = mix("#7A5040", "#1C2140", dark * 0.5);
      for (let i = 0; i < 4; i++) cx.fillRect(dx - 8 - i * 4, y - 22 + i * 7, dw + 16 + i * 8, 7);
      cx.fillStyle = mix(h.door, "#101326", dark * 0.4); cx.fillRect(dx, y - 22 - dh, dw, dh);
    } else {
      cx.fillStyle = mix(h.door, "#101326", dark * 0.4); cx.fillRect(dx, y - dh, dw, dh);
      cx.fillStyle = mix("#CFC6B6", "#1C2140", dark * 0.5); cx.fillRect(dx - 8, y - 4, dw + 16, 6);
    }
    cx.fillStyle = "#FFD447"; cx.beginPath(); cx.arc(dx + dw - 7, y - (h.st.kind === "brownstone" ? 50 : 28), 2.5, 0, 7); cx.fill();
    if (dark > 0.3) {
      const lx = x + w / 2, ly = y - dh - (h.st.kind === "brownstone" ? 30 : 8);
      const gl = cx.createRadialGradient(lx, ly, 1, lx, ly, 50);
      gl.addColorStop(0, `rgba(255,220,150,${0.55 * dark})`); gl.addColorStop(1, "rgba(255,220,150,0)");
      cx.fillStyle = gl; cx.beginPath(); cx.arc(lx, ly, 50, 0, 7); cx.fill();
    }
  }

  function drawStreet(k) {
    const d = k.light;
    // lawn / sidewalk strip
    cx.fillStyle = mix("#79C271", "#1E3A33", d * 0.8); cx.fillRect(0, BASE, W, 26);
    cx.fillStyle = mix("#E9E2D3", "#3B3C58", d * 0.8); cx.fillRect(0, BASE + 26, W, 22);
    cx.fillStyle = mix("#D3CAB8", "#2E2F48", d * 0.8);
    const so = G.cam % 40;
    for (let x = -so; x < W; x += 40) cx.fillRect(x, BASE + 26, 2, 22);
    cx.fillStyle = mix("#BDB4A2", "#26273D", d * 0.8); cx.fillRect(0, BASE + 48, W, 6);
    // road
    const rg = cx.createLinearGradient(0, BASE + 54, 0, H);
    rg.addColorStop(0, mix("#55596B", "#23253A", d)); rg.addColorStop(1, mix("#3E4152", "#15172A", d));
    cx.fillStyle = rg; cx.fillRect(0, BASE + 54, W, H - BASE - 54);
    cx.fillStyle = mix("#F7D154", "#8A7A3A", d * 0.6);
    const lo = (G.cam * 1.0) % 90;
    for (let x = -lo; x < W; x += 90) cx.fillRect(x, ROAD + 26, 46, 5);
  }

  function drawProps(k, front) {
    // street lamps and hedges on the sidewalk
    const spacing = 360;
    const off = G.cam % spacing;
    for (let x = -off + (front ? 180 : 0); x < W + 40; x += spacing) {
      if (!front) {
        cx.fillStyle = mix("#3B4254", "#0D0F1E", k.light * 0.5);
        cx.fillRect(x - 3, BASE - 110, 6, 158);
        cx.fillRect(x - 3, BASE - 110, 26, 5);
        cx.fillStyle = k.light > 0.3 ? "#FFE3A3" : "#D9DEE8"; rr(x + 16, BASE - 106, 14, 8, 3); cx.fill();
        if (k.light > 0.3) {
          cx.save(); cx.globalCompositeOperation = "lighter";
          const g = cx.createRadialGradient(x + 23, BASE - 100, 2, x + 23, BASE - 60, 120);
          g.addColorStop(0, `rgba(255,214,140,${0.45 * k.light})`); g.addColorStop(1, "rgba(255,214,140,0)");
          cx.fillStyle = g; cx.beginPath(); cx.moveTo(x + 17, BASE - 100); cx.lineTo(x - 50, BASE + 50); cx.lineTo(x + 100, BASE + 50); cx.lineTo(x + 29, BASE - 100); cx.fill();
          cx.restore();
        }
      }
    }
  }

  function drawTree(x, k) {
    const y = BASE + 6;
    cx.fillStyle = mix("#6E4B33", "#1E1820", k.light * 0.6); cx.fillRect(x - 5, y - 70, 10, 70);
    const sway = Math.sin(G.t * 1.6 + x * 0.01) * 3;
    const c1 = mix("#3E9A4F", "#12302A", k.light * 0.75), c2 = mix("#5DBB63", "#1A3D33", k.light * 0.75);
    cx.fillStyle = c1; cx.beginPath(); cx.arc(x + sway, y - 92, 36, 0, 7); cx.arc(x - 26 + sway, y - 70, 26, 0, 7); cx.arc(x + 26 + sway, y - 72, 26, 0, 7); cx.fill();
    cx.fillStyle = c2; cx.beginPath(); cx.arc(x - 8 + sway, y - 102, 20, 0, 7); cx.fill();
  }

  function drawLox(c, type, x, y, s, rot = 0) {
    const L = LOXBY[type];
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.beginPath();
    c.moveTo(-30, 6); c.bezierCurveTo(-24, -20, 18, -24, 32, -6); c.bezierCurveTo(22, 6, -6, 18, -30, 6); c.closePath();
    const g = c.createLinearGradient(-30, -20, 30, 16);
    g.addColorStop(0, L.base); g.addColorStop(1, type === "pastrami" ? "#9E3F2E" : "#FF6A4A");
    c.fillStyle = g; c.fill();
    if (type === "pastrami") { c.lineWidth = 5; c.strokeStyle = "#2E1A15"; c.stroke(); }
    c.save(); c.clip();
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2.2;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(-24 + i * 9, 12); c.quadraticCurveTo(-14 + i * 9, -4, -4 + i * 9, -22); c.stroke(); }
    const dots = (col, n, r) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(((i * 37) % 54) - 26, ((i * 23) % 26) - 14, r, 0, 7); c.fill(); } };
    if (type === "togarashi") { dots("#B3160F", 14, 1.8); dots("#FFB000", 6, 1.4); dots("#1B1B1B", 5, 1); }
    if (type === "pastrami") dots("#1B1B1B", 16, 1.5);
    if (type === "korean") { c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-30, -20, 60, 8); dots("#FFF6DC", 10, 1.4); c.strokeStyle = "#2DBB5A"; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-16 + i * 11, -2 + (i % 2) * 6, 2.6, 0, 7); c.stroke(); } }
    c.restore();
    c.restore();
  }

  function drawFace(o, x, y, r) {
    if (o.friend) {
      const im = FACES[o.friend][o.mood === "sad" ? "sad" : o.mood];
      cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.clip();
      if (im.complete) cx.drawImage(im, x - r, y - r, r * 2, r * 2);
      cx.restore();
      cx.strokeStyle = CHARACTERS[o.friend].color; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.stroke();
      return;
    }
    const f = o.face;
    cx.fillStyle = "#FFE9D6"; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill();
    cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.clip();
    cx.fillStyle = f.skin; cx.beginPath(); cx.arc(x, y + 3, r * 0.72, 0, 7); cx.fill();
    cx.fillStyle = f.hair; cx.beginPath();
    if (f.style === 0) { cx.arc(x, y - 2, r * 0.76, Math.PI, 0); }
    else if (f.style === 1) { cx.arc(x, y + 2, r * 0.8, Math.PI * 0.95, Math.PI * 2.05); cx.rect(x - r * 0.8, y, r * 0.22, r * 0.9); cx.rect(x + r * 0.58, y, r * 0.22, r * 0.9); }
    else if (f.style === 2) { for (let i = -2; i <= 2; i++) cx.arc(x + i * r * 0.28, y - r * 0.5, r * 0.25, 0, 7); }
    else { cx.arc(x, y - 4, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); }
    cx.fill(); cx.restore();
    cx.fillStyle = "#2A1C14";
    cx.beginPath(); cx.arc(x - r * 0.26, y + 2, 1.8, 0, 7); cx.arc(x + r * 0.26, y + 2, 1.8, 0, 7); cx.fill();
    cx.strokeStyle = "#7A2E24"; cx.lineWidth = 2; cx.beginPath();
    if (o.mood === "happy") cx.arc(x, y + 6, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (o.mood === "annoyed" || o.mood === "sad") cx.arc(x, y + 13, r * 0.2, 1.2 * Math.PI, 1.8 * Math.PI);
    else { cx.moveTo(x - 4, y + 10); cx.lineTo(x + 4, y + 10); }
    cx.stroke();
  }

  function drawOrder(h, k) {
    const o = h.order; if (!o) return;
    const cxX = h.x + h.w / 2 - G.cam;
    const roofTop = BASE - h.h - (h.roof ? h.w * 0.32 : 12);
    const bob = Math.sin(G.t * 3 + h.x) * 4;
    const y = roofTop - 52 + bob;
    const inRange = o.state === "open" && cxX > MIKE_X + 60 && cxX < W * 0.92;
    const scale = inRange ? 1 + Math.sin(G.t * 8) * 0.03 + 0.06 : 1;
    const bw = 144, bh = 58;
    cx.save(); cx.translate(cxX, y); cx.scale(scale, scale);
    const done = o.state === "done", bad = o.state === "wrong" || o.state === "missed";
    if (inRange) { cx.shadowColor = LOXBY[o.type].color; cx.shadowBlur = 22; }
    cx.fillStyle = done ? "#E4F8EA" : bad ? "#FFE3DE" : "#FFFFFF";
    rr(-bw / 2, -bh / 2, bw, bh, 18); cx.fill();
    cx.beginPath(); cx.moveTo(-8, bh / 2 - 1); cx.lineTo(0, bh / 2 + 12); cx.lineTo(8, bh / 2 - 1); cx.fill();
    cx.shadowBlur = 0;
    if (inRange) { cx.strokeStyle = LOXBY[o.type].color; cx.lineWidth = 3; rr(-bw / 2, -bh / 2, bw, bh, 18); cx.stroke(); }
    drawFace(o, -bw / 2 + 28, -2, 19);
    if (done) {
      cx.fillStyle = "#1A9E5C"; cx.font = "900 26px 'Baloo 2', system-ui, sans-serif"; cx.textAlign = "center"; cx.fillText("✓", 26, 6);
      cx.font = "800 12px 'Baloo 2', system-ui, sans-serif"; cx.fillText("Delivered", 26, 22);
    } else {
      drawLox(cx, o.type, 26, -8, 0.78);
      cx.fillStyle = LOXBY[o.type].color; rr(-14, 8, 82, 18, 9); cx.fill();
      cx.fillStyle = "#FFFFFF"; cx.font = "800 11px 'Baloo 2', system-ui, sans-serif"; cx.textAlign = "center"; cx.fillText(LOXBY[o.type].name.toUpperCase(), 27, 21);
    }
    cx.restore();
    if (o.line && o.lineT > 0) {
      cx.save(); cx.globalAlpha = clamp(o.lineT, 0, 1);
      cx.font = "800 14px 'Baloo 2', system-ui, sans-serif";
      const tw = cx.measureText(o.line).width + 22;
      cx.fillStyle = "#23223F"; rr(cxX - tw / 2, y - bh / 2 - 36, tw, 28, 14); cx.fill();
      cx.fillStyle = "#FFFFFF"; cx.textAlign = "center"; cx.fillText(o.line, cxX, y - bh / 2 - 17);
      cx.restore();
    }
  }

  function drawMike(k) {
    const x = MIKE_X, y = ROAD, t = G.t;
    const bob = Math.sin(t * 12) * 1.5;
    // shadow
    cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(x + 6, y + 20, 70, 8, 0, 0, 7); cx.fill();
    // wheels
    const spin = G.cam / 18;
    for (const wx of [x - 42, x + 52]) {
      cx.lineWidth = 5; cx.strokeStyle = "#1B1D2B"; cx.beginPath(); cx.arc(wx, y, 18, 0, 7); cx.stroke();
      cx.lineWidth = 1.5; cx.strokeStyle = "#9AA3B8";
      for (let i = 0; i < 6; i++) { const a = spin + (i * Math.PI) / 3; cx.beginPath(); cx.moveTo(wx, y); cx.lineTo(wx + Math.cos(a) * 16, y + Math.sin(a) * 16); cx.stroke(); }
    }
    // frame
    cx.strokeStyle = "#F0643C"; cx.lineWidth = 5; cx.lineCap = "round";
    cx.beginPath(); cx.moveTo(x - 42, y); cx.lineTo(x - 8, y - 8); cx.lineTo(x + 52, y); cx.moveTo(x - 8, y - 8); cx.lineTo(x - 16, y - 40); cx.moveTo(x + 20, y - 4); cx.lineTo(x + 24, y - 56); cx.stroke();
    cx.strokeStyle = "#1B1D2B"; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x + 16, y - 58); cx.lineTo(x + 32, y - 58); cx.stroke();
    // cargo crate
    const crX = x + 28, crY = y - 46;
    const wood = cx.createLinearGradient(crX, crY, crX, crY + 36);
    wood.addColorStop(0, "#D9A066"); wood.addColorStop(1, "#B77B45");
    cx.fillStyle = wood; rr(crX, crY, 54, 36, 5); cx.fill();
    cx.strokeStyle = "rgba(90,50,20,.35)"; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(crX, crY + 12); cx.lineTo(crX + 54, crY + 12); cx.moveTo(crX, crY + 24); cx.lineTo(crX + 54, crY + 24); cx.stroke();
    LOX.forEach((l, i) => { cx.fillStyle = "#FFFFFF"; rr(crX + 3 + i * 12.5, crY - 9 - (i % 2) * 3, 11, 12, 2); cx.fill(); cx.fillStyle = l.color; cx.fillRect(crX + 3 + i * 12.5, crY - 5 - (i % 2) * 3, 11, 3); });
    cx.fillStyle = "#FFFFFF"; cx.font = "900 13px 'Baloo 2', system-ui, sans-serif"; cx.textAlign = "center"; cx.fillText("LOX", crX + 27, crY + 23);
    // legs (pedaling)
    const crank = { x: x - 8, y: y - 8 }, a = G.cam / 14;
    cx.strokeStyle = "#2B3A5C"; cx.lineWidth = 9;
    for (const ph of [0, Math.PI]) {
      const px = crank.x + Math.cos(a + ph) * 9, py = crank.y + Math.sin(a + ph) * 9;
      const hip = { x: x - 16, y: y - 44 + bob };
      const kx = (hip.x + px) / 2 + 12, ky = (hip.y + py) / 2 - 4;
      cx.beginPath(); cx.moveTo(hip.x, hip.y); cx.lineTo(kx, ky); cx.lineTo(px, py); cx.stroke();
    }
    // body (pinstripes)
    cx.save();
    cx.beginPath(); cx.moveTo(x - 34, y - 42 + bob); cx.lineTo(x + 6, y - 42 + bob); cx.lineTo(x + 12, y - 86 + bob); cx.quadraticCurveTo(x - 14, y - 100 + bob, x - 40, y - 86 + bob); cx.closePath();
    cx.fillStyle = "#26324F"; cx.fill(); cx.clip();
    cx.strokeStyle = "#3E4C73"; cx.lineWidth = 1.6; for (let i = -40; i < 20; i += 7) { cx.beginPath(); cx.moveTo(x + i, y - 104); cx.lineTo(x + i, y - 40); cx.stroke(); }
    cx.restore();
    // arm: on handlebar, or swinging up while tossing
    cx.strokeStyle = "#26324F"; cx.lineWidth = 9;
    cx.beginPath(); cx.moveTo(x - 4, y - 82 + bob);
    if (G.throwT > 0) { const p = 1 - G.throwT / 0.28; cx.lineTo(x + 14 + p * 10, y - 104 - p * 10); } else cx.lineTo(x + 20, y - 60);
    cx.stroke();
    cx.fillStyle = "#F4C7A1"; cx.beginPath();
    if (G.throwT > 0) { const p = 1 - G.throwT / 0.28; cx.arc(x + 16 + p * 10, y - 108 - p * 10, 5.5, 0, 7); } else cx.arc(x + 22, y - 59, 5.5, 0, 7);
    cx.fill();
    // head (Mike from Perfect Sunday)
    const face = FACES.mike[G.mikeMood] || FACES.mike.happy;
    if (face.complete) cx.drawImage(face, x - 58, y - 158 + bob, 76, 76);
  }

  function drawPack(p) {
    const k = clamp(p.t / p.dur, 0, 1);
    const x = p.from.x + (p.to.x - p.from.x) * k - G.cam;
    const y = p.from.y + (p.to.y - p.from.y) * k - Math.sin(k * Math.PI) * p.arc;
    const rot = k * Math.PI * 3;
    // ground shadow
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(x, p.from.y + (p.to.y - p.from.y) * k + 12, 12 * (1 - Math.sin(k * Math.PI) * 0.5), 3, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.rotate(rot);
    cx.fillStyle = "#FFFFFF"; rr(-15, -10, 30, 20, 4); cx.fill();
    cx.fillStyle = LOXBY[p.type].color; cx.fillRect(-15, -3, 30, 6);
    cx.fillStyle = "rgba(0,0,0,.08)"; cx.fillRect(-15, 5, 30, 5);
    cx.restore();
    // trail
    cx.fillStyle = LOXBY[p.type].color;
    for (let i = 1; i <= 4; i++) {
      const kk = clamp(k - i * 0.04, 0, 1);
      const tx = p.from.x + (p.to.x - p.from.x) * kk - G.cam, ty = p.from.y + (p.to.y - p.from.y) * kk - Math.sin(kk * Math.PI) * p.arc;
      cx.globalAlpha = 0.25 - i * 0.05; cx.beginPath(); cx.arc(tx, ty, 6 - i, 0, 7); cx.fill();
    }
    cx.globalAlpha = 1;
  }

  function drawFX() {
    for (const q of G.parts) {
      const a = 1 - q.age / q.life;
      cx.save(); cx.globalAlpha = a; cx.translate(q.x - G.cam, q.y); cx.rotate(q.rot);
      if (q.coin) {
        cx.fillStyle = "#FFC933"; cx.beginPath(); cx.ellipse(0, 0, q.size * Math.abs(Math.cos(q.rot * 2)) + 1, q.size, 0, 0, 7); cx.fill();
        cx.strokeStyle = "#D99A00"; cx.lineWidth = 1.5; cx.stroke();
      } else if (q.sq) { cx.fillStyle = q.color; cx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); }
      else { cx.fillStyle = q.color; cx.beginPath(); cx.arc(0, 0, q.size / 2, 0, 7); cx.fill(); }
      cx.restore();
    }
    for (const f of G.floats) {
      const a = 1 - f.age / f.life, s = 1 + Math.max(0, 0.3 - f.age) * 1.5;
      cx.save(); cx.globalAlpha = a; cx.translate(f.x - G.cam, f.y); cx.scale(s, s);
      cx.font = `900 ${f.size}px 'Baloo 2', system-ui, sans-serif`; cx.textAlign = "center";
      cx.lineWidth = 5; cx.strokeStyle = "rgba(20,20,40,.75)"; cx.strokeText(f.text, 0, 0);
      cx.fillStyle = f.color; cx.fillText(f.text, 0, 0);
      cx.restore();
    }
  }

  function draw() {
    const k = sky(G.t + 6);
    cx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
    if (G.shake > 0) cx.translate(rand(-6, 6) * G.shake * 2, rand(-4, 4) * G.shake * 2);
    drawSky(k);
    drawFar(k);
    for (const h of G.houses) if (h.tree != null) { const tx = h.x - G.cam - 30 + h.tree; if (tx > -80 && tx < W + 80) drawTree(tx, k); }
    for (const h of G.houses) { const sx = h.x - G.cam; if (sx < W + 50 && sx + h.w > -50) drawHouse(h, k); }
    drawStreet(k);
    drawProps(k, false);
    for (const h of G.houses) { const sx = h.x - G.cam; if (sx < W + 80 && sx + h.w > -80) drawOrder(h, k); }
    drawMike(k);
    for (const p of G.packs) drawPack(p);
    drawFX();
    // soft vignette + night tint
    const v = cx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(10,10,30,${0.25 + k.light * 0.2})`);
    cx.fillStyle = v; cx.fillRect(-20, -20, W + 40, H + 40);
  }

  // ---------- HUD / screens ----------
  function updateHUD() {
    $("#tips").textContent = "$" + G.tips;
    $("#lives").innerHTML = [0, 1, 2].map((i) => `<span class="${i < G.lives ? "" : "gone"}">🥯</span>`).join("");
    const c = $("#combo");
    c.textContent = G.combo >= 2 ? `${G.combo}× streak` : "";
    c.classList.toggle("hot", G.combo >= 5);
  }

  function gameOver() {
    G.over = true;
    sfx.over();
    const newBest = G.tips > best;
    if (newBest) { best = G.tips; try { localStorage.setItem("loxRun.best", best); } catch {} }
    const fav = Object.entries(G.counts).sort((a, b) => b[1] - a[1])[0];
    $("#overTips").textContent = "$" + G.tips;
    $("#overBest").textContent = newBest ? "New best!" : `Best: $${best}`;
    $("#overStats").innerHTML = [
      ["Deliveries", G.delivered],
      ["Longest streak", G.bestCombo],
      ["Neighborhood favorite", fav ? LOXBY[fav[0]].name : "—"],
      ["Friends served", G.friendsServed],
    ].map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
    $("#overQuote").textContent = "“" + pick(["I had a spreadsheet for this.", "Statistically, that was a great shift.", "Next time I'm optimizing the route.", "Honestly? Top-three shift."]) + "”";
    setTimeout(() => { $("#over").hidden = false; $("#bar").classList.add("off"); }, 700);
  }

  function start() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    $("#title").hidden = true; $("#over").hidden = true; $("#bar").classList.remove("off"); $("#hud").hidden = false;
    newGame(false);
    mikeSay("Okay. Route is mapped. Let's go.");
  }

  // buttons
  const bar = $("#bar");
  LOX.forEach((l, i) => {
    const b = document.createElement("button");
    b.className = "lox-btn"; b.type = "button"; b.dataset.id = l.id;
    b.style.setProperty("--c", l.color);
    const ic = document.createElement("canvas"); ic.width = 132; ic.height = 84;
    const c2 = ic.getContext("2d"); c2.scale(2, 2); drawLox(c2, l.id, 33, 22, 0.95);
    b.innerHTML = `<img alt="" src="${ic.toDataURL()}"><span>${l.name}</span><kbd>${i + 1}</kbd>`;
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); toss(l.id); });
    b.addEventListener("click", (e) => { if (e.detail === 0) toss(l.id); }); // keyboard activation
    bar.append(b);
    const leg = document.createElement("li");
    leg.innerHTML = `<img alt="" src="${ic.toDataURL()}"><span style="--c:${l.color}">${l.name}</span>`;
    $("#legend").append(leg);
  });
  addEventListener("keydown", (e) => {
    const l = LOX.find((x) => x.key.includes(e.key.toLowerCase()));
    if (l && !e.repeat) toss(l.id);
    if ((e.key === "Enter" || e.key === " ") && !$("#title").hidden) { e.preventDefault(); start(); }
  });
  $("#startBtn").onclick = start;
  $("#againBtn").onclick = start;
  const syncMute = () => { $("#muteBtn").textContent = muted ? "🔇" : "🔊"; $("#muteBtn").setAttribute("aria-label", muted ? "Sound off" : "Sound on"); };
  $("#muteBtn").onclick = () => { muted = !muted; try { localStorage.setItem("loxRun.muted", muted ? "1" : "0"); } catch {} syncMute(); };
  syncMute();
  $("#bestLine").textContent = best ? `Best shift: $${best} in tips` : "";

  // ---------- main loop ----------
  resize();
  newGame(true);
  $("#hud").hidden = true;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!document.hidden) { update(dt); draw(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
