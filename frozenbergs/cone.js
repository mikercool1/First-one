"use strict";
// Frozenbergs: the ice cream itself, drawn on canvas with light and shade.
// CONE_ART.cone(c, build, x, y, s, t, opts) draws a cone with its rim centred at (x, y).
// CONE_ART.icon(c, kind, key, x, y, s, t) draws a builder tile picture centred at (x, y).
const CONE_ART = (() => {
  const TAU = Math.PI * 2;
  const R = 44;               // scoop radius in cone units

  const FLAVORS = {
    vanilla: { n: "Vanilla", c: "#FFF1D0", h: "#FFFFFF", d: "#E4C58C" },
    choc: { n: "Chocolate", c: "#8E5634", h: "#BA8260", d: "#5A3019" },
    straw: { n: "Strawberry", c: "#FFAEC6", h: "#FFE3EC", d: "#E07898" },
    mint: { n: "Mint Chip", c: "#A6EACF", h: "#E4FFF4", d: "#62BF9C", chips: true },
    blue: { n: "Blue Moon", c: "#8EC5FF", h: "#E0F1FF", d: "#5288D8" },
    mango: { n: "Mango", c: "#FFCB50", h: "#FFF1B8", d: "#E39419" },
  };
  const SAUCES = {
    fudge: { n: "Fudge", c: "#4A2414", h: "#9A5E42" },
    caramel: { n: "Caramel", c: "#D5852A", h: "#FFD08C" },
    berry: { n: "Raspberry", c: "#CF2757", h: "#FF9DB8" },
  };
  const SPRINKLE_COLS = ["#FF4F86", "#2DBFAE", "#FFB020", "#7C6CF2", "#FFFFFF", "#4FA3FF", "#8BE04E"];

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
  function shadow(c, x, y, rx, ry, a = .3) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fillStyle = rad(c, 0, 0, 0, 0, rx, `rgba(50,25,40,${a})`, `rgba(50,25,40,${a * .4})`, "rgba(50,25,40,0)"); c.fill();
    c.restore();
  }

  // ---------- cones ----------
  function coneBody(c, kind) {
    if (kind === "cup") {
      // paper cup: truncated cone with candy stripes
      c.save();
      c.beginPath(); c.moveTo(-52, 0); c.lineTo(-37, 104); c.ellipse(0, 104, 37, 9, 0, Math.PI, 0, true); c.lineTo(52, 0); c.ellipse(0, 0, 52, 13, 0, 0, Math.PI, false); c.closePath();
      c.clip();
      c.fillStyle = "#FFFFFF"; c.fillRect(-60, -20, 120, 140);
      c.fillStyle = "#FF7FA8";
      for (let i = -6; i <= 6; i += 2) {
        c.beginPath(); c.moveTo(i * 9, -10); c.lineTo(i * 9 + 9, -10); c.lineTo(i * 6.4 + 6.4, 120); c.lineTo(i * 6.4, 120); c.closePath(); c.fill();
      }
      c.fillStyle = lin(c, -52, 0, 52, 0, "rgba(90,20,50,.35)", "rgba(255,255,255,.25)", "rgba(255,255,255,0)", "rgba(90,20,50,.12)", "rgba(90,20,50,.45)");
      c.fillRect(-60, -20, 120, 140);
      c.restore();
      ell(c, 0, 0, 52, 13, "#B8466E");
      ell(c, 0, 1, 47, 10.5, rad(c, 0, -4, 0, 1, 50, "#FFD3E1", "#E0819F"));
      return;
    }
    const sugar = kind === "sugar";
    c.save();
    c.beginPath(); c.moveTo(-47, 2); c.lineTo(-4, 150); c.quadraticCurveTo(0, 157, 4, 150); c.lineTo(47, 2); c.ellipse(0, 2, 47, 12, 0, 0, Math.PI, false); c.closePath();
    c.fillStyle = sugar
      ? lin(c, -47, 0, 47, 0, "#C58B45", "#EFC586", "#FBE0AE", "#E3B271", "#B27632")
      : lin(c, -47, 0, 47, 0, "#A95F24", "#E09A4D", "#F6C47C", "#CF8840", "#8E4F1B");
    c.fill();
    c.clip();
    if (sugar) {
      for (let y = 14; y < 150; y += 13) {
        const w = 47 * (1 - y / 152);
        c.beginPath(); c.ellipse(0, y, w, w * .26, 0, 0, Math.PI); c.strokeStyle = "rgba(150,90,30,.45)"; c.lineWidth = 2.4; c.stroke();
        c.beginPath(); c.ellipse(0, y + 2.5, w, w * .26, 0, .2, Math.PI - .2); c.strokeStyle = "rgba(255,240,210,.45)"; c.lineWidth = 1.4; c.stroke();
      }
    } else {
      c.lineCap = "round";
      for (let k = -220; k <= 220; k += 17) {
        for (const d of [1, -1]) {
          c.beginPath(); c.moveTo(k, -10); c.lineTo(k + d * 110, 170); c.strokeStyle = "rgba(110,55,15,.55)"; c.lineWidth = 3.2; c.stroke();
          c.beginPath(); c.moveTo(k + 2.2, -10); c.lineTo(k + 2.2 + d * 110, 170); c.strokeStyle = "rgba(255,225,170,.35)"; c.lineWidth = 1.2; c.stroke();
        }
      }
    }
    c.restore();
    // rolled rim
    ell(c, 0, 3, 50, 14, sugar ? "#B98040" : "#94501C");
    ell(c, 0, 0, 50, 13, lin(c, -50, 0, 50, 0, sugar ? "#D9A560" : "#C27838", sugar ? "#FBE0AE" : "#F2B66C", sugar ? "#C99050" : "#A8612A"));
    ell(c, 0, 0, 42, 9.5, rad(c, 0, 4, 0, 0, 44, "#6E3A14", "#9C5A26"));
  }

  function scoop(c, f, y, seed, t) {
    const F = FLAVORS[f], r = rng(seed);
    // back ruffle
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + Math.PI * i / 10;
      const bx = Math.cos(a) * R * 1.02, by = y + R * .5 + Math.sin(a) * R * .2;
      ell(c, bx, by, R * .2, R * .17, F.d);
    }
    // ball
    c.beginPath(); c.ellipse(0, y, R, R * .94, 0, 0, TAU);
    c.fillStyle = rad(c, -R * .38, y - R * .45, 0, y, R * 1.15, F.h, F.c, F.c, F.d); c.fill();
    // soft texture
    c.save(); c.beginPath(); c.ellipse(0, y, R, R * .94, 0, 0, TAU); c.clip();
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU, d = r() * R * .8, px = Math.cos(a) * d, py = y + Math.sin(a) * d * .9;
      c.beginPath(); c.arc(px, py, 3 + r() * 5, Math.PI * .1, Math.PI * .9); c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = 2; c.stroke();
    }
    if (F.chips) {
      for (let i = 0; i < 9; i++) {
        const a = r() * TAU, d = r() * R * .85, px = Math.cos(a) * d, py = y + Math.sin(a) * d * .9;
        c.save(); c.translate(px, py); c.rotate(r() * 3);
        c.beginPath(); c.moveTo(-4, -2); c.lineTo(3, -4); c.lineTo(5, 2); c.lineTo(-2, 4); c.closePath(); c.fillStyle = "#3A1F10"; c.fill();
        c.restore();
      }
    }
    c.restore();
    // shine
    ell(c, -R * .38, y - R * .45, R * .2, R * .11, "rgba(255,255,255,.7)", -.6);
    // front ruffle
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * i / 12;
      const bx = Math.cos(a) * R * 1.02, by = y + R * .52 + Math.sin(a) * R * .2;
      ell(c, bx, by, R * .21, R * .18, rad(c, bx - 3, by - 5, bx, by, R * .24, F.h, F.c, F.d));
    }
  }

  function sauce(c, k, yc, seed) {
    const S = SAUCES[k], r = rng(seed + 11), rr2 = R * 1.03;
    c.beginPath();
    c.moveTo(-rr2, yc);
    c.ellipse(0, yc, rr2, rr2 * .95, 0, Math.PI, TAU);
    const drips = [[.8, 14], [.52, 30], [.22, 12], [-.1, 36], [-.42, 18], [-.72, 26]];
    for (const [fx, len] of drips) {
      const x = fx * R, ey = yc + R * .28 * Math.sqrt(1 - fx * fx), w = 5.5, L = len * (.8 + r() * .4);
      c.lineTo(x + w, ey); c.lineTo(x + w, ey + L); c.arc(x, ey + L, w, 0, Math.PI); c.lineTo(x - w, ey);
    }
    c.closePath();
    c.fillStyle = rad(c, -R * .3, yc - R * .5, 0, yc, R * 1.2, S.h, S.c, S.c); c.fill();
    c.beginPath(); c.ellipse(-R * .3, yc - R * .55, R * .28, R * .08, -.5, 0, TAU); c.fillStyle = "rgba(255,255,255,.55)"; c.fill();
  }

  function whip(c, y) {
    const layers = [[42, 15, 0], [33, 13, -16], [23, 11, -30], [13, 9, -42]];
    for (const [rx, ry, dy] of layers) {
      ell(c, 0, y + dy + 3, rx, ry, "#E3D6E0");
      ell(c, 0, y + dy, rx, ry, rad(c, -rx * .35, y + dy - ry * .6, 0, y + dy, rx * 1.1, "#FFFFFF", "#FFFDFB", "#EDE2EA"));
      c.beginPath(); c.ellipse(0, y + dy, rx * .8, ry * .55, 0, Math.PI * 1.1, Math.PI * 1.6); c.strokeStyle = "rgba(200,180,195,.7)"; c.lineWidth = 2; c.stroke();
    }
    c.beginPath(); c.moveTo(-8, y - 46); c.quadraticCurveTo(2, y - 74, 10, y - 58); c.quadraticCurveTo(6, y - 50, 8, y - 44); c.closePath();
    c.fillStyle = rad(c, -2, y - 62, 0, y - 55, 18, "#FFFFFF", "#EDE2EA"); c.fill();
    return y - 62;
  }

  function cherry(c, y) {
    c.beginPath(); c.moveTo(0, y - 12); c.quadraticCurveTo(4, y - 34, 20, y - 42); c.strokeStyle = "#4E7A2B"; c.lineWidth = 3.2; c.lineCap = "round"; c.stroke();
    c.beginPath(); c.ellipse(0, y, 15, 14, 0, 0, TAU); c.fillStyle = rad(c, -5, y - 6, 0, y, 17, "#FF8A9A", "#E0183C", "#8A0020"); c.fill();
    ell(c, -5, y - 6, 4.5, 3, "rgba(255,255,255,.8)", -.5);
  }

  function wafer(c, yc) {
    c.save(); c.translate(R * .35, yc - R * .35); c.rotate(.42);
    c.beginPath(); rr(c, -9, -96, 18, 96, 6);
    c.fillStyle = lin(c, -9, 0, 9, 0, "#C98A3E", "#F7D494", "#E8B566", "#B8772E"); c.fill();
    c.save(); c.clip();
    for (let y = -110; y < 10; y += 11) { c.beginPath(); c.moveTo(-12, y); c.lineTo(12, y + 12); c.strokeStyle = "rgba(130,70,20,.5)"; c.lineWidth = 2; c.stroke(); }
    c.restore();
    ell(c, 0, -96, 9, 4, "#8E5A24"); ell(c, 0, -96, 5, 2, "#5E3510");
    c.restore();
  }

  function sprinkles(c, yc, seed, count = 20) {
    const r = rng(seed + 3);
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (1.08 + r() * .84), d = R * (.25 + r() * .7);
      const px = Math.cos(a) * d, py = yc + Math.sin(a) * d * .92;
      c.save(); c.translate(px, py); c.rotate(r() * Math.PI);
      rr(c, -6, -2, 12, 4.4, 2.2); c.fillStyle = SPRINKLE_COLS[i % SPRINKLE_COLS.length]; c.fill();
      c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(-4, -1.6, 8, 1.1);
      c.restore();
    }
  }
  function chips(c, yc, seed, count = 11) {
    const r = rng(seed + 7);
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (1.08 + r() * .84), d = R * (.25 + r() * .72);
      const px = Math.cos(a) * d, py = yc + Math.sin(a) * d * .92;
      c.save(); c.translate(px, py); c.rotate(r() * .6 - .3);
      c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(6, 3, 5, 4); c.lineTo(-5, 4); c.quadraticCurveTo(-6, 3, 0, -6);
      c.fillStyle = lin(c, -5, -6, 5, 4, "#7A4526", "#3A1D0C"); c.fill();
      c.restore();
    }
  }

  // Main entry: rim centred at (x, y).
  function cone(c, b, x, y, s, t = 0, o = {}) {
    c.save(); c.translate(x, y); c.scale(s, s); if (o.rot) c.rotate(o.rot);
    if (o.shadow) shadow(c, 0, 156, 38, 9, .35);
    if (o.mystery) {
      c.save(); c.setLineDash([9, 9]); c.lineWidth = 4; c.strokeStyle = "rgba(160,110,140,.6)";
      c.beginPath(); c.moveTo(-47, 2); c.lineTo(0, 152); c.lineTo(47, 2); c.stroke();
      c.beginPath(); c.ellipse(0, -40, R, R * .94, 0, 0, TAU); c.stroke(); c.restore();
      c.font = `400 72px "Lilita One", "Fredoka", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#FF4F86"; c.fillText("?", 0, -34);
      c.restore(); return;
    }
    const tops = new Set(b.tops || []), n = b.scoops.length, seed = hash(b.scoops.join() + (b.tops || []).join() + (b.cone || ""));
    if (b.cone) coneBody(c, b.cone);
    else {
      c.save(); c.setLineDash([9, 9]); c.lineWidth = 4; c.strokeStyle = "rgba(160,110,140,.5)";
      c.beginPath(); c.moveTo(-47, 2); c.lineTo(0, 152); c.lineTo(47, 2); c.stroke(); c.restore();
    }
    const base = b.cone === "cup" ? -R * .28 : -R * .42;
    const yOf = (i) => base - i * R * 1.28;
    // newest scoop drops in
    const drop = o.dropT != null ? Math.max(0, 1 - o.dropT) : 0;
    for (let i = 0; i < n; i++) {
      const dy = i === n - 1 ? -drop * drop * 120 : 0;
      if (i === n - 1 && tops.has("wafer") && !drop) wafer(c, yOf(i));
      scoop(c, b.scoops[i], yOf(i) + dy, seed + i * 17, t);
      if (i === 0 && b.cone === "cup") {
        c.save(); c.beginPath(); c.ellipse(0, 0, 53, 14, 0, 0, Math.PI); c.lineWidth = 5; c.strokeStyle = "#FFFFFF"; c.stroke(); c.restore();
      }
    }
    if (!n) { c.restore(); return; }
    const yc = yOf(n - 1);
    let top = yc - R * .94;
    if (b.sauce) sauce(c, b.sauce, yc, seed);
    if (tops.has("sprinkles")) sprinkles(c, yc, seed);
    if (tops.has("chips")) chips(c, yc, seed);
    if (tops.has("whip")) top = whip(c, top + 10);
    if (tops.has("cherry")) cherry(c, top - 6);
    c.restore();
  }

  // ---------- builder tile pictures ----------
  function tub(c, f) {
    const F = FLAVORS[f];
    c.beginPath(); c.moveTo(-40, -8); c.lineTo(-34, 44); c.ellipse(0, 44, 34, 9, 0, Math.PI, 0, true); c.lineTo(40, -8); c.closePath();
    c.fillStyle = lin(c, -40, 0, 40, 0, "#D8DCE6", "#FFFFFF", "#F2F4F8", "#B9BFCC"); c.fill();
    c.fillStyle = F.c; c.fillRect(-37, 12, 74, 14);
    c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(-37, 24, 74, 2);
    ell(c, 0, -8, 40, 11, "#C8CDD8");
    ell(c, 0, -9, 36, 9, F.d);
    // mound
    c.beginPath(); c.ellipse(0, -12, 34, 18, 0, Math.PI, TAU); c.ellipse(0, -10, 34, 7, 0, 0, Math.PI);
    c.fillStyle = rad(c, -10, -24, 0, -12, 38, F.h, F.c, F.d); c.fill();
    if (F.chips) for (const [px, py] of [[-14, -16], [6, -20], [18, -12], [-4, -10], [-22, -9]]) ell(c, px, py, 3, 2.2, "#3A1F10");
    ell(c, -12, -22, 7, 3.5, "rgba(255,255,255,.7)", -.4);
  }
  function bottle(c, k) {
    const S = SAUCES[k];
    c.beginPath(); rr(c, -22, -30, 44, 76, 14); c.fillStyle = lin(c, -22, 0, 22, 0, S.c, S.h, S.c, S.c); c.fill();
    c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); rr(c, -16, -2, 32, 26, 6); c.fill();
    c.fillStyle = S.c; c.font = `700 ${S.n.length > 6 ? 7 : 9}px Fredoka, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(S.n.toUpperCase(), 0, 11);
    c.beginPath(); c.moveTo(-14, -30); c.lineTo(-6, -46); c.lineTo(6, -46); c.lineTo(14, -30); c.closePath(); c.fillStyle = "#F4F4F8"; c.fill();
    c.beginPath(); c.moveTo(-3, -46); c.lineTo(-1.5, -58); c.lineTo(1.5, -58); c.lineTo(3, -46); c.fill();
    ell(c, 0, -60, 3, 4, S.c);
    ell(c, -12, -12, 3, 12, "rgba(255,255,255,.35)");
  }
  function bowl(c, fillFn) {
    ell(c, 0, 10, 40, 11, "#9FB3C9");
    c.save(); c.beginPath(); c.ellipse(0, 6, 36, 9, 0, 0, TAU); c.clip(); c.fillStyle = "#FFF6EE"; c.fillRect(-40, -4, 80, 20); fillFn(); c.restore();
    c.beginPath(); c.moveTo(-40, 8); c.quadraticCurveTo(-38, 40, 0, 42); c.quadraticCurveTo(38, 40, 40, 8); c.ellipse(0, 8, 40, 10, 0, 0, Math.PI, false); c.closePath();
    c.fillStyle = lin(c, -40, 0, 40, 0, "#7FA6D6", "#CFE3FA", "#9CC0EA", "#5F86BA"); c.fill();
    ell(c, -18, 22, 6, 3, "rgba(255,255,255,.5)", .3);
  }
  function icon(c, kind, key, x, y, s, t = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (kind === "cone") cone(c, { cone: key, scoops: [], tops: [] }, 0, -60, .8, t);
    else if (kind === "flavor") tub(c, key);
    else if (kind === "sauce") { if (key) bottle(c, key); else { c.lineWidth = 7; c.strokeStyle = "#C9B8C4"; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.moveTo(-21, 21); c.lineTo(21, -21); c.stroke(); } }
    else if (kind === "top") {
      if (key === "sprinkles") bowl(c, () => { const r = rng(5); for (let i = 0; i < 26; i++) { c.save(); c.translate(-32 + r() * 64, 1 + r() * 10); c.rotate(r() * 3); c.fillStyle = SPRINKLE_COLS[i % 7]; c.fillRect(-4, -1.5, 8, 3); c.restore(); } });
      else if (key === "chips") bowl(c, () => { const r = rng(9); for (let i = 0; i < 16; i++) { const px = -30 + r() * 60, py = 2 + r() * 8; c.beginPath(); c.moveTo(px, py - 5); c.lineTo(px + 5, py + 3); c.lineTo(px - 5, py + 3); c.closePath(); c.fillStyle = "#4A2614"; c.fill(); } });
      else if (key === "whip") { c.save(); c.scale(.9, .9); whip(c, 36); c.restore(); }
      else if (key === "cherry") { c.save(); c.translate(-12, 16); cherry(c, 0); c.restore(); c.save(); c.translate(14, 22); c.scale(.9, .9); cherry(c, 0); c.restore(); }
      else if (key === "wafer") { c.save(); c.translate(-46, 58); wafer(c, 0); c.restore(); c.save(); c.translate(-26, 62); c.scale(.9, .9); wafer(c, 0); c.restore(); }
    }
    c.restore();
  }

  return { cone, icon, FLAVORS, SAUCES, shadow, rng };
})();
