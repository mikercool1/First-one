// Rosenberg World: the world. Destinations, buildings, props, hidden stars, collectibles and what everything does when tapped.

(() => {
  const RW = window.RW, A = RW.art, U = RW.util, B = RW.build, L = RW.layout;
  const P_ = A.prop;
  const TAU = Math.PI * 2;
  const world = RW.world = RW.world || {};

  // =====================================================================
  // DESTINATIONS
  // Every place with a door, gate or map pin. Games attach to these by id (see games.js).
  // portal: where the "PLAY" card appears. arrive: where the player comes back out.
  // =====================================================================
  const DESTINATIONS = world.DESTINATIONS = [
    { id: "house", name: "Rosenberg House", icon: "🏠", kind: "place", map: [2450, 1560], arrive: [2405, 1765], noPin: true },
    { id: "gameroom", name: "The Game Room", icon: "🎲", kind: "future", portal: [2405, 1748], portalR: 55, arrive: [2405, 1765], map: [2270, 1500] },
    { id: "baseball", name: "Backyard Baseball", icon: "⚾", kind: "game", portal: [2640, 1205], portalR: 95, arrive: [2640, 1228], map: [2450, 860] },
    { id: "lunar", name: "Lunar Lander Rocket", icon: "🌙", kind: "game", portal: [3515, 860], portalR: 70, arrive: [3515, 880], map: [2960, 690] },
    { id: "fartman", name: "Fart Man Landing Zone", icon: "🚀", kind: "game", portal: [3720, 925], portalR: 120, arrive: [3720, 950], map: [3720, 720] },
    { id: "mathblaster", name: "Math Blaster Academy", icon: "✖️", kind: "game", portal: [1450, 935], portalR: 95, arrive: [1450, 965], map: [1450, 760] },
    { id: "kitchen", name: "Ariel's Kitchen", icon: "🍳", kind: "game", portal: [1570, 1755], portalR: 90, arrive: [1570, 1790], map: [1420, 1570] },
    { id: "car", name: "The Family Car", icon: "🚗", kind: "game", portal: [2712, 1800], portalR: 60, arrive: [2712, 1815], map: [2740, 1790] },
    { id: "soccer", name: "Soccer Field", icon: "⚽", kind: "game", portal: [1425, 2240], portalR: 80, arrive: [1425, 2258], map: [1150, 2210] },
    { id: "volleyball", name: "Beach Volleyball", icon: "🏐", kind: "game", portal: [4120, 2612], portalR: 90, arrive: [4120, 2630], map: [4120, 2530] },
    { id: "icecream", name: "Frozenbergs Ice Cream", icon: "🍦", kind: "game", portal: [3250, 2664], portalR: 85, arrive: [3250, 2684], map: [3250, 2470] },
    { id: "court", name: "Basketball Court", icon: "🏀", kind: "game", portal: [1630, 2175], portalR: 80, arrive: [1630, 2190], map: [1710, 2175] },
    { id: "plaza", name: "Mystery Plaza", icon: "⛲", kind: "place", map: [3500, 1760], arrive: [3500, 1880] },
    { id: "plaza-building", name: "Mystery Building", icon: "❓", kind: "future", portal: [3500, 1535], portalR: 85, arrive: [3500, 1560], map: [3500, 1420] },
    { id: "plaza-lot", name: "Under Construction", icon: "🚧", kind: "future", portal: [3850, 2235], portalR: 95, arrive: [3850, 2250], map: [3850, 2080] },
    { id: "sports", name: "Sports Complex", icon: "🏟️", kind: "place", map: [1500, 2090], arrive: [1500, 2200] },
    { id: "sports-hoops", name: "Hoops Gym", icon: "🏀", kind: "future", portal: [1710, 2560], portalR: 85, arrive: [1710, 2575], map: [1710, 2440] },
    { id: "sports-stadium", name: "Field House", icon: "🏈", kind: "future", portal: [1150, 2595], portalR: 85, arrive: [1150, 2615], map: [1150, 2480] },
    { id: "sports-tennis", name: "Tennis Court", icon: "🎾", kind: "future", portal: [1905, 2715], portalR: 90, arrive: [1905, 2730], map: [1710, 2700] },
    { id: "arcade", name: "Rosenberg Arcade", icon: "🕹️", kind: "future", portal: [2450, 2600], portalR: 90, arrive: [2450, 2640], map: [2450, 2470] },
    { id: "raceway", name: "Rosenberg Raceway", icon: "🏎️", kind: "future", portal: [640, 1000], portalR: 100, arrive: [640, 1030], map: [640, 760] },
    { id: "woods", name: "Adventure Woods", icon: "🌲", kind: "place", map: [560, 1780], arrive: [640, 1900] },
    { id: "woods-cave", name: "Mystery Cave", icon: "🔦", kind: "future", portal: [270, 1585], portalR: 85, arrive: [300, 1600], map: [270, 1480] },
    { id: "waterworld", name: "Baha Bay", icon: "🌊", kind: "future", portal: [5100, 1680], portalR: 100, arrive: [5100, 1660], map: [4850, 1820] },
    { id: "lazyriver", name: "Baha Bay Lazy River", icon: "🛟", kind: "future", portal: [5412, 1676], portalR: 70, arrive: [5412, 1660], map: [5430, 2030] },
    { id: "beach", name: "Rosenberg Beach", icon: "🏖️", kind: "place", map: [4150, 1860], arrive: [4100, 2260] },
    // sea planes between the dock and Baha Mar (travel, not games)
    { id: "seaplane", name: "Fly to Baha Mar", icon: "✈️", kind: "travel", to: "bahamar", portal: [4630, 2352], portalR: 70, arrive: [4610, 2352], map: [4650, 2352] },
    { id: "seaplane-home", name: "Fly Home", icon: "✈️", kind: "travel", to: "mainland", portal: [4990, 1392], portalR: 60, arrive: [4995, 1410], map: [4980, 1300] },
    { id: "gondola", name: "Winter Mountain", icon: "🏔️", kind: "future", portal: [3160, 515], portalR: 85, arrive: [3160, 540], map: [3300, 150] },
  ];
  const DEST = world.DEST = {};
  DESTINATIONS.forEach((d) => (DEST[d.id] = d));

  // What does this destination currently offer? "place" | "playable" | "placeholder" | "locked"
  world.destStatus = (d) => {
    if (d.kind === "place") return "place";
    if (d.kind === "travel") return "travel";
    return RW.games.status(RW.games.forDestination(d.id));
  };
  // =====================================================================
  // PLACES: the neighbourhoods. Signposts point to them and their names pop up as you walk in.
  // go: a destination id (walk in / fly) or a point to walk to. zone: [x0, y0, x1, y1].
  // =====================================================================
  const PLACES = world.PLACES = {
    home:     { name: "HOME", icon: "🏠", color: "#2F6BD6", go: [2405, 1800], zone: [2040, 1380, 2920, 1860] },
    baseball: { name: "BASEBALL", icon: "⚾", color: "#2E8B57", go: "baseball", zone: [2020, 600, 2920, 1380] },
    space:    { name: "SPACE ZONE", icon: "🚀", color: "#7B3FE4", go: [3620, 980], zone: [3300, 540, 4150, 1090] },
    academy:  { name: "MATH BLASTER", icon: "✖️", color: "#2F5BEA", go: "mathblaster", zone: [1200, 620, 1820, 1090] },
    raceway:  { name: "RACEWAY", icon: "🏎️", color: "#E8453C", go: "raceway", zone: [120, 540, 1040, 1160] },
    kitchen:  { name: "KITCHEN", icon: "🍳", color: "#E8743C", go: "kitchen", zone: [1150, 1480, 1800, 1860] },
    sports:   { name: "SPORTS ZONE", icon: "⚽", color: "#1F8A4C", go: [1500, 2200], zone: [880, 1960, 2000, 3060] },
    playground: { name: "PLAYGROUND", icon: "🛝", color: "#F2A93B", zone: [2000, 1960, 2270, 2330] },
    arcade:   { name: "ARCADE", icon: "🕹️", color: "#8A3FE4", go: "arcade", zone: [2150, 2380, 2800, 2820] },
    icecream: { name: "ICE CREAM", icon: "🍦", color: "#E8558A", go: "icecream", zone: [3000, 2320, 3500, 2820] },
    plaza:    { name: "PLAZA", icon: "⛲", color: "#6C4AC9", go: [3500, 1880], zone: [3200, 1400, 3800, 2000] },
    beach:    { name: "BEACH", icon: "🏖️", color: "#1E8FC4", go: [4100, 2100], zone: [3960, 900, 4320, 3060] },
    bahamar:  { name: "BAHA MAR", icon: "🏝️", color: "#18A0B8", go: "seaplane" },
    woods:    { name: "WOODS", icon: "🌲", color: "#3E7A3A", go: [640, 1900], zone: [110, 1160, 880, 3060] },
  };
  world.zoneAt = (x, y) => {
    if (E && E.onIsland(x, y)) return PLACES.bahamar;
    for (const k in PLACES) { const z = PLACES[k].zone; if (z && x > z[0] && x < z[2] && y > z[1] && y < z[3]) return PLACES[k]; }
    return null;
  };
  world.goToPlace = (pl) => {
    const P = E.player;
    if (!P || P.lock) return;
    RW.sfx.play("tap");
    if (typeof pl.go === "string") { goPlay(E, DEST[pl.go]); return; }
    E.walkTo(pl.go[0], pl.go[1]);
    E.say(P, U.pick([`To the ${pl.name.toLowerCase()}!`, "This way!", "Let's go!"]), 1.3);
  };

  world.destTitle = (d) => {
    const g = RW.games.forDestination(d.id);
    return g && g.unlocked && g.title ? g.title : d.name;
  };

  // =====================================================================
  // helpers
  // =====================================================================
  let E = null;
  let uid = 0;
  const add = (o) => { o.id = o.id || "e" + uid++; return E.add(o); };
  const noop = () => {};

  // One tap to play: walk to the door and go straight in. Locked places just say "coming soon".
  function goPlay(E2, d) {
    const P = E2.player;
    if (P.lock) return;
    if (world.destStatus(d) === "locked") { E2.say(P, U.pick(["Coming soon!", "Not open yet!", "I can't wait for this one!"]), 1.6); RW.sfx.play("lock"); return; }
    const enter = () => { if (E2.mode === "play" && !RW.host.current) RW.bus.emit("portalEnter", d); };
    if (E2.nearPortal === d || Math.hypot(P.x - d.portal[0], P.y - d.portal[1]) < 30) { enter(); return; }
    E2.walkTo(d.portal[0], d.portal[1] + 8, enter);
  }
  world.goPlay = (d) => goPlay(E, d);
  // A tap target that takes the player into a destination's game.
  function portalTap(destId) {
    const d = DEST[destId];
    return {
      reach: "remote",
      act: (E2) => { RW.sfx.play("tap"); goPlay(E2, d); },
    };
  }

  // a cached static prop
  function staticProp(x, y, box, draw, o = {}) {
    return add(Object.assign({ x, y, box, draw: (c) => draw(c), sprite: true }, o));
  }

  function tree(x, y, kind = "round", s = 1, o = {}) {
    const seed = Math.abs(Math.round(x * 7 + y * 3));
    const e = add({
      kind: "tree", x, y, box: [-75 * s, -172 * s, 75 * s, 14 * s], shadow: [42 * s, 15 * s, 0, 2],
      solid: o.solid === false ? null : [{ c: [0, -2, 12 * s] }],
      shake: 0,
      hit: [-50 * s, -170 * s, 50 * s, -60 * s],
      draw(c, E2, e2) {
        const sway = Math.sin(E2.t * 1.2 + x * 0.013) * 0.018 + (e2.shake > 0 ? Math.sin(E2.t * 40) * e2.shake * 0.08 : 0);
        A.tree(c, kind, s, seed, kind === "palm" ? sway * 1.5 : sway);
      },
      update(e2, dt) { if (e2.shake > 0) e2.shake -= dt * 2; },
    });
    if (o.tap === true) {
      e.tap = {
        reach: "remote",
        act(E2, e2) {
          if (e2.cool > E2.t) return;
          e2.cool = E2.t + 1.2;
          e2.shake = 1;
          RW.sfx.play("rustle");
          E2.burst(x, y, 110 * s, "leaf", 7, { sp: 90 });
          if (U.chance(0.8)) E2.later(0.15, () => E2.spawnBird(x + U.rand(-20, 20), y - 120 * s));
        },
      };
    }
    return e;
  }

  function bush(x, y, s = 1, flowers = null, o = {}) {
    const seed = Math.abs(Math.round(x + y));
    const e = add({
      kind: "bush", x, y, box: [-46 * s, -52 * s, 46 * s, 10 * s], shadow: [34 * s, 10 * s],
      shake: 0,
      draw(c, E2, e2) {
        if (e2.shake > 0) { c.translate(Math.sin(E2.t * 50) * e2.shake * 3, 0); }
        A.bush(c, s, flowers, seed);
      },
      update(e2, dt) { if (e2.shake > 0) e2.shake -= dt * 2; },
    });
    if (o.tap !== false) {
      e.tap = {
        reach: "remote",
        act(E2, e2) {
          if (e2.cool > E2.t) return;
          e2.cool = E2.t + 1.5;
          e2.shake = 1;
          RW.sfx.play("rustle");
          E2.burst(x, y, 30, "leaf", 6, { sp: 80 });
          // sometimes Max pops out
          if (!world.maxActive() && (U.chance(0.33) || !RW.save.secrets.maxBush && U.chance(0.5))) {
            E2.later(0.3, () => world.maxFromBush(x, y));
          }
        },
      };
    }
    return e;
  }

  function flowerBed(x, y, w, h, seed, cols) {
    return staticProp(x, y, [-w / 2 - 10, -h / 2 - 16, w / 2 + 10, h / 2 + 6], (c) => A.flowers(c, seed, w, h, cols), { layer: "ground" });
  }

  function sign(x, y, lines, o = {}) {
    let meas = null;
    const c0 = document.createElement("canvas").getContext("2d");
    c0.font = `700 ${o.size || 22}px ${A.FONT}`;
    const w = Math.max(...lines.map((l) => c0.measureText(l).width)) + 40;
    const h = lines.length * (o.size || 22) * 1.1 + 30 + (o.postH == null ? 30 : o.postH);
    return staticProp(x, y, [-w / 2 - 6, -h - 14, w / 2 + 8, 8], (c) => P_.sign(c, lines, o), Object.assign({ kind: "sign", shadow: [w * 0.3, 7], solid: o.solid === false ? null : [{ r: [-w * 0.35, -6, w * 0.35, 4] }] }, o.ent || {}));
  }

  function marquee(x, y, lines, color, destId, o = {}) {
    const size = o.size || 30, postH = o.postH == null ? 44 : o.postH;
    const c0 = document.createElement("canvas").getContext("2d");
    c0.font = `700 ${size}px ${A.FONT}`;
    // same measurements as prop.marquee
    const mw = Math.max(...lines.map((l) => c0.measureText(l).width)) + 44;
    const mh = lines.length * size * 1.02 + 26;
    const top = -postH - mh;
    const e = staticProp(x, y, [-mw / 2 - 8, top - 10, mw / 2 + 12, 10], (c) => P_.marquee(c, lines, Object.assign({ color }, o)), { kind: "sign", shadow: [mw * 0.34, 8], solid: [{ r: [-mw * 0.33, -6, mw * 0.33, 4] }] });
    if (destId) e.tap = portalTap(destId);
    // twinkling bulbs
    const bulbs = Math.floor(mw / 22);
    e.live = (c, E2) => {
      const on = Math.floor(E2.t * 6) % 3;
      c.fillStyle = "rgba(255,250,210,.95)";
      for (let i = on; i < bulbs; i += 3) {
        const bx = -mw / 2 + 11 + (i * (mw - 22)) / (bulbs - 1);
        c.beginPath(); c.arc(bx, top + 7, 3.6, 0, TAU); c.fill();
        c.beginPath(); c.arc(bx, top + mh - 7, 3.6, 0, TAU); c.fill();
      }
    };
    return e;
  }

  // invisible tap target (for windows, etc.)
  function hotspot(x, y, hit, tap, sortY) { return add({ x, y, hit, box: hit, draw: noop, tap, sortY, hidden: false, tapPriority: 400 }); }

  // =====================================================================
  // BUILD THE WORLD
  // =====================================================================
  world.build = (engine) => {
    E = engine;
    buildHouse();
    buildBackyardAndBaseball();
    buildKitchen();
    buildAcademy();
    buildFartMan();
    buildPlaza();
    buildSports();
    buildPlayground();
    buildArcade();
    buildBahaBay();
    buildIceCream();
    buildSignposts();
    buildBeach();
    buildRaceway();
    buildWoods();
    buildGondola();
    buildUpgrades();
    buildStreetLife();
    buildStarsAndItems();
    scatterTrees();
    if (world.buildLife) world.buildLife(E);
  };

  // ---------------------------------------------------------------------
  // THE ROSENBERG HOUSE
  // ---------------------------------------------------------------------
  function buildHouse() {
    const hx = 2450, hy = 1700;
    const house = add({
      kind: "building", x: hx, y: hy, box: [-340, -275, 500, 34], sprite: true, occludes: true,
      solid: [{ r: [-304, -170, 282, -4] }, { r: [-100, -20, 10, 14] }, { r: [282, -150, 470, -22] }],
      draw: (c) => B.house(c),
      tap: { reach: "walk", at: [-45, 50], range: 50, act: (E2) => { E2.say(E2.player, U.pick(["Home sweet home!", "Knock knock!", "Anybody home?"]), 1.8); RW.sfx.play("tap"); E2.later(0.8, () => { if (!world.cameoActive("cari")) world.houseWave(); }); } },
      live: (c, E2) => drawHouseLive(c, E2),
    });
    house.hit = [-320, -260, 480, 10];
    // the front door opens into the Game Room
    hotspot(hx - 45, hy + 2, [-36, -112, 36, 6], {
      reach: "walk", at: [0, 46], range: 40,
      act: (E2) => {
        if (E2.player.lock) return;
        RW.sfx.play("tap");
        E2.say(E2.player, U.pick(["Game time!", "Hi Sarah, I'm home!", "Let's play!"]), 1.2);
        E2.later(0.5, () => RW.bus.emit("portalEnter", DEST.gameroom));
      },
    }, hy + 3);
    // front garden
    [[2215, 1714, 0.9, "#FF6B8B"], [2335, 1716, 0.75, "#FFD23F"], [2560, 1716, 0.75, "#FFFFFF"], [2690, 1712, 0.9, "#FF6B8B"]].forEach(([x, y, s, f]) => bush(x, y, s, f));
    // low stone retaining walls where the house hill meets the street
    [[1860, 2040], [2725, 2930]].forEach(([x0, x1]) => staticProp((x0 + x1) / 2, 1850, [-(x1 - x0) / 2 - 6, -34, (x1 - x0) / 2 + 6, 6], (c) => {
      const w = x1 - x0;
      c.fillStyle = A.lin(c, 0, -26, 0, 0, ["#D6CEC0", "#A99F8E"]); A.rr(c, -w / 2, -24, w, 24, 6); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)"; A.rr(c, -w / 2 + 3, -24, w - 6, 5, 3); c.fill();
      c.strokeStyle = "rgba(90,80,65,.28)"; c.lineWidth = 1.5;
      for (let x = -w / 2 + 18, r = 0; x < w / 2; x += 26, r++) { c.beginPath(); c.moveTo(x + (r % 2) * 9, -18); c.lineTo(x + (r % 2) * 9, -2); c.stroke(); }
      c.beginPath(); c.moveTo(-w / 2, -11); c.lineTo(w / 2, -11); c.stroke();
    }, { kind: "wall" }));
    // flower island inside the loop driveway
    flowerBed(2390, 1800, 110, 16, 7); flowerBed(2510, 1800, 110, 16, 8);
    // mailbox
    const mb = add({
      kind: "prop", x: 2170, y: 1850, box: [-24, -86, 32, 6], shadow: [16, 6], flag: 0, solid: [{ c: [0, -2, 8] }],
      draw(c, E2, e) { P_.mailbox(c, e.flag); },
      update(e, dt) { if (e.flag > 0) e.flag = Math.max(0, e.flag - dt * 0.4); },
      tap: {
        reach: "walk", at: [26, 20], range: 40,
        act(E2, e) {
          if (e.cool > E2.t) return; e.cool = E2.t + 2.5;
          e.flag = 1;
          RW.sfx.play("paper");
          E2.burst(e.x, e.y, 66, "letter", 6, { up: 360, sp: 110 });
          E2.later(0.4, () => E2.say(e, U.pick(["A postcard from Mystery Island!?", "Dear Rosenbergs: you're awesome!", "Coupon: one free hug", "It's a birthday card!", "Bill... boring!"]), 2.4));
        },
      },
      bubbleH: 100,
    });
    // trash can (raccoon)
    trashCan(2110, 1845);
    // family car in the driveway (tap: honk)
    add({
      kind: "car", x: 2615, y: 1772, box: [-74, -114, 74, 8], shadow: [66, 14], squash: 0, flash: 0,
      solid: [{ r: [-56, -20, 56, 4] }],
      draw(c, E2, e) {
        A.drawCarFront(c, "#3F7FD9", Math.max(0, e.squash) * Math.sin(E2.t * 30));
        if (e.flash > 0) { c.fillStyle = `rgba(230,245,255,${e.flash * 0.8})`; c.beginPath(); c.arc(-48, -51, 16, 0, TAU); c.arc(48, -51, 16, 0, TAU); c.fill(); }
      },
      update(e, dt) { e.squash -= dt * 2; e.flash = Math.max(0, e.flash - dt * 2); },
      tap: {
        reach: "remote",
        act(E2, e) {
          if (e.cool > E2.t) return; e.cool = E2.t + 0.6; e.squash = 1; e.flash = 1;
          RW.sfx.play("honk"); E2.float(e.x, e.y - 100, "BEEP BEEP!", { size: 24, stroke: "#2F6BD6" });
          // the car goes to Fish Friday: walk to the driver's door
          goPlay(E2, DEST.car);
        },
      },
    });
  }

  function drawHouseLive(c, E2) {
    // Ikey watching TV in the living room
    const k = B.HOUSE_WINDOWS.ikey;
    c.save();
    A.rr(c, k.x, k.y, k.w, k.h, 3); c.clip();
    c.fillStyle = A.lin(c, 0, k.y, 0, k.y + k.h, ["#F6D9B8", "#E9C49C"]); c.fillRect(k.x, k.y, k.w, k.h);
    const flick = 0.55 + Math.sin(E2.t * 7) * 0.15 + Math.sin(E2.t * 23) * 0.1;
    c.fillStyle = `rgba(120,190,255,${flick * 0.55})`; c.fillRect(k.x, k.y, k.w, k.h);
    // TV at the right edge
    c.fillStyle = "#1E2230"; A.rr(c, k.x + k.w - 28, k.y + 16, 34, 26, 3); c.fill();
    c.fillStyle = `rgba(170,225,255,${flick})`; A.rr(c, k.x + k.w - 25, k.y + 19, 28, 20, 2); c.fill();
    // couch + Ikey
    c.fillStyle = "#C8553D"; A.rr(c, k.x + 6, k.y + k.h - 22, 60, 26, 8); c.fill();
    c.save(); c.translate(k.x + 38, k.y + k.h + 40); c.scale(0.7, 0.7);
    A.drawChar(c, A.CHARS.ikey, { t: E2.t, move: 0, side: 1, dir: 1, pose: "sit", blink: Math.sin(E2.t * 1.7) > 0.97 });
    c.restore();
    c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.moveTo(k.x + 10, k.y + k.h); c.lineTo(k.x + 34, k.y); c.lineTo(k.x + 50, k.y); c.lineTo(k.x + 26, k.y + k.h); c.fill();
    c.restore();
    // Cari passing the upstairs windows
    const cp = world.cariWindow;
    if (cp) {
      B.HOUSE_WINDOWS.up.forEach((w) => {
        const cx = cp.x;
        if (cx < w.x - 30 || cx > w.x + w.w + 30) return;
        c.save(); A.rr(c, w.x, w.y, w.w, w.h, 3); c.clip();
        c.fillStyle = "rgba(246,217,184,.85)"; c.fillRect(w.x, w.y, w.w, w.h);
        c.translate(cx, w.y + w.h + 44); c.scale(0.62, 0.62);
        A.drawChar(c, A.CHARS.cari, { t: E2.t, move: 1, side: 1, dir: cp.dir, pose: cp.wave ? "wave" : null });
        c.restore();
      });
    }
  }

  function trashCan(x, y) {
    return add({
      kind: "prop", x, y, box: [-22, -56, 22, 6], shadow: [16, 6], lid: 0, coon: 0, coonT: 0, solid: [{ c: [0, -2, 12] }], bubbleH: 90,
      draw(c, E2, e) {
        if (e.coon > 0) { c.save(); c.translate(0, -44); A.drawRaccoon(c, E2.t, e.coon); c.restore(); }
        P_.trashcan(c, e.lid);
      },
      update(e, dt) {
        if (e.coonT > 0) { e.coonT -= dt; e.coon = Math.min(1, e.coon + dt * 5); e.lid = Math.min(1, e.lid + dt * 6); }
        else { e.coon = Math.max(0, e.coon - dt * 4); if (e.coon === 0) e.lid = Math.max(0, e.lid - dt * 4); }
      },
      tap: {
        reach: "walk", at: [30, 22], range: 40,
        act(E2, e) {
          if (e.coonT > 0) return;
          e.coonT = 2.6;
          RW.sfx.play("giggle");
          E2.later(0.2, () => E2.say(e, U.pick(["*chitter chitter*", "This is MY snack!", "Hiss! ...just kidding."]), 2));
          E2.secret("raccoon", "A raccoon lives in the trash can!");
        },
      },
    });
  }

  // A resting basketball that shoots at a hoop when tapped.
  function hoopBall(x, y, hoop, standAt) {
    const ball = add({
      kind: "prop", x, y, box: [-14, -26, 14, 4], shadow: [12, 5], hidden: false,
      draw(c) { c.translate(0, -11); P_.basketball(c, 11); },
      tap: {
        reach: "walk", at: [standAt[0] - x, standAt[1] - y], range: 40, noFace: true,
        act(E2, e) { shootHoop(E2, hoop, e); },
      },
    });
    hoop.tap = { reach: "walk", at: [standAt[0] - hoop.x, standAt[1] - hoop.y], range: 40, noFace: true, act(E2) { shootHoop(E2, hoop, ball); } };
    return ball;
  }

  function shootHoop(E2, hoop, restBall) {
    const P = E2.player;
    if (P.lock || restBall.hidden) return;
    const id = P.id;
    E2.face(hoop.x + 0.1); P.side = 0; P.back = false;
    restBall.hidden = true;
    E2.act("shoot", 0.7, { prop: "basketball" });
    const rimY = hoop.y + (hoop.rimDy || 8), rimZ = 146;
    E2.later(0.4, () => {
      const make = id === "reuben" ? true : id === "jonah" ? U.chance(0.6) : false;
      const b = E2.spawnBall({ ball: "basketball", x: P.x, y: P.y + 2, z: P.spec.L + P.spec.T + 14, r: 11 });
      RW.sfx.play("swish");
      if (id === "ellie") {
        b.script = {
          t: 0, dur: 0.55, x0: b.x, y0: b.y, z0: b.z, x1: P.x + (hoop.x - P.x) * 0.2, y1: P.y + (rimY - P.y) * 0.2, z1: 0, apex: 50,
          done(bb) { bb.vz = 200; bb.vx = U.rand(-40, 40); bb.vy = 40; E2.say(P, U.pick(["Almost!", "Uh oh!", "Me did it!"]), 1.6); E2.act("celebrate", 1, { lock: false }); RW.sfx.play("giggle"); },
        };
      } else {
        b.script = {
          t: 0, dur: 0.85, x0: b.x, y0: b.y, z0: b.z, x1: hoop.x + (make ? 0 : U.pick([-14, 14])), y1: rimY, z1: rimZ + 6, apex: 120,
          done(bb) {
            if (make) {
              bb.z = rimZ - 4; bb.vz = -60; bb.vx = U.rand(-30, 30); bb.vy = 70;
              hoop.net = 1;
              RW.sfx.play("swish");
              E2.float(hoop.x, rimY - 190, id === "reuben" ? "SWISH!" : "BUCKET!", { size: 34 });
              E2.burst(hoop.x, rimY, rimZ, "sparkle", 10);
              E2.later(0.3, () => {
                if (id === "reuben") { E2.act("fist", 1.4, { lock: false }); E2.say(P, U.pick(["Nothing but net!", "Too easy!", "Reuben for three!"]), 1.8); }
                else { E2.act("celebrate", 1.2, { lock: false }); E2.say(P, "Yes! I did it!", 1.6); }
                RW.sfx.play("cheer");
              });
            } else {
              bb.vz = 260; bb.vx = (bb.x < hoop.x ? -1 : 1) * 160; bb.vy = 110;
              RW.sfx.play("bounce");
              E2.later(0.4, () => E2.say(P, U.pick(["So close!", "Rim! Aww.", "One more!"]), 1.5));
            }
          },
        };
      }
      E2.later(3.4, () => { E2.remove(b); restBall.hidden = false; E2.burst(restBall.x, restBall.y, 10, "sparkle", 4); });
    });
  }

  // ---------------------------------------------------------------------
  // BACKYARD + BACKYARD BASEBALL
  // ---------------------------------------------------------------------
  function buildBackyardAndBaseball() {
    const Hm = L.home, R = L.fenceR;
    // outfield fence in segments (so things sort correctly around it)
    const a0 = -Math.PI * 0.75, a1 = -Math.PI * 0.25, N = 10;
    for (let i = 0; i < N; i++) {
      const sa = a0 + ((a1 - a0) * i) / N, ea = a0 + ((a1 - a0) * (i + 1)) / N;
      const p0 = [Hm.x + Math.cos(sa) * R, Hm.y + Math.sin(sa) * R], p1 = [Hm.x + Math.cos(ea) * R, Hm.y + Math.sin(ea) * R];
      const x = (p0[0] + p1[0]) / 2, y = Math.max(p0[1], p1[1]);
      const solid = [];
      for (let k = 0; k <= 3; k++) { const u = k / 3; solid.push({ c: [p0[0] + (p1[0] - p0[0]) * u - x, p0[1] + (p1[1] - p0[1]) * u - y, 14] }); }
      const label = i === 4 ? "400" : i === 0 ? "330" : i === N - 1 ? "330" : null;
      staticProp(x, y, [Math.min(p0[0], p1[0]) - x - 10, Math.min(p0[1], p1[1]) - y - 76, Math.max(p0[0], p1[0]) - x + 10, 10], (c) => {
        const ax = p0[0] - x, ay = p0[1] - y, bx = p1[0] - x, by = p1[1] - y;
        c.fillStyle = "#1F5D3A";
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx, by - 62); c.lineTo(ax, ay - 62); c.closePath(); c.fill();
        c.fillStyle = "rgba(255,255,255,.07)";
        c.beginPath(); c.moveTo(ax, ay - 30); c.lineTo(bx, by - 30); c.lineTo(bx, by - 62); c.lineTo(ax, ay - 62); c.closePath(); c.fill();
        c.strokeStyle = "#F2C230"; c.lineWidth = 7; c.lineCap = "round";
        c.beginPath(); c.moveTo(ax, ay - 64); c.lineTo(bx, by - 64); c.stroke();
        c.fillStyle = "#143F28"; c.fillRect(ax - 3, ay - 64, 6, 64);
        if (label) A.text(c, label, (ax + bx) / 2, (ay + by) / 2 - 34, 20, "#FFFFFF", { weight: 700 });
      }, { solid, kind: "fence" });
    }
    // scoreboard beyond center field
    staticProp(Hm.x, Hm.y - R - 60, [-170, -290, 170, 10], (c) => {
      [-110, 110].forEach((x) => { c.fillStyle = "#3A4252"; A.rr(c, x - 7, -120, 14, 120, 4); c.fill(); });
      c.fillStyle = "rgba(20,30,50,.25)"; A.rr(c, -156, -276, 318, 170, 18); c.fill();
      c.fillStyle = A.lin(c, 0, -280, 0, -110, ["#1F5D3A", "#153F28"]); A.rr(c, -160, -282, 320, 170, 18); c.fill();
      c.fillStyle = "#0E2A1B"; A.rr(c, -146, -236, 292, 110, 10); c.fill();
      A.text(c, "ROSENBERG FIELD", 0, -259, 22, "#FFFFFF", { weight: 700 });
      A.text(c, "HOME", -70, -214, 18, "#9FE3B4", { weight: 700 }); A.text(c, "AWAY", 70, -214, 18, "#9FE3B4", { weight: 700 });
      A.text(c, "99", -70, -168, 46, "#FFD23F", { weight: 700 }); A.text(c, "10", 70, -168, 46, "#FFD23F", { weight: 700 });
    }, {
      kind: "scoreboard", solid: [{ r: [-120, -8, 120, 4] }],
      live(c, E2) { const on = Math.floor(E2.t * 2) % 2; ["#FF5C5C", "#FFD23F", "#5CFF8A"].forEach((col, i) => { c.fillStyle = (on + i) % 2 ? col : "rgba(255,255,255,.15)"; c.beginPath(); c.arc(-24 + i * 24, -136, 6, 0, TAU); c.fill(); }); },
    });
    // dugouts
    [[Hm.x - 215, Hm.y + 55], [Hm.x + 215, Hm.y + 55]].forEach(([x, y], i) => staticProp(x, y, [-78, -92, 78, 8], (c) => {
      c.fillStyle = "#2F3A52"; A.rr(c, -70, -70, 140, 70, 6); c.fill();
      c.fillStyle = "#171E2E"; A.rr(c, -62, -60, 124, 56, 4); c.fill();
      c.fillStyle = "#B87644"; A.rr(c, -56, -26, 112, 10, 3); c.fill();
      c.fillStyle = A.lin(c, 0, -90, 0, -66, ["#2E8B57", "#1F5D3A"]); A.rr(c, -78, -90, 156, 24, 8); c.fill();
      A.text(c, i ? "VISITORS" : "HOME", 0, -78, 13, "#FFFFFF", { weight: 700 });
    }, { kind: "dugout", solid: [{ r: [-70, -30, 70, 0] }], shadow: [70, 10] }));
    // backstop behind home plate
    staticProp(Hm.x, Hm.y + 70, [-120, -150, 120, 8], (c) => {
      c.strokeStyle = "#3A4252"; c.lineWidth = 6;
      [-104, -52, 0, 52, 104].forEach((x) => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, -130 + Math.abs(x) * 0.25); c.stroke(); });
      c.strokeStyle = "rgba(200,210,225,.65)"; c.lineWidth = 1.2;
      for (let x = -104; x < 104; x += 9) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 30, -120); c.stroke(); c.beginPath(); c.moveTo(x + 30, 0); c.lineTo(x, -120); c.stroke(); }
      c.strokeStyle = "#3A4252"; c.lineWidth = 5; c.beginPath(); c.moveTo(-104, -104); c.quadraticCurveTo(0, -140, 104, -104); c.stroke();
    }, { kind: "fence", solid: [{ r: [-104, -8, 104, 4] }] });
    // home plate: Reuben calls his shot
    add({
      kind: "plate", layer: "ground", x: Hm.x, y: Hm.y, box: [-40, -30, 40, 24], hit: [-60, -60, 60, 30],
      draw(c) { c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(-10, -6); c.lineTo(10, -6); c.lineTo(10, 2); c.lineTo(0, 8); c.lineTo(-10, 2); c.closePath(); c.fill(); },
      tap: { reach: "walk", at: [-34, 4], range: 40, noFace: true, act: (E2) => homePlate(E2) },
    });
    // bat leaning on the backstop (just decoration)
    staticProp(Hm.x - 60, Hm.y + 66, [-10, -60, 16, 4], (c) => { c.rotate(0.25); c.fillStyle = A.lin(c, 0, 0, 0, -50, ["#9B6A3A", "#E2B27A"]); c.beginPath(); c.moveTo(-2, 0); c.lineTo(2, 0); c.lineTo(5, -50); c.quadraticCurveTo(0, -55, -5, -50); c.closePath(); c.fill(); });
    marquee(2800, 1200, ["BACKYARD", "BASEBALL"], "#2E8B57", "baseball", { size: 26 });

    // ---- backyard fun (kept north of the roof line so it stays visible) ----
    // swing set
    add({
      kind: "prop", x: 2150, y: 1300, box: [-70, -110, 70, 8], shadow: [60, 10], push: 0,
      solid: [{ r: [-60, -6, -44, 2] }, { r: [44, -6, 60, 2] }],
      draw(c, E2, e) { P_.swing(c, E2.t * (1 + e.push * 2) , false); },
      update(e, dt) { e.push = Math.max(0, e.push - dt * 0.3); },
      tap: { reach: "walk", at: [0, 40], range: 50, act(E2, e) { e.push = 1; RW.sfx.play("boing"); E2.say(E2.player, U.pick(["Wheee!", "Higher!", "Push me!"]), 1.4); E2.act("celebrate", 0.8, { lock: false }); } },
    });
    // trampoline
    const tramp = add({
      kind: "prop", x: 2560, y: 1300, box: [-56, -44, 56, 6], shadow: [52, 12], dip: 0,
      draw(c, E2, e) { P_.trampoline(c, e.dip); },
      update(e, dt) { e.dip = Math.max(0, e.dip - dt * 4); },
      tap: { reach: "walk", at: [0, 2], range: 30, noFace: true, act: (E2, e) => trampoline(E2, e) },
    });
    world.tramp = tramp;
    // sprinkler
    add({
      kind: "prop", x: 2255, y: 1215, box: [-20, -24, 20, 4], on: 0,
      draw(c, E2, e) { P_.sprinkler(c, e.on > 0, E2.t); },
      update(e, dt, E2) {
        if (e.on > 0) {
          e.on -= dt;
          const P = E2.player;
          if (P && Math.hypot(P.x - e.x, P.y - e.y) < 100 && U.chance(dt * 6)) { E2.burst(P.x, P.y, 80, "splash", 3, { up: 140 }); if (U.chance(0.1)) E2.say(P, U.pick(["So cold!", "Hahaha!", "I'm wet!"]), 1.2); }
        }
      },
      tap: { reach: "walk", at: [40, 16], range: 40, act(E2, e) { e.on = e.on > 0 ? 0 : 7; RW.sfx.play("splash"); if (e.on) E2.say(E2.player, "Sprinkler time!", 1.4); } },
    });
    // grill on the little patio
    add({
      kind: "prop", x: 2385, y: 1292, box: [-30, -72, 30, 4], shadow: [22, 7], glow: 0, solid: [{ c: [0, -2, 14] }], bubbleH: 90,
      draw(c, E2, e) { P_.grill(c, e.glow); },
      update(e, dt, E2) { e.glow = Math.max(0, e.glow - dt * 0.3); if (U.chance(dt * 0.4)) E2.burst(e.x, e.y, 64, "smoke", 1, { sp: 10, up: 20 }); },
      tap: { reach: "walk", at: [-36, 20], range: 40, act(E2, e) { e.glow = 1; RW.sfx.play("sizzle"); E2.burst(e.x, e.y, 64, "smoke", 8, { sp: 30, up: 60 }); E2.burst(e.x, e.y, 70, "smell", 3, { sp: 20, up: 30 }); E2.say(E2.player, U.pick(["Mmm! Smells good!", "Is it ready yet?", "Sizzle sizzle!"]), 1.6); } },
    });
    // the backyard soccer ball (kick it toward the field and the dog goes for it)
    world.yardBall = kickBall(2470, 1222, "soccer");
    tree(1965, 1195, "round", 1.25);
    tree(2940, 1180, "deep", 1.05);
    bush(2050, 1320, 0.9, "#FFD23F");
  }

  function homePlate(E2) {
    const P = E2.player, id = P.id;
    P.dir = 1; P.side = 1; P.back = false;
    if (id === "reuben") {
      E2.say(P, "Calling my shot!", 1.6);
      E2.act("point", 1.5, { prop: "bat" }).then(() => {
        E2.act("swing", 0.9, { prop: "bat" });
        E2.later(0.3, () => {
          RW.sfx.play("crack");
          E2.shake(4);
          E2.flyBaseball(L.home.x + 10, L.home.y - 40, L.home.x + 40, L.home.y - L.fenceR - 260, 2.1, 520);
          E2.lookAt(L.home.x, L.home.y - 330, 2.4);
          E2.later(1.9, () => {
            E2.float(L.home.x, L.home.y - L.fenceR - 90, "HOME RUN!", { size: 46, stroke: "#1F5D3A" });
            E2.burst(L.home.x, L.home.y - L.fenceR, 60, "confetti", 30, { up: 420, sp: 180 });
            RW.sfx.play("cheer");
            world.dogGoto && world.dogGoto(L.home.x, L.home.y - L.fenceR + 50);
          });
          E2.later(0.9, () => { E2.act("fist", 2, { lock: false }); E2.say(P, "Told you!", 1.8); });
          E2.secret("calledShot", "Reuben called his shot!");
        });
      });
    } else if (id === "jonah") {
      E2.say(P, "Batter up!", 1.2);
      E2.act("swing", 0.7, { prop: "bat" }).then(() => {
        E2.act("fall", 1.2);
        RW.sfx.play("boing");
        E2.say(P, "Whoa! Dizzy!", 1.5);
        E2.burst(P.x, P.y, 60, "sparkle", 6);
      });
    } else {
      E2.act("look", 1.6, { prop: "bat" });
      E2.say(P, "Too heavy!", 1.6);
      RW.sfx.play("giggle");
    }
  }

  function trampoline(E2, tr) {
    const P = E2.player, id = P.id;
    if (P.lift > 1) return;
    P.x = tr.x; P.y = tr.y + 2; P.path = null;
    const now = E2.t;
    if (!P.trampLast || now - P.trampLast > 5) P.trampCount = 0;
    P.trampLast = now;
    P.trampCount += 1;
    tr.dip = 1;
    let v = id === "ellie" ? 520 : id === "jonah" ? 700 : 600;
    let mega = false;
    if (id === "ellie" && P.trampCount >= 5) { v = 1750; mega = true; P.trampCount = 0; }
    if (id === "jonah" && P.trampCount >= 4) { v = 950; P.trampCount = 0; E2.say(P, "SUPER JUMP!", 1.5); }
    E2.act("jump", 0, { lock: true });
    E2.jump(v);
    RW.sfx.play(mega ? "bigBoing" : "boing");
    if (mega) { E2.say(P, "WHEEEEEEE!", 2.4); E2.later(0.9, () => E2.burst(P.x, P.y, P.lift, "sparkle", 12)); }
    else if (id === "ellie" && P.trampCount >= 3) E2.say(P, U.pick(["Again!", "Higher!", "More!"]), 1.2);
    P.onLand = () => {
      tr.dip = 1;
      P.pose = null; P.lock = false;
      RW.sfx.play("bounce");
      if (mega) { E2.shake(8); E2.burst(P.x, P.y, 10, "dust", 8); E2.act("celebrate", 1.2, { lock: false }); E2.secret("ellieHigh", "Ellie went ridiculously high!"); }
    };
  }

  // A kickable ball (soccer or beach).
  function kickBall(x, y, type) {
    const b = E.spawnBall({ ball: type, x, y, r: type === "beach" ? 15 : 11, bounce: type === "beach" ? 0.75 : 0.55, friction: type === "beach" ? 0.9 : 1.3, home: [x, y] });
    b.tap = {
      reach: "remote",
      act(E2, bb) {
        const P = E2.player;
        if (P.lock || bb.held) return;
        const dx = bb.x - P.x, dy = bb.y - P.y, d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d;
        const kick = () => {
          if (bb.held) return;
          const kx = bb.x - P.x, ky = bb.y - P.y, kd = Math.hypot(kx, ky) || 1;
          E2.face(bb.x);
          E2.act("kick", 0.5);
          E2.later(0.18, () => {
            const id = P.id;
            const pow = id === "jonah" ? 620 : id === "reuben" ? 440 : 150;
            bb.vx = (kx / kd) * pow; bb.vy = (ky / kd) * pow * 0.9; bb.vz = id === "jonah" ? 260 : 160; bb.rest = false;
            bb.kickedBy = id;
            RW.sfx.play("kick");
            E2.burst(bb.x, bb.y, 4, "dust", 4);
            if (id === "jonah") { E2.later(0.25, () => E2.say(P, U.pick(["GOLAZO!", "Messi style!", "Boom!"]), 1.4)); }
            if (id === "ellie") E2.later(0.3, () => { E2.act("fall", 1.1); RW.sfx.play("giggle"); E2.say(P, "Oopsie!", 1.3); });
          });
        };
        const ax = bb.x - ux * 30, ay = bb.y - uy * 22;
        if (d < 60) kick();
        else E2.walkTo(ax, ay, () => { if (Math.hypot(bb.x - P.x, bb.y - P.y) < 80) kick(); }, 6);
      },
    };
    b.onMove = (bb) => {
      if (world.onBallMove) world.onBallMove(bb);
      if (bb.type !== "beach" && bb.ball === "soccer") {
        // goals on the soccer field
        if (bb.y > 2160 && bb.y < 2260 && (bb.x < 930 || bb.x > 1370) && bb.x > 880 && bb.x < 1420 && !bb.scored) {
          bb.scored = true;
          E.float(bb.x, bb.y - 80, "GOOOAL!", { size: 40, stroke: "#2E8B57" });
          E.burst(bb.x, bb.y, 30, "confetti", 24, { up: 380 });
          RW.sfx.play("cheer");
          E.later(2, () => (bb.scored = false));
        }
      }
    };
    return b;
  }
  world.kickBall = kickBall;

  // ---------------------------------------------------------------------
  // ARIEL'S KITCHEN
  // ---------------------------------------------------------------------
  function buildKitchen() {
    const kx = 1420, ky = 1720;
    add({
      kind: "building", x: kx, y: ky, box: [-260, -350, 260, 24], sprite: true, occludes: true,
      solid: [{ r: [-222, -170, 222, -4] }, { r: [118, -10, 182, 10] }],
      draw: (c) => B.kitchen(c),
      live: (c, E2) => drawKitchenLive(c, E2),
      tap: portalTap("kitchen"),
      hit: [-250, -340, 250, 10],
    });
    const k = B.KITCHEN_WINDOW;
    hotspot(kx, ky, [k.x - 10, k.y - 50, k.x + k.w + 10, k.y + k.h + 10], {
      reach: "remote",
      act(E2) {
        world.kitchenWave = E2.t + 1.6;
        RW.sfx.play("giggle");
        E2.burst(kx + k.x + k.w / 2, ky, 150, "smell", 4, { sp: 30, up: 50 });
        const bub = { x: kx - 50, y: ky - 40, bubbleH: 160 };
        E2.say(bub, U.pick(["Dinner's almost ready!", "No peeking at dessert!", "Who wants to taste?", "Wash your hands!"]), 2.2);
        if (!RW.collection.has("chefhat") && !world.chefHatOut) {
          world.chefHatOut = true;
          E2.later(0.8, () => world.popItem("chefhat", kx - 40, ky - 120, kx + 90, ky + 70));
        }
      },
    }, ky + 1);
    marquee(1180, 1805, ["ARIEL'S", "PASSOVER COOKOUT"], "#E8743C", "kitchen", { size: 24 });
    // patio table with umbrella
    staticProp(1720, 1800, [-64, -104, 64, 10], (c) => {
      P_.umbrella(c, "#E8453C", "#FFFFFF");
      c.fillStyle = "#FFFFFF"; A.ell(c, 0, -30, 40, 12); c.fill();
      c.fillStyle = "#D9D2C4"; c.fillRect(-4, -30, 8, 30);
      [-30, 30].forEach((x) => { c.fillStyle = "#E8743C"; A.rr(c, x - 10, -22, 20, 22, 4); c.fill(); });
    }, { solid: [{ c: [0, -4, 30] }], shadow: [44, 12] });
    tree(1140, 1560, "round", 1.1); tree(1700, 1560, "blossom", 1);
    bush(1260, 1722, 0.8, "#FF6B8B"); bush(1640, 1724, 0.7, "#FFFFFF");
  }

  function drawKitchenLive(c, E2) {
    const k = B.KITCHEN_WINDOW;
    c.save();
    A.rr(c, k.x, k.y, k.w, k.h, 4); c.clip();
    // back wall tiles
    c.fillStyle = "#FFF8EC"; c.fillRect(k.x, k.y, k.w, k.h);
    c.strokeStyle = "rgba(47,156,134,.25)"; c.lineWidth = 1;
    for (let x = k.x; x < k.x + k.w; x += 14) { c.beginPath(); c.moveTo(x, k.y); c.lineTo(x, k.y + k.h); c.stroke(); }
    for (let y = k.y; y < k.y + k.h; y += 14) { c.beginPath(); c.moveTo(k.x, y); c.lineTo(k.x + k.w, y); c.stroke(); }
    // shelves with jars
    c.fillStyle = "#B87644"; c.fillRect(k.x + 10, k.y + 20, 70, 5);
    ["#E8453C", "#FFD23F", "#2EB872"].forEach((col, i) => { c.fillStyle = col; A.rr(c, k.x + 16 + i * 22, k.y + 6, 14, 14, 3); c.fill(); });
    // Ariel stirring the pot
    const waving = world.kitchenWave > E2.t;
    c.save(); c.translate(k.x + 176, k.y + k.h + 20); c.scale(0.95, 0.95);
    A.drawChar(c, A.CHARS.ariel, { t: E2.t, move: 0, side: 0, dir: -1, pose: waving ? "wave" : "stir" });
    c.restore();
    // stove + pot + steam
    c.fillStyle = "#3A4252"; c.fillRect(k.x + 60, k.y + k.h - 22, 70, 22);
    c.fillStyle = "#C9CDD8"; A.rr(c, k.x + 70, k.y + k.h - 46, 44, 26, 6); c.fill();
    c.fillStyle = "#AEB3C0"; c.fillRect(k.x + 66, k.y + k.h - 48, 52, 5);
    for (let i = 0; i < 3; i++) {
      const u = (E2.t * 0.6 + i / 3) % 1;
      c.fillStyle = `rgba(255,255,255,${0.6 * (1 - u)})`;
      c.beginPath(); c.arc(k.x + 84 + i * 8 + Math.sin(E2.t * 3 + i) * 5, k.y + k.h - 52 - u * 40, 6 + u * 6, 0, TAU); c.fill();
    }
    // Max zooming past with a spoon
    const mp = world.maxWindow;
    if (mp) { c.save(); c.translate(k.x + mp * (k.w + 80) - 40, k.y + k.h + 30); c.scale(0.75, 0.75); A.drawChar(c, A.CHARS.max, { t: E2.t, move: 1, side: 1, dir: 1, pose: "spoon" }); c.restore(); }
    // glass shine
    c.fillStyle = "rgba(255,255,255,.18)";
    c.beginPath(); c.moveTo(k.x + 20, k.y + k.h); c.lineTo(k.x + 60, k.y); c.lineTo(k.x + 90, k.y); c.lineTo(k.x + 50, k.y + k.h); c.fill();
    c.restore();
    // window frame bars on top of the scene
    c.fillStyle = "#FFFFFF"; c.fillRect(k.x + k.w / 2 - 2, k.y, 4, k.h);
  }

  // ---------------------------------------------------------------------
  // MATH BLASTER ACADEMY
  // ---------------------------------------------------------------------
  function buildAcademy() {
    const ax = 1450, ay = 900;
    add({
      kind: "building", x: ax, y: ay, box: [-215, -390, 215, 24], sprite: true, occludes: true,
      solid: [{ r: [-190, -150, 190, -4] }],
      draw: (c) => B.academy(c),
      tap: portalTap("mathblaster"),
      live(c, E2) {
        // glowing strips pulse
        const g = 0.45 + Math.sin(E2.t * 3) * 0.35;
        c.fillStyle = `rgba(88,225,255,${g})`; c.fillRect(-190, -148, 380, 4); c.fillRect(-190, -16, 380, 3);
        // orbiting planet above the dome
        const a = E2.t * 0.8, px = Math.cos(a) * 130, py = -340 + Math.sin(a) * 26;
        c.save(); c.globalAlpha = 0.9;
        c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.5; A.ell(c, 0, -340, 130, 26); c.stroke();
        c.beginPath(); c.arc(px, py, 14, 0, TAU); c.fillStyle = A.gloss(c, px, py, 14, "#FF8A3D"); c.fill();
        c.strokeStyle = "#FFD23F"; c.lineWidth = 3; A.ell(c, px, py, 24, 6, -0.3); c.stroke();
        const bx = Math.cos(a + Math.PI) * 130, by = -340 + Math.sin(a + Math.PI) * 26;
        c.beginPath(); c.arc(bx, by, 9, 0, TAU); c.fillStyle = A.gloss(c, bx, by, 9, "#4FB3E8"); c.fill();
        c.restore();
        // floating math
        const bits = ["7×8", "×", "=", "42", "9×9", "+", "81", "6×7", "÷", "12"];
        bits.forEach((s, i) => {
          const t = E2.t * 0.35 + i * 0.63;
          const x = Math.sin(t * 1.3 + i) * 190, y = -230 - ((t * 40 + i * 37) % 170);
          const alpha = 0.3 + 0.6 * Math.sin(((t * 40 + i * 37) % 170) / 170 * Math.PI);
          c.globalAlpha = alpha;
          A.text(c, s, x, y, 22 + (i % 3) * 5, ["#58E1FF", "#FF5C8A", "#FFD23F"][i % 3], { weight: 700, stroke: "rgba(20,30,70,.5)", strokeW: 4 });
        });
        c.globalAlpha = 1;
      },
      hit: [-200, -380, 200, 10],
    });
    marquee(1700, 1005, ["MATH", "BLASTER"], "#1FA4E0", "mathblaster", { size: 30 });
    // rocket statue
    staticProp(1200, 930, [-44, -210, 44, 10], (c) => drawRocket(c, 0.8, "#FFFFFF", "#FF5C8A"), {
      kind: "rocket", solid: [{ c: [0, -4, 26] }], shadow: [36, 10], bubbleH: 190,
      tap: { reach: "remote", act(E2, e) { if (e.cool > E2.t) return; e.cool = E2.t + 2; RW.sfx.play("rumble"); E2.burst(e.x, e.y, 10, "smoke", 8, { sp: 60, up: 30 }); E2.say(e, "Numbers are rocket fuel!", 1.8); } },
    });
    tree(1180, 760, "deep", 1); tree(1720, 780, "round", 1.05);
  }

  function drawRocket(c, s, body, fin) {
    c.save(); c.scale(s, s);
    // fins
    c.fillStyle = fin;
    c.beginPath(); c.moveTo(-34, -20); c.quadraticCurveTo(-60, 0, -58, 10); c.lineTo(-28, -8); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(34, -20); c.quadraticCurveTo(60, 0, 58, 10); c.lineTo(28, -8); c.closePath(); c.fill();
    // body
    c.beginPath(); c.moveTo(-34, -10); c.bezierCurveTo(-40, -120, -24, -210, 0, -250); c.bezierCurveTo(24, -210, 40, -120, 34, -10); c.closePath();
    c.fillStyle = A.lin(c, -34, 0, 34, 0, [A.shade(body, -0.12), body, A.shade(body, -0.25)]); c.fill();
    c.fillStyle = fin; c.beginPath(); c.moveTo(-14, -218); c.bezierCurveTo(-8, -236, 8, -236, 14, -218); c.quadraticCurveTo(0, -260, -14, -218); c.fill();
    c.beginPath(); c.moveTo(-26, -200); c.quadraticCurveTo(0, -206, 26, -200); c.lineTo(20, -220); c.quadraticCurveTo(0, -250, -20, -220); c.closePath(); c.fill();
    c.fillStyle = "#2B2F3A"; c.beginPath(); c.arc(0, -130, 20, 0, TAU); c.fill();
    c.fillStyle = A.rad(c, -6, -136, 2, 0, -130, 16, ["#DDF6FF", "#58C8F2"]); c.beginPath(); c.arc(0, -130, 15, 0, TAU); c.fill();
    c.fillStyle = fin; c.beginPath(); c.moveTo(-6, -30); c.lineTo(6, -30); c.lineTo(4, 10); c.lineTo(-4, 10); c.closePath(); c.fill();
    c.fillStyle = "#3A4252"; A.rr(c, -22, -14, 44, 14, 4); c.fill();
    c.restore();
  }

  // ---------------------------------------------------------------------
  // FART MAN LANDING ZONE
  // ---------------------------------------------------------------------
  function buildFartMan() {
    // big rocket with steam
    staticProp(3545, 790, [-60, -290, 60, 10], (c) => drawRocket(c, 1.05, "#F4F6FF", "#7B3FE4"), {
      kind: "rocket", solid: [{ c: [0, -6, 36] }], shadow: [46, 12], bubbleH: 280,
      live(c, E2) { if (Math.sin(E2.t * 0.7) > 0.6) { c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(-30 - ((E2.t * 30) % 30), -8, 12, 0, TAU); c.fill(); } },
      tap: {
        reach: "remote",
        act(E2, e) {
          if (e.cool > E2.t) return; e.cool = E2.t + 3; RW.sfx.play("rumble"); E2.shake(4); E2.burst(e.x, e.y, 6, "smoke", 14, { sp: 120, up: 40 }); E2.say(e, "3... 2... 1... blast off to the moon!", 2);
          // the big rocket is Lunar Lander: walk to its hatch
          goPlay(E2, DEST.lunar);
        },
      },
    });
    staticProp(3890, 725, [-40, -190, 40, 10], (c) => drawRocket(c, 0.62, "#FFE45C", "#2EB872"), { kind: "rocket", solid: [{ c: [0, -4, 22] }], shadow: [26, 8] });
    // launch gantry
    staticProp(3830, 800, [-40, -250, 70, 10], (c) => {
      c.strokeStyle = "#E8453C"; c.lineWidth = 6;
      [-24, 24].forEach((x) => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, -230); c.stroke(); });
      c.lineWidth = 3;
      for (let y = 0; y > -230; y -= 30) { c.beginPath(); c.moveTo(-24, y); c.lineTo(24, y - 30); c.moveTo(24, y); c.lineTo(-24, y - 30); c.stroke(); }
      c.fillStyle = "#3A4252"; A.rr(c, -30, -240, 90, 14, 4); c.fill();
      c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(50, -246, 7, 0, TAU); c.fill();
    }, { kind: "gantry", solid: [{ r: [-28, -8, 28, 4] }], shadow: [34, 8] });
    // the moon balloon (tap it five times...)
    const moon = add({
      kind: "moon", x: 3615, y: 705, box: [-70, -300, 70, 10], hit: [-70, -300, 70, -150], taps: 0, wob: 0, bubbleH: 310,
      draw(c, E2, e) {
        const bob = Math.sin(E2.t * 1.4) * 8, sw = Math.sin(E2.t * 0.9) * 10 + Math.sin(E2.t * 30) * e.wob * 8;
        A.shadow(c, 0, 0, 40, 12, 0.14);
        c.strokeStyle = "rgba(90,90,110,.7)"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sw * 0.5, -110, sw, -170 + bob); c.stroke();
        c.fillStyle = "#3A4252"; A.rr(c, -8, -8, 16, 8, 3); c.fill();
        const mx = sw, my = -222 + bob, r = 56 * (1 + e.wob * 0.1);
        c.fillStyle = "rgba(255,250,210,.25)"; c.beginPath(); c.arc(mx, my, r + 14, 0, TAU); c.fill();
        c.fillStyle = A.rad(c, mx - r * 0.35, my - r * 0.35, 4, mx, my, r, ["#FFFDF0", "#EFE9D2", "#C4BDA2"]);
        c.beginPath(); c.arc(mx, my, r, 0, TAU); c.fill();
        [[-0.3, -0.25, 0.2], [0.3, 0.05, 0.16], [0, 0.42, 0.12], [-0.45, 0.28, 0.1]].forEach(([dx, dy, rr2]) => { c.fillStyle = "rgba(160,150,120,.4)"; c.beginPath(); c.arc(mx + dx * r, my + dy * r, rr2 * r, 0, TAU); c.fill(); });
        // sleepy moon face
        c.strokeStyle = "#8C7F5E"; c.lineWidth = 2.5; c.lineCap = "round";
        c.beginPath(); c.arc(mx - 16, my - 4, 7, 0.2, Math.PI - 0.2); c.stroke(); c.beginPath(); c.arc(mx + 16, my - 4, 7, 0.2, Math.PI - 0.2); c.stroke();
        c.beginPath(); c.arc(mx, my + 14, 9, 0.3, Math.PI - 0.3); c.stroke();
      },
      update(e, dt) { e.wob = Math.max(0, e.wob - dt * 2); },
      tap: {
        reach: "remote",
        act(E2, e) {
          e.wob = 1; e.taps += 1;
          RW.sfx.play("boing");
          if (e.taps >= 5) {
            e.taps = 0;
            E2.say(e, "Here he comes!", 1.6);
            E2.later(0.6, () => { E2.flyFartMan({ y: 0.22 }); });
            E2.later(2.2, () => { if (!RW.collection.has("moonrock")) world.popItem("moonrock", e.x, e.y - 200, e.x + 90, e.y + 110); });
            E2.secret("moonFart", "Tap the moon five times... FART MAN!");
          } else E2.float(e.x, e.y - 300, ["Boing!", "Hee!", "Tickles!", "One more..."][e.taps - 1] || "Boing!", { size: 22, stroke: "#8C7F5E" });
        },
      },
    });
    // telescope
    staticProp(3880, 925, [-30, -90, 40, 8], (c) => {
      [-14, 0, 14].forEach((x) => A.line(c, 0, -46, x, 0, 3, "#3A4252"));
      c.save(); c.translate(0, -52); c.rotate(-0.6);
      c.fillStyle = A.lin(c, 0, -10, 0, 10, ["#8FA3D8", "#4B5C9E"]); A.rr(c, -26, -9, 60, 18, 8); c.fill();
      c.fillStyle = "#2B2F3A"; A.rr(c, 30, -11, 10, 22, 3); c.fill();
      c.restore();
    }, {
      kind: "telescope", shadow: [18, 6], solid: [{ c: [0, -2, 12] }],
      tap: { reach: "walk", at: [-34, 16], range: 40, act(E2) { E2.say(E2.player, "Whoa! The moon!", 1.2); E2.later(0.4, () => E2.openScope()); RW.sfx.play("sparkle"); } },
    });
    // silly warning signs
    sign(3440, 770, ["HOLD YOUR", "NOSE ZONE"], { size: 17, board: "#FFE45C", edge: "#2B2F3A", ink: "#2B2F3A" });
    sign(3995, 860, ["CAUTION:", "LOW-FLYING", "HERO"], { size: 16, board: "#FFE45C", edge: "#2B2F3A", ink: "#2B2F3A" });
    sign(3930, 1060, ["NO SNIFFING", "PAST THIS POINT"], { size: 15, board: "#FFFFFF", edge: "#E8453C", ink: "#E8453C" });
    // star sculptures
    [[3450, 640], [3990, 700], [3700, 600]].forEach(([x, y], i) => staticProp(x, y, [-30, -140, 30, 6], (c) => {
      A.line(c, 0, 0, 0, -90, 5, "#9AA1B4");
      A.softStar(c, 0, -110, 26); c.fillStyle = A.rad(c, -8, -118, 2, 0, -110, 28, ["#FFF7C2", "#FFD23F", "#F29E0C"]); c.fill();
    }, { solid: [{ c: [0, -2, 6] }], live(c, E2) { c.globalAlpha = 0.4 + Math.sin(E2.t * 3 + i) * 0.4; c.fillStyle = "#FFFFFF"; A.starPath(c, 12, -122, 7, 4, 0.3); c.fill(); c.globalAlpha = 1; } }));
    marquee(3500, 1035, ["FART MAN", "LUNAR LANDER"], "#7B3FE4", "fartman", { size: 26 });
    // Fart Man hovering over the pad now and then (tap him!)
    world.hover = add({
      kind: "fartman", x: 3720, y: 830, box: [-80, -330, 80, 10], hit: [-80, -330, 80, -170], visible: 0, t0: 0, bubbleH: 330, hidden: false,
      draw(c, E2, e) {
        if (e.visible <= 0) return;
        const a = Math.min(1, e.visible);
        const bob = Math.sin(E2.t * 2.4) * 12;
        A.shadow(c, 0, 0, 40 * a, 12 * a, 0.15);
        c.save(); c.globalAlpha = a; c.translate(0, -240 + bob); c.rotate(-0.25);
        A.drawFartMan(c, E2.t, 1.1);
        c.restore();
      },
      update(e, dt, E2) {
        e.t0 += dt;
        const cycle = e.t0 % 34;
        const target = cycle > 20 && cycle < 30 ? 1 : 0;
        e.visible = U.clamp(e.visible + (target ? dt : -dt) * 1.5, 0, 1);
        if (e.visible > 0.5 && U.chance(dt * 5)) E2.burst(e.x - 10, e.y, 200 + Math.sin(E2.t * 2.4) * 12, "fart", 1, { sp: 20, up: -30 });
        e.hidden = false;
      },
      tap: {
        reach: "remote",
        act(E2, e) {
          if (e.visible < 0.5) return;
          E2.say(e, U.pick(["Fart Man, away!", "Power... engaged!", "Stay stinky, citizen!"]), 1.6);
          E2.later(0.8, () => { e.visible = 0; e.t0 = 0; E2.flyFartMan({ y: 0.3 }); });
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // MYSTERY PLAZA
  // ---------------------------------------------------------------------
  function buildPlaza() {
    const Pz = L.plaza;
    // fountain
    add({
      kind: "fountain", x: Pz.x, y: Pz.y + 40, box: [-100, -170, 100, 20], shadow: [90, 20], splash: 0,
      solid: [{ c: [0, -40, 78] }], sortY: Pz.y + 40,
      draw(c, E2, e) { drawFountain(c, E2.t, e.splash); },
      update(e, dt) { e.splash = Math.max(0, e.splash - dt); },
      tap: {
        reach: "walk", at: [0, 44], range: 40, noFace: true,
        act(E2, e) {
          const P = E2.player;
          E2.face(P.x + (P.x < e.x ? 1 : -1)); P.side = 0; P.back = true;
          E2.act("splash", 1.3);
          e.splash = 1.3;
          RW.sfx.play("splash");
          E2.burst(e.x, e.y - 10, 40, "splash", 22, { up: 380, sp: 140 });
          E2.later(0.5, () => E2.say(P, P.id === "ellie" ? "Wet! Hehehe!" : U.pick(["Splish splash!", "Make a wish!", "So refreshing!"]), 1.6));
        },
      },
    });
    // benches, lamps, trees
    [[Pz.x - 190, Pz.y - 90], [Pz.x + 190, Pz.y - 90], [Pz.x + 190, Pz.y + 120]].forEach(([x, y]) => bench(x, y));
    world.nanaBench = bench(Pz.x - 190, Pz.y + 120, true);
    [[Pz.x - 150, Pz.y - 170], [Pz.x + 150, Pz.y - 170], [Pz.x - 230, Pz.y + 40], [Pz.x + 230, Pz.y + 40]].forEach(([x, y]) => staticProp(x, y, [-14, -118, 14, 6], (c) => P_.lamp(c), { solid: [{ c: [0, -2, 6] }], shadow: [10, 4] }));
    tree(Pz.x - 300, Pz.y - 170, "blossom", 1.05); tree(Pz.x + 300, Pz.y - 170, "blossom", 1.05); tree(Pz.x - 320, Pz.y + 200, "round", 1);
    flowerBed(Pz.x - 90, Pz.y - 215, 80, 26, 21); flowerBed(Pz.x + 90, Pz.y - 215, 80, 26, 22);
    trashCan(Pz.x + 130, Pz.y + 210);

    // the mysterious locked building (future game slot 11)
    const bx = Pz.x, by = 1500;
    add({
      kind: "building", x: bx, y: by, box: [-170, -300, 170, 24], sprite: true, occludes: true,
      solid: [{ r: [-150, -120, 150, -4] }],
      draw: (c) => B.futureBuilding(c, { w: 300, h: 160, wall: "#EDE3FA", roof: "#6C4AC9", rise: 100 }),
      live(c) { mysterySign(c, "plaza-building", -250); },
      tap: portalTap("plaza-building"),
      hit: [-160, -290, 160, 10],
    });

    // construction lot (future game slot 12)
    const lx0 = 3690, lx1 = 4010, ly0 = 1985, ly1 = 2185;
    E.addSolid({ r: [lx0, ly0, lx1, ly1] });
    staticProp((lx0 + lx1) / 2, ly0, [-170, -90, 170, 10], (c) => constructionFence(c, lx1 - lx0), { kind: "fence" });
    // crane with a mystery crate
    add({
      kind: "crane", x: 3800, y: 2080, box: [-40, -330, 220, 10], sortY: 2080,
      draw(c, E2) {
        c.fillStyle = "#F2C230";
        [-14, 14].forEach((x) => { c.fillRect(x - 4, -280, 8, 280); });
        c.strokeStyle = "#D9A800"; c.lineWidth = 2;
        for (let y = 0; y > -280; y -= 24) { c.beginPath(); c.moveTo(-14, y); c.lineTo(14, y - 24); c.stroke(); }
        c.fillStyle = "#F2C230"; c.fillRect(-30, -296, 240, 14);
        c.fillStyle = "#3A4252"; c.fillRect(-40, -310, 30, 30);
        const sw = Math.sin(E2.t * 1.1) * 6;
        A.line(c, 170, -284, 170 + sw, -180, 2, "#2B2F3A");
        c.save(); c.translate(170 + sw, -180); c.rotate(sw * 0.01);
        c.fillStyle = A.lin(c, 0, 0, 0, 50, ["#C48F58", "#9A6A44"]); A.rr(c, -26, 0, 52, 48, 4); c.fill();
        A.text(c, "?", 0, 25, 34, "#FFFFFF", { weight: 700 });
        c.restore();
      },
    });
    [[3730, 2160], [3950, 2150], [3870, 2040]].forEach(([x, y]) => staticProp(x, y, [-16, -36, 16, 4], (c) => P_.cone(c)));
    staticProp((lx0 + lx1) / 2, ly1, [-170, -150, 170, 10], (c) => {
      constructionFence(c, lx1 - lx0);
      c.save(); c.translate(0, -12);
      P_.sign(c, ["UNDER CONSTRUCTION"], { size: 18, postH: 0, board: "#FFE45C", edge: "#2B2F3A", ink: "#2B2F3A" });
      c.restore();
    }, {
      kind: "fence", tap: portalTap("plaza-lot"),
      live(c) { mysterySign(c, "plaza-lot", -120, "NEW GAME COMING"); },
    });
  }

  // Sign that shows "???" until a game is placed in this slot, then the game's title.
  function mysterySign(c, destId, y, fallback) {
    const g = RW.games.forDestination(destId);
    const open = g && g.unlocked && g.title;
    B.plate(c, open ? g.title.toUpperCase() : fallback || "???", 0, y, open ? 16 : 20, open ? "#2EB872" : "#6C4AC9", "#FFFFFF", { r: 10 });
  }
  world.mysterySign = mysterySign;

  function constructionFence(c, w) {
    for (let x = -w / 2; x < w / 2; x += 80) {
      c.fillStyle = "#FF7A1F"; A.rr(c, x + 2, -56, 76, 12, 4); c.fill();
      c.fillStyle = "#FFFFFF"; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + 8 + k * 18, -56); c.lineTo(x + 18 + k * 18, -56); c.lineTo(x + 12 + k * 18, -44); c.lineTo(x + 2 + k * 18, -44); c.closePath(); c.fill(); }
      c.strokeStyle = "rgba(90,100,120,.6)"; c.lineWidth = 1;
      for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(x + 4 + k * 10, -44); c.lineTo(x + 4 + k * 10, 0); c.stroke(); }
      c.fillStyle = "#6A7388"; c.fillRect(x, -60, 4, 60);
    }
  }

  function drawFountain(c, t, splash) {
    c.fillStyle = A.lin(c, 0, -40, 0, 0, ["#E9E2D6", "#BFB6A6"]);
    A.ell(c, 0, -20, 92, 36); c.fill();
    c.fillStyle = "#D9D2C4"; c.fillRect(-92, -40, 184, 20);
    c.fillStyle = A.lin(c, 0, -80, 0, -30, ["#9BE3FF", "#48B7EA"]); A.ell(c, 0, -40, 80, 28); c.fill();
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const r = ((t * 30 + i * 25) % 75); c.globalAlpha = 1 - r / 75; A.ell(c, 0, -40, r, r * 0.35); c.stroke(); }
    c.globalAlpha = 1;
    c.fillStyle = "#E9E2D6"; c.fillRect(-10, -110, 20, 70);
    c.fillStyle = "#D9D2C4"; A.ell(c, 0, -110, 36, 12); c.fill();
    c.fillStyle = "#7FD4F5"; A.ell(c, 0, -113, 30, 9); c.fill();
    // water arcs
    const h = 1 + splash * 0.6;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, u = (t * 1.4 + i * 0.07) % 1;
      const x = Math.cos(a) * 34 * u, y = -118 - Math.sin(u * Math.PI) * 44 * h + Math.sin(a) * 10 * u;
      c.fillStyle = `rgba(200,240,255,${0.9 - u * 0.5})`; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
    }
    c.fillStyle = "rgba(220,248,255,.9)"; c.beginPath(); c.arc(0, -150 - Math.sin(t * 8) * 4 - splash * 20, 7, 0, TAU); c.fill();
  }

  function bench(x, y, occupied) {
    return add({
      kind: "bench", x, y, box: [-46, -58, 46, 6], shadow: [42, 8], solid: occupied ? [{ r: [-42, -12, 42, 0] }] : null,
      draw(c) { P_.bench(c); },
      tap: occupied ? null : {
        reach: "walk", at: [0, 4], range: 30, noFace: true,
        act(E2, e) {
          const P = E2.player;
          P.x = e.x; P.y = e.y + 3; P.side = 0; P.back = false;
          E2.act("sit", 0, { lock: false });
          E2.say(P, U.pick(["Ahh. Nice.", "Just resting.", "Break time!"]), 1.5);
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // SPORTS COMPLEX
  // ---------------------------------------------------------------------
  function buildSports() {
    // entrance arch
    staticProp(1500, 2020, [-120, -220, 120, 10], (c) => {
      [-100, 100].forEach((x) => { c.fillStyle = A.lin(c, x - 10, 0, x + 10, 0, ["#E8453C", "#B8302A"]); A.rr(c, x - 10, -170, 20, 170, 6); c.fill(); });
      c.fillStyle = A.lin(c, 0, -210, 0, -150, ["#2F6BD6", "#1F4AA8"]); A.rr(c, -120, -212, 240, 62, 16); c.fill();
      c.fillStyle = "rgba(255,255,255,.2)"; A.rr(c, -110, -206, 220, 16, 8); c.fill();
      A.text(c, "SPORTS", 0, -190, 24, "#FFFFFF", { weight: 700 });
      A.text(c, "COMPLEX", 0, -164, 16, "#FFD23F", { weight: 700 });
    }, { solid: [{ c: [-100, -2, 12] }, { c: [100, -2, 12] }], shadow: [100, 10] });
    // soccer goals
    [[925, 2210, -1], [1375, 2210, 1]].forEach(([x, y, d]) => staticProp(x, y, [-40, -80, 40, 30], (c) => {
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1;
      for (let i = -50; i <= 50; i += 8) { c.beginPath(); c.moveTo(0, i * 0.8); c.lineTo(d * 26, i * 0.8 - 20); c.stroke(); }
      c.strokeStyle = "#FFFFFF"; c.lineWidth = 5;
      c.beginPath(); c.moveTo(0, 40); c.lineTo(0, -50); c.lineTo(d * 26, -70); c.lineTo(d * 26, 20); c.stroke();
    }, { sortY: y + 40 }));
    world.soccerBall = kickBall(1150, 2215, "soccer");
    sign(1425, 2150, ["BACKYARD", "SOCCER"], { size: 16, postH: 22, board: "#FFFFFF", edge: "#2E8B57", ink: "#1F6B42", ent: { tap: portalTap("soccer") } });
    // bleachers above the soccer field
    staticProp(1150, 2065, [-190, -80, 190, 6], (c) => {
      for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? "#D9DDE6" : "#C3C9D6"; A.rr(c, -180 + i * 8, -18 - i * 18, 360 - i * 16, 18, 4); c.fill(); }
      c.fillStyle = "#3A4252"; c.fillRect(-180, -4, 360, 4);
    }, { solid: [{ r: [-180, -20, 180, 0] }] });
    // basketball court hoop + ball
    const hoop = add({ kind: "hoop", x: 1710, y: 2092, box: [-40, -196, 40, 8], net: 0, shadow: [16, 5], solid: [{ c: [0, -2, 8] }], draw(c, E2, e) { P_.hoop(c, E2.t, e.net); }, update(e, dt) { e.net = Math.max(0, e.net - dt * 2); } });
    hoopBall(1690, 2200, hoop, [1710, 2225]);
    // football goalposts
    [[905, 2815], [1395, 2815]].forEach(([x, y]) => staticProp(x, y, [-40, -170, 40, 6], (c) => {
      A.line(c, 0, 0, 0, -70, 6, "#F2C230"); A.line(c, -32, -70, 32, -70, 6, "#F2C230");
      A.line(c, -32, -70, -32, -160, 5, "#F2C230"); A.line(c, 32, -70, 32, -160, 5, "#F2C230");
    }, { solid: [{ c: [0, -2, 6] }] }));
    // tennis net
    staticProp(1710, 2702, [-150, -40, 150, 6], (c) => {
      c.fillStyle = "#3A4252"; c.fillRect(-134, -34, 5, 34); c.fillRect(129, -34, 5, 34);
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1;
      for (let x = -130; x < 130; x += 6) { c.beginPath(); c.moveTo(x, -30); c.lineTo(x, 0); c.stroke(); }
      for (let y = -30; y < 0; y += 6) { c.beginPath(); c.moveTo(-130, y); c.lineTo(130, y); c.stroke(); }
      c.fillStyle = "#FFFFFF"; c.fillRect(-132, -34, 264, 5);
    }, { solid: [{ r: [-132, -6, 132, 2] }], tap: portalTap("sports-tennis") });
    // future game buildings
    add({
      kind: "building", x: 1710, y: 2530, box: [-150, -250, 150, 24], sprite: true, occludes: true,
      solid: [{ r: [-130, -100, 130, -4] }],
      draw: (c) => B.futureBuilding(c, { w: 260, h: 130, wall: "#FFE8D6", roof: "#E8743C", label: "HOOPS GYM", flat: true }),
      live(c) { P_.ribbon(c, "COMING SOON", 140, "#FF5C8A"); c.translate(0, 0); },
      tap: portalTap("sports-hoops"),
    });
    add({
      kind: "building", x: 1150, y: 2560, box: [-180, -250, 180, 24], sprite: true, occludes: true,
      solid: [{ r: [-160, -100, 160, -4] }],
      draw: (c) => B.futureBuilding(c, { w: 320, h: 140, wall: "#C8553D", roof: "#2F4E86", brick: true, label: "FIELD HOUSE", flat: true }),
      live(c) { c.save(); c.translate(0, -2); P_.ribbon(c, "COMING SOON", 140, "#FF5C8A"); c.restore(); },
      tap: portalTap("sports-stadium"),
    });
    add({
      kind: "building", x: 1710, y: 2995, box: [-140, -230, 140, 24], sprite: true, occludes: true,
      solid: [{ r: [-110, -80, 110, -4] }],
      draw: (c) => B.futureBuilding(c, { w: 220, h: 110, wall: "#F4FFF4", roof: "#2EB872", label: "TENNIS CLUB", rise: 70, open: world.destStatus(DEST["sports-tennis"]) !== "locked" }),
      live(c) { if (world.destStatus(DEST["sports-tennis"]) === "locked") P_.ribbon(c, "COMING SOON", 140, "#FF5C8A"); else { c.save(); c.translate(0, -2); P_.ribbon(c, "JONAH'S TENNIS", 170, "#2EB872"); c.restore(); } },
      tap: portalTap("sports-tennis"),
    });
  }

  // ---------------------------------------------------------------------
  // PLAYGROUND
  // ---------------------------------------------------------------------
  function buildPlayground() {
    // slide (Jonah slides dramatically)
    add({
      kind: "slide", x: 2010, y: 2150, box: [-100, -150, 60, 10], shadow: [60, 12],
      solid: [{ r: [16, -14, 44, 2] }],
      draw(c) {
        // ladder
        c.strokeStyle = "#2F6BD6"; c.lineWidth = 5;
        c.beginPath(); c.moveTo(20, 0); c.lineTo(20, -110); c.moveTo(40, 0); c.lineTo(40, -110); c.stroke();
        c.lineWidth = 3; for (let y = -12; y > -110; y -= 18) { c.beginPath(); c.moveTo(20, y); c.lineTo(40, y); c.stroke(); }
        c.fillStyle = "#FFD23F"; A.rr(c, 0, -118, 50, 14, 4); c.fill();
        // chute
        c.fillStyle = A.lin(c, -90, -110, 0, 0, ["#FF7AA8", "#E8457C"]);
        c.beginPath(); c.moveTo(4, -112); c.bezierCurveTo(-40, -100, -50, -10, -96, -6); c.lineTo(-96, 8); c.bezierCurveTo(-40, 6, -30, -86, 16, -100); c.closePath(); c.fill();
        c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 3;
        c.beginPath(); c.moveTo(6, -108); c.bezierCurveTo(-38, -96, -46, -4, -94, -1); c.stroke();
      },
      tap: {
        reach: "walk", at: [30, 22], range: 40, noFace: true,
        act(E2, e) {
          const P = E2.player, id = P.id;
          E2.act("jump", 1.8);
          P.dir = -1; P.side = 1;
          const sx = e.x + 26, sy = e.y + 4;
          world.tweenPlayer([
            { dur: 0.5, x: sx, y: sy, lift: 118, pose: "jump" },
            { dur: 0.1, x: sx - 20, y: sy, lift: 118, pose: "slide" },
            { dur: 0.55, x: e.x - 100, y: e.y + 10, lift: 0, pose: "slide", ease: "in" },
          ], () => {
            RW.sfx.play("whoosh");
            if (id === "jonah") {
              world.tweenPlayer([{ dur: 0.6, x: e.x - 200, y: e.y + 20, lift: 0, pose: "slide", ease: "out" }], () => { E2.act("fist", 1.2, { lock: false }); });
              E2.say(P, "WOOOOO! Knee slide!", 1.8);
              E2.burst(P.x, P.y, 4, "dust", 10);
            } else {
              P.pose = null; P.lock = false;
              E2.say(P, id === "ellie" ? "Again! Again!" : "Too easy!", 1.4);
              if (id === "ellie") RW.sfx.play("giggle");
            }
          });
        },
      },
    });
    // climbing dome
    staticProp(2160, 2130, [-60, -90, 60, 8], (c) => {
      c.strokeStyle = "#2EB872"; c.lineWidth = 5;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(0, 0, 54 - i * 2, 80, 0, Math.PI, 0); c.stroke(); c.save(); c.scale(1, 0.4); c.beginPath(); c.arc(0, -i * 40, 54 - i * 10, 0, TAU); c.restore(); c.stroke(); }
      c.strokeStyle = "#1F9A5A"; c.lineWidth = 4;
      [-0.6, 0, 0.6].forEach((k) => { c.beginPath(); c.ellipse(0, 0, 54 * Math.abs(Math.cos(k * 1.2)) + 4, 80, 0, Math.PI, 0); c.stroke(); });
    }, { solid: [{ c: [0, -6, 42] }], shadow: [56, 14] });
    // spring rider
    add({
      kind: "prop", x: 2170, y: 2250, box: [-30, -70, 30, 6], shadow: [16, 5], rock: 0, bubbleH: 90,
      draw(c, E2, e) {
        c.strokeStyle = "#8A93A8"; c.lineWidth = 3;
        c.beginPath(); for (let y = 0; y > -28; y -= 4) c.lineTo(y % 8 ? 6 : -6, y); c.stroke();
        c.save(); c.translate(0, -30); c.rotate(Math.sin(E2.t * 12) * e.rock * 0.4);
        c.fillStyle = A.gloss(c, 0, -14, 22, "#FF5C8A"); A.ell(c, 0, -14, 24, 16); c.fill();
        c.beginPath(); c.arc(20, -30, 12, 0, TAU); c.fill();
        c.fillStyle = "#2B2F3A"; c.beginPath(); c.arc(24, -32, 2.5, 0, TAU); c.fill();
        c.restore();
      },
      update(e, dt) { e.rock = Math.max(0, e.rock - dt * 0.6); },
      tap: { reach: "walk", at: [-34, 16], range: 40, act(E2, e) { e.rock = 1; RW.sfx.play("boing"); E2.say(E2.player, "Giddy up!", 1.3); } },
    });
    // seesaw
    add({
      kind: "prop", x: 2040, y: 2250, box: [-80, -50, 80, 6], shadow: [60, 8], tilt: 0.25, v: 0,
      draw(c, E2, e) {
        c.fillStyle = "#3A4252"; c.beginPath(); c.moveTo(-12, 0); c.lineTo(0, -24); c.lineTo(12, 0); c.closePath(); c.fill();
        c.save(); c.translate(0, -24); c.rotate(e.tilt);
        c.fillStyle = "#FFB020"; A.rr(c, -76, -5, 152, 10, 5); c.fill();
        c.fillStyle = "#2F6BD6"; c.fillRect(-66, -18, 5, 14); c.fillRect(61, -18, 5, 14);
        c.restore();
      },
      update(e, dt) { e.v += (-e.tilt * 2) * dt; e.v *= 0.98; e.tilt = U.clamp(e.tilt + e.v * dt * 3, -0.3, 0.3); },
      tap: { reach: "walk", at: [60, 16], range: 50, act(E2, e) { e.v = e.tilt > 0 ? -2 : 2; RW.sfx.play("bounce"); E2.say(E2.player, "Up and down!", 1.2); } },
    });
    staticProp(2080, 2300, [-100, -60, 100, 10], (c) => P_.sign(c, ["PLAYGROUND"], { size: 16, postH: 18, board: "#FFE45C", edge: "#2F6BD6", ink: "#2F6BD6" }), { solid: [{ r: [-30, -4, 30, 4] }] });
  }

  // Scripted player movement (slides, etc.)
  world.tweenPlayer = (steps, done) => {
    const P = E.player;
    P.lock = true; P.path = null;
    world.tween = { steps: steps.slice(), t: 0, from: { x: P.x, y: P.y, lift: P.lift }, done };
  };
  function updateTween(dt) {
    const tw = world.tween;
    if (!tw) return;
    const P = E.player;
    const s = tw.steps[0];
    tw.t += dt;
    let u = Math.min(1, tw.t / s.dur);
    const k = s.ease === "in" ? u * u : s.ease === "out" ? 1 - (1 - u) * (1 - u) : u;
    P.x = U.lerp(tw.from.x, s.x, k); P.y = U.lerp(tw.from.y, s.y, k); P.lift = U.lerp(tw.from.lift, s.lift, k); P.liftV = 0;
    if (s.pose) { P.pose = s.pose; P.poseDur = 0; }
    if (u >= 1) {
      tw.steps.shift(); tw.t = 0; tw.from = { x: P.x, y: P.y, lift: P.lift };
      if (!tw.steps.length) { world.tween = null; P.lock = false; P.pose = null; if (tw.done) tw.done(); }
    }
  }

  // ---------------------------------------------------------------------
  // ROSENBERG ARCADE
  // ---------------------------------------------------------------------
  function buildArcade() {
    add({
      kind: "building", x: 2450, y: 2560, box: [-235, -270, 235, 24], sprite: true, occludes: true,
      solid: [{ r: [-214, -150, 214, -4] }],
      draw: (c) => B.arcade(c),
      live(c, E2) {
        // chaser lights along the roof sign
        for (let i = 0; i < 22; i++) {
          const on = (Math.floor(E2.t * 8) + i) % 4 === 0;
          c.fillStyle = on ? "#FFF6B0" : "rgba(255,92,200,.5)";
          c.beginPath(); c.arc(-170 + i * 16.2, -258, 3.2, 0, TAU); c.fill();
        }
        c.globalAlpha = 0.5 + Math.sin(E2.t * 9) * 0.2;
        c.fillStyle = "#5CFFD2"; A.rr(c, -52, -144, 104, 8, 4); c.fill();
        c.globalAlpha = 1;
        if (world.destStatus(DEST.arcade) === "locked") P_.ribbon(c, "COMING SOON", 150, "#FF5CC8");
        else P_.ribbon(c, "NOW PLAYING: MAX-MAN", 210, "#F2A93B");
      },
      tap: portalTap("arcade"),
    });
    // cabinets out front: covered, ??? and coming soon
    const cabs = [[2270, 2612, "sheet"], [2330, 2612, "???"], [2570, 2612, "maxman"], [2630, 2612, "sheet"], [2690, 2612, "???"]];
    cabs.forEach(([x, y, kind], i) => add({
      kind: "cabinet", x, y, box: [-26, -104, 26, 6], shadow: [24, 7], solid: [{ r: [-22, -10, 22, 2] }], blink: 0, bubbleH: 116,
      draw(c, E2, e) { drawCabinet(c, E2.t + i, kind, e.blink); },
      update(e, dt) { e.blink = Math.max(0, e.blink - dt); },
      tap: kind === "maxman" ? portalTap("arcade") : { reach: "remote", act(E2, e) { e.blink = 1.5; RW.sfx.play("sparkle"); E2.say(e, kind === "sheet" ? "Shhh... it's a surprise!" : U.pick(["COMING SOON!", "INSERT FUTURE GAME", "Almost ready!"]), 1.8); } },
    }));
  }
  function drawCabinet(c, t, kind, blink) {
    const col = kind === "sheet" ? "#F4F4F8" : kind === "maxman" ? "#F2A93B" : kind === "soon" ? "#FF5C8A" : "#2F6BD6";
    if (kind === "sheet") {
      c.fillStyle = A.lin(c, -24, 0, 24, 0, ["#FFFFFF", "#E4E4EC", "#CFCFDA"]);
      c.beginPath(); c.moveTo(-24, 0); c.quadraticCurveTo(-28, -60, -18, -98); c.quadraticCurveTo(0, -108, 18, -98); c.quadraticCurveTo(28, -60, 24, 0);
      for (let i = 0; i < 5; i++) c.quadraticCurveTo(24 - i * 10 - 5, 5, 24 - (i + 1) * 10, 0);
      c.closePath(); c.fill();
      c.strokeStyle = "rgba(0,0,0,.06)"; c.lineWidth = 2; [-10, 4, 14].forEach((x) => { c.beginPath(); c.moveTo(x, -90); c.quadraticCurveTo(x + 4, -40, x - 2, -2); c.stroke(); });
      B.plate(c, "?", 0, -60, 16, "#FFD23F", "#2B2F3A");
      return;
    }
    c.fillStyle = A.lin(c, -22, 0, 22, 0, [A.shade(col, 0.2), col, A.shade(col, -0.3)]);
    A.rr(c, -22, -100, 44, 100, 6); c.fill();
    c.fillStyle = "#130D2E"; A.rr(c, -16, -84, 32, 30, 4); c.fill();
    const on = blink > 0 ? Math.floor(t * 10) % 2 : 1;
    if (kind === "maxman") {
      // a little Max chasing Cheerios across the screen
      const u = (t * 0.6) % 1, mx = -12 + u * 24;
      c.fillStyle = "#FFE3A0"; for (let k = 0; k < 4; k++) { const dx = -10 + k * 7; if (dx > mx) { c.beginPath(); c.arc(dx, -66, 1.6, 0, TAU); c.fill(); } }
      c.fillStyle = "#F9C74F"; c.beginPath(); const mo = Math.abs(Math.sin(t * 12)) * 0.7; c.moveTo(mx, -66); c.arc(mx, -66, 5.5, mo, TAU - mo); c.closePath(); c.fill();
      c.fillStyle = "#A8713D"; c.beginPath(); c.arc(mx - 1, -71, 3, Math.PI, 0); c.fill();
      A.text(c, "MAX-MAN", 0, -78, 7, "#FFD23F", { weight: 700 });
    } else if (kind === "???") A.text(c, "???", 0, -69, 14, on ? "#5CFFD2" : "#1E6B5A", { weight: 700 });
    else { A.text(c, "COMING", 0, -75, 8, on ? "#FFD23F" : "#6B5A1E", { weight: 700 }); A.text(c, "SOON", 0, -63, 10, on ? "#FFD23F" : "#6B5A1E", { weight: 700 }); }
    c.fillStyle = "#2B2F3A"; A.rr(c, -18, -48, 36, 12, 3); c.fill();
    c.fillStyle = "#FF5C5C"; c.beginPath(); c.arc(-8, -42, 3, 0, TAU); c.fill();
    c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(4, -42, 3, 0, TAU); c.fill();
    A.line(c, 12, -42, 12, -52, 2, "#DDD");
    c.fillStyle = A.shade(col, -0.35); A.rr(c, -22, -104, 44, 10, 4); c.fill();
  }

  // ---------------------------------------------------------------------
  // BAHA BAY (the water park: Splash Down slides and the Lazy River)
  // ---------------------------------------------------------------------
  // ---------------------------------------------------------------------
  // SIGNPOSTS at the crossroads. Each arrow board walks you to its place when tapped.
  // ---------------------------------------------------------------------
  const BOARD_W = 196, BOARD_H = 34, BOARD_GAP = 8;
  function signpost(x, y, arms) {
    KEEP_CLEAR.push([x - 210, y - 40, x + 210, y + 110]); // no random trees in front of a signpost
    const top = -(arms.length * (BOARD_H + BOARD_GAP)) - 40;
    const boardY = (i) => top + 14 + i * (BOARD_H + BOARD_GAP);
    const boardX = (dir) => (dir === "L" ? -BOARD_W + 18 : dir === "R" ? -18 : -BOARD_W / 2);
    staticProp(x, y, [-BOARD_W - 10, top - 10, BOARD_W + 10, 10], (c) => {
      // post
      c.fillStyle = "#7A5236"; A.rr(c, -7, top, 14, -top, 5); c.fill();
      c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(0, top, 11, 0, TAU); c.fill();
      arms.forEach(([key, dir], i) => {
        const pl = PLACES[key], by = boardY(i), bx = boardX(dir), tip = 18;
        c.fillStyle = "rgba(0,0,0,.18)";
        const shape = (ox, oy) => {
          c.beginPath();
          if (dir === "R") { c.moveTo(bx + ox, by + oy); c.lineTo(bx + BOARD_W - tip + ox, by + oy); c.lineTo(bx + BOARD_W + ox, by + BOARD_H / 2 + oy); c.lineTo(bx + BOARD_W - tip + ox, by + BOARD_H + oy); c.lineTo(bx + ox, by + BOARD_H + oy); }
          else if (dir === "L") { c.moveTo(bx + BOARD_W + ox, by + oy); c.lineTo(bx + tip + ox, by + oy); c.lineTo(bx + ox, by + BOARD_H / 2 + oy); c.lineTo(bx + tip + ox, by + BOARD_H + oy); c.lineTo(bx + BOARD_W + ox, by + BOARD_H + oy); }
          else A.rr(c, bx + ox, by + oy, BOARD_W, BOARD_H, 9);
          c.closePath();
        };
        shape(0, 4); c.fill();
        shape(0, 0); c.fillStyle = pl.color; c.fill();
        c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2.5; c.stroke();
        const arrow = dir === "U" ? " ↑" : dir === "D" ? " ↓" : "";
        const cx = bx + BOARD_W / 2 + (dir === "R" ? -tip / 2 : dir === "L" ? tip / 2 : 0);
        A.text(c, `${pl.icon} ${pl.name}${arrow}`, cx, by + BOARD_H / 2 + 1, 15, "#FFFFFF", { weight: 700 });
      });
    }, { kind: "signpost", shadow: [30, 8], solid: [{ c: [0, -2, 9] }], sortY: y,
      tap: { reach: "remote", act() { RW.bus.emit("openMap"); } } });
    // one tap target per board
    arms.forEach(([key, dir], i) => {
      const by = boardY(i), bx = boardX(dir);
      hotspot(x, y, [bx - 4, by - 4, bx + BOARD_W + 4, by + BOARD_H + 6], { reach: "remote", act() { world.goToPlace(PLACES[key]); } }, y + 1);
    });
  }
  function buildSignposts() {
    signpost(2590, 1992, [["home", "U"], ["sports", "L"], ["bahamar", "R"], ["arcade", "D"]]);     // boulevard, below the house
    signpost(1236, 1992, [["kitchen", "U"], ["woods", "L"], ["sports", "D"]]);                     // boulevard, west of the sports gate
    signpost(3392, 1992, [["plaza", "U"], ["home", "L"], ["beach", "R"], ["bahamar", "R"]]);       // boulevard at the plaza
    signpost(4150, 1995, [["beach", "U"], ["bahamar", "D"], ["icecream", "D"]]);                   // on the sand, where the trail heads south
    signpost(1880, 900, [["academy", "L"], ["raceway", "L"], ["baseball", "R"], ["home", "D"]]);  // north lane, west of the ballpark
    signpost(3080, 1190, [["baseball", "L"], ["space", "R"], ["home", "D"]]);                       // north lane, east of the ballpark
    signpost(2600, 2735, [["home", "U"], ["sports", "L"], ["icecream", "R"], ["bahamar", "R"]]);   // south street by the arcade
  }

  // ---------------------------------------------------------------------
  // FROZENBERGS ICE CREAM STAND (the Frozenbergs game)
  // ---------------------------------------------------------------------
  function drawIceCreamStand(c, t) {
    // back wall and counter
    c.fillStyle = "#FFF4E8"; A.rr(c, -130, -170, 260, 170, 14); c.fill();
    c.fillStyle = "#F7D9E6"; for (let x = -118; x < 130; x += 28) c.fillRect(x, -160, 12, 100);
    // serving window
    c.fillStyle = "#6B3E2A"; A.rr(c, -96, -150, 192, 78, 10); c.fill();
    c.fillStyle = "#FFE7C2"; A.rr(c, -88, -144, 176, 66, 8); c.fill();
    // tubs of ice cream in the window
    ["#FFB3C7", "#8B5A3C", "#FFF3D6", "#A8E6CF", "#C9A7FF"].forEach((col, i) => {
      const x = -70 + i * 35;
      c.fillStyle = "#D9DEE8"; A.rr(c, x - 14, -96, 28, 16, 4); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(x, -96, 12, Math.PI, TAU); c.fill();
    });
    // counter front
    c.fillStyle = A.lin(c, 0, -72, 0, 0, ["#FF7FA8", "#E8558A"]); A.rr(c, -140, -74, 280, 74, 12); c.fill();
    c.fillStyle = "#FFFFFF"; A.rr(c, -146, -80, 292, 14, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; for (let x = -120; x < 130; x += 40) { c.beginPath(); c.arc(x, -34, 9, 0, TAU); c.fill(); }
    A.text(c, "FROZENBERGS", 0, -38, 24, "#FFFFFF", { weight: 700, stroke: "#B8356A", strokeW: 5 });
    // striped scalloped awning
    const aw = -176;
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? "#FFFFFF" : "#FF5C8A";
      c.beginPath(); c.moveTo(-150 + i * 37.5, aw); c.lineTo(-150 + (i + 1) * 37.5, aw); c.lineTo(-150 + (i + 1) * 37.5, aw + 26);
      c.arc(-150 + (i + 0.5) * 37.5, aw + 26, 18.75, 0, Math.PI); c.closePath(); c.fill();
    }
    c.fillStyle = "#E8558A"; A.rr(c, -156, aw - 12, 312, 16, 8); c.fill();
    // giant cone on the roof, gently bobbing
    const b = Math.sin(t * 2) * 3;
    c.save(); c.translate(0, aw - 12 + b);
    c.fillStyle = "#E3A857"; c.beginPath(); c.moveTo(-34, -40); c.lineTo(34, -40); c.lineTo(0, 30); c.closePath(); c.fill();
    c.strokeStyle = "rgba(150,90,30,.45)"; c.lineWidth = 3;
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-30 + k * 14, -40); c.lineTo(-4 + k * 14 + 20, -10); c.stroke(); }
    c.fillStyle = "#FFB3C7"; c.beginPath(); c.arc(-14, -52, 24, 0, TAU); c.fill();
    c.fillStyle = "#8B5A3C"; c.beginPath(); c.arc(16, -54, 24, 0, TAU); c.fill();
    c.fillStyle = "#FFF3D6"; c.beginPath(); c.arc(0, -80, 24, 0, TAU); c.fill();
    c.fillStyle = "#E8453C"; c.beginPath(); c.arc(4, -106, 8, 0, TAU); c.fill();
    A.line(c, 4, -112, 12, -124, 2.5, "#3E8C45");
    ["#FF5C8A", "#2F9BFF", "#FFD23F", "#2EB872"].forEach((col, i) => { c.fillStyle = col; c.fillRect(-12 + i * 8, -90 + (i % 2) * 10, 5, 2.5); });
    c.restore();
  }
  function buildIceCream() {
    staticProp(3250, 2602, [-160, -330, 160, 10], (c) => {}, {
      kind: "building", sprite: false, shadow: [150, 16], solid: [{ r: [-146, -40, 146, 6] }],
      draw: (c, E2) => drawIceCreamStand(c, E2.t),
      tap: portalTap("icecream"),
    });
    // a little table with a parasol out front
    staticProp(3440, 2560, [-62, -104, 62, 8], (c) => P_.umbrella(c, "#FF5C8A", "#FFFFFF"), { shadow: [52, 14, 0, 6, 0.16], solid: [{ c: [0, -2, 5] }] });
    sign(3030, 2610, ["ICE CREAM", "🍦 OPEN!"], { size: 15, board: "#FFF4E8", edge: "#E8558A", ink: "#B8356A", ent: { tap: portalTap("icecream") } });
  }

  // Baha Bay water park, out on Baha Mar island. Its layout was drawn for its old spot
  // on the mainland, so everything is shifted by L.park.
  function buildBahaBay() {
    const fy = L.waterFenceY, { dx, dy } = L.park;
    E.addSolid({ r: [3120 + dx, fy - 16, 3980 + dx, fy + 40] });
    E.addSolid({ r: [3120 + dx, fy, 3980 + dx, fy + 600] }); // the park grounds (you play it through the gates)
    for (let x = 3130 + dx; x < 3960 + dx; x += 200) {
      const w = Math.min(200, 3960 + dx - x);
      if (x + w > 3430 + dx && x < 3670 + dx) continue; // gate gap
      staticProp(x + w / 2, fy, [-w / 2 - 4, -70, w / 2 + 4, 6], (c) => {
        c.fillStyle = "#EAF6FF";
        for (let k = -w / 2; k <= w / 2; k += 14) { A.rr(c, k - 3, -60, 6, 60, 3); c.fill(); }
        c.fillStyle = "#3CC3E8"; A.rr(c, -w / 2, -64, w, 9, 4); c.fill(); A.rr(c, -w / 2, -26, w, 7, 3); c.fill();
      }, { kind: "fence" });
    }
    const wwOpen = world.destStatus(DEST.waterworld) !== "locked";
    staticProp(3550 + dx, fy + 2, [-200, -280, 200, 10], (c) => B.waterGate(c, wwOpen), { kind: "gate", tap: portalTap("waterworld"), solid: [{ r: [-172, -12, 172, 6] }] });
    staticProp(3260 + dx, 2960 + dy, [-130, -220, 150, 10], (c) => { c.scale(0.78, 0.78); B.slides(c); }, { kind: "slides" });
    staticProp(3850 + dx, 2990 + dy, [-150, -220, 130, 10], (c) => { c.scale(-0.78, 0.78); B.slides(c); }, { kind: "slides" });
    // tipping splash bucket
    add({
      kind: "bucket", x: 3400 + dx, y: 3000 + dy, box: [-60, -230, 60, 10], tip: 0, t0: 0,
      draw(c, E2, e) {
        c.fillStyle = "#F2C230"; c.fillRect(-40, -200, 8, 200); c.fillRect(32, -200, 8, 200);
        c.fillStyle = "#2F6BD6"; c.fillRect(-44, -206, 88, 10);
        c.save(); c.translate(0, -190); c.rotate(e.tip * 1.6);
        c.fillStyle = A.lin(c, -26, 0, 26, 0, ["#FF7A1F", "#E85F0C"]);
        c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.lineTo(20, 40); c.lineTo(-20, 40); c.closePath(); c.fill();
        c.restore();
        if (e.tip > 0.6) for (let i = 0; i < 10; i++) { c.fillStyle = "rgba(150,220,255,.8)"; c.beginPath(); c.arc(30 + Math.sin(i) * 10, -170 + ((E2.t * 400 + i * 30) % 170), 5, 0, TAU); c.fill(); }
      },
      update(e, dt) { e.t0 += dt; const cyc = e.t0 % 7; e.tip = cyc > 5.5 ? Math.min(1, (cyc - 5.5) * 3) : Math.max(0, e.tip - dt * 2); },
    });
    sign(3330 + dx, 2700 + dy, ["SPLASH DOWN", "WATER SLIDES"], { size: 15, board: "#EAF6FF", edge: "#1E8FC4", ink: "#156A99" });

    // Lazy River entrance: a tiki hut with a tube stack, just east of the main gate
    const lrOpen = world.destStatus(DEST.lazyriver) !== "locked";
    staticProp(3862 + dx, fy + 4, [-110, -230, 110, 10], (c) => B.riverHut(c, lrOpen), {
      kind: "gate", tap: portalTap("lazyriver"), shadow: [90, 10],
      solid: [{ r: [-92, -10, -66, 4] }, { r: [66, -10, 92, 4] }],
    });
    // tubes floating round the lazy river inside the park
    const RIVER = { x: 3550 + dx, y: 3050 + dy, rx: 330, ry: 80 };
    const riders = [["#FF5C8A", "#F4D273"], ["#FFB020", "#7B4A26"], ["#2EB872", "#5B2330"], ["#7C5CFF", "#2B2B2B"], ["#FF7A1F", "#C98A4A"], ["#1E9FD9", "#F4D273"]];
    riders.forEach(([col, hair], i) => {
      add({
        kind: "tube", x: RIVER.x, y: RIVER.y, box: [-40, -60, 40, 20], a: (i / riders.length) * TAU, bob: i,
        update(e, dt) {
          e.a += dt * 0.09; e.bob += dt;
          e.x = RIVER.x + Math.cos(e.a) * RIVER.rx;
          e.y = RIVER.y + Math.sin(e.a) * RIVER.ry;
        },
        draw(c, E2, e) {
          const b = Math.sin(e.bob * 2.4) * 2;
          c.fillStyle = "rgba(255,255,255,.35)"; A.ell(c, 0, 4, 30, 9); c.fill();
          c.translate(0, b);
          c.fillStyle = A.shade(col, -0.25); A.ell(c, 0, 2, 26, 12); c.fill();
          c.fillStyle = col; A.ell(c, 0, -1, 25, 11); c.fill();
          c.fillStyle = "#58C9EC"; A.ell(c, 0, -2, 11, 5); c.fill();
          c.fillStyle = "#FFD8BE"; c.beginPath(); c.arc(0, -16, 9, 0, TAU); c.fill();
          c.fillStyle = hair; c.beginPath(); c.arc(0, -19, 9, Math.PI, TAU); c.fill();
          c.fillStyle = "rgba(255,255,255,.55)"; A.ell(c, -10, -4, 7, 2.5); c.fill();
        },
        tap: portalTap("lazyriver"),
      });
    });
  }

  // ---------------------------------------------------------------------
  // BEACH AND DOCK
  // ---------------------------------------------------------------------
  function buildBeach() {
    sign(3985, 1830, ["ROSENBERG", "BEACH"], { size: 20, board: "#FFF4D6", edge: "#2F9BD0", ink: "#1E6B99" });
    [[4040, 1250], [4150, 1420], [4020, 1560], [4040, 2820], [4180, 2950], [4120, 1080]].forEach(([x, y]) => tree(x, y, "palm", 1));
    // lifeguard tower
    staticProp(4170, 1730, [-60, -220, 60, 10], (c) => {
      c.strokeStyle = "#FFFFFF"; c.lineWidth = 6;
      [[-34, 0, -24, -110], [34, 0, 24, -110]].forEach(([a, b, c2, d]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(c2, d); c.stroke(); });
      c.lineWidth = 3; for (let y = -20; y > -110; y -= 20) { c.beginPath(); c.moveTo(-30, y); c.lineTo(30, y); c.stroke(); }
      c.fillStyle = "#E8453C"; A.rr(c, -46, -150, 92, 44, 8); c.fill();
      c.fillStyle = "#FFFFFF"; A.rr(c, -40, -144, 80, 12, 4); c.fill();
      c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(-54, -150); c.lineTo(0, -206); c.lineTo(54, -150); c.closePath(); c.fill();
      c.fillStyle = "#E8453C"; A.text(c, "+", 0, -124, 26, "#FFFFFF", { weight: 700 });
    }, {
      kind: "tower", shadow: [44, 10], solid: [{ r: [-36, -8, 36, 4] }], bubbleH: 220,
      tap: { reach: "remote", act(E2, e) { if (e.cool > E2.t) return; e.cool = E2.t + 2; RW.sfx.play("chirp"); E2.say(e, U.pick(["No running! ...okay, a little running.", "Wear sunscreen!", "Swim buddy check!"]), 2); } },
    });
    // umbrellas + towels
    [[4090, 1990, "#FF5C8A", "#FFFFFF"], [4205, 2150, "#2F9BFF", "#FFD23F"], [4060, 2420, "#2EB872", "#FFFFFF"]].forEach(([x, y, a, b]) => {
      staticProp(x + 30, y + 30, [-50, -20, 50, 20], (c) => { c.rotate(-0.1); c.fillStyle = a; A.rr(c, -40, -14, 80, 28, 6); c.fill(); c.fillStyle = "rgba(255,255,255,.5)"; for (let i = -30; i < 40; i += 16) c.fillRect(i, -14, 6, 28); }, { layer: "ground" });
      staticProp(x, y, [-62, -104, 62, 8], (c) => P_.umbrella(c, a, b), { shadow: [52, 14, 0, 6, 0.16], solid: [{ c: [0, -2, 5] }] });
    });
    world.beachBall = kickBall(4130, 2080, "beach");
    buildVolleyball();
    // sandcastle
    add({
      kind: "castle", x: 4195, y: 2735, box: [-44, -80, 44, 8], flag: 0, bubbleH: 100, solid: [{ c: [0, -4, 30] }],
      draw(c, E2, e) {
        c.fillStyle = "#E9CF8E"; A.rr(c, -40, -30, 80, 30, 6); c.fill();
        c.fillStyle = "#F2DAA0"; A.rr(c, -26, -52, 52, 26, 4); c.fill();
        [-40, 26].forEach((x) => { c.fillStyle = "#E9CF8E"; A.rr(c, x, -44, 14, 16, 3); c.fill(); });
        c.fillStyle = "#D9BA78"; for (let x = -24; x < 26; x += 10) c.fillRect(x, -58, 6, 6);
        if (e.flag > 0) { const h = Math.min(1, e.flag) * 30; A.line(c, 0, -56, 0, -56 - h, 2, "#8A6A44"); c.fillStyle = "#2F6BD6"; c.fillRect(0, -56 - h, 18, 12); }
      },
      tap: { reach: "walk", at: [0, 36], range: 40, act(E2, e) { e.flag = 1; RW.sfx.play("sparkle"); E2.burst(e.x, e.y, 50, "sparkle", 8); E2.say(E2.player, "Castle Rosenberg!", 1.6); } },
    });
    // seagulls
    [[4120, 2310], [4230, 1880]].forEach(([x, y]) => add({
      kind: "gull", x, y, box: [-16, -24, 16, 4], gone: 0, shadow: [8, 3],
      draw(c, E2, e) {
        if (e.gone > 0) return;
        c.fillStyle = "#FFFFFF"; A.ell(c, 0, -10, 11, 7); c.fill();
        c.beginPath(); c.arc(8, -16, 5, 0, TAU); c.fill();
        c.fillStyle = "#AEB6C4"; A.ell(c, -3, -11, 7, 4); c.fill();
        c.fillStyle = "#F2A93B"; c.beginPath(); c.moveTo(12, -16); c.lineTo(18, -15); c.lineTo(12, -14); c.fill();
        c.fillStyle = "#2B2F3A"; c.beginPath(); c.arc(9, -17, 1.2, 0, TAU); c.fill();
        A.line(c, -2, -3, -2, 0, 1.5, "#F2A93B"); A.line(c, 3, -3, 3, 0, 1.5, "#F2A93B");
      },
      update(e, dt) { if (e.gone > 0) e.gone -= dt; },
      tap: { reach: "remote", act(E2, e) { if (e.gone > 0) return; e.gone = 20; E2.spawnBird(e.x, e.y - 14); E2.float(e.x, e.y - 40, "SQUAWK!", { size: 20, stroke: "#2F9BD0" }); } },
    }));
    // the dock (walkable) and a boat for a future game
    staticProp(4460, 2352, [-230, -40, 250, 50], (c) => {
      c.fillStyle = "#6B4A30"; for (let x = -200; x <= 230; x += 70) { A.rr(c, x - 5, 18, 10, 30, 3); c.fill(); }
      c.fillStyle = A.lin(c, 0, -30, 0, 32, ["#D8A870", "#B8834E"]); A.rr(c, -210, -30, 450, 62, 6); c.fill();
      c.strokeStyle = "rgba(90,60,30,.35)"; c.lineWidth = 2;
      for (let x = -200; x < 240; x += 18) { c.beginPath(); c.moveTo(x, -30); c.lineTo(x, 32); c.stroke(); }
    }, { layer: "ground" });
    buildSeaplanes();
  }

  // ---------------------------------------------------------------------
  // SEA PLANES to Baha Mar, and the island itself
  // ---------------------------------------------------------------------
  // A little float plane, side view, facing right. Drawn at its waterline.
  function drawSeaplane(c, t, o = {}) {
    const flying = !!o.flying;
    // floats and struts
    c.strokeStyle = "#5A6478"; c.lineWidth = 4;
    [[-30, -34], [34, -34]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, -6); c.lineTo(x + 6, y); c.stroke(); });
    c.fillStyle = A.lin(c, 0, -10, 0, 6, ["#FFD23F", "#E8A21C"]);
    c.beginPath(); c.moveTo(-70, -8); c.lineTo(62, -8); c.quadraticCurveTo(84, -6, 88, 0); c.lineTo(-64, 2); c.quadraticCurveTo(-72, -2, -70, -8); c.closePath(); c.fill();
    // body
    c.fillStyle = A.lin(c, 0, -80, 0, -30, ["#FFFFFF", "#E2ECF4"]);
    c.beginPath();
    c.moveTo(-96, -74); c.lineTo(-84, -76); c.quadraticCurveTo(-40, -56, 20, -80); c.quadraticCurveTo(66, -80, 78, -58);
    c.quadraticCurveTo(80, -40, 64, -34); c.lineTo(-40, -36); c.quadraticCurveTo(-80, -44, -96, -74); c.closePath(); c.fill();
    // tail fin
    c.fillStyle = "#18A0B8"; c.beginPath(); c.moveTo(-96, -74); c.lineTo(-112, -118); c.lineTo(-88, -118); c.lineTo(-66, -70); c.closePath(); c.fill();
    c.fillStyle = "#FF7A45"; c.beginPath(); c.moveTo(-104, -100); c.lineTo(-110, -116); c.lineTo(-90, -116); c.lineTo(-86, -104); c.closePath(); c.fill();
    // stripe + name
    c.fillStyle = "#18A0B8"; c.beginPath(); c.moveTo(-80, -52); c.lineTo(70, -54); c.lineTo(72, -46); c.lineTo(-70, -44); c.closePath(); c.fill();
    c.fillStyle = "#FF7A45"; c.fillRect(-60, -44, 124, 3);
    c.save(); c.translate(-6, -63); c.scale(o.dir || 1, 1); A.text(c, "BAHA MAR", 0, 0, 13, "#1B6FB4", { weight: 700 }); c.restore(); // reads right either way
    // windows
    c.fillStyle = "#2B4A6E"; A.rr(c, 30, -76, 30, 16, 6); c.fill();
    c.fillStyle = "#9FDBFF"; [-44, -24].forEach((x) => { A.rr(c, x, -58, 12, 9, 3); c.fill(); });
    c.fillStyle = "rgba(255,255,255,.6)"; A.rr(c, 34, -74, 10, 5, 2); c.fill();
    // high wing (seen edge-on) with its strut
    c.strokeStyle = "#5A6478"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -40); c.lineTo(22, -88); c.stroke();
    c.fillStyle = "#18A0B8"; A.rr(c, -30, -94, 96, 11, 5); c.fill();
    c.fillStyle = "#FFFFFF"; A.rr(c, -24, -92, 30, 4, 2); c.fill();
    // nose + propeller
    c.fillStyle = "#FF7A45"; A.ell(c, 80, -58, 8, 12); c.fill();
    const spin = o.prop ? t * 60 : 0.6;
    c.fillStyle = "rgba(60,60,70,.8)";
    if (o.prop) { c.globalAlpha = 0.35; A.ell(c, 88, -58, 4, 30); c.fill(); c.globalAlpha = 1; }
    else { c.save(); c.translate(88, -58); c.rotate(spin); c.fillRect(-2, -28, 4, 56); c.restore(); }
    c.fillStyle = "#3A4252"; A.ell(c, 88, -58, 4, 5); c.fill();
    if (!flying) { c.fillStyle = "rgba(255,255,255,.55)"; A.ell(c, 0, 4, 90, 5); c.fill(); }
  }

  // the flight path: out over the water, round, and down at the other end
  const FLIGHT = { from: [4775, 2378], to: [4985, 1300], c1: [5700, 2650], c2: [5650, 1050] };
  const bez = (u, a, b, c2, d) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c2 + u * u * u * d; };
  const planes = {};

  function buildSeaplanes() {
    const F = FLIGHT, I = L.island;
    const mkPlane = (key, x, y, dir, destId) => {
      const e = add({
        kind: "seaplane", x, y, box: [-120, -130, 100, 14], sortY: y, dir, home: [x, y], bubbleH: 150,
        draw(c, E2, e2) {
          if (e2.hide) return;
          const bob = e2.fly ? 0 : Math.sin(E2.t * 1.6 + x) * 2.5;
          if (e2.fly) { // shadow on the water below
            c.save(); c.fillStyle = "rgba(20,70,120,.22)"; A.ell(c, 0, 6, 70 * (1 - e2.z / 600), 10); c.fill(); c.restore();
            c.translate(0, -e2.z); c.rotate(e2.tilt || 0);
          }
          c.translate(0, bob); c.scale(e2.dir, 1);
          drawSeaplane(c, E2.t, { prop: e2.fly || e2.revving, flying: e2.fly && e2.z > 10, dir: e2.dir });
        },
        update(e2, dt) { if (e2.flight) e2.flight(dt); },
        tap: { reach: "remote", act(E2) { world.flyTo(key === "main" ? "bahamar" : "mainland"); } },
      });
      planes[key] = e;
      return e;
    };
    mkPlane("main", F.from[0], F.from[1], -1);
    mkPlane("island", F.to[0], F.to[1], -1);

    // dock sign on the mainland
    sign(4235, 2300, ["FLY TO", "BAHA MAR ✈"], { size: 18, board: "#FFFFFF", edge: "#18A0B8", ink: "#1B6FB4", ent: { tap: { reach: "remote", act() { world.flyTo("bahamar"); } } } });

    // ---- the island ----
    // a little landing dock where the plane ties up
    staticProp(4990, 1342, [-60, -20, 60, 30], (c) => {
      c.fillStyle = "#6B4A30"; [-44, -4, 36].forEach((x) => { A.rr(c, x - 4, 10, 8, 20, 3); c.fill(); });
      c.fillStyle = A.lin(c, 0, -16, 0, 16, ["#D8A870", "#B8834E"]); A.rr(c, -56, -16, 112, 32, 5); c.fill();
      c.strokeStyle = "rgba(90,60,30,.35)"; c.lineWidth = 2; for (let x = -50; x < 56; x += 14) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x, 16); c.stroke(); }
    }, { layer: "ground" });
    sign(4850, 1400, ["FLY HOME ✈"], { size: 17, board: "#FFFFFF", edge: "#18A0B8", ink: "#1B6FB4", ent: { tap: { reach: "remote", act() { world.flyTo("mainland"); } } } });
    sign(4820, 1560, ["WELCOME TO", "BAHA MAR"], { size: 20, board: "#FFF4D6", edge: "#FF7A45", ink: "#C24E1C" });
    // palms and beach umbrellas round the island
    [[4560, 1650], [4660, 1500], [4780, 1420], [5250, 1380], [5460, 1450], [5620, 1580], [5680, 1760], [4520, 1880], [5640, 1960]].forEach(([x, y], i) => tree(x, y, "palm", 0.9 + (i % 3) * 0.08));
    [[5300, 1480, "#FF5C8A", "#FFFFFF"], [5560, 1560, "#FFD23F", "#2F9BFF"], [4700, 1720, "#2EB872", "#FFFFFF"]].forEach(([x, y, a, b]) => {
      staticProp(x, y, [-62, -104, 62, 8], (c) => P_.umbrella(c, a, b), { shadow: [52, 14, 0, 6, 0.16], solid: [{ c: [0, -2, 5] }] });
    });
  }

  // Fly between the mainland dock and Baha Mar.
  let flying = false;
  world.flyTo = (to) => {
    const P = E.player;
    if (!P || flying || RW.host.current || E.mode !== "play") return;
    const going = to === "bahamar";
    if (going === E.onIsland(P.x, P.y)) return; // already there
    const dep = going ? planes.main : planes.island, arr = going ? planes.island : planes.main;
    const board = going ? DEST.seaplane : DEST["seaplane-home"], land = going ? DEST["seaplane-home"] : DEST.seaplane;
    flying = true;
    P.lock = true; P.path = null; P.pose = null;
    // if you're not at the plane, the plane's crew whisks you there first
    if (Math.hypot(P.x - board.arrive[0], P.y - board.arrive[1]) > 120) {
      E.burst(P.x, P.y, 40, "puff", 10);
      P.x = board.arrive[0]; P.y = board.arrive[1]; P.emerge = 0; E.snap();
      E.burst(P.x, P.y, 40, "sparkle", 12);
    }
    RW.sfx.play("tap");
    E.say(P, going ? U.pick(["Baha Mar, here we come!", "Wheee, a sea plane!", "Let's fly!"]) : U.pick(["Bye, Baha Mar!", "Home time!", "Fly me home!"]), 1.4);
    dep.revving = true;
    E.later(0.9, () => {
      // climb aboard
      P.hidden = true;
      E.burst(dep.x, dep.y - 50, 20, "sparkle", 8);
      RW.sfx.play("rumble");
      arr.hide = true;
      const F = FLIGHT, dur = 4.2;
      dep.fly = true; dep.z = 0; dep.sortY = 1e6;
      let t = 0, last = [dep.x, dep.y];
      const step = (dt) => {
        t += dt;
        let u = Math.min(1, t / dur);
        u = u * u * (3 - 2 * u); // ease in and out
        const k = going ? u : 1 - u; // the return trip runs the path backwards
        const x = bez(k, F.from[0], F.c1[0], F.c2[0], F.to[0]), y = bez(k, F.from[1], F.c1[1], F.c2[1], F.to[1]);
        dep.x = x; dep.y = y;
        dep.z = Math.pow(Math.sin(Math.PI * u), 0.7) * 260;
        const vx = x - last[0];
        if (Math.abs(vx) > 0.3) dep.dir = vx > 0 ? 1 : -1;
        dep.tilt = U.clamp((y - last[1]) * 0.02, -0.18, 0.18) * dep.dir;
        last = [x, y];
        E.camTarget = { x, y: y - dep.z - 60 };
        if (Math.random() < dt * 8) E.burst(x - dep.dir * 90, y - dep.z - 58, 0, "puff", 1);
        return u < 1;
      };
      dep.flight = (dt) => {
        if (!step(dt)) {
          dep.flight = null;
          // touch down: the plane at the far end takes over, this one quietly goes home
          RW.sfx.play("splash");
          E.burst(arr.x, arr.y, 20, "sparkle", 10);
          arr.hide = false;
          dep.fly = false; dep.revving = false; dep.z = 0; dep.tilt = 0; dep.x = dep.home[0]; dep.y = dep.home[1]; dep.sortY = dep.home[1]; dep.dir = -1;
          dep.hide = false;
          P.x = land.arrive[0]; P.y = land.arrive[1]; P.hidden = false; P.emerge = 0; P.dir = 1;
          E.camTarget = null; E.snap();
          E.burst(P.x, P.y, 40, "sparkle", 12);
          P.lock = false; flying = false;
          E.later(0.4, () => { E.act("celebrate", 1.2, { lock: false }); E.say(P, going ? "Welcome to Baha Mar!" : "Home sweet home!", 1.8); });
          if (going) RW.bus.emit("toast", { text: "Baha Mar! Splash Down and the Lazy River are through the gates.", icon: "🏝️" });
        }
      };
    });
  };

  // Beach volleyball court (Jonah's Volley)
  function buildVolleyball() {
    const cx = 4120, cy = 2560, w = 230, h = 120;
    // rope lines in the sand
    staticProp(cx, cy, [-w / 2 - 8, -h / 2 - 8, w / 2 + 8, h / 2 + 8], (c) => {
      c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 4;
      A.rr(c, -w / 2, -h / 2, w, h, 4); c.stroke();
      c.fillStyle = "rgba(255,255,255,.18)"; A.rr(c, -w / 2, -h / 2, w, h, 4); c.fill();
    }, { layer: "ground" });
    // the net across the middle (runs left to right, seen from the side)
    staticProp(cx, cy + 6, [-w / 2 - 20, -110, w / 2 + 20, 10], (c) => {
      [-w / 2 - 6, w / 2 + 6].forEach((x) => { c.fillStyle = A.lin(c, x - 4, 0, x + 4, 0, ["#E9E2D6", "#B9AE9A"]); A.rr(c, x - 4, -96, 8, 96, 3); c.fill(); });
      c.fillStyle = "rgba(30,40,60,.08)"; c.fillRect(-w / 2, -86, w, 40);
      c.strokeStyle = "rgba(40,50,70,.45)"; c.lineWidth = 1;
      for (let x = -w / 2; x <= w / 2; x += 8) { c.beginPath(); c.moveTo(x, -86); c.lineTo(x, -46); c.stroke(); }
      for (let y = -86; y <= -46; y += 8) { c.beginPath(); c.moveTo(-w / 2, y); c.lineTo(w / 2, y); c.stroke(); }
      c.fillStyle = "#FFFFFF"; c.fillRect(-w / 2, -90, w, 6);
      c.fillStyle = "#2F9BD0"; c.fillRect(-w / 2, -48, w, 3);
    }, { kind: "net", solid: [{ r: [-w / 2 - 8, -6, w / 2 + 8, 3] }], tap: portalTap("volleyball") });
    // a volleyball resting in the sand
    staticProp(cx - 70, cy + 40, [-14, -26, 14, 4], (c) => {
      c.translate(0, -11);
      c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fillStyle = A.gloss(c, 0, 0, 11, "#FFFFFF"); c.fill();
      c.strokeStyle = "#F2C230"; c.lineWidth = 2.2;
      c.beginPath(); c.arc(-4, -2, 9, -0.6, 1.8); c.stroke();
      c.strokeStyle = "#2F9BD0"; c.beginPath(); c.arc(5, 3, 9, 2.4, 4.6); c.stroke();
    }, { shadow: [11, 4], tap: portalTap("volleyball") });
    sign(cx + 150, cy - 95, ["BEACH", "VOLLEYBALL"], { size: 15, postH: 22, board: "#FFF4D6", edge: "#2F9BD0", ink: "#1E6B99" });
  }

  // ---------------------------------------------------------------------
  // ROSENBERG RACEWAY
  // ---------------------------------------------------------------------
  function buildRaceway() {
    const T = L.track;
    E.addSolid({ r: [T.x - T.rx - 60, T.y - T.ry - 60, T.x + T.rx + 60, T.y + T.ry + 52] });
    // back fence
    staticProp(T.x, T.y - T.ry - 58, [-T.rx - 70, -60, T.rx + 70, 6], (c) => raceFence(c, T.rx * 2 + 120), { kind: "fence" });
    // go-kart on the track
    add({
      kind: "kart", x: T.x - 120, y: T.y + T.ry - 10, box: [-44, -50, 44, 8], vroom: 0, bubbleH: 70,
      draw(c, E2, e) {
        c.translate(Math.sin(E2.t * 40) * e.vroom * 1.5, 0);
        [-26, 26].forEach((x) => { c.fillStyle = "#1E2130"; A.rr(c, x - 9, -14, 18, 14, 5); c.fill(); });
        c.fillStyle = A.lin(c, 0, -30, 0, -8, ["#FF6B5C", "#D8302A"]); A.rr(c, -38, -28, 76, 20, 8); c.fill();
        c.fillStyle = "#FFFFFF"; A.text(c, "99", 10, -18, 12, "#FFFFFF", { weight: 700 });
        c.fillStyle = "#2B2F3A"; A.rr(c, -14, -40, 20, 14, 4); c.fill();
        A.line(c, 8, -34, 16, -44, 3, "#2B2F3A");
      },
      update(e, dt) { e.vroom = Math.max(0, e.vroom - dt); },
      tap: { reach: "remote", act(E2, e) { e.vroom = 1.2; RW.sfx.play("rumble"); if (world.destStatus(DEST.raceway) === "locked") E2.say(e, "VROOM! (Raceway opening soon!)", 2); else { E2.say(e, "VROOM! Race time!", 1.4); goPlay(E2, DEST.raceway); } } },
    });
    // starting lights
    add({
      kind: "lights", x: T.x + 150, y: T.y + T.ry - 30, box: [-40, -170, 40, 6], seq: -1,
      draw(c, E2, e) {
        c.fillStyle = "#3A4252"; A.rr(c, -4, -110, 8, 110, 3); c.fill();
        c.fillStyle = "#1E2130"; A.rr(c, -22, -166, 44, 64, 8); c.fill();
        const s = e.seq;
        for (let i = 0; i < 3; i++) {
          const lit = s >= 0 && s < 3 ? i <= s : false;
          c.fillStyle = s >= 3 ? "#2EE872" : lit ? "#FF3B30" : "#4A2A2A";
          c.beginPath(); c.arc(0, -154 + i * 20, 7, 0, TAU); c.fill();
        }
      },
      update(e, dt) { if (e.seq >= 0) { e.st = (e.st || 0) + dt; e.seq = Math.floor(e.st / 0.7); if (e.seq > 4) e.seq = -1; } },
      tap: { reach: "remote", act(E2, e) { if (e.seq >= 0) return; e.seq = 0; e.st = 0; RW.sfx.play("lock"); E2.later(2.1, () => { RW.sfx.play("unlock"); E2.float(e.x, e.y - 190, "GO!", { size: 36, stroke: "#1E8F4A" }); }); } },
    });
    // front fence with the locked gate
    staticProp(T.x, T.y + T.ry + 52, [-T.rx - 70, -110, T.rx + 70, 8], (c) => {
      const w = T.rx * 2 + 120;
      c.save(); c.translate(-w / 2, 0); raceFence(c, w / 2 - 70); c.restore();
      c.save(); c.translate(70, 0); raceFence(c, w / 2 - 70); c.restore();
      // gate
      if (world.destStatus(DEST.raceway) !== "locked") {
        // gate swung open, checkered flag waving you in
        [-1, 1].forEach((k) => {
          c.save(); c.translate(k * 66, 0); c.scale(k * 0.35, 1);
          c.fillStyle = "#E9ECF2"; for (let x = 0; x <= 64; x += 16) { A.rr(c, -x - 3, -80, 6, 80, 3); c.fill(); }
          c.fillStyle = "#E8453C"; A.rr(c, -68, -86, 68, 10, 4); c.fill(); A.rr(c, -68, -40, 68, 8, 4); c.fill();
          c.restore();
        });
        A.line(c, -40, 0, -40, -104, 3, "#3A4252");
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { c.fillStyle = (i + j) % 2 ? "#222" : "#FFF"; c.fillRect(-40 + i * 7, -104 + j * 7, 7, 7); }
      } else {
        c.fillStyle = "#E9ECF2";
        for (let x = -62; x <= 62; x += 16) { A.rr(c, x - 3, -80, 6, 80, 3); c.fill(); }
        c.fillStyle = "#E8453C"; A.rr(c, -68, -86, 136, 10, 4); c.fill(); A.rr(c, -68, -40, 136, 8, 4); c.fill();
        c.strokeStyle = "#8A93A8"; c.lineWidth = 4; c.beginPath(); c.moveTo(-18, -54); c.quadraticCurveTo(0, -30, 18, -54); c.stroke();
        P_.lockBadge(c, 0, -30, 0.9);
      }
    }, { kind: "gate", tap: portalTap("raceway") });
    add({
      kind: "building", x: 290, y: 1150, box: [-140, -190, 140, 20], sprite: true,
      solid: [{ r: [-120, -80, 120, -4] }], draw: (c) => B.garage(c),
      tap: portalTap("raceway"), occludes: true,
    });
    marquee(880, 1085, ["ROSENBERG", "RACEWAY"], "#E8453C", "raceway", { size: 28 });
    const raceOpen = world.destStatus(DEST.raceway) !== "locked";
    staticProp(880, 1087, [-80, -30, 80, 10], (c) => { c.translate(0, -14); P_.ribbon(c, raceOpen ? "RACE DAY!" : "LOCKED", 120, raceOpen ? "#2EB872" : "#2B2F55"); }, { sortY: 1090 });
  }
  function raceFence(c, w) {
    c.fillStyle = "#FFFFFF";
    for (let x = 0; x <= w; x += 30) { A.rr(c, x - 3, -46, 6, 46, 3); c.fill(); }
    for (let x = 0; x < w; x += 60) { c.fillStyle = "#E8453C"; c.fillRect(x, -44, 30, 10); c.fillStyle = "#FFFFFF"; c.fillRect(x + 30, -44, 30, 10); }
    c.fillStyle = "#FFFFFF"; c.fillRect(0, -22, w, 6);
  }

  // ---------------------------------------------------------------------
  // ADVENTURE WOODS
  // ---------------------------------------------------------------------
  function buildWoods() {
    // the stream blocks walking except at the bridge
    const S = L.stream;
    for (let i = 0; i < S.length - 1; i++) {
      const [ax, ay] = S[i], [bx, by] = S[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 26);
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
        if (Math.abs(y - L.bridgeY) < 44) continue;
        E.addSolid({ c: [x, y, 20] });
      }
    }
    const bx = 455, by = L.bridgeY;
    // bridge deck (ground) + rails
    staticProp(bx, by, [-80, -40, 80, 40], (c) => {
      c.fillStyle = A.lin(c, 0, -30, 0, 30, ["#C48F58", "#9A6A44"]);
      A.rr(c, -70, -34, 140, 68, 10); c.fill();
      c.strokeStyle = "rgba(60,40,20,.35)"; c.lineWidth = 2;
      for (let x = -62; x < 70; x += 14) { c.beginPath(); c.moveTo(x, -34); c.lineTo(x, 34); c.stroke(); }
    }, { layer: "ground" });
    const rail = (dy) => staticProp(bx, by + dy, [-80, -50, 80, 8], (c) => {
      c.fillStyle = "#7A5135";
      [-66, -22, 22, 66].forEach((x) => { A.rr(c, x - 4, -40, 8, 40, 3); c.fill(); });
      c.fillStyle = A.lin(c, 0, -46, 0, -36, ["#B8834E", "#8A5E3A"]);
      c.beginPath(); c.moveTo(-74, -30); c.quadraticCurveTo(0, -58, 74, -30); c.lineTo(74, -40); c.quadraticCurveTo(0, -68, -74, -40); c.closePath(); c.fill();
    }, { kind: "rail", solid: [{ r: [-60, -6, 60, 3] }] });
    rail(-40); rail(42);
    // cave
    add({
      kind: "building", x: 270, y: 1570, box: [-160, -180, 160, 14], sprite: true, occludes: true,
      solid: [{ r: [-140, -110, -54, -4] }, { r: [54, -110, 140, -4] }, { r: [-54, -110, 54, -30] }],
      draw: (c) => B.cave(c),
      live(c, E2) {
        // something sparkles in the dark...
        for (let i = 0; i < 3; i++) { c.globalAlpha = 0.5 + Math.sin(E2.t * 2 + i * 2) * 0.5; c.fillStyle = "#FFE45C"; A.starPath(c, -20 + i * 20, -60 + (i % 2) * 14, 4, 4, 0.3); c.fill(); }
        c.globalAlpha = 1;
      },
      tap: portalTap("woods-cave"),
    });
    // woods treehouse
    add({
      kind: "treehouse", x: 700, y: 2240, box: [-110, -300, 110, 16], sprite: true, solid: [{ c: [0, -4, 20] }], shadow: [70, 18], bubbleH: 280,
      draw(c) {
        c.fillStyle = A.lin(c, -16, 0, 16, 0, ["#9A6B45", "#6E4A30"]); A.rr(c, -16, -160, 32, 160, 8); c.fill();
        // ladder
        c.strokeStyle = "#B8834E"; c.lineWidth = 4;
        c.beginPath(); c.moveTo(24, 0); c.lineTo(24, -130); c.moveTo(40, 0); c.lineTo(40, -130); c.stroke();
        for (let y = -10; y > -130; y -= 16) { c.beginPath(); c.moveTo(24, y); c.lineTo(40, y); c.stroke(); }
        // canopy
        [[-60, -230, 50], [60, -230, 50], [0, -260, 60], [-30, -200, 44], [40, -196, 44]].forEach(([x, y, r]) => { c.fillStyle = A.rad(c, x - r * 0.4, y - r * 0.4, 2, x, y, r, ["#8FD978", "#4DAF5B", "#2F8A48"]); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
        // the little house
        c.fillStyle = "#8A5A3A"; c.fillRect(-70, -150, 140, 10);
        c.fillStyle = A.lin(c, 0, -210, 0, -150, ["#E3B37A", "#C48F58"]); A.rr(c, -54, -210, 108, 62, 4); c.fill();
        c.fillStyle = "#E8453C"; c.beginPath(); c.moveTo(-66, -206); c.lineTo(0, -250); c.lineTo(66, -206); c.closePath(); c.fill();
        c.fillStyle = "#2B2F3A"; A.rr(c, -14, -196, 28, 46, 6); c.fill();
        c.fillStyle = "#FFE9A0"; A.rr(c, 22, -196, 22, 18, 3); c.fill();
        B.plate(c, "KEEP OUT (JK)", 0, -136, 10, "#FFFFFF", "#8A5A3A", { r: 4 });
      },
      tap: { reach: "remote", act(E2, e) { if (e.cool > E2.t) return; e.cool = E2.t + 2; RW.sfx.play("rustle"); E2.say(e, "Secret club meetings… coming soon!", 2); } },
    });
    // trail signs at the map edges (paths continue beyond)
    // mushrooms & logs
    [[620, 1500], [360, 2320], [760, 1950], [300, 1720]].forEach(([x, y], i) => staticProp(x, y, [-30, -30, 30, 6], (c) => {
      if (i % 2) { c.fillStyle = A.lin(c, 0, -18, 0, 0, ["#9A6B45", "#6E4A30"]); A.rr(c, -26, -18, 52, 18, 9); c.fill(); c.fillStyle = "#E3B37A"; A.ell(c, 26, -9, 6, 9); c.fill(); }
      else { [[-8, 1], [8, 0.8]].forEach(([mx, s]) => { c.fillStyle = "#F4EDE2"; c.fillRect(mx - 3 * s, -14 * s, 6 * s, 14 * s); c.fillStyle = "#E8453C"; c.beginPath(); c.ellipse(mx, -14 * s, 12 * s, 9 * s, 0, Math.PI, 0); c.fill(); c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(mx - 4 * s, -18 * s, 2 * s, 0, TAU); c.arc(mx + 4 * s, -16 * s, 1.5 * s, 0, TAU); c.fill(); }); }
    }));
  }

  // ---------------------------------------------------------------------
  // WINTER MOUNTAIN GONDOLA
  // ---------------------------------------------------------------------
  function buildGondola() {
    add({
      kind: "building", x: 3160, y: 470, box: [-140, -230, 140, 20], sprite: true, occludes: true,
      solid: [{ r: [-110, -70, 110, -4] }], draw: (c) => B.gondola(c), tap: portalTap("gondola"),
      live(c) { P_.lockBadge(c, 0, -52, 1); },
    });
  }

  // ---------------------------------------------------------------------
  // ROSENBERG HOUSE UPGRADES (unlock with Rosenberg Stars)
  // ---------------------------------------------------------------------
  const UPGRADES = world.UPGRADES = [
    { id: "doghouse", name: "DOG HOUSE", cost: 10, x: 2075, y: 1440, w: 140, h: 90 },
    { id: "pool", name: "POOL", cost: 25, x: 3060, y: 1450, w: 180, h: 110 },
    { id: "treehouse", name: "TREEHOUSE", cost: 40, x: 2065, y: 1225, w: 130, h: 90 },
    { id: "slide", name: "GIANT SLIDE", cost: 60, x: 2070, y: 1650, w: 150, h: 90 },
    { id: "court", name: "SPORT COURT", cost: 80, x: 3070, y: 1680, w: 170, h: 100 },
  ];
  world.upgradeUnlocked = (u) => RW.save.stars >= u.cost;
  function buildUpgrades() {
    UPGRADES.forEach((u) => {
      // ground pad
      add({
        kind: "plot", layer: "ground", x: u.x, y: u.y, box: [-u.w / 2 - 6, -u.h / 2 - 6, u.w / 2 + 6, u.h / 2 + 6], sprite: true,
        spriteKey: () => (world.upgradeUnlocked(u) ? "on" : "off"),
        draw(c) { drawPlotGround(c, u, world.upgradeUnlocked(u)); },
      });
      add({
        kind: "upgrade", x: u.x, y: u.y + u.h / 2, box: [-u.w / 2 - 10, -u.h - 190, u.w / 2 + 10, 10],
        hit: [-u.w / 2, -u.h - 120, u.w / 2, 0], bubbleH: u.h + 120, u,
        draw(c, E2, e) { drawUpgrade(c, E2, u, world.upgradeUnlocked(u)); },
        tap: {
          reach: "remote",
          act(E2, e) {
            if (!world.upgradeUnlocked(u)) { RW.sfx.play("lock"); E2.say(e, `Earn ${u.cost} ⭐ to build the ${u.name}!`, 2.2); return; }
            upgradeFun(E2, u, e);
          },
        },
      });
    });
    // keep track of which upgrades have been celebrated
    markBuilt();
    RW.bus.on("stars", () => {
      UPGRADES.forEach((u) => {
        if (world.upgradeUnlocked(u) && !RW.save.built[u.id]) {
          RW.save.built[u.id] = true; RW.persist();
          E.later(1.2, () => {
            E.toast(`NEW! The ${u.name} was built at the Rosenberg House!`, "🏗️");
            E.burst(u.x, u.y, 40, "confetti", 30, { up: 400 });
            RW.sfx.play("unlock");
            if (world.onUpgrade) world.onUpgrade(u);
          });
        }
      });
    });
  }
  // upgrades a player already has don't get celebrated again (per player)
  function markBuilt() {
    RW.save.built = RW.save.built || {};
    UPGRADES.forEach((u) => { if (world.upgradeUnlocked(u)) RW.save.built[u.id] = true; });
    RW.persist();
  }
  function drawPlotGround(c, u, on) {
    const w = u.w, h = u.h;
    if (!on) {
      c.fillStyle = "rgba(255,255,255,.22)"; A.rr(c, -w / 2, -h / 2, w, h, 18); c.fill();
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 4; c.setLineDash([14, 10]);
      A.rr(c, -w / 2, -h / 2, w, h, 18); c.stroke(); c.setLineDash([]);
      return;
    }
    if (u.id === "pool") {
      c.fillStyle = "#EDE6D8"; A.rr(c, -w / 2, -h / 2, w, h, 26); c.fill();
      c.fillStyle = A.lin(c, 0, -h / 2, 0, h / 2, ["#8BE3F7", "#2FB3E3"]); A.rr(c, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 20); c.fill();
    } else if (u.id === "court") {
      c.fillStyle = "#3A7BD5"; A.rr(c, -w / 2, -h / 2, w, h, 10); c.fill();
      c.strokeStyle = "#FFFFFF"; c.lineWidth = 3; A.rr(c, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 4); c.stroke();
      c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.stroke();
    } else {
      c.fillStyle = "rgba(210,180,130,.6)"; A.rr(c, -w / 2, -h / 2, w, h, 20); c.fill();
    }
  }
  function drawUpgrade(c, E2, u, on) {
    const h = u.h;
    c.translate(0, -h / 2);
    if (!on) {
      // wrapped present with a sign
      const bob = Math.sin(E2.t * 2 + u.x) * 3;
      c.save(); c.translate(0, bob);
      c.fillStyle = "rgba(20,30,50,.18)"; A.ell(c, 0, 6 - bob, 34, 8); c.fill();
      c.fillStyle = A.lin(c, -30, 0, 30, 0, ["#9B5DE5", "#7B3FC4"]); A.rr(c, -30, -50, 60, 50, 8); c.fill();
      c.fillStyle = "#FFD23F"; c.fillRect(-5, -50, 10, 50); c.fillRect(-30, -30, 60, 9);
      c.beginPath(); c.ellipse(-10, -56, 12, 7, -0.5, 0, TAU); c.ellipse(10, -56, 12, 7, 0.5, 0, TAU); c.fill();
      A.text(c, "?", 0, -18, 18, "#FFFFFF", { weight: 700 });
      c.restore();
      c.save(); c.translate(0, -80);
      c.font = `700 15px ${A.FONT}`;
      const tw = Math.max(c.measureText(u.name).width, 60) + 34;
      c.fillStyle = "rgba(20,30,60,.2)"; A.rr(c, -tw / 2 + 2, -30, tw, 50, 14); c.fill();
      c.fillStyle = "#FFFFFF"; A.rr(c, -tw / 2, -32, tw, 50, 14); c.fill();
      A.text(c, u.name, 0, -18, 15, "#2B2F55", { weight: 700 });
      P_.lockBadge(c, -tw / 2 + 4, -30, 0.55);
      A.goldStar(c, -18, 4, 8, 0);
      A.text(c, String(u.cost), 8, 4, 15, "#D98200", { weight: 700 });
      c.restore();
      return;
    }
    if (u.id === "doghouse") {
      c.fillStyle = A.lin(c, -40, 0, 40, 0, ["#E8453C", "#B8302A"]); A.rr(c, -40, -60, 80, 60, 4); c.fill();
      c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(-50, -56); c.lineTo(0, -96); c.lineTo(50, -56); c.closePath(); c.fill();
      c.fillStyle = "#6E4A30"; c.beginPath(); c.moveTo(-46, -58); c.lineTo(0, -90); c.lineTo(46, -58); c.closePath(); c.fill();
      c.fillStyle = "#2B2F3A"; c.beginPath(); c.arc(0, -22, 18, Math.PI, 0); c.lineTo(18, 0); c.lineTo(-18, 0); c.closePath(); c.fill();
      B.plate(c, "WOOF", 0, -50, 9, "#FFD23F", "#6E4A30");
    } else if (u.id === "pool") {
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const r = (E2.t * 20 + i * 18) % 50; c.globalAlpha = 1 - r / 50; A.ell(c, -20 + i * 20, h / 2 - 4, r, r * 0.3); c.stroke(); }
      c.globalAlpha = 1;
      c.strokeStyle = "#FF5C8A"; c.lineWidth = 7; A.ell(c, 30, h / 2 - 8 + Math.sin(E2.t * 2) * 2, 14, 7); c.stroke();
      c.strokeStyle = "#C9CDD8"; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, h / 2 - 20); c.lineTo(-60, h / 2 - 50); c.moveTo(-48, h / 2 - 20); c.lineTo(-48, h / 2 - 50); c.stroke();
    } else if (u.id === "treehouse") {
      c.fillStyle = "#7A5135"; c.fillRect(-40, -60, 8, 60); c.fillRect(32, -60, 8, 60);
      c.fillStyle = A.lin(c, 0, -110, 0, -60, ["#E3B37A", "#C48F58"]); A.rr(c, -48, -110, 96, 52, 4); c.fill();
      c.fillStyle = "#2EB872"; c.beginPath(); c.moveTo(-58, -106); c.lineTo(0, -146); c.lineTo(58, -106); c.closePath(); c.fill();
      c.fillStyle = "#2B2F3A"; A.rr(c, -12, -98, 24, 38, 5); c.fill();
      c.fillStyle = "#FFE9A0"; A.rr(c, 20, -98, 18, 16, 3); c.fill();
    } else if (u.id === "slide") {
      c.strokeStyle = "#2F6BD6"; c.lineWidth = 6;
      c.beginPath(); c.moveTo(40, 0); c.lineTo(40, -150); c.moveTo(60, 0); c.lineTo(60, -150); c.stroke();
      c.fillStyle = "#FFD23F"; A.rr(c, 26, -160, 44, 14, 4); c.fill();
      c.fillStyle = A.lin(c, -70, -150, 30, 0, ["#FFB020", "#FF5C8A"]);
      c.beginPath(); c.moveTo(30, -154); c.bezierCurveTo(-40, -150, -20, -10, -76, -6); c.lineTo(-76, 8); c.bezierCurveTo(-4, 6, -26, -130, 40, -138); c.closePath(); c.fill();
    } else if (u.id === "court") {
      c.save(); c.translate(0, -h / 2 + 30); c.scale(0.8, 0.8); P_.hoop(c, E2.t, 0); c.restore();
    }
  }
  function upgradeFun(E2, u, e) {
    const P = E2.player;
    if (u.id === "pool") { RW.sfx.play("splash"); E2.burst(u.x, u.y, 10, "splash", 20, { up: 320 }); E2.say(P, "Cannonball!", 1.4); }
    else if (u.id === "doghouse") { RW.sfx.play("bark"); E2.say(e, "Woof! (It's the dog's favorite spot.)", 2); if (world.dogGoto) world.dogGoto(u.x + 60, u.y + 30); }
    else if (u.id === "treehouse") { RW.sfx.play("rustle"); E2.say(e, "Rosenberg Club: kids only!", 1.8); }
    else if (u.id === "slide") { RW.sfx.play("whoosh"); E2.say(P, "WHEEEE!", 1.2); E2.act("slide", 1, { lock: false }); }
    else if (u.id === "court") { RW.sfx.play("swish"); E2.say(P, "Pickup game!", 1.4); E2.act("celebrate", 1, { lock: false }); }
  }

  // ---------------------------------------------------------------------
  // STREETS, EDGES, DISTANT SCENERY
  // ---------------------------------------------------------------------
  function buildStreetLife() {
    // lamp posts and benches along the boulevard
    [800, 1640, 2180, 2700, 3060, 3380, 3660].forEach((x) => {
      staticProp(x, 1842, [-14, -118, 14, 6], (c) => P_.lamp(c), { solid: [{ c: [0, -2, 6] }], shadow: [10, 4] });
    });
    [[1950, 1965], [3100, 1965], [900, 1965]].forEach(([x, y]) => bench(x, y));
    // flower beds along the boulevard
    [[1100, 1960, 3], [2000, 1840, 4], [2950, 1960, 5], [3300, 1850, 6], [700, 1960, 9]].forEach(([x, y, s]) => flowerBed(x, y, 90, 28, s));
    // southern hedge (the world edge)
    for (let x = 60; x < 4050; x += 150) {
      if (x > 3120 && x < 3980) continue; // Baha Bay fence already there
      staticProp(x, 3085, [-90, -60, 90, 12], (c) => { c.save(); c.translate(-45, 0); A.bush(c, 1, null, x); c.restore(); c.save(); c.translate(40, 2); A.bush(c, 1.05, x % 3 ? null : "#FFFFFF", x + 1); c.restore(); }, { kind: "hedge" });
    }
    // distant houses beyond the road
    [[300, "#F6D6C8", "#5A7FD0"], [900, "#E8F1FF", "#D95A4A"], [1500, "#FFF3D6", "#2E9C86"], [2100, "#F1E8FF", "#E8743C"], [2700, "#E6FFF1", "#6C4AC9"], [3300, "#FFE9E0", "#2F5FA8"], [3900, "#FFFBEA", "#C8553D"]].forEach(([x, wall, roof]) => {
      staticProp(x, 3360, [-120, -220, 120, 10], (c) => {
        c.scale(0.8, 0.8);
        c.fillStyle = A.lin(c, 0, -120, 0, 0, [wall, A.shade(wall, -0.08)]); c.fillRect(-100, -120, 200, 120);
        c.fillStyle = roof; c.beginPath(); c.moveTo(-116, -114); c.lineTo(0, -196); c.lineTo(116, -114); c.closePath(); c.fill();
        c.fillStyle = "#9ACDEB"; [-60, 40].forEach((wx) => c.fillRect(wx, -90, 26, 26));
        c.fillStyle = A.shade(roof, -0.2); A.rr(c, -14, -60, 28, 60, 4); c.fill();
      }, { kind: "far" });
      tree(x + 170, 3330, U.pick(["round", "deep", "gold"]), 0.9, { solid: false, tap: false });
    });
  }

  // ---------------------------------------------------------------------
  // HIDDEN STARS + COLLECTIBLES
  // ---------------------------------------------------------------------
  const HIDDEN_STARS = world.HIDDEN_STARS = [
    ["backyardTree", 1965, 1150], ["fountain", 3625, 1700], ["playground", 2190, 2090], ["dogHouse", 2150, 1395],
    ["leftField", 2215, 800], ["cave", 360, 1470], ["dockEnd", 4665, 2352], ["rocket", 3570, 690],
    ["academy", 1630, 700], ["raceGarage", 450, 1075], ["tennis", 1850, 2790], ["kitchen", 1225, 1500],
    ["construction", 4050, 2230], ["waterGate", 3350, 2715], ["gondola", 3290, 455], ["treehouse", 775, 2170],
    ["sandcastle", 4240, 2755],
  ];
  // A different kid logged in: show the stars and items THEY haven't found yet.
  world.refreshProgress = () => {
    E.entities.filter((e) => (e.kind === "star" || e.kind === "item") && !e.flying).forEach((e) => E.remove(e));
    world.chefHatOut = false;
    buildStarsAndItems();
    markBuilt();
  };
  function buildStarsAndItems() {
    HIDDEN_STARS.forEach(([id, x, y]) => {
      if (RW.save.foundStars[id]) return;
      const s = add({
        kind: "star", starId: id, x, y, box: [-24, -70, 24, 6], shadow: [14, 5, 0, 0, 0.18], sortY: y,
        draw(c, E2, e) {
          const bob = Math.sin(E2.t * 2.5 + x) * 5;
          c.fillStyle = "rgba(255,230,120,.25)"; c.beginPath(); c.arc(0, -36 + bob, 26 + Math.sin(E2.t * 4) * 3, 0, TAU); c.fill();
          A.goldStar(c, 0, -36 + bob, 18, E2.t + x);
          if (Math.sin(E2.t * 3 + x) > 0.8) { c.fillStyle = "#FFFFFF"; A.starPath(c, 12, -52 + bob, 5, 4, 0.3); c.fill(); }
        },
        update(e, dt, E2) {
          if (e.magnet && E2.player) { e.x = U.lerp(e.x, E2.player.x, dt * 4); e.y = U.lerp(e.y, E2.player.y, dt * 4); e.sortY = e.y; }
        },
        collect() {
          if (s.taken) return;
          s.taken = true;
          RW.save.foundStars[id] = Date.now();
          E.remove(s);
          RW.sfx.play("chime");
          E.burst(s.x, s.y, 36, "star", 14, { up: 320 });
          E.float(s.x, s.y - 80, "+1 ⭐", { col: "#FFE25C", size: 34 });
          RW.addStars(1, "world");
          E.flyStarFrom(s.x, s.y - 40, 1);
          const found = Object.keys(RW.save.foundStars).length;
          if (found === HIDDEN_STARS.length) E.later(1.2, () => E.toast("You found EVERY hidden star!", "🌟"));
        },
      });
      s.tap = { reach: "walk", at: [0, 0], range: 20, act: noop };
    });
    // collectibles placed in the world
    [["baseball", 2880, 1135], ["soccerball", 950, 2190], ["crown", 3720, 1640]].forEach(([id, x, y]) => {
      if (!RW.collection.has(id)) world.placeItem(id, x, y);
    });
  }

  world.placeItem = (itemId, x, y) => {
    const it = add({
      kind: "item", itemId, x, y, box: [-30, -90, 30, 6], shadow: [16, 5, 0, 0, 0.18], z: 0,
      draw(c, E2, e) {
        const bob = Math.sin(E2.t * 2.2 + x) * 6;
        c.save(); c.translate(0, -44 + bob - e.z);
        c.fillStyle = A.rad(c, 0, 0, 4, 0, 0, 38, ["rgba(255,255,255,.7)", "rgba(180,140,255,.25)", "rgba(180,140,255,0)"]);
        c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill();
        c.rotate(Math.sin(E2.t * 1.5) * 0.15);
        world.drawItem(c, itemId, 20);
        c.restore();
        c.globalAlpha = 0.5 + Math.sin(E2.t * 5) * 0.5;
        c.fillStyle = "#FFFFFF"; A.starPath(c, 20, -76 + bob, 6, 4, 0.3); c.fill(); c.globalAlpha = 1;
      },
      update(e, dt, E2) { if (e.magnet && E2.player && !e.flying) { e.x = U.lerp(e.x, E2.player.x, dt * 3); e.y = U.lerp(e.y, E2.player.y, dt * 3); } },
      collect() {
        if (it.taken || it.flying) return;
        it.taken = true;
        E.remove(it);
        if (RW.collection.give(itemId)) {
          RW.sfx.play("magic");
          E.burst(it.x, it.y, 40, "sparkle", 16, { up: 300 });
          E.float(it.x, it.y - 100, "NEW!", { col: "#FFFFFF", size: 32, stroke: "#8A5CE0" });
        }
      },
    });
    it.tap = { reach: "walk", at: [0, 0], range: 20, act: noop };
    return it;
  };
  // An item pops out of something and lands on the ground to be picked up.
  world.popItem = (itemId, fx, fy, tx, ty) => {
    const it = world.placeItem(itemId, fx, fy);
    it.flying = true;
    const t0 = E.t;
    const f = E.nearestFree(tx, ty) || [tx, ty];
    const up = it.update;
    it.update = (e, dt, E2) => {
      const u = Math.min(1, (E2.t - t0) / 0.9);
      e.x = U.lerp(fx, f[0], u); e.y = U.lerp(fy, f[1], u); e.z = Math.sin(u * Math.PI) * 120 + (1 - u) * 40;
      e.sortY = e.y;
      if (u >= 1) { e.flying = false; e.z = 0; e.update = up; RW.sfx.play("bounce"); }
    };
    RW.sfx.play("pop");
  };

  // Canvas art for collection items (games may register items with just an emoji icon).
  world.drawItem = (c, id, r) => {
    if (id === "baseball") P_.baseball(c, r * 0.8);
    else if (id === "soccerball") { c.translate(0, r * 0.8); P_.soccerBall(c, r * 0.8); c.strokeStyle = "#FFD23F"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -r * 0.8, r * 0.8, 0, TAU); c.stroke(); }
    else if (id === "crown") {
      c.fillStyle = A.lin(c, 0, -r, 0, r * 0.6, ["#FFF1A0", "#FFD23F", "#E09A00"]);
      c.beginPath(); c.moveTo(-r, r * 0.5); c.lineTo(-r, -r * 0.4); c.lineTo(-r * 0.5, r * 0.05); c.lineTo(0, -r * 0.7); c.lineTo(r * 0.5, r * 0.05); c.lineTo(r, -r * 0.4); c.lineTo(r, r * 0.5); c.closePath(); c.fill();
      [["#E8453C", -r * 0.5], ["#2F9BFF", 0], ["#2EB872", r * 0.5]].forEach(([col, x]) => { c.fillStyle = col; c.beginPath(); c.arc(x, r * 0.25, r * 0.13, 0, TAU); c.fill(); });
      c.fillStyle = "#FFFFFF"; [-r, 0, r].forEach((x, i) => { c.beginPath(); c.arc(x, i === 1 ? -r * 0.75 : -r * 0.45, r * 0.12, 0, TAU); c.fill(); });
    } else if (id === "dogbone") {
      c.rotate(-0.4); c.fillStyle = "#FFF8EC"; c.strokeStyle = "#D9CBB0"; c.lineWidth = 2;
      c.beginPath(); A.rr(c, -r * 0.7, -r * 0.2, r * 1.4, r * 0.4, r * 0.2);
      [[-r * 0.75, -r * 0.2], [-r * 0.75, r * 0.2], [r * 0.75, -r * 0.2], [r * 0.75, r * 0.2]].forEach(([x, y]) => { c.moveTo(x + r * 0.26, y); c.arc(x, y, r * 0.26, 0, TAU); });
      c.fill(); c.stroke();
    } else if (id === "moonrock") {
      c.fillStyle = A.rad(c, -r * 0.3, -r * 0.3, 2, 0, 0, r, ["#F4F2EA", "#B9B6AC", "#7E7B72"]);
      c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(-r, -r * 0.8, -r * 0.1, -r * 0.8); c.quadraticCurveTo(r, -r * 0.9, r, 0); c.quadraticCurveTo(r * 0.9, r * 0.7, 0, r * 0.7); c.quadraticCurveTo(-r, r * 0.7, -r, 0); c.fill();
      c.fillStyle = "rgba(90,85,75,.35)"; [[-0.4, -0.2, 0.2], [0.3, 0.1, 0.16], [0, 0.35, 0.1]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); });
      c.fillStyle = "rgba(170,255,120,.5)"; c.beginPath(); c.arc(r * 0.3, -r * 0.4, r * 0.12, 0, TAU); c.fill();
    } else if (id === "chefhat") {
      c.fillStyle = "#FFFFFF"; c.strokeStyle = "#D9DDE6"; c.lineWidth = 2;
      A.rr(c, -r * 0.6, -r * 0.05, r * 1.2, r * 0.6, 4); c.fill(); c.stroke();
      [[-0.45, -0.35, 0.45], [0.45, -0.35, 0.45], [0, -0.6, 0.55]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); });
      c.fillStyle = "rgba(0,0,0,.06)"; c.fillRect(-r * 0.6, r * 0.2, r * 1.2, 3);
    } else {
      const it = RW.collection.byId[id];
      A.text(c, it ? it.icon : "?", 0, 0, r * 1.6, "#FFFFFF");
    }
  };

  // ---------------------------------------------------------------------
  // TREES EVERYWHERE ELSE (placed after everything so they avoid it)
  // ---------------------------------------------------------------------
  function distToPath(x, y) {
    let best = 1e9;
    for (const p of L.paths) {
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        const t = U.clamp(((x - ax) * dx + (y - ay) * dy) / (l2 || 1), 0, 1);
        const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) - p.w / 2;
        if (d < best) best = d;
      }
    }
    return best;
  }
  // rectangles kept clear of scatter trees (fields, lots, plazas, and so on)
  const KEEP_CLEAR = [
    [2020, 600, 2900, 1520],  // baseball + backyard
    [2100, 1500, 3000, 1870], // Rosenberg House front yard and driveway
    [880, 2040, 1900, 3050],  // sports complex
    [1900, 2020, 2260, 2320], // playground
    [2150, 2380, 2780, 2820], // arcade and its front lawn
    [3200, 1350, 4050, 2260], // plaza + lot
    [3040, 2320, 3460, 2640], // Frozenbergs ice cream stand
    [3350, 540, 4100, 1060],  // fart man zone
    [120, 540, 1030, 1230],   // raceway + garage
    [1200, 620, 1800, 1060],  // academy
    [1150, 1480, 1800, 1850], // kitchen
    [2980, 1340, 3180, 1760], // upgrade plots (east)
    [1980, 1170, 2180, 1720], // upgrade plots (west)
    [3950, 0, 5200, 3400],    // beach and ocean
    [2980, 360, 3340, 600],   // gondola
    [600, 2140, 800, 2280],   // woods treehouse
    [140, 1440, 440, 1640],   // cave
  ];
  function clearSpot(x, y) {
    for (const [x0, y0, x1, y1] of KEEP_CLEAR) if (x > x0 && x < x1 && y > y0 && y < y1) return false;
    if (Math.abs(y - 1905) < 70 && Math.abs(x - 455) < 110) return false;
    return true;
  }
  function scatterTrees() {
    const rnd = U.seeded(2024);
    const placed = [];
    const ok = (x, y, gap) => placed.every(([px, py]) => Math.hypot(px - x, (py - y) * 1.3) > gap);
    let minPath = 45;
    const tryTree = (x, y, kinds, gap, s, tap) => {
      if (!clearSpot(x, y) || distToPath(x, y) < minPath || E.blocked(x, y, 30) || !ok(x, y, gap)) return false;
      placed.push([x, y]);
      tree(x, y, kinds[Math.floor(rnd() * kinds.length)], s, { tap });
      return true;
    };
    // Adventure Woods: dense
    for (let i = 0; i < 520; i++) tryTree(130 + rnd() * 780, 1180 + rnd() * 1400, ["deep", "pine", "round", "pine"], 88, 0.95 + rnd() * 0.35, false);
    // the rest of the neighborhood: scattered
    minPath = 80;
    for (let i = 0; i < 420; i++) tryTree(150 + rnd() * 3800, 420 + rnd() * 2620, ["round", "deep", "round", "deep", "blossom", "round", "gold"], 270, 0.9 + rnd() * 0.3, false);
    // northern tree line (hides where the ground meets the mountains)
    for (let x = 40; x < 4000; x += 70 + rnd() * 40) {
      if (x > 3050 && x < 3280) continue;
      tree(x, 372 + rnd() * 20, rnd() < 0.7 ? "pine" : "deep", 0.9 + rnd() * 0.3, { solid: false, tap: false });
    }
    // western forest edge (beyond the playable area)
    for (let y = 400; y < 3100; y += 60 + rnd() * 30) {
      if (Math.abs(y - 1890) < 60 || Math.abs(y - 2280) < 50 || Math.abs(y - 1310) < 50) { tree(-40, y, "pine", 1, { solid: false, tap: false }); continue; }
      tree(40 + rnd() * 40, y, rnd() < 0.6 ? "pine" : "deep", 1 + rnd() * 0.3, { solid: false, tap: false });
      tree(-50 + rnd() * 30, y + 30, "pine", 1.1, { solid: false, tap: false });
    }
  }

  // ---------------------------------------------------------------------
  // per-frame world logic that isn't owned by one entity
  // ---------------------------------------------------------------------
  const baseUpdate = world.update;
  world.update = (dt, E2) => {
    updateTween(dt);
    // chimney smell from Ariel's kitchen
    if (U.chance(dt * 1.6)) E2.burst(1420 - 120, 1720, 340, U.chance(0.5) ? "smoke" : "smell", 1, { sp: 16, up: 40, dir: -Math.PI / 2 });
    if (world.updateLife) world.updateLife(dt, E2);
  };
})();
