// Rosenberg Crossing: Frogger in Rosenberg World.
// The board is a flat grid seen through a tilted perspective camera. Ground is drawn as projected
// quads; people are upright cut-outs; cars and logs are side-view sprites extruded toward the camera.
(() => {
  'use strict';
  const A = RW.art, B = RW.build;
  const TAU = Math.PI * 2;
  A.spriteScale = 3;

  const $ = (id) => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- board ----------
  // Rows: 0 = the family's lawn, 1-5 = the lazy river, 6 = park path, 7-11 = street, 12 = sidewalk (start).
  // Z is distance up the board: row 12 is Z 0, row 0 is Z 12.
  const COLS = 13, ROWS = 13;
  const MARGIN = 9, PERIOD = COLS + MARGIN * 2;
  const SPOTS = [2, 4, 6, 8, 10];
  const HOP_TIME = 0.17, DEATH_TIME = 1.5, HUG_TIME = 1.1;
  // Difficulty ramps in gently: level 1 is slow and roomy, level 4 is the full game, then it keeps
  // speeding up. ease: 0 at level 1 .. 1 from level 4.
  const ease = (level) => clamp((level - 1) / 3, 0, 1);
  const lifeTime = (level) => (level <= 2 ? 60 : 45);
  const easyLevel = (level) => level <= 2;
  const zOf = (row) => ROWS - 1 - row;
  const isRiver = (row) => row >= 1 && row <= 5;
  const groundH = (row) => (row <= 0 ? 0.18 : row === 6 || row >= 12 ? 0.12 : 0);

  const KIDS = ['reuben', 'jonah', 'ellie', 'max'];
  const FAMILY = {
    reuben: ['cari', 'sarah', 'nana', 'michael', 'simon'],
    jonah: ['cari', 'sarah', 'nana', 'michael', 'simon'],
    ellie: ['cari', 'sarah', 'nana', 'michael', 'simon'],
    max: ['cari', 'molly', 'ariel', 'ikey', 'simon'],
  };
  const CALL = { sarah: 'Mom', michael: 'Dad', molly: 'Mom', ikey: 'Dad', simon: 'Grampa Simon', cari: 'Grandma Cari', nana: 'Nana', ariel: 'Aunt Ariel' };

  // ---------- sprites: side-view art, 60 art px per tile, origin at the bottom middle, facing +x ----------
  const PPT = 60, SPR = 3;
  const spriteCache = new Map();
  function sprite(key, w, h, ox, oy, top, draw) {
    let sp = spriteCache.get(key);
    if (sp) return sp;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w * SPR); c.height = Math.ceil(h * SPR); return c; };
    const cvs = mk(), g = cvs.getContext('2d');
    g.scale(SPR, SPR); g.translate(ox, oy); draw(g);
    // A flat silhouette in the top color: stacked from back to front, it becomes the solid body
    const sil = mk(), s = sil.getContext('2d');
    s.drawImage(cvs, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = top; s.fillRect(0, 0, sil.width, sil.height);
    sp = { cv: cvs, sil, w, h, ox, oy };
    spriteCache.set(key, sp);
    return sp;
  }

  // Vehicles facing left are drawn mirrored; their lettering must still read left to right.
  let FLIP = 1;
  function label(c, str, x, y, size, col) {
    c.save(); c.translate(x, y); c.scale(FLIP, 1); A.text(c, str, 0, 0, size, col, { weight: 700 }); c.restore();
  }
  function wheel(c, x, y, r) {
    c.fillStyle = '#1D1F26'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = '#C9CDD8'; c.beginPath(); c.arc(x, y, r * 0.45, 0, TAU); c.fill();
    c.fillStyle = '#8A919E'; c.beginPath(); c.arc(x, y, r * 0.18, 0, TAU); c.fill();
  }

  const VEH = {
    car: {
      len: 1.6, h: 54, depth: 0.62,
      top: (col) => A.shade(col, 0.2),
      draw(c, col) { c.translate(0, -3); c.scale(1.04, 1.04); A.drawCar(c, col, 0, false); },
    },
    cx50: {
      len: 1.75, h: 72, depth: 0.66, top: () => '#343944',
      draw(c) {
        const paint = '#1A1C22';
        c.fillStyle = A.lin(c, 0, -40, 0, -8, ['#3A3F4B', paint, '#0C0D10']);
        A.rr(c, -52, -40, 104, 30, 10); c.fill();
        c.fillStyle = A.lin(c, 0, -64, 0, -38, ['#383D49', paint]);
        c.beginPath(); c.moveTo(-46, -38); c.lineTo(-38, -61); c.quadraticCurveTo(-35, -65, -29, -65); c.lineTo(22, -65);
        c.quadraticCurveTo(28, -65, 32, -60); c.lineTo(46, -38); c.closePath(); c.fill();
        c.fillStyle = A.lin(c, 0, -60, 0, -41, ['#7A8BA0', '#2A3442']);
        c.beginPath(); c.moveTo(-40, -41); c.lineTo(-33, -59); c.lineTo(-6, -59); c.lineTo(-6, -41); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(-1, -41); c.lineTo(-1, -59); c.lineTo(20, -59); c.quadraticCurveTo(26, -59, 29, -55); c.lineTo(39, -41); c.closePath(); c.fill();
        c.fillStyle = '#8A919E'; A.rr(c, -30, -69, 52, 3, 1.5); c.fill();
        c.fillStyle = '#101114'; A.rr(c, -54, -19, 108, 10, 4); c.fill();
        [-31, 31].forEach((x) => { c.fillStyle = '#0A0B0D'; c.beginPath(); c.arc(x, -12, 15, Math.PI, 0); c.fill(); wheel(c, x, -10, 11); });
        c.fillStyle = '#F4FAFF'; A.rr(c, 46, -36, 8, 5, 2); c.fill();
        c.fillStyle = '#E0344F'; A.rr(c, -54, -36, 5, 7, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.16)'; A.rr(c, -46, -38, 90, 3, 1.5); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, -40); c.lineTo(-3, -16); c.stroke();
        label(c, 'CX-50', -36, -26, 7, 'rgba(255,255,255,.6)');
      },
    },
    bus: {
      len: 3, h: 96, depth: 0.74, top: () => '#F5C21B',
      draw(c) {
        c.fillStyle = A.lin(c, 0, -84, 0, -12, ['#FFDE5C', '#F7B500', '#D99400']);
        A.rr(c, -90, -84, 168, 72, 12); c.fill();
        A.rr(c, 66, -48, 24, 36, 7); c.fill();
        c.fillStyle = '#2B2F3A'; c.fillRect(-88, -38, 176, 3); c.fillRect(-88, -30, 176, 3);
        for (let i = 0; i < 7; i++) { c.fillStyle = A.lin(c, 0, -76, 0, -54, ['#E4F6FF', '#86C8EE']); A.rr(c, -82 + i * 20.5, -76, 16, 21, 4); c.fill(); }
        c.fillStyle = A.lin(c, 0, -78, 0, -50, ['#E4F6FF', '#86C8EE']); A.rr(c, 64, -78, 11, 28, 4); c.fill();
        label(c, 'SCHOOL BUS', -16, -45, 10, '#2B2F3A');
        c.fillStyle = '#E0344F'; c.beginPath(); c.arc(-95, -50, 8, 0, TAU); c.fill();
        label(c, 'STOP', -95, -50, 4.5, '#FFFFFF');
        c.fillStyle = '#FFF3B0'; A.rr(c, 86, -40, 5, 7, 2); c.fill();
        c.fillStyle = '#E0344F'; A.rr(c, -91, -30, 4, 8, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.3)'; A.rr(c, -84, -82, 150, 3, 1.5); c.fill();
        [-58, 50].forEach((x) => wheel(c, x, -11, 12));
      },
    },
    icecream: {
      len: 2.3, h: 118, depth: 0.7, top: () => '#F7F2FA',
      draw(c) {
        c.fillStyle = A.lin(c, 0, -76, 0, -12, ['#FFFFFF', '#F4F0F8', '#D9D2E6']);
        A.rr(c, -69, -76, 100, 64, 10); c.fill();
        c.fillStyle = '#FF5C8A'; A.rr(c, -69, -32, 100, 13, 4); c.fill();
        for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-63 + i * 11.5, -19, 3.4 + (i % 3), 0, Math.PI); c.fill(); }
        c.fillStyle = A.lin(c, 0, -62, 0, -40, ['#BFEAFF', '#6CC4EE']); A.rr(c, -52, -62, 56, 22, 5); c.fill();
        for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#FF5C8A'; c.fillRect(-56 + i * 9.2, -70, 9.2, 8); }
        label(c, 'FROZENBERGS', -19, -26, 9.5, '#FFFFFF');
        c.fillStyle = A.lin(c, 0, -62, 0, -12, ['#FF9CC2', '#FF5C8A', '#D93A6B']);
        c.beginPath(); c.moveTo(31, -12); c.lineTo(31, -62); c.lineTo(48, -62); c.quadraticCurveTo(56, -62, 60, -50);
        c.lineTo(69, -36); c.quadraticCurveTo(72, -12, 64, -12); c.closePath(); c.fill();
        c.fillStyle = '#C9EDFF'; c.beginPath(); c.moveTo(36, -57); c.lineTo(47, -57); c.quadraticCurveTo(53, -57, 56, -48); c.lineTo(60, -40); c.lineTo(36, -40); c.closePath(); c.fill();
        c.fillStyle = '#FFF3B0'; A.rr(c, 65, -32, 5, 6, 2); c.fill();
        // a giant cone on the roof
        c.fillStyle = A.lin(c, -30, 0, -12, 0, ['#E8B060', '#C98A3A']);
        c.beginPath(); c.moveTo(-32, -96); c.lineTo(-12, -96); c.lineTo(-22, -76); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(120,70,20,.5)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(-28, -94); c.lineTo(-18, -80); c.moveTo(-16, -94); c.lineTo(-26, -80); c.stroke();
        c.fillStyle = A.gloss(c, -22, -103, 12, '#FF8DB8'); c.beginPath(); c.arc(-22, -102, 11.5, 0, TAU); c.fill();
        c.fillStyle = '#E0344F'; c.beginPath(); c.arc(-20, -115, 3.5, 0, TAU); c.fill();
        [-46, 46].forEach((x) => wheel(c, x, -10, 11));
      },
    },
    kart: {
      len: 1.15, h: 50, depth: 0.5,
      top: (col) => A.shade(col, 0.15),
      draw(c, col) {
        c.fillStyle = '#2B2F3A'; c.fillRect(-34, -38, 4, 18); A.rr(c, -39, -40, 15, 5, 2); c.fill();
        c.fillStyle = A.lin(c, 0, -26, 0, -8, [A.shade(col, 0.3), col, A.shade(col, -0.3)]);
        c.beginPath(); c.moveTo(-32, -10); c.lineTo(-30, -24); c.lineTo(8, -26); c.lineTo(34, -17); c.lineTo(34, -10); c.closePath(); c.fill();
        c.fillStyle = A.shade(col, -0.25); A.rr(c, -16, -32, 18, 9, 4); c.fill();
        c.fillStyle = A.gloss(c, -7, -39, 11, '#FFFFFF'); c.beginPath(); c.arc(-7, -39, 10.5, 0, TAU); c.fill();
        c.fillStyle = col; c.fillRect(-17, -41, 20, 3);
        c.fillStyle = '#2B2F3A'; A.rr(c, -3, -43, 12, 7, 3.5); c.fill();
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(16, -18, 5.5, 0, TAU); c.fill();
        label(c, '7', 16, -18, 7.5, '#2B2F3A');
        wheel(c, -22, -9, 9.5); wheel(c, 24, -9, 9.5);
      },
    },
  };

  function vehSprite(type, col, dir) {
    const v = VEH[type];
    const w = v.len * PPT + 30, h = v.h + 12;
    return sprite(`v:${type}:${col || ''}:${dir}`, w, h, w / 2, v.h + 6, v.top(col), (c) => {
      FLIP = dir; c.scale(dir, 1); v.draw(c, col); FLIP = 1;
    });
  }

  function logSprite(len) {
    const w = len * PPT + 8, h = 30;
    return sprite(`log:${len}`, w, h, w / 2, 26, '#A26C3B', (c) => {
      const lw = len * PPT - 6, lh = 24;
      c.fillStyle = A.lin(c, 0, -lh, 0, 0, ['#BE8249', '#8E5C2F', '#5E3B1C']);
      A.rr(c, -lw / 2, -lh, lw, lh, 11); c.fill();
      c.strokeStyle = 'rgba(60,30,10,.4)'; c.lineWidth = 1.4; c.lineCap = 'round';
      for (let i = 0; i < len * 3; i++) {
        const gx = -lw / 2 + 14 + i * 19, gy = -lh + 6 + ((i * 7) % 3) * 5;
        if (gx + 12 > lw / 2 - 12) break;
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 12, gy); c.stroke();
      }
      c.fillStyle = 'rgba(70,40,15,.55)'; A.ell(c, -lw / 6, -lh * 0.45, 3.5, 2.5); c.fill(); A.ell(c, lw / 4, -lh * 0.6, 3, 2); c.fill();
      [-1, 1].forEach((k) => {
        const ex = k * (lw / 2 - 6);
        c.fillStyle = '#E6B878'; A.ell(c, ex, -lh / 2, 6.5, lh / 2 - 1); c.fill();
        c.strokeStyle = '#B07A40'; c.lineWidth = 1.2; A.ell(c, ex, -lh / 2, 3.5, lh / 4); c.stroke();
      });
      c.fillStyle = 'rgba(255,255,255,.18)'; A.rr(c, -lw / 2 + 10, -lh + 3, lw - 20, 3, 1.5); c.fill();
    });
  }

  // ---------- lanes ----------
  const CAR_COLS = ['#E8453C', '#2F6BFF', '#FFB400', '#2EB872', '#7B3FE4', '#FF7AB6', '#1FA4E0', '#FF8A3D'];
  const TUBE_COLS = ['#FF5C8A', '#FFD23F', '#2F9BFF', '#2EB872', '#FF8A3D', '#B18CFF'];
  const LANE_DEFS = [
    { row: 1, kind: 'log', len: 3, dens: 3, speed: 1.3 },
    { row: 2, kind: 'tube', len: 2, dens: 4, speed: -1.7, dive: 3 },
    { row: 3, kind: 'log', len: 5, dens: 2, speed: 2.0 },
    { row: 4, kind: 'float', len: 2, dens: 3.2, speed: 1.0 },
    { row: 5, kind: 'tube', len: 3, dens: 3.6, speed: -1.1, dive: 4 },
    { row: 7, kind: 'veh', pool: ['bus', 'icecream'], dens: 1.7, speed: -1.25 },
    { row: 8, kind: 'veh', pool: ['kart'], dens: 1.1, speed: 4.0 },
    { row: 9, kind: 'veh', pool: ['car', 'car', 'cx50'], dens: 2.6, speed: -1.8 },
    { row: 10, kind: 'veh', pool: ['cx50', 'car', 'car'], dens: 2.3, speed: 1.3 },
    { row: 11, kind: 'veh', pool: ['car'], dens: 2.6, speed: -1.0 },
  ];
  const PLATFORM_H = { log: 0.4, tube: 0.2, float: 0.24 };

  let lanes = [];
  const laneByRow = {};

  function buildLanes(level) {
    lanes = [];
    const e = ease(level);
    const mult = Math.min(lerp(0.6, 1, e) + Math.max(0, level - 4) * 0.12, 2);
    for (const d of LANE_DEFS) {
      const river = isRiver(d.row);
      let count = Math.max(1, Math.round((d.dens * PERIOD) / 25));
      if (!river) count = Math.max(1, Math.round(count * lerp(0.6, 1, e)));
      if (!river && d.pool[0] !== 'kart' && level >= 5) count += Math.min(Math.floor((level - 3) / 2), 2);
      if (river && level <= 2) count += 1; // more to ride on early
      if (river && d.kind === 'log' && level >= 6) count = Math.max(2, count - 1);
      if (d.pool && d.pool[0] === 'kart' && level >= 7) count += 1;
      const gap = PERIOD / count, start = Math.random() * PERIOD;
      const items = [];
      for (let i = 0; i < count; i++) {
        const type = d.pool ? d.pool[Math.floor(Math.random() * d.pool.length)] : d.kind;
        const len = d.pool ? VEH[type].len : d.kind === 'log' && level <= 2 ? d.len + 1 : d.len;
        const slack = Math.max(0, gap - len - 2);
        items.push({
          pos: (start + i * gap + rand(-0.25, 0.25) * slack) % PERIOD,
          len, type,
          col: type === 'car' || type === 'kart' ? CAR_COLS[Math.floor(Math.random() * CAR_COLS.length)] : null,
          tubes: Array.from({ length: d.len || 0 }, () => TUBE_COLS[Math.floor(Math.random() * TUBE_COLS.length)]),
          duck: Math.random() < 0.4,
          // no sinking tubes on level 1, a few from level 2, more from level 5
          diver: !!d.dive && level >= 2 && (i % d.dive === 0 || (level >= 5 && i % 2 === 0)),
          phase: Math.random() * DIVE_CYCLE,
          star: null,
        });
      }
      const lane = { ...d, river, count, speed: d.speed * mult, items };
      lanes.push(lane);
      laneByRow[d.row] = lane;
    }
  }
  const itemX = (it) => it.pos - MARGIN;

  // Tubes: bob, wobble as a warning, sink, come back up
  const DIVE_CYCLE = 6.6;
  function diveState(it, t) {
    if (!it.diver) return { depth: 0, warn: 0 };
    const p = (t + it.phase) % DIVE_CYCLE;
    if (p < 2.6) return { depth: 0, warn: 0 };
    if (p < 3.4) return { depth: 0, warn: (p - 2.6) / 0.8 };
    if (p < 4.0) return { depth: (p - 3.4) / 0.6, warn: 1 };
    if (p < 5.8) return { depth: 1, warn: 0 };
    return { depth: 1 - (p - 5.8) / 0.8, warn: 0 };
  }

  // ---------- state ----------
  const S = {
    mode: 'title', kid: 'reuben', paused: false,
    score: 0, level: 1, lives: 3, nextExtra: 5000, stars: 0, levelsCleared: 0,
    t: 0, lifeLeft: 60, checkpoint: false,
    hugged: [false, false, false, false, false],
    hugT: [0, 0, 0, 0, 0],
    homeStar: { spot: -1, t: 0, next: 9 },
    itemStarNext: 6,
    dog: null, fart: { t: -1, next: 14 },
    P: null, queued: null,
    parts: [], floaters: [],
    camF: 3, camX: COLS / 2,
  };
  function newPlayer() { return { x: 6, row: 12, face: 'up', hop: null, dead: null, home: null, furthest: 12, item: null, h: groundH(12) }; }

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  const bridge = window.RosenbergBridge || null;

  // ---------- audio ----------
  let actx = null, muted = store.get('rw-crossing-muted') === '1';
  function audio() {
    if (muted) return null;
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type = 'square', vol = 0.07, slide = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.15, lp = 1200) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const sfx = {
    hop: () => tone(560, 0.07, 'triangle', 0.09, 300),
    beep: () => { tone(415, 0.16, 'square', 0.06); tone(415, 0.2, 'square', 0.06, 0, 0.2); noise(0.2, 0.12, 800); },
    splash: () => { noise(0.5, 0.22, 2400); tone(700, 0.3, 'sine', 0.06, -500); },
    bonk: () => { tone(180, 0.18, 'sine', 0.12, -80); noise(0.12, 0.1, 600); },
    woof: () => { tone(260, 0.12, 'sawtooth', 0.07, -120); tone(240, 0.14, 'sawtooth', 0.07, -120, 0.18); },
    hug: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, 0, i * 0.08)),
    star: () => [1175, 1568, 2093].forEach((f, i) => tone(f, 0.1, 'triangle', 0.07, 0, i * 0.06)),
    level: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, 'square', 0.05, 0, i * 0.1)),
    tick: () => tone(1200, 0.04, 'square', 0.03),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, 0, i * 0.18)),
    extra: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.08, 0, i * 0.07)),
    fart: () => { const a = audio(); if (!a) return; tone(90, 0.5, 'sawtooth', 0.08, 40); noise(0.4, 0.08, 300); },
  };

  // ---------- HUD ----------
  const el = { score: $('score'), level: $('level'), lives: $('lives'), time: $('time'), stars: $('starCount') };
  function hud() {
    el.score.textContent = S.score;
    el.level.textContent = S.level;
    el.stars.textContent = S.stars;
    el.lives.textContent = '❤'.repeat(Math.max(0, S.lives));
  }
  let bannerTimer = 0;
  function banner(text, cls = '', sub = '') {
    const b = $('banner');
    b.className = 'banner';
    b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    void b.offsetWidth;
    b.className = `banner show ${cls}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.className = 'banner'; }, 1700);
  }
  function addScore(n, X, Z, label) {
    S.score += n;
    if (X !== undefined) S.floaters.push({ X, Y: 1.6, Z, text: label || `+${n}`, t: 0 });
    if (S.score >= S.nextExtra) {
      S.nextExtra += 5000; S.lives++;
      sfx.extra(); banner('EXTRA LIFE!', 'gold');
    }
    hud();
  }

  // ---------- flow ----------
  function startGame(kid) {
    S.kid = kid || S.kid;
    store.set('rw-crossing-kid', S.kid);
    Object.assign(S, {
      mode: 'play', paused: false, score: 0, level: 1, lives: 5, checkpoint: false, nextExtra: 5000, stars: 0, levelsCleared: 0,
      hugged: [false, false, false, false, false], hugT: [0, 0, 0, 0, 0], parts: [], floaters: [], queued: null,
      homeStar: { spot: -1, t: 0, next: 9 }, itemStarNext: 6, dog: null, fart: { t: -1, next: 14 },
    });
    buildLanes(1);
    resetPlayer();
    S.camF = zOf(12) + 3;
    const ch = A.CHARS[S.kid];
    document.documentElement.style.setProperty('--kid', ch.color);
    $('hudName').textContent = ch.name.toUpperCase();
    A.portrait($('hudFace'), S.kid, {});
    for (const id of ['title', 'over', 'paused']) $(id).hidden = true;
    $('hud').hidden = false;
    $('pad').classList.add('live');
    hud();
    audio();
    banner('LEVEL 1', 'gold', `Go hug ${CALL[FAMILY[S.kid][1]]}, ${CALL[FAMILY[S.kid][3]]} and everyone!`);
  }
  function resetPlayer(fromCheckpoint) {
    S.P = newPlayer();
    // Early levels: once you've crossed the street, a slip in the river puts you back on the park path
    if (fromCheckpoint && S.checkpoint && S.level <= 3) { S.P.row = 6; S.P.furthest = 6; S.P.h = groundH(6); }
    S.lifeLeft = lifeTime(S.level); S.queued = null;
  }

  function showTitle() {
    S.mode = 'title'; S.paused = false;
    for (const id of ['over', 'paused', 'hud']) $(id).hidden = true;
    $('pad').classList.remove('live');
    $('title').hidden = false;
    buildCards();
  }

  const DEATH_TEXT = {
    road: ['BEEP BEEP!', 'Watch out for cars!'],
    water: ['SPLASH!', 'Stay on the logs and tubes.'],
    bush: ['OOF, BUSHES!', 'Land right on a family spot.'],
    time: ['TOO SLOW!', 'The family got tired of waiting.'],
    dog: ['WOOF!', 'The dog knocked you over!'],
    again: ['ALREADY HUGGED!', 'Find someone who is still waiting.'],
    edge: ['WHOOPS!', 'You floated away down the river.'],
  };
  function die(kind, extra) {
    const P = S.P;
    if (P.dead) return;
    P.hop = null; P.dead = { kind, t: 0 }; S.queued = null;
    const X = P.x + 0.5, Z = zOf(P.row);
    if (kind === 'water' || kind === 'edge') { sfx.splash(); burst(X, 0.1, Z, ['#FFFFFF', '#BFEFFF', '#63C9F0'], 24, 2.6); }
    else if (kind === 'road') { sfx.beep(); burst(X, 0.4, Z, ['#FFD23F', '#FFFFFF'], 12, 2); }
    else if (kind === 'dog') { sfx.woof(); }
    else sfx.bonk();
    const [a, b] = DEATH_TEXT[kind] || ['OOPS!', ''];
    banner(a, 'red', extra || b);
  }
  function afterDeath() {
    S.lives--; hud();
    if (S.lives <= 0) return gameOver();
    resetPlayer(true);
    if (S.P.row === 6) banner('SAFE SPOT!', 'gold', 'Try the river again from the park path.');
  }

  function gameOver() {
    S.mode = 'over';
    sfx.over();
    const key = `rw-crossing-best-${S.kid}`, best = +store.get(key) || 0;
    const isBest = S.score > best;
    if (isBest) store.set(key, String(S.score));
    const earned = Math.min(10, S.stars + S.levelsCleared);
    if (bridge) bridge.report({ score: S.score, stars: earned });
    const name = A.CHARS[S.kid].name;
    const hugs = S.levelsCleared * 5 + S.hugged.filter(Boolean).length;
    $('overTitle').textContent = hugs >= 5 ? `Great hopping, ${name}!` : `Nice try, ${name}!`;
    $('finalScore').textContent = S.score;
    $('finalInfo').textContent = `${hugs} hug${hugs === 1 ? '' : 's'} delivered · reached level ${S.level}` + (isBest ? '' : ` · best ${best}`);
    $('finalStars').textContent = `${earned} Rosenberg Star${earned === 1 ? '' : 's'}`;
    $('newBest').hidden = !isBest;
    A.portrait($('overFace'), S.kid, { pose: hugs >= 5 ? 'celebrate' : 'shrug', t: 0.3 });
    $('over').hidden = false;
    $('pad').classList.remove('live');
  }

  function reachHome(spot) {
    const P = S.P;
    const who = FAMILY[S.kid][spot];
    S.hugged[spot] = true; S.hugT[spot] = S.t;
    P.home = { spot, t: 0 };
    const secs = Math.floor(S.lifeLeft);
    addScore(50 + secs * 10, SPOTS[spot] + 0.5, zOf(0), `HUG! +${50 + secs * 10}`);
    if (S.homeStar.spot === spot) { collectStar(SPOTS[spot] + 0.5, 0.8, zOf(0)); S.homeStar.spot = -1; S.homeStar.next = 8; }
    sfx.hug();
    burst(SPOTS[spot] + 0.5, 1.2, zOf(0), ['#FF5C8A', '#FFD23F', '#FFFFFF', '#7ACDF6'], 26, 3);
    banner(`HUG ${CALL[who].toUpperCase()}!`, 'gold');
    hud();
  }

  function finishHug() {
    S.checkpoint = false; // each trip to the family starts back at the sidewalk
    if (S.hugged.every(Boolean)) {
      S.levelsCleared++;
      addScore(1000, COLS / 2, zOf(3), 'EVERYONE HUGGED! +1000');
      S.level++;
      sfx.level();
      banner(`LEVEL ${S.level}`, 'gold', 'Everyone got a hug! Now it gets busier.');
      S.hugged = [false, false, false, false, false];
      S.homeStar = { spot: -1, t: 0, next: 8 };
      S.fart.next = 3;
      buildLanes(S.level);
      S.dog = S.level >= 4 ? { x: -2, dir: 1, speed: 1 + S.level * 0.12 } : null;
    }
    resetPlayer();
    hud();
  }

  function collectStar(X, Y, Z) {
    S.stars++;
    addScore(200, X, Z, '★ +200');
    sfx.star();
    burst(X, Y, Z, ['#FFD23F', '#FFF3B0', '#F29E0C'], 18, 2.4);
  }

  // ---------- movement ----------
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function tryHop(dir) {
    if (S.mode !== 'play' || S.paused) return;
    const P = S.P;
    if (!P || P.dead || P.home) return;
    if (P.hop) { S.queued = dir; return; }
    const [dx, dy] = DIRS[dir];
    P.face = dir;
    const trow = P.row + dy;
    if (trow < 0 || trow > ROWS - 1) return;
    let tx = P.x + dx;
    if (!isRiver(trow)) tx = Math.round(tx);
    if (trow === 0) {
      // Snap into a family spot you're close to. Early on, prefer someone still waiting and be generous.
      const easy = easyLevel(S.level);
      const pool = SPOTS.filter((c, i) => !easy || !S.hugged[i]);
      const near = (pool.length ? pool : SPOTS).reduce((b, c) => (Math.abs(c - tx) < Math.abs(b - tx) ? c : b));
      if (Math.abs(near - tx) < (easy ? 1.2 : 0.62)) tx = near;
    }
    tx = clamp(tx, 0, COLS - 1);
    // Where will we land, and how high? (a log is taller than the water)
    let h1 = groundH(trow), item = null;
    if (isRiver(trow)) { item = supportAt(laneByRow[trow], tx); h1 = item ? PLATFORM_H[laneByRow[trow].kind] : 0; }
    P.hop = { fx: P.x, frow: P.row, tx, trow, t: 0, h0: P.h, h1 };
    sfx.hop();
  }

  function supportAt(lane, fx) {
    const cx = fx + 0.5;
    for (const it of lane.items) {
      const x = itemX(it);
      const grip = easyLevel(S.level) ? -0.15 : 0.06; // early on you can land a little past the end of a log
      if (cx >= x + grip && cx <= x + it.len - grip && diveState(it, S.t).depth < 0.6) return it;
    }
    return null;
  }
  function hitsVehicle(lane, fx) {
    const pad = easyLevel(S.level) ? 0.1 : 0; // near misses count as misses early on
    const a = fx + 0.22 + pad, b = fx + 0.78 - pad;
    for (const it of lane.items) {
      const x = itemX(it);
      if (b > x + 0.12 && a < x + it.len - 0.12) return true;
    }
    return false;
  }

  function landPlayer() {
    const P = S.P;
    if (P.row < P.furthest) { P.furthest = P.row; if (P.row > 0) addScore(10); }
    if (P.row === 6 && !S.checkpoint && S.level <= 3) { S.checkpoint = true; }
    if (P.row === 0) {
      const spot = SPOTS.findIndex((c) => Math.abs(c - P.x) < 0.05);
      if (spot === -1) return die('bush');
      if (S.hugged[spot]) return die('again', `You already hugged ${CALL[FAMILY[S.kid][spot]]}.`);
      return reachHome(spot);
    }
    P.h = groundH(P.row);
  }

  // ---------- update ----------
  function update(dt) {
    S.t += dt;
    for (const lane of lanes) for (const it of lane.items) it.pos = (((it.pos + lane.speed * dt) % PERIOD) + PERIOD) % PERIOD;

    for (const p of S.parts) { p.X += p.vx * dt; p.Y += p.vy * dt; p.Z += p.vz * dt; p.vy -= (p.g ?? 9) * dt; p.t += dt; if (p.Y < 0 && !p.ring) { p.Y = 0; p.vy *= -0.3; } }
    S.parts = S.parts.filter((p) => p.t < p.life);
    for (const f of S.floaters) f.t += dt;
    S.floaters = S.floaters.filter((f) => f.t < 1.3);

    // Fart Man flies over the river now and then
    const fm = S.fart;
    if (fm.t >= 0) {
      fm.t += dt;
      const X = -10 + fm.t * 7;
      if (Math.random() < dt * 30) S.parts.push({ X: X - 1.2, Y: 3.4 + rand(-0.2, 0.2), Z: 8.5, vx: rand(-1, -0.3), vy: rand(-0.2, 0.3), vz: 0, t: 0, life: 1.2, col: 'rgba(160,220,90,.55)', r: rand(0.12, 0.25), g: 0, cloud: true });
      if (X > COLS + 10) { fm.t = -1; fm.next = rand(25, 40); }
    } else if (S.mode === 'play') {
      fm.next -= dt;
      if (fm.next <= 0) { fm.t = 0; sfx.fart(); }
    }

    if (S.mode !== 'play') return;

    // A gold star rides a log or float now and then
    S.itemStarNext -= dt;
    if (S.itemStarNext <= 0) {
      S.itemStarNext = rand(10, 16);
      const hasStar = lanes.some((l) => l.items.some((it) => it.star));
      if (!hasStar) {
        const opts = [];
        for (const l of lanes) if (l.river) for (const it of l.items) if (!it.diver && it.len >= 2) opts.push(it);
        if (opts.length) { const it = opts[Math.floor(Math.random() * opts.length)]; it.star = { off: Math.floor(Math.random() * it.len) }; }
      }
    }
    // ...and sometimes waits on a family spot
    const hs = S.homeStar;
    if (hs.spot >= 0) { hs.t -= dt; if (hs.t <= 0) { hs.spot = -1; hs.next = rand(7, 12); } }
    else {
      hs.next -= dt;
      const free = S.hugged.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
      if (hs.next <= 0 && free.length) { hs.spot = free[Math.floor(Math.random() * free.length)]; hs.t = 6; }
    }

    // The dog trots along the park path
    const dog = S.dog;
    if (dog) {
      dog.x += dog.dir * dog.speed * dt;
      if (dog.x > COLS + 2) dog.dir = -1;
      if (dog.x < -3) dog.dir = 1;
    }

    const P = S.P;
    if (P.dead) {
      P.dead.t += dt;
      if (P.dead.t >= DEATH_TIME) afterDeath();
      return;
    }
    if (P.home) {
      P.home.t += dt;
      if (P.home.t >= HUG_TIME) finishHug();
      return;
    }

    const before = Math.ceil(S.lifeLeft);
    S.lifeLeft -= dt;
    if (S.lifeLeft <= 6 && Math.ceil(S.lifeLeft) !== before) sfx.tick();
    if (S.lifeLeft <= 0) { S.lifeLeft = 0; return die('time'); }

    if (P.hop) {
      const h = P.hop;
      const dl = laneByRow[h.trow];
      if (dl && dl.river) { h.fx += dl.speed * dt; h.tx += dl.speed * dt; }
      h.t += dt / HOP_TIME;
      const k = Math.min(1, h.t);
      P.x = lerp(h.fx, h.tx, k);
      P.vrow = lerp(h.frow, h.trow, k);
      P.h = lerp(h.h0, h.h1, k);
      const mid = Math.round(P.vrow), ml = laneByRow[mid];
      if (ml && !ml.river && hitsVehicle(ml, P.x)) { P.row = mid; return die('road'); }
      if (h.t >= 1) {
        P.x = h.tx; P.row = h.trow; P.hop = null; P.vrow = null;
        landPlayer();
        if (P.home || P.dead) return;
        if (S.queued) { const q = S.queued; S.queued = null; tryHop(q); }
      }
      if (P.hop) return;
    }

    const lane = laneByRow[P.row];
    if (lane && lane.river) {
      const it = supportAt(lane, P.x);
      if (!it) return die('water');
      P.item = it;
      const ds = diveState(it, S.t);
      P.h = PLATFORM_H[lane.kind] - ds.depth * 0.3;
      P.x += lane.speed * dt;
      if (P.x < -0.4 || P.x > COLS - 0.6) return die('edge');
      if (it.star && Math.abs(P.x + 0.5 - (itemX(it) + it.star.off + 0.5)) < 0.75) {
        collectStar(itemX(it) + it.star.off + 0.5, P.h + 0.8, zOf(P.row));
        it.star = null;
      }
    } else {
      P.item = null;
      if (lane && hitsVehicle(lane, P.x)) return die('road');
      if (dog && P.row === 6 && Math.abs(dog.x - (P.x + 0.5)) < 0.9) return die('dog');
    }
  }

  function burst(X, Y, Z, cols, n, sp = 2.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      S.parts.push({ X, Y, Z, vx: Math.cos(a) * rand(0.5, 1) * sp, vy: rand(2, 5), vz: Math.sin(a) * rand(0.3, 0.7) * sp, t: 0, life: rand(0.6, 1.1), col: cols[i % cols.length], r: rand(0.04, 0.09) });
    }
  }

  // ---------- camera ----------
  const CAM_H = 8.5, PITCH = 0.9, AHEAD = 3.2;
  const cosP = Math.cos(PITCH), sinP = Math.sin(PITCH), LOOK = CAM_H / Math.tan(PITCH);
  let W = 800, H = 600, dpr = 1, F = 300, CX = 400, CY = 300, camZ = 0, touchUI = false, viewCols = 13.8;

  // Ground point (X, Z) at height 0 -> screen. s = screen px per tile at that depth.
  function proj(X, Z) {
    const px = X - S.camX, pz = Z - camZ;
    const d = CAM_H * sinP + pz * cosP;
    const u = -CAM_H * cosP + pz * sinP;
    const inv = F / d;
    return { x: CX + px * inv, y: CY - u * inv, s: inv, d };
  }
  // Heights use the cut-out convention (not foreshortened), so sprites and ground agree.
  function projH(X, Y, Z) { const p = proj(X, Z); p.y -= Y * p.s; return p; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    touchUI = document.body.classList.contains('touch');
    // Fit: the whole width of the board at the kid's row, and from 2 rows behind to ~9 ahead
    const rel = (dz) => { const pz = LOOK + dz - AHEAD; const d = CAM_H * sinP + pz * cosP; return { a: (-CAM_H * cosP + pz * sinP) / d, d }; };
    const nearA = rel(-2.3), farA = rel(9.5), atP = rel(0);
    const top = 76, bottom = H - (touchUI ? 150 : 20);
    // Tall phone screens show fewer columns (bigger kids) and the camera pans sideways instead
    viewCols = clamp(13.8 * (W / H) * 1.3, 8.5, 13.8);
    const fW = (W * atP.d) / viewCols;
    const fH = (bottom - top) / (farA.a - nearA.a);
    F = Math.min(fW, fH);
    CX = W / 2;
    CY = bottom + F * nearA.a;
  }

  // ---------- drawing helpers ----------
  function groundQuad(z0, z1, x0, x1, fill, h = 0) {
    const a = projH(x0, h, z0), b = projH(x1, h, z0), c = projH(x1, h, z1), d = projH(x0, h, z1);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  // Vertical face along the near edge of a raised strip
  function frontFace(z, x0, x1, h, fill) {
    const a = proj(x0, z), b = proj(x1, z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y - h * b.s); ctx.lineTo(a.x, a.y - h * a.s); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function blit(sp, sil, x, y, k, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * k, k);
    ctx.drawImage(sil ? sp.sil : sp.cv, -sp.ox, -sp.oy, sp.w, sp.h);
    ctx.restore();
  }
  // A side-view sprite pushed back into the scene: silhouettes from the far face forward, art on the near face.
  function drawExtruded(sp, X, Z, depthZ, dir, h = 0, alpha = 1) {
    const n = projH(X, h, Z - depthZ * 0.3), f = projH(X, h, Z + depthZ * 0.2);
    if (n.d <= 0.2) return;
    ctx.globalAlpha = alpha;
    A.shadow(ctx, n.x, (n.y + f.y) / 2 + 2, (sp.w / 2) * (n.s / PPT) * 0.9, Math.abs(n.y - f.y) * 0.8 + 3, 0.28);
    const steps = clamp(Math.ceil(Math.hypot(n.x - f.x, n.y - f.y) / 1.5), 2, 16);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      blit(sp, true, lerp(f.x, n.x, t), lerp(f.y, n.y, t), lerp(f.s, n.s, t) / PPT, dir);
    }
    blit(sp, false, n.x, n.y, n.s / PPT, dir);
    ctx.globalAlpha = 1;
  }
  function edgeFade(x, len) {
    const out = Math.max(-(x + len), x - COLS, 0);
    return clamp(1 - (out - 2.5) / 3, 0, 1);
  }

  // A ring lying on the water: an inner tube or a pool float. rx, rz in tiles.
  function drawRing(X, Z, rx, rz, h, col, alpha, wob) {
    const N = 22, pts = (r1, r2, y) => {
      const out = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * TAU + wob; const p = projH(X + Math.cos(a) * r1, y, Z + Math.sin(a) * r2); out.push(p); }
      return out;
    };
    const path = (arr) => { ctx.beginPath(); arr.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
    ctx.globalAlpha = alpha;
    const base = proj(X, Z);
    A.shadow(ctx, base.x, base.y + 2, rx * base.s * 1.05, rz * base.s * 0.75, 0.25);
    const th = 0.14;
    path(pts(rx, rz, h)); ctx.fillStyle = A.shade(col, -0.3); ctx.fill();
    const top = pts(rx, rz, h + th);
    path(top);
    const c0 = projH(X, h + th, Z);
    ctx.fillStyle = A.rad(ctx, c0.x - rx * c0.s * 0.3, c0.y - rz * c0.s * 0.6, 1, c0.x, c0.y, rx * c0.s * 1.1, [A.shade(col, 0.4), col, A.shade(col, -0.15)]);
    ctx.fill();
    path(pts(rx * 0.46, rz * 0.46, h + th)); ctx.fillStyle = A.shade(col, -0.35); ctx.fill();
    path(pts(rx * 0.4, rz * 0.4, h + th * 0.2)); ctx.fillStyle = 'rgba(40,150,200,.9)'; ctx.fill();
    // shine
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, c0.s * 0.04); ctx.lineCap = 'round';
    ctx.beginPath(); top.slice(12, 17).forEach((p, i) => { const q = { x: lerp(p.x, c0.x, 0.25), y: lerp(p.y, c0.y, 0.25) }; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawCharAt(id, X, Y, Z, st, scaleMul = 1) {
    const p = projH(X, Y, Z);
    if (p.d <= 0.2) return p;
    const k = (p.s / 80) * scaleMul;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(k, k);
    A.drawChar(ctx, A.CHARS[id], st);
    ctx.restore();
    return p;
  }

  function nameTag(text, x, y, s, bg = '#FFFFFF', ink = '#1E2A5A') {
    const size = clamp(s * 0.2, 9, 16);
    ctx.font = `700 ${size}px ${A.FONT}`;
    const w = ctx.measureText(text).width + size * 1.1, h = size * 1.6;
    ctx.fillStyle = 'rgba(30,42,90,.18)'; A.rr(ctx, x - w / 2, y - h + 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = bg; A.rr(ctx, x - w / 2, y - h, w, h, h / 2); ctx.fill();
    A.text(ctx, text, x, y - h / 2 + 0.5, size, ink, { weight: 700 });
  }

  function heart(x, y, r, col = '#FF5C8A') {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fill();
  }

  // ---------- scene ----------
  const LAWN_A = '#8FD36F', LAWN_B = '#83CA63';
  function drawGround() {
    const zMin = camZ - CAM_H * Math.tan(PITCH) + 0.35;
    const X0 = -70, X1 = COLS + 70;
    // far meadow out to the horizon
    groundQuad(21.5, 400, X0 * 4, X1 * 4, '#86CC68', 0.18);
    for (let r = -9; r <= 20; r++) {
      const Z = zOf(r);
      let z0 = Z - 0.5; const z1 = Z + 0.5;
      if (z1 < zMin) continue;
      z0 = Math.max(z0, zMin);
      if (projH(0, 0, z1).y > H + 40) continue;
      const h = groundH(r);
      if (r <= 0 || r >= 13) groundQuad(z0, z1, X0, X1, (r & 1) ? LAWN_A : LAWN_B, h);
      else if (r === 6) {
        groundQuad(z0, z1, X0, X1, LAWN_A, h);
        groundQuad(Z - 0.3, Z + 0.3, X0, X1, '#EBD7A6', h);
        groundQuad(Z - 0.3, Z - 0.24, X0, X1, 'rgba(160,120,60,.25)', h);
      } else if (r === 12) {
        groundQuad(z0, z1, X0, X1, '#E6E0D3', h);
      }
    }
    // the river: one sheet, lighter toward the camera
    const rz0 = zOf(5) - 0.5, rz1 = zOf(1) + 0.5;
    const a = proj(0, rz1), b = proj(0, rz0);
    const wg = ctx.createLinearGradient(0, a.y, 0, b.y);
    wg.addColorStop(0, '#1C9AD6'); wg.addColorStop(1, '#43C4EE');
    groundQuad(rz0, rz1, X0, X1, wg);
    // current lines
    ctx.lineCap = 'round';
    for (let r = 1; r <= 5; r++) {
      const lane = laneByRow[r], Z = zOf(r);
      const sp = lane ? lane.speed * 0.45 : 0.3;
      for (let i = 0; i < 16; i++) {
        const span = 34, x = ((((i * 2.3 + r * 1.7 + S.t * sp) % span) + span) % span) - 10.5;
        const z = Z + (((i * 37) % 7) / 7 - 0.5) * 0.8;
        const p0 = proj(x, z), p1 = proj(x + 0.35, z - 0.04), p2 = proj(x + 0.7, z);
        if (p0.d <= 0.2) continue;
        ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1, p0.s * 0.035);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(p1.x, p1.y - p0.s * 0.05, p2.x, p2.y); ctx.stroke();
      }
    }
    // sandy banks
    groundQuad(rz1 - 0.08, rz1, X0, X1, '#F2DDA4');
    groundQuad(rz0, rz0 + 0.1, X0, X1, 'rgba(255,255,255,.35)');
    // the family's lawn is raised: stone wall along the water
    frontFace(zOf(0) - 0.5, X0, X1, groundH(0), '#B9B2A6');
    const wz = zOf(0) - 0.5;
    for (let x = -12; x < COLS + 12; x += 0.8) {
      const p = proj(x + ((x * 10) % 2 ? 0.4 : 0), wz), q = proj(x + 0.55, wz);
      if (p.d <= 0.2) break;
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(p.x, p.y - groundH(0) * p.s * 0.7, q.x - p.x, Math.max(1, p.s * 0.035));
    }
    // road
    const roadZ0 = zOf(11) - 0.5, roadZ1 = zOf(7) + 0.5;
    groundQuad(roadZ0, roadZ1, X0, X1, '#596074');
    for (let r = 7; r < 11; r++) {
      const z = zOf(r) - 0.5;
      for (let x = -20; x < COLS + 20; x += 1.5) groundQuad(z - 0.035, z + 0.035, x, x + 0.75, r === 8 ? '#FFD23F' : 'rgba(255,255,255,.75)');
    }
    // crosswalk stripes straight up the middle of the street
    for (let r = 7; r <= 11; r++) {
      const z = zOf(r);
      for (let x = 4.6; x < 8.4; x += 0.7) groundQuad(z - 0.42, z + 0.42, x, x + 0.34, 'rgba(255,255,255,.12)');
    }
    // curbs
    frontFace(roadZ1, X0, X1, groundH(6), '#C9C4BA');
    groundQuad(roadZ1, roadZ1 + 0.1, X0, X1, '#DAD5CB', groundH(6));
    groundQuad(roadZ0 - 0.1, roadZ0, X0, X1, '#CFCAC0', groundH(12));
    // sidewalk seams
    const sz = zOf(12);
    ctx.strokeStyle = 'rgba(120,110,95,.25)'; ctx.lineWidth = 1;
    for (let x = -14; x <= COLS + 14; x++) {
      const p = projH(x, 0.12, sz - 0.5), q = projH(x, 0.12, sz + 0.4);
      if (p.d <= 0.2) continue;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    // the play area: everything off the sides is a little dimmer
    for (const [xa, xb] of [[X0, 0], [COLS, X1]]) groundQuad(zMin, zOf(0) + 0.5, xa, xb, 'rgba(25,40,90,.16)');
    // welcome mats on the family lawn
    const hz = zOf(0);
    SPOTS.forEach((c, i) => {
      const hugged = S.hugged[i];
      groundQuad(hz - 0.4, hz + 0.32, c + 0.08, c + 0.92, hugged ? '#FF8DB0' : '#FFFFFF', 0.19);
      groundQuad(hz - 0.33, hz + 0.25, c + 0.16, c + 0.84, hugged ? '#FF5C8A' : A.CHARS[FAMILY[S.kid][i]].shirt || '#F3ECE0', 0.2);
    });
  }

  // Static scenery on each row: [row] -> list of { X, draw(p) }
  const SCENERY = [];
  function addScenery(row, X, kind, o = {}) { SCENERY.push({ row, Z: zOf(row) + (o.dz || 0), X, kind, ...o }); }
  (function buildScenery() {
    for (let c = 0; c < COLS; c++) if (!SPOTS.includes(c)) addScenery(0, c + 0.5, 'bush', { seed: c, flowers: c % 3 === 0 ? '#FF6B8B' : c % 3 === 1 ? '#FFD23F' : null, dz: 0.12 });
    for (const x of [-2.5, -5, -8, 15.5, 18, 21]) addScenery(0, x, 'tree', { tk: x < 0 ? 'round' : 'blossom', seed: Math.abs(x * 3) | 0 });
    for (const x of [-1.5, 14.5]) addScenery(0, x, 'bush', { seed: 5, flowers: '#B18CFF' });
    for (const x of [-4, 2, 9.5, 17]) addScenery(-2, x, 'tree', { tk: 'deep', seed: Math.abs(x * 7) | 0, dz: 0.3 });
    addScenery(-4, 6.2, 'house', { dz: 0.2 });
    addScenery(-3, 13.1, 'cx50', { dz: 0.4 });
    for (const x of [-9, -3, 16, 22]) addScenery(-5, x, 'tree', { tk: x > 0 ? 'gold' : 'round', seed: Math.abs(x) | 0 });
    for (const x of [-1.2, 14.2]) addScenery(6, x, 'lamp', {});
    addScenery(6, -3.2, 'bench', {}); addScenery(6, 16.2, 'bench', {});
    for (const x of [-6, 19]) addScenery(6, x, 'tree', { tk: 'round', seed: 4 });
    for (const x of [-1.2, 14.2]) addScenery(12, x, 'lamp', { dz: -0.3 });
    addScenery(13, 11.6, 'sign', {});
    for (const x of [-3, -7, 16, 20]) addScenery(14, x, 'tree', { tk: x < 0 ? 'blossom' : 'round', seed: Math.abs(x) | 0 });
    for (const x of [2, 5, 9]) addScenery(14, x, 'flowers', { seed: x * 11 });
    for (const x of [-1, 14]) addScenery(15, x, 'bush', { seed: 2, flowers: '#FF6B8B' });
  })();

  function drawScenery(o) {
    const p = projH(o.X, groundH(o.row), o.Z);
    if (p.d <= 0.4 || p.x < -400 || p.x > W + 400 || p.y < -500 || p.y > H + 300) return;
    ctx.save(); ctx.translate(p.x, p.y);
    const s = p.s;
    switch (o.kind) {
      case 'bush': { const k = s / 62; A.shadow(ctx, 0, 0, s * 0.55, s * 0.18, 0.25); ctx.scale(k, k); A.bush(ctx, 1, o.flowers, o.seed); break; }
      case 'tree': { const k = (s * 2.8) / 185; A.shadow(ctx, 0, 0, s * 0.9, s * 0.25, 0.25); ctx.scale(k, k); A.tree(ctx, o.tk || 'round', 1, o.seed, Math.sin(S.t * 1.3 + o.X) * 0.02); break; }
      case 'lamp': { const k = s / 60; ctx.scale(k, k); A.prop.lamp(ctx, S.t); break; }
      case 'bench': { const k = s / 70; ctx.scale(k, k); A.prop.bench(ctx); break; }
      case 'flowers': { const k = s / 50; ctx.scale(k, k); A.flowers(ctx, o.seed, 70, 20); break; }
      case 'house': {
        const k = (s * 12.5) / 780;
        const sp = A.sprite('house', 820, 290, 330, 268, (c) => B.house(c));
        ctx.scale(k, k); A.shadow(ctx, 83, 0, 420, 26, 0.2); A.blit(ctx, sp, 0, 0);
        break;
      }
      case 'cx50': {
        const k = s / 100;
        const sp = A.sprite('cxfront', 170, 130, 85, 118, (c) => A.drawCarFront(c, '#16181D'));
        ctx.scale(k, k); A.shadow(ctx, 0, 0, 80, 12, 0.3); A.blit(ctx, sp, 0, 0);
        break;
      }
      case 'sign': {
        const k = s / 60; ctx.scale(k, k);
        ctx.fillStyle = '#6E4A30'; A.rr(ctx, -4, -80, 8, 80, 3); ctx.fill();
        ctx.fillStyle = '#2EB872'; A.rr(ctx, -56, -96, 112, 34, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; A.rr(ctx, -52, -93, 104, 5, 2.5); ctx.fill();
        A.text(ctx, 'ROSENBERG', 0, -86, 13, '#FFFFFF', { weight: 700 });
        A.text(ctx, 'CROSSING ↑', 0, -71, 11, '#FFF6C9', { weight: 700 });
        break;
      }
    }
    ctx.restore();
  }

  function drawLaneItems(lane) {
    const Z = zOf(lane.row);
    for (const it of lane.items) {
      const x = itemX(it);
      const fade = edgeFade(x, it.len);
      if (fade <= 0) continue;
      const cxw = x + it.len / 2;
      if (lane.kind === 'veh') {
        const dir = lane.speed > 0 ? 1 : -1;
        const bob = Math.abs(Math.sin(S.t * 14 + it.pos)) * 0.015;
        drawExtruded(vehSprite(it.type, it.col, dir), cxw, Z, VEH[it.type].depth, 1, bob, fade);
      } else if (lane.kind === 'log') {
        const bob = Math.sin(S.t * 2.2 + it.pos) * 0.025;
        drawExtruded(logSprite(it.len), cxw, Z, 0.72, 1, bob - 0.02, fade);
        // ripples where the log meets the water
        const e0 = proj(x + 0.1, Z - 0.3), e1 = proj(x + it.len - 0.1, Z - 0.3);
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * fade})`; ctx.lineWidth = Math.max(1, e0.s * 0.03);
        ctx.beginPath(); ctx.moveTo(e0.x, e0.y + 1); ctx.lineTo(e1.x, e1.y + 1); ctx.stroke();
      } else if (lane.kind === 'tube') {
        const ds = diveState(it, S.t);
        const wob = ds.warn ? Math.sin(S.t * 40) * 0.12 * ds.warn : 0;
        for (let k = 0; k < it.len; k++) {
          const h = 0.03 + Math.sin(S.t * 2.6 + k + it.pos) * 0.02 - ds.depth * 0.35;
          const X = x + k + 0.5 + (ds.warn ? Math.sin(S.t * 30 + k) * 0.03 : 0);
          if (ds.depth >= 0.98) {
            const p = proj(X, Z);
            ctx.strokeStyle = `rgba(255,255,255,${0.35 * fade})`; ctx.lineWidth = Math.max(1, p.s * 0.03);
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * (0.3 + Math.sin(S.t * 4 + k) * 0.05), p.s * 0.12, 0, 0, TAU); ctx.stroke();
            continue;
          }
          drawRing(X, Z, 0.42, 0.34, h, it.tubes[k], fade * (1 - ds.depth * 0.8), wob);
        }
        if (ds.depth > 0.1 && ds.depth < 0.95 && Math.random() < 0.25) S.parts.push({ X: x + Math.random() * it.len, Y: 0, Z: Z + rand(-0.3, 0.3), vx: 0, vy: 1.2, vz: 0, t: 0, life: 0.5, col: 'rgba(255,255,255,.8)', r: 0.05, g: 0 });
      } else if (lane.kind === 'float') {
        const bob = Math.sin(S.t * 2 + it.pos) * 0.02;
        const col = it.duck ? '#FFD23F' : '#FF8DB8';
        drawRing(cxw, Z, it.len * 0.47, 0.36, bob, col, fade, 0);
        // the float's head and neck at the front
        const dir = lane.speed > 0 ? 1 : -1;
        const hp = projH(cxw + dir * it.len * 0.38, 0.2 + bob, Z - 0.05);
        const k = hp.s / 60;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(hp.x, hp.y); ctx.scale(dir * k, k);
        if (it.duck) {
          ctx.fillStyle = A.gloss(ctx, 2, -22, 14, '#FFD23F'); ctx.beginPath(); ctx.arc(2, -24, 13, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF8A3D'; A.ell(ctx, 16, -20, 9, 4.5); ctx.fill();
          ctx.fillStyle = '#1E2A5A'; ctx.beginPath(); ctx.arc(7, -28, 2.6, 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = '#FF8DB8'; ctx.lineWidth = 8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-10, -30, 2, -44); ctx.stroke();
          ctx.fillStyle = A.gloss(ctx, 6, -46, 9, '#FF8DB8'); ctx.beginPath(); ctx.arc(6, -46, 8.5, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(12, -48); ctx.lineTo(22, -44); ctx.lineTo(13, -41); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#1E2A5A'; ctx.beginPath(); ctx.moveTo(18, -45.5); ctx.lineTo(22, -44); ctx.lineTo(18, -42.5); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(8, -48, 1.8, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      // a gold star riding along
      if (it.star) {
        const X = x + it.star.off + 0.5, hgt = (PLATFORM_H[lane.kind] || 0) + 0.55 + Math.sin(S.t * 4) * 0.08;
        const p = projH(X, hgt, Z);
        A.shadow(ctx, p.x, proj(X, Z).y - PLATFORM_H[lane.kind] * p.s, p.s * 0.2, p.s * 0.07, 0.3);
        A.goldStar(ctx, p.x, p.y, p.s * 0.26, S.t);
      }
    }
  }

  const FACE = { up: { back: true, side: 0, dir: 1 }, down: { side: 0, dir: 1 }, left: { side: 1, dir: -1 }, right: { side: 1, dir: 1 } };

  function drawFamily() {
    const hz = zOf(0) + 0.28, h = groundH(0);
    FAMILY[S.kid].forEach((id, i) => {
      const X = SPOTS[i] + 0.5;
      const hugged = S.hugged[i];
      const P = S.P;
      const hugging = P && P.home && P.home.spot === i;
      const eager = !hugged && P && S.mode === 'play' && P.row <= 5 && P.row >= 1;
      const since = S.t - S.hugT[i];
      const pose = hugging || (hugged && since < 2) ? 'celebrate' : eager && Math.sin(S.t * 1.7 + i * 1.3) > 0.2 ? 'wave' : null;
      const pp = projH(X, h, hz);
      A.shadow(ctx, pp.x, pp.y, pp.s * 0.3, pp.s * 0.1, 0.3);
      const p = drawCharAt(id, X, h, hz, { t: S.t + i * 0.7, side: 0, dir: i < 2 ? 1 : -1, pose, pt: 0.5, blink: ((S.t + i) % 4) < 0.12 }, 1);
      const top = p.y - p.s * 1.45;
      if (hugged) {
        heart(p.x, top - p.s * 0.08 + Math.sin(S.t * 3 + i) * p.s * 0.05, p.s * 0.16);
      } else {
        nameTag(CALL[id], p.x, top, p.s);
        if (S.homeStar.spot === i) {
          const sp = projH(X, h + 0.5 + Math.sin(S.t * 4) * 0.06, zOf(0) - 0.05);
          A.goldStar(ctx, sp.x, sp.y, sp.s * 0.26, S.t);
        }
      }
    });
  }

  function drawPlayer() {
    const P = S.P;
    if (!P || S.mode === 'title') return;
    const f = FACE[P.face];
    const t = S.t;
    if (P.home) {
      const X = SPOTS[P.home.spot] + 0.5;
      const pp = projH(X, groundH(0), zOf(0) - 0.08);
      A.shadow(ctx, pp.x, pp.y, pp.s * 0.28, pp.s * 0.09, 0.3);
      drawCharAt(S.kid, X - 0.12, groundH(0), zOf(0) - 0.08, { t, side: 0, dir: 1, pose: 'celebrate', pt: 0.5 });
      return;
    }
    const row = P.hop ? P.vrow : P.row;
    const Z = zOf(row), X = P.x + 0.5;
    if (P.dead) {
      const d = P.dead, k = Math.min(1, d.t / DEATH_TIME);
      if (d.kind === 'water' || d.kind === 'edge') {
        const p = proj(X, Z);
        for (let i = 0; i < 3; i++) {
          const r = (0.15 + k * 0.7 + i * 0.16) * p.s;
          ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - k)})`; ctx.lineWidth = Math.max(1, p.s * 0.04);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.35, 0, 0, TAU); ctx.stroke();
        }
        if (k < 0.6) {
          // sink below the surface
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, p.y); ctx.clip();
          drawCharAt(S.kid, X, -k * 1.9, Z, { t, side: 0, dir: 1, pose: 'splash', pt: 0.5 });
          ctx.restore();
        }
      } else if (d.kind === 'road') {
        const p = projH(X, 0, Z);
        ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - 0.65) / 0.35;
        ctx.translate(p.x, p.y); ctx.scale(1.35, 0.32); ctx.translate(-p.x, -p.y);
        drawCharAt(S.kid, X, 0, Z, { t: 0, side: 0, dir: 1, pose: 'fall', pt: 1 });
        ctx.restore();
        for (let i = 0; i < 3; i++) {
          const a = d.t * 5 + (i * TAU) / 3;
          const sp = projH(X + Math.cos(a) * 0.4, 0.55 + Math.sin(a) * 0.08, Z);
          A.goldStar(ctx, sp.x, sp.y, sp.s * 0.12, d.t * 3 + i);
        }
      } else {
        const pose = d.kind === 'time' ? 'shrug' : 'fall';
        ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        drawCharAt(S.kid, X, P.h, Z, { t, side: 0, dir: 1, pose, pt: 1 });
        ctx.restore();
        if (d.kind === 'bush' || d.kind === 'dog' || d.kind === 'again') {
          for (let i = 0; i < 3; i++) {
            const a = d.t * 5 + (i * TAU) / 3;
            const sp = projH(X + Math.cos(a) * 0.35, P.h + 1.35 + Math.sin(a) * 0.08, Z);
            A.goldStar(ctx, sp.x, sp.y, sp.s * 0.1, d.t * 3 + i);
          }
        }
      }
      return;
    }
    const k = P.hop ? Math.min(1, P.hop.t) : 1;
    const arc = P.hop ? Math.sin(k * Math.PI) * 0.55 : 0;
    const base = P.h;
    const sh = projH(X, base, Z);
    A.shadow(ctx, sh.x, sh.y, sh.s * 0.3 * (1 - arc * 0.4), sh.s * 0.1 * (1 - arc * 0.4), 0.32);
    drawCharAt(S.kid, X, base + arc, Z, { t, move: 0, side: f.side, dir: f.dir, back: f.back, pose: P.hop ? 'jump' : null, pt: k, blink: (t % 3.6) < 0.1 });
  }

  function drawDog() {
    const d = S.dog;
    if (!d) return;
    const Z = zOf(6) + 0.1;
    const p = projH(d.x, groundH(6), Z);
    if (p.d <= 0.2) return;
    A.shadow(ctx, p.x, p.y, p.s * 0.8, p.s * 0.16, 0.28);
    const k = (p.s * 1.5) / 110;
    ctx.save(); ctx.translate(p.x - d.dir * p.s * 0.05, p.y); ctx.scale(k, k);
    A.drawDog(ctx, { t: S.t, move: 1, dir: d.dir, happy: true });
    ctx.restore();
  }

  function drawFartMan() {
    const fm = S.fart;
    if (fm.t < 0) return;
    const X = -10 + fm.t * 7;
    const p = projH(X, 3.4 + Math.sin(fm.t * 3) * 0.3, 8.5);
    if (p.d <= 0.2) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s / 70, p.s / 70);
    A.drawFartMan(ctx, S.t, 1);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of S.parts) {
      const q = projH(p.X, p.Y, p.Z);
      if (q.d <= 0.2) continue;
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = p.cloud ? a : Math.min(1, a * 1.5);
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, p.r * q.s * (p.cloud ? 1 + p.t : 1)), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of S.floaters) {
      const q = projH(f.X, f.Y + f.t * 0.9, f.Z);
      if (q.d <= 0.2) continue;
      ctx.globalAlpha = 1 - Math.max(0, f.t - 0.8) / 0.5;
      const x = clamp(q.x, 90, W - 90);
      A.text(ctx, f.text, x, q.y, clamp(q.s * 0.36, 15, 28), '#FFFFFF', { weight: 700, stroke: '#1E2A5A', strokeW: clamp(q.s * 0.08, 3, 6) });
    }
    ctx.globalAlpha = 1;
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    g.addColorStop(0, '#5DB8FF'); g.addColorStop(1, '#BFE6FF');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // distant hills sit on the horizon
    const hy = CY - F * Math.tan(PITCH);
    if (hy > -40) {
      ctx.fillStyle = '#A7D98C';
      ctx.beginPath(); ctx.moveTo(0, hy + 6);
      for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, hy - 18 - Math.sin(x * 0.012 + 1) * 16 - Math.sin(x * 0.031) * 6);
      ctx.lineTo(W, hy + 10); ctx.lineTo(0, hy + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 330 + S.t * 8) % (W + 300)) - 150, cy = hy - 80 - (i % 2) * 40;
        if (cy < -30) continue;
        ctx.beginPath(); ctx.arc(cx, cy, 22, 0, TAU); ctx.arc(cx + 24, cy - 8, 26, 0, TAU); ctx.arc(cx + 50, cy, 20, 0, TAU); ctx.fill();
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky();
    drawGround();

    // Everything upright, far rows first
    const P = S.P;
    const pZ = P && S.mode !== 'title' ? (P.home ? zOf(0) - 0.08 : zOf(P.hop ? P.vrow : P.row)) : -99;
    let playerDrawn = false;
    const rows = [];
    for (let r = -6; r <= 16; r++) rows.push(r);
    for (const r of rows) {
      const Z = zOf(r);
      if (!playerDrawn && Z < pZ - 0.02) { drawPlayer(); playerDrawn = true; }
      for (const o of SCENERY) if (o.row === r && o.Z > Z) drawScenery(o);
      if (r === 0) drawFamily();
      if (r === 6) drawDog();
      if (laneByRow[r]) drawLaneItems(laneByRow[r]);
      for (const o of SCENERY) if (o.row === r && o.Z <= Z) drawScenery(o);
      if (r === 3) drawFartMan();
    }
    if (!playerDrawn) drawPlayer();
    drawParticles();

    if (S.mode === 'play') {
      el.time.style.transform = `scaleX(${Math.max(0, S.lifeLeft / lifeTime(S.level))})`;
      el.time.classList.toggle('low', S.lifeLeft <= 10);
    }
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!S.paused) update(dt);
    // camera: follow the kid up the board; drift slowly on the title screen
    let target, tx = COLS / 2;
    if (S.mode === 'title') target = 5.5 + Math.sin(S.t * 0.15) * 3.5;
    else if (S.P) {
      const row = S.P.home ? 0 : S.P.hop ? S.P.vrow : S.P.row;
      target = clamp(zOf(row) + AHEAD, AHEAD, 13.2);
      const half = viewCols / 2 - 0.4;
      tx = viewCols < 13 ? clamp(S.P.x + 0.5, half, COLS - half) : COLS / 2 + (S.P.x + 0.5 - COLS / 2) * 0.12;
    }
    const kf = 1 - Math.exp(-dt * 4);
    S.camF += (target - S.camF) * kf;
    S.camX += (tx - S.camX) * kf;
    camZ = S.camF - LOOK;
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  window.addEventListener('keydown', (e) => {
    const dir = KEYMAP[e.code];
    if (dir && S.mode === 'play') { e.preventDefault(); if (!e.repeat) tryHop(dir); return; }
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'Enter' && S.mode === 'over') startGame();
  });

  let swipe = null;
  cv.addEventListener('pointerdown', (e) => { swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  window.addEventListener('pointerup', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (S.mode !== 'play') return;
    if (Math.hypot(dx, dy) < 18) return tryHop('up');
    if (Math.abs(dx) > Math.abs(dy)) tryHop(dx > 0 ? 'right' : 'left');
    else tryHop(dy > 0 ? 'down' : 'up');
  });
  window.addEventListener('pointercancel', () => { swipe = null; });
  window.addEventListener('touchstart', () => {
    if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); resize(); }
  }, { passive: true });

  for (const b of document.querySelectorAll('#pad button')) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); tryHop(b.dataset.dir); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => b.classList.remove('on'));
  }

  function togglePause() {
    if (S.mode !== 'play') return;
    S.paused = !S.paused;
    $('paused').hidden = !S.paused;
  }
  $('pauseBtn').addEventListener('click', (e) => { e.currentTarget.blur(); togglePause(); });
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', showTitle);
  $('soundBtn').addEventListener('click', () => muteBtn.click());
  $('againBtn').addEventListener('click', () => startGame());
  $('changeBtn').addEventListener('click', showTitle);
  const muteBtn = $('muteBtn');
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; $('soundBtn').textContent = muted ? 'SOUND: OFF' : 'SOUND: ON'; };
  muteBtn.addEventListener('click', () => { muted = !muted; store.set('rw-crossing-muted', muted ? '1' : '0'); paintMute(); muteBtn.blur(); });
  paintMute();
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play' && !S.paused) togglePause(); });
  window.addEventListener('resize', resize);

  // ---------- title ----------
  function buildCards() {
    const wrap = $('cards');
    const pref = (bridge && bridge.player) || store.get('rw-crossing-kid') || 'reuben';
    wrap.innerHTML = '';
    KIDS.forEach((id) => {
      const ch = A.CHARS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (id === pref ? ' me' : '');
      b.style.setProperty('--c', ch.color);
      b.style.setProperty('--c2', A.shade(ch.color, -0.3));
      const best = +store.get(`rw-crossing-best-${id}`) || 0;
      b.innerHTML = `<canvas width="300" height="330"></canvas><b>${ch.name.toUpperCase()}</b><small>${best ? `Best ${best}` : ch.tag}</small>`;
      A.portrait(b.querySelector('canvas'), id, { pose: 'wave', t: 0.4 });
      b.addEventListener('click', () => startGame(id));
      wrap.appendChild(b);
    });
  }
  function splitLogo(id, delay) {
    const e = $(id);
    e.innerHTML = [...e.textContent].map((ch, i) => `<span class="ch" style="animation-delay:${delay + i * 0.05}s">${ch}</span>`).join('');
  }

  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  splitLogo('logo1', 0.1); splitLogo('logo2', 0.5);
  buildLanes(1);
  S.P = newPlayer();
  resize();
  buildCards();
  // Portraits need the font for nothing, but redraw once fonts land so card text lines up
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (S.mode === 'title') buildCards(); });
  if (/[?&]dev\b/.test(location.search)) window.__crossing = { S, tryHop, laneByRow, reachHome };
  requestAnimationFrame(frame);
})();
