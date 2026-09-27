// Rosenberg Mini Golf: course builder, ball physics, 2.5D renderer, input and sound.
(() => {
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  // ---------- tuning ----------
  const BALL_R = 0.15, CUP_R = 0.3, WALL_H = 0.26, WALL_T = 0.17;
  const GRAV = 9.2, MAX_V = 12.5, MAX_PULL = 3.0, CAPTURE_V = 3.1, MAX_STROKES = 7;
  const WATER_DROP = 0.14;
  const SURF = {
    green: { mu: 1.2, drag: 0.42 }, bridge: { mu: 1.05, drag: 0.4 },
    sand: { mu: 5.5, drag: 2.4 }, water: { mu: 3, drag: 3 }, ice: { mu: 0.3, drag: 0.1 },
  };

  // ---------- colour helpers ----------
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbStr = (c, f = 1, a = 1) =>
    `rgba(${clamp(c[0] * f, 0, 255) | 0},${clamp(c[1] * f, 0, 255) | 0},${clamp(c[2] * f, 0, 255) | 0},${a})`;
  const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const shade = (hex, f, a) => rgbStr(hexRgb(hex), f, a);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- canvas ----------
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const groundCv = document.createElement("canvas"), gctx = groundCv.getContext("2d");
  const skyCv = document.createElement("canvas"), sctx = skyCv.getContext("2d");

  // ---------- camera: a real perspective camera tilted down at the island ----------
  const cam = { a: 0.8, D: 26, tx: 0, ty: 0, tz: 0, cx: 0, cy: 0, cz: 0, ca: 1, sa: 0, k: 1, ox: 0, oy: 0 };
  function P(x, y, z) {
    const dy = y - cam.cy, dz = z - cam.cz;
    const depth = -dy * cam.ca - dz * cam.sa;
    const Y = -dy * cam.sa + dz * cam.ca;
    return [cam.ox + (cam.k * (x - cam.cx)) / depth, cam.oy - (cam.k * Y) / depth, depth];
  }
  const scaleAt = (depth) => cam.k / depth;
  function unproject(px, py, z0) {
    const p = (px - cam.ox) / cam.k, q = -(py - cam.oy) / cam.k;
    const dx = p, dy = -cam.ca - q * cam.sa, dz = -cam.sa + q * cam.ca;
    const t = (z0 - cam.cz) / dz;
    return [cam.cx + t * dx, cam.cy + t * dy];
  }
  const camSees = (px, py, nx, ny) => (cam.cx - px) * nx + (cam.cy - py) * ny > 0;

  // ---------- state ----------
  let HI = 0, hole = null, T = null;       // current hole index, definition, theme
  let tiles = [], parts = [], edges = [], walls = [], faces = [], waterParts = [], falls = [];
  let gridW = 0, gridH = 0, tee = [0, 0], cup = [0, 0];
  let mill = null, spinner = null, bumpers = [], objects = [];
  let drawbridge = null, sliders = [], boosts = [], warps = [], clock = 0;
  let ball = null, lastRest = null, strokes = 0, scores = [];
  let state = "title", stateT = 0, time = 0, introT = 0;
  let drag = null, particles = [], critters = [], shake = 0, cardShown = false;
  let lightV = [0, 0, 1];

  // ---------- building a hole ----------
  const SQ = (i, j) => [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
  const TRI = {
    "1": (i, j) => [[[i, j], [i + 1, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1], [i, j + 1]]],
    "2": (i, j) => [[[i, j], [i + 1, j], [i + 1, j + 1]], [[i, j], [i + 1, j + 1], [i, j + 1]]],
    "3": (i, j) => [[[i + 1, j], [i + 1, j + 1], [i, j + 1]], [[i, j], [i + 1, j], [i, j + 1]]],
    "4": (i, j) => [[[i, j], [i + 1, j + 1], [i, j + 1]], [[i, j], [i + 1, j], [i + 1, j + 1]]],
  };
  const surfOffset = (s) => (s === "water" || s === "pond" || s === "drawbridge" ? -WATER_DROP : 0);

  function buildHole(idx) {
    HI = idx; hole = HOLES[idx]; T = hole.theme;
    const L = T.light, ln = Math.hypot(...L); lightV = L.map((v) => v / ln);
    gridH = hole.map.length; gridW = hole.map[0].length;
    tiles = []; parts = []; edges = []; walls = []; faces = []; waterParts = []; falls = []; objects = [];
    const addPart = (tile, poly, surf, play) => {
      const p = { poly, surf, play, tile, cx: poly.reduce((s, v) => s + v[0], 0) / poly.length, cy: poly.reduce((s, v) => s + v[1], 0) / poly.length };
      tile.parts.push(p); parts.push(p);
      if (surf === "water" || surf === "pond" || surf === "bridge" || surf === "drawbridge") waterParts.push(p);
      return p;
    };
    for (let j = 0; j < gridH; j++) {
      const row = [];
      for (let i = 0; i < gridW; i++) {
        const ch = hole.map[j][i], tile = { i, j, ch, parts: [] };
        row.push(tile);
        if (ch === " ") continue;
        if (TRI[ch]) { const [a, b] = TRI[ch](i, j); addPart(tile, a, "green", true); addPart(tile, b, "grass", false); continue; }
        const map = { ".": ["grass", false], "M": ["grass", false], "~": ["pond", false], ",": ["beach", false], s: ["sand", true], w: ["water", true], b: ["bridge", true], i: ["ice", true], d: ["drawbridge", true] };
        const [surf, play] = map[ch] || ["green", true];
        addPart(tile, SQ(i, j), surf, play);
        if (ch === "T") tee = [i + 0.5, j + 0.5];
        if (ch === "H") cup = [i + 0.5, j + 0.5];
      }
      tiles.push(row);
    }
    // a diagonal tile's green half takes on the ice or sand beside it
    for (const row of tiles) for (const t of row) if (TRI[t.ch]) {
      for (const [di, dj] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const n = tiles[t.j + dj]?.[t.i + di], np = n && !TRI[n.ch] && n.parts[0];
        if (np && np.play && (np.surf === "ice" || np.surf === "sand")) { t.parts[0].surf = np.surf; break; }
      }
    }
    // shared edges → walls, water banks, island skirts
    const emap = new Map();
    const key = (a, b) => (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`);
    for (const p of parts) {
      for (let k = 0; k < p.poly.length; k++) {
        const a = p.poly[k], b = p.poly[(k + 1) % p.poly.length], kk = key(a, b);
        if (!emap.has(kk)) emap.set(kk, { a, b, owners: [] });
        emap.get(kk).owners.push(p);
      }
    }
    for (const e of emap.values()) {
      const [A, B] = e.owners;
      if (!B) { if (A.play) addWall(e, A, null); else addSkirt(e, A); continue; }
      if (A.play !== B.play) { addWall(e, A.play ? A : B, A.play ? B : A); continue; }
      if (A.surf === "bridge" || B.surf === "bridge") {
        const other = A.surf === "bridge" ? B : A;
        if (other.surf === "water") addStep(e, A.surf === "bridge" ? A : B, other, true);
        continue;
      }
      // a drop between neighbours: a water bank, or a cliff between grass at two heights
      const da = surfZ(A, ...e.a) - surfZ(B, ...e.a), db = surfZ(A, ...e.b) - surfZ(B, ...e.b);
      if (Math.abs(da) > 0.02 || Math.abs(db) > 0.02) addStep(e, da + db > 0 ? A : B, da + db > 0 ? B : A, false);
    }
    miterWalls();
    // moving parts and props
    mill = hole.windmill ? { ...hole.windmill, kind: "mill", angle: 0.4 } : hole.gatehouse ? { ...hole.gatehouse, kind: "gate", angle: 0 } : null;
    drawbridge = hole.drawbridge ? { ...hole.drawbridge, a: 0 } : null;
    sliders = (hole.sliders || []).map((sl) => ({ ...sl, x: sl.cx + sl.amp * Math.sin(sl.phase || 0), vx: 0 }));
    boosts = hole.boosts || []; warps = hole.warps || []; clock = 0;
    spinner = hole.spinner ? { ...hole.spinner, angle: 0 } : null;
    bumpers = (hole.bumpers || []).map((b) => ({ ...b, glow: 0 }));
    objects = hole.objects.map((o) => ({ ...o }));
    ball = { x: tee[0], y: tee[1], vx: 0, vy: 0, z: 0, sink: 0, hidden: false, lip: 0 };
    lastRest = [tee[0], tee[1]];
    strokes = 0; particles = []; drag = null;
    makeCritters();
  }

  const heightAt = (p, x, y) => (p && p.play ? hole.hp(x, y) : hole.hd(x, y, p ? p.tile.i : Math.floor(x), p ? p.tile.j : Math.floor(y)));
  const surfZ = (p, x, y) => heightAt(p, x, y) + surfOffset(p.surf);

  function addWall(e, inner, outer) {
    const hidden = inner.tile.ch === "t" || (outer && outer.tile.ch === "M");
    let [a, b] = [e.a, e.b];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    let nx = dy / len, ny = -dx / len;
    if ((inner.cx - a[0]) * nx + (inner.cy - a[1]) * ny > 0) { nx = -nx; ny = -ny; }
    const zs = (p) => {
      const hi = hole.hp(p[0], p[1]), ho = outer ? surfZ(outer, p[0], p[1]) : hi - 0.6;
      return [Math.min(hi, ho) - 0.03, Math.max(hi + WALL_H, ho + 0.06)];
    };
    walls.push({ a, b, nx, ny, len, hidden, za: zs(a), zb: zs(b), inner, outer, oa: null, ob: null, capA: true, capB: true,
      front: !camSees(a[0], a[1], -nx, -ny) });
  }
  function addSkirt(e, owner) {
    const [a, b] = [e.a, e.b], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    let nx = dy / len, ny = -dx / len;
    if ((owner.cx - a[0]) * nx + (owner.cy - a[1]) * ny > 0) { nx = -nx; ny = -ny; }
    faces.push({ kind: "skirt", a, b, nx, ny, owner, water: owner.surf === "pond" });
  }
  function addStep(e, hi, lo, bridge) {
    const [a, b] = [e.a, e.b], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    let nx = dy / len, ny = -dx / len;
    if ((lo.cx - a[0]) * nx + (lo.cy - a[1]) * ny < 0) { nx = -nx; ny = -ny; }
    faces.push({ kind: bridge ? "beam" : "bank", a, b, nx, ny, hi, lo });
  }
  // Join neighbouring wall segments with mitred corners so the rails read as one continuous piece.
  function miterWalls() {
    const at = new Map();
    const vk = (p) => `${p[0]},${p[1]}`;
    for (const w of walls) {
      if (w.hidden) continue;
      for (const end of ["a", "b"]) { const k = vk(w[end]); if (!at.has(k)) at.set(k, []); at.get(k).push([w, end]); }
    }
    for (const w of walls) {
      for (const end of ["a", "b"]) {
        const p = w[end];
        let ox = w.nx * WALL_T, oy = w.ny * WALL_T;
        const list = at.get(vk(p)) || [];
        if (list.length === 2) {
          const [o] = list.find(([ww]) => ww !== w);
          const mx = w.nx + o.nx, my = w.ny + o.ny, ml = Math.hypot(mx, my);
          if (ml > 1e-3) {
            const ux = mx / ml, uy = my / ml, c = ux * w.nx + uy * w.ny;
            const m = Math.min(WALL_T / Math.max(c, 0.2), WALL_T * 3);
            ox = ux * m; oy = uy * m;
          }
          w[end === "a" ? "capA" : "capB"] = false;
        }
        w[end === "a" ? "oa" : "ob"] = [p[0] + ox, p[1] + oy];
      }
    }
  }

  function partAt(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    if (j < 0 || j >= gridH || i < 0 || i >= gridW) return null;
    const t = tiles[j][i];
    if (!t.parts.length) return null;
    if (t.parts.length === 1) return t.parts[0];
    const fx = x - i, fy = y - j, ch = t.ch;
    const inGreen = ch === "1" ? fx + fy < 1 : ch === "2" ? fx > fy : ch === "3" ? fx + fy > 1 : fy > fx;
    return t.parts[inGreen ? 0 : 1];
  }

  // ---------- layout ----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    for (const c of [cv, groundCv, skyCv]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    cv.style.width = W + "px"; cv.style.height = H + "px";
    if (hole) { fitCamera(); renderSky(); renderGround(); }
  }
  function fitCamera() {
    cam.tx = gridW / 2; cam.ty = gridH / 2 + 0.6; cam.tz = 0;
    cam.D = Math.max(gridH, gridW) * 1.4;
    cam.ca = Math.cos(cam.a); cam.sa = Math.sin(cam.a);
    cam.cx = cam.tx; cam.cy = cam.ty + cam.D * cam.ca; cam.cz = cam.tz + cam.D * cam.sa;
    cam.k = 1; cam.ox = 0; cam.oy = 0;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    // frame the playing area; the grass around it may spill off the edges
    // (width: just the playing area; height: the whole island down to its rocky underside)
    for (const p of parts) for (const v of p.poly) {
      for (const z of [-0.4, 1.2]) {
        if (!p.play) continue;
        const [sx] = P(v[0] + Math.sign(v[0] - gridW / 2) * 0.55, v[1], z);
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
      }
      for (const z of [-1.3, 1.0]) { const [, sy] = P(v[0], v[1], z); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    }
    const hud = $(".hud").getBoundingClientRect();
    const top = Math.max(hud.bottom + 8, 60), bottom = H - 34, side = 10;
    cam.k = Math.min((W - side * 2) / (x1 - x0), (bottom - top) / (y1 - y0));
    cam.ox = W / 2 - (cam.k * (x0 + x1)) / 2;
    cam.oy = (top + bottom) / 2 - (cam.k * (y0 + y1)) / 2;
  }

  // ---------- drawing primitives ----------
  function path3(g, pts) {
    g.beginPath();
    for (let i = 0; i < pts.length; i++) { const s = P(pts[i][0], pts[i][1], pts[i][2]); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }
    g.closePath();
  }
  function fill3(g, pts, color, seam) {
    path3(g, pts); g.fillStyle = color; g.fill();
    if (seam) { g.strokeStyle = color; g.lineWidth = 0.8; g.stroke(); }
  }
  const lit = (nx, ny, nz) => { const n = Math.hypot(nx, ny, nz); return (nx * lightV[0] + ny * lightV[1] + nz * lightV[2]) / n; };
  const litF = (nx, ny, nz) => clamp(1 + 0.95 * (lit(nx, ny, nz) - lightV[2]), 0.55, 1.35);
  // vertical faces: gentler, so a wall facing away from the light still reads as its own colour
  const litS = (nx, ny) => { const l = Math.hypot(lightV[0], lightV[1]) || 1; return clamp(0.86 + 0.26 * (nx * lightV[0] + ny * lightV[1]) / l, 0.62, 1.12); };

  // ---------- sky ----------
  function renderSky() {
    const g = sctx; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const grd = g.createLinearGradient(0, 0, 0, H);
    T.sky.forEach((c, i) => grd.addColorStop(i / (T.sky.length - 1), c));
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const R = rng(HI * 97 + 5);
    if (T.stars) {
      for (let i = 0; i < 140; i++) {
        const x = R() * W, y = R() * H * 0.6, r = R() * 1.2 + 0.3;
        g.fillStyle = `rgba(255,255,255,${(0.25 + R() * 0.6) * (1 - y / (H * 0.6))})`;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    }
    if (T.sun) {
      const sx = T.sun.x * W, sy = T.sun.y * H, r = Math.min(W, H) * 0.5;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      sg.addColorStop(0, shade(T.sun.c, 1, 0.95)); sg.addColorStop(0.08, shade(T.sun.c, 1, 0.8)); sg.addColorStop(0.3, shade(T.sun.c, 1, 0.22)); sg.addColorStop(1, shade(T.sun.c, 1, 0));
      g.fillStyle = sg; g.fillRect(0, 0, W, H);
    }
    if (T.moon) {
      const mx = T.moon.x * W, my = T.moon.y * H, r = Math.min(W, H) * 0.045;
      const mg = g.createRadialGradient(mx, my, r * 0.5, mx, my, r * 6);
      mg.addColorStop(0, "rgba(255,236,210,.35)"); mg.addColorStop(1, "rgba(255,236,210,0)");
      g.fillStyle = mg; g.fillRect(0, 0, W, H);
      g.fillStyle = "#FFF1DA"; g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
      g.fillStyle = "rgba(210,180,160,.35)";
      [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(mx + dx * r, my + dy * r, rr * r, 0, TAU); g.fill(); });
    }
    // low mist the islands float above
    const mist = g.createLinearGradient(0, H * 0.62, 0, H);
    mist.addColorStop(0, shade(T.mist, 1, 0)); mist.addColorStop(1, shade(T.mist, 1, T.night ? 0.35 : 0.7));
    g.fillStyle = mist; g.fillRect(0, H * 0.62, W, H * 0.38);
  }
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: 0.08 + (i % 4) * 0.2 + Math.random() * 0.08, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 }));
  function drawClouds(g, dt, front) {
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      if ((i % 3 === 0) !== front) continue;
      c.x += c.v * dt * (front ? 1.6 : 1); if (c.x > 1.25) c.x = -0.25;
      const x = c.x * W, y = c.y * H + (front ? H * 0.55 : 0), s = c.s * Math.min(W, H) * 0.09 * (front ? 1.4 : 1);
      g.fillStyle = shade(T.cloud, 1, front ? (T.night ? 0.16 : 0.5) : T.night ? 0.12 : 0.55);
      g.beginPath();
      g.ellipse(x, y, s * 1.6, s * 0.55, 0, 0, TAU);
      g.ellipse(x - s * 0.7, y - s * 0.1, s * 0.8, s * 0.55, 0, 0, TAU);
      g.ellipse(x + s * 0.5, y - s * 0.35, s * 0.9, s * 0.7, 0, 0, TAU);
      g.fill();
    }
  }

  // ---------- ground (drawn once per hole into its own canvas) ----------
  function surfColor(p, x, y, sub) {
    const s = p.surf;
    let c;
    if (s === "green") {
      c = hexRgb(T.green);
      const stripe = Math.floor(x + 0.001) % 2 === 0 ? 1.045 : 0.97;
      return mixRgb(c.map((v) => v * stripe), c, 0.2 + hash(sub, 1) * 0.05);
    }
    if (s === "grass") { c = hexRgb(T.grass); return c.map((v) => v * (0.94 + hash(x * 3.1, y * 2.7) * 0.1)); }
    if (s === "sand") { c = hexRgb(T.sand); return c.map((v) => v * (0.97 + hash(x * 5, y * 5) * 0.05)); }
    if (s === "beach") return hexRgb(T.beach);
    if (s === "ice") { c = hexRgb(T.ice || "#BFE4F6"); return c.map((v) => v * (0.97 + hash(x * 2.3, y * 1.7) * 0.06 + (Math.floor(x * 3 + y * 2) % 5 === 0 ? 0.05 : 0))); }
    return hexRgb(T.water);
  }
  function drawSurface(g, p) {
    const hf = (x, y) => heightAt(p, x, y);
    if (p.surf === "bridge") {
      const [i, j] = [p.tile.i, p.tile.j];
      fill3(g, SQ(i, j).map(([x, y]) => [x, y, hf(x, y) - WATER_DROP]), rgbStr(hexRgb(T.water), 0.92), true);
      // planks run across the bridge
      for (let k = 0; k < 5; k++) {
        const y0 = j + k / 5 + 0.012, y1 = j + (k + 1) / 5 - 0.012;
        const f = 0.94 + hash(i, j * 5 + k) * 0.12;
        fill3(g, [[i + 0.02, y0, hf(i, y0) + 0.03], [i + 0.98, y0, hf(i + 1, y0) + 0.03], [i + 0.98, y1, hf(i + 1, y1) + 0.03], [i + 0.02, y1, hf(i, y1) + 0.03]], rgbStr([196, 142, 90], f));
      }
      return;
    }
    const off = surfOffset(p.surf);
    if (p.poly.length === 3) {
      const pts = p.poly.map(([x, y]) => [x, y, hf(x, y) + off]);
      const [a, b, c] = pts;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      fill3(g, pts, rgbStr(surfColor(p, p.cx, p.cy, 0), litF(nx, ny, nz)), true);
      return;
    }
    const N = p.play ? hole.detail || 8 : 2, [x0, y0] = p.poly[0];
    for (let b = 0; b < N; b++) {
      for (let a = 0; a < N; a++) {
        const xa = x0 + a / N, xb = x0 + (a + 1) / N, ya = y0 + b / N, yb = y0 + (b + 1) / N;
        const h00 = hf(xa, ya) + off, h10 = hf(xb, ya) + off, h11 = hf(xb, yb) + off, h01 = hf(xa, yb) + off;
        const dzdx = ((h10 - h00) + (h11 - h01)) * 0.5 * N, dzdy = ((h01 - h00) + (h11 - h10)) * 0.5 * N;
        const col = surfColor(p, xa, ya, a + b * 7 + x0 * 13 + y0 * 29);
        const lf = litF(-dzdx, -dzdy, 1);
        fill3(g, [[xa, ya, h00], [xb, ya, h10], [xb, yb, h11], [xa, yb, h01]], rgbStr(col, p.play ? 1 + (lf - 1) * 0.75 : lf), true);
      }
    }
    if (p.surf === "sand") {
      const R = rng(p.tile.i * 31 + p.tile.j * 7);
      for (let k = 0; k < 14; k++) {
        const x = x0 + R(), y = y0 + R(), s = P(x, y, hf(x, y));
        g.fillStyle = R() < 0.5 ? "rgba(255,255,255,.35)" : "rgba(120,90,40,.18)";
        g.fillRect(s[0], s[1], 1.4, 1.4);
      }
    }
  }
  function drawFace(g, f) {
    const { a, b } = f;
    if (!camSees((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, f.nx, f.ny)) return;
    const side = litS(f.nx, f.ny);
    if (f.kind === "skirt") {
      const ta = surfZ(f.owner, a[0], a[1]), tb = surfZ(f.owner, b[0], b[1]), bot = -1.25 - hash(a[0], a[1]) * 0.25;
      const top = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (ta + tb) / 2), btm = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, bot);
      const grd = g.createLinearGradient(top[0], top[1], btm[0], btm[1]);
      const span = (ta + tb) / 2 - bot, lipEnd = 0.09 / span;
      if (f.water) {
        grd.addColorStop(0, rgbStr(T.lava ? [255, 236, 150] : [225, 246, 255], side)); grd.addColorStop(0.25, rgbStr(hexRgb(T.water), side * 1.05));
        grd.addColorStop(1, rgbStr(hexRgb(T.water), side * 0.9, 0));
      } else {
        const e = T.earth.map(hexRgb);
        grd.addColorStop(0, rgbStr(hexRgb(T.lip), side)); grd.addColorStop(lipEnd, rgbStr(hexRgb(T.lip), side * 0.85));
        grd.addColorStop(lipEnd + 0.01, rgbStr(e[0], side)); grd.addColorStop(0.42, rgbStr(e[1], side));
        grd.addColorStop(0.43, rgbStr(e[1], side * 0.9)); grd.addColorStop(0.75, rgbStr(e[2], side));
        grd.addColorStop(1, rgbStr(e[2], side * 0.9, 0));
      }
      fill3(g, [[a[0], a[1], ta], [b[0], b[1], tb], [b[0], b[1], bot], [a[0], a[1], bot]], grd, false);
      if (f.water) falls.push(f);
    } else {
      const ta = f.kind === "beam" ? hole.hp(a[0], a[1]) + 0.03 : surfZ(f.hi, a[0], a[1]);
      const tb = f.kind === "beam" ? hole.hp(b[0], b[1]) + 0.03 : surfZ(f.hi, b[0], b[1]);
      const ba = surfZ(f.lo, a[0], a[1]), bb = surfZ(f.lo, b[0], b[1]);
      const col = f.kind === "beam" ? [150, 100, 60] : f.hi.surf === "grass" ? hexRgb(T.earth[0]) : mixRgb(hexRgb(T.green), [60, 50, 40], 0.35);
      fill3(g, [[a[0], a[1], ta], [b[0], b[1], tb], [b[0], b[1], bb], [a[0], a[1], ba]], rgbStr(col, side), true);
    }
  }
  function renderGround() {
    const g = gctx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    falls = [];
    const faceRow = (f) => Math.ceil(Math.max(f.a[1], f.b[1]) - 1e-6) - 1;
    // soft shadow of the island on the mist below
    const c = P(gridW / 2, gridH / 2 + 2.5, -3.2), r = scaleAt(c[2]) * gridW * 0.62;
    const sh = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
    sh.addColorStop(0, "rgba(20,20,50,.22)"); sh.addColorStop(1, "rgba(20,20,50,0)");
    g.fillStyle = sh; g.beginPath(); g.ellipse(c[0], c[1], r, r * 0.35, 0, 0, TAU); g.fill();
    const flowerR = rng(HI * 1013 + 1);
    for (let j = 0; j < gridH; j++) {
      for (let i = 0; i < gridW; i++) for (const p of tiles[j][i].parts) drawSurface(g, p);
      for (const f of faces) if (faceRow(f) === j) drawFace(g, f);
      // flowers and tufts on the grass
      for (let i = 0; i < gridW; i++) {
        for (const p of tiles[j][i].parts) {
          if (p.surf !== "grass" || tiles[j][i].ch === "M") continue;
          const n = p.poly.length === 3 ? 1 : 3;
          for (let k = 0; k < n; k++) {
            if (flowerR() > 0.55) continue;
            let x = i + 0.1 + flowerR() * 0.8, y = j + 0.1 + flowerR() * 0.8;
            if (partAt(x, y) !== p) continue;
            const z = hole.hd(x, y), s = P(x, y, z), sc = scaleAt(s[2]);
            if (flowerR() < 0.5) {
              g.strokeStyle = shade(T.grass, 0.72); g.lineWidth = Math.max(1, sc * 0.02);
              g.beginPath(); for (let q = -1; q <= 1; q++) { g.moveTo(s[0] + q * sc * 0.04, s[1]); g.lineTo(s[0] + q * sc * 0.07, s[1] - sc * 0.1); } g.stroke();
            } else {
              const col = hole.flowers[(flowerR() * hole.flowers.length) | 0];
              for (let q = 0; q < 4; q++) {
                const fx = s[0] + (flowerR() - 0.5) * sc * 0.25, fy = s[1] + (flowerR() - 0.5) * sc * 0.12;
                g.fillStyle = col; g.beginPath(); g.arc(fx, fy, Math.max(1.1, sc * 0.028), 0, TAU); g.fill();
              }
            }
          }
        }
      }
      if (Math.floor(tee[1]) === j) drawTee(g);
      if (Math.floor(cup[1]) === j) drawCup(g);
    }
    drawLilies(g);
    // painted chevrons pointing up a ramp
    for (const [x, y] of hole.chevrons || []) {
      for (const dy of [0, 0.35]) {
        const pt = (u, v) => [x + u, y + v + dy, hole.hp(x + u, y + v + dy) + 0.01];
        path3(g, [pt(-0.35, 0.2), pt(0, -0.12), pt(0.35, 0.2), pt(0.35, 0.34), pt(0, 0.02), pt(-0.35, 0.34)]);
        g.fillStyle = "rgba(255,255,255,.28)"; g.fill();
      }
    }
  }
  function circle3(cx, cy, r, zf, n = 24) {
    const pts = [];
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; pts.push([x, y, zf(x, y)]); }
    return pts;
  }
  function drawCup(g) {
    const zf = (x, y) => hole.hp(x, y) + 0.005;
    fill3(g, circle3(cup[0], cup[1], CUP_R + 0.05, zf), "rgba(255,255,255,.55)");
    fill3(g, circle3(cup[0], cup[1], CUP_R, zf), "#1B1712");
    // inside wall of the cup catching light on the far side
    g.save(); path3(g, circle3(cup[0], cup[1], CUP_R, zf)); g.clip();
    fill3(g, circle3(cup[0], cup[1] + 0.09, CUP_R, (x, y) => zf(x, y) - 0.06), "#3A3129");
    fill3(g, circle3(cup[0], cup[1] + 0.13, CUP_R * 0.95, (x, y) => zf(x, y) - 0.12), "#0D0B09");
    g.restore();
  }
  function drawTee(g) {
    const zf = (x, y) => hole.hp(x, y) + 0.006, [x, y] = tee;
    fill3(g, [[x - 0.42, y - 0.3, zf(x - 0.42, y - 0.3)], [x + 0.42, y - 0.3, zf(x + 0.42, y - 0.3)], [x + 0.42, y + 0.3, zf(x + 0.42, y + 0.3)], [x - 0.42, y + 0.3, zf(x - 0.42, y + 0.3)]], shade(T.green, 0.72));
    for (const dx of [-0.28, 0.28]) { const s = P(x + dx, y, zf(x, y) + 0.02); g.fillStyle = "#fff"; g.beginPath(); g.arc(s[0], s[1], scaleAt(s[2]) * 0.045, 0, TAU); g.fill(); }
  }
  function drawLilies(g) {
    for (const [x, y] of hole.lilies || []) {
      const z = hole.hp(x, y) - WATER_DROP + 0.01;
      fill3(g, circle3(x, y, 0.2, () => z, 14).filter((_, k) => k !== 1), "#4FA85A");
      const s = P(x + 0.05, y - 0.03, z + 0.03);
      g.fillStyle = "#FFB3D1"; g.beginPath(); g.arc(s[0], s[1], scaleAt(s[2]) * 0.06, 0, TAU); g.fill();
    }
  }

  // ---------- walls (drawn every frame so the ball can pass behind them) ----------
  function drawWall(g, w) {
    const [a, b, oa, ob] = [w.a, w.b, w.oa, w.ob];
    const top = [[a[0], a[1], w.za[1]], [b[0], b[1], w.zb[1]], [ob[0], ob[1], w.zb[1]], [oa[0], oa[1], w.za[1]]];
    const topC = hexRgb(T.wallTop), sideC = hexRgb(T.wallSide);
    if (camSees(a[0], a[1], -w.nx, -w.ny)) fill3(g, [[a[0], a[1], w.za[0]], [b[0], b[1], w.zb[0]], [b[0], b[1], w.zb[1]], [a[0], a[1], w.za[1]]], rgbStr(sideC, litS(-w.nx, -w.ny) * 1.08), true);
    if (camSees(oa[0], oa[1], w.nx, w.ny)) fill3(g, [[oa[0], oa[1], w.za[0] - 0.15], [ob[0], ob[1], w.zb[0] - 0.15], [ob[0], ob[1], w.zb[1]], [oa[0], oa[1], w.za[1]]], rgbStr(sideC, litS(w.nx, w.ny) * 0.92), true);
    const dx = (b[0] - a[0]) / w.len, dy = (b[1] - a[1]) / w.len;
    if (w.capA && camSees(a[0], a[1], -dx, -dy)) fill3(g, [[a[0], a[1], w.za[0]], [oa[0], oa[1], w.za[0]], [oa[0], oa[1], w.za[1]], [a[0], a[1], w.za[1]]], rgbStr(sideC, litS(-dx, -dy)), true);
    if (w.capB && camSees(b[0], b[1], dx, dy)) fill3(g, [[b[0], b[1], w.zb[0]], [ob[0], ob[1], w.zb[0]], [ob[0], ob[1], w.zb[1]], [b[0], b[1], w.zb[1]]], rgbStr(sideC, litS(dx, dy)), true);
    fill3(g, top, rgbStr(topC, litF(0, 0, 1)), true);
    // a bright edge along the inside of the rail
    const s1 = P(a[0], a[1], w.za[1]), s2 = P(b[0], b[1], w.zb[1]);
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.stroke();
  }

  // a flat face with its outward normal n: skipped when it faces away, gently lit when it doesn't
  function face3(g, pts, n, rgb, f = 1) {
    const c = [0, 0, 0]; for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; }
    if ((cam.cx - c[0]) * n[0] + (cam.cy - c[1]) * n[1] + (cam.cz - c[2]) * n[2] <= 0) return false;
    const nl = Math.hypot(n[0], n[1], n[2]);
    const k = clamp(0.9 + 0.35 * ((n[0] * lightV[0] + n[1] * lightV[1] + n[2] * lightV[2]) / nl - 0.3), 0.78, 1.15);
    fill3(g, pts, rgbStr(rgb, k * f), true); return true;
  }
  function box3(g, x0, y0, x1, y1, z0, z1, side, top) {
    face3(g, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], side);
    face3(g, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], side);
    face3(g, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], side, 0.92);
    face3(g, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], [-1, 0, 0], side, 0.92);
    face3(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], top || side);
  }
  // an upright cylinder drawn in screen space (towers, stumps, posts)
  function cyl(g, x, y, z0, z1, r, col, topCol) {
    const b = P(x, y, z0), t = P(x, y, z1), sc = scaleAt(b[2]), rx = sc * r, ry = rx * 0.55;
    const grd = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0);
    grd.addColorStop(0, shade(col, 1.12)); grd.addColorStop(0.55, shade(col, 0.95)); grd.addColorStop(1, shade(col, 0.72));
    g.fillStyle = grd; g.beginPath(); g.moveTo(b[0] - rx, b[1]); g.lineTo(t[0] - rx, t[1]); g.lineTo(t[0] + rx, t[1]); g.lineTo(b[0] + rx, b[1]);
    g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); g.fill();
    g.fillStyle = topCol || shade(col, 1.2); g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, TAU); g.fill();
    return { b, t, sc, rx, ry };
  }

  // ---------- props ----------
  function blob(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function groundShadow(g, x, y, r, a = 0.22) {
    const z = hole.hd(x, y) + 0.01;
    fill3(g, circle3(x + 0.12, y + 0.08, r, () => z, 18), `rgba(10,20,30,${a})`);
  }
  const DRAW = {
    tree(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      groundShadow(g, o.x, o.y, 0.55 * s);
      const b = P(o.x, o.y, z), t = P(o.x, o.y, z + 0.75 * s), sc = scaleAt(b[2]);
      g.strokeStyle = "#6B4A33"; g.lineWidth = sc * 0.12 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
      const c = P(o.x, o.y, z + 1.15 * s), r = sc * 0.58 * s, sway = Math.sin(time * 1.2 + o.x) * r * 0.03;
      const base = o.c || (T.night ? "#2E6B4E" : "#4E9E45");
      blob(g, c[0] + sway, c[1] + r * 0.12, r, shade(base, 0.7));
      blob(g, c[0] - r * 0.35 + sway, c[1] + r * 0.2, r * 0.62, shade(base, 0.82));
      blob(g, c[0] + r * 0.38 + sway, c[1] + r * 0.18, r * 0.6, shade(base, 0.78));
      blob(g, c[0] - r * 0.12 + sway, c[1] - r * 0.12, r * 0.75, shade(base, 1));
      blob(g, c[0] - r * 0.3 + sway, c[1] - r * 0.35, r * 0.4, shade(base, 1.18));
    },
    cherry(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      groundShadow(g, o.x, o.y, 0.6 * s, 0.25);
      const b = P(o.x, o.y, z), sc = scaleAt(b[2]);
      const t = P(o.x + 0.1, o.y, z + 0.8 * s);
      g.strokeStyle = "#4A3038"; g.lineWidth = sc * 0.11 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo(b[0] - sc * 0.2, (b[1] + t[1]) / 2, t[0], t[1]); g.stroke();
      const c = P(o.x + 0.05, o.y, z + 1.15 * s), r = sc * 0.62 * s;
      const pk = ["#C9577F", "#E07FA2", "#F3A6C0", "#FFD0DE"];
      [[0, 0.1, 1, 0], [-0.45, 0.15, 0.6, 1], [0.45, 0.12, 0.62, 1], [-0.1, -0.15, 0.72, 2], [-0.28, -0.32, 0.38, 3], [0.25, -0.2, 0.34, 3]]
        .forEach(([dx, dy, rr, ci]) => blob(g, c[0] + dx * r, c[1] + dy * r, rr * r, pk[ci]));
    },
    pine(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      groundShadow(g, o.x, o.y, 0.45 * s);
      const b = P(o.x, o.y, z), sc = scaleAt(b[2]);
      const base = o.bonsai ? "#2F5E4A" : T.night ? "#24533F" : "#2F7A4A";
      g.fillStyle = "#5C3F2C"; g.fillRect(b[0] - sc * 0.05 * s, b[1] - sc * 0.4 * s, sc * 0.1 * s, sc * 0.4 * s);
      for (let k = 0; k < 3; k++) {
        const y0 = P(o.x, o.y, z + (0.3 + k * 0.42) * s)[1], y1 = P(o.x, o.y, z + (1.0 + k * 0.42) * s)[1], hw = sc * (0.5 - k * 0.12) * s;
        g.fillStyle = shade(base, 0.85 + k * 0.08);
        g.beginPath(); g.moveTo(b[0] - hw, y0); g.lineTo(b[0], y1); g.lineTo(b[0] + hw, y0); g.closePath(); g.fill();
        g.fillStyle = shade(base, 1.15 + k * 0.05);
        g.beginPath(); g.moveTo(b[0] - hw, y0); g.lineTo(b[0], y1); g.lineTo(b[0] - hw * 0.15, y0); g.closePath(); g.fill();
        if (o.snow) {
          const ym = lerp(y1, y0, 0.45);
          g.fillStyle = "#FBFDFF"; g.beginPath(); g.moveTo(b[0], y1); g.lineTo(b[0] - hw * 0.45, ym); g.lineTo(b[0] - hw * 0.15, ym - (ym - y1) * 0.12); g.lineTo(b[0] + hw * 0.1, ym + (y0 - ym) * 0.05); g.lineTo(b[0] + hw * 0.45, ym); g.closePath(); g.fill();
        }
      }
    },
    palm(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1, lean = o.lean || 0;
      groundShadow(g, o.x + lean * 0.8, o.y, 0.5 * s, 0.18);
      const b = P(o.x, o.y, z), sc = scaleAt(b[2]);
      const topX = o.x + lean * s, topZ = z + 1.7 * s, t = P(topX, o.y, topZ);
      const mid = P(o.x + lean * 0.2, o.y, z + 0.9 * s);
      g.strokeStyle = "#9C7650"; g.lineWidth = sc * 0.1 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo(mid[0], mid[1], t[0], t[1]); g.stroke();
      g.strokeStyle = "rgba(90,60,35,.5)"; g.lineWidth = sc * 0.1 * s;
      g.setLineDash([sc * 0.02, sc * 0.1]); g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo(mid[0], mid[1], t[0], t[1]); g.stroke(); g.setLineDash([]);
      const sway = Math.sin(time * 1.4 + o.x * 2) * 0.08;
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * TAU + sway + o.x;
        const L = sc * 0.85 * s, ex = t[0] + Math.cos(ang) * L, ey = t[1] + Math.sin(ang) * L * 0.45 + L * 0.28;
        const mx = t[0] + Math.cos(ang) * L * 0.5, my = t[1] + Math.sin(ang) * L * 0.2 - L * 0.12;
        g.strokeStyle = k % 2 ? "#2E8B45" : "#3FA852"; g.lineWidth = sc * 0.16 * s;
        g.beginPath(); g.moveTo(t[0], t[1]); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
        g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = sc * 0.03 * s;
        g.beginPath(); g.moveTo(t[0], t[1]); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      }
      blob(g, t[0] - sc * 0.05, t[1] + sc * 0.06, sc * 0.07 * s, "#6B4A2A");
      blob(g, t[0] + sc * 0.06, t[1] + sc * 0.07, sc * 0.07 * s, "#5A3D22");
    },
    bush(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      groundShadow(g, o.x, o.y, 0.38 * s, 0.18);
      const c = P(o.x, o.y, z + 0.18 * s), r = scaleAt(c[2]) * 0.3 * s, base = o.c || (T.night ? "#2F6A4C" : "#5AAA4A");
      blob(g, c[0] - r * 0.6, c[1] + r * 0.1, r * 0.75, shade(base, 0.8));
      blob(g, c[0] + r * 0.6, c[1] + r * 0.15, r * 0.7, shade(base, 0.75));
      blob(g, c[0], c[1] - r * 0.1, r * 0.9, shade(base, 1));
      blob(g, c[0] - r * 0.25, c[1] - r * 0.35, r * 0.4, shade(base, 1.2));
    },
    rock(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      const c = P(o.x, o.y, z + 0.1 * s), r = scaleAt(c[2]) * 0.3 * s;
      g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(c[0] + r * 0.2, c[1] + r * 0.45, r * 1.1, r * 0.35, 0, 0, TAU); g.fill();
      const rc = o.c || (T.night ? "#6C6480" : "#9A9A94");
      g.fillStyle = rc;
      g.beginPath(); g.moveTo(c[0] - r, c[1] + r * 0.4); g.lineTo(c[0] - r * 0.7, c[1] - r * 0.4); g.lineTo(c[0] - r * 0.1, c[1] - r * 0.7); g.lineTo(c[0] + r * 0.7, c[1] - r * 0.35); g.lineTo(c[0] + r, c[1] + r * 0.4); g.closePath(); g.fill();
      g.fillStyle = o.snowy ? "#FFFFFF" : shade(rc, 1.3);
      g.beginPath(); g.moveTo(c[0] - r * 0.7, c[1] - r * 0.4); g.lineTo(c[0] - r * 0.1, c[1] - r * 0.7); g.lineTo(c[0] + r * 0.1, c[1] - r * 0.1); g.lineTo(c[0] - r * 0.5, c[1]); g.closePath(); g.fill();
      if (o.snowy) { g.beginPath(); g.moveTo(c[0] - r * 0.1, c[1] - r * 0.7); g.lineTo(c[0] + r * 0.7, c[1] - r * 0.35); g.lineTo(c[0] + r * 0.4, c[1] - r * 0.2); g.closePath(); g.fill(); }
    },
    reeds(g, o) {
      const z = hole.hd(o.x, o.y) - 0.05, b = P(o.x, o.y, z), sc = scaleAt(b[2]) * (o.s || 1);
      for (let k = 0; k < 6; k++) {
        const dx = (k - 2.5) * sc * 0.06, h = sc * (0.35 + (k % 3) * 0.1), sw = Math.sin(time * 1.5 + k) * sc * 0.03;
        g.strokeStyle = "#5E8F3A"; g.lineWidth = Math.max(1, sc * 0.025);
        g.beginPath(); g.moveTo(b[0] + dx, b[1]); g.quadraticCurveTo(b[0] + dx, b[1] - h * 0.6, b[0] + dx + sw, b[1] - h); g.stroke();
        if (k % 2) { g.fillStyle = "#7A4E2E"; g.fillRect(b[0] + dx + sw - sc * 0.02, b[1] - h - sc * 0.02, sc * 0.04, sc * 0.1); }
      }
    },
    fence(g, o) {
      const n = 6;
      for (let k = 0; k <= n; k++) {
        const x = lerp(o.x0, o.x1, k / n), y = lerp(o.y0, o.y1, k / n), z = hole.hd(x, y), b = P(x, y, z), t = P(x, y, z + 0.35), sc = scaleAt(b[2]);
        g.strokeStyle = "#FFFDF6"; g.lineWidth = sc * 0.06; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
      }
      for (const h of [0.14, 0.28]) {
        const a = P(o.x0, o.y0, hole.hd(o.x0, o.y0) + h), b = P(o.x1, o.y1, hole.hd(o.x1, o.y1) + h);
        g.strokeStyle = "#F3EEE2"; g.lineWidth = scaleAt(a[2]) * 0.04; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    },
    torch(g, o) {
      const z = hole.hd(o.x, o.y), b = P(o.x, o.y, z), t = P(o.x, o.y, z + 0.8), sc = scaleAt(b[2]);
      g.strokeStyle = "#7A5230"; g.lineWidth = sc * 0.06; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
      g.fillStyle = "#5A3A20"; g.fillRect(t[0] - sc * 0.06, t[1] - sc * 0.03, sc * 0.12, sc * 0.1);
      const fl = 1 + Math.sin(time * 13 + o.x * 5) * 0.12 + Math.sin(time * 7.3 + o.y) * 0.08;
      g.fillStyle = "#FFB02E"; g.beginPath(); g.ellipse(t[0], t[1] - sc * 0.1 * fl, sc * 0.06, sc * 0.12 * fl, 0, 0, TAU); g.fill();
      g.fillStyle = "#FFF2B0"; g.beginPath(); g.ellipse(t[0], t[1] - sc * 0.06 * fl, sc * 0.03, sc * 0.06 * fl, 0, 0, TAU); g.fill();
    },
    lantern(g, o) {
      const z = hole.hd(o.x, o.y), b = P(o.x, o.y, z), sc = scaleAt(b[2]);
      const stone = "#9C96A8", dark = "#6F687E";
      const at = (h) => P(o.x, o.y, z + h);
      const box = (h0, h1, w, c) => { const p0 = at(h0), p1 = at(h1); g.fillStyle = c; g.fillRect(p0[0] - sc * w, p1[1], sc * w * 2, p0[1] - p1[1]); };
      box(0, 0.08, 0.18, dark); box(0.08, 0.42, 0.06, stone); box(0.42, 0.5, 0.16, dark);
      const lb = at(0.5), lt = at(0.72);
      g.fillStyle = "#FFD27A"; g.fillRect(lb[0] - sc * 0.12, lt[1], sc * 0.24, lb[1] - lt[1]);
      g.fillStyle = dark; g.fillRect(lb[0] - sc * 0.02, lt[1], sc * 0.04, lb[1] - lt[1]);
      const rb = at(0.72), rt = at(0.9);
      g.fillStyle = stone; g.beginPath(); g.moveTo(rb[0] - sc * 0.26, rb[1]); g.lineTo(rb[0] + sc * 0.26, rb[1]); g.lineTo(rt[0], rt[1]); g.closePath(); g.fill();
      o.glowAt = [lb[0], (lb[1] + lt[1]) / 2, sc];
    },
    snowman(g, o) { drawSnowman(g, o.x, o.y, hole.hd(o.x, o.y), 0.3 * (o.s || 1)); },
    pumpkin(g, o) { drawPumpkin(g, o.x, o.y, hole.hd(o.x, o.y), 0.22 * (o.s || 1)); },
    cactus(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      groundShadow(g, o.x, o.y, 0.3 * s, 0.2);
      const b = P(o.x, o.y, z), sc = scaleAt(b[2]) * s, at = (dx, h) => [b[0] + dx * sc, P(o.x, o.y, z + h * s)[1]];
      const limb = (pts, w) => {
        g.lineCap = "round"; g.lineJoin = "round";
        for (const [c, lw, off] of [["#3C7F45", w, 0], ["#5DAA5E", w * 0.45, -w * 0.18]]) {
          g.strokeStyle = c; g.lineWidth = lw * sc; g.beginPath();
          pts.forEach(([dx, h], i) => { const q = at(dx, h); i ? g.lineTo(q[0] + off * sc, q[1]) : g.moveTo(q[0] + off * sc, q[1]); }); g.stroke();
        }
      };
      limb([[0, 0], [0, 1.25]], 0.2);
      limb([[0, 0.55], [-0.3, 0.55], [-0.3, 0.95]], 0.12);
      limb([[0, 0.7], [0.28, 0.7], [0.28, 1.05]], 0.12);
      const top = at(0, 1.3); blob(g, top[0], top[1], sc * 0.045, "#FF7BA8");
    },
    tower(g, o) {
      const z = hole.hd(o.x, o.y), H = o.h || 1.8, r = o.r || 0.45;
      groundShadow(g, o.x, o.y, r * 1.3, 0.2);
      const c = cyl(g, o.x, o.y, z, z + H, r, "#D6D0C4", "#BEB7AA");
      g.strokeStyle = "rgba(120,110,95,.3)"; g.lineWidth = 1;
      for (let h = 0.3; h < H; h += 0.3) { const y = P(o.x, o.y, z + h)[1]; g.beginPath(); g.ellipse(c.b[0], y, c.rx, c.ry, 0, 0.1, Math.PI - 0.1); g.stroke(); }
      const win = P(o.x, o.y + r, z + H * 0.62); g.fillStyle = "#3A3140"; g.fillRect(win[0] - c.rx * 0.14, win[1] - c.sc * 0.18, c.rx * 0.28, c.sc * 0.22);
      const apex = P(o.x, o.y, z + H + r * 2.2);
      g.fillStyle = o.c || "#C8453A"; g.beginPath(); g.moveTo(c.t[0] - c.rx * 1.18, c.t[1]); g.lineTo(apex[0], apex[1]); g.lineTo(c.t[0] + c.rx * 1.18, c.t[1]); g.ellipse(c.t[0], c.t[1], c.rx * 1.18, c.ry * 1.18, 0, 0, Math.PI); g.fill();
      g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.moveTo(c.t[0] - c.rx * 1.18, c.t[1]); g.lineTo(apex[0], apex[1]); g.lineTo(c.t[0] - c.rx * 0.4, c.t[1] + c.ry); g.closePath(); g.fill();
      g.strokeStyle = "#5A4A3A"; g.lineWidth = Math.max(1, c.sc * 0.025); g.beginPath(); g.moveTo(apex[0], apex[1]); g.lineTo(apex[0], apex[1] - c.sc * 0.45); g.stroke();
      g.fillStyle = "#FFD24A"; g.beginPath(); g.moveTo(apex[0], apex[1] - c.sc * 0.45);
      for (let k = 0; k <= 6; k++) { const u = k / 6; g.lineTo(apex[0] + u * c.sc * 0.32, apex[1] - c.sc * (0.45 - 0.08 * u) + Math.sin(time * 6 - u * 4 + o.x) * c.sc * 0.03 * u); }
      g.lineTo(apex[0], apex[1] - c.sc * 0.29); g.closePath(); g.fill();
    },
    barn(g, o) {
      const { x0, x1, y0, y1 } = o, z = hole.hd((x0 + x1) / 2, y1), H = 0.95, mx = (x0 + x1) / 2, R = H + 0.75;
      const red = hexRgb("#B8352C"), roof = hexRgb("#5E4A48"), white = "#FFF8EE";
      fill3(g, [[x0 + 0.15, y0 + 0.1, z], [x1 + 0.3, y0 + 0.1, z], [x1 + 0.3, y1 + 0.25, z], [x0 + 0.15, y1 + 0.25, z]], "rgba(0,0,0,.18)");
      face3(g, [[x1, y0, z], [x1, y1, z], [x1, y1, z + H], [x1, y0, z + H]], [1, 0, 0], red, 0.85);
      face3(g, [[x0, y0, z], [x0, y1, z], [x0, y1, z + H], [x0, y0, z + H]], [-1, 0, 0], red, 0.85);
      face3(g, [[x0 - 0.1, y0 - 0.1, z + H - 0.05], [x0 - 0.1, y1 + 0.1, z + H - 0.05], [mx, y1 + 0.1, z + R], [mx, y0 - 0.1, z + R]], [-(R - H), 0, mx - x0], roof);
      face3(g, [[x1 + 0.1, y0 - 0.1, z + H - 0.05], [x1 + 0.1, y1 + 0.1, z + H - 0.05], [mx, y1 + 0.1, z + R], [mx, y0 - 0.1, z + R]], [R - H, 0, x1 - mx], roof, 1.05);
      const front = [[x0, y1, z], [x1, y1, z], [x1, y1, z + H], [mx, y1, z + R - 0.05], [x0, y1, z + H]];
      face3(g, front, [0, 1, 0], red);
      const door = [[mx - 0.42, y1 + 0.01, z], [mx + 0.42, y1 + 0.01, z], [mx + 0.42, y1 + 0.01, z + 0.72], [mx - 0.42, y1 + 0.01, z + 0.72]];
      path3(g, door); g.fillStyle = "#8E2A24"; g.fill(); g.strokeStyle = white; g.lineWidth = 2; g.stroke();
      const d = door.map((p) => P(...p)); g.beginPath(); g.moveTo(d[0][0], d[0][1]); g.lineTo(d[2][0], d[2][1]); g.moveTo(d[1][0], d[1][1]); g.lineTo(d[3][0], d[3][1]); g.stroke();
      const lw = [[mx - 0.16, y1 + 0.01, z + 1.02], [mx + 0.16, y1 + 0.01, z + 1.02], [mx + 0.16, y1 + 0.01, z + 1.3], [mx - 0.16, y1 + 0.01, z + 1.3]];
      path3(g, lw); g.fillStyle = "#3A2A20"; g.fill(); g.stroke();
      path3(g, front); g.strokeStyle = white; g.lineWidth = 2; g.stroke();
    },
    haybale(g, o) {
      const z = hole.hd(o.x, o.y), c = P(o.x, o.y, z + 0.2), sc = scaleAt(c[2]), rx = sc * 0.36, ry = sc * 0.2;
      g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(c[0] + rx * 0.2, c[1] + ry * 1.1, rx * 1.1, ry * 0.6, 0, 0, TAU); g.fill();
      g.fillStyle = "#D9A94A"; g.fillRect(c[0] - rx, c[1] - ry, rx * 2, ry * 2);
      g.fillStyle = "#F0CC6A"; g.beginPath(); g.ellipse(c[0] + rx, c[1], ry * 0.6, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = "#B8862E"; g.lineWidth = 1; g.beginPath(); g.ellipse(c[0] + rx, c[1], ry * 0.35, ry * 0.6, 0, 0, TAU); g.stroke();
      g.strokeStyle = "rgba(140,90,30,.45)"; for (const f of [-0.4, 0.3]) { g.beginPath(); g.moveTo(c[0] + rx * f, c[1] - ry); g.lineTo(c[0] + rx * f, c[1] + ry); g.stroke(); }
    },
    mushroom(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1;
      groundShadow(g, o.x, o.y, 0.45 * s, 0.22);
      const b = P(o.x, o.y, z), t = P(o.x, o.y, z + 0.7 * s), sc = scaleAt(b[2]) * s;
      g.fillStyle = "#F2E6D4"; g.beginPath(); g.moveTo(b[0] - sc * 0.12, b[1]); g.lineTo(t[0] - sc * 0.09, t[1]); g.lineTo(t[0] + sc * 0.09, t[1]); g.lineTo(b[0] + sc * 0.12, b[1]); g.closePath(); g.fill();
      drawCap(g, t[0], t[1], sc * 0.5, sc * 0.34, "#D8334A", 0);
    },
    glowshroom(g, o) {
      const z = hole.hd(o.x, o.y);
      for (const [dx, dy, s] of [[0, 0, 1], [0.18, 0.1, 0.7], [-0.15, 0.12, 0.6]]) {
        const b = P(o.x + dx, o.y + dy, z), t = P(o.x + dx, o.y + dy, z + 0.28 * s), sc = scaleAt(b[2]) * s;
        g.strokeStyle = "#CFE8E0"; g.lineWidth = sc * 0.05; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
        g.fillStyle = "#6FF0E0"; g.beginPath(); g.ellipse(t[0], t[1], sc * 0.13, sc * 0.08, 0, Math.PI, TAU); g.fill();
      }
      const c = P(o.x, o.y, z + 0.25); o.glowAt = [c[0], c[1], scaleAt(c[2]), "110,255,230"];
    },
    deadtree(g, o) {
      const z = hole.hd(o.x, o.y), s = o.s || 1, b = P(o.x, o.y, z), sc = scaleAt(b[2]) * s, at = (dx, h) => [b[0] + dx * sc, P(o.x, o.y, z + h * s)[1]];
      g.strokeStyle = "#1E1A20"; g.lineCap = "round";
      for (const [pts, w] of [[[[0, 0], [0.05, 0.8], [-0.05, 1.3]], 0.1], [[[0.03, 0.6], [0.35, 0.95], [0.45, 1.2]], 0.05], [[[0, 0.9], [-0.3, 1.1]], 0.04], [[[0.35, 0.95], [0.5, 0.9]], 0.03]]) {
        g.lineWidth = w * sc; g.beginPath(); pts.forEach(([dx, h], i) => { const q = at(dx, h); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke();
      }
    },
    torii(g, o) {
      const red = "#D2452F", dark = "#2A1A22";
      for (const x of [o.x0, o.x1]) {
        const z = hole.hd(x, o.y), b = P(x, o.y, z), t = P(x, o.y, z + 1.55), sc = scaleAt(b[2]);
        g.strokeStyle = dark; g.lineWidth = sc * 0.16; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0], P(x, o.y, z + 0.12)[1]); g.stroke();
        g.strokeStyle = red; g.lineWidth = sc * 0.12; g.beginPath(); g.moveTo(b[0], P(x, o.y, z + 0.12)[1]); g.lineTo(t[0], t[1]); g.stroke();
      }
      const zl = hole.hd(o.x0, o.y), zr = hole.hd(o.x1, o.y);
      const beam = (h, over, c, w) => {
        const a = P(o.x0 - over, o.y, zl + h), b = P(o.x1 + over, o.y, zr + h), sc = scaleAt(a[2]);
        g.strokeStyle = c; g.lineWidth = sc * w; g.lineCap = "butt"; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (h > 1.5 ? sc * 0.08 : 0), b[0], b[1]); g.stroke();
      };
      beam(1.25, 0.2, red, 0.1); beam(1.55, 0.42, red, 0.13); beam(1.64, 0.5, dark, 0.07);
      g.lineCap = "round";
    },
  };

  // The windmill: stone tower, thatched cap, turning sails that sweep the tunnel mouth.
  function drawWindmill(g) {
    const m = mill, { x0, x1, y0, y1 } = m, hW = 1.5, inset = 0.34;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    // fade the tower when the ball is inside it or hidden behind it
    const behind = ball.x > x0 - 0.8 && ball.x < x1 + 0.8 && ball.y > y0 - 2.6 && ball.y < y1 - 0.02;
    m.alpha = lerp(m.alpha ?? 1, behind || ball.hidden ? 0.45 : 1, 0.15);
    g.save(); g.globalAlpha = m.alpha;
    const face = (pts, n, rgb, f = 1) => {
      const nl = Math.hypot(...n); n = n.map((v) => v / nl);
      const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
      if ((cam.cx - c[0]) * n[0] + (cam.cy - c[1]) * n[1] + (cam.cz - c[2]) * n[2] <= 0) return false;
      const k = clamp(0.9 + 0.35 * (n[0] * lightV[0] + n[1] * lightV[1] + n[2] * lightV[2] - 0.3), 0.88, 1.12);
      fill3(g, pts, rgbStr(rgb, k * f), true); return true;
    };
    const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const normal = (a, b, c) => cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
    // tapered stone tower
    const B = [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
    const Tp = [[x0 + inset, y0 + inset, hW], [x1 - inset, y0 + inset, hW], [x1 - inset, y1 - inset, hW], [x0 + inset, y1 - inset, hW]];
    const wallC = hexRgb("#F6EFE2");
    for (let k = 0; k < 4; k++) {
      const q = [B[k], B[(k + 1) % 4], Tp[(k + 1) % 4], Tp[k]];
      const n = normal(q[0], q[1], q[2]);
      if (!face(q, n, wallC)) continue;
      // stone courses on the visible faces
      g.strokeStyle = "rgba(160,135,110,.28)"; g.lineWidth = 1;
      for (let h = 0.35; h < hW; h += 0.35) {
        const t = h / hW, p1 = [lerp(q[0][0], q[3][0], t), lerp(q[0][1], q[3][1], t), h], p2 = [lerp(q[1][0], q[2][0], t), lerp(q[1][1], q[2][1], t), h];
        const s1 = P(...p1), s2 = P(...p2); g.beginPath(); g.moveTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.stroke();
      }
    }
    const frontY = (z) => y1 - inset * (z / hW);
    const arch = (cx, w, h, zb, c, dy = 0.005) => {
      const pts = [[cx + w, frontY(zb) + dy, zb]];
      for (let k = 0; k <= 12; k++) { const a = Math.PI * (k / 12), z = zb + h + Math.sin(a) * w * 0.9; pts.push([cx + Math.cos(a) * w, frontY(z) + dy, z]); }
      pts.push([cx - w, frontY(zb) + dy, zb]);
      fill3(g, pts, c);
    };
    arch(mx, 0.52, 0.14, 0, "#6B4630");
    arch(mx, 0.43, 0.1, 0, "#1B120C", 0.01);
    arch(mx, 0.13, 0.08, 0.72, "#F0C46A", 0.01);
    arch(mx, 0.095, 0.06, 0.745, "#3E5A78", 0.015);
    // gabled cap
    const o = 0.14, cz = hW + 0.5, e = [[x0 + inset - o, y0 + inset - o], [x1 - inset + o, y0 + inset - o], [x1 - inset + o, y1 - inset + o], [x0 + inset - o, y1 - inset + o]];
    const rA = [e[0][0], my, cz], rB = [e[1][0], my, cz];
    const roof = hexRgb("#B8683F");
    const back = [[e[0][0], e[0][1], hW], [e[1][0], e[1][1], hW], rB, rA];
    const front = [[e[3][0], e[3][1], hW], rA, rB, [e[2][0], e[2][1], hW]];
    face(back, normal(back[0], back[1], back[2]), roof);
    face([[e[0][0], e[0][1], hW], rA, [e[3][0], e[3][1], hW]], [-1, 0, 0], roof, 0.85);
    face([[e[1][0], e[1][1], hW], [e[2][0], e[2][1], hW], rB], [1, 0, 0], roof, 0.85);
    const fn = normal(front[0], front[1], front[2]);
    face(front, fn[2] < 0 ? fn.map((v) => -v) : fn, roof);
    // thatch lines on the front slope
    g.strokeStyle = "rgba(60,30,15,.25)"; g.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const t = k / 6, a = P(lerp(e[3][0], rA[0], t), lerp(e[3][1], my, t), lerp(hW, cz, t)), b = P(lerp(e[2][0], rB[0], t), lerp(e[2][1], my, t), lerp(hW, cz, t)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    // axle and sails
    const hub = [mx, y1 + 0.12, m.hub], ax0 = P(mx, frontY(m.hub), m.hub), ax1 = P(...hub);
    g.strokeStyle = "#4A3222"; g.lineWidth = scaleAt(ax1[2]) * 0.09; g.beginPath(); g.moveTo(ax0[0], ax0[1]); g.lineTo(ax1[0], ax1[1]); g.stroke();
    for (let k = 0; k < 4; k++) {
      const ph = m.angle + (k * Math.PI) / 2, dx = Math.sin(ph), dz = -Math.cos(ph);
      const at = (s, w) => [hub[0] + dx * s + dz * w, hub[1], hub[2] + dz * s - dx * w];
      fill3(g, [at(0.3, 0.03), at(m.blade, 0.03), at(m.blade, 0.27), at(0.3, 0.27)], "rgba(255,249,238,.96)");
      g.strokeStyle = "rgba(120,80,50,.55)"; g.lineWidth = 1;
      for (let q = 1; q < 6; q++) { const s = lerp(0.3, m.blade, q / 6), p1 = P(...at(s, 0.03)), p2 = P(...at(s, 0.27)); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); }
      const r0 = P(...at(0, 0)), r1 = P(...at(m.blade + 0.05, 0));
      g.strokeStyle = "#6B4A33"; g.lineWidth = scaleAt(r0[2]) * 0.05; g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
    }
    blob(g, ax1[0], ax1[1], scaleAt(ax1[2]) * 0.1, "#4A3222"); blob(g, ax1[0] - 1, ax1[1] - 1, scaleAt(ax1[2]) * 0.045, "#9A7A55");
    g.restore();
  }
  function drawDecals(g) {
    for (const b of boosts) {
      const z = (x, y) => hole.hp(x, y) + 0.006;
      const q = (x, y) => [x, y, z(x, y)];
      fill3(g, [q(b.x, b.y), q(b.x + b.w, b.y), q(b.x + b.w, b.y + b.h), q(b.x, b.y + b.h)], "rgba(255,160,40,.42)");
      const L = Math.abs(b.dx) ? b.w : b.h, cx = b.x + b.w / 2, cy = b.y + b.h / 2, px = -b.dy, py = b.dx, half = (Math.abs(b.dx) ? b.h : b.w) * 0.32;
      for (let k = 0; k < 4; k++) {
        const u = (((k / 4 + clock * 0.9) % 1) - 0.5) * (L - 0.5), ax = cx + b.dx * u, ay = cy + b.dy * u, a = Math.sin(((k / 4 + clock * 0.9) % 1) * Math.PI);
        path3(g, [q(ax + b.dx * 0.18, ay + b.dy * 0.18), q(ax - b.dx * 0.1 + px * half, ay - b.dy * 0.1 + py * half), q(ax - b.dx * 0.26 + px * half, ay - b.dy * 0.26 + py * half), q(ax + b.dx * 0.02, ay + b.dy * 0.02), q(ax - b.dx * 0.26 - px * half, ay - b.dy * 0.26 - py * half), q(ax - b.dx * 0.1 - px * half, ay - b.dy * 0.1 - py * half)]);
        g.fillStyle = `rgba(255,248,220,${0.85 * a})`; g.fill();
      }
    }
    for (const w of warps) {
      const za = hole.hp(w.ax, w.ay) + 0.005, zb = hole.hp(w.bx, w.by) + 0.005, rgb = hexRgb(w.c);
      fill3(g, circle3(w.ax, w.ay, 0.42, () => za, 22), "#6B4A2E");
      fill3(g, circle3(w.ax, w.ay, 0.34, () => za + 0.002, 22), "#8C6A48");
      fill3(g, circle3(w.ax, w.ay, 0.28, () => za + 0.004, 22), "#120C08");
      for (let k = 0; k < 5; k++) {
        const a = clock * 3 + (k / 5) * TAU, r = 0.08 + 0.12 * ((k * 0.37 + clock * 0.6) % 1), p = P(w.ax + Math.cos(a) * r, w.ay + Math.sin(a) * r, za);
        g.fillStyle = rgbStr(rgb, 1, 0.9); g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, scaleAt(p[2]) * 0.03), 0, TAU); g.fill();
      }
      const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
      fill3(g, circle3(w.bx, w.by, 0.42, () => zb, 22), "#6B4A2E");
      fill3(g, circle3(w.bx, w.by, 0.34, () => zb + 0.002, 22), rgbStr(rgb, 0.55 + pulse * 0.2));
      fill3(g, circle3(w.bx, w.by, 0.22, () => zb + 0.004, 22), rgbStr(rgb, 1, 0.9));
    }
  }
  function drawSlider(g, sl) {
    const z = hole.hp(sl.x, sl.y), x0 = sl.x - sl.w / 2, x1 = sl.x + sl.w / 2, y0 = sl.y - sl.d / 2, y1 = sl.y + sl.d / 2;
    fill3(g, [[x0 + 0.1, y0 + 0.08, z + 0.004], [x1 + 0.12, y0 + 0.08, z + 0.004], [x1 + 0.12, y1 + 0.12, z + 0.004], [x0 + 0.1, y1 + 0.12, z + 0.004]], "rgba(0,0,0,.2)");
    box3(g, x0, y0, x1, y1, z + 0.08, z + 0.2, hexRgb("#8C5A34"), hexRgb("#A8703F"));
    box3(g, x0 + 0.05, y0 + 0.04, x1 - 0.05, y1 - 0.04, z + 0.2, z + 0.52, hexRgb("#E0B04E"), hexRgb("#F2CE6E"));
    g.strokeStyle = "rgba(150,100,30,.5)"; g.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const x = lerp(x0 + 0.05, x1 - 0.05, k / 6), a = P(x, y0 + 0.05, z + 0.52), b = P(x + 0.05, y1 - 0.05, z + 0.52); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (const wx of [x0 + 0.22, x1 - 0.22]) { const c = P(wx, y1 + 0.02, z + 0.12), R = scaleAt(c[2]) * 0.13; blob(g, c[0], c[1], R, "#3A2A20"); blob(g, c[0], c[1], R * 0.45, "#8C6A48"); }
  }
  function drawDrawbridge(g) {
    const d = drawbridge, a = d.a, L = d.y1 - d.y0, z0 = hole.hp((d.x0 + d.x1) / 2, d.y0) + 0.03;
    const ca = Math.cos(a), sa = Math.sin(a), xa = d.x0 + 0.03, xb = d.x1 - 0.03, t = 0.1;
    const end = (s, off = 0) => [d.y0 + s * ca + sa * off, z0 + s * sa - ca * off];
    const [ey, ez] = end(L), [by, bz] = end(L, t), [hy, hz] = end(0, t);
    const top = [[xa, d.y0, z0], [xb, d.y0, z0], [xb, ey, ez], [xa, ey, ez]];
    if (!face3(g, top, [0, -sa, ca], hexRgb("#B98452"))) face3(g, [[xa, hy, hz], [xb, hy, hz], [xb, by, bz], [xa, by, bz]], [0, sa, -ca], hexRgb("#7A5230"));
    else {
      g.strokeStyle = "rgba(90,55,25,.55)"; g.lineWidth = 1;
      for (let k = 1; k < 8; k++) { const [yy, zz] = end((L * k) / 8), p1 = P(xa, yy, zz), p2 = P(xb, yy, zz); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); }
    }
    face3(g, [[xa, ey, ez], [xb, ey, ez], [xb, by, bz], [xa, by, bz]], [0, ca, sa], hexRgb("#8C5E36"));
    g.strokeStyle = "#2E2A2A"; g.lineWidth = 1.5;
    for (const x of [xa + 0.05, xb - 0.05]) { const p1 = P(x, d.y0 - 0.02, z0 + 1.0), p2 = P(x, ey, ez); g.setLineDash([2, 2]); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); g.setLineDash([]); }
  }
  // The castle gatehouse: a crenellated wall with an archway, drawn over its tunnel like the windmill.
  function drawGatehouse(g) {
    const m = mill, { x0, x1, y0, y1 } = m, Hg = 1.1, stone = hexRgb("#D4CEC2");
    const behind = ball.x > x0 - 0.8 && ball.x < x1 + 0.8 && ball.y > y0 - 2 && ball.y < y1 - 0.02;
    m.alpha = lerp(m.alpha ?? 1, behind || ball.hidden ? 0.45 : 1, 0.15);
    g.save(); g.globalAlpha = m.alpha;
    box3(g, x0, y0, x1, y1, 0, Hg, stone, hexRgb("#E2DDD3"));
    g.strokeStyle = "rgba(130,120,105,.3)"; g.lineWidth = 1;
    for (let h = 0.28; h < Hg; h += 0.28) { const a = P(x0, y1, h), b = P(x1, y1, h); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.52) box3(g, x, y1 - 0.25, x + 0.3, y1, Hg, Hg + 0.24, stone, hexRgb("#E2DDD3"));
    const tx = (x0 + x1) / 2, arch = [[tx + 0.46, y1 + 0.005, 0]];
    for (let k = 0; k <= 12; k++) { const a = Math.PI * (k / 12); arch.push([tx + Math.cos(a) * 0.46, y1 + 0.005, 0.5 + Math.sin(a) * 0.4]); }
    arch.push([tx - 0.46, y1 + 0.005, 0]);
    fill3(g, arch, "#1B1512");
    g.strokeStyle = "rgba(60,50,40,.7)"; g.lineWidth = 1;
    for (let k = 1; k < 5; k++) { const x = tx - 0.46 + k * 0.184, a = P(x, y1 + 0.006, 0.9 - Math.abs(k - 2.5) * 0.06), b = P(x, y1 + 0.006, 0.62); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (const bx of [tx - 1.1, tx + 1.1]) {
      const pts = [[bx - 0.2, y1 + 0.01, Hg - 0.05], [bx + 0.2, y1 + 0.01, Hg - 0.05], [bx + 0.2, y1 + 0.01, 0.35], [bx, y1 + 0.01, 0.22], [bx - 0.2, y1 + 0.01, 0.35]];
      fill3(g, pts, "#C8453A"); const c = P(bx, y1 + 0.02, 0.7); blob(g, c[0], c[1], scaleAt(c[2]) * 0.07, "#FFD24A");
    }
    g.restore();
  }
  function drawSpinner(g) {
    const s = spinner, z = hole.hp(s.x, s.y);
    const dx = Math.cos(s.angle) * s.r, dy = Math.sin(s.angle) * s.r;
    const a = P(s.x - dx, s.y - dy, z + 0.17), b = P(s.x + dx, s.y + dy, z + 0.17), sc = scaleAt(P(s.x, s.y, z)[2]);
    fill3(g, circle3(s.x + 0.05, s.y + 0.06, 0.2, () => z + 0.005, 12), "rgba(0,0,0,.2)");
    g.lineCap = "round";
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = sc * 0.12; g.beginPath();
    const sa = P(s.x - dx + 0.06, s.y - dy + 0.06, z), sb = P(s.x + dx + 0.06, s.y + dy + 0.06, z); g.moveTo(sa[0], sa[1]); g.lineTo(sb[0], sb[1]); g.stroke();
    g.strokeStyle = "#6E9B3A"; g.lineWidth = sc * 0.13; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = "#A9CF63"; g.lineWidth = sc * 0.05; g.beginPath(); g.moveTo(a[0], a[1] - sc * 0.03); g.lineTo(b[0], b[1] - sc * 0.03); g.stroke();
    g.strokeStyle = "#4E7429"; g.lineWidth = sc * 0.13;
    for (let k = -3; k <= 3; k++) {
      if (!k) continue;
      const t = k / 3.6, n = P(s.x + dx * t, s.y + dy * t, z + 0.17);
      g.beginPath(); g.moveTo(n[0] - 0.01, n[1]); g.lineTo(n[0] + 0.01, n[1]); g.lineWidth = sc * 0.14; g.stroke();
    }
    const top = P(s.x, s.y, z + 0.3), bot = P(s.x, s.y, z);
    g.fillStyle = "#6F6880"; g.fillRect(bot[0] - sc * 0.13, top[1], sc * 0.26, bot[1] - top[1]);
    g.fillStyle = "#9C95AC"; g.beginPath(); g.ellipse(top[0], top[1], sc * 0.13, sc * 0.07, 0, 0, TAU); g.fill();
  }
  function drawSnowman(g, x, y, z, r) {
    fill3(g, circle3(x + 0.08, y + 0.06, r * 1.05, () => z + 0.005, 16), "rgba(40,60,90,.2)");
    const ball = (h, rr) => { const c = P(x, y, z + h), R = scaleAt(c[2]) * rr; const grd = g.createRadialGradient(c[0] - R * 0.35, c[1] - R * 0.35, R * 0.1, c[0], c[1], R); grd.addColorStop(0, "#FFFFFF"); grd.addColorStop(1, "#C9D8EA"); g.fillStyle = grd; g.beginPath(); g.arc(c[0], c[1], R, 0, TAU); g.fill(); return [c, R]; };
    ball(r * 0.9, r); const [m, mr] = ball(r * 2.2, r * 0.72);
    g.fillStyle = "#D8453A"; g.fillRect(m[0] - mr * 0.8, m[1] - mr * 0.95, mr * 1.6, mr * 0.28);
    const [h, hr] = ball(r * 3.25, r * 0.52);
    blob(g, h[0] - hr * 0.32, h[1] - hr * 0.15, Math.max(1, hr * 0.12), "#222"); blob(g, h[0] + hr * 0.32, h[1] - hr * 0.15, Math.max(1, hr * 0.12), "#222");
    g.fillStyle = "#FF8A2A"; g.beginPath(); g.moveTo(h[0], h[1] + hr * 0.02); g.lineTo(h[0] + hr * 0.7, h[1] + hr * 0.18); g.lineTo(h[0], h[1] + hr * 0.26); g.closePath(); g.fill();
    for (const q of [-0.3, 0.3]) blob(g, m[0], m[1] + mr * q * 0.9, Math.max(1, mr * 0.09), "#333");
  }
  function drawPumpkin(g, x, y, z, r) {
    const c = P(x, y, z + r * 0.75), sc = scaleAt(c[2]), rx = sc * r, ry = rx * 0.8;
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(c[0] + rx * 0.15, c[1] + ry * 0.8, rx * 1.1, ry * 0.4, 0, 0, TAU); g.fill();
    for (const [dx, w, col] of [[-0.55, 0.55, "#D8651C"], [0.55, 0.55, "#D8651C"], [-0.25, 0.6, "#F07F24"], [0.25, 0.6, "#F07F24"], [0, 0.55, "#FF9A3A"]]) { g.fillStyle = col; g.beginPath(); g.ellipse(c[0] + dx * rx, c[1], rx * w, ry, 0, 0, TAU); g.fill(); }
    g.strokeStyle = "#4E6B2A"; g.lineWidth = Math.max(1.5, rx * 0.16); g.lineCap = "round"; g.beginPath(); g.moveTo(c[0], c[1] - ry * 0.85); g.lineTo(c[0] + rx * 0.12, c[1] - ry * 1.3); g.stroke();
  }
  function drawCap(g, x, y, rx, ry, col, lit) {
    g.fillStyle = shade(col, 1 + lit * 0.4); g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, TAU); g.ellipse(x, y, rx, ry * 0.25, 0, 0, Math.PI); g.fill();
    g.fillStyle = "rgba(255,255,255,.9)";
    for (const [dx, dy, r] of [[-0.45, -0.35, 0.13], [0.1, -0.7, 0.12], [0.5, -0.3, 0.1], [-0.05, -0.25, 0.08]]) { g.beginPath(); g.ellipse(x + dx * rx, y + dy * ry, rx * r, rx * r * 0.8, 0, 0, TAU); g.fill(); }
  }
  function drawBumper(g, bm) {
    const z = hole.hp(bm.x, bm.y), zt = z + 0.3;
    if (bm.style === "snowman") return drawSnowman(g, bm.x, bm.y, z, bm.r);
    if (bm.style === "pumpkin") return drawPumpkin(g, bm.x, bm.y, z, bm.r);
    if (bm.style === "fountain") {
      fill3(g, circle3(bm.x + 0.08, bm.y + 0.06, bm.r + 0.04, () => z + 0.005, 20), "rgba(0,0,0,.2)");
      const c = cyl(g, bm.x, bm.y, z, z + 0.26, bm.r, "#CFC8BC", "#E4DED4");
      fill3(g, circle3(bm.x, bm.y, bm.r * 0.82, () => z + 0.24, 20), "#5BA7DD");
      cyl(g, bm.x, bm.y, z + 0.24, z + 0.62, 0.07, "#CFC8BC");
      const top = P(bm.x, bm.y, z + 0.68);
      g.strokeStyle = "rgba(220,240,255,.85)"; g.lineWidth = Math.max(1, c.sc * 0.025);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + time * 0.4, ex = bm.x + Math.cos(a) * bm.r * 0.6, ey = bm.y + Math.sin(a) * bm.r * 0.6, e = P(ex, ey, z + 0.26);
        const m = P((bm.x + ex) / 2, (bm.y + ey) / 2, z + 0.85);
        g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(m[0], m[1], e[0], e[1]); g.stroke();
      }
      return;
    }
    if (bm.style === "mushroom") {
      fill3(g, circle3(bm.x + 0.08, bm.y + 0.06, bm.r + 0.04, (x, y) => hole.hp(x, y) + 0.005, 18), "rgba(0,0,0,.22)");
      const b = P(bm.x, bm.y, z), t = P(bm.x, bm.y, z + 0.3), sc = scaleAt(b[2]);
      g.fillStyle = "#EDE3D2"; g.fillRect(b[0] - sc * 0.08, t[1], sc * 0.16, b[1] - t[1]);
      drawCap(g, t[0], t[1], sc * (bm.r + 0.08), sc * (bm.r + 0.08) * 0.62, "#8A5CF5", bm.glow);
      bm.glowAt = [t[0], t[1], sc, "190,150,255"];
      return;
    }
    fill3(g, circle3(bm.x + 0.08, bm.y + 0.06, bm.r + 0.04, (x, y) => hole.hp(x, y) + 0.005, 18), "rgba(0,0,0,.22)");
    const b = P(bm.x, bm.y, z), t = P(bm.x, bm.y, zt), sc = scaleAt(b[2]), rx = sc * bm.r, ry = rx * 0.5;
    g.fillStyle = "#57506A"; g.fillRect(b[0] - rx, t[1], rx * 2, b[1] - t[1]);
    g.beginPath(); g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); g.fill();
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(b[0] - rx * 0.6, t[1], rx * 0.3, b[1] - t[1]);
    const glow = 0.55 + bm.glow * 0.45 + Math.sin(time * 2 + bm.x) * 0.05;
    g.fillStyle = `rgba(255,${210 + bm.glow * 40 | 0},${140 + bm.glow * 90 | 0},${glow})`;
    g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,240,.8)"; g.beginPath(); g.ellipse(t[0], t[1], rx * 0.45, ry * 0.45, 0, 0, TAU); g.fill();
    bm.glowAt = [t[0], t[1], sc];
  }
  function drawFlag(g) {
    const z = hole.hp(cup[0], cup[1]);
    const lift = clamp(1 - (Math.hypot(ball.x - cup[0], ball.y - cup[1]) - 0.6) / 1.2, 0, 1) * (state === "roll" || state === "sunk" ? 1 : 0);
    const zb = z + lift * 0.5, b = P(cup[0], cup[1], zb), t = P(cup[0], cup[1], zb + 1.55), sc = scaleAt(b[2]);
    g.save(); g.globalAlpha = 1 - lift * 0.5;
    g.strokeStyle = "rgba(0,0,0,.15)"; g.lineWidth = sc * 0.05; g.beginPath();
    const sh = P(cup[0] + 0.9, cup[1] + 0.3, z); g.moveTo(b[0], b[1]); g.lineTo(sh[0], sh[1]); g.stroke();
    g.strokeStyle = "#FAFAF5"; g.lineWidth = sc * 0.045; g.lineCap = "round"; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
    const cloth = T.night ? "#FFD06A" : "#E8423B";
    g.fillStyle = cloth; g.beginPath(); g.moveTo(t[0], t[1]);
    const L = sc * 0.55, Hh = sc * 0.32;
    for (let k = 0; k <= 8; k++) { const u = k / 8; g.lineTo(t[0] + u * L, t[1] + Hh * 0.5 * u + Math.sin(time * 5 - u * 4) * sc * 0.04 * u); }
    g.lineTo(t[0], t[1] + Hh); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.font = `800 ${Math.max(8, sc * 0.16)}px Fredoka, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(HI + 1), t[0] + L * 0.3, t[1] + Hh * 0.45 + Math.sin(time * 5 - 1.2) * sc * 0.012);
    g.restore();
  }
  function drawBall(g) {
    if (ball.sink >= 1) return;
    const p = partAt(ball.x, ball.y);
    let z = p ? surfZ(p, ball.x, ball.y) : 0;
    if (p && (p.surf === "bridge" || (p.surf === "drawbridge" && !bridgeUp()))) z = hole.hp(ball.x, ball.y) + 0.03;
    const r = BALL_R;
    // shadow
    if (!ball.sink) fill3(g, circle3(ball.x + 0.06, ball.y + 0.04, r * 1.05, () => z + 0.004, 14), "rgba(0,0,0,.28)");
    const zc = z + r - ball.sink * 0.45;
    const c = P(ball.x, ball.y, zc), R = scaleAt(c[2]) * r;
    g.save();
    if (ball.sink) { path3(g, circle3(cup[0], cup[1], CUP_R, (x, y) => hole.hp(x, y))); g.clip(); }
    if (ball.drown) g.globalAlpha = 1 - ball.drown;
    const grd = g.createRadialGradient(c[0] - R * 0.35, c[1] - R * 0.4, R * 0.1, c[0], c[1], R);
    grd.addColorStop(0, "#FFFFFF"); grd.addColorStop(0.6, "#F1F3F6"); grd.addColorStop(1, "#B9C0CC");
    g.fillStyle = grd; g.beginPath(); g.arc(c[0], c[1], R, 0, TAU); g.fill();
    g.restore();
    ball.screen = [c[0], c[1], R];
  }

  // ---------- the per-frame scene ----------
  function drawScene(g) {
    g.drawImage(groundCv, 0, 0, W, H);
    drawWater(g);
    drawDecals(g);
    const list = [];
    for (const w of walls) if (!w.hidden) {
      const mx = (w.a[0] + w.b[0] + w.oa[0] + w.ob[0]) / 4, my = (w.a[1] + w.b[1] + w.oa[1] + w.ob[1]) / 4;
      list.push({ d: P(mx, my, (w.za[1] + w.zb[1]) / 2)[2], w });
    }
    const objDepth = (x, y) => P(x, y, 0.3)[2];
    for (const o of objects) {
      const x = o.x ?? (o.x0 + o.x1) / 2, y = o.y ?? o.y0;
      list.push({ d: objDepth(x, y), o });
    }
    if (mill) list.push({ d: objDepth((mill.x0 + mill.x1) / 2, mill.y1 - 0.1), mill: true });
    if (spinner) list.push({ d: objDepth(spinner.x, spinner.y), spin: true });
    for (const bm of bumpers) list.push({ d: objDepth(bm.x, bm.y), bm });
    for (const sl of sliders) list.push({ d: objDepth(sl.x, sl.y), sl });
    if (drawbridge) list.push({ d: objDepth((drawbridge.x0 + drawbridge.x1) / 2, (drawbridge.y0 + drawbridge.y1) / 2) + 0.4, db: true });
    list.push({ d: objDepth(cup[0], cup[1]) + 0.001, flag: true });
    // the ball: normally by depth, but always in front of rails behind it and behind rails in front of it
    let bd = P(ball.x, ball.y, 0.1)[2];
    const inTunnel = partAt(ball.x, ball.y)?.tile.ch === "t";
    ball.hidden = inTunnel;
    for (const it of list) {
      if (!it.w) continue;
      const w = it.w;
      const ex = ball.x - w.a[0], ey = ball.y - w.a[1];
      const along = (ex * (w.b[0] - w.a[0]) + ey * (w.b[1] - w.a[1])) / w.len, dist = -(ex * w.nx + ey * w.ny);
      if (dist < -0.05 || dist > 1.6 || along < -0.4 || along > w.len + 0.4) continue;
      if (w.front) bd = Math.max(bd, it.d + 1e-4); else bd = Math.min(bd, it.d - 1e-4);
    }
    if (inTunnel) bd = list.find((i) => i.mill).d + 1e-3;
    list.push({ d: bd, ball: true });
    list.sort((a, b) => b.d - a.d);
    for (const it of list) {
      if (it.w) drawWall(g, it.w);
      else if (it.o) DRAW[it.o.type](g, it.o);
      else if (it.mill) mill.kind === "gate" ? drawGatehouse(g) : drawWindmill(g);
      else if (it.sl) drawSlider(g, it.sl);
      else if (it.db) drawDrawbridge(g);
      else if (it.spin) drawSpinner(g);
      else if (it.bm) drawBumper(g, it.bm);
      else if (it.flag) drawFlag(g);
      else if (it.ball) { drawBall(g); drawAim(g); }
    }
    drawGlows(g);
  }
  function drawWater(g) {
    for (const p of waterParts) {
      if (p.surf === "bridge") continue;
      const [i, j] = [p.tile.i, p.tile.j];
      for (let k = 0; k < 2; k++) {
        const ph = time * 0.9 + hash(i, j) * 6 + k * 3.1;
        const x = i + 0.25 + ((hash(i + k, j) + time * 0.05) % 1) * 0.5, y = j + 0.3 + k * 0.4 + Math.sin(ph) * 0.06;
        const z = heightAt(p, x, y) - WATER_DROP + 0.005, s = P(x, y, z), sc = scaleAt(s[2]);
        const a = 0.18 + 0.18 * Math.sin(ph * 1.3);
        g.strokeStyle = T.lava ? `rgba(255,236,140,${a * 2})` : `rgba(255,255,255,${a})`; g.lineWidth = Math.max(1, sc * (T.lava ? 0.04 : 0.025));
        g.beginPath(); g.moveTo(s[0] - sc * 0.14, s[1]); g.quadraticCurveTo(s[0], s[1] - sc * 0.03, s[0] + sc * 0.14, s[1]); g.stroke();
      }
    }
    g.setLineDash([6, 9]); g.lineDashOffset = -time * 60;
    for (const f of falls) {
      for (let k = 1; k < 4; k++) {
        const x = lerp(f.a[0], f.b[0], k / 4), y = lerp(f.a[1], f.b[1], k / 4);
        const t = P(x, y, hole.hd(x, y) - WATER_DROP), b = P(x, y, -1.1);
        g.strokeStyle = T.lava ? "rgba(255,230,140,.7)" : "rgba(255,255,255,.55)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(t[0], t[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    }
    g.setLineDash([]);
  }
  function drawGlows(g) {
    if (!T.night) {
      for (const o of objects) if (o.type === "torch") {
        const t = P(o.x, o.y, hole.hd(o.x, o.y) + 0.9), sc = scaleAt(t[2]);
        glow(g, t[0], t[1], sc * 0.5, "255,190,90", 0.35);
      }
      return;
    }
    g.save(); g.globalCompositeOperation = "lighter";
    if (T.lava) for (const p of waterParts) {
      const c = P(p.cx, p.cy, heightAt(p, p.cx, p.cy)), sc = scaleAt(c[2]);
      glow(g, c[0], c[1], sc * 1.1, "255,110,30", 0.32 + Math.sin(time * 2.3 + p.cx * 3) * 0.06);
    }
    for (const w of warps) for (const [x, y] of [[w.ax, w.ay], [w.bx, w.by]]) { const c = P(x, y, hole.hp(x, y)), [r, gg, b] = hexRgb(w.c); glow(g, c[0], c[1], scaleAt(c[2]) * 0.8, `${r},${gg},${b}`, 0.3 + Math.sin(clock * 4) * 0.08); }
    for (const o of objects) if (o.glowAt) glow(g, o.glowAt[0], o.glowAt[1], o.glowAt[2] * 1.4, o.glowAt[3] || "255,190,110", 0.45 + Math.sin(time * 3 + o.x) * 0.05);
    for (const bm of bumpers) if (bm.glowAt) glow(g, bm.glowAt[0], bm.glowAt[1], bm.glowAt[2] * (0.9 + bm.glow * 0.9), bm.glowAt[3] || "255,220,160", 0.35 + bm.glow * 0.5);
    if (ball.screen && ball.sink < 1 && !ball.hidden) glow(g, ball.screen[0], ball.screen[1], ball.screen[2] * 3.5, "220,235,255", 0.25);
    g.restore();
  }
  function glow(g, x, y, r, rgb, a) {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${rgb},${a})`); grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawAim(g) {
    if (state !== "aim" || ball.hidden) return;
    const z = hole.hp(ball.x, ball.y);
    if (!drag || drag.power < 0.02) {
      // gentle pulse so the ball is easy to find
      const c = P(ball.x, ball.y, z + 0.005), R = scaleAt(c[2]) * (0.3 + 0.08 * Math.sin(time * 4));
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2; g.beginPath(); g.ellipse(c[0], c[1], R, R * 0.6, 0, 0, TAU); g.stroke();
      return;
    }
    const { dx, dy, power } = drag;
    const col = power < 0.5 ? mixRgb([120, 230, 140], [255, 214, 80], power * 2) : mixRgb([255, 214, 80], [255, 90, 70], (power - 0.5) * 2);
    const len = 0.6 + power * 4.2;
    for (let s = 0.3; s < len; s += 0.28) {
      const x = ball.x + dx * s, y = ball.y + dy * s, p = partAt(x, y);
      const zz = (p ? heightAt(p, x, y) : z) + 0.02, c = P(x, y, zz), R = scaleAt(c[2]) * 0.055 * (1 - (s / len) * 0.4);
      g.fillStyle = rgbStr(col, 1, 0.95 - (s / len) * 0.5); g.beginPath(); g.arc(c[0], c[1], R, 0, TAU); g.fill();
    }
    const tipX = ball.x + dx * (len + 0.1), tipY = ball.y + dy * (len + 0.1), tz = hole.hp(ball.x, ball.y) + 0.02;
    const t = P(tipX, tipY, tz), l = P(tipX - dx * 0.35 + dy * 0.2, tipY - dy * 0.35 - dx * 0.2, tz), r = P(tipX - dx * 0.35 - dy * 0.2, tipY - dy * 0.35 + dx * 0.2, tz);
    g.fillStyle = rgbStr(col, 1, 0.8); g.beginPath(); g.moveTo(t[0], t[1]); g.lineTo(l[0], l[1]); g.lineTo(r[0], r[1]); g.closePath(); g.fill();
    // power ring around the ball
    const c = P(ball.x, ball.y, z + 0.01), R = scaleAt(c[2]) * 0.34;
    g.lineWidth = 4; g.lineCap = "round";
    g.strokeStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(c[0], c[1], R, R * 0.62, 0, 0, TAU); g.stroke();
    g.strokeStyle = rgbStr(col); g.beginPath(); g.ellipse(c[0], c[1], R, R * 0.62, 0, -Math.PI / 2, -Math.PI / 2 + TAU * power); g.stroke();
  }

  // ---------- critters: butterflies, jumping fish, fireflies ----------
  function makeCritters() {
    critters = [];
    const R = rng(HI * 7 + 3);
    if (hole.critters === "butterflies") for (let k = 0; k < 4; k++) critters.push({ x: 1 + R() * 9, y: 1 + R() * 14, ph: R() * 6, c: ["#FFD84D", "#FF8FB1", "#FFFFFF", "#9FD4FF"][k] });
    if (hole.critters === "fireflies") for (let k = 0; k < 22; k++) critters.push({ x: R() * gridW, y: R() * gridH, ph: R() * 6, z: 0.3 + R() * 1.2 });
    if (hole.critters === "snow") for (let k = 0; k < 70; k++) critters.push({ x: R(), y: R(), v: 0.03 + R() * 0.05, r: 0.8 + R() * 1.8, ph: R() * 6 });
    if (hole.critters === "leaves") for (let k = 0; k < 14; k++) critters.push({ x: R() * gridW, y: R() * gridH, z: R() * 3, ph: R() * 6, c: ["#E07A2E", "#D2452F", "#E8B03A"][k % 3] });
    if (hole.critters === "embers") for (let k = 0; k < 36; k++) critters.push({ z: -1, ph: R() * 6 });
    if (hole.critters === "tumbleweed") critters.push({ t: 1, x: -1 });
    if (hole.critters === "fish") critters.push({ t: 2 });
  }
  function drawCritters(g, dt) {
    if (hole.critters === "butterflies") {
      for (const b of critters) {
        b.ph += dt;
        const x = b.x + Math.sin(b.ph * 0.4) * 1.6, y = b.y + Math.cos(b.ph * 0.31) * 1.3, z = 0.6 + Math.sin(b.ph * 1.7) * 0.25;
        const s = P(x, y, z), sc = scaleAt(s[2]) * 0.1, f = Math.abs(Math.sin(b.ph * 14));
        g.fillStyle = b.c;
        g.beginPath(); g.ellipse(s[0] - sc * 0.5, s[1], sc * f, sc * 0.7, 0.4, 0, TAU); g.ellipse(s[0] + sc * 0.5, s[1], sc * f, sc * 0.7, -0.4, 0, TAU); g.fill();
      }
    } else if (hole.critters === "snow") {
      g.fillStyle = "rgba(255,255,255,.85)";
      for (const f of critters) {
        f.y += f.v * dt; f.ph += dt; if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
        g.beginPath(); g.arc(((f.x + Math.sin(f.ph * 0.8) * 0.02) % 1) * W, f.y * H, f.r, 0, TAU); g.fill();
      }
    } else if (hole.critters === "leaves") {
      for (const l of critters) {
        l.ph += dt; l.z -= dt * 0.35; l.x += Math.sin(l.ph * 1.3) * dt * 0.6 + dt * 0.25;
        if (l.z < hole.hd(l.x, l.y)) { l.z = 2.5 + Math.random(); l.x = Math.random() * gridW; l.y = Math.random() * gridH; }
        const s = P(l.x, l.y, l.z), sc = scaleAt(s[2]) * 0.07;
        g.save(); g.translate(s[0], s[1]); g.rotate(l.ph * 2); g.scale(1, Math.abs(Math.cos(l.ph * 3)) + 0.2);
        g.fillStyle = l.c; g.beginPath(); g.ellipse(0, 0, sc, sc * 0.5, 0, 0, TAU); g.fill(); g.restore();
      }
    } else if (hole.critters === "embers") {
      const lava = waterParts;
      g.save(); g.globalCompositeOperation = "lighter";
      for (const e of critters) {
        e.ph += dt;
        if (e.z < 0 || e.life <= 0) {
          const fromCrater = Math.random() < 0.4, p = lava[(Math.random() * lava.length) | 0];
          const [x, y] = fromCrater ? [cup[0] + (Math.random() - 0.5) * 1.6, cup[1] + (Math.random() - 0.5) * 1.6] : [p.cx, p.cy];
          Object.assign(e, { x, y, z: hole.hp(x, y) + 0.05, vz: 0.4 + Math.random() * 0.6, life: 2 + Math.random() * 2, max: 4 });
        }
        e.life -= dt; e.z += e.vz * dt; e.x += Math.sin(e.ph * 2) * dt * 0.2;
        const s = P(e.x, e.y, e.z), a = clamp(e.life / 2, 0, 1);
        g.fillStyle = `rgba(255,${150 + (e.ph * 40) % 80 | 0},60,${a})`; g.fillRect(s[0] - 1, s[1] - 1, 2.2, 2.2);
      }
      g.restore();
      // a slow plume of smoke from the crater
      for (let k = 0; k < 6; k++) {
        const u = (time * 0.12 + k / 6) % 1, s = P(cup[0] + Math.sin(k * 2 + time * 0.3) * 0.3 + u * 0.8, cup[1] - u * 0.6, hole.hp(cup[0], cup[1]) + 0.4 + u * 3.2), sc = scaleAt(s[2]);
        glow(g, s[0], s[1], sc * (0.35 + u * 0.9), "90,70,80", 0.3 * Math.sin(u * Math.PI));
      }
    } else if (hole.critters === "tumbleweed") {
      const tw = critters[0];
      tw.t -= dt;
      if (tw.t < 0 && tw.x < 0) { tw.x = -0.5; tw.y = [1.5, 6.9, 12][(Math.random() * 3) | 0] + 0.3; tw.t = 0; }
      if (tw.x >= -0.6) {
        tw.x += dt * 1.4; const z = hole.hd(tw.x, tw.y + 0.6) + 0.25 + Math.abs(Math.sin(tw.x * 3)) * 0.3;
        const s = P(tw.x, tw.y + 0.6, z), sc = scaleAt(s[2]) * 0.22;
        g.strokeStyle = "#A07A4A"; g.lineWidth = 1;
        for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(s[0], s[1], sc, sc * 0.8, tw.x * 2 + k, 0, TAU); g.stroke(); }
        if (tw.x > gridW + 0.6) { tw.x = -1; tw.t = 4 + Math.random() * 5; }
      }
    } else if (hole.critters === "fireflies") {
      g.save(); g.globalCompositeOperation = "lighter";
      for (const f of critters) {
        f.ph += dt;
        const x = f.x + Math.sin(f.ph * 0.5) * 0.8, y = f.y + Math.cos(f.ph * 0.37) * 0.8, s = P(x, y, f.z + Math.sin(f.ph) * 0.2);
        const a = Math.max(0, Math.sin(f.ph * 1.6)) * 0.9;
        glow(g, s[0], s[1], scaleAt(s[2]) * 0.18, hole.fireflyColor || "255,240,150", a * 0.5);
        g.fillStyle = `rgba(255,250,200,${a})`; g.fillRect(s[0] - 1, s[1] - 1, 2, 2);
      }
      g.restore();
    } else if (hole.critters === "fish") {
      const f = critters[0];
      f.t -= dt;
      if (f.t < 0 && !f.jump) { const w = waterParts.filter((p) => p.surf === "water"); const p = w[(Math.random() * w.length) | 0]; f.jump = { x: p.cx, y: p.cy, t: 0, dir: Math.random() < 0.5 ? -1 : 1 }; }
      if (f.jump) {
        const j = f.jump; j.t += dt / 0.9;
        const z = hole.hp(j.x, j.y) - WATER_DROP + Math.sin(j.t * Math.PI) * 0.7, x = j.x + (j.t - 0.5) * 0.9 * j.dir;
        const s = P(x, j.y, z), sc = scaleAt(s[2]);
        g.save(); g.translate(s[0], s[1]); g.rotate((j.t - 0.5) * 2.2 * j.dir); g.fillStyle = "#FF8A3D";
        g.beginPath(); g.ellipse(0, 0, sc * 0.16, sc * 0.06, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-sc * 0.14 * j.dir, 0); g.lineTo(-sc * 0.26 * j.dir, -sc * 0.07); g.lineTo(-sc * 0.26 * j.dir, sc * 0.07); g.fill(); g.restore();
        if (j.t > 1) { splashAt(x, j.y, 0.5); f.jump = null; f.t = 3 + Math.random() * 4; }
      }
    }
  }

  // ---------- particles ----------
  function splashAt(x, y, amt = 1) {
    const z = hole.hp(x, y) - WATER_DROP;
    for (let k = 0; k < 18 * amt; k++) {
      const a = Math.random() * TAU, v = 0.6 + Math.random() * 1.2;
      particles.push({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 2 + Math.random() * 2.5, life: 0.8, max: 0.8, c: T.lava ? (k % 2 ? "#FFB347" : "#FFE08A") : "#E8F8FF", s: 0.035 });
    }
    particles.push({ ring: true, x, y, z: z + 0.01, life: 0.9, max: 0.9 });
  }
  function sparkle(x, y, c) {
    const z = hole.hp(x, y);
    for (let k = 0; k < 16; k++) { const a = Math.random() * TAU, v = 0.4 + Math.random() * 1; particles.push({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 1.5 + Math.random() * 2, life: 0.7, max: 0.7, c, s: 0.03 }); }
  }
  function confetti() {
    const cols = ["#FF5A6E", "#FFD84D", "#4CC3FF", "#7BE07B", "#FFFFFF", "#C69CFF"];
    const z = hole.hp(cup[0], cup[1]);
    for (let k = 0; k < 90; k++) {
      const a = Math.random() * TAU, v = 0.5 + Math.random() * 2.2;
      particles.push({ x: cup[0], y: cup[1], z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 3.5 + Math.random() * 4, life: 2.4, max: 2.4, c: cols[k % cols.length], s: 0.06, conf: true, rot: Math.random() * 6 });
    }
  }
  function drawParticles(g, dt) {
    for (const p of particles) {
      p.life -= dt;
      if (p.ring) {
        const t = 1 - p.life / p.max;
        g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - t)})`; g.lineWidth = 2;
        path3(g, circle3(p.x, p.y, 0.1 + t * 0.6, () => p.z, 20)); g.stroke();
        continue;
      }
      p.vz -= (p.conf ? 5 : 9) * dt; if (p.conf) { p.vx *= 0.985; p.vy *= 0.985; p.vz = Math.max(p.vz, -1.2); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const s = P(p.x, p.y, p.z), sc = scaleAt(s[2]) * p.s, a = clamp(p.life / p.max * 2, 0, 1);
      g.fillStyle = rgbStr(hexRgb(p.c), 1, a);
      if (p.conf) { p.rot += dt * 8; g.save(); g.translate(s[0], s[1]); g.rotate(p.rot); g.fillRect(-sc, -sc * 0.5 * Math.abs(Math.cos(p.rot * 1.3)), sc * 2, sc * Math.abs(Math.cos(p.rot * 1.3))); g.restore(); }
      else { g.beginPath(); g.arc(s[0], s[1], Math.max(1, sc), 0, TAU); g.fill(); }
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ---------- physics ----------
  function grad(x, y) {
    const e = 0.02;
    return [(hole.hp(x + e, y) - hole.hp(x - e, y)) / (2 * e), (hole.hp(x, y + e) - hole.hp(x, y - e)) / (2 * e)];
  }
  function collideSeg(ax, ay, bx, by, rad, e, mvx = 0, mvy = 0, pad = 0) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / l2, 0, 1) : 0;
    const qx = ax + dx * t, qy = ay + dy * t;
    let nx = ball.x - qx, ny = ball.y - qy, d = Math.hypot(nx, ny);
    const R = rad + pad;
    if (d >= R) return 0;
    if (d < 1e-6) { nx = -dy; ny = dx; d = Math.hypot(nx, ny) || 1; }
    nx /= d; ny /= d;
    ball.x = qx + nx * R; ball.y = qy + ny * R;
    const rvx = ball.vx - mvx, rvy = ball.vy - mvy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;
    ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
    return -vn;
  }
  function collideCircle(cx, cy, r, e, kick) {
    let nx = ball.x - cx, ny = ball.y - cy; const d = Math.hypot(nx, ny), R = r + BALL_R;
    if (d >= R || d < 1e-6) return 0;
    nx /= d; ny /= d; ball.x = cx + nx * R; ball.y = cy + ny * R;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn >= 0) return 0;
    ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
    if (kick) { const out = ball.vx * nx + ball.vy * ny; if (out < kick) { ball.vx += nx * (kick - out); ball.vy += ny * (kick - out); } }
    return -vn;
  }
  function millBlades() {
    // where each sail slices through ball height, as a short moving segment in front of the tunnel
    const m = mill, out = [], zb = 0.15, yb = m.y1 + 0.12;
    for (let k = 0; k < 4; k++) {
      let ph = (m.angle + (k * Math.PI) / 2) % TAU; if (ph > Math.PI) ph -= TAU;
      const c = Math.cos(ph);
      if (c < 0.2) continue;
      const s = (m.hub - zb) / c;
      if (s > m.blade || s < 0.3) continue;
      const xc = (m.x0 + m.x1) / 2 + Math.sin(ph) * s, hw = 0.13 / c + 0.02;
      out.push({ ax: xc - hw, bx: xc + hw, y: yb, v: (m.speed * (m.hub - zb)) / (c * c) });
    }
    return out;
  }
  let bumpCool = 0;
  function physics(dt) {
    if (state !== "roll") return;
    const sp0 = Math.hypot(ball.vx, ball.vy);
    const n = clamp(Math.ceil((sp0 * dt) / 0.04), 2, 24), h = dt / n;
    let hit = 0, bumped = 0;
    for (let s = 0; s < n; s++) {
      const p = partAt(ball.x, ball.y);
      const surf = p ? SURF[p.surf === "drawbridge" ? "bridge" : p.surf] || SURF.green : SURF.green;
      // rolling friction, then gravity along the slope
      let sp = Math.hypot(ball.vx, ball.vy);
      const f = (surf.mu + surf.drag * sp) * h;
      if (sp > 0) { const k = sp > f ? 1 - f / sp : 0; ball.vx *= k; ball.vy *= k; }
      const [gx, gy] = grad(ball.x, ball.y);
      ball.vx -= GRAV * gx * h; ball.vy -= GRAV * gy * h;
      // the cup pulls in a ball that's close and slow
      const cdx = cup[0] - ball.x, cdy = cup[1] - ball.y, cd = Math.hypot(cdx, cdy);
      sp = Math.hypot(ball.vx, ball.vy);
      if (cd < CUP_R) {
        if (sp < CAPTURE_V) { sink(); return; }
        if (!ball.lip) { ball.lip = 1; ball.vx *= 0.72; ball.vy *= 0.72; const tw = (cdx * ball.vy - cdy * ball.vx) > 0 ? 0.25 : -0.25; const c = Math.cos(tw), si = Math.sin(tw); [ball.vx, ball.vy] = [ball.vx * c - ball.vy * si, ball.vx * si + ball.vy * c]; }
      } else if (cd > CUP_R + 0.1) ball.lip = 0;
      if (cd < CUP_R + 0.12 && sp < CAPTURE_V * 1.2) { ball.vx += (cdx / cd) * 7 * h; ball.vy += (cdy / cd) * 7 * h; }
      // speed arrows push the ball along
      let inBoost = false;
      for (const b of boosts) {
        if (ball.x < b.x || ball.x > b.x + b.w || ball.y < b.y || ball.y > b.y + b.h) continue;
        inBoost = true;
        if (ball.vx * b.dx + ball.vy * b.dy < 10) { ball.vx += b.dx * 32 * h; ball.vy += b.dy * 32 * h; }
      }
      if (inBoost && !ball.boosting) sfx.whoosh();
      ball.boosting = inBoost;
      // hollow stumps: in one, out the other
      for (const w of warps) {
        const wx = w.ax - ball.x, wy = w.ay - ball.y, wd = Math.hypot(wx, wy);
        if (wd < 0.27) {
          const l = Math.hypot(w.dx, w.dy), v = Math.max(2.4, Math.hypot(ball.vx, ball.vy) * 0.85);
          sparkle(w.ax, w.ay, w.c); ball.x = w.bx + (w.dx / l) * 0.35; ball.y = w.by + (w.dy / l) * 0.35;
          ball.vx = (w.dx / l) * v; ball.vy = (w.dy / l) * v; sparkle(w.bx, w.by, w.c); sfx.warp();
          break;
        } else if (wd < 0.55) { ball.vx += (wx / wd) * 6 * h; ball.vy += (wy / wd) * 6 * h; }
      }
      ball.x += ball.vx * h; ball.y += ball.vy * h;
      // moving obstacles
      for (const sl of sliders) {
        const x0 = sl.x - sl.w / 2, x1 = sl.x + sl.w / 2, y0 = sl.y - sl.d / 2, y1 = sl.y + sl.d / 2;
        for (const [ax, ay, bx, by] of [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]) hit = Math.max(hit, collideSeg(ax, ay, bx, by, BALL_R, 0.5, sl.vx, 0));
      }
      if (mill && mill.kind === "mill") for (const b of millBlades()) hit = Math.max(hit, collideSeg(b.ax, b.y, b.bx, b.y, BALL_R, 0.6, b.v, 0, 0.03));
      if (spinner) {
        const sn = spinner, dx = Math.cos(sn.angle) * sn.r, dy = Math.sin(sn.angle) * sn.r;
        const t = clamp(((ball.x - sn.x) * dx + (ball.y - sn.y) * dy) / (sn.r * sn.r), -1, 1);
        const qx = sn.x + dx * t, qy = sn.y + dy * t, w = sn.speed;
        hit = Math.max(hit, collideSeg(sn.x - dx, sn.y - dy, sn.x + dx, sn.y + dy, BALL_R, 0.55, -w * (qy - sn.y), w * (qx - sn.x), 0.06));
        hit = Math.max(hit, collideCircle(sn.x, sn.y, 0.14, 0.5));
      }
      for (const bm of bumpers) {
        if (bm.bouncy === false) { hit = Math.max(hit, collideCircle(bm.x, bm.y, bm.r, 0.55)); continue; }
        const v = collideCircle(bm.x, bm.y, bm.r, 0.9, 3.2); if (v) { bm.glow = 1; bumped = Math.max(bumped, v); }
      }
      for (const w of walls) hit = Math.max(hit, collideSeg(w.a[0], w.a[1], w.b[0], w.b[1], BALL_R, 0.72));
    }
    if (hit > 0.35) sfx.knock(hit);
    if (bumped && bumpCool <= 0) { sfx.ding(); bumpCool = 0.12; shake = 0.12; }
    // hazards
    const p = partAt(ball.x, ball.y);
    if (!p || !p.play) { toTee(false); return; }
    if (p.surf === "water" || (p.surf === "drawbridge" && bridgeUp())) { splash(); return; }
    const sp = Math.hypot(ball.vx, ball.vy), [gx, gy] = grad(ball.x, ball.y);
    const surf = SURF[p.surf] || SURF.green;
    if (sp < 0.07 && GRAV * Math.hypot(gx, gy) < surf.mu * 0.95) { ball.vx = ball.vy = 0; rest(); }
    if (stateT > 25) { ball.vx = ball.vy = 0; rest(); }
  }

  const bridgeUp = () => drawbridge && drawbridge.a > 0.3;
  // everything that moves on its own runs off one clock, so a shot can be replayed exactly
  function tick(dt) {
    clock += dt;
    if (mill && mill.speed) mill.angle += mill.speed * dt;
    if (spinner) spinner.angle += spinner.speed * dt;
    if (drawbridge) {
      const ph = (clock % drawbridge.period) / drawbridge.period;
      const u = ph < 0.55 ? 0 : ph < 0.68 ? (ph - 0.55) / 0.13 : ph < 0.87 ? 1 : 1 - (ph - 0.87) / 0.13;
      drawbridge.a = u * u * (3 - 2 * u) * 1.3;
    }
    for (const sl of sliders) { const x = sl.cx + sl.amp * Math.sin((clock * TAU) / sl.period + (sl.phase || 0)); sl.vx = dt ? (x - sl.x) / dt : 0; sl.x = x; }
  }

  // ---------- flow ----------
  function setState(s) { state = s; stateT = 0; }
  function shoot(dx, dy, power) {
    lastRest = [ball.x, ball.y];
    const v = MAX_V * Math.pow(power, 1.15);
    ball.vx = dx * v; ball.vy = dy * v; ball.lip = 0;
    strokes++; updateHud();
    sfx.putt(power);
    setState("roll");
    $("#hint").classList.add("gone");
  }
  function rest() {
    setState("aim");
    if (strokes >= MAX_STROKES) { setState("sunk"); ball.sink = 1; showCard(true); }
  }
  function splash() {
    splashAt(ball.x, ball.y); T.lava ? sfx.sizzle() : sfx.splash();
    ball.vx = ball.vy = 0; ball.drown = 0.01;
    strokes++; updateHud(); toast(T.lava ? "Sizzle! +1" : "Splash! +1");
    setState("splash");
  }
  function toTee(penalty) { ball.x = lastRest[0]; ball.y = lastRest[1]; ball.vx = ball.vy = 0; ball.drown = 0; if (penalty) strokes++; setState("aim"); }
  function sink() {
    ball.vx = ball.vy = 0; ball.x = lerp(ball.x, cup[0], 0.5); ball.y = lerp(ball.y, cup[1], 0.5);
    setState("sunk"); sfx.cup(); ball.sink = 0.001;
  }
  const NAMES = { "-3": "Albatross!", "-2": "Eagle!", "-1": "Birdie!", "0": "Par", "1": "Bogey", "2": "Double bogey", "3": "Triple bogey" };
  function resultName(n, par) {
    if (n === 1) return "Hole in one!";
    return NAMES[String(n - par)] || `+${n - par}`;
  }
  function showCard(pickedUp) {
    if (cardShown) return;
    cardShown = true;
    scores[HI] = strokes; updateHud();
    const par = hole.par, diff = strokes - par;
    $("#cardTitle").textContent = pickedUp ? "Picked up" : resultName(strokes, par);
    $("#cardSub").textContent = pickedUp ? `That's ${MAX_STROKES} for this one. On to the next.` : `${strokes} stroke${strokes === 1 ? "" : "s"} on a par ${par}${diff < 0 ? ". Beautiful." : diff === 0 ? ". Nicely done." : "."}`;
    $("#card").classList.toggle("great", !pickedUp && diff < 0);
    $("#nextBtn").textContent = HI < HOLES.length - 1 ? `Hole ${HI + 2}` : "See scorecard";
    $("#card").hidden = false;
    if (!pickedUp && diff < 0) { confetti(); sfx.cheer(); } else sfx.chime();
  }
  function startHole(i) {
    cardShown = false; $("#card").hidden = true;
    buildHole(i); fitCamera(); renderSky(); renderGround();
    introT = 0; setState("aim");
    updateHud();
    const b = $("#banner");
    $("#bannerNum").textContent = `Hole ${i + 1} of ${HOLES.length} · Par ${hole.par}`;
    $("#bannerName").textContent = hole.name;
    $("#bannerBlurb").textContent = hole.blurb;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
  }
  function showFinal() {
    const total = scores.reduce((a, b) => a + b, 0), par = HOLES.reduce((a, h) => a + h.par, 0), d = total - par;
    const rows = HOLES.map((h, i) => `<tr><td>${i + 1}</td><td class="nm">${h.name}</td><td>${h.par}</td><td class="${scores[i] < h.par ? "under" : scores[i] > h.par ? "over" : ""}">${scores[i]}</td></tr>`).join("");
    $("#scoreRows").innerHTML = rows + `<tr class="tot"><td></td><td class="nm">Total</td><td>${par}</td><td>${total}</td></tr>`;
    let best = null;
    try { best = +localStorage.getItem("rosenbergGolfBest") || null; if (!best || total < best) localStorage.setItem("rosenbergGolfBest", String(total)); } catch {}
    $("#finalTitle").textContent = d < 0 ? `${-d} under par!` : d === 0 ? "Right on par" : `${d} over par`;
    $("#finalSub").textContent = best && total < best ? `New best round! Old best was ${best}.` : best && total > best ? `Best round so far: ${best}.` : best === total ? `Ties your best round.` : "Your first round is in the books.";
    $("#final").hidden = false; $("#card").hidden = true;
    if (d <= 0) { confetti(); sfx.cheer(); }
    setState("final");
  }
  function updateHud() {
    if (!hole) return;
    $("#hudHole").textContent = `Hole ${HI + 1}`;
    $("#hudName").textContent = hole.name;
    $("#hudPar").textContent = hole.par;
    $("#hudStrokes").textContent = strokes;
    const done = HOLES.slice(0, HI).reduce((a, h, i) => a + (scores[i] ?? h.par) - h.par, 0);
    const cur = done + (state === "sunk" || cardShown ? strokes - hole.par : 0);
    $("#hudTotal").textContent = cur === 0 ? "E" : cur > 0 ? `+${cur}` : String(cur);
  }
  let toastTimer = 0;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1300); }

  // ---------- input: pull back anywhere, let go to putt ----------
  function pointer(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener("pointerdown", (e) => {
    sfx.unlock();
    if (state !== "aim" || ball.hidden) return;
    const [px, py] = pointer(e), z = hole.hp(ball.x, ball.y);
    const w = unproject(px, py, z);
    drag = { sx: w[0], sy: w[1], dx: 0, dy: -1, power: 0, id: e.pointerId };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const [px, py] = pointer(e), w = unproject(px, py, hole.hp(ball.x, ball.y));
    const vx = drag.sx - w[0], vy = drag.sy - w[1], l = Math.hypot(vx, vy);
    if (l > 0.03) { drag.dx = vx / l; drag.dy = vy / l; }
    const was = drag.power;
    drag.power = clamp(l / MAX_PULL, 0, 1);
    if (Math.floor(drag.power * 8) !== Math.floor(was * 8)) sfx.tick(drag.power);
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (state === "aim" && d.power > 0.04) shoot(d.dx, d.dy, d.power);
  };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", () => { drag = null; });

  // ---------- sound (all synthesized) ----------
  const sfx = (() => {
    let ac = null, master = null, muted = false;
    try { muted = localStorage.getItem("rosenbergGolfMute") === "1"; } catch {}
    const unlock = () => {
      if (ac) { if (ac.state === "suspended") ac.resume(); return; }
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      ac = new A(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    };
    const noise = (dur) => { const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; };
    const tone = (f, t0, dur, vol, type = "sine", f1) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
    };
    const burst = (t0, dur, vol, freq, q = 1, type = "bandpass") => {
      const s = noise(dur), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t0);
    };
    const ok = () => ac && !muted;
    return {
      unlock,
      get muted() { return muted; },
      toggle() { muted = !muted; try { localStorage.setItem("rosenbergGolfMute", muted ? "1" : "0"); } catch {} if (master) master.gain.value = muted ? 0 : 0.8; return muted; },
      putt(p) { if (!ok()) return; const t = ac.currentTime; burst(t, 0.05, 0.5 + p * 0.4, 2600, 2); tone(1250, t, 0.08, 0.25 + p * 0.2, "triangle", 700); },
      knock(v) { if (!ok()) return; const t = ac.currentTime, vol = clamp(v / 8, 0.05, 0.5); tone(320, t, 0.09, vol, "sine", 170); burst(t, 0.04, vol * 0.6, 1400, 3); },
      tick(p) { if (!ok()) return; tone(500 + p * 700, ac.currentTime, 0.03, 0.05, "square"); },
      ding() { if (!ok()) return; const t = ac.currentTime; tone(1046, t, 0.7, 0.22); tone(1568, t, 0.5, 0.12); tone(2093, t, 0.3, 0.06); },
      cup() { if (!ok()) return; const t = ac.currentTime; [0, 0.07, 0.13, 0.2].forEach((d, i) => burst(t + d, 0.04, 0.35 - i * 0.07, 3000 - i * 400, 4)); tone(180, t + 0.22, 0.25, 0.4, "sine", 90); },
      splash() { if (!ok()) return; const t = ac.currentTime; burst(t, 0.6, 0.6, 900, 0.7, "lowpass"); burst(t + 0.05, 0.4, 0.25, 2500, 1); tone(420, t, 0.2, 0.15, "sine", 120); },
      whoosh() { if (!ok()) return; const t = ac.currentTime; burst(t, 0.35, 0.3, 1200, 0.8); tone(300, t, 0.3, 0.08, "sine", 900); },
      warp() { if (!ok()) return; const t = ac.currentTime; [880, 1175, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.05, 0.3, 0.1, "triangle")); },
      sizzle() { if (!ok()) return; const t = ac.currentTime; burst(t, 0.9, 0.5, 4000, 0.5, "highpass"); tone(160, t, 0.3, 0.2, "sawtooth", 60); },
      chime() { if (!ok()) return; const t = ac.currentTime; [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.09, 0.5, 0.15)); },
      cheer() { if (!ok()) return; const t = ac.currentTime; [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.08, 0.6, 0.16, "triangle")); burst(t + 0.1, 1.2, 0.08, 3000, 0.4); },
    };
  })();

  // ---------- buttons ----------
  const muteBtn = $("#mute");
  const paintMute = () => { muteBtn.setAttribute("aria-pressed", String(sfx.muted)); muteBtn.setAttribute("aria-label", sfx.muted ? "Sound off" : "Sound on"); };
  paintMute();
  muteBtn.addEventListener("click", () => { sfx.unlock(); sfx.toggle(); paintMute(); });
  // a round in progress is saved after every hole, so it can be picked up later
  const RUN_KEY = "rosenbergGolfRun";
  const loadRun = () => { try { const r = JSON.parse(localStorage.getItem(RUN_KEY)); return r && r.next > 0 && r.next < HOLES.length ? r : null; } catch { return null; } };
  const saveRun = (r) => { try { r ? localStorage.setItem(RUN_KEY, JSON.stringify(r)) : localStorage.removeItem(RUN_KEY); } catch {} };
  function paintTitle() {
    const run = loadRun();
    $("#holeList").innerHTML = HOLES.map((h, i) => `<div class="${run && i < run.next ? "done" : ""}"><b>${i + 1}</b>${h.name}</div>`).join("");
    $("#resumeBtn").hidden = !run;
    if (run) $("#resumeBtn").textContent = `Continue at hole ${run.next + 1}`;
    $("#startBtn").textContent = run ? "New round" : "Tee off";
  }
  paintTitle();
  const leaveTitle = () => { sfx.unlock(); $("#title").hidden = true; document.body.classList.remove("on-title"); };
  $("#startBtn").addEventListener("click", () => { leaveTitle(); scores = []; saveRun(null); startHole(0); });
  $("#resumeBtn").addEventListener("click", () => { const run = loadRun(); leaveTitle(); scores = run ? run.scores : []; startHole(run ? run.next : 0); });
  $("#nextBtn").addEventListener("click", () => {
    if (HI < HOLES.length - 1) { saveRun({ next: HI + 1, scores }); startHole(HI + 1); } else { saveRun(null); showFinal(); }
  });
  $("#againBtn").addEventListener("click", () => { $("#final").hidden = true; scores = []; startHole(0); });
  addEventListener("resize", resize);
  addEventListener("keydown", (e) => { if (e.key === "m" || e.key === "M") { sfx.toggle(); paintMute(); } });
  try { const b = localStorage.getItem("rosenbergGolfBest"); if (b) $("#titleBest").textContent = `Best round: ${b}`; } catch {}

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    time += dt; stateT += dt; introT += dt; bumpCool -= dt;
    tick(dt);
    // a ball left sitting on the drawbridge goes in when it rises
    if (state === "aim" && bridgeUp() && partAt(ball.x, ball.y)?.surf === "drawbridge") splash();
    for (const bm of bumpers) bm.glow = Math.max(0, bm.glow - dt * 2.5);
    physics(dt);
    if (state === "sunk" && ball.sink && ball.sink < 1) {
      ball.sink = Math.min(1, ball.sink + dt / 0.35);
      ball.x = lerp(ball.x, cup[0], 0.3); ball.y = lerp(ball.y, cup[1], 0.3);
      if (ball.sink >= 1) setTimeout(() => showCard(false), 450);
    }
    if (state === "splash") { ball.drown = Math.min(1, stateT / 0.5); if (stateT > 0.9) toTee(false); }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.drawImage(skyCv, 0, 0, W, H);
    drawClouds(ctx, dt, false);
    const k = reduced ? 1 : ease(introT / 0.9);
    ctx.save();
    ctx.globalAlpha = k;
    let sy = (1 - k) * H * 0.18;
    if (shake > 0 && !reduced) { shake -= dt; sy += Math.sin(time * 90) * 2 * shake * 8; }
    ctx.translate(0, sy);
    drawScene(ctx);
    drawCritters(ctx, dt);
    drawParticles(ctx, dt);
    ctx.restore();
    requestAnimationFrame(frame);
  }

  // test hook: ?hole=2 jumps straight to a hole
  const q = new URLSearchParams(location.search);
  buildHole(clamp((+q.get("hole") || 1) - 1, 0, HOLES.length - 1));
  resize();
  updateHud();
  if (q.has("hole")) { $("#title").hidden = true; document.body.classList.remove("on-title"); scores = []; startHole(HI); }
  // test hook: fast-forward one shot from (x, y) without touching the screen
  function simulate(x, y, dx, dy, power, t0 = 0) {
    const save = { ball: { ...ball }, strokes, state, stateT, lastRest, particles, clock, ma: mill && mill.angle, sa: spinner && spinner.angle };
    const l = Math.hypot(dx, dy), muted = sfx.muted;
    ball.x = x; ball.y = y; ball.sink = 0; ball.drown = 0;
    clock = 0; if (mill) mill.angle = 0.4; if (spinner) spinner.angle = 0; tick(t0);
    shoot(dx / l, dy / l, power);
    let t = 0;
    while (state === "roll" && t < 30) { tick(1 / 60); physics(1 / 60); stateT += 1 / 60; t += 1 / 60; }
    const out = { result: state === "sunk" ? "in" : state === "splash" ? "water" : "rest", x: ball.x, y: ball.y, t };
    Object.assign(ball, save.ball); strokes = save.strokes; state = save.state; stateT = save.stateT; lastRest = save.lastRest; particles = save.particles;
    clock = save.clock; if (mill) mill.angle = save.ma; if (spinner) spinner.angle = save.sa; tick(0);
    return out;
  }
  window.__golf = { simulate, get tee() { return tee; }, get ball() { return ball; }, get state() { return state; }, shoot: (dx, dy, p) => { const l = Math.hypot(dx, dy); shoot(dx / l, dy / l, p); }, get cup() { return cup; }, get strokes() { return strokes; } };
  requestAnimationFrame(frame);
})();
