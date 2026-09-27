// Rosenberg World: buildings and big structures.
// Each painter draws at its anchor: the middle of the front wall, on the ground. Up is negative y.

(() => {
  const RW = window.RW, A = RW.art;
  const { rr, ell, lin, rad, shade, text } = A;
  const TAU = Math.PI * 2;
  const B = RW.build = {};

  // ---------- building blocks ----------
  function wall(c, x0, x1, h, col, o = {}) {
    const base = o.base == null ? 0 : o.base;
    c.fillStyle = lin(c, x0, base - h, x0, base, [shade(col, 0.08), col, shade(col, -0.06)]);
    c.fillRect(x0, base - h, x1 - x0, h);
    if (o.siding) {
      c.strokeStyle = "rgba(90,70,50,.08)"; c.lineWidth = 1.5;
      for (let y = base - h + 12; y < base - 10; y += 12) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    }
    if (o.brick) {
      c.fillStyle = "rgba(255,255,255,.12)";
      for (let y = base - h + 4, row = 0; y < base - 8; y += 12, row++) for (let x = x0 + (row % 2) * 14; x < x1 - 4; x += 28) c.fillRect(x, y, 24, 2);
    }
    // soft ambient occlusion at the top under the eaves and a lit left edge
    c.fillStyle = lin(c, 0, base - h, 0, base - h + 30, ["rgba(40,30,20,.22)", "rgba(40,30,20,0)"]);
    c.fillRect(x0, base - h, x1 - x0, 30);
    c.fillStyle = lin(c, x0, 0, x1, 0, [[0, "rgba(255,255,255,.12)"], [0.2, "rgba(255,255,255,0)"], [0.85, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.1)"]]);
    c.fillRect(x0, base - h, x1 - x0, h);
    // foundation
    c.fillStyle = o.foundation || shade(col, -0.35);
    rr(c, x0 - 3, base - 12, x1 - x0 + 6, 12, 3); c.fill();
    if (o.trim) {
      c.fillStyle = o.trim;
      c.fillRect(x0 - 2, base - h, 7, h - 10); c.fillRect(x1 - 5, base - h, 7, h - 10);
    }
  }

  function hipRoof(c, x0, x1, eaveY, rise, col, o = {}) {
    const over = o.over == null ? 18 : o.over, inset = o.inset == null ? rise * 0.75 : o.inset;
    const L = x0 - over, R = x1 + over, top = eaveY - rise, e = eaveY + 10;
    // underside shadow
    c.fillStyle = "rgba(30,20,20,.25)"; rr(c, L + 6, e - 4, R - L - 12, 12, 6); c.fill();
    c.beginPath();
    c.moveTo(L, e); c.lineTo(R, e);
    c.quadraticCurveTo(R - 4, e - 6, R - inset * 0.1 - 6, e - 12);
    c.lineTo(x1 - inset + over, top + 4);
    c.quadraticCurveTo(x1 - inset + over, top, x1 - inset + over - 8, top);
    c.lineTo(x0 + inset - over + 8, top);
    c.quadraticCurveTo(x0 + inset - over, top, x0 + inset - over, top + 4);
    c.lineTo(L + inset * 0.1 + 6, e - 12);
    c.quadraticCurveTo(L + 4, e - 6, L, e);
    c.closePath();
    c.fillStyle = lin(c, 0, top, 0, e, [shade(col, 0.22), col, shade(col, -0.2)]);
    c.fill();
    c.save(); c.clip();
    // shingle rows
    c.strokeStyle = "rgba(0,0,0,.1)"; c.lineWidth = 2;
    for (let y = top + 14; y < e; y += 14) { c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); }
    c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = 1;
    for (let y = top + 16; y < e; y += 14) for (let x = L + ((y / 14) % 2) * 12; x < R; x += 24) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 10); c.stroke(); }
    // hip lines + sun
    c.fillStyle = lin(c, L, 0, R, 0, [[0, "rgba(255,255,255,.14)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(0,0,0,.12)"]]);
    c.fillRect(L, top, R - L, e - top);
    c.restore();
    // eave trim
    c.fillStyle = o.trim || "#FFFFFF";
    rr(c, L - 2, e - 2, R - L + 4, 8, 4); c.fill();
    // ridge cap
    c.fillStyle = shade(col, 0.3);
    rr(c, x0 + inset - over + 2, top - 3, x1 - x0 - 2 * inset + 2 * over - 4, 7, 3.5); c.fill();
  }

  function gable(c, x0, x1, eaveY, apexY, wallCol, roofCol) {
    const cx = (x0 + x1) / 2;
    c.fillStyle = lin(c, 0, apexY, 0, eaveY, [shade(wallCol, 0.06), wallCol]);
    c.beginPath(); c.moveTo(x0, eaveY); c.lineTo(cx, apexY); c.lineTo(x1, eaveY); c.closePath(); c.fill();
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = shade(roofCol, -0.15); c.lineWidth = 22;
    c.beginPath(); c.moveTo(x0 - 12, eaveY + 10); c.lineTo(cx, apexY - 6); c.lineTo(x1 + 12, eaveY + 10); c.stroke();
    c.strokeStyle = roofCol; c.lineWidth = 16;
    c.beginPath(); c.moveTo(x0 - 12, eaveY + 8); c.lineTo(cx, apexY - 8); c.lineTo(x1 + 12, eaveY + 8); c.stroke();
    c.strokeStyle = "#FFFFFF"; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x0 - 4, eaveY + 4); c.lineTo(cx, apexY + 4); c.lineTo(x1 + 4, eaveY + 4); c.stroke();
  }

  function glass(c, x, y, w, h, o = {}) {
    const g = o.glass || ["#D9F1FF", "#9ACDEB", "#6EA8D3"];
    c.fillStyle = lin(c, x, y, x + w * 0.4, y + h, g);
    if (o.round) { ell(c, x + w / 2, y + h / 2, w / 2, h / 2); c.fill(); }
    else { rr(c, x, y, w, h, o.r || 3); c.fill(); }
    if (!o.noGlint) {
      c.save();
      if (o.round) { ell(c, x + w / 2, y + h / 2, w / 2, h / 2); } else { rr(c, x, y, w, h, o.r || 3); }
      c.clip();
      c.fillStyle = "rgba(255,255,255,.45)";
      c.beginPath(); c.moveTo(x + w * 0.15, y + h); c.lineTo(x + w * 0.45, y); c.lineTo(x + w * 0.62, y); c.lineTo(x + w * 0.32, y + h); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.2)";
      c.beginPath(); c.moveTo(x + w * 0.62, y + h); c.lineTo(x + w * 0.8, y); c.lineTo(x + w * 0.86, y); c.lineTo(x + w * 0.68, y + h); c.closePath(); c.fill();
      c.restore();
    }
  }

  function windowUnit(c, x, y, w, h, o = {}) {
    const frame = o.frame || "#FFFFFF";
    if (o.shutters) {
      c.fillStyle = o.shutters;
      rr(c, x - 18, y - 2, 14, h + 4, 3); c.fill(); rr(c, x + w + 4, y - 2, 14, h + 4, 3); c.fill();
      c.strokeStyle = "rgba(0,0,0,.15)"; c.lineWidth = 1;
      for (let k = 6; k < h; k += 7) { c.beginPath(); c.moveTo(x - 16, y + k); c.lineTo(x - 6, y + k); c.moveTo(x + w + 6, y + k); c.lineTo(x + w + 16, y + k); c.stroke(); }
    }
    c.fillStyle = "rgba(40,30,20,.2)"; rr(c, x - 5, y - 3, w + 10, h + 10, 5); c.fill();
    c.fillStyle = frame; rr(c, x - 6, y - 6, w + 12, h + 12, 5); c.fill();
    if (!o.noGlass) glass(c, x, y, w, h, o);
    if (!o.noMullion) {
      c.fillStyle = frame;
      c.fillRect(x + w / 2 - 2, y, 4, h);
      c.fillRect(x, y + h / 2 - 2, w, 4);
    }
    // sill
    c.fillStyle = shade(frame, -0.08); rr(c, x - 10, y + h + 3, w + 20, 7, 3); c.fill();
    if (o.box) {
      c.fillStyle = o.box; rr(c, x - 4, y + h + 9, w + 8, 14, 4); c.fill();
      const cols = ["#FF6B8B", "#FFD23F", "#FFFFFF", "#FF8A3D"];
      for (let i = 0; i < 7; i++) {
        const fx = x + (i + 0.5) * ((w) / 7);
        c.fillStyle = "#3F9A4E"; c.beginPath(); c.arc(fx, y + h + 8, 6, 0, TAU); c.fill();
        c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(fx + 1, y + h + 5, 3.2, 0, TAU); c.fill();
      }
    }
  }

  function door(c, x, w, h, col, o = {}) {
    const base = o.base || 0;
    c.fillStyle = "rgba(40,30,20,.25)"; rr(c, x - w / 2 - 8, base - h - 8, w + 16, h + 8, 10); c.fill();
    c.fillStyle = o.frame || "#FFFFFF"; rr(c, x - w / 2 - 7, base - h - 7, w + 14, h + 7, 9); c.fill();
    c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [shade(col, 0.15), col, shade(col, -0.15)]);
    rr(c, x - w / 2, base - h, w, h, o.arch ? w / 2 : 6); c.fill();
    if (!o.plain) {
      c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 2;
      rr(c, x - w / 2 + 8, base - h * 0.52, w - 16, h * 0.4, 4); c.stroke();
      glass(c, x - w / 2 + 9, base - h + (o.arch ? w * 0.35 : 10), w - 18, h * 0.28, { r: 4 });
    }
    c.fillStyle = "#F2C94C"; c.beginPath(); c.arc(x + w / 2 - 10, base - h * 0.45, 3.4, 0, TAU); c.fill();
  }

  function steps(c, x, w, n = 2) {
    for (let i = 0; i < n; i++) {
      c.fillStyle = lin(c, 0, i * 8, 0, i * 8 + 8, ["#E9E2D6", "#C9C0B0"]);
      rr(c, x - w / 2 - i * 8, i * 8 - 2, w + i * 16, 10, 3); c.fill();
    }
  }

  function chimney(c, x, y, h, w = 36) {
    c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, ["#D2735A", "#B45A43", "#96462F"]);
    c.fillRect(x - w / 2, y - h, w, h);
    c.fillStyle = "rgba(255,255,255,.14)";
    for (let yy = y - h + 6, r = 0; yy < y - 4; yy += 10, r++) for (let xx = x - w / 2 + (r % 2) * 8; xx < x + w / 2 - 4; xx += 16) c.fillRect(xx, yy, 12, 2);
    c.fillStyle = "#6E3A2B"; rr(c, x - w / 2 - 5, y - h - 8, w + 10, 10, 3); c.fill();
  }

  function plate(c, str, x, y, size, bg, ink, o = {}) {
    c.font = `700 ${size}px ${A.FONT}`;
    const w = c.measureText(str).width + size * 1.2, h = size * 1.5;
    c.fillStyle = "rgba(20,30,50,.2)"; rr(c, x - w / 2 + 2, y - h / 2 + 4, w, h, h / 2); c.fill();
    c.fillStyle = bg; rr(c, x - w / 2, y - h / 2, w, h, o.r == null ? h / 2 : o.r); c.fill();
    c.fillStyle = "rgba(255,255,255,.25)"; rr(c, x - w / 2 + 5, y - h / 2 + 3, w - 10, h * 0.3, h * 0.2); c.fill();
    text(c, str, x, y + 1, size, ink, { weight: 700 });
    return w;
  }
  B.plate = plate;

  // =====================================================================
  // THE ROSENBERG HOUSE  (anchor = front of the main block, x centered)
  // =====================================================================
  // A long, low, white ranch house with a charcoal roof and an attached garage.
  B.HOUSE_WINDOWS = {
    ikey: { x: -182, y: -104, w: 76, h: 62 },     // living room with the TV
    up: [{ x: -276, y: -104, w: 56, h: 62 }, { x: 204, y: -104, w: 52, h: 62 }], // Cari walks past these
    front: { x: 36, y: -104, w: 124, h: 62 },
  };
  B.house = (c) => {
    const W = "#FAFAF7", ROOF = "#5E6675", TRIM = "#FFFFFF", SH = "#27324A", STONE = "#B9B2A6";
    // garage wing
    c.save(); c.translate(0, -18);
    wall(c, 282, 470, 116, W, { siding: true, foundation: "#9E978B" });
    hipRoof(c, 282, 470, -116, 64, ROOF, { inset: 40, over: 14 });
    c.fillStyle = "#F4F4F6"; rr(c, 300, -100, 152, 100, 6); c.fill();
    c.strokeStyle = "rgba(0,0,0,.1)"; c.lineWidth = 2;
    for (let y = -76; y < 0; y += 24) { c.beginPath(); c.moveTo(302, y); c.lineTo(450, y); c.stroke(); }
    for (let i = 0; i < 4; i++) glass(c, 310 + i * 36, -92, 28, 13, { r: 3 });
    c.fillStyle = "#2B2F3A"; [292, 460].forEach((x) => { rr(c, x - 4, -84, 8, 13, 3); c.fill(); });
    c.restore();
    // main block: one long story
    wall(c, -304, 282, 128, W, { siding: true, trim: TRIM, foundation: "#9E978B" });
    // stone wainscot along the bottom
    c.fillStyle = STONE; c.fillRect(-304, -30, 586, 18);
    c.fillStyle = "rgba(255,255,255,.18)";
    for (let x = -300, r = 0; x < 280; x += 22, r++) c.fillRect(x + (r % 2) * 6, -27 + (r % 3) * 4, 14, 3);
    hipRoof(c, -304, 282, -128, 92, ROOF, { inset: 90, trim: "#EDEFF3" });
    chimney(c, 170, -176, 62, 34);
    // windows
    B.HOUSE_WINDOWS.up.forEach((w) => windowUnit(c, w.x, w.y, w.w, w.h, { shutters: SH, box: "#6E4A30" }));
    const f = B.HOUSE_WINDOWS.front;
    windowUnit(c, f.x, f.y, f.w, f.h, { shutters: SH });
    const k = B.HOUSE_WINDOWS.ikey;
    windowUnit(c, k.x, k.y, k.w, k.h, { shutters: SH, noGlass: true, noMullion: true });
    // front porch with a little gable over the door
    c.save(); c.translate(0, 8);
    c.fillStyle = "#E9E4DA"; rr(c, -96, -8, 102, 12, 3); c.fill();
    gable(c, -104, 14, -132, -184, "#FFFFFF", ROOF);
    c.fillStyle = TRIM; rr(c, -98, -134, 8, 128, 3); c.fill(); rr(c, 0, -134, 8, 128, 3); c.fill();
    door(c, -45, 58, 104, "#1FA39A", { arch: false });
    plate(c, "99", -45, -150, 11, "#27324A", "#FFFFFF");
    [-82, -8].forEach((x) => { c.fillStyle = "#2B2F3A"; rr(c, x - 4, -98, 8, 14, 3); c.fill(); c.fillStyle = "#FFE9A0"; rr(c, x - 3, -95, 6, 8, 2); c.fill(); });
    steps(c, -45, 78, 2);
    c.restore();
    plate(c, "THE ROSENBERGS", 98, -20, 11, "#FFFFFF", "#27324A", { r: 6 });
  };

  // =====================================================================
  // ARIEL'S KITCHEN
  // =====================================================================
  B.KITCHEN_WINDOW = { x: -178, y: -140, w: 250, h: 92 };
  B.kitchen = (c) => {
    const W = "#FCE7BE", ROOF = "#2F9C86";
    wall(c, -222, 222, 176, W, { brick: false, siding: true, trim: "#FFFFFF" });
    hipRoof(c, -222, 222, -176, 120, ROOF, { inset: 90 });
    chimney(c, -120, -250, 84, 40);
    // the big kitchen window frame (the scene inside is drawn live)
    const k = B.KITCHEN_WINDOW;
    c.fillStyle = "rgba(40,30,20,.25)"; rr(c, k.x - 8, k.y - 6, k.w + 16, k.h + 16, 8); c.fill();
    c.fillStyle = "#FFFFFF"; rr(c, k.x - 9, k.y - 9, k.w + 18, k.h + 18, 8); c.fill();
    c.fillStyle = "#EEE"; rr(c, k.x - 14, k.y + k.h + 4, k.w + 28, 9, 4); c.fill();
    // striped awning
    const ax = k.x - 22, aw = k.w + 44, ay = k.y - 44;
    for (let i = 0; i < 10; i++) {
      c.fillStyle = i % 2 ? "#FFFFFF" : "#E8453C";
      c.beginPath(); c.moveTo(ax + (i * aw) / 10, ay); c.lineTo(ax + ((i + 1) * aw) / 10, ay); c.lineTo(ax + ((i + 1) * aw) / 10 + 3, ay + 34); c.lineTo(ax + (i * aw) / 10 + 3, ay + 34); c.closePath(); c.fill();
    }
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "#FFFFFF" : "#E8453C"; c.beginPath(); c.arc(ax + ((i + 0.5) * aw) / 10 + 3, ay + 34, aw / 20, 0, Math.PI); c.fill(); }
    c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(ax, ay, aw, 4);
    door(c, 150, 60, 104, "#E8743C", { arch: true });
    steps(c, 150, 76, 1);
    plate(c, "KITCHEN", 150, -128, 12, "#2F9C86", "#FFFFFF");
    // herb planter
    c.fillStyle = "#9A6A44"; rr(c, 84, -30, 36, 30, 4); c.fill();
    c.fillStyle = "#4DAF5B"; [[92, -34], [102, -40], [112, -34]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); });
  };

  // =====================================================================
  // MATH BLASTER ACADEMY
  // =====================================================================
  B.academy = (c) => {
    const W = "#F2F6FF", NAVY = "#1E2A5A";
    // roof deck
    c.fillStyle = lin(c, 0, -262, 0, -170, ["#DCE4F5", "#B9C5DE"]);
    rr(c, -200, -262, 400, 100, 14); c.fill();
    // dome
    c.save(); c.translate(0, -214);
    c.fillStyle = "#1E2A5A"; ell(c, 0, 8, 104, 22); c.fill();
    c.beginPath(); c.moveTo(-96, 6); c.bezierCurveTo(-96, -118, 96, -118, 96, 6); c.closePath();
    c.fillStyle = rad(c, -30, -70, 6, 0, -30, 120, ["#FFFFFF", "#D9E3F5", "#9AAACB"]); c.fill();
    c.strokeStyle = "rgba(30,42,90,.18)"; c.lineWidth = 2;
    [-50, 0, 50].forEach((x) => { c.beginPath(); c.moveTo(x, 6); c.quadraticCurveTo(x * 0.6, -70, 0, -84); c.stroke(); });
    // telescope slit
    c.fillStyle = "#1E2A5A";
    c.beginPath(); c.moveTo(-14, 4); c.lineTo(-10, -84); c.lineTo(10, -84); c.lineTo(14, 4); c.closePath(); c.fill();
    c.fillStyle = "#6FE3FF"; c.fillRect(-4, -76, 8, 70);
    c.restore();
    // main body
    wall(c, -190, 190, 172, W, { foundation: "#2B3A70" });
    // navy band + glowing strips
    c.fillStyle = NAVY; c.fillRect(-190, -172, 380, 26);
    c.fillStyle = "#58E1FF"; c.fillRect(-190, -148, 380, 4); c.fillRect(-190, -16, 380, 3);
    text(c, "ACADEMY", 0, -159, 17, "#FFFFFF", { weight: 700 });
    // porthole windows
    [-140, -82, 82, 140].forEach((x) => {
      c.fillStyle = NAVY; c.beginPath(); c.arc(x, -96, 25, 0, TAU); c.fill();
      c.fillStyle = "#C7D2EA"; c.beginPath(); c.arc(x, -96, 21, 0, TAU); c.fill();
      glass(c, x - 17, -113, 34, 34, { round: true, glass: ["#C9F6FF", "#63C8F2", "#2F7FD6"] });
    });
    // sliding glass door
    c.fillStyle = NAVY; rr(c, -44, -124, 88, 124, 10); c.fill();
    glass(c, -38, -118, 36, 118, { glass: ["#C9F6FF", "#63C8F2", "#2F7FD6"] });
    glass(c, 2, -118, 36, 118, { glass: ["#C9F6FF", "#63C8F2", "#2F7FD6"] });
    c.fillStyle = "#58E1FF"; rr(c, -48, -132, 96, 6, 3); c.fill();
    // big × emblem
    c.fillStyle = "#FF5C8A"; c.beginPath(); c.arc(0, -196, 16, 0, TAU); c.fill();
    text(c, "×", 0, -197, 26, "#FFFFFF", { weight: 700 });
  };

  // =====================================================================
  // ROSENBERG ARCADE
  // =====================================================================
  B.arcade = (c) => {
    const W = "#5B3FA8";
    c.fillStyle = lin(c, 0, -250, 0, -170, ["#3E2A7A", "#2A1C57"]);
    rr(c, -224, -240, 448, 80, 12); c.fill();
    wall(c, -214, 214, 176, W, { foundation: "#2A1C57" });
    // checker base
    for (let i = 0; i < 27; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? "#FFFFFF" : "#1E1440"; c.fillRect(-214 + i * 16, -40 + j * 14, 16, 14); }
    // big sign board
    c.fillStyle = "#1E1440"; rr(c, -180, -250, 360, 64, 16); c.fill();
    c.strokeStyle = "#FF5CC8"; c.lineWidth = 4; rr(c, -174, -244, 348, 52, 12); c.stroke();
    text(c, "ROSENBERG ARCADE", 0, -217, 30, "#FFFFFF", { weight: 700, stroke: "#FF5CC8", strokeW: 5 });
    // windows full of glowing screens
    [-160, 104].forEach((x) => {
      c.fillStyle = "#1E1440"; rr(c, x - 4, -142, 64, 76, 8); c.fill();
      c.fillStyle = "#130D2E"; rr(c, x, -138, 56, 68, 6); c.fill();
      ["#5CFFD2", "#FFD23F", "#FF5C8A"].forEach((col, i) => { c.fillStyle = col; rr(c, x + 6 + i * 17, -128, 12, 16, 2); c.fill(); });
      glass(c, x, -138, 56, 68, { glass: ["rgba(255,255,255,.12)", "rgba(255,255,255,.04)", "rgba(255,255,255,.1)"] });
    });
    // door
    c.fillStyle = "#1E1440"; rr(c, -46, -134, 92, 134, 12); c.fill();
    glass(c, -38, -126, 36, 126, { glass: ["#6A4FD0", "#3B2A8A", "#241864"] });
    glass(c, 2, -126, 36, 126, { glass: ["#6A4FD0", "#3B2A8A", "#241864"] });
    c.fillStyle = "#5CFFD2"; rr(c, -52, -144, 104, 8, 4); c.fill();
  };

  // A tidy "coming soon" building for future games. o: { w, h, wall, roof, label, icon, flat }
  B.futureBuilding = (c, o) => {
    const w = o.w || 260, h = o.h || 130, hw = w / 2;
    if (o.flat) {
      c.fillStyle = lin(c, 0, -h - 70, 0, -h, [shade(o.roof, 0.2), shade(o.roof, -0.1)]);
      rr(c, -hw - 10, -h - 64, w + 20, 70, 10); c.fill();
      wall(c, -hw, hw, h, o.wall, { brick: o.brick, foundation: shade(o.wall, -0.4) });
    } else {
      wall(c, -hw, hw, h, o.wall, { brick: o.brick, siding: !o.brick, trim: "#FFFFFF" });
      hipRoof(c, -hw, hw, -h, o.rise || 90, o.roof, { inset: o.rise ? o.rise * 0.7 : 70 });
    }
    // big windows
    [-hw + 30, hw - 30 - 54].forEach((x) => windowUnit(c, x, -h + 34, 54, 48, { frame: "#FFFFFF" }));
    // mysterious door with a glowing ?
    c.fillStyle = "rgba(40,30,20,.25)"; rr(c, -40, -104, 80, 104, 12); c.fill();
    c.fillStyle = "#FFFFFF"; rr(c, -38, -102, 76, 102, 12); c.fill();
    c.fillStyle = lin(c, 0, -96, 0, 0, ["#3A3F6E", "#23264A"]); rr(c, -31, -95, 62, 95, 30); c.fill();
    c.fillStyle = "rgba(255,210,63,.25)"; c.beginPath(); c.arc(0, -56, 24, 0, TAU); c.fill();
    text(c, "?", 0, -54, 38, "#FFD23F", { weight: 700 });
    if (o.label) plate(c, o.label, 0, -h + 12, 14, o.labelBg || shade(o.roof, -0.2), "#FFFFFF", { r: 8 });
  };

  // Raceway pit garage
  B.garage = (c) => {
    wall(c, -120, 120, 120, "#E9ECF2", { foundation: "#555C6E" });
    c.fillStyle = lin(c, 0, -176, 0, -120, ["#E8453C", "#B8302A"]); rr(c, -130, -168, 260, 56, 8); c.fill();
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? "#FFFFFF" : "#1E2130"; c.fillRect(-120 + i * 15, -120 + j * 8, 15, 8); }
    c.fillStyle = "#C7CCD8"; rr(c, -80, -96, 160, 96, 4); c.fill();
    c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 2;
    for (let y = -84; y < 0; y += 12) { c.beginPath(); c.moveTo(-78, y); c.lineTo(78, y); c.stroke(); }
    text(c, "PIT 1", 0, -142, 24, "#FFFFFF", { weight: 700 });
  };

  // Winter Mountain gondola station
  B.gondola = (c) => {
    wall(c, -110, 110, 110, "#8A5A3A", { foundation: "#5A3A26" });
    c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 2;
    for (let y = -100; y < -10; y += 14) { c.beginPath(); c.moveTo(-110, y); c.lineTo(110, y); c.stroke(); }
    gable(c, -124, 124, -110, -196, "#9A6A48", "#2F5FA8");
    // snow on the roof
    c.fillStyle = "#FFFFFF";
    c.beginPath(); c.moveTo(-100, -120); c.lineTo(0, -186); c.lineTo(100, -120); c.lineTo(80, -118); c.lineTo(0, -172); c.lineTo(-80, -118); c.closePath(); c.fill();
    // bull wheel opening
    c.fillStyle = "#2B2F3A"; rr(c, -60, -92, 120, 92, 10); c.fill();
    c.strokeStyle = "#C7CCD8"; c.lineWidth = 5; c.beginPath(); c.arc(0, -52, 28, 0, TAU); c.stroke();
    c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.beginPath(); c.moveTo(0, -52); c.lineTo(Math.cos(a) * 28, -52 + Math.sin(a) * 28); c.stroke(); }
  };

  // Cave for Adventure Woods
  B.cave = (c) => {
    c.beginPath();
    c.moveTo(-140, 0); c.bezierCurveTo(-150, -110, -80, -170, 0, -168); c.bezierCurveTo(90, -170, 150, -110, 140, 0); c.closePath();
    c.fillStyle = lin(c, -140, -170, 140, 0, ["#B8B2A8", "#8E877D", "#6B645B"]); c.fill();
    // moss + highlights
    c.fillStyle = "#6FAE52"; ell(c, -40, -160, 60, 14); c.fill(); ell(c, 60, -150, 40, 10); c.fill();
    c.fillStyle = "rgba(255,255,255,.18)"; ell(c, -60, -110, 30, 10, -0.5); c.fill();
    // mouth
    c.beginPath(); c.moveTo(-58, 0); c.bezierCurveTo(-60, -80, -30, -104, 0, -104); c.bezierCurveTo(30, -104, 60, -80, 58, 0); c.closePath();
    c.fillStyle = rad(c, 0, -30, 5, 0, -40, 90, ["#050608", "#1B1D24", "#2E3038"]); c.fill();
    [-120, 112].forEach((x) => { c.save(); c.translate(x, 4); A.rock(c, 1.1); c.restore(); });
  };

  // Water World gate arch
  B.waterGate = (c, open) => {
    [-150, 150].forEach((x) => {
      c.fillStyle = lin(c, x - 22, 0, x + 22, 0, ["#3CC3E8", "#1E8FC4"]); rr(c, x - 22, -200, 44, 200, 12); c.fill();
      c.fillStyle = "#FFFFFF"; for (let y = -180; y < -10; y += 30) { rr(c, x - 22, y, 44, 8, 4); c.fill(); }
    });
    c.fillStyle = lin(c, 0, -270, 0, -190, ["#5AD5F5", "#1E8FC4"]);
    c.beginPath(); c.moveTo(-180, -190);
    for (let i = 0; i <= 8; i++) c.quadraticCurveTo(-180 + (i - 0.5) * 45, -258 - (i % 2) * 14, -180 + i * 45, -236);
    c.lineTo(180, -190); c.closePath(); c.fill();
    text(c, "WATER WORLD", 0, -222, 32, "#FFFFFF", { weight: 700, stroke: "#156A99", strokeW: 6 });
    if (open) {
      // gates swung open, with a welcome plate for the slide game
      [-1, 1].forEach((k) => {
        c.save(); c.translate(k * 128, 0); c.scale(k * 0.35, 1);
        c.fillStyle = "#EAF6FF";
        for (let x = 0; x <= 126; x += 18) { rr(c, -x - 3, -150, 6, 150, 3); c.fill(); }
        rr(c, -130, -154, 130, 8, 4); c.fill(); rr(c, -130, -70, 130, 8, 4); c.fill();
        c.restore();
      });
      plate(c, "OPEN!", 0, -170, 16, "#2EB872", "#FFFFFF");
      return;
    }
    // gate bars
    c.fillStyle = "#EAF6FF";
    for (let x = -126; x <= 126; x += 18) rr(c, x - 3, -150, 6, 150, 3), c.fill();
    c.fillStyle = "#EAF6FF"; rr(c, -130, -154, 260, 8, 4); c.fill(); rr(c, -130, -70, 260, 8, 4); c.fill();
    // chain + lock
    c.strokeStyle = "#8A93A8"; c.lineWidth = 4; c.beginPath(); c.moveTo(-20, -86); c.quadraticCurveTo(0, -60, 20, -86); c.stroke();
    A.prop.lockBadge(c, 0, -62, 1);
  };

  // Water World slide towers (behind the fence)
  B.slides = (c) => {
    c.fillStyle = "#E9E2D6"; rr(c, -30, -250, 60, 250, 8); c.fill();
    c.fillStyle = "#F2C230"; rr(c, -44, -266, 88, 22, 8); c.fill();
    const tube = (col, pts, w) => {
      c.lineCap = "round"; c.lineJoin = "round";
      const path = () => RW.layout.smoothPath(c, pts);
      c.strokeStyle = shade(col, -0.25); c.lineWidth = w + 6; path(); c.stroke();
      c.strokeStyle = col; c.lineWidth = w; path(); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = w * 0.25; path(); c.stroke();
    };
    tube("#FF5C8A", [[20, -250], [120, -220], [60, -170], [150, -120], [90, -60], [170, -10]], 26);
    tube("#2EB872", [[-20, -250], [-110, -200], [-50, -140], [-140, -80], [-120, -10]], 26);
    tube("#FFB020", [[0, -250], [30, -180], [-20, -110], [10, -40], [0, -4]], 22);
  };
})();
