// Debbie Shops: game flow, animation and sound.
(() => {
  const $ = (s) => document.querySelector(s);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED = location.hash.includes("fast") ? 0.12 : 1;   // test hook
  const TOTAL_BAGS = 12;

  // ---------- price scale ----------
  const TIERS = [
    { min: 300, food: "slice", label: "Pizza territory", slices: 1, meals: 1 },
    { min: 400, food: "slices", label: "Two-slice territory", slices: 2, meals: 2 },
    { min: 550, food: "burger", label: "Burger territory", burgers: 1, meals: 2 },
    { min: 700, food: "chinese", label: "Takeout territory", meals: 1 },
    { min: 850, food: "sandwich", label: "Deli territory", meals: 1 },
    { min: 1000, food: "pasta", label: "Pasta territory", meals: 1 },
    { min: 1150, food: "pancakes", label: "Pancake territory", meals: 1 },
    { min: 1300, food: "halfcake", label: "Half-cake territory", cakes: 0.5, meals: 1 },
    { min: 1450, food: "cake", label: "Cake territory", cakes: 1, meals: 1 },
  ];
  const tierOf = (p) => { let t = 0; TIERS.forEach((x, i) => { if (p >= x.min) t = i; }); return t; };

  const ITEMS = [
    { n: "Silk dress", k: "dress" }, { n: "Stiletto heels", k: "shoes" }, { n: "Suede jacket", k: "jacket" },
    { n: "Mini handbag", k: "handbag" }, { n: "Sunglasses", k: "sunglasses" }, { n: "Cashmere sweater", k: "sweater" },
    { n: "Decorative vase", k: "vase" }, { n: "Knee-high boots", k: "boots" }, { n: "Evening gown", k: "dress" },
    { n: "Another handbag", k: "handbag" }, { n: "Ballet flats", k: "shoes" }, { n: "Cashmere cardigan", k: "sweater" },
    { n: "Leather jacket", k: "jacket" }, { n: "Ceramic vase", k: "vase" },
  ];

  const LINES = {
    enter: ["Hi, babe!", "I'm home!", "Don't get up.", "Quick stop!", "Just a few things.", "Back again!", "I'm back!"],
    present: ["You'll like this one.", "This one was actually reasonable.", "I needed it.", "Wait till you see this.", "It's an investment.", "It was on sale."],
    after: ["It was on sale.", "I saved money.", "Don't worry about it.", "It's an investment.", "One more.", "It goes with everything.", "They had my size.", "It's basically free."],
    billyIdle: ["Again?", "Is there another bag?", "Hi.", "Oh good.", "More?"],
    react: [
      ["How much?", "Okay.", "That's… fine.", "I need pizza."],
      ["Okay. Two slices.", "How much?", "Again?", "I need pizza."],
      ["No.", "That can't be right.", "I need a burger."],
      ["No.", "That can't be right.", "Get the lo mein."],
      ["How much?!", "I need a sandwich.", "Why."],
      ["I'm going to need pasta.", "That's pasta money.", "No."],
      ["That can't be right.", "Pancakes. Now.", "I need to sit down. I'm sitting."],
      ["That's cake territory.", "Half a cake. Minimum.", "Why."],
      ["That's cake territory.", "Get the whole cake.", "Just bring the cake."],
    ],
    quotes: ["I need to lie down.", "Can we return anything?", "I should not have asked.", "I'm going to need a bigger couch.", "Was any of it on sale?", "I'm never revealing a price again."],
  };

  // ---------- positions in the scene (viewBox 400 x 500) ----------
  const DOOR = { x: 352, y: 374, s: 0.8 }, SPOT = { x: 322, y: 454, s: 1 };
  const CART_DX = -78, BILLY_X = 118, STAGE = { x: 200, y: 322 }, TABLE = { x: 190, y: 388 };
  const MOUTH = { x: BILLY_X - 7, y: 238 };
  const SLOTS = [
    { x: 34, y: 500, s: 0.8, r: -6 }, { x: 368, y: 520, s: 0.86, r: 5 }, { x: 88, y: 530, s: 0.82, r: 4 },
    { x: 262, y: 534, s: 0.82, r: -4 }, { x: 390, y: 462, s: 0.66, r: 8 }, { x: 18, y: 440, s: 0.62, r: -3 },
    { x: 180, y: 540, s: 0.8, r: 6 }, { x: 236, y: 334, s: 0.5, r: -8 }, { x: 52, y: 258, s: 0.42, r: 0 },
    { x: 30, y: 450, s: 0.62, r: 10 }, { x: 196, y: 386, s: 0.46, r: -5 }, { x: 206, y: 336, s: 0.5, r: 6 },
  ];
  const BACK_SLOTS = [{ x: 262, y: 390, s: 0.46, r: -4 }, { x: 292, y: 386, s: 0.44, r: 6 }, { x: 240, y: 392, s: 0.42, r: 2 }];
  const REMNANT_SLOTS = [{ x: 158, y: 412 }, { x: 84, y: 408 }, { x: 222, y: 414 }, { x: 60, y: 418 }, { x: 196, y: 420 }, { x: 132, y: 420 }, { x: 170, y: 426 }, { x: 102, y: 424 }, { x: 236, y: 424 }, { x: 146, y: 430 }, { x: 72, y: 430 }, { x: 212, y: 432 }];

  // ---------- sound (synthesized, optional) ----------
  let ac = null;
  function actx() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } return ac; }
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
    door: () => { tone(180, 0.35, "triangle", 0.03, 0, 1.6); noise(0.12, 0.05, 0.05, 600); },
    click: () => noise(0.05, 0.08, 0, 1800),
    rustle: () => { for (let i = 0; i < 5; i++) noise(0.07, 0.07, i * 0.06, 3000 + Math.random() * 2000, "highpass"); },
    tick: () => tone(1400, 0.02, "square", 0.02),
    kaching: () => { noise(0.08, 0.1, 0, 5000, "highpass"); tone(1568, 0.18, "triangle", 0.07, 0.06); tone(2093, 0.4, "triangle", 0.06, 0.12); },
    sting: () => { tone(392, 0.3, "sawtooth", 0.04); tone(370, 0.3, "sawtooth", 0.04, 0.3); tone(349, 0.3, "sawtooth", 0.04, 0.6); tone(330, 0.8, "sawtooth", 0.04, 0.9, 0.9); },
    bite: () => { noise(0.07, 0.14, 0, 900, "lowpass"); tone(140, 0.06, "square", 0.03); },
    gulp: () => tone(260, 0.16, "sine", 0.06, 0, 0.5),
    pop: () => tone(880, 0.08, "sine", 0.05, 0, 1.5),
    twirl: () => [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, "sine", 0.035, i * 0.05)),
    fanfare: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.28, "triangle", 0.06, i * 0.13)),
  };

  // ---------- timing helpers ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const back = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function tween(ms, fn, ease = easeInOut) {
    return new Promise((res) => {
      const dur = Math.max(1, ms * SPEED), t0 = performance.now();
      (function f(now) { const t = Math.min(1, (now - t0) / dur); fn(ease(t), t); if (t < 1) requestAnimationFrame(f); else res(); })(t0);
    });
  }

  // ---------- state ----------
  let S = null;
  const billy = { f: 0, mood: "calm", mouth: "flat", eyes: "normal", arm: 0, chew: false, lean: 0, sweat: false, shake: 0 };
  const party = { x: DOOR.x, y: DOOR.y, s: DOOR.s, walk: 0, reach: 0, eyes: "happy", flip: 1, alpha: 0, cart: [] };
  const stageBag = { on: false, x: STAGE.x, y: STAGE.y, s: 1.5, r: 0, open: 0, brand: null, item: null, itemY: 0, itemS: 0 };
  let foodEl = null;

  function newRun() {
    // prices drift upward through the run, with one guaranteed whole cake near the end
    const prices = [];
    for (let i = 0; i < TOTAL_BAGS; i++) {
      const t = clamp(i / (TOTAL_BAGS - 1) * 0.55 + Math.random() * 0.55 - 0.08, 0, 1);
      prices.push(Math.round(300 + 1300 * t));
    }
    prices[0] = 300 + Math.floor(Math.random() * 230);
    prices[9 + Math.floor(Math.random() * 3)] = 1450 + Math.floor(Math.random() * 151);
    const items = [...ITEMS].sort(() => Math.random() - 0.5);
    const brands = [...ART.BRANDS].sort(() => Math.random() - 0.5);
    S = { i: 0, prices, items, brands, total: 0, slices: 0, burgers: 0, cakes: 0, meals: 0, top: null, guess: null, guessed: 0, right: 0, streak: 0, busy: true };
    Object.assign(billy, { f: 0, mood: "calm", mouth: "flat", eyes: "normal", arm: 0, chew: false, lean: 0, sweat: false });
    $("#clutter").innerHTML = ""; $("#clutterBack").innerHTML = ""; $("#remnants").innerHTML = ""; $("#food").innerHTML = ""; $("#stageBag").innerHTML = "";
    stageBag.on = false;
    Object.assign(party, { x: DOOR.x, y: DOOR.y, s: DOOR.s, alpha: 0, flip: 1, reach: 0 });
    renderParty(); renderBilly(); hud(true);
  }

  // ---------- rendering ----------
  function renderBilly() {
    const sh = billy.shake ? (Math.random() - 0.5) * billy.shake : 0;
    $("#billy").innerHTML = `<g transform="translate(${BILLY_X + sh} 0)">${ART.billy(billy)}</g>`;
  }
  function renderParty() {
    const P = party, d = ART.debbie(P);
    const g = $("#party");
    g.setAttribute("opacity", P.alpha.toFixed(2));
    g.innerHTML = `<g transform="translate(${P.x.toFixed(1)} ${P.y.toFixed(1)}) scale(${P.s.toFixed(3)})">
      <g transform="translate(${CART_DX} 0)">${ART.cart(ART.pile(P.cart))}</g>
      <g transform="scale(${P.flip.toFixed(3)} 1)">${d.svg}</g></g>`;
  }
  function renderStageBag() {
    const B = stageBag, g = $("#stageBag");
    if (!B.on) { g.innerHTML = ""; return; }
    let o = `<g transform="translate(${B.x.toFixed(1)} ${B.y.toFixed(1)}) rotate(${B.r.toFixed(1)}) scale(${B.s.toFixed(3)})">`;
    o += `<ellipse cx="0" cy="2" rx="24" ry="4" fill="#000" opacity=".12"/>${ART.bag(B.brand, 42, 50, B.open)}</g>`;
    if (B.itemS > 0.01) o += `<g transform="translate(${B.x} ${B.itemY.toFixed(1)}) scale(${B.itemS.toFixed(3)})"><circle r="44" fill="url(#gGlow)"/>${ART.item(B.item.k)}</g>`;
    g.innerHTML = o;
  }

  // ---------- particles ----------
  const parts = [];
  function spark(x, y, n, colors = ["#F1DA9E", "#FFFFFF", "#E8C4B8"], speed = 70, kind = "star") {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, g: kind === "crumb" ? 380 : kind === "confetti" ? 60 : 30, age: 0, life: 0.7 + Math.random() * 0.6, c: pick(colors), s: 2 + Math.random() * 3, r: Math.random() * 360, vr: (Math.random() - 0.5) * 400, kind });
    }
  }
  function receiptsRain(n) {
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * 400, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 20, vy: 40 + Math.random() * 50, g: 10, age: 0, life: 6, c: "#FFFFFF", s: 3, r: Math.random() * 360, vr: (Math.random() - 0.5) * 120, kind: "receipt" });
  }
  let lastT = performance.now();
  function loop(now) {
    const dt = clamp((now - lastT) / 1000, 0, 0.05) / SPEED; lastT = now;
    if (parts.length) {
      let o = "";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        if (p.age > p.life || p.y > 580) { parts.splice(i, 1); continue; }
        const a = p.kind === "receipt" ? 1 : 1 - p.age / p.life;
        const t = `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)})`;
        if (p.kind === "star") o += `<path transform="${t}" d="M0 -${p.s * 1.6} L${p.s * 0.4} -${p.s * 0.4} L${p.s * 1.6} 0 L${p.s * 0.4} ${p.s * 0.4} L0 ${p.s * 1.6} L-${p.s * 0.4} ${p.s * 0.4} L-${p.s * 1.6} 0 L-${p.s * 0.4} -${p.s * 0.4} Z" fill="${p.c}" opacity="${a.toFixed(2)}"/>`;
        else if (p.kind === "crumb") o += `<rect transform="${t}" x="-1.5" y="-1.5" width="${p.s}" height="${p.s}" fill="${p.c}" opacity="${a.toFixed(2)}"/>`;
        else if (p.kind === "receipt") o += `<g transform="${t}" opacity=".95">${ART.receipt(22)}</g>`;
        else o += `<rect transform="${t}" x="-4" y="-2" width="8" height="4" fill="${p.c}" opacity="${a.toFixed(2)}"/>`;
      }
      $("#fx").innerHTML = o;
    } else if ($("#fx").childElementCount) $("#fx").innerHTML = "";
    if (billy.shake) renderBilly();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // idle blink + breathing sway for Billy
  setInterval(() => {
    if (billy.eyes !== "normal" || billy.arm > 0) return;
    billy.eyes = "closed"; renderBilly();
    setTimeout(() => { if (billy.eyes === "closed") { billy.eyes = "normal"; renderBilly(); } }, 130);
  }, 3200);

  // ---------- UI bits ----------
  let shownTotal = 0;
  function hud(instant) {
    const f = billy.f;
    $("#bags").textContent = `${S.i} / ${TOTAL_BAGS}`;
    $("#fullBar").style.width = Math.round(f * 100) + "%";
    $("#fullWord").textContent = f < 0.18 ? "Peckish" : f < 0.38 ? "Satisfied" : f < 0.58 ? "Full" : f < 0.8 ? "Stuffed" : "Maximum Billy";
    $("#streak").textContent = S.streak >= 2 ? `· ${S.streak} in a row` : "";
    if (instant) { shownTotal = S.total; $("#total").textContent = money(S.total); }
  }
  function countTotal(to) {
    const from = shownTotal; shownTotal = to;
    const el = $("#total"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    return tween(900, (t) => { el.textContent = money(lerp(from, to, t)); }, easeOut);
  }
  const bubbleT = {};
  function say(who, text, ms = 1700) {
    const el = who === "billy" ? $("#bBilly") : $("#bDebbie");
    el.textContent = text; el.classList.add("show");
    clearTimeout(bubbleT[who]); bubbleT[who] = setTimeout(() => el.classList.remove("show"), ms * Math.max(SPEED, 0.5));
  }
  function status(t) { $("#status").textContent = t; }
  function controls(on) {
    const b = $("#revealBtn");
    b.disabled = !on; b.classList.toggle("ready", on);
    $("#guess").classList.toggle("off", !on);
    b.hidden = false;
  }
  function chomp(text = "CHOMP") { const c = $("#chomp"); c.textContent = text; c.classList.remove("go"); void c.offsetWidth; c.classList.add("go"); }
  function flash() { const f = $("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }

  // ---------- Billy's resting face for this point in the run ----------
  function restingFace() {
    const i = S.i;
    if (i <= 2) Object.assign(billy, { mood: "calm", eyes: "normal", mouth: "flat", sweat: false, lean: 0 });
    else if (i <= 5) Object.assign(billy, { mood: "concern", eyes: "normal", mouth: "frown", sweat: false, lean: 0 });
    else if (i <= 8) Object.assign(billy, { mood: "resigned", eyes: "half", mouth: "flat", sweat: false, lean: 0.15 });
    else Object.assign(billy, { mood: "defeated", eyes: "half", mouth: "wobble", sweat: true, lean: 0.35 });
    renderBilly();
  }

  // ---------- door + Debbie ----------
  function setDoor(open) {
    const s = 1 - 0.86 * open;
    $("#door").setAttribute("transform", `translate(382 0) scale(${s.toFixed(3)} 1) translate(-382 0)`);
    $("#doorSpill").setAttribute("opacity", (0.45 * open).toFixed(2));
  }
  async function walk(from, to, ms) {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    await tween(ms, (t) => {
      party.x = lerp(from.x, to.x, t); party.y = lerp(from.y, to.y, t); party.s = lerp(from.s, to.s, t);
      party.walk = t * dist / 7; renderParty();
    }, easeInOut);
    party.walk = 0; renderParty();
  }
  async function twirl() {
    sfx.twirl();
    await tween(520, (t) => { party.flip = Math.cos(t * Math.PI * 2); party.reach = Math.sin(t * Math.PI) * 2.6; renderParty(); }, easeInOut);
    party.flip = 1; renderParty();
  }
  async function enter() {
    const lvl = S.i < 3 ? 0 : S.i < 6 ? 1 : S.i < 9 ? 2 : 3;
    party.cart = Array.from({ length: Math.min(3 + S.i, 11) }, (_, k) => S.brands[(S.i + k) % S.brands.length]);
    Object.assign(party, { x: DOOR.x, y: DOOR.y, s: DOOR.s, reach: 0, flip: 1, eyes: "happy", alpha: 0 });
    renderParty();
    status(S.i === 0 ? "Debbie's home…" : pick(["Here she comes again…", "The door opens…", "More bags incoming…", "Debbie's back…"]));
    sfx.door();
    await tween(360, (t) => setDoor(t), easeOut);
    if (lvl >= 2) $("#spot").setAttribute("opacity", "0.8");
    tween(220, (t) => { party.alpha = t; renderParty(); });
    const walking = walk({ x: DOOR.x, y: DOOR.y, s: DOOR.s }, SPOT, 1050);
    if (lvl >= 1) { const iv = setInterval(() => spark(party.x - 20, party.y - 120 * party.s, 3), 90 * SPEED); walking.then(() => clearInterval(iv)); }
    await wait(380);
    tween(320, (t) => setDoor(1 - t), easeInOut);
    await walking;
    if (lvl >= 3) { spark(party.x - 20, party.y - 150, 26, ["#E8C4B8", "#F1DA9E", "#A9D6D0", "#FFFFFF"], 140, "confetti"); flash(); }
    if (lvl >= 2) await twirl();
    if (lvl >= 3) { await tween(260, (t) => { party.reach = t * 2.8; renderParty(); }); }
    say("debbie", pick(LINES.enter), 1400);
    if (S.i >= 3 && Math.random() < 0.5) setTimeout(() => say("billy", pick(LINES.billyIdle), 1300), 500 * SPEED);
    await wait(500);
    $("#spot").setAttribute("opacity", "0");
  }
  async function presentBag() {
    await tween(300, (t) => { party.reach = lerp(party.reach, 1.25, t); renderParty(); });
    const brand = party.cart.pop();
    renderParty();
    sfx.rustle();
    const rows = Math.floor(party.cart.length / 3);
    const from = { x: party.x + (CART_DX + 4) * party.s, y: party.y - (30 + rows * 30) * party.s };
    Object.assign(stageBag, { on: true, brand, item: S.items[S.i % S.items.length], open: 0, itemS: 0, r: 0 });
    tween(360, (t) => { party.reach = lerp(1.25, 2.3, t); renderParty(); });
    await tween(560, (t) => {
      stageBag.x = lerp(from.x, STAGE.x, t); stageBag.y = lerp(from.y, STAGE.y, t) - Math.sin(t * Math.PI) * 60;
      stageBag.s = lerp(0.8, 1.5, t); stageBag.r = Math.sin(t * Math.PI) * -12; renderStageBag();
    }, easeInOut);
    say("debbie", pick(LINES.present), 1600);
    // gentle float while waiting
    stageBag.floatT = performance.now();
  }
  async function exit() {
    party.eyes = "happy";
    tween(260, (t) => { party.reach = lerp(party.reach, 0, t); party.flip = lerp(1, -1, t); renderParty(); });
    sfx.door();
    await tween(300, (t) => setDoor(t), easeOut);
    await walk(SPOT, { x: DOOR.x, y: DOOR.y, s: DOOR.s }, 800);
    await tween(160, (t) => { party.alpha = 1 - t; renderParty(); });
    await tween(260, (t) => setDoor(1 - t), easeInOut);
  }

  // bag floats gently while waiting for the tap
  (function float() {
    if (stageBag.on && stageBag.floatT && !S.busy) {
      const t = (performance.now() - stageBag.floatT) / 1000;
      stageBag.y = STAGE.y - Math.sin(t * 2.2) * 4; stageBag.r = Math.sin(t * 1.6) * 3; renderStageBag();
    }
    requestAnimationFrame(float);
  })();

  // ---------- the reveal ----------
  let revealResolve = null;
  function waitForReveal() {
    return new Promise((res) => { revealResolve = res; });
  }
  function tryReveal() {
    if (!revealResolve || S.busy) return;
    const r = revealResolve; revealResolve = null; r();
  }

  async function reveal() {
    S.busy = true; controls(false); stageBag.floatT = 0;
    const price = S.prices[S.i], tier = tierOf(price), T = TIERS[tier];
    // shake the bag
    sfx.rustle();
    await tween(460, (t) => { stageBag.r = Math.sin(t * Math.PI * 8) * 8 * (1 - t); stageBag.y = STAGE.y - Math.abs(Math.sin(t * Math.PI * 4)) * 6; renderStageBag(); }, (t) => t);
    // open: tissue bursts, the item rises out
    sfx.pop();
    spark(STAGE.x, STAGE.y - 70, 14, ["#FFFFFF", "#F6D6CE", "#F1DA9E"], 90);
    await tween(480, (t) => { stageBag.open = t; stageBag.itemS = lerp(0, 1.25, t); stageBag.itemY = lerp(STAGE.y - 40, STAGE.y - 118, t); renderStageBag(); }, back);
    // suspense
    await wait(260 + tier * 70);
    // the tag
    const tag = $("#tag");
    $("#tagItem").textContent = stageBag.item.n + " · " + stageBag.brand.name;
    $("#tagTier").textContent = "";
    tag.className = "tag"; tag.hidden = false; void tag.offsetWidth;
    tag.classList.add("in"); if (price >= 1000) tag.classList.add("big"); if (price >= 1300) tag.classList.add("huge");
    let lastTick = 0;
    await tween(700, (t) => {
      const v = Math.round(lerp(0, price, t));
      $("#tagPrice").textContent = money(v);
      if (t - lastTick > 0.08) { sfx.tick(); lastTick = t; }
    }, easeOut);
    $("#tagPrice").textContent = money(price);
    sfx.kaching();
    S.total += price; S.i += 1;
    if (!S.top || price > S.top.price) S.top = { price, name: stageBag.item.n };
    countTotal(S.total); hud(false);
    // guess result
    if (S.guess) {
      const g = price < 700 ? "low" : price <= 1100 ? "mid" : "high";
      S.guessed++;
      const chip = document.querySelector(`.chip[data-g="${S.guess}"]`);
      if (g === S.guess) { S.right++; S.streak++; chip.classList.add("right"); status(S.streak >= 2 ? `Called it. ${S.streak} in a row.` : "Called it."); }
      else { S.streak = 0; chip.classList.add("wrong"); document.querySelector(`.chip[data-g="${g}"]`).classList.add("right"); status("Not even close."); }
      hud(false);
    } else status("");
    // Billy reacts
    const react = tier <= 1 ? { mood: "concern", eyes: "normal", mouth: "frown", sweat: false }
      : tier <= 3 ? { mood: "shock", eyes: "wide", mouth: "o", sweat: false }
      : tier <= 5 ? { mood: "aghast", eyes: "wide", mouth: "gape", sweat: true }
      : { mood: "aghast", eyes: "wide", mouth: "gape", sweat: true };
    Object.assign(billy, react); renderBilly();
    if (tier >= 6) { billy.shake = tier >= 8 ? 5 : 3; setTimeout(() => { billy.shake = 0; renderBilly(); }, 700 * SPEED); }
    if (tier >= 7) { flash(); sfx.sting(); }
    if (tier === 8) setTimeout(() => { billy.eyes = "x"; renderBilly(); }, 450 * SPEED);
    await wait(260);
    say("billy", pick(LINES.react[tier]), 1900);
    await wait(700);
    $("#tagTier").textContent = T.label;
    $("#tagTier").animate([{ transform: "scale(1.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 300 * SPEED, easing: "cubic-bezier(.2,.9,.3,1.4)" });
    await wait(520);
    // the food arrives
    await eat(T);
    // Debbie is unbothered
    party.eyes = "happy"; renderParty();
    say("debbie", pick(LINES.after), 1500);
    await wait(420);
    tag.classList.add("out");
    await stashBag();
    tag.hidden = true;
    restingFace();
  }

  async function eat(T) {
    const f0 = billy.f, f1 = Math.min(1, S.total / 10800);
    const g = $("#food");
    const place = (x, y, s, r = 0) => g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) rotate(${r})`);
    g.innerHTML = `<g id="foodInner">${ART.food(T.food)}</g>`;
    sfx.pop();
    await tween(320, (t) => place(TABLE.x, TABLE.y - 16, t * 0.95), back);
    if (T.food === "cake" || T.food === "halfcake") spark(TABLE.x, TABLE.y - 30, 10, ["#F1DA9E", "#FFFFFF"], 60);
    await wait(360);
    // grab it
    Object.assign(billy, { mood: T.food === "cake" ? "defeated" : billy.mood, eyes: "normal", mouth: "open" });
    tween(360, (t) => { billy.arm = t; renderBilly(); });
    await tween(380, (t) => place(lerp(TABLE.x, MOUTH.x + 6, t), lerp(TABLE.y - 16, MOUTH.y + 8, t) - Math.sin(t * Math.PI) * 30, lerp(0.95, 0.62, t), lerp(0, -12, t)));
    // three big bites
    const inner = () => $("#foodInner");
    for (let b = 1; b <= 3; b++) {
      billy.mouth = "open"; billy.chew = false; renderBilly();
      await wait(110);
      sfx.bite(); chomp(b === 3 && T.food === "cake" ? "GULP" : pick(["CHOMP", "NOM", "CHOMP", "MUNCH"]));
      spark(MOUTH.x + 8, MOUTH.y + 10, 7, ["#D59A4A", "#F6C85F", "#C0392B", "#FBEFF2"], 60, "crumb");
      const left = 1 - b / 3;
      if (inner()) inner().setAttribute("transform", `scale(${Math.max(0.001, left * 0.85 + 0.15 * (left > 0))})`);
      billy.f = lerp(f0, f1, b / 3);
      for (let c = 0; c < 3; c++) { billy.mouth = "chew"; billy.chew = c % 2 === 0; renderBilly(); await wait(85); }
      hud(false);
    }
    g.innerHTML = "";
    sfx.gulp();
    // belly settles with a little bounce
    await tween(420, (t) => { billy.arm = 1 - t; billy.f = f1 + Math.sin(t * Math.PI * 2) * 0.02 * (1 - t); renderBilly(); }, easeOut);
    billy.f = f1; billy.chew = false;
    S.slices += T.slices || 0; S.burgers += T.burgers || 0; S.cakes += T.cakes || 0; S.meals += T.meals || 1;
    // leftovers stay around the couch
    const r = REMNANT_SLOTS[(S.i - 1) % REMNANT_SLOTS.length];
    $("#remnants").insertAdjacentHTML("beforeend", `<g transform="translate(${r.x} ${r.y}) rotate(${Math.round(Math.random() * 20 - 10)})">${ART.remnant(T.food)}</g>`);
    Object.assign(billy, { eyes: "happy", mouth: "smile" }); renderBilly();
    hud(false);
    await wait(380);
  }

  async function stashBag() {
    const idx = S.i - 1, slot = SLOTS[idx % SLOTS.length];
    const B = stageBag, from = { x: B.x, y: B.y, s: B.s, r: B.r };
    sfx.rustle();
    await tween(520, (t) => {
      B.x = lerp(from.x, slot.x, t); B.y = lerp(from.y, slot.y, t) - Math.sin(t * Math.PI) * 50; B.s = lerp(from.s, slot.s, t); B.r = lerp(from.r, slot.r, t);
      B.itemS = lerp(1.25, 0, Math.min(1, t * 2)); renderStageBag();
    }, easeInOut);
    B.on = false; renderStageBag();
    $("#clutter").insertAdjacentHTML("beforeend", `<g transform="translate(${slot.x} ${slot.y}) rotate(${slot.r}) scale(${slot.s})">${ART.bag(B.brand, 42, 50, 1)}</g>`);
    // tissue paper, receipts and extra boxes pile up too
    for (let k = 0; k < 1 + Math.floor(S.i / 4); k++) {
      const x = 20 + Math.random() * 360, y = 446 + Math.random() * 100;
      const extra = Math.random() < 0.55 ? ART.tissue() : ART.receipt(10 + Math.random() * 14);
      $("#clutter").insertAdjacentHTML("afterbegin", `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${Math.round(Math.random() * 60 - 30)}) scale(${(0.8 + Math.random() * 0.5).toFixed(2)})">${extra}</g>`);
    }
    if (S.i >= 5 && S.i % 2 === 0) {
      const bs = BACK_SLOTS[(S.i / 2) % BACK_SLOTS.length];
      $("#clutterBack").insertAdjacentHTML("beforeend", `<g transform="translate(${bs.x} ${bs.y}) rotate(${bs.r}) scale(${bs.s})">${ART.bag({ ...pick(ART.BRANDS), box: true }, 40, 46)}</g>`);
    }
  }

  // ---------- the run ----------
  async function run() {
    newRun();
    restingFace();
    for (let k = 0; k < TOTAL_BAGS; k++) {
      S.busy = true;
      await enter();
      await presentBag();
      S.guess = null; document.querySelectorAll(".chip").forEach((c) => (c.className = "chip"));
      S.busy = false; controls(true);
      status("Tap the bag or reveal the price.");
      await waitForReveal();
      await reveal();
      if (k < TOTAL_BAGS - 1) await exit();
    }
    await ending();
  }

  async function ending() {
    S.busy = true; controls(false); $("#revealBtn").hidden = true; $("#guess").classList.add("off");
    status("");
    // Debbie admires the place; Billy has given up
    Object.assign(billy, { mood: "defeated", eyes: "closed", mouth: "wobble", lean: 1, sweat: true, arm: 0 }); renderBilly();
    $("#spot").setAttribute("opacity", "0.8");
    await twirl();
    say("debbie", pick(["Love what we've done with the place.", "See? Plenty of room.", "Okay. That's everything.", "I think it really opens up the space."]), 2200);
    spark(party.x - 20, party.y - 160, 34, ["#E8C4B8", "#F1DA9E", "#A9D6D0", "#FFFFFF"], 150, "confetti");
    receiptsRain(26);
    sfx.fanfare();
    await wait(1300);
    say("billy", "…", 1400);
    await wait(1400);
    $("#spot").setAttribute("opacity", "0");
    // results
    const cakes = S.cakes % 1 ? `${Math.floor(S.cakes) || ""}½` : String(S.cakes);
    $("#endTotal").textContent = money(S.total);
    const rows = [
      ["Bags opened", TOTAL_BAGS],
      ["Pizza slices", S.slices],
      ["Burgers", S.burgers],
      ["Cakes", cakes],
      ["Total foods eaten", S.meals],
      ["Most expensive", `${money(S.top.price)} · ${S.top.name}`],
    ];
    if (S.guessed) rows.push(["Price guesses", `${S.right} of ${S.guessed}`]);
    $("#endStats").innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
    $("#endQuote").textContent = "“" + pick(LINES.quotes) + "” — Billy";
    let best = 0; try { best = +localStorage.getItem("debbieShops.best") || 0; if (S.total > best) localStorage.setItem("debbieShops.best", S.total); } catch {}
    $("#end").hidden = false;
    confetti();
  }

  function confetti() {
    if (reduced) return;
    const cv = $("#confetti"), c = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight; cv.hidden = false;
    const cols = ["#C9A45C", "#E8C4B8", "#2F4A3F", "#FFFFFF", "#B5475A"];
    const P = Array.from({ length: 150 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: Math.random() * 0.2 - 0.1, w: 6 + Math.random() * 6, col: pick(cols) }));
    const t0 = performance.now();
    (function f(t) {
      c.clearRect(0, 0, cv.width, cv.height);
      for (const p of P) { p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); c.restore(); }
      if (t - t0 < 3800) requestAnimationFrame(f); else cv.hidden = true;
    })(t0);
  }

  // ---------- wiring ----------
  $("#revealBtn").addEventListener("click", () => { sfx.click(); tryReveal(); });
  $("#stageBag").addEventListener("click", tryReveal);
  document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
    if (S.busy) return;
    S.guess = S.guess === c.dataset.g ? null : c.dataset.g;
    document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x.dataset.g === S.guess));
    sfx.click();
  }));
  addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (!$("#title").hidden) { e.preventDefault(); start(); }
      else if (!$("#end").hidden) { e.preventDefault(); start(); }
      else if (revealResolve) { e.preventDefault(); tryReveal(); }
    }
  });
  function start() {
    actx();
    $("#title").hidden = true; $("#end").hidden = true;
    run();
  }
  $("#startBtn").addEventListener("click", start);
  $("#againBtn").addEventListener("click", start);

  // city lights in the window
  (() => { let o = ""; for (let i = 0; i < 46; i++) o += `<rect x="${(26 + Math.random() * 120).toFixed(0)}" y="${(135 + Math.random() * 115).toFixed(0)}" width="2.2" height="3" opacity="${(0.5 + Math.random() * 0.5).toFixed(2)}"/>`; $("#cityLights").innerHTML = o; })();

  // idle scene behind the title card
  newRun(); setDoor(0); restingFace(); controls(false); $("#revealBtn").hidden = false;
  try { const b = +localStorage.getItem("debbieShops.best"); if (b) $("#bestLine").textContent = `Biggest spree so far: ${money(b)}`; } catch {}
  if (location.hash.includes("autotest")) window.__ds = () => ({ S, billy, ready: !!revealResolve });
})();
