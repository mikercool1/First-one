"use strict";
// Ariel Passover Cookout: the family, Max, Ariel and the food, drawn on canvas.
// Characters are drawn from a pose object each frame, so they can react smoothly.

const ART = (() => {
  const TAU = Math.PI * 2;
  const FONT = "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif";

  // ---------- primitives ----------
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, ...cols) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    cols.forEach((k, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), k));
    return g;
  }
  function rad(c, x, y, r, ...cols) { return radF(c, x, y, x, y, r, ...cols); }
  function radF(c, fx, fy, x, y, r, ...cols) {
    const g = c.createRadialGradient(fx, fy, 0, x, y, Math.max(1, r));
    cols.forEach((k, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), k));
    return g;
  }
  const fill = (c, f) => { c.fillStyle = f; c.fill(); };
  const stroke = (c, s, w) => { c.strokeStyle = s; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); };
  function box(c, x, y, w, h, r, f, s, lw) { rr(c, x, y, w, h, r); fill(c, f); if (s) stroke(c, s, lw || 2); }
  function ell(c, x, y, rx, ry, f, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); fill(c, f); }
  const dot = (c, x, y, r, f) => ell(c, x, y, r, r, f);
  function line(c, pts, w, col) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); stroke(c, col, w); }
  function curve(c, x0, y0, cx, cy, x1, y1, w, col) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); stroke(c, col, w); }
  function shadow(c, x, y, rx, ry, a = .28) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    dot(c, 0, 0, rx, rad(c, 0, 0, rx, `rgba(60,35,20,${a})`, `rgba(60,35,20,${a * .5})`, "rgba(60,35,20,0)"));
    c.restore();
  }
  function text(c, str, x, y, size, col, weight = 600, align = "center") {
    c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(str, x, y);
  }
  // deterministic pseudo random for static decoration
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const GOLD = (c, x0, x1) => lin(c, x0, 0, x1, 0, "#9C7634", "#F1DA9E", "#C9A45C", "#F6E3AE", "#9C7634");

  // ---------- faces ----------
  const EXPR = {
    calm: { eye: 1, brow: 0, mouth: "smile", m: .5 },
    focus: { eye: .85, brow: .15, mouth: "smile", m: .2 },
    happy: { eye: "arc", brow: -.25, mouth: "open" },
    proud: { eye: "arc", brow: -.15, mouth: "open" },
    eat: { eye: "arc", brow: -.15, mouth: "chew" },
    meh: { eye: 1, brow: .15, mouth: "flat" },
    annoyed: { eye: .72, brow: .4, mouth: "frown" },
    angry: { eye: .6, brow: .7, mouth: "grit" },
    outburst: { eye: 1.25, brow: .8, mouth: "yell" },
    worried: { eye: 1.1, brow: -.5, mouth: "wobble" },
    stern: { eye: .6, brow: .55, mouth: "tight" },
    gasp: { eye: 1.3, brow: -.5, mouth: "o" },
    rolleyes: { eye: 1, brow: -.3, mouth: "flat", look: [0.4, -1.7] },
    sly: { eye: .78, brow: .25, mouth: "grin" },
    grin: { eye: "arc", brow: -.2, mouth: "grin" },
    sleep: { eye: "shut", brow: -.1, mouth: "o" },
    wail: { eye: "shut", brow: -.6, mouth: "yell" },
  };

  function head(c, x, y, r, o) {
    const e = EXPR[o.expr] || EXPR.calm, t = o.t || 0;
    c.save(); c.translate(x, y); if (o.tilt) c.rotate(o.tilt);
    if (o.hairBack) o.hairBack(c, r);
    ell(c, -r * .95, r * .12, r * .17, r * .23, o.skinDk);
    ell(c, r * .95, r * .12, r * .17, r * .23, o.skinDk);
    if (o.earrings) { dot(c, -r * .97, r * .4, r * .09, o.earrings); dot(c, r * .97, r * .4, r * .09, o.earrings); }
    c.beginPath(); c.ellipse(0, 0, r, r * 1.04, 0, 0, TAU);
    fill(c, radF(c, -r * .35, -r * .45, 0, 0, r * 1.2, o.skinHi, o.skin, o.skinDk));
    if (o.anger > 0) { c.fillStyle = `rgba(232,64,56,${.45 * o.anger})`; c.fill(); }
    if (o.stubble) { c.save(); c.clip(); ell(c, 0, r * .62, r * .78, r * .5, "rgba(70,50,40,.18)"); c.restore(); }
    const arc = e.eye === "arc";
    const blush = (o.blush ?? .3) + (arc ? .18 : 0);
    dot(c, -r * .56, r * .38, r * .17, `rgba(240,110,110,${blush})`);
    dot(c, r * .56, r * .38, r * .17, `rgba(240,110,110,${blush})`);
    const look = e.look || o.look || [0, 0];
    const lx = look[0] * r * .065, ly = look[1] * r * .055;
    const open = typeof e.eye === "number" ? e.eye : 1;
    for (const sx of [-1, 1]) {
      const ex = sx * r * .36, ey = r * .02;
      if (arc) {
        c.beginPath(); c.moveTo(ex - r * .16, ey + r * .06); c.quadraticCurveTo(ex, ey - r * .18, ex + r * .16, ey + r * .06); stroke(c, "#2B1D1A", r * .08);
      } else if (o.blink || e.eye === "shut") {
        c.beginPath(); c.moveTo(ex - r * .15, ey); c.quadraticCurveTo(ex, ey + r * .1, ex + r * .15, ey); stroke(c, "#2B1D1A", r * .065);
      } else {
        ell(c, ex, ey, r * .17, r * .21 * open, "#FFFFFF");
        c.save(); c.beginPath(); c.ellipse(ex, ey, r * .17, r * .21 * open, 0, 0, TAU); c.clip();
        dot(c, ex + lx, ey + ly, r * .12, o.iris || "#5A3A24");
        dot(c, ex + lx, ey + ly, r * .065, "#140C08");
        dot(c, ex + lx + r * .045, ey + ly - r * .05, r * .038, "#FFFFFF");
        c.restore();
        c.beginPath(); c.ellipse(ex, ey, r * .17, r * .21 * open, 0, Math.PI * 1.08, Math.PI * 1.92); stroke(c, "#2B1D1A", r * .055);
        if (o.lashes) line(c, [ex + sx * r * .13, ey - r * .14 * open, ex + sx * r * .24, ey - r * .22 * open], r * .045, "#2B1D1A");
      }
      const bw = e.brow, by = ey - r * .3 - (arc ? r * .04 : 0) - (open > 1 ? r * .06 : 0);
      line(c, [ex - sx * r * .11, by + bw * r * .14, ex + sx * r * .2, by - bw * r * .1], r * .075, o.browCol || "#3A2618");
    }
    c.beginPath(); c.moveTo(-r * .04, r * .17); c.quadraticCurveTo(r * .12, r * .33, -r * .06, r * .35); stroke(c, o.skinDk, r * .055);
    const mc = o.lip || "#6B2E2A", mw = r * .075;
    switch (e.mouth) {
      case "smile": curve(c, -r * .26, r * .52, 0, r * (.52 + .3 * (e.m ?? .5)), r * .26, r * .52, mw, mc); break;
      case "open": {
        c.beginPath(); c.moveTo(-r * .3, r * .46); c.quadraticCurveTo(0, r * 1.02, r * .3, r * .46); c.closePath(); fill(c, "#7A2630");
        c.save(); c.clip(); ell(c, 0, r * .47, r * .3, r * .07, "#FFFFFF"); ell(c, 0, r * .8, r * .16, r * .1, "#E77C84"); c.restore();
        if (o.lip) { c.beginPath(); c.moveTo(-r * .3, r * .46); c.quadraticCurveTo(0, r * 1.02, r * .3, r * .46); c.closePath(); stroke(c, o.lip, r * .05); }
        break;
      }
      case "chew": { const k = .5 + .5 * Math.sin(t * 14); ell(c, 0, r * .56, r * (.15 + .06 * k), r * (.05 + .1 * k), "#7A2630"); break; }
      case "flat": line(c, [-r * .2, r * .56, r * .2, r * .56], mw, mc); break;
      case "frown": curve(c, -r * .24, r * .66, 0, r * .42, r * .24, r * .66, mw, mc); break;
      case "tight": line(c, [-r * .14, r * .57, r * .14, r * .57], mw, mc); line(c, [-r * .19, r * .63, -r * .14, r * .57], mw * .8, mc); line(c, [r * .19, r * .63, r * .14, r * .57], mw * .8, mc); break;
      case "grit": box(c, -r * .28, r * .46, r * .56, r * .2, r * .07, "#FFFFFF", mc, mw * .7); line(c, [-r * .26, r * .56, r * .26, r * .56], r * .03, "#BBBBBB"); break;
      case "yell": { const k = .8 + .2 * Math.sin(t * 20); ell(c, 0, r * .62, r * .3, r * .26 * k, "#7A2630"); ell(c, 0, r * .76, r * .17, r * .09 * k, "#E77C84"); ell(c, 0, r * .42, r * .2, r * .05, "#FFFFFF"); break; }
      case "o": ell(c, 0, r * .6, r * .1, r * .13, "#7A2630"); break;
      case "wobble": {
        c.beginPath(); c.moveTo(-r * .22, r * .58);
        for (let i = 1; i <= 4; i++) c.quadraticCurveTo(-r * .22 + (i - .5) * r * .11, r * (.58 + (i % 2 ? -.07 : .07)), -r * .22 + i * r * .11, r * .58);
        stroke(c, mc, mw * .8); break;
      }
      case "grin": {
        c.beginPath(); c.moveTo(-r * .36, r * .4); c.quadraticCurveTo(0, r * .98, r * .36, r * .4); c.quadraticCurveTo(0, r * .56, -r * .36, r * .4); fill(c, "#7A2630");
        box(c, -r * .13, r * .47, r * .11, r * .11, r * .03, "#FFFFFF"); box(c, r * .02, r * .47, r * .11, r * .11, r * .03, "#FFFFFF"); break;
      }
    }
    if (o.crumbs) { for (let i = 0; i < 6; i++) dot(c, -r * .3 + i * r * .12, r * (.78 + (i % 2) * .08), r * .04, "#D9A55B"); }
    if (o.glasses) {
      for (const sx of [-1, 1]) { rr(c, sx * r * .36 - r * .25, -r * .2, r * .5, r * .42, r * .16); c.fillStyle = "rgba(210,230,255,.18)"; c.fill(); stroke(c, o.glasses, r * .065); }
      line(c, [-r * .11, -r * .02, r * .11, -r * .02], r * .06, o.glasses);
      if (o.glint) { c.save(); c.globalAlpha = o.glint; line(c, [r * .2, -r * .12, r * .3, -r * .02], r * .06, "#FFFFFF"); line(c, [-r * .52, -r * .12, -r * .42, -r * .02], r * .06, "#FFFFFF"); c.restore(); }
    }
    if (o.hairFront) o.hairFront(c, r);
    c.restore();
  }

  function steam(c, x, y, r, t, a = 1) {
    c.save(); c.globalAlpha = a;
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.3 + i / 3) % 1, side = i === 1 ? 0 : (i === 0 ? -1 : 1);
      const px = x + side * r * .9 + Math.sin(k * 6 + i) * 4, py = y - r * .9 - k * r * 1.4;
      c.globalAlpha = a * (1 - k) * .9;
      dot(c, px, py, r * (.18 + k * .3), "#FFFFFF");
      dot(c, px + 5, py + 3, r * (.12 + k * .2), "#FFFFFF");
    }
    c.restore();
  }
  function sweat(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y - 8 * s); c.quadraticCurveTo(x + 6 * s, y + 2 * s, x, y + 5 * s); c.quadraticCurveTo(x - 6 * s, y + 2 * s, x, y - 8 * s);
    fill(c, lin(c, x, y - 8 * s, x, y + 5 * s, "#E6F6FF", "#8CCBF0"));
  }

  // ---------- hair styles (drawn in head space, radius r) ----------
  function capPath(c, r, part = .2, depth = .55) {
    c.beginPath();
    c.moveTo(-r * 1.04, r * .2);
    c.bezierCurveTo(-r * 1.12, -r * .95, -r * .3, -r * 1.3, r * .3, -r * 1.12);
    c.bezierCurveTo(r * .98, -r * .95, r * 1.12, -r * .3, r * 1.04, r * .25);
    c.bezierCurveTo(r * .9, -r * .15, r * .6, -r * depth, r * part, -r * (depth + .05));
    c.bezierCurveTo(-r * .3, -r * (depth - .02), -r * .8, -r * .35, -r * 1.04, r * .2);
  }
  const HAIR = {
    arielBack: (sway = 0) => (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.02, -r * .15);
      c.bezierCurveTo(-r * 1.3, r * .8, -r * 1.12 + sway, r * 1.9, -r * .8 + sway, r * 2.5);
      c.quadraticCurveTo(-r * .4 + sway, r * 2.3, -r * .1 + sway, r * 2.62);
      c.quadraticCurveTo(r * .3 + sway, r * 2.35, r * .8 + sway, r * 2.5);
      c.bezierCurveTo(r * 1.12 + sway, r * 1.9, r * 1.3, r * .8, r * 1.02, -r * .15);
      c.bezierCurveTo(r * 1.05, -r * 1.35, -r * 1.05, -r * 1.35, -r * 1.02, -r * .15);
      fill(c, lin(c, 0, -r, 0, r * 2.6, "#734430", "#512D1B", "#3A1F12"));
      c.save(); c.globalAlpha = .35;
      curve(c, -r * .9, r * .5, -r * 1.05 + sway, r * 1.5, -r * .7 + sway, r * 2.3, r * .08, "#9A6446");
      curve(c, r * .9, r * .5, r * 1.05 + sway, r * 1.5, r * .7 + sway, r * 2.3, r * .08, "#9A6446");
      c.restore();
    },
    arielFront: (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.05, r * .35);
      c.bezierCurveTo(-r * 1.15, -r * .95, -r * .35, -r * 1.32, r * .35, -r * 1.12);
      c.bezierCurveTo(r * 1.0, -r * .95, r * 1.14, -r * .25, r * 1.04, r * .3);
      c.bezierCurveTo(r * .95, -r * .1, r * .7, -r * .5, r * .25, -r * .62);
      c.bezierCurveTo(-r * .1, -r * .45, -r * .55, -r * .2, -r * .78, r * .05);
      c.quadraticCurveTo(-r * .9, r * .2, -r * 1.05, r * .35);
      fill(c, lin(c, -r, -r * 1.2, r, r * .3, "#8A5438", "#5A321E", "#3F2213"));
      c.save(); c.globalAlpha = .5; curve(c, -r * .55, -r * .85, r * .05, -r * 1.05, r * .55, -r * .82, r * .09, "#B07A58"); c.restore();
    },
    sarahBack: (sway = 0) => (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.1, -r * .3);
      c.bezierCurveTo(-r * 1.6, r * .6, -r * 1.4 + sway, r * 1.7, -r * .9 + sway, r * 2.1);
      c.quadraticCurveTo(0, r * 2.35, r * .9 + sway, r * 2.1);
      c.bezierCurveTo(r * 1.4 + sway, r * 1.7, r * 1.6, r * .6, r * 1.1, -r * .3);
      c.bezierCurveTo(r * 1.3, -r * 1.55, -r * 1.3, -r * 1.55, -r * 1.1, -r * .3);
      fill(c, lin(c, 0, -r * 1.3, 0, r * 2.2, "#E2B26E", "#C58C4A", "#9E6A33"));
      c.save(); c.globalAlpha = .45;
      for (const sx of [-1, 1]) { curve(c, sx * r * 1.1, r * .2, sx * r * 1.45, r * 1, sx * r * .95, r * 1.8, r * .1, "#F3D196"); }
      c.restore();
    },
    sarahFront: (c, r) => {
      capPath(c, r, -.1, .45); fill(c, lin(c, -r, -r * 1.2, r, r * .3, "#F0C584", "#C58C4A"));
      // one forgotten pink curler, for comedy
      c.save(); c.translate(r * .55, -r * .95); c.rotate(.5); box(c, -r * .22, -r * .12, r * .44, r * .24, r * .12, "#F28DB2", "#D8588C", r * .04); c.restore();
    },
    longBack: (sway, cols, len = 2.6) => (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.02, -r * .15);
      c.bezierCurveTo(-r * 1.22, r * .8, -r * 1.08 + sway, r * (len - .7), -r * .82 + sway, r * len);
      c.quadraticCurveTo(0, r * (len + .12), r * .82 + sway, r * len);
      c.bezierCurveTo(r * 1.08 + sway, r * (len - .7), r * 1.22, r * .8, r * 1.02, -r * .15);
      c.bezierCurveTo(r * 1.05, -r * 1.35, -r * 1.05, -r * 1.35, -r * 1.02, -r * .15);
      fill(c, lin(c, 0, -r, 0, r * len, ...cols));
      c.save(); c.globalAlpha = .3; curve(c, -r * .9, r * .4, -r * 1.02 + sway, r * 1.5, -r * .7 + sway, r * (len - .2), r * .07, "#8A7278");
      curve(c, r * .9, r * .4, r * 1.02 + sway, r * 1.5, r * .7 + sway, r * (len - .2), r * .07, "#8A7278"); c.restore();
    },
    longFront: (cols, center) => (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.05, r * .45);
      c.bezierCurveTo(-r * 1.14, -r * .95, -r * .4, -r * 1.3, center ? 0 : r * .2, -r * 1.14);
      c.bezierCurveTo(r * .45, -r * 1.3, r * 1.14, -r * .95, r * 1.05, r * .45);
      c.bezierCurveTo(r * .92, -r * .2, r * .55, -r * .7, center ? 0 : r * .15, -r * .82);
      c.bezierCurveTo(-r * .5, -r * .72, -r * .92, -r * .2, -r * 1.05, r * .45);
      fill(c, lin(c, -r, -r * 1.2, r, r * .4, ...cols));
      c.save(); c.globalAlpha = .35; curve(c, -r * .6, -r * .95, -r * .2, -r * 1.12, -r * .05, -r * .95, r * .08, "#9A8A90"); c.restore();
    },
    // Cari (Grandma): short curly brown hair
    cariBack: (c, r) => {
      for (let i = 0; i < 11; i++) { const a = Math.PI * (.85 + i * .13); dot(c, Math.cos(a) * r * 1.02, Math.sin(a) * r * .95 + r * .05, r * .3, i % 2 ? "#6E4428" : "#5A361F"); }
      for (const sd of [-1, 1]) { dot(c, sd * r * 1.02, r * .38, r * .26, "#5A361F"); dot(c, sd * r * .95, r * .62, r * .2, "#6E4428"); }
    },
    cariFront: (c, r) => {
      const cols = ["#8A5A36", "#6E4428", "#9C6A42"];
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + i * .105); dot(c, Math.cos(a) * r * .9, Math.sin(a) * r * .88 - r * .08, r * .28, cols[i % 3]); }
      for (const [x, y] of [[-.45, -.62], [-.12, -.72], [.2, -.7], [.5, -.58]]) dot(c, x * r, y * r, r * .2, cols[(x * 10 | 0) & 1]);
      for (const [x, y] of [[-.3, -1.02], [.25, -1.05], [0, -.95]]) { c.beginPath(); c.arc(x * r, y * r, r * .1, 0, Math.PI * 1.6); stroke(c, "#B07D52", r * .04); }
    },
    nana: (c, r) => {
      const col = "#EDEAF2", dk = "#C9C3D6";
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i * .12); dot(c, Math.cos(a) * r * .98, Math.sin(a) * r * .9 - r * .05, r * .28, i % 2 ? col : "#F6F4FA"); }
      dot(c, 0, -r * 1.12, r * .34, col); dot(c, 0, -r * 1.12, r * .2, dk);
      for (const sx of [-1, 1]) dot(c, sx * r * .98, r * .1, r * .22, col);
    },
    // Simon (Grandpa): neatly combed, side-parted dark hair. No beard.
    simon: (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.06, r * .2);
      c.bezierCurveTo(-r * 1.2, -r * .95, -r * .5, -r * 1.42, r * .2, -r * 1.3);
      c.bezierCurveTo(r * .95, -r * 1.2, r * 1.2, -r * .5, r * 1.06, r * .22);
      c.bezierCurveTo(r * .98, -r * .25, r * .7, -r * .56, r * .35, -r * .64);
      c.lineTo(-r * .25, -r * .62);
      c.bezierCurveTo(-r * .7, -r * .52, -r * .96, -r * .2, -r * 1.06, r * .2);
      fill(c, lin(c, 0, -r * 1.4, 0, r * .2, "#5E4A3A", "#3E2E22", "#2A1E16"));
      c.save(); c.globalAlpha = .45;
      for (let i = 0; i < 4; i++) curve(c, -r * .28, -r * (1.18 - i * .13), r * .3, -r * (1.3 - i * .12), r * .95, -r * (.9 - i * .13), r * .035, "#7A6452");
      for (let i = 0; i < 2; i++) curve(c, -r * .34, -r * (1.12 - i * .16), -r * .8, -r * (1.0 - i * .2), -r * 1.02, -r * (.4 - i * .2), r * .035, "#7A6452");
      c.restore();
      curve(c, -r * .36, -r * 1.24, -r * .31, -r * .92, -r * .27, -r * .62, r * .045, "#1E1510");
    },
    ikey: (c, r) => { capPath(c, r, .1, .62); fill(c, lin(c, 0, -r * 1.2, 0, 0, "#4A3528", "#2E2018")); },
    michael: (c, r) => {
      capPath(c, r, .3, .6); fill(c, lin(c, 0, -r * 1.2, 0, 0, "#8A6040", "#5E3F28"));
      c.beginPath(); c.moveTo(-r * .2, -r * 1.02); c.quadraticCurveTo(r * .3, -r * 1.45, r * .7, -r * .95); c.quadraticCurveTo(r * .3, -r * 1.1, -r * .2, -r * 1.02); fill(c, "#7A5436");
    },
    max: (c, r, t = 0) => {
      const cols = ["#C08850", "#A8713D", "#D29A5E"];
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (.98 + i * .088), rr2 = r * (1.0 + (i % 2) * .08);
        dot(c, Math.cos(a) * rr2, Math.sin(a) * rr2 * .92 - r * .02, r * .3, cols[i % 3]);
      }
      dot(c, -r * .15, -r * .95, r * .3, cols[1]); dot(c, r * .2, -r * .98, r * .28, cols[0]);
      c.save(); c.translate(r * .05, -r * 1.25); c.rotate(Math.sin(t * 5) * .3);
      c.beginPath(); c.arc(0, -r * .1, r * .16, Math.PI * .2, Math.PI * 1.7); stroke(c, cols[1], r * .1); c.restore();
    },
  };

  // ---------- skins ----------
  const SK = {
    ariel: { skin: "#F1C8A6", skinHi: "#FBE2CC", skinDk: "#D9A27C" },
    sarah: { skin: "#F4CFB2", skinHi: "#FFE6D3", skinDk: "#DDA887" },
    cari: { skin: "#F0C6A6", skinHi: "#FCE0C9", skinDk: "#D69C78" },
    nana: { skin: "#F2D3C0", skinHi: "#FFEADF", skinDk: "#D9AE95" },
    michael: { skin: "#EBBE9B", skinHi: "#F9D9BE", skinDk: "#CC946E" },
    ikey: { skin: "#E2AF89", skinHi: "#F2CDAE", skinDk: "#BF8660" },
    simon: { skin: "#ECC4A4", skinHi: "#FADDC5", skinDk: "#CF9A77" },
    molly: { skin: "#F3CBAA", skinHi: "#FDE3CD", skinDk: "#DB9F7C" },
    max: { skin: "#F8D4BA", skinHi: "#FFEBDC", skinDk: "#E3AE8E" },
  };

  // ---------- body helpers ----------
  function arm(c, sh, el, hd, w, sleeve, skin, sleeveLen = .45) {
    line(c, [sh[0], sh[1], el[0], el[1], hd[0], hd[1]], w, skin);
    if (sleeve) {
      const mx = sh[0] + (el[0] - sh[0]) * sleeveLen * 2, my = sh[1] + (el[1] - sh[1]) * sleeveLen * 2;
      if (sleeveLen > .5) {
        const k = sleeveLen * 2 - 1;
        line(c, [sh[0], sh[1], el[0], el[1], el[0] + (hd[0] - el[0]) * k, el[1] + (hd[1] - el[1]) * k], w + 4, sleeve);
      } else line(c, [sh[0], sh[1], mx, my], w + 4, sleeve);
    }
  }
  function handDot(c, p, r, sk) { dot(c, p[0], p[1], r, radF(c, p[0] - r * .3, p[1] - r * .3, p[0], p[1], r * 1.2, sk.skinHi, sk.skin)); }
  function seatedLegs(c, pants, shoe, spread = 13, lift = 0, shin = pants) {
    // shins first, then the lap (thighs pointing at us) with round knees on top
    for (const sd of [-1, 1]) {
      line(c, [sd * (spread + 1), -40, sd * (spread + 2), -8 - (sd > 0 ? lift : 0)], 17, shin);
      ell(c, sd * (spread + 2) + sd * 3, -5 - (sd > 0 ? lift : 0), 14, 7, shoe);
    }
    box(c, -31, -66, 62, 26, 12, pants);
    box(c, -31, -66, 62, 12, 8, "rgba(255,255,255,.16)");
    for (const sd of [-1, 1]) { dot(c, sd * (spread + 1), -42, 13, shin); dot(c, sd * (spread + 1) - 3, -46, 5, "rgba(255,255,255,.18)"); }
    if (shin !== pants) box(c, -34, -64, 68, 18, 8, pants);
    line(c, [0, -64, 0, -44], 2, "rgba(0,0,0,.15)");
  }
  // a round, comfy tummy for the chubby grown-ups
  function bellyTorso(c, top, topDk) {
    c.beginPath(); c.moveTo(-30, -120); c.quadraticCurveTo(-30, -131, -20, -132); c.lineTo(20, -132); c.quadraticCurveTo(30, -131, 30, -120);
    c.bezierCurveTo(46, -100, 48, -68, 34, -56); c.quadraticCurveTo(0, -46, -34, -56); c.bezierCurveTo(-48, -68, -46, -100, -30, -120); c.closePath();
    fill(c, lin(c, -46, 0, 46, 0, top, topDk));
    c.save(); c.globalAlpha = .14; ell(c, -12, -86, 20, 20, "#FFFFFF"); c.restore();
  }
  function torso(c, top, topDk, wS = 27, wW = 24, yS = -128, yW = -58) {
    c.beginPath(); c.moveTo(-wS, yS + 6); c.quadraticCurveTo(-wS, yS, -wS + 8, yS - 2); c.lineTo(wS - 8, yS - 2); c.quadraticCurveTo(wS, yS, wS, yS + 6);
    c.quadraticCurveTo(wW + 3, (yS + yW) / 2, wW, yW); c.quadraticCurveTo(0, yW + 6, -wW, yW); c.quadraticCurveTo(-wW - 3, (yS + yW) / 2, -wS, yS + 6);
    fill(c, lin(c, -wS, 0, wS, 0, top, topDk));
  }

  // ---------- ARIEL ----------
  function ariel(c, x, y, s, o) {
    const t = o.t, mv = o.moving, ph = o.walkPh || 0, A = o.anim, at = o.animT || 0, sk = SK.ariel;
    let bob = mv ? -Math.abs(Math.sin(ph)) * 5 : Math.sin(t * 2.2) * 1.2, hop = 0, lean = 0;
    if (A === "happy") hop = -Math.abs(Math.sin(at * 10)) * 14;
    if (A === "place" || A === "oven" || A === "grab" || A === "clean") lean = .1;
    const dir = o.dir || 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    shadow(c, 0, 2, 46, 11, .3);
    c.scale(dir, 1); c.translate(0, bob + hop); c.rotate(lean);
    const sway = mv ? Math.sin(ph) * 5 : Math.sin(t * 1.5) * 1.5;
    // hair behind everything
    c.save(); c.translate(0, -190); HAIR.arielBack(-sway * .6 - (mv ? 4 : 0))(c, 33); c.restore();
    // legs
    for (const sd of [-1, 1]) {
      const L = mv ? Math.sin(ph) * sd : 0;
      const fx = sd * 8 + L * 17, fy = mv ? -Math.max(0, Math.cos(ph) * sd) * 7 : 0;
      line(c, [sd * 9, -80, sd * 8 + L * 8, -40, fx, fy - 6], 12, sk.skin);
      c.beginPath(); c.ellipse(fx + 5, fy - 4, 13, 6, 0, 0, TAU); fill(c, "#1A1620");
      dot(c, fx + 11, fy - 6, 2, "#E6C77F");
    }
    // skirt
    c.beginPath(); c.moveTo(-18, -118);
    c.bezierCurveTo(-25, -92, -37 + sway, -62, -42 + sway, -44); c.quadraticCurveTo(0, -34, 42 + sway, -44);
    c.bezierCurveTo(37 + sway, -62, 25, -92, 18, -118); c.closePath();
    fill(c, lin(c, -42, 0, 42, 0, "#2E2935", "#16131B", "#34303C"));
    c.save(); c.globalAlpha = .35; curve(c, -8, -110, -12 + sway, -70, -18 + sway, -42, 3, "#5A5566"); curve(c, 10, -110, 16 + sway, -70, 22 + sway, -42, 2, "#5A5566"); c.restore();
    // bodice
    c.beginPath(); c.moveTo(-25, -150); c.quadraticCurveTo(-28, -132, -18, -116); c.lineTo(18, -116); c.quadraticCurveTo(28, -132, 25, -150); c.quadraticCurveTo(0, -158, -25, -150);
    fill(c, lin(c, -25, 0, 25, 0, "#2A2530", "#141118", "#302B38"));
    box(c, -7, -170, 14, 18, 6, sk.skin);
    c.beginPath(); c.moveTo(-12, -154); c.lineTo(0, -135); c.lineTo(12, -154); c.closePath(); fill(c, sk.skin);
    box(c, -19, -121, 38, 5, 2.5, GOLD(c, -19, 19));
    c.beginPath(); c.moveTo(-11, -156); c.quadraticCurveTo(0, -139, 11, -156); stroke(c, "#E3C274", 1.5); dot(c, 0, -142, 2.8, "#F1DA9E");
    // arms
    let Lh = [-30, -92], Rh = [30, -92], Le = [-33, -120], Re = [33, -120];
    if (mv && !o.carry) { const k = Math.sin(ph); Lh = [-27 - k * 12, -94]; Rh = [27 + k * 12, -94]; Le = [-32 - k * 5, -122]; Re = [32 + k * 5, -122]; }
    if (o.carry) { Lh = [18, -118]; Rh = [46, -117]; Le = [-12, -110]; Re = [38, -102]; }
    const q = at * 10;
    switch (A) {
      case "stir": Rh = [50 + Math.cos(q) * 11, -124 + Math.sin(q) * 5]; Re = [40, -108]; Lh = [-20, -110]; Le = [-36, -124]; break;
      case "mix": Lh = [28, -110]; Le = [0, -104]; Rh = [34 + Math.sin(at * 30) * 7, -126 + Math.cos(at * 30) * 3]; Re = [40, -106]; break;
      case "dredge": case "apples": case "dish": Lh = [44, -104 + Math.sin(at * 14) * 5]; Rh = [56, -104 - Math.sin(at * 14) * 5]; Le = [14, -104]; Re = [40, -102]; break;
      case "place": case "oven": case "grab": Lh = [50, -110]; Rh = [58, -104]; Le = [18, -112]; Re = [40, -100]; break;
      case "plate": Lh = [46, -106]; Rh = [54 + Math.sin(at * 16) * 8, -110]; Le = [16, -106]; Re = [42, -100]; break;
      case "clean": Rh = [50 + Math.sin(at * 14) * 18, -102]; Re = [40, -104]; Lh = [-28, -108]; Le = [-38, -126]; break;
      case "flip": Rh = [54, -128 - Math.abs(Math.sin(at * 8)) * 16]; Re = [42, -110]; Lh = [-24, -110]; Le = [-36, -124]; break;
      case "wipe": Rh = [8, -212]; Re = [36, -178]; Lh = [-28, -96]; Le = [-34, -122]; break;
      case "happy": Lh = [-36, -198]; Rh = [36, -198]; Le = [-40, -170]; Re = [40, -170]; break;
      case "deliver": Lh = [48, -124]; Rh = [60, -120]; Le = [16, -116]; Re = [44, -104]; break;
      case "shrug": Lh = [-44, -150]; Rh = [44, -150]; Le = [-40, -128]; Re = [40, -128]; break;
    }
    arm(c, [-24, -146], Le, Lh, 10, "#1E1A24", sk.skin, .3);
    arm(c, [24, -146], Re, Rh, 10, "#1E1A24", sk.skin, .3);
    // head
    let expr = "calm";
    if (A === "happy" || A === "deliver") expr = "happy";
    else if (A === "wipe") expr = "worried";
    else if (A === "shrug") expr = "meh";
    else if (A) expr = "focus";
    else if (o.frazzle > .6) expr = "worried";
    if (o.expr) expr = o.expr;
    head(c, 0, -192 + (mv ? Math.sin(ph * 2) * 1.5 : 0), 33, {
      ...sk, expr, t, blink: o.blink, lashes: true, lip: "#B8475A", earrings: "#F1DA9E", look: o.look || [1, 0], hairFront: HAIR.arielFront,
    });
    if (o.frazzle > .45) {
      c.save(); c.globalAlpha = Math.min(1, (o.frazzle - .45) * 3);
      // a few flyaway wisps at the sides, and a bead of sweat
      curve(c, -30, -214, -44, -222, -40, -234, 2.2, "#6E4128"); curve(c, -32, -206, -48, -206, -46, -218, 2.2, "#6E4128");
      curve(c, 31, -214, 44, -218, 42, -230, 2.2, "#6E4128");
      sweat(c, 36, -200 + (t * 30 % 12), 1.3);
      c.restore();
    }
    if (o.carry) {
      c.save(); c.translate(32, -136); c.scale(dir, 1); food(c, o.carry, 0, 0, 72, t); c.restore();
      handDot(c, Lh, 6.5, sk); handDot(c, Rh, 6.5, sk);
    } else {
      handDot(c, Lh, 6.5, sk); handDot(c, Rh, 6.5, sk);
      if (A === "stir" || A === "mix") { line(c, [Rh[0], Rh[1], Rh[0] + 6, Rh[1] + 26], 3.5, A === "mix" ? "#C9D1DA" : "#B98B5C"); }
      if (A === "flip") { line(c, [Rh[0], Rh[1], Rh[0] + 14, Rh[1] + 20], 3, "#333"); box(c, Rh[0] + 8, Rh[1] + 18, 18, 8, 3, "#444"); }
      if (A === "clean") { box(c, Rh[0] - 10, Rh[1] - 4, 22, 12, 4, "#8CC7E8"); }
    }
    c.restore();
  }

  // ---------- SARAH (standing, long black hair, quietly chic; faces left) ----------
  function sarah(c, x, y, s, o) {
    const t = o.t, sk = SK.sarah, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    shadow(c, 0, 2, 40, 10, .26);
    c.scale(-1, 1);
    if (st === "outburst") c.translate(0, -Math.abs(Math.sin(t * 10)) * 5);
    const sway = Math.sin(t * 1.4) * 1.5;
    c.save(); c.translate(0, -194); HAIR.longBack(sway * .4, ["#302729", "#1B1618", "#0E0B0C"], 2.95)(c, 33); c.restore();
    // wide-leg camel trousers and nude pointed flats
    for (const sd of [-1, 1]) {
      c.beginPath(); c.moveTo(sd * 1, -118); c.lineTo(sd * 20, -118); c.lineTo(sd * 26, -7); c.lineTo(sd * 3, -7); c.closePath();
      fill(c, lin(c, sd * 2, 0, sd * 26, 0, "#CDA67D", "#B08760"));
      ell(c, sd * 14 + 4, -4, 12, 4.5, "#D9B29A");
    }
    line(c, [-1, -108, -2, -10], 1.2, "rgba(90,60,30,.35)"); line(c, [12, -108, 14, -10], 1.2, "rgba(90,60,30,.3)");
    // ivory silk blouse, tucked in, with a slim tan belt
    c.beginPath(); c.moveTo(-24, -150); c.quadraticCurveTo(-27, -132, -20, -116); c.lineTo(20, -116); c.quadraticCurveTo(27, -132, 24, -150); c.quadraticCurveTo(0, -157, -24, -150);
    fill(c, lin(c, -24, 0, 24, 0, "#FFFDF7", "#F3ECE0", "#E3D8C6"));
    c.save(); c.globalAlpha = .5; curve(c, -9, -146, -13, -130, -9, -119, 2, "#FFFFFF"); c.restore();
    box(c, -21, -121, 42, 5, 2.5, "#8A5A2E"); box(c, -3, -122, 6, 7, 1.5, "#E6C77F");
    box(c, -7, -172, 14, 22, 6, sk.skin);
    c.beginPath(); c.moveTo(-10, -154); c.lineTo(0, -137); c.lineTo(10, -154); c.closePath(); fill(c, sk.skin);
    c.beginPath(); c.moveTo(-8, -155); c.quadraticCurveTo(0, -145, 8, -155); stroke(c, "#E3C274", 1.1); dot(c, 0, -146.5, 1.8, "#F1DA9E");
    let Lh = [-25, -94], Le = [-29, -122], Rh = [27, -95], Re = [31, -122];
    if (st === "wrong") { Rh = [6, -140]; Re = [30, -124]; }
    if (st === "eating") { Lh = [20, -116]; Le = [-6, -110]; Rh = [16, -170 + Math.sin(t * 6) * 10]; Re = [36, -140]; }
    if (st === "outburst") { Lh = [10, -126]; Rh = [-10, -122]; Le = [-28, -120]; Re = [28, -122]; }
    arm(c, [-22, -146], Le, Lh, 9.5, "#F3ECE0", sk, .9);
    arm(c, [22, -146], Re, Rh, 9.5, "#F3ECE0", sk, .9);
    handDot(c, Lh, 6, sk); handDot(c, Rh, 6, sk);
    let expr = "calm";
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    head(c, 0, -194, 33, { ...sk, expr, t, blink: o.blink, lashes: true, lip: "#B5646B", earrings: "#E3C274", look: [1, 0], blush: .2,
      hairFront: HAIR.longFront(["#3A2F32", "#1B1618", "#0E0B0C"], true), browCol: "#1B1618" });
    if (st === "eating") { c.save(); c.translate(20, -120); food(c, o.plate || "cake", 0, 0, 50, t); c.restore(); }
    c.restore();
  }

  // ---------- MOLLY (about 40, navy wrap dress; standing, faces left) ----------
  function molly(c, x, y, s, o) {
    const t = o.t, sk = SK.molly, st = o.state;
    const HAIR_COLS = ["#C99A5E", "#A87A42", "#86592C"];
    c.save(); c.translate(x, y); c.scale(s, s);
    shadow(c, 0, 2, 46, 11, .26);
    c.scale(-1, 1);
    if (st === "outburst") c.translate(0, -Math.abs(Math.sin(t * 10)) * 5);
    const sway = Math.sin(t * 1.4) * 1.5;
    c.save(); c.translate(0, -192); HAIR.longBack(sway * .4, HAIR_COLS, 1.45)(c, 34); c.restore();
    for (const sd of [-1, 1]) { line(c, [sd * 10, -80, sd * 11, -8], 13, sk.skin); ell(c, sd * 11 + 5, -4, 13, 6, "#6B3F2A"); }
    // fuller wrap skirt with a little white floral print
    c.beginPath(); c.moveTo(-25, -118); c.bezierCurveTo(-33, -92, -45 + sway, -62, -49 + sway, -42); c.quadraticCurveTo(0, -32, 49 + sway, -42); c.bezierCurveTo(45 + sway, -62, 33, -92, 25, -118); c.closePath();
    fill(c, lin(c, -49, 0, 49, 0, "#46679A", "#2C4570", "#4A6CA0"));
    for (const [fx, fy] of [[-30, -52], [-12, -70], [8, -50], [26, -74], [-24, -92], [14, -98], [34, -50], [-2, -86]]) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; dot(c, fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.7, "rgba(255,255,255,.85)"); } dot(c, fx, fy, 1.2, "#F2C94C"); }
    c.beginPath(); c.moveTo(-6, -114); c.quadraticCurveTo(10 + sway, -80, 20 + sway, -40); stroke(c, "rgba(20,30,60,.35)", 2);
    // bodice with a wrap V and a tie at the waist
    c.beginPath(); c.moveTo(-29, -150); c.quadraticCurveTo(-34, -132, -25, -114); c.lineTo(25, -114); c.quadraticCurveTo(34, -132, 29, -150); c.quadraticCurveTo(0, -158, -29, -150);
    fill(c, lin(c, -29, 0, 29, 0, "#46679A", "#2C4570", "#4A6CA0"));
    box(c, -7, -172, 14, 20, 6, sk.skin);
    c.beginPath(); c.moveTo(-12, -154); c.lineTo(3, -130); c.lineTo(12, -154); c.closePath(); fill(c, sk.skin);
    c.beginPath(); c.moveTo(-14, -153); c.lineTo(3, -128); stroke(c, "#243A60", 2);
    box(c, -27, -121, 54, 7, 3.5, "#243A60");
    ell(c, 20, -117, 6, 4, "#243A60", .5); ell(c, 28, -117, 6, 4, "#243A60", -.5); line(c, [22, -114, 26, -102], 3, "#243A60");
    let Lh = [-28, -94], Le = [-32, -122], Rh = [30, -95], Re = [34, -122];
    if (st === "wrong") { Rh = [6, -142]; Re = [32, -124]; }
    if (st === "eating") { Lh = [22, -116]; Le = [-6, -110]; Rh = [16, -170 + Math.sin(t * 6) * 10]; Re = [38, -140]; }
    if (st === "outburst") { Lh = [12, -126]; Rh = [-12, -122]; Le = [-30, -120]; Re = [30, -122]; }
    arm(c, [-26, -146], Le, Lh, 11, "#3A5A8C", sk, .75);
    arm(c, [26, -146], Re, Rh, 11, "#3A5A8C", sk, .75);
    handDot(c, Lh, 6.5, sk); handDot(c, Rh, 6.5, sk);
    let expr = "calm";
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    head(c, 0, -194, 34, { ...sk, expr, t, blink: o.blink, lashes: true, lip: "#B8475A", earrings: "#FFFFFF", look: [1, 0], blush: .34,
      hairFront: HAIR.longFront(HAIR_COLS), browCol: "#6E4A28" });
    if (st === "eating") { c.save(); c.translate(22, -120); food(c, o.plate || "kugel", 0, 0, 50, t); c.restore(); }
    c.restore();
  }

  // ---------- IKEY (couch, football fan) ----------
  function ikey(c, x, y, s, o) {
    const t = o.t, sk = SK.ikey, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    const bounce = (st === "outburst" || o.event === "cheer") ? -Math.abs(Math.sin(t * 12)) * 8 : 0;
    c.translate(0, bounce);
    seatedLegs(c, "#34435E", "#F2F2F2");
    torso(c, "#2F5BB5", "#1F3F86", 29, 27);
    line(c, [-29, -110, -24, -112], 5, "#FFFFFF");
    text(c, "12", 0, -94, 26, "#FFFFFF", 700);
    const pointing = st === "waiting" && m >= 1 && Math.sin(t * (1.5 + m)) > .45;
    let Lh = [-44, -120], Le = [-44, -104], Rh = [26, -64], Re = [34, -92];
    if (pointing) { Rh = [74, -152]; Re = [50, -134]; }
    if ((st === "waiting" && m >= 3) || st === "outburst" || o.event === "cheer") {
      const f = Math.sin(t * 14) * 8; Lh = [-40, -204 + f]; Le = [-44, -166]; Rh = [40, -204 - f]; Re = [44, -166];
    }
    if (st === "eating") { Lh = [-14, -84]; Le = [-34, -92]; Rh = [16, -160 + Math.sin(t * 7) * 12]; Re = [38, -120]; }
    arm(c, [-26, -124], Le, Lh, 11, "#2F5BB5", sk, .35);
    arm(c, [26, -124], Re, Rh, 11, "#2F5BB5", sk, .35);
    handDot(c, Lh, 7, sk); handDot(c, Rh, 7, sk);
    if (!pointing && st !== "eating" && !(m >= 3 && st === "waiting") && st !== "outburst" && o.event !== "cheer") box(c, Rh[0] - 5, Rh[1] - 16, 10, 22, 4, "#2A2A30");
    if (st === "eating") { c.save(); c.translate(0, -76); food(c, o.plate || "soup", 0, 0, 52, t); c.restore(); }
    let expr = ["calm", "meh", "annoyed", "angry"][m];
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (o.event === "cheer") expr = "happy"; else if (st === "wrong") expr = "gasp";
    const lookTV = st !== "eating" && st !== "outburst" && st !== "wrong";
    head(c, 0, -162, 33, { ...sk, expr, t, blink: o.blink, look: lookTV ? [1.6, -.2] : [0, 0], stubble: true, anger: m >= 3 && st === "waiting" ? .6 : 0, hairFront: HAIR.ikey, tilt: lookTV ? .06 : 0 });
    c.restore();
  }

  // ---------- MICHAEL (couch, on the phone; black polo, navy shorts) ----------
  function michael(c, x, y, s, o) {
    const t = o.t, sk = SK.michael, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (st === "outburst") c.translate(0, -Math.abs(Math.sin(t * 11)) * 7);
    seatedLegs(c, "#1F2A4A", "#F4F4F4", 16, 0, sk.skin);
    bellyTorso(c, "#34343C", "#141418");
    // polo collar and placket
    c.beginPath(); c.moveTo(-15, -133); c.lineTo(-3, -119); c.lineTo(-1, -131); c.closePath(); fill(c, "#2A2A31");
    c.beginPath(); c.moveTo(15, -133); c.lineTo(3, -119); c.lineTo(1, -131); c.closePath(); fill(c, "#2A2A31");
    line(c, [0, -124, 0, -102], 2, "#46464F"); dot(c, 0, -116, 1.6, "#6A6A74"); dot(c, 0, -108, 1.6, "#6A6A74");
    const swap = o.event === "switch" ? (o.eventT < .7 ? 1 : 0) : 0;
    let Ph = swap ? [32, -168] : [-32, -168], Pe = swap ? [46, -130] : [-46, -130];
    let Oh = swap ? [-32, -62] : [32, -62], Oe = swap ? [-44, -90] : [44, -90];
    if (st === "waiting" && m >= 1) { Oh = swap ? [-52, -104] : [52, -104]; Oe = swap ? [-48, -92] : [48, -92]; }
    if ((st === "waiting" && m >= 3) || st === "outburst") { const f = Math.sin(t * 9) * 10; Oh = [50, -178 + f]; Oe = [50, -140]; }
    if (st === "eating") { Oh = [14, -156 + Math.sin(t * 7) * 12]; Oe = [38, -118]; }
    arm(c, [swap ? 30 : -30, -124], Pe, Ph, 12, "#2A2A31", sk, .4);
    arm(c, [swap ? -30 : 30, -124], Oe, Oh, 12, "#2A2A31", sk, .4);
    let expr = ["calm", "meh", "annoyed", "angry"][m];
    if (m >= 2 && st === "waiting" && Math.sin(t * 1.2) > .3) expr = "rolleyes";
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    const glance = st === "waiting" && Math.sin(t * .9) > .5;
    head(c, 0, -164, 35, { ...sk, expr, t, blink: o.blink, look: glance ? [-1.6, -.6] : [-.6, .2], blush: .38, hairFront: HAIR.michael });
    box(c, Ph[0] - 7, Ph[1] - 20, 14, 26, 4, "#1D1F26"); box(c, Ph[0] - 5, Ph[1] - 17, 10, 19, 2, "#3B6FB8");
    handDot(c, Ph, 7.5, sk); handDot(c, Oh, 7.5, sk);
    if (st === "eating") { c.save(); c.translate(0, -76); food(c, o.plate || "frittata", 0, 0, 52, t); c.restore(); }
    c.restore();
  }

  // ---------- SIMON (Grandpa: chubby, full head of hair, ham radio) ----------
  function simon(c, x, y, s, o) {
    const t = o.t, sk = SK.simon, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    box(c, -40, -152, 80, 98, 22, lin(c, 0, -152, 0, -50, "#3A3A44", "#24242C"));
    line(c, [0, -50, 0, -10], 6, "#777C86"); line(c, [-24, -6, 24, -6], 5, "#777C86"); dot(c, -24, -4, 4, "#333"); dot(c, 24, -4, 4, "#333");
    if (st === "outburst") c.translate(Math.sin(t * 30) * 3, 0);
    seatedLegs(c, "#5E5A52", "#3E2C22", 15);
    bellyTorso(c, "#8C7A5E", "#6C5C44");
    c.beginPath(); c.moveTo(-9, -131); c.lineTo(0, -102); c.lineTo(9, -131); c.closePath(); fill(c, "#9FB6D6");
    for (let i = 0; i < 4; i++) dot(c, -4, -98 + i * 11, 2.2, "#D9C9A0");
    const fiddle = (st === "waiting" && m >= 2) || st === "outburst" ? Math.sin(t * 26) * 5 : Math.sin(t * 2) * 2;
    let Lh = [-60 + fiddle, -100], Le = [-50, -94];
    let Rh = [16, -152], Re = [42, -120];
    if (st === "outburst") { Rh = [36, -204 + Math.sin(t * 12) * 8]; Re = [44, -164]; }
    if (st === "eating") { Rh = [14, -158 + Math.sin(t * 7) * 12]; Re = [40, -120]; Lh = [-16, -84]; Le = [-40, -94]; }
    arm(c, [-30, -124], Le, Lh, 12, "#8C7A5E", sk, .9);
    arm(c, [30, -124], Re, Rh, 12, "#8C7A5E", sk, .9);
    if (st !== "eating") { box(c, Rh[0] - 7, Rh[1] - 22, 14, 22, 6, "#2A2A30"); for (let i = 0; i < 3; i++) line(c, [Rh[0] - 5, Rh[1] - 18 + i * 5, Rh[0] + 5, Rh[1] - 18 + i * 5], 1, "#666"); }
    handDot(c, Lh, 7.5, sk); handDot(c, Rh, 7.5, sk);
    let expr = ["calm", "meh", "annoyed", "angry"][m];
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    if (o.event === "tangle") expr = "worried";
    // radio headphones resting around his neck
    c.beginPath(); c.arc(0, -134, 26, Math.PI * .1, Math.PI * .9); stroke(c, "#2B2B33", 5);
    box(c, -34, -140, 12, 20, 6, "#B8323A"); box(c, 22, -140, 12, 20, 6, "#B8323A");
    head(c, 0, -164, 35, { ...sk, expr, t, blink: o.blink, glasses: "#6B5A3A", look: [-.8, .3], blush: .38, hairFront: HAIR.simon, browCol: "#3E2E22" });
    if (st === "eating") { c.save(); c.translate(0, -76); food(c, o.plate || "soup", 0, 0, 52, t); c.restore(); }
    c.restore();
  }

  // ---------- CARI (shopping, behind her bistro table) ----------
  function cari(c, x, y, s, o) {
    const t = o.t, sk = SK.cari, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    shadow(c, 0, 0, 120, 16, .22);
    // chair back
    c.beginPath(); c.ellipse(0, -128, 50, 58, 0, 0, TAU); stroke(c, "#C9A45C", 5);
    box(c, -44, -120, 88, 60, 18, "#E9D9C4");
    if (st === "outburst") c.translate(0, -Math.abs(Math.sin(t * 11)) * 7);
    torso(c, "#E0678D", "#C24A70", 27, 24);
    c.beginPath(); c.moveTo(-12, -128); c.quadraticCurveTo(0, -112, 12, -128); fill(c, sk.skin);
    c.beginPath(); c.moveTo(-12, -128); c.quadraticCurveTo(0, -110, 12, -128); stroke(c, "#F1DA9E", 1.6);
    let Lh = [-22 + Math.sin(t * 16) * 3, -84], Rh = [22 - Math.sin(t * 16 + 1) * 3, -84], Le = [-36, -100], Re = [36, -100];
    let bag = false;
    if (st === "waiting" && m === 2 && Math.sin(t * 1.3) > -.2) { Rh = [48, -196]; Re = [44, -156]; bag = true; }
    if (st === "waiting" && m >= 3) { Lh = [14, -108]; Rh = [-14, -104]; Le = [-30, -100]; Re = [30, -100]; }
    if (o.event === "gasp") { Lh = [-22, -160]; Rh = [22, -160]; Le = [-36, -124]; Re = [36, -124]; }
    if (st === "outburst") { const f = Math.sin(t * 13) * 10; Lh = [-44, -200 + f]; Rh = [44, -200 - f]; Le = [-44, -160]; Re = [44, -160]; bag = true; }
    if (st === "eating") { Lh = [-18, -84]; Le = [-34, -96]; Rh = [16, -160 + Math.sin(t * 7) * 12]; Re = [36, -120]; }
    arm(c, [-24, -124], Le, Lh, 10, "#E0678D", sk, .35);
    arm(c, [24, -124], Re, Rh, 10, "#E0678D", sk, .35);
    handDot(c, Lh, 6.5, sk); handDot(c, Rh, 6.5, sk);
    if (bag) {
      const b = st === "outburst" ? Lh : Rh;
      c.save(); c.translate(b[0], b[1] + 6); c.rotate(Math.sin(t * 6) * .15);
      c.beginPath(); c.arc(0, 4, 9, Math.PI, 0); stroke(c, "#1B1B1B", 2.5);
      box(c, -18, 4, 36, 38, 5, lin(c, -18, 0, 18, 0, "#F3B6CB", "#E68AAD"));
      text(c, "SALE", 0, 24, 11, "#FFFFFF", 700); c.restore();
    }
    let expr = ["calm", "meh", "annoyed", "rolleyes"][m];
    if (o.event === "gasp") expr = "gasp";
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    head(c, 0, -162, 33, { ...sk, expr, t, blink: o.blink, lashes: true, lip: "#C8456A", earrings: "#F1DA9E", look: [0, .9], anger: m >= 3 && st === "waiting" ? .45 : 0, hairBack: HAIR.cariBack, hairFront: HAIR.cariFront });
    // table in front of her
    line(c, [0, -60, 0, -4], 10, "#B08A46");
    ell(c, 0, -2, 40, 8, "#9C7634");
    c.beginPath(); c.ellipse(0, -66, 118, 24, 0, 0, TAU); fill(c, lin(c, -118, 0, 118, 0, "#F2EEE8", "#FFFFFF", "#E2DDD5"));
    c.beginPath(); c.ellipse(0, -66, 118, 24, 0, 0, Math.PI); stroke(c, "#C9A45C", 3);
    // tablet leaning toward her, seen from the back, with a heart sticker
    c.save(); c.translate(-6, -90); c.rotate(-.06);
    box(c, -34, -26, 68, 44, 8, lin(c, -34, 0, 34, 0, "#E8C9C0", "#F6E0D9", "#D9B2A8"), "#C99B90", 1.5);
    c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(-8, -14, -16, -2, 0, 8); c.bezierCurveTo(16, -2, 8, -14, 0, -4); fill(c, "#E35C83");
    c.restore();
    // kiddush cup and matzah on her table
    c.save(); c.translate(80, -80); box(c, -2, 2, 4, 12, 1, "#C9A45C"); ell(c, 0, 14, 8, 3, "#C9A45C");
    c.beginPath(); c.moveTo(-9, -12); c.quadraticCurveTo(0, 8, 9, -12); c.closePath(); fill(c, lin(c, -9, 0, 9, 0, "#9C7634", "#F1DA9E", "#9C7634"));
    ell(c, 0, -12, 9, 3, "#7A1830"); c.restore();
    c.save(); c.translate(-82, -76); c.rotate(-.1); box(c, -18, -6, 36, 12, 3, "#EBCB91"); for (let i = 0; i < 4; i++) line(c, [-14 + i * 9, -3, -14 + i * 9, 3], 1.5, "#C99E5B"); c.restore();
    if (st === "eating") { c.save(); c.translate(26, -80); food(c, o.plate || "cutlets", 0, 0, 52, t); c.restore(); }
    c.restore();
  }

  // ---------- NANA (knitting in her armchair) ----------
  function nana(c, x, y, s, o) {
    const t = o.t, sk = SK.nana, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    shadow(c, 0, 0, 100, 16, .25);
    // chair back + wings
    c.beginPath(); c.moveTo(-72, -40); c.bezierCurveTo(-86, -150, -76, -236, 0, -240); c.bezierCurveTo(76, -236, 86, -150, 72, -40); c.closePath();
    fill(c, lin(c, -80, -240, 80, 0, "#D9A2A0", "#C4807F", "#A9676A"));
    c.save(); c.globalAlpha = .35; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) dot(c, -30 + i * 30, -200 + j * 40, 3, "#7E4A4D"); c.restore();
    box(c, -68, -64, 136, 30, 14, "#C98A89");
    box(c, -70, -44, 140, 40, 12, lin(c, 0, -44, 0, -4, "#C4807F", "#A9676A"));
    for (let i = 0; i < 7; i++) line(c, [-62 + i * 20.5, -10, -62 + i * 20.5, -4], 2, "#8E5557");
    line(c, [-58, -4, -60, 6], 5, "#6B4A34"); line(c, [58, -4, 60, 6], 5, "#6B4A34");
    // Nana: about 60, slim, long brown hair, soft cream sweater and dark jeans
    const NANA_HAIR = ["#9A6440", "#74462A", "#56321C"];
    c.save(); c.translate(0, -160); HAIR.longBack(Math.sin(t * 1.3), NANA_HAIR, 2.3)(c, 32); c.restore();
    seatedLegs(c, "#3A4660", "#8A5A3A", 11);
    torso(c, "#F4EADB", "#DCCAB2", 23, 20, -126, -58);
    c.beginPath(); c.moveTo(-10, -128); c.lineTo(0, -116); c.lineTo(10, -128); c.closePath(); fill(c, sk.skin);
    c.beginPath(); c.moveTo(-9, -127); c.quadraticCurveTo(0, -112, 9, -127); stroke(c, "#E3C274", 1.3); dot(c, 0, -118, 2.2, "#F1DA9E");
    // knitting: needles cross, faster when she's cross
    const speed = st === "waiting" ? 5 + m * 7 : 4;
    const k = Math.sin(t * speed);
    let Lh = [-16, -100 + k * 4], Rh = [16, -100 - k * 4], Le = [-36, -96], Re = [36, -96];
    if (st === "outburst") { const f = Math.sin(t * 12) * 8; Lh = [-36, -196 + f]; Rh = [36, -196 - f]; Le = [-40, -156]; Re = [40, -156]; }
    if (st === "eating") { Lh = [-16, -84]; Le = [-34, -94]; Rh = [14, -156 + Math.sin(t * 6) * 10]; Re = [36, -118]; }
    const knitting = st !== "outburst" && st !== "eating";
    if (knitting) {
      const len = 30 + Math.min(70, (o.scarf || 0));
      c.save(); c.translate(0, -94);
      for (let i = 0; i < len; i += 8) box(c, -16, i, 32, 8, 2, (i / 8) % 2 ? "#6FA5D8" : "#F5F1FA");
      c.restore();
      line(c, [Lh[0] - 6, Lh[1] + 8, Lh[0] + 34, Lh[1] - 28], 3, "#C9A45C");
      line(c, [Rh[0] + 6, Rh[1] + 8, Rh[0] - 34, Rh[1] - 28], 3, "#C9A45C");
    }
    arm(c, [-21, -122], Le, Lh, 9.5, "#EFE3D2", sk, .9);
    arm(c, [21, -122], Re, Rh, 9.5, "#EFE3D2", sk, .9);
    handDot(c, Lh, 7, sk); handDot(c, Rh, 7, sk);
    // yarn ball (rolls away during the yarn event)
    const yx = o.event === "yarn" ? 56 + Math.sin(Math.min(1, o.eventT / 1.2) * Math.PI) * 80 : 56;
    if (knitting) curve(c, 0, -80, 30, -20, yx, -14, 1.5, "#6FA5D8");
    dot(c, yx, -14, 13, radF(c, yx - 4, -18, yx, -14, 14, "#9CC5EA", "#5A8FC4"));
    c.save(); c.globalAlpha = .5; curve(c, yx - 9, -18, yx, -8, yx + 9, -20, 1.5, "#FFFFFF"); c.restore();
    let expr = ["calm", "meh", "stern", "stern"][m];
    if (st === "outburst") expr = "annoyed"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp"; else if (o.event === "yarn") expr = "gasp";
    head(c, 0, -160, 33, { ...sk, expr, t, blink: o.blink, lashes: true, lip: "#B5646B", earrings: "#E3C274", look: [0, 1], blush: .25, hairFront: HAIR.longFront(NANA_HAIR), browCol: "#5A361F" });
    // chair arms in front
    for (const sd of [-1, 1]) {
      box(c, sd * 76 - 20, -112, 40, 100, 18, lin(c, 0, -112, 0, -12, "#D49A99", "#AD6C6E"));
      ell(c, sd * 76, -110, 20, 10, "#DFAEAC");
    }
    if (st === "eating") { c.save(); c.translate(0, -70); food(c, o.plate || "kugel", 0, 0, 52, t); c.restore(); }
    c.restore();
  }

  // ---------- MAX (3, chubby, curly, chaos) ----------
  function max(c, x, y, s, o) {
    const t = o.t, sk = SK.max, act = o.act || "sit";
    c.save(); c.translate(x, y); c.scale(s, s);
    shadow(c, 0, 2, 34, 8, .26);
    if (o.stool) { box(c, -26, -46, 52, 10, 5, "#B98B5C"); line(c, [-18, -38, -22, 0], 5, "#8A6040"); line(c, [18, -38, 22, 0], 5, "#8A6040"); c.translate(0, -44); }
    c.scale(o.dir || 1, 1);
    const run = act === "run", ph = o.ph || 0;
    let bodyY = 0, tilt = 0;
    if (run) { tilt = Math.sin(ph) * .16; bodyY = -Math.abs(Math.sin(ph)) * 6; }
    if (act === "bang" || act === "happy") bodyY = -Math.abs(Math.sin(t * 10)) * 8;
    const sitting = act === "sit" || act === "eat" || act === "nap";
    c.translate(0, bodyY); c.rotate(tilt);
    if (sitting) {
      for (const sd of [-1, 1]) { ell(c, sd * 16, -12, 18, 12, "#5A86C8"); ell(c, sd * 30, -8, 9, 8, sk.skin); ell(c, sd * 33, -6, 7, 6, "#FFFFFF"); }
    } else {
      for (const sd of [-1, 1]) {
        const L = run ? Math.sin(ph) * sd * 12 : 0;
        line(c, [sd * 10, -34, sd * 10 + L, -8], 15, sk.skin);
        ell(c, sd * 10 + L + 3, -5, 11, 7, "#FFFFFF");
        line(c, [sd * 10 + L - 5, -8, sd * 10 + L + 9, -8], 2, "#8FB9E6");
      }
    }
    const by = sitting ? -40 : -58;
    // denim shorts
    box(c, -26, by + 8, 52, 24, 10, "#5A86C8");
    // round striped tummy
    c.save(); c.beginPath(); c.ellipse(0, by - 4, 31, 30, 0, 0, TAU); c.clip();
    c.fillStyle = "#F9C74F"; c.fillRect(-32, by - 36, 64, 64);
    c.fillStyle = "#F07C4A";
    for (let i = 0; i < 6; i++) c.fillRect(-32, by - 34 + i * 11, 64, 5.5);
    c.restore();
    c.save(); c.beginPath(); c.ellipse(0, by - 4, 31, 30, 0, 0, TAU); c.globalAlpha = .18; fill(c, radF(c, -12, by - 16, 0, by - 4, 34, "#FFFFFF", "rgba(255,255,255,0)")); c.restore();
    // arms
    let Lh = [-34, by + 4], Rh = [34, by + 4];
    if (run) { const k = Math.sin(ph * 1.3); Lh = [-38, by - 34 + k * 8]; Rh = [38, by - 34 - k * 8]; }
    if (act === "bang") { const k = Math.sin(t * 14); Lh = [-30, by - 40 + k * 16]; Rh = [30, by - 40 - k * 16]; }
    if (act === "stir") { Rh = [34 + Math.cos(t * 9) * 8, by - 44 + Math.sin(t * 9) * 5]; Lh = [-30, by - 10]; }
    if (act === "eat") { Rh = [10, by - 26]; Lh = [-26, by + 6]; }
    if (act === "happy") { Lh = [-36, by - 50]; Rh = [36, by - 50]; }
    if (act === "peek") { Lh = [-26, by - 30]; Rh = [30, by - 44]; }
    if (act === "reach") { Rh = [40, by - 50]; Lh = [-28, by - 36]; }
    line(c, [-24, by - 18, Lh[0], Lh[1]], 13, sk.skin);
    line(c, [24, by - 18, Rh[0], Rh[1]], 13, sk.skin);
    dot(c, Lh[0], Lh[1], 7.5, sk.skin); dot(c, Rh[0], Rh[1], 7.5, sk.skin);
    // props in hand
    if (o.snack) { c.save(); c.translate(Rh[0], Rh[1] - 4); food(c, o.snack, 0, 0, 30, t); c.restore(); }
    if (act === "stir" || o.prop === "spoon") { line(c, [Rh[0], Rh[1], Rh[0] + 10, Rh[1] - 36], 4, "#B98B5C"); ell(c, Rh[0] + 11, Rh[1] - 40, 6, 9, "#B98B5C", .3); }
    if (act === "bang") { line(c, [Rh[0], Rh[1], Rh[0] + 6, Rh[1] - 28], 4, "#B98B5C"); line(c, [Lh[0], Lh[1], Lh[0] - 6, Lh[1] - 28], 4, "#B98B5C"); }
    let expr = o.expr || (act === "eat" ? "eat" : act === "nap" ? "sleep" : act === "happy" ? "grin" : run ? "grin" : "sly");
    const hy = by - 48 + (act === "nap" ? 6 : 0);
    head(c, 0, hy, 30, { ...sk, expr, t, blink: o.blink, iris: "#4A6FA5", look: o.look || [0, 0], blush: .45, crumbs: o.crumbs, tilt: act === "nap" ? .3 : 0, hairFront: (cc, r) => HAIR.max(cc, r, t) });
    if (o.flour) { c.save(); c.globalAlpha = .85; dot(c, -10, hy + 8, 9, "#FFFFFF"); dot(c, 12, hy - 4, 7, "#FFFFFF"); dot(c, 4, hy - 26, 10, "#FFFFFF"); c.restore(); }
    if (o.pot) {
      c.save(); c.translate(0, hy - 16); c.rotate(Math.sin(t * 6) * .1);
      c.beginPath(); c.moveTo(-36, 6); c.lineTo(-30, -30); c.quadraticCurveTo(0, -38, 30, -30); c.lineTo(36, 6); c.closePath(); fill(c, lin(c, -36, 0, 36, 0, "#9AA3AD", "#E9EDF1", "#8B949E"));
      ell(c, 0, 6, 37, 7, "#7C858F"); box(c, -48, -16, 14, 7, 3, "#2E2E34"); box(c, 34, -16, 14, 7, 3, "#2E2E34");
      c.restore();
    }
    c.restore();
  }

  // ---------- food ----------
  function plate(c, w = 1) {
    ell(c, 0, 10, 32 * w, 12, lin(c, -32, 0, 32, 0, "#E9E4DC", "#FFFFFF", "#E2DCD2"));
    c.beginPath(); c.ellipse(0, 10, 32 * w, 12, 0, 0, TAU); stroke(c, "#D6B56A", 1.6);
    ell(c, 0, 9, 22 * w, 7.5, "#F5F1EA");
  }
  function bowl(c, inside) {
    c.beginPath(); c.moveTo(-26, -2); c.quadraticCurveTo(-24, 22, 0, 22); c.quadraticCurveTo(24, 22, 26, -2); c.closePath();
    fill(c, lin(c, -26, 0, 26, 0, "#D8D2C8", "#FFFFFF", "#D2CBC0"));
    ell(c, 0, -2, 26, 8, "#EFEAE2"); ell(c, 0, -1, 22, 6.5, inside);
  }
  function skillet(c) {
    line(c, [22, 2, 44, -4], 6, "#2C2A2E");
    ell(c, 0, 4, 28, 10, "#26242A"); ell(c, 0, 1, 25, 8.5, "#3B3940");
  }
  function bakingDish(c) {
    box(c, -30, -4, 60, 18, 6, lin(c, 0, -4, 0, 14, "#FFFFFF", "#DCD6CE"));
    line(c, [-27, 6, 27, 6], 2, "#6E93C8");
    ell(c, -32, 2, 4, 3, "#E9E4DC"); ell(c, 32, 2, 4, 3, "#E9E4DC");
  }
  function cakePan(c) { ell(c, 0, 6, 28, 10, "#A9B1BA"); box(c, -28, -2, 56, 10, 3, lin(c, -28, 0, 28, 0, "#8F98A2", "#DDE2E7", "#8F98A2")); }
  function mixBowl(c, col, t = 0, whisk = false) {
    c.beginPath(); c.moveTo(-28, -4); c.quadraticCurveTo(-26, 22, 0, 22); c.quadraticCurveTo(26, 22, 28, -4); c.closePath();
    fill(c, lin(c, -28, 0, 28, 0, "#AEB6BF", "#EEF1F4", "#9EA7B1"));
    ell(c, 0, -4, 28, 8, "#C6CDD4"); ell(c, 0, -3, 24, 6, col);
    if (whisk) { line(c, [6, -2, 18, -30], 3, "#8C949C"); c.beginPath(); c.ellipse(6, -6, 5, 9, -.4, 0, TAU); stroke(c, "#C3C9CF", 1.5); }
  }
  function chickenPiece(c, x, y, col, rot = 0, crumbs) {
    c.save(); c.translate(x, y); c.rotate(rot);
    ell(c, 0, 0, 17, 9, col);
    if (crumbs) for (let i = 0; i < 7; i++) dot(c, -11 + i * 3.6, ((i * 7) % 5) - 2.5, 1.3, crumbs);
    c.restore();
  }
  function mushroom(c, x, y, sc = 1) { box(c, x - 2.5 * sc, y - 1, 5 * sc, 7 * sc, 2, "#F2E6D0"); c.beginPath(); c.ellipse(x, y - 1, 7 * sc, 5 * sc, 0, Math.PI, 0); fill(c, "#8A5A3A"); }
  function appleSlices(c, y, n = 5, w = 20) {
    for (let i = 0; i < n; i++) {
      const x = -w + i * (2 * w / (n - 1));
      c.beginPath(); c.ellipse(x, y, 6, 3.5, -.5, 0, Math.PI); fill(c, "#F6E1A2");
      c.beginPath(); c.ellipse(x, y, 6, 3.5, -.5, Math.PI, TAU); fill(c, "#D6453D");
    }
  }

  function food(c, id, x, y, size = 60, t = 0) {
    c.save(); c.translate(x, y); const k = size / 64; c.scale(k, k);
    switch (id) {
      case "frittata": case "frittata_c": {
        if (id === "frittata") plate(c); else skillet(c);
        const yy = id === "frittata" ? 2 : 0;
        box(c, -20, yy - 2, 40, 9, 5, "#D9982F");
        ell(c, 0, yy - 2, 20, 7.5, lin(c, -20, 0, 20, 0, "#F6CD58", "#FBE08A", "#EDB844"));
        dot(c, -7, yy - 3, 2.5, "#C97D2E"); dot(c, 8, yy - 1, 2.2, "#C97D2E"); dot(c, 3, yy - 5, 1.6, "#D8553B"); dot(c, -12, yy, 1.6, "#D8553B");
        for (let i = 0; i < 6; i++) dot(c, -14 + i * 5.5, yy - 3 + (i % 3) * 2, 1.2, "#4E8A3E");
        if (id === "frittata") line(c, [0, yy - 2, 14, yy - 7], 1.4, "#C97D2E");
        break;
      }
      case "kugel": case "kugel_c": case "kugelraw": {
        if (id === "kugel") { plate(c); box(c, -15, -6, 30, 14, 3, "#C98A3C"); box(c, -15, -8, 30, 7, 3, lin(c, 0, -8, 0, -1, "#E9B35C", "#D8963F")); mushroom(c, -6, -8, .8); mushroom(c, 7, -9, .7); dot(c, 1, -7, 1.5, "#6E4A20"); }
        else {
          bakingDish(c);
          const top = id === "kugel_c" ? lin(c, 0, -6, 0, 4, "#EDB85E", "#C98A3C") : lin(c, 0, -6, 0, 4, "#F3E3C0", "#E6D2A6");
          box(c, -26, -6, 52, 10, 4, top);
          mushroom(c, -14, -3, .7); mushroom(c, 2, -4, .7); mushroom(c, 15, -3, .7);
          if (id === "kugel_c") { dot(c, -6, -2, 2, "#A86B28"); dot(c, 9, 0, 2, "#A86B28"); }
        }
        break;
      }
      case "soup": {
        bowl(c, lin(c, 0, -8, 0, 4, "#F4C45A", "#E3A23A"));
        dot(c, -4, -6, 9, radF(c, -7, -10, -4, -6, 10, "#FBEBC8", "#E2C18A"));
        dot(c, 10, -2, 3, "#F08A3C"); dot(c, -15, -1, 3, "#F08A3C"); dot(c, 14, -5, 2.4, "#F08A3C");
        line(c, [5, -3, 9, -6, 12, -3], 1.4, "#5E9A4A");
        if (t) steam(c, 0, -6, 12, t, .7);
        break;
      }
      case "cutlets": case "cutlets_c": case "breaded": case "chicken": {
        if (id === "cutlets") plate(c);
        else if (id === "cutlets_c") skillet(c);
        else box(c, -30, -4, 60, 18, 7, lin(c, 0, -4, 0, 14, "#D5E6EF", "#AFC8D6"));
        const col = id === "chicken" ? "#F4AFA6" : id === "breaded" ? "#E6CB93" : "#D99A3E";
        const cr = id === "chicken" ? null : id === "breaded" ? "#F6E7C4" : "#9C5E1E";
        chickenPiece(c, -8, 2, col, -.2, cr); chickenPiece(c, 9, 0, col, .25, cr);
        if (id === "cutlets") { c.beginPath(); c.moveTo(18, 6); c.arc(18, 6, 8, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); fill(c, "#F6DD4A"); dot(c, -18, 8, 3, "#4E8A3E"); dot(c, -14, 10, 2.5, "#5E9A4A"); }
        break;
      }
      case "cake": case "cake_c": case "cakeraw": {
        if (id === "cake") {
          plate(c);
          c.beginPath(); c.moveTo(-18, 6); c.lineTo(16, 10); c.lineTo(16, -4); c.lineTo(-18, -12); c.closePath(); fill(c, lin(c, 0, -12, 0, 10, "#E6B36A", "#C98A3C"));
          c.beginPath(); c.moveTo(-18, -12); c.lineTo(16, -4); c.lineTo(22, -12); c.lineTo(-8, -18); c.closePath(); fill(c, "#F0C77E");
          line(c, [-18, -2, 16, 3], 3, "#F3E0A0");
          appleSlices(c, -12, 4, 10);
          for (let i = 0; i < 8; i++) dot(c, -10 + i * 4, -15 + (i % 3) * 2, 1, "#FFFFFF");
        } else {
          cakePan(c);
          ell(c, 0, -2, 25, 8, id === "cake_c" ? lin(c, 0, -10, 0, 6, "#EDBB6A", "#C98A3C") : lin(c, 0, -10, 0, 6, "#F7EBCB", "#EAD7A8"));
          appleSlices(c, -2, 6, 17);
        }
        break;
      }
      case "eggs": {
        for (const [ex, ey, r] of [[-12, 4, 11], [10, 5, 11], [-1, -6, 12]]) { c.beginPath(); c.ellipse(ex, ey, r * .8, r, 0, 0, TAU); fill(c, radF(c, ex - 3, ey - 4, ex, ey, r * 1.1, "#FFFFFF", "#F4E6D2", "#DCC6A8")); }
        break;
      }
      case "soupveg": {
        for (const [cx, rot] of [[-10, -.6], [4, -.3]]) {
          c.save(); c.translate(cx, 4); c.rotate(rot); c.beginPath(); c.moveTo(-5, -16); c.lineTo(5, -16); c.lineTo(0, 16); c.closePath(); fill(c, lin(c, -5, 0, 5, 0, "#F9A24B", "#E57A22"));
          line(c, [-2, -16, -5, -24], 2.5, "#5E9A4A"); line(c, [2, -16, 4, -25], 2.5, "#4E8A3E"); c.restore();
        }
        box(c, 10, -18, 8, 34, 4, lin(c, 10, 0, 18, 0, "#B9DC8A", "#8FC065"));
        dot(c, 20, 10, 9, radF(c, 17, 7, 20, 10, 10, "#FFF3D6", "#E9C98A"));
        break;
      }
      case "kugelfix": {
        box(c, -24, -18, 22, 32, 4, lin(c, -24, 0, -2, 0, "#F6D86A", "#E8BC3C")); box(c, -21, -8, 16, 10, 2, "#FFFFFF"); for (let i = 0; i < 4; i++) dot(c, -18 + i * 3.5, -3, 1.2, "#D9A441");
        mushroom(c, 10, 2, 1.6); mushroom(c, 18, 12, 1.3); mushroom(c, 2, 13, 1.2);
        break;
      }
      case "cakefix": {
        c.beginPath(); c.moveTo(-26, 16); c.lineTo(-24, -14); c.quadraticCurveTo(-13, -22, -2, -14); c.lineTo(0, 16); c.closePath(); fill(c, lin(c, -26, 0, 0, 0, "#F4ECDD", "#E2D6BF"));
        text(c, "FLOUR", -13, 2, 7, "#8A6A3A", 700);
        ell(c, 16, 10, 12, 5, "#C8D8E6"); c.beginPath(); c.moveTo(4, 10); c.quadraticCurveTo(16, 30, 28, 10); fill(c, "#DCE7F0"); ell(c, 16, 9, 10, 4, "#FFFFFF");
        dot(c, 12, -10, 7, radF(c, 10, -12, 12, -10, 8, "#FF7B6B", "#D8453D")); line(c, [12, -17, 13, -21], 2, "#6B4A2A");
        break;
      }
      case "eggmix": mixBowl(c, lin(c, -24, 0, 24, 0, "#F8D660", "#FBE58E"), t, true); break;
      case "kugelmix": mixBowl(c, "#E9D5A4", t, false); mushroom(c, -8, -4, .7); mushroom(c, 8, -5, .6); break;
      case "batter": mixBowl(c, "#F6EBD0", t, true); curve(c, -12, -3, 0, -7, 10, -3, 1.4, "#E6D4AC"); break;
      case "burnt": { skillet(c); ell(c, 0, 0, 18, 6, "#2A2020"); steam(c, 0, -4, 12, t || .3, .5); break; }
      // Max's snacks
      case "matzah": {
        c.save(); c.rotate(-.12); box(c, -24, -18, 48, 36, 5, lin(c, 0, -18, 0, 18, "#F2D49A", "#E0B46E"));
        for (let i = 0; i < 5; i++) line(c, [-20, -12 + i * 6, 20, -12 + i * 6], 1.3, "#C9924E");
        for (let i = 0; i < 12; i++) dot(c, -18 + (i % 6) * 7, -9 + Math.floor(i / 6) * 14, 1.4, "#B57E3E");
        c.restore(); break;
      }
      case "apple": {
        // a fat wedge of apple: cream flesh, red peel along the curve
        c.save(); c.rotate(-.35);
        c.beginPath(); c.moveTo(-24, -4); c.quadraticCurveTo(0, 30, 24, -4); c.quadraticCurveTo(0, 4, -24, -4); fill(c, lin(c, 0, -4, 0, 20, "#FFF6DA", "#F3DFA6"));
        c.beginPath(); c.moveTo(-24, -4); c.quadraticCurveTo(0, 30, 24, -4); stroke(c, "#D8453D", 6);
        c.beginPath(); c.moveTo(-24, -4); c.quadraticCurveTo(0, 4, 24, -4); stroke(c, "#EBD08E", 2);
        dot(c, -5, 5, 2.2, "#6B4A2A"); dot(c, 5, 5, 2.2, "#6B4A2A");
        c.restore(); break;
      }
      case "cookie": {
        dot(c, 0, 0, 20, radF(c, -6, -6, 0, 0, 22, "#E9B96E", "#C98A3C"));
        for (const [a, b] of [[-8, -6], [6, -9], [9, 5], [-5, 8], [0, 0]]) dot(c, a, b, 3, "#4A2A1A");
        break;
      }
      case "toy": {
        ell(c, 0, 8, 20, 12, "#F9D03F"); dot(c, 12, -8, 11, "#F9D03F");
        c.beginPath(); c.moveTo(22, -8); c.lineTo(31, -5); c.lineTo(22, -2); fill(c, "#F28C28"); dot(c, 14, -11, 2.2, "#222");
        c.beginPath(); c.moveTo(-18, 2); c.quadraticCurveTo(-24, -6, -14, -4); fill(c, "#F9D03F");
        break;
      }
      case "sippy": {
        box(c, -13, -12, 26, 30, 8, lin(c, -13, 0, 13, 0, "#7FC1EE", "#B7DDF7", "#6AB0E0"));
        box(c, -12, -18, 24, 9, 4, "#F28DB2"); box(c, -4, -26, 8, 10, 3, "#F28DB2");
        box(c, -22, -4, 10, 6, 3, "#F28DB2"); box(c, 12, -4, 10, 6, 3, "#F28DB2");
        break;
      }
    }
    c.restore();
  }

  // ---------- UI-ish canvas bits ----------
  function speech(c, x, y, str, o = {}) {
    const size = o.size || 22, pad = 14;
    c.font = `${o.weight || 600} ${size}px ${FONT}`;
    const lines = String(str).split("\n");
    const w = Math.max(...lines.map(l => c.measureText(l).width)) + pad * 2, h = lines.length * size * 1.2 + pad * 1.3;
    const sc = o.scale ?? 1;
    c.save(); c.translate(x, y); c.scale(sc, sc);
    let bx = -w / 2; if (o.clampX != null) bx = Math.max(o.clampX[0] - x, Math.min(o.clampX[1] - x - w, bx));
    c.shadowColor = "rgba(60,30,10,.25)"; c.shadowBlur = 14; c.shadowOffsetY = 5;
    box(c, bx, -h - 12, w, h, 18, o.bg || "#FFFFFF");
    c.shadowColor = "transparent";
    c.beginPath(); c.moveTo(-9, -13); c.lineTo(9, -13); c.lineTo(o.tail ?? 0, 2); c.closePath(); fill(c, o.bg || "#FFFFFF");
    if (o.border) { rr(c, bx, -h - 12, w, h, 18); stroke(c, o.border, 2.5); }
    lines.forEach((l, i) => text(c, l, bx + w / 2, -h - 12 + pad * .65 + size * .6 + i * size * 1.2, size, o.col || "#3A2A24", o.weight || 600));
    c.restore();
  }
  return { FONT, rr, lin, rad, radF, box, ell, dot, line, curve, text, shadow,
    ariel, sarah, molly, ikey, michael, simon, cari, nana, max, food, speech };
})();
