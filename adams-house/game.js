// Adam's House: ten seconds at the desk, one smashed button, one very large house.
(() => {
  const $ = (s) => document.querySelector(s);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED = location.hash.includes("fast") ? 0.15 : 1; // test hook
  const SMASHES = 5;

  const SKIN = "url(#gSkin)", SKIN_FLAT = "#EFC29C", SKIN_DK = "#D39A6E";
  const HAIR = "#5B3A24", HAIR_HI = "#7A5236", SWEATER = "#3B5A8C", SWEATER_WET = "#253C60", SWEATER_HI = "#4B6CA2";

  // ---------- timing ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function tween(ms, fn, ease = easeInOut) {
    return new Promise((res) => {
      const dur = Math.max(1, ms * SPEED), t0 = performance.now();
      (function f(now) { const t = Math.min(1, (now - t0) / dur); fn(ease(t), t); if (t < 1) requestAnimationFrame(f); else res(); })(t0);
    });
  }

  // ---------- sound ----------
  let ac = null;
  const actx = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } return ac; };
  function tone(f, d, type = "sine", v = 0.06, delay = 0, slide = 0) {
    const a = actx(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, v = 0.08, delay = 0, freq = 2000, type = "bandpass") {
    const a = actx(); if (!a) return;
    const len = Math.max(1, Math.floor(a.sampleRate * d)), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    fl.type = type; fl.frequency.value = freq; g.gain.value = v;
    src.buffer = buf; src.connect(fl).connect(g).connect(a.destination); src.start(a.currentTime + delay);
  }
  const sfx = {
    key: () => noise(0.025, 0.06, 0, 3500, "highpass"),
    tick: () => tone(1800, 0.03, "square", 0.02),
    ring: () => { for (let i = 0; i < 8; i++) tone(i % 2 ? 1320 : 1560, 0.05, "square", 0.035, i * 0.06); },
    smash: () => { noise(0.18, 0.2, 0, 400, "lowpass"); tone(90, 0.2, "square", 0.06); },
    crack: () => noise(0.12, 0.18, 0, 2500),
    boom: () => { noise(0.6, 0.25, 0, 300, "lowpass"); tone(60, 0.5, "sine", 0.1, 0, 0.5); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, "triangle", 0.05, 0.25 + i * 0.1)); },
    whoosh: () => noise(0.7, 0.12, 0, 900),
    splash: () => { noise(0.5, 0.25, 0, 700, "lowpass"); noise(0.9, 0.08, 0.15, 3000, "highpass"); },
    jump: () => tone(300, 0.3, "sine", 0.05, 0, 2.2),
    ding: () => { [2093, 2637].forEach((f) => { tone(f, 0.9, "sine", 0.05); tone(f * 2.01, 0.5, "sine", 0.02); }); },
    step: () => noise(0.04, 0.05, 0, 600, "lowpass"),
    reveal: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, "triangle", 0.045, i * 0.07)); },
  };
  let ringTimer = 0;

  // ---------- Adam's head (shared by both scenes) ----------
  // Drawn at radius ~40 around (0, 0). mood: bored focus frantic shock happy smug
  function head(mood, extra = {}) {
    let o = "";
    o += `<ellipse cx="-38" cy="6" rx="7" ry="10" fill="${SKIN_DK}"/><ellipse cx="38" cy="6" rx="7" ry="10" fill="${SKIN_DK}"/>`;
    o += `<path d="M-37 -6 Q-38 30 -16 43 Q0 49 16 43 Q38 30 37 -6 Q36 -44 0 -46 Q-36 -44 -37 -6 Z" fill="${SKIN}"/>`;
    // curly hair, set high on a big forehead
    const curls = [[-34, -26, 11], [-30, -40, 12], [-18, -50, 13], [-3, -54, 13], [12, -53, 13], [26, -46, 12], [35, -32, 11], [-36, -12, 8], [37, -16, 8], [-10, -44, 9], [20, -40, 8]];
    o += curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${extra.wet ? "#3E2716" : HAIR}"/>`).join("");
    o += `<path d="M-26 -48 q5 -6 10 0 M-2 -60 q5 -6 10 0 M20 -52 q5 -6 10 0" stroke="${HAIR_HI}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    // brows
    const B = { bored: [2, 2], focus: [-2, 4], frantic: [-6, 6], shock: [-9, -9], happy: [-3, -3], smug: [0, -2] }[mood] || [0, 0];
    o += `<path d="M-22 ${-10 + B[1]} L-6 ${-12 + B[0]}" stroke="#4A2E1B" stroke-width="4" stroke-linecap="round"/><path d="M22 ${-10 + B[1]} L6 ${-12 + B[0]}" stroke="#4A2E1B" stroke-width="4" stroke-linecap="round"/>`;
    // eyes
    const ey = 2, look = extra.look || 0;
    for (const x of [-14, 14]) {
      if (mood === "bored") o += `<ellipse cx="${x}" cy="${ey + 2}" rx="5" ry="3.4" fill="#1E140C"/><path d="M${x - 7} ${ey} L${x + 7} ${ey}" stroke="${SKIN_DK}" stroke-width="4"/>`;
      else if (mood === "happy") o += `<path d="M${x - 6} ${ey + 2} Q${x} ${ey - 5} ${x + 6} ${ey + 2}" stroke="#1E140C" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      else if (mood === "shock" || mood === "frantic") o += `<circle cx="${x}" cy="${ey}" r="7.5" fill="#fff"/><circle cx="${x + look}" cy="${ey + (mood === "frantic" ? 2 : 0)}" r="3.4" fill="#1E140C"/>`;
      else o += `<ellipse cx="${x + look}" cy="${ey + (mood === "focus" ? 3 : 0)}" rx="4.6" ry="5.2" fill="#1E140C"/><circle cx="${x + look + 1.6}" cy="${ey - 1.5}" r="1.5" fill="#fff"/>`;
    }
    if (extra.shades) o += `<rect x="-26" y="-6" width="21" height="12" rx="4" fill="#111"/><rect x="5" y="-6" width="21" height="12" rx="4" fill="#111"/><path d="M-5 -2 L5 -2" stroke="#111" stroke-width="2.5"/><path d="M-22 -3 L-12 -3" stroke="#fff" stroke-width="1.6" opacity=".4"/>`;
    // nose
    o += `<path d="M0 6 Q6 18 -1 20" stroke="#B87C52" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    // mouth
    const my = 30;
    if (mood === "bored") o += `<path d="M-8 ${my} L8 ${my + 2}" stroke="#7A3A28" stroke-width="3" stroke-linecap="round"/>`;
    else if (mood === "focus") o += `<path d="M-6 ${my} L6 ${my}" stroke="#7A3A28" stroke-width="3" stroke-linecap="round"/>`;
    else if (mood === "frantic") o += `<rect x="-11" y="${my - 5}" width="22" height="10" rx="3" fill="#fff" stroke="#7A3A28" stroke-width="2"/><path d="M-11 ${my} L11 ${my} M-4 ${my - 5} L-4 ${my + 5} M4 ${my - 5} L4 ${my + 5}" stroke="#C8A38A" stroke-width="1.2"/>`;
    else if (mood === "shock") o += `<ellipse cx="0" cy="${my + 1}" rx="7" ry="9" fill="#5A2418"/>`;
    else if (mood === "happy") o += `<path d="M-12 ${my - 3} Q0 ${my + 12} 12 ${my - 3} Z" fill="#5A2418"/><path d="M-9 ${my - 2} L9 ${my - 2}" stroke="#fff" stroke-width="3"/>`;
    else o += `<path d="M-8 ${my} Q2 ${my + 5} 10 ${my - 2}" stroke="#7A3A28" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (mood === "frantic" || extra.sweat) o += `<path d="M34 -24 q5 9 0 14 q-5 -5 0 -14 Z" fill="#9FD1F2" stroke="#6FAAD6"/><path d="M-36 -14 q4 7 0 11 q-4 -4 0 -11 Z" fill="#9FD1F2" stroke="#6FAAD6"/>`;
    return o;
  }

  // ================= OFFICE =================
  function officeStatic() {
    let o = "";
    o += `<rect x="-100" y="-40" width="600" height="800" fill="url(#gWallO)"/>`;
    // window: Brooklyn at night
    o += `<g><rect x="244" y="96" width="140" height="210" rx="4" fill="#0E1430"/><circle cx="350" cy="136" r="16" fill="#F4EFD8"/><circle cx="356" cy="132" r="14" fill="#0E1430"/>`;
    const b = [[246, 230, 26, "#1C2445"], [272, 206, 30, "#222B50"], [302, 222, 24, "#1C2445"], [326, 196, 30, "#252F58"], [356, 214, 28, "#1C2445"]];
    for (const [x, y, w, c] of b) { o += `<rect x="${x}" y="${y}" width="${w}" height="${306 - y}" fill="${c}"/>`; for (let yy = y + 8; yy < 300; yy += 14) for (let xx = x + 5; xx < x + w - 5; xx += 9) if ((xx + yy) % 3) o += `<rect x="${xx}" y="${yy}" width="4" height="6" fill="#FFD27A" opacity=".75"/>`; }
    o += `<rect x="244" y="96" width="140" height="210" rx="4" fill="none" stroke="#C9B38A" stroke-width="6"/><path d="M314 96 L314 306 M244 200 L384 200" stroke="#C9B38A" stroke-width="3"/></g>`;
    // shelf with LEGO
    o += `<rect x="30" y="236" width="120" height="6" fill="#8F5E38"/>`;
    o += `<g transform="translate(40 206)"><rect width="28" height="30" fill="#E5322D"/><rect x="30" y="10" width="24" height="20" fill="#2F6FE4"/><rect x="56" y="4" width="22" height="26" fill="#FFC31F"/><rect x="80" y="14" width="18" height="16" fill="#27A14A"/>${[[4, -4], [16, -4], [34, 6], [44, 6], [60, 0], [70, 0], [84, 10]].map(([x, y]) => `<rect x="${x}" y="${y}" width="7" height="5" rx="1" fill="rgba(255,255,255,.35)"/>`).join("")}</g>`;
    // desk lamp glow
    o += `<circle cx="352" cy="430" r="120" fill="url(#gLamp)"/>`;
    // countdown display
    o += `<g><rect x="40" y="90" width="180" height="96" rx="12" fill="#0A0D18" stroke="#39456A" stroke-width="3"/><text x="130" y="112" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="11" letter-spacing="3" fill="#8C98BC">IPO COUNTDOWN</text>
      <text id="oClock" x="130" y="164" text-anchor="middle" font-family="Orbitron, monospace" font-weight="900" font-size="44" fill="#FF3B30" style="filter: drop-shadow(0 0 6px rgba(255,59,48,.8))">00:10</text></g>`;
    return o;
  }
  function officeDesk() {
    let o = "";
    o += `<path d="M-100 500 L500 500 L500 644 L-100 644 Z" fill="url(#gDeskTop)"/><rect x="-100" y="642" width="600" height="130" fill="url(#gDesk)"/><rect x="-100" y="642" width="600" height="5" fill="rgba(0,0,0,.25)"/><rect x="-100" y="500" width="600" height="3" fill="rgba(255,255,255,.12)"/>`;
    for (let x = -100; x < 500; x += 70) o += `<path d="M${x} 505 Q${x + 30} 570 ${x + 12} 640" stroke="rgba(90,55,25,.18)" stroke-width="1.5" fill="none"/>`;
    // legal pad full of doodles
    o += `<g transform="translate(58 590) rotate(-8)"><rect x="-44" y="-34" width="88" height="70" rx="2" fill="#FFF3A6"/><rect x="-44" y="-34" width="88" height="8" fill="#C94B3B"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M-40 ${-18 + i * 11} L40 ${-18 + i * 11}" stroke="#9EC3E6" stroke-width=".8"/>`).join("")}
      <text x="-36" y="-10" font-family="Segoe Print, Comic Sans MS, cursive" font-size="10" fill="#2A3A6E">IPO?</text><text x="-6" y="2" font-family="Segoe Print, Comic Sans MS, cursive" font-size="10" fill="#2A3A6E">IPO??</text><text x="-34" y="18" font-family="Segoe Print, Comic Sans MS, cursive" font-size="9" fill="#2A3A6E">we'll see</text><circle cx="26" cy="-10" r="7" fill="none" stroke="#2A3A6E"/></g>`;
    // phone
    o += `<g transform="translate(170 604) rotate(6)"><rect x="-16" y="-28" width="32" height="56" rx="6" fill="#1E2433"/><rect x="-13" y="-23" width="26" height="46" rx="3" fill="#2C3A5E"/><rect x="-11" y="-16" width="22" height="12" rx="3" fill="#F4F6FA"/><text x="0" y="-8" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="4.6" fill="#1E2433">IPO: soon</text></g>`;
    // a slice of rhubarb pie
    o += `<g transform="translate(346 590)"><ellipse cx="0" cy="6" rx="30" ry="9" fill="#FFFFFF"/><ellipse cx="0" cy="6" rx="22" ry="6" fill="#F1F1F1"/><path d="M-16 4 L16 4 L4 -14 Z" fill="#C0392B"/><path d="M-16 4 L16 4 L14 8 L-14 8 Z" fill="#E0A55E"/><path d="M-8 -2 L8 -2 M-3 -8 L4 -8" stroke="#F2C88A" stroke-width="2.4"/><path d="M22 -2 L34 -16" stroke="#C9D0DA" stroke-width="2.5" stroke-linecap="round"/></g>`;
    // keyboard
    o += `<path d="M146 506 L254 506 L262 530 L138 530 Z" fill="#2B2F3A"/>${Array.from({ length: 3 }, (_, r) => Array.from({ length: 10 }, (_, c) => `<rect x="${146 + c * 10.6 - r * 2.5}" y="${509 + r * 7}" width="8" height="4.6" rx="1" fill="#555C6E"/>`).join("")).join("")}`;
    // PENN mug
    o += `<g transform="translate(300 470)"><rect x="0" y="0" width="30" height="36" rx="4" fill="#FFFFFF"/><path d="M30 8 q12 0 12 10 q0 10 -12 10" stroke="#FFFFFF" stroke-width="5" fill="none"/><rect x="0" y="12" width="30" height="12" fill="#990000"/><text x="15" y="22" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="8.5" fill="#fff">PENN</text><rect x="0" y="24" width="30" height="3" fill="#011F5B"/><path d="M8 -4 q4 -8 0 -14 M18 -4 q4 -8 0 -14" stroke="#fff" stroke-width="1.6" fill="none" opacity=".4"/></g>`;
    return o;
  }
  function monitor(t, live) {
    // angled monitor on the left of the desk
    let pts = "";
    for (let i = 0; i <= 12; i++) { const x = 52 + i * 8.5, y = 432 - i * 4.2 - Math.sin(i * 1.3 + t * 3) * 5 - (live ? i * 2.5 : 0); pts += `${x.toFixed(1)},${y.toFixed(1)} `; }
    return `<g><rect x="92" y="470" width="16" height="32" fill="#3A3F4C"/><ellipse cx="100" cy="504" rx="30" ry="6" fill="#2B2F3A"/>
      <path d="M34 356 L166 344 L166 468 L34 476 Z" fill="#1A1E28"/><path d="M40 362 L160 351 L160 462 L40 470 Z" fill="#0C1A18"/>
      <circle cx="100" cy="410" r="80" fill="url(#gScreenGlow)" opacity="${live ? 0.9 : 0.5}"/>
      <text x="48" y="378" font-family="Orbitron, monospace" font-weight="700" font-size="9" fill="#6FE3B0" transform="rotate(-5 48 378)">ADAM CO.</text>
      <text x="48" y="392" font-family="Manrope, sans-serif" font-weight="800" font-size="8" fill="${live ? "#FFE36E" : "#8FA4A0"}" transform="rotate(-5 48 392)">${live ? "IPO: LIVE ▲" : "IPO: PENDING"}</text>
      <polyline points="${pts}" fill="none" stroke="${live ? "#FFE36E" : "#6FE3B0"}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
  }
  function alarmClock(shake) {
    const r = shake ? Math.sin(performance.now() / 22) * 12 : 0;
    return `<g transform="translate(372 492) rotate(${r.toFixed(1)})">
      <circle cx="-12" cy="-40" r="9" fill="url(#gMetal)"/><circle cx="12" cy="-40" r="9" fill="url(#gMetal)"/>
      <circle cx="0" cy="-22" r="22" fill="#E0271E"/><circle cx="0" cy="-22" r="16" fill="#FFFBF2"/>
      <path d="M0 -22 L0 -32 M0 -22 L7 -18" stroke="#1E2433" stroke-width="2" stroke-linecap="round"/>
      <path d="M-14 -2 L-18 6 M14 -2 L18 6" stroke="#8C95A3" stroke-width="3"/>
      ${shake ? `<path d="M-28 -50 l-8 -6 M28 -50 l8 -6 M-32 -30 l-10 0 M32 -30 l10 0" stroke="#FFE36E" stroke-width="2.5" stroke-linecap="round"/>` : ""}
    </g>`;
  }
  // Adam at the desk. pose: bored | work | frantic | shock | slam ; slam: 0 (arm raised) .. 1 (fist on the button)
  function officeAdam(st) {
    const t = st.t || 0;
    let hx = 200, hy = 330, tilt = 0;
    if (st.pose === "bored") { hx = 212; hy = 336; tilt = 12; }
    if (st.pose === "frantic") { hx += Math.sin(t * 50) * 2; hy += Math.cos(t * 43) * 1.5; }
    if (st.pose === "shock" || st.pose === "slam") hy = 322;
    let o = "";
    // torso
    o += `<path d="M126 506 L124 436 Q128 398 172 390 L228 390 Q272 398 276 436 L274 506 Z" fill="${SWEATER}"/>`;
    o += `<path d="M150 420 Q200 430 250 420 L250 506 L150 506 Z" fill="${SWEATER_HI}" opacity=".35"/>`;
    o += `<rect x="186" y="356" width="28" height="40" rx="10" fill="${SKIN_DK}"/>`;
    o += `<path d="M176 392 Q200 408 224 392" stroke="#2C476F" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    o += `<g transform="translate(236 432) rotate(-8)"><rect x="0" y="6" width="22" height="12" rx="2" fill="#E5322D"/><rect x="3" y="1" width="6" height="6" rx="1.5" fill="#E5322D"/><rect x="13" y="1" width="6" height="6" rx="1.5" fill="#E5322D"/></g>`;
    o += `<g transform="translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${tilt})">${head(st.mood, { look: st.look || 0 })}</g>`;
    return o;
  }
  function officeArms(st) {
    const t = st.t || 0;
    const arm = (sh, el, hd) => `<path d="M${sh[0]} ${sh[1]} Q${el[0]} ${el[1]} ${hd[0]} ${hd[1]}" stroke="${SWEATER}" stroke-width="26" stroke-linecap="round" fill="none"/><circle cx="${hd[0]}" cy="${hd[1]}" r="13" fill="${SKIN_FLAT}"/>`;
    const shL = [146, 418], shR = [254, 418];
    let o = "";
    if (st.pose === "bored") {
      o += arm(shL, [132, 488], [186, 506]);
      o += arm(shR, [276, 500], [234, 372]);
    } else if (st.pose === "work" || st.pose === "frantic") {
      const k = st.pose === "frantic" ? 9 : 4, sp = st.pose === "frantic" ? 42 : 16;
      o += arm(shL, [138, 486], [176, 510 - Math.max(0, Math.sin(t * sp)) * k]);
      o += arm(shR, [262, 486], [224, 510 - Math.max(0, Math.sin(t * sp + 1.7)) * k]);
      if (st.pose === "frantic") o += `<path d="M160 490 l-10 -8 M168 484 l-6 -12 M236 484 l6 -12 M244 490 l10 -8" stroke="#FFE9A6" stroke-width="2.5" stroke-linecap="round"/>`;
    } else if (st.pose === "shock") {
      o += arm(shL, [120, 380], [150, 330]);
      o += arm(shR, [280, 380], [250, 330]);
    } else if (st.pose === "slam") {
      const s = st.slam;
      o += arm(shL, [132, 488], [186, 506]);
      o += arm(shR, [lerp(306, 306, s), lerp(350, 500, s)], [lerp(298, 268, s), lerp(262, 586, s)]);
    }
    return o;
  }
  // the big red button that rises out of the desk
  function redButton(st) {
    if (!st.show) return "";
    const y = st.rise, press = st.press, c = st.cracks;
    let o = `<g transform="translate(268 ${(600 + y).toFixed(1)})">`;
    o += `<path d="M-52 0 L52 0 L58 48 L-58 48 Z" fill="url(#gMetal)"/><path d="M-52 0 L52 0 L54 8 L-54 8 Z" fill="#E7EBF1"/>`;
    o += `<text x="0" y="34" text-anchor="middle" font-family="Orbitron, monospace" font-weight="900" font-size="12" letter-spacing="2" fill="#2B2F3A">IPO</text>`;
    o += `<ellipse cx="0" cy="0" rx="44" ry="13" fill="#6E0B07"/>`;
    const dome = 20 - press * 12;
    o += `<path d="M-40 0 Q-40 ${-dome - 10} 0 ${-dome - 12} Q40 ${-dome - 10} 40 0 Z" fill="url(#gRed)"/>`;
    o += `<ellipse cx="-14" cy="${-dome - 4}" rx="12" ry="4" fill="#fff" opacity=".45"/>`;
    const cracks = ["M-6 -24 L-14 -14 L-8 -8 L-18 0", "M8 -26 L16 -16 L10 -10 L20 -2", "M-2 -30 L2 -20 L-4 -12 L4 -4", "M-26 -12 L-16 -10 L-22 -2", "M24 -14 L14 -8 L22 -2"];
    for (let i = 0; i < c; i++) o += `<path d="${cracks[i]}" stroke="#3A0503" stroke-width="2.2" fill="none" stroke-linejoin="round" transform="translate(0 ${press * 8})"/>`;
    return o + "</g>";
  }

  // ================= MANSION =================
  function mansionStatic() {
    let o = "";
    o += `<rect x="-100" y="-40" width="600" height="460" fill="url(#gSky)"/>`;
    o += `<circle cx="318" cy="92" r="80" fill="url(#gSun)"/><circle cx="318" cy="92" r="24" fill="#FFF6D0"/>`;
    o += `<g id="mClouds"></g>`;
    // distant hills + trees
    o += `<path d="M-100 300 Q40 250 150 280 T420 262 L500 320 L-100 320 Z" fill="#9CCB8E"/><path d="M-100 318 Q60 286 200 304 T500 296 L500 340 L-100 340 Z" fill="#7DB870"/>`;
    // the house: two wings, a columned center block, balustrades, a cupola
    const win = (x, y, w, h) => `<g><path d="M${x} ${y + h} L${x} ${y + w / 2} Q${x + w / 2} ${y - 2} ${x + w} ${y + w / 2} L${x + w} ${y + h} Z" fill="#9CC7E4"/><path d="M${x + 2} ${y + h} L${x + 2} ${y + w / 2} Q${x + w / 2} ${y + 2} ${x + w - 2} ${y + w / 2}" fill="none" stroke="#FFFFFF" stroke-width="2"/><path d="M${x + w / 2} ${y + 4} L${x + w / 2} ${y + h} M${x} ${y + h * 0.62} L${x + w} ${y + h * 0.62}" stroke="#FFFFFF" stroke-width="1.6"/><path d="M${x + 3} ${y + h - 6} L${x + w * 0.4} ${y + w / 2}" stroke="#fff" stroke-width="3" opacity=".35"/><rect x="${x - 3}" y="${y + h}" width="${w + 6}" height="4" fill="#E6DCC8"/></g>`;
    for (const [x0, x1] of [[-60, 130], [270, 460]]) {
      o += `<rect x="${x0}" y="196" width="${x1 - x0}" height="206" fill="url(#gFacade)"/>`;
      o += `<rect x="${x0}" y="186" width="${x1 - x0}" height="12" fill="#EFE6D4"/><rect x="${x0}" y="178" width="${x1 - x0}" height="4" fill="#E2D7C2"/>`;
      for (let x = x0 + 4; x < x1; x += 9) o += `<rect x="${x}" y="181" width="4" height="6" rx="2" fill="#E8DECB"/>`;
      o += `<rect x="${x0}" y="292" width="${x1 - x0}" height="6" fill="#EDE3D0"/>`;
      for (let x = x0 + 14; x < x1 - 20; x += 36) { o += win(x, 216, 22, 56); o += win(x, 314, 22, 66); }
    }
    o += `<rect x="-60" y="196" width="520" height="206" fill="none"/>`;
    // chimneys
    o += `<rect x="10" y="150" width="18" height="36" fill="#E6DCC8"/><rect x="6" y="146" width="26" height="6" fill="#D8CCB4"/><rect x="372" y="150" width="18" height="36" fill="#E6DCC8"/><rect x="368" y="146" width="26" height="6" fill="#D8CCB4"/>`;
    // center block
    o += `<rect x="120" y="170" width="160" height="232" fill="url(#gFacade)"/>`;
    o += `<path d="M108 172 L200 112 L292 172 Z" fill="#F7F1E4" stroke="#E2D7C2" stroke-width="3"/><path d="M130 166 L200 124 L270 166 Z" fill="#EDE4D2"/><circle cx="200" cy="150" r="13" fill="url(#gGold)"/><circle cx="200" cy="150" r="10" fill="none" stroke="#FFF6D8" stroke-width="1"/><text x="200" y="156" text-anchor="middle" font-family="DM Serif Display, Georgia, serif" font-size="16" fill="#FFF6D8">A</text>`;
    // cupola
    o += `<rect x="186" y="84" width="28" height="30" fill="#FFFDF7" stroke="#E2D7C2"/><path d="M182 86 Q200 58 218 86 Z" fill="#6E8FB0"/><path d="M200 60 L200 44" stroke="url(#gGold)" stroke-width="2.5"/><circle cx="200" cy="42" r="3.5" fill="url(#gGold)"/><rect x="194" y="92" width="12" height="16" rx="6" fill="#9CC7E4"/>`;
    o += `<rect x="112" y="170" width="176" height="8" fill="#EFE6D4"/>`;
    o += win(142, 190, 22, 48) + win(189, 190, 22, 48) + win(236, 190, 22, 48);
    // grand door
    o += `<path d="M176 402 L176 328 Q200 300 224 328 L224 402 Z" fill="#1F3252"/><path d="M200 318 L200 402" stroke="#16243E" stroke-width="2"/><circle cx="194" cy="366" r="2.6" fill="url(#gGold)"/><circle cx="206" cy="366" r="2.6" fill="url(#gGold)"/><path d="M180 330 Q200 306 220 330" stroke="url(#gGold)" stroke-width="2" fill="none"/>`;
    // columns
    for (const x of [132, 156, 244, 268]) o += `<rect x="${x - 7}" y="250" width="14" height="148" fill="#FFFFFF"/><rect x="${x - 5}" y="250" width="3" height="148" fill="#EFE8DA"/><rect x="${x + 3}" y="250" width="2" height="148" fill="#E6DCC8"/><rect x="${x - 10}" y="244" width="20" height="8" fill="#F4EEE2"/><rect x="${x - 10}" y="394" width="20" height="8" fill="#F4EEE2"/>`;
    o += `<rect x="116" y="238" width="168" height="8" fill="#EFE6D4"/>`;
    // steps + hedges + topiary
    o += `<path d="M150 402 L250 402 L262 412 L138 412 Z" fill="#E9E1D2"/><path d="M138 412 L262 412 L274 422 L126 422 Z" fill="#DDD3C1"/>`;
    o += `<path d="M-100 400 L130 400 L130 418 L-100 418 Z" fill="#4E8F4A"/><path d="M270 400 L500 400 L500 418 L270 418 Z" fill="#4E8F4A"/>`;
    for (let x = -96; x < 500; x += 16) if (x < 128 || x > 272) o += `<circle cx="${x}" cy="402" r="9" fill="#5FA457"/>`;
    for (const x of [100, 300]) o += `<g transform="translate(${x} 422)"><path d="M-12 0 L12 0 L9 -14 L-9 -14 Z" fill="#F4EEE3" stroke="#DCD2C1"/><path d="M0 -70 Q16 -40 12 -16 L-12 -16 Q-16 -40 0 -70 Z" fill="#3F7E3C"/><path d="M0 -66 Q8 -44 6 -20" stroke="#5FA457" stroke-width="3" fill="none"/></g>`;
    // terrace
    o += `<rect x="-100" y="418" width="600" height="68" fill="url(#gStone)"/>`;
    for (let x = -100; x < 500; x += 40) o += `<path d="M${x} 418 L${x - 10} 486" stroke="#D5CAB6" stroke-width="1"/>`;
    o += `<path d="M-100 448 L500 448" stroke="#D5CAB6" stroke-width="1"/>`;
    // lounge chairs + umbrella
    o += `<g transform="translate(330 474)"><path d="M-30 0 L30 0 L36 -14 L-24 -14 Z" fill="#FFFFFF" stroke="#D9D2C3"/><path d="M24 -14 L40 -34 L46 -30 L32 -12 Z" fill="#FFFFFF" stroke="#D9D2C3"/><path d="M-26 0 L-26 8 M26 0 L26 8" stroke="#B9AE98" stroke-width="3"/><rect x="-18" y="-18" width="26" height="6" rx="3" fill="#1497C2"/></g>`;
    o += `<g transform="translate(372 470)"><path d="M0 0 L0 -86" stroke="#8C95A3" stroke-width="3"/><path d="M-46 -76 Q0 -110 46 -76 Z" fill="#FFFFFF"/><path d="M-46 -76 Q-23 -104 -12 -100 L-15 -76 Z M12 -100 Q23 -104 46 -76 L15 -76 Z" fill="#1F3252"/></g>`;
    // side table with the silver bell
    o += `<g transform="translate(82 472)"><ellipse cx="0" cy="-24" rx="18" ry="5" fill="#FFFFFF" stroke="#D9D2C3"/><path d="M0 -24 L0 0 M-10 0 L10 0" stroke="#B9AE98" stroke-width="3"/></g>`;
    o += `<g id="mTableBell" transform="translate(82 448)">${bellSVG()}</g>`;
    // the pool
    o += `<rect x="-100" y="478" width="600" height="10" fill="#EFE8DC"/><rect x="-100" y="486" width="600" height="3" fill="#CFC4B1"/>`;
    o += `<rect x="-100" y="488" width="600" height="156" fill="url(#gWater)"/>`;
    o += `<g opacity=".18"><rect x="120" y="492" width="160" height="60" fill="#FFFFFF"/></g>`;
    o += `<g id="mCaustics"></g>`;
    o += `<rect x="-100" y="640" width="600" height="12" fill="#EFE8DC"/><rect x="-100" y="652" width="600" height="120" fill="url(#gStone)"/>`;
    for (let x = -100; x < 500; x += 44) o += `<path d="M${x} 652 L${x - 14} 760" stroke="#D5CAB6"/>`;
    // flamingo float drifting in the pool
    o += `<g id="mFlamingo"></g>`;
    return o;
  }
  function mansionFront() {
    // potted palms in the foreground
    const palm = (x, flip) => `<g transform="translate(${x} 712) scale(${flip} 1)"><path d="M-22 0 L22 0 L16 -40 L-16 -40 Z" fill="#F4EEE3" stroke="#DCD2C1"/><path d="M0 -40 Q6 -120 -4 -190" stroke="#9A7B55" stroke-width="7" fill="none"/>
      <g class="sway">${[[-70, -230, -30], [-40, -250, -10], [10, -254, 10], [50, -236, 30], [66, -206, 50], [-80, -198, -50]].map(([x2, y2]) => `<path d="M-4 -190 Q${x2 / 2} ${y2 - 20} ${x2} ${y2 + 20}" stroke="#3F8A45" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M-4 -190 Q${x2 / 2} ${y2 - 20} ${x2} ${y2 + 20}" stroke="#5FAE5A" stroke-width="4" fill="none" stroke-linecap="round"/>`).join("")}</g></g>`;
    return palm(-6, 1) + palm(406, -1);
  }
  function bellSVG() { return `<path d="M-9 0 Q-9 -16 0 -18 Q9 -16 9 0 Z" fill="url(#gSilver)"/><rect x="-11" y="-1" width="22" height="3" rx="1.5" fill="#C9D0DA"/><path d="M0 -18 L0 -26" stroke="#8C95A3" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="3" r="2" fill="#8C95A3"/>`; }

  // full-body Adam at the mansion. feet at (0, 0)
  function mAdam(st) {
    const sw = st.wet ? SWEATER_WET : SWEATER, t = st.t || 0;
    let o = "";
    if (st.pose === "float") {
      o += `<ellipse cx="0" cy="4" rx="46" ry="14" fill="rgba(0,60,90,.25)"/>`;
      o += `<path d="M-30 -30 Q-32 -64 0 -66 Q32 -64 30 -30 Z" fill="${sw}"/>`;
      o += `<g transform="translate(0 -92) scale(.52)">${head("smug", { shades: true, wet: true })}</g>`;
      o += `<ellipse cx="0" cy="-8" rx="46" ry="16" fill="#FF8FB1"/><ellipse cx="0" cy="-12" rx="30" ry="8" fill="#1497C2" opacity=".0"/><path d="M-46 -8 Q0 -30 46 -8" fill="none" stroke="#FFB3C9" stroke-width="5"/>`;
      o += [[-30, -12], [-14, -20], [10, -20], [28, -12], [36, -2], [-38, -2]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="5" height="2" rx="1" fill="${["#FFE36E", "#6FE3B0", "#FFFFFF"][i % 3]}" transform="rotate(${i * 40} ${x} ${y})"/>`).join("");
      o += `<path d="M-30 -24 Q-44 -18 -40 -8" stroke="${sw}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M30 -24 Q44 -18 40 -8" stroke="${sw}" stroke-width="11" stroke-linecap="round" fill="none"/>`;
      return o;
    }
    if (st.pose === "jump") {
      // cannonball
      o += `<circle cx="0" cy="-34" r="28" fill="${sw}"/><path d="M-20 -30 Q0 -6 20 -30" stroke="#4A6FA5" stroke-width="14" fill="none" stroke-linecap="round"/>`;
      o += `<circle cx="-18" cy="-18" r="6" fill="#FFFFFF"/><circle cx="18" cy="-18" r="6" fill="#FFFFFF"/>`;
      o += `<g transform="translate(0 -68) scale(.42)">${head("happy", { wet: st.wet })}</g>`;
      return o;
    }
    // legs
    const swing = st.pose === "walk" ? Math.sin(t * 14) * 16 : 0;
    for (const [s, ph] of [[-1, 1], [1, -1]]) {
      o += `<g transform="rotate(${(swing * ph).toFixed(1)} ${s * 7} -46)"><path d="M${s * 7 - 7} -46 L${s * 7 + 7} -46 L${s * 7 + 6} -6 L${s * 7 - 6} -6 Z" fill="#4A6FA5"/><path d="M${s * 7 - 7} -6 L${s * 7 + 10} -6 Q${s * 7 + 13} 0 ${s * 7 + 9} 1 L${s * 7 - 7} 1 Z" fill="#FFFFFF" stroke="#D8DDE5"/></g>`;
    }
    // torso
    o += `<path d="M-19 -44 L-20 -80 Q-18 -90 0 -91 Q18 -90 20 -80 L19 -44 Z" fill="${sw}"/><rect x="-19" y="-48" width="38" height="5" rx="2" fill="${st.wet ? "#1B2F4C" : "#2C476F"}"/>`;
    o += `<rect x="6" y="-78" width="9" height="5" fill="#E5322D"/>`;
    // arms
    const arm = (sx, hx, hy, ex, ey) => `<path d="M${sx} -84 Q${ex} ${ey} ${hx} ${hy}" stroke="${sw}" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="${hx}" cy="${hy}" r="4.5" fill="${SKIN_FLAT}"/>`;
    if (st.pose === "ring") {
      const sh = Math.sin(t * 40) * 6;
      o += arm(-16, -18, -48, -26, -66);
      o += arm(16, 22 + sh, -122, 30, -104);
      o += `<g transform="translate(${22 + sh} -118) rotate(${sh * 3})">${bellSVG()}</g>`;
    } else if (st.pose === "wave") {
      const sh = Math.sin(t * 12) * 10;
      o += arm(-16, -18, -48, -26, -66) + arm(16, 30 + sh, -124, 30, -104);
    } else {
      o += arm(-16, -20, -48 + swing * 0.1, -24, -66) + arm(16, 20, -48 - swing * 0.1, 24, -66);
    }
    o += `<g transform="translate(0 -110) scale(.42)">${head(st.mood || "smug", { wet: st.wet, shades: st.shades })}</g>`;
    return o;
  }

  // the butler. feet at (0, 0). st: walk, lift (cloche), item, bow
  function butler(st) {
    const t = st.t || 0, swing = st.walk ? Math.sin(t * 12) * 14 : 0;
    let o = `<g transform="rotate(${(st.bow || 0) * 18} 0 -60)">`;
    for (const [s, ph] of [[-1, 1], [1, -1]]) o += `<g transform="rotate(${(swing * ph).toFixed(1)} ${s * 6} -56)"><path d="M${s * 6 - 6} -56 L${s * 6 + 6} -56 L${s * 6 + 5} -4 L${s * 6 - 5} -4 Z" fill="#1A1C22"/><path d="M${s * 6 - 6} -4 L${s * 6 + 10} -4 Q${s * 6 + 12} 1 ${s * 6 + 8} 1 L${s * 6 - 6} 1 Z" fill="#0B0C10"/></g>`;
    // tailcoat
    o += `<path d="M-18 -60 L-24 -30 L-10 -34 L-8 -58 Z" fill="#14161C"/>`;
    o += `<path d="M-17 -56 L-18 -98 Q-16 -106 0 -107 Q16 -106 18 -98 L17 -56 Z" fill="#1A1C22"/>`;
    o += `<path d="M-6 -104 L6 -104 L4 -60 L-4 -60 Z" fill="#FFFFFF"/><path d="M-6 -104 L0 -84 L6 -104" fill="#E9ECF1"/><path d="M-5 -100 L0 -97 L5 -100 L5 -94 L0 -97 L-5 -94 Z" fill="#0B0C10"/>`;
    // left arm lifts the cloche, right arm holds the tray
    const lift = st.lift || 0;
    o += `<path d="M-15 -100 Q-26 ${-80 - lift * 30} ${-6 + lift * 4} ${-96 - lift * 30}" stroke="#1A1C22" stroke-width="8" stroke-linecap="round" fill="none"/>`;
    o += `<path d="M15 -100 Q30 -82 30 -94" stroke="#1A1C22" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="30" cy="-95" r="4.5" fill="#FFFFFF"/>`;
    // tray + item + cloche
    o += `<ellipse cx="30" cy="-98" rx="26" ry="5" fill="url(#gSilver)"/>`;
    if (lift > 0.4 && st.item) o += `<g transform="translate(30 -100)">${itemSVG(st.item)}</g>`;
    o += `<g transform="translate(${30 - lift * 30} ${-100 - lift * 36}) rotate(${-lift * 30})"><path d="M-22 0 Q-22 -26 0 -28 Q22 -26 22 0 Z" fill="url(#gSilver)"/><circle cx="0" cy="-30" r="3.5" fill="#C9D0DA"/><path d="M-14 -6 Q-12 -20 0 -22" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/></g>`;
    o += `<circle cx="${-6 + lift * 4}" cy="${-96 - lift * 30}" r="4.5" fill="#FFFFFF"/>`;
    // head: distinguished grey
    o += `<rect x="-5" y="-116" width="10" height="10" fill="#E8B894"/>`;
    o += `<ellipse cx="0" cy="-126" rx="12" ry="13" fill="#F0C7A3"/>`;
    o += `<path d="M-12 -126 Q-13 -138 -6 -138 L-10 -122 Z M12 -126 Q13 -138 6 -138 L10 -122 Z" fill="#C9CCD2"/>`;
    o += `<path d="M-8 -118 Q0 -114 8 -118 Q4 -121 0 -119 Q-4 -121 -8 -118 Z" fill="#B9BCC4"/>`;
    o += `<path d="M-6 -128 L-2 -128 M2 -128 L6 -128" stroke="#2A1C14" stroke-width="1.8" stroke-linecap="round"/><path d="M-7 -132 L-2 -133 M2 -133 L7 -132" stroke="#9A9EA8" stroke-width="1.6"/>`;
    return o + "</g>";
  }
  function itemSVG(k) {
    switch (k) {
      case "sushi": return `<rect x="-20" y="-6" width="40" height="7" rx="2" fill="#2B2F3A"/>${[-12, 0, 12].map((x) => `<ellipse cx="${x}" cy="-8" rx="5.5" ry="3" fill="#FFFFFF"/><path d="M${x - 6} -10 Q${x} -15 ${x + 6} -10 Q${x} -8 ${x - 6} -10 Z" fill="#FF8A5B"/><path d="M${x - 3} -12 L${x + 3} -11" stroke="#fff" stroke-width=".8"/>`).join("")}`;
      case "pie": return `<ellipse cx="0" cy="-2" rx="16" ry="4" fill="#FFFFFF"/><path d="M-12 -4 L12 -4 L4 -16 Z" fill="#C0392B"/><path d="M-12 -4 L12 -4 L10 -2 L-10 -2 Z" fill="#E0A55E"/><path d="M-6 -8 L6 -8 M-2 -12 L3 -12" stroke="#F2C88A" stroke-width="2"/>`;
      case "lego": return `<rect x="-16" y="-24" width="32" height="22" rx="2" fill="#FFC31F"/><rect x="-12" y="-20" width="10" height="8" fill="#E5322D"/><rect x="0" y="-16" width="12" height="10" fill="#2F6FE4"/><text x="0" y="-5" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="5" fill="#1E2433">9,000 PCS</text>`;
      case "towel": return `<rect x="-16" y="-14" width="32" height="12" rx="4" fill="#FFFFFF" stroke="#E4E7EC"/><rect x="-16" y="-10" width="32" height="3" fill="url(#gGold)"/><path d="M-16 -8 Q-18 -2 -14 -2" stroke="#E4E7EC" fill="none"/>`;
      case "lemonade": return `<path d="M-7 -26 L7 -26 L5 -2 L-5 -2 Z" fill="#FFF4B0" stroke="#fff"/><circle cx="7" cy="-26" r="5" fill="#FFE36E" stroke="#fff"/><path d="M-2 -26 L4 -36" stroke="#E0271E" stroke-width="2"/>`;
      case "ticket": return `<rect x="-18" y="-16" width="36" height="14" rx="2" fill="#FFFFFF" stroke="#D9DEE6"/><text x="-12" y="-6" font-family="Orbitron, monospace" font-weight="900" font-size="7" fill="#1497C2">LAX</text><path d="M8 -14 L8 -4" stroke="#C9D0DA" stroke-dasharray="1.5 1.5"/><path d="M12 -10 l4 0" stroke="#1E2433"/>`;
      case "card": return `<rect x="-14" y="-18" width="28" height="18" rx="2" fill="#FFFDF7" stroke="#E6DCC8"/><path d="M-10 -12 L6 -12 M-10 -8 L10 -8 M-10 -4 L2 -4" stroke="#8C95A3" stroke-width="1.2"/>`;
      default: return "";
    }
  }
  const BUTLER = [
    { item: "sushi", b: "Your sushi, sir.", a: "Excellent." },
    { item: "pie", b: "Rhubarb pie, sir. Still warm.", a: "Oh. Nice." },
    { item: "lego", b: "The nine-thousand-piece set, sir.", a: "It's for the kids." },
    { item: "lemonade", b: "Lemonade, sir.", a: "Perfect." },
    { item: "ticket", b: "Your flight to LA, sir. Private.", a: "…Fine." },
    { item: "card", b: "The stock is up four hundred percent, sir.", a: "We'll see." },
    { item: "card", b: "Some youths are on the lawn, sir.", a: "Youths." },
    { item: "towel", b: "A towel, sir.", a: "Thanks." },
  ];

  // ---------- particles ----------
  const parts = [];
  function burst(x, y, n, kind, colors, speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = kind === "drop" ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: kind === "spark" ? 20 : 520, age: 0, life: 0.7 + Math.random() * 0.7, c: pick(colors), s: 2 + Math.random() * 4, r: Math.random() * 360, vr: (Math.random() - 0.5) * 600, kind });
    }
  }
  function ring(x, y) { parts.push({ x, y, age: 0, life: 1.1, kind: "ring", vx: 0, vy: 0, g: 0, r: 0, vr: 0 }); }
  let last = performance.now(), clock = 0;
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05) / SPEED; last = now; clock += dt;
    // particles
    let o = "";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      const a = 1 - p.age / p.life, tr = `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)})`;
      if (p.kind === "ring") { const k = p.age / p.life; o += `<ellipse cx="${p.x}" cy="${p.y}" rx="${(12 + k * 70).toFixed(1)}" ry="${(4 + k * 18).toFixed(1)}" fill="none" stroke="#FFFFFF" stroke-width="${(3 * a).toFixed(2)}" opacity="${a.toFixed(2)}"/>`; }
      else if (p.kind === "coin") o += `<ellipse transform="${tr}" rx="${(p.s * Math.abs(Math.cos(p.r / 30)) + 1).toFixed(1)}" ry="${p.s}" fill="url(#gGold)" opacity="${a.toFixed(2)}"/>`;
      else if (p.kind === "shard") o += `<path transform="${tr}" d="M0 -${p.s * 1.5} L${p.s} ${p.s} L-${p.s} ${p.s * 0.6} Z" fill="${p.c}" opacity="${a.toFixed(2)}"/>`;
      else if (p.kind === "spark") o += `<path transform="${tr}" d="M0 -${p.s * 1.6} L${p.s * 0.4} 0 L0 ${p.s * 1.6} L-${p.s * 0.4} 0 Z M-${p.s * 1.6} 0 L0 ${p.s * 0.4} L${p.s * 1.6} 0 L0 -${p.s * 0.4} Z" fill="${p.c}" opacity="${a.toFixed(2)}"/>`;
      else o += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(p.s * 0.8).toFixed(1)}" fill="${p.c}" opacity="${a.toFixed(2)}"/>`;
    }
    $("#fx").innerHTML = o;
    if (scene === "office") drawOffice();
    else drawMansionLive();
    requestAnimationFrame(frame);
  }

  // ---------- state ----------
  let scene = "office";
  const O = { pose: "bored", mood: "bored", t: 0, look: 0, live: false, ringing: false, btn: { show: false, rise: 160, press: 0, cracks: 0 }, slam: 0 };
  const M = { adam: { x: 140, y: 470, s: 1.3, pose: "stand", mood: "smug", wet: false, t: 0 }, butler: { x: 200, y: 400, s: 0.6, on: false, walk: false, lift: 0, item: null, bow: 0, flip: 1 }, busy: false, worth: 3812447190, used: [] };

  function drawOffice() {
    O.t = clock;
    const g = $("#office");
    if (!g.dataset.built) { g.innerHTML = `${officeStatic()}<g id="oAdam"></g><g id="oDesk">${officeDesk()}</g><g id="oMonitor"></g><g id="oAlarm"></g><g id="oArms"></g><g id="oButton"></g>`; g.dataset.built = "1"; }
    $("#oAdam").innerHTML = officeAdam(O);
    $("#oMonitor").innerHTML = monitor(clock, O.live);
    $("#oAlarm").innerHTML = alarmClock(O.ringing);
    $("#oArms").innerHTML = officeArms(O);
    $("#oButton").innerHTML = redButton(O.btn);
  }
  function drawMansionLive() {
    const g = $("#mansion");
    if (!g.dataset.built) { g.innerHTML = `${mansionStatic()}<g id="mButler"></g><g id="mAdam"></g>${mansionFront()}`; g.dataset.built = "1"; }
    // clouds, water shimmer, flamingo
    let c = "";
    for (let i = 0; i < 4; i++) { const x = ((i * 150 + clock * (8 + i * 3)) % 640) - 120, y = 40 + i * 26; c += `<g transform="translate(${x.toFixed(0)} ${y})" opacity=".9"><circle r="16" fill="#fff"/><circle cx="18" cy="-8" r="20" fill="#fff"/><circle cx="40" cy="0" r="15" fill="#fff"/><rect x="0" y="0" width="40" height="15" fill="#fff"/></g>`; }
    $("#mClouds").innerHTML = c;
    let w = "";
    for (let r = 0; r < 7; r++) {
      const y = 500 + r * 21; let d = `M-100 ${y}`;
      for (let x = -100; x <= 500; x += 20) d += ` Q${x + 10} ${(y + Math.sin(x * 0.05 + clock * 1.6 + r) * 4).toFixed(1)} ${x + 20} ${y}`;
      w += `<path d="${d}" stroke="#FFFFFF" stroke-width="${1.4 + r * 0.2}" fill="none" opacity="${(0.18 + r * 0.03).toFixed(2)}"/>`;
    }
    $("#mCaustics").innerHTML = w;
    const fx = 300 + Math.sin(clock * 0.3) * 30, fy = 610 + Math.sin(clock * 1.2) * 2;
    $("#mFlamingo").innerHTML = `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)})"><ellipse cx="0" cy="0" rx="26" ry="8" fill="#FF8FB1"/><path d="M10 -2 Q16 -30 6 -34 Q0 -36 2 -28" stroke="#FF8FB1" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M0 -28 L-6 -26" stroke="#1E2433" stroke-width="3" stroke-linecap="round"/></g>`;
    document.querySelectorAll(".sway").forEach((el, i) => el.setAttribute("transform", `rotate(${(Math.sin(clock * 0.9 + i) * 2.5).toFixed(2)} -4 -190)`));
    // Adam + butler
    const A = M.adam; A.t = clock;
    if (A.wet && Math.random() < 0.08 && A.pose !== "float") burst(A.x + (Math.random() - 0.5) * 30, A.y - 60 * A.s, 1, "drop", ["#8FDDF0"], 20);
    $("#mAdam").innerHTML = `<g transform="translate(${A.x.toFixed(1)} ${A.y.toFixed(1)}) scale(${A.s.toFixed(3)})">${A.pose !== "float" ? `<ellipse cx="0" cy="2" rx="22" ry="5" fill="rgba(0,0,0,.18)"/>` : ""}${mAdam(A)}</g>`;
    const B = M.butler;
    $("#mButler").innerHTML = B.on ? `<g transform="translate(${B.x.toFixed(1)} ${B.y.toFixed(1)}) scale(${(B.s * B.flip).toFixed(3)} ${B.s.toFixed(3)})" opacity="${(B.alpha ?? 1).toFixed(2)}"><ellipse cx="0" cy="2" rx="18" ry="4" fill="rgba(0,0,0,.18)"/>${butler({ ...B, t: clock })}</g>` : "";
  }

  // ---------- overlays ----------
  function pin(el, wx, wy) {
    const svg = $("#scene"), m = svg.getScreenCTM(), r = $("#stage").getBoundingClientRect();
    if (!m) return;
    const w = el.offsetWidth || 0;
    el.style.left = clamp(m.a * wx + m.e - r.left, w / 2 + 8, r.width - w / 2 - 8) + "px";
    el.style.top = (m.d * wy + m.f - r.top) + "px";
  }
  const bubbleT = {};
  function say(who, text, wx, wy, ms = 1800) {
    const el = who === "butler" ? $("#bButler") : $("#bAdam");
    el.textContent = text; pin(el, wx, wy); el.classList.add("show");
    clearTimeout(bubbleT[who]); bubbleT[who] = setTimeout(() => el.classList.remove("show"), ms * Math.max(SPEED, 0.5));
  }
  function pop(text, wx, wy, color = "#fff") {
    const el = $("#pop"); el.textContent = text; el.style.color = color; pin(el, wx, wy);
    el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
  }
  function flash() { const f = $("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function shake() { if (reduced) return; const s = $("#stage"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); }
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  // ================= PHASE 1: the countdown =================
  let smashes = 0, smashOpen = false, phaseToken = 0;
  async function startOffice() {
    const token = ++phaseToken;
    scene = "office";
    Object.assign(O, { pose: "bored", mood: "bored", live: false, ringing: false, btn: { show: false, rise: 160, press: 0, cracks: 0 }, look: 0 });
    $("#office").setAttribute("transform", ""); $("#office").style.opacity = 1; $("#office").style.display = "";
    $("#mansion").style.display = "none"; $("#mansion").style.opacity = 0;
    $("#actions").hidden = true; $("#prompt").hidden = true; $("#worth").hidden = true;
    $("#hudPill").className = "pill"; $("#hudPill").textContent = "Waiting for the IPO…";
    smashes = 0; $("#smashBar").style.width = "0";
    const said = new Set(), t0 = performance.now(), dur = 10000 * SPEED;
    let lastKey = 0, lastSec = 11;
    await new Promise((done) => {
      (function tick(now) {
        if (token !== phaseToken) return;
        const left = Math.max(0, dur - (now - t0)), secs = Math.ceil(left / 1000 / SPEED), rem = left / SPEED / 1000;
        $("#oClock").textContent = "00:" + String(secs).padStart(2, "0");
        if (secs < lastSec && secs <= 3 && secs > 0) sfx.tick();
        lastSec = secs;
        if (rem > 7) { O.pose = "bored"; O.mood = "bored"; }
        else if (rem > 3) { O.pose = "work"; O.mood = "focus"; O.look = -3; }
        else { O.pose = "frantic"; O.mood = "frantic"; O.look = -3; }
        const keyGap = O.pose === "frantic" ? 45 : O.pose === "work" ? 140 : 99999;
        if (now - lastKey > keyGap * SPEED) { sfx.key(); lastKey = now; }
        const lines = [[9.3, "Any minute now."], [7.8, "We'll see."], [6.2, "Okay. Spreadsheets."], [2.8, "Come on, come on…"]];
        for (const [at, text] of lines) if (rem < at && !said.has(at)) { said.add(at); say("adam", text, 200, 262); }
        if (left > 0) requestAnimationFrame(tick); else done();
      })(t0);
    });
    if (token !== phaseToken) return;
    // the alarm goes off
    O.live = true; O.ringing = true; O.pose = "shock"; O.mood = "shock"; O.look = 0;
    $("#oClock").textContent = "00:00";
    $("#hudPill").className = "pill live"; $("#hudPill").textContent = "IPO IS LIVE";
    sfx.ring(); ringTimer = setInterval(sfx.ring, 520 * Math.max(SPEED, 0.3));
    flash(); shake();
    say("adam", "Oh.", 200, 262, 1200);
    O.btn.show = true;
    await tween(500, (t) => { O.btn.rise = lerp(160, 0, t); }, easeOut);
    O.pose = "slam"; O.slam = 0; O.mood = "frantic";
    $("#prompt").hidden = false; smashOpen = true;
  }

  async function smash() {
    if (!smashOpen) return;
    smashOpen = false;
    smashes++;
    $("#smashBar").style.width = (smashes / SMASHES) * 100 + "%";
    await tween(90, (t) => { O.slam = t; O.btn.press = t; }, (t) => t);
    sfx.smash(); shake();
    O.btn.cracks = Math.min(5, smashes);
    if (smashes > 1) sfx.crack();
    burst(268, 580, 8, "spark", ["#FFE9A6", "#FFFFFF"], 140);
    pop(pick(["SMASH!", "BAM!", "WHAM!", "CRACK!"]), 300, 500, "#FFE36E");
    if (smashes >= SMASHES) { await breakButton(); return; }
    await tween(110, (t) => { O.slam = 1 - t; O.btn.press = 1 - t * 0.8; });
    smashOpen = true;
  }

  async function breakButton() {
    $("#prompt").hidden = true;
    clearInterval(ringTimer); O.ringing = false;
    O.btn.show = false;
    burst(268, 580, 26, "shard", ["#E0271E", "#8E0F0A", "#FF7A6B", "#C9D0DA"], 260);
    burst(268, 580, 30, "coin", ["gold"], 300);
    sfx.boom(); shake();
    say("adam", "OKAY.", 200, 262, 900);
    await wait(450);
    // zoom into the button and out into the mansion
    sfx.whoosh();
    await tween(520, (t) => { const s = 1 + t * 2.4; $("#office").setAttribute("transform", `translate(268 586) scale(${s.toFixed(3)}) translate(-268 -586)`); $("#office").style.opacity = String(1 - t); }, (t) => t * t);
    flash();
    enterMansion();
  }

  // ================= PHASE 2: the mansion =================
  async function enterMansion() {
    scene = "mansion";
    $("#office").style.display = "none";
    const g = $("#mansion"); g.style.display = "";
    Object.assign(M.adam, { x: 140, y: 470, s: 1.3, pose: "wave", mood: "happy", wet: false, shades: false });
    M.butler.on = false; M.busy = true;
    $("#hudPill").className = "pill home"; $("#hudPill").textContent = "Adam's House";
    $("#worth").hidden = false;
    $("#bigTitle").hidden = false; $("#bigTitle").style.animation = "none"; void $("#bigTitle").offsetWidth; $("#bigTitle").style.animation = "";
    burst(200, 300, 40, "coin", ["gold"], 260);
    burst(200, 300, 24, "spark", ["#FFFFFF", "#FFE9A6"], 180);
    await tween(900, (t) => { g.style.opacity = String(t); g.setAttribute("transform", `translate(200 360) scale(${(1.18 - 0.18 * t).toFixed(3)}) translate(-200 -360)`); }, easeOut);
    g.setAttribute("transform", "");
    await wait(1500);
    $("#bigTitle").hidden = true;
    M.adam.pose = "stand"; M.adam.mood = "smug";
    say("adam", "Nice.", M.adam.x, M.adam.y - 170, 1400);
    await wait(700);
    $("#actions").hidden = false; M.busy = false; setActions(true);
  }
  function setActions(on) { $("#poolBtn").disabled = !on; $("#bellBtn").disabled = !on; }
  setInterval(() => { if (scene === "mansion") { M.worth += 20000 + Math.random() * 900000; $("#worthVal").textContent = money(M.worth); } }, 120);

  async function walkAdam(to, ms) {
    const A = M.adam, from = { x: A.x, y: A.y, s: A.s };
    A.pose = "walk";
    let lastStep = 0;
    await tween(ms, (t, raw) => { A.x = lerp(from.x, to.x, t); A.y = lerp(from.y, to.y, t); A.s = lerp(from.s, to.s ?? from.s, t); if (raw - lastStep > 0.18) { sfx.step(); lastStep = raw; } });
    A.pose = "stand";
  }

  async function jumpInPool() {
    if (M.busy) return; M.busy = true; setActions(false);
    const A = M.adam;
    if (A.x !== 140) await walkAdam({ x: 140, y: 470 }, 300);
    await walkAdam({ x: 176, y: 480 }, 420);
    say("adam", pick(["Okay.", "Here we go.", "Fine."]), A.x, A.y - 170, 900);
    await wait(250);
    sfx.jump(); A.pose = "jump";
    const from = { x: A.x, y: A.y }, to = { x: 214, y: 586 };
    await tween(720, (t) => { A.x = lerp(from.x, to.x, t); A.y = lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * 150; A.s = lerp(1.3, 1.65, t); }, (t) => t);
    // SPLASH
    sfx.splash(); shake();
    burst(214, 578, 44, "drop", ["#FFFFFF", "#BFF3FF", "#6FE0E6"], 330);
    ring(214, 588); setTimeout(() => ring(214, 588), 220 * SPEED); setTimeout(() => ring(214, 588), 440 * SPEED);
    pop("SPLASH!", 214, 520, "#FFFFFF");
    A.wet = true; A.pose = "float"; A.shades = true; A.y = 598; A.s = 1.6;
    await wait(500);
    say("adam", pick(["We'll see.", "This is good.", "Nice.", "Okay. This is nice."]), A.x, A.y - 176, 1800);
    const t0 = clock;
    await tween(2600, () => { A.y = 598 + Math.sin((clock - t0) * 3) * 3; A.x = 214 + Math.sin((clock - t0) * 0.8) * 10; }, (t) => t);
    // climb out, dripping
    await tween(300, (t) => { A.s = lerp(1.6, 0.001, t); });
    Object.assign(A, { x: 140, y: 470, s: 1.3, pose: "stand", mood: "smug", shades: false });
    burst(140, 420, 10, "drop", ["#BFF3FF", "#FFFFFF"], 80);
    M.busy = false; setActions(true);
  }

  async function ringBell() {
    if (M.busy) return; M.busy = true; setActions(false);
    const A = M.adam, B = M.butler;
    if (Math.abs(A.x - 140) > 1) await walkAdam({ x: 140, y: 470 }, 300);
    $("#mTableBell").style.display = "none";
    A.pose = "ring"; A.mood = "smug";
    sfx.ding(); pop("DING DING", 160, 330, "#FFE36E");
    await wait(900);
    A.pose = "stand"; $("#mTableBell").style.display = "";
    // the butler emerges from the front door
    let pool = BUTLER.filter((x) => !M.used.includes(x));
    if (!pool.length) { M.used = []; pool = BUTLER.slice(); }
    let choice = A.wet && pool.find((x) => x.item === "towel") ? pool.find((x) => x.item === "towel") : pick(pool.filter((x) => x.item !== "towel" || A.wet));
    if (!choice) choice = pick(pool);
    M.used.push(choice);
    Object.assign(B, { on: true, x: 200, y: 404, s: 0.7, walk: true, lift: 0, item: choice.item, bow: 0, flip: 1, alpha: 0 });
    tween(260, (t) => { B.alpha = t; });
    let lastStep = 0;
    await tween(1500, (t, raw) => { B.x = lerp(200, 262, t); B.y = lerp(404, 474, t); B.s = lerp(0.7, 1.25, t); if (raw - lastStep > 0.14) { sfx.step(); lastStep = raw; } });
    B.walk = false;
    say("butler", choice.b, B.x + 10, B.y - 186, 2200);
    await wait(700);
    sfx.reveal();
    await tween(420, (t) => { B.lift = t; });
    burst(B.x + 38, B.y - 130, 14, "spark", ["#FFFFFF", "#FFE9A6"], 90);
    await wait(900);
    A.mood = choice.a === "Youths." ? "bored" : "smug";
    say("adam", choice.a, A.x, A.y - 170, 1600);
    if (choice.item === "towel") { await wait(500); A.wet = false; burst(A.x, A.y - 80, 10, "spark", ["#FFFFFF"], 60); }
    await wait(1100);
    await tween(420, (t) => { B.lift = 1 - t; });
    await tween(300, (t) => { B.bow = Math.sin(t * Math.PI); });
    // back inside
    B.walk = true; B.flip = -1;
    await tween(1200, (t) => { B.x = lerp(262, 200, t); B.y = lerp(474, 404, t); B.s = lerp(1.25, 0.7, t); B.alpha = t > 0.8 ? (1 - t) * 5 : 1; });
    B.on = false; A.mood = "smug";
    M.busy = false; setActions(true);
  }

  // ---------- wiring ----------
  $("#smashBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); smash(); });
  $("#smashBtn").addEventListener("click", (e) => { if (e.detail === 0) smash(); });
  $("#scene").addEventListener("pointerdown", () => { if (smashOpen) smash(); });
  $("#poolBtn").addEventListener("click", jumpInPool);
  $("#bellBtn").addEventListener("click", ringBell);
  $("#backBtn").addEventListener("click", () => { if (!M.busy) startOffice(); });
  $("#startBtn").addEventListener("click", () => { actx(); $("#title").hidden = true; startOffice(); });
  addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") { if (!$("#title").hidden) { e.preventDefault(); $("#startBtn").click(); } else if (smashOpen) { e.preventDefault(); smash(); } }
  });

  drawOffice();
  requestAnimationFrame(frame);
  if (location.hash.includes("autotest")) window.__ah = () => ({ scene, smashOpen, busy: M.busy, smashes });
})();
