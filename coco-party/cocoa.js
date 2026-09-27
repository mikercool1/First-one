"use strict";
// Coco Party: the hot chocolate itself, drawn on canvas with light and shade.
// COCOA_ART.drink(c, build, x, y, s, t, opts) draws a drink with its rim centred at (x, y).
// COCOA_ART.icon(c, kind, key, x, y, s, t) draws a builder tile picture centred at (x, y).
const COCOA_ART = (() => {
  const TAU = Math.PI * 2;
  const DEPTH = 118;          // how far the bottom of a cup sits below its rim

  const CUPS = {
    mug: { n: "Mug", top: 48, bot: 45, h: 112, handle: true },
    paper: { n: "Paper Cup", top: 52, bot: 37, h: 118 },
    glass: { n: "Glass Mug", top: 46, bot: 40, h: 108, handle: true, glass: true },
  };
  const COCOAS = {
    dark: { n: "Hot Chocolate", c: "#7A4424", h: "#B0714A", d: "#4A2412", foam: "#C79A74" },
    white: { n: "White Hot Chocolate", c: "#F4E6CE", h: "#FFFBF2", d: "#D8C09A", foam: "#FFFFFF" },
  };
  const SAUCE = { c: "#4A2414", h: "#9A5E42" };

  // ---------- primitives ----------
  function lin(c, x0, y0, x1, y1, ...cols) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k));
    return g;
  }
  function rad(c, fx, fy, x, y, r, ...cols) {
    const g = c.createRadialGradient(fx, fy, 0, x, y, Math.max(1, r));
    cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k));
    return g;
  }
  function ell(c, x, y, rx, ry, f, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); c.fillStyle = f; c.fill(); }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const hash = (str) => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  function shadow(c, x, y, rx, ry, a = .3) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fillStyle = rad(c, 0, 0, 0, 0, rx, `rgba(50,25,20,${a})`, `rgba(50,25,20,${a * .4})`, "rgba(50,25,20,0)"); c.fill();
    c.restore();
  }

  // ---------- cups ----------
  function bodyPath(c, K) {
    const b = K.h, ry = K.top * .26, by = K.bot * .26;
    c.beginPath(); c.moveTo(-K.top, 0); c.lineTo(-K.bot, b); c.ellipse(0, b, K.bot, by, 0, Math.PI, 0, true); c.lineTo(K.top, 0);
    c.ellipse(0, 0, K.top, ry, 0, 0, Math.PI, false); c.closePath();
  }
  function handle(c, K, col, dk, glass) {
    const x = K.top - 4, y0 = K.h * .18, y1 = K.h * .74;
    c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x + 44, y0 - 6, x + 44, y1 + 4, x - 4, y1);
    c.lineWidth = glass ? 11 : 15; c.lineCap = "round"; c.strokeStyle = dk; c.stroke();
    c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x + 40, y0 - 6, x + 40, y1 + 4, x - 4, y1);
    c.lineWidth = glass ? 7 : 11; c.strokeStyle = col; c.stroke();
    c.beginPath(); c.moveTo(x + 14, y0 + 2); c.bezierCurveTo(x + 30, y0 + 6, x + 34, y0 + 20, x + 32, y0 + 32);
    c.lineWidth = 3; c.strokeStyle = "rgba(255,255,255,.5)"; c.stroke();
  }
  // surface of the drink, seen through the rim. f = how full (0..1)
  function surface(c, K, cocoa, f, seed) {
    const C = COCOAS[cocoa], ry = K.top * .26, rx = K.top - 5;
    c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry - 3, 0, 0, TAU); c.clip();
    const sy = (1 - f) * K.h * .7 + 5;
    ell(c, 0, sy, rx, ry - 3, rad(c, -rx * .3, sy - 4, 0, sy, rx, C.h, C.c, C.d));
    if (f > .6) {
      // a little foam ring and bubbles
      c.beginPath(); c.ellipse(0, sy, rx - 3, ry - 6, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = C.foam; c.globalAlpha = .55; c.stroke(); c.globalAlpha = 1;
      const r = rng(seed + 5);
      for (let i = 0; i < 7; i++) { const a = r() * TAU, d = .55 + r() * .35; ell(c, Math.cos(a) * rx * d, sy + Math.sin(a) * (ry - 5) * d, 2.2, 1.5, C.foam); }
    }
    ell(c, -rx * .35, sy - 3, rx * .22, 2.4, "rgba(255,255,255,.45)", -.08);
    c.restore();
  }
  function cup(c, kind, cocoa, fill, seed) {
    const K = CUPS[kind], ry = K.top * .26;
    if (kind === "glass") {
      // the drink shows through the glass
      if (cocoa) {
        const C = COCOAS[cocoa], sy = (1 - fill) * K.h * .7 + 5;
        c.save(); bodyPath(c, K); c.clip();
        c.fillStyle = lin(c, -K.top, 0, K.top, 0, C.d, C.c, C.h, C.c, C.d); c.fillRect(-K.top, sy, K.top * 2, K.h + 20);
        c.restore();
      }
      c.save(); bodyPath(c, K);
      c.fillStyle = lin(c, -K.top, 0, K.top, 0, "rgba(200,225,240,.45)", "rgba(255,255,255,.12)", "rgba(255,255,255,.05)", "rgba(200,225,240,.5)"); c.fill();
      c.lineWidth = 3; c.strokeStyle = "rgba(170,200,220,.8)"; c.stroke();
      c.restore();
      ell(c, 0, K.h + 2, K.bot + 3, K.bot * .26 + 3, "rgba(190,215,235,.7)");
      c.beginPath(); c.moveTo(-K.top + 10, 12); c.lineTo(-K.bot + 8, K.h - 10); c.lineWidth = 6; c.lineCap = "round"; c.strokeStyle = "rgba(255,255,255,.65)"; c.stroke();
      handle(c, K, "rgba(215,235,248,.85)", "rgba(150,185,210,.9)", true);
      ell(c, 0, 0, K.top, ry, "rgba(210,232,245,.9)");
      if (cocoa) surface(c, K, cocoa, fill, seed);
      else ell(c, 0, 1, K.top - 5, ry - 3, "rgba(225,240,250,.9)");
      c.beginPath(); c.ellipse(0, 0, K.top, ry, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = "rgba(160,195,218,.95)"; c.stroke();
      return;
    }
    if (K.handle) handle(c, K, "#D8443B", "#9E2B25");
    c.save(); bodyPath(c, K); c.clip();
    if (kind === "mug") {
      c.fillStyle = lin(c, -K.top, 0, K.top, 0, "#A92F28", "#E25248", "#F07A6E", "#D8443B", "#8E2520"); c.fillRect(-60, -20, 120, 150);
      // white band with a row of snowflakes
      c.fillStyle = "rgba(255,248,240,.95)"; c.fillRect(-60, K.h * .38, 120, 26);
      c.strokeStyle = "#D8443B"; c.lineWidth = 2.2; c.lineCap = "round";
      for (const fx of [-30, 0, 30]) {
        const fy = K.h * .38 + 13;
        for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(fx - Math.cos(a) * 8, fy - Math.sin(a) * 8); c.lineTo(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8); c.stroke(); }
      }
    } else {
      c.fillStyle = lin(c, -K.top, 0, K.top, 0, "#E8E0D6", "#FFFFFF", "#FBF7F1", "#D8CEC2"); c.fillRect(-60, -20, 120, 150);
      // cardboard sleeve with a little heart
      c.fillStyle = lin(c, -K.top, 0, K.top, 0, "#9C6A3E", "#C9965E", "#B98548", "#86552E"); c.fillRect(-60, K.h * .3, 120, K.h * .38);
      c.fillStyle = "rgba(90,50,20,.25)"; for (let y = K.h * .3 + 4; y < K.h * .68; y += 6) c.fillRect(-60, y, 120, 1.5);
      c.save(); c.translate(0, K.h * .49); c.scale(1.1, 1.1);
      c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-14, -2, -8, -12, 0, -5); c.bezierCurveTo(8, -12, 14, -2, 0, 8); c.fillStyle = "#E4473F"; c.fill(); c.restore();
    }
    c.fillStyle = lin(c, -K.top, 0, K.top, 0, "rgba(40,10,10,.25)", "rgba(255,255,255,.18)", "rgba(255,255,255,0)", "rgba(40,10,10,.1)", "rgba(40,10,10,.35)");
    c.fillRect(-60, -20, 120, 150);
    c.restore();
    // rim + inside
    const rimCol = kind === "mug" ? "#F1E4DA" : "#FFFFFF", rimDk = kind === "mug" ? "#B9A89C" : "#D9CFC3";
    ell(c, 0, 1.5, K.top, ry + 1, rimDk);
    ell(c, 0, 0, K.top, ry, rimCol);
    ell(c, 0, 1, K.top - 5, ry - 3, rad(c, 0, 6, 0, 1, K.top, kind === "mug" ? "#E8D8CC" : "#F3ECE3", kind === "mug" ? "#B89E8E" : "#CFC3B4"));
    if (cocoa) surface(c, K, cocoa, fill, seed);
  }

  // ---------- toppings ----------
  function whip(c, y) {
    const layers = [[40, 14, 0], [32, 12, -15], [22, 10, -28], [13, 8, -39]];
    for (const [rx, ry, dy] of layers) {
      ell(c, 0, y + dy + 3, rx, ry, "#E6DAD2");
      ell(c, 0, y + dy, rx, ry, rad(c, -rx * .35, y + dy - ry * .6, 0, y + dy, rx * 1.1, "#FFFFFF", "#FFFDFB", "#EFE5DE"));
      c.beginPath(); c.ellipse(0, y + dy, rx * .8, ry * .55, 0, Math.PI * 1.1, Math.PI * 1.6); c.strokeStyle = "rgba(205,185,175,.7)"; c.lineWidth = 2; c.stroke();
    }
    c.beginPath(); c.moveTo(-8, y - 43); c.quadraticCurveTo(2, y - 70, 10, y - 55); c.quadraticCurveTo(6, y - 47, 8, y - 41); c.closePath();
    c.fillStyle = rad(c, -2, y - 58, 0, y - 52, 18, "#FFFFFF", "#EFE5DE"); c.fill();
    return y - 60;
  }
  function marsh(c, x, y, rot, sc = 1, tint = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
    rr(c, -7, -6, 14, 12, 4); c.fillStyle = "rgba(120,80,70,.28)"; c.fill();
    rr(c, -7, -7, 14, 12, 4); c.fillStyle = rad(c, -3, -5, 0, -1, 12, "#FFFFFF", tint ? "#FFE3EC" : "#FBF3EA", tint ? "#F0C2D0" : "#E6D6C6"); c.fill();
    c.lineWidth = 1; c.strokeStyle = "rgba(150,120,110,.45)"; c.stroke();
    c.restore();
  }
  function marshmallows(c, K, seed, onWhip) {
    const r = rng(seed + 9);
    if (onWhip) {
      // a ring around the whip plus a couple tucked into the swirl
      for (const [x, y] of [[-34, -2], [-18, 5], [4, 7], [24, 4], [36, -3], [-24, -18], [22, -20], [-6, -34]]) marsh(c, x, y, r() - .5, .95, r() < .3);
      return;
    }
    const pts = [[-26, 0], [-10, 3], [8, 1], [26, 0], [-18, -6], [2, -7], [18, -6], [-4, -13], [12, 5]];
    for (const [x, y] of pts) marsh(c, x * K.top / 48, y, r() - .5, 1, r() < .3);
  }
  function sauce(c, K, top, onWhip, seed) {
    const r = rng(seed + 11);
    c.lineCap = "round"; c.lineJoin = "round";
    const stroke = (w, col) => { c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    if (onWhip) {
      // zig-zag drizzle over the whipped cream
      c.beginPath();
      const rows = [[-38, -2], [34, -10], [-30, -18], [26, -26], [-18, -34], [12, -42], [-4, -50]];
      rows.forEach(([x, y], i) => (i ? c.lineTo(x * .95, y) : c.moveTo(x * .95, y)));
      stroke(5, SAUCE.c); c.globalAlpha = .6; c.save(); c.translate(-1, -1.5); stroke(1.6, SAUCE.h); c.restore(); c.globalAlpha = 1;
    } else {
      // a swirl on the surface
      c.save(); c.beginPath(); c.ellipse(0, 0, K.top - 6, K.top * .26 - 3, 0, 0, TAU); c.clip();
      c.beginPath();
      for (let a = 0; a < TAU * 2.2; a += .15) { const d = 4 + a * 3.1; const x = Math.cos(a) * d, y = 5 + Math.sin(a) * d * .25; a ? c.lineTo(x, y) : c.moveTo(x, y); }
      stroke(4, SAUCE.c); c.restore();
    }
    // drips over the rim
    for (const [fx, len] of [[-.6, 16], [.15, 26], [.7, 12]]) {
      const x = fx * K.top, ey = Math.sqrt(1 - fx * fx) * K.top * .26, L = len * (.8 + r() * .4);
      c.beginPath(); c.moveTo(x, ey - 2); c.lineTo(x, ey + L); stroke(6, SAUCE.c);
      ell(c, x, ey + L + 1, 4, 4.5, SAUCE.c);
      ell(c, x - 1.2, ey + L - 1, 1.2, 1.8, "rgba(255,255,255,.4)");
    }
  }
  function steam(c, y, t, a = 1) {
    c.save(); c.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const k = ((t * .45 + i / 3) % 1), x = (i - 1) * 18, yy = y - k * 46;
      c.globalAlpha = a * Math.sin(k * Math.PI) * .7;
      c.beginPath(); c.moveTo(x, yy);
      c.bezierCurveTo(x + 10, yy - 12, x - 10, yy - 22, x + Math.sin(t * 2 + i) * 4, yy - 34);
      c.lineWidth = 6; c.strokeStyle = "#FFFFFF"; c.stroke();
    }
    c.restore();
  }

  // Height above the rim a finished drink reaches (for fitting it in a box).
  const above = (b) => ((b.tops || []).includes("whip") ? 72 : (b.tops || []).includes("marsh") ? 16 : 8);

  // Main entry: rim centred at (x, y).
  function drink(c, b, x, y, s, t = 0, o = {}) {
    c.save(); c.translate(x, y); c.scale(s, s); if (o.rot) c.rotate(o.rot);
    const K = CUPS[b.cup || "mug"];
    if (o.shadow) shadow(c, 0, K.h + 4, K.bot + 8, 9, .35);
    if (o.mystery || !b.cup) {
      c.save(); c.setLineDash([9, 9]); c.lineWidth = 4; c.strokeStyle = "rgba(150,110,90,.6)";
      bodyPath(c, CUPS.mug); c.stroke();
      c.beginPath(); c.moveTo(44, 20); c.bezierCurveTo(84, 14, 84, 86, 40, 82); c.stroke();
      c.restore();
      if (o.mystery) {
        c.font = `400 76px "Lilita One", "Fredoka", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "#E4473F"; c.fillText("?", 0, 58);
      }
      c.restore(); return;
    }
    const tops = new Set(b.tops || []), seed = hash((b.cup || "") + (b.cocoa || "") + (b.tops || []).join());
    const fill = b.cocoa ? ease(o.dropT ?? 1) : 0;
    cup(c, b.cup, b.cocoa, fill, seed);
    if (b.cocoa && !o.noSteam && !tops.has("whip")) steam(c, -8, t, fill);
    if (b.cocoa && fill > .7) {
      const onWhip = tops.has("whip");
      if (onWhip) whip(c, -2);
      if (tops.has("marsh")) marshmallows(c, K, seed, onWhip);
      if (tops.has("sauce")) sauce(c, K, 0, onWhip, seed);
      if (onWhip && !o.noSteam) { c.save(); c.translate(34, -30); c.scale(.6, .6); steam(c, 0, t, .6); c.restore(); }
    }
    c.restore();
  }

  // ---------- builder tile pictures ----------
  function pot(c, k, t) {
    const C = COCOAS[k];
    // a big steaming pot of cocoa with a ladle
    ell(c, 0, 36, 42, 9, "rgba(60,30,20,.2)");
    c.beginPath(); c.moveTo(-40, -6); c.lineTo(-36, 30); c.ellipse(0, 30, 36, 9, 0, Math.PI, 0, true); c.lineTo(40, -6); c.closePath();
    c.fillStyle = lin(c, -40, 0, 40, 0, "#7C8592", "#E4E8EE", "#C3CAD4", "#6A7380"); c.fill();
    for (const sd of [-1, 1]) { rr(c, sd * 40 - (sd > 0 ? 0 : 12), 2, 12, 6, 3); c.fillStyle = "#3A3A44"; c.fill(); }
    ell(c, 0, -6, 40, 11, "#B9C1CC");
    ell(c, 0, -5, 35, 8.5, rad(c, -10, -8, 0, -5, 36, C.h, C.c, C.d));
    c.beginPath(); c.moveTo(12, -6); c.lineTo(30, -46); c.lineWidth = 5; c.lineCap = "round"; c.strokeStyle = "#8A5A34"; c.stroke();
    ell(c, 10, -5, 8, 3, "#6A7380");
    steam(c, -12, t + 1.2, .9);
  }
  function bottle(c) {
    c.beginPath(); rr(c, -22, -30, 44, 76, 14); c.fillStyle = lin(c, -22, 0, 22, 0, SAUCE.c, SAUCE.h, SAUCE.c, SAUCE.c); c.fill();
    c.fillStyle = "rgba(255,255,255,.88)"; c.beginPath(); rr(c, -16, -2, 32, 26, 6); c.fill();
    c.fillStyle = SAUCE.c; c.font = `700 9px Fredoka, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("CHOC", 0, 11);
    c.beginPath(); c.moveTo(-14, -30); c.lineTo(-6, -46); c.lineTo(6, -46); c.lineTo(14, -30); c.closePath(); c.fillStyle = "#F4F4F8"; c.fill();
    c.beginPath(); c.moveTo(-3, -46); c.lineTo(-1.5, -58); c.lineTo(1.5, -58); c.lineTo(3, -46); c.fill();
    ell(c, 0, -60, 3, 4, SAUCE.c);
    ell(c, -12, -12, 3, 12, "rgba(255,255,255,.35)");
  }
  function can(c) {
    // whipped cream can with a swirl on the nozzle
    c.beginPath(); rr(c, -18, -24, 36, 70, 8); c.fillStyle = lin(c, -18, 0, 18, 0, "#8FB8E8", "#E6F1FF", "#B7D2F2", "#6F98CC"); c.fill();
    c.fillStyle = "#E4473F"; c.fillRect(-18, 2, 36, 16);
    c.fillStyle = "#FFFFFF"; c.font = `700 8px Fredoka, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("WHIP", 0, 10);
    ell(c, 0, -24, 18, 5, "#D5DEEA");
    c.beginPath(); rr(c, -6, -40, 12, 16, 4); c.fillStyle = "#FFFFFF"; c.fill();
    c.save(); c.translate(0, -24); c.scale(.42, .42); whip(c, -30); c.restore();
  }
  function bowl(c, fillFn) {
    ell(c, 0, 10, 40, 11, "#C9A58A");
    c.save(); c.beginPath(); c.ellipse(0, 6, 36, 9, 0, 0, TAU); c.clip(); c.fillStyle = "#FFF6EE"; c.fillRect(-40, -4, 80, 20); c.restore();
    fillFn();
    c.beginPath(); c.moveTo(-40, 8); c.quadraticCurveTo(-38, 40, 0, 42); c.quadraticCurveTo(38, 40, 40, 8); c.ellipse(0, 8, 40, 10, 0, 0, Math.PI, false); c.closePath();
    c.fillStyle = lin(c, -40, 0, 40, 0, "#B0463C", "#F07A6E", "#D8443B", "#8E2520"); c.fill();
    ell(c, -18, 22, 6, 3, "rgba(255,255,255,.5)", .3);
  }
  function icon(c, kind, key, x, y, s, t = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (kind === "cup") drink(c, { cup: key, cocoa: null, tops: [] }, -6, -52, .78, t);
    else if (kind === "cocoa") pot(c, key, t);
    else if (kind === "top") {
      if (key === "marsh") bowl(c, () => { const r = rng(5); for (const [px, py] of [[-22, 4], [-6, 6], [10, 5], [24, 4], [-14, -4], [2, -5], [17, -4], [-4, -13]]) marsh(c, px, py, r() - .5, 1, r() < .3); });
      else if (key === "whip") can(c);
      else if (key === "sauce") bottle(c);
    }
    c.restore();
  }

  return { drink, icon, CUPS, COCOAS, SAUCE, DEPTH, above, shadow, rng, marsh };
})();
