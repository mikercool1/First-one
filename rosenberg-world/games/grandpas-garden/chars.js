// Grandpa's Garden: character art.
// The character rig from Rosenberg World (rosenberg-world/js/art.js), trimmed to the four kids and
// Grandpa Simon so everyone looks exactly the same as in the other Rosenberg games.
// Everything draws at a local origin with the "feet" at (0, 0) and up being negative y.

window.RW = window.RW || {};

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
  // One rig draws Reuben, Jonah, Ellie, Max and Grandpa Simon.
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
      id: "ellie", name: "Ellie", age: 3, tag: "Tiny Explorer", color: "#E8559B",
      L: 12, T: 17, R: 21, bw: 25, belly: 1.1, legW: 8, armW: 7, stride: 14,
      skin: "#FFE1CF", hair: "#5B2330", hairStyle: "pigtails", bow: "#E8559B",
      outfit: "dress", shirt: "#F28AA8",
      legs: [[0, 0.72, "#FFE1CF"], [0.72, 1, "#FFFFFF"]], shoe: "#FF9EBB", shoeAccent: "#D9678A",
    },
    // Grandpa matches Ariel's Passover Cookout.
    max: {
      id: "max", name: "Max", tag: "Spoon Bandit", color: "#F07C4A", L: 15, T: 18, R: 18, bw: 24, belly: 1.15, legW: 8.5, armW: 7, stride: 15,
      skin: "#F8D4BA", hair: "#A8713D", hairStyle: "curly", curl: true,
      outfit: "shirt", shirt: "#F9C74F", pattern: "hstripe", patternCol: "#F07C4A",
      legs: [[0, 0.4, "#5A86C8"], [0.4, 0.82, "#F8D4BA"], [0.82, 1, "#FFFFFF"]], shoe: "#FFFFFF", shoeAccent: "#8FB9E6", prop: "spoon",
    },
    simon: {
      id: "simon", name: "Simon", L: 35, T: 39, R: 17.5, bw: 36, belly: 1.25, legW: 10.5, armW: 9, stride: 7,
      skin: "#ECC4A4", hair: "#3E2E22", hairStyle: "side", glasses: true, neckphones: true,
      outfit: "shirt", shirt: "#8C7A5E", collar: "#9FB6D6",
      legs: [[0, 1, "#5E5A52"]], shoe: "#3E2C22", shoeAccent: "#3E2C22", prop: "radio",
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
    reach: (pt) => ({ armA: [2.5, 0.5], legA: [0.2, -0.1], mouth: "open", hop: Math.sin(Math.min(1, pt) * Math.PI) * 6 }),
    cheer: (pt, t) => ({ armA: [2.7 + Math.sin(t * 14) * 0.25, 2.7 - Math.sin(t * 14) * 0.25], mouth: "open", hop: Math.abs(Math.sin(t * 9)) * 5 }),
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

    // long hair hangs behind the body, so it goes down first
    if (s.hairStyle === "long" && !back) {
      c.save(); c.translate(0, hipY - T - R * 0.72); c.rotate(P.headTilt || 0);
      hairBack(c, s, R, 0, back, t);
      c.restore();
    }
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
      const adult = !!s.dressLen;
      const hw = bw * (adult ? 0.42 : 0.36), flare = bw * (adult ? 0.72 : 0.62);
      const hem = bot + 4 + (s.dressLen || 0) * s.L;
      c.moveTo(-hw, top + 3);
      c.quadraticCurveTo(0, top - 3, hw, top + 3);
      c.quadraticCurveTo(hw + 3, top + T * (adult ? 0.7 : 0.4), flare, hem);
      c.quadraticCurveTo(0, hem + 6, -flare, hem);
      c.quadraticCurveTo(-hw - 3, top + T * (adult ? 0.7 : 0.4), -hw, top + 3);
      c.closePath();
      c.fillStyle = lin(c, -flare, top, flare, hem, [shade(s.shirt, 0.25), s.shirt, shade(s.shirt, -0.22)]);
      c.fill();
      c.clip();
      if (!adult) {
        // soft ruffle hem
        c.fillStyle = "rgba(255,255,255,.28)";
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * flare * 0.3, bot + 4, 3.2, 0, TAU); c.fill(); }
      }
      if (s.pattern === "labcoat") {
        c.strokeStyle = "rgba(120,140,170,.45)"; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(0, top + 9); c.lineTo(0, hem); c.stroke();
        c.fillStyle = "rgba(120,140,170,.25)"; rr(c, -hw + 2, hipY - 2, 8, 7, 2); c.fill(); rr(c, hw - 10, hipY - 2, 8, 7, 2); c.fill();
      }
      if (s.pattern === "floral") {
        [[-9, 0.5], [6, 0.7], [-4, 1.0], [10, 1.15], [-11, 1.35], [3, 1.45]].forEach(([fx, fy]) => {
          const y = top + T * fy;
          c.fillStyle = "rgba(255,255,255,.85)";
          for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.beginPath(); c.arc(fx + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.2, 0, TAU); c.fill(); }
          c.fillStyle = "#F2C94C"; c.beginPath(); c.arc(fx, y, 0.9, 0, TAU); c.fill();
        });
      }
      c.strokeStyle = adult ? "rgba(255,255,255,.12)" : "rgba(150,50,80,.22)"; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-3, top + T * 0.4); c.quadraticCurveTo(-5, top + T * 0.8, -4, hem); c.moveTo(5, top + T * 0.45); c.quadraticCurveTo(7, top + T * 0.85, 6, hem); c.stroke();
      c.restore();
      if (s.belt) { c.fillStyle = s.belt; rr(c, -hw - 1, hipY - 5, hw * 2 + 2, 4, 2); c.fill(); }
      if (s.pattern === "labcoat") {
        // teal scrubs under the coat, lapels, and a stethoscope
        c.fillStyle = "#3BB8A8"; c.beginPath(); c.moveTo(-6, top + 1); c.lineTo(0, top + 10); c.lineTo(6, top + 1); c.closePath(); c.fill();
        c.strokeStyle = "rgba(120,140,170,.6)"; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-7, top + 1); c.lineTo(-1, top + 14); c.moveTo(7, top + 1); c.lineTo(1, top + 14); c.stroke();
        c.strokeStyle = "#39414F"; c.lineWidth = 1.8;
        c.beginPath(); c.moveTo(-6, top); c.quadraticCurveTo(-9, top + 12, -3, top + 17); c.moveTo(6, top); c.quadraticCurveTo(9, top + 12, 3, top + 17); c.stroke();
        c.fillStyle = "#AEB6C4"; c.beginPath(); c.arc(0, top + 19, 3.2, 0, TAU); c.fill();
      } else if (adult) {
        // V neckline
        c.fillStyle = s.skin; c.beginPath(); c.moveTo(-5, top + 1); c.lineTo(0, top + 9); c.lineTo(5, top + 1); c.closePath(); c.fill();
      } else {
        c.beginPath(); c.moveTo(-bw * 0.22, top + 1); c.quadraticCurveTo(0, top + 6, bw * 0.22, top + 1); c.strokeStyle = "#C9607F"; c.lineWidth = 1.6; c.stroke();
      }
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
    if (s.collar) {
      c.fillStyle = s.collar;
      c.beginPath(); c.moveTo(-8, top); c.lineTo(0, top + 10); c.lineTo(-1, top); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(8, top); c.lineTo(0, top + 10); c.lineTo(1, top); c.closePath(); c.fill();
    }
    if (s.belt) { c.fillStyle = s.belt; rr(c, -wB / 2 + 1, bot - 6, wB - 2, 4, 2); c.fill(); }
    if (s.necklace) { c.strokeStyle = s.necklace; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-6, top); c.quadraticCurveTo(0, top + 8, 6, top); c.stroke(); }
    if (s.neckphones && !back) {
      c.strokeStyle = "#2B2B33"; c.lineWidth = 3; c.beginPath(); c.arc(0, top - 1, 11, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
      c.fillStyle = "#B8323A"; rr(c, -15, top - 2, 6, 9, 3); c.fill(); rr(c, 9, top - 2, 6, 9, 3); c.fill();
    }
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
    // hair behind head (long hair was already drawn behind the body)
    if (!(s.hairStyle === "long" && !back)) hairBack(c, s, R, fs, back, t);
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
      if (s.lashes && blink > 0.5) {
        c.strokeStyle = "#2A1D18"; c.lineWidth = R * 0.05; c.lineCap = "round";
        [[fx - ex2, -1], [fx + ex2, 1]].forEach(([x, k]) => { c.beginPath(); c.moveTo(x + k * R * 0.1, ey - R * 0.12); c.lineTo(x + k * R * 0.2, ey - R * 0.2); c.stroke(); });
      }
      if (s.stubble) {
        c.fillStyle = "rgba(60,40,30,.16)";
        c.beginPath(); c.ellipse(fx * 0.6, R * 0.55, R * 0.62, R * 0.36, 0, 0, Math.PI); c.fill();
      }
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
        c.strokeStyle = s.lip || "#8C2F39"; c.lineWidth = R * (s.lip ? 0.09 : 0.075); c.lineCap = "round";
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
      const sw = Math.sin(t * 3 + 1) * 0.12;
      [-1, 1].forEach((k) => {
        c.save();
        c.translate(k * R * 0.9, -R * 0.86);
        c.rotate(-k * (2.05 + sw));
        c.beginPath(); c.moveTo(-R * 0.16, 0); c.quadraticCurveTo(-R * 0.42, R * 0.4, -R * 0.3, R * 0.72);
        c.lineTo(-R * 0.12, R * 0.58); c.lineTo(0, R * 0.8); c.lineTo(R * 0.12, R * 0.6); c.lineTo(R * 0.3, R * 0.74);
        c.quadraticCurveTo(R * 0.42, R * 0.4, R * 0.16, 0); c.closePath();
        c.fillStyle = rad(c, 0, R * 0.3, 1, 0, R * 0.3, R * 0.7, ["#8A4250", h]); c.fill();
        c.strokeStyle = shade(h, -0.35); c.lineWidth = 1.4; c.stroke();
        c.strokeStyle = "rgba(255,200,210,.25)"; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-R * 0.06, R * 0.12); c.quadraticCurveTo(-R * 0.14, R * 0.4, -R * 0.08, R * 0.62); c.stroke();
        c.restore();
      });
    } else if (hs === "long") {
      const len = s.hairLen || 1.4;
      c.fillStyle = lin(c, 0, -R, 0, R * len, [shade(h, 0.12), h, shade(h, -0.22)]);
      c.beginPath(); c.moveTo(-R * 1.02, -R * 0.15);
      c.bezierCurveTo(-R * 1.2, R * 0.8, -R * 1.08, R * (len - 0.6), -R * 0.82, R * len);
      c.quadraticCurveTo(0, R * (len + 0.12), R * 0.82, R * len);
      c.bezierCurveTo(R * 1.08, R * (len - 0.6), R * 1.2, R * 0.8, R * 1.02, -R * 0.15);
      c.closePath(); c.fill();
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
      c.fillStyle = rad(c, 0, -R * 0.8, 1, 0, -R * 0.8, R * 1.1, ["#8A4250", h]);
      c.beginPath();
      if (back) { c.arc(0, 0, R * 1.04, Math.PI * 0.85, Math.PI * 2.15); c.quadraticCurveTo(0, R * 0.7, -R * 0.9, R * 0.45); c.closePath(); c.fill(); }
      else {
        // fringe outline (from the Backyard Baseball Ellie), nudged toward the facing side
        const pts = [[-1.06, 0.32], [-1.14, -0.4], [-0.84, -1.0], [-0.2, -1.22], [0.48, -1.12], [0.95, -0.76], [1.1, -0.26], [1.02, -0.14], [0.82, -0.2], [0.62, -0.15], [0.42, -0.21], [0.22, -0.15], [0.02, -0.21], [-0.18, -0.15], [-0.4, -0.21], [-0.62, -0.13], [-0.8, 0.38]]
          .map(([x, y]) => [x * R + (y > -0.3 ? fx * 0.25 : 0), y * R]);
        const n = pts.length;
        const mid = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
        const m0 = mid(n - 1);
        c.moveTo(m0[0], m0[1]);
        for (let i = 0; i < n; i++) { const m = mid(i); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
        c.closePath(); c.fill();
        c.strokeStyle = shade(h, -0.35); c.lineWidth = 1.4; c.stroke();
        c.strokeStyle = "rgba(255,200,210,.22)"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-R * 0.5, -R * 0.9); c.quadraticCurveTo(R * 0.1, -R * 1.12, R * 0.6, -R * 0.8); c.stroke();
      }
      // pink hair bobbles where the pigtails start
      [-1, 1].forEach((k) => [[0.86, -0.88], [0.98, -0.74]].forEach(([bx, by]) => {
        c.beginPath(); c.arc(k * bx * R, by * R, R * 0.12, 0, TAU);
        c.fillStyle = rad(c, k * bx * R - R * 0.04, by * R - R * 0.04, 0, k * bx * R, by * R, R * 0.12, ["#FF9CC2", "#D63F77"]); c.fill();
      }));
    } else if (hs === "curly") {
      c.fillStyle = hg(-R * 1.2, 0);
      const n = back ? 10 : 8;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (back ? 0.85 : 1.02) + (i / (n - 1)) * Math.PI * (back ? 1.3 : 0.96);
        c.beginPath(); c.arc(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88 - R * 0.05, R * 0.3, 0, TAU); c.fill();
      }
      if (!back) { c.beginPath(); c.arc(0, -R * 0.55, R * 0.6, 0, TAU); c.fill(); }
      else { c.beginPath(); c.arc(0, -R * 0.1, R * 0.85, 0, TAU); c.fill(); }
      if (s.curl) {
        c.save(); c.translate(R * 0.05, -R * 1.25); c.rotate(Math.sin(t * 5) * 0.3);
        c.strokeStyle = shade(h, -0.1); c.lineWidth = R * 0.1; c.lineCap = "round";
        c.beginPath(); c.arc(0, -R * 0.1, R * 0.16, Math.PI * 0.2, Math.PI * 1.7); c.stroke(); c.restore();
      }
    } else if (hs === "side") {
      c.fillStyle = hg(-R * 1.4, R * 0.2);
      c.beginPath();
      if (back) { c.arc(0, 0, R * 1.06, Math.PI * 0.85, Math.PI * 2.15); c.quadraticCurveTo(0, R * 0.55, -R * 0.9, R * 0.4); c.closePath(); c.fill(); }
      else {
        c.moveTo(-R * 1.06, R * 0.2);
        c.bezierCurveTo(-R * 1.2, -R * 0.95, -R * 0.5, -R * 1.42, R * 0.2, -R * 1.3);
        c.bezierCurveTo(R * 0.95, -R * 1.2, R * 1.2, -R * 0.5, R * 1.06, R * 0.22);
        c.bezierCurveTo(R * 0.98, -R * 0.25, R * 0.7, -R * 0.56, R * 0.35, -R * 0.64);
        c.lineTo(-R * 0.25, -R * 0.62);
        c.bezierCurveTo(-R * 0.7, -R * 0.52, -R * 0.96, -R * 0.2, -R * 1.06, R * 0.2);
        c.fill();
        c.strokeStyle = shade(h, -0.35); c.lineWidth = R * 0.05;
        c.beginPath(); c.moveTo(-R * 0.36, -R * 1.24); c.quadraticCurveTo(-R * 0.31, -R * 0.92, -R * 0.27, -R * 0.62); c.stroke();
      }
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
      if (s.swoop && !back) { c.fillStyle = shade(h, 0.12); c.beginPath(); c.moveTo(-R * 0.2, -R * 1.02); c.quadraticCurveTo(R * 0.3, -R * 1.42, R * 0.7, -R * 0.95); c.quadraticCurveTo(R * 0.3, -R * 1.1, -R * 0.2, -R * 1.02); c.fill(); }
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
    } else if (prop === "clipboard") {
      c.rotate(-0.15);
      c.fillStyle = "#B8834E"; rr(c, -8, -14, 16, 20, 2); c.fill();
      c.fillStyle = "#FFFFFF"; c.fillRect(-6, -11, 12, 15);
      c.fillStyle = "#9AA0AE"; for (let i = 0; i < 4; i++) c.fillRect(-4, -8 + i * 3.5, 8, 1.2);
      c.fillStyle = "#C9CDD8"; rr(c, -3.5, -16, 7, 4, 1.5); c.fill();
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
  A.POSES = POSES;
})();
