// Rosenberg World: the engine. Camera, touch controls, walking, pathfinding, effects and the render loop.
// World content (buildings, props, interactions) is defined in world.js and handed to the engine.

(() => {
  const RW = window.RW, A = RW.art, U = RW.util, WORLD = RW.WORLD;
  const TAU = Math.PI * 2;

  const E = RW.engine = {
    t: 0,
    mode: "title",      // title | play
    entities: [],
    player: null,
    nearPortal: null,
    view: { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 },
    cam: { x: 2450, y: 1700, z: 1, tz: 1, lookX: null, lookY: null, lookT: 0, shake: 0 },
  };

  const cv = document.getElementById("world");
  const c = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, baseZoom = 1;

  // ---------- sizing ----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    // show roughly 780 world units of height in landscape, never less than 1350 wide
    baseZoom = U.clamp(Math.max(H / 800, W / 1400), 0.45, 1.7);
    const ss = Math.min(2.5, Math.ceil(DPR * baseZoom * 4) / 4);
    if (ss !== A.spriteScale) A.spriteScale = ss;
  }
  window.addEventListener("resize", resize);
  resize();
  // E.userZoom is the kid's own pinch zoom on top of the normal view (1 = normal)
  E.userZoom = 1;
  const zoomLimits = () => [Math.min(1, Math.max(W / (WORLD.W + 220), H / (WORLD.H + 420)) / baseZoom), 1.5];
  E.setUserZoom = (m) => {
    const [lo, hi] = zoomLimits();
    E.userZoom = U.clamp(m, lo, hi);
    if (Math.abs(E.userZoom - 1) < 0.04) E.userZoom = 1;
    RW.bus.emit("zoom", E.userZoom);
  };
  E.zoomFor = (mode) => baseZoom * (mode === "title" ? 0.88 : mode === "play" ? E.userZoom : 1);
  E.screenSize = () => ({ W, H });

  // ---------- timers ----------
  const timers = [];
  E.later = (sec, fn) => { const tm = { at: E.t + sec, fn }; timers.push(tm); return tm; };
  E.wait = (sec) => new Promise((res) => E.later(sec, res));
  E.sfx = (n) => RW.sfx.play(n);

  // ---------- entities ----------
  E.add = (e) => { E.entities.push(e); if (e.solid) addSolids(e); return e; };
  E.remove = (e) => { const i = E.entities.indexOf(e); if (i >= 0) E.entities.splice(i, 1); e.dead = true; };
  E.find = (id) => E.entities.find((e) => e.id === id);

  // ---------- collision ----------
  const CELL = 200;
  const hash = new Map();
  const solids = [];
  function addSolids(e) {
    e.solid.forEach((s) => {
      const w = s.r ? { type: "r", x0: e.x + s.r[0], y0: e.y + s.r[1], x1: e.x + s.r[2], y1: e.y + s.r[3] }
        : { type: "c", x: e.x + s.c[0], y: e.y + s.c[1], r: s.c[2] };
      solids.push(w);
      const bx0 = w.type === "r" ? w.x0 : w.x - w.r, by0 = w.type === "r" ? w.y0 : w.y - w.r;
      const bx1 = w.type === "r" ? w.x1 : w.x + w.r, by1 = w.type === "r" ? w.y1 : w.y + w.r;
      for (let gy = Math.floor(by0 / CELL); gy <= Math.floor(by1 / CELL); gy++)
        for (let gx = Math.floor(bx0 / CELL); gx <= Math.floor(bx1 / CELL); gx++) {
          const k = gx + "," + gy;
          if (!hash.has(k)) hash.set(k, []);
          hash.get(k).push(w);
        }
    });
    gridDirty = true;
  }
  E.addSolid = (s) => addSolids({ x: 0, y: 0, solid: [s] });
  const onDock = (x, y) => y > 2322 && y < 2384 && x > 4150 && x < 4690;
  // Baha Mar island: walkable sand inside its shoreline (only reachable by sea plane)
  const onIsland = (x, y) => { const I = RW.layout.island; return ((x - I.x) / (I.rx - 36)) ** 2 + ((y - I.y) / (I.ry - 30)) ** 2 < 1; };
  E.onIsland = onIsland;
  E.blocked = (x, y, r = 16) => {
    if (x < WORLD.minX || y < WORLD.minY || y > WORLD.maxY) return true;
    if (x > RW.layout.shoreX(y) - 24 && !onDock(x, y) && !onIsland(x, y)) return true;
    const list = hash.get(Math.floor(x / CELL) + "," + Math.floor(y / CELL));
    if (list) for (const s of list) {
      if (s.type === "r") { if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r * 0.6 && y < s.y1 + r * 0.6) return true; }
      else if ((x - s.x) ** 2 + ((y - s.y) * 1.25) ** 2 < (s.r + r) ** 2) return true;
    }
    // neighbors (for radius overlap at cell edges)
    return nearCellBlocked(x, y, r, list);
  };
  function nearCellBlocked(x, y, r, own) {
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    const fx = x - gx * CELL, fy = y - gy * CELL;
    const cells = [];
    if (fx < r) cells.push([gx - 1, gy]); if (fx > CELL - r) cells.push([gx + 1, gy]);
    if (fy < r) cells.push([gx, gy - 1]); if (fy > CELL - r) cells.push([gx, gy + 1]);
    for (const [cx, cy] of cells) {
      const list = hash.get(cx + "," + cy);
      if (!list || list === own) continue;
      for (const s of list) {
        if (s.type === "r") { if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r * 0.6 && y < s.y1 + r * 0.6) return true; }
        else if ((x - s.x) ** 2 + ((y - s.y) * 1.25) ** 2 < (s.r + r) ** 2) return true;
      }
    }
    return false;
  }
  function moveBody(b, dx, dy, r = 16) {
    let moved = false;
    if (!E.blocked(b.x + dx, b.y, r)) { b.x += dx; moved = true; }
    if (!E.blocked(b.x, b.y + dy, r)) { b.y += dy; moved = true; }
    return moved;
  }

  // ---------- pathfinding (A* on a coarse grid) ----------
  const G = 40, GW = Math.ceil(WORLD.W / G), GH = Math.ceil(WORLD.H / G);
  let grid = null, gridDirty = true;
  function buildGrid() {
    grid = new Uint8Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = E.blocked(gx * G + G / 2, gy * G + G / 2, 18) ? 1 : 0;
    gridDirty = false;
  }
  function nearestFree(x, y) {
    if (!E.blocked(x, y)) return [x, y];
    for (let r = 20; r < 600; r += 20) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.8;
        if (!E.blocked(px, py)) return [px, py];
      }
    }
    return null;
  }
  E.nearestFree = nearestFree;
  function lineClear(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 18);
    for (let i = 1; i <= n; i++) if (E.blocked(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, 15)) return false;
    return true;
  }
  function findPath(sx, sy, tx, ty) {
    if (lineClear(sx, sy, tx, ty)) return [[tx, ty]];
    if (gridDirty || !grid) buildGrid();
    const s = Math.floor(sy / G) * GW + Math.floor(sx / G);
    let goal = Math.floor(ty / G) * GW + Math.floor(tx / G);
    if (grid[goal]) {
      // the target sits right against something solid (a gate, a fence): aim for the nearest open cell
      const gx0 = goal % GW, gy0 = Math.floor(goal / GW);
      let best = -1, bd = Infinity;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = gx0 + dx, ny = gy0 + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || grid[ny * GW + nx]) continue;
        const d = Math.hypot(nx * G + G / 2 - tx, ny * G + G / 2 - ty);
        if (d < bd) { bd = d; best = ny * GW + nx; }
      }
      if (best < 0) return [[tx, ty]];
      goal = best;
    }
    const open = [s], gScore = new Map([[s, 0]]), came = new Map(), closed = new Set();
    const hFn = (i) => Math.hypot((i % GW) - (goal % GW), Math.floor(i / GW) - Math.floor(goal / GW));
    const f = new Map([[s, hFn(s)]]);
    let iter = 0;
    while (open.length && iter++ < 12000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) {
        const cells = [cur];
        let k = cur;
        while (came.has(k)) { k = came.get(k); cells.unshift(k); }
        const pts = cells.map((i) => [(i % GW) * G + G / 2, Math.floor(i / GW) * G + G / 2]);
        pts[pts.length - 1] = [tx, ty];
        // string-pull
        const out = [];
        let ax = sx, ay = sy, i = 0;
        while (i < pts.length) {
          let j = pts.length - 1;
          while (j > i && !lineClear(ax, ay, pts[j][0], pts[j][1])) j--;
          out.push(pts[j]); [ax, ay] = pts[j]; i = j + 1;
        }
        return out;
      }
      closed.add(cur);
      const cx = cur % GW, cy = Math.floor(cur / GW);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const ni = ny * GW + nx;
        if (grid[ni] || closed.has(ni)) continue;
        if (dx && dy && (grid[cy * GW + nx] || grid[ny * GW + cx])) continue;
        const ng = gScore.get(cur) + (dx && dy ? 1.414 : 1);
        if (ng < (gScore.get(ni) ?? Infinity)) {
          came.set(ni, cur); gScore.set(ni, ng); f.set(ni, ng + hFn(ni));
          if (!open.includes(ni)) open.push(ni);
        }
      }
    }
    return [[tx, ty]];
  }

  // ---------- the player ----------
  E.makePlayer = (id, x, y) => {
    const spec = A.CHARS[id];
    const P = {
      kind: "player", id, spec, x, y, dir: 1, back: false, side: 0, move: 0, anim: 0,
      // everyone walks 1.5x their old pace; Max is always running at 2x
      speed: id === "max" ? 350 : 1.5 * (id === "jonah" ? 190 : id === "ellie" ? 160 : 175),
      gait: id === "max" ? 1.8 : 1.5, // legs cycle faster to match the speed
      pose: null, poseT: 0, poseDur: 0, lock: false, lift: 0, liftV: 0,
      path: null, target: null, onArrive: null, idleT: 0, blinkT: 2, blink: false,
      quirkT: 6, wrongT: 0, wrongDir: 0, lookT: 0, emerge: 1, prop: null, sitOn: null,
      trampCount: 0, box: [-30, -110, 30, 6],
      // Star Shop: what they're riding and wearing (saved per player)
      ride: (RW.save.shop && RW.save.shop.ride) || null, hat: (RW.save.shop && RW.save.shop.hat) || null, wheel: 0,
    };
    return P;
  };

  E.charId = () => (E.player ? E.player.id : "reuben");

  // Pose for a while. Returns a promise that resolves when it ends.
  E.act = (pose, dur, o = {}) => {
    const P = E.player;
    P.pose = pose; P.poseT = 0; P.poseDur = dur; P.lock = o.lock !== false; P.prop = o.prop || null;
    if (!o.keepPath) P.path = null;
    return new Promise((res) => { P.poseDone = res; });
  };
  function endPose(P) {
    P.pose = null; P.lock = false; P.prop = null;
    const d = P.poseDone; P.poseDone = null; if (d) d();
  }
  E.face = (x) => { const P = E.player; if (Math.abs(x - P.x) > 4) P.dir = x > P.x ? 1 : -1; P.back = false; P.side = 1; };
  E.jump = (v) => { const P = E.player; if (P.lift <= 0.5) { P.liftV = v; P.lift = 0.6; } };

  E.walkTo = (x, y, onArrive, stopDist = 8) => {
    const P = E.player;
    if (!P || P.lock) return;
    const f = nearestFree(x, y);
    if (!f) return;
    P.path = findPath(P.x, P.y, f[0], f[1]);
    P.onArrive = onArrive || null;
    P.stopDist = stopDist;
    P.replanned = false;
    P.sitOn = null;
    if (P.pose === "sit") endPose(P);
    E.marker = { x: f[0], y: f[1], t: 0 };
  };

  function updatePlayer(P, dt) {
    const input = inputVector();
    P.anim += dt * (P.ride ? 1 : 1 + P.move * (P.gait - 1));
    // blink
    P.blinkT -= dt;
    if (P.blinkT < 0) { P.blink = !P.blink; P.blinkT = P.blink ? 0.12 : U.rand(2, 4.5); }
    // emerge from a doorway
    if (P.emerge < 1) P.emerge = Math.min(1, P.emerge + dt * 1.8);
    // pose clock
    if (P.pose) { P.poseT += dt; if (P.poseDur && P.poseT >= P.poseDur) endPose(P); }
    // jump physics
    if (P.lift > 0 || P.liftV > 0) {
      P.liftV -= 1500 * dt; P.lift += P.liftV * dt;
      if (P.lift <= 0) { P.lift = 0; P.liftV = 0; if (P.onLand) { const f = P.onLand; P.onLand = null; f(); } }
    }

    let vx = 0, vy = 0;
    const rideItem = P.ride && RW.shopItem(P.ride);
    const sp = rideItem ? rideItem.speed : P.speed;
    if (input && !P.lock) {
      P.path = null; P.onArrive = null; P.target = null;
      if (P.pose === "sit" || P.pose === "look") endPose(P);
      vx = input[0] * sp; vy = input[1] * sp;
    } else if (P.path && !P.lock) {
      const [tx, ty] = P.path[0];
      const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy);
      const last = P.path.length === 1;
      if (d < (last ? P.stopDist || 8 : 14)) {
        P.path.shift();
        if (!P.path.length) {
          P.path = null;
          const cb = P.onArrive; P.onArrive = null;
          if (cb) cb();
        }
      } else { const s2 = Math.min(sp, d / Math.max(dt, 1e-3)); vx = (dx / d) * s2; vy = (dy / d) * s2; }
    }

    const moving = vx || vy;
    if (moving) {
      const before = [P.x, P.y];
      moveBody(P, vx * dt, vy * dt, 15);
      const real = Math.hypot(P.x - before[0], P.y - before[1]);
      P.wheel += real;
      P.move = U.lerp(P.move, real > 0.2 ? 1 : 0, 0.3);
      if (real < 0.1 && P.path) P.stuckT = (P.stuckT || 0) + dt; else P.stuckT = 0;
      if (P.stuckT > 0.45) {
        // wedged on a corner: skip ahead, then re-plan once, then give up
        P.stuckT = 0;
        const goal = P.path[P.path.length - 1];
        if (P.path.length > 1) P.path.shift();
        else if (!P.replanned && Math.hypot(goal[0] - P.x, goal[1] - P.y) > 40) { P.replanned = true; P.path = findPath(P.x, P.y, goal[0], goal[1]); }
        else { P.path = null; const cb = P.onArrive; P.onArrive = null; if (cb) cb(); }
      }
      if (Math.abs(vx) > 8) P.dir = vx > 0 ? 1 : -1;
      const sideT = Math.abs(vx) > Math.abs(vy) * 0.5 ? 1 : 0;
      P.side = U.lerp(P.side, sideT, 0.25);
      P.back = vy < -Math.abs(vx) * 1.2;
      P.idleT = 0;
      if (P.asleep) { P.asleep = false; E.say(P, U.pick(["Huh? I'm awake!", "I wasn't sleeping!", "Five more minutes..."]), 1.4); }
      P.stillT = 0;
      P.stepT = (P.stepT || 0) - dt;
      if (P.ride) { if (P.stepT < 0) { P.stepT = 0.09; E.burst(P.x - P.dir * 44, P.y, 0, "dust", 1); } }
      else if (P.id === "max") { if (P.stepT < 0) { P.stepT = 0.12; E.burst(P.x - P.dir * 14, P.y, 0, "dust", 1); } }
      else if (P.stepT < 0) { P.stepT = 0.32; if (U.chance(0.35)) E.burst(P.x, P.y, 0, "dust", 1); }
    } else {
      P.move = U.lerp(P.move, 0, 0.3);
      if (!P.pose) { P.side = U.lerp(P.side, 0, 0.1); P.back = false; }
      P.idleT += dt;
      P.stillT = (P.stillT || 0) + dt;
      // Easter egg: leave them standing long enough and they doze off
      if (P.stillT > 25 && !P.asleep && !P.lock && E.mode === "play") {
        P.asleep = true; P.zT = 0;
        E.say(P, "Zzz...", 2); E.secret("snooze", `${P.spec.name} fell asleep standing up!`);
      }
      if (P.asleep) { P.zT -= dt; if (P.zT < 0) { P.zT = 1.1; E.float(P.x + 26, P.y - 120, "z", { size: 22, stroke: "#6C4AC9" }); } }
      else if (P.idleT > 7 && !P.pose && E.mode === "play") { P.idleT = 0; idleFidget(P); }
    }

    // pick up hidden stars and items
    for (const e of E.entities) {
      if ((e.kind === "star" || e.kind === "item") && !e.taken) {
        const d = Math.hypot(e.x - P.x, (e.y - P.y) * 1.3);
        if (d < 120) e.magnet = true;
        if (d < 34) e.collect();
      }
    }
    // portals
    let near = null, best = 1e9;
    for (const d of RW.world.DESTINATIONS) {
      if (!d.portal) continue;
      const dd = Math.hypot(P.x - d.portal[0], (P.y - d.portal[1]) * 1.2);
      if (dd < (d.portalR || 110) && dd < best) { best = dd; near = d; }
    }
    if (near !== E.nearPortal) { E.nearPortal = near; RW.bus.emit("portal", near); }
  }

  function idleFidget(P) {
    const id = P.id;
    if (id === "reuben") { E.act("fist", 1.2, { lock: false }); E.say(P, U.pick(["Let's play!", "Batter up!", "Where's the next star?"]), 1.6); }
    else if (id === "jonah") { E.act("jump", 0.5, { lock: false }); E.jump(360); E.later(0.6, () => { E.act("jump", 0.5, { lock: false }); E.jump(360); }); E.say(P, U.pick(["GOOOAL!", "I'm so fast!", "Let's go!"]), 1.5); }
    else if (id === "max") { E.act("spoon", 1.4, { lock: false }); E.jump(300); E.say(P, U.pick(["Hehehe!", "Can't catch me!", "I have a spoon!", "Is it cookie time?"]), 1.5); }
    else { E.act("wave", 1.4, { lock: false }); E.say(P, U.pick(["Hi!", "Hehe!", "Where Max?", "Up! Up!"]), 1.5); }
  }

  // ---------- input ----------
  const ptr = { id: null, sx: 0, sy: 0, x: 0, y: 0, t0: 0, drag: false };
  const keys = new Set();
  function inputVector() {
    let kx = 0, ky = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) kx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) kx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) ky -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) ky += 1;
    if (kx || ky) { const l = Math.hypot(kx, ky); return [kx / l, ky / l]; }
    if (ptr.id != null && ptr.drag) {
      const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy, l = Math.hypot(dx, dy);
      if (l < 6) return null;
      const m = U.clamp(l / 55, 0.45, 1);
      return [(dx / l) * m, (dy / l) * m];
    }
    return null;
  }
  // two fingers = pinch to zoom in and out
  const touches = new Map();
  let pinch = null;
  const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)); };
  cv.addEventListener("pointerdown", (ev) => {
    RW.sfx.unlock();
    if (E.mode === "title") { RW.bus.emit("titleTap"); return; }
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touches.size >= 2 && E.mode === "play") {
      // second finger down: stop walking, start pinching
      if (touches.size === 2) pinch = { d0: pinchDist(), z0: E.userZoom };
      ptr.id = null; ptr.drag = false;
      try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      return;
    }
    if (pinch) return;
    if (ptr.id != null) return;
    ptr.id = ev.pointerId; ptr.sx = ptr.x = ev.clientX; ptr.sy = ptr.y = ev.clientY; ptr.t0 = performance.now(); ptr.drag = false;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  });
  cv.addEventListener("pointermove", (ev) => {
    const tch = touches.get(ev.pointerId);
    if (tch) { tch.x = ev.clientX; tch.y = ev.clientY; }
    if (pinch && touches.size >= 2) { E.setUserZoom(pinch.z0 * pinchDist() / pinch.d0); return; }
    if (ev.pointerId !== ptr.id) return;
    ptr.x = ev.clientX; ptr.y = ev.clientY;
    const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy, l = Math.hypot(dx, dy);
    if (!ptr.drag && l > 14) ptr.drag = true;
    // the joystick base follows the finger so direction changes feel instant
    if (l > 70) { ptr.sx = ptr.x - (dx / l) * 70; ptr.sy = ptr.y - (dy / l) * 70; }
  });
  const endPtr = (ev) => {
    touches.delete(ev.pointerId);
    // stay in pinch mode until every finger is up, so the last finger doesn't start walking
    if (pinch) { if (!touches.size) pinch = null; else if (touches.size >= 2) pinch = { d0: pinchDist(), z0: E.userZoom }; return; }
    if (ev.pointerId !== ptr.id) return;
    if (!ptr.drag && E.mode === "play") handleTap(ptr.x, ptr.y);
    ptr.id = null; ptr.drag = false;
  };
  cv.addEventListener("pointerup", endPtr);
  cv.addEventListener("pointercancel", (ev) => { touches.delete(ev.pointerId); if (!touches.size) pinch = null; if (ev.pointerId === ptr.id) { ptr.id = null; ptr.drag = false; } });
  // mouse wheel / trackpad pinch on a computer
  cv.addEventListener("wheel", (ev) => {
    if (E.mode !== "play") return;
    ev.preventDefault();
    E.setUserZoom(E.userZoom * Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0015)));
  }, { passive: false });
  // stop iPad Safari from zooming the whole page instead
  for (const g of ["gesturestart", "gesturechange"]) document.addEventListener(g, (ev) => ev.preventDefault(), { passive: false });
  window.addEventListener("keydown", (ev) => {
    if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (E.mode === "title" && (k === "Enter" || k === " ")) { RW.bus.emit("titleTap"); return; }
    if (E.mode !== "play") return;
    if (/^Arrow/.test(k) || "wasd".includes(k)) { keys.add(k); ev.preventDefault(); }
    if (k === " " || k === "Enter") { ev.preventDefault(); interactNearest(); }
  });
  window.addEventListener("keyup", (ev) => { const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; keys.delete(k); });
  window.addEventListener("blur", () => keys.clear());

  E.screenToWorld = (sx, sy) => [E.view.x0 + sx / E.cam.z, E.view.y0 + sy / E.cam.z];
  E.worldToScreen = (x, y) => [(x - E.view.x0) * E.cam.z, (y - E.view.y0) * E.cam.z];

  function hitTest(wx, wy) {
    let hit = null, bestY = -1e9;
    for (const e of E.entities) {
      if (!e.tap || e.dead || e.hidden) continue;
      const b = e.hit || e.box;
      if (!b) continue;
      let x0 = e.x + b[0], y0 = e.y + b[1], x1 = e.x + b[2], y1 = e.y + b[3];
      // a tap right inside a target beats one that only lands in another's forgiving margin
      const inside = wx > x0 && wx < x1 && wy > y0 && wy < y1;
      // forgiving: every target is at least 76 units square
      const pad = 12, minS = 76;
      if (x1 - x0 < minS) { const cx = (x0 + x1) / 2; x0 = cx - minS / 2; x1 = cx + minS / 2; }
      if (y1 - y0 < minS) { const cy = (y0 + y1) / 2; y0 = cy - minS / 2; y1 = cy + minS / 2; }
      if (wx > x0 - pad && wx < x1 + pad && wy > y0 - pad && wy < y1 + pad) {
        const sy = (e.sortY != null ? e.sortY : e.y) + (e.tapPriority || 0) + (inside ? 100 : 0);
        if (sy > bestY) { bestY = sy; hit = e; }
      }
    }
    return hit;
  }

  function handleTap(sx, sy) {
    const [wx, wy] = E.screenToWorld(sx, sy);
    const P = E.player;
    if (!P || P.lock) return;
    const e = hitTest(wx, wy);
    if (e) { useEntity(e); return; }
    // tapping Baha Mar from the mainland (or the mainland from Baha Mar) takes the sea plane
    const onI = E.onIsland(P.x, P.y);
    if (!onI && E.onIsland(wx, wy)) { RW.world.flyTo("bahamar"); return; }
    if (onI && wx < RW.layout.shoreX(wy) - 30) { RW.world.flyTo("mainland"); return; }
    E.walkTo(wx, wy);
    RW.sfx.play("tap");
  }

  function useEntity(e) {
    const P = E.player, tap = e.tap;
    if (tap.reach === "remote") { if (!P.lock) E.face(e.x); tap.act(E, e); return; }
    const at = tap.at ? [e.x + tap.at[0], e.y + tap.at[1]] : [e.x, e.y + 40];
    const range = tap.range || 60;
    const go = () => {
      if (e.dead) return;
      if (!tap.noFace) E.face(e.x + (tap.faceDx || 0));
      tap.act(E, e);
    };
    if (Math.hypot(P.x - at[0], P.y - at[1]) < range * 0.6) { go(); return; }
    E.walkTo(at[0], at[1], () => { if (Math.hypot(P.x - at[0], P.y - at[1]) < range + 40) go(); }, 6);
    RW.sfx.play("tap");
  }
  E.useEntity = useEntity;

  function interactNearest() {
    const P = E.player;
    if (E.nearPortal) { RW.bus.emit("portalEnter", E.nearPortal); return; }
    let best = null, bd = 130;
    for (const e of E.entities) {
      if (!e.tap || e.dead || e.hidden) continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) useEntity(best);
  }

  // ---------- effects ----------
  const parts = [];
  const texts = [];
  const bubbles = [];
  const flyers = [];
  E.flyers = flyers;
  const PART = {
    sparkle: { col: ["#FFF6B0", "#FFFFFF", "#FFD23F"], g: 0, life: 0.7, size: 5 },
    star: { col: ["#FFD23F", "#FFE98A", "#FFB300"], g: 380, life: 0.9, size: 7 },
    puff: { col: ["#FFFFFF", "#F1F1F4"], g: -30, life: 0.9, size: 14 },
    smoke: { col: ["#C9CCD6", "#B3B7C4", "#DADDE5"], g: -60, life: 1.6, size: 12 },
    fart: { col: ["#C9F07A", "#A6E05A", "#E4F7B0"], g: -20, life: 1.3, size: 16 },
    splash: { col: ["#9BDCFF", "#CFF0FF", "#6EC6F5"], g: 700, life: 0.8, size: 4 },
    leaf: { col: ["#5DBB63", "#8FD978", "#3E9A4C"], g: 120, life: 1.4, size: 5 },
    heart: { col: ["#FF6B8B", "#FF8FB1"], g: -40, life: 1.2, size: 7 },
    letter: { col: ["#FFFFFF"], g: 300, life: 1.4, size: 9 },
    dust: { col: ["rgba(200,170,120,.5)"], g: -10, life: 0.5, size: 6 },
    confetti: { col: ["#FF5C8A", "#FFD23F", "#2EB872", "#2F6BFF", "#9B5DE5"], g: 360, life: 1.8, size: 5 },
    smell: { col: ["rgba(255,210,140,.8)"], g: -26, life: 2.4, size: 8 },
    note: { col: ["#9B5DE5", "#2F6BFF"], g: -40, life: 1.4, size: 9 },
  };
  E.burst = (x, y, z, kind, n = 10, o = {}) => {
    const K = PART[kind];
    if (!K || RW.reducedMotion && n > 4) n = Math.min(n, 4);
    for (let i = 0; i < n && parts.length < 320; i++) {
      const a = o.dir != null ? o.dir + U.rand(-0.5, 0.5) : U.rand(0, TAU);
      const sp = U.rand(o.spMin || 30, o.sp || 160);
      parts.push({
        x: x + U.rand(-4, 4), y, z: z + U.rand(0, 6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.35, vz: o.up != null ? U.rand(o.up * 0.6, o.up) : U.rand(40, 220),
        life: K.life * U.rand(0.7, 1.2), max: 0, kind, col: U.pick(K.col), size: K.size * U.rand(0.7, 1.3) * (o.scale || 1),
        rot: U.rand(0, TAU), vr: U.rand(-6, 6), g: K.g,
      });
      parts[parts.length - 1].max = parts[parts.length - 1].life;
    }
  };
  E.float = (x, y, str, o = {}) => texts.push({ x, y, str, t: 0, life: o.life || 1.3, col: o.col || "#FFFFFF", size: o.size || 30, stroke: o.stroke || "#E0662A" });
  E.say = (who, str, dur = 2.2) => {
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].who === who) bubbles.splice(i, 1);
    bubbles.push({ who, str, t: 0, life: dur });
  };
  E.toast = (str, icon) => RW.bus.emit("toast", { text: str, icon });
  E.shake = (a) => { E.cam.shake = Math.max(E.cam.shake, a); };
  E.lookAt = (x, y, dur) => { E.cam.lookX = x; E.cam.lookY = y; E.cam.lookT = dur; };

  // Secrets: first discovery is worth a star.
  E.secret = (id, msg) => {
    if (RW.save.secrets[id]) return false;
    RW.save.secrets[id] = Date.now();
    RW.persist();
    E.later(0.6, () => {
      E.toast(msg || "Secret found!", "🤫");
      const P = E.player;
      if (P) { E.float(P.x, P.y - 130, "+1 ⭐", { col: "#FFE25C" }); RW.addStars(1, "secret"); flyStarFrom(P.x, P.y - 120, 1); }
      RW.sfx.play("magic");
    });
    return true;
  };
  function flyStarFrom(x, y, n) {
    const [sx, sy] = E.worldToScreen(x, y);
    RW.bus.emit("starFly", { sx, sy, n });
  }
  E.flyStarFrom = flyStarFrom;

  // ---------- balls ----------
  // A ball with simple bouncy physics. `script` flies it along an arc to a target first.
  E.spawnBall = (o) => {
    const b = Object.assign({
      kind: "ball", ball: "soccer", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 11, spin: 0,
      bounce: 0.55, friction: 1.4, box: [-14, -30, 14, 4], held: null, rest: true, owner: null,
    }, o);
    b.draw = drawBall;
    b.update = updateBall;
    return E.add(b);
  };
  function updateBall(b, dt) {
    if (b.held) { b.x = b.held.x + (b.held.dir || 1) * 44; b.y = b.held.y + 1; b.z = 50; return; }
    if (b.script) {
      const s = b.script; s.t += dt;
      const u = Math.min(1, s.t / s.dur);
      b.x = U.lerp(s.x0, s.x1, u); b.y = U.lerp(s.y0, s.y1, u);
      b.z = U.lerp(s.z0, s.z1, u) + Math.sin(u * Math.PI) * s.apex;
      b.spin += dt * 10;
      if (u >= 1) { b.script = null; if (s.done) s.done(b); }
      return;
    }
    if (b.rest && !b.vx && !b.vy && !b.vz && b.z <= 0) return;
    b.rest = false;
    b.vz -= 900 * dt;
    b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (Math.abs(b.vz) > 90) { b.vz = -b.vz * b.bounce; if (b.onBounce) b.onBounce(b); else if (Math.abs(b.vz) > 120) RW.sfx.play("bounce"); }
      else b.vz = 0;
      const fr = Math.max(0, 1 - b.friction * dt);
      b.vx *= fr; b.vy *= fr;
    }
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (E.blocked(nx, b.y, 8)) b.vx = -b.vx * 0.6; else b.x = nx;
    if (E.blocked(b.x, ny, 8)) b.vy = -b.vy * 0.6; else b.y = ny;
    b.spin += (Math.abs(b.vx) + Math.abs(b.vy)) * dt * 0.05 * (b.vx < 0 ? -1 : 1);
    if (Math.hypot(b.vx, b.vy) < 8 && b.z <= 0 && Math.abs(b.vz) < 1) { b.vx = b.vy = 0; b.rest = true; if (b.onRest) b.onRest(b); }
    if (b.onMove) b.onMove(b);
  }
  function drawBall(c2, E2, b) {
    if (b.held) return;
    A.shadow(c2, 0, 0, b.r * 1.2 * Math.max(0.4, 1 - b.z / 400), b.r * 0.45, 0.25);
    c2.save(); c2.translate(0, -b.z);
    if (b.ball === "soccer" || b.ball === "beach") {
      if (b.ball === "beach") {
        const r = b.r;
        c2.save(); c2.translate(0, -r); c2.rotate(b.spin);
        ["#FF5C8A", "#FFD23F", "#2F9BFF", "#FFFFFF", "#2EB872", "#FFFFFF"].forEach((col, i) => { c2.fillStyle = col; c2.beginPath(); c2.moveTo(0, 0); c2.arc(0, 0, r, (i / 6) * TAU, ((i + 1) / 6) * TAU); c2.closePath(); c2.fill(); });
        c2.fillStyle = "rgba(255,255,255,.35)"; c2.beginPath(); c2.arc(-r * 0.3, -r * 0.35, r * 0.35, 0, TAU); c2.fill();
        c2.restore();
      } else A.prop.soccerBall(c2, b.r, b.spin);
    } else if (b.ball === "basketball") { c2.translate(0, -b.r); c2.rotate(b.spin); A.prop.basketball(c2, b.r); }
    else { c2.translate(0, -b.r); c2.rotate(b.spin); A.prop.baseball(c2, b.r); }
    c2.restore();
  }

  // ---------- fart man flyby ----------
  E.flyFartMan = (o = {}) => {
    const v = E.view;
    const f = {
      t: 0, dur: o.dur || 3.6,
      x0: v.x0 - 200, x1: v.x1 + 200, y0: v.y0 + v.h * (o.y || 0.26), y1: v.y0 + v.h * ((o.y || 0.26) - 0.1),
      puffT: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / this.dur;
        this.x = U.lerp(this.x0, this.x1, u); this.y = U.lerp(this.y0, this.y1, u) + Math.sin(u * 9) * 14;
        this.puffT -= dt;
        if (this.puffT < 0) { this.puffT = 0.08; E.burst(this.x - 60, this.y + 8, 0, "fart", 1, { sp: 20, up: 10 }); }
        return u < 1;
      },
      draw(c2) { c2.save(); c2.translate(this.x, this.y); A.drawFartMan(c2, E.t, 1.15); c2.restore(); },
    };
    RW.sfx.play("fart");
    E.later(1.2, () => RW.sfx.play("fart"));
    flyers.push(f);
    return f;
  };

  E.flyBaseball = (x0, y0, x1, y1, dur = 2.2, height = 500) => {
    const f = {
      t: 0, update(dt) { this.t += dt; const u = this.t / dur; this.x = U.lerp(x0, x1, u); this.y = U.lerp(y0, y1, u) - Math.sin(u * Math.PI) * height; this.gy = U.lerp(y0, y1, u); return u < 1; },
      draw(c2) { c2.save(); c2.translate(this.x, this.y); c2.rotate(this.t * 12); A.prop.baseball(c2, 9); c2.restore(); },
    };
    flyers.push(f);
    return f;
  };

  // birds taking off from a tree
  E.spawnBird = (x, y) => {
    const dir = U.chance(0.5) ? 1 : -1, col = U.pick(["#4C6FE0", "#E8453C", "#F2A93B", "#8A5CE0"]);
    flyers.push({
      t: 0, x, y, update(dt) { this.t += dt; this.x += dir * 220 * dt; this.y -= (120 + this.t * 80) * dt; return this.t < 4; },
      draw(c2) { c2.save(); c2.translate(this.x, this.y); c2.scale(dir, 1); A.drawBird(c2, E.t + x, col); c2.restore(); },
    });
    RW.sfx.play("chirp");
  };

  // ---------- telescope view ----------
  E.scope = { on: false, t: 0 };
  E.openScope = () => { E.scope.on = true; E.scope.t = 0; };

  // ---------- update ----------
  function update(dt) {
    E.t += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= E.t) { const tm = timers.splice(i, 1)[0]; tm.fn(); }
    if (E.player && E.mode === "play") updatePlayer(E.player, dt);
    for (let i = 0; i < E.entities.length; i++) { const e = E.entities[i]; if (e.update) e.update(e, dt, E); }
    for (let i = E.entities.length - 1; i >= 0; i--) if (E.entities[i].dead) E.entities.splice(i, 1);
    for (let i = flyers.length - 1; i >= 0; i--) if (!flyers[i].update(dt)) flyers.splice(i, 1);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vz -= p.g * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.z < 0 && p.g > 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
    }
    for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > texts[i].life) texts.splice(i, 1); }
    for (let i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t += dt; if (bubbles[i].t > bubbles[i].life || bubbles[i].who.dead) bubbles.splice(i, 1); }
    if (E.marker) { E.marker.t += dt; if (E.marker.t > 0.8) E.marker = null; }
    if (E.scope.on) { E.scope.t += dt; if (E.scope.t > 4.2) E.scope.on = false; }
    if (RW.world.update) RW.world.update(dt, E);
    updateCamera(dt);
  }

  function updateCamera(dt) {
    const cam = E.cam;
    cam.tz = E.zoomFor(E.mode);
    cam.z = pinch ? cam.tz : U.lerp(cam.z, cam.tz, Math.min(1, dt * (E.mode === "play" && E.userZoom !== 1 ? 10 : 2.5)));
    let tx = cam.x, ty = cam.y;
    if (E.mode === "play" && E.player) {
      const P = E.player;
      tx = P.x; ty = P.y - 60 - (P.lift > 250 ? P.lift * 0.85 : P.lift * 0.4);
    } else if (E.titleCam) { tx = E.titleCam[0]; ty = E.titleCam[1]; }
    if (cam.lookT > 0) { cam.lookT -= dt; tx = cam.lookX; ty = cam.lookY; }
    if (E.camTarget) { tx = E.camTarget.x; ty = E.camTarget.y; } // e.g. following the sea plane
    const k = E.snapCam ? 1 : Math.min(1, dt * (cam.lookT > 0 ? 2.2 : 4.5));
    E.snapCam = false;
    cam.x = U.lerp(cam.x, tx, k); cam.y = U.lerp(cam.y, ty, k);
    const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
    cam.x = U.clamp(cam.x, -160 + hw, WORLD.W + 60 - hw);
    cam.y = U.clamp(cam.y, -420 + hh, WORLD.H - hh);
    if (hw * 2 > WORLD.W + 220) cam.x = WORLD.W / 2;
    if (hh * 2 > WORLD.H + 420) cam.y = (WORLD.H - 420) / 2;
    cam.shake = Math.max(0, cam.shake - dt * 30);
  }

  // ---------- render ----------
  function render() {
    const cam = E.cam, z = cam.z;
    const sh = cam.shake ? [U.rand(-cam.shake, cam.shake), U.rand(-cam.shake, cam.shake)] : [0, 0];
    const v = E.view;
    v.w = W / z; v.h = H / z;
    v.x0 = cam.x - v.w / 2 + sh[0]; v.y0 = cam.y - v.h / 2 + sh[1]; v.x1 = v.x0 + v.w; v.y1 = v.y0 + v.h;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#8CD06A";
    c.fillRect(0, 0, cv.width, cv.height);
    c.setTransform(DPR * z, 0, 0, DPR * z, -v.x0 * DPR * z, -v.y0 * DPR * z);

    // ground (cached)
    const gy0 = Math.max(v.y0, 300);
    // zoomed far out, the ground uses lower-detail chunks (a whole world of full-size chunks is too big)
    const zr = z / baseZoom, gScale = zr < 0.35 ? A.spriteScale / 4 : zr < 0.7 ? A.spriteScale / 2 : A.spriteScale;
    RW.layout.drawGround(c, v.x0, gy0, v.x1, v.y1, gScale, E.mode === "title" ? 1 : zr < 0.7 ? 6 : 3);
    // sky + distant scenery above the northern tree line
    if (v.y0 < 420 && RW.world.drawBackdrop) {
      c.save(); c.beginPath(); c.rect(v.x0, v.y0 - 10, v.w, 392 - v.y0); c.clip();
      RW.world.drawBackdrop(c, E, v);
      c.restore();
      // soften the seam where the scenery meets the lawn
      c.fillStyle = A.lin(c, 0, 350, 0, 400, ["rgba(140,208,106,0)", "rgba(140,208,106,.85)"]);
      c.fillRect(v.x0, 350, v.w, 50);
    }
    RW.layout.drawWaterLive(c, E.t, v.x0, v.y0, v.x1, v.y1);
    if (RW.world.drawGroundLive) RW.world.drawGroundLive(c, E, v);

    // gather visible
    const vis = [], ground = [];
    const P = E.player;
    for (const e of E.entities) {
      if (e.hidden) continue;
      const b = e.box || [-60, -120, 60, 10];
      if (e.x + b[2] < v.x0 - 20 || e.x + b[0] > v.x1 + 20 || e.y + b[3] < v.y0 - 20 || e.y + b[1] > v.y1 + 20) continue;
      (e.layer === "ground" ? ground : vis).push(e);
    }
    ground.sort((a, b) => a.y - b.y);
    ground.forEach((e) => drawEntity(e));
    if (P && E.mode === "play") vis.push(P);
    // shadows first so they sit under everything
    for (const e of vis) if (e.shadow) { A.shadow(c, e.x + (e.shadow[2] || 0), e.y + (e.shadow[3] || 0), e.shadow[0], e.shadow[1], e.shadow[4] || 0.22); }
    vis.sort((a, b) => (a.sortY != null ? a.sortY : a.y) - (b.sortY != null ? b.sortY : b.y));
    let occluded = false;
    let afterPlayer = false;
    for (const e of vis) {
      if (e === P) { drawPlayer(P); afterPlayer = true; continue; }
      drawEntity(e);
      if (afterPlayer && P && e.occludes && !occluded) {
        const b = e.box;
        if (P.x > e.x + b[0] + 10 && P.x < e.x + b[2] - 10 && P.y - 60 > e.y + b[1] && P.y < e.y + 4) occluded = true;
      }
    }
    // see-through silhouette when behind a building
    if (occluded) { c.save(); c.globalAlpha = 0.45; drawPlayer(P, true); c.restore(); }

    // particles
    for (const p of parts) {
      const a = Math.min(1, p.life / p.max * 1.6);
      c.globalAlpha = a;
      const x = p.x, y = p.y - p.z;
      if (p.kind === "puff" || p.kind === "smoke" || p.kind === "fart" || p.kind === "dust" || p.kind === "smell") {
        const s = p.size * (1.6 - p.life / p.max * 0.8);
        c.fillStyle = p.col; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
        if (p.kind === "smell") { c.strokeStyle = p.col; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 6, y + 10); c.quadraticCurveTo(x + 6, y, x - 6, y - 10); c.stroke(); }
      } else if (p.kind === "heart") {
        c.fillStyle = p.col; c.save(); c.translate(x, y); c.scale(p.size / 7, p.size / 7);
        c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(-8, -3, -4, -9, 0, -5); c.bezierCurveTo(4, -9, 8, -3, 0, 3); c.fill(); c.restore();
      } else if (p.kind === "letter") {
        c.save(); c.translate(x, y); c.rotate(p.rot * 0.3);
        c.fillStyle = "#FFFFFF"; A.rr(c, -9, -6, 18, 12, 2); c.fill();
        c.strokeStyle = "#D9534F"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, -6); c.lineTo(0, 1); c.lineTo(9, -6); c.stroke(); c.restore();
      } else if (p.kind === "star" || p.kind === "sparkle") {
        c.fillStyle = p.col; A.starPath(c, x, y, p.size, 4, 0.4, p.rot); c.fill();
      } else if (p.kind === "note") {
        A.text(c, "♪", x, y, p.size * 2.2, p.col);
      } else {
        c.fillStyle = p.col; c.save(); c.translate(x, y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore();
      }
    }
    c.globalAlpha = 1;
    for (const f of flyers) f.draw(c);

    // floating texts
    for (const t of texts) {
      const u = t.t / t.life;
      c.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      const s = t.size * (u < 0.15 ? U.easeOutBack(u / 0.15) : 1);
      A.text(c, t.str, t.x, t.y - u * 60, s, t.col, { weight: 700, stroke: t.stroke, strokeW: s * 0.24 });
    }
    c.globalAlpha = 1;
    // speech bubbles
    for (const b of bubbles) drawBubble(b);
    // tap marker
    if (E.marker) {
      const m = E.marker, u = m.t / 0.8;
      c.strokeStyle = `rgba(255,255,255,${1 - u})`; c.lineWidth = 4;
      A.ell(c, m.x, m.y, 14 + u * 22, (14 + u * 22) * 0.5); c.stroke();
    }

    // screen space: cloud light, vignette, joystick, telescope
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawVignette();
    if (E.mode === "play" && zr < 0.8) drawZoomedOut(v, z, Math.min(1, (0.8 - zr) / 0.2));
    if (ptr.id != null && ptr.drag && E.mode === "play") {
      c.fillStyle = "rgba(255,255,255,.18)"; c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 3;
      c.beginPath(); c.arc(ptr.sx, ptr.sy, 46, 0, TAU); c.fill(); c.stroke();
      const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy, l = Math.min(46, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(ptr.sx + Math.cos(a) * l, ptr.sy + Math.sin(a) * l, 22, 0, TAU); c.fill();
    }
    if (E.scope.on) drawScope();
  }

  // Zoomed out: big place names, and a bouncing YOU arrow over the player so you can find yourself.
  function drawZoomedOut(v, z, a) {
    c.save();
    c.globalAlpha = a;
    const labels = RW.world.mapLabels ? RW.world.mapLabels() : [];
    const fs = U.clamp(13 + z * 14, 13, 19);
    c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`;
    for (const l of labels) {
      const sx = (l.x - v.x0) * z, sy = (l.y - v.y0) * z;
      if (sx < -100 || sx > W + 100 || sy < -40 || sy > H + 40) continue;
      const str = l.icon + " " + l.name, w = c.measureText(str).width + 18, h = fs + 12;
      c.fillStyle = l.color; A.rr(c, sx - w / 2, sy - h / 2, w, h, h / 2); c.fill();
      c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2; c.stroke();
      c.fillStyle = "#FFFFFF"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(str, sx, sy + 1);
    }
    const P = E.player;
    if (P) {
      const sx = (P.x - v.x0) * z, sy = (P.y - 40 - P.lift - v.y0) * z;
      const pulse = (E.t * 1.4) % 1;
      c.strokeStyle = `rgba(255,226,92,${1 - pulse})`; c.lineWidth = 4;
      c.beginPath(); c.arc(sx, sy + 30 * z, 14 + pulse * 30, 0, TAU); c.stroke();
      const bob = Math.sin(E.t * 5) * 5, ty = sy - 60 * z - 18 + bob;
      c.fillStyle = "#FFE25C"; c.strokeStyle = "#E0662A"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(sx, ty + 14); c.lineTo(sx - 13, ty - 2); c.lineTo(sx - 6, ty - 2); c.lineTo(sx - 6, ty - 16); c.lineTo(sx + 6, ty - 16); c.lineTo(sx + 6, ty - 2); c.lineTo(sx + 13, ty - 2); c.closePath(); c.fill(); c.stroke();
      c.font = "700 16px Fredoka, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 4; c.strokeStyle = "#E0662A"; c.strokeText("YOU", sx, ty - 28); c.fillStyle = "#FFFFFF"; c.fillText("YOU", sx, ty - 28);
    }
    c.restore();
  }

  let vignette = null, vigKey = "";
  function drawVignette() {
    const key = W + "x" + H;
    if (key !== vigKey) {
      vigKey = key;
      vignette = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
      vignette.addColorStop(0, "rgba(255,240,200,0)");
      vignette.addColorStop(1, "rgba(30,40,80,.28)");
    }
    c.fillStyle = vignette; c.fillRect(0, 0, W, H);
  }

  function drawEntity(e) {
    if (e.sprite) {
      const b = e.box;
      const key = "ent:" + e.id + (e.spriteKey ? ":" + e.spriteKey() : "");
      const sp = A.sprite(key, b[2] - b[0], b[3] - b[1], -b[0], -b[1], (cx) => e.draw(cx, E, e));
      A.blit(c, sp, e.x, e.y);
      if (e.live) { c.save(); c.translate(e.x, e.y); e.live(c, E, e); c.restore(); }
    } else {
      c.save(); c.translate(e.x, e.y); e.draw(c, E, e); c.restore();
    }
  }

  function drawPlayer(P, ghost) {
    if (P.hidden) return;
    c.save();
    c.translate(P.x, P.y);
    if (!ghost) A.shadow(c, 0, 0, 24 * Math.max(0.4, 1 - P.lift / 500), 9, 0.26);
    const em = U.easeOutBack(P.emerge);
    if (P.emerge < 1) { c.globalAlpha = Math.min(1, P.emerge * 2); c.scale(em, em); }
    c.translate(0, -P.lift);
    if (P.id === "ellie" && P.lift > 300) c.rotate(Math.sin(E.t * 8) * 0.3);
    const R = P.ride && A.RIDES[P.ride];
    if (R && !P.pose) {
      // riding: the vehicle, the rider on top, then the handlebars over their hands
      const spin = P.wheel / 14, bump = P.move > 0.5 ? Math.abs(Math.sin(P.wheel / 9)) * 1.5 : 0;
      c.save(); c.scale(P.dir, 1); A.drawRide(c, P.ride, spin, "back"); c.restore();
      c.save();
      c.translate(0, -R.seat - bump + (R.stand ? 0 : P.spec.L * 0.45));
      A.drawChar(c, P.spec, { t: P.anim, move: 0, side: 1, dir: P.dir, back: false, pose: R.stand ? null : "sit", pt: 0, blink: P.blink, prop: P.prop, hat: P.hat });
      c.restore();
      c.save(); c.scale(P.dir, 1); A.drawRide(c, P.ride, spin, "front"); c.restore();
    } else {
      A.drawChar(c, P.spec, {
        t: P.anim, move: P.move, side: P.side, dir: P.dir, back: P.back && !P.pose,
        pose: P.pose || (P.id === "max" && P.move > 0.5 ? "spoon" : null), pt: P.poseDur ? P.poseT / P.poseDur : P.poseT, blink: P.blink, prop: P.prop, hat: P.hat,
      });
    }
    c.restore();
  }

  function drawBubble(b) {
    const who = b.who;
    const h = who.bubbleH || (who.spec ? (who.spec.L + who.spec.T + who.spec.R * 2 + 18) : 100);
    const x = who.x, y = who.y - h - (who.lift || 0);
    const u = b.t / b.life;
    const s = b.t < 0.18 ? U.easeOutBack(b.t / 0.18) : u > 0.9 ? (1 - u) / 0.1 : 1;
    c.save();
    c.translate(x, y); c.scale(s, s);
    // shrink the text a little for long lines so it always fits inside the bubble
    let fsz = 19;
    c.font = `700 ${fsz}px ${A.FONT}`;
    const tw = c.measureText(b.str).width;
    if (tw > 340) { fsz = Math.max(13, Math.floor(19 * 340 / tw)); c.font = `700 ${fsz}px ${A.FONT}`; }
    const w = c.measureText(b.str).width + 32, bh = 38;
    c.fillStyle = "rgba(20,30,60,.18)"; A.rr(c, -w / 2 + 2, -bh + 4, w, bh, 19); c.fill();
    c.fillStyle = "#FFFFFF"; A.rr(c, -w / 2, -bh, w, bh, 19); c.fill();
    c.beginPath(); c.moveTo(-8, -2); c.lineTo(0, 10); c.lineTo(8, -2); c.closePath(); c.fill();
    A.text(c, b.str, 0, -bh / 2 + 1, fsz, "#2B2F55", { weight: 700 });
    c.restore();
  }

  function drawScope() {
    const u = E.scope.t, a = Math.min(1, u * 3, (4.2 - u) * 3);
    c.save();
    c.globalAlpha = a;
    const r = Math.min(W, H) * 0.36, cx = W / 2, cy = H / 2;
    c.fillStyle = "#050815";
    c.beginPath(); c.rect(0, 0, W, H); c.arc(cx, cy, r, 0, TAU, true); c.fill();
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
    c.fillStyle = A.rad(c, cx, cy, 10, cx, cy, r, ["#1A2458", "#0B1030"]); c.fillRect(cx - r, cy - r, r * 2, r * 2);
    const rnd = U.seeded(9);
    c.fillStyle = "#FFFFFF";
    for (let i = 0; i < 60; i++) { c.globalAlpha = a * (0.4 + rnd() * 0.6); c.beginPath(); c.arc(cx - r + rnd() * r * 2, cy - r + rnd() * r * 2, rnd() * 1.8, 0, TAU); c.fill(); }
    c.globalAlpha = a;
    const mr = r * 0.55, mx = cx + Math.sin(u * 0.5) * 10, my = cy + Math.cos(u * 0.4) * 6;
    c.fillStyle = A.rad(c, mx - mr * 0.3, my - mr * 0.3, 5, mx, my, mr, ["#FFFDF0", "#E8E3CF", "#B9B39C"]);
    c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.14], [0.05, 0.4, 0.1], [-0.45, 0.25, 0.08], [0.4, -0.35, 0.09]].forEach(([dx, dy, rr2]) => {
      c.fillStyle = "rgba(150,140,110,.45)"; c.beginPath(); c.arc(mx + dx * mr, my + dy * mr, rr2 * mr, 0, TAU); c.fill();
    });
    // a tiny flag... and a tiny hero waving
    c.strokeStyle = "#666"; c.lineWidth = 2; c.beginPath(); c.moveTo(mx + mr * 0.1, my - mr * 0.92); c.lineTo(mx + mr * 0.1, my - mr * 1.25); c.stroke();
    c.fillStyle = "#7ED957"; c.fillRect(mx + mr * 0.1, my - mr * 1.25, 22, 14);
    A.text(c, "F", mx + mr * 0.1 + 11, my - mr * 1.25 + 7, 11, "#5B2BC4");
    const fx = cx - r + ((u * 0.45) % 1) * r * 2.4;
    c.save(); c.translate(fx, cy - r * 0.55); A.drawFartMan(c, E.t, 0.7); c.restore();
    c.restore();
    c.strokeStyle = "#2B2F3A"; c.lineWidth = 16; c.beginPath(); c.arc(cx, cy, r + 8, 0, TAU); c.stroke();
    A.text(c, "Hi from the Moon!", cx, cy + r + 40, 24, "#FFFFFF", { weight: 700 });
    c.restore();
  }

  // ---------- loop ----------
  let last = performance.now(), pruneT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!E.paused) {
      update(dt);
      render();
    }
    pruneT += dt;
    if (pruneT > 5) { pruneT = 0; A.pruneSprites(); }
    requestAnimationFrame(frame);
  }
  E.start = () => { last = performance.now(); requestAnimationFrame(frame); };
  E.snap = () => { E.snapCam = true; };
  // Pause the whole world while a mini-game has the screen.
  E.paused = false;
  E.pause = (on) => { E.paused = on; last = performance.now(); };
})();
