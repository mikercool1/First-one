"use strict";
// Ariel Passover Cookout: every drawing routine. Canvas 2D on a 1920 x 1080 logical stage.
// Characters are drawn from a pose object each frame, so they can react smoothly.

const ART = (() => {
  const TAU = Math.PI * 2, W = 1920, H = 1080;
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
    cariBack: (c, r) => { c.beginPath(); c.moveTo(-r * 1.12, r * .9); c.bezierCurveTo(-r * 1.35, -r * 1.3, r * 1.35, -r * 1.3, r * 1.12, r * .9); c.quadraticCurveTo(0, r * 1.1, -r * 1.12, r * .9); fill(c, lin(c, 0, -r, 0, r, "#B45A36", "#7E3520")); },
    cariFront: (c, r) => {
      c.beginPath(); c.moveTo(-r * 1.1, r * .85); c.bezierCurveTo(-r * 1.2, -r * .9, -r * .2, -r * 1.35, r * .5, -r * 1.1);
      c.bezierCurveTo(r * 1.1, -r * .9, r * 1.2, -r * .1, r * 1.1, r * .85); c.quadraticCurveTo(r * .95, r * .1, r * .75, -r * .35);
      c.quadraticCurveTo(r * .1, -r * .5, -r * .5, -r * .55); c.quadraticCurveTo(-r * .85, -r * .1, -r * 1.1, r * .85);
      fill(c, lin(c, -r, -r, r, r, "#D0714A", "#9A4526"));
      // sunglasses pushed up on her head
      for (const sx of [-1, 1]) ell(c, sx * r * .33, -r * .92, r * .26, r * .17, "#2B2230");
      line(c, [-r * .1, -r * .95, r * .1, -r * .95], r * .06, "#C9A45C");
    },
    nana: (c, r) => {
      const col = "#EDEAF2", dk = "#C9C3D6";
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i * .12); dot(c, Math.cos(a) * r * .98, Math.sin(a) * r * .9 - r * .05, r * .28, i % 2 ? col : "#F6F4FA"); }
      dot(c, 0, -r * 1.12, r * .34, col); dot(c, 0, -r * 1.12, r * .2, dk);
      for (const sx of [-1, 1]) dot(c, sx * r * .98, r * .1, r * .22, col);
    },
    simon: (c, r) => {
      c.save(); c.globalAlpha = .95;
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * r * .88, -r * .1, r * .26, r * .5, sx * .2, 0, TAU); fill(c, "#A7ADB5"); }
      c.restore();
      c.beginPath(); c.moveTo(-r * .3, -r * .95); c.quadraticCurveTo(0, -r * 1.25, r * .35, -r * .95); c.quadraticCurveTo(0, -r * 1.05, -r * .3, -r * .95); fill(c, "#B8BEC6");
      // neat gray beard
      c.beginPath(); c.moveTo(-r * .8, r * .25); c.quadraticCurveTo(-r * .7, r * 1.15, 0, r * 1.18); c.quadraticCurveTo(r * .7, r * 1.15, r * .8, r * .25);
      c.quadraticCurveTo(r * .5, r * .75, 0, r * .72); c.quadraticCurveTo(-r * .5, r * .75, -r * .8, r * .25); fill(c, "#B9BEC5");
      c.beginPath(); c.moveTo(-r * .32, r * .44); c.quadraticCurveTo(0, r * .3, r * .32, r * .44); c.quadraticCurveTo(0, r * .52, -r * .32, r * .44); fill(c, "#A3A9B1");
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
  function seatedLegs(c, pants, shoe, spread = 13, lift = 0) {
    // shins first, then the lap (thighs pointing at us) with round knees on top
    for (const sd of [-1, 1]) {
      line(c, [sd * (spread + 1), -40, sd * (spread + 2), -8 - (sd > 0 ? lift : 0)], 17, pants);
      ell(c, sd * (spread + 2) + sd * 3, -5 - (sd > 0 ? lift : 0), 14, 7, shoe);
    }
    box(c, -31, -66, 62, 26, 12, pants);
    box(c, -31, -66, 62, 12, 8, "rgba(255,255,255,.16)");
    for (const sd of [-1, 1]) { dot(c, sd * (spread + 1), -42, 13, pants); dot(c, sd * (spread + 1) - 3, -46, 5, "rgba(255,255,255,.18)"); }
    line(c, [0, -64, 0, -44], 2, "rgba(0,0,0,.15)");
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

  // ---------- SARAH (standing, faces the mirror to the left) ----------
  function sarah(c, x, y, s, o) {
    const t = o.t, sk = SK.sarah, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (!o.reflection) shadow(c, 0, 2, 44, 10, .28);
    c.scale(-1, 1); // faces left
    let hop = 0; if (st === "outburst") hop = -Math.abs(Math.sin(t * 12)) * 10; if (st === "eating") hop = 0;
    c.translate(0, hop);
    const sway = Math.sin(t * 1.4) * 2;
    c.save(); c.translate(0, -192); HAIR.sarahBack(sway * .5)(c, 34); c.restore();
    // foot tapping when impatient
    const tap = (m >= 2 && st === "waiting") ? Math.max(0, Math.sin(t * 12)) * 6 : 0;
    ell(c, 10, -4 - tap, 12, 6, "#C8A04A"); ell(c, -10, -4, 12, 6, "#C8A04A");
    // gown
    c.beginPath(); c.moveTo(-18, -120); c.bezierCurveTo(-22, -80, -34 + sway, -30, -40 + sway, -6); c.quadraticCurveTo(0, 2, 40 + sway, -6); c.bezierCurveTo(34 + sway, -30, 22, -80, 18, -120); c.closePath();
    fill(c, lin(c, -40, 0, 40, 0, "#1F6B55", "#0F4A3A", "#2A806A"));
    c.save(); c.globalAlpha = .4; curve(c, 4, -115, 10 + sway, -60, 20 + sway, -8, 4, "#6FC2A6"); c.restore();
    c.beginPath(); c.moveTo(-24, -150); c.quadraticCurveTo(-26, -132, -18, -118); c.lineTo(18, -118); c.quadraticCurveTo(26, -132, 24, -150); c.quadraticCurveTo(0, -146, -24, -150);
    fill(c, lin(c, -24, 0, 24, 0, "#237A61", "#105040"));
    box(c, -7, -170, 14, 22, 6, sk.skin);
    c.beginPath(); c.moveTo(-24, -150); c.quadraticCurveTo(0, -142, 24, -150); c.lineTo(20, -156); c.quadraticCurveTo(0, -150, -20, -156); fill(c, sk.skin);
    // arms by mood
    let Lh = [-26, -96], Rh = [24, -176], Le = [-30, -124], Re = [40, -150]; // lipstick to lips
    if (m === 1 && st === "waiting") { Lh = [-18, -214]; Rh = [22, -216]; Le = [-40, -186]; Re = [42, -186]; }
    if (m === 2 && st === "waiting") { Lh = [12, -128]; Rh = [-12, -124]; Le = [-28, -122]; Re = [28, -124]; }
    if (m >= 3 && st === "waiting") { Lh = [-30, -114]; Le = [-46, -134]; Rh = [44 + Math.sin(t * 10) * 6, -176]; Re = [40, -140]; }
    if (o.event === "pose") { Lh = [-30, -116]; Le = [-46, -134]; Rh = [8, -228]; Re = [34, -196]; }
    if (st === "outburst") { Lh = [-40, -214 + Math.sin(t * 14) * 8]; Rh = [40, -214 - Math.sin(t * 14) * 8]; Le = [-42, -176]; Re = [42, -176]; }
    if (st === "eating") { Lh = [20, -116]; Le = [-6, -110]; Rh = [16, -170 + Math.sin(t * 6) * 10]; Re = [36, -140]; }
    arm(c, [-22, -146], Le, Lh, 9.5, null, sk);
    arm(c, [22, -146], Re, Rh, 9.5, null, sk);
    // feather boa
    c.save(); for (let i = 0; i < 12; i++) { const k = i / 11; const bx = -26 + k * 52, by = -150 + Math.sin(k * Math.PI) * 12; dot(c, bx, by, 8, i % 2 ? "#F7A8C8" : "#F28DB2"); } c.restore();
    handDot(c, Lh, 6.5, sk); handDot(c, Rh, 6.5, sk);
    if (st !== "eating" && !(m === 2 && st === "waiting")) { box(c, Rh[0] - 3, Rh[1] - 16, 6, 14, 2, "#C9A45C"); box(c, Rh[0] - 2.5, Rh[1] - 22, 5, 7, 2, "#C8243E"); }
    let expr = ["calm", "meh", "annoyed", "angry"][m];
    if (o.event === "pose") expr = "proud";
    if (st === "outburst") expr = "outburst"; else if (st === "eating" || st === "happy") expr = "eat";
    else if (st === "wrong") expr = "gasp"; else if (st === "idle" && !o.event) expr = "calm";
    const glance = st === "waiting" && Math.sin(t * .7 + 1) > .7;
    head(c, 0, -192, 34, { ...sk, expr, t, blink: o.blink, lashes: true, lip: "#C8243E", earrings: "#F1DA9E", look: glance ? [-1, 0] : [1.2, 0], anger: m >= 3 ? .5 : 0, hairFront: HAIR.sarahFront, tilt: o.event === "pose" ? -.15 : 0 });
    if (st === "eating") { c.save(); c.translate(20, -120); food(c, o.plate || "cake", 0, 0, 50, t); c.restore(); }
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
    if (st === "outburst") expr = "outburst"; else if (st === "eating") expr = "eat"; else if (o.event === "cheer") expr = "happy"; else if (st === "wrong") expr = "gasp";
    const lookTV = st !== "eating" && st !== "outburst" && st !== "wrong";
    head(c, 0, -162, 33, { ...sk, expr, t, blink: o.blink, look: lookTV ? [1.6, -.2] : [0, 0], stubble: true, anger: m >= 3 && st === "waiting" ? .6 : 0, hairFront: HAIR.ikey, tilt: lookTV ? .06 : 0 });
    c.restore();
  }

  // ---------- MICHAEL (couch, on the phone) ----------
  function michael(c, x, y, s, o) {
    const t = o.t, sk = SK.michael, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (st === "outburst") c.translate(0, -Math.abs(Math.sin(t * 11)) * 7);
    seatedLegs(c, "#B79E7A", "#5A3D2A");
    torso(c, "#6D98D6", "#4A74B4", 28, 25);
    line(c, [0, -126, 0, -62], 1.5, "rgba(255,255,255,.6)");
    for (let i = 0; i < 4; i++) dot(c, 3, -116 + i * 14, 1.8, "#FFFFFF");
    c.beginPath(); c.moveTo(-10, -128); c.lineTo(0, -118); c.lineTo(10, -128); stroke(c, "#FFFFFF", 3);
    const swap = o.event === "switch" ? (o.eventT < .7 ? 1 : 0) : 0;
    // phone hand
    let Ph = swap ? [30, -168] : [-30, -168], Pe = swap ? [42, -130] : [-42, -130];
    let Oh = swap ? [-30, -66] : [28, -66], Oe = swap ? [-40, -92] : [38, -92];
    if (st === "waiting" && m >= 1) { Oh = swap ? [-50, -104] : [50, -104]; Oe = swap ? [-44, -92] : [44, -92]; }
    if ((st === "waiting" && m >= 3) || st === "outburst") { const f = Math.sin(t * 9) * 10; Oh = [48, -178 + f]; Oe = [48, -140]; }
    if (st === "eating") { Oh = [14, -156 + Math.sin(t * 7) * 12]; Oe = [36, -118]; }
    arm(c, [swap ? 26 : -26, -124], Pe, Ph, 11, "#6D98D6", sk, .9);
    arm(c, [swap ? -26 : 26, -124], Oe, Oh, 11, "#6D98D6", sk, .9);
    let expr = ["calm", "meh", "annoyed", "angry"][m];
    if (m >= 2 && st === "waiting" && Math.sin(t * 1.2) > .3) expr = "rolleyes";
    if (st === "outburst") expr = "outburst"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    const glance = st === "waiting" && Math.sin(t * .9) > .5;
    head(c, 0, -162, 33, { ...sk, expr, t, blink: o.blink, look: glance ? [-1.6, -.6] : [.5, .6], anger: m >= 3 && st === "waiting" ? .55 : 0, hairFront: HAIR.michael });
    box(c, Ph[0] - 7, Ph[1] - 20, 14, 26, 4, "#1D1F26"); box(c, Ph[0] - 5, Ph[1] - 17, 10, 19, 2, "#3B6FB8");
    handDot(c, Ph, 7, sk); handDot(c, Oh, 7, sk);
    if (st === "waiting" && m >= 1 && m < 3) { c.save(); c.globalAlpha = .9; line(c, [Oh[0] - 6, Oh[1] - 4, Oh[0] + 8, Oh[1] - 6], 4, sk.skinDk); c.restore(); }
    if (st === "eating") { c.save(); c.translate(0, -76); food(c, o.plate || "frittata", 0, 0, 52, t); c.restore(); }
    c.restore();
  }

  // ---------- SIMON (ham radio) ----------
  function simon(c, x, y, s, o) {
    const t = o.t, sk = SK.simon, m = o.mood || 0, st = o.state;
    c.save(); c.translate(x, y); c.scale(s, s);
    // swivel chair
    box(c, -36, -150, 72, 96, 22, lin(c, 0, -150, 0, -50, "#3A3A44", "#24242C"));
    line(c, [0, -50, 0, -10], 6, "#777C86"); line(c, [-24, -6, 24, -6], 5, "#777C86"); dot(c, -24, -4, 4, "#333"); dot(c, 24, -4, 4, "#333");
    if (st === "outburst") c.translate(Math.sin(t * 30) * 3, 0);
    seatedLegs(c, "#5E5A52", "#3E2C22");
    torso(c, "#8C7A5E", "#6C5C44", 28, 26);
    c.beginPath(); c.moveTo(-8, -128); c.lineTo(0, -100); c.lineTo(8, -128); c.closePath(); fill(c, "#9FB6D6");
    for (let i = 0; i < 4; i++) dot(c, -3, -96 + i * 10, 2, "#D9C9A0");
    const fiddle = (st === "waiting" && m >= 2) || st === "outburst" ? Math.sin(t * 26) * 5 : Math.sin(t * 2) * 2;
    let Lh = [-62 + fiddle, -104], Le = [-46, -96];            // on the radio dial
    let Rh = [14, -150], Re = [38, -120];                       // mic near mouth
    if (st === "outburst") { Rh = [34, -204 + Math.sin(t * 12) * 8]; Re = [40, -164]; }
    if (st === "eating") { Rh = [14, -158 + Math.sin(t * 7) * 12]; Re = [36, -120]; Lh = [-16, -84]; Le = [-36, -94]; }
    arm(c, [-26, -124], Le, Lh, 11, "#8C7A5E", sk, .9);
    arm(c, [26, -124], Re, Rh, 11, "#8C7A5E", sk, .9);
    if (st !== "eating") { box(c, Rh[0] - 7, Rh[1] - 22, 14, 22, 6, "#2A2A30"); for (let i = 0; i < 3; i++) line(c, [Rh[0] - 5, Rh[1] - 18 + i * 5, Rh[0] + 5, Rh[1] - 18 + i * 5], 1, "#666"); }
    handDot(c, Lh, 7, sk); handDot(c, Rh, 7, sk);
    let expr = ["calm", "meh", "annoyed", "angry"][m];
    if (st === "outburst") expr = "outburst"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
    if (o.event === "tangle") expr = "worried";
    head(c, 0, -162, 32, { ...sk, expr, t, blink: o.blink, glasses: "#6B5A3A", look: [-.8, .3], anger: m >= 3 && st === "waiting" ? .5 : 0, hairFront: HAIR.simon, browCol: "#8E949C" });
    // headphones
    c.save(); c.translate(0, -162);
    c.beginPath(); c.arc(0, -4, 38, Math.PI * 1.08, Math.PI * 1.92); stroke(c, "#2B2B33", 6);
    box(c, -44, -18, 14, 30, 7, "#B8323A"); box(c, 30, -18, 14, 30, 7, "#B8323A");
    c.restore();
    if (o.event === "tangle") {
      c.save(); c.globalAlpha = .95;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, -110 + i * 18, 38, 9, Math.sin(t * 3 + i) * .2, 0, TAU); stroke(c, "#222", 2.5); }
      c.restore();
    }
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
    if (st === "outburst") expr = "outburst"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp";
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
    // Nana: skirt and slippers
    for (const sd of [-1, 1]) { line(c, [sd * 13, -40, sd * 13, -8], 14, sk.skin); ell(c, sd * 14, -5, 15, 8, "#E7B8C8"); dot(c, sd * 14 + sd * 4, -10, 4, "#FFFFFF"); }
    box(c, -34, -66, 68, 36, 12, lin(c, 0, -66, 0, -30, "#7A6E8C", "#5E5470"));
    torso(c, "#B39DD6", "#9179BD", 27, 27, -126, -58);
    c.beginPath(); c.moveTo(-10, -128); c.lineTo(0, -114); c.lineTo(10, -128); c.closePath(); fill(c, "#FFFFFF");
    c.beginPath(); c.moveTo(-14, -126); c.quadraticCurveTo(0, -108, 14, -126); c.setLineDash([.1, 5.5]); stroke(c, "#FFFFFF", 4.5); c.setLineDash([]);
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
    arm(c, [-24, -122], Le, Lh, 11, "#B39DD6", sk, .9);
    arm(c, [24, -122], Re, Rh, 11, "#B39DD6", sk, .9);
    handDot(c, Lh, 7, sk); handDot(c, Rh, 7, sk);
    // yarn ball (rolls away during the yarn event)
    const yx = o.event === "yarn" ? 56 + Math.sin(Math.min(1, o.eventT / 1.2) * Math.PI) * 80 : 56;
    if (knitting) curve(c, 0, -80, 30, -20, yx, -14, 1.5, "#6FA5D8");
    dot(c, yx, -14, 13, radF(c, yx - 4, -18, yx, -14, 14, "#9CC5EA", "#5A8FC4"));
    c.save(); c.globalAlpha = .5; curve(c, yx - 9, -18, yx, -8, yx + 9, -20, 1.5, "#FFFFFF"); c.restore();
    let expr = ["calm", "meh", "stern", "stern"][m];
    if (st === "outburst") expr = "outburst"; else if (st === "eating") expr = "eat"; else if (st === "wrong") expr = "gasp"; else if (o.event === "yarn") expr = "gasp";
    head(c, 0, -160, 33, { ...sk, expr, t, blink: o.blink, lashes: true, lip: "#B8667E", glasses: "#9C7634", glint: m >= 2 && st === "waiting" ? (.6 + .4 * Math.sin(t * 5)) : 0, look: m >= 2 && st === "waiting" ? [-1.2, -.3] : [0, 1], anger: m >= 3 && st === "waiting" ? .35 : 0, hairFront: HAIR.nana, browCol: "#A9A2B8" });
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

  // ---------- background (static, drawn once) ----------
  function background(c) {
    c.fillStyle = lin(c, 0, 0, 0, H, "#3B2946", "#2A1D33"); c.fillRect(0, 0, W, H);
    // roof band with string lights
    c.fillStyle = lin(c, 0, 0, 0, 104, "#4A3456", "#33233D"); c.fillRect(0, 0, W, 104);
    c.fillStyle = GOLD(c, 0, W); c.fillRect(0, 94, W, 5);
    c.fillStyle = lin(c, 0, 1004, 0, H, "#77533B", "#4E3525"); c.fillRect(0, 1004, W, 76);
    c.fillStyle = GOLD(c, 0, W); c.fillRect(0, 1004, W, 5);

    c.save(); rr(c, 22, 100, 1876, 906, 28); c.clip();
    // walls
    c.fillStyle = lin(c, 0, 100, 0, 610, "#FCF6EC", "#EFE3D1"); c.fillRect(20, 100, 1050, 510);
    c.fillStyle = lin(c, 0, 100, 0, 610, "#F6E8E1", "#E8D3CA"); c.fillRect(1070, 100, 840, 510);
    // subtle damask dots on living wall
    c.save(); c.globalAlpha = .12; for (let yy = 150; yy < 420; yy += 42) for (let xx = 1090 + ((yy / 42) % 2) * 21; xx < 1900; xx += 42) { c.beginPath(); c.ellipse(xx, yy, 5, 8, 0, 0, TAU); fill(c, "#B98C7E"); } c.restore();
    // wainscoting
    c.fillStyle = lin(c, 0, 420, 0, 610, "#F3E6DF", "#E5D2C9"); c.fillRect(1070, 420, 840, 190);
    box(c, 1070, 414, 830, 9, 3, "#FFF8F3");
    for (let xx = 1085; xx < 1880; xx += 118) { rr(c, xx, 440, 100, 140, 8); stroke(c, "rgba(170,130,115,.35)", 2.5); }
    // crown moulding
    c.fillStyle = lin(c, 0, 100, 0, 132, "#FFFFFF", "#EADFCF"); c.fillRect(20, 100, 1880, 32);
    c.fillStyle = "rgba(160,130,95,.3)"; c.fillRect(20, 131, 1880, 2);
    // floor
    const R = rng(7);
    for (let yy = 604, row = 0; yy < 1010; row++) {
      const h = 16 + (yy - 600) * .07;
      c.fillStyle = row % 2 ? "#D4A97C" : "#CFA274"; c.fillRect(20, yy, 1880, h);
      let xx = 20 - R() * 180;
      while (xx < 1900) { const w = 150 + R() * 160; c.fillStyle = `rgba(${R() > .5 ? "255,240,220" : "120,80,50"},${.04 + R() * .06})`; c.fillRect(xx, yy, w, h); c.fillStyle = "rgba(110,70,40,.25)"; c.fillRect(xx, yy, 1.5, h); xx += w; }
      c.fillStyle = "rgba(110,70,40,.22)"; c.fillRect(20, yy + h - 1, 1880, 1.2);
      yy += h;
    }
    c.fillStyle = lin(c, 0, 600, 0, 1010, "rgba(255,240,215,.2)", "rgba(80,45,20,.14)"); c.fillRect(20, 600, 1880, 410);
    c.fillStyle = "rgba(90,60,40,.3)"; c.fillRect(20, 600, 1880, 6);
    // living rug
    c.save(); c.translate(1500, 820); c.scale(1, .28);
    dot(c, 0, 0, 420, "#2E4A6E"); dot(c, 0, 0, 404, "#F4EBDD"); c.beginPath(); c.arc(0, 0, 360, 0, TAU); stroke(c, "#C9A45C", 10);
    c.beginPath(); c.arc(0, 0, 300, 0, TAU); c.setLineDash([22, 18]); stroke(c, "#8BA7C7", 8); c.setLineDash([]);
    dot(c, 0, 0, 180, "#EFE2D0"); c.restore();
    // hallway runner by the mirror
    c.beginPath(); c.moveTo(1085, 612); c.lineTo(1175, 612); c.lineTo(1190, 700); c.lineTo(1070, 700); c.closePath(); fill(c, "#9C3D4A");
    c.beginPath(); c.moveTo(1092, 618); c.lineTo(1168, 618); c.lineTo(1180, 694); c.lineTo(1080, 694); c.closePath(); stroke(c, "#E9C98A", 3);
    // Max's play mat
    c.save(); c.translate(170, 918); c.scale(1, .32); dot(c, 0, 0, 130, "#A8D8C8"); c.beginPath(); c.arc(0, 0, 112, 0, TAU); c.setLineDash([14, 12]); stroke(c, "#FFFFFF", 7); c.setLineDash([]); c.restore();
    box(c, 250, 880, 26, 26, 5, "#F07C4A"); text(c, "A", 263, 893, 16, "#FFFFFF", 700);
    box(c, 90, 890, 24, 24, 5, "#6FA5D8"); text(c, "B", 102, 902, 15, "#FFFFFF", 700);

    // ----- KITCHEN -----
    // backsplash tiles
    c.fillStyle = "#FBF8F2"; c.fillRect(20, 300, 1000, 165);
    c.save(); c.globalAlpha = .5; c.strokeStyle = "#E6DCCB"; c.lineWidth = 1.2;
    for (let yy = 300; yy < 465; yy += 18) { c.beginPath(); c.moveTo(20, yy); c.lineTo(1020, yy); c.stroke(); for (let xx = 20 + ((yy / 18) % 2) * 20; xx < 1020; xx += 40) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 18); c.stroke(); } }
    c.restore();
    // window over prep (Passover full moon)
    c.save(); rr(c, 326, 158, 124, 148, 60); c.clip();
    c.fillStyle = lin(c, 0, 158, 0, 306, "#28305C", "#7D6696", "#E8A98C"); c.fillRect(326, 158, 124, 148);
    dot(c, 410, 196, 16, "#FFF6DA"); dot(c, 410, 196, 26, "rgba(255,246,218,.15)");
    for (const [sx, sy] of [[350, 180], [372, 206], [440, 232], [356, 240]]) dot(c, sx, sy, 1.6, "#FFFFFF");
    c.fillStyle = "#3A2E4E"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(330 + i * 26, 312, 22, Math.PI, 0); c.fill(); }
    c.restore();
    rr(c, 326, 158, 124, 148, 60); stroke(c, "#FFFFFF", 8);
    line(c, [388, 160, 388, 304], 4, "#FFFFFF"); line(c, [328, 240, 448, 240], 4, "#FFFFFF");
    box(c, 318, 302, 140, 10, 4, "#F4EEE4");
    box(c, 334, 280, 22, 22, 6, "#C9A45C"); for (let i = 0; i < 5; i++) ell(c, 340 + i * 3, 276 - (i % 2) * 4, 3, 6, "#6FA86A", i * .4 - .8);

    // upper cabinets (sage with brass)
    const sage = (x, y, w, h) => {
      box(c, x, y, w, h, 6, lin(c, x, 0, x + w, 0, "#A5BAAC", "#B7CABD", "#98AE9F"));
      rr(c, x + 7, y + 7, w - 14, h - 14, 5); stroke(c, "rgba(70,95,80,.35)", 2);
    };
    sage(36, 118, 144, 42); sage(190, 118, 120, 42); sage(770, 118, 110, 40);
    // glass-front cabinet over mixer with plates and wine glasses
    box(c, 890, 130, 128, 170, 8, lin(c, 890, 0, 1018, 0, "#A5BAAC", "#98AE9F"));
    box(c, 900, 140, 108, 150, 6, lin(c, 0, 140, 0, 290, "#EFF3F1", "#DCE5E0"));
    box(c, 900, 212, 108, 4, 1, "#BFCCC4");
    for (let i = 0; i < 4; i++) { ell(c, 916 + i * 26, 196, 11, 13, "#FFFFFF"); c.beginPath(); c.ellipse(916 + i * 26, 196, 11, 13, 0, 0, TAU); stroke(c, "#D6B56A", 1.5); }
    for (let i = 0; i < 4; i++) { const gx = 916 + i * 26; c.beginPath(); c.moveTo(gx - 7, 240); c.quadraticCurveTo(gx, 262, gx + 7, 240); c.closePath(); fill(c, "rgba(255,255,255,.8)"); line(c, [gx, 258, gx, 278], 2, "rgba(255,255,255,.9)"); line(c, [gx - 6, 280, gx + 6, 280], 2, "rgba(255,255,255,.9)"); }
    line(c, [954, 140, 954, 290], 3, "#98AE9F");
    // flowers vase on top of cabinet
    box(c, 930, 96, 26, 34, 8, lin(c, 930, 0, 956, 0, "#E8F0F4", "#FFFFFF", "#C8D6DE"));
    // hood
    // plaster range hood: chimney + canopy, brass strap
    box(c, 556, 128, 108, 110, 4, lin(c, 556, 0, 664, 0, "#E4D7C3", "#FBF6EE", "#E0D2BC"));
    c.beginPath(); c.moveTo(548, 232); c.lineTo(672, 232); c.quadraticCurveTo(748, 256, 756, 300); c.lineTo(464, 300); c.quadraticCurveTo(472, 256, 548, 232); c.closePath();
    fill(c, lin(c, 464, 0, 756, 0, "#E2D4BF", "#FFFBF4", "#F4ECE0", "#DCCDB6"));
    c.beginPath(); c.moveTo(548, 232); c.lineTo(672, 232); c.quadraticCurveTo(748, 256, 756, 300); c.lineTo(464, 300); c.quadraticCurveTo(472, 256, 548, 232); c.closePath(); stroke(c, "rgba(150,120,80,.35)", 2);
    box(c, 458, 294, 304, 20, 7, GOLD(c, 458, 762));
    box(c, 470, 312, 280, 6, 3, "rgba(60,40,20,.25)");
    c.save(); c.globalAlpha = .6; dot(c, 610, 318, 110, rad(c, 610, 318, 110, "rgba(255,230,170,.9)", "rgba(255,230,170,0)")); c.restore();
    // marble slab behind the range
    c.fillStyle = lin(c, 460, 310, 760, 462, "#FFFFFF", "#F1EEEA"); c.fillRect(466, 312, 288, 150);
    c.save(); c.globalAlpha = .25; for (let i = 0; i < 5; i++) curve(c, 470 + i * 60, 320, 500 + i * 60, 400, 480 + i * 60, 460, 1.5, "#A9A2B0"); c.restore();

    // counters: base cabinets + marble tops
    const base = (x, w) => {
      box(c, x, 482, w, 124, 4, lin(c, x, 0, x + w, 0, "#A5BAAC", "#B4C7BA", "#98AE9F"));
      const n = Math.max(1, Math.round(w / 64)); const dw = w / n;
      for (let i = 0; i < n; i++) { rr(c, x + i * dw + 6, 492, dw - 12, 104, 5); stroke(c, "rgba(70,95,80,.35)", 2); line(c, [x + i * dw + dw / 2 - 10, 510, x + i * dw + dw / 2 + 10, 510], 3.5, "#C9A45C"); }
      c.fillStyle = "#6E8374"; c.fillRect(x + 4, 600, w - 8, 8);
    };
    const top = (x, w) => { box(c, x - 4, 456, w + 8, 28, 5, lin(c, 0, 456, 0, 484, "#FFFFFF", "#ECE8E2")); c.save(); c.globalAlpha = .22; curve(c, x + 10, 462, x + w / 2, 478, x + w - 10, 466, 1.4, "#9E97A6"); c.restore(); };
    base(320, 136); top(320, 136);
    base(890, 128); top(890, 128);
    // cutting board, apple bowl, breadcrumb plate on the prep counter
    c.save(); c.translate(372, 452); box(c, -38, -7, 76, 10, 5, lin(c, 0, -7, 0, 3, "#D9A86E", "#B9844A")); dot(c, 34, -3, 3, "#8A5A30"); c.restore();
    c.save(); c.translate(430, 446);
    c.beginPath(); c.moveTo(-20, -6); c.quadraticCurveTo(0, 14, 20, -6); c.closePath(); fill(c, "#FFFFFF");
    for (const [ax, ay] of [[-9, -9], [6, -10], [-1, -16]]) dot(c, ax, ay, 7, radF(c, ax - 2, ay - 3, ax, ay, 8, "#FF8A73", "#C8352E"));
    c.restore();
    // stand mixer
    c.save(); c.translate(952, 454);
    box(c, -34, -4, 68, 10, 5, "#8FCBBB");
    box(c, -30, -92, 20, 92, 10, lin(c, -30, 0, -10, 0, "#A7DDCF", "#7FC0AE"));
    box(c, -34, -104, 70, 30, 15, lin(c, 0, -104, 0, -74, "#B6E6D9", "#86C6B4"));
    c.beginPath(); c.moveTo(-2, -30); c.quadraticCurveTo(2, 2, 26, 0); c.quadraticCurveTo(46, 0, 46, -32); c.closePath(); fill(c, lin(c, 0, 0, 46, 0, "#C6CDD4", "#F3F5F7", "#AEB6BF"));
    dot(c, 24, -74, 5, "#C9A45C");
    c.restore();
    // fridge
    box(c, 36, 160, 144, 448, 12, lin(c, 36, 0, 180, 0, "#CBD1D8", "#F4F6F8", "#D5DBE1", "#BCC3CB"), "#A8B0B9", 2);
    line(c, [108, 166, 108, 432], 2.5, "#9AA2AB"); line(c, [40, 436, 176, 436], 2.5, "#9AA2AB");
    box(c, 96, 212, 7, 180, 3.5, lin(c, 96, 0, 103, 0, "#E9EDF1", "#9AA2AB")); box(c, 113, 212, 7, 180, 3.5, lin(c, 113, 0, 120, 0, "#E9EDF1", "#9AA2AB"));
    box(c, 70, 470, 76, 7, 3.5, lin(c, 0, 470, 0, 477, "#E9EDF1", "#9AA2AB"));
    box(c, 52, 250, 34, 50, 6, "#4B525B"); box(c, 60, 258, 18, 8, 3, "#7DD3F5");
    c.save(); c.translate(146, 262); c.rotate(.08); box(c, -22, -26, 44, 54, 2, "#FFFFFF");
    dot(c, -8, -10, 7, "#F9C74F"); line(c, [4, 4, 4, 20], 2, "#E35C83"); dot(c, 4, 0, 5, "#E35C83"); line(c, [12, 6, 12, 20], 2, "#5A86C8"); dot(c, 12, 3, 4, "#5A86C8");
    line(c, [-18, 22, 18, 22], 2, "#6FA86A"); dot(c, 0, -26, 4, "#D8453D"); c.restore();
    for (const [mx, my, mc] of [[62, 360, "#F07C4A"], [140, 350, "#6FA5D8"], [150, 400, "#F9C74F"]]) dot(c, mx, my, 6, mc);
    // pantry
    box(c, 190, 160, 120, 448, 8, lin(c, 190, 0, 310, 0, "#8B5D3D", "#A06E4A", "#7A4F32"));
    for (const dx of [196, 252]) {
      box(c, dx, 172, 52, 250, 6, "#EDE3D2"); box(c, dx + 4, 176, 44, 242, 4, "rgba(255,255,255,.4)");
      for (const sy of [232, 300, 372]) { box(c, dx + 2, sy, 48, 4, 1, "#9C7250"); }
      box(c, dx + 6, 208, 16, 24, 2, "#1E4C8C"); text(c, "M", dx + 14, 220, 10, "#F1DA9E", 700); box(c, dx + 25, 212, 20, 20, 2, "#D8A04A");
      for (let i = 0; i < 3; i++) box(c, dx + 6 + i * 14, 276, 11, 24, 4, ["#F3E6C8", "#C95A3D", "#EBCB91"][i]);
      for (let i = 0; i < 2; i++) dot(c, dx + 14 + i * 20, 358, 10, ["#E3C08A", "#B8D6A0"][i]);
      box(c, dx, 432, 52, 164, 6, lin(c, dx, 0, dx + 52, 0, "#946341", "#7E5234")); rr(c, dx + 6, 440, 40, 148, 4); stroke(c, "rgba(40,20,10,.25)", 2);
    }
    dot(c, 244, 430, 4, "#E6C77F"); dot(c, 258, 430, 4, "#E6C77F");
    // range
    box(c, 460, 470, 300, 138, 6, lin(c, 460, 0, 760, 0, "#C3CAD2", "#F1F3F6", "#BAC2CB"), "#A0A8B1", 2);
    box(c, 456, 456, 308, 18, 6, lin(c, 0, 456, 0, 474, "#2F2D33", "#1A191D"));
    for (const [bx, rx] of [[520, 40], [620, 34], [706, 32]]) { c.beginPath(); c.ellipse(bx, 462, rx, 6, 0, 0, TAU); stroke(c, "#4A4850", 3); }
    for (let i = 0; i < 6; i++) { dot(c, 486 + i * 50, 488, 8, lin(c, 0, 480, 0, 496, "#FFFFFF", "#AEB6BF")); line(c, [486 + i * 50, 482, 486 + i * 50, 488], 2, "#666"); }
    box(c, 478, 506, 264, 86, 8, lin(c, 0, 506, 0, 592, "#2E2C33", "#454350")); box(c, 488, 514, 244, 8, 4, lin(c, 0, 0, 1, 0, "#E9EDF1", "#9AA2AB"));
    // wall ovens
    box(c, 770, 158, 110, 450, 6, lin(c, 770, 0, 880, 0, "#A5BAAC", "#B4C7BA", "#98AE9F"));
    for (const oy of [196, 404]) {
      box(c, 778, oy, 94, 184, 8, lin(c, 778, 0, 872, 0, "#C3CAD2", "#F1F3F6", "#BAC2CB"), "#9AA2AB", 1.5);
      box(c, 784, oy + 8, 82, 16, 4, "#2F2D33"); dot(c, 800, oy + 16, 3, "#7DD3F5"); text(c, "350°", 840, oy + 16, 10, "#7DD3F5", 600);
      box(c, 786, oy + 36, 78, 8, 4, lin(c, 0, 0, 1, 0, "#E9EDF1", "#9AA2AB"));
    }
    // island pendants
    for (const px of [420, 510, 600]) {
      line(c, [px, 132, px, 214], 2, "#9C7634");
      c.beginPath(); c.moveTo(px - 26, 238); c.quadraticCurveTo(px - 24, 212, px, 210); c.quadraticCurveTo(px + 24, 212, px + 26, 238); c.closePath(); fill(c, GOLD(c, px - 26, px + 26));
      ell(c, px, 238, 26, 5, "#FFF3D1");
    }
    // column between kitchen and living, with a mezuzah
    box(c, 1020, 100, 52, 510, 4, lin(c, 1020, 0, 1072, 0, "#EFE3D1", "#FFFBF4", "#E6D8C4"));
    box(c, 1016, 590, 60, 20, 3, "#E0D2BD");
    c.save(); c.translate(1062, 330); c.rotate(.35); box(c, -5, -20, 10, 40, 4, GOLD(c, -5, 5)); text(c, "ש", 0, 0, 10, "#6B4A2A", 700); c.restore();
    // sconce
    box(c, 1040, 250, 12, 22, 4, "#C9A45C"); ell(c, 1046, 244, 14, 10, "#FFF3D1");

    // ----- LIVING -----
    // Passover banner
    const words = "CHAG PESACH SAMEACH";
    c.beginPath(); c.moveTo(1100, 150); c.quadraticCurveTo(1480, 196, 1860, 150); stroke(c, "#C9A45C", 2);
    const fl = words.replace(/ /g, "").length; let li = 0;
    for (let i = 0; i < words.length; i++) {
      if (words[i] === " ") continue;
      const tt = (li + .5) / fl, bx = 1100 + tt * 760, by = 150 + Math.sin(tt * Math.PI) * 30 * .78 + 4;
      c.beginPath(); c.moveTo(bx - 20, by); c.lineTo(bx + 20, by); c.lineTo(bx, by + 44); c.closePath(); fill(c, ["#2E4A6E", "#C9A45C", "#9C3D4A", "#7FA88B"][li % 4]);
      text(c, words[i], bx, by + 14, 16, "#FFFFFF", 700); li++;
    }
    // mirror (Sarah's)
    c.save(); c.beginPath(); c.moveTo(1092, 592); c.lineTo(1092, 290); c.quadraticCurveTo(1092, 246, 1130, 246); c.quadraticCurveTo(1168, 246, 1168, 290); c.lineTo(1168, 592); c.closePath();
    fill(c, GOLD(c, 1092, 1168)); c.restore();
    c.beginPath(); c.moveTo(1100, 584); c.lineTo(1100, 292); c.quadraticCurveTo(1100, 256, 1130, 256); c.quadraticCurveTo(1160, 256, 1160, 292); c.lineTo(1160, 584); c.closePath();
    fill(c, lin(c, 1100, 256, 1160, 584, "#DCE7EE", "#B7C8D4", "#E8F0F4"));
    // ham radio desk + QSL cards + antenna cable
    for (const [qx, qy, qc] of [[1270, 300, "#F9C74F"], [1306, 290, "#6FA5D8"], [1286, 342, "#F07C4A"], [1324, 336, "#7FA88B"]]) { box(c, qx, qy, 30, 20, 2, qc); line(c, [qx + 5, qy + 7, qx + 22, qy + 7], 2, "rgba(255,255,255,.8)"); }
    c.beginPath(); c.moveTo(1300, 424); c.bezierCurveTo(1296, 360, 1250, 250, 1270, 132); stroke(c, "#333", 2.5);
    box(c, 1250, 498, 104, 12, 3, lin(c, 0, 498, 0, 510, "#8B5D3D", "#6E4428"));
    line(c, [1258, 510, 1258, 606], 6, "#6E4428"); line(c, [1346, 510, 1346, 606], 6, "#6E4428");
    // couch
    c.save(); c.translate(1620, 0);
    box(c, -158, 466, 316, 110, 30, lin(c, 0, 466, 0, 576, "#3F7D6F", "#2A5A4F"));
    for (const sx of [-1, 1]) box(c, sx * 72 - 66, 476, 132, 86, 24, lin(c, 0, 476, 0, 560, "#4B8E7F", "#336B5F"));
    box(c, -150, 556, 300, 42, 16, lin(c, 0, 556, 0, 598, "#4B8E7F", "#2E6255"));
    box(c, -148, 592, 296, 30, 10, "#2A5A4F");
    for (const sx of [-1, 1]) { box(c, sx * 152 - 22, 506, 44, 116, 20, lin(c, 0, 506, 0, 622, "#4B8E7F", "#2A5A4F")); ell(c, sx * 152, 510, 22, 12, "#56998A"); }
    line(c, [-132, 622, -134, 634], 6, "#8B6A3A"); line(c, [132, 622, 134, 634], 6, "#8B6A3A");
    c.save(); c.translate(-118, 520); c.rotate(-.2); box(c, -22, -22, 44, 44, 12, "#E6C27A"); c.restore();
    c.save(); c.translate(118, 520); c.rotate(.2); box(c, -22, -22, 44, 44, 12, "#E8B9B0"); c.restore();
    c.restore();
    // painting above couch
    box(c, 1528, 214, 184, 150, 6, GOLD(c, 1528, 1712));
    c.save(); rr(c, 1538, 224, 164, 130, 3); c.clip(); c.fillStyle = "#F5EEE4"; c.fillRect(1538, 224, 164, 130);
    dot(c, 1590, 280, 40, "#E8B9B0"); dot(c, 1650, 300, 50, "#A9C4B4"); dot(c, 1620, 250, 26, "#E6C27A"); c.restore();
    // TV console + angled TV
    box(c, 1788, 540, 104, 68, 8, lin(c, 1788, 0, 1892, 0, "#8B5D3D", "#6E4428")); line(c, [1796, 608, 1796, 620], 5, "#5A3A24"); line(c, [1884, 608, 1884, 620], 5, "#5A3A24");
    line(c, [1840, 520, 1840, 540], 8, "#2A2A30");
    c.beginPath(); c.moveTo(1792, 400); c.lineTo(1892, 386); c.lineTo(1892, 526); c.lineTo(1792, 512); c.closePath(); fill(c, "#1B1B20");
    // side lamp
    line(c, [1810, 540, 1810, 470], 3, "#C9A45C");

    // light pools + vignette
    c.save(); c.globalCompositeOperation = "lighter";
    for (const [lx, ly, lr, a] of [[510, 260, 380, .16], [1046, 250, 160, .18], [610, 320, 180, .1], [1620, 300, 360, .08], [1130, 380, 200, .08]]) dot(c, lx, ly, lr, rad(c, lx, ly, lr, `rgba(255,214,150,${a})`, "rgba(255,214,150,0)"));
    c.restore();
    c.fillStyle = rad(c, 960, 560, 1150, "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(40,20,30,.28)"); c.fillRect(20, 100, 1880, 910);
    c.restore();
    // dollhouse frame
    rr(c, 22, 100, 1876, 906, 28); stroke(c, "#F7EEDD", 10);
    rr(c, 14, 92, 1892, 922, 34); stroke(c, "rgba(201,164,92,.8)", 3);
    // string lights across the roof
    c.beginPath(); c.moveTo(40, 24); for (let i = 0; i < 12; i++) c.quadraticCurveTo(40 + i * 160 + 80, 60, 40 + (i + 1) * 160, 24); stroke(c, "rgba(255,255,255,.25)", 1.5);
    for (let i = 0; i < 48; i++) { const u = i / 48 * 12, seg = Math.floor(u), f = u - seg; const lx = 40 + u * 160, ly = 24 + 4 * f * (1 - f) * 36 * .5 + 4; dot(c, lx, ly + 3, 4, ["#FFE3A3", "#F7B7C8", "#BFE3F7"][i % 3]); dot(c, lx, ly + 3, 10, "rgba(255,227,163,.15)"); }
  }

  // ---------- front furniture ----------
  function island(c, t) {
    c.save();
    shadow(c, 510, 912, 210, 14, .3);
    box(c, 334, 792, 352, 116, 6, lin(c, 334, 0, 686, 0, "#98AE9F", "#B4C7BA", "#98AE9F"));
    for (let i = 0; i < 4; i++) { rr(c, 344 + i * 85, 802, 75, 94, 6); stroke(c, "rgba(70,95,80,.4)", 2.5); line(c, [370 + i * 85, 818, 394 + i * 85, 818], 4, "#C9A45C"); }
    c.fillStyle = "#6E8374"; c.fillRect(340, 904, 340, 8);
    box(c, 324, 758, 372, 38, 8, lin(c, 0, 758, 0, 796, "#FFFFFF", "#F2EEE8", "#E2DDD5"));
    c.save(); c.globalAlpha = .25; curve(c, 340, 770, 470, 790, 600, 768, 1.5, "#9E97A6"); curve(c, 520, 764, 610, 782, 680, 770, 1.2, "#9E97A6"); c.restore();
    // plate stack, seder plate, herbs
    for (let i = 0; i < 5; i++) ell(c, 362, 764 - i * 3, 22, 6, i % 2 ? "#F4F0EA" : "#FFFFFF");
    c.save(); c.translate(646, 762); ell(c, 0, 0, 34, 10, "#C9A45C"); ell(c, 0, -1, 31, 8.5, "#FBF7F0");
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; dot(c, Math.cos(a) * 20, Math.sin(a) * 5 - 1, 4, ["#6FA86A", "#F3E6C8", "#8B5D3D", "#FFFFFF", "#D8453D", "#E3C08A"][i]); }
    c.restore();
    // plaque
    box(c, 452, 842, 116, 30, 15, "rgba(255,251,242,.92)", "#C9A45C", 1.5); text(c, "Plating", 510, 858, 18, "#6B4A2A", 600);
    c.restore();
  }
  function servingPass(c, dishes, t) {
    c.save();
    shadow(c, 1000, 918, 110, 10, .28);
    for (const lx of [912, 1088]) line(c, [lx, 812, lx, 910], 5, "#B89248");
    box(c, 904, 808, 192, 14, 7, lin(c, 0, 808, 0, 822, "#F7F1E6", "#DCD2C2"), "#C9A45C", 2);
    box(c, 910, 866, 180, 8, 4, "#C9A45C");
    for (const lx of [912, 1088]) { dot(c, lx, 914, 7, "#3A3A40"); dot(c, lx, 914, 3, "#C9A45C"); }
    // bell
    c.beginPath(); c.arc(1090, 806, 10, Math.PI, 0); fill(c, GOLD(c, 1080, 1100)); dot(c, 1090, 794, 3, "#C9A45C");
    box(c, 942, 876, 116, 26, 13, "rgba(255,251,242,.95)", "#C9A45C", 1.5); text(c, "Serving Pass", 1000, 890, 15, "#6B4A2A", 600);
    for (let i = 0; i < 3; i++) {
      const sx = 940 + i * 60;
      ell(c, sx, 812, 24, 5, "rgba(201,164,92,.25)");
      if (dishes[i]) food(c, dishes[i], sx, 796, 54, t);
    }
    c.restore();
  }
  function plant(c) {
    c.save(); c.translate(1862, 1000);
    box(c, -28, -60, 56, 60, 12, lin(c, -28, 0, 28, 0, "#9C7634", "#F1DA9E", "#9C7634"));
    line(c, [0, -60, -4, -150], 4, "#6B4A2A");
    const leaves = [[-26, -110, -.8], [22, -124, .7], [-18, -150, -.4], [16, -162, .5], [-2, -180, 0], [-34, -80, -1.1], [30, -86, 1]];
    for (const [lx, ly, a] of leaves) ell(c, lx, ly, 14, 26, lin(c, lx - 14, ly, lx + 14, ly, "#4E8A5E", "#6FAE7A"), a);
    c.restore();
  }

  // ---------- dynamic station art ----------
  function tv(c, t, cheer) {
    c.save(); c.beginPath(); c.moveTo(1797, 405); c.lineTo(1887, 392); c.lineTo(1887, 520); c.lineTo(1797, 507); c.closePath(); c.clip();
    c.fillStyle = lin(c, 0, 392, 0, 520, "#3F9A4E", "#2E7C3C"); c.fillRect(1790, 390, 100, 132);
    for (let i = 0; i < 6; i++) { const lx = 1790 + ((i * 22 - t * 30) % 132 + 132) % 132; line(c, [lx, 390, lx - 10, 522], 1.5, "rgba(255,255,255,.55)"); }
    const px = 1840 + Math.sin(t * 2) * 30; dot(c, px, 470, 4, "#D8453D"); dot(c, px + 14, 462 + Math.sin(t * 5) * 4, 4, "#2E4A6E"); dot(c, px - 16, 480, 4, "#2E4A6E"); ell(c, px + 6, 456, 3, 2, "#8B5D3D");
    c.fillStyle = "rgba(20,20,30,.75)"; c.fillRect(1790, 392, 100, 18); text(c, "21 – 17", 1842, 402, 11, "#FFFFFF", 700);
    if (cheer) { c.fillStyle = `rgba(255,220,90,${.3 + .3 * Math.sin(t * 20)})`; c.fillRect(1790, 390, 100, 132); text(c, "TD!", 1842, 460, 28, "#FFFFFF", 700); }
    c.restore();
  }
  function radioGlow(c, t, busy) {
    c.save();
    box(c, 1262, 446, 80, 52, 6, lin(c, 0, 446, 0, 498, "#34343C", "#22222A"));
    box(c, 1268, 414, 68, 32, 5, lin(c, 0, 414, 0, 446, "#3C3C46", "#2A2A32"));
    box(c, 1274, 420, 40, 14, 3, `rgba(120,240,170,${.75 + .25 * Math.sin(t * 7)})`);
    for (let i = 0; i < 5; i++) box(c, 1276 + i * 7, 424, 4, 6 - (Math.sin(t * 9 + i) * 3), 1, "#1C4A34");
    dot(c, 1280, 470, 11, "#4A4A55"); dot(c, 1280, 470, 8, "#6A6A78"); line(c, [1280, 470, 1280 + Math.cos(t * (busy ? 14 : 1)) * 7, 470 + Math.sin(t * (busy ? 14 : 1)) * 7], 2, "#F1DA9E");
    for (let i = 0; i < 3; i++) dot(c, 1304 + i * 12, 460, 3, i === 0 ? `rgba(255,120,80,${.6 + .4 * Math.sin(t * 5)})` : "#888");
    box(c, 1300, 474, 34, 14, 3, "#F5B94A"); line(c, [1304, 486, 1318 + Math.sin(t * 3) * 10, 476], 1.5, "#222");
    c.restore();
  }
  function mirrorReflection(c, drawSarah) {
    c.save(); c.beginPath(); c.moveTo(1100, 584); c.lineTo(1100, 292); c.quadraticCurveTo(1100, 256, 1130, 256); c.quadraticCurveTo(1160, 256, 1160, 292); c.lineTo(1160, 584); c.closePath(); c.clip();
    c.globalAlpha = .5; drawSarah(); c.globalAlpha = .45;
    c.fillStyle = lin(c, 1100, 256, 1160, 584, "rgba(255,255,255,.5)", "rgba(255,255,255,0)", "rgba(255,255,255,.3)"); c.fillRect(1100, 256, 60, 330);
    c.restore();
  }
  function burner(c, x, rx, on, t) {
    if (!on) return;
    c.save(); c.globalCompositeOperation = "lighter";
    ell(c, x, 462, rx + 6, 8, rad(c, x, 462, rx + 6, "rgba(255,140,60,.5)", "rgba(80,120,255,.25)", "rgba(80,120,255,0)"));
    c.restore();
  }
  function pot(c, x, slot, t) {
    const ph = slot.phase, on = ph === "cook" || ph === "ready" || ph === "burnt";
    burner(c, x, 40, on, t);
    c.save(); c.translate(x, 460);
    box(c, -46, -62, 92, 62, 12, lin(c, -46, 0, 46, 0, "#9AA3AD", "#EEF1F4", "#C6CDD4", "#8B949E"));
    box(c, -54, -52, 12, 8, 4, "#2E2E34"); box(c, 42, -52, 12, 8, 4, "#2E2E34");
    ell(c, 0, -62, 46, 10, "#7C858F");
    if (ph !== "empty") {
      const k = slot.frac || 0;
      const col = ph === "burnt" ? "#8A6A3A" : ph === "stir" ? "#D9E6EA" : ph === "ready" ? "#F2BC52" : `rgb(${Math.round(217 + (242 - 217) * k)},${Math.round(230 - 42 * k)},${Math.round(234 - 152 * k)})`;
      ell(c, 0, -61, 42, 8, col);
      if (ph === "stir" || ph === "cook") { dot(c, -18, -62, 4, "#F08A3C"); dot(c, 8, -60, 4, "#F08A3C"); box(c, -4, -66, 12, 4, 2, "#8FC065"); dot(c, 22, -62, 3.5, "#FFF3D6"); }
      if (ph === "cook" || ph === "ready") { for (let i = 0; i < 5; i++) { const b = (t * 1.6 + i * .37) % 1; c.globalAlpha = 1 - b; dot(c, -30 + i * 15, -62 - b * 4, 2 + b * 3, "#FFF6DD"); } c.globalAlpha = 1; }
      if (ph === "ready") { dot(c, -6, -64, 9, "#F3DDB0"); steam(c, 0, -70, 22, t, .8); }
      if (ph === "burnt") {
        // boil-over foam
        for (let i = 0; i < 7; i++) dot(c, -40 + i * 13, -62 + Math.sin(t * 8 + i) * 3, 9, "#FFF6DD");
        c.beginPath(); c.moveTo(-46, -60); c.quadraticCurveTo(-50, -30, -44, -20); c.quadraticCurveTo(-40, -40, -36, -58); fill(c, "#FFF6DD");
        c.beginPath(); c.moveTo(46, -60); c.quadraticCurveTo(52, -36, 44, -26); c.quadraticCurveTo(40, -44, 36, -58); fill(c, "#FFF6DD");
      }
    }
    c.restore();
  }
  function pan(c, x, slot, t) {
    const ph = slot.phase, on = ph === "cook" || ph === "flip" || ph === "ready" || ph === "burnt";
    burner(c, x, 34, on, t);
    c.save(); c.translate(x, 458);
    line(c, [26, -6, 56, -14], 7, "#2C2A2E");
    ell(c, 0, -2, 34, 11, "#26242A"); ell(c, 0, -5, 30, 9, "#3B3940");
    const it = slot.item, k = slot.frac || 0;
    if (ph !== "empty" && it) {
      if (ph === "burnt") { ell(c, 0, -6, 24, 7, "#2A2020"); ell(c, -6, -8, 8, 3, "#443030"); }
      else if (it === "eggmix") {
        ell(c, 0, -6, 26, 7.5, ph === "ready" ? lin(c, -26, 0, 26, 0, "#F2C14E", "#F9DA7A", "#E3A43A") : `rgba(${248},${Math.round(224 - 20 * k)},${Math.round(120 - 40 * k)},1)`);
        if (k > .4 || ph === "ready") { dot(c, -8, -7, 2.5, "#C97D2E"); dot(c, 9, -5, 2, "#C97D2E"); for (let i = 0; i < 5; i++) dot(c, -12 + i * 6, -6 + (i % 2) * 2, 1.2, "#4E8A3E"); }
      } else if (it === "breaded") {
        const done = ph === "ready" ? 1 : slot.stage === 2 ? .5 + k * .5 : k * .5;
        const col = `rgb(${Math.round(230 - 13 * done)},${Math.round(203 - 49 * done)},${Math.round(147 - 85 * done)})`;
        const fl = slot.flipAnim > 0 ? Math.sin((1 - slot.flipAnim) * Math.PI) * 30 : 0;
        chickenPiece(c, -10, -6 - fl, col, -.15, "#9C5E1E"); chickenPiece(c, 11, -7 - fl * .8, col, .2, "#9C5E1E");
      }
      if (on && ph !== "burnt") for (let i = 0; i < 4; i++) { const b = (t * 3 + i * .27) % 1; c.globalAlpha = (1 - b) * .8; dot(c, -20 + i * 13, -12 - b * 14, 1.6, "#FFF6DD"); } c.globalAlpha = 1;
    }
    c.restore();
  }
  function oven(c, which, slot, t) {
    const oy = which === "ovenTop" ? 196 : 404;
    c.save();
    const on = slot.phase === "cook" || slot.phase === "ready" || slot.phase === "burnt";
    box(c, 788, oy + 52, 74, 118, 8, on ? lin(c, 0, oy + 52, 0, oy + 170, "#5A2E1A", "#E08A3A") : lin(c, 0, oy + 52, 0, oy + 170, "#2E2C33", "#454350"));
    if (on) { c.save(); c.globalCompositeOperation = "lighter"; dot(c, 825, oy + 120, 60, rad(c, 825, oy + 120, 60, `rgba(255,150,60,${.3 + .1 * Math.sin(t * 4)})`, "rgba(255,150,60,0)")); c.restore(); }
    line(c, [792, oy + 150, 858, oy + 150], 2, "rgba(200,200,210,.6)");
    if (slot.item) {
      const id = slot.phase === "ready" ? (slot.item === "kugelraw" ? "kugel_c" : "cake_c") : slot.phase === "burnt" ? "burnt" : slot.item;
      food(c, id, 825, oy + 136, 58, t);
    }
    c.save(); c.globalAlpha = .25; c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(792, oy + 56); c.lineTo(812, oy + 56); c.lineTo(796, oy + 166); c.lineTo(792, oy + 166); c.fill(); c.restore();
    c.restore();
  }
  function mixerWork(c, t, active) {
    if (!active) return;
    c.save(); c.translate(952 + 22, 454 - 44);
    line(c, [0, -10, 0, 10 + Math.sin(t * 40) * 2], 3, "#C3C9CF");
    c.beginPath(); c.ellipse(0, 14, 7, 10, Math.sin(t * 40) * .4, 0, TAU); stroke(c, "#C3C9CF", 2);
    c.restore();
  }
  function mess(c, x, y, kind, t) {
    c.save(); c.translate(x, y);
    if (kind === "flour") { for (let i = 0; i < 9; i++) dot(c, -40 + (i * 37 % 80), -10 + (i * 23 % 30), 10 + (i % 3) * 5, "rgba(255,255,255,.92)"); }
    else if (kind === "towel") { c.rotate(-.2); box(c, -40, -10, 80, 24, 6, "#F4F0EA"); for (let i = 0; i < 4; i++) line(c, [-36 + i * 22, -10, -36 + i * 22, 14], 4, "#6FA5D8"); }
    else if (kind === "spill") { ell(c, 0, 0, 50, 14, "rgba(242,196,90,.9)"); ell(c, 34, 6, 12, 5, "rgba(242,196,90,.9)"); ell(c, -8, -8, 18, 8, "rgba(255,230,160,.9)"); }
    else if (kind === "paper") { c.beginPath(); c.moveTo(-60, 0); for (let i = 0; i < 6; i++) c.quadraticCurveTo(-50 + i * 20, (i % 2 ? 16 : -16), -40 + i * 20, 0); stroke(c, "#FFFFFF", 12); }
    else { for (let i = 0; i < 5; i++) { c.save(); c.translate(-30 + i * 15, (i % 2) * 8); c.rotate(i); line(c, [-10, 0, 10, 0], 4, i % 2 ? "#C3C9CF" : "#B98B5C"); c.restore(); } }
    // sparkle "tap to clean"
    const p = .6 + .4 * Math.sin(t * 6);
    box(c, -46, -52, 92, 26, 13, `rgba(255,251,242,${.9 * p + .1})`, "#E5484D", 2);
    text(c, "Tap to clean", 0, -39, 13, "#B8323A", 700);
    c.restore();
  }

  // ---------- UI-ish canvas bits ----------
  function ring(c, x, y, r, frac, col, bg = "rgba(255,255,255,.85)") {
    dot(c, x, y, r + 5, bg);
    c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, Math.min(1, frac))); stroke(c, col, 6);
  }
  function badge(c, x, y, str, col, t, pulse = true) {
    const s = pulse ? 1 + .08 * Math.sin(t * 10) : 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.font = `700 20px ${FONT}`; const w = c.measureText(str).width + 26;
    c.shadowColor = "rgba(60,30,10,.3)"; c.shadowBlur = 10; c.shadowOffsetY = 4;
    box(c, -w / 2, -17, w, 34, 17, col); c.shadowColor = "transparent";
    box(c, -w / 2 + 3, -15, w - 6, 13, 7, "rgba(255,255,255,.3)");
    text(c, str, 0, 1, 20, "#FFFFFF", 700);
    c.restore();
  }
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
  const MOODCOL = ["#4CC38A", "#F2C230", "#F39237", "#E5484D"];
  function orderBubble(c, x, y, dish, pat, t, s = 1) {
    const mood = pat > .6 ? 0 : pat > .4 ? 1 : pat > .2 ? 2 : 3;
    const shake = mood === 3 ? Math.sin(t * 30) * 2.5 : 0;
    c.save(); c.translate(x + shake, y); c.scale(s, s);
    c.shadowColor = "rgba(60,30,10,.28)"; c.shadowBlur = 16; c.shadowOffsetY = 6;
    box(c, -46, -92, 92, 86, 24, "#FFFFFF");
    c.shadowColor = "transparent";
    c.beginPath(); c.moveTo(-10, -8); c.lineTo(10, -8); c.lineTo(0, 6); c.closePath(); fill(c, "#FFFFFF");
    rr(c, -46, -92, 92, 86, 24); stroke(c, MOODCOL[mood], 3.5);
    food(c, dish, 0, -58, 62, t);
    box(c, -34, -24, 68, 10, 5, "#EEE7DD");
    box(c, -34, -24, 68 * Math.max(0, pat), 10, 5, MOODCOL[mood]);
    c.restore();
    return mood;
  }

  return { W, H, FONT, rr, lin, rad, radF, box, ell, dot, line, curve, text, shadow, steam, sweat, head, SK,
    ariel, sarah, ikey, michael, simon, cari, nana, max, food, background, island, servingPass, plant,
    tv, radioGlow, mirrorReflection, pot, pan, oven, mixerWork, mess, ring, badge, speech, orderBubble, MOODCOL };
})();
