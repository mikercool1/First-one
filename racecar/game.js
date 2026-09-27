// Racecar Rally: pick a car, race three laps against the family.
// Top-down, one canvas. The track is a smoothed loop; everything else
// (trees, stands, boost pads, stars) is placed along it.
(() => {
  const { CARS, byId, art } = window.RC;
  const LAPS = 3;
  const AUTOPILOT = new URLSearchParams(location.search).has("autopilot"); // lets the computer drive your car (for testing)
  const RW = 96; // half the road width
  const TAU = Math.PI * 2;

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const ordinal = (n) => ["", "1st", "2nd", "3rd", "4th"][n] || n + "th";
  const who = (car) => (car.def.owner ? car.def.owner : car.def.name);

  // ---------- track ----------
  const CTRL = [
    [400, 1050], [400, 700], [520, 420], [820, 330], [1100, 420], [1260, 680], [1480, 880],
    [1760, 820], [1960, 560], [2240, 470], [2460, 660], [2480, 1020], [2300, 1330], [1980, 1460],
    [1640, 1380], [1320, 1500], [960, 1620], [620, 1600], [430, 1380],
  ];
  function catmull(pts, seg) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    return out;
  }
  function resample(pts, step) {
    const out = [], n = pts.length;
    let d = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (d <= len) { const t = d / len; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); d += step; }
      d -= len;
    }
    return out;
  }
  const PTS = resample(catmull(CTRL, 24), 12);
  const N = PTS.length;
  const TX = PTS.map((p) => p[0]), TY = PTS.map((p) => p[1]);
  const TA = PTS.map((_, i) => { const a = PTS[(i - 1 + N) % N], b = PTS[(i + 1) % N]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
  const NX = TA.map((a) => -Math.sin(a)), NY = TA.map((a) => Math.cos(a));
  const BEND = TA.map((a, i) => Math.abs(angDiff(TA[(i + 22) % N], a)) + Math.abs(angDiff(TA[(i + 44) % N], TA[(i + 22) % N])) * 0.6);
  const TRACK_PATH = new Path2D();
  PTS.forEach(([x, y], i) => (i ? TRACK_PATH.lineTo(x, y) : TRACK_PATH.moveTo(x, y)));
  TRACK_PATH.closePath();
  const BOUNDS = PTS.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });

  function nearest(x, y, guess, back = 40, ahead = 80) {
    let best = guess, bd = Infinity;
    for (let k = -back; k <= ahead; k++) {
      const i = (guess + k + N) % N, d = (TX[i] - x) ** 2 + (TY[i] - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return [best, Math.sqrt(bd)];
  }
  const at = (i, lane = 0) => { i = ((i % N) + N) % N; return [TX[i] + NX[i] * lane, TY[i] + NY[i] * lane]; };

  // Boost pads and star clusters, placed on straighter bits of track.
  const PADS = [0.13, 0.4, 0.66, 0.86].map((f, k) => {
    const i = Math.floor(f * N), lane = [0, -40, 40, 0][k];
    const [x, y] = at(i, lane);
    return { i, x, y, a: TA[i] };
  });
  const STARS = [];
  [0.22, 0.5, 0.76, 0.94].forEach((f) => {
    const i = Math.floor(f * N);
    for (const lane of [-55, 0, 55]) { const [x, y] = at(i, lane); STARS.push({ x, y, t: 0 }); }
  });

  // Scenery, placed once with a fixed seed so it never shuffles.
  const SCENE = { trees: [], flowers: [], tires: [] };
  {
    const r = seeded(20260927);
    const clear = (x, y, m) => nearest(x, y, 0, 0, N - 1)[1] > RW + m;
    for (let k = 0; k < 900 && SCENE.trees.length < 170; k++) {
      const x = BOUNDS.x0 - 500 + r() * (BOUNDS.x1 - BOUNDS.x0 + 1000), y = BOUNDS.y0 - 450 + r() * (BOUNDS.y1 - BOUNDS.y0 + 900);
      if (x > 120 && x < 330 && y > 820 && y < 1300) continue; // grandstand
      if (clear(x, y, 70)) SCENE.trees.push({ x, y, r: 26 + r() * 22, hue: r() });
    }
    for (let k = 0; k < 600 && SCENE.flowers.length < 120; k++) {
      const x = BOUNDS.x0 - 300 + r() * (BOUNDS.x1 - BOUNDS.x0 + 600), y = BOUNDS.y0 - 300 + r() * (BOUNDS.y1 - BOUNDS.y0 + 600);
      if (clear(x, y, 30)) SCENE.flowers.push({ x, y, c: pick(["#FF7AB6", "#FFD23F", "#FFFFFF", "#B69BFF", "#FF8C5A"]), s: r() });
    }
    for (let i = 0; i < N; i += 8) if (BEND[i] > 1.0) {
      const side = angDiff(TA[(i + 20) % N], TA[i]) > 0 ? -1 : 1; // outside of the bend
      const [x, y] = at(i, side * (RW + 34));
      SCENE.tires.push({ x, y });
    }
  }

  // ---------- sound ----------
  const Snd = {
    ac: null, on: store.get("rc-sound") !== "off", eng: null,
    init() {
      if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
      if (this.ac.state === "suspended") this.ac.resume();
    },
    tone(f, d, type = "sine", v = 0.12, delay = 0, slide = 0) {
      if (!this.on || !this.ac) return;
      const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.ac.destination); o.start(t); o.stop(t + d + 0.02);
    },
    engine(speed, boost) {
      if (!this.ac) return;
      if (!this.eng) {
        const o = this.ac.createOscillator(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
        o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 500; g.gain.value = 0;
        o.connect(f).connect(g).connect(this.ac.destination); o.start();
        this.eng = { o, f, g };
      }
      const t = this.ac.currentTime;
      this.eng.o.frequency.setTargetAtTime(55 + speed * 0.28 + (boost ? 40 : 0), t, 0.08);
      this.eng.g.gain.setTargetAtTime(this.on && speed > 1 ? 0.035 : 0, t, 0.1);
    },
    beep(go) { this.tone(go ? 880 : 440, go ? 0.5 : 0.22, "square", 0.08); },
    star() { this.tone(988, 0.12, "triangle", 0.12); this.tone(1319, 0.2, "triangle", 0.1, 0.07); },
    boost() { this.tone(220, 0.45, "sawtooth", 0.06, 0, 3); },
    bump() { this.tone(110, 0.12, "square", 0.06, 0, 0.6); },
    lap() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.1, i * 0.09)); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.11, i * 0.12)); },
    finish() { [392, 523, 659].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.1, i * 0.12)); },
  };

  // ---------- canvas ----------
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  let hudBottom = 60;
  const measureHud = () => { const r = $("#hud").getBoundingClientRect(); if (r.height) hudBottom = r.bottom; };
  addEventListener("resize", () => { resize(); measureHud(); }); resize();

  // ---------- game state ----------
  let state = "menu"; // menu | count | race | done
  let cars = [], player = null, raceTime = 0, countT = 0, finishOrder = [], doneT = 0;
  const parts = [], confetti = [];
  const cam = { x: TX[0], y: TY[0], z: 1, shake: 0 };
  let selected = store.get("rc-car");
  if (!byId[selected]) selected = CARS[0].id;

  function makeCar(def, slot, isPlayer) {
    const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;
    const i = (N - 6 - row * 7) % N;
    const [x, y] = at(i, side * 38);
    return {
      def, isPlayer, x, y, a: TA[i], vx: 0, vy: 0, spd: 0, steer: 0,
      boost: 0, charges: 0, idx: i, laps: 0, total: i - N, finished: false, finishTime: 0,
      lane: side * 38, laneGoal: side * 38, laneT: rand(1, 3), skill: 1, trailT: 0, bumpT: 0, autoBoostT: rand(3, 7),
      label: isPlayer ? "You" : who({ def }),
    };
  }

  function rivalsFor(id) {
    const family = ["ellie", "jonah", "reuben"].filter((k) => k !== id);
    const extras = CARS.map((c) => c.id).filter((k) => k !== id && !family.includes(k));
    while (family.length < 3) family.push(extras.splice(Math.floor(Math.random() * extras.length), 1)[0]);
    return family;
  }

  function setupDemo() {
    cars = ["ellie", "jonah", "reuben", "sunny"].map((id, k) => makeCar(byId[id], k, false));
    cars.forEach((c, k) => { c.skill = 0.9 + k * 0.02; });
    player = null;
  }

  function startRace() {
    Snd.init();
    store.set("rc-car", selected);
    const rivals = rivalsFor(selected);
    // Player starts on the back row so there is someone to pass.
    const lineup = [rivals[0], rivals[1], rivals[2], selected];
    cars = lineup.map((id, k) => makeCar(byId[id], k, id === selected));
    player = cars.find((c) => c.isPlayer);
    const skills = [0.93, 0.9, 0.87];
    cars.filter((c) => !c.isPlayer).forEach((c, k) => { c.skill = skills[k]; });
    parts.length = 0; confetti.length = 0; finishOrder = []; raceTime = 0;
    STARS.forEach((s) => (s.t = 0));
    cam.x = player.x; cam.y = player.y;
    state = "count"; countT = 3.6; lastBeep = 4;
    $("#menu").hidden = true; $("#results").hidden = true;
    $("#hud").hidden = false; $("#controls").hidden = false;
    $("#who").textContent = player.def.owner ? `${player.def.owner}'s ${player.def.name}` : player.def.name;
    $("#who").style.setProperty("--c", player.def.color);
    updateHud(true);
    measureHud();
  }

  // ---------- input ----------
  const keys = new Set();
  const touch = { l: false, r: false, brake: false };
  let boostPressed = false;
  addEventListener("keydown", (e) => {
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) e.preventDefault();
    if (k === " " && !e.repeat) boostPressed = true;
    if (k === "Enter" && (state === "menu" || !$("#results").hidden)) startRace();
    keys.add(k.toLowerCase());
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => { keys.clear(); touch.l = touch.r = touch.brake = false; });

  function hold(el, key) {
    const on = (e) => { e.preventDefault(); Snd.init(); touch[key] = true; el.classList.add("on"); try { el.setPointerCapture(e.pointerId); } catch {} };
    const off = () => { touch[key] = false; el.classList.remove("on"); };
    el.addEventListener("pointerdown", on);
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, off);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  hold($("#bL"), "l"); hold($("#bR"), "r"); hold($("#bBrake"), "brake");
  $("#bBoost").addEventListener("pointerdown", (e) => { e.preventDefault(); Snd.init(); boostPressed = true; });
  $("#bBoost").addEventListener("contextmenu", (e) => e.preventDefault());

  function playerInput() {
    const left = keys.has("arrowleft") || keys.has("a") || touch.l;
    const right = keys.has("arrowright") || keys.has("d") || touch.r;
    const brake = keys.has("arrowdown") || keys.has("s") || touch.brake;
    const b = boostPressed; boostPressed = false;
    return { steer: (right ? 1 : 0) - (left ? 1 : 0), brake, boost: b, top: 1 };
  }

  function aiInput(car, dt) {
    car.laneT -= dt;
    if (car.laneT < 0) { car.laneGoal = rand(-50, 50); car.laneT = rand(1.5, 3.5); }
    car.lane += (car.laneGoal - car.lane) * Math.min(1, dt * 0.8);
    const look = 9 + Math.floor(car.spd / 38);
    const [tx, ty] = at(car.idx + look, car.lane);
    const diff = angDiff(Math.atan2(ty - car.y, tx - car.x), car.a);
    const bend = BEND[car.idx];
    let top = car.skill * (1 - clamp(bend - 0.35, 0, 1.2) * 0.3);
    if (player && !player.finished && !car.finished) {
      // gentle rubber band so races stay close
      const gap = (player.total - car.total) / N;
      top *= 1 + clamp(gap * 0.5, -0.16, 0.12);
    }
    let boost = false;
    car.autoBoostT -= dt;
    if (car.charges > 0 && bend < 0.35 && car.autoBoostT < 0) { boost = true; car.autoBoostT = rand(4, 9); }
    return { steer: clamp(diff * 3, -1, 1), brake: false, boost, top };
  }

  // ---------- simulation ----------
  function useBoost(car, time) {
    car.boost = Math.max(car.boost, time);
    if (car.isPlayer) { Snd.boost(); cam.shake = Math.max(cam.shake, 4); }
  }

  function stepCar(car, inp, dt, frozen) {
    const p = car.def.phys;
    const prev = car.idx;
    let [idx, dist] = nearest(car.x, car.y, car.idx);
    if (dist > RW + 380) [idx, dist] = nearest(car.x, car.y, car.idx, N / 4, N / 4);
    car.idx = idx;
    const d = idx - prev;
    if (d < -N / 2) car.laps++;
    else if (d > N / 2) car.laps--;
    car.total = (car.laps - 1) * N + idx;
    car.offroad = dist > RW + 6;

    if (frozen) return;

    if (inp.boost && car.charges > 0 && car.boost <= 0) { car.charges--; useBoost(car, p.boostTime + 0.35); }
    let top = p.maxSpeed * inp.top * (car.offroad ? 0.55 : 1);
    if (car.boost > 0) { top *= 1.42; car.boost -= dt; }
    if (inp.brake) car.spd -= 620 * dt;
    else if (car.spd < top) car.spd = Math.min(top, car.spd + (car.boost > 0 ? 700 : p.accel) * dt);
    else car.spd = Math.max(top, car.spd - (car.offroad ? 520 : 300) * dt);
    car.spd = Math.max(0, car.spd);

    car.steer += (inp.steer - car.steer) * Math.min(1, dt * 11);
    const turnF = clamp(car.spd / 160, 0, 1) * (1 - 0.22 * clamp((car.spd - 330) / 250, 0, 1));
    car.a += car.steer * p.turn * turnF * dt;
    const k = 1 - Math.exp(-p.grip * dt);
    car.vx += (Math.cos(car.a) * car.spd - car.vx) * k;
    car.vy += (Math.sin(car.a) * car.spd - car.vy) * k;
    car.x += car.vx * dt; car.y += car.vy * dt;

    // too far into the countryside: a soft push back toward the track
    if (dist > RW + 240) {
      const pull = (dist - RW - 240) * 2 * dt;
      car.x += (TX[idx] - car.x) / dist * pull; car.y += (TY[idx] - car.y) / dist * pull;
    }

    for (const pad of PADS) {
      if ((car.x - pad.x) ** 2 + (car.y - pad.y) ** 2 < 42 ** 2 && car.boost < 0.3) useBoost(car, 1.0);
    }
    for (const s of STARS) {
      if (s.t <= 0 && (car.x - s.x) ** 2 + (car.y - s.y) ** 2 < 30 ** 2) {
        s.t = 5;
        if (car.charges < 3) car.charges++;
        burst(s.x, s.y, "star", ["#FFD23F", "#FFFFFF"], 8);
        if (car.isPlayer) { Snd.star(); updateHud(); }
      }
    }
    emitTrail(car, dt);
  }

  function collide() {
    const R = 19;
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < R * 2) {
        const nx = dx / d, ny = dy / d, push = (R * 2 - d) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const imp = -rel * 0.6;
          a.vx -= nx * imp; a.vy -= ny * imp; b.vx += nx * imp; b.vy += ny * imp;
          a.spd *= 0.97; b.spd *= 0.97;
          if ((a.isPlayer || b.isPlayer) && imp > 40 && (a.bumpT <= 0 || b.bumpT <= 0)) {
            Snd.bump(); cam.shake = Math.max(cam.shake, 5); a.bumpT = b.bumpT = 0.4;
          }
        }
      }
    }
  }

  // ---------- particles ----------
  function spawn(p) { if (parts.length < 450) parts.push(p); }
  function burst(x, y, kind, colors, n) {
    for (let k = 0; k < n; k++) {
      const a = rand(0, TAU), v = rand(40, 140);
      spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, kind, color: pick(colors), size: rand(3, 6), rot: rand(0, TAU) });
    }
  }
  function emitTrail(car, dt) {
    car.bumpT -= dt;
    if (car.spd < 90) return;
    car.trailT -= dt;
    const rate = car.boost > 0 ? 0.022 : 0.075;
    if (car.trailT > 0) return;
    car.trailT = rate;
    const bx = car.x - Math.cos(car.a) * 24, by = car.y - Math.sin(car.a) * 24;
    const t = car.def.trail;
    const side = rand(-7, 7);
    const px = bx - Math.sin(car.a) * side, py = by + Math.cos(car.a) * side;
    const back = -rand(20, 60);
    spawn({ x: px, y: py, vx: Math.cos(car.a) * back + rand(-15, 15), vy: Math.sin(car.a) * back + rand(-15, 15), life: 0.9, max: 0.9, kind: t.kind, color: pick(t.colors), size: rand(3.5, 6), rot: rand(0, TAU) });
    if (car.boost > 0) spawn({ x: bx, y: by, vx: Math.cos(car.a) * -80, vy: Math.sin(car.a) * -80, life: 0.35, max: 0.35, kind: "flame", color: pick(["#FFB23D", "#FF6A3D", "#FFE08A"]), size: rand(5, 9), rot: 0 });
    if (car.offroad) spawn({ x: bx, y: by, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.6, max: 0.6, kind: "puff", color: "#C9B77A", size: rand(5, 9), rot: 0 });
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.rot += dt * 2;
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > H + 20) confetti.splice(i, 1);
    }
  }
  function drawPart(p) {
    const f = p.life / p.max;
    ctx.globalAlpha = Math.min(1, f * 1.6);
    const s = p.size * (p.kind === "ring" || p.kind === "puff" ? 1 + (1 - f) * 1.8 : 0.6 + f * 0.5);
    switch (p.kind) {
      case "heart": art.heart(ctx, p.x, p.y, s, p.color, p.rot * 0.3); break;
      case "star": art.star(ctx, p.x, p.y, s, p.color, 5, 0.45, p.rot); break;
      case "ring": ctx.strokeStyle = p.color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.stroke(); break;
      case "spark": art.sparkle(ctx, p.x, p.y, s * 1.1, p.color); break;
      default: ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- drawing ----------
  function drawCar(c, car, t) {
    c.save(); c.translate(car.x, car.y); c.rotate(car.a);
    if (car.boost > 0) {
      c.globalAlpha = 0.35; c.fillStyle = car.def.color;
      c.beginPath(); c.ellipse(-4, 0, 36, 22, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    }
    car.def.draw(c, t);
    c.restore();
  }

  function drawWorld(t) {
    const z = cam.z;
    const sx = cam.shake ? rand(-cam.shake, cam.shake) : 0, sy = cam.shake ? rand(-cam.shake, cam.shake) : 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#6CC255"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    const vx0 = cam.x - W / 2 / z - 80, vx1 = cam.x + W / 2 / z + 80, vy0 = cam.y - H / 2 / z - 80, vy1 = cam.y + H / 2 / z + 80;
    const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

    // mowed stripes
    ctx.fillStyle = "#63B84D";
    const band = 140;
    for (let x = Math.floor(vx0 / band) * band; x < vx1; x += band * 2) ctx.fillRect(x, vy0, band, vy1 - vy0);

    for (const f of SCENE.flowers) if (inView(f.x, f.y)) {
      ctx.fillStyle = f.c;
      for (let k = 0; k < 5; k++) { const a = k * 1.256 + f.s * 6; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 3.2, f.y + Math.sin(a) * 3.2, 2.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "#FFE45C"; ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, TAU); ctx.fill();
    }

    // track: curbs, asphalt, lane dashes
    ctx.lineJoin = "round"; ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = RW * 2 + 40; ctx.stroke(TRACK_PATH);
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = RW * 2 + 22; ctx.stroke(TRACK_PATH);
    ctx.setLineDash([26, 26]); ctx.strokeStyle = "#E8322E"; ctx.stroke(TRACK_PATH); ctx.setLineDash([]);
    ctx.strokeStyle = "#555A66"; ctx.lineWidth = RW * 2; ctx.stroke(TRACK_PATH);
    ctx.strokeStyle = "#5C6170"; ctx.lineWidth = RW * 1.2; ctx.stroke(TRACK_PATH);
    ctx.setLineDash([30, 34]); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 4; ctx.stroke(TRACK_PATH); ctx.setLineDash([]);

    // start / finish checkers
    ctx.save(); ctx.translate(TX[0], TY[0]); ctx.rotate(TA[0]);
    const sq = RW / 6;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 12; k++) {
      ctx.fillStyle = (r + k) % 2 ? "#111" : "#FFF";
      ctx.fillRect(-sq + r * sq, -RW + k * sq, sq, sq);
    }
    ctx.restore();

    // boost pads
    for (const pad of PADS) if (inView(pad.x, pad.y)) {
      ctx.save(); ctx.translate(pad.x, pad.y); ctx.rotate(pad.a);
      art.rr(ctx, -30, -26, 60, 52, 10); ctx.fillStyle = "#2B2F3A"; ctx.fill();
      for (let k = 0; k < 3; k++) {
        const glow = 0.45 + 0.55 * ((Math.sin(t * 8 - k * 1.2) + 1) / 2);
        ctx.strokeStyle = `rgba(255,214,64,${glow.toFixed(2)})`; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(-18 + k * 13, -14); ctx.lineTo(-8 + k * 13, 0); ctx.lineTo(-18 + k * 13, 14); ctx.stroke();
      }
      ctx.restore();
    }
    // stars
    for (const s of STARS) if (s.t <= 0 && inView(s.x, s.y)) {
      const bob = Math.sin(t * 4 + s.x) * 2;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(s.x + 3, s.y + 6, 11, 5, 0, 0, TAU); ctx.fill();
      art.star(ctx, s.x, s.y + bob, 14, "#FFB400", 5, 0.48, -Math.PI / 2 + t);
      art.star(ctx, s.x, s.y + bob, 9.5, "#FFE45C", 5, 0.48, -Math.PI / 2 + t);
    }

    // tire stacks and grandstand
    for (const tr of SCENE.tires) if (inView(tr.x, tr.y)) {
      for (const [ox, oy] of [[-9, 0], [9, 0], [0, -8]]) {
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(tr.x + ox, tr.y + oy, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(tr.x + ox, tr.y + oy, 3.5, 0, TAU); ctx.fill();
      }
    }
    if (inView(220, 1050) || inView(140, 900) || inView(300, 1200)) drawStand(t);

    for (const p of parts) if (inView(p.x, p.y)) drawPart(p);
    const order = [...cars].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    for (const car of order) if (inView(car.x, car.y)) drawCar(ctx, car, t);

    // finish banner overhead
    {
      const [lx, ly] = at(0, -RW - 30), [rx, ry] = at(0, RW + 30);
      if (inView(lx, ly) || inView(rx, ry)) {
        for (const [x, y] of [[lx, ly], [rx, ry]]) { ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
        ctx.save(); ctx.translate(TX[0], TY[0]); ctx.rotate(TA[0]);
        ctx.globalAlpha = 0.9; art.rr(ctx, -9, -RW - 30, 18, RW * 2 + 60, 4); ctx.fillStyle = "#FF3D7F"; ctx.fill();
        ctx.rotate(Math.PI / 2); ctx.fillStyle = "#FFF"; ctx.font = "15px Bungee, system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("FINISH ★ FINISH", 0, 1);
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }

    // tree canopies over everything
    for (const tr of SCENE.trees) if (inView(tr.x, tr.y)) {
      ctx.fillStyle = "rgba(20,60,20,.25)"; ctx.beginPath(); ctx.arc(tr.x + 8, tr.y + 10, tr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = tr.hue > 0.7 ? "#2E8B3E" : tr.hue > 0.35 ? "#3A9E45" : "#48AE4F";
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.beginPath(); ctx.arc(tr.x - tr.r * 0.3, tr.y - tr.r * 0.3, tr.r * 0.5, 0, TAU); ctx.fill();
      if (tr.hue < 0.12) for (let k = 0; k < 4; k++) { ctx.fillStyle = "#FF4D4D"; ctx.beginPath(); ctx.arc(tr.x + Math.cos(k * 1.7) * tr.r * 0.55, tr.y + Math.sin(k * 1.7) * tr.r * 0.55, 3, 0, TAU); ctx.fill(); }
    }

    // name tags over rivals
    ctx.font = "800 12px Nunito, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const car of cars) if (inView(car.x, car.y) && (state !== "menu")) {
      const txt = car.label, w = ctx.measureText(txt).width + 14;
      const y = car.y - 38;
      art.rr(ctx, car.x - w / 2, y - 9, w, 18, 9);
      ctx.fillStyle = car.isPlayer ? "#FFFFFF" : car.def.color; ctx.fill();
      ctx.fillStyle = car.isPlayer ? "#1B1F3B" : "#FFFFFF"; ctx.fillText(txt, car.x, y + 0.5);
    }
    ctx.restore();
  }

  const CROWD = (() => { const r = seeded(7), out = []; for (let k = 0; k < 90; k++) out.push({ x: r(), y: r(), c: ["#FF5FAE", "#2F6BFF", "#E3222B", "#FFC21A", "#27B356", "#7B4DFF", "#FFFFFF"][Math.floor(r() * 7)], p: r() * TAU }); return out; })();
  function drawStand(t) {
    const x = 150, y = 860, w = 120, h = 400;
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(x + 8, y + 10, w, h);
    ctx.fillStyle = "#8A93A8"; ctx.fillRect(x, y, w, h);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? "#9AA3B8" : "#7E879C"; ctx.fillRect(x + k * (w / 5), y, w / 5, h); }
    for (const p of CROWD) {
      const cheer = state === "race" || state === "done" ? Math.sin(t * 9 + p.p) * 1.5 : 0;
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x + 10 + p.x * (w - 20) + cheer, y + 10 + p.y * (h - 20), 6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#F2C9A0"; ctx.beginPath(); ctx.arc(x + 10 + p.x * (w - 20) + cheer + 2, y + 10 + p.y * (h - 20), 3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "#FF3D7F"; ctx.fillRect(x - 6, y - 6, w + 12, 10); ctx.fillRect(x - 6, y + h - 4, w + 12, 10);
  }

  function drawMinimap() {
    if (state === "menu") return;
    const size = Math.min(120, W * 0.28), pad = 12;
    const sc = size / Math.max(BOUNDS.x1 - BOUNDS.x0, BOUNDS.y1 - BOUNDS.y0);
    const mw = (BOUNDS.x1 - BOUNDS.x0) * sc, mh = (BOUNDS.y1 - BOUNDS.y0) * sc;
    const ox = W - mw - pad - 10, top = hudBottom + 18;
    ctx.save();
    ctx.fillStyle = "rgba(20,24,48,.5)"; art.rr(ctx, ox - 8, top - 8, mw + 16, mh + 16, 12); ctx.fill();
    ctx.translate(ox, top); ctx.scale(sc, sc); ctx.translate(-BOUNDS.x0, -BOUNDS.y0);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 6 / sc * 0.6; ctx.lineJoin = "round"; ctx.stroke(TRACK_PATH);
    for (const car of cars) {
      ctx.fillStyle = car.def.color; ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1.5 / sc;
      ctx.beginPath(); ctx.arc(car.x, car.y, (car.isPlayer ? 5.5 : 4) / sc, 0, TAU); ctx.fill(); if (car.isPlayer) ctx.stroke();
    }
    ctx.restore();
  }

  function drawConfetti() {
    for (const p of confetti) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.heart) art.heart(ctx, 0, 0, 6, p.c); else { ctx.fillStyle = p.c; ctx.fillRect(-4, -2.5, 8, 5); }
      ctx.restore();
    }
  }
  function throwConfetti(colors, hearts) {
    for (let k = 0; k < 140; k++) confetti.push({ x: rand(0, W), y: rand(-H * 0.6, -10), vx: rand(-40, 40), vy: rand(0, 120), rot: rand(0, TAU), vr: rand(-6, 6), c: pick(colors), heart: hearts && Math.random() < 0.5 });
  }

  // ---------- HUD ----------
  let lastLap = 0, lastPlace = 0, lastBeep = 4;
  const hudEls = { lap: $("#lapN"), pos: $("#pos"), time: $("#time"), pips: [...document.querySelectorAll(".pip")], boost: $("#bBoost") };
  function place(car) { return 1 + cars.filter((o) => o !== car && rankKey(o) > rankKey(car)).length; }
  const rankKey = (c) => (c.finished ? 1e9 - finishOrder.indexOf(c) : c.total);
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  function updateHud(force) {
    if (!player) return;
    const lap = clamp(player.laps, 1, LAPS);
    if (force || lap !== lastLap) { hudEls.lap.textContent = lap; lastLap = lap; }
    const pl = place(player);
    if (force || pl !== lastPlace) {
      hudEls.pos.innerHTML = `${pl}<sup>${ordinal(pl).slice(-2)}</sup>`;
      hudEls.pos.classList.toggle("first", pl === 1);
      lastPlace = pl;
    }
    hudEls.time.textContent = fmt(raceTime);
    hudEls.pips.forEach((el, i) => el.classList.toggle("full", i < player.charges));
    hudEls.boost.classList.toggle("ready", player.charges > 0);
  }
  let bannerT = 0;
  function banner(text, cls = "") {
    const b = $("#banner");
    b.textContent = text; b.className = "banner show " + cls;
    void b.offsetWidth; b.classList.add("pop");
    bannerT = cls === "count" ? 0.9 : 1.6;
  }

  function showResults() {
    const order = [...finishOrder, ...cars.filter((c) => !c.finished).sort((a, b) => b.total - a.total)];
    const list = $("#standings"); list.innerHTML = "";
    const icons = [];
    order.forEach((car, i) => {
      const li = document.createElement("li");
      if (car.isPlayer) li.className = "me";
      li.style.setProperty("--c", car.def.color);
      const t = car.finished ? fmt(car.finishTime) : "racing…";
      li.innerHTML = `<span class="pl">${ordinal(i + 1)}</span><canvas class="mini"></canvas><span class="nm"><b>${car.isPlayer ? (car.def.owner || "You") : who(car)}</b>${car.def.owner ? `<small>${car.def.name}</small>` : ""}</span><span class="tm">${t}</span>`;
      list.appendChild(li);
      icons.push([li.querySelector("canvas"), car.def]);
    });
    const pl = order.indexOf(player) + 1;
    const name = player.def.owner || "You";
    $("#resTitle").textContent = pl === 1 ? `${name} ${player.def.owner ? "wins" : "win"}!` : `${ordinal(pl)} place!`;
    $("#resSub").textContent = pl === 1 ? `The ${player.def.name} takes the trophy.` : pl === 2 ? "So close! One more race?" : "Grab stars and hit the boost pads to catch up.";
    $("#trophy").hidden = pl !== 1;
    $("#results").hidden = false; $("#controls").hidden = true;
    for (const [cvs, def] of icons) paintPreview(cvs, def, 0, 1.1);
    if (pl === 1) throwConfetti([player.def.color, "#FFD23F", "#FFFFFF", "#7BE0FF"], player.def.id === "ellie");
  }

  // ---------- loop ----------
  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;

    if (state === "count") {
      countT -= dt;
      const n = Math.ceil(countT - 0.6);
      if (n < lastBeep && n >= 0) {
        lastBeep = n;
        if (n > 0) { banner(String(n), "count"); Snd.beep(false); }
      }
      if (countT <= 0.6 && lastBeep > -1) { lastBeep = -1; banner("GO!", "count go"); Snd.beep(true); state = "race"; }
    }

    const racing = state === "race" || state === "done";
    for (const car of cars) {
      const auto = !car.isPlayer || car.finished || state === "menu" || AUTOPILOT;
      const inp = auto ? aiInput(car, dt) : playerInput();
      if (car.isPlayer && car.finished) inp.top = 0.6;
      stepCar(car, inp, dt, !(racing || state === "menu"));
    }
    if (racing || state === "menu") collide();
    if (racing) raceTime += dt;
    if (state === "menu") for (const c of cars) if (c.laps > 50) c.laps = 1;

    if (racing) {
      for (const car of cars) {
        if (!car.finished && car.laps > LAPS) {
          car.finished = true; car.finishTime = raceTime; finishOrder.push(car);
          if (car.isPlayer) {
            state = "done"; doneT = 2.2;
            const pl = finishOrder.length;
            const nm = player.def.owner ? `${player.def.owner.toUpperCase()} WINS!` : "YOU WIN!";
            banner(pl === 1 ? nm : `${ordinal(pl)} PLACE!`, pl === 1 ? "win" : "");
            pl === 1 ? Snd.win() : Snd.finish();
          }
        }
      }
      if (player && !player.finished && player.laps !== lastLap && player.laps >= 2) {
        Snd.lap();
        banner(player.laps === LAPS ? "FINAL LAP!" : `LAP ${player.laps}`);
      }
      updateHud();
    }
    if (state === "done" && doneT > 0) { doneT -= dt; if (doneT <= 0) showResults(); }

    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $("#banner").classList.remove("show"); }

    // camera
    const focus = player || cars.reduce((a, b) => (b.total > a.total ? b : a), cars[0]);
    cam.z = clamp(Math.min(W, H) / 560, 0.55, 1.15) * (state === "menu" ? 0.85 : 1);
    const lead = state === "menu" ? 0.2 : 0.38;
    const tx = focus.x + focus.vx * lead, ty = focus.y + focus.vy * lead;
    const kk = 1 - Math.exp(-dt * 5);
    cam.x += (tx - cam.x) * kk; cam.y += (ty - cam.y) * kk;
    cam.shake = Math.max(0, cam.shake - dt * 18);

    for (const s of STARS) if (s.t > 0) s.t -= dt;
    stepParts(dt);
    if (player) Snd.engine(racing ? player.spd : 0, player.boost > 0);

    drawWorld(T);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawMinimap();
    drawConfetti();
    if (state === "menu") animatePreviews(T);
    requestAnimationFrame(frame);
  }

  // ---------- menu ----------
  function paintPreview(canvas, def, t, zoom = 1, bounce = 0) {
    const r = canvas.getBoundingClientRect();
    const w = r.width || canvas.clientWidth || 40, h = r.height || canvas.clientHeight || 40;
    const d = Math.min(window.devicePixelRatio || 1, 2.5);
    if (canvas.width !== Math.round(w * d)) { canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
    const c = canvas.getContext("2d");
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
    const s = Math.min(w, h) / 64 * zoom;
    c.translate(w / 2, h / 2 + 2 - bounce); c.scale(s, s); c.rotate(-Math.PI / 2);
    def.draw(c, t);
  }
  const grid = $("#grid");
  const cards = CARS.map((def) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "card"; b.style.setProperty("--c", def.color);
    b.setAttribute("aria-pressed", String(def.id === selected));
    const pipRow = (label, n) => `<span class="st"><i>${label}</i><span class="bar">${[1, 2, 3, 4, 5].map((k) => `<b class="${k <= n ? "on" : ""}"></b>`).join("")}</span></span>`;
    b.innerHTML = `${def.owner ? `<span class="owner">${def.owner}'s car</span>` : ""}<canvas></canvas>
      <span class="cname">${def.name}</span><span class="tag">${def.tagline}</span>
      <span class="stats">${pipRow("Speed", def.stats.speed)}${pipRow("Grip", def.stats.grip)}${pipRow("Boost", def.stats.boost)}</span>`;
    b.addEventListener("click", () => {
      selected = def.id; Snd.init();
      cards.forEach((x) => x.el.setAttribute("aria-pressed", String(x.def.id === selected)));
      $("#go").style.setProperty("--c", def.color);
      $("#goName").textContent = def.owner ? `${def.owner}'s ${def.name}` : def.name;
      Snd.tone(660, 0.08, "triangle", 0.08);
    });
    grid.appendChild(b);
    return { el: b, def, cv: b.querySelector("canvas") };
  });
  function animatePreviews(t) {
    for (const k of cards) {
      const on = k.def.id === selected;
      paintPreview(k.cv, k.def, t, 1.15, on ? Math.abs(Math.sin(t * 5)) * 3 : 0);
    }
  }
  {
    const def = byId[selected];
    $("#go").style.setProperty("--c", def.color);
    $("#goName").textContent = def.owner ? `${def.owner}'s ${def.name}` : def.name;
  }
  $("#go").addEventListener("click", startRace);
  $("#again").addEventListener("click", startRace);
  $("#garage").addEventListener("click", () => {
    state = "menu"; confetti.length = 0; parts.length = 0;
    $("#results").hidden = true; $("#hud").hidden = true; $("#controls").hidden = true; $("#menu").hidden = false;
    $("#banner").classList.remove("show");
    Snd.engine(0, false);
    setupDemo();
  });
  const muteBtn = $("#mute");
  const paintMute = () => { muteBtn.textContent = Snd.on ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", Snd.on ? "Mute sound" : "Turn sound on"); };
  muteBtn.addEventListener("click", () => { Snd.on = !Snd.on; store.set("rc-sound", Snd.on ? "on" : "off"); Snd.init(); paintMute(); });
  paintMute();
  document.addEventListener("visibilitychange", () => { if (document.hidden && Snd.ac) Snd.engine(0, false); });

  setupDemo();
  requestAnimationFrame(frame);

  // for quick checks from the console
  window.RC.debug = { get cars() { return cars; }, get state() { return state; }, N, startRace, select: (id) => { selected = id; } };
})();
