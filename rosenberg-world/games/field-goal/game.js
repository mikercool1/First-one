// Split the Uprights: kick field goals in Rosenberg World.
// The stadium is drawn in 2.5D: a simple perspective camera sits behind the kicker,
// and everything (field, stands, crowd, posts, ball, snow) is a 3D point projected to the canvas.
// World units are yards. x = sideways (right +), y = up, z = downfield toward the posts.
(() => {
"use strict";

// ---------- cast ----------
// The kids come straight from Rosenberg World's art (../../js/art.js), so they look the same as in the world.
const A = window.RW.art;
const ORDER = ["reuben", "jonah", "ellie", "max"];
const KID = (id) => A.CHARS[id];
const TAGS = { reuben: "Big Leg", jonah: "Speedy", ellie: "Tiny Toe", max: "Spoon Power" };
const UPY = 62; // rig units per yard: Reuben stands about 1.6 yards tall, Ellie about 1.1 (cartoon sized)

const LINES = {
  reuben: {
    good: ["Too easy.", "Automatic!", "Did you SEE that?!", "Put it on the highlight reel."],
    bad: ["The wind did that.", "Rematch.", "That was on purpose. No it wasn't.", "Ugh, so close!"],
    end: "Best kicker in the family. Obviously.",
  },
  jonah: {
    good: ["GOOOOAL! I mean, field goal!", "Like Messi!", "Wheee!", "Easy peasy!"],
    bad: ["Nooo!", "Again, again!", "The post moved!", "That wind is cheating!"],
    end: "One more? Pleeease?",
  },
  ellie: {
    good: ["I did it!", "Yay!", "Big kick!", "Again!"],
    bad: ["Uh oh.", "Oopsie!", "Ball go bye-bye.", "Hmph."],
    end: "I'm the kicker!",
  },
  max: {
    good: ["Spoon power!", "Max kick!", "Wooo!", "Did you see me?!"],
    bad: ["Where's my spoon?", "Uh-oh!", "Hmm.", "Wind!"],
    end: "Now snack time.",
  },
};

// A kid drawn onto a small canvas: the whole body (cards) or head and shoulders (speech bubble)
function kidCanvas(cv, id, o = {}) {
  const k = KID(id), d = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || o.w || 96, h = cv.clientHeight || o.h || 96;
  cv.width = Math.round(w * d); cv.height = Math.round(h * d);
  const c = cv.getContext("2d");
  c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
  if (o.head) {
    const sc = (h * 0.36) / k.R, headY = -(k.L + k.T + k.R * 0.72);
    c.translate(w / 2, h * 0.52 - headY * sc); c.scale(sc, sc);
  } else {
    const sc = (h * 0.82) / (k.L + k.T + k.R * 2.1);
    c.translate(w / 2, h * 0.95); c.scale(sc, sc);
  }
  A.drawChar(c, k, { t: o.t || 0, move: 0, side: 0, dir: 1, pose: o.pose, pt: 1 });
}
function kidFace(id, pose) {
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "100%";
  kidCanvas(cv, id, { head: true, w: 64, h: 64, pose, t: 0.3 });
  return cv;
}

// ---------- storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem("stu-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("stu-" + k, JSON.stringify(v)); } catch (e) {} },
};

// ---------- tuning ----------
const G = 10.7;                 // gravity, yd/s²
const ELEV = 38 * Math.PI / 180; // launch angle
const V_MIN = 14, V_MAX = 29.5; // ball speed at 0% and 100% power
const WIND_K = 0.11;            // sideways push per mph, yd/s²
const HALF_W = 3.08;            // half the gap between uprights (18'6")
const BAR = 3.33;               // crossbar height (10')
const UP_TOP = BAR + 10;
const MAX_AIM = 16 * Math.PI / 180;
const HASH = 4.5;

const THEMES = [
  { name: "Sunday afternoon", sky: ["#2F7BD6", "#7DBDF2", "#CFEAFF"], grass: ["#3E9A45", "#368C3D"], out: "#2C7433", haze: "rgba(210,235,255,.5)", stand: ["#34455F", "#4C5F7C"], sun: { x: .78, y: .55, c: "255,248,220" }, shadow: [.25, .7], clouds: "#FFFFFF" },
  { name: "Golden hour", sky: ["#34306E", "#D9745A", "#FFCB8A"], grass: ["#4F9A3D", "#468D35"], out: "#3B7A2D", haze: "rgba(255,196,140,.55)", stand: ["#3E2F4A", "#5B4460"], sun: { x: .2, y: .9, c: "255,214,150" }, shadow: [.9, .9], clouds: "#FFD9B8", warm: true },
  { name: "Under the lights", sky: ["#040817", "#0B1638", "#1E3270"], grass: ["#2E8C3F", "#287F38"], out: "#1D5A2A", haze: "rgba(90,130,220,.35)", stand: ["#141C33", "#212C4C"], night: true, shadow: [0, .25] },
  { name: "Snow game", sky: ["#58637D", "#8C97AF", "#C7CFDE"], grass: ["#8FB38D", "#86AA84"], out: "#DDE4EC", haze: "rgba(230,236,245,.7)", stand: ["#3A4458", "#505B72"], snow: true, shadow: [0, .2], clouds: "#E8ECF3" },
];

function levelSpec(n) {
  const D = Math.min(22 + (n - 1) * 3, 62);
  let wind = 0;
  if (n > 1) {
    wind = Math.min(3 + (n - 2) * 2.3, 28) * (0.85 + Math.random() * 0.3);
    wind = Math.max(1, Math.round(wind)) * (Math.random() < 0.5 ? -1 : 1);
  }
  const bx = n < 3 ? 0 : [-HASH, 0, HASH][Math.floor(Math.random() * 3)];
  return {
    n, D, wind, bx,
    theme: THEMES[Math.floor((n - 1) / 3) % THEMES.length],
    aimSpeed: Math.min(2.1 + n * 0.09, 3.6),
    powSpeed: Math.min(1.35 + n * 0.05, 2.1),
    need: needPower(D),
  };
}
// the least power that still clears the crossbar from this distance
function needPower(D) {
  const c = Math.cos(ELEV), t = Math.tan(ELEV);
  const room = D * t - BAR - 0.35;
  const v = Math.sqrt(G * D * D / (2 * c * c * room));
  return Math.max(0, Math.min(1, (v - V_MIN) / (V_MAX - V_MIN)));
}

// ---------- canvas + camera ----------
const cv = document.getElementById("field"), ctx = cv.getContext("2d");
let W = 0, H = 0, F = 0, HY = 0, DPR = 1;
const CAM0 = { y: 3.2, back: 9.5 };
const camX0 = (bx) => bx - 0.8;
const cam = { x: 0, y: CAM0.y, z: -CAM0.back };

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  F = Math.min(W * 1.5, H * 1.05);
  HY = Math.max(H * 0.26, H * 0.75 - CAM0.y * F / CAM0.back);
}
window.addEventListener("resize", resize);
resize();

function P(x, y, z) {
  const dz = z - cam.z;
  if (dz < 0.25) return null;
  const s = F / dz;
  return { x: W / 2 + (x - cam.x) * s, y: HY - (y - cam.y) * s, s, dz };
}
function poly(pts, fill) {
  const q = [];
  for (const p of pts) { const r = P(p[0], p[1], p[2]); if (!r) return; q.push(r); }
  ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y);
  for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function groundQuad(x0, x1, z0, z1, fill) {
  const zn = cam.z + 0.35;
  if (z1 < zn) return;
  z0 = Math.max(z0, zn);
  poly([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], fill);
}
function beam(a, b, width, color) {
  const p = P(...a), q = P(...b);
  if (!p || !q) return;
  ctx.strokeStyle = color; ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, width * (p.s + q.s) / 2);
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
}
// flat text or shapes painted on the grass, centred at (x, z)
function onGround(x, z, fn) {
  const p = P(x, 0, z);
  if (!p || p.dz < 1.5) return;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, cam.y * F / (p.dz * p.dz)); fn(); ctx.restore();
}

// ---------- state ----------
const S = {
  screen: "title", phase: "idle", t: 0, pt: 0,
  kicker: (window.RosenbergBridge && RosenbergBridge.player) || store.get("kicker", "reuben"),
  level: 1, balls: 3, made: 0, longest: 0,
  spec: null, aim: 0, aimPh: 0, power: 0, powT: 0,
  ball: null, trail: [], outcome: null, resultAt: 0, nextAt: 0, shown: false,
  kickT: -1, cheer: 0, slow: 1, crowdJump: 0, shake: 0,
};
let best = store.get("best", { level: 0, longest: 0 });
let muted = store.get("muted", false);

// ---------- scenery (generated once) ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const CROWD_COLORS = ["#1E2B57", "#5EB4EA", "#E8559B", "#F07C4A", "#2EB872", "#FFFFFF", "#1D2436", "#E9E3D0", "#FFD23F", "#8A5CF0"];
const HEADS = ["#F2C9A5", "#E9B98F", "#C98E62", "#8D5A3B", "#F4D5B8", "#5E3A26"];
const crowd = [];
function seat(stand, u, v) {
  if (Math.random() < 0.12) return;
  crowd.push({ stand, u, v, c: CROWD_COLORS[(Math.random() * CROWD_COLORS.length) | 0], h: HEADS[(Math.random() * HEADS.length) | 0], ph: Math.random() * 6.28, fl: Math.random() });
}
for (let r = 0; r < 15; r++) for (let c = 0; c < 84; c++) seat(0, (c + rnd(0.1, 0.9)) / 84, (r + 0.5) / 15);
for (const side of [-1, 1]) for (let r = 0; r < 12; r++) for (let c = 0; c < 64; c++) seat(side, (c + rnd(0.1, 0.9)) / 64, (r + 0.5) / 12);
const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.9, r: rnd(0.4, 1.4), ph: Math.random() * 6 }));
const clouds = Array.from({ length: 6 }, () => ({ x: Math.random(), y: rnd(0.08, 0.6), w: rnd(0.18, 0.34), sp: rnd(0.4, 1) }));
const snow = Array.from({ length: 260 }, () => ({ x: rnd(-30, 30), y: rnd(0, 18), z: rnd(3, 70), s: rnd(0.04, 0.09), ph: Math.random() * 6 }));
const streaks = Array.from({ length: 30 }, () => ({ x: rnd(-30, 30), y: rnd(0.5, 14), z: rnd(2, 55), l: rnd(1, 3) }));
let confetti = [], sparks = [];

// stand geometry for a spec (back stand faces the camera; side stands run the length of the field)
function standPoint(stand, u, v, D) {
  if (stand === 0) return [-46 + 92 * u, 1.6 + 17 * v, D + 13 + 15 * v];
  return [stand * (30 + 15 * v), 1.6 + 14 * v, -30 + (D + 60) * u];
}

// ---------- drawing: sky and stadium ----------
function drawSky(th) {
  const g = ctx.createLinearGradient(0, 0, 0, HY);
  g.addColorStop(0, th.sky[0]); g.addColorStop(0.62, th.sky[1]); g.addColorStop(1, th.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 2);
  if (th.night) {
    for (const s of stars) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(S.t * 2 + s.ph);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x * W, s.y * HY, s.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const mx = W * 0.8, my = HY * 0.22, mr = Math.max(14, W * 0.03);
    const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    mg.addColorStop(0, "rgba(200,215,255,.35)"); mg.addColorStop(1, "rgba(200,215,255,0)");
    ctx.fillStyle = mg; ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.fillStyle = "#EEF2FF"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
    ctx.fillStyle = th.sky[1]; ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, 7); ctx.fill();
  }
  if (th.sun) {
    const sx = W * th.sun.x, sy = HY * th.sun.y, r = Math.max(W, H) * 0.35;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    sg.addColorStop(0, `rgba(${th.sun.c},1)`); sg.addColorStop(0.06, `rgba(${th.sun.c},.95)`);
    sg.addColorStop(0.2, `rgba(${th.sun.c},.35)`); sg.addColorStop(1, `rgba(${th.sun.c},0)`);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, HY + 2);
  }
  if (th.clouds) {
    const dir = S.spec ? Math.sign(S.spec.wind) || 1 : 1, spd = S.spec ? 0.004 + Math.abs(S.spec.wind) * 0.0009 : 0.004;
    for (const c of clouds) {
      const x = (((c.x + S.t * spd * c.sp * dir) % 1.4) + 1.4) % 1.4 - 0.2;
      const cx = x * W, cy = c.y * HY, w = c.w * Math.max(W, 700);
      ctx.fillStyle = th.clouds; ctx.globalAlpha = th.snow ? 0.55 : 0.7;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.5, w * 0.11, 0, 0, 7);
      ctx.ellipse(cx - w * 0.15, cy - w * 0.07, w * 0.2, w * 0.12, 0, 0, 7);
      ctx.ellipse(cx + w * 0.12, cy - w * 0.09, w * 0.24, w * 0.15, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawStadium(th, D) {
  // ground beyond the field
  ctx.fillStyle = th.out; ctx.fillRect(0, HY, W, H - HY);

  // back stand
  const B = [[-46, 1.6, D + 13], [46, 1.6, D + 13], [46, 18.6, D + 28], [-46, 18.6, D + 28]];
  const g0 = P(0, 1.6, D + 13), g1 = P(0, 18.6, D + 28);
  if (g0 && g1) {
    const gr = ctx.createLinearGradient(0, g1.y, 0, g0.y);
    gr.addColorStop(0, th.stand[0]); gr.addColorStop(1, th.stand[1]);
    poly(B, gr);
    for (let i = 1; i < 15; i++) { const v = i / 15; beam([-46, 1.6 + 17 * v, D + 13 + 15 * v], [46, 1.6 + 17 * v, D + 13 + 15 * v], 0.12, "rgba(0,0,0,.18)"); }
  }
  // roof lip of back stand
  poly([[-48, 18.6, D + 28], [48, 18.6, D + 28], [48, 21, D + 29], [-48, 21, D + 29]], th.night ? "#0B1022" : "#1E2638");

  // side stands, far part first
  for (const side of [-1, 1]) {
    const zn = Math.max(-30, cam.z + 1.2);
    poly([[side * 30, 1.6, zn], [side * 30, 1.6, D + 30], [side * 45, 15.6, D + 30], [side * 45, 15.6, zn]], th.stand[1]);
    poly([[side * 45, 15.6, zn], [side * 45, 15.6, D + 30], [side * 46, 18, D + 30], [side * 46, 18, zn]], th.night ? "#0B1022" : "#1E2638");
  }

  drawCrowd(th, D);

  // light towers
  for (const side of [-1, 1]) drawTower(side * 40, D + 31, th);

  // walls with ad boards
  const ad = th.night ? ["#1A2A6C", "#16204A"] : ["#16204A", "#20306A"];
  poly([[-46, 0, D + 13], [46, 0, D + 13], [46, 1.6, D + 13], [-46, 1.6, D + 13]], ad[0]);
  const wp = P(0, 0.8, D + 13);
  if (wp) {
    ctx.save(); ctx.translate(wp.x, wp.y); ctx.scale(wp.s / 100, wp.s / 100);
    ctx.font = "110px Archivo Black, Arial Black, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFD23F"; ctx.fillText("ROSENBERG WORLD", -2400, 4); ctx.fillText("ROSENBERG WORLD", 2400, 4);
    ctx.fillStyle = "#FFFFFF"; ctx.fillText("★ SPLIT THE UPRIGHTS ★", 0, 4);
    ctx.restore();
  }
  for (const side of [-1, 1]) {
    for (let z = -30; z < D + 13; z += 8) {
      const z0 = Math.max(z, cam.z + 1.2), z1 = z + 8;
      if (z1 <= z0) continue;
      poly([[side * 30, 0, z0], [side * 30, 0, z1], [side * 30, 1.6, z1], [side * 30, 1.6, z0]], ((z + 30) / 8) % 2 ? ad[0] : ad[1]);
      poly([[side * 30, 1.25, z0], [side * 30, 1.25, z1], [side * 30, 1.45, z1], [side * 30, 1.45, z0]], ((z + 30) / 8) % 2 ? "#FFD23F" : "#F0643C");
    }
  }
}

function drawCrowd(th, D) {
  const night = th.night, jump = S.crowdJump;
  for (const p of crowd) {
    const [x, y0, z] = standPoint(p.stand, p.u, p.v, D);
    const y = y0 + (jump > 0 ? Math.abs(Math.sin(S.t * 11 + p.ph)) * 0.5 * Math.min(1, jump) : Math.sin(S.t * 1.3 + p.ph) * 0.03);
    const q = P(x, y, z);
    if (!q || q.dz < 2 || q.x < -10 || q.x > W + 10) continue;
    const w = Math.max(1, 0.62 * q.s), h = Math.max(1, 0.62 * q.s);
    ctx.fillStyle = p.c; ctx.globalAlpha = night ? 0.75 : 0.95;
    ctx.fillRect(q.x - w / 2, q.y - h, w, h);
    if (q.s > 3) { ctx.fillStyle = p.h; ctx.fillRect(q.x - w * 0.28, q.y - h * 1.55, w * 0.56, h * 0.55); }
    if (night && p.fl > 0.985 && Math.sin(S.t * 3 + p.ph * 7) > 0.96) {
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q.x, q.y - h, Math.max(1.5, w * 0.6), 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTower(x, z, th) {
  beam([x, 0, z], [x, 30, z], 0.5, th.night ? "#1A2138" : "#5A6478");
  const p = P(x, 31, z);
  if (!p) return;
  const w = 7 * p.s, h = 2.6 * p.s;
  ctx.fillStyle = th.night ? "#2A3350" : "#6B768C";
  ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const lx = p.x - w / 2 + (c + 0.5) * w / 5, ly = p.y - h / 2 + (r + 0.5) * h / 2;
    ctx.fillStyle = th.night ? "#FFFBEA" : "#E4E9F2";
    ctx.beginPath(); ctx.arc(lx, ly, Math.max(1, p.s * 0.45), 0, 7); ctx.fill();
  }
  if (th.night) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const r = Math.max(60, p.s * 22);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, "rgba(255,248,220,.75)"); g.addColorStop(0.25, "rgba(255,240,200,.22)"); g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    ctx.restore();
  }
}

// ---------- drawing: the field ----------
function drawField(th, D, col) {
  const GL = D - 10; // goal line
  const zNear = cam.z + 0.35;
  // stripes
  for (let z = Math.floor((zNear - GL) / 5) * 5 + GL; z < GL; z += 5) {
    const i = Math.round((z - GL) / 5);
    groundQuad(-26.67, 26.67, z, z + 5, (i % 2 + 2) % 2 ? th.grass[0] : th.grass[1]);
  }
  // end zone in the kicker's colour
  groundQuad(-26.67, 26.67, GL, D, col);
  groundQuad(-26.67, 26.67, GL, D, "rgba(0,0,0,.12)");
  groundQuad(-26.67, 26.67, D, D + 13, th.out);
  onGround(0, GL + 5, () => {
    ctx.font = "100px Archivo Black, Arial Black, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const k = Math.min(0.05, 42 / ctx.measureText("ROSENBERG").width);
    ctx.scale(k, 0.05);
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillText("ROSENBERG", 0, 6);
  });
  // yard lines
  const white = th.snow ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.9)";
  for (let z = GL; z > zNear - 5; z -= 5) groundQuad(-26.67, 26.67, z - 0.07, z + 0.07, white);
  groundQuad(-26.67, 26.67, GL - 0.1, GL + 0.1, white);
  groundQuad(-26.67, 26.67, D - 0.1, D + 0.1, white);
  groundQuad(-26.97, -26.67, zNear, D + 0.1, white); groundQuad(26.67, 26.97, zNear, D + 0.1, white);
  // hash marks
  for (let z = GL - 1; z > zNear; z -= 1) {
    if ((GL - z) % 5 === 0) continue;
    for (const x of [-HASH, HASH, -25.9, 25.9]) groundQuad(x - 0.35, x + 0.35, z - 0.05, z + 0.05, white);
  }
  // yard numbers
  for (let k = 1; k <= 9; k++) {
    const z = GL - k * 10, num = 50 - Math.abs(50 - k * 10);
    if (z < zNear + 2) break;
    for (const x of [-19, 19]) onGround(x, z, () => {
      ctx.scale(0.022, 0.022); ctx.font = "100px Archivo Black, Arial Black, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = white; ctx.fillText(String(num), 0, 4);
    });
  }
  // midfield logo
  const mid = GL - 50;
  if (mid > zNear + 3) onGround(0, mid, () => {
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fill();
    ctx.lineWidth = 0.35; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.stroke();
    ctx.scale(0.04, 0.04); ctx.font = "100px Archivo Black, Arial Black, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff"; ctx.fillText("RW", 0, 6);
  });
  // line of scrimmage
  groundQuad(-26.67, 26.67, 6.9, 7.1, "rgba(80,150,255,.8)");
  // soft haze at the horizon
  const hz = ctx.createLinearGradient(0, HY - H * 0.08, 0, HY + H * 0.05);
  hz.addColorStop(0, "rgba(0,0,0,0)"); hz.addColorStop(0.6, th.haze); hz.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hz; ctx.fillRect(0, HY - H * 0.08, W, H * 0.13);
}

function drawAim(spec, col, locked) {
  const bx = spec.bx, L = Math.min(spec.D - 3, 20), a = S.aim;
  const sx = Math.sin(a), cz = Math.cos(a), nx = cz, nz = -sx;
  const pts = [];
  for (let d = 1.2; d <= L; d += 0.5) pts.push(d);
  // ribbon
  const wid = 0.28;
  const q = [];
  for (const d of pts) q.push([bx + sx * d, cz * d]);
  ctx.save();
  for (let i = 0; i < q.length - 1; i++) {
    const [x0, z0] = q[i], [x1, z1] = q[i + 1];
    ctx.globalAlpha = 0.75 * (1 - i / q.length) + 0.1;
    poly([[x0 - nx * wid, 0.02, z0 - nz * wid], [x0 + nx * wid, 0.02, z0 + nz * wid], [x1 + nx * wid, 0.02, z1 + nz * wid], [x1 - nx * wid, 0.02, z1 - nz * wid]], locked ? col : "#FFFFFF");
  }
  // chevrons
  const phase = (S.t * 3) % 1;
  for (let d = 2 + phase * 2; d < L; d += 2) {
    const x = bx + sx * d, z = cz * d;
    ctx.globalAlpha = 0.95 * (1 - d / L);
    poly([[x - nx * 0.7 - sx * 0.5, 0.03, z - nz * 0.7 - cz * 0.5], [x, 0.03, z], [x + nx * 0.7 - sx * 0.5, 0.03, z + nz * 0.7 - cz * 0.5], [x, 0.03, z - cz * 0.35]], locked ? "#FFFFFF" : "#FFD23F");
  }
  ctx.restore();
}

// ---------- drawing: goal posts ----------
function drawPosts(spec) {
  const D = spec.D, zb = D + 1.9, th = spec.theme;
  const [shx, shz] = th.shadow;
  // shadow
  ctx.globalAlpha = th.night ? 0.12 : 0.22;
  for (const x of [-HALF_W, HALF_W]) {
    const a = [x + shx * BAR, D + shz * BAR], b = [x + shx * UP_TOP, D + shz * UP_TOP];
    beamGround(a, b, 0.14);
  }
  beamGround([-HALF_W + shx * BAR, D + shz * BAR], [HALF_W + shx * BAR, D + shz * BAR], 0.14);
  ctx.globalAlpha = 1;
  const gold = "#F7C51E", hi = "#FFE680", dark = "#B88A00";
  // base pad + gooseneck
  beam([0, 0, zb], [0, 1.9, zb], 0.55, spec.col);
  beam([0, 0, zb], [0, BAR - 0.4, zb], 0.16, dark);
  beam([0, BAR - 0.4, zb], [0, BAR, D], 0.16, dark);
  // crossbar and uprights
  beam([-HALF_W, BAR, D], [HALF_W, BAR, D], 0.14, gold);
  for (const x of [-HALF_W, HALF_W]) beam([x, BAR, D], [x, UP_TOP, D], 0.12, gold);
  beam([-HALF_W, BAR + 0.04, D], [HALF_W, BAR + 0.04, D], 0.04, hi);
  for (const x of [-HALF_W, HALF_W]) beam([x - 0.03, BAR, D], [x - 0.03, UP_TOP, D], 0.035, hi);
  // wind ribbons on top of the uprights
  for (const x of [-HALF_W, HALF_W]) {
    const p = P(x, UP_TOP, D);
    if (!p) continue;
    const w = spec.wind, len = (0.6 + Math.min(Math.abs(w), 25) / 25 * 1.8) * p.s, dir = Math.sign(w);
    ctx.strokeStyle = "#FF3B30"; ctx.lineWidth = Math.max(2, 0.3 * p.s); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    if (w === 0) ctx.quadraticCurveTo(p.x + 0.1 * p.s, p.y + len * 0.5, p.x, p.y + len);
    else {
      const wave = Math.sin(S.t * (6 + Math.abs(w) * 0.3) + x) * 0.25 * p.s;
      ctx.bezierCurveTo(p.x + dir * len * 0.35, p.y + wave, p.x + dir * len * 0.7, p.y - wave, p.x + dir * len, p.y + len * (0.4 - Math.abs(w) / 60) + wave);
    }
    ctx.stroke();
  }
}
function beamGround(a, b, w) {
  const p = P(a[0], 0, a[1]), q = P(b[0], 0, b[1]);
  if (!p || !q) return;
  ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(1, w * (p.s + q.s) / 2); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
}

// ---------- drawing: the ball ----------
function drawBallShadow(b, th) {
  const [shx, shz] = th.shadow;
  const p = P(b.x + shx * b.y, 0, b.z + shz * b.y);
  if (!p) return;
  const k = Math.max(0.15, 1 - b.y / 14);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(2, 0.22 * p.s), Math.max(1, 0.22 * p.s * cam.y / p.dz), 0, 0, 7); ctx.fill();
}
function drawBall(b) {
  const p = P(b.x, b.y + 0.15, b.z);
  if (!p) return;
  // trail
  if (S.trail.length > 2) {
    ctx.lineCap = "round";
    for (let i = 1; i < S.trail.length; i++) {
      const a = P(...S.trail[i - 1]), c = P(...S.trail[i]);
      if (!a || !c) continue;
      ctx.strokeStyle = `rgba(255,230,140,${(i / S.trail.length) * 0.5})`;
      ctx.lineWidth = Math.max(1, (i / S.trail.length) * 0.16 * c.s);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
  }
  const r = Math.max(3, 0.16 * p.s);
  const tumble = Math.abs(Math.sin(b.rot));
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(b.flying ? Math.sin(b.rot * 0.5) * 0.15 : -0.1);
  const rx = r * 0.62, ry = r * (0.62 + 0.38 * (b.flying ? tumble : 1));
  const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, "#B8683A"); g.addColorStop(1, "#6A3217");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill();
  if (r > 4 && Math.cos(b.rot) > -0.2) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(0.8, r * 0.09);
    ctx.beginPath(); ctx.moveTo(0, -ry * 0.45); ctx.lineTo(0, ry * 0.45); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-rx * 0.2, i * ry * 0.16); ctx.lineTo(rx * 0.2, i * ry * 0.16); ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- drawing: the kicker ----------
function drawKid(id, wx, wz, st) {
  const p = P(wx, 0, wz);
  if (!p || p.dz < 0.9) return;
  const u = p.s / UPY;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 0.4 * p.s, 0.09 * p.s, 0, 0, 7); ctx.fill();
  ctx.scale(u, u);
  A.drawChar(ctx, KID(id), st);
  ctx.restore();
}
function drawTee(spec) {
  const p = P(spec.bx, 0, 0);
  if (!p || p.dz < 0.9) return;
  const u = p.s;
  ctx.fillStyle = "#F07C2A";
  ctx.beginPath(); ctx.moveTo(p.x - 0.09 * u, p.y); ctx.lineTo(p.x + 0.09 * u, p.y); ctx.lineTo(p.x + 0.04 * u, p.y - 0.09 * u); ctx.lineTo(p.x - 0.04 * u, p.y - 0.09 * u); ctx.fill();
}

// kicker over time (kt = seconds since the power tap)
const RUN = 0.5, CONTACT = 0.62;
function kickerPose(spec) {
  const bx = spec.bx, start = [bx - 1.4, -1.6], hit = [bx - 0.34, 0.04];
  const kt = S.kickT, t = S.t;
  if (kt < 0) return { x: start[0], z: start[1], st: { t, move: 0, side: 0, back: true, dir: 1 } };
  if (kt < RUN) {
    const f = kt / RUN, e = f * (2 - f);
    return { x: start[0] + (hit[0] - start[0]) * e, z: start[1] + (hit[1] - start[1]) * e, st: { t: kt * 1.6, move: 1, side: 1, dir: 1 } };
  }
  const k = kt - RUN;
  if (k < 0.75) return { x: hit[0], z: hit[1], st: { t, move: 0, side: 1, dir: 1, pose: "kick", pt: Math.min(1, k * 1.5) } };
  if (S.shown && S.outcome) {
    return { x: hit[0], z: hit[1], st: { t, move: 0, side: 0, dir: 1, pose: S.outcome.good ? "celebrate" : "shrug", pt: 1 } };
  }
  return { x: hit[0], z: hit[1], st: { t, move: 0, side: 0, back: true, dir: 1 } };
}

// ---------- particles ----------
function drawWeather(spec, dt) {
  const th = spec.theme, wind = spec.wind;
  // wind streaks
  if (wind !== 0) {
    ctx.lineCap = "round";
    for (const s of streaks) {
      s.x += wind * 0.35 * dt;
      if (s.x > 32) s.x = -32; if (s.x < -32) s.x = 32;
      const z = cam.z + s.z;
      const a = P(cam.x + s.x, s.y, z), b = P(cam.x + s.x - Math.sign(wind) * s.l * (0.5 + Math.abs(wind) / 20), s.y, z);
      if (!a || !b) continue;
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.28, 0.06 + Math.abs(wind) / 90)})`;
      ctx.lineWidth = Math.max(0.8, 0.05 * a.s);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  if (th.snow) {
    ctx.fillStyle = "#fff";
    for (const f of snow) {
      f.y -= 1.6 * dt; f.x += (wind * 0.22 + Math.sin(S.t + f.ph) * 0.4) * dt;
      if (f.y < 0) { f.y = 18; f.x = rnd(-30, 30); }
      if (f.x > 32) f.x = -32; if (f.x < -32) f.x = 32;
      const p = P(cam.x + f.x, f.y, cam.z + f.z);
      if (!p) continue;
      ctx.globalAlpha = Math.min(0.95, 0.4 + 20 / f.z);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.min(3.2, Math.max(0.8, f.s * p.s)), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function burstConfetti(spec) {
  const cols = ["#FFD23F", "#FF5A5A", "#4CE08A", "#4EA8FF", "#FFFFFF", KID(S.kicker).color];
  for (let i = 0; i < 160; i++) {
    confetti.push({ x: rnd(-7, 7), y: rnd(10, 15), z: spec.D + rnd(-2, 3), vx: rnd(-4, 4), vy: rnd(2, 9), vz: rnd(-3, 2),
      c: cols[i % cols.length], r: Math.random() * 6, vr: rnd(-10, 10), life: rnd(2.2, 3.6) });
  }
  if (spec.theme.night || spec.n % 3 === 0) {
    for (const [fx, fy] of [[-18, 24], [16, 27], [0, 30]]) {
      const c = cols[(Math.random() * 5) | 0];
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2, sp = rnd(5, 8);
        sparks.push({ x: fx, y: fy, z: spec.D + 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c, life: 1.6, t0: rnd(0, 0.5) });
      }
    }
  }
}
function drawParticles(spec, dt) {
  confetti = confetti.filter(c => (c.life -= dt) > 0);
  for (const c of confetti) {
    c.vy -= 5 * dt; c.vx += spec.wind * 0.12 * dt; c.vx *= 0.99; c.vy = Math.max(c.vy, -2.2);
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.r += c.vr * dt;
    const p = P(c.x, c.y, c.z);
    if (!p) continue;
    const s = Math.max(1.5, 0.22 * p.s);
    ctx.fillStyle = c.c; ctx.globalAlpha = Math.min(1, c.life);
    ctx.fillRect(p.x - s / 2, p.y - s * Math.abs(Math.cos(c.r)) / 2, s, s * Math.abs(Math.cos(c.r)) + 0.5);
  }
  ctx.globalAlpha = 1;
  if (sparks.length) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    sparks = sparks.filter(s => (s.t0 > 0 ? (s.t0 -= dt, true) : (s.life -= dt) > 0));
    for (const s of sparks) {
      if (s.t0 > 0) continue;
      s.vy -= 3 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const p = P(s.x, s.y, s.z);
      if (!p) continue;
      ctx.fillStyle = s.c; ctx.globalAlpha = Math.min(1, s.life);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.2, 0.3 * p.s), 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- power meter ----------
function drawMeter(spec) {
  if (!(S.phase === "power" || (S.phase === "run" && S.kickT < 1.2))) return;
  const h = Math.min(H * 0.34, 260), w = 20, x = W - 16 - w - 8, y = Math.min(H * 0.72, H - 100) - h;
  ctx.save();
  ctx.fillStyle = "rgba(10,16,34,.62)"; rr(x - 8, y - 30, w + 16, h + 42, 16); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = "800 10px Figtree, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("POWER", x + w / 2, y - 14);
  ctx.fillStyle = "rgba(255,255,255,.12)"; rr(x, y, w, h, 10); ctx.fill();
  const g = ctx.createLinearGradient(0, y + h, 0, y);
  g.addColorStop(0, "#4CE08A"); g.addColorStop(0.6, "#FFD23F"); g.addColorStop(1, "#FF6B3D");
  const fh = h * S.power;
  ctx.fillStyle = g; rr(x, y + h - fh, w, fh, 10); ctx.fill();
  // how much you need to reach the bar
  const ny = y + h - h * spec.need;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x - 6, ny); ctx.lineTo(x + w + 6, ny); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.font = "800 10px Figtree, sans-serif";
  ctx.fillText("REACH", x - 10, ny + 3);
  // marker
  const my = y + h - fh;
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x - 4, my); ctx.lineTo(x - 13, my - 6); ctx.lineTo(x - 13, my + 6); ctx.fill();
  ctx.restore();
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, Math.max(0, h) / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- frame ----------
function draw(dt) {
  const spec = S.spec, th = spec.theme, col = KID(S.kicker).color;
  spec.col = col;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake * 10, (Math.random() - 0.5) * S.shake * 10);
  drawSky(th);
  drawStadium(th, spec.D);
  drawField(th, spec.D, col);
  if (S.phase === "aim" || S.phase === "power") drawAim(spec, col, S.phase === "power");

  // depth-sorted objects
  const b = S.ball, items = [];
  items.push({ z: spec.D, f: () => drawPosts(spec) });
  const kp = kickerPose(spec);
  items.push({ z: kp.z, f: () => drawKid(S.kicker, kp.x, kp.z, kp.st) });
  items.push({ z: 0.02, f: () => drawTee(spec) });
  items.push({ z: b.z - 0.01, f: () => drawBall(b) });
  items.sort((a, c) => c.z - a.z);
  drawBallShadow(b, th);
  for (const it of items) it.f();

  drawWeather(spec, dt);
  drawParticles(spec, dt);

  // light grade + vignette
  if (th.warm) { ctx.fillStyle = "rgba(255,150,60,.07)"; ctx.fillRect(0, 0, W, H); }
  if (th.night) { ctx.fillStyle = "rgba(20,30,80,.12)"; ctx.fillRect(0, 0, W, H); }
  const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.38)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  drawMeter(spec);
}
// ---------- physics + game flow ----------
function newBall(spec) {
  return { x: spec.bx, y: 0.09, z: 0, vx: 0, vy: 0, vz: 0, rot: 0.3, flying: false, crossed: false, rest: false };
}

function launch() {
  const spec = S.spec, v = V_MIN + S.power * (V_MAX - V_MIN), b = S.ball;
  b.vx = v * Math.cos(ELEV) * Math.sin(S.aim);
  b.vz = v * Math.cos(ELEV) * Math.cos(S.aim);
  b.vy = v * Math.sin(ELEV);
  b.flying = true; S.trail = [];
  sfx.kick();
  S.shake = 0.25;
}

function stepBall(dt) {
  const b = S.ball, spec = S.spec;
  if (!b.flying || b.rest) return;
  const px = b.x, py = b.y, pz = b.z;
  b.vy -= G * dt;
  if (b.y > 0.05) b.vx += spec.wind * WIND_K * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  b.rot += (b.y > 0.1 ? 13 : 3) * dt;

  // through the plane of the posts
  if (!b.crossed && pz < spec.D && b.z >= spec.D) {
    b.crossed = true;
    const f = (spec.D - pz) / (b.z - pz), x = px + (b.x - px) * f, y = py + (b.y - py) * f;
    judge(x, y);
  }
  // ground
  if (b.y <= 0) {
    b.y = 0;
    if (!S.outcome) decide(false, "SHORT", "Didn't reach the crossbar");
    if (Math.abs(b.vy) < 1.5) { b.vy = 0; b.vx *= 0.9; b.vz *= 0.9; if (Math.hypot(b.vx, b.vz) < 0.3) b.rest = true; }
    else { b.vy = -b.vy * 0.45; b.vx *= 0.6; b.vz *= 0.6; }
  }
}

function judge(x, y) {
  const b = S.ball, r = 0.16;
  const ax = Math.abs(x);
  if (y < BAR - r) return decide(false, "SHORT", "Under the crossbar");
  if (Math.abs(y - BAR) < r && ax < HALF_W) {
    sfx.doink(); S.shake = 0.4;
    if (Math.random() < 0.5) { b.vy = Math.abs(b.vy) * 0.4 + 2; b.vz *= 0.45; return decide(true, "DOINK… IT'S GOOD!", "Off the crossbar and over"); }
    b.vy = Math.abs(b.vy) * 0.3 + 1.5; b.vz *= -0.3; b.z = S.spec.D - 0.1; return decide(false, "DOINK!", "Off the crossbar");
  }
  if (Math.abs(ax - HALF_W) < r) {
    sfx.doink(); S.shake = 0.4;
    const inside = ax < HALF_W ? Math.random() < 0.6 : Math.random() < 0.3;
    if (inside) { b.vx = -Math.sign(x) * rnd(2, 4); b.vz *= 0.5; return decide(true, "DOINK… IT'S GOOD!", "Off the upright and in"); }
    b.vx = Math.sign(x) * rnd(2, 4); b.vz *= -0.25; b.z = S.spec.D - 0.1; return decide(false, "DOINK!", "Off the upright");
  }
  if (ax < HALF_W) return decide(true, ax < 0.7 ? "RIGHT DOWN THE MIDDLE!" : "IT'S GOOD!", `${S.spec.D} yards`);
  return decide(false, x < 0 ? "WIDE LEFT" : "WIDE RIGHT", S.spec.wind ? "Blame the wind" : "So close");
}

function decide(good, big, sub) {
  if (S.outcome) return;
  S.outcome = { good, big, sub };
  S.resultAt = S.t + (good ? 0.15 : 0.35);
}

function showResult() {
  const o = S.outcome, spec = S.spec;
  S.shown = true;
  banner(o.big, o.sub, !o.good);
  if (o.good) {
    S.made++; S.longest = Math.max(S.longest, spec.D);
    S.crowdJump = 3; burstConfetti(spec); sfx.cheer();
  } else {
    S.balls--; sfx.aww(); renderBalls();
  }
  const L = LINES[S.kicker][o.good ? "good" : "bad"];
  say(L[(Math.random() * L.length) | 0], o.good ? "happy" : "sad");
  S.nextAt = S.t + (o.good ? 2.6 : 2.8);
}

function advance() {
  if (!S.outcome) return;
  hideBubble();
  if (S.outcome.good) {
    const earned = S.level % 5 === 0 && S.balls < 3;
    S.level++;
    if (earned) { S.balls++; toast("+1 football"); }
    startLevel(false);
  } else if (S.balls <= 0) {
    gameOver();
  } else startLevel(true);
}

function startLevel(retry) {
  if (!retry || !S.spec) S.spec = levelSpec(S.level);
  S.ball = newBall(S.spec); S.trail = [];
  S.outcome = null; S.shown = false; S.kickT = -1; S.power = 0; S.powT = 0; S.aimPh = Math.random() * 6.28; S.aim = 0;
  cam.x = camX0(S.spec.bx); cam.y = CAM0.y; cam.z = -CAM0.back;
  S.phase = "intro"; S.pt = 0;
  const th = S.spec.theme;
  banner(retry ? "TRY AGAIN" : `LEVEL ${S.level}`, `${S.spec.D} yards · ${windText(S.spec.wind, true)}`, false, th.name);
  renderHud();
  hint("");
  sfx.wind(S.spec.wind);
}

function windText(w, long) {
  if (!w) return "Calm";
  return `${Math.abs(w)} mph${long ? (w < 0 ? " ←" : " →") : ""}`;
}

function update(dt) {
  S.t += dt; S.pt += dt;
  S.shake = Math.max(0, S.shake - dt * 1.5);
  S.crowdJump = Math.max(0, S.crowdJump - dt);
  const spec = S.spec;
  if (S.screen !== "play") {
    // gentle attract-mode drift behind the title card
    cam.x = camX0(spec.bx) + Math.sin(S.t * 0.25) * 1.2;
    cam.z = -CAM0.back + Math.sin(S.t * 0.18) * 0.8;
    return;
  }
  switch (S.phase) {
    case "intro":
      if (S.pt > 1.5) { S.phase = "aim"; S.pt = 0; hideBanner(); hint("aim"); }
      break;
    case "aim":
      S.aimPh += dt * spec.aimSpeed;
      S.aim = MAX_AIM * Math.sin(S.aimPh);
      break;
    case "power": {
      S.powT += dt * spec.powSpeed;
      const m = S.powT % 2;
      S.power = m < 1 ? m : 2 - m;
      break;
    }
    case "run": case "flight": case "result": {
      const before = S.kickT;
      S.kickT += dt;
      if (before < CONTACT && S.kickT >= CONTACT) { launch(); S.phase = "flight"; }
      if (S.ball.flying) {
        const b = S.ball;
        const near = !S.outcome && Math.abs(b.z - spec.D) < 3.5 && b.y > 1;
        S.slow += ((near ? 0.35 : 1) - S.slow) * Math.min(1, dt * 10);
        const n = 4, h = dt * S.slow / n;
        for (let i = 0; i < n; i++) stepBall(h);
        if (!b.rest && b.y > 0.05) { S.trail.push([b.x, b.y + 0.15, b.z]); if (S.trail.length > 26) S.trail.shift(); }
        else if (S.trail.length) S.trail.shift();
        // camera chases the ball
        const tz = Math.min(b.z - 16, spec.D * 0.35 - 9), ty = CAM0.y + Math.min(b.y * 0.3, 3.5), tx = camX0(spec.bx) * 0.4 + b.x * 0.4;
        const k = 1 - Math.exp(-dt * 2.6);
        cam.z += (Math.max(-CAM0.back, tz) - cam.z) * k; cam.y += (ty - cam.y) * k; cam.x += (tx - cam.x) * k;
      }
      if (S.outcome && !S.shown && S.t >= S.resultAt) { S.phase = "result"; showResult(); }
      if (S.shown && S.t >= S.nextAt) advance();
      break;
    }
  }
}

// ---------- input ----------
function tap() {
  sfx.unlock();
  if (S.screen !== "play") return;
  if (S.phase === "aim") { S.phase = "power"; S.pt = 0; S.powT = 0; sfx.tick(); hint("power"); }
  else if (S.phase === "power") { S.phase = "run"; S.kickT = 0; sfx.tick(); hint(""); }
  else if (S.phase === "result" && S.shown && S.t > S.nextAt - 1.9) advance();
}
cv.addEventListener("pointerdown", (e) => { e.preventDefault(); tap(); });
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    if (S.screen === "play") { e.preventDefault(); tap(); }
  }
});

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
function banner(big, sub, miss, eyebrow) {
  const el = $("banner");
  el.className = "banner" + (miss ? " miss" : "");
  el.innerHTML = (eyebrow ? `<div class="kicker">${eyebrow}</div>` : "") + `<div class="big"></div><div class="sub"></div>`;
  el.querySelector(".big").textContent = big; el.querySelector(".sub").textContent = sub;
  el.hidden = false; void el.offsetWidth; el.classList.add("show");
}
function hideBanner() { const el = $("banner"); el.classList.remove("show"); el.classList.add("hide"); setTimeout(() => { if (el.classList.contains("hide")) el.hidden = true; }, 350); }
function hint(which) {
  const el = $("hint");
  if (!which) { el.hidden = true; return; }
  el.innerHTML = which === "aim" ? `<span class="step">1</span>Tap to lock your aim` : `<span class="step">2</span>Tap for power`;
  el.hidden = false;
}
function say(text, mood) {
  $("bFace").replaceChildren(kidFace(S.kicker, mood === "happy" ? "celebrate" : "shrug")); $("bSay").textContent = text;
  const el = $("bubble"); el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
}
function hideBubble() { $("bubble").hidden = true; hideBanner(); }
function toast(t) {
  const el = document.createElement("div"); el.className = "toast"; el.textContent = t;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1800);
}
const BALL_SVG = `<svg viewBox="0 0 22 14" aria-hidden="true"><ellipse cx="11" cy="7" rx="10" ry="6" fill="#8B4A24"/><path d="M5 7 H17 M8 5 V9 M11 5 V9 M14 5 V9" stroke="#fff" stroke-width="1.3"/></svg>`;
function renderBalls() {
  $("hBalls").innerHTML = [0, 1, 2].map(i => BALL_SVG.replace("<svg", `<svg class="${i < S.balls ? "" : "gone"}"`)).join("");
}
function renderHud() {
  $("hLevel").textContent = S.level;
  $("hYds").textContent = S.spec.D;
  $("hWind").textContent = windText(S.spec.wind);
  const ar = $("hArrow");
  ar.style.transform = S.spec.wind < 0 ? "scaleX(-1)" : "none";
  ar.classList.toggle("calm", !S.spec.wind);
  renderBalls();
}

function renderPick() {
  $("pick").innerHTML = ORDER.map(id => `<button type="button" data-id="${id}" aria-pressed="${id === S.kicker}" style="--kc:${KID(id).color}"><canvas></canvas><span>${KID(id).name}</span><small>${TAGS[id]}</small></button>`).join("");
  $("pick").querySelectorAll("canvas").forEach((cv, i) => kidCanvas(cv, ORDER[i], { pose: ORDER[i] === S.kicker ? "wave" : null, t: 0.4 }));
  $("best").textContent = best.level ? `Best: Level ${best.level} · Longest make ${best.longest} yds` : "Just you, the ball and the wind.";
}
$("pick").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  S.kicker = b.dataset.id; store.set("kicker", S.kicker); renderPick(); sfx.unlock(); sfx.tick();
});

function startGame() {
  sfx.unlock();
  S.screen = "play"; S.level = 1; S.balls = 3; S.made = 0; S.longest = 0; S.spec = null;
  $("title").hidden = true; $("over").hidden = true; $("hud").hidden = false;
  startLevel(false);
}
function gameOver() {
  S.screen = "over"; S.phase = "idle"; hint("");
  const reached = S.level;
  if (reached > best.level || S.longest > best.longest) {
    best = { level: Math.max(best.level, reached), longest: Math.max(best.longest, S.longest) };
    store.set("best", best);
  }
  $("oFace").replaceChildren(kidFace(S.kicker, S.made >= 3 ? "celebrate" : "shrug"));
  $("oTitle").textContent = `Level ${reached}`;
  $("oQuote").textContent = `“${LINES[S.kicker].end}” — ${KID(S.kicker).name}`;
  $("oMade").textContent = S.made; $("oLong").textContent = S.longest ? S.longest : "—"; $("oBest").textContent = best.level;
  $("over").hidden = false; $("hud").hidden = true;
  // Rosenberg World: one star per field goal made, up to 10 (does nothing when played on its own)
  if (window.RosenbergBridge) RosenbergBridge.report({ score: S.made, stars: Math.min(10, S.made) });
}
$("start").addEventListener("click", startGame);
$("again").addEventListener("click", startGame);
$("switch").addEventListener("click", () => {
  S.screen = "title"; $("over").hidden = true; $("title").hidden = false; renderPick();
  S.spec = levelSpec(1); S.ball = newBall(S.spec); S.kickT = -1; S.outcome = null; S.shown = false;
});
$("mute").addEventListener("click", (e) => {
  e.stopPropagation(); muted = !muted; store.set("muted", muted); paintMute(); sfx.setMuted();
});
function paintMute() { $("mute").textContent = muted ? "🔇" : "🔊"; $("mute").setAttribute("aria-label", muted ? "Sound off" : "Sound on"); }

// ---------- sound (all synthesized) ----------
const sfx = (() => {
  let ac = null, master = null, noise = null, crowdG = null, windG = null;
  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.connect(ac.destination);
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noise = buf;
      // ambient crowd murmur
      crowdG = ac.createGain(); crowdG.gain.value = 0.045;
      const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.6;
      src.connect(bp).connect(crowdG).connect(master); src.start();
      // wind
      windG = ac.createGain(); windG.gain.value = 0;
      const ws = ac.createBufferSource(); ws.buffer = noise; ws.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 180;
      lfo.connect(lg).connect(lp.frequency); lfo.start();
      ws.connect(lp).connect(windG).connect(master); ws.start();
      setMuted();
      if (S.spec) wind(S.spec.wind);
    }
    if (ac.state === "suspended") ac.resume();
  }
  function wind(w) { if (windG) windG.gain.setTargetAtTime(Math.min(0.28, Math.abs(w) / 70), ac.currentTime, 0.5); }
  function setMuted() { if (master) master.gain.value = muted ? 0 : 0.9; }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noiseHit(type, f, q, a, peak, d) {
    if (!ac) return;
    const t = ac.currentTime, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    s.connect(fl).connect(g).connect(master); env(g, t, a, peak, d); s.start(t, Math.random()); s.stop(t + a + d + 0.1);
    return fl;
  }
  function tone(type, f0, f1, a, peak, d) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    o.connect(g).connect(master); env(g, t, a, peak, d); o.start(t); o.stop(t + a + d + 0.1);
  }
  return {
    unlock, setMuted,
    tick() { tone("triangle", 880, 660, 0.005, 0.12, 0.08); },
    kick() { tone("sine", 150, 45, 0.004, 0.9, 0.18); noiseHit("highpass", 1800, 0.7, 0.002, 0.35, 0.05); },
    doink() { tone("sine", 1180, 1150, 0.003, 0.5, 0.7); tone("triangle", 1770, 1740, 0.003, 0.25, 0.5); tone("sine", 610, 600, 0.003, 0.3, 0.4); },
    cheer() {
      if (!ac) return;
      const f = noiseHit("bandpass", 900, 0.5, 0.35, 0.8, 2.6);
      if (f) f.frequency.linearRampToValueAtTime(1300, ac.currentTime + 0.5);
      noiseHit("bandpass", 2400, 1.5, 0.3, 0.25, 2);
      [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => tone("square", n, n, 0.01, 0.06, 0.22), 250 + i * 110));
    },
    aww() {
      if (!ac) return;
      const f = noiseHit("bandpass", 1000, 1.2, 0.15, 0.5, 1.6);
      if (f) f.frequency.exponentialRampToValueAtTime(380, ac.currentTime + 1.5);
    },
    wind,
  };
})();

// ---------- boot ----------
if (!ORDER.includes(S.kicker)) S.kicker = "reuben";
S.spec = levelSpec(1); S.ball = newBall(S.spec);
renderPick(); paintMute();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  draw(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
if (/[?&]debug/.test(location.search)) window.__S = S;
})();
