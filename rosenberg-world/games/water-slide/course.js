// Splash Down: the slides and the physics. No DOM in here, so node can run it too
// (the autopilot below is also what sets each slide's par time).
//
// The slide is a U-shaped trough (a full tube in tunnels) built from short segments.
// A rider's place in it is an angle `th` around the tube: 0 is the bottom, +/- is up the
// right/left wall. Curves fling you toward the outside wall; gravity pulls you back down;
// leaning pushes you. Past the lip of an open trough, you're out.

(function (root) {
  const SEG = 200;            // world units per segment
  const R = 1000;             // tube radius
  const LIP = 1.78;           // edge of the open trough, radians from the bottom (~102°)
  const TUNNEL_MAX = 2.75;    // in a tunnel you can ride almost all the way over the top

  const PHYS = {
    GRAV: 12000,   // downhill push per unit of slope
    DRAG: 1e-4,    // water + air drag (x speed²)
    SCRUB: 700,    // riding high on the wall bleeds a little speed
    VMIN: 1800,
    CENT: 0.8,     // how hard curves fling you (x curve x (speed/5000)²)
    GT: 7,         // gravity pulling you back to the bottom
    ST: 7.5,       // how hard a lean pushes
    DAMP: 2.4,
    BOOST: 6000,
  };

  // [segments, curve, slope, duck pattern, flags]  flags: t = tunnel, b = boost pads, x = beach balls
  const SLIDES = [
    {
      id: "green", name: "Gecko Glide", level: "Easy", seed: 11, vmax: 5200, theme: "morning",
      blurb: "Wide, lazy turns and one good drop.",
      body: [47, 191, 113], band: [34, 158, 92], tunnel: [30, 150, 120],
      sections: [
        [20, 0, 0.06, ""], [30, 0, 0.12, "line"], [50, 5, 0.1, "outer"], [20, 0, 0.12, "zig"],
        [55, -7, 0.1, "outer"], [25, 0, 0.3, "line", "b"], [50, 10, 0.1, "outer"], [20, 0, 0.14, "zig"],
        [45, -6, 0.12, "outer"], [40, 6, 0.12, "outer"], [30, 0, 0.22, "line", "b"], [60, -11, 0.1, "outer"],
        [25, 0, 0.12, "zig"], [50, 7, 0.12, "outer"], [30, -5, 0.14, "outer"], [30, 0, 0.25, "line"], [15, 0, 0.04, ""],
      ],
    },
    {
      id: "blue", name: "Blue Lagoon", level: "Medium", seed: 23, vmax: 6400, theme: "noon",
      blurb: "Tunnels, faster turns, beach balls in the way.",
      body: [47, 127, 224], band: [33, 98, 186], tunnel: [110, 66, 214],
      sections: [
        [20, 0, 0.08, ""], [30, 0, 0.18, "line", "b"], [50, 7, 0.14, "outer"], [25, 0, 0.16, "", "x"],
        [60, -8, 0.14, "high", "t"], [30, 0, 0.3, "zig", "b"], [45, 9, 0.12, "outer"], [35, -9, 0.12, "outer"],
        [30, 0, 0.18, "", "x"], [70, 6, 0.16, "spiral", "t"], [30, 0, 0.35, "line", "b"], [50, -10, 0.12, "outer"],
        [25, 0, 0.18, "zig", "x"], [45, 8, 0.14, "outer"], [45, -8, 0.14, "outer", "t"], [30, 0, 0.28, "line", "b"],
        [60, 9, 0.12, "outer"], [30, 0, 0.2, "", "x"], [15, 0, 0.04, ""],
      ],
    },
    {
      id: "black", name: "Black Mamba", level: "Hard", seed: 37, vmax: 7800, theme: "sunset",
      blurb: "Cliff drops, long dark tunnels, no mercy.",
      body: [44, 46, 60], band: [255, 196, 0], tunnel: [24, 24, 34],
      sections: [
        [15, 0, 0.1, ""], [30, 0, 0.45, "line", "b"], [40, -6, 0.2, "outer"], [40, 6, 0.2, "outer"],
        [25, 0, 0.25, "", "x"], [80, -7, 0.18, "spiral", "t"], [25, 0, 0.5, "zig", "b"], [45, 6, 0.12, "outer"],
        [25, 0, 0.2, "", "x"], [35, -8, 0.14, "outer"], [35, 8, 0.14, "outer"], [30, 0, 0.4, "line", "b"],
        [90, 6, 0.2, "spiral", "t"], [30, 0, 0.25, "", "x"], [45, -9, 0.12, "outer"], [25, 0, 0.45, "zig", "b"],
        [50, 7, 0.16, "high", "t"], [40, -7, 0.16, "outer"], [30, 0, 0.3, "", "x"], [40, 0, 0.5, "line", "b"], [15, 0, 0.04, ""],
      ],
    },
  ];

  function seeded(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  function build(slide) {
    const rnd = seeded(slide.seed);
    const segs = [];
    let y = 0, slope = 0.05, ducks = 0;
    for (const [n, c, s, pat, flags = ""] of slide.sections) {
      const start = segs.length;
      const sign = Math.sign(c) || 1;
      for (let j = 0; j < n; j++) {
        const t = j / n;
        const ease = c ? smooth(clamp(Math.min(t, 1 - t) / 0.22, 0, 1)) : 0;
        slope += (s - slope) * 0.09;
        segs.push({ i: segs.length, curve: c * ease, y, slope, tunnel: flags.includes("t"), boost: flags.includes("b") && j >= 2 && j < 7, items: [] });
        y -= slope * SEG;
      }
      const add = (j, kind, phi) => { segs[start + j].items.push({ kind, phi, taken: false }); if (kind === "duck") ducks++; };
      if (flags.includes("x")) {
        for (let j = 5; j < n - 3; j += 7 + Math.floor(rnd() * 4)) add(j, "ball", (rnd() * 2 - 1) * 0.8);
      }
      for (let j = 3; j < n - 2; j++) {
        const t = j / n;
        if (pat === "line" && j % 5 === 0 && j > 8) add(j, "duck", 0);
        else if (pat === "zig" && j % 3 === 0) add(j, "duck", 0.85 * Math.sin(j / 5));
        else if (pat === "outer" && j % 4 === 0 && t > 0.3 && t < 0.72) add(j, "duck", -sign * 1.05);
        else if (pat === "high" && j % 4 === 0 && t > 0.25 && t < 0.8) add(j, "duck", -sign * 2.05);
        else if (pat === "spiral" && j % 3 === 0 && t > 0.15 && t < 0.85) add(j, "duck", -sign * (0.3 + 2.1 * Math.sin(Math.PI * (t - 0.15) / 0.7)));
      }
    }
    for (let i = 0; i < segs.length; i++) segs[i].y2 = i + 1 < segs.length ? segs[i + 1].y : y;
    return { slide, segs, endY: y, length: segs.length * SEG, ducks, vmax: slide.vmax };
  }

  function yAt(C, z) {
    const i = clamp(Math.floor(z / SEG), 0, C.segs.length - 1), s = C.segs[i];
    const f = clamp(z / SEG - i, 0, 1);
    return s.y + (s.y2 - s.y) * f;
  }

  function newRider() { return { z: SEG * 2, speed: 0, th: 0, om: 0, steer: 0, boost: 0 }; }

  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // One physics tick. Returns what happened: items touched, "boost", "wipe", "finish".
  function step(p, C, steer, dt) {
    const ev = [];
    const i = clamp(Math.floor(p.z / SEG), 0, C.segs.length - 1), seg = C.segs[i];

    let a = PHYS.GRAV * seg.slope - PHYS.DRAG * p.speed * p.speed - PHYS.SCRUB * Math.abs(Math.sin(p.th));
    if (p.boost > 0) { a += PHYS.BOOST; p.boost -= dt; }
    const was = p.speed;
    p.speed = Math.max(PHYS.VMIN, p.speed + a * dt);
    // each slide has a top speed; a boost can beat it for a moment, then you ease back down
    if (p.boost > 0) p.speed = Math.min(p.speed, C.vmax * 1.2);
    else if (p.speed > C.vmax) p.speed = Math.max(C.vmax, was - 3000 * dt);

    p.steer += (steer - p.steer) * Math.min(1, dt * 12);
    const ac = -seg.curve * PHYS.CENT * (p.speed / 5000) ** 2;
    const al = -PHYS.GT * Math.sin(p.th) + ac + p.steer * PHYS.ST - PHYS.DAMP * p.om;
    p.om += al * dt;
    p.th += p.om * dt;
    if (seg.tunnel) {
      if (Math.abs(p.th) > TUNNEL_MAX) { p.th = Math.sign(p.th) * TUNNEL_MAX; p.om *= -0.3; }
    } else if (Math.abs(p.th) > LIP) ev.push("wipe");

    const z0 = p.z;
    p.z += p.speed * dt;
    const last = Math.min(C.segs.length - 1, Math.floor(p.z / SEG));
    for (let s = Math.floor(z0 / SEG); s <= last; s++) {
      const iz = (s + 0.5) * SEG;
      if (iz <= z0 || iz > p.z) continue;
      for (const it of C.segs[s].items) {
        if (it.taken) continue;
        const d = angDiff(p.th, it.phi);
        if (Math.abs(d) < 0.3) {
          it.taken = true; ev.push(it);
          if (it.kind === "ball") { p.speed *= 0.7; p.om += (d < 0 ? -1 : 1) * 2.5; } // bonk: slows you and knocks you sideways
        }
      }
    }
    if (C.segs[last].boost && Math.abs(p.th) < 0.5 && p.boost < 0.4) { p.boost = 0.9; ev.push("boost"); }
    if (p.z >= C.length) ev.push("finish");
    return ev;
  }

  // What the centrifugal push is right now, so the autopilot can lean against it.
  function fling(p, C) {
    const seg = C.segs[clamp(Math.floor(p.z / SEG), 0, C.segs.length - 1)];
    return -seg.curve * PHYS.CENT * (p.speed / 5000) ** 2;
  }

  function autopilot(p, C) {
    return clamp(-fling(p, C) / PHYS.ST - 1.6 * p.th - 0.6 * p.om, -1, 1);
  }

  // Ride the slide with the autopilot (who ignores ducks) to get a par time.
  const parCache = {};
  function par(slide) {
    if (parCache[slide.id]) return parCache[slide.id];
    const C = build(slide), p = newRider(), dt = 1 / 60;
    let t = 0;
    while (t < 600) {
      t += dt;
      const ev = step(p, C, autopilot(p, C), dt);
      if (ev.includes("finish")) break;
    }
    return (parCache[slide.id] = Math.ceil(t + 2));
  }

  const api = { SEG, R, LIP, TUNNEL_MAX, PHYS, SLIDES, build, yAt, newRider, step, fling, autopilot, par, angDiff };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WS = api;
})(typeof window !== "undefined" ? window : globalThis);
