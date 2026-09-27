(() => {
  'use strict';

  // Board: 13 columns x 13 rows, drawn in tile units.
  // Row 0 = home bank, 1-5 = river, 6 = median, 7-11 = road, 12 = start.
  const COLS = 13, ROWS = 13;
  const MARGIN = 6, PERIOD = COLS + MARGIN * 2; // lanes wrap off-screen so long logs never pop in
  const BAYS = [0, 3, 6, 9, 12];
  const HOP_TIME = 0.11, LIFE_TIME = 30, DEATH_TIME = 1.2;

  const $ = (id) => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const stage = $('stage');

  // ---------- Lanes ----------
  // kind: log | turtle | car | truck | racer | dozer
  const LANE_DEFS = [
    { row: 1, kind: 'log', len: 3, count: 3, speed: 1.3 },
    { row: 2, kind: 'turtle', len: 2, count: 4, speed: -1.7, divers: [0, 2] },
    { row: 3, kind: 'log', len: 5, count: 2, speed: 2.1 },
    { row: 4, kind: 'log', len: 3, count: 3, speed: 0.9 },
    { row: 5, kind: 'turtle', len: 3, count: 4, speed: -1.1, divers: [1] },
    { row: 7, kind: 'truck', len: 2, count: 2, speed: -1.3, color: '#E8E2D0' },
    { row: 8, kind: 'racer', len: 1, count: 1, speed: 4.2, color: '#FF5FA2' },
    { row: 9, kind: 'car', len: 1, count: 3, speed: -1.8, color: '#5AB4FF' },
    { row: 10, kind: 'dozer', len: 1, count: 3, speed: 1.2, color: '#FFC23D' },
    { row: 11, kind: 'car', len: 1, count: 3, speed: -1.0, color: '#FF7A4D' },
  ];

  let lanes = [];
  const laneByRow = {};

  function buildLanes(level) {
    lanes = [];
    const mult = Math.min(1 + (level - 1) * 0.13, 2.1);
    for (const d of LANE_DEFS) {
      const river = d.row <= 5;
      let count = d.count;
      // Busier roads as you go; rivers get sparser
      if (!river && d.kind !== 'racer' && level >= 3) count += Math.min(Math.floor((level - 1) / 2), 2);
      if (river && d.kind === 'log' && level >= 4 && count > 2) count -= 1;
      if (d.kind === 'racer' && level >= 5) count = 2;
      const gap = PERIOD / count;
      const items = [];
      const jitter = Math.random() * PERIOD;
      for (let i = 0; i < count; i++) {
        items.push({
          pos: (jitter + i * gap + (Math.random() - 0.5) * Math.max(0, gap - d.len - 2) * 0.5) % PERIOD,
          len: d.len,
          diver: river && d.divers ? d.divers.includes(i) || (level >= 3 && i === count - 1) : false,
          phase: Math.random() * 6,
          color: d.color,
        });
      }
      const lane = { ...d, river, count, speed: d.speed * mult, items };
      lanes.push(lane);
      laneByRow[d.row] = lane;
    }
  }

  const itemX = (it) => it.pos - MARGIN;

  // Turtle dive cycle: 0 = surfaced, 1 = fully under
  const DIVE_CYCLE = 6.2;
  function diveDepth(it, t) {
    if (!it.diver) return 0;
    const p = (t + it.phase) % DIVE_CYCLE;
    if (p < 3.4) return 0;
    if (p < 4.1) return (p - 3.4) / 0.7;
    if (p < 5.5) return 1;
    return 1 - (p - 5.5) / 0.7;
  }

  // ---------- State ----------
  const S = {
    running: false, paused: false, over: false,
    score: 0, best: 0, level: 1, lives: 3, nextExtra: 10000,
    t: 0, lifeLeft: LIFE_TIME,
    homes: [false, false, false, false, false],
    fly: { bay: -1, t: 0, next: 7 },
    frog: null,
    queued: null,
    particles: [], floaters: [], banner: null,
  };

  function newFrog() {
    return { x: 6, y: 12, dir: 0, hop: null, dead: null, furthest: 12 };
  }

  try { S.best = +localStorage.getItem('frogger-best') || 0; } catch (e) { /* storage unavailable */ }

  // ---------- Audio ----------
  let actx = null, muted = false;
  try { muted = localStorage.getItem('frogger-muted') === '1'; } catch (e) { /* storage unavailable */ }
  function audio() {
    if (muted) return null;
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type = 'square', vol = 0.08, slide = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.15, lp = 1200) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  const sfx = {
    hop: () => tone(520, 0.06, 'square', 0.05, 260),
    squash: () => { noise(0.25, 0.22, 900); tone(160, 0.3, 'sawtooth', 0.08, -100); },
    splash: () => { noise(0.45, 0.2, 2200); tone(700, 0.3, 'sine', 0.06, -500); },
    home: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.06, 0, i * 0.08)),
    fly: () => [988, 1319].forEach((f, i) => tone(f, 0.08, 'triangle', 0.08, 0, i * 0.06)),
    level: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.06, 0, i * 0.1)),
    tick: () => tone(1200, 0.04, 'square', 0.03),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, 0, i * 0.18)),
    extra: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.08, 0, i * 0.07)),
  };

  // ---------- HUD ----------
  const el = { score: $('score'), best: $('best'), level: $('level'), lives: $('lives'), time: $('time') };
  function hud() {
    el.score.textContent = S.score;
    el.best.textContent = Math.max(S.best, S.score);
    el.level.textContent = S.level;
    const n = Math.max(0, S.lives - 1); // frogs waiting in reserve
    if (el.lives.dataset.n !== String(n)) {
      el.lives.dataset.n = n;
      el.lives.innerHTML = '<i></i>'.repeat(n) || '<small>LAST</small>';
    }
  }
  function addScore(n, x, y, label) {
    S.score += n;
    if (x !== undefined) S.floaters.push({ x, y, text: label || `+${n}`, t: 0 });
    if (S.score >= S.nextExtra) {
      S.nextExtra += 10000;
      S.lives++;
      sfx.extra();
      banner('EXTRA FROG!', '#FFD35C');
    }
    hud();
  }
  function banner(text, color = '#9BE15D', dur = 1.4) {
    S.banner = { text, color, t: 0, dur };
  }

  // ---------- Game flow ----------
  function startGame() {
    Object.assign(S, {
      running: true, paused: false, over: false, score: 0, level: 1, lives: 3, nextExtra: 10000,
      homes: [false, false, false, false, false], particles: [], floaters: [], queued: null,
    });
    S.fly = { bay: -1, t: 0, next: 7 };
    buildLanes(1);
    resetFrog();
    hud();
    banner('LEVEL 1');
    $('title').hidden = true; $('over').hidden = true; $('paused').hidden = true;
  }
  function resetFrog() {
    S.frog = newFrog();
    S.lifeLeft = LIFE_TIME;
    S.queued = null;
  }

  function die(kind) {
    const f = S.frog;
    if (f.dead) return;
    f.hop = null;
    f.dead = { kind, t: 0 };
    S.queued = null;
    if (kind === 'water') {
      sfx.splash();
      burst(f.x + 0.5, f.y + 0.5, ['#9AD8FF', '#E6F6FF', '#4FA3E8'], 18);
    } else {
      sfx.squash();
      burst(f.x + 0.5, f.y + 0.5, ['#9BE15D', '#5DBB3F', '#FFD35C'], 14);
    }
    banner({ water: 'SPLASH!', road: 'SQUASHED!', time: "TIME'S UP!", bank: 'OUCH!' }[kind] || 'OOPS!', '#FF6B5B', 1.1);
  }

  function afterDeath() {
    S.lives--;
    hud();
    if (S.lives <= 0) return gameOver();
    resetFrog();
  }

  function gameOver() {
    S.running = false; S.over = true;
    sfx.over();
    const isBest = S.score > S.best;
    if (isBest) {
      S.best = S.score;
      try { localStorage.setItem('frogger-best', String(S.best)); } catch (e) { /* storage unavailable */ }
    }
    $('finalScore').textContent = S.score;
    $('finalInfo').textContent = `You reached level ${S.level}.`;
    $('newBest').hidden = !isBest;
    $('over').hidden = false;
    hud();
  }

  function reachHome(bay) {
    const f = S.frog;
    S.homes[bay] = true;
    const secs = Math.floor(S.lifeLeft);
    addScore(50 + secs * 10, BAYS[bay] + 0.5, 0.5, `+${50 + secs * 10}`);
    if (S.fly.bay === bay) {
      addScore(200, BAYS[bay] + 0.5, 0.1, 'FLY +200');
      S.fly.bay = -1; S.fly.next = 8;
      sfx.fly();
    }
    sfx.home();
    burst(BAYS[bay] + 0.5, 0.5, ['#FFD35C', '#9BE15D', '#FFFFFF'], 16);
    f.homed = true;
    if (S.homes.every(Boolean)) {
      addScore(1000, COLS / 2, 3, 'ALL HOME +1000');
      S.level++;
      sfx.level();
      banner(`LEVEL ${S.level}`, '#FFD35C', 1.8);
      S.homes = [false, false, false, false, false];
      S.fly = { bay: -1, t: 0, next: 7 };
      buildLanes(S.level);
    }
    resetFrog();
  }

  // ---------- Movement ----------
  const DIRS = { up: [0, -1, 0], down: [0, 1, Math.PI], left: [-1, 0, -Math.PI / 2], right: [1, 0, Math.PI / 2] };

  function tryHop(dir) {
    if (!S.running || S.paused) return;
    const f = S.frog;
    if (!f || f.dead) return;
    if (f.hop) { S.queued = dir; return; }
    const [dx, dy, ang] = DIRS[dir];
    const ty = f.y + dy;
    f.dir = ang;
    if (ty < 0 || ty > ROWS - 1) return;
    let tx = f.x + dx;
    const landRow = ty === 6 || ty >= 7; // median, road, start: stay on the grid
    if (landRow) tx = Math.round(tx);
    if (ty === 0) {
      // Snap into a bay if we're close to one
      const near = BAYS.reduce((b, c) => (Math.abs(c - tx) < Math.abs(b - tx) ? c : b), BAYS[0]);
      if (Math.abs(near - tx) < 0.62) tx = near;
    }
    tx = Math.max(0, Math.min(COLS - 1, tx));
    f.hop = { fx: f.x, fy: f.y, tx, ty, t: 0 };
    sfx.hop();
  }

  function landFrog() {
    const f = S.frog;
    if (f.y < f.furthest) {
      f.furthest = f.y;
      if (f.y > 0) addScore(10);
    }
    if (f.y === 0) {
      const bay = BAYS.findIndex((c) => Math.abs(c - f.x) < 0.05);
      if (bay === -1 || S.homes[bay]) return die('bank');
      return reachHome(bay);
    }
  }

  function supportAt(lane, fx) {
    const cx = fx + 0.5;
    for (const it of lane.items) {
      const x = itemX(it);
      if (cx >= x + 0.08 && cx <= x + it.len - 0.08 && diveDepth(it, S.t) < 0.72) return it;
    }
    return null;
  }

  function hitsCar(lane, fx) {
    const a = fx + 0.2, b = fx + 0.8;
    for (const it of lane.items) {
      const x = itemX(it);
      if (b > x + 0.1 && a < x + it.len - 0.1) return true;
    }
    return false;
  }

  // ---------- Update ----------
  function update(dt) {
    S.t += dt;
    for (const lane of lanes) {
      for (const it of lane.items) it.pos = (((it.pos + lane.speed * dt) % PERIOD) + PERIOD) % PERIOD;
    }

    // Particles / floaters / banner
    for (const p of S.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt; p.t += dt; }
    S.particles = S.particles.filter((p) => p.t < p.life);
    for (const fl of S.floaters) fl.t += dt;
    S.floaters = S.floaters.filter((fl) => fl.t < 1.1);
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }

    if (!S.running) return;

    // Fly in a free bay
    const fly = S.fly;
    if (fly.bay >= 0) {
      fly.t -= dt;
      if (fly.t <= 0 || S.homes[fly.bay]) { fly.bay = -1; fly.next = 5 + Math.random() * 6; }
    } else {
      fly.next -= dt;
      const free = S.homes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
      if (fly.next <= 0 && free.length) { fly.bay = free[Math.floor(Math.random() * free.length)]; fly.t = 5; }
    }

    const f = S.frog;
    if (f.dead) {
      f.dead.t += dt;
      if (f.dead.kind === 'water' && f.dead.t < 0.1) ripple(f.x + 0.5, f.y + 0.5);
      if (f.dead.t >= DEATH_TIME) afterDeath();
      return;
    }

    // Timer
    const before = Math.ceil(S.lifeLeft);
    S.lifeLeft -= dt;
    if (S.lifeLeft <= 5 && Math.ceil(S.lifeLeft) !== before) sfx.tick();
    if (S.lifeLeft <= 0) { S.lifeLeft = 0; return die('time'); }

    if (f.hop) {
      const h = f.hop;
      const destLane = laneByRow[h.ty];
      if (destLane && destLane.river) { h.fx += destLane.speed * dt; h.tx += destLane.speed * dt; }
      h.t += dt / HOP_TIME;
      const k = Math.min(1, h.t);
      f.x = h.fx + (h.tx - h.fx) * k;
      f.vy = h.fy + (h.ty - h.fy) * k;
      // Cars can clip you mid-hop
      const midRow = Math.round(f.vy);
      const ml = laneByRow[midRow];
      if (ml && !ml.river && hitsCar(ml, f.x)) { f.y = midRow; return die('road'); }
      if (h.t >= 1) {
        f.x = h.tx; f.y = h.ty; f.hop = null; f.vy = null;
        landFrog();
        if (f.homed || f.dead) return;
        if (S.queued) { const q = S.queued; S.queued = null; tryHop(q); }
      }
      if (f.hop) return;
    }

    const lane = laneByRow[f.y];
    if (lane && lane.river) {
      const it = supportAt(lane, f.x);
      if (!it) return die('water');
      f.x += lane.speed * dt;
      if (f.x < -0.35 || f.x > COLS - 0.65) return die('water');
    } else if (lane && hitsCar(lane, f.x)) {
      return die('road');
    }
  }

  function burst(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
      S.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, t: 0, life: 0.5 + Math.random() * 0.5, c: colors[i % colors.length], r: 0.05 + Math.random() * 0.07 });
    }
  }
  function ripple(x, y) {
    S.particles.push({ x, y, vx: 0, vy: 0, t: 0, life: 1.1, ring: true });
  }

  // ---------- Drawing ----------
  let T = 40, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const r = stage.getBoundingClientRect();
    T = Math.max(12, Math.floor(Math.min(r.width / COLS, r.height / ROWS)));
    cv.style.width = `${T * COLS}px`;
    cv.style.height = `${T * ROWS}px`;
    cv.width = Math.round(T * COLS * dpr);
    cv.height = Math.round(T * ROWS * dpr);
  }

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // Canvas fonts under 1px are unreliable, so text is set at 50x and scaled down
  function text(str, x, y, size, fill, stroke, lw) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1 / 50, 1 / 50);
    ctx.font = `400 ${size * 50}px "Lilita One", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = lw * 50; ctx.strokeStyle = stroke; ctx.fillStyle = fill;
    ctx.strokeText(str, 0, 0); ctx.fillText(str, 0, 0);
    ctx.restore();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

  // Seeded noise for static textures
  const speck = [];
  for (let i = 0; i < 260; i++) speck.push([Math.random() * COLS, Math.random(), Math.random()]);

  function drawBackground() {
    // River
    const water = ctx.createLinearGradient(0, 1, 0, 6);
    water.addColorStop(0, '#16407A'); water.addColorStop(1, '#1D5A9C');
    ctx.fillStyle = water; ctx.fillRect(0, 0.6, COLS, 5.4);
    ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    for (let r = 1; r <= 5; r++) {
      const sp = laneByRow[r] ? laneByRow[r].speed * 0.35 : 0.3;
      for (let i = 0; i < 6; i++) {
        const x = ((i * 2.7 + r * 1.3 + S.t * sp) % (COLS + 2) + COLS + 2) % (COLS + 2) - 1;
        const y = r + 0.25 + ((i * 37) % 5) * 0.12;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 0.2, y - 0.08, x + 0.4, y); ctx.quadraticCurveTo(x + 0.6, y + 0.08, x + 0.8, y);
        ctx.stroke();
      }
    }

    // Home bank: grass + hedge with bays
    ctx.fillStyle = '#2E7D32'; ctx.fillRect(0, 0, COLS, 1);
    ctx.fillStyle = '#1E5E24';
    for (let c = 0; c < COLS; c++) {
      if (BAYS.includes(c)) continue;
      for (let k = 0; k < 3; k++) { circle(c + 0.2 + k * 0.3, 0.72, 0.24); ctx.fill(); }
    }
    ctx.fillStyle = '#3FA046';
    for (let c = 0; c < COLS; c++) {
      if (BAYS.includes(c)) continue;
      for (let k = 0; k < 3; k++) { circle(c + 0.2 + k * 0.3, 0.55, 0.2); ctx.fill(); }
    }
    for (const b of BAYS) {
      ctx.fillStyle = '#16407A'; rr(b + 0.04, 0.12, 0.92, 0.95, 0.2); ctx.fill();
      // lily pad
      ctx.fillStyle = '#3E9A4A';
      ctx.beginPath(); ctx.moveTo(b + 0.5, 0.6); ctx.arc(b + 0.5, 0.6, 0.34, -1.25, Math.PI * 1.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(b + 0.5, 0.6); ctx.lineTo(b + 0.3, 0.38); ctx.moveTo(b + 0.5, 0.6); ctx.lineTo(b + 0.78, 0.66); ctx.stroke();
    }

    // Median and start: lavender pavers
    for (const r of [6, 12]) {
      ctx.fillStyle = '#7A5FB0'; ctx.fillRect(0, r, COLS, 1);
      ctx.fillStyle = '#8D72C4'; ctx.fillRect(0, r + 0.04, COLS, 0.1);
      ctx.fillStyle = '#654B98'; ctx.fillRect(0, r + 0.86, COLS, 0.14);
      ctx.strokeStyle = 'rgba(40,20,70,.35)'; ctx.lineWidth = 0.03;
      for (let c = 0; c <= COLS; c += 1) {
        const off = (c % 2) * 0.5;
        ctx.beginPath(); ctx.moveTo(c, r + 0.14); ctx.lineTo(c, r + 0.5); ctx.moveTo(c + off - 0.5 + 0.5, r + 0.5); ctx.lineTo(c + off, r + 0.86); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, r + 0.5); ctx.lineTo(COLS, r + 0.5); ctx.stroke();
    }

    // Road
    ctx.fillStyle = '#26262E'; ctx.fillRect(0, 7, COLS, 5);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (const [x, y, s] of speck) ctx.fillRect(x, 7 + y * 5, 0.03 + s * 0.04, 0.03 + s * 0.04);
    ctx.fillStyle = '#E8E2D0';
    ctx.fillRect(0, 7.02, COLS, 0.05); ctx.fillRect(0, 11.93, COLS, 0.05);
    ctx.fillStyle = 'rgba(255, 214, 92, .75)';
    for (let r = 8; r <= 11; r++) {
      for (let x = 0.2; x < COLS; x += 1.3) ctx.fillRect(x, r - 0.025, 0.7, 0.05);
    }
  }

  function drawLog(x, y, len) {
    const top = y + 0.16, h = 0.68;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(x + 0.08, top + 0.1, len - 0.1, h, 0.3); ctx.fill();
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, '#B07A45'); g.addColorStop(0.5, '#8A5A2E'); g.addColorStop(1, '#5E3B1C');
    ctx.fillStyle = g; rr(x + 0.04, top, len - 0.08, h, 0.3); ctx.fill();
    ctx.strokeStyle = 'rgba(50,28,10,.55)'; ctx.lineWidth = 0.03;
    for (let i = 0; i < len * 2; i++) {
      const gx = x + 0.4 + i * 0.47, gy = top + 0.18 + ((i * 7) % 4) * 0.1;
      if (gx + 0.35 > x + len - 0.25) break;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 0.35, gy); ctx.stroke();
    }
    // End rings
    for (const ex of [x + 0.2, x + len - 0.2]) {
      ctx.fillStyle = '#D7A96B'; ctx.beginPath(); ctx.ellipse(ex, top + h / 2, 0.14, h / 2 - 0.02, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9C6B37'; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.ellipse(ex, top + h / 2, 0.08, h / 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawTurtle(cx, cy, dir, depth, t) {
    if (depth >= 0.98) {
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 0.03;
      circle(cx, cy, 0.3 + Math.sin(t * 4 + cx) * 0.04); ctx.stroke();
      return;
    }
    ctx.save();
    ctx.globalAlpha = 1 - depth * 0.75;
    ctx.translate(cx, cy);
    const s = 1 - depth * 0.25;
    ctx.scale(s, s);
    const paddle = Math.sin(t * 9 + cx * 3) * 0.06;
    ctx.fillStyle = '#7CC36A';
    // head toward travel direction
    circle(dir * 0.38, 0, 0.12); ctx.fill();
    for (const [lx, ly] of [[0.22, -0.28], [0.22, 0.28], [-0.22, -0.28], [-0.22, 0.28]]) {
      ctx.beginPath(); ctx.ellipse(lx + paddle * Math.sign(ly), ly, 0.1, 0.07, 0.5 * Math.sign(lx * ly), 0, Math.PI * 2); ctx.fill();
    }
    const g = ctx.createRadialGradient(-0.08, -0.1, 0.04, 0, 0, 0.36);
    const warn = depth > 0 ? '#8E5AC8' : '#E0533F';
    g.addColorStop(0, depth > 0 ? '#C29AF0' : '#FF8A6A'); g.addColorStop(1, warn);
    ctx.fillStyle = g; circle(0, 0, 0.33); ctx.fill();
    ctx.strokeStyle = 'rgba(60,15,10,.45)'; ctx.lineWidth = 0.03;
    circle(0, 0, 0.15); ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.15, Math.sin(a) * 0.15); ctx.lineTo(Math.cos(a) * 0.31, Math.sin(a) * 0.31); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVehicle(lane, it, x, y) {
    const dir = Math.sign(lane.speed);
    const len = it.len;
    ctx.save();
    ctx.translate(x + len / 2, y + 0.5);
    if (dir < 0) ctx.scale(-1, 1); // draw facing right
    const L = len - 0.12;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(-L / 2 + 0.04, -0.3, L, 0.7, 0.14); ctx.fill();
    // wheels
    ctx.fillStyle = '#111';
    const wheels = lane.kind === 'truck' ? [-0.7, -0.35, 0.2, 0.62] : [-0.25, 0.22];
    for (const wx of wheels) { rr(wx - 0.1, -0.38, 0.2, 0.1, 0.03); ctx.fill(); rr(wx - 0.1, 0.28, 0.2, 0.1, 0.03); ctx.fill(); }

    if (lane.kind === 'truck') {
      ctx.fillStyle = it.color; rr(-L / 2, -0.32, L - 0.5, 0.64, 0.06); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 0.025;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-L / 2 + k * 0.33, -0.3); ctx.lineTo(-L / 2 + k * 0.33, 0.3); ctx.stroke(); }
      ctx.fillStyle = '#2F80D1'; rr(L / 2 - 0.46, -0.3, 0.46, 0.6, 0.1); ctx.fill();
      ctx.fillStyle = '#BFE3FF'; rr(L / 2 - 0.2, -0.24, 0.12, 0.48, 0.04); ctx.fill();
    } else if (lane.kind === 'racer') {
      ctx.fillStyle = it.color;
      ctx.beginPath(); ctx.moveTo(-0.42, -0.3); ctx.lineTo(0.2, -0.26); ctx.lineTo(0.46, -0.06); ctx.lineTo(0.46, 0.06); ctx.lineTo(0.2, 0.26); ctx.lineTo(-0.42, 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-0.42, -0.05, 0.86, 0.1);
      ctx.fillStyle = '#1A1A2A'; rr(-0.12, -0.16, 0.22, 0.32, 0.08); ctx.fill();
      ctx.fillStyle = '#FFE36E'; ctx.fillRect(-0.48, -0.32, 0.08, 0.64);
    } else if (lane.kind === 'dozer') {
      ctx.fillStyle = '#6B6B6B'; ctx.fillRect(0.3, -0.36, 0.1, 0.72);
      ctx.fillStyle = it.color; rr(-0.4, -0.28, 0.66, 0.56, 0.08); ctx.fill();
      ctx.fillStyle = '#1A1A22'; rr(-0.3, -0.18, 0.3, 0.36, 0.05); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-0.36, -0.26, 0.58, 0.05);
    } else {
      const g = ctx.createLinearGradient(0, -0.32, 0, 0.32);
      g.addColorStop(0, it.color); g.addColorStop(1, shade(it.color, -0.25));
      ctx.fillStyle = g; rr(-0.42, -0.3, 0.84, 0.6, 0.16); ctx.fill();
      ctx.fillStyle = '#1B2230'; rr(-0.2, -0.22, 0.34, 0.44, 0.08); ctx.fill();
      ctx.fillStyle = shade(it.color, 0.15); rr(-0.14, -0.17, 0.18, 0.34, 0.05); ctx.fill();
      ctx.fillStyle = '#FFF2A8'; circle(0.39, -0.19, 0.05); ctx.fill(); circle(0.39, 0.19, 0.05); ctx.fill();
      ctx.fillStyle = '#FF3B30'; ctx.fillRect(-0.44, -0.24, 0.04, 0.1); ctx.fillRect(-0.44, 0.14, 0.04, 0.1);
    }
    ctx.restore();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
    return `rgb(${ch.join(',')})`;
  }

  function drawLanes() {
    for (const lane of lanes) {
      for (const it of lane.items) {
        const x = itemX(it);
        if (x > COLS || x + it.len < 0) continue;
        if (lane.kind === 'log') drawLog(x, lane.row, it.len);
        else if (lane.kind === 'turtle') {
          const d = diveDepth(it, S.t);
          for (let k = 0; k < it.len; k++) drawTurtle(x + k + 0.5, lane.row + 0.5, Math.sign(lane.speed), d, S.t);
        } else drawVehicle(lane, it, x, lane.row);
      }
    }
  }

  function drawFrog(cx, cy, ang, stretch, scale = 1, happy = false) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.scale(scale, scale);
    const st = stretch; // 0..1 legs extended
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0.03, 0.06, 0.28, 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.fillStyle = '#3E9E2E';
    const back = 0.18 + st * 0.22;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * 0.25, back, 0.09, 0.18 + st * 0.08, s * (0.6 - st * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * (0.3 - st * 0.06), back + 0.16 + st * 0.08, 0.1, 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.24, -0.2 - st * 0.08, 0.06, 0.13, -s * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // body
    const g = ctx.createRadialGradient(-0.06, -0.08, 0.03, 0, 0, 0.32);
    g.addColorStop(0, '#C4F58E'); g.addColorStop(0.6, '#6CCB45'); g.addColorStop(1, '#3E9E2E');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.24, 0.28 + st * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(40,110,30,.6)';
    circle(-0.08, 0.1, 0.045); ctx.fill(); circle(0.09, 0.14, 0.035); ctx.fill(); circle(0.02, -0.02, 0.03); ctx.fill();
    // eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#6CCB45'; circle(s * 0.12, -0.2, 0.09); ctx.fill();
      ctx.fillStyle = '#fff'; circle(s * 0.12, -0.21, 0.065); ctx.fill();
      ctx.fillStyle = '#111'; circle(s * 0.12, -0.23, happy ? 0.02 : 0.035); ctx.fill();
    }
    if (happy) {
      ctx.strokeStyle = '#1E5E24'; ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.arc(0, -0.08, 0.08, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFly(cx, cy, t) {
    ctx.save();
    ctx.translate(cx + Math.sin(t * 3) * 0.05, cy + Math.cos(t * 4) * 0.04);
    const flap = 0.6 + Math.abs(Math.sin(t * 30)) * 0.4;
    ctx.fillStyle = 'rgba(220,240,255,.8)';
    ctx.beginPath(); ctx.ellipse(-0.08, -0.06, 0.1, 0.05 * flap, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.08, -0.06, 0.1, 0.05 * flap, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(0, 0, 0.06, 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E33'; circle(-0.03, -0.08, 0.025); ctx.fill(); circle(0.03, -0.08, 0.025); ctx.fill();
    ctx.restore();
  }

  function drawDeadFrog(f) {
    const d = f.dead, cx = f.x + 0.5, cy = f.y + 0.5;
    const k = Math.min(1, d.t / DEATH_TIME);
    if (d.kind === 'water') {
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = 0.04;
      for (let i = 0; i < 3; i++) { circle(cx, cy, 0.1 + k * 0.5 + i * 0.12); ctx.stroke(); }
      if (k < 0.35) drawFrog(cx, cy, f.dir, 0, 1 - k / 0.35);
    } else {
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.translate(cx, cy); ctx.scale(1.25, 0.55); drawFrog(0, 0, f.dir, 1, 1);
      ctx.restore();
      ctx.fillStyle = '#FFD35C';
      for (let i = 0; i < 3; i++) {
        const a = d.t * 5 + (i * Math.PI * 2) / 3;
        drawStar(cx + Math.cos(a) * 0.35, cy - 0.35 + Math.sin(a) * 0.1, 0.07);
      }
    }
  }

  function drawStar(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
  }

  function draw() {
    ctx.setTransform(dpr * T, 0, 0, dpr * T, 0, 0);
    ctx.clearRect(0, 0, COLS, ROWS);
    drawBackground();
    drawLanes();

    // Home frogs and fly
    S.homes.forEach((h, i) => { if (h) drawFrog(BAYS[i] + 0.5, 0.58, Math.PI, 0, 0.9, true); });
    if (S.fly.bay >= 0) drawFly(BAYS[S.fly.bay] + 0.5, 0.55, S.t);

    const f = S.frog;
    if (f && S.running) {
      if (f.dead) drawDeadFrog(f);
      else {
        const y = f.hop ? f.vy : f.y;
        const k = f.hop ? Math.min(1, f.hop.t) : 1;
        const lift = f.hop ? Math.sin(k * Math.PI) : 0;
        drawFrog(f.x + 0.5, y + 0.5 - lift * 0.08, f.dir, lift, 1 + lift * 0.12);
      }
    }

    // Particles
    for (const p of S.particles) {
      const a = 1 - p.t / p.life;
      if (p.ring) {
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`; ctx.lineWidth = 0.03;
        circle(p.x, p.y, 0.2 + p.t * 0.7); ctx.stroke();
      } else {
        ctx.globalAlpha = a; ctx.fillStyle = p.c; circle(p.x, p.y, p.r); ctx.fill(); ctx.globalAlpha = 1;
      }
    }

    // Floating score text
    for (const fl of S.floaters) {
      ctx.globalAlpha = 1 - fl.t / 1.1;
      text(fl.text, Math.max(1.2, Math.min(COLS - 1.2, fl.x)), fl.y - fl.t * 0.8 + 0.3, 0.42, '#FFE38A', 'rgba(0,0,0,.6)', 0.1);
    }
    ctx.globalAlpha = 1;

    if (S.banner) {
      const b = S.banner, k = b.t / b.dur;
      const pop = Math.min(1, b.t / 0.18);
      const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(COLS / 2, 6.5);
      ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
      ctx.fillStyle = 'rgba(8,14,10,.72)'; rr(-4, -0.75, 8, 1.5, 0.5); ctx.fill();
      text(b.text, 0, 0.05, 0.95, b.color, 'rgba(0,0,0,.5)', 0.12);
      ctx.restore();
    }

    // Time bar
    el.time.style.transform = `scaleX(${Math.max(0, S.lifeLeft / LIFE_TIME)})`;
    el.time.classList.toggle('low', S.lifeLeft <= 8);
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!S.paused) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- Input ----------
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  window.addEventListener('keydown', (e) => {
    const dir = KEYMAP[e.code];
    if (dir) {
      e.preventDefault();
      if (!e.repeat) tryHop(dir);
      return;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if ((e.code === 'Enter' || e.code === 'Space') && !S.running) { e.preventDefault(); startGame(); }
  });

  // Swipe / tap on the board
  let touch = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.overlay')) return;
    touch = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  window.addEventListener('pointerup', (e) => {
    if (!touch || touch.id !== e.pointerId) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    touch = null;
    if (Math.hypot(dx, dy) < 18) return tryHop('up');
    if (Math.abs(dx) > Math.abs(dy)) tryHop(dx > 0 ? 'right' : 'left');
    else tryHop(dy > 0 ? 'down' : 'up');
  });
  window.addEventListener('pointercancel', () => { touch = null; });

  for (const b of document.querySelectorAll('#pad button')) {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('on');
      tryHop(b.dataset.dir);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => b.classList.remove('on'));
  }

  function togglePause() {
    if (!S.running) return;
    S.paused = !S.paused;
    $('paused').hidden = !S.paused;
  }
  $('pauseBtn').addEventListener('click', (e) => { e.currentTarget.blur(); togglePause(); });
  $('resumeBtn').addEventListener('click', togglePause);
  $('startBtn').addEventListener('click', startGame);
  $('againBtn').addEventListener('click', startGame);

  const muteBtn = $('muteBtn');
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; };
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem('frogger-muted', muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    paintMute();
    muteBtn.blur();
  });
  paintMute();

  document.addEventListener('visibilitychange', () => { if (document.hidden && S.running && !S.paused) togglePause(); });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  // Attract mode: lanes run behind the title screen
  buildLanes(1);
  S.frog = newFrog();
  resize();
  hud();
  requestAnimationFrame(frame);
})();
