// Rosenberg World: art. Canvas drawing for characters, creatures and props.
// Everything draws at a local origin with the "feet" at (0, 0) and up being negative y.

(() => {
  const RW = window.RW;
  const A = RW.art = {};
  const TAU = Math.PI * 2;
  const FONT = '"Fredoka", "Baloo 2", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
  A.FONT = FONT;

  // ---------- color ----------
  const shadeCache = new Map();
  function shade(hex, amt) {
    const key = hex + amt;
    let v = shadeCache.get(key);
    if (v) return v;
    let n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    v = "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
    shadeCache.set(key, v);
    return v;
  }
  A.shade = shade;
  A.rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  // ---------- primitives ----------
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  A.rr = rr;
  function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
  A.ell = ell;
  function lin(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s, i) => g.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s));
    return g;
  }
  A.lin = lin;
  function rad(c, x, y, r0, x1, y1, r1, stops) {
    const g = c.createRadialGradient(x, y, r0, x1, y1, r1);
    stops.forEach((s, i) => g.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s));
    return g;
  }
  A.rad = rad;
  // glossy ball fill: light top-left, darker bottom-right
  function gloss(c, x, y, r, col) {
    return rad(c, x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05, [shade(col, 0.35), col, shade(col, -0.25)]);
  }
  A.gloss = gloss;
  // Soft contact shadow. One cached blurry disc, stretched and faded per use.
  let shadowImg = null;
  function shadow(c, x, y, rx, ry, a = 0.22) {
    if (!shadowImg) {
      shadowImg = document.createElement("canvas");
      shadowImg.width = shadowImg.height = 64;
      const g = shadowImg.getContext("2d");
      g.fillStyle = rad(g, 32, 32, 0, 32, 32, 32, [[0, "rgba(30,40,60,1)"], [0.6, "rgba(30,40,60,.7)"], [1, "rgba(30,40,60,0)"]]);
      g.fillRect(0, 0, 64, 64);
    }
    const ga = c.globalAlpha;
    c.globalAlpha = ga * a;
    c.drawImage(shadowImg, x - rx, y - ry, rx * 2, ry * 2);
    c.globalAlpha = ga;
  }
  A.shadow = shadow;
  function text(c, str, x, y, size, color, o = {}) {
    c.font = `${o.weight || 700} ${size}px ${FONT}`;
    c.textAlign = o.align || "center";
    c.textBaseline = o.baseline || "middle";
    if (o.stroke) { c.lineJoin = "round"; c.lineWidth = o.strokeW || size * 0.22; c.strokeStyle = o.stroke; c.strokeText(str, x, y); }
    if (o.shadow) { c.fillStyle = o.shadow; c.fillText(str, x, y + (o.shadowY || size * 0.08)); }
    c.fillStyle = color;
    c.fillText(str, x, y);
  }
  A.text = text;
  function line(c, x0, y0, x1, y1, w, col) {
    c.lineCap = "round"; c.lineWidth = w; c.strokeStyle = col;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }
  A.line = line;
  function star(c, x, y, r, points = 5, inner = 0.5, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i * Math.PI) / points, rr2 = i % 2 ? r * inner : r;
      const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  }
  A.starPath = star;
  // rounded star path (softer points)
  function softStar(c, x, y, r, rot = -Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5, rr2 = i % 2 ? r * 0.5 : r;
      pts.push([x + Math.cos(a) * rr2, y + Math.sin(a) * rr2]);
    }
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const p = pts[i], n = pts[(i + 1) % 10];
      const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2;
      i ? c.quadraticCurveTo(p[0], p[1], mx, my) : c.moveTo(mx, my);
    }
    const p = pts[0], n = pts[1];
    c.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
    c.closePath();
  }
  A.softStar = softStar;

  // A gold Rosenberg Star, the currency.
  A.goldStar = (c, x, y, r, t = 0) => {
    c.save();
    c.translate(x, y);
    const spin = Math.cos(t * 2.4);
    c.scale(0.35 + 0.65 * Math.abs(spin), 1);
    softStar(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.3, -r * 0.4, 0, 0, 0, r * 1.1, ["#FFF7C2", "#FFD23F", "#F29E0C"]);
    c.fill();
    c.lineWidth = r * 0.12; c.strokeStyle = "#D98200"; c.stroke();
    softStar(c, -r * 0.05, -r * 0.08, r * 0.55);
    c.fillStyle = "rgba(255,255,255,.35)"; c.fill();
    c.restore();
  };

  // ---------- sprite cache ----------
  // Static drawings are rendered once to an offscreen canvas and blitted each frame.
  const sprites = new Map();
  A.spriteScale = 2;
  A.sprite = (key, w, h, ox, oy, draw) => {
    const s = A.spriteScale, k = key + "@" + s;
    let sp = sprites.get(k);
    if (!sp) {
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.ceil(w * s)); cv.height = Math.max(1, Math.ceil(h * s));
      const cx = cv.getContext("2d");
      cx.scale(s, s); cx.translate(ox, oy);
      draw(cx);
      sp = { cv, w, h, ox, oy, used: 0 };
      sprites.set(k, sp);
    }
    sp.used = performance.now();
    return sp;
  };
  A.blit = (c, sp, x, y) => c.drawImage(sp.cv, x - sp.ox, y - sp.oy, sp.w, sp.h);
  A.pruneSprites = () => {
    const now = performance.now();
    for (const [k, sp] of sprites) if (now - sp.used > 15000 || !k.endsWith("@" + A.spriteScale)) sprites.delete(k);
  };

  // =====================================================================
  // CHARACTERS
  // One rig draws the three players, the family cameos and Max.
  // =====================================================================
  A.CHARS = {
    reuben: {
      id: "reuben", name: "Reuben", age: 9, tag: "Big Hitter", color: "#1E2B57",
      L: 25, T: 31, R: 22, bw: 38, belly: 1.1, legW: 12, armW: 10, stride: 9,
      skin: "#F8D5BD", hair: "#F2CD5C", hairStyle: "cap", cap: "#1E2B57",
      outfit: "jersey", shirt: "#FAFBFF", pattern: "pinstripe", patternCol: "#23346A", num: "99", numCol: "#1E2B57", trim: "#1E2B57",
      legs: [[0, 0.62, "#EEF0F6"], [0.62, 1, "#1E2B57"]], shoe: "#FFFFFF", shoeAccent: "#1E2B57",
    },
    jonah: {
      id: "jonah", name: "Jonah", age: 6, tag: "Speedy Striker", color: "#5EB4EA",
      L: 22, T: 25, R: 20, bw: 27, belly: 0.94, legW: 9, armW: 8, stride: 10.5,
      skin: "#F4CDB1", hair: "#6E4428", hairStyle: "mop",
      outfit: "jersey", shirt: "#FFFFFF", pattern: "argentina", patternCol: "#74C3F0", num: "10", numCol: "#1B2A4E", trim: "#1B2A4E",
      legs: [[0, 0.38, "#1E2130"], [0.38, 0.8, "#F4CDB1"], [0.8, 1, "#FFFFFF"]], shoe: "#F3F3F3", shoeAccent: "#2EB872",
    },
    ellie: {
      id: "ellie", name: "Ellie", age: 3, tag: "Tiny Explorer", color: "#9B5DE5",
      L: 12, T: 17, R: 21, bw: 25, belly: 1.1, legW: 8, armW: 7, stride: 14,
      skin: "#F9D8C3", hair: "#B07A45", hairStyle: "pigtails", bow: "#E956A8",
      outfit: "dress", shirt: "#9B5DE5",
      legs: [[0, 0.72, "#F9D8C3"], [0.72, 1, "#FFFFFF"]], shoe: "#F58CC0", shoeAccent: "#FFFFFF",
    },
    max: {
      id: "max", name: "Max", L: 15, T: 18, R: 18, bw: 22, legW: 7.5, armW: 6.5, stride: 15,
      skin: "#F6D0B4", hair: "#3B2A20", hairStyle: "curly",
      outfit: "shirt", shirt: "#F0533F", pattern: "hstripe", patternCol: "#FFFFFF",
      legs: [[0, 0.4, "#3D5A9E"], [0.4, 0.8, "#F6D0B4"], [0.8, 1, "#FFFFFF"]], shoe: "#2E6DE8", shoeAccent: "#FFFFFF", prop: "spoon",
    },
    ariel: {
      id: "ariel", name: "Ariel", L: 36, T: 38, R: 17, bw: 32, legW: 10, armW: 8.5, stride: 7,
      skin: "#EFC7A6", hair: "#4A3022", hairStyle: "chef",
      outfit: "apron", shirt: "#3F7FD9", apron: "#FFFFFF",
      legs: [[0, 1, "#39405A"]], shoe: "#2A2A33", shoeAccent: "#2A2A33",
    },
    nana: {
      id: "nana", name: "Nana", L: 32, T: 36, R: 17, bw: 34, legW: 10, armW: 8.5, stride: 6,
      skin: "#F3D2BE", hair: "#D9D9E3", hairStyle: "bun", glasses: true,
      outfit: "shirt", shirt: "#D96C8B", pattern: "cardigan", patternCol: "#F4E9EE",
      legs: [[0, 1, "#6C6A86"]], shoe: "#5A4034", shoeAccent: "#5A4034", prop: "knit",
    },
    ikey: {
      id: "ikey", name: "Ikey", L: 30, T: 34, R: 17, bw: 30, legW: 9.5, armW: 8, stride: 8,
      skin: "#F2CFB3", hair: "#2F2520", hairStyle: "short",
      outfit: "shirt", shirt: "#3FA66A", legs: [[0, 1, "#3B4668"]], shoe: "#EEEEEE", shoeAccent: "#EEEEEE",
    },
    simon: {
      id: "simon", name: "Simon", L: 36, T: 38, R: 17, bw: 32, legW: 10, armW: 8.5, stride: 7.5,
      skin: "#F1CCAE", hair: "#8A5A36", hairStyle: "short", headphones: true,
      outfit: "shirt", shirt: "#F2A33A", legs: [[0, 1, "#4B5570"]], shoe: "#3A3A44", shoeAccent: "#3A3A44", prop: "radio",
    },
    cari: {
      id: "cari", name: "Cari", L: 35, T: 36, R: 17, bw: 30, legW: 9.5, armW: 8, stride: 7.5,
      skin: "#F4D2BA", hair: "#7A4B2E", hairStyle: "long",
      outfit: "shirt", shirt: "#43B5B0", legs: [[0, 1, "#2F3550"]], shoe: "#FFFFFF", shoeAccent: "#FFFFFF",
    },
    michael: {
      id: "michael", name: "Michael", L: 37, T: 39, R: 17, bw: 33, legW: 10.5, armW: 9, stride: 7,
      skin: "#F1CDB1", hair: "#3A2C24", hairStyle: "short",
      outfit: "shirt", shirt: "#5566D8", legs: [[0, 1, "#2B3042"]], shoe: "#2B2B30", shoeAccent: "#FFFFFF", prop: "phone",
    },
    sarah: {
      id: "sarah", name: "Sarah", L: 35, T: 36, R: 17, bw: 30, legW: 9.5, armW: 8, stride: 7.5,
      skin: "#F6D6C0", hair: "#C9974F", hairStyle: "long",
      outfit: "shirt", shirt: "#E86A74", legs: [[0, 1, "#384065"]], shoe: "#F5F5F5", shoeAccent: "#E86A74",
    },
  };

  const POSES = {
    // each returns partial overrides from (pt = pose progress, t = time)
    jump: (pt) => ({ legA: [0.7, -0.4], legBend: 0.5, armA: [2.7, 2.5], mouth: "open" }),
    shoot: (pt) => { const u = Math.min(1, pt * 1.8); return { armA: [1.2 + u * 1.8, 1.1 + u * 1.7], legA: [0.1, -0.1], mouth: "o", lean: -0.05 }; },
    swing: (pt) => {
      if (pt < 0.35) { const u = pt / 0.35; return { armA: [0.6 + u * 0.9, 0.5 + u * 0.9], bat: -0.9 - u * 1.2, lean: -0.1 * u, legA: [0.25, -0.2] }; }
      const u = Math.min(1, (pt - 0.35) / 0.25);
      return { armA: [1.5 - u * 0.2, 1.4 - u * 0.2], bat: -2.1 + u * 3.6, lean: 0.12 * u, legA: [0.35, -0.3], mouth: "open" };
    },
    kick: (pt) => { const u = Math.min(1, pt * 2.2); return { legA: [-0.7 + u * 2.0, -0.15], armA: [-0.5, 1.0], lean: -0.12 * u, mouth: "open" }; },
    sit: () => ({ sit: true, legA: [1.45, 1.35], armA: [0.35, 0.3] }),
    celebrate: (pt, t) => { const s = Math.sin(t * 14); return { armA: [2.4 + s * 0.5, 2.4 - s * 0.5], legA: [0.2 * s, -0.2 * s], mouth: "open", hop: Math.abs(Math.sin(t * 9)) * 7 }; },
    point: (pt) => ({ armA: [2.25, 0.2], legA: [0.25, -0.15], mouth: "smile", lean: -0.06 }),
    look: (pt, t) => ({ lean: 0.35, headTilt: 0.25, legA: [0.3, -0.25], legBend: 0.25, armA: [0.9, 0.7], mouth: "o", crouch: 4 }),
    slide: (pt) => ({ slide: true, legA: [1.5, 1.2], armA: [2.8, 2.0], lean: -0.45, mouth: "open" }),
    wave: (pt, t) => ({ armA: [2.6 + Math.sin(t * 12) * 0.35, 0.15], mouth: "open" }),
    splash: (pt, t) => ({ armA: [1.0 + Math.sin(t * 16) * 0.5, 1.0 - Math.sin(t * 16) * 0.5], lean: 0.2, mouth: "open", crouch: 3 }),
    phone: (pt, t) => ({ armA: [1.75, 0.15], headTilt: 0.2, prop: "phone" }),
    carry: () => ({ armA: [1.25, 1.15], prop: "radio" }),
    knit: (pt, t) => ({ sit: true, legA: [1.45, 1.35], armA: [1.1 + Math.sin(t * 8) * 0.12, 1.0 - Math.sin(t * 8) * 0.12], headTilt: 0.18, prop: "knit" }),
    stir: (pt, t) => ({ armA: [1.25 + Math.sin(t * 7) * 0.25, 0.3], prop: "spoon", headTilt: 0.15 }),
    spoon: (pt, t) => ({ armA: [2.7 + Math.sin(t * 20) * 0.2, null] }),
    fist: (pt, t) => ({ armA: [2.9 - Math.abs(Math.sin(t * 10)) * 0.8, 0.3], mouth: "open" }),
    shrug: () => ({ armA: [1.3, 1.3], mouth: "o" }),
    fall: () => ({ slide: true, legA: [1.7, 1.2], armA: [2.2, 2.6], lean: -1.3, mouth: "o" }),
  };

  // st: { t, move 0..1, side 0..1 (walking sideways vs toward camera), dir 1|-1, back, pose, pt, prop, hold }
  A.drawChar = (c, s, st) => {
    const t = st.t || 0;
    const moving = (st.move || 0) > 0.05;
    const ph = t * (s.stride || 9);
    const sw = moving ? Math.sin(ph) : 0;
    const side = st.side == null ? 1 : st.side;
    const back = !!st.back;
    const P = st.pose && POSES[st.pose] ? POSES[st.pose](st.pt || 0, t) : {};
    const L = s.L, T = s.T, R = s.R, bw = s.bw;

    let legA = P.legA || [sw * 0.6 * side, -sw * 0.6 * side];
    const lift = moving && !P.legA ? [Math.max(0, sw) * 6 * (1 - side), Math.max(0, -sw) * 6 * (1 - side)] : [0, 0];
    let armA = [P.armA && P.armA[0] != null ? P.armA[0] : -sw * 0.7 * side + (1 - side) * 0.12 * (moving ? Math.sin(ph) : 0) + 0.1,
                P.armA && P.armA[1] != null ? P.armA[1] : sw * 0.7 * side + 0.1];
    let bob = moving ? Math.abs(Math.cos(ph)) * 2.6 : Math.sin(t * 2.3) * 0.7;
    if (P.hop) bob += P.hop;
    let hipY = -L + (P.crouch || 0);
    if (P.sit) hipY = -L * 0.45;
    if (P.slide) hipY = -L * 0.35;

    c.save();
    c.scale(st.dir || 1, 1);
    c.translate(0, -bob);
    const lean = P.lean || 0;

    const legCols = s.legs;
    const hx = bw * 0.22 * (1 - side * 0.55);
    const drawLeg = (i) => {
      const a = legA[i];
      const x0 = i === 0 ? hx : -hx, y0 = hipY;
      const len = P.sit || P.slide ? L * 0.95 : L - lift[i] * 0.6;
      const bend = P.legBend || 0;
      const x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len * (1 - bend * 0.3) - lift[i];
      const dark = i === 1 && side > 0.3 ? -0.12 : 0;
      c.lineCap = "round";
      legCols.forEach(([f0, f1, col]) => {
        c.lineWidth = s.legW;
        c.strokeStyle = shade(col, dark);
        c.beginPath();
        c.moveTo(x0 + (x1 - x0) * f0, y0 + (y1 - y0) * f0);
        c.lineTo(x0 + (x1 - x0) * f1, y0 + (y1 - y0) * f1);
        c.stroke();
      });
      // shoe
      const fwd = side > 0.4 ? 1 : 0;
      c.save();
      c.translate(x1 + fwd * 3, y1 + 1);
      c.rotate(P.sit || P.slide ? -0.3 : 0);
      ell(c, 0, 0, s.legW * (0.62 + fwd * 0.25), s.legW * 0.42);
      c.fillStyle = shade(s.shoe, dark); c.fill();
      ell(c, fwd * 1.5, s.legW * 0.2, s.legW * (0.64 + fwd * 0.25), s.legW * 0.18);
      c.fillStyle = shade(s.shoeAccent, dark - 0.05); c.fill();
      c.restore();
    };

    const shY = hipY - T + 5;
    const sx = bw * 0.45 * (1 - side * 0.72);
    const armLen = T * 0.82 + (s.L > 30 ? 6 : 0);
    const handPos = (i) => {
      const a = armA[i];
      const x0 = i === 0 ? sx : -sx;
      return [x0 + Math.sin(a) * armLen, shY + Math.cos(a) * armLen, x0];
    };
    const drawArm = (i) => {
      const [hx2, hy2, x0] = handPos(i);
      const dark = i === 1 && side > 0.3 ? -0.12 : 0;
      c.lineCap = "round";
      c.lineWidth = s.armW;
      // sleeve then skin
      const sleeve = s.outfit === "dress" ? s.shirt : s.shirt;
      const mx = x0 + (hx2 - x0) * 0.38, my = shY + (hy2 - shY) * 0.38;
      c.strokeStyle = shade(s.skin, dark - 0.04);
      c.beginPath(); c.moveTo(mx, my); c.lineTo(hx2, hy2); c.stroke();
      c.strokeStyle = shade(sleeve, dark - 0.04);
      c.lineWidth = s.armW + 2;
      c.beginPath(); c.moveTo(x0, shY); c.lineTo(mx, my); c.stroke();
      ell(c, hx2, hy2, s.armW * 0.62, s.armW * 0.62);
      c.fillStyle = shade(s.skin, dark); c.fill();
    };

    c.save();
    c.translate(0, hipY);
    c.rotate(lean);
    c.translate(0, -hipY);

    // back arm, legs, body, front arm, head
    if (!back) drawArm(1);
    else drawArm(0);
    c.restore();
    drawLeg(1); drawLeg(0);
    c.save();
    c.translate(0, hipY); c.rotate(lean); c.translate(0, -hipY);
    drawTorso(c, s, hipY, T, bw, back);
    const prop = P.prop || st.prop || s.prop;
    if (!back) {
      drawArm(0);
      if (prop) { const [px, py] = handPos(0); drawHeld(c, prop, px, py, P, t, s); }
    } else drawArm(1);
    const headY = hipY - T - R * 0.72;
    c.save();
    c.translate(0, headY);
    c.rotate(P.headTilt || 0);
    drawHead(c, s, st, R, side, back, P, t);
    c.restore();
    c.restore();
    c.restore();
  };

  function drawTorso(c, s, hipY, T, bw, back) {
    const top = hipY - T, bot = hipY + 3;
    const wT = bw * 0.86, wB = bw * (s.belly || 1);
    c.save();
    c.beginPath();
    if (s.outfit === "dress") {
      const hw = bw * 0.36, flare = bw * 0.62;
      c.moveTo(-hw, top + 3);
      c.quadraticCurveTo(0, top - 3, hw, top + 3);
      c.quadraticCurveTo(hw + 3, top + T * 0.4, flare, bot + 4);
      c.quadraticCurveTo(0, bot + 10, -flare, bot + 4);
      c.quadraticCurveTo(-hw - 3, top + T * 0.4, -hw, top + 3);
      c.closePath();
      c.fillStyle = lin(c, -flare, top, flare, bot, [shade(s.shirt, 0.25), s.shirt, shade(s.shirt, -0.22)]);
      c.fill();
      c.clip();
      // soft ruffle hem + tiny white dots
      c.fillStyle = "rgba(255,255,255,.28)";
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * flare * 0.3, bot + 4, 3.2, 0, TAU); c.fill(); }
      c.fillStyle = "rgba(255,255,255,.5)";
      [[-5, top + 9], [4, top + 14], [-2, top + 20], [7, top + 22], [-8, top + 19]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.2, 0, TAU); c.fill(); });
      c.restore();
      // collar
      c.beginPath(); c.ellipse(0, top + 2, bw * 0.22, 3.2, 0, 0, TAU); c.fillStyle = "#FFFFFF"; c.fill();
      return;
    }
    const r = Math.min(10, T * 0.35);
    c.moveTo(-wT / 2 + r, top);
    c.lineTo(wT / 2 - r, top);
    c.quadraticCurveTo(wT / 2, top, wT / 2 + 1, top + r);
    c.quadraticCurveTo(wB / 2 + 2, bot - r * 0.8, wB / 2 - r * 0.6, bot);
    c.lineTo(-wB / 2 + r * 0.6, bot);
    c.quadraticCurveTo(-wB / 2 - 2, bot - r * 0.8, -wT / 2 - 1, top + r);
    c.quadraticCurveTo(-wT / 2, top, -wT / 2 + r, top);
    c.closePath();
    c.fillStyle = lin(c, -wB / 2, top, wB / 2, bot, [shade(s.shirt, 0.15), s.shirt, shade(s.shirt, -0.16)]);
    c.fill();
    c.save();
    c.clip();
    const pc = s.patternCol;
    if (s.pattern === "pinstripe") {
      c.strokeStyle = A.rgba(pc, 0.55); c.lineWidth = 1.1;
      for (let x = -wB / 2; x < wB / 2; x += 5) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.stroke(); }
    } else if (s.pattern === "argentina") {
      c.fillStyle = pc;
      [-0.33, 0, 0.33].forEach((f) => c.fillRect(f * wB - wB * 0.09, top, wB * 0.18, bot - top));
    } else if (s.pattern === "hstripe") {
      c.fillStyle = A.rgba(pc, 0.9);
      for (let y = top + 4; y < bot; y += 7) c.fillRect(-wB, y, wB * 2, 3);
    } else if (s.pattern === "cardigan") {
      c.fillStyle = pc; c.fillRect(-3, top, 6, bot - top);
      c.fillStyle = shade(s.shirt, -0.25);
      for (let y = top + 7; y < bot - 2; y += 8) { c.beginPath(); c.arc(5, y, 1.4, 0, TAU); c.fill(); }
    }
    if (s.outfit === "apron") {
      c.fillStyle = s.apron;
      rr(c, -wT * 0.34, top + 6, wT * 0.68, bot - top, 5); c.fill();
      c.fillStyle = "rgba(0,0,0,.06)"; c.fillRect(-wT * 0.34, top + T * 0.6, wT * 0.68, 2);
    }
    // soft side shading for volume
    c.fillStyle = lin(c, -wB / 2, 0, wB / 2, 0, [[0, "rgba(255,255,255,.18)"], [0.3, "rgba(255,255,255,0)"], [0.75, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.14)"]]);
    c.fillRect(-wB, top, wB * 2, bot - top);
    c.restore();
    c.restore();
    // trim + number
    if (s.trim) {
      c.strokeStyle = s.trim; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-wT * 0.22, top + 0.5); c.quadraticCurveTo(0, top + (back ? 3 : 7), wT * 0.22, top + 0.5); c.stroke();
    }
    if (s.num) {
      const big = back;
      text(c, s.num, big ? 0 : wT * 0.2, top + T * (big ? 0.5 : 0.42), T * (big ? 0.62 : 0.36), s.numCol, { weight: 700, stroke: big ? "#FFFFFF" : null, strokeW: 2.4 });
    }
  }

  function drawHead(c, s, st, R, side, back, P, t) {
    const fs = back ? 0 : side * 0.9;
    const fx = R * 0.22 * fs;
    // neck
    c.fillStyle = shade(s.skin, -0.12);
    rr(c, -R * 0.24, R * 0.5, R * 0.48, R * 0.5, 4); c.fill();
    // hair behind head
    hairBack(c, s, R, fs, back, t);
    // head
    c.beginPath(); c.arc(0, 0, R, 0, TAU);
    c.fillStyle = rad(c, -R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.05, [shade(s.skin, 0.18), s.skin, shade(s.skin, -0.14)]);
    c.fill();
    if (!back) {
      // ears
      const ex = R * 0.95;
      c.fillStyle = shade(s.skin, -0.06);
      if (fs < 0.5) { ell(c, -ex, R * 0.12, R * 0.2, R * 0.26); c.fill(); ell(c, ex, R * 0.12, R * 0.2, R * 0.26); c.fill(); }
      else { ell(c, -R * 0.2, R * 0.1, R * 0.2, R * 0.26); c.fill(); }
      // cheeks
      c.fillStyle = "rgba(255,120,130,.28)";
      ell(c, fx - R * 0.55 + fs * R * 0.1, R * 0.34, R * 0.2, R * 0.13); c.fill();
      ell(c, fx + R * 0.55, R * 0.34, R * 0.2, R * 0.13); c.fill();
      // eyes
      const blink = st.blink ? 0.12 : 1;
      const ex2 = R * 0.34 * (1 - fs * 0.22), ey = R * 0.06;
      [fx - ex2, fx + ex2].forEach((x, i) => {
        c.fillStyle = "#2A1D18";
        ell(c, x, ey, R * 0.13 * (i === 0 ? 1 - fs * 0.15 : 1), R * 0.17 * blink); c.fill();
        if (blink > 0.5) {
          c.fillStyle = "#FFFFFF";
          c.beginPath(); c.arc(x - R * 0.035, ey - R * 0.065, R * 0.055, 0, TAU); c.fill();
          c.beginPath(); c.arc(x + R * 0.045, ey + R * 0.06, R * 0.025, 0, TAU); c.fill();
        }
      });
      if (s.glasses) {
        c.strokeStyle = "#6B4E3D"; c.lineWidth = 1.6;
        [fx - ex2, fx + ex2].forEach((x) => { c.beginPath(); c.arc(x, ey, R * 0.24, 0, TAU); c.stroke(); });
        line(c, fx - ex2 + R * 0.24, ey, fx + ex2 - R * 0.24, ey, 1.4, "#6B4E3D");
      }
      // brows
      c.strokeStyle = shade(s.hair, -0.25); c.lineWidth = R * 0.07; c.lineCap = "round";
      [fx - ex2, fx + ex2].forEach((x) => { c.beginPath(); c.arc(x, ey - R * 0.12, R * 0.15, -2.4, -0.75); c.stroke(); });
      // nose
      c.fillStyle = shade(s.skin, -0.14);
      ell(c, fx + fs * R * 0.12, R * 0.27, R * 0.08, R * 0.06); c.fill();
      // mouth
      const mouth = P.mouth || st.mouth || "smile";
      const mx = fx + fs * R * 0.06, my = R * 0.47;
      if (mouth === "open") {
        c.fillStyle = "#8C2F39";
        c.beginPath(); c.moveTo(mx - R * 0.2, my - R * 0.04); c.quadraticCurveTo(mx, my + R * 0.34, mx + R * 0.2, my - R * 0.04); c.closePath(); c.fill();
        c.fillStyle = "#F37E8A"; ell(c, mx, my + R * 0.12, R * 0.09, R * 0.05); c.fill();
      } else if (mouth === "o") {
        c.fillStyle = "#8C2F39"; ell(c, mx, my + R * 0.04, R * 0.08, R * 0.1); c.fill();
      } else {
        c.strokeStyle = "#8C2F39"; c.lineWidth = R * 0.075; c.lineCap = "round";
        c.beginPath(); c.arc(mx, my - R * 0.1, R * 0.18, 0.5, Math.PI - 0.5); c.stroke();
      }
    }
    hairFront(c, s, R, fs, back, fx, t, st);
    // soft top-left highlight on the whole head
    c.fillStyle = "rgba(255,255,255,.08)";
    ell(c, -R * 0.35, -R * 0.45, R * 0.4, R * 0.28, -0.5); c.fill();
  }

  function hairBack(c, s, R, fs, back, t) {
    const h = s.hair, hs = s.hairStyle;
    c.fillStyle = h;
    if (hs === "pigtails") {
      const sw = Math.sin(t * 6) * 0.15;
      [-1, 1].forEach((k) => {
        if (fs > 0.5 && k === 1 && !back) return;
        c.save();
        c.translate(k * R * 0.92, -R * 0.1);
        c.rotate(k * (0.5 + sw));
        c.fillStyle = rad(c, 0, R * 0.3, 1, 0, R * 0.35, R * 0.5, [shade(h, 0.15), h, shade(h, -0.2)]);
        ell(c, 0, R * 0.38, R * 0.3, R * 0.42); c.fill();
        c.fillStyle = s.bow; ell(c, 0, 0, R * 0.16, R * 0.1); c.fill();
        c.restore();
      });
    } else if (hs === "long") {
      c.fillStyle = lin(c, 0, -R, 0, R * 1.4, [shade(h, 0.1), h, shade(h, -0.2)]);
      rr(c, -R * 1.02, -R * 0.3, R * 2.04, R * 1.7, R * 0.6); c.fill();
    } else if (hs === "cap" && !back) {
      c.fillStyle = h;
      ell(c, -R * 0.82, R * 0.05, R * 0.24, R * 0.3); c.fill();
      if (fs < 0.5) { ell(c, R * 0.82, R * 0.05, R * 0.24, R * 0.3); c.fill(); }
    }
  }

  function hairFront(c, s, R, fs, back, fx, t, st) {
    const h = s.hair, hs = s.hairStyle;
    const hg = (y0, y1) => lin(c, 0, y0, 0, y1, [shade(h, 0.22), h, shade(h, -0.18)]);
    if (hs === "cap") {
      // blond tufts at the back of the neck when seen from behind
      if (back) { c.fillStyle = h; ell(c, 0, R * 0.25, R * 0.8, R * 0.55); c.fill(); }
      c.beginPath();
      c.arc(0, -R * 0.08, R * 1.04, Math.PI, 0);
      c.quadraticCurveTo(R * 1.04, -R * 0.02, R * 0.9, -R * 0.02);
      c.lineTo(-R * 0.9, -R * 0.02);
      c.quadraticCurveTo(-R * 1.04, -R * 0.02, -R * 1.04, -R * 0.08);
      c.closePath();
      c.fillStyle = rad(c, -R * 0.35, -R * 0.8, R * 0.1, 0, -R * 0.3, R * 1.2, [shade(s.cap, 0.35), s.cap, shade(s.cap, -0.3)]);
      c.fill();
      // panel seam + button
      c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(fx * 0.6, -R * 1.1); c.quadraticCurveTo(fx * 0.9, -R * 0.6, fx, -R * 0.05); c.stroke();
      c.fillStyle = shade(s.cap, 0.2); c.beginPath(); c.arc(0, -R * 1.1, R * 0.08, 0, TAU); c.fill();
      if (back) {
        c.fillStyle = shade(s.cap, -0.3); rr(c, -R * 0.3, -R * 0.2, R * 0.6, R * 0.18, 3); c.fill();
      } else {
        text(c, "R", fx * 0.9, -R * 0.52, R * 0.52, "#FFFFFF", { weight: 700 });
        // brim
        const bx = fx * 1.1 + fs * R * 0.5, brx = R * (0.78 - fs * 0.12), bry = R * (0.22 - fs * 0.06);
        ell(c, bx, -R * 0.06, brx, bry);
        c.fillStyle = lin(c, 0, -R * 0.2, 0, R * 0.1, [shade(s.cap, 0.1), shade(s.cap, -0.35)]);
        c.fill();
        // a peek of blond fringe
        c.fillStyle = h;
        ell(c, fx - R * 0.55, R * 0.0, R * 0.18, R * 0.1, 0.3); c.fill();
      }
    } else if (hs === "mop") {
      c.fillStyle = hg(-R * 1.1, 0);
      c.beginPath();
      if (back) { c.arc(0, 0, R * 1.05, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(R * 0.8, R * 0.5); c.quadraticCurveTo(0, R * 0.8, -R * 0.8, R * 0.5); c.closePath(); c.fill(); return; }
      c.arc(0, -R * 0.05, R * 1.06, Math.PI * 0.95, Math.PI * 2.05);
      // fringe zigzag sweeping toward facing side
      const n = 6, y0 = -R * 0.32;
      for (let i = n; i >= 0; i--) {
        const x = -R + (2 * R * i) / n + fx * 0.4;
        c.lineTo(x, y0 + (i % 2 ? R * 0.16 : -R * 0.02) + Math.abs(i - n / 2) * R * -0.03);
      }
      c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.14)";
      ell(c, -R * 0.35, -R * 0.75, R * 0.35, R * 0.14, -0.3); c.fill();
    } else if (hs === "pigtails") {
      c.fillStyle = hg(-R * 1.1, 0);
      c.beginPath();
      if (back) { c.arc(0, 0, R * 1.04, Math.PI * 0.85, Math.PI * 2.15); c.quadraticCurveTo(0, R * 0.7, -R * 0.9, R * 0.45); c.closePath(); c.fill(); }
      else {
        c.arc(0, -R * 0.02, R * 1.05, Math.PI * 0.98, Math.PI * 2.02);
        c.quadraticCurveTo(R * 0.7 + fx * 0.3, -R * 0.62, R * 0.2 + fx * 0.4, -R * 0.38);
        c.quadraticCurveTo(-R * 0.1 + fx * 0.3, -R * 0.6, -R * 0.45 + fx * 0.2, -R * 0.35);
        c.quadraticCurveTo(-R * 0.8, -R * 0.55, -R * 1.05, -R * 0.02);
        c.closePath(); c.fill();
      }
      // bow
      c.save();
      c.translate(R * 0.5, -R * 0.88);
      c.rotate(0.3);
      c.fillStyle = s.bow;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-R * 0.45, -R * 0.35, -R * 0.42, R * 0.2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(R * 0.45, -R * 0.35, R * 0.42, R * 0.2); c.closePath(); c.fill();
      c.fillStyle = shade(s.bow, -0.2); c.beginPath(); c.arc(0, 0, R * 0.1, 0, TAU); c.fill();
      c.restore();
    } else if (hs === "curly") {
      c.fillStyle = hg(-R * 1.2, 0);
      const n = back ? 10 : 8;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (back ? 0.85 : 1.02) + (i / (n - 1)) * Math.PI * (back ? 1.3 : 0.96);
        c.beginPath(); c.arc(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88 - R * 0.05, R * 0.3, 0, TAU); c.fill();
      }
      if (!back) { c.beginPath(); c.arc(0, -R * 0.55, R * 0.6, 0, TAU); c.fill(); }
      else { c.beginPath(); c.arc(0, -R * 0.1, R * 0.85, 0, TAU); c.fill(); }
    } else if (hs === "bun" || hs === "short" || hs === "long") {
      c.fillStyle = hg(-R * 1.1, 0);
      c.beginPath();
      if (back) { c.arc(0, 0, R * 1.04, Math.PI * 0.85, Math.PI * 2.15); c.quadraticCurveTo(0, R * 0.6, -R * 0.9, R * 0.45); c.closePath(); c.fill(); }
      else {
        c.arc(0, -R * 0.04, R * 1.05, Math.PI * 1.0, Math.PI * 2.0);
        c.quadraticCurveTo(R * 0.6 + fx * 0.3, -R * (hs === "short" ? 0.5 : 0.42), fx * 0.3 - R * 0.1, -R * 0.55);
        c.quadraticCurveTo(-R * 0.7, -R * 0.5, -R * 1.05, -R * 0.04);
        c.closePath(); c.fill();
      }
      if (hs === "bun") { c.beginPath(); c.arc(0, -R * 1.05, R * 0.38, 0, TAU); c.fill(); }
      if (s.headphones) {
        c.strokeStyle = "#2B2F3A"; c.lineWidth = 3.2;
        c.beginPath(); c.arc(0, -R * 0.05, R * 1.08, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        c.fillStyle = "#E4473C"; rr(c, -R * 1.2, -R * 0.2, R * 0.34, R * 0.5, 4); c.fill(); rr(c, R * 0.86, -R * 0.2, R * 0.34, R * 0.5, 4); c.fill();
      }
    } else if (hs === "chef") {
      c.fillStyle = s.hair; c.beginPath(); c.arc(0, -R * 0.08, R * 1.02, Math.PI, 0); c.fill();
      c.fillStyle = "#FFFFFF";
      rr(c, -R * 0.85, -R * 1.05, R * 1.7, R * 0.55, 4); c.fill();
      [-0.5, 0, 0.5].forEach((k) => { c.beginPath(); c.arc(k * R, -R * 1.35, R * 0.5, 0, TAU); c.fill(); });
      c.fillStyle = "rgba(0,0,0,.06)"; rr(c, -R * 0.85, -R * 0.7, R * 1.7, R * 0.16, 3); c.fill();
    }
  }

  function drawHeld(c, prop, x, y, P, t, s) {
    c.save();
    c.translate(x, y);
    if (prop === "bat") {
      c.rotate(P.bat != null ? P.bat : -0.5);
      c.fillStyle = lin(c, 0, 0, 0, -48, ["#9B6A3A", "#E2B27A", "#C4894F"]);
      c.beginPath(); c.moveTo(-2, 4); c.lineTo(2, 4); c.lineTo(4.8, -46); c.quadraticCurveTo(0, -52, -4.8, -46); c.closePath(); c.fill();
      c.fillStyle = "#2B2B33"; c.fillRect(-2.5, -4, 5, 8);
    } else if (prop === "spoon") {
      c.rotate(-0.4);
      line(c, 0, 4, 0, -26, 3.2, "#C08A55");
      c.fillStyle = "#D69C60"; ell(c, 0, -30, 5, 7); c.fill();
    } else if (prop === "phone") {
      c.fillStyle = "#1E2230"; rr(c, -5, -9, 10, 17, 2.5); c.fill();
      c.fillStyle = "#7FD4FF"; rr(c, -3.8, -7.5, 7.6, 13, 1.5); c.fill();
    } else if (prop === "radio") {
      c.fillStyle = "#4A5064"; rr(c, -18, -14, 30, 20, 4); c.fill();
      c.fillStyle = "#2E3242"; c.beginPath(); c.arc(-7, -4, 6, 0, TAU); c.fill();
      c.fillStyle = "#F2C94C"; c.fillRect(3, -9, 6, 3);
      line(c, 8, -14, 18, -40, 1.8, "#9AA0B4");
      c.fillStyle = "#E4473C"; c.beginPath(); c.arc(18, -40, 2.6, 0, TAU); c.fill();
    } else if (prop === "knit") {
      c.fillStyle = "#6FB7E9"; c.beginPath(); c.arc(-4, 4, 9, 0, TAU); c.fill();
      c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(-4, 4, 9, i, i + 1.2); c.stroke(); }
      line(c, -12, -6, 6, 10, 1.6, "#C9A56B"); line(c, 6, -6, -12, 10, 1.6, "#C9A56B");
    } else if (prop === "basketball") {
      c.beginPath(); c.arc(0, -6, 9, 0, TAU); c.fillStyle = gloss(c, 0, -6, 9, "#EE7A2C"); c.fill();
      c.strokeStyle = "#7A3410"; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -6); c.lineTo(9, -6); c.moveTo(0, -15); c.lineTo(0, 3); c.stroke();
    }
    c.restore();
  }

  // Head-and-shoulders portrait for the HUD and menus.
  A.portrait = (cv, id, opts = {}) => {
    const s = A.CHARS[id];
    const c = cv.getContext("2d");
    const w = cv.width, h = cv.height;
    c.clearRect(0, 0, w, h);
    if (opts.bg !== false) {
      c.fillStyle = rad(c, w * 0.4, h * 0.3, 2, w / 2, h / 2, w * 0.7, [shade(s.color, 0.55), shade(s.color, 0.15)]);
      c.fillRect(0, 0, w, h);
    }
    c.save();
    const k = (h * 0.95) / (s.R * 2 + s.T + 16);
    c.translate(w / 2, h * 1.02 + (s.L - 12) * k);
    c.scale(k, k);
    A.drawChar(c, s, { t: opts.t || 0, move: 0, side: 0, dir: 1, blink: opts.blink, pose: opts.pose });
    c.restore();
  };

  // =====================================================================
  // CREATURES
  // =====================================================================

  // The giant backyard dog. Side view, facing +x (flip with dir).
  A.drawDog = (c, st) => {
    const t = st.t || 0, moving = (st.move || 0) > 0.05, run = st.run;
    const ph = t * (run ? 16 : 10);
    c.save();
    c.scale(st.dir || 1, 1);
    const gold = "#E3AA5E", light = "#F7D9A6", dark = "#B97A34";
    const bob = moving ? Math.abs(Math.sin(ph)) * 3 : 0;
    const peek = st.pose === "peek" ? 1 : 0;
    c.translate(0, -bob);
    if (peek) c.rotate(-0.55);
    const legs = [[-30, 0], [-18, Math.PI], [24, Math.PI * 0.5], [34, Math.PI * 1.5]];
    const sit = st.pose === "sit";
    // tail
    const wag = Math.sin(t * (st.happy ? 22 : 9)) * 0.5;
    c.save(); c.translate(-44, -54 + (sit ? 14 : 0)); c.rotate(-0.9 + wag);
    c.fillStyle = gold; ell(c, 0, -16, 7, 20); c.fill();
    c.fillStyle = light; ell(c, 0, -30, 5, 7); c.fill();
    c.restore();
    // legs (far pair darker)
    legs.forEach(([x, off], i) => {
      const far = i % 2 === 1;
      const a = moving ? Math.sin(ph + off) * (run ? 0.7 : 0.45) : 0;
      if (sit && x < 0) { c.fillStyle = shade(gold, far ? -0.15 : 0); ell(c, x + 6, -12, 16, 12); c.fill(); return; }
      c.save(); c.translate(x, -30); c.rotate(peek && x > 0 ? -1.4 : a);
      c.fillStyle = shade(gold, far ? -0.18 : 0);
      rr(c, -6, 0, 12, 30, 6); c.fill();
      c.fillStyle = shade(light, far ? -0.12 : 0); ell(c, 1, 29, 8, 5); c.fill();
      c.restore();
    });
    // body
    c.save();
    if (sit) { c.translate(0, 6); c.rotate(-0.3); }
    ell(c, 0, -46, 48, 24);
    c.fillStyle = rad(c, -10, -62, 4, 0, -46, 56, [shade(gold, 0.25), gold, dark]); c.fill();
    c.fillStyle = light; ell(c, 6, -32, 30, 10); c.fill();
    c.restore();
    // head
    const hx = 44, hy = -70 + (sit ? -6 : 0) + (st.pose === "sniff" ? 24 : 0);
    c.fillStyle = shade(gold, -0.05); rr(c, 30, -72 + (sit ? -6 : 0), 20, 34, 8); c.fill(); // neck
    c.beginPath(); c.arc(hx, hy, 22, 0, TAU);
    c.fillStyle = rad(c, hx - 8, hy - 10, 2, hx, hy, 24, [shade(gold, 0.28), gold, dark]); c.fill();
    // snout
    c.fillStyle = light; ell(c, hx + 20, hy + 6, 15, 11); c.fill();
    c.fillStyle = "#2A1D18"; ell(c, hx + 32, hy + 1, 5.5, 4.5); c.fill();
    c.fillStyle = "rgba(255,255,255,.6)"; ell(c, hx + 31, hy - 0.5, 1.8, 1.2); c.fill();
    // mouth / tongue / ball
    if (st.ball) {
      c.beginPath(); c.arc(hx + 26, hy + 16, 9, 0, TAU); c.fillStyle = gloss(c, hx + 26, hy + 16, 9, "#F4F4F0"); c.fill();
      c.strokeStyle = "#D8413A"; c.lineWidth = 1.2; c.beginPath(); c.arc(hx + 20, hy + 16, 7, -1, 1); c.stroke();
    } else if (moving || st.happy) {
      c.fillStyle = "#F07C8A"; rr(c, hx + 16, hy + 12, 9, 14, 4.5); c.fill();
    }
    c.strokeStyle = "#7A4A24"; c.lineWidth = 1.6; c.lineCap = "round";
    c.beginPath(); c.moveTo(hx + 12, hy + 12); c.quadraticCurveTo(hx + 20, hy + 17, hx + 28, hy + 11); c.stroke();
    // eye
    c.fillStyle = "#2A1D18"; ell(c, hx + 7, hy - 5, 4, 5); c.fill();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(hx + 6, hy - 7, 1.5, 0, TAU); c.fill();
    // ear
    const ear = Math.sin(t * (moving ? 12 : 2)) * 0.15;
    c.save(); c.translate(hx - 8, hy - 12); c.rotate(0.35 + ear);
    c.fillStyle = dark; ell(c, 0, 14, 9, 17); c.fill();
    c.restore();
    // collar
    c.fillStyle = "#D8413A"; rr(c, 30, hy + 14, 16, 7, 3); c.fill();
    c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(40, hy + 24, 3.5, 0, TAU); c.fill();
    c.restore();
  };

  // Fart Man: an original hero who flies on, well, rocket power. Faces +x.
  A.drawFartMan = (c, t, s = 1) => {
    c.save();
    c.scale(s, s);
    c.rotate(Math.sin(t * 3) * 0.05);
    // cape
    const fl = Math.sin(t * 14) * 5;
    c.fillStyle = lin(c, -60, 0, 0, 0, ["#5B2BC4", "#8A55F0"]);
    c.beginPath(); c.moveTo(-6, -12); c.quadraticCurveTo(-40, -22 + fl, -70, -8 + fl); c.quadraticCurveTo(-46, 4 - fl, -64, 16 - fl); c.quadraticCurveTo(-30, 10, -4, 6); c.closePath(); c.fill();
    // legs
    c.fillStyle = "#6DCB4B"; rr(c, -42, -4, 34, 13, 6); c.fill();
    c.fillStyle = "#F2C230"; ell(c, -44, 2, 8, 7); c.fill();
    // body
    ell(c, 0, 0, 26, 18); c.fillStyle = gloss(c, 0, 0, 26, "#7ED957"); c.fill();
    // belt
    c.fillStyle = "#F2C230"; c.fillRect(-10, -17, 5, 35);
    // emblem
    c.beginPath(); c.arc(6, -2, 10, 0, TAU); c.fillStyle = "#FFE45C"; c.fill();
    c.lineWidth = 2; c.strokeStyle = "#D19E10"; c.stroke();
    text(c, "F", 6, -1, 13, "#5B2BC4", { weight: 700 });
    // arm forward
    c.fillStyle = "#7ED957"; rr(c, 14, -18, 34, 11, 5.5); c.fill();
    c.fillStyle = "#F2C230"; c.beginPath(); c.arc(50, -13, 7, 0, TAU); c.fill();
    // head
    c.beginPath(); c.arc(34, -24, 15, 0, TAU); c.fillStyle = gloss(c, 34, -24, 15, "#F6D2B7"); c.fill();
    // helmet + goggles
    c.beginPath(); c.arc(34, -28, 15.5, Math.PI * 0.95, Math.PI * 2.05); c.fillStyle = "#7ED957"; c.fill();
    c.fillStyle = "#2B2F3A"; rr(c, 30, -30, 22, 9, 4); c.fill();
    c.fillStyle = "#9BE6FF"; ell(c, 43, -25.5, 5, 3.2); c.fill();
    c.strokeStyle = "#8C2F39"; c.lineWidth = 2; c.beginPath(); c.arc(42, -17, 5, 0.2, Math.PI - 0.6); c.stroke();
    c.restore();
  };

  A.drawRaccoon = (c, t, up) => {
    c.save();
    c.translate(0, (1 - up) * 30);
    const g = "#8D8F9E";
    ell(c, 0, -10, 15, 16); c.fillStyle = gloss(c, 0, -10, 15, g); c.fill();
    // ears
    c.fillStyle = shade(g, -0.2); c.beginPath(); c.arc(-11, -23, 5, 0, TAU); c.arc(11, -23, 5, 0, TAU); c.fill();
    // mask
    c.fillStyle = "#2E2F3A"; rr(c, -14, -15, 28, 9, 4.5); c.fill();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(-6, -11, 3, 0, TAU); c.arc(6, -11, 3, 0, TAU); c.fill();
    c.fillStyle = "#111"; c.beginPath(); c.arc(-6, -11, 1.6, 0, TAU); c.arc(6, -11, 1.6, 0, TAU); c.fill();
    c.fillStyle = "#F2F2F5"; ell(c, 0, -2, 7, 5); c.fill();
    c.fillStyle = "#2E2F3A"; c.beginPath(); c.arc(0, -4, 2, 0, TAU); c.fill();
    // paws on rim, waving
    const w = Math.sin(t * 10) * 0.4;
    c.fillStyle = shade(g, -0.1);
    c.save(); c.translate(-14, 0); c.rotate(-0.4 + w); ell(c, 0, -4, 4, 7); c.fill(); c.restore();
    c.save(); c.translate(14, 0); c.rotate(0.4 - w); ell(c, 0, -4, 4, 7); c.fill(); c.restore();
    c.restore();
  };

  A.drawBird = (c, t, col = "#4C6FE0") => {
    const f = Math.sin(t * 18);
    c.fillStyle = col;
    ell(c, 0, 0, 7, 5); c.fill();
    c.beginPath(); c.arc(6, -3, 4, 0, TAU); c.fill();
    c.fillStyle = "#F2A93B"; c.beginPath(); c.moveTo(9.5, -3.5); c.lineTo(14, -2); c.lineTo(9.5, -1); c.closePath(); c.fill();
    c.fillStyle = shade(col, -0.2);
    c.beginPath(); c.moveTo(-2, -1); c.quadraticCurveTo(-6, -12 * f, 4, -2); c.closePath(); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(7, -4, 1.2, 0, TAU); c.fill();
  };

  A.drawButterfly = (c, t, col) => {
    const f = Math.abs(Math.sin(t * 16));
    c.fillStyle = col;
    c.save(); c.scale(0.3 + f * 0.7, 1);
    ell(c, -5, -3, 6, 5); c.fill(); ell(c, 5, -3, 6, 5); c.fill();
    c.fillStyle = shade(col, 0.3); ell(c, -4, 3, 4, 3.5); c.fill(); ell(c, 4, 3, 4, 3.5); c.fill();
    c.restore();
    c.fillStyle = "#3A2B24"; rr(c, -1, -6, 2, 11, 1); c.fill();
  };

  // Side-view car (cars on the far road). Faces +x.
  A.drawCar = (c, col, t, moving = true) => {
    const b = moving ? Math.sin(t * 20) * 0.6 : 0;
    c.save(); c.translate(0, b);
    c.fillStyle = lin(c, 0, -40, 0, 0, [shade(col, 0.3), col, shade(col, -0.25)]);
    rr(c, -46, -28, 92, 22, 10); c.fill();
    c.beginPath(); c.moveTo(-28, -28); c.quadraticCurveTo(-22, -48, 0, -48); c.quadraticCurveTo(22, -48, 30, -28); c.closePath(); c.fill();
    c.fillStyle = "#BEE7FF";
    c.beginPath(); c.moveTo(-22, -30); c.quadraticCurveTo(-18, -44, -3, -44); c.lineTo(-3, -30); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(2, -30); c.lineTo(2, -44); c.quadraticCurveTo(18, -44, 24, -30); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(-40, -24, 70, 2.5);
    c.fillStyle = "#FFE9A0"; ell(c, 44, -18, 3, 4); c.fill();
    c.restore();
    [-26, 26].forEach((x) => {
      c.fillStyle = "#23252E"; c.beginPath(); c.arc(x, -6, 9, 0, TAU); c.fill();
      c.fillStyle = "#C9CDD8"; c.beginPath(); c.arc(x, -6, 4, 0, TAU); c.fill();
    });
  };

  // Front-view family car in the driveway.
  A.drawCarFront = (c, col, squash = 0) => {
    c.save();
    c.scale(1 + squash * 0.06, 1 - squash * 0.06);
    [-40, 40].forEach((x) => { c.fillStyle = "#23252E"; rr(c, x - 9, -22, 18, 24, 6); c.fill(); });
    c.fillStyle = lin(c, 0, -80, 0, 0, [shade(col, 0.3), col, shade(col, -0.3)]);
    rr(c, -54, -50, 108, 38, 14); c.fill();
    c.beginPath(); c.moveTo(-40, -48); c.quadraticCurveTo(-36, -84, 0, -84); c.quadraticCurveTo(36, -84, 40, -48); c.closePath(); c.fill();
    c.fillStyle = lin(c, 0, -80, 0, -50, ["#DDF3FF", "#8FC8EA"]);
    c.beginPath(); c.moveTo(-32, -50); c.quadraticCurveTo(-29, -76, 0, -76); c.quadraticCurveTo(29, -76, 32, -50); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.moveTo(-22, -52); c.lineTo(-12, -74); c.lineTo(-4, -74); c.lineTo(-14, -52); c.closePath(); c.fill();
    c.fillStyle = "#FFF6D0"; ell(c, -36, -32, 9, 7); c.fill(); ell(c, 36, -32, 9, 7); c.fill();
    c.fillStyle = shade(col, -0.4); rr(c, -18, -30, 36, 10, 5); c.fill();
    c.fillStyle = "#F2F2F2"; rr(c, -14, -18, 28, 8, 2); c.fill();
    text(c, "ROSNBRG", 0, -14, 6, "#333", { weight: 700 });
    c.restore();
  };

  // =====================================================================
  // NATURE
  // =====================================================================
  const TREE_KINDS = {
    round: { leaf: "#5DBB63", dark: "#3E9A4C", light: "#9BDD7C" },
    deep: { leaf: "#3FA36A", dark: "#2B7F52", light: "#78CE8E" },
    blossom: { leaf: "#F4A6C6", dark: "#E07BA6", light: "#FFD2E4" },
    gold: { leaf: "#F2C14E", dark: "#D99A2B", light: "#FFE08A" },
  };
  function drawTreeRaw(c, kind, s, seed) {
    const rnd = RW.util.seeded(seed * 97 + 13);
    if (kind === "pine" || kind === "snowpine") {
      c.fillStyle = "#7A5135"; rr(c, -5 * s, -18 * s, 10 * s, 20 * s, 3 * s); c.fill();
      const layers = 4;
      for (let i = 0; i < layers; i++) {
        const y = -18 * s - i * 24 * s, w = (46 - i * 9) * s;
        c.beginPath();
        c.moveTo(-w, y); c.quadraticCurveTo(0, y + 8 * s, w, y);
        c.quadraticCurveTo(w * 0.3, y - 30 * s, 0, y - 46 * s);
        c.quadraticCurveTo(-w * 0.3, y - 30 * s, -w, y);
        c.fillStyle = lin(c, -w, y - 40 * s, w, y, ["#62C27A", "#2F8F59", "#1F6B45"]);
        c.fill();
        if (kind === "snowpine") { c.fillStyle = "rgba(255,255,255,.9)"; ell(c, 0, y - 36 * s, w * 0.3, 7 * s); c.fill(); }
      }
      return;
    }
    if (kind === "palm") {
      c.strokeStyle = "#A87A4E"; c.lineWidth = 9 * s; c.lineCap = "round";
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(12 * s, -60 * s, 4 * s, -110 * s); c.stroke();
      c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 2 * s;
      for (let y = -10; y > -105; y -= 12) { c.beginPath(); c.moveTo(-4 * s + (y < -60 ? 5 : 3) * s, y * s); c.lineTo(8 * s, y * s - 3); c.stroke(); }
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.55;
        c.save(); c.translate(4 * s, -110 * s); c.rotate(a);
        c.fillStyle = i % 2 ? "#3FA85E" : "#58C06F";
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(26 * s, -14 * s, 56 * s, 8 * s); c.quadraticCurveTo(26 * s, 2 * s, 0, 0); c.fill();
        c.restore();
      }
      c.fillStyle = "#7A5135"; c.beginPath(); c.arc(0, -106 * s, 5 * s, 0, TAU); c.arc(8 * s, -104 * s, 5 * s, 0, TAU); c.fill();
      return;
    }
    const K = TREE_KINDS[kind] || TREE_KINDS.round;
    // trunk
    c.fillStyle = lin(c, -7 * s, 0, 7 * s, 0, ["#9A6B45", "#7A5135", "#5E3C25"]);
    c.beginPath(); c.moveTo(-8 * s, 0); c.quadraticCurveTo(-5 * s, -30 * s, -6 * s, -44 * s); c.lineTo(6 * s, -44 * s); c.quadraticCurveTo(5 * s, -30 * s, 8 * s, 0); c.closePath(); c.fill();
    // canopy: overlapping soft balls
    const blobs = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd();
      blobs.push([Math.cos(a) * 24 * s, -70 * s + Math.sin(a) * 16 * s, (24 + rnd() * 8) * s]);
    }
    blobs.push([0, -84 * s, 28 * s]);
    blobs.push([0, -64 * s, 30 * s]);
    // dark underside
    blobs.forEach(([x, y, r]) => { c.fillStyle = K.dark; c.beginPath(); c.arc(x, y + 4 * s, r, 0, TAU); c.fill(); });
    blobs.sort((a, b) => a[1] - b[1]).reverse();
    blobs.forEach(([x, y, r]) => {
      c.fillStyle = rad(c, x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r, [K.light, K.leaf, K.dark]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    });
    // leaf sparkle
    c.fillStyle = "rgba(255,255,255,.22)";
    for (let i = 0; i < 5; i++) { ell(c, (rnd() - 0.6) * 40 * s, -95 * s + rnd() * 40 * s, 5 * s, 3 * s, -0.5); c.fill(); }
    if (kind === "round" && rnd() < 0.35) {
      c.fillStyle = "#E8453C";
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((rnd() - 0.5) * 50 * s, -60 * s - rnd() * 40 * s, 3.2 * s, 0, TAU); c.fill(); }
    }
  }
  // Trees are cached sprites; sway is a cheap skew at draw time.
  A.tree = (c, kind, s, seed, sway = 0) => {
    const key = `tree:${kind}:${Math.round(s * 10)}:${seed % 3}`;
    const sp = A.sprite(key, 150 * s, 185 * s, 75 * s, 172 * s, (cx) => drawTreeRaw(cx, kind, s, seed % 3));
    if (sway) { c.save(); c.transform(1, 0, sway, 1, 0, 0); A.blit(c, sp, 0, 0); c.restore(); }
    else A.blit(c, sp, 0, 0);
  };

  A.bush = (c, s = 1, flowers = null, seed = 1) => {
    const key = `bush:${Math.round(s * 10)}:${flowers || "-"}:${seed % 3}`;
    const sp = A.sprite(key, 90 * s, 60 * s, 45 * s, 50 * s, (cx) => {
      const rnd = RW.util.seeded(seed * 31 + 7);
      const blobs = [[-18, -14, 16], [18, -14, 16], [0, -22, 20], [-8, -10, 15], [10, -9, 15]];
      blobs.forEach(([x, y, r]) => { cx.fillStyle = "#2F8A48"; cx.beginPath(); cx.arc(x * s, (y + 3) * s, r * s, 0, TAU); cx.fill(); });
      blobs.forEach(([x, y, r]) => {
        cx.fillStyle = rad(cx, (x - r * 0.4) * s, (y - r * 0.5) * s, 1, x * s, y * s, r * s, ["#8FD978", "#4DAF5B", "#2F8A48"]);
        cx.beginPath(); cx.arc(x * s, y * s, r * s, 0, TAU); cx.fill();
      });
      if (flowers) {
        for (let i = 0; i < 7; i++) {
          const x = (rnd() - 0.5) * 52 * s, y = (-28 + rnd() * 22) * s;
          cx.fillStyle = flowers; cx.beginPath(); cx.arc(x, y, 3.4 * s, 0, TAU); cx.fill();
          cx.fillStyle = "#FFF3B0"; cx.beginPath(); cx.arc(x, y, 1.3 * s, 0, TAU); cx.fill();
        }
      }
    });
    A.blit(c, sp, 0, 0);
  };

  A.flowers = (c, seed, w = 60, h = 26, cols = ["#FF6B8B", "#FFD23F", "#FFFFFF", "#B18CFF"]) => {
    const rnd = RW.util.seeded(seed);
    for (let i = 0; i < 12; i++) {
      const x = (rnd() - 0.5) * w, y = (rnd() - 0.5) * h;
      A.line(c, x, y, x, y - 7, 1.6, "#3F9A4E");
      const col = cols[Math.floor(rnd() * cols.length)];
      c.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y - 8 + Math.sin(a) * 2.6, 2.2, 0, TAU); c.fill(); }
      c.fillStyle = "#FFB300"; c.beginPath(); c.arc(x, y - 8, 1.6, 0, TAU); c.fill();
    }
  };

  A.rock = (c, s = 1, col = "#A9B0BE") => {
    c.beginPath();
    c.moveTo(-22 * s, 0); c.quadraticCurveTo(-24 * s, -18 * s, -6 * s, -24 * s); c.quadraticCurveTo(14 * s, -28 * s, 22 * s, -10 * s); c.quadraticCurveTo(26 * s, 0, 18 * s, 2 * s); c.closePath();
    c.fillStyle = lin(c, -20 * s, -26 * s, 20 * s, 0, [shade(col, 0.3), col, shade(col, -0.25)]); c.fill();
    c.fillStyle = "rgba(255,255,255,.25)"; ell(c, -6 * s, -18 * s, 8 * s, 3 * s, -0.3); c.fill();
  };

  // =====================================================================
  // PROPS (small objects). All at local origin, feet at y = 0.
  // =====================================================================
  const P = A.prop = {};

  P.bench = (c) => {
    [-34, 34].forEach((x) => { c.fillStyle = "#3A4252"; rr(c, x - 3, -24, 6, 24, 2); c.fill(); });
    c.fillStyle = lin(c, 0, -26, 0, -16, ["#D9985A", "#A8683A"]);
    rr(c, -42, -26, 84, 9, 3); c.fill();
    c.fillStyle = lin(c, 0, -52, 0, -30, ["#E5A566", "#B87644"]);
    rr(c, -42, -52, 84, 8, 3); c.fill(); rr(c, -42, -41, 84, 8, 3); c.fill();
    c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-40, -51, 80, 2);
  };

  P.lamp = (c, t = 0) => {
    c.fillStyle = "#2F3747"; rr(c, -3, -96, 6, 96, 3); c.fill();
    rr(c, -8, -6, 16, 6, 3); c.fill();
    c.fillStyle = "#3A4458"; rr(c, -11, -112, 22, 18, 6); c.fill();
    c.fillStyle = rad(c, 0, -103, 1, 0, -103, 12, ["#FFFBE0", "#FFE38A"]); rr(c, -7, -109, 14, 12, 4); c.fill();
  };

  // Wooden (or colored) sign on posts. lines: array of strings.
  P.sign = (c, lines, o = {}) => {
    const size = o.size || 22, pad = o.pad || 14;
    c.font = `700 ${size}px ${FONT}`;
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + pad * 2 + (o.extraW || 0);
    const lh = size * 1.1, h = lines.length * lh + pad * 1.3;
    const postH = o.postH == null ? 30 : o.postH;
    const top = -postH - h;
    const board = o.board || "#F7F1E3", edge = o.edge || "#8B5A34", ink = o.ink || "#5A3A22";
    if (postH > 0) {
      [-w * 0.32, w * 0.32].forEach((x) => { c.fillStyle = lin(c, x - 4, 0, x + 4, 0, ["#A06F45", "#7A5135"]); rr(c, x - 4, -postH - 6, 8, postH + 6, 3); c.fill(); });
    }
    c.fillStyle = "rgba(20,30,50,.18)"; rr(c, -w / 2 + 3, top + 5, w, h, 12); c.fill();
    c.fillStyle = edge; rr(c, -w / 2, top, w, h, 12); c.fill();
    c.fillStyle = lin(c, 0, top, 0, top + h, [shade(board, 0.1), board, shade(board, -0.08)]);
    rr(c, -w / 2 + 4, top + 4, w - 8, h - 8, 9); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; rr(c, -w / 2 + 8, top + 6, w - 16, 4, 2); c.fill();
    lines.forEach((l, i) => text(c, l, 0, top + pad * 0.65 + lh * (i + 0.5), size, ink, { weight: 700 }));
    return { w, h, top };
  };

  // A glowing marquee-style sign for game destinations.
  P.marquee = (c, lines, o = {}) => {
    const size = o.size || 30;
    c.font = `700 ${size}px ${FONT}`;
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 44;
    const lh = size * 1.02, h = lines.length * lh + 26;
    const postH = o.postH == null ? 44 : o.postH;
    const top = -postH - h, col = o.color || "#E8453C", col2 = o.color2 || shade(col, -0.3);
    if (postH > 0) [-w * 0.3, w * 0.3].forEach((x) => { c.fillStyle = lin(c, x - 5, 0, x + 5, 0, ["#5A6378", "#343B4B"]); rr(c, x - 5, -postH - 8, 10, postH + 8, 4); c.fill(); });
    c.fillStyle = "rgba(20,30,50,.22)"; rr(c, -w / 2 + 4, top + 7, w, h, 18); c.fill();
    c.fillStyle = lin(c, 0, top, 0, top + h, [shade(col, 0.2), col, col2]);
    rr(c, -w / 2, top, w, h, 18); c.fill();
    c.fillStyle = "rgba(255,255,255,.28)"; rr(c, -w / 2 + 8, top + 5, w - 16, h * 0.32, 12); c.fill();
    // bulbs
    const bulbs = Math.floor(w / 22);
    for (let i = 0; i < bulbs; i++) {
      const x = -w / 2 + 11 + (i * (w - 22)) / (bulbs - 1);
      [top + 7, top + h - 7].forEach((y) => { c.fillStyle = "#FFF4B8"; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); });
    }
    lines.forEach((l, i) => text(c, l, 0, top + 14 + lh * (i + 0.5), size, "#FFFFFF", { weight: 700, shadow: "rgba(0,0,0,.25)" }));
    return { w, h, top };
  };

  P.mailbox = (c, flag = 0) => {
    c.fillStyle = "#6E4A30"; rr(c, -4, -46, 8, 46, 2); c.fill();
    c.fillStyle = lin(c, 0, -76, 0, -46, ["#5C8DF0", "#2E5FCB"]);
    c.beginPath(); c.moveTo(-18, -46); c.lineTo(-18, -66); c.arc(0, -66, 18, Math.PI, 0); c.lineTo(18, -46); c.closePath(); c.fill();
    c.fillStyle = "#1F4AA8"; c.beginPath(); c.arc(0, -66, 12, Math.PI, 0); c.lineTo(12, -50); c.lineTo(-12, -50); c.closePath(); c.fill();
    text(c, "ROSENBERG", 0, -55, 5.5, "#FFFFFF", { weight: 700 });
    c.save(); c.translate(18, -62); c.rotate(-flag * 1.4);
    c.fillStyle = "#6E6E78"; c.fillRect(0, -2, 3, 16);
    c.fillStyle = "#E8453C"; c.fillRect(0, -2, 10, 7);
    c.restore();
  };

  P.trashcan = (c, lid = 0) => {
    c.fillStyle = lin(c, -16, 0, 16, 0, ["#7F8B9E", "#A8B3C4", "#6A7588"]);
    c.beginPath(); c.moveTo(-15, -44); c.lineTo(15, -44); c.lineTo(12, 0); c.lineTo(-12, 0); c.closePath(); c.fill();
    c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 1.5;
    [-6, 0, 6].forEach((x) => { c.beginPath(); c.moveTo(x, -40); c.lineTo(x * 0.8, -4); c.stroke(); });
    c.save(); c.translate(-17, -46); c.rotate(-lid * 1.1);
    c.fillStyle = "#5C6679"; rr(c, 0, -5, 34, 7, 3.5); c.fill();
    c.fillStyle = "#4B5466"; rr(c, 12, -9, 10, 5, 2); c.fill();
    c.restore();
  };

  P.grill = (c, glow = 0) => {
    [-14, 14].forEach((x) => A.line(c, x, 0, x * 0.5, -30, 3, "#2E3442"));
    c.fillStyle = lin(c, 0, -52, 0, -28, ["#474F63", "#1E2330"]);
    c.beginPath(); c.moveTo(-24, -40); c.quadraticCurveTo(-24, -24, 0, -24); c.quadraticCurveTo(24, -24, 24, -40); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-24, -42); c.quadraticCurveTo(-22, -62, 0, -62); c.quadraticCurveTo(22, -62, 24, -42); c.closePath(); c.fill();
    c.fillStyle = `rgba(255,120,40,${0.3 + glow * 0.6})`; c.fillRect(-22, -43, 44, 3);
    c.fillStyle = "#C0C6D4"; c.fillRect(-4, -66, 8, 5);
  };

  P.trampoline = (c, dip = 0) => {
    for (let i = 0; i < 4; i++) { const x = -44 + i * 29; A.line(c, x, 0, x, -18, 3, "#2E3442"); }
    ell(c, 0, -20, 50, 18); c.fillStyle = "#2C8FE3"; c.fill();
    ell(c, 0, -20 + dip * 5, 42, 13 - dip * 2); c.fillStyle = "#1E2533"; c.fill();
    c.fillStyle = "rgba(255,255,255,.08)"; ell(c, -10, -24 + dip * 5, 18, 5); c.fill();
  };

  P.swing = (c, t, occupied = false) => {
    const a = Math.sin(t * 2.2) * 0.25;
    ["#E8453C", "#2C8FE3"].forEach((col, i) => {
      const x0 = -38 + i * 76;
      A.line(c, x0 - 14, 0, x0, -92, 5, col); A.line(c, x0 + 14, 0, x0, -92, 5, col);
    });
    A.line(c, -38, -92, 38, -92, 6, "#F2C230");
    [-16, 16].forEach((x, i) => {
      const aa = i ? -a : a;
      const sx = x + Math.sin(aa) * 60, sy = -92 + Math.cos(aa) * 60;
      A.line(c, x - 7, -92, sx - 7, sy, 1.5, "#555"); A.line(c, x + 7, -92, sx + 7, sy, 1.5, "#555");
      c.fillStyle = "#2E3442"; rr(c, sx - 11, sy - 2, 22, 5, 2); c.fill();
    });
  };

  P.sprinkler = (c, on, t) => {
    c.fillStyle = "#39B54A"; rr(c, -8, -8, 16, 8, 3); c.fill();
    c.fillStyle = "#F2C230"; rr(c, -2, -16, 4, 10, 2); c.fill();
    if (on) {
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + Math.sin(t * 3) * 0.9 + (i - 8) * 0.06;
        const r = 30 + ((t * 120 + i * 17) % 60);
        c.fillStyle = `rgba(150,215,255,${0.9 - r / 110})`;
        c.beginPath(); c.arc(Math.cos(a) * r * 1.4, -16 + Math.sin(a) * r * 0.9 + r * r * 0.004, 2.3, 0, TAU); c.fill();
      }
    }
  };

  P.hoop = (c, t, netShake = 0) => {
    c.fillStyle = lin(c, -5, 0, 5, 0, ["#4A5266", "#2A3040"]); rr(c, -5, -160, 10, 160, 4); c.fill();
    c.fillStyle = "rgba(255,255,255,.9)"; rr(c, -34, -186, 68, 46, 5); c.fill();
    c.strokeStyle = "#E8453C"; c.lineWidth = 3; rr(c, -34, -186, 68, 46, 5); c.stroke();
    c.strokeRect(-12, -168, 24, 18);
    c.fillStyle = "#E8453C"; ell(c, 0, -146, 17, 5); c.fill();
    c.fillStyle = "#FFFFFF"; ell(c, 0, -146, 12, 3); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 1.2;
    const sh = Math.sin(t * 30) * netShake * 3;
    for (let i = 0; i < 5; i++) { const x = -14 + i * 7; c.beginPath(); c.moveTo(x, -145); c.lineTo(x * 0.6 + sh, -124); c.stroke(); }
    c.beginPath(); c.moveTo(-12, -135); c.lineTo(12 + sh, -135); c.moveTo(-9, -127); c.lineTo(9 + sh, -127); c.stroke();
  };

  P.soccerBall = (c, r = 11, spin = 0) => {
    c.beginPath(); c.arc(0, -r, r, 0, TAU); c.fillStyle = gloss(c, 0, -r, r, "#FFFFFF"); c.fill();
    c.fillStyle = "#23252E";
    c.save(); c.translate(0, -r); c.rotate(spin);
    A.starPath(c, 0, 0, r * 0.38, 5, 0.8); c.fill();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.2, 0, TAU); c.fill(); }
    c.restore();
  };
  P.baseball = (c, r = 8) => {
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = gloss(c, 0, 0, r, "#FAF8F2"); c.fill();
    c.strokeStyle = "#D8413A"; c.lineWidth = 1.3;
    c.beginPath(); c.arc(-r * 0.9, 0, r * 0.7, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(r * 0.9, 0, r * 0.7, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
  };
  P.basketball = (c, r = 11) => {
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = gloss(c, 0, 0, r, "#EE7A2C"); c.fill();
    c.strokeStyle = "#7A3410"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
    c.beginPath(); c.arc(-r * 1.2, 0, r * 0.9, -0.8, 0.8); c.stroke();
    c.beginPath(); c.arc(r * 1.2, 0, r * 0.9, Math.PI - 0.8, Math.PI + 0.8); c.stroke();
  };

  P.fenceRun = (c, len, col = "#FFFFFF", h = 44) => {
    const post = shade(col, -0.12);
    c.fillStyle = post;
    rr(c, 0, -h * 0.75, len, 6, 3); c.fill(); rr(c, 0, -h * 0.35, len, 6, 3); c.fill();
    for (let x = 0; x <= len; x += 16) {
      c.fillStyle = lin(c, x, 0, x + 10, 0, [col, shade(col, -0.08)]);
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, -h + 6); c.lineTo(x + 5, -h); c.lineTo(x + 10, -h + 6); c.lineTo(x + 10, 0); c.closePath(); c.fill();
    }
  };

  P.cone = (c) => {
    c.fillStyle = "#FF7A1F"; c.beginPath(); c.moveTo(-10, -2); c.lineTo(0, -32); c.lineTo(10, -2); c.closePath(); c.fill();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(-6.5, -12); c.lineTo(-3.8, -20); c.lineTo(3.8, -20); c.lineTo(6.5, -12); c.closePath(); c.fill();
    c.fillStyle = "#E85F0C"; rr(c, -14, -4, 28, 5, 2); c.fill();
  };

  P.umbrella = (c, col1, col2, t = 0) => {
    A.line(c, 0, 0, 0, -86, 3, "#EDEDED");
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
      c.fillStyle = i % 2 ? col1 : col2;
      c.beginPath(); c.moveTo(0, -96);
      c.lineTo(Math.cos(a0) * 58, -76 + Math.sin(a0) * 4);
      c.quadraticCurveTo(Math.cos((a0 + a1) / 2) * 50, -70, Math.cos(a1) * 58, -76 + Math.sin(a1) * 4);
      c.closePath(); c.fill();
    }
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(0, -97, 3, 0, TAU); c.fill();
  };

  P.lockBadge = (c, x, y, s = 1) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fillStyle = "rgba(30,40,70,.85)"; c.fill();
    c.strokeStyle = "#FFD23F"; c.lineWidth = 3; c.beginPath(); c.arc(0, -4, 6, Math.PI, 0); c.stroke();
    c.fillStyle = "#FFD23F"; rr(c, -8, -4, 16, 12, 3); c.fill();
    c.fillStyle = "rgba(30,40,70,.85)"; c.beginPath(); c.arc(0, 2, 2, 0, TAU); c.fill();
    c.restore();
  };

  // "COMING SOON" ribbon banner
  P.ribbon = (c, label, w = 150, col = "#FF5C8A") => {
    const h = 30;
    c.fillStyle = shade(col, -0.35);
    c.beginPath(); c.moveTo(-w / 2 - 14, 6); c.lineTo(-w / 2 + 4, 6); c.lineTo(-w / 2 + 4, h + 4); c.lineTo(-w / 2 - 14, h + 4); c.lineTo(-w / 2 - 6, h / 2 + 5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(w / 2 + 14, 6); c.lineTo(w / 2 - 4, 6); c.lineTo(w / 2 - 4, h + 4); c.lineTo(w / 2 + 14, h + 4); c.lineTo(w / 2 + 6, h / 2 + 5); c.closePath(); c.fill();
    c.fillStyle = lin(c, 0, 0, 0, h, [shade(col, 0.2), col]);
    rr(c, -w / 2, 0, w, h, 6); c.fill();
    text(c, label, 0, h / 2 + 1, 16, "#FFFFFF", { weight: 700 });
  };
})();
