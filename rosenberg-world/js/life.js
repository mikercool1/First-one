// Rosenberg World: life. The giant backyard dog, family cameos, Max, cars, butterflies,
// the sky and mountains, and the cinematic title sequence.

(() => {
  const RW = window.RW, A = RW.art, U = RW.util, L = RW.layout;
  const TAU = Math.PI * 2;
  const world = RW.world;
  let E = null;

  // =====================================================================
  // THE GIANT BACKYARD DOG
  // =====================================================================
  const inDogZone = (x, y) => {
    const d = Math.hypot(x - L.home.x, y - L.home.y);
    if (d < L.fenceR - 40 && y < L.home.y - 20) return true;           // the outfield
    return x > 2080 && x < 2880 && y > L.home.y + 90 && y < 1320;       // the backyard
  };
  function dogTarget() {
    for (let i = 0; i < 30; i++) {
      const x = U.rand(2080, 2880), y = U.rand(700, 1310);
      if (inDogZone(x, y)) return [x, y];
    }
    return [2450, 900];
  }
  function makeDog() {
    const dog = E.add({
      id: "dog", kind: "dog", x: 2600, y: 880, dir: -1, move: 0, run: false, t: 0, state: "wander", st: 0,
      tx: 2500, ty: 900, taps: 0, ball: false, pose: null, happy: false, box: [-70, -110, 80, 8], shadow: [54, 12], bubbleH: 120,
      hit: [-70, -110, 80, 10],
      draw(c, E2, d) { c.scale(1.12, 1.12); A.drawDog(c, { t: d.t, move: d.move, run: d.run, dir: d.dir, pose: d.pose, ball: d.ball, happy: d.happy }); },
      update: updateDog,
      tap: { reach: "remote", act: (E2, d) => tapDog(E2, d) },
    });
    return dog;
  }
  function goDog(d, x, y, state, run) { d.tx = x; d.ty = y; d.state = state; d.run = !!run; d.st = 0; d.pose = null; }
  function updateDog(d, dt, E2) {
    d.t += dt; d.st += dt;
    const sp = d.run ? 330 : 95;
    const dx = d.tx - d.x, dy = d.ty - d.y, dist = Math.hypot(dx, dy);
    const moving = dist > 10 && d.state !== "sit" && d.state !== "peek";
    if (moving) {
      d.x += (dx / dist) * Math.min(sp * dt, dist); d.y += (dy / dist) * Math.min(sp * dt, dist);
      if (Math.abs(dx) > 4) d.dir = dx > 0 ? 1 : -1;
      d.move = 1;
    } else d.move = 0;
    d.happy = d.state === "happy" || d.run;
    switch (d.state) {
      case "wander":
        if (!moving || d.st > 9) {
          const r = Math.random();
          if (r < 0.2) { d.state = "sit"; d.st = 0; d.pose = "sit"; }
          else if (r < 0.32) {
            // peek over the outfield fence
            const a = U.rand(-Math.PI * 0.7, -Math.PI * 0.3);
            goDog(d, L.home.x + Math.cos(a) * (L.fenceR - 55), L.home.y + Math.sin(a) * (L.fenceR - 55), "toPeek");
          } else if (r < 0.4) { goDog(d, d.x + U.rand(-30, 30), d.y + U.rand(-10, 10), "sniff"); d.pose = "sniff"; }
          else { const [x, y] = dogTarget(); goDog(d, x, y, "wander"); }
        }
        break;
      case "sit": if (d.st > 3.5) { d.pose = null; const [x, y] = dogTarget(); goDog(d, x, y, "wander"); } break;
      case "sniff": if (d.st > 2) { d.pose = null; d.state = "wander"; d.st = 99; } break;
      case "toPeek": if (!moving) { d.state = "peek"; d.st = 0; d.pose = "peek"; d.dir = d.x < L.home.x ? -1 : 1; if (U.chance(0.5)) RW.sfx.play("bark"); } break;
      case "peek": if (d.st > 2.6) { d.pose = null; const [x, y] = dogTarget(); goDog(d, x, y, "wander"); } break;
      case "flee": if (!moving || d.st > 1.8) { d.run = false; const [x, y] = dogTarget(); goDog(d, x, y, "wander"); } break;
      case "happy": if (d.st > 1.5) { d.state = "wander"; d.st = 99; } break;
      case "goto": if (!moving) { d.state = "happy"; d.st = 0; RW.sfx.play("bark"); } break;
      case "chase": {
        const b = d.chaseBall;
        if (!b || b.dead) { d.state = "wander"; break; }
        d.tx = b.x; d.ty = b.y + 4; d.run = true;
        if (dist < 34 && b.z < 30) {
          b.held = d; d.ball = true; b.hidden = true;
          RW.sfx.play("bark");
          E2.say(d, "WOOF!", 1);
          goDog(d, 2450, 1250, "return", true);
        }
        break;
      }
      case "return":
        if (!moving) {
          const b = d.chaseBall;
          d.ball = false;
          if (b) { b.held = null; b.hidden = false; b.x = d.x + d.dir * 40; b.y = d.y + 20; b.z = 0; b.vx = b.vy = b.vz = 0; b.rest = true; }
          d.chaseBall = null;
          d.state = "happy"; d.st = 0;
        }
        break;
      case "steal":
        if (!moving) { d.ball = true; RW.sfx.play("bark"); E2.say(d, "*proud dog noises*", 1.6); goDog(d, ...dogTarget(), "zoomies", true); d.zoom = 0; }
        break;
      case "zoomies":
        if (!moving) {
          d.zoom = (d.zoom || 0) + 1;
          if (d.zoom < 4) { const [x, y] = dogTarget(); goDog(d, x, y, "zoomies", true); }
          else {
            d.run = false; d.state = "sit"; d.st = 0; d.pose = "sit";
            if (!RW.collection.has("dogbone")) world.popItem("dogbone", d.x, d.y - 40, d.x + 60, d.y + 50);
          }
        }
        break;
    }
    // keep the dog in its yard unless it's chasing something
    if (d.state === "wander" && !inDogZone(d.x, d.y)) { const [x, y] = dogTarget(); goDog(d, x, y, "wander"); }
  }
  function tapDog(E2, d) {
    if (d.state === "chase" || d.state === "return" || d.state === "steal" || d.state === "zoomies") return;
    d.taps += 1;
    RW.sfx.play("bark");
    if (d.taps >= 6) {
      d.taps = 0;
      d.ball = false;
      E2.say(d, "!!!", 1);
      goDog(d, L.home.x + 60, L.home.y - 30, "steal", true);
      E2.later(0.6, () => E2.say(E2.player, "Hey! That's our baseball!", 1.8));
      E2.secret("dogSteal", "The dog stole a baseball!");
      return;
    }
    // run away from the player
    const P = E2.player;
    const ax = d.x - P.x, ay = d.y - P.y, l = Math.hypot(ax, ay) || 1;
    let tx = d.x + (ax / l) * 280, ty = d.y + (ay / l) * 200;
    if (!inDogZone(tx, ty)) [tx, ty] = dogTarget();
    goDog(d, tx, ty, "flee", true);
    E2.float(d.x, d.y - 130, U.pick(["WOOF!", "BARK!", "Arf arf!", "*zoom*"]), { size: 24, stroke: "#B97A34" });
  }
  world.dogGoto = (x, y) => { const d = world.dog; if (d && d.state !== "chase" && d.state !== "return") goDog(d, x, y, "goto", true); };
  // Jonah kicks a ball onto the field → the dog goes after it.
  world.onBallMove = (b) => {
    const d = world.dog;
    if (!d || b.held || d.state === "chase" || d.state === "return") return;
    const inField = Math.hypot(b.x - L.home.x, b.y - L.home.y) < L.fenceR - 30 && b.y < L.home.y + 10;
    const rolling = Math.hypot(b.vx, b.vy) > 120 && b.kickedBy;
    if (rolling && (inField || inDogZone(b.x, b.y)) && (b.ball === "soccer" || b.ball === "beach")) {
      d.chaseBall = b;
      d.state = "chase"; d.st = 0; d.run = true; d.pose = null;
      E.say(d, "BALL?!", 1.2);
      RW.sfx.play("bark");
      if (b.kickedBy === "jonah") E.secret("jonahDog", "Jonah's kick sent the dog running!");
    }
  };

  // =====================================================================
  // FAMILY CAMEOS
  // A cameo walks a short script: {to:[x,y]} steps, {wait, pose, say} and {vanish}.
  // =====================================================================
  const LINES = {
    ariel: ["Dinner's almost ready!", "Who's hungry?", "Taste test later!"],
    sarah: ["Hi sweetie!", "Who wants a snack?", "Love you!"],
    simon: ["Radio check... Fart Man, do you copy?", "Mission control online!", "Testing, testing!"],
    michael: ["One sec, buddy...", "Just checking the score.", "Hi! Nice moves!"],
    cari: ["Hi honey!", "Time to wash up soon!", "Having fun?"],
    nana: ["Hello, sweetheart!", "I'm knitting you a sweater!", "Have you eaten?", "Come give Nana a hug!"],
    max: ["Hehehe!", "Can't catch me!", "I have a spoon!", "Nope!"],
    molly: ["Hi sweetie!", "Chag sameach!", "Look how big you're getting!"],
  };
  const cameos = [];
  world.cameoActive = (id) => cameos.some((n) => n.charId === id && !n.dead);
  world.maxActive = () => world.cameoActive("max");

  function makeNPC(charId, x, y, script, o = {}) {
    const spec = A.CHARS[charId];
    const n = E.add(Object.assign({
      kind: "npc", charId, spec, x, y, dir: 1, back: false, side: 1, move: 0, t: Math.random() * 10, script: script.slice(), si: 0, st: 0,
      speed: o.speed || 95, pose: null, alpha: 0, box: [-30, -120, 30, 6], shadow: [22, 8], hit: [-30, -120, 30, 6],
      draw(c, E2, e) {
        c.globalAlpha = e.alpha;
        A.drawChar(c, e.spec, { t: e.t, move: e.move, side: e.side, dir: e.dir, back: e.back && !e.pose, pose: e.pose, pt: e.st, blink: Math.sin(e.t * 1.3) > 0.97 });
        c.globalAlpha = 1;
      },
      update: updateNPC,
      tap: { reach: "remote", act: (E2, e) => tapNPC(E2, e) },
    }, o));
    cameos.push(n);
    return n;
  }
  function updateNPC(n, dt, E2) {
    n.t += dt;
    n.alpha = n.fading ? Math.max(0, n.alpha - dt * 2.5) : Math.min(1, n.alpha + dt * 3);
    if (n.fading && n.alpha <= 0) { E2.remove(n); cameos.splice(cameos.indexOf(n), 1); return; }
    const step = n.script[n.si];
    if (!step) { n.move = 0; return; }
    n.st += dt;
    if (step.to) {
      const [tx, ty] = step.to, dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
      const sp = step.speed || n.speed;
      if (d < 6) { n.si++; n.st = 0; return; }
      n.x += (dx / d) * Math.min(sp * dt, d); n.y += (dy / d) * Math.min(sp * dt, d);
      n.move = 1; n.pose = step.pose || n.walkPose || null;
      if (Math.abs(dx) > 3) n.dir = dx > 0 ? 1 : -1;
      n.side = U.lerp(n.side, Math.abs(dx) > Math.abs(dy) * 0.5 ? 1 : 0, 0.2);
      n.back = dy < -Math.abs(dx) * 1.2;
      if (n.charId === "max" && U.chance(dt * 3)) E2.burst(n.x, n.y, 0, "dust", 1);
    } else if (step.wait != null) {
      n.move = 0; n.pose = step.pose || null; n.side = 0; n.back = false;
      if (step.dir) n.dir = step.dir;
      if (step.say && !step.said) { step.said = true; E2.say(n, step.say, Math.min(2.4, step.wait)); }
      if (n.st > step.wait) { n.si++; n.st = 0; }
    } else if (step.vanish) {
      if (!n.fading) { n.fading = true; E2.burst(n.x, n.y, 30, "puff", 5); }
    } else n.si++;
  }
  function tapNPC(E2, n) {
    if (n.charId === "max") { maxRunAway(n); return; }
    E2.say(n, U.pick(LINES[n.charId] || ["Hi!"]), 2);
    E2.burst(n.x, n.y, 100, "heart", 3);
    RW.sfx.play("giggle");
  }

  // ---- Max ----
  function maxRunAway(n) {
    const P = E.player;
    const ax = n.x - (P ? P.x : n.x - 1), ay = n.y - (P ? P.y : n.y);
    const l = Math.hypot(ax, ay) || 1;
    const v = E.view;
    const ex = ax > 0 ? v.x1 + 120 : v.x0 - 120;
    n.script = [{ to: [ex, n.y + (ay / l) * 120], speed: 360 }, { vanish: true }];
    n.si = 0; n.st = 0;
    E.say(n, U.pick(["Hehehe! Can't catch me!", "NOPE!", "Byeee!"]), 1.6);
    RW.sfx.play("giggle");
    E.secret("maxRun", "Max runs away when you tap him!");
  }
  // places Max really should not be
  const MISCHIEF = [
    [3720, 820, "Blast off!"], [3500, 1770, "Splashy!"], [2450, 988, "I'm the pitcher!"], [3850, 2080, "I'm building stuff!"],
    [2815, 1860, "Beep beep!"], [1420, 1760, "Is it cookie time?"], [2560, 1300, "Boing boing!"], [4190, 2600, "My castle!"], [640, 760, "Vroom!"],
  ];
  function spawnMaxMischief() {
    const P = E.player;
    const spot = MISCHIEF.slice().sort((a, b) => Math.hypot(a[0] - P.x, a[1] - P.y) - Math.hypot(b[0] - P.x, b[1] - P.y))[U.randi(0, 1)];
    const v = E.view;
    const fromLeft = spot[0] > P.x;
    const sx = fromLeft ? v.x0 - 80 : v.x1 + 80, sy = spot[1] + U.rand(-80, 80);
    const ex = fromLeft ? v.x1 + 120 : v.x0 - 120;
    makeNPC("max", sx, sy, [
      { to: [spot[0], spot[1]], speed: 250, pose: "spoon" },
      { wait: 3.2, pose: "spoon", say: spot[2] },
      { to: [ex, spot[1] + U.rand(-60, 60)], speed: 260, pose: "spoon" },
      { vanish: true },
    ], { speed: 250, walkPose: "spoon" });
  }
  world.maxFromBush = (x, y) => {
    const n = makeNPC("max", x, y + 10, [
      { wait: 0.9, pose: "celebrate", say: "BOO!" },
      { to: [x + U.pick([-1, 1]) * 700, y + U.rand(-60, 60)], speed: 300, pose: "spoon" },
      { vanish: true },
    ], { speed: 300 });
    n.alpha = 1;
    RW.sfx.play("giggle");
    E.burst(x, y, 30, "leaf", 10, { up: 260 });
    E.secret("maxBush", "Max was hiding in the bushes!");
  };

  const CAMEOS = [
    { id: "ariel", near: [1900, 1850], make: () => makeNPC("ariel", 2405, 1760, [{ to: [2300, 1905] }, { to: [1600, 1905] }, { to: [1570, 1760] }, { wait: 0.6, say: "Dinner time soon!" }, { vanish: true }]) },
    { id: "sarah", near: [2400, 2200], make: () => makeNPC("sarah", 2300, 2640, [{ to: [2290, 2300] }, { to: [2330, 1990] }, { to: [2440, 1905] }, { to: [2405, 1765] }, { wait: 0.5, say: "I'm home!" }, { vanish: true }]) },
    { id: "simon", near: [3200, 1200], make: () => makeNPC("simon", 2405, 1760, [{ to: [2960, 1900] }, { to: [2985, 1640] }, { to: [2940, 1340] }, { to: [3000, 1100] }, { to: [3300, 1000] }, { to: [3620, 900] }, { wait: 14, pose: "carry", say: "Mission control online!" }, { to: [3300, 1000] }, { vanish: true }], { walkPose: "carry", speed: 85 }) },
    { id: "michael", near: [2450, 1850], make: () => makeNPC("michael", 2620, 1840, [{ wait: 1, pose: "phone" }, { to: [2560, 1860], speed: 30 }, { wait: 4, pose: "phone" }, { to: [2340, 1845], speed: 30 }, { wait: 1.4, say: "Oops! Almost hit the mailbox." }, { wait: 4, pose: "phone" }, { to: [2405, 1765] }, { vanish: true }], { walkPose: "phone" }) },
    { id: "molly", near: [3700, 1800], make: () => makeNPC("molly", 4050, 1870, [{ to: [3780, 1890] }, { to: [3420, 1890] }, { to: [3345, 1905] }, { wait: 3, say: "Hi Nana! Love the scarf!" }, { to: [3000, 1905] }, { to: [2600, 1905] }, { to: [2405, 1765] }, { vanish: true }]) },
    { id: "cari", near: [3300, 1850], make: () => makeNPC("cari", 2405, 1760, [{ to: [2600, 1905] }, { to: [3250, 1905] }, { to: [3330, 1840] }, { wait: 3, say: "Hi Nana!" }, { to: [3250, 1905] }, { to: [2600, 1905] }, { to: [2405, 1765] }, { vanish: true }]) },
  ];

  // Cari walking past the upstairs windows (drawn by the house)
  function updateCariWindow(dt) {
    const w = world.cariWindow;
    if (w) { w.x += w.dir * 70 * dt; if (Math.abs(w.x) > 280) world.cariWindow = null; }
  }
  world.houseWave = () => { world.cariWindow = { x: -280, dir: 1, wave: true }; E.later(0.4, () => E.say({ x: 2450, y: 1580, bubbleH: 20 }, "Hi sweetie!", 1.8)); };

  // =====================================================================
  // AMBIENT: butterflies, cars, birds, clouds
  // =====================================================================
  function makeButterfly(cx, cy) {
    const col = U.pick(["#FF8FB1", "#FFD23F", "#9BD6FF", "#C3A6FF", "#FF9F5C"]);
    E.add({
      kind: "butterfly", x: cx, y: cy, cx, cy, t: Math.random() * 10, z: 40, box: [-10, -90, 10, 4], sortY: cy,
      draw(c, E2, e) { c.translate(0, -e.z); A.drawButterfly(c, e.t, col); },
      update(e, dt) {
        e.t += dt;
        e.x = e.cx + Math.sin(e.t * 0.7) * 70 + Math.sin(e.t * 1.9) * 20;
        e.y = e.cy + Math.cos(e.t * 0.5) * 40;
        e.z = 40 + Math.sin(e.t * 2.3) * 16;
        e.sortY = e.y;
      },
    });
  }
  function makeCar(lane, x, col, speed) {
    E.add({
      kind: "car", x, y: lane, box: [-60, -60, 60, 10], shadow: [50, 8], dir: speed > 0 ? 1 : -1,
      draw(c, E2, e) { c.scale(e.dir, 1); A.drawCar(c, col, E2.t + x); },
      update(e, dt) { e.x += speed * dt; if (e.x > 5400) e.x = -400; if (e.x < -400) e.x = 5400; },
    });
  }
  const clouds = [];
  function initClouds() {
    for (let i = 0; i < 6; i++) clouds.push({ x: U.rand(0, 5000), y: U.rand(400, 3000), s: U.rand(0.8, 1.5), v: U.rand(12, 22) });
  }

  // =====================================================================
  // DISTANT SCENERY: sky, Winter Mountain, the gondola cable
  // =====================================================================
  const skyClouds = [];
  for (let i = 0; i < 7; i++) skyClouds.push({ x: U.rand(-400, 5400), y: U.rand(-380, -40), s: U.rand(0.7, 1.4), v: U.rand(6, 14) });
  function drawCloud(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = "rgba(255,255,255,.95)";
    [[-60, 0, 36], [-20, -18, 46], [30, -10, 40], [70, 4, 30], [0, 10, 40]].forEach(([cx, cy, r]) => { c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); });
    c.fillStyle = "rgba(200,215,240,.5)"; A.ell(c, 0, 26, 90, 12); c.fill();
    c.restore();
  }
  world.drawBackdrop = (c, E2, v) => {
    const top = Math.min(v.y0, -420), bot = 420;
    const sky = c.createLinearGradient(0, -420, 0, 400);
    sky.addColorStop(0, "#5DB6F2"); sky.addColorStop(0.6, "#A9DCFB"); sky.addColorStop(1, "#E6F6FF");
    c.fillStyle = sky; c.fillRect(v.x0, top, v.w, bot - top);
    // sun
    const sx = v.x0 + v.w * 0.82 + (E2.cam.x - 2500) * 0.02;
    c.fillStyle = A.rad(c, sx, -300, 10, sx, -300, 140, ["rgba(255,250,220,1)", "rgba(255,240,180,.4)", "rgba(255,240,180,0)"]);
    c.fillRect(sx - 150, -450, 300, 300);
    // parallax sky clouds
    skyClouds.forEach((cl) => {
      cl.x += cl.v * 0.016; if (cl.x > 5600) cl.x = -600;
      drawCloud(c, cl.x + (E2.cam.x - 2500) * 0.5, cl.y, cl.s);
    });
    // far mountains (parallax)
    const px = (E2.cam.x - 2500) * 0.45;
    c.save(); c.translate(px, 0);
    drawRange(c, -900, 6400, 330, 260, "#A7C4E6", "#EAF3FF", 7);
    // Winter Mountain, big and snowy
    drawWinterMountain(c, 3350, 360);
    drawRange(c, -900, 6400, 360, 150, "#7FB08A", null, 11);
    c.restore();
    // gondola cable from the station up the mountain (drawn with the mountain's parallax at the far end)
    const x0 = 3160, y0 = 290, x1 = 3350 + px, y1 = -160;
    c.strokeStyle = "#3A4252"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x0 - 14, y0); c.quadraticCurveTo((x0 + x1) / 2 - 14, (y0 + y1) / 2 + 40, x1 - 14, y1); c.stroke();
    c.beginPath(); c.moveTo(x0 + 14, y0); c.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2 + 40, x1 + 14, y1); c.stroke();
    const u = 0.55, gx = U.lerp(x0, x1, u) - 14, gy = U.lerp(y0, y1, u) + 18;
    c.fillStyle = "#3A4252"; c.fillRect(gx - 1, gy, 2, 20);
    c.fillStyle = "#E8453C"; A.rr(c, gx - 18, gy + 18, 36, 30, 6); c.fill();
    c.fillStyle = "#BEE7FF"; A.rr(c, gx - 13, gy + 23, 26, 12, 3); c.fill();
  };
  function drawRange(c, x0, x1, base, height, col, snow, seed) {
    const rnd = U.seeded(seed);
    const pts = [];
    for (let x = x0; x <= x1; x += 180 + rnd() * 160) pts.push([x, base - height * (0.4 + rnd() * 0.6)]);
    c.fillStyle = A.lin(c, 0, base - height, 0, base + 60, [A.shade(col, 0.1), col, A.shade(col, -0.1)]);
    c.beginPath(); c.moveTo(x0, base + 80);
    pts.forEach(([x, y], i) => { const prev = pts[i - 1] || [x0, base]; c.quadraticCurveTo((prev[0] + x) / 2, Math.min(prev[1], y) - 20, x, y); });
    c.lineTo(x1, base + 80); c.closePath(); c.fill();
    if (snow) {
      c.fillStyle = snow;
      pts.forEach(([x, y]) => { if (y < base - height * 0.75) { c.beginPath(); c.moveTo(x - 50, y + 40); c.quadraticCurveTo(x, y - 12, x + 50, y + 40); c.quadraticCurveTo(x, y + 26, x - 50, y + 40); c.fill(); } });
    }
  }
  function drawWinterMountain(c, x, base) {
    c.fillStyle = A.lin(c, x - 500, 0, x + 500, 0, ["#B9D0EE", "#8FAFD8", "#6F8FC0"]);
    c.beginPath(); c.moveTo(x - 620, base + 40); c.quadraticCurveTo(x - 260, base - 300, x - 40, base - 560); c.quadraticCurveTo(x, base - 590, x + 50, base - 560); c.quadraticCurveTo(x + 300, base - 300, x + 640, base + 40); c.closePath(); c.fill();
    c.fillStyle = "#FFFFFF";
    c.beginPath(); c.moveTo(x - 200, base - 360); c.quadraticCurveTo(x - 90, base - 500, x - 40, base - 560); c.quadraticCurveTo(x, base - 590, x + 50, base - 560); c.quadraticCurveTo(x + 120, base - 480, x + 210, base - 360);
    for (let i = 0; i < 6; i++) c.quadraticCurveTo(x + 210 - i * 70 - 35, base - 330 + (i % 2) * 30, x + 210 - (i + 1) * 70, base - 360);
    c.closePath(); c.fill();
    c.fillStyle = "rgba(160,190,230,.35)"; c.beginPath(); c.moveTo(x + 50, base - 560); c.quadraticCurveTo(x + 150, base - 420, x + 210, base - 360); c.lineTo(x + 60, base - 380); c.closePath(); c.fill();
    // ski trails + a lodge flag
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 6;
    c.beginPath(); c.moveTo(x - 20, base - 330); c.quadraticCurveTo(x - 140, base - 200, x - 60, base - 60); c.stroke();
    c.beginPath(); c.moveTo(x + 60, base - 320); c.quadraticCurveTo(x + 190, base - 180, x + 120, base - 50); c.stroke();
    A.text(c, "WINTER MOUNTAIN", x, base - 240, 34, "rgba(255,255,255,.85)", { weight: 700, stroke: "rgba(60,90,140,.35)", strokeW: 6 });
  }

  // things painted over the ground every frame
  world.drawGroundLive = (c, E2, v) => {
    // soft cloud shadows drifting across the neighborhood
    c.fillStyle = "rgba(20,40,70,.06)";
    clouds.forEach((cl) => {
      cl.x += cl.v * 0.016; if (cl.x > 5400) cl.x = -400;
      if (cl.x + 300 < v.x0 || cl.x - 300 > v.x1 || cl.y + 200 < v.y0 || cl.y - 200 > v.y1) return;
      [[-80, 0, 120], [40, -30, 130], [140, 10, 100]].forEach(([dx, dy, r]) => { A.ell(c, cl.x + dx * cl.s, cl.y + dy * cl.s, r * cl.s, r * cl.s * 0.55); c.fill(); });
    });
    // mist where the woods trails leave the map
    if (v.x0 < 300) {
      [[1890, 1], [2290, 1], [1310, 1]].forEach(([y]) => {
        c.fillStyle = A.lin(c, -60, 0, 260, 0, ["rgba(255,255,255,.75)", "rgba(255,255,255,0)"]);
        c.fillRect(-60, y - 120, 320, 240);
      });
      // fireflies in the woods
      for (let i = 0; i < 14; i++) {
        const x = 200 + ((i * 173) % 600) + Math.sin(E2.t * 0.7 + i) * 30, y = 1300 + ((i * 311) % 1100) + Math.cos(E2.t * 0.9 + i) * 20;
        c.globalAlpha = 0.3 + Math.sin(E2.t * 3 + i * 1.7) * 0.3;
        c.fillStyle = "#FFF6A0"; c.beginPath(); c.arc(x, y - 40, 3, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
  };

  // =====================================================================
  // DIRECTOR: who shows up when
  // =====================================================================
  let nextCameo = 10, nextBirds = 14, nextFlyby = 120, nextKitchenMax = 8, nextCari = 20;
  world.updateLife = (dt, E2) => {
    updateCariWindow(dt);
    if (world.maxWindow != null) { world.maxWindow += dt * 0.7; if (world.maxWindow > 1) world.maxWindow = null; }
    if (E2.mode !== "play") return;
    const t = E2.t;
    if (t > nextKitchenMax) { nextKitchenMax = t + U.rand(10, 18); world.maxWindow = 0; }
    if (t > nextCari) { nextCari = t + U.rand(22, 40); if (!world.cariWindow) world.cariWindow = { x: U.chance(0.5) ? -280 : 280, dir: 0 }; world.cariWindow.dir = world.cariWindow.x < 0 ? 1 : -1; }
    if (t > nextCameo) {
      nextCameo = t + U.rand(16, 28);
      const P = E2.player;
      if (U.chance(0.4) && !world.maxActive()) spawnMaxMischief();
      else {
        const options = CAMEOS.filter((cm) => !world.cameoActive(cm.id)).sort((a, b) => Math.hypot(a.near[0] - P.x, a.near[1] - P.y) - Math.hypot(b.near[0] - P.x, b.near[1] - P.y));
        if (options.length) (Math.hypot(options[0].near[0] - P.x, options[0].near[1] - P.y) < 1400 ? options[0] : U.pick(options)).make();
      }
    }
    if (t > nextBirds) {
      nextBirds = t + U.rand(18, 34);
      const v = E2.view, dir = U.chance(0.5) ? 1 : -1, y = v.y0 + v.h * U.rand(0.1, 0.35), col = U.pick(["#4C6FE0", "#3A4252", "#8A5CE0"]);
      for (let i = 0; i < 5; i++) {
        const off = i * 36, lag = Math.abs(i - 2) * 26;
        E2.flyers.push({
          t: 0, x: (dir > 0 ? v.x0 - 100 : v.x1 + 100) - dir * lag, y: y + off * 0.5 - (i % 2) * 10,
          update(dt2) { this.t += dt2; this.x += dir * 170 * dt2; this.y -= 12 * dt2; return this.t < 14; },
          draw(c) { c.save(); c.translate(this.x, this.y); c.scale(dir * 0.9, 0.9); A.drawBird(c, E2.t + i, col); c.restore(); },
        });
      }
      if (U.chance(0.5)) RW.sfx.play("chirp");
    }
    if (t > nextFlyby) { nextFlyby = t + U.rand(100, 160); E2.flyFartMan({ y: 0.18 }); }
  };

  // =====================================================================
  // SETUP
  // =====================================================================
  world.buildLife = (engine) => {
    E = engine;
    world.dog = makeDog();
    // Nana on her bench in the plaza, knitting
    const nb = world.nanaBench;
    const nana = makeNPC("nana", nb.x, nb.y + 3, [{ wait: 1e9, pose: "knit" }]);
    nana.alpha = 1; nana.side = 0;
    nana.update = (n, dt, E2) => { n.t += dt; n.pose = "knit"; n.move = 0; n.side = 0; if (U.chance(dt * 0.15)) E2.burst(n.x, n.y, 90, "heart", 1, { sp: 10, up: 30 }); };
    cameos.splice(cameos.indexOf(nana), 1); // Nana is permanent, not a cameo
    // butterflies
    [[2450, 1780], [3500, 1690], [1420, 1810], [2080, 2150], [3020, 1960], [700, 1650]].forEach(([x, y]) => makeButterfly(x, y));
    // cars on the far road
    makeCar(3165, 200, "#E8453C", 120); makeCar(3165, 2600, "#FFD23F", 120); makeCar(3215, 1500, "#2F9BFF", -140); makeCar(3215, 4200, "#2EB872", -140);
    initClouds();
  };

  // =====================================================================
  // TITLE SEQUENCE
  // =====================================================================
  const titleBits = [];
  world.startTitle = () => {
    E.mode = "title";
    E.titleCam = [2450, 1720];
    E.cam.x = 2450; E.cam.y = 1720; E.cam.z = E.zoomFor("title");
    E.snap();
    const kids = [["reuben", 1600, 1915, 2320, 1945], ["jonah", 1500, 1925, 2450, 1960], ["ellie", 1380, 1935, 2575, 1948]];
    kids.forEach(([id, x, y, tx, ty], i) => {
      const n = makeNPC(id, x, y, [
        { to: [tx, ty], speed: id === "ellie" ? 250 : 300 },
        { wait: 0.4 },
        { wait: 1e9, pose: id === "reuben" ? "fist" : id === "jonah" ? "celebrate" : "wave", dir: 1 },
      ]);
      n.alpha = 1;
      n.tap = null;
      titleBits.push(n);
      cameos.splice(cameos.indexOf(n), 1);
    });
    // Ellie stops to look at a flower on the way (of course)
    const ellie = titleBits[2];
    ellie.script.splice(0, 1, { to: [2050, 1945], speed: 260 }, { wait: 0.9, pose: "look" }, { to: [2575, 1948], speed: 300 });
    runTitleGags();
  };
  function runTitleGags() {
    if (E.mode !== "title") return;
    const later = (s, fn) => E.later(s, () => { if (E.mode === "title") fn(); });
    // a baseball sails out of the backyard over the house
    later(1.5, () => { RW.sfx.play("crack"); E.flyBaseball(2380, 1300, 3350, 1990, 2.3, 620); });
    // ...and the giant dog tears after it
    later(2.1, () => {
      const d = E.add({
        kind: "dog", x: 1850, y: 2010, t: 0, box: [-70, -110, 80, 8], shadow: [54, 12],
        draw(c, E2, e) { c.scale(1.12, 1.12); A.drawDog(c, { t: e.t, move: 1, run: true, dir: 1, happy: true }); },
        update(e, dt, E2) { e.t += dt; e.x += 380 * dt; if (e.x > 3500) E2.remove(e); },
      });
      titleBits.push(d);
      RW.sfx.play("bark");
    });
    // Fart Man zooms across the sky
    later(3.4, () => E.flyFartMan({ y: 0.12, dur: 3.2 }));
    // Max runs across with a kitchen spoon
    later(5.2, () => {
      const m = makeNPC("max", 3150, 2040, [{ to: [1700, 2040], speed: 320, pose: "spoon" }, { vanish: true }], { walkPose: "spoon" });
      m.alpha = 1; m.tap = null;
      cameos.splice(cameos.indexOf(m), 1);
      titleBits.push(m);
      RW.sfx.play("giggle");
    });
    later(10, runTitleGags);
  }
  world.endTitle = () => {
    titleBits.forEach((b) => E.remove(b));
    titleBits.length = 0;
    E.titleCam = null;
  };
})();
