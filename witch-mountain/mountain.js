// Witch Mountain: the mountain, the trail, the witches and the effects.
// World units: x runs left/right, "a" is altitude (up is positive). On the canvas a point draws at (x, -a).

window.WM = window.WM || {};

(() => {
  const A = window.RW.art;
  const TAU = Math.PI * 2;
  const { shade, rgba, rr, ell, lin, rad, shadow, line } = A;

  // ---------- the mountain ----------
  const STATIONS = 9;            // one witch every 100 ft
  const STEP = 240;              // world units per 100 ft
  const SUMMIT = (STATIONS + 1) * STEP;
  const PEAK = SUMMIT + 130;
  const FT = (a) => Math.max(0, Math.round((a / STEP) * 100));

  // seeded random so the mountain looks the same every climb
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const between = (a, b) => a + rnd() * (b - a);

  const halfWidth = (a) => 900 * Math.sqrt(Math.max(0, PEAK - a) / (PEAK + 300));
  const ridgeL = (a) => halfWidth(a) + 34 * Math.sin(a * 0.013 + 1.3) + 18 * Math.sin(a * 0.041);
  const ridgeR = (a) => halfWidth(a) + 30 * Math.sin(a * 0.011 + 4.1) + 20 * Math.sin(a * 0.037 + 2);
  const legX = (a) => Math.min(290, halfWidth(a) - 112);
  const snowLine = (x) => SUMMIT * 0.72 + 50 * Math.sin(x * 0.017) + 26 * Math.sin(x * 0.043 + 1);
  const treeLine = SUMMIT * 0.52;

  // ---------- the trail ----------
  // trailhead -> 9 switchback landings (a witch on each) -> summit
  const nodes = [{ x: 0, a: 0 }];
  for (let i = 1; i <= STATIONS; i++) {
    const a = i * STEP, side = i % 2 ? 1 : -1;
    nodes.push({ x: side * legX(a), a, side });
  }
  nodes.push({ x: 0, a: SUMMIT });
  const pts = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const P = nodes[i], Q = nodes[i + 1];
    const dx = Q.x - P.x, da = Q.a - P.a;
    const c1 = { x: P.x + dx * 0.38, a: P.a + da * 0.08 }, c2 = { x: P.x + dx * 0.78, a: Q.a - da * 0.06 };
    for (let j = i ? 1 : 0; j <= 48; j++) {
      const t = j / 48, u = 1 - t;
      pts.push({
        x: u * u * u * P.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * Q.x,
        a: u * u * u * P.a + 3 * u * u * t * c1.a + 3 * u * t * t * c2.a + t * t * t * Q.a,
        node: j === 48 ? i + 1 : -1,
      });
    }
  }
  let len = 0;
  pts.forEach((p, i) => { if (i) len += Math.hypot(p.x - pts[i - 1].x, p.a - pts[i - 1].a); p.s = len; });
  const stations = [];
  pts.forEach((p) => { if (p.node > 0 && p.node <= STATIONS) stations.push({ i: p.node, x: p.x, a: p.a, s: p.s, side: nodes[p.node].side }); });
  const summitS = len;

  function at(s) {
    s = Math.max(0, Math.min(len, s));
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s < s) lo = m; else hi = m; }
    const p = pts[lo], q = pts[hi], f = (s - p.s) / Math.max(1e-6, q.s - p.s);
    return { x: p.x + (q.x - p.x) * f, a: p.a + (q.a - p.a) * f, dir: Math.sign(q.x - p.x) || 1 };
  }
  function nearTrail(x, a, r) {
    for (let i = 0; i < pts.length; i += 3) if (Math.hypot(pts[i].x - x, pts[i].a - a) < r) return true;
    for (const st of stations) if (Math.hypot(st.x + st.side * 40 - x, st.a - a) < r + 70) return true;
    return Math.hypot(x, a - SUMMIT) < r + 80;
  }

  // ---------- scenery (generated once) ----------
  const crags = [], trees = [], boulders = [], grassTufts = [], flowers = [];
  for (let n = 0; n < 190; n++) {
    const a = between(treeLine * 0.55, PEAK - 60), hw = halfWidth(a) - 20;
    const x = between(-hw, hw);
    if (nearTrail(x, a, 44)) continue;
    crags.push({ x, a, w: between(24, 70), h: between(16, 46), lean: between(-0.4, 0.4), snowy: a > snowLine(x) - 40 });
  }
  for (let n = 0; n < 420; n++) {
    const a = between(-60, treeLine + 120), hw = halfWidth(a) - 18;
    const x = between(-hw, hw);
    if (a > treeLine && rnd() < (a - treeLine) / 120) continue;
    if (nearTrail(x, a, 40)) continue;
    trees.push({ x, a, h: between(46, 88) * (1 - Math.max(0, a) / (treeLine * 3.2)), hue: rnd() });
  }
  // meadow trees in front of the mountain
  for (let n = 0; n < 60; n++) {
    const x = between(-1500, 1500), a = between(-220, -30);
    if (Math.abs(x) < 170 && a > -120) continue;
    trees.push({ x, a, h: between(70, 110), hue: rnd() });
  }
  trees.sort((p, q) => q.a - p.a);
  crags.sort((p, q) => q.a - p.a);
  for (let i = 8; i < pts.length; i += 7) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
    if (p.a > SUMMIT - 40) continue;
    const nx = -(q.a - p.a), na = q.x - p.x, nl = Math.hypot(nx, na) || 1;
    const side = rnd() < 0.5 ? -1 : 1;
    if (rnd() < 0.55) boulders.push({ x: p.x + (nx / nl) * 24 * side, a: p.a + (na / nl) * 24 * side - 6, r: between(5, 11), below: side * (na / nl) < 0 });
  }
  for (let n = 0; n < 120; n++) {
    const a = between(-40, treeLine * 0.8), hw = halfWidth(a) - 10, x = between(-hw, hw);
    if (nearTrail(x, a, 26)) continue;
    (rnd() < 0.5 ? flowers : grassTufts).push({ x, a, c: ["#FFD23F", "#FF8FB8", "#FFFFFF", "#B69CFF"][Math.floor(rnd() * 4)] });
  }
  const farRange = [], midRange = [];
  for (let i = 0; i <= 40; i++) farRange.push(0.45 + 0.35 * Math.abs(Math.sin(i * 1.7)) * Math.abs(Math.sin(i * 0.63 + 1)) + 0.12 * rnd());
  for (let i = 0; i <= 26; i++) midRange.push(0.35 + 0.4 * Math.abs(Math.sin(i * 1.3 + 2)) + 0.12 * rnd());
  const clouds = [];
  for (let n = 0; n < 14; n++) clouds.push({ x: between(-1, 1), y: between(0, 1), s: between(0.6, 1.4), layer: n % 3, v: between(6, 16) });

  // ---------- drawing helpers ----------
  function pine(c, x, a, h, hue, snow) {
    const y = -a, w = h * 0.46;
    shadow(c, x + 4, y + 2, w * 0.7, 6, 0.28);
    c.fillStyle = "#6B4526"; c.fillRect(x - 3, y - h * 0.18, 6, h * 0.2);
    const base = hue < 0.33 ? "#2F7D4A" : hue < 0.66 ? "#2A6E44" : "#3B8A4C";
    for (let k = 0; k < 3; k++) {
      const ty = y - h * (0.14 + k * 0.26), tw = w * (1 - k * 0.24), th = h * 0.44;
      c.beginPath(); c.moveTo(x, ty - th); c.lineTo(x + tw, ty); c.quadraticCurveTo(x, ty + 6, x - tw, ty); c.closePath();
      c.fillStyle = lin(c, x - tw, 0, x + tw, 0, [shade(base, 0.22), base, shade(base, -0.35)]); c.fill();
      if (snow > 0) {
        c.beginPath(); c.moveTo(x, ty - th); c.lineTo(x + tw * 0.42, ty - th * 0.55); c.lineTo(x, ty - th * 0.62); c.lineTo(x - tw * 0.42, ty - th * 0.55); c.closePath();
        c.fillStyle = rgba("#FFFFFF", 0.85 * snow); c.fill();
      }
    }
  }
  function crag(c, g) {
    const x = g.x, y = -g.a, w = g.w, h = g.h, tx = x + g.lean * w * 0.5;
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(tx - w * 0.12, y - h); c.lineTo(tx + w * 0.08, y - h * 0.9); c.lineTo(x + w / 2, y); c.closePath();
    c.fillStyle = g.snowy ? "#E4ECF6" : "#9B98A0"; c.fill();
    c.beginPath(); c.moveTo(tx + w * 0.08, y - h * 0.9); c.lineTo(x + w / 2, y); c.lineTo(x + w * 0.06, y); c.closePath();
    c.fillStyle = g.snowy ? "#B9C8DE" : "#6E6A78"; c.fill();
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(tx - w * 0.12, y - h); c.lineTo(x - w * 0.16, y); c.closePath();
    c.fillStyle = g.snowy ? "#FFFFFF" : "#B8B4BA"; c.fill();
  }
  function boulder(c, b) {
    const x = b.x, y = -b.a;
    shadow(c, x + 2, y + 2, b.r * 1.4, b.r * 0.5, 0.3);
    ell(c, x, y - b.r * 0.55, b.r * 1.15, b.r * 0.8);
    c.fillStyle = rad(c, x - b.r * 0.4, y - b.r, 1, x, y - b.r * 0.5, b.r * 1.3, ["#CFC9C2", "#958D86", "#6C645F"]); c.fill();
  }

  // ---------- witches ----------
  const WITCHES = [
    { name: "Witch Hazel", skin: "#8FD16B", robe: "#5B3A8C", hat: "#2E1F4F", band: "#F2B632", hair: "#F07A2B", eye: "#FFE14D" },
    { name: "Grizelda", skin: "#A3D977", robe: "#1E5E6B", hat: "#15343C", band: "#E84A7F", hair: "#1C1C24", eye: "#FF9E3D" },
    { name: "Mildew", skin: "#B7C96A", robe: "#7A2D4F", hat: "#3F1428", band: "#7BE0C3", hair: "#E6E6EE", eye: "#9CFF5C" },
    { name: "Bogwort", skin: "#7FC98C", robe: "#3B4E9A", hat: "#1C2656", band: "#FFD23F", hair: "#B3372F", eye: "#FFF06A" },
    { name: "Cackletta", skin: "#9EDB8F", robe: "#8A3FB8", hat: "#3D1760", band: "#FF6FAE", hair: "#2D1A0E", eye: "#FFD23F" },
    { name: "Old Nettle", skin: "#C2D98A", robe: "#445C2E", hat: "#232F17", band: "#E07B39", hair: "#D8D8E0", eye: "#FFB0E0" },
    { name: "Wanda Warts", skin: "#86C57A", robe: "#A0342C", hat: "#4B1611", band: "#F2C94C", hair: "#101018", eye: "#7CF3FF" },
    { name: "Snowbroom", skin: "#A8E0C4", robe: "#2F6FA8", hat: "#123452", band: "#FFFFFF", hair: "#FFFFFF", eye: "#FFE14D" },
    { name: "Queen Grimbly", skin: "#99CF73", robe: "#2B1B3F", hat: "#120A1E", band: "#FFD23F", hair: "#8E44FF", eye: "#FF5A5A", crown: true },
  ];

  // st: { t, dir (1 faces right), pose: 'idle'|'ask'|'zap'|'cackle'|'huff'|'fly', pt }
  function drawWitch(c, W, st) {
    const t = st.t, dir = st.dir || 1, pose = st.pose || "idle", pt = st.pt || 0;
    const fly = pose === "fly";
    const shake = pose === "cackle" || pose === "zap" ? Math.sin(t * 40) * 1.4 : 0;
    const bob = fly ? Math.sin(t * 6) * 3 : Math.sin(t * 2.2) * 1.2;
    if (!fly) shadow(c, 0, 1, 30, 7, 0.3);
    c.save();
    c.scale(dir, 1);
    c.translate(shake, -bob);
    if (fly) c.rotate(-0.12);
    // broom (behind when standing, underneath when flying)
    const broom = (bx, by, ang) => {
      c.save(); c.translate(bx, by); c.rotate(ang);
      line(c, -46, 0, 34, 0, 4, "#8A5A2B");
      c.beginPath(); c.moveTo(-44, -2); c.lineTo(-70, -12); c.lineTo(-76, 0); c.lineTo(-70, 12); c.lineTo(-44, 2); c.closePath();
      c.fillStyle = lin(c, -76, 0, -44, 0, ["#E0B45A", "#C98F2E"]); c.fill();
      c.strokeStyle = "rgba(120,70,20,.5)"; c.lineWidth = 1; for (let k = -8; k <= 8; k += 4) { c.beginPath(); c.moveTo(-46, k * 0.2); c.lineTo(-74, k); c.stroke(); }
      c.fillStyle = "#7A2D1E"; c.fillRect(-48, -4, 5, 8);
      c.restore();
    };
    if (fly) broom(0, -16, 0);
    else broom(-22, -40, -1.25);
    // hair behind
    c.fillStyle = W.hair;
    for (let k = 0; k < 6; k++) {
      const sway = Math.sin(t * 3 + k) * 3 + (fly ? -10 : 0);
      c.beginPath(); c.moveTo(-14 + k * 2, -92); c.quadraticCurveTo(-24 + k * 3 + sway, -72, -18 + k * 4 + sway, -56 + (k % 2) * 6);
      c.lineWidth = 4.5; c.strokeStyle = W.hair; c.lineCap = "round"; c.stroke();
    }
    // robe
    const hemY = fly ? -14 : 0, hemW = fly ? 30 : 38;
    c.beginPath();
    c.moveTo(-15, -66);
    c.quadraticCurveTo(-24, -30, -hemW, hemY);
    for (let k = 0; k <= 8; k++) c.lineTo(-hemW + (k * hemW * 2) / 8, hemY + (k % 2 ? -6 : 2) + Math.sin(t * 5 + k) * 1.2);
    c.quadraticCurveTo(24, -30, 15, -66);
    c.quadraticCurveTo(0, -72, -15, -66);
    c.closePath();
    c.fillStyle = lin(c, -hemW, -60, hemW, 0, [shade(W.robe, 0.28), W.robe, shade(W.robe, -0.38)]); c.fill();
    c.strokeStyle = shade(W.robe, -0.5); c.lineWidth = 1.5; c.stroke();
    // belt
    c.fillStyle = shade(W.robe, -0.55); rr(c, -19, -40, 38, 6, 2); c.fill();
    c.strokeStyle = W.band; c.lineWidth = 2; rr(c, 2, -41.5, 8, 9, 1.5); c.stroke();
    // pointy boots
    if (!fly) for (const [bx, k] of [[-10, -1], [12, 1]]) {
      c.beginPath(); c.moveTo(bx - 7, 0); c.quadraticCurveTo(bx + 4, -8, bx + 16, -4); c.quadraticCurveTo(bx + 20, -10, bx + 16, -12);
      c.quadraticCurveTo(bx + 22, -2, bx + 10, 2); c.closePath(); c.fillStyle = k < 0 ? "#231A2E" : "#2E2340"; c.fill();
    }
    // back arm
    line(c, -12, -60, -20, -38, 7, shade(W.robe, -0.2));
    ell(c, -20, -36, 4, 4); c.fillStyle = W.skin; c.fill();
    // head
    c.save(); c.translate(3, -84);
    if (pose === "cackle") c.rotate(-0.25 + Math.sin(t * 20) * 0.08);
    if (pose === "huff") c.rotate(0.12);
    const R = 17;
    ell(c, 0, 0, R, R * 1.05); c.fillStyle = rad(c, -5, -6, 2, 0, 0, R * 1.2, [shade(W.skin, 0.25), W.skin, shade(W.skin, -0.2)]); c.fill();
    // chin
    c.beginPath(); c.moveTo(-2, 12); c.quadraticCurveTo(10, 24, 12, 16); c.quadraticCurveTo(10, 12, 4, 12); c.fillStyle = W.skin; c.fill();
    // nose + wart
    c.beginPath(); c.moveTo(10, -4); c.quadraticCurveTo(30, 0, 27, 8); c.quadraticCurveTo(20, 6, 12, 5); c.closePath();
    c.fillStyle = lin(c, 10, -4, 28, 8, [shade(W.skin, 0.1), shade(W.skin, -0.15)]); c.fill();
    ell(c, 20, 1, 2.2, 2.2); c.fillStyle = shade(W.skin, -0.35); c.fill();
    // eye
    ell(c, 6, -5, 6, 6.5); c.fillStyle = W.eye; c.fill();
    const look = pose === "huff" ? -1.5 : 1.5;
    ell(c, 7 + look, -4.5, 2.4, pose === "zap" ? 4.5 : 3.4); c.fillStyle = "#16101E"; c.fill();
    ell(c, 5.5, -7, 1.3, 1.3); c.fillStyle = "#fff"; c.fill();
    // brow
    c.strokeStyle = shade(W.hair, -0.3); c.lineWidth = 2.6; c.lineCap = "round";
    c.beginPath();
    if (pose === "zap" || pose === "ask") { c.moveTo(0, -15); c.lineTo(13, -10); } else if (pose === "huff") { c.moveTo(0, -11); c.lineTo(13, -14); } else { c.moveTo(0, -13); c.quadraticCurveTo(7, -16, 13, -12); }
    c.stroke();
    // mouth
    c.lineWidth = 2; c.strokeStyle = "#3A1426";
    if (pose === "cackle" || pose === "zap") {
      const o = pose === "cackle" ? 3 + Math.abs(Math.sin(t * 22)) * 4 : 4;
      c.beginPath(); c.moveTo(4, 8); c.quadraticCurveTo(10, 8 + o * 2, 16, 8); c.closePath(); c.fillStyle = "#3A1426"; c.fill();
      c.fillStyle = "#FFF6D8"; c.fillRect(8, 8, 3, 3);
    } else if (pose === "huff") {
      c.beginPath(); c.moveTo(5, 11); c.quadraticCurveTo(10, 7, 15, 11); c.stroke();
    } else {
      c.beginPath(); c.moveTo(3, 7); c.quadraticCurveTo(10, 14, 16, 7); c.stroke();
      c.fillStyle = "#FFF6D8"; c.fillRect(9, 8.5, 3, 3);
    }
    // hat
    c.save(); c.translate(-1, -13); c.rotate(-0.08 + Math.sin(t * 1.7) * 0.03 + (fly ? -0.2 : 0));
    ell(c, 0, 0, 34, 8); c.fillStyle = lin(c, -34, -8, 34, 8, [shade(W.hat, 0.25), W.hat, shade(W.hat, -0.3)]); c.fill();
    c.beginPath(); c.moveTo(-18, -2);
    c.quadraticCurveTo(-10, -28, -6, -48);
    c.quadraticCurveTo(-18, -56 + Math.sin(t * 2) * 2, -30, -50);
    c.quadraticCurveTo(-14, -50, -2, -42);
    c.quadraticCurveTo(6, -22, 18, -2);
    c.quadraticCurveTo(0, 3, -18, -2);
    c.fillStyle = lin(c, -18, -30, 18, -30, [shade(W.hat, 0.3), W.hat, shade(W.hat, -0.35)]); c.fill();
    c.fillStyle = W.band; c.beginPath(); c.moveTo(-17, -4); c.quadraticCurveTo(0, 0, 17, -4); c.lineTo(14, -11); c.quadraticCurveTo(0, -7, -14, -11); c.closePath(); c.fill();
    c.strokeStyle = shade(W.band, -0.35); c.lineWidth = 1.6; rr(c, -4, -11, 8, 7, 1.5); c.stroke();
    if (W.crown) { c.fillStyle = "#FFD23F"; A.starPath(c, -30, -50, 6, 5, 0.45); c.fill(); }
    c.restore();
    c.restore();
    // wand arm
    let wa = -0.2;
    if (pose === "ask") wa = -0.7 + Math.sin(t * 5) * 0.12;
    if (pose === "zap") wa = -1.45;
    if (pose === "cackle") wa = -0.9 + Math.sin(t * 18) * 0.35;
    if (pose === "huff") wa = 0.5;
    if (fly) wa = -0.3;
    const sx = 12, sy = -60;
    const hx = sx + Math.cos(wa) * 22, hy = sy + Math.sin(wa) * 22;
    line(c, sx, sy, hx, hy, 7.5, shade(W.robe, 0.05));
    ell(c, hx, hy, 4.2, 4.2); c.fillStyle = W.skin; c.fill();
    const wx = hx + Math.cos(wa) * 24, wy = hy + Math.sin(wa) * 24;
    line(c, hx, hy, wx, wy, 3, "#3A2418");
    const glow = pose === "zap" || pose === "ask" ? 1 : 0.4;
    c.fillStyle = rad(c, wx, wy, 0, wx, wy, 14, [rgba(W.eye, 0.9 * glow), rgba(W.eye, 0)]); ell(c, wx, wy, 14, 14); c.fill();
    c.fillStyle = "#FFFFFF"; A.starPath(c, wx, wy, 4.5, 4, 0.4, t * 3); c.fill();
    c.restore();
    // where the wand tip is, in the witch's local space (for zaps)
    return { x: wx * dir, y: wy - bob };
  }

  function cauldron(c, x, a, t, col) {
    const y = -a;
    shadow(c, x, y + 2, 24, 6, 0.35);
    // fire
    for (let k = 0; k < 3; k++) {
      const fx = x - 10 + k * 10, fh = 10 + Math.sin(t * 12 + k * 2) * 3;
      c.beginPath(); c.moveTo(fx - 5, y); c.quadraticCurveTo(fx, y - fh * 1.6, fx + 5, y); c.fillStyle = k === 1 ? "#FFD23F" : "#FF7A2E"; c.fill();
    }
    ell(c, x, y - 16, 22, 17); c.fillStyle = rad(c, x - 8, y - 24, 2, x, y - 16, 26, ["#5A5A68", "#2A2A34", "#15151C"]); c.fill();
    ell(c, x, y - 30, 20, 5); c.fillStyle = "#1B1B22"; c.fill();
    ell(c, x, y - 30, 17, 3.6); c.fillStyle = rad(c, x, y - 30, 1, x, y - 30, 18, [shade(col, 0.4), col]); c.fill();
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.8 + k / 3) % 1;
      ell(c, x - 8 + k * 8 + Math.sin(t * 3 + k) * 3, y - 32 - ph * 26, 3 + ph * 4, 3 + ph * 4);
      c.fillStyle = rgba(col, 0.55 * (1 - ph)); c.fill();
    }
  }

  // ---------- the whole world ----------
  // cam: { x, a, k, fx, fy } -> world point (x, a) lands at screen (fx + (x - cam.x) * k, fy - (a - cam.a) * k)
  function drawBackdrop(c, w, h, cam, t) {
    const up = Math.min(1, Math.max(0, cam.a / SUMMIT));
    // sky
    c.fillStyle = lin(c, 0, 0, 0, h, [
      A.shade("#3E7FE0", -0.12 * up), A.shade("#76B6F5", -0.08 * up), [0.78, "#CDE8FF"], [1, "#FFE9C9"],
    ]);
    c.fillRect(0, 0, w, h);
    // sun
    const sx = w * 0.16, sy = h * 0.14;
    c.fillStyle = rad(c, sx, sy, 0, sx, sy, Math.max(w, h) * 0.45, [[0, "rgba(255,245,200,.85)"], [0.12, "rgba(255,236,170,.35)"], [1, "rgba(255,236,170,0)"]]);
    c.fillRect(0, 0, w, h);
    ell(c, sx, sy, 30, 30); c.fillStyle = "#FFF6CF"; c.fill();
    // far and mid ranges sink as you climb
    const range = (arr, par, baseY, amp, cols, snow) => {
      const off = (-cam.x * cam.k * par) % (w / 4);
      const by = baseY + cam.a * cam.k * par;
      if (by - amp > h + 20) return;
      const n = arr.length - 1, step = (w * 1.5) / n;
      c.beginPath(); c.moveTo(-w * 0.25 + off, h + 10);
      for (let i = 0; i <= n; i++) c.lineTo(-w * 0.25 + off + i * step, by - arr[i] * amp);
      c.lineTo(w * 1.5, h + 10); c.closePath();
      c.fillStyle = lin(c, 0, by - amp, 0, by + 40, cols); c.fill();
      if (snow) {
        c.fillStyle = "rgba(255,255,255,.75)";
        for (let i = 1; i < n; i++) if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1] && arr[i] > 0.62) {
          const px = -w * 0.25 + off + i * step, py = by - arr[i] * amp;
          c.beginPath(); c.moveTo(px, py); c.lineTo(px + step * 0.3, py + amp * 0.1); c.lineTo(px, py + amp * 0.07); c.lineTo(px - step * 0.3, py + amp * 0.1); c.closePath(); c.fill();
        }
      }
    };
    range(farRange, 0.1, h * 0.62, h * 0.34, ["#B7CFEF", "#D8E6F7"], true);
    cloudsLayer(c, w, h, cam, t, 0);
    range(midRange, 0.28, h * 0.8, h * 0.36, ["#86A9D6", "#B4CCE8"], true);
    cloudsLayer(c, w, h, cam, t, 1);
  }
  function cloud(c, x, y, s, a) {
    c.fillStyle = `rgba(255,255,255,${a})`;
    for (const [dx, dy, r] of [[-40, 6, 26], [-12, -8, 34], [22, -2, 30], [48, 8, 22], [0, 12, 30]]) { ell(c, x + dx * s, y + dy * s, r * s, r * s * 0.9); c.fill(); }
    c.fillStyle = `rgba(190,210,235,${a * 0.5})`; ell(c, x, y + 20 * s, 60 * s, 10 * s); c.fill();
  }
  function cloudsLayer(c, w, h, cam, t, layer) {
    const par = [0.14, 0.4, 1.25][layer];
    for (const cl of clouds) if (cl.layer === layer) {
      const span = w + 400;
      const x = (((cl.x * span + t * cl.v - cam.x * cam.k * par) % span) + span) % span - 200;
      const y = (cl.y * 1.6 - 0.2) * h + cam.a * cam.k * par * 0.9 - (layer === 2 ? SUMMIT * cam.k * 0.9 : 0);
      if (y < -120 || y > h + 120) continue;
      cloud(c, x, y, cl.s * (layer === 2 ? 1.8 : 1) * Math.max(0.6, cam.k), layer === 2 ? 0.55 : 0.8);
    }
  }
  function frontClouds(c, w, h, cam, t) { cloudsLayer(c, w, h, cam, t, 2); }

  function mountainPath(c) {
    c.beginPath();
    c.moveTo(-halfWidth(-300) - 40, 300);
    for (let a = -300; a <= PEAK; a += 24) c.lineTo(-ridgeL(a), -a);
    c.lineTo(0, -PEAK - 6);
    for (let a = PEAK; a >= -300; a -= 24) c.lineTo(ridgeR(a), -a);
    c.lineTo(halfWidth(-300) + 40, 300);
    c.closePath();
  }

  function drawWorld(c, cam, t, view) {
    const top = cam.a + view.up, bottom = cam.a - view.down;
    // meadow behind + in front
    c.fillStyle = lin(c, 0, -40, 0, 400, ["#8CCB5E", "#69AD48", "#4E8F3A"]);
    c.fillRect(-4000, -40, 8000, 800);
    // mountain body
    c.save();
    mountainPath(c);
    c.fillStyle = lin(c, 0, 0, 0, -PEAK, [[0, "#6FA84C"], [0.14, "#5F9244"], [0.3, "#8B8466"], [0.5, "#908C93"], [0.7, "#A5A2AC"], [1, "#C9C7D0"]]);
    c.fill();
    c.clip();
    // light from the upper left
    c.fillStyle = lin(c, -900, 0, 900, 0, ["rgba(255,250,235,.22)", "rgba(255,255,255,0)", "rgba(30,30,70,.32)"]);
    c.fillRect(-1400, -PEAK - 20, 2800, PEAK + 400);
    // big ridges from the peak
    for (const [ex, ea, lit] of [[-560, 900, 1], [-240, 300, 1], [380, 700, 0], [700, 1300, 0], [90, -80, 0]]) {
      c.beginPath(); c.moveTo(0, -PEAK); c.lineTo(ex, -ea); c.lineTo(ex + (lit ? 90 : -90), -ea - 60); c.closePath();
      c.fillStyle = lit ? "rgba(255,255,255,.1)" : "rgba(20,20,60,.12)"; c.fill();
    }
    // snow cap
    c.beginPath(); c.moveTo(-1200, -snowLine(-1200));
    for (let x = -1200; x <= 1200; x += 30) { const d = (Math.floor(x / 30) % 3 === 0) ? 26 : 0; c.lineTo(x, -snowLine(x) + d); }
    c.lineTo(1200, -PEAK - 100); c.lineTo(-1200, -PEAK - 100); c.closePath();
    c.fillStyle = lin(c, -600, 0, 600, 0, ["#FFFFFF", "#F4F8FF", "#C7D6EC"]); c.fill();
    // scree bands
    c.strokeStyle = "rgba(70,60,80,.08)"; c.lineWidth = 8;
    for (let a = treeLine; a < snowLine(0) - 60; a += 70) { c.beginPath(); c.moveTo(-1000, -a); for (let x = -1000; x <= 1000; x += 80) c.lineTo(x, -a - Math.sin(x * 0.01 + a) * 14); c.stroke(); }
    for (const g of crags) if (g.a < top + 60 && g.a > bottom - 60) crag(c, g);
    for (const f of grassTufts) if (f.a < top && f.a > bottom) { c.strokeStyle = "#4E8F3A"; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x - 4, -f.a); c.lineTo(f.x - 6, -f.a - 8); c.moveTo(f.x, -f.a); c.lineTo(f.x, -f.a - 10); c.moveTo(f.x + 4, -f.a); c.lineTo(f.x + 6, -f.a - 8); c.stroke(); }
    for (const f of flowers) if (f.a < top && f.a > bottom) { ell(c, f.x, -f.a - 3, 3, 3); c.fillStyle = f.c; c.fill(); }
    c.restore();
    // ridge outline glow
    mountainPath(c); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 3; c.stroke();
    // meadow front edge (rolling hills)
    c.beginPath(); c.moveTo(-4000, 800);
    for (let x = -4000; x <= 4000; x += 60) c.lineTo(x, 30 - Math.max(0, 40 * Math.sin(x * 0.004) + 26 * Math.sin(x * 0.011 + 1)) - (Math.abs(x) < 900 ? 0 : 0));
    c.lineTo(4000, 800); c.closePath();
    c.fillStyle = lin(c, 0, -30, 0, 300, ["#7CBF55", "#5E9E43", "#467E33"]); c.fill();

    for (const tr of trees) if (tr.a < top + 100 && tr.a > bottom - 20 && tr.a >= -10) pine(c, tr.x, tr.a, tr.h, tr.hue, Math.max(0, Math.min(1, (tr.a - treeLine * 0.6) / (treeLine * 0.5))));
    drawTrail(c, top, bottom, t);
    drawTrailhead(c, t);
    for (const tr of trees) if (tr.a < -10 && tr.a > bottom - 30) pine(c, tr.x, tr.a, tr.h, tr.hue, 0);
  }

  function drawTrail(c, top, bottom, t) {
    const vis = pts.filter((p) => p.a < top + 80 && p.a > bottom - 80);
    if (!vis.length) return;
    const stroke = (off, w, col) => {
      c.beginPath();
      vis.forEach((p, i) => (i ? c.lineTo(p.x, -p.a + off) : c.moveTo(p.x, -p.a + off)));
      c.lineWidth = w; c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
    };
    stroke(18, 36, "rgba(30,20,40,.25)");
    stroke(12, 34, "#6F5236");
    stroke(0, 34, "#C69A62");
    stroke(-3, 22, "#D8AF77");
    c.setLineDash([2, 14]); stroke(2, 18, "rgba(120,86,50,.35)"); c.setLineDash([]);
    // landings (a witch stands on each)
    for (const st of stations) if (st.a < top + 100 && st.a > bottom - 100) landing(c, st, t);
    for (const b of boulders) if (b.a < top && b.a > bottom) boulder(c, b);
    // rope fence on the downhill side of each leg
    c.strokeStyle = "#7A5230"; c.lineWidth = 3;
    for (let i = 4; i < pts.length - 6; i += 12) {
      const p = pts[i];
      if (p.a > top || p.a < bottom || p.a < 40) continue;
      if (stations.some((s) => Math.abs(s.s - p.s) < 70)) continue;
      line(c, p.x, -p.a + 20, p.x, -p.a + 4, 4, "#7A5230");
      const q = pts[i + 12];
      if (q && !stations.some((s) => Math.abs(s.s - q.s) < 70)) {
        c.beginPath(); c.moveTo(p.x, -p.a + 7); c.quadraticCurveTo((p.x + q.x) / 2, -(p.a + q.a) / 2 + 13, q.x, -q.a + 7);
        c.strokeStyle = "#C9A36B"; c.lineWidth = 1.8; c.stroke();
      }
    }
  }
  function landing(c, st, t) {
    const x = st.x + st.side * 26, y = -st.a;
    ell(c, x, y + 16, 76, 24); c.fillStyle = "#5E4530"; c.fill();
    c.fillStyle = "#6F5236"; c.fillRect(x - 76, y + 2, 152, 14);
    ell(c, x, y + 2, 76, 24); c.fillStyle = rad(c, x - 20, y - 6, 4, x, y, 80, ["#E2BE86", "#C69A62", "#A87F4E"]); c.fill();
    // stone rim
    for (let k = 0; k < 14; k++) {
      const an = (k / 14) * TAU, rx = x + Math.cos(an) * 72, ry = y + 2 + Math.sin(an) * 21;
      if (Math.sin(an) < -0.2) continue;
      ell(c, rx, ry, 7, 4.5); c.fillStyle = k % 2 ? "#A69C94" : "#8F857E"; c.fill();
    }
    // altitude sign
    const sx = st.x + st.side * 104, sy = y - 16;
    line(c, sx, sy, sx, sy - 34, 4, "#6B4526");
    c.save(); c.translate(sx, sy - 40);
    rr(c, -24, -10, 48, 20, 4); c.fillStyle = "#9B6A3A"; c.fill();
    c.strokeStyle = "#6B4526"; c.lineWidth = 2; c.stroke();
    A.text(c, FT(st.a) + " FT", 0, 1, 11, "#FFF3D6", { weight: 700 });
    c.restore();
  }
  function drawTrailhead(c, t) {
    // wooden arch
    const y = 8;
    for (const x of [-58, 58]) { line(c, x, y + 10, x, y - 86, 9, "#7A5230"); line(c, x - 3, y + 10, x - 3, y - 86, 3, "#9B6A3A"); }
    c.save(); c.translate(0, y - 86);
    rr(c, -86, -20, 172, 34, 8); c.fillStyle = lin(c, 0, -20, 0, 14, ["#A8743F", "#7A5230"]); c.fill();
    c.strokeStyle = "#5A3A1E"; c.lineWidth = 3; c.stroke();
    A.text(c, "WITCH MOUNTAIN", 0, -3, 17, "#FFE9B8", { weight: 700, stroke: "#4A2C12", strokeW: 4 });
    c.restore();
    // campfire and a tent
    const fx = -150, fy = 30;
    for (let k = 0; k < 5; k++) { const an = (k / 5) * TAU; ell(c, fx + Math.cos(an) * 16, fy + Math.sin(an) * 5, 6, 4); c.fillStyle = "#8F857E"; c.fill(); }
    for (let k = 0; k < 3; k++) { const fh = 16 + Math.sin(t * 11 + k * 2) * 5; c.beginPath(); c.moveTo(fx - 9 + k * 9, fy); c.quadraticCurveTo(fx - 9 + k * 9 + Math.sin(t * 7 + k) * 3, fy - fh * 1.6, fx - 3 + k * 9, fy); c.fillStyle = k === 1 ? "#FFD23F" : "#FF7A2E"; c.fill(); }
    c.beginPath(); c.moveTo(-290, 40); c.lineTo(-240, -30); c.lineTo(-190, 40); c.closePath(); c.fillStyle = lin(c, -290, 0, -190, 0, ["#FF8A5B", "#E0553A"]); c.fill();
    c.beginPath(); c.moveTo(-240, -30); c.lineTo(-226, 40); c.lineTo(-254, 40); c.closePath(); c.fillStyle = "#6E2A1A"; c.fill();
  }

  function drawSummit(c, t, planted, color) {
    const y = -SUMMIT;
    ell(c, 0, y + 12, 96, 26); c.fillStyle = "#C7D6EC"; c.fill();
    ell(c, 0, y + 2, 96, 26); c.fillStyle = rad(c, -30, y - 10, 4, 0, y, 100, ["#FFFFFF", "#EEF4FC", "#D5E2F3"]); c.fill();
    // cairn
    for (const [dx, dy, r] of [[-46, 4, 11], [-34, 5, 9], [-40, -8, 8], [-39, -18, 6]]) { ell(c, dx, y + dy, r * 1.2, r * 0.8); c.fillStyle = "#958D86"; c.fill(); }
    line(c, 58, y + 6, 58, y - 130, 4, "#5A5A68");
    if (planted) {
      const wv = (k) => Math.sin(t * 7 - k * 0.5) * 5;
      c.beginPath(); c.moveTo(60, y - 128);
      for (let k = 0; k <= 6; k++) c.lineTo(60 + k * 11, y - 128 + wv(k) + k * 1.5);
      for (let k = 6; k >= 0; k--) c.lineTo(60 + k * 11, y - 96 + wv(k) - k * 1.5);
      c.closePath(); c.fillStyle = color; c.fill();
      A.text(c, "TOP!", 94, y - 111, 14, "#FFFFFF", { weight: 700 });
    } else {
      // a golden star waits at the top
      const by = y - 60 + Math.sin(t * 3) * 6;
      c.fillStyle = rad(c, 0, by, 0, 0, by, 44, [[0, "rgba(255,230,120,.8)"], [1, "rgba(255,230,120,0)"]]); ell(c, 0, by, 44, 44); c.fill();
      A.goldStar(c, 0, by, 18, t);
    }
  }

  // ---------- particles & effects ----------
  const parts = [];
  function puff(x, a, n, col, spd = 60, life = 0.8, size = 8, grav = -20) {
    for (let k = 0; k < n; k++) {
      const an = Math.random() * TAU, v = spd * (0.4 + Math.random() * 0.8);
      parts.push({ x, a, vx: Math.cos(an) * v, va: Math.abs(Math.sin(an)) * v * 0.7, life, max: life, size: size * (0.6 + Math.random() * 0.8), col, grav, kind: "dot" });
    }
  }
  function sparkle(x, a, n, cols, spd = 140) {
    for (let k = 0; k < n; k++) {
      const an = Math.random() * TAU, v = spd * (0.3 + Math.random());
      parts.push({ x, a, vx: Math.cos(an) * v, va: Math.sin(an) * v, life: 0.9, max: 0.9, size: 4 + Math.random() * 4, col: cols[k % cols.length], grav: -160, kind: "star", rot: Math.random() * TAU });
    }
  }
  function confetti(x, a, n) {
    const cols = ["#FF5A5A", "#FFD23F", "#4CC06A", "#3E8BFF", "#B06BFF", "#FF8FB8"];
    for (let k = 0; k < n; k++) {
      parts.push({ x: x + (Math.random() - 0.5) * 60, a, vx: (Math.random() - 0.5) * 320, va: 180 + Math.random() * 320, life: 2.6, max: 2.6, size: 5 + Math.random() * 4, col: cols[k % cols.length], grav: -260, kind: "paper", rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 14 });
    }
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= 1 - dt * 1.2; p.va += p.grav * dt;
      if (p.kind === "paper") { p.vx *= 1 - dt; p.va = Math.max(p.va, -90); p.rot += p.spin * dt; }
      p.x += p.vx * dt; p.a += p.va * dt;
    }
  }
  function drawParts(c) {
    for (const p of parts) {
      const f = p.life / p.max;
      c.globalAlpha = Math.min(1, f * 1.6);
      if (p.kind === "star") { c.fillStyle = p.col; A.starPath(c, p.x, -p.a, p.size, 4, 0.4, p.rot + (1 - f) * 4); c.fill(); }
      else if (p.kind === "paper") { c.save(); c.translate(p.x, -p.a); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.3 + Math.abs(Math.cos(p.rot * 2)))); c.restore(); }
      else { ell(c, p.x, -p.a, p.size * (1.4 - f * 0.4), p.size * (1.4 - f * 0.4)); c.fillStyle = p.col; c.fill(); }
    }
    c.globalAlpha = 1;
  }
  // a crackly magic bolt from (x0,a0) to (x1,a1)
  function bolt(c, x0, a0, x1, a1, t, col) {
    const n = 9;
    for (const [w, cl] of [[10, rgba(col, 0.3)], [5, col], [2, "#FFFFFF"]]) {
      c.beginPath(); c.moveTo(x0, -a0);
      for (let k = 1; k < n; k++) {
        const f = k / n, j = (Math.sin(t * 90 + k * 12.3) * 14);
        c.lineTo(x0 + (x1 - x0) * f + j * 0.4, -(a0 + (a1 - a0) * f) + j);
      }
      c.lineTo(x1, -a1);
      c.lineWidth = w; c.strokeStyle = cl; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
    }
  }
  function snow(c, w, h, t, amt) {
    if (amt <= 0) return;
    c.fillStyle = `rgba(255,255,255,${0.8 * amt})`;
    for (let k = 0; k < 70; k++) {
      const x = ((k * 97.3 + Math.sin(t * 0.7 + k) * 30 + t * 18) % (w + 40)) - 20;
      const y = ((k * 53.7 + t * (30 + (k % 5) * 8)) % (h + 40)) - 20;
      ell(c, x, y, 1.5 + (k % 3), 1.5 + (k % 3)); c.fill();
    }
  }

  Object.assign(window.WM, {
    STATIONS, STEP, SUMMIT, PEAK, FT, stations, summitS, trailLen: len, at, WITCHES,
    drawBackdrop, drawWorld, frontClouds, drawWitch, cauldron, drawSummit, bolt, snow,
    puff, sparkle, confetti, stepParts, drawParts,
  });
})();
