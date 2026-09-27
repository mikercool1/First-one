// Reuben, Jonah and Ellie drawn exactly as in Backyard Baseball, and Dad (Mike) as in Fish Friday.
// Heads only: the lazy river draws the swimming bodies around them.
window.LRArt = (() => {
  "use strict";
  const TAU = Math.PI * 2;

  // ---------- drawing helpers (from Backyard Baseball) ----------
  function C(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function E(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot, 0, TAU); }
  function rgr(c, x, y, r, c0, c1) { const gr = c.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r * 1.05); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
  function lgr(c, x0, y0, x1, y1, stops) { const gr = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; }
  function fs(c, fill, stroke, lw) { c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); } }
  function smoothPath(c, pts, sx = 1, sy = 1) {
    const n = pts.length; c.beginPath();
    const m = (i) => [(pts[i][0] + pts[(i + 1) % n][0]) / 2 * sx, (pts[i][1] + pts[(i + 1) % n][1]) / 2 * sy];
    const s0 = m(n - 1); c.moveTo(s0[0], s0[1]);
    for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(pts[i][0] * sx, pts[i][1] * sy, e[0], e[1]); }
    c.closePath();
  }

  // Backyard Baseball head colours (R is the head radius those drawings use)
  const HEADS = {
    reuben: { R: 23, skin: "#FFD8BE", skinD: "#E3A887", hair: "#F4D273", hairD: "#CFA23C", iris: "#3F86D9" },
    jonah:  { R: 22, skin: "#FFDCC6", skinD: "#E6AC8C", hair: "#7B4A26", hairD: "#4F2D13", iris: "#6A4526" },
    ellie:  { R: 21.5, noBrows: true, skin: "#FFE1CF", skinD: "#EBB39A", hair: "#5B2330", hairD: "#35121C", iris: "#6B3A2E" },
  };

  function drawEyes(c, K, fx, ey, R, look, blink, exp) {
    const lx = look[0] * R * 0.07, ly = look[1] * R * 0.07;
    const eyes = [[fx - R * 0.3, 1], [fx + R * 0.42, 0.82]];
    for (const [ex, sc] of eyes) {
      const rx = R * 0.22 * sc, ry = R * 0.28;
      if (blink || exp === "wail" || exp === "happy") {
        c.beginPath(); c.lineCap = "round"; c.lineWidth = R * 0.075; c.strokeStyle = "#3A2A2A";
        if (exp === "wail") { c.moveTo(ex - rx, ey - ry * 0.4); c.lineTo(ex + rx * 0.6, ey); c.lineTo(ex - rx, ey + ry * 0.4); }
        else if (exp === "happy") { c.arc(ex, ey + ry * 0.2, rx * 0.9, Math.PI * 1.1, Math.PI * 1.9); }
        else { c.arc(ex, ey, rx * 0.9, Math.PI * 0.1, Math.PI * 0.9); }
        c.stroke(); continue;
      }
      const wide = exp === "O" ? 1.15 : 1;
      E(c, ex, ey, rx * wide, ry * wide); fs(c, "#FFFFFF", "rgba(60,40,40,.35)", R * 0.04);
      c.save(); E(c, ex, ey, rx * wide, ry * wide); c.clip();
      C(c, ex + lx * sc, ey + ly, R * 0.17 * sc); c.fillStyle = K.iris; c.fill();
      C(c, ex + lx * sc, ey + ly, R * 0.1 * sc); c.fillStyle = "#1A1320"; c.fill();
      C(c, ex + lx * sc - R * 0.06, ey + ly - R * 0.08, R * 0.06); c.fillStyle = "#fff"; c.fill();
      c.restore();
    }
    if (K.noBrows) return;
    c.strokeStyle = K.hairD; c.lineWidth = R * 0.085; c.lineCap = "round";
    const bt = exp === "mad" ? 0.28 : exp === "wail" ? -0.3 : exp === "O" ? -0.12 : 0;
    for (const [ex, sc, s] of [[fx - R * 0.3, 1, -1], [fx + R * 0.42, 0.82, 1]]) {
      const by = ey - R * 0.42 - (exp === "O" ? R * 0.08 : 0);
      c.beginPath(); c.moveTo(ex - R * 0.16 * sc, by + (s < 0 ? bt : -bt) * R * -0.3); c.lineTo(ex + R * 0.16 * sc, by + (s < 0 ? -bt : bt) * R * -0.3); c.stroke();
    }
  }
  function drawMouth(c, x, y, R, exp, t) {
    c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#6B2A2A"; c.lineWidth = R * 0.075;
    switch (exp) {
      case "grin": case "happy": {
        c.beginPath(); c.moveTo(x - R * 0.34, y - R * 0.04); c.quadraticCurveTo(x, y + R * 0.5, x + R * 0.34, y - R * 0.04); c.closePath();
        fs(c, "#8A2F36"); c.save(); c.clip(); c.fillStyle = "#fff"; c.fillRect(x - R * 0.4, y - R * 0.1, R * 0.8, R * 0.12);
        E(c, x + R * 0.04, y + R * 0.3, R * 0.2, R * 0.12); c.fillStyle = "#FF8A95"; c.fill(); c.restore(); break;
      }
      case "O": E(c, x, y + R * 0.1, R * 0.12, R * 0.16); fs(c, "#8A2F36"); break;
      case "wail": { const o = Math.sin(t * 18) * R * 0.03; E(c, x, y + R * 0.12, R * 0.26, R * 0.2 + o); fs(c, "#8A2F36"); E(c, x, y + R * 0.24, R * 0.14, R * 0.07); c.fillStyle = "#FF8A95"; c.fill(); break; }
      case "determined": c.beginPath(); c.moveTo(x - R * 0.14, y + R * 0.08); c.quadraticCurveTo(x, y + R * 0.12, x + R * 0.16, y + R * 0.06); c.stroke(); break;
      default: c.beginPath(); c.arc(x, y - R * 0.08, R * 0.24, Math.PI * 0.18, Math.PI * 0.82); c.stroke();
    }
  }

  const JONAH_HAIR = [[-1.0, 0.15], [-1.08, -0.45], [-0.85, -0.95], [-0.55, -1.28], [-0.22, -1.08], [0.05, -1.42], [0.3, -1.12], [0.62, -1.28], [0.74, -0.95], [1.02, -0.88], [0.97, -0.55], [1.0, -0.3], [0.72, -0.45], [0.46, -0.3], [0.16, -0.5], [-0.2, -0.36], [-0.5, -0.42], [-0.7, -0.1], [-0.8, 0.22]];
  const ELLIE_HAIR = [[-1.06, 0.32], [-1.14, -0.4], [-0.84, -1.0], [-0.2, -1.22], [0.48, -1.12], [0.95, -0.76], [1.1, -0.26], [1.02, -0.14], [0.82, -0.2], [0.62, -0.15], [0.42, -0.21], [0.22, -0.15], [0.02, -0.21], [-0.18, -0.15], [-0.4, -0.21], [-0.62, -0.13], [-0.8, 0.38]];

  // One of the kids' heads, centred on (0,0), at the Backyard Baseball size (radius K.R).
  function kidHead(c, id, exp, t, look = [0.2, -0.6]) {
    const K = HEADS[id], R = K.R;
    const blink = (t % 3.4) < 0.13 && exp !== "happy";
    c.save();
    if (id === "reuben") { c.fillStyle = K.hair; E(c, -R * 0.45, R * 0.12, R * 0.66, R * 0.62); c.fill(); }
    if (id === "ellie") {
      const sw = Math.sin(t * 3 + 1) * 0.12;
      for (const sd of [-1, 1]) {
        c.save(); c.translate(sd * R * 0.9, -R * 0.86); c.rotate(-sd * (2.05 + sw));
        c.beginPath(); c.moveTo(-R * 0.16, 0); c.quadraticCurveTo(-R * 0.42, R * 0.4, -R * 0.3, R * 0.72);
        c.lineTo(-R * 0.12, R * 0.58); c.lineTo(0, R * 0.8); c.lineTo(R * 0.12, R * 0.6); c.lineTo(R * 0.3, R * 0.74);
        c.quadraticCurveTo(R * 0.42, R * 0.4, R * 0.16, 0); c.closePath();
        fs(c, rgr(c, 0, R * 0.3, R * 0.7, "#8A4250", K.hair), K.hairD, 1.5);
        c.restore();
      }
    }
    // ear
    E(c, -R * 0.72, R * 0.1, R * 0.19, R * 0.25); fs(c, K.skin, K.skinD, 1.6);
    E(c, -R * 0.72, R * 0.12, R * 0.08, R * 0.13); c.fillStyle = K.skinD; c.fill();
    // head
    C(c, 0, 0, R); fs(c, rgr(c, 0, 0, R, "#FFF1E6", K.skin), K.skinD, 1.8);
    if (id === "reuben") {
      c.fillStyle = K.hair;
      for (const [hx, hy, r] of [[-0.95, -0.02, 0.2], [-0.82, 0.22, 0.17], [-0.62, -0.12, 0.18], [0.38, -0.2, 0.14], [0.6, -0.16, 0.12]]) { C(c, hx * R, hy * R, r * R); c.fill(); }
      c.beginPath(); c.moveTo(-R * 1.04, -R * 0.14); c.bezierCurveTo(-R * 1.08, -R * 1.38, R * 1.06, -R * 1.38, R * 1.02, -R * 0.14); c.closePath();
      fs(c, lgr(c, 0, -R * 1.2, 0, -R * 0.1, ["#3A4E9A", "#1F2F6B", "#16224F"]), "#0F1A45", 1.8);
      c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -R * 1.02); c.quadraticCurveTo(R * 0.12, -R * 0.55, R * 0.08, -R * 0.14); c.stroke();
      C(c, 0, -R * 1.03, R * 0.1); c.fillStyle = "#16224F"; c.fill();
      E(c, R * 0.92, -R * 0.17, R * 0.62, R * 0.17, -0.06); fs(c, lgr(c, 0, -R * 0.3, 0, 0, ["#2A3C82", "#101A44"]), "#0B1235", 1.6);
      c.fillStyle = "#fff"; c.font = `400 ${R * 0.5}px "Lilita One", "Arial Black", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("R", R * 0.32, -R * 0.62);
      c.textBaseline = "alphabetic";
    } else if (id === "jonah") {
      const w = Math.sin(t * 5) * 0.03;
      smoothPath(c, JONAH_HAIR.map(([x, y], i) => [x, y + (i % 2 ? w : -w)]), R, R);
      fs(c, rgr(c, 0, -R * 0.8, R * 1.1, "#A56A3C", K.hair), K.hairD, 1.8);
      c.strokeStyle = "rgba(255,220,180,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 0.4, -R * 0.95); c.quadraticCurveTo(R * 0.1, -R * 1.1, R * 0.5, -R * 0.9); c.stroke();
    } else {
      smoothPath(c, ELLIE_HAIR, R, R);
      fs(c, rgr(c, 0, -R * 0.8, R * 1.1, "#8A4250", K.hair), K.hairD, 1.8);
      c.strokeStyle = "rgba(255,200,210,.22)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 0.5, -R * 0.9); c.quadraticCurveTo(R * 0.1, -R * 1.12, R * 0.6, -R * 0.8); c.stroke();
      c.strokeStyle = "rgba(40,10,20,.3)"; c.lineWidth = 1.2; for (const bx of [-0.5, -0.1, 0.3, 0.7]) { c.beginPath(); c.moveTo(bx * R, -R * 0.55); c.lineTo(bx * R + 1, -R * 0.2); c.stroke(); }
      for (const sd of [-1, 1]) for (const [bx, by] of [[0.86, -0.88], [0.98, -0.74]]) { C(c, sd * bx * R, by * R, R * 0.12); fs(c, rgr(c, sd * bx * R, by * R, R * 0.12, "#FF9CC2", "#D63F77"), "#9E2355", 1.2); }
    }
    // face
    const fx = R * 0.2, ey = R * 0.12;
    C(c, fx - R * 0.55, R * 0.42, R * 0.17); c.fillStyle = "rgba(255,120,130,.28)"; c.fill();
    C(c, fx + R * 0.62, R * 0.42, R * 0.13); c.fill();
    drawEyes(c, K, fx, ey, R, look, blink, exp);
    E(c, fx + R * 0.1, R * 0.34, R * 0.1, R * 0.08); c.fillStyle = K.skinD; c.fill();
    drawMouth(c, fx + R * 0.06, R * 0.58, R, exp, t);
    c.restore();
  }

  // Dad, the way Mike looks in Fish Friday: wide face, swept brown hair with a cowlick.
  // Drawn in that avatar's 200-unit space, centred on the head (radius about 53).
  const MIKE = { skin: "#F4C7A1", skinD: "#DDA57C", hair: "#5E3C22", brow: "#4A2E1B" };
  const MIKE_HAIR = typeof Path2D !== "undefined" ? new Path2D("M46 88 C42 50 70 34 100 34 C130 34 158 50 154 88 C148 68 136 60 120 62 C110 52 92 54 84 60 C70 60 54 68 46 88 Z") : null;
  function dadHead(c, exp, t, patch = true) {
    const blink = (t % 3.9) < 0.13 && exp !== "happy";
    c.save(); c.translate(-100, -94);
    // ears and head
    for (const ex of [48, 152]) { C(c, ex, 104, 10); fs(c, MIKE.skin, MIKE.skinD, 3); }
    E(c, 100, 94, 54, 52); fs(c, rgr(c, 100, 94, 54, "#FFE6D2", MIKE.skin), MIKE.skinD, 3.5);
    c.strokeStyle = "rgba(120,60,30,.18)"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(76, 142); c.quadraticCurveTo(100, 154, 124, 142); c.stroke();
    // hair
    if (MIKE_HAIR) { c.fillStyle = MIKE.hair; c.fill(MIKE_HAIR); }
    c.strokeStyle = MIKE.hair; c.lineWidth = 7; c.beginPath(); c.moveTo(96, 36); c.quadraticCurveTo(104, 24, 112, 34); c.stroke();
    // brows
    c.strokeStyle = MIKE.brow; c.lineWidth = 4.5;
    const up = exp === "O" ? -4 : 0;
    c.beginPath(); c.moveTo(68, 87 + up); c.quadraticCurveTo(77, 80 + up, 86, 86 + up); c.moveTo(114, 86 + up); c.quadraticCurveTo(123, 80 + up, 132, 87 + up); c.stroke();
    // eyes
    for (const ex of [77, 123]) {
      if (blink || exp === "happy") { c.strokeStyle = "#2A1C14"; c.lineWidth = 4; c.beginPath(); c.arc(ex, 104, 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); continue; }
      E(c, ex, 102, 7, 8); c.fillStyle = "#fff"; c.fill();
      C(c, ex + 1, 103, 4.6); c.fillStyle = "#2A1C14"; c.fill();
      C(c, ex + 2.6, 101, 1.5); c.fillStyle = "#fff"; c.fill();
    }
    if (patch) {
      // pirate eyepatch, because Dad says we're pirates
      c.strokeStyle = "#15171C"; c.lineWidth = 3; c.beginPath(); c.moveTo(47, 82); c.lineTo(153, 70); c.stroke();
      E(c, 77, 103, 13, 11.5); c.fillStyle = "#15171C"; c.fill();
      C(c, 73, 99, 2.4); c.fillStyle = "rgba(255,255,255,.25)"; c.fill();
    }
    // cheeks, nose, mouth
    c.fillStyle = "rgba(242,139,130,.3)"; C(c, 62, 118, 7); c.fill(); C(c, 138, 118, 7); c.fill();
    E(c, 100, 114, 5, 4); c.fillStyle = MIKE.skinD; c.fill();
    if (exp === "O") { E(c, 100, 130, 7, 9); c.fillStyle = "#8A2F36"; c.fill(); }
    else {
      c.beginPath(); c.moveTo(82, 124); c.quadraticCurveTo(100, 144, 118, 124); c.closePath(); c.fillStyle = "#8A2F36"; c.fill();
      c.save(); c.clip(); c.fillStyle = "#fff"; c.fillRect(80, 122, 40, 5); c.restore();
    }
    c.restore();
  }

  return { HEADS, kidHead, dadHead, DAD_R: 53 };
})();
