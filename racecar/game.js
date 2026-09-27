// Racecar Rally: a 2.5D chase-cam racer, built to be easy and fun.
// The road is a long list of short segments; each frame the ones ahead are
// projected onto the screen, far to near, the classic arcade way.
// The car drives itself forward. You only steer. Stars and rainbows make
// you zoom, bumping is harmless, and the race goes Meadow -> Beach -> Candy Land.
(() => {
  const { CARS, byId, art, SPR, ZONES, ZONE_SPRITES } = window.RC;
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ordinal = (n) => ["", "1st", "2nd", "3rd", "4th"][n] || n + "th";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const AUTOPILOT = new URLSearchParams(location.search).has("autopilot"); // the computer drives (for testing)

  // ---------- road ----------
  const SEG = 200, ROAD_W = 2000, RUMBLE = 3, DRAW = 230;
  const DEPTH = 1 / Math.tan((50 * Math.PI) / 180);
  const MAX = SEG * 60; // top speed, world units per second
  const OFF_MAX = MAX * 0.75, BOOST_MAX = MAX * 1.6, ACCEL = MAX / 2.4;
  const CAR_W = 1150;
  const LANES = [-0.62, 0, 0.62];

  const segs = [];
  let zoneNow = 0;
  const lastY = () => (segs.length ? segs[segs.length - 1].p2.world.y : 0);
  function addSeg(curve, y) {
    const n = segs.length, y0 = lastY();
    segs.push({
      i: n, curve, zone: zoneNow, sprites: [], items: [], clip: 0,
      p1: { world: { y: y0, z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} },
    });
  }
  const easeIn = (a, b, p) => a + (b - a) * p * p;
  const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
  function addRoad(enter, hold, leave, curve, hill) {
    const y0 = lastY(), y1 = y0 + hill * SEG, total = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(y0, y1, n / total));
    for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(y0, y1, (enter + n) / total));
    for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(y0, y1, (enter + hold + n) / total));
  }
  const R = (n, curve = 0, hill = 0) => addRoad(Math.round(n / 4), Math.round(n / 2), Math.round(n / 4), curve, hill);

  // Sunny Meadow
  zoneNow = 0;
  R(70); R(80, 0, 10); R(90, 2, 0); R(60, 0, -10); R(100, -2.5, 14); R(60, 0, -14); R(90, 2.5, 6);
  R(70); R(90, -2, -6); R(60, 0, 18); R(60, 0, -18); R(80, 2, 0); R(90, -2.5, 8); R(70, 0, -8);
  const BEACH_AT = segs.length;
  zoneNow = 1;
  R(80); R(100, -2.5, -8); R(60, 0, 8); R(90, 3, 0); R(70, 0, 22); R(50, 0, -22); R(100, -2.5, 0);
  R(80, 2, 8); R(70, 0, -8); R(100, -2.5, 0); R(90, 2.5, 12); R(60, 0, -12); R(60);
  const CANDY_AT = segs.length;
  zoneNow = 2;
  R(70, 0, 12); R(90, 2.5, -12); R(90, -2.5, 0); R(60, 0, 20); R(60, 0, -20); R(100, 2, 0);
  R(80, -2, 10); R(80, 0, -10); R(90, 2.5, 0); R(90, -2.5, 15); R(60, 0, -15); R(80);
  const FINISH = segs.length + 30;
  R(400);
  const START = 36; // start line segment
  const FINISH_Z = FINISH * SEG, START_Z = START * SEG;
  const segAt = (z) => segs[clamp(Math.floor(z / SEG), 0, segs.length - 1)];

  // Stars and rainbows along the road, same layout every race.
  {
    const r = seeded(4242);
    const add = (i, type, offset) => { if (i < FINISH - 10) segs[i].items.push({ type, offset, got: false }); };
    let lastRing = 0;
    for (let i = START + 40; i < FINISH - 40;) {
      const k = r(), lane = LANES[Math.floor(r() * 3)];
      if (k < 0.26 && i - lastRing > 80) {
        for (let n = 0; n < 4; n++) add(i + n * 4, "star", lane);
        add(i + 22, "ring", lane); lastRing = i; i += 30;
      } else if (k < 0.55) {
        for (let n = 0; n < 6; n++) add(i + n * 4, "star", lane); i += 26;
      } else if (k < 0.8) {
        const dir = r() < 0.5 ? 1 : -1;
        for (let n = 0; n < 7; n++) add(i + n * 4, "star", dir * (-0.62 + n * 0.207)); i += 30;
      } else {
        for (let n = 0; n < 8; n++) add(i + n * 4, "star", Math.sin(n / 7 * Math.PI * 2) * 0.55); i += 34;
      }
      i += 40 + Math.floor(r() * 30);
    }
  }
  // Scenery
  {
    const r = seeded(777);
    const put = (i, name, offset) => segs[i] && segs[i].sprites.push({ s: SPR[name], offset });
    for (let i = 4; i < segs.length; i++) {
      const zs = ZONE_SPRITES[segs[i].zone];
      if (i % 3 === 0) for (const side of [-1, 1]) {
        if (r() < 0.55) { const nm = zs.near[Math.floor(r() * zs.near.length)]; put(i, nm, side * (1.25 + SPR[nm].w / ROAD_W / 2 + r() * 1.2)); }
      }
      if (i % 11 === 0 && r() < 0.8) {
        const nm = zs.far[Math.floor(r() * zs.far.length)], side = r() < 0.5 ? -1 : 1;
        put(i, nm, side * (3.2 + r() * 2.5));
      }
    }
    let b = 0;
    for (let i = START + 60; i < FINISH; i += 190) { put(i, "board" + (b % RC.BOARD_COUNT), (b % 2 ? 1 : -1) * 2.25); b++; }
    for (const at of [START, FINISH]) for (let k = -8; k <= 8; k += 4) {
      put(at + k, "crowd", -2.4); put(at + k, "crowd", 2.4);
      if (k % 8 === 0) { put(at + k + 2, "balloons", -1.5); put(at + k + 2, "balloons", 1.5); }
    }
  }

  // ---------- sound ----------
  const Snd = {
    ac: null, master: null, on: store.get("rc-sound") !== "off", eng: null, musicOn: false, nextNote: 0, step: 0, timer: 0,
    init() {
      if (!this.ac) {
        try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
        this.master = this.ac.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(this.ac.destination);
      }
      if (this.ac.state === "suspended") this.ac.resume();
    },
    setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ac.currentTime, 0.05); },
    tone(f, d, type = "sine", v = 0.12, delay = 0, slide = 0) {
      if (!this.ac) return;
      const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + d + 0.02);
    },
    engine(speed) {
      if (!this.ac) return;
      if (!this.eng) {
        const o = this.ac.createOscillator(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
        o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 420; g.gain.value = 0;
        o.connect(f).connect(g).connect(this.master); o.start();
        this.eng = { o, g };
      }
      const t = this.ac.currentTime;
      this.eng.o.frequency.setTargetAtTime(50 + (speed / MAX) * 70, t, 0.1);
      this.eng.g.gain.setTargetAtTime(speed > 10 ? 0.025 : 0, t, 0.15);
    },
    // A tiny happy tune on loop.
    MEL: [72, 0, 76, 79, 81, 79, 76, 0, 74, 0, 77, 81, 79, 77, 74, 0, 72, 0, 76, 79, 84, 81, 79, 76, 77, 76, 74, 72, 74, 0, 0, 0],
    BASS: [48, 45, 41, 43],
    music(on) {
      this.musicOn = on;
      if (!on || !this.ac || this.timer) return;
      this.nextNote = this.ac.currentTime + 0.05; this.step = 0;
      this.timer = setInterval(() => {
        if (!this.musicOn) { clearInterval(this.timer); this.timer = 0; return; }
        const beat = 60 / 150 / 2;
        while (this.nextNote < this.ac.currentTime + 0.15) {
          const s = this.step % 32, m = this.MEL[s], when = this.nextNote - this.ac.currentTime;
          if (m) this.tone(440 * 2 ** ((m - 69) / 12), beat * 0.9, "square", 0.022, when);
          if (s % 4 === 0) this.tone(440 * 2 ** ((this.BASS[Math.floor(s / 8)] - 69) / 12), beat * 1.8, "triangle", 0.06, when);
          this.nextNote += beat; this.step++;
        }
      }, 40);
    },
    star(n) { const f = 880 * 2 ** ((n % 8) / 12); this.tone(f, 0.1, "triangle", 0.12); this.tone(f * 1.5, 0.16, "triangle", 0.08, 0.06); },
    ring() { this.tone(300, 0.6, "sawtooth", 0.06, 0, 4); [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.15, "triangle", 0.08, 0.05 + i * 0.06)); },
    bump() { this.tone(180, 0.18, "sine", 0.18, 0, 0.5); },
    beep(go) { this.tone(go ? 880 : 523, go ? 0.5 : 0.25, "square", 0.08); },
    horn(def) { (def.horn || []).forEach(([f, d], i) => this.tone(f, d, def.hornType, 0.1, i * 0.15, def.hornSlide || 0)); },
    fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, "triangle", 0.11, i * 0.13)); },
    pass() { this.tone(660, 0.1, "triangle", 0.09); this.tone(990, 0.14, "triangle", 0.09, 0.08); },
  };

  // ---------- canvas & view ----------
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, Y0 = 0, GROUND = 0, K = 1, CAM_H = 1000, PLAYER_Z = 840;
  let backdrops = [];
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const portrait = H > W;
    Y0 = H * (portrait ? 0.4 : 0.44);
    GROUND = H - Math.max(portrait ? 120 : 70, H * (portrait ? 0.15 : 0.1));
    K = GROUND - Y0;
    // pick a camera height so the road fills a comfortable share of the screen
    const half = Math.min(W * (portrait ? 0.6 : 0.32), K * 1.5);
    CAM_H = clamp((ROAD_W * K) / half, 900, 3000);
    PLAYER_Z = CAM_H * DEPTH;
    backdrops = ZONES.map((_, z) => RC.paintBackdrop(z, W, Y0 + 6));
  }
  addEventListener("resize", resize); resize();

  function project(p, camX, camY, camZ) {
    p.camera.x = -camX; p.camera.y = p.world.y - camY; p.camera.z = p.world.z - camZ;
    const s = (p.screen.scale = DEPTH / p.camera.z);
    p.screen.x = W / 2 + s * p.camera.x * K;
    p.screen.y = Math.round(Y0 - s * p.camera.y * K);
    p.screen.w = s * ROAD_W * K;
  }

  // ---------- state ----------
  let state = "menu"; // menu | count | race | finish
  let selected = store.get("rc-car"); if (!byId[selected]) selected = CARS[0].id;
  const rwPlayer = window.RosenbergBridge && RosenbergBridge.player; // who is playing inside Rosenberg World
  if (byId[rwPlayer]) selected = rwPlayer;
  const P = { def: byId[selected], z: 0, x: 0, speed: 0, boost: 0, bumpV: 0, stars: 0, tilt: 0, bounce: 0, finishTime: 0, place: 4, sayT: 0, say: "" };
  let rivals = [], raceT = 0, countT = 0, finishT = 0, skyX = 0, T = 0, shake = 0, zoneShown = 0, bgFade = 1, bgFrom = 0, bgTo = 0;
  const parts = [], confetti = [], fireworks = [];

  function rivalIds(id) {
    const fam = ["ellie", "jonah", "reuben"].filter((k) => k !== id);
    const extras = CARS.map((c) => c.id).filter((k) => k !== id && !fam.includes(k));
    while (fam.length < 3) fam.push(extras.splice(Math.floor(Math.random() * extras.length), 1)[0]);
    return fam;
  }
  function setup(forMenu) {
    P.def = byId[selected];
    P.z = START_Z - PLAYER_Z - SEG * 6; P.x = 0; P.speed = forMenu ? MAX * 0.8 : 0;
    P.boost = 0; P.bumpV = 0; P.stars = 0; P.finishTime = 0; P.place = 4; P.sayT = 0;
    const ids = rivalIds(selected);
    // everyone starts ahead of you, so you get to pass them all
    rivals = ids.map((id, k) => ({
      def: byId[id], z: START_Z + SEG * [0, -3, 5][k],
      x: [-0.5, 0.5, 0][k], laneGoal: [-0.5, 0.5, 0][k], laneT: rand(1, 3),
      speed: forMenu ? MAX * 0.8 : 0, skill: [0.86, 0.82, 0.78][k], boost: 0, finishTime: 0, bumpT: 0, sayT: 0, say: "",
    }));
    for (const s of segs) for (const it of s.items) it.got = false;
    parts.length = 0; confetti.length = 0; fireworks.length = 0;
    raceT = 0; zoneShown = 0; bgFrom = bgTo = 0; bgFade = 1;
  }

  function startRace() {
    Snd.init();
    store.set("rc-car", selected);
    setup(false);
    state = "count"; countT = 3.4; lastCount = 4;
    $("#menu").hidden = true; $("#results").hidden = true; $("#hud").hidden = false; $("#touch").hidden = false;
    $("#lights").hidden = false; paintLights(0);
    buildProgress();
    updateHud(true);
    Snd.music(true);
  }

  // ---------- input ----------
  const keys = new Set();
  const touches = new Map();
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
    if ((k === " " || k === "h") && !e.repeat && (state === "race" || state === "finish")) honk();
    if (k === "enter" && (state === "menu" || !$("#results").hidden)) startRace();
    keys.add(k);
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => { keys.clear(); touches.clear(); });
  const zone = $("#touch");
  const setTouch = (e) => { touches.set(e.pointerId, e.clientX < W / 2 ? -1 : 1); };
  zone.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; e.preventDefault(); Snd.init(); setTouch(e); try { zone.setPointerCapture(e.pointerId); } catch {} });
  zone.addEventListener("pointermove", (e) => { if (touches.has(e.pointerId)) setTouch(e); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) zone.addEventListener(ev, (e) => touches.delete(e.pointerId));
  zone.addEventListener("contextmenu", (e) => e.preventDefault());
  $("#honk").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); Snd.init(); honk(); });

  function steerInput() {
    let s = 0;
    if (keys.has("arrowleft") || keys.has("a")) s -= 1;
    if (keys.has("arrowright") || keys.has("d")) s += 1;
    for (const v of touches.values()) s += v;
    const l = s < 0, r = s > 0;
    $("#tl").classList.toggle("on", l); $("#tr").classList.toggle("on", r);
    return clamp(s, -1, 1);
  }
  function honk() {
    Snd.horn(P.def);
    P.say = P.def.honk; P.sayT = 1.3;
    // the car right in front of you says something back
    const ahead = rivals.filter((r) => r.z > P.z + PLAYER_Z && r.z - (P.z + PLAYER_Z) < SEG * 25).sort((a, b) => a.z - b.z)[0];
    if (ahead) { ahead.say = pick(["Hey! 😄", "Catch me! 😜", "Beep! 👋", "Zoom! 💨", "Hi! 🙂"]); ahead.sayT = 1.4; ahead.laneGoal = pick(LANES.filter((l) => Math.abs(l - P.x) > 0.4)); }
  }

  // ---------- simulation ----------
  function autopilot() {
    // look a little ahead for something shiny, otherwise aim for the middle lane
    const base = Math.floor((P.z + PLAYER_Z) / SEG);
    let target = 0;
    for (let n = 2; n < 24; n++) { const s = segs[base + n]; if (s && s.items.some((it) => !it.got)) { target = s.items.find((it) => !it.got).offset; break; } }
    const seg = segAt(P.z + PLAYER_Z);
    return clamp((target - P.x) * 4 + seg.curve * 0.15, -1, 1);
  }

  let lastCount = 4, lastPlace = 4;
  function step(dt) {
    T += dt;
    const racing = state === "race" || state === "finish";

    if (state === "count") {
      countT -= dt;
      const n = Math.ceil(countT - 0.4);
      if (n < lastCount && n >= 1) { lastCount = n; paintLights(4 - n); Snd.beep(false); }
      if (countT <= 0.4) {
        state = "race"; paintLights(4); Snd.beep(true); banner("GO!", "go");
        setTimeout(() => { $("#lights").hidden = true; }, 700);
      }
    }

    // player
    const seg = segAt(P.z + PLAYER_Z);
    const pct = P.speed / MAX;
    let steer = 0;
    if (state === "menu" || state === "finish" || AUTOPILOT) steer = autopilot();
    else if (state === "race") steer = steerInput();
    else steerInput();
    const moving = racing || state === "menu";
    if (moving) {
      P.x += steer * dt * 2.1 * clamp(pct, 0.3, 1);
      if (state !== "menu") P.x -= dt * 2 * pct * seg.curve * 0.11; // gentle pull on curves
      P.x += P.bumpV * dt; P.bumpV *= Math.exp(-dt * 6);
      const off = Math.abs(P.x) > 1.02;
      if (off && steer === 0) P.x -= Math.sign(P.x) * dt * 0.7; // wander back onto the road on your own
      P.x = clamp(P.x, -1.7, 1.7);
      let top = off ? OFF_MAX : MAX;
      if (state === "finish") top = MAX * 0.55;
      if (state === "menu") top = MAX * 0.8;
      if (P.boost > 0) { top = BOOST_MAX; P.boost -= dt; }
      if (P.speed < top) P.speed = Math.min(top, P.speed + (P.boost > 0 ? ACCEL * 3 : ACCEL) * dt);
      else P.speed = Math.max(top, P.speed - ACCEL * 1.2 * dt);
      const z0 = P.z + PLAYER_Z;
      P.z += P.speed * dt;
      collect(z0, P.z + PLAYER_Z);
      P.bounce = off ? Math.sin(T * 40) * 2.5 : 0;
      if (off && Math.random() < dt * 20) spawnDust();
    }
    P.tilt = lerp(P.tilt, steer * 0.07, Math.min(1, dt * 8));
    if (P.sayT > 0) P.sayT -= dt;
    if (racing) raceT += dt;

    // rivals
    const pz = P.z + PLAYER_Z;
    for (const r of rivals) {
      if (!moving) break;
      const gap = r.z - pz;
      let target = MAX * r.skill;
      if (state === "menu") target = MAX * 0.8 + (r.skill - 0.8) * MAX * 0.3;
      else if (gap > SEG * 45) target *= 0.8; // wait up
      else if (gap < -SEG * 20 && pz < FINISH_Z * 0.85) target = MAX * 0.96; // keep you company
      if (r.boost > 0) { target = BOOST_MAX * 0.85; r.boost -= dt; }
      if (r.finishTime) target = MAX * 0.5;
      r.speed += clamp(target - r.speed, -ACCEL * dt, ACCEL * dt);
      const rz0 = r.z;
      r.z += r.speed * dt;
      // rivals get rainbow boosts too
      for (let i = Math.floor(rz0 / SEG); i <= Math.floor(r.z / SEG); i++) for (const it of segs[i].items) if (it.type === "ring" && Math.abs(it.offset - r.x) < 0.4) r.boost = 1.2;
      r.laneT -= dt;
      if (r.laneT < 0) { r.laneGoal = pick(LANES); r.laneT = rand(2, 4.5); }
      r.x += clamp(r.laneGoal - r.x, -dt * 0.8, dt * 0.8);
      if (r.sayT > 0) r.sayT -= dt;
      r.bumpT -= dt;
      if (state !== "menu" && Math.abs(r.z - pz) < SEG * 1.1 && Math.abs(r.x - P.x) < 0.5 && r.bumpT <= 0) {
        // boing! harmless bump, both cars wiggle apart
        const dir = Math.sign(P.x - r.x) || 1;
        P.bumpV = dir * 1.6; r.x = clamp(r.x - dir * 0.25, -0.8, 0.8); r.laneGoal = clamp(r.x - dir * 0.3, -0.62, 0.62);
        r.bumpT = 0.6; shake = 6; Snd.bump();
        popText(W / 2, GROUND - 120, pick(["BOING!", "BONK!", "BOOP!"]), "#FFFFFF");
      }
      if (racing && !r.finishTime && r.z >= FINISH_Z) r.finishTime = raceT;
    }
    // rivals keep out of each other's way
    for (const a of rivals) for (const b of rivals) if (a !== b && b.z > a.z && b.z - a.z < SEG * 6 && Math.abs(a.x - b.x) < 0.5) a.laneGoal = pick(LANES.filter((l) => Math.abs(l - b.x) > 0.5));
    if (state === "menu" && P.z > FINISH_Z - SEG * 200) setup(true);

    // finish
    if (state === "race" && pz >= FINISH_Z) {
      state = "finish"; P.finishTime = raceT; finishT = 0;
      const place = 1 + rivals.filter((r) => r.finishTime && r.finishTime < raceT).length;
      P.place = place;
      Snd.fanfare();
      banner(place === 1 ? (P.def.owner ? `${P.def.owner.toUpperCase()} WINS!` : "YOU WIN!") : `${ordinal(place)} PLACE!`, "win");
      throwConfetti();
      for (let k = 0; k < 5; k++) setTimeout(() => firework(), k * 350);
    }
    if (state === "finish") {
      finishT += dt;
      if (Math.random() < dt * 1.6) firework();
      if (finishT > 3 && $("#results").hidden) showResults();
    }

    // world change banner
    const zNow = seg.zone;
    if (racing && zNow !== zoneShown) { zoneShown = zNow; banner(`${ZONES[zNow].emoji} ${ZONES[zNow].name}!`, "zone"); }
    if (zNow !== bgTo) { bgFrom = bgTo; bgTo = zNow; bgFade = 0; }
    bgFade = Math.min(1, bgFade + dt * 0.8);

    skyX += seg.curve * pct * dt * 0.035;
    shake = Math.max(0, shake - dt * 20);
    trail(dt);
    stepParts(dt);
    if (racing) updateHud();
    Snd.engine(racing ? P.speed : 0);
  }

  function collect(z0, z1) {
    for (let i = Math.floor(z0 / SEG); i <= Math.floor(z1 / SEG); i++) {
      const s = segs[i]; if (!s) continue;
      for (const it of s.items) {
        if (it.got || state === "menu") continue;
        const reach = it.type === "ring" ? 0.42 : 0.34;
        if (Math.abs(it.offset - P.x) < reach) {
          it.got = true;
          if (it.type === "star") {
            P.stars++; Snd.star(P.stars);
            burst(W / 2 + (it.offset - P.x) * 80, GROUND - 90, ["#FFD23F", "#FFFFFF", "#FFB400"], 10, "star");
            if (P.stars % 25 === 0) { P.boost = Math.max(P.boost, 1.6); banner(`${P.stars} STARS! SUPER ZOOM!`, "zone"); Snd.ring(); shake = 4; }
          } else {
            P.boost = Math.max(P.boost, 2.0); Snd.ring(); shake = 5;
            banner("🌈 RAINBOW ZOOM!", "zone");
            burst(W / 2, GROUND - 100, ["#FF3D3D", "#FF9F1C", "#FFE45C", "#35D07F", "#2F9BFF", "#9B5CFF"], 24, "dot");
          }
        }
      }
    }
  }

  // ---------- particles (screen space) ----------
  function spawn(p) { if (parts.length < 400) parts.push(p); }
  function burst(x, y, colors, n, kind) {
    for (let k = 0; k < n; k++) {
      const a = rand(0, Math.PI * 2), v = rand(120, 360);
      spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 500, life: 0.8, max: 0.8, kind, c: pick(colors), s: rand(4, 8), rot: rand(0, 6) });
    }
  }
  function popText(x, y, text, c) { spawn({ x, y, vx: 0, vy: -90, g: 0, life: 0.9, max: 0.9, kind: "text", text, c, s: 1, rot: 0 }); }
  function spawnDust() {
    const cs = ZONES[segAt(P.z + PLAYER_Z).zone].grass;
    spawn({ x: W / 2 + rand(-40, 40), y: GROUND - 4, vx: rand(-80, 80), vy: rand(-80, -20), g: 200, life: 0.5, max: 0.5, kind: "dot", c: pick(cs), s: rand(5, 10), rot: 0 });
  }
  let trailT = 0;
  function trail(dt) {
    if (!(state === "race" || state === "finish") || P.speed < MAX * 0.3) return;
    trailT -= dt;
    if (trailT > 0) return;
    trailT = P.boost > 0 ? 0.03 : 0.09;
    const s = carScreenScale(), w = CAR_W * s;
    const t = P.def.trail;
    spawn({ x: W / 2 + rand(-w * 0.3, w * 0.3), y: GROUND - w * 0.12, vx: rand(-60, 60), vy: rand(20, 80), g: -60, life: 0.9, max: 0.9, kind: t.kind, c: pick(t.colors), s: rand(5, 9) * clamp(w / 110, 0.7, 1.6), rot: rand(0, 6) });
    if (P.boost > 0) for (const [ex, ey] of P.def.exhaust) spawn({ x: W / 2 + ex * w / 100, y: GROUND + P.bounce + ey * w / 100, vx: rand(-20, 20), vy: rand(60, 140), g: 0, life: 0.3, max: 0.3, kind: "dot", c: pick(["#FFB23D", "#FF6A3D", "#FFE08A"]), s: rand(6, 11) * w / 110, rot: 0 });
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 3;
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i]; p.vy += 200 * dt; p.x += p.vx * dt + Math.sin(T * 3 + p.rot) * 0.6; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > H + 20) confetti.splice(i, 1);
    }
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const f = fireworks[i]; f.life -= dt; if (f.life <= 0) { fireworks.splice(i, 1); continue; }
      for (const s of f.sparks) { s.vy += 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    }
  }
  function drawParts() {
    for (const p of parts) {
      const f = p.life / p.max;
      ctx.globalAlpha = Math.min(1, f * 2);
      const s = p.s * (0.6 + f * 0.5);
      if (p.kind === "text") {
        ctx.font = "22px Bungee, 'Arial Black', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 5; ctx.strokeStyle = "rgba(27,31,59,.6)"; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === "heart") art.heart(ctx, p.x, p.y, s, p.c);
      else if (p.kind === "star") art.star(ctx, p.x, p.y, s * 1.2, p.c, 5, 0.45, p.rot);
      else if (p.kind === "spark") art.sparkle(ctx, p.x, p.y, s * 1.3, p.c);
      else if (p.kind === "bolt") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.2); ctx.scale(s / 8, s / 8);
        ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-3, 10); ctx.lineTo(5, -2); ctx.lineTo(0, -2); ctx.closePath();
        ctx.fillStyle = p.c; ctx.fill(); ctx.restore();
      } else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const p of confetti) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.heart) art.heart(ctx, 0, 0, 7, p.c); else { ctx.fillStyle = p.c; ctx.fillRect(-5, -3, 10, 6); }
      ctx.restore();
    }
    for (const f of fireworks) {
      ctx.globalAlpha = Math.min(1, f.life);
      for (const s of f.sparks) { ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function throwConfetti() {
    const cols = [P.def.color, "#FFD23F", "#FFFFFF", "#7BE0FF", "#35D07F"];
    for (let k = 0; k < 160; k++) confetti.push({ x: rand(0, W), y: rand(-H * 0.8, -10), vx: rand(-30, 30), vy: rand(0, 100), rot: rand(0, 6), vr: rand(-6, 6), c: pick(cols), heart: P.def.id === "ellie" && Math.random() < 0.5 });
  }
  function firework() {
    const x = rand(W * 0.15, W * 0.85), y = rand(H * 0.08, Y0 * 0.8), c = pick(["#FF5FAE", "#FFE45C", "#7BE0FF", "#35D07F", "#FF8C5A", "#B69BFF"]);
    const sparks = [];
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, v = rand(90, 160); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c }); }
    fireworks.push({ life: 1.3, sparks });
    Snd.tone(rand(200, 300), 0.3, "sine", 0.05, 0, 0.4);
  }

  // ---------- rendering ----------
  const carScreenScale = () => K / CAM_H; // screen px per world unit at the player's distance
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
  }
  function drawBackdrop() {
    const draw = (z, a) => {
      const img = backdrops[z]; if (!img) return;
      ctx.globalAlpha = a;
      const bw = img.width;
      let x = -((skyX * W) % bw); if (x > 0) x -= bw;
      ctx.drawImage(img, x, 0); ctx.drawImage(img, x + bw, 0);
    };
    if (bgFade < 1) draw(bgFrom, 1);
    draw(bgTo, bgFade < 1 ? bgFade : 1);
    ctx.globalAlpha = 1;
  }
  function renderSegment(seg) {
    const p1 = seg.p1.screen, p2 = seg.p2.screen, zone = ZONES[seg.zone];
    const light = Math.floor(seg.i / RUMBLE) % 2;
    const x1 = p1.x, y1 = p1.y, w1 = p1.w, x2 = p2.x, y2 = p2.y, w2 = p2.w;
    ctx.fillStyle = zone.grass[light]; ctx.fillRect(0, y2, W, y1 - y2);
    const r1 = w1 / 7, r2 = w2 / 7;
    poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, zone.rumble[light]);
    poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, zone.rumble[light]);
    poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, zone.road[light]);
    if (seg.i === START || seg.i === FINISH || seg.i === START + 1 || seg.i === FINISH + 1) {
      const cols = 10, row = seg.i % 2;
      for (let k = 0; k < cols; k++) {
        const a = k / cols, b = (k + 1) / cols;
        poly(x1 - w1 + 2 * w1 * a, y1, x1 - w1 + 2 * w1 * b, y1, x2 - w2 + 2 * w2 * b, y2, x2 - w2 + 2 * w2 * a, y2, (k + row) % 2 ? "#111" : "#FFF");
      }
    } else if (light) {
      const l1 = w1 / 40, l2 = w2 / 40;
      for (const f of [-1 / 3, 1 / 3]) {
        const lx1 = x1 + w1 * f, lx2 = x2 + w2 * f;
        poly(lx1 - l1, y1, lx1 + l1, y1, lx2 + l2, y2, lx2 - l2, y2, zone.lane);
      }
    }
  }
  function drawSpriteImg(img, worldW, scale, x, y, clipY, offsetFrac = -0.5) {
    const dw = worldW * scale * K, dh = (dw * img.height) / img.width;
    const dx = x + dw * offsetFrac, dy = y - dh;
    if (dw < 1 || dy >= clipY) return;
    const vis = Math.min(1, (clipY - dy) / dh);
    ctx.drawImage(img, 0, 0, img.width, img.height * vis, dx, dy, dw, dh * vis);
  }
  function drawCar(def, x, y, w, tilt, clipY, t) {
    if (w < 2) return;
    ctx.save();
    if (clipY < y) { ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip(); }
    ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(w / 100, w / 100);
    def.draw(ctx, t);
    ctx.restore();
  }
  function bubble(x, y, text, color) {
    ctx.font = "800 15px Nunito, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 22;
    art.rr(ctx, x - w / 2, y - 16, w, 30, 15); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y + 13); ctx.lineTo(x, y + 22); ctx.lineTo(x + 6, y + 13); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.fillStyle = "#1B1F3B"; ctx.fillText(text, x, y);
  }
  function nameTag(x, y, text, color, size) {
    ctx.font = `800 ${size}px Nunito, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + size;
    art.rr(ctx, x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.fillText(text, x, y + 0.5);
  }
  function drawItem(it, x, y, scale, clipY) {
    const px = scale * K;
    if (it.type === "star") {
      const r = 190 * px, lift = (320 + Math.sin(T * 5 + x * 0.01) * 50) * px, cy = y - lift;
      if (cy - r > clipY || r < 1) return;
      ctx.save(); if (cy + r > clipY) { ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip(); }
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.35; art.star(ctx, x, cy, r * 1.35, "#FFFFFF", 5, 0.5, -Math.PI / 2); ctx.globalAlpha = 1;
      const squash = Math.abs(Math.cos(T * 3));
      ctx.translate(x, cy); ctx.scale(0.35 + 0.65 * squash, 1);
      art.star(ctx, 0, 0, r, "#FFB400", 5, 0.5, -Math.PI / 2);
      art.star(ctx, 0, -r * 0.05, r * 0.7, "#FFE45C", 5, 0.5, -Math.PI / 2);
      ctx.restore();
    } else {
      const R = 620 * px, band = R * 0.13;
      if (y - R > clipY || R < 2) return;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Math.min(clipY, y)); ctx.clip();
      const cols = ["#FF3D3D", "#FF9F1C", "#FFE45C", "#35D07F", "#2F9BFF", "#9B5CFF"];
      ctx.lineWidth = band + 0.5;
      cols.forEach((c, k) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x, y, R - k * band, Math.PI, 0); ctx.stroke(); });
      for (const sx of [x - R + band * 3, x + R - band * 3]) art.sparkle(ctx, sx, y - band * 2, band * 2 * (0.6 + 0.4 * Math.sin(T * 6)), "#FFFFFF");
      ctx.restore();
    }
  }
  function drawArch(seg, clipY, label) {
    const p = seg.p1.screen, s = p.scale, px = s * K;
    const lx = p.x - p.w * 1.18, rx = p.x + p.w * 1.18, top = p.y - 2600 * px, th = 380 * px;
    if (top > clipY) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip();
    for (const x of [lx, rx]) { ctx.fillStyle = "#3A3F55"; ctx.fillRect(x - 60 * px, top, 120 * px, p.y - top); }
    art.rr(ctx, lx - 80 * px, top - th * 0.2, rx - lx + 160 * px, th, 40 * px);
    ctx.fillStyle = "#FF3D7F"; ctx.fill();
    const cw = (rx - lx) / 16;
    for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? "#111" : "#FFF"; ctx.fillRect(lx + k * cw, top + th * 0.62, cw, th * 0.18); }
    ctx.fillStyle = "#FFFFFF"; ctx.font = `${Math.max(6, th * 0.42)}px Bungee, 'Arial Black', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, (lx + rx) / 2, top + th * 0.28);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = shake ? rand(-shake, shake) : 0, sy = shake ? rand(-shake, shake) : 0;
    ctx.translate(sx, sy);
    drawBackdrop();

    const base = segAt(P.z), basePct = (P.z % SEG) / SEG;
    const pz = P.z + PLAYER_Z, pSeg = segAt(pz), pPct = (pz % SEG) / SEG;
    const playerY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
    const camY = playerY + CAM_H;
    let maxy = H + 20, x = 0, dx = -(base.curve * basePct);
    const drawn = [];
    for (let n = 0; n < DRAW; n++) {
      const seg = segs[base.i + n]; if (!seg) break;
      project(seg.p1, P.x * ROAD_W - x, camY, P.z);
      project(seg.p2, P.x * ROAD_W - x - dx, camY, P.z);
      x += dx; dx += seg.curve;
      seg.clip = maxy;
      drawn.push(seg);
      if (seg.p1.camera.z <= DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
      renderSegment(seg);
      maxy = seg.p2.screen.y;
    }
    // haze near the horizon
    const hz = ZONES[pSeg.zone].haze;
    const g = ctx.createLinearGradient(0, Y0 - H * 0.2, 0, Y0 + H * 0.12);
    g.addColorStop(0, hz + "00"); g.addColorStop(0.55, hz + "AA"); g.addColorStop(1, hz + "00");
    ctx.fillStyle = g; ctx.fillRect(0, Y0 - H * 0.2, W, H * 0.32);

    // sprites, items and cars, far to near
    let playerDrawn = false;
    for (let n = drawn.length - 1; n >= 0; n--) {
      const seg = drawn[n];
      if (seg.p1.camera.z <= DEPTH) continue;
      const p1 = seg.p1.screen, p2 = seg.p2.screen;
      for (const sp of seg.sprites) drawSpriteImg(sp.s.img, sp.s.w, p1.scale, p1.x + p1.scale * sp.offset * ROAD_W * K, p1.y, seg.clip);
      if (seg.i === FINISH) drawArch(seg, seg.clip, "FINISH");
      if (seg.i === START) drawArch(seg, seg.clip, "START");
      for (const it of seg.items) if (!it.got) drawItem(it, p1.x + p1.scale * it.offset * ROAD_W * K, p1.y, p1.scale, seg.clip);
      for (const r of rivals) {
        if (Math.floor(r.z / SEG) !== seg.i) continue;
        const pct = (r.z % SEG) / SEG;
        const sc = lerp(p1.scale, p2.scale, pct);
        const rx = lerp(p1.x, p2.x, pct) + sc * r.x * ROAD_W * K, ry = lerp(p1.y, p2.y, pct);
        const w = CAR_W * sc * K;
        drawCar(r.def, rx, ry, w, 0, seg.clip, T);
        if (r.boost > 0 && ry < seg.clip) for (const [ex, ey] of r.def.exhaust) { ctx.fillStyle = pick(["#FFB23D", "#FFE08A"]); ctx.beginPath(); ctx.arc(rx + ex * w / 100, ry + ey * w / 100 + w * 0.05, w * 0.06, 0, Math.PI * 2); ctx.fill(); }
        if (state !== "menu" && w > 24 && ry - w * 0.9 < seg.clip) {
          nameTag(rx, ry - w * 1.05, r.def.owner || r.def.name, r.def.color, clamp(w * 0.13, 10, 15));
          if (r.sayT > 0) bubble(rx, ry - w * 1.05 - 34, r.say, r.def.color);
        }
      }
      if (!playerDrawn && seg.i <= pSeg.i) { drawPlayer(); playerDrawn = true; }
    }
    if (!playerDrawn) drawPlayer();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (P.boost > 0) speedLines();
    drawParts();
  }
  function drawPlayer() {
    if (state === "menu") return;
    const w = CAR_W * carScreenScale();
    drawCar(P.def, W / 2, GROUND + P.bounce, w, P.tilt, H * 2, T);
    if (P.sayT > 0) bubble(W / 2, GROUND - w * 1.15, P.say, P.def.color);
  }
  function speedLines() {
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let k = 0; k < 10; k++) {
      const a = rand(0, Math.PI * 2), r0 = Math.max(W, H) * rand(0.35, 0.5), len = rand(40, 110);
      const cx = W / 2, cy = Y0 + K * 0.3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); ctx.stroke();
    }
  }

  // ---------- HUD ----------
  const posEl = $("#pos"), starsEl = $("#starsN");
  let dots = [];
  function buildProgress() {
    const bar = $("#track"); bar.querySelectorAll(".dot").forEach((d) => d.remove());
    dots = [P, ...rivals].map((c) => {
      const d = document.createElement("span"); d.className = "dot" + (c === P ? " me" : "");
      d.style.setProperty("--c", c.def.color);
      bar.appendChild(d); return { c, d };
    });
  }
  function updateHud(force) {
    const pz = P.z + PLAYER_Z;
    const place = state === "finish" ? P.place : 1 + rivals.filter((r) => r.z > pz).length;
    if (force || place !== lastPlace) {
      if (!force && place < lastPlace && state === "race") {
        const passed = rivals.filter((r) => r.z < pz).sort((a, b) => b.z - a.z)[0];
        if (passed) { popText(W / 2, GROUND - 170, `You passed ${passed.def.owner || passed.def.name}!`, "#FFFFFF"); Snd.pass(); }
      }
      posEl.innerHTML = `${place}<sup>${ordinal(place).slice(-2)}</sup>`;
      posEl.classList.toggle("first", place === 1);
      lastPlace = place;
    }
    starsEl.textContent = P.stars;
    const span = FINISH_Z - START_Z;
    for (const { c, d } of dots) {
      const z = c === P ? pz : c.z;
      d.style.left = `${clamp((z - START_Z) / span, 0, 1) * 100}%`;
    }
  }
  let bannerTimer = 0;
  function banner(text, cls = "") {
    const b = $("#banner");
    b.textContent = text; b.className = "banner " + cls;
    void b.offsetWidth; b.classList.add("show");
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove("show"), 1500);
  }
  function paintLights(n) {
    // n: 0 none, 1-3 reds one by one, 4 all green
    $("#lights").querySelectorAll("i").forEach((el, k) => { el.className = n >= 4 ? "g" : k < n ? "r" : ""; });
  }

  function showResults() {
    const all = [P, ...rivals];
    const order = all.slice().sort((a, b) => {
      const fa = a.finishTime || Infinity, fb = b.finishTime || Infinity;
      if (fa !== fb) return fa - fb;
      return (b === P ? b.z + PLAYER_Z : b.z) - (a === P ? a.z + PLAYER_Z : a.z);
    });
    const pod = $("#podium"); pod.innerHTML = "";
    const slots = [1, 0, 2, 3]; // 2nd, 1st, 3rd, then 4th
    const icons = [];
    slots.forEach((k) => {
      const c = order[k]; if (!c) return;
      const div = document.createElement("div");
      div.className = `step s${k + 1}` + (c === P ? " me" : "");
      div.style.setProperty("--c", c.def.color);
      div.innerHTML = `<canvas></canvas><b>${c === P ? (c.def.owner || "You") : (c.def.owner || c.def.name)}</b><span class="blk">${ordinal(k + 1)}</span>`;
      pod.appendChild(div);
      icons.push([div.querySelector("canvas"), c.def]);
    });
    const place = order.indexOf(P) + 1;
    if (window.RosenbergBridge) RosenbergBridge.report({ score: P.stars, stars: place === 1 ? 3 : place === 2 ? 2 : 1 });
    const name = P.def.owner || "You";
    $("#resTitle").textContent = place === 1 ? `${name} ${P.def.owner ? "wins" : "win"}!` : `${ordinal(place)} place!`;
    $("#resSub").innerHTML = `You grabbed <b>${P.stars} ⭐</b> stars.` + (place === 1 ? " Champion driving!" : " Grab more stars and rainbows to zoom ahead!");
    $("#results").hidden = false; $("#touch").hidden = true;
    for (const [c, def] of icons) paintPreview(c, def, 0);
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt);
    render();
    if (state === "menu") animatePreviews();
    requestAnimationFrame(frame);
  }

  // ---------- menu ----------
  function paintPreview(canvas, def, t, bounce = 0) {
    const r = canvas.getBoundingClientRect();
    const w = r.width || 80, h = r.height || 60, d = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * d)) { canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
    const c = canvas.getContext("2d");
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
    const s = Math.min(w / 130, h / 120);
    c.translate(w / 2, h - 8 - bounce); c.scale(s, s);
    def.draw(c, t);
  }
  const grid = $("#grid");
  const cards = CARS.map((def) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "card"; b.style.setProperty("--c", def.color);
    b.setAttribute("aria-pressed", String(def.id === selected));
    b.innerHTML = `${def.owner ? `<span class="owner">${def.owner}'s car</span>` : ""}<canvas></canvas><span class="cname">${def.name}</span><span class="tag">${def.tagline}</span>`;
    b.addEventListener("click", () => {
      selected = def.id; Snd.init(); Snd.horn(def);
      cards.forEach((x) => x.el.setAttribute("aria-pressed", String(x.def.id === selected)));
      paintGo();
    });
    grid.appendChild(b);
    return { el: b, def, cv: b.querySelector("canvas") };
  });
  function animatePreviews() {
    for (const k of cards) paintPreview(k.cv, k.def, T, k.def.id === selected ? Math.abs(Math.sin(T * 6)) * 6 : 0);
  }
  function paintGo() {
    const def = byId[selected];
    $("#go").style.setProperty("--c", def.color);
    $("#goName").textContent = def.owner ? `${def.owner}'s ${def.name}` : def.name;
  }
  paintGo();
  $("#go").addEventListener("click", startRace);
  $("#again").addEventListener("click", startRace);
  $("#garage").addEventListener("click", () => {
    state = "menu"; Snd.music(false);
    $("#results").hidden = true; $("#hud").hidden = true; $("#touch").hidden = true; $("#lights").hidden = true; $("#menu").hidden = false;
    setup(true);
  });
  const muteBtn = $("#mute");
  const paintMute = () => { muteBtn.textContent = Snd.on ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", Snd.on ? "Mute sound" : "Turn sound on"); };
  muteBtn.addEventListener("click", () => { Snd.init(); Snd.setOn(!Snd.on); store.set("rc-sound", Snd.on ? "on" : "off"); paintMute(); });
  paintMute();
  document.addEventListener("visibilitychange", () => { if (document.hidden) { Snd.engine(0); if (Snd.ac) Snd.ac.suspend(); } else if (Snd.ac && state !== "menu") Snd.ac.resume(); });

  setup(true);
  requestAnimationFrame(frame);
  window.RC.debug = { get state() { return state; }, P, get rivals() { return rivals; }, FINISH_Z, startRace };
})();
