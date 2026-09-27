// Buckets: the court. A canvas scene with skeletal players, a live arena and effects.
// The game talks to it through window.Court: reset(), shoot(made, timeout, onScore),
// setClock(seconds), setScores(jb, vw).

window.Court = (() => {
  const cv = document.getElementById("cv"), c = cv.getContext("2d");
  const W = 800, H = 500, FLOOR = 440, RIM = { x: 700, y: 200 };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let k = 1;
  function seeded(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- state ----------
  let time = 0, slowUntil = 0, shakeAmt = 0, cheer = 0, cheerTarget = 0;
  // resting camera sits a little closer than the full arena so the players read big
  const BASE_Z = 1.08, BASE_X = 425, BASE_Y = 268;
  const cam = { z: BASE_Z, tz: BASE_Z, x: BASE_X, y: BASE_Y, tx: BASE_X, ty: BASE_Y };
  const fx = { flashes: [], parts: [], rings: [], texts: [] };
  const net = { amp: 0 };
  let clockVal = 10, scores = [0, 0];
  const timers = [];
  function wait(ms) { return new Promise((res) => timers.push({ at: time + ms / 1000, res })); }

  // ---------- players ----------
  const BODY = {
    jb: { f: 1, x: 318, torso: 46, neck: 5, head: 12.5, ua: 25, fa: 23, th: 33, sh: 33, chest: 26, waist: 21, limb: 9.5,
      skin: "#8B5A3C", skinHi: "#B98560", skinLo: "#6A4129", jersey: ["#3279EE", "#1446A6"], trim: "#F58426", num: "11", numCol: "#F58426",
      shoe: "#F58426", sole: "#FFFFFF", hair: "#17100B", sock: "#FFFFFF" },
    vw: { f: -1, x: 566, torso: 64, neck: 8, head: 12, ua: 38, fa: 36, th: 51, sh: 51, chest: 25, waist: 19, limb: 8.5,
      skin: "#5E3B27", skinHi: "#8A5E40", skinLo: "#40271A", jersey: ["#34343C", "#0C0C10"], trim: "#C4CED4", num: "1", numCol: "#FFFFFF",
      shoe: "#15151A", sole: "#E8E8E8", hair: "#0D0907", sock: "#15151A" },
  };
  const POSES = {
    jb: {
      dribble: { tor: 0.28, head: -0.1, thF: 0.55, shF: -0.15, thB: -0.15, shB: -0.55, uaF: 0.35, faF: 0.9, uaB: -0.2, faB: 0.7 },
      gather: { tor: 0.12, head: -0.2, thF: 0.8, shF: -0.5, thB: 0.35, shB: -0.8, uaF: 2.3, faF: 2.9, uaB: 2.1, faB: 2.8 },
      shoot: { tor: -0.05, head: -0.25, thF: 0.3, shF: -0.05, thB: 0.1, shB: -0.4, uaF: 2.85, faF: 3.05, uaB: 2.5, faB: 2.85 },
      follow: { tor: -0.05, head: -0.25, thF: 0.25, shF: 0, thB: 0.05, shB: -0.35, uaF: 2.75, faF: 2.0, uaB: 2.3, faB: 2.2 },
      celebrate: { tor: -0.06, head: -0.35, thF: 0.12, shF: 0, thB: -0.06, shB: -0.12, uaF: 2.95, faF: 3.05, uaB: 0.8, faB: 2.3 },
      sad: { tor: 0.32, head: 0.4, thF: 0.1, shF: 0, thB: -0.05, shB: -0.1, uaF: -0.1, faF: 0.15, uaB: -0.15, faB: 0.05 },
    },
    vw: {
      guard: { tor: 0.14, head: -0.05, thF: 0.45, shF: -0.15, thB: -0.05, shB: -0.5, uaF: 2.15, faF: 2.55, uaB: 1.3, faB: 1.75 },
      contest: { tor: 0, head: -0.3, thF: 0.3, shF: -0.1, thB: 0.05, shB: -0.45, uaF: 2.95, faF: 3.05, uaB: 1.4, faB: 1.8 },
      block: { tor: -0.08, head: -0.4, thF: 0.55, shF: -0.35, thB: 0.25, shB: -0.75, uaF: 2.72, faF: 2.5, uaB: 1.1, faB: 1.4 },
      celebrate: { tor: -0.04, head: -0.12, thF: 0.1, shF: 0, thB: -0.05, shB: -0.1, uaF: 2.3, faF: 3.1, uaB: 0.2, faB: 0.4 },
      sad: { tor: 0.26, head: 0.42, thF: 0.06, shF: 0, thB: -0.05, shB: -0.08, uaF: 0.1, faF: 0.2, uaB: -0.1, faB: 0 },
    },
  };
  const KEYS = ["tor", "head", "thF", "shF", "thB", "shB", "uaF", "faF", "uaB", "faB"];
  function mkPlayer(id, anim) {
    const b = BODY[id];
    return { id, b, anim, h: 0, vy: 0, pose: { ...POSES[id][anim] }, face: "neutral", J: null };
  }
  const P = { jb: mkPlayer("jb", "dribble"), vw: mkPlayer("vw", "guard") };

  const vec = (a, f) => [Math.sin(a) * f, Math.cos(a)];
  function joints(p) {
    const b = p.b, q = p.pose, f = b.f;
    const legF = b.th * Math.cos(q.thF) + b.sh * Math.cos(q.shF), legB = b.th * Math.cos(q.thB) + b.sh * Math.cos(q.shB);
    const hip = [b.x, FLOOR - 5 - Math.max(legF, legB) - p.h];
    const t = vec(q.tor + Math.PI, f);
    const sh = [hip[0] + t[0] * b.torso, hip[1] + t[1] * b.torso];
    const hv = vec(q.tor + q.head * 0.5 + Math.PI, f);
    const head = [sh[0] + hv[0] * (b.neck + b.head), sh[1] + hv[1] * (b.neck + b.head)];
    const chain = (o, a1, l1, a2, l2) => { const v1 = vec(a1, f), m = [o[0] + v1[0] * l1, o[1] + v1[1] * l1], v2 = vec(a2, f); return [m, [m[0] + v2[0] * l2, m[1] + v2[1] * l2]]; };
    const [kF, aF] = chain(hip, q.thF, b.th, q.shF, b.sh), [kB, aB] = chain(hip, q.thB, b.th, q.shB, b.sh);
    const [eF, hF] = chain(sh, q.uaF, b.ua, q.faF, b.fa), [eB, hB] = chain(sh, q.uaB, b.ua, q.faB, b.fa);
    return (p.J = { hip, sh, head, kF, aF, kB, aB, eF, hF, eB, hB });
  }

  // ---------- ball ----------
  const ball = { mode: "dribble", x: 0, y: 0, vx: 0, vy: 0, rot: 0, trail: [], fly: null };
  const BALL_R = 9;

  // ---------- pre-rendered layers ----------
  let crowdA = null, crowdB = null, floorTex = null;
  function layer(w, h, paint) {
    const cc = document.createElement("canvas"); cc.width = Math.ceil(w * k); cc.height = Math.ceil(h * k);
    const g = cc.getContext("2d"); g.scale(k, k); paint(g); return cc;
  }
  const SHIRTS = ["#1D5FD1", "#F58426", "#E9ECF2", "#1D5FD1", "#2A2F45", "#F58426", "#C4CED4", "#1A1A20", "#1D5FD1", "#8A1E2B"];
  const SKINS = ["#F1C7A3", "#D9A57C", "#B07A52", "#8B5A3C", "#5E3B27", "#F6D6BC"];
  function paintCrowd(g, armsUp) {
    const R = seeded(1234);
    const tiers = [
      { y0: 76, rows: 4, gap: 22, s: 0.62, dark: 0.55 },
      { y0: 196, rows: 5, gap: 26, s: 0.9, dark: 0.22 },
    ];
    // bowl walls
    const bg = g.createLinearGradient(0, 60, 0, 330);
    bg.addColorStop(0, "#0A0E22"); bg.addColorStop(1, "#141A38");
    g.fillStyle = bg; g.fillRect(0, 56, 900, 280);
    for (const T of tiers) for (let r = 0; r < T.rows; r++) {
      const y = T.y0 + r * T.gap, s = T.s * (1 + r * 0.06);
      g.fillStyle = `rgba(8,10,24,${0.5})`; g.fillRect(0, y + 8 * s, 900, 4 * s);
      for (let x = -10 + R() * 8; x < 900; x += 15 * s + R() * 4) {
        const shirt = SHIRTS[Math.floor(R() * SHIRTS.length)], skin = SKINS[Math.floor(R() * SKINS.length)];
        const bob = R() * 3, up = armsUp && R() < 0.55;
        const px = x, py = y - bob * (armsUp ? 2 : 0);
        if (up) {
          g.strokeStyle = skin; g.lineWidth = 2.4 * s; g.lineCap = "round";
          g.beginPath(); g.moveTo(px - 5 * s, py); g.lineTo(px - 8 * s, py - 16 * s); g.moveTo(px + 5 * s, py); g.lineTo(px + 8 * s, py - 16 * s); g.stroke();
        }
        g.fillStyle = shirt; g.beginPath(); g.ellipse(px, py + 6 * s, 7.5 * s, 7 * s, 0, Math.PI, 0); g.fill(); g.fillRect(px - 7.5 * s, py + 6 * s, 15 * s, 6 * s);
        g.fillStyle = skin; g.beginPath(); g.arc(px, py - 3 * s, 4.6 * s, 0, 7); g.fill();
        g.fillStyle = R() < 0.6 ? "#1A120C" : R() < 0.5 ? "#6B4A2E" : "#C9A15A"; g.beginPath(); g.arc(px, py - 4.4 * s, 4.6 * s, Math.PI, 0); g.fill();
      }
      g.fillStyle = `rgba(6,8,22,${T.dark - r * 0.05})`; g.fillRect(0, y - 20 * s, 900, T.gap);
    }
    // upper deck fascia
    const fa = g.createLinearGradient(0, 166, 0, 186);
    fa.addColorStop(0, "#1A2046"); fa.addColorStop(1, "#0C1028");
    g.fillStyle = fa; g.fillRect(0, 166, 900, 22);
    // haze
    const hz = g.createLinearGradient(0, 56, 0, 330);
    hz.addColorStop(0, "rgba(40,55,120,.35)"); hz.addColorStop(0.5, "rgba(40,55,120,.05)"); hz.addColorStop(1, "rgba(20,25,60,.25)");
    g.fillStyle = hz; g.fillRect(0, 56, 900, 280);
  }
  function paintFloor(g) {
    const R = seeded(99);
    // planks converging toward a far vanishing point
    const vx = 400, vy = -900, top = 342, bot = 500;
    const px = (x0, y) => vx + (x0 - vx) * ((y - vy) / (bot - vy));
    for (let i = -30; i < 60; i++) {
      const x0 = i * 26, x1 = x0 + 26;
      const tone = 0.85 + R() * 0.25;
      const base = [217 * tone, 160 * tone, 100 * tone].map((v) => Math.min(255, Math.round(v)));
      g.fillStyle = `rgb(${base.join(",")})`;
      g.beginPath(); g.moveTo(px(x0, top), top); g.lineTo(px(x1, top), top); g.lineTo(x1, bot); g.lineTo(x0, bot); g.closePath(); g.fill();
      g.strokeStyle = "rgba(90,50,20,.22)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(px(x0, top), top); g.lineTo(x0, bot); g.stroke();
    }
    for (let y = top + 6; y < bot; y += 9 + (y - top) * 0.08) { g.strokeStyle = "rgba(90,50,20,.08)"; g.beginPath(); g.moveTo(0, y); g.lineTo(800, y); g.stroke(); }
    // lane (paint) under the basket
    g.fillStyle = "rgba(24,62,150,.88)";
    g.beginPath(); g.moveTo(596, top + 6); g.lineTo(800, top + 6); g.lineTo(800, 498); g.lineTo(560, 498); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.ellipse(578, 420, 38, 58, 0.12, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    // three point arc + sideline
    g.beginPath(); g.ellipse(735, 420, 330, 74, 0, Math.PI * 0.62, Math.PI * 1.38); g.stroke();
    g.beginPath(); g.moveTo(0, 492); g.lineTo(800, 492); g.stroke();
    g.beginPath(); g.moveTo(0, top + 6); g.lineTo(800, top + 6); g.stroke();
    // center logo
    g.save(); g.translate(120, 424); g.scale(1, 0.3);
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 110, 0, 7); g.stroke();
    g.fillStyle = "rgba(245,132,38,.35)"; g.beginPath(); g.arc(0, 0, 104, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.75)"; g.font = "400 96px 'Bebas Neue', Impact, sans-serif"; g.textAlign = "center"; g.fillText("8 × 9", 0, 34);
    g.restore();
    // varnish
    const gl = g.createLinearGradient(0, top, 0, bot);
    gl.addColorStop(0, "rgba(255,240,220,.28)"); gl.addColorStop(0.35, "rgba(255,240,220,.04)"); gl.addColorStop(1, "rgba(0,0,0,.25)");
    g.fillStyle = gl; g.fillRect(0, top, 800, bot - top);
  }
  function prerender() {
    crowdA = layer(900, 340, (g) => paintCrowd(g, false));
    crowdB = layer(900, 340, (g) => paintCrowd(g, true));
    floorTex = layer(800, 500, paintFloor);
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const nk = cv.width / W;
    if (Math.abs(nk - k) > 0.01 || !crowdA) { k = nk; prerender(); }
  }
  addEventListener("resize", resize);

  // ---------- drawing helpers ----------
  function limb(a, b, w, col, hi, lo) {
    c.lineCap = "round";
    c.strokeStyle = lo; c.lineWidth = w + 1.6; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.strokeStyle = hi; c.lineWidth = w * 0.32; c.beginPath(); c.moveTo(a[0] - w * 0.2, a[1] - w * 0.18); c.lineTo(b[0] - w * 0.2, b[1] - w * 0.18); c.stroke();
  }
  function quad(a, b, wa, wb, fill) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    c.beginPath();
    c.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2); c.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2);
    c.lineTo(b[0] - nx * wb / 2, b[1] - ny * wb / 2); c.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2); c.closePath();
    c.fillStyle = fill; c.fill();
  }
  function shoe(ankle, knee, b, back) {
    const f = b.f;
    c.save(); c.translate(ankle[0], ankle[1]);
    const lean = Math.atan2(ankle[0] - knee[0], knee[1] - ankle[1]) * 0.25;
    c.rotate(lean);
    c.fillStyle = back ? shade(b.shoe, 0.35) : b.shoe;
    c.beginPath(); c.moveTo(-6 * f, -7); c.quadraticCurveTo(-8 * f, 3, -7 * f, 4); c.lineTo(14 * f, 4); c.quadraticCurveTo(16 * f, 0, 10 * f, -3); c.quadraticCurveTo(2 * f, -4, 2 * f, -8); c.closePath(); c.fill();
    c.fillStyle = back ? shade(b.sole, 0.35) : b.sole; c.fillRect(Math.min(-7 * f, 15 * f), 2.5, 22, 2.8);
    c.fillStyle = back ? shade(b.sock, 0.35) : b.sock; c.fillRect(-4, -12, 8, 6);
    c.restore();
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, bl = n & 255;
    return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(bl * (1 - amt))})`;
  }

  function drawHead(p) {
    const b = p.b, J = p.J, f = b.f, [hx, hy] = J.head, r = b.head;
    // neck
    limb(J.sh, [lerp(J.sh[0], hx, 0.55), lerp(J.sh[1], hy, 0.55)], 9, b.skin, b.skinHi, b.skinLo);
    c.save(); c.translate(hx, hy); c.rotate(p.pose.head * 0.4 * f);
    const g = c.createRadialGradient(-3 * f, -5, 2, 0, 0, r * 1.3);
    g.addColorStop(0, b.skinHi); g.addColorStop(0.6, b.skin); g.addColorStop(1, b.skinLo);
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r * 0.92, r * 1.05, 0, 0, 7); c.fill();
    // ear
    c.fillStyle = b.skinLo; c.beginPath(); c.ellipse(-r * 0.55 * f, 1, 2.6, 3.8, 0, 0, 7); c.fill();
    // hair
    c.fillStyle = b.hair;
    if (p.id === "jb") {
      c.beginPath(); c.ellipse(-1 * f, -r * 0.45, r * 0.95, r * 0.62, 0, Math.PI, 0); c.fill();
      // beard
      c.beginPath(); c.moveTo(-r * 0.7 * f, 0); c.quadraticCurveTo(-r * 0.6 * f, r * 1.05, r * 0.35 * f, r * 1.02); c.quadraticCurveTo(r * 0.9 * f, r * 0.7, r * 0.85 * f, r * 0.25);
      c.quadraticCurveTo(r * 0.3 * f, r * 0.55, -r * 0.2 * f, r * 0.35); c.closePath(); c.fill();
    } else {
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; c.beginPath(); c.arc(Math.cos(a) * r * 0.78, -r * 0.35 + Math.sin(a) * r * 0.78, 3.2, 0, 7); c.fill(); }
      c.beginPath(); c.ellipse(0, -r * 0.45, r * 0.9, r * 0.55, 0, Math.PI, 0); c.fill();
      c.fillStyle = "rgba(60,40,30,.35)"; c.beginPath(); c.ellipse(r * 0.25 * f, r * 0.75, r * 0.45, r * 0.3, 0, 0, 7); c.fill();
    }
    // eyes + brow
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.ellipse(r * 0.42 * f, -1, 2.3, 1.8, 0, 0, 7); c.ellipse(r * 0.02 * f, -1, 2.1, 1.7, 0, 0, 7); c.fill();
    c.fillStyle = "#120A06"; c.beginPath(); c.arc(r * 0.5 * f, -0.8, 1.2, 0, 7); c.arc(r * 0.1 * f, -0.8, 1.1, 0, 7); c.fill();
    c.strokeStyle = b.hair; c.lineWidth = 1.6; c.lineCap = "round"; c.beginPath();
    const browY = p.face === "sad" ? -3.5 : p.face === "fierce" ? -4.2 : -5;
    c.moveTo(-r * 0.1 * f, browY + (p.face === "fierce" ? -1 : 0)); c.lineTo(r * 0.62 * f, browY + (p.face === "fierce" ? 1.2 : 0)); c.stroke();
    // mouth
    c.strokeStyle = p.id === "jb" ? "#F4E3D6" : "#2A160C"; c.lineWidth = 1.5; c.beginPath();
    if (p.face === "happy") { c.fillStyle = "#3A1A10"; c.beginPath(); c.moveTo(r * 0.02 * f, r * 0.45); c.quadraticCurveTo(r * 0.3 * f, r * 0.9, r * 0.62 * f, r * 0.42); c.closePath(); c.fill(); c.fillStyle = "#FFF"; c.fillRect(Math.min(r * 0.1 * f, r * 0.5 * f), r * 0.44, r * 0.4, 1.6); }
    else if (p.face === "fierce") { c.fillStyle = "#2A120A"; c.beginPath(); c.ellipse(r * 0.34 * f, r * 0.55, 3.4, 2.6, 0, 0, 7); c.fill(); }
    else if (p.face === "sad") { c.moveTo(r * 0.05 * f, r * 0.62); c.quadraticCurveTo(r * 0.32 * f, r * 0.4, r * 0.58 * f, r * 0.62); c.stroke(); }
    else { c.moveTo(r * 0.08 * f, r * 0.52); c.lineTo(r * 0.55 * f, r * 0.5); c.stroke(); }
    // rim light from arena
    c.strokeStyle = "rgba(200,220,255,.35)"; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, 0, r * 0.92, r * 1.05, 0, Math.PI * 1.15, Math.PI * 1.75); c.stroke();
    c.restore();
  }

  function drawPlayer(p) {
    const b = p.b, J = joints(p);
    // back arm + leg
    limb(J.sh, J.eB, b.limb * 0.95, shade(b.skin, 0.28), shade(b.skinHi, 0.3), shade(b.skinLo, 0.3));
    limb(J.eB, J.hB, b.limb * 0.85, shade(b.skin, 0.28), shade(b.skinHi, 0.3), shade(b.skinLo, 0.3));
    limb(J.hip, J.kB, b.limb * 1.25, shade(b.skin, 0.28), shade(b.skinHi, 0.3), shade(b.skinLo, 0.3));
    limb(J.kB, J.aB, b.limb * 1.05, shade(b.skin, 0.28), shade(b.skinHi, 0.3), shade(b.skinLo, 0.3));
    shoe(J.aB, J.kB, b, true);
    // front leg
    limb(J.hip, J.kF, b.limb * 1.3, b.skin, b.skinHi, b.skinLo);
    limb(J.kF, J.aF, b.limb * 1.08, b.skin, b.skinHi, b.skinLo);
    shoe(J.aF, J.kF, b, false);
    // shorts
    const midK = [(J.kF[0] + J.kB[0]) / 2, (J.kF[1] + J.kB[1]) / 2];
    const sEnd = [lerp(J.hip[0], midK[0], 0.72), lerp(J.hip[1], midK[1], 0.72)];
    quad([J.hip[0], J.hip[1] - 6], sEnd, b.waist + 6, b.waist + 14, b.jersey[1]);
    quad([J.hip[0], J.hip[1] - 6], sEnd, 4, 4, b.trim);
    // torso / jersey
    const tg = c.createLinearGradient(J.sh[0] - 14, J.sh[1], J.sh[0] + 14, J.hip[1]);
    tg.addColorStop(0, b.jersey[0]); tg.addColorStop(1, b.jersey[1]);
    quad(J.sh, [J.hip[0], J.hip[1] - 2], b.chest, b.waist, tg);
    c.save(); c.globalAlpha = 0.9; quad([J.sh[0], J.sh[1] + 1], [J.sh[0], J.sh[1] + 4], b.chest - 4, b.chest - 4, b.trim); c.restore();
    // number
    const mid = [lerp(J.sh[0], J.hip[0], 0.45), lerp(J.sh[1], J.hip[1], 0.45)];
    c.save(); c.translate(mid[0], mid[1]); c.rotate(Math.atan2(J.sh[0] - J.hip[0], J.hip[1] - J.sh[1]));
    c.font = `400 ${p.id === "vw" ? 22 : 19}px 'Bebas Neue', Impact, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 2; c.strokeStyle = p.id === "jb" ? "#FFFFFF" : "rgba(0,0,0,.6)"; c.strokeText(b.num, 0, 0);
    c.fillStyle = b.numCol; c.fillText(b.num, 0, 0);
    c.restore();
    // head
    drawHead(p);
    // front arm (over everything)
    limb(J.sh, J.eF, b.limb * 1.02, b.skin, b.skinHi, b.skinLo);
    limb(J.eF, J.hF, b.limb * 0.9, b.skin, b.skinHi, b.skinLo);
    c.fillStyle = b.skin; c.beginPath(); c.arc(J.hF[0], J.hF[1], b.limb * 0.62, 0, 7); c.fill();
    if (p.id === "vw") { c.fillStyle = "#15151A"; quad(J.eF, [lerp(J.eF[0], J.hF[0], 0.6), lerp(J.eF[1], J.hF[1], 0.6)], b.limb * 0.95, b.limb * 0.9, "#15151A"); }
  }

  function drawBall(x, y, rot, alpha = 1) {
    c.save(); c.globalAlpha *= alpha; c.translate(x, y);
    const g = c.createRadialGradient(-3, -4, 1, 0, 0, BALL_R * 1.1);
    g.addColorStop(0, "#FFB070"); g.addColorStop(0.55, "#E8691E"); g.addColorStop(1, "#8E3A0A");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, BALL_R, 0, 7); c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, BALL_R, 0, 7); c.clip(); c.rotate(rot);
    c.strokeStyle = "rgba(40,15,5,.85)"; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-BALL_R, 0); c.lineTo(BALL_R, 0); c.moveTo(0, -BALL_R); c.lineTo(0, BALL_R); c.stroke();
    c.beginPath(); c.ellipse(-BALL_R * 0.9, 0, BALL_R * 0.55, BALL_R, 0, -Math.PI / 2, Math.PI / 2); c.stroke();
    c.beginPath(); c.ellipse(BALL_R * 0.9, 0, BALL_R * 0.55, BALL_R, 0, Math.PI / 2, Math.PI * 1.5); c.stroke();
    c.restore();
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-3, -4.5, 3, 1.8, -0.6, 0, 7); c.fill();
    c.restore();
  }

  // ---------- hoop ----------
  function drawHoopBack() {
    // stanchion
    const pad = c.createLinearGradient(760, 0, 800, 0); pad.addColorStop(0, "#1D5FD1"); pad.addColorStop(1, "#0E3380");
    c.fillStyle = "#1C2030"; c.fillRect(781, 150, 10, 250);
    c.fillStyle = pad; c.beginPath(); c.moveTo(770, 360); c.lineTo(800, 352); c.lineTo(800, 446); c.lineTo(766, 446); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.15)"; c.fillRect(770, 362, 3, 80);
    c.fillStyle = "#1C2030"; c.beginPath(); c.moveTo(786, 150); c.lineTo(752, 162); c.lineTo(752, 170); c.lineTo(786, 158); c.fill();
    // backboard (3/4 view)
    c.save();
    c.beginPath(); c.moveTo(726, 118); c.lineTo(762, 106); c.lineTo(762, 214); c.lineTo(726, 228); c.closePath();
    const gg = c.createLinearGradient(726, 106, 762, 228); gg.addColorStop(0, "rgba(220,235,255,.42)"); gg.addColorStop(1, "rgba(160,190,230,.12)");
    c.fillStyle = gg; c.fill(); c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.5; c.stroke();
    c.clip(); c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.moveTo(726, 150); c.lineTo(762, 120); c.lineTo(762, 132); c.lineTo(726, 164); c.fill();
    c.restore();
    c.strokeStyle = "#FF6A3D"; c.lineWidth = 2; c.beginPath(); c.moveTo(733, 170); c.lineTo(752, 164); c.lineTo(752, 196); c.lineTo(733, 202); c.closePath(); c.stroke();
    // shot clock on top of the backboard
    c.fillStyle = "#07080C"; c.beginPath(); c.moveTo(726, 98); c.lineTo(762, 88); c.lineTo(762, 106); c.lineTo(726, 117); c.closePath(); c.fill();
    c.save(); c.translate(744, 104); c.transform(1, -0.3, 0, 1, 0, 0);
    c.font = "900 13px Orbitron, 'Courier New', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = "#FF3B30"; c.shadowBlur = 8; c.fillStyle = "#FF3B30"; c.fillText(String(Math.ceil(clockVal)), 0, 0);
    c.restore();
    // back of rim + back net
    rimArc(Math.PI, Math.PI * 2);
    drawNet(false);
  }
  function rimArc(a0, a1) {
    c.strokeStyle = "#FF5A1F"; c.lineWidth = 3.4; c.beginPath(); c.ellipse(RIM.x, RIM.y, 24, 6, 0, a0, a1); c.stroke();
    c.strokeStyle = "rgba(255,200,160,.6)"; c.lineWidth = 1; c.beginPath(); c.ellipse(RIM.x, RIM.y - 1, 24, 6, 0, a0, a1); c.stroke();
  }
  function drawNet(front) {
    const n = 10, depth = 42;
    c.strokeStyle = front ? "rgba(255,255,255,.92)" : "rgba(220,225,235,.55)"; c.lineWidth = 1.1;
    const sway = (i, y) => net.amp * Math.sin(time * 26 + i * 0.8 + y * 0.12) * 4 * (y / depth);
    const stretch = 1 + net.amp * 0.35;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (i / n) * (front ? 1 : -1) + (front ? 0 : 0);
      const x0 = RIM.x + Math.cos(a) * 24, y0 = RIM.y + Math.sin(a) * 6;
      const x1 = RIM.x + Math.cos(a) * 11, y1 = RIM.y + depth * stretch + Math.sin(a) * 3;
      pts.push([x0, y0, x1, y1]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax0, ay0, ax1, ay1] = pts[i], [bx0, by0, bx1, by1] = pts[i + 1];
      c.beginPath();
      for (let s = 0; s <= 4; s++) {
        const t = s / 4, left = s % 2 === 0;
        const x = lerp(left ? ax0 : bx0, left ? ax1 : bx1, t), y = lerp(left ? ay0 : by0, left ? ay1 : by1, t);
        if (s === 0) c.moveTo(x + sway(i, y - RIM.y), y); else c.lineTo(x + sway(i, y - RIM.y), y);
      }
      c.stroke();
    }
    c.beginPath();
    for (let s = 1; s <= 3; s++) { const t = s / 4; c.ellipse(RIM.x, RIM.y + depth * stretch * t, lerp(24, 11, t), lerp(6, 3, t), 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); }
    c.stroke();
  }
  function drawHoopFront() { drawNet(true); rimArc(0, Math.PI); }

  // ---------- arena ----------
  const LAMPS = [70, 170, 270, 530, 630, 730];
  function drawArena() {
    // ceiling + truss
    const cg = c.createLinearGradient(0, 0, 0, 60); cg.addColorStop(0, "#03040A"); cg.addColorStop(1, "#0B1026");
    c.fillStyle = cg; c.fillRect(0, 0, W, 60);
    // crowd (bounces when cheering)
    const bounce = cheer > 0.02 && !reduced ? Math.abs(Math.sin(time * 9)) * 3 * cheer : 0;
    const off = (time * 3) % 50;
    c.drawImage(crowdA, 0, 0, crowdA.width, crowdA.height, -off, 0, 900, 340);
    if (cheer > 0.02) { c.globalAlpha = cheer; c.drawImage(crowdB, 0, 0, crowdB.width, crowdB.height, -off, -bounce, 900, 340); c.globalAlpha = 1; }
    // camera flashes
    for (const f of fx.flashes) {
      const a = 1 - f.age / f.life;
      const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(f.x - 10, f.y - 10, 20, 20);
    }
    // ribbon board on the upper deck fascia
    ledText(`BRUNSON ${scores[0]}   •   WEMBY ${scores[1]}   •   FIRST TO 11   •   `, 168, 18, "#5B9BFF", -time * 40, 12);
    // jumbotron
    drawJumbotron();
    // truss + lamps
    c.fillStyle = "#12162A"; c.fillRect(0, 18, W, 8);
    for (const x of LAMPS) {
      c.fillStyle = "#1C2140"; c.fillRect(x - 12, 24, 24, 10);
      c.save(); c.globalCompositeOperation = "lighter";
      const bl = c.createRadialGradient(x, 32, 1, x, 32, 46); bl.addColorStop(0, "rgba(255,250,235,.95)"); bl.addColorStop(0.2, "rgba(200,220,255,.35)"); bl.addColorStop(1, "rgba(200,220,255,0)");
      c.fillStyle = bl; c.fillRect(x - 46, -14, 92, 92);
      c.restore();
    }
    // courtside LED boards
    const by = 318;
    c.fillStyle = "#05060B"; c.fillRect(0, by, W, 26);
    c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(0, by, W, 1.5);
    let facts = ""; for (const a of [8, 9]) for (let b = 1; b <= 9; b++) facts += `${a} × ${b} = ${a * b}     `;
    ledText(facts, by + 2, 22, "#FF8A3D", -time * 55, 15);
  }
  function ledText(text, y, h, color, offset, size) {
    c.save(); c.beginPath(); c.rect(0, y, W, h); c.clip();
    c.fillStyle = "#06070D"; c.fillRect(0, y, W, h);
    c.font = `700 ${size}px Orbitron, 'Courier New', monospace`; c.textBaseline = "middle";
    const w = c.measureText(text).width || 400;
    let x = ((offset % w) + w) % w - w;
    c.shadowColor = color; c.shadowBlur = 8; c.fillStyle = color;
    for (; x < W; x += w) c.fillText(text, x, y + h / 2 + 1);
    c.shadowBlur = 0;
    // LED dot grid
    c.fillStyle = "rgba(0,0,0,.35)"; for (let yy = y; yy < y + h; yy += 2.5) c.fillRect(0, yy, W, 1);
    c.restore();
  }
  function drawJumbotron() {
    const x = 330, y = 36, w = 140, h = 50;
    c.fillStyle = "#0B0D18"; c.fillRect(x + w / 2 - 2, 20, 4, 18);
    c.fillStyle = "#07080F"; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 6) : c.rect(x, y, w, h); c.fill();
    c.strokeStyle = "rgba(120,150,255,.35)"; c.lineWidth = 1.5; c.stroke();
    c.font = "900 20px Orbitron, 'Courier New', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowBlur = 10;
    c.shadowColor = "#FF9A3D"; c.fillStyle = "#FFB066"; c.fillText(String(scores[0]), x + 34, y + 30);
    c.shadowColor = "#DDE6F0"; c.fillStyle = "#E6EEF3"; c.fillText(String(scores[1]), x + w - 34, y + 30);
    c.shadowBlur = 0;
    c.font = "700 8px Orbitron, 'Courier New', monospace"; c.fillStyle = "rgba(255,255,255,.6)";
    c.fillText("BRUNSON", x + 34, y + 11); c.fillText("WEMBY", x + w - 34, y + 11);
    c.fillStyle = "#FF3B30"; c.font = "900 12px Orbitron, monospace"; c.fillText(String(Math.ceil(clockVal)), x + w / 2, y + 30);
    const glow = c.createRadialGradient(x + w / 2, y + h, 2, x + w / 2, y + h, 90);
    glow.addColorStop(0, "rgba(90,120,255,.18)"); glow.addColorStop(1, "rgba(90,120,255,0)");
    c.fillStyle = glow; c.fillRect(x - 40, y + h - 10, w + 80, 90);
    c.textAlign = "left";
  }
  function drawLights() {
    c.save(); c.globalCompositeOperation = "lighter";
    for (const x of LAMPS) {
      const tx = x + (x < 400 ? 60 : -60);
      const g = c.createLinearGradient(0, 34, 0, FLOOR);
      g.addColorStop(0, "rgba(190,210,255,.10)"); g.addColorStop(1, "rgba(190,210,255,.015)");
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 8, 34); c.lineTo(x + 8, 34); c.lineTo(tx + 70, FLOOR + 30); c.lineTo(tx - 70, FLOOR + 30); c.closePath(); c.fill();
      // hot spots on the varnish
      const s = c.createRadialGradient(tx, 380, 2, tx, 380, 70);
      s.addColorStop(0, "rgba(255,245,225,.22)"); s.addColorStop(1, "rgba(255,245,225,0)");
      c.fillStyle = s; c.beginPath(); c.ellipse(tx, 380, 70, 16, 0, 0, 7); c.fill();
    }
    c.restore();
  }

  // ---------- effects ----------
  function spawnFlashes(n) { for (let i = 0; i < n; i++) fx.flashes.push({ x: Math.random() * W, y: 70 + Math.random() * 240, age: -Math.random() * 0.8, life: 0.18 + Math.random() * 0.15 }); }
  function sparks(x, y, n, colors, speed = 380) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 900, age: 0, life: 0.4 + Math.random() * 0.4, col: colors[Math.floor(Math.random() * colors.length)], w: 1.5 + Math.random() * 2 });
    }
  }
  function drawFX() {
    c.save(); c.globalCompositeOperation = "lighter";
    for (const p of fx.parts) {
      const a = 1 - p.age / p.life;
      c.strokeStyle = p.col; c.globalAlpha = a; c.lineWidth = p.w; c.lineCap = "round";
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke();
    }
    for (const r of fx.rings) {
      if (r.age < 0) continue;
      const t = r.age / r.life;
      c.globalAlpha = (1 - t) * 0.9; c.strokeStyle = r.col; c.lineWidth = 6 * (1 - t) + 1;
      c.beginPath(); c.ellipse(r.x, r.y, 10 + t * r.size, 10 + t * r.size * 0.8, 0, 0, 7); c.stroke();
    }
    c.restore();
    for (const t of fx.texts) {
      const a = 1 - t.age / t.life, s = 1 + Math.max(0, 0.2 - t.age) * 2.5;
      c.save(); c.globalAlpha = a; c.translate(t.x, t.y - t.age * 40); c.scale(s, s);
      c.font = "400 34px 'Bebas Neue', Impact, sans-serif"; c.textAlign = "center";
      c.shadowColor = t.col; c.shadowBlur = 18; c.fillStyle = t.col; c.fillText(t.text, 0, 0);
      c.restore();
    }
  }

  // ---------- update ----------
  function hand(p, side = "F") { const J = p.J || joints(p); return side === "F" ? J.hF : J.hB; }
  function update(dt) {
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (time >= timers[i].at) { timers[i].res(); timers.splice(i, 1); }
    cheer += (cheerTarget - cheer) * Math.min(1, dt * 6);
    for (const p of [P.jb, P.vw]) {
      const tgt = { ...POSES[p.id][p.anim] };
      if (p.anim === "dribble") { const bnc = Math.abs(Math.sin(time * 7.5)); tgt.faF += 0.55 * (1 - bnc); tgt.uaF += 0.25 * (1 - bnc); }
      if (p.anim === "guard") { tgt.uaF += Math.sin(time * 3) * 0.08; tgt.tor += Math.sin(time * 2) * 0.03; }
      if (p.anim === "celebrate" && p.id === "vw") tgt.faF += Math.sin(time * 16) * 0.35;
      if (p.anim === "celebrate" && p.id === "jb") tgt.uaF += Math.sin(time * 10) * 0.12;
      const rate = 1 - Math.exp(-dt * (p.anim === "block" || p.anim === "shoot" ? 22 : 12));
      for (const key of KEYS) p.pose[key] += (tgt[key] - p.pose[key]) * rate;
      if (p.h > 0 || p.vy < 0) { p.vy += 2300 * dt; p.h -= p.vy * dt; if (p.h <= 0) { p.h = 0; p.vy = 0; if (p.onLand) { const f = p.onLand; p.onLand = null; f(); } } }
      joints(p);
    }
    // ball
    if (ball.mode === "dribble") {
      const hF = P.jb.J.hF, bnc = Math.abs(Math.sin(time * 7.5));
      ball.x = hF[0] + 7; ball.y = lerp(hF[1] + BALL_R, FLOOR - BALL_R, bnc); ball.rot += dt * 4;
    } else if (ball.mode === "held") {
      const J = P.jb.J; ball.x = (J.hF[0] + J.hB[0]) / 2 + 3; ball.y = Math.min(J.hF[1], J.hB[1]) - BALL_R + 2;
    } else if (ball.mode === "fly") {
      const F = ball.fly; F.t = Math.min(1, F.t + dt / F.dur);
      const to = F.to(), u = 1 - F.t;
      const cx1 = (F.from.x + to.x) / 2, cy1 = Math.min(F.from.y, to.y) - F.arc;
      ball.x = u * u * F.from.x + 2 * u * F.t * cx1 + F.t * F.t * to.x;
      ball.y = u * u * F.from.y + 2 * u * F.t * cy1 + F.t * F.t * to.y;
      ball.rot -= dt * 14;
      if (F.t >= 1) { ball.mode = "free"; F.done(); }
    } else if (ball.mode === "net") {
      ball.vy += 900 * dt; ball.y += ball.vy * dt; ball.x += (RIM.x - ball.x) * Math.min(1, dt * 10); ball.rot -= dt * 6;
      if (ball.y > RIM.y + 48) { ball.mode = "phys"; ball.vx = -70; }
    } else if (ball.mode === "phys") {
      ball.vy += 1800 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.rot += ball.vx * dt / BALL_R;
      if (ball.y > FLOOR - BALL_R) { ball.y = FLOOR - BALL_R; ball.vy = -Math.abs(ball.vy) * 0.62; ball.vx *= 0.86; if (Math.abs(ball.vy) < 60) ball.vy = 0; }
    }
    if (ball.mode === "fly" || ball.mode === "phys" || ball.mode === "net") { ball.trail.push([ball.x, ball.y]); if (ball.trail.length > 7) ball.trail.shift(); } else ball.trail.length = 0;
    net.amp = Math.max(0, net.amp - dt * 1.4);
    for (const f of fx.flashes) f.age += dt;
    fx.flashes = fx.flashes.filter((f) => f.age < f.life);
    if (cheer > 0.3 && Math.random() < cheer * 0.5) spawnFlashes(1);
    for (const p of fx.parts) { p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    fx.parts = fx.parts.filter((p) => p.age < p.life);
    for (const r of fx.rings) r.age += dt;
    fx.rings = fx.rings.filter((r) => r.age < r.life);
    for (const t of fx.texts) t.age += dt;
    fx.texts = fx.texts.filter((t) => t.age < t.life);
    cam.z += (cam.tz - cam.z) * Math.min(1, dt * 5); cam.x += (cam.tx - cam.x) * Math.min(1, dt * 5); cam.y += (cam.ty - cam.y) * Math.min(1, dt * 5);
    shakeAmt = Math.max(0, shakeAmt - dt * 2.2);
  }

  // ---------- render ----------
  function drawActors(reflection) {
    drawPlayer(P.vw);
    drawPlayer(P.jb);
    if (!reflection) for (let i = 0; i < ball.trail.length; i++) drawBall(ball.trail[i][0], ball.trail[i][1], ball.rot, (i / ball.trail.length) * 0.25);
    drawBall(ball.x, ball.y, ball.rot);
  }
  function render() {
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, W, H);
    c.save();
    const sx = (Math.random() - 0.5) * 16 * shakeAmt, sy = (Math.random() - 0.5) * 10 * shakeAmt;
    c.translate(cam.x + sx, cam.y + sy); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
    drawArena();
    c.drawImage(floorTex, 0, 0, floorTex.width, floorTex.height, 0, 0, W, H);
    drawLights();
    // contact shadows
    for (const p of [P.vw, P.jb]) { const s = 1 / (1 + Math.max(0, p.h) / 60); c.fillStyle = `rgba(0,0,0,${0.4 * s})`; c.beginPath(); c.ellipse(p.b.x + 2, FLOOR + 2, 30 * s, 6 * s, 0, 0, 7); c.fill(); }
    { const hgt = Math.max(0, FLOOR - ball.y), s = 1 / (1 + hgt / 80); c.fillStyle = `rgba(0,0,0,${0.35 * s})`; c.beginPath(); c.ellipse(ball.x, FLOOR + 1, 10 * s + 2, 3 * s, 0, 0, 7); c.fill(); }
    // floor reflection
    c.save(); c.beginPath(); c.rect(0, FLOOR, W, H - FLOOR); c.clip();
    c.translate(0, FLOOR * 2 + 4); c.scale(1, -1); c.globalAlpha = 0.16; drawActors(true);
    c.restore();
    drawHoopBack();
    drawActors(false);
    drawHoopFront();
    drawFX();
    c.restore();
    // vignette
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)");
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }

  let last = performance.now();
  function frame(now) {
    const real = clamp((now - last) / 1000, 0, 0.05); last = now;
    const scale = now < slowUntil ? 0.28 : 1;
    // keep the loop alive even if one frame fails, so the game can never freeze
    try { if (!document.hidden && crowdA) { update(real * scale); render(); } }
    catch (e) { console.warn(e); }
    requestAnimationFrame(frame);
  }

  // ---------- choreography ----------
  function launch(from, to, dur, arc) {
    return new Promise((res) => { ball.mode = "fly"; ball.fly = { from: { ...from }, to, dur: dur / 1000, arc, t: 0, done: res }; });
  }
  async function shoot(made, timeout, onScore) {
    const jb = P.jb, vw = P.vw;
    jb.anim = "gather"; ball.mode = "held"; jb.face = "fierce"; vw.face = "fierce";
    await wait(170);
    jb.anim = "shoot"; jb.vy = -620; jb.h = 0.01;
    if (made) { vw.anim = "contest"; vw.vy = -420; vw.h = 0.01; }
    else { await wait(40); vw.anim = "block"; vw.vy = -820; vw.h = 0.01; }
    await wait(made ? 190 : 150);
    jb.anim = "follow";
    const from = { x: ball.x, y: ball.y };
    if (made) {
      cam.tz = 1.16; cam.tx = 600; cam.ty = 240;
      jb.onLand = () => { jb.anim = "celebrate"; jb.face = "happy"; };
      vw.onLand = () => { vw.anim = "sad"; vw.face = "sad"; };
      await launch(from, () => ({ x: RIM.x, y: RIM.y - 6 }), 760, 250);
      ball.mode = "net"; ball.vy = 160; net.amp = 1;
      sparks(RIM.x, RIM.y + 20, 26, ["#FFD86B", "#FFFFFF", "#FF9A3D"], 260);
      fx.texts.push({ text: "+1", x: RIM.x - 6, y: RIM.y - 34, age: 0, life: 1.1, col: "#FFC940" });
      cheerTarget = 1; spawnFlashes(28);
      onScore && onScore();
      await wait(650);
      cam.tz = BASE_Z; cam.tx = BASE_X; cam.ty = BASE_Y;
      await wait(450);
      cheerTarget = 0.25;
    } else {
      jb.onLand = () => { jb.anim = "sad"; jb.face = "sad"; };
      vw.onLand = () => { vw.anim = "celebrate"; vw.face = "happy"; };
      await launch(from, () => { const h = hand(vw); return { x: h[0] - 6, y: h[1] - 4 }; }, 300, 70);
      const hx = ball.x, hy = ball.y;
      ball.mode = "phys"; ball.vx = -980; ball.vy = -240;
      if (!reduced) slowUntil = performance.now() + 420;
      shakeAmt = 1; cam.tz = 1.22; cam.tx = hx; cam.ty = hy + 40;
      fx.rings.push({ x: hx, y: hy, age: 0, life: 0.5, size: 90, col: "#FFFFFF" }, { x: hx, y: hy, age: -0.06, life: 0.6, size: 140, col: "#9FB6FF" });
      sparks(hx, hy, 34, ["#FFFFFF", "#CFE0FF", "#FFD86B"], 460);
      cheerTarget = 0.7; spawnFlashes(14);
      onScore && onScore();
      await wait(420);
      cam.tz = BASE_Z; cam.tx = BASE_X; cam.ty = BASE_Y;
      await wait(700);
      cheerTarget = 0.2;
    }
  }
  function reset() {
    Object.assign(P.jb, { anim: "dribble", h: 0, vy: 0, face: "neutral", onLand: null });
    Object.assign(P.vw, { anim: "guard", h: 0, vy: 0, face: "neutral", onLand: null });
    ball.mode = "dribble"; cheerTarget = 0.12;
    cam.tz = BASE_Z; cam.tx = BASE_X; cam.ty = BASE_Y;
  }

  resize();
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { crowdA = null; resize(); });
  return {
    reset, shoot,
    setClock(s) { clockVal = s; },
    setScores(a, b) { scores = [a, b]; },
    resize,
  };
})();
