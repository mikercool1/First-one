"use strict";
// 360 SNOWBOARDING: the Coco Party kids race down Coco Mountain.
// A pseudo-3D (2.5D) downhill: the course is a strip of segments that runs toward the horizon.
// Everything on it (trees, gates, ramps...) is projected with perspective, so it grows as it rushes in.
(() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s) => document.querySelector(s);
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------------------------------------------------------------------------
  // canvas
  // ---------------------------------------------------------------------------
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, HY = 0;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; HY = H * 0.36;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    mountains = null;
  }
  addEventListener("resize", resize);

  // ---------------------------------------------------------------------------
  // riders: the Coco Party cast
  // ---------------------------------------------------------------------------
  const RIDERS = [
    { id: "reuben", name: "REUBEN", tag: "Big Air King" },
    { id: "jonah", name: "JONAH", tag: "Speed Demon" },
    { id: "ellie", name: "ELLIE", tag: "Tiny Shredder" },
    { id: "max", name: "MAX", tag: "Spoon Bandit" },
  ];
  const RIDER_UNITS = { reuben: 134, jonah: 118, ellie: 100, max: 140 }; // how tall each is drawn in its own art
  // pose: { pose: board|air|grab|cheer|crash|idle, crouch, lean, face, t }
  function drawRider(c, id, x, y, px, P) {
    const s = px / RIDER_UNITS[id];
    if (id === "max") {
      const act = P.pose === "cheer" || P.pose === "air" || P.pose === "grab" || P.pose === "crash" ? "happy" : "stand";
      c.save(); c.translate(x, y); c.rotate((P.lean || 0) * 0.22);
      ART.max(c, 0, (P.crouch || 0) * 6, s * 0.95, { t: P.t, act, dir: P.face || 1, expr: P.pose === "crash" ? "O" : "grin", look: [(P.lean || 0) * 0.8, 0] });
      c.restore();
      return;
    }
    const pose = P.pose === "crash" ? "lostMind" : P.pose === "idle" ? "idle" : P.pose;
    KIDS_ART.draw(c, id, x, y, s, { pose, crouch: P.crouch, lean: P.lean, face: P.face || 1, noShadow: true, exp: P.exp }, P.t);
  }
  // On the mountain the rider is seen from behind, riding straight down the hill with the board pointing
  // away from the camera. front: true turns them round to face us (mid-spin, and cheering at the finish).
  const MAX_FIG = { L: 40, T: 38, R: 25, sw: 15, legW: 11, skin: "#F8D4BA", skinD: "#D9A98A", hair: "#C08850", hairD: "#8A5A2C" };
  const MAX_WINTER = { coat: "#D8443B", coatL: "#F06A5E", coatD: "#A8302A", pants: "#C23A33", pantsD: "#8E2622", boot: "#2F3A6B", bootD: "#1E2548",
    hat: "#FFD24A", hatD: "#E0A21A", band: "#2F3A6B", pom: "#FFFFFF", scarf: "#2F3A6B", scarfD: "#1E2548", mitt: "#FFD24A", mittD: "#E0A21A" };
  const figOf = (id) => (id === "max" ? MAX_FIG : KIDS_ART.KIDS[id]);
  const winterOf = (id) => (id === "max" ? MAX_WINTER : KIDS_ART.WINTER[id]);
  function figUnits(id) { const K = figOf(id); return K.L + K.T + K.R * 2.3; }
  function tube(c, pts, w, col, ol) {
    c.lineCap = "round"; c.lineJoin = "round";
    for (const [lw, st] of [[w + 3, ol], [w, col]]) {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); else c.lineTo(pts[1][0], pts[1][1]);
      c.lineWidth = lw; c.strokeStyle = st; c.stroke();
    }
  }
  function blob(c, x, y, rx, ry, fill, ol, lw = 1.4) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); c.fillStyle = fill; c.fill(); if (ol) { c.lineWidth = lw; c.strokeStyle = ol; c.stroke(); } }
  // P: { pose: board|air|grab|crash|cheer, crouch 0..1, lean -1..1, front, squash 0..1, board, yaw (radians), noBoard, t }
  function drawBack(c, id, px, P) {
    const K = figOf(id), Wc = winterOf(id), s = px / figUnits(id), t = P.t || 0;
    const pose = P.pose || "board", ln = clamp(P.lean || 0, -1, 1), front = !!P.front;
    const air = pose === "air" || pose === "grab";
    const feetY = air ? -7 : 0, fx = K.sw * 0.68;
    // the board, pointing down the hill (away from us); it spins flat under the feet
    if (!P.noBoard) {
      const yaw = -Math.PI / 2 + (P.yaw || 0);
      c.save(); c.translate(0, feetY * s + px * (front ? 0.03 : -0.05));
      // a darker copy just below gives the board some thickness
      c.save(); c.translate(0, px * 0.025); c.scale(1, 0.5); c.rotate(yaw); const bl = px * 0.51, bw = px * 0.17; c.beginPath(); c.moveTo(-bl + bw, -bw); c.lineTo(bl - bw, -bw); c.arc(bl - bw, 0, bw, -Math.PI / 2, Math.PI / 2); c.lineTo(-bl + bw, bw); c.arc(-bl + bw, 0, bw, Math.PI / 2, Math.PI * 1.5); c.fillStyle = "#1A2036"; c.fill(); c.restore();
      c.scale(1, 0.5); c.rotate(yaw);
      BOARDS.draw(c, P.board, px * 1.02, px * 0.34, t, true);
      c.restore();
    }
    c.save(); c.scale(s * (P.squash == null ? 1 : P.squash), s);
    const cr = clamp(P.crouch || 0, 0, 1);
    const hipY = feetY - (K.L - 4 - cr * K.L * 0.32);
    // legs: knees bent and pushed out a little
    for (const sd of [-1, 1]) {
      const kx = sd * (fx + 3 + cr * 5), ky = feetY + (hipY - feetY) * 0.5;
      tube(c, [[sd * K.sw * 0.42, hipY], [kx + sd * 3, ky], [sd * fx, feetY - 4]], K.legW, sd > 0 ? Wc.pants : shade(Wc.pants), Wc.pantsD);
      blob(c, sd * fx, feetY - 4, K.legW * 0.85, K.legW * 0.62, Wc.boot, Wc.bootD);
      blob(c, sd * fx, feetY - 9, K.legW * 0.75, K.legW * 0.3, "#FFFFFF", "#D9DEE8", 1);
    }
    c.save(); c.translate(0, hipY); c.rotate(ln * 0.22);
    const T = K.T, sw = K.sw, shY = -T + 7;
    // seat of the pants
    c.beginPath(); c.ellipse(0, 2, sw * 0.95, 8, 0, 0, TAU); c.fillStyle = Wc.pants; c.fill(); c.strokeStyle = Wc.pantsD; c.lineWidth = 1.5; c.stroke();
    // jacket (puffy rows) or Ellie's flared coat
    c.beginPath();
    if (id === "ellie") { c.moveTo(-sw - 1, -T + 1); c.quadraticCurveTo(-sw - 3, -T * 0.4, -sw - 6, 8); c.quadraticCurveTo(0, 12, sw + 6, 8); c.quadraticCurveTo(sw + 3, -T * 0.4, sw + 1, -T + 1); c.quadraticCurveTo(0, -T - 4, -sw - 1, -T + 1); c.closePath(); }
    else { const x0 = -sw - 2, y0 = -T - 1, w = sw * 2 + 4, h = T + 6, r = 11; c.moveTo(x0 + r, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + h, r); c.arcTo(x0 + w, y0 + h, x0, y0 + h, r); c.arcTo(x0, y0 + h, x0, y0, r); c.arcTo(x0, y0, x0 + w, y0, r); c.closePath(); }
    const gr = c.createLinearGradient(-sw, 0, sw, 0); gr.addColorStop(0, Wc.coatL); gr.addColorStop(0.55, Wc.coat); gr.addColorStop(1, Wc.coatD);
    c.fillStyle = gr; c.fill(); c.lineWidth = 1.8; c.strokeStyle = Wc.coatD; c.stroke();
    c.save(); c.clip();
    if (id === "ellie") { c.fillStyle = "#FFFFFF"; c.fillRect(-sw - 8, 4, sw * 2 + 16, 8); }
    else for (let y = -T + 9; y < 4; y += 9) { c.strokeStyle = "rgba(0,0,0,.16)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-sw - 2, y); c.quadraticCurveTo(0, y + 2.5, sw + 2, y); c.stroke(); }
    if (front) { c.strokeStyle = shade(Wc.coatD); c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -T + 2); c.lineTo(0, 6); c.stroke(); }
    else { c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -T + 4); c.lineTo(0, 4); c.stroke(); }
    c.restore();
    // scarf: round the neck, the tail streaming out behind in the wind
    c.beginPath(); c.ellipse(0, -T - 1, sw * 0.8, 4.5, 0, 0, TAU); c.fillStyle = Wc.scarf; c.fill(); c.strokeStyle = Wc.scarfD; c.lineWidth = 1.3; c.stroke();
    const fl = Math.sin(t * 11) * 3, tail = front ? 0.35 : 1;
    c.beginPath(); c.moveTo(sw * 0.2, -T); c.quadraticCurveTo(sw * 0.7 + fl, -T + 8 * tail, sw * 0.9 + fl * 1.4, -T + 20 * tail);
    c.lineTo(sw * 0.9 + fl * 1.4 - 6, -T + 20 * tail + 1); c.quadraticCurveTo(sw * 0.4 + fl, -T + 8 * tail, sw * 0.2 - 5, -T + 1); c.closePath();
    c.fillStyle = Wc.scarf; c.fill(); c.strokeStyle = Wc.scarfD; c.stroke();
    // head
    const R = K.R, hx = ln * R * 0.12;
    c.save(); c.translate(hx, -T - R + 9);
    if (id === "ellie") { // pigtails bounce out both sides
      const bob = Math.sin(t * 9) * 0.15;
      for (const sd of [-1, 1]) { c.save(); c.translate(sd * R * 0.8, -R * 0.15); c.rotate(sd * (0.9 + bob)); blob(c, 0, R * 0.42, R * 0.24, R * 0.48, K.hair, K.hairD, 1.4); c.restore(); }
    }
    for (const sd of [-1, 1]) blob(c, sd * R * 0.93, R * 0.14, R * 0.17, R * 0.24, K.skin, K.skinD, 1.4);
    if (front) {
      const hg = c.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R); hg.addColorStop(0, "#FFF1E6"); hg.addColorStop(1, K.skin);
      blob(c, 0, 0, R, R, hg, K.skinD, 1.8);
      c.fillStyle = K.hair; for (const bx of [-0.7, -0.35, 0, 0.35, 0.7]) { c.beginPath(); c.arc(bx * R, -R * 0.42, R * 0.2, 0, TAU); c.fill(); }
      c.fillStyle = "rgba(255,120,130,.3)"; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * R * 0.52, R * 0.38, R * 0.15, 0, TAU); c.fill(); }
      c.fillStyle = "#2A1A14"; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * R * 0.32, R * 0.08, R * 0.1, R * 0.14, 0, 0, TAU); c.fill(); }
      c.fillStyle = "#FFFFFF"; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * R * 0.32 + R * 0.03, R * 0.03, R * 0.04, 0, TAU); c.fill(); }
      c.beginPath(); c.moveTo(-R * 0.3, R * 0.42); c.quadraticCurveTo(0, R * 0.78, R * 0.3, R * 0.42); c.closePath(); c.fillStyle = "#8A2A2A"; c.fill();
    } else {
      const hg = c.createRadialGradient(-R * 0.3, -R * 0.2, R * 0.1, 0, 0, R * 1.05); hg.addColorStop(0, shade(K.hair, 1.15)); hg.addColorStop(1, K.hair);
      blob(c, 0, 0, R, R, hg, K.hairD, 1.8);
      c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 1.3;
      for (const bx of [-0.5, -0.17, 0.17, 0.5]) { c.beginPath(); c.moveTo(bx * R, -R * 0.3); c.quadraticCurveTo(bx * R * 1.1, R * 0.4, bx * R * 0.9, R * 0.85); c.stroke(); }
    }
    if (id === "max") { c.fillStyle = K.hair; for (const [bx, by] of [[-0.95, 0.05], [-0.85, 0.4], [0.95, 0.05], [0.85, 0.4]]) { c.beginPath(); c.arc(bx * R, by * R, R * 0.2, 0, TAU); c.fill(); } }
    KIDS_ART.beanie(c, Wc, R);
    c.restore();
    // arms and mittens
    const arms = armsFor(pose, ln, sw, shY, t, feetY - hipY, cr);
    for (const sd of [-1, 1]) {
      const [hx2, hy2, ex, ey] = arms[sd < 0 ? 0 : 1];
      tube(c, [[sd * sw * 0.85, shY], [ex, ey], [hx2, hy2]], 8.5, sd > 0 ? Wc.coatD : Wc.coat, shade(Wc.coatD));
      blob(c, sd * sw * 0.85, shY + 1, 7, 7, sd > 0 ? Wc.coat : Wc.coatL, Wc.coatD);
      blob(c, hx2, hy2, 5.6, 5.6, Wc.mitt, Wc.mittD, 1.3);
    }
    c.restore();
    c.restore();
  }
  // hands and elbows for the two arms: [[handX, handY, elbowX, elbowY] left, right]
  function armsFor(pose, ln, sw, shY, t, feet, cr) {
    const out = sw + 22;
    if (pose === "air") return [[-out, shY - 16, -sw - 14, shY - 2], [out, shY - 20, sw + 14, shY - 4]];
    if (pose === "grab") return [[-out, shY - 20, -sw - 14, shY - 6], [sw * 0.7, feet - 10, sw + 10, shY + 16]];
    if (pose === "cheer") { const w = Math.sin(t * 10) * 5; return [[-sw - 12 + w, shY - 34, -sw - 12, shY - 12], [sw + 12 - w, shY - 36, sw + 12, shY - 14]]; }
    if (pose === "crash") { const a = t * 14; return [[-out + Math.sin(a) * 8, shY - 20 + Math.cos(a) * 16, -sw - 10, shY - 4], [out + Math.cos(a) * 8, shY - 20 + Math.sin(a) * 16, sw + 10, shY - 4]]; }
    // riding: arms out for balance, dipping to the side you lean into
    const dip = 12 + cr * 4;
    return [[-out, shY + dip - ln * 14, -sw - 12, shY + 6 - ln * 5], [out, shY + dip + ln * 14, sw + 12, shY + 6 + ln * 5]];
  }
  function shade(col, f = 0.86) {
    const m = /^#(..)(..)(..)$/.exec(col); if (!m) return col;
    const g = (v) => Math.min(255, Math.round(parseInt(v, 16) * f)).toString(16).padStart(2, "0");
    return "#" + g(m[1]) + g(m[2]) + g(m[3]);
  }

  // ---------------------------------------------------------------------------
  // the course: COCO MOUNTAIN
  // ---------------------------------------------------------------------------
  const SEG = 200, DRAW = 150, CAM_H = 900, PLAYER_Z = 1000, RIDER_H = 460;
  const MPH = 70; // world units per second per mph
  const SECTIONS = [
    { key: "ridge", title: "STARTING RIDGE", width: 2300, speed: 40, len: 420 },
    { key: "forest", title: "PINE FOREST", width: 1500, speed: 46, len: 540 },
    { key: "big", title: "BIG MOUNTAIN", width: 2050, speed: 60, len: 720 },
    { key: "canyon", title: "ICE CANYON", width: 1150, speed: 52, len: 520 },
    { key: "village", title: "SKI VILLAGE FINISH", width: 1700, speed: 44, len: 380 },
  ];
  const THEMES = {
    ridge: { snow: "#EEF6FF", snow2: "#E2EEFA", course: "#FFFFFF", course2: "#F4F9FF", edge: "#C9DDF2", sky: ["#2F80ED", "#9FD8FF", "#E8F6FF"] },
    forest: { snow: "#E8F2FB", snow2: "#DCE9F6", course: "#FBFDFF", course2: "#F0F6FD", edge: "#BFD4EA", sky: ["#2A74DA", "#93D0FF", "#E4F4FF"] },
    big: { snow: "#EDF5FF", snow2: "#DDEAF8", course: "#FFFFFF", course2: "#F2F7FE", edge: "#BCD3EC", sky: ["#1F63CC", "#7FC4FF", "#DDF1FF"] },
    canyon: { snow: "#BFE0F5", snow2: "#B0D6EE", course: "#DDF2FF", course2: "#CDEBFD", edge: "#8FC2E6", wall: ["#4F7596", "#7FA6C6", "#B8DAF2"], sky: ["#2C6BC4", "#86C8F2", "#D6EEFF"] },
    village: { snow: "#F4F2FA", snow2: "#E9E6F4", course: "#FFFFFF", course2: "#F6F4FC", edge: "#D2CDE6", sky: ["#3A6FD8", "#A9C9FF", "#FFE3C4"] },
  };
  let segments = [], FINISH_SEG = 0, TOTAL_GATES = 0;
  const secStart = [];

  function buildCourse() {
    segments = [];
    const R = rng(360360);
    let prevW = SECTIONS[0].width;
    SECTIONS.forEach((sec, si) => {
      secStart[si] = segments.length;
      const start = segments.length;
      // curves: alternate straights and sweeping turns, sharper in the canyon, longer on the big mountain
      const cMax = { ridge: 1.6, forest: 2.6, big: 3.2, canyon: 4.6, village: 1.2 }[sec.key];
      let n = 0, dir = R() < 0.5 ? -1 : 1;
      while (n < sec.len) {
        const straight = n < 40 && si === 0 ? 60 : Math.floor(15 + R() * 30);
        const turn = sec.key === "big" ? Math.floor(80 + R() * 70) : sec.key === "canyon" ? Math.floor(30 + R() * 30) : Math.floor(40 + R() * 50);
        for (let k = 0; k < straight && n < sec.len; k++, n++) pushSeg(0, si, sec, prevW, start);
        const c = dir * cMax * (0.55 + R() * 0.45); dir = -dir;
        for (let k = 0; k < turn && n < sec.len; k++, n++) { const u = k / turn, e = u < 0.25 ? easeIO(u / 0.25) : u > 0.75 ? easeIO((1 - u) / 0.25) : 1; pushSeg(c * e, si, sec, prevW, start); }
      }
      prevW = sec.width;
    });
    FINISH_SEG = segments.length - 90;
    for (let i = FINISH_SEG - 30; i < segments.length; i++) segments[i].curve = 0; // straight into the finish
    placeObjects(R);
  }
  function pushSeg(curve, si, sec, prevW, start) {
    const i = segments.length, k = i - start;
    const width = lerp(prevW, sec.width, clamp(k / 40, 0, 1));
    segments.push({ index: i, curve, width, sec: si, theme: THEMES[sec.key], key: sec.key, sprites: [],
      p1: { world: { z: i * SEG }, camera: {}, screen: {} }, p2: { world: { z: (i + 1) * SEG }, camera: {}, screen: {} } });
  }
  function add(i, sp) { if (i >= 0 && i < segments.length) { sp.x = sp.x || 0; segments[i].sprites.push(sp); } }
  function placeObjects(R) {
    TOTAL_GATES = 0;
    const tree = (i, x, s = 1) => add(i, { type: R() < 0.2 ? "pine2" : "pine", x, w: 420 * s, h: 720 * s, cw: 170 * s, ch: 500 * s, hit: "crash" });
    const rock = (i, x, s = 1) => add(i, { type: "rock", x, w: 300 * s, h: 190 * s, cw: 250 * s, ch: 150 * s, hit: "crash" });
    const gate = (i, x, gap = 720) => { add(i, { type: "gate", x, gap, w: gap, h: 420, hit: "gate", col: TOTAL_GATES % 2 ? "#2F6BD6" : "#E8453C" }); TOTAL_GATES++; };
    const ramp = (i, x, size) => add(i, { type: "ramp" + size, x, size, w: [0, 720, 860, 1000][size], h: [0, 220, 320, 465][size], cw: [0, 720, 860, 1000][size], hit: "ramp" });
    const bump = (i, x) => add(i, { type: "bump", x, w: 720, h: 150, cw: 640, hit: "bump" });
    const bank = (i, x) => add(i, { type: "bank", x, w: 820, h: 280, cw: 700, ch: 200, hit: "crash" });
    const fence = (i, x) => add(i, { type: "fence", x, w: 560, h: 170, cw: 540, ch: 120, hit: "crash" });
    SECTIONS.forEach((sec, si) => {
      const a = secStart[si], b = si < SECTIONS.length - 1 ? secStart[si + 1] : segments.length;
      const Wd = (i) => segments[i].width;
      const inside = (i, m = 0.8) => (R() * 2 - 1) * Wd(i) * m;
      // scenery just off the course on both sides
      for (let i = a; i < b; i++) {
        const w = Wd(i);
        if (sec.key === "forest" && i % 2 === 0) { tree(i, -(w + 250 + R() * 1500), 0.9 + R() * 0.4); tree(i, w + 250 + R() * 1500, 0.9 + R() * 0.4); if (i % 4 === 0) { tree(i, -(w + 1800 + R() * 1400), 1.1); tree(i, w + 1800 + R() * 1400, 1.1); } }
        if (sec.key === "ridge" && i % 7 === 0) tree(i, (R() < 0.5 ? -1 : 1) * (w + 300 + R() * 2000), 0.9 + R() * 0.4);
        if (sec.key === "big" && i % 6 === 0) { if (R() < 0.6) tree(i, -(w + 300 + R() * 1800), 1 + R() * 0.3); else rock(i, -(w + 350 + R() * 1200), 1.6); if (R() < 0.6) tree(i, w + 300 + R() * 1800, 1 + R() * 0.3); else rock(i, w + 350 + R() * 1200, 1.6); }
        if (sec.key === "canyon" && i % 9 === 0) { add(i, { type: "icicle", x: -(w * 1.28 + 60), w: 220, h: 480 }); add(i, { type: "icicle", x: w * 1.28 + 60, w: 220, h: 480 }); }
        if (sec.key === "village") {
          if (i % 28 === 0) { add(i, { type: "chalet", x: -(w + 1100 + R() * 500), w: 1200, h: 1000, v: Math.floor(R() * 3) }); add(i, { type: "chalet", x: w + 1100 + R() * 500, w: 1200, h: 1000, v: Math.floor(R() * 3) }); }
          if (i % 10 === 5) { add(i, { type: "lamp", x: -(w + 200), w: 90, h: 560 }); add(i, { type: "lamp", x: w + 200, w: 90, h: 560 }); }
          if (i % 14 === 0) { add(i, { type: "flagpole", x: -(w + 420), w: 200, h: 700, col: ["#FF4F8B", "#FFC83D", "#2F80ED"][i % 3] }); add(i, { type: "flagpole", x: w + 420, w: 200, h: 700, col: ["#2EB872", "#FF4F8B", "#FFC83D"][i % 3] }); }
          if (i > FINISH_SEG - 140 && i < FINISH_SEG + 40 && i % 3 === 0) {
            add(i, { type: "crowd", x: -(w + 260 + R() * 200), w: 520, h: 330, v: i % 5 });
            add(i, { type: "crowd", x: w + 260 + R() * 200, w: 520, h: 330, v: (i + 2) % 5 });
            if (i % 6 === 0) { add(i, { type: "barrier", x: -(w + 80), w: 520, h: 130 }); add(i, { type: "barrier", x: w + 80, w: 520, h: 130 }); }
          }
        }
      }
      // what's on the course itself
      if (sec.key === "ridge") {
        add(a + 6, { type: "banner", text: "START", col: "#2F80ED" });
        for (let i = a + 70; i < b - 20; i += 38 + Math.floor(R() * 20)) tree(i, inside(i, 0.85) || 600, 1);
        for (let i = a + 110; i < b; i += 55) bump(i, inside(i, 0.5));
        for (let i = a + 150; i < b - 40; i += 45) gate(i, inside(i, 0.45));
        for (let i = a + 95; i < b; i += 90) rock(i, inside(i, 0.8));
        ramp(b - 70, 0, 2);
      } else if (sec.key === "forest") {
        for (let i = a + 20; i < b - 10; i += 12 + Math.floor(R() * 8)) { if (i > a + 200 && i < a + 290) continue; tree(i, inside(i, 0.85)); if (R() < 0.35) tree(i + 1, inside(i + 1, 0.85)); }
        // an island of trees splits the run: a ramp on the left, gates on the right
        for (let i = a + 200; i < a + 290; i += 4) tree(i, (R() - 0.5) * 120, 0.95);
        ramp(a + 235, -Wd(a + 235) * 0.55, 1);
        gate(a + 215, Wd(a + 215) * 0.52, 600); gate(a + 250, Wd(a + 250) * 0.52, 600); gate(a + 280, Wd(a + 280) * 0.5, 600);
        for (let i = a + 40; i < b - 20; i += 30) { if (i > a + 195 && i < a + 295) continue; gate(i, inside(i, 0.5), 660); }
        for (let i = a + 60; i < b; i += 75) { if (i > a + 190 && i < a + 300) continue; ramp(i, inside(i, 0.4), 1); }
        for (let i = a + 50; i < b; i += 46) bump(i, inside(i, 0.6));
      } else if (sec.key === "big") {
        for (let i = a + 30; i < b - 20; i += 34 + Math.floor(R() * 16)) bank(i, inside(i, 0.75));
        for (let i = a + 60; i < b - 30; i += 115) ramp(i, inside(i, 0.25), 3);
        for (let i = a + 115; i < b - 30; i += 115) ramp(i, inside(i, 0.5), 2);
        for (let i = a + 20; i < b - 20; i += 40) gate(i, inside(i, 0.5), 760);
        for (let i = a + 45; i < b; i += 60) rock(i, inside(i, 0.85), 1.1);
        for (let i = a + 80; i < b; i += 150) { const side = R() < 0.5 ? -1 : 1; for (let k = 0; k < 3; k++) fence(i + k, side * (Wd(i) * 0.55 + k * 40)); }
        for (let i = a; i < b; i += 5) { if (R() < 0.3) add(i, { type: "fenceside", x: -(Wd(i) + 140), w: 560, h: 150 }); if (R() < 0.3) add(i, { type: "fenceside", x: Wd(i) + 140, w: 560, h: 150 }); }
      } else if (sec.key === "canyon") {
        for (let i = a + 20; i < b - 10; i += 22) { const g = inside(i, 0.5), gap = 520; rock(i, g - gap - 120, 1.2); rock(i, g + gap + 120, 1.2); }
        for (let i = a + 50; i < b - 20; i += 60) ramp(i, inside(i, 0.4), 2);
        for (let i = a + 33; i < b - 10; i += 32) gate(i, inside(i, 0.45), 600);
        for (let i = a + 12; i < b; i += 28) bump(i, inside(i, 0.6));
      } else if (sec.key === "village") {
        for (let i = a + 20; i < FINISH_SEG - 150; i += 30) gate(i, inside(i, 0.45), 700);
        for (let i = a + 30; i < FINISH_SEG - 120; i += 42) bump(i, inside(i, 0.6));
        ramp(FINISH_SEG - 90, 0, 2);
        gate(FINISH_SEG - 45, 0, 900);
        add(FINISH_SEG, { type: "banner", text: "FINISH", col: "#FF4F8B", finish: true });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // sprites: drawn once into little canvases, then scaled
  // ---------------------------------------------------------------------------
  const SPR = {};
  function sprite(key, w, h, fn) {
    const k = 2, c = document.createElement("canvas"); c.width = w * k; c.height = h * k;
    const g = c.getContext("2d"); g.scale(k, k); g.translate(w / 2, h); fn(g, w, h); SPR[key] = c; return c;
  }
  function buildSprites() {
    const pine = (g, w, h, dark) => {
      g.fillStyle = "rgba(40,60,110,.18)"; g.beginPath(); g.ellipse(0, -4, w * 0.36, 10, 0, 0, TAU); g.fill();
      g.fillStyle = "#6E4A30"; g.fillRect(-10, -h * 0.16, 20, h * 0.16);
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const y = -h * 0.12 - t * h * 0.2, ww = w * (0.5 - t * 0.1), hh = h * 0.34;
        g.fillStyle = dark ? ["#1E5A3C", "#22663F", "#277246", "#2E7D4C"][t] : ["#2A7A45", "#2F8A4C", "#36955A", "#3FA262"][t];
        g.beginPath(); g.moveTo(-ww, y); g.lineTo(0, y - hh); g.lineTo(ww, y); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,.95)";
        g.beginPath(); g.moveTo(-ww * 0.9, y - 4); g.quadraticCurveTo(-ww * 0.4, y - hh * 0.35, 0, y - hh * 0.2); g.quadraticCurveTo(ww * 0.4, y - hh * 0.35, ww * 0.9, y - 4); g.quadraticCurveTo(ww * 0.4, y - hh * 0.12, 0, y - hh * 0.05); g.quadraticCurveTo(-ww * 0.4, y - hh * 0.12, -ww * 0.9, y - 4); g.fill();
      }
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.moveTo(-w * 0.08, -h * 0.9); g.lineTo(0, -h); g.lineTo(w * 0.08, -h * 0.9); g.closePath(); g.fill();
    };
    sprite("pine", 210, 360, (g, w, h) => pine(g, w, h, false));
    sprite("pine2", 210, 360, (g, w, h) => pine(g, w, h, true));
    sprite("rock", 150, 95, (g, w, h) => {
      g.fillStyle = "rgba(40,60,110,.2)"; g.beginPath(); g.ellipse(0, -3, w * 0.5, 9, 0, 0, TAU); g.fill();
      g.fillStyle = "#6F7788"; g.beginPath(); g.moveTo(-w * 0.48, -2); g.lineTo(-w * 0.36, -h * 0.62); g.lineTo(-w * 0.06, -h * 0.95); g.lineTo(w * 0.3, -h * 0.78); g.lineTo(w * 0.48, -h * 0.3); g.lineTo(w * 0.44, -2); g.closePath(); g.fill();
      g.fillStyle = "#8C95A8"; g.beginPath(); g.moveTo(-w * 0.36, -h * 0.62); g.lineTo(-w * 0.06, -h * 0.95); g.lineTo(w * 0.1, -h * 0.5); g.lineTo(-w * 0.2, -h * 0.3); g.closePath(); g.fill();
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.66); g.quadraticCurveTo(-w * 0.06, -h * 1.02, w * 0.28, -h * 0.8); g.quadraticCurveTo(0, -h * 0.72, -w * 0.3, -h * 0.66); g.fill();
    });
    sprite("bump", 260, 56, (g, w, h) => {
      // a snow mound outlined in blue, with a painted stripe and marker cones so it shows up on white snow
      g.fillStyle = "rgba(60,90,150,.3)"; g.beginPath(); g.ellipse(0, -3, w * 0.5, 9, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-w * 0.44, -2); g.quadraticCurveTo(0, -h * 1.5, w * 0.44, -2); g.closePath();
      const gr = g.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(1, "#B9D6F2"); g.fillStyle = gr; g.fill();
      g.lineWidth = 3; g.strokeStyle = "#3A6FD8"; g.stroke();
      g.save(); g.clip();
      g.fillStyle = "#9B5CF0"; g.beginPath(); g.moveTo(-w * 0.44, -h * 0.34); g.quadraticCurveTo(0, -h * 1.06, w * 0.44, -h * 0.34); g.lineTo(w * 0.44, -h * 0.18); g.quadraticCurveTo(0, -h * 0.88, -w * 0.44, -h * 0.18); g.closePath(); g.fill();
      g.fillStyle = "#FFD23F"; for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * w * 0.13, -h * 0.58 + Math.abs(k) * h * 0.1 - (k === 0 ? h * 0.04 : 0), 4, 0, TAU); g.fill(); }
      g.restore();
      for (const sd of [-1, 1]) { const x = sd * w * 0.47; g.fillStyle = "#FF7A1F"; g.beginPath(); g.moveTo(x - 9, 0); g.lineTo(x, -h * 0.6); g.lineTo(x + 9, 0); g.closePath(); g.fill(); g.fillStyle = "#FFFFFF"; g.fillRect(x - 5, -h * 0.34, 10, 5); }
    });
    sprite("bank", 410, 140, (g, w, h) => {
      g.fillStyle = "rgba(90,130,190,.28)"; g.beginPath(); g.ellipse(0, -3, w * 0.5, 14, 0, 0, TAU); g.fill();
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.moveTo(-w * 0.5, 0); g.bezierCurveTo(-w * 0.45, -h * 0.9, -w * 0.1, -h * 1.05, w * 0.05, -h * 0.9); g.bezierCurveTo(w * 0.25, -h * 1.05, w * 0.5, -h * 0.6, w * 0.5, 0); g.closePath(); g.fill();
      g.fillStyle = "rgba(150,185,225,.5)"; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w * 0.1, -h * 0.5, w * 0.35, -h * 0.7, w * 0.5, 0); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.ellipse(-w * 0.18, -h * 0.72, w * 0.12, h * 0.08, -0.2, 0, TAU); g.fill();
    });
    const rampSpr = (key, w, h, body, icy) => sprite(key, w, h + 34, (g, ww, hh) => {
      const top = -h, ink = "#16204A", dark = icy ? "#3F8FC0" : shade(body, 0.72);
      g.fillStyle = "rgba(60,90,150,.3)"; g.beginPath(); g.ellipse(0, -3, ww * 0.52, 10, 0, 0, TAU); g.fill();
      // the kicker faces us: bright side walls, a snowy lip, a striped face and big arrows
      g.beginPath(); g.moveTo(-ww * 0.5, 0); g.lineTo(-ww * 0.42, top); g.lineTo(ww * 0.42, top); g.lineTo(ww * 0.5, 0); g.closePath();
      const gr = g.createLinearGradient(0, top, 0, 0); gr.addColorStop(0, icy ? "#CFEFFF" : body); gr.addColorStop(1, dark); g.fillStyle = gr; g.fill();
      g.lineWidth = 4; g.strokeStyle = ink; g.lineJoin = "round"; g.stroke();
      g.save(); g.clip();
      g.fillStyle = "rgba(255,255,255,.28)"; for (let k = -6; k <= 6; k++) { const x = k * ww * 0.12; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + ww * 0.05, 0); g.lineTo(x + ww * 0.05 + h * 0.4, top); g.lineTo(x + h * 0.4, top); g.closePath(); g.fill(); }
      g.restore();
      g.fillStyle = icy ? "#E6F7FF" : "#FFFFFF"; g.beginPath(); g.moveTo(-ww * 0.44, top + h * 0.02); g.quadraticCurveTo(0, top - h * 0.12, ww * 0.44, top + h * 0.02); g.lineTo(ww * 0.43, top + h * 0.2); g.quadraticCurveTo(0, top + h * 0.1, -ww * 0.43, top + h * 0.2); g.closePath(); g.fill(); g.lineWidth = 2.5; g.stroke();
      g.fillStyle = "#FFD23F"; g.strokeStyle = ink; g.lineWidth = 2.5;
      for (let k = -1; k <= 1; k++) { const x = k * ww * 0.25, y = top + h * 0.6; g.beginPath(); g.moveTo(x - ww * 0.08, y + h * 0.22); g.lineTo(x, y - h * 0.18); g.lineTo(x + ww * 0.08, y + h * 0.22); g.lineTo(x, y + h * 0.08); g.closePath(); g.fill(); g.stroke(); }
      for (const sd of [-1, 1]) {
        const x = sd * ww * 0.46; g.fillStyle = ink; g.fillRect(x - 3, top - 34, 6, 34);
        g.fillStyle = sd < 0 ? "#FF4F8B" : "#FFD23F"; g.beginPath(); g.moveTo(x + 3 * sd, top - 34); g.lineTo(x + 30 * sd, top - 26); g.lineTo(x + 3 * sd, top - 17); g.closePath(); g.fill();
      }
    });
    rampSpr("ramp1", 280, 52, "#2EC46A"); rampSpr("ramp2", 330, 90, "#FF8A2A"); rampSpr("ramp3", 390, 148, "#FF4F8B");
    rampSpr("ramp2ice", 330, 90, "#9FD8F7", true);
    sprite("fence", 280, 85, (g, w, h) => {
      g.strokeStyle = "#8A5A2E"; g.lineWidth = 6; [-w * 0.45, 0, w * 0.45].forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -h); g.stroke(); });
      g.fillStyle = "#FF7A1F"; g.fillRect(-w * 0.47, -h * 0.9, w * 0.94, h * 0.62);
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; for (let x = -w * 0.47; x < w * 0.47; x += 12) { g.beginPath(); g.moveTo(x, -h * 0.9); g.lineTo(x + 10, -h * 0.28); g.stroke(); }
    });
    sprite("fenceside", 280, 75, (g, w, h) => {
      g.strokeStyle = "#3A4252"; g.lineWidth = 5; [-w * 0.45, w * 0.45].forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -h); g.stroke(); });
      g.fillStyle = "rgba(255,79,139,.85)"; g.fillRect(-w * 0.47, -h * 0.85, w * 0.94, h * 0.35);
      g.fillStyle = "#FFFFFF"; g.font = "700 20px Fredoka, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("COCO MOUNTAIN", 0, -h * 0.67);
    });
    sprite("icicle", 110, 240, (g, w, h) => {
      g.fillStyle = "#6E93B6"; g.beginPath(); g.moveTo(-w * 0.5, 0); g.lineTo(-w * 0.3, -h * 0.7); g.lineTo(0, -h); g.lineTo(w * 0.35, -h * 0.6); g.lineTo(w * 0.5, 0); g.closePath(); g.fill();
      g.fillStyle = "#D6F0FF"; g.beginPath(); g.moveTo(-w * 0.2, -h * 0.75); g.lineTo(0, -h); g.lineTo(w * 0.1, -h * 0.5); g.closePath(); g.fill();
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.7); g.lineTo(0, -h); g.lineTo(w * 0.35, -h * 0.6); g.lineTo(w * 0.1, -h * 0.66); g.closePath(); g.fill();
    });
    [["#E8453C", "#FFF3D6"], ["#3A6FD8", "#FFF3D6"], ["#2EB872", "#FFF3D6"]].forEach(([roof, wall], v) => sprite("chalet" + v, 600, 500, (g, w, h) => {
      g.fillStyle = "rgba(40,60,110,.18)"; g.beginPath(); g.ellipse(0, -6, w * 0.46, 18, 0, 0, TAU); g.fill();
      g.fillStyle = "#8A5A3C"; g.fillRect(-w * 0.36, -h * 0.5, w * 0.72, h * 0.5);
      g.strokeStyle = "rgba(60,30,15,.35)"; g.lineWidth = 3; for (let y = -h * 0.46; y < 0; y += 16) { g.beginPath(); g.moveTo(-w * 0.36, y); g.lineTo(w * 0.36, y); g.stroke(); }
      g.fillStyle = roof; g.beginPath(); g.moveTo(-w * 0.46, -h * 0.46); g.lineTo(0, -h * 0.92); g.lineTo(w * 0.46, -h * 0.46); g.closePath(); g.fill();
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.moveTo(-w * 0.48, -h * 0.44); g.lineTo(0, -h * 0.96); g.lineTo(w * 0.48, -h * 0.44); g.lineTo(w * 0.42, -h * 0.42); g.lineTo(0, -h * 0.86); g.lineTo(-w * 0.42, -h * 0.42); g.closePath(); g.fill();
      g.fillStyle = "#FFD98A"; [[-w * 0.22, -h * 0.34], [w * 0.14, -h * 0.34], [-w * 0.04, -h * 0.66]].forEach(([x, y]) => { g.fillRect(x, y, w * 0.1, h * 0.12); });
      g.fillStyle = "#5A3A22"; g.fillRect(-w * 0.05, -h * 0.2, w * 0.1, h * 0.2);
      g.fillStyle = "#6F7788"; g.fillRect(w * 0.22, -h * 0.9, w * 0.07, h * 0.24); g.fillStyle = "#FFFFFF"; g.fillRect(w * 0.21, -h * 0.92, w * 0.09, h * 0.04);
      // string lights
      const cols = ["#FF4F8B", "#FFC83D", "#2F80ED", "#2EB872"];
      for (let k = 0; k < 12; k++) { const u = k / 11, x = -w * 0.44 + u * w * 0.88, y = -h * 0.46 - (1 - Math.abs(u - 0.5) * 2) * h * 0.44 + 10; g.fillStyle = cols[k % 4]; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
    }));
    sprite("lamp", 60, 280, (g, w, h) => {
      g.fillStyle = "#2B2F3A"; g.fillRect(-4, -h, 8, h);
      g.fillStyle = "rgba(255,217,138,.35)"; g.beginPath(); g.arc(0, -h + 14, 26, 0, TAU); g.fill();
      g.fillStyle = "#FFD98A"; g.beginPath(); g.arc(0, -h + 14, 11, 0, TAU); g.fill();
      g.fillStyle = "#2B2F3A"; g.fillRect(-14, -h, 28, 6);
    });
    ["#FF4F8B", "#FFC83D", "#2F80ED", "#2EB872"].forEach((col) => sprite("flag" + col, 100, 350, (g, w, h) => {
      g.fillStyle = "#C9CED8"; g.fillRect(-3, -h, 6, h);
      g.fillStyle = col; g.beginPath(); g.moveTo(3, -h); g.quadraticCurveTo(w * 0.35, -h + 18, w * 0.48, -h + 30); g.lineTo(3, -h + 70); g.closePath(); g.fill();
    }));
    sprite("barrier", 260, 65, (g, w, h) => {
      g.fillStyle = "#2F80ED"; g.fillRect(-w * 0.5, -h, w, h * 0.7);
      g.fillStyle = "#FFFFFF"; g.font = "700 22px Fredoka, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("360 SNOWBOARDING", 0, -h * 0.64);
      g.fillStyle = "#16204A"; g.fillRect(-w * 0.5, -h * 0.3, 8, h * 0.3); g.fillRect(w * 0.5 - 8, -h * 0.3, 8, h * 0.3);
    });
    // cheering crowds in winter clothes
    for (let v = 0; v < 5; v++) sprite("crowd" + v, 260, 165, (g, w, h) => {
      const R = rng(99 + v * 17);
      const coats = ["#FF4F8B", "#2F80ED", "#FFC83D", "#2EB872", "#8A5AC8", "#FF7A1F", "#E8453C"], skins = ["#FFE1CF", "#F4C7A1", "#C98A5E", "#8A5A3C"];
      for (let k = 0; k < 5; k++) {
        const x = -w * 0.4 + k * w * 0.2 + (R() - 0.5) * 10, s = 0.85 + R() * 0.3, col = coats[Math.floor(R() * coats.length)];
        g.save(); g.translate(x, 0); g.scale(s, s);
        g.fillStyle = col; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-15, -70); g.quadraticCurveTo(0, -80, 15, -70); g.lineTo(18, 0); g.closePath(); g.fill();
        g.strokeStyle = col; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(-12, -62); g.lineTo(-26, -100); g.moveTo(12, -62); g.lineTo(26, -98); g.stroke();
        g.fillStyle = skins[Math.floor(R() * skins.length)]; g.beginPath(); g.arc(0, -92, 16, 0, TAU); g.fill();
        g.fillStyle = coats[Math.floor(R() * coats.length)]; g.beginPath(); g.arc(0, -98, 16, Math.PI, TAU); g.fill(); g.beginPath(); g.arc(0, -116, 6, 0, TAU); g.fill();
        g.fillStyle = "#2B2F3A"; g.beginPath(); g.arc(-5, -92, 2, 0, TAU); g.arc(5, -92, 2, 0, TAU); g.fill(); g.beginPath(); g.arc(0, -86, 5, 0, Math.PI); g.fill();
        g.restore();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // game state
  // ---------------------------------------------------------------------------
  let rider = "reuben", board = "fire", boardIdx = 0;
  try { rider = localStorage.getItem("snow360.rider") || rider; board = localStorage.getItem("snow360.board") || board; } catch (e) { /* ignore */ }
  if (window.RosenbergBridge && RosenbergBridge.player && RIDERS.some((r) => r.id === RosenbergBridge.player)) rider = RosenbergBridge.player;
  boardIdx = Math.max(0, BOARDS.LIST.findIndex((b) => b.id === board));

  let mode = "menu"; // menu | countdown | race | finish
  const P = {};
  function resetRace() {
    Object.assign(P, {
      z: 0, x: 0, vx: 0, v: 18 * MPH, steer: 0, alt: 0, vy: 0, air: false, airT: 0, rot: 0, grab: 0, grabbed: false,
      crash: 0, invuln: 0, landT: 0, wobble: 0, face: 1, score: 0, time: 0, top: 0, gates: 0, best: null, bestPts: 0,
      sec: -1, trail: [], lastTrailZ: 0, lastSeg: 0, finished: false, finishT: 0, pre: 0,
    });
    parts.length = 0; flakes.length = 0; boardFly = null; skyX = 0;
  }
  const input = { id: null, x0: 0, x: 0, t0: 0, moved: false, steer: 0, keyL: false, keyR: false, taps: [] };
  const parts = [], flakes = [];
  let boardFly = null, skyX = 0, shake = 0, mountains = null, countT = 0;

  // ---------------------------------------------------------------------------
  // sound (all generated; tiny and optional)
  // ---------------------------------------------------------------------------
  let AC = null, master = null, slide = null, muted = false;
  function audio() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return AC; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
      const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.6;
      const g = AC.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(master); src.start();
      slide = { f, g };
    } catch (e) { AC = null; }
    return AC;
  }
  function tone(freq, dur, type = "sine", vol = 0.2, when = 0, f2 = null) {
    if (!AC || muted) return;
    const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function poof(vol = 0.3, dur = 0.35, freq = 700) {
    if (!AC || muted) return;
    const t = AC.currentTime, s = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; const g = AC.createGain(); g.gain.value = vol;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const SFX = {
    jump: () => tone(260, 0.25, "triangle", 0.15, 0, 620),
    land: () => { poof(0.35, 0.25, 500); tone(90, 0.12, "sine", 0.25); },
    gate: () => { tone(988, 0.12, "triangle", 0.14); tone(1319, 0.16, "triangle", 0.12, 0.08); },
    trick: (big) => [523, 659, 784, 1047, big ? 1319 : 0].forEach((f, i) => f && tone(f, 0.18, "square", 0.06, i * 0.07)),
    crash: () => { poof(0.5, 0.6, 900); tone(300, 0.4, "sine", 0.15, 0.1, 80); },
    whoosh: () => tone(420, 0.3, "sawtooth", 0.05, 0, 1400),
    beep: (hi) => tone(hi ? 1046 : 523, hi ? 0.4 : 0.18, "square", 0.08),
    finish: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.16, "triangle", 0.1, i * 0.12)); for (let k = 0; k < 40; k++) setTimeout(() => poof(0.06, 0.05, 2500), Math.random() * 1600); },
  };

  // ---------------------------------------------------------------------------
  // input: drag anywhere to steer, quick tap to jump
  // ---------------------------------------------------------------------------
  cv.addEventListener("pointerdown", (e) => {
    audio();
    if (mode !== "race" && mode !== "countdown") return;
    if (input.id == null) { input.id = e.pointerId; input.x0 = input.x = e.clientX; input.t0 = performance.now(); input.moved = false; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    else input.taps.push({ id: e.pointerId, t0: performance.now(), x: e.clientX }); // a second finger: jump on release
  });
  cv.addEventListener("pointermove", (e) => {
    if (e.pointerId !== input.id) return;
    input.x = e.clientX;
    if (Math.abs(input.x - input.x0) > 12) input.moved = true;
  });
  const endPtr = (e) => {
    if (e.pointerId === input.id) {
      if (!input.moved && performance.now() - input.t0 < 260) tap();
      input.id = null; input.moved = false;
    } else {
      const k = input.taps.findIndex((q) => q.id === e.pointerId);
      if (k >= 0) { if (performance.now() - input.taps[k].t0 < 350) tap(); input.taps.splice(k, 1); }
    }
  };
  cv.addEventListener("pointerup", endPtr); cv.addEventListener("pointercancel", endPtr);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") input.keyL = true;
    if (e.key === "ArrowRight" || e.key === "d") input.keyR = true;
    if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); audio(); tap(); }
    if ((e.key === "t" || e.key === "x" || e.key === "Shift") && !e.repeat) { audio(); trick(); }
  });
  addEventListener("keyup", (e) => { if (e.key === "ArrowLeft" || e.key === "a") input.keyL = false; if (e.key === "ArrowRight" || e.key === "d") input.keyR = false; });
  function steerInput() {
    if (input.keyL || input.keyR) return (input.keyR ? 1 : 0) - (input.keyL ? 1 : 0);
    if (input.id != null) return clamp((input.x - input.x0) / (Math.min(W, 900) * 0.2), -1, 1);
    return 0;
  }
  // the TRICK button: on the ground it jumps; in the air each press adds a full 360.
  // A spin is only taken if it can finish before touching down, so the button never makes you crash.
  const SPIN_RATE = 1000;
  function airLeft() { const g = 3000; return (P.vy + Math.sqrt(Math.max(0, P.vy * P.vy + 2 * g * P.alt))) / g; }
  function trick() {
    if (mode !== "race" || P.crash > 0 || P.finished) return;
    const b = $("#trickBtn"); b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 120);
    if (!P.air) { P.pre = 0.08; return; }
    const dir = P.spinDir || (P.steer < -0.2 ? -1 : 1), goal = (P.spinGoal == null ? Math.round(P.rot / 360) * 360 : P.spinGoal) + dir * 360;
    if (Math.abs(goal - P.rot) / SPIN_RATE < airLeft() - 0.05) { P.spinGoal = goal; P.spinDir = dir; SFX.whoosh && SFX.whoosh(); }
    else if (!P.grabbed) { P.grab = 0.6; P.grabbed = true; } // no time to spin: grab the board instead
  }
  const trickBtn = $("#trickBtn");
  trickBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); audio(); trick(); });
  function tap() {
    if (mode !== "race" || P.crash > 0 || P.finished) return;
    if (!P.air) { P.pre = 0.08; } // a quick crouch, then the ollie
    else if (!P.grabbed && P.airT > 0.2) { P.grab = 0.6; P.grabbed = true; }
  }

  // ---------------------------------------------------------------------------
  // physics
  // ---------------------------------------------------------------------------
  const segAt = (z) => segments[clamp(Math.floor(z / SEG), 0, segments.length - 1)];
  function launch(vy, kind) {
    P.air = true; P.vy = vy; P.airT = 0; P.rot = 0; P.grabbed = false; P.grab = 0; P.kind = kind; P.spinGoal = null; P.spinDir = 0;
    SFX.jump();
    if (kind !== "ollie") burst(0, 10, "#FFFFFF");
  }
  function update(dt) {
    const pz = P.z + PLAYER_Z, seg = segAt(pz), sec = SECTIONS[seg.sec];
    // steering with momentum: the board eases into turns, and gets twitchier-but-looser at speed
    const sp = P.v / (80 * MPH);
    const target = steerInput();
    P.steer += (target - P.steer) * Math.min(1, dt * (P.air ? 12 : 7));
    if (mode === "race" && !P.finished && P.crash <= 0) {
      P.time += dt;
      if (!P.air) {
        const maxLat = 2300 + sp * 900, resp = lerp(4.2, 2.4, sp);
        P.vx += (P.steer * maxLat - P.vx) * Math.min(1, dt * resp);
      } else P.vx += (P.steer * 700 - P.vx) * Math.min(1, dt * 1.2); // a little air control
      // sweeping turns push you to the outside
      P.x -= seg.curve * sp * 330 * dt;
      P.x += P.vx * dt;
      // speed: each part of the mountain has its own pace; carving hard and deep powder slow you down
      const off = Math.abs(P.x) > seg.width;
      let goal = sec.speed * MPH * (off ? 0.55 : 1) * (1 - Math.abs(P.steer) * 0.12);
      if (P.air) goal = P.v;
      P.v += (goal - P.v) * Math.min(1, dt * (goal > P.v ? (P.v < 30 * MPH ? 1.1 : 0.5) : 0.9)); // gets back up to speed quickly after a spill
      P.v = clamp(P.v, 12 * MPH, 80 * MPH);
      if (off && !P.air && Math.random() < 0.6) spray(Math.sign(P.x) * -1, 2, true);
      // canyon walls bounce you back; elsewhere the deep woods stop you
      const wall = seg.key === "canyon" ? seg.width * 1.22 : seg.width + 2600;
      if (Math.abs(P.x) > wall) { P.x = Math.sign(P.x) * wall; P.vx = -P.vx * 0.4; if (seg.key === "canyon") { shake = Math.max(shake, 6); poof(0.2, 0.2, 400); P.v *= 0.9; } }
      if (P.pre > 0) { P.pre -= dt; if (P.pre <= 0 && !P.air) launch(760, "ollie"); }
    } else if (P.finished) {
      P.v = Math.max(0, P.v - dt * 20 * MPH); P.vx *= Math.pow(0.1, dt); P.x += P.vx * dt;
    } else if (P.crash > 0) {
      P.v = Math.max(8 * MPH, P.v - dt * 30 * MPH);
    } else if (mode === "countdown") P.v = 0;
    if (mode === "countdown") P.v = 0;

    const prevZ = P.z;
    P.z += P.v * dt;
    P.top = Math.max(P.top, P.v / MPH);

    // airtime, spins and landing
    if (P.air) {
      P.airT += dt; P.vy -= 3000 * dt; P.alt += P.vy * dt;
      if (P.spinGoal != null) { // a TRICK-button spin plays out by itself
        const d = P.spinGoal - P.rot; P.rot += Math.sign(d) * Math.min(Math.abs(d), SPIN_RATE * dt);
        if (Math.abs(P.spinGoal - P.rot) < 0.5) { P.rot = P.spinGoal; P.spinGoal = null; }
      } else P.rot += P.steer * 760 * dt; // drag left/right in the air to spin
      // let go and the rider straightens out by themselves, so landings stay easy for little kids
      if (P.spinGoal == null && Math.abs(P.steer) < 0.2 && P.rot) { const goal = Math.round(P.rot / 180) * 180, d = goal - P.rot; P.rot += Math.sign(d) * Math.min(Math.abs(d), 540 * dt); }
      if (P.grab > 0) P.grab -= dt;
      if (P.alt <= 0) land();
    }
    if (P.landT > 0) P.landT -= dt;
    if (P.wobble > 0) P.wobble -= dt;
    if (P.invuln > 0) P.invuln -= dt;
    if (P.crash > 0) {
      P.crash -= dt;
      if (P.crash <= 0) { P.invuln = 1.6; P.rot = 0; boardFly = null; }
    }
    // what did we just ride past?
    if (mode === "race") collide(prevZ + PLAYER_Z, P.z + PLAYER_Z);

    // section banners
    if (seg.sec !== P.sec) {
      P.sec = seg.sec;
      if (mode === "race") showSection(seg.sec);
    }
    // finish line
    if (!P.finished && mode === "race" && P.z + PLAYER_Z >= FINISH_SEG * SEG) finish();
    if (P.finished) { P.finishT += dt; if (P.finishT > 2.3 && $("#finishScreen").hidden) showFinish(); }

    // board trail: remember where the board has been
    if (!P.air && P.crash <= 0 && P.z + PLAYER_Z - P.lastTrailZ > 70) { P.trail.push({ x: P.x, z: P.z + PLAYER_Z }); P.lastTrailZ = P.z + PLAYER_Z; if (P.trail.length > 90) P.trail.shift(); }
    // carving spray
    if (!P.air && P.crash <= 0 && mode === "race" && Math.abs(P.steer) > 0.35 && P.v > 20 * MPH) spray(-Math.sign(P.steer), Math.ceil(Math.abs(P.steer) * 3 * (0.6 + sp)));
    // sky moves on curves
    skyX += seg.curve * sp * dt * 0.02;
    // sound
    if (slide) { const on = mode === "race" && !P.air && P.crash <= 0 && !muted; slide.g.gain.value = on ? 0.04 + sp * 0.12 + Math.abs(P.steer) * 0.08 : 0; slide.f.frequency.value = 500 + sp * 1200; }
    // particles
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.r += (p.grow || 0) * dt; if (p.life <= 0) parts.splice(i, 1); }
    if (boardFly) { boardFly.x += boardFly.vx * dt; boardFly.y += boardFly.vy * dt; boardFly.vy += 1500 * dt; boardFly.rot += boardFly.vr * dt; }
    shake = Math.max(0, shake - dt * 40);
  }
  function land() {
    if (P.spinGoal != null) { P.rot = P.spinGoal; P.spinGoal = null; } // finish the last few degrees
    P.air = false; P.alt = 0; P.vy = 0;
    const turns = P.rot / 360, a = ((P.rot % 360) + 360) % 360;
    const off = Math.min(a, 360 - a, Math.abs(a - 180));
    const spun = Math.round(Math.abs(P.rot) / 180) * 180;
    const big = P.airT > 1.1;
    if (off > 72) return wipeout("BAD LANDING");
    let pts = 0, name = null, cls = "", sub = [];
    if (spun >= 180) { name = String(spun); pts += { 180: 200, 360: 500, 540: 800, 720: 1200, 900: 1600 }[spun] || 2000; }
    if (P.grabbed) { pts += 250; sub.push("GRAB"); if (!name) name = "GRAB"; }
    if (big) { pts += 300; sub.push("BIG AIR"); if (!name) name = "BIG AIR"; }
    if (off < 16 && (spun >= 180 || big || P.grabbed)) { pts += 150; sub.push("PERFECT LANDING"); }
    else if (off < 40) pts += 50;
    else { P.wobble = 0.6; P.v *= 0.8; sub.push("WOBBLY!"); }
    if (P.kind === "bump" && !name) { pts += 50; name = null; }
    P.rot = 0; P.landT = 0.3;
    SFX.land(); burst(0, 16, "#FFFFFF"); shake = Math.max(shake, big ? 8 : 4);
    if (name) {
      if (spun === 360) cls = "gold";
      else if (spun >= 540) cls = "pink";
      const label = spun >= 180 ? name + "!" : name;
      call(label, sub.filter((s) => s !== name).join(" · ") + (pts ? `  +${pts}` : ""), cls);
      SFX.trick(spun >= 360);
      if (spun === 360) { burst(0, 40, "#FFD23F"); shake = 10; }
      if (pts > P.bestPts) { P.bestPts = pts; P.best = spun >= 180 ? `${spun}${P.grabbed ? " + GRAB" : ""}` : name; }
      P.v = Math.min(80 * MPH, P.v + 3 * MPH);
    } else if (P.kind === "ramp" || P.kind === "ollie" && P.airT > 0.4) { if (off < 16 && P.kind === "ramp") { call("PERFECT LANDING", "+150", "blue"); pts += 150; } }
    addScore(pts);
  }
  function wipeout(why) {
    P.crash = 1.25; P.air = false; P.alt = 0; P.vy = 0; P.grab = 0; P.v = Math.max(12 * MPH, P.v * 0.3);
    call("WIPEOUT!", why || "", "pink");
    SFX.crash(); shake = 14;
    burst(0, 50, "#FFFFFF", true);
    boardFly = { x: 0, y: 0, vx: (Math.random() < 0.5 ? -1 : 1) * 260, vy: -700, rot: 0, vr: 14 };
  }
  function collide(z0, z1) {
    const i0 = Math.floor(z0 / SEG), i1 = Math.floor(z1 / SEG);
    for (let i = i0; i <= i1; i++) {
      const seg = segments[i]; if (!seg) continue;
      const sz = i * SEG;
      if (!(sz > z0 - 1 && sz <= z1)) continue; // crossed the front of this segment this frame
      for (const s of seg.sprites) {
        if (!s.hit || s.done) continue;
        const dx = Math.abs(P.x - s.x);
        if (s.hit === "gate") {
          s.done = true;
          if (dx < s.gap / 2) { P.gates++; addScore(100); call("GATE +100", "", "blue"); SFX.gate(); s.flash = 1; }
          continue;
        }
        const reach = (s.cw || s.w) / 2 + (s.hit === "crash" ? 60 : 110); // forgiving on obstacles, generous on ramps
        if (dx > reach) continue;
        if (s.hit === "ramp") { if (!P.air && P.crash <= 0) { s.done = true; launch([0, 1050, 1500, 2050][s.size] * (0.8 + (P.v / (80 * MPH)) * 0.5), "ramp"); } continue; }
        if (s.hit === "bump") { if (!P.air && P.crash <= 0) { s.done = true; launch(600, "bump"); } continue; }
        if (s.hit === "crash" && P.crash <= 0 && P.invuln <= 0 && P.alt < (s.ch || 200)) { s.done = true; P.x += (P.x < s.x ? -1 : 1) * 120; wipeout(); }
      }
    }
  }
  function addScore(n) { if (n) P.score += n; }

  // ---------------------------------------------------------------------------
  // effects
  // ---------------------------------------------------------------------------
  let riderScreen = { x: 0, y: 0, px: 100 };
  function spray(dir, n, powder) {
    for (let k = 0; k < n; k++) parts.push({ x: riderScreen.x + dir * riderScreen.px * 0.3 + (Math.random() - 0.5) * 20, y: riderScreen.y - 4, vx: dir * (120 + Math.random() * 220) * (powder ? 0.6 : 1), vy: -80 - Math.random() * 160, g: 700, r: 3 + Math.random() * 4, grow: 6, life: 0.45 + Math.random() * 0.3, max: 0.7, col: "#FFFFFF" });
  }
  function burst(dx, n, col, big) {
    for (let k = 0; k < n; k++) { const a = Math.random() * TAU, s = (big ? 200 : 120) + Math.random() * (big ? 380 : 220); parts.push({ x: riderScreen.x + dx, y: riderScreen.y - 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5 - (big ? 120 : 60), g: 260, r: (big ? 8 : 4) + Math.random() * (big ? 12 : 6), grow: big ? 30 : 14, life: 0.6 + Math.random() * (big ? 0.8 : 0.4), max: 1.2, col }); }
  }
  const callEl = $("#call");
  let callLock = 0;
  function call(text, sub = "", cls = "") {
    callEl.className = ""; void callEl.offsetWidth;
    callEl.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ""}`;
    callEl.className = "show " + cls;
  }
  function showSection(i) {
    const el = $("#section"); el.innerHTML = `<small>SECTION ${i + 1}</small>${SECTIONS[i].title}`;
    el.classList.add("show"); clearTimeout(showSection.t); showSection.t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ---------------------------------------------------------------------------
  // rendering
  // ---------------------------------------------------------------------------
  let camDepth = 0.84;
  function project(p, cx, cy, cz, width) {
    p.camera.x = -cx; p.camera.y = -cy; p.camera.z = p.world.z - cz;
    const sc = camDepth / p.camera.z;
    p.screen.scale = sc;
    p.screen.x = W / 2 + sc * p.camera.x * W / 2;
    p.screen.y = HY - sc * p.camera.y * H / 2;
    p.screen.w = sc * width * W / 2;
  }
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
  function buildMountains() {
    mountains = [];
    [[0.55, 7, "#B9CDE6", "#FFFFFF", 0.3], [0.42, 9, "#8FAFD6", "#F4FAFF", 0.55]].forEach(([hgt, n, col, cap, par], layer) => {
      const R = rng(7 + layer * 31), pts = [];
      for (let k = 0; k <= n * 2; k++) pts.push([k / (n * 2), R() * hgt * (k % 2 ? 1 : 0.55) + hgt * 0.25]);
      mountains.push({ pts, col, cap, par });
    });
  }
  function drawBackground(theme, bigPeak) {
    const g = ctx.createLinearGradient(0, 0, 0, HY + 20);
    g.addColorStop(0, theme.sky[0]); g.addColorStop(0.7, theme.sky[1]); g.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, HY + H * 0.2 + 20);
    // sun and clouds
    ctx.fillStyle = "rgba(255,250,220,.9)"; ctx.beginPath(); ctx.arc(W * 0.8 - skyX * W * 0.2 % W, HY * 0.3, Math.min(W, H) * 0.05, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (let k = 0; k < 5; k++) { const x = ((k * 0.27 - skyX * 0.4) % 1.3 + 1.3) % 1.3 * W * 1.2 - W * 0.1, y = HY * (0.15 + (k % 3) * 0.12), r = 26 + (k % 2) * 12; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r, y + 6, r * 0.8, 0, TAU); ctx.arc(x - r, y + 8, r * 0.7, 0, TAU); ctx.fill(); }
    if (!mountains) buildMountains();
    mountains.forEach((m, li) => {
      const off = ((skyX * m.par) % 1 + 1) % 1, hs = HY * (li === 1 && bigPeak ? 1.25 : 1);
      for (const shift of [-1, 0, 1]) {
        ctx.fillStyle = m.col; ctx.beginPath(); ctx.moveTo((shift - off) * W * 1.2, HY + 2);
        m.pts.forEach(([u, h]) => ctx.lineTo((u + shift - off) * W * 1.2, HY - h * hs));
        ctx.lineTo((1 + shift - off) * W * 1.2, HY + 2); ctx.closePath(); ctx.fill();
        // snowy caps
        ctx.fillStyle = m.cap;
        for (let k = 1; k < m.pts.length - 1; k += 2) { const [u, h] = m.pts[k], x = (u + shift - off) * W * 1.2, y = HY - h * hs, d = W * 1.2 / (m.pts.length - 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d * 0.35, y + h * hs * 0.28); ctx.lineTo(x - d * 0.1, y + h * hs * 0.22); ctx.lineTo(x + d * 0.08, y + h * hs * 0.3); ctx.lineTo(x + d * 0.35, y + h * hs * 0.26); ctx.closePath(); ctx.fill(); }
      }
    });
    ctx.fillStyle = theme.snow2; ctx.fillRect(-W * 0.2, HY, W * 1.4, H - HY + H * 0.2);
  }
  function drawSprite(s, x, y, scale, t) {
    const unit = scale * W / 2;
    if (s.type === "gate") {
      const flash = s.flash ? (s.flash -= 0.02, s.flash) : 0;
      for (const sd of [-1, 1]) {
        const px = x + sd * s.gap / 2 * unit, h = s.h * unit, w = 120 * unit;
        ctx.fillStyle = "#EDEDED"; ctx.fillRect(px - Math.max(1, 5 * unit), y - h, Math.max(2, 10 * unit), h);
        const wv = Math.sin(t * 6 + sd) * 0.15;
        ctx.fillStyle = flash > 0 ? "#FFD23F" : s.col; ctx.beginPath(); ctx.moveTo(px, y - h); ctx.quadraticCurveTo(px - sd * w * (0.6 + wv), y - h * 0.9, px - sd * w, y - h * 0.8); ctx.lineTo(px, y - h * 0.6); ctx.closePath(); ctx.fill();
      }
      return;
    }
    if (s.type === "banner") {
      const w = (s.w0 || 0), left = x - w, right = x + w, h = 950 * unit, bh = 180 * unit;
      ctx.fillStyle = "#2B2F3A"; ctx.fillRect(left - 8 * unit, y - h, 16 * unit + 1, h); ctx.fillRect(right - 8 * unit, y - h, 16 * unit + 1, h);
      ctx.fillStyle = s.col; ctx.fillRect(left, y - h, right - left, bh);
      if (s.finish) { const n = 16, cw = (right - left) / n; for (let k = 0; k < n; k++) { ctx.fillStyle = k % 2 ? "#16204A" : "#FFFFFF"; ctx.fillRect(left + k * cw, y - h + bh, cw, bh * 0.25); ctx.fillStyle = k % 2 ? "#FFFFFF" : "#16204A"; ctx.fillRect(left + k * cw, y - h + bh * 1.25, cw, bh * 0.25); } }
      ctx.fillStyle = "#FFFFFF"; ctx.font = `400 ${Math.max(8, bh * 0.7)}px "Lilita One", Fredoka, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.text, x, y - h + bh * 0.52);
      return;
    }
    let key = s.type;
    if (s.type === "chalet") key = "chalet" + (s.v || 0);
    if (s.type === "crowd") key = "crowd" + (s.v || 0);
    if (s.type === "flagpole") key = "flag" + s.col;
    if (s.type === "ramp2" && s.icy) key = "ramp2ice";
    const img = SPR[key]; if (!img) return;
    const w = s.w * unit, h = s.h * unit * (s.type === "crowd" ? 1 + Math.abs(Math.sin(t * 6 + s.x)) * 0.04 : 1);
    if (w < 1.5) return;
    ctx.drawImage(img, x - w / 2, y - h, w, h);
  }
  function drawRiderAt(t) {
    const sc = camDepth / PLAYER_Z, px = RIDER_H * sc * H / 2 * (1 + Math.min(P.alt, 800) / 3000);
    const x = riderScreen.x, groundY = riderScreen.y, lift = Math.min(P.alt, 1000) * sc * H / 2 * 0.62;
    riderScreen.px = px;
    // shadow stays on the snow and shrinks as you fly
    const shs = Math.max(0.35, 1 - P.alt / 1400);
    ctx.fillStyle = `rgba(40,60,110,${0.28 * shs})`; ctx.beginPath(); ctx.ellipse(x, groundY, px * 0.5 * shs, px * 0.09 * shs, 0, 0, TAU); ctx.fill();
    if (P.invuln > 0 && Math.floor(P.invuln * 12) % 2 === 0) return;
    const y = groundY - lift;
    ctx.save(); ctx.translate(x, y);
    const crashing = P.crash > 0;
    let lean = P.steer, tilt = P.steer * 0.16, pose = "board", crouch = 0.25 + Math.abs(P.steer) * 0.35;
    if (P.pre > 0 || P.landT > 0) crouch = 1;
    if (P.air) { pose = P.grab > 0 ? "grab" : "air"; tilt = Math.sin(P.airT * 3) * 0.12 + P.steer * 0.1; lean = P.steer * 0.5; }
    if (crashing) { pose = "crash"; ctx.rotate((1.25 - P.crash) * 9); }
    if (P.finished) { pose = "cheer"; lean = 0; tilt = 0; }
    if (P.wobble > 0) ctx.rotate(Math.sin(P.wobble * 30) * 0.12);
    if (mode === "countdown") { crouch = 0.4; lean = 0; }
    ctx.rotate(tilt);
    // spins: the board turns flat under the feet; the body narrows side-on and shows its face half way round
    const ang = P.rot * Math.PI / 180, cs = Math.cos(ang);
    const front = P.finished || cs < 0;
    const yaw = P.air ? ang : P.steer * 0.35;
    drawBack(ctx, rider, px, { pose, crouch, lean, front, squash: P.air ? 0.45 + 0.55 * Math.abs(cs) : 1, board, yaw: P.finished ? 0 : yaw, noBoard: crashing && boardFly, t });
    ctx.restore();
    if (crashing && boardFly) {
      ctx.save(); ctx.translate(x + boardFly.x, groundY + boardFly.y); ctx.rotate(boardFly.rot); ctx.scale(1, 0.5); BOARDS.draw(ctx, board, px, px * 0.27, t); ctx.restore();
    }
  }
  function render(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const pz = P.z, base = segAt(pz), basePct = (pz % SEG) / SEG;
    const pSegIdx = Math.floor((pz + PLAYER_Z) / SEG), pPct = ((pz + PLAYER_Z) % SEG) / SEG;
    const sp = P.v / (80 * MPH);
    camDepth = 0.84 * (1 + sp * 0.08);
    const camX = P.x * 0.72, camY = CAM_H + Math.min(P.alt, 900) * 0.25;
    // chase camera: a little tilt into turns, shake on big moments
    ctx.save();
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(W / 2 + sx, H * 0.75 + sy); ctx.rotate(-P.vx / 3200 * 0.05); ctx.translate(-W / 2, -H * 0.75);
    drawBackground(base.theme, base.key === "big");
    // ground: near to far
    let x = 0, dx = -(base.curve * basePct), maxy = H * 1.3;
    const vis = [];
    for (let n = 0; n < DRAW; n++) {
      const seg = segments[base.index + n]; if (!seg) break;
      project(seg.p1, camX - x, camY, pz, seg.width);
      project(seg.p2, camX - x - dx, camY, pz, seg.width);
      x += dx; dx += seg.curve;
      seg.fog = n / DRAW;
      vis.push(seg);
      if (seg.p1.camera.z <= camDepth || seg.p2.screen.y >= maxy) continue;
      const a = seg.p1.screen, b = seg.p2.screen, th = seg.theme, alt = Math.floor(seg.index / 3) % 2;
      poly(-W * 0.2, a.y, W * 1.2, a.y, W * 1.2, b.y, -W * 0.2, b.y, alt ? th.snow : th.snow2);
      const e1 = a.w * 0.07, e2 = b.w * 0.07;
      poly(a.x - a.w - e1, a.y, a.x + a.w + e1, a.y, b.x + b.w + e2, b.y, b.x - b.w - e2, b.y, th.edge);
      poly(a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x - b.w, b.y, alt ? th.course : th.course2);
      // groomed corduroy lines
      if (n < 60) { ctx.strokeStyle = "rgba(160,190,225,.18)"; ctx.lineWidth = 1; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(a.x + a.w * k / 4, a.y); ctx.lineTo(b.x + b.w * k / 4, b.y); ctx.stroke(); } }
      maxy = b.y;
    }
    // board trail: two faint lines between the camera and the rider
    const segScreen = (z) => { const i = Math.floor(z / SEG) - base.index; const s = vis[i]; if (!s || i < 1 || s.p1.camera.z <= 1) return null; /* the slice at the lens projects upside down */ const u = (z % SEG) / SEG; return { x: lerp(s.p1.screen.x, s.p2.screen.x, u), y: lerp(s.p1.screen.y, s.p2.screen.y, u), sc: lerp(s.p1.screen.scale, s.p2.screen.scale, u) }; };
    const pc = segScreen(pz + PLAYER_Z) || { x: W / 2, y: H * 0.75, sc: camDepth / PLAYER_Z };
    riderScreen.x = pc.x + pc.sc * P.x * W / 2; riderScreen.y = pc.y;
    if (P.trail.length > 1) {
      for (const off of [-45, 45]) {
        ctx.beginPath(); let started = false;
        for (const tp of P.trail) { if (tp.z < pz + 40 || tp.z > pz + PLAYER_Z) continue; /* only between the camera and the rider */ const s = segScreen(tp.z); if (!s || s.y < riderScreen.y - 2) continue; const X = s.x + s.sc * (tp.x + off) * W / 2; if (!started) { ctx.moveTo(X, s.y); started = true; } else ctx.lineTo(X, s.y); }
        if (started && !P.air) ctx.lineTo(riderScreen.x + off * pc.sc * W / 2, riderScreen.y);
        ctx.strokeStyle = "rgba(140,170,215,.45)"; ctx.lineWidth = 2.2; ctx.stroke();
      }
    }
    // walls (canyon), sprites and the rider: far to near
    for (let n = vis.length - 1; n >= 0; n--) {
      const seg = vis[n];
      if (seg.p1.camera.z <= camDepth * 1.2) { if (seg.index === pSegIdx) drawRiderAt(t); continue; }
      const a = seg.p1.screen, b = seg.p2.screen;
      if (seg.key === "canyon" && seg.p2.camera.z > 0) {
        const wh = 1400, wl = seg.width * 1.28;
        for (const sd of [-1, 1]) {
          const x1 = a.x + sd * a.scale * wl * W / 2, x2 = b.x + sd * b.scale * wl * W / 2;
          const far1 = a.x + sd * a.scale * (wl + 4000) * W / 2, far2 = b.x + sd * b.scale * (wl + 4000) * W / 2;
          const th = seg.theme.wall;
          poly(x1, a.y, x2, b.y, x2, b.y - b.scale * wh * H / 2, x1, a.y - a.scale * wh * H / 2, Math.floor(seg.index / 4) % 2 ? th[1] : th[0]);
          poly(x1, a.y - a.scale * wh * H / 2, x2, b.y - b.scale * wh * H / 2, far2, b.y - b.scale * wh * H / 2, far1, a.y - a.scale * wh * H / 2, th[2]);
        }
      }
      if (seg.index === pSegIdx) drawRiderAt(t);
      for (const s of seg.sprites) {
        if (s.type === "banner") s.w0 = a.scale * (seg.width + 250) * W / 2;
        drawSprite(s, a.x + a.scale * s.x * W / 2, a.y, a.scale, t);
      }
    }
    // spray and snow clouds
    for (const p of parts) { ctx.globalAlpha = clamp(p.life / p.max * 1.6, 0, 1) * 0.9; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // falling snow that rushes past faster at speed, plus speed lines
    drawSnow(sp);
  }
  function drawSnow(sp) {
    const vx0 = W / 2, vy0 = HY;
    while (flakes.length < 90) flakes.push({ x: vx0 + (Math.random() - 0.5) * W * 0.8, y: vy0 + (Math.random() - 0.3) * H * 0.4, z: Math.random() });
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const f of flakes) {
      const k = 1 + (0.4 + sp * 3.2) * 0.016 * (0.5 + f.z);
      const nx = vx0 + (f.x - vx0) * k, ny = vy0 + (f.y - vy0) * k + 0.6;
      if (sp > 0.55) { ctx.lineWidth = 1 + f.z * 1.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(nx, ny); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(nx, ny, 1 + f.z * 2, 0, TAU); ctx.fill(); }
      f.x = nx; f.y = ny;
      if (f.x < -20 || f.x > W + 20 || f.y > H + 20 || f.y < -20) { f.x = vx0 + (Math.random() - 0.5) * W * 0.5; f.y = vy0 + (Math.random() - 0.4) * H * 0.3; f.z = Math.random(); }
    }
    if (sp > 0.7) {
      ctx.strokeStyle = `rgba(255,255,255,${(sp - 0.7) * 1.2})`; ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) { const side = k % 2 ? 1 : -1, y = H * (0.3 + ((k * 0.13 + performance.now() / 700) % 0.7)); ctx.beginPath(); ctx.moveTo(side > 0 ? W - 10 : 10, y); ctx.lineTo(side > 0 ? W - 90 : 90, y + 30); ctx.stroke(); }
    }
  }
  // speedometer
  const spd = $("#speedCv"), sctx = spd.getContext("2d");
  function drawSpeed() {
    const c = sctx, w = spd.width, h = spd.height, mph = Math.round(P.v / MPH);
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.86, r = w * 0.42;
    c.lineWidth = 18; c.lineCap = "round";
    c.strokeStyle = "rgba(22,32,74,.55)"; c.beginPath(); c.arc(cx, cy, r, Math.PI, TAU); c.stroke();
    const u = clamp((mph - 20) / 60, 0, 1), g = c.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, "#2EB872"); g.addColorStop(0.6, "#FFC83D"); g.addColorStop(1, "#FF4F8B");
    c.strokeStyle = g; c.beginPath(); c.arc(cx, cy, r, Math.PI, Math.PI + u * Math.PI); c.stroke();
    c.fillStyle = "#FFFFFF"; c.font = `400 ${h * 0.42}px "Lilita One", Fredoka, sans-serif`; c.textAlign = "center"; c.textBaseline = "alphabetic";
    c.lineWidth = 8; c.strokeStyle = "#16204A"; c.strokeText(String(mph), cx, cy - 4); c.fillText(String(mph), cx, cy - 4);
    c.font = `400 ${h * 0.14}px "Lilita One", Fredoka, sans-serif`; c.lineWidth = 5; c.strokeText("MPH", cx, cy + h * 0.12); c.fillText("MPH", cx, cy + h * 0.12);
  }
  const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  function hud() {
    $("#tTime").textContent = fmtTime(P.time);
    $("#tScore").textContent = P.score.toLocaleString("en-US");
    $("#tGates").textContent = `${P.gates}/${TOTAL_GATES}`;
    drawSpeed();
  }

  // ---------------------------------------------------------------------------
  // race flow
  // ---------------------------------------------------------------------------
  function startRace() {
    audio();
    for (const s of segments) for (const sp of s.sprites) { sp.done = false; sp.flash = 0; }
    resetRace();
    mode = "countdown"; countT = 3.2;
    ["#riderScreen", "#boardScreen", "#finishScreen", "#pauseScreen"].forEach((s) => ($(s).hidden = true));
    ["#hudTime", "#hudScore", "#hudSpeed", "#hudGates", "#pauseBtn", "#trickBtn"].forEach((s) => ($(s).hidden = false));
    $("#hint").hidden = false; $("#hint").style.opacity = 1;
    call("3", "", "blue"); SFX.beep(false);
  }
  function finish() {
    P.finished = true; P.finishT = 0;
    call("FINISH!", fmtTime(P.time), "gold"); SFX.finish(); burst(0, 60, "#FFD23F");
  }
  function showFinish() {
    mode = "finish";
    $("#fTime").textContent = fmtTime(P.time);
    $("#fScore").textContent = P.score.toLocaleString("en-US");
    $("#fSpeed").textContent = Math.round(P.top);
    $("#fGates").textContent = `${P.gates} / ${TOTAL_GATES}`;
    $("#fTrick").textContent = P.best || "—";
    ["#hudTime", "#hudScore", "#hudSpeed", "#hudGates", "#pauseBtn", "#trickBtn", "#hint"].forEach((s) => ($(s).hidden = true));
    $("#finishScreen").hidden = false;
    if (window.RosenbergBridge) {
      const stars = Math.min(5, 1 + (P.score >= 6000 ? 1 : 0) + (P.score >= 12000 ? 1 : 0) + (P.score >= 18000 ? 1 : 0) + (P.gates >= TOTAL_GATES * 0.7 ? 1 : 0));
      RosenbergBridge.report({ score: P.score, stars });
    }
  }
  function toMenu(screen) {
    mode = "menu";
    ["#hudTime", "#hudScore", "#hudSpeed", "#hudGates", "#pauseBtn", "#trickBtn", "#hint", "#finishScreen", "#pauseScreen", "#riderScreen", "#boardScreen"].forEach((s) => ($(s).hidden = true));
    $(screen).hidden = false;
    if (screen === "#boardScreen") drawBoardPick();
  }

  // ---------------------------------------------------------------------------
  // menus
  // ---------------------------------------------------------------------------
  const ridersEl = $("#riders");
  RIDERS.forEach((r) => {
    const b = document.createElement("button"); b.className = "rcard"; b.type = "button"; b.dataset.id = r.id;
    b.innerHTML = `<canvas></canvas>${r.name}<small>${r.tag}</small>`;
    b.addEventListener("click", () => { rider = r.id; try { localStorage.setItem("snow360.rider", rider); } catch (e) { /* ignore */ } syncRiders(); audio(); SFX.beep(false); });
    ridersEl.appendChild(b);
  });
  function syncRiders() { ridersEl.querySelectorAll(".rcard").forEach((b) => b.classList.toggle("sel", b.dataset.id === rider)); }
  function drawCards(t) {
    ridersEl.querySelectorAll(".rcard canvas").forEach((c) => {
      const r = c.getBoundingClientRect(); if (!r.width) return;
      if (c.width !== Math.round(r.width * DPR)) { c.width = Math.round(r.width * DPR); c.height = Math.round(r.height * DPR); }
      const g = c.getContext("2d"), w = c.width, h = c.height, id = c.parentNode.dataset.id;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.ellipse(w / 2, h * 0.9, w * 0.4, h * 0.05, 0, 0, TAU); g.fill();
      // board standing up beside them
      g.save(); g.translate(w * 0.74, h * 0.54); g.rotate(-Math.PI / 2 + 0.12); BOARDS.draw(g, BOARDS.LIST[(RIDERS.findIndex((q) => q.id === id) * 2 + boardIdx) % 8].id, h * 0.72, h * 0.17, t); g.restore();
      drawRider(g, id, w * 0.42, h * 0.9, h * 0.72, { pose: "idle", t, face: 1 });
    });
  }
  const boardCv = $("#boardCv"), bctx = boardCv.getContext("2d");
  function drawBoardPick(t = 0) {
    const r = boardCv.getBoundingClientRect(); if (!r.width) return;
    if (boardCv.width !== Math.round(r.width * DPR)) { boardCv.width = Math.round(r.width * DPR); boardCv.height = Math.round(r.height * DPR); }
    const g = bctx, w = boardCv.width, h = boardCv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    // neighbours peeking in at the sides
    [-1, 1].forEach((sd) => { const id = BOARDS.LIST[(boardIdx + sd + 8) % 8].id; g.save(); g.globalAlpha = 0.35; g.translate(w / 2 + sd * w * 0.62, h / 2); g.rotate(sd * 0.1); BOARDS.draw(g, id, w * 0.5, h * 0.18, t); g.restore(); });
    g.save(); g.translate(w / 2, h / 2 + Math.sin(t * 2) * h * 0.02); g.rotate(Math.sin(t * 1.3) * 0.05);
    g.fillStyle = "rgba(22,32,74,.15)"; g.beginPath(); g.ellipse(0, h * 0.2, w * 0.36, h * 0.05, 0, 0, TAU); g.fill();
    BOARDS.draw(g, BOARDS.LIST[boardIdx].id, Math.min(w * 0.78, h * 2.6), Math.min(w * 0.78, h * 2.6) * 0.25, t);
    g.restore();
    $("#boardName").textContent = BOARDS.LIST[boardIdx].name;
    const dots = $("#dots"); if (dots.children.length !== 8) { dots.innerHTML = ""; for (let k = 0; k < 8; k++) dots.appendChild(document.createElement("i")); }
    [...dots.children].forEach((d, k) => d.classList.toggle("on", k === boardIdx));
  }
  const pickBoard = (d) => { boardIdx = (boardIdx + d + 8) % 8; board = BOARDS.LIST[boardIdx].id; try { localStorage.setItem("snow360.board", board); } catch (e) { /* ignore */ } audio(); SFX.beep(false); };
  $("#prevBoard").addEventListener("click", () => pickBoard(-1));
  $("#nextBoard").addEventListener("click", () => pickBoard(1));
  let swipeX = null;
  boardCv.addEventListener("pointerdown", (e) => { swipeX = e.clientX; });
  boardCv.addEventListener("pointerup", (e) => { if (swipeX == null) return; const d = e.clientX - swipeX; swipeX = null; if (Math.abs(d) > 30) pickBoard(d < 0 ? 1 : -1); });
  $("#riderNext").addEventListener("click", () => { audio(); toMenu("#boardScreen"); });
  $("#boardBack").addEventListener("click", () => toMenu("#riderScreen"));
  $("#rideBtn").addEventListener("click", startRace);
  $("#againBtn").addEventListener("click", startRace);
  $("#changeRider").addEventListener("click", () => toMenu("#riderScreen"));
  $("#changeBoard").addEventListener("click", () => toMenu("#boardScreen"));
  $("#pauseBtn").addEventListener("click", () => { if (mode === "race" || mode === "countdown") { paused = true; $("#pauseScreen").hidden = false; } });
  $("#resumeBtn").addEventListener("click", () => { paused = false; $("#pauseScreen").hidden = true; last = performance.now(); });
  $("#quitBtn").addEventListener("click", () => { paused = false; toMenu("#riderScreen"); });
  let paused = false;
  document.addEventListener("visibilitychange", () => { if (document.hidden && (mode === "race" || mode === "countdown")) { paused = true; $("#pauseScreen").hidden = false; } });

  // finish-screen rider, celebrating
  function drawFinishCard(t) {
    const c = $("#finishCv"), r = c.getBoundingClientRect(); if (!r.width) return;
    if (c.width !== Math.round(r.width * DPR)) { c.width = Math.round(r.width * DPR); c.height = Math.round(r.height * DPR); }
    const g = c.getContext("2d"), w = c.width, h = c.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.save(); g.translate(w * 0.5, h * 0.86); drawBack(g, rider, h * 0.72, { pose: "cheer", front: true, board, yaw: Math.PI, t }); g.restore();
  }

  // ---------------------------------------------------------------------------
  // main loop
  // ---------------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    if (!paused) {
      if (mode === "countdown") {
        const before = Math.ceil(countT); countT -= dt; const after = Math.ceil(countT);
        if (after !== before) { if (after > 0) { call(String(after), "", "blue"); SFX.beep(false); } else { call("GO!", "", "gold"); SFX.beep(true); mode = "race"; showSection(0); } }
      }
      if (mode !== "menu") update(dt);
      if (mode === "race" && P.time > 6) $("#hint").style.opacity = 0;
      trickBtn.classList.toggle("ready", mode === "race" && P.air && P.crash <= 0);
    }
    if (mode === "menu" || mode === "finish") {
      // idle scenery behind the menus: a gentle ride down the ridge
      if (mode === "menu") { P.v = 30 * MPH; P.z += P.v * dt; if (P.z > secStart[1] * SEG) P.z = 0; P.x = Math.sin(t * 0.4) * 600; P.steer = Math.cos(t * 0.4) * 0.4; }
    }
    render(t);
    if (mode === "race" || mode === "countdown") hud();
    if (!$("#riderScreen").hidden) drawCards(t);
    if (!$("#boardScreen").hidden) drawBoardPick(t);
    if (!$("#finishScreen").hidden) drawFinishCard(t);
    requestAnimationFrame(frame);
  }

  // test hooks (harmless)
  window.__snow = { state: () => ({ mode, z: Math.round(P.z), seg: Math.floor((P.z + PLAYER_Z) / SEG), x: Math.round(P.x), mph: Math.round(P.v / MPH), air: P.air, alt: Math.round(P.alt), crash: P.crash > 0, score: P.score, gates: P.gates, total: TOTAL_GATES, sec: P.sec, finished: P.finished, finishSeg: FINISH_SEG, best: P.best }),
    peek: (n) => { const i0 = Math.floor((P.z + PLAYER_Z) / SEG) + 1, out = []; for (let i = i0; i < i0 + n && i < segments.length; i++) for (const s of segments[i].sprites) if (s.hit) out.push({ i, type: s.type, hit: s.hit, x: Math.round(s.x), w: s.cw || s.gap || s.w }); return out; },
    jumpTo: (seg) => { P.z = seg * SEG - PLAYER_Z; P.trail = []; }, setX: (x) => { P.x = x; }, spin: (deg) => { P.rot = deg; }, launch: (vy) => launch(vy, "ramp") };

  resize();
  buildCourse();
  buildSprites();
  resetRace();
  syncRiders();
  requestAnimationFrame(frame);
})();
