"use strict";
// Ariel Passover Cookout: game state, cooking, family, Max, Feed Max, input, sound and screens.

(() => {
  const { W, H } = ART;
  const $ = s => document.querySelector(s);
  const cv = $("#cv"), ctx = cv.getContext("2d"), ui = $("#ui");
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const sOf = y => .82 + (y - 600) / 400 * .3;
  const moodOf = p => p > .6 ? 0 : p > .4 ? 1 : p > .2 ? 2 : 3;

  // ---------- recipes ----------
  const DISHES = {
    soup: { name: "Soup", short: "Soup", steps: ["Veggies", "Stir", "Simmer", "Ladle"], src: "fridge", ing: "soupveg" },
    frittata: { name: "Frittata", short: "Frittata", steps: ["Eggs", "Whisk", "Cook", "Plate"], src: "fridge", ing: "eggs" },
    kugel: { name: "Mushroom Kugel", short: "Kugel", steps: ["Fixings", "Mix", "Dish", "Bake", "Slice"], src: "pantry", ing: "kugelfix" },
    cutlets: { name: "Cari's Chicken Cutlets", short: "Cutlets", steps: ["Chicken", "Dredge", "Fry & flip", "Plate"], src: "fridge", ing: "chicken" },
    cake: { name: "Arlene's Apple Cake", short: "Apple Cake", steps: ["Fixings", "Batter", "Apples", "Bake", "Slice"], src: "pantry", ing: "cakefix" },
  };
  const DISH_ORDER = ["soup", "frittata", "kugel", "cutlets", "cake"];
  const ITEMS = {
    soupveg: { name: "Soup veggies", dish: "soup", done: 1, go: "pot", hint: "Drop the veggies into the Soup Pot." },
    soup: { name: "Bowl of Soup", dish: "soup", done: 4, plated: true },
    eggs: { name: "Eggs", dish: "frittata", done: 1, go: "mixer", hint: "Whisk the eggs at the Mixing station." },
    eggmix: { name: "Whisked eggs", dish: "frittata", done: 2, go: "pan", hint: "Pour the eggs into a frying pan on the Stove." },
    frittata_c: { name: "Hot frittata", dish: "frittata", done: 3, go: "plating", hint: "Slice and plate it at the Plating island." },
    frittata: { name: "Frittata", dish: "frittata", done: 4, plated: true },
    kugelfix: { name: "Kugel fixings", dish: "kugel", done: 1, go: "mixer", hint: "Mix the kugel at the Mixing station." },
    kugelmix: { name: "Kugel mix", dish: "kugel", done: 2, go: "prep", hint: "Spread it in a baking dish at the Prep counter." },
    kugelraw: { name: "Kugel, ready to bake", dish: "kugel", done: 3, go: "oven", hint: "Slide the kugel into an Oven." },
    kugel_c: { name: "Baked kugel", dish: "kugel", done: 4, go: "plating", hint: "Slice the kugel at the Plating island." },
    kugel: { name: "Mushroom Kugel", dish: "kugel", done: 5, plated: true },
    chicken: { name: "Raw chicken", dish: "cutlets", done: 1, go: "prep", hint: "Dredge the chicken at the Prep counter." },
    breaded: { name: "Breaded chicken", dish: "cutlets", done: 2, go: "pan", hint: "Fry the cutlets in a pan on the Stove." },
    cutlets_c: { name: "Crispy cutlets", dish: "cutlets", done: 3, go: "plating", hint: "Plate the cutlets at the Plating island." },
    cutlets: { name: "Cari's Cutlets", dish: "cutlets", done: 4, plated: true },
    cakefix: { name: "Cake fixings", dish: "cake", done: 1, go: "mixer", hint: "Mix the batter at the Mixing station." },
    batter: { name: "Cake batter", dish: "cake", done: 2, go: "prep", hint: "Add apples at the Prep counter." },
    cakeraw: { name: "Apple cake, ready to bake", dish: "cake", done: 3, go: "oven", hint: "Bake the apple cake in an Oven." },
    cake_c: { name: "Warm apple cake", dish: "cake", done: 4, go: "plating", hint: "Slice and plate it at the Plating island." },
    cake: { name: "Arlene's Apple Cake", dish: "cake", done: 5, plated: true },
  };
  const COOK = {
    soupveg: { dur: 7, grace: 12, out: "soup" },
    eggmix: { dur: 5, grace: 9, out: "frittata_c" },
    breaded: { dur: 3.5, flip: true, grace: 9, out: "cutlets_c" },
    kugelraw: { dur: 8, grace: 11, out: "kugel_c" },
    cakeraw: { dur: 9, grace: 11, out: "cake_c" },
  };
  const PLATE = { frittata_c: "frittata", kugel_c: "kugel", cutlets_c: "cutlets", cake_c: "cake" };

  // ---------- the house ----------
  const ST = {
    fridge: { r: [36, 160, 144, 450], stand: [110, 692], label: "Fridge" },
    pantry: { r: [190, 160, 120, 450], stand: [250, 692], label: "Pantry" },
    prep: { r: [316, 380, 144, 230], stand: [388, 692], label: "Prep counter" },
    pot: { r: [462, 330, 112, 280], stand: [520, 692], label: "Soup Pot", ring: [520, 352] },
    pan1: { r: [574, 330, 92, 280], stand: [620, 692], label: "Stove", ring: [620, 400] },
    pan2: { r: [666, 330, 98, 280], stand: [708, 692], label: "Stove", ring: [708, 400] },
    ovenTop: { r: [770, 158, 110, 242], stand: [826, 692], label: "Oven", ring: [826, 226] },
    ovenBot: { r: [770, 400, 110, 210], stand: [826, 692], label: "Oven", ring: [826, 434] },
    mixer: { r: [884, 300, 134, 310], stand: [952, 692], label: "Mixing station" },
    plating: { r: [324, 752, 372, 162], stand: [510, 748], label: "Plating island" },
    pass: { r: [900, 772, 200, 148], stand: [1000, 790], label: "Serving Pass" },
  };
  const HIT_ORDER = ["plating", "pass", "fridge", "pantry", "prep", "pot", "pan1", "pan2", "ovenTop", "ovenBot", "mixer"];
  const MESS_KEY = { pot: "stove", pan1: "stove", pan2: "stove", ovenTop: "oven", ovenBot: "oven" };
  const MESS_AREA = {
    stove: { at: [612, 470], ids: ["pot", "pan1", "pan2"], label: "Stove" }, oven: { at: [826, 560], ids: ["ovenTop", "ovenBot"], label: "Oven" },
    mixer: { at: [952, 470], ids: ["mixer"], label: "Mixing station" }, prep: { at: [388, 470], ids: ["prep"], label: "Prep counter" },
    pantry: { at: [250, 560], ids: ["pantry"], label: "Pantry" }, plating: { at: [510, 780], ids: ["plating"], label: "Plating island" },
  };
  const messKey = id => MESS_KEY[id] || id;

  const FAM = {
    sarah: { name: "Sarah", x: 1215, y: 640, stand: [1300, 712], fav: "cake", draw: ART.sarah, top: 250, hw: 52, thing: "lipstick" },
    simon: { name: "Simon", x: 1395, y: 640, stand: [1305, 712], fav: "soup", draw: ART.simon, top: 215, hw: 70, thing: "microphone" },
    ikey: { name: "Ikey", x: 1560, y: 628, stand: [1486, 772], fav: "soup", draw: ART.ikey, top: 215, hw: 62, thing: "TV remote" },
    michael: { name: "Michael", x: 1690, y: 628, stand: [1770, 772], fav: "frittata", draw: ART.michael, top: 215, hw: 62, thing: "phone charger" },
    cari: { name: "Cari", x: 1230, y: 915, stand: [1370, 940], fav: "cutlets", draw: ART.cari, top: 215, hw: 115, thing: "credit card" },
    nana: { name: "Nana", x: 1720, y: 932, stand: [1592, 948], fav: "kugel", draw: ART.nana, top: 262, hw: 95, thing: "yarn" },
  };
  const FAM_IDS = Object.keys(FAM);
  const LINES = {
    order: {
      ikey: d => `${d} at halftime, Ariel?`, simon: d => `Kshh… requesting ${d}… over.`, cari: d => `Adding ${d} to my cart!`,
      nana: d => `Ariel, darling… ${d}?`, michael: d => `Hold on… Ariel, ${d}?`, sarah: d => `${d}, please! Almost ready!`,
    },
    thanks: {
      ikey: ["Touchdown, Ariel!", "Best halftime snack ever!"], simon: ["Loud and clear: delicious!", "10-4, tasty!"],
      cari: ["Five stars! Obsessed!", "Adding this to my favorites!"], nana: ["Just like I used to make!", "Delicious, sweetheart!"],
      michael: ["Gotta go, food's here!", "Perfect, thanks Ariel!"], sarah: ["Fabulous!", "Worth ruining my lipstick!"],
    },
    wrong: {
      ikey: (g, w) => `Flag on the play! I wanted ${w}!`, simon: (g, w) => `Negative! Requested ${w}, over.`,
      cari: (g, w) => `Returning this! I ordered ${w}!`, nana: (g, w) => `Darling, I asked for ${w}.`,
      michael: (g, w) => `Wait… ${g}? I said ${w}!`, sarah: (g, w) => `${g}?! I wanted ${w}!`,
    },
    outburst: {
      ikey: ["I'M STARVING OVER HERE!", "REF! WHERE'S MY FOOD?!"], simon: ["MAYDAY! MAYDAY! NO FOOD!", "SOS! SEND SOUP!"],
      cari: ["I COULD'VE ORDERED DELIVERY!", "I'M LEAVING A REVIEW!"], nana: ["In MY day we ate at SIX!", "I'm fainting! FAINTING!"],
      michael: ["That's it, I'm calling for takeout!", "Hello?! HUNGRY over here!"], sarah: ["I'm HANGRY in HEELS!", "This look needs a SNACK!"],
    },
  };

  const SNACKS = ["matzah", "apple", "cookie", "toy", "sippy"];
  const SNACK_NAME = { matzah: "Matzah", apple: "Apple slice", cookie: "Cookie", toy: "Ducky toy", sippy: "Sippy cup" };
  const GAGS = [
    { at: [560, 722], st: "stove", mess: "spill", text: "Max put a pot on his head and is stomping around!", draw: { act: "run", pot: true } },
    { at: [520, 716], st: "stove", mess: "spill", text: "Max is “helping” stir the soup!", draw: { act: "stir", stool: true } },
    { at: [826, 716], st: "oven", mess: "junk", text: "Max is banging on the oven door!", draw: { act: "bang" } },
    { at: [952, 716], st: "mixer", mess: "spill", text: "Max is poking the cake batter!", draw: { act: "reach", stool: true } },
    { at: [690, 738], st: "stove", mess: "towel", text: "Max grabbed the kitchen towel and is running laps!", draw: { act: "run", towel: true } },
    { at: [250, 716], st: "pantry", mess: "flour", text: "Max opened the pantry and spilled the flour!", draw: { act: "happy", flour: true } },
    { at: [388, 722], st: "prep", mess: "junk", text: "Max knocked every utensil off the counter!", draw: { act: "run", prop: "spoon" } },
    { at: [430, 736], st: "prep", mess: "paper", text: "Max is unrolling ALL the paper towels!", draw: { act: "run", paper: true } },
    { at: [640, 744], st: "plating", mess: "junk", text: "Max climbed onto a stool at the island!", draw: { act: "happy", stool: true } },
    { at: [900, 742], st: "mixer", mess: "spill", text: "Max knocked over a mixing bowl!", draw: { act: "bang" } },
  ];
  const MAX_MOMENTS = [
    "Meanwhile, Max found the afikoman. And ate it.",
    "Max is wearing the soup pot as a hat. He says it's a crown.",
    "Max fed Nana's yarn to the dishwasher. Very helpful.",
    "Max licked every single piece of matzah. Twice.",
    "Max drew a lovely picture on the fridge. In apple cake.",
  ];

  function roundCfg(n) {
    const all = [...DISH_ORDER];
    if (n === 1) return { fam: ["simon", "ikey", "michael"], dishes: ["soup", "frittata"], newDishes: ["soup", "frittata"], goal: 5, open: 2, patience: 72, gap: 5, par: 120, max: false,
      title: "The First Guests", text: "Ikey, Simon and Michael are hungry. Start simple: Soup and Frittata." };
    if (n === 2) return { fam: ["simon", "ikey", "michael", "cari", "nana"], dishes: ["soup", "frittata", "kugel", "cutlets"], newDishes: ["kugel", "cutlets"], goal: 7, open: 3, patience: 66, gap: 4.2, par: 160, max: false,
      title: "More Family, More Food", text: "Cari and Nana are here. New on the menu: Mushroom Kugel and Cari's Chicken Cutlets." };
    if (n === 3) return { fam: FAM_IDS, dishes: all, newDishes: ["cake"], goal: 9, open: 3, patience: 60, gap: 3.6, par: 200, max: true, maxFirst: 22, maxGap: [36, 48], maxTime: 9,
      title: "The Whole Mishpacha", text: "Everyone's here, and Arlene's Apple Cake joins the menu. Uh oh… Max just woke up from his nap." };
    const k = n - 4;
    return { fam: FAM_IDS, dishes: all, newDishes: [], goal: Math.min(15, 10 + k), open: Math.min(5, 4 + Math.floor(k / 3)), patience: Math.max(40, 54 - k * 3), gap: Math.max(2, 3.1 - k * .2),
      par: (10 + k) * 20, max: true, maxFirst: 16, maxGap: [Math.max(18, 28 - k * 3), Math.max(26, 38 - k * 3)], maxTime: Math.max(6, 8 - k * .5),
      title: n === 4 ? "Seder Rush" : `Seder Rush, Night ${n - 3}`, text: "Orders come faster, patience runs thinner, and Max is feeling extra wiggly." };
  }

  // ---------- save ----------
  const SAVE_KEY = "arielCookout.v1";
  let save = { best: {}, highRound: 1, highScore: 0, muted: false };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} };
  const totalStars = () => Object.values(save.best).reduce((a, b) => a + b, 0);

  // ---------- sound (all synthesized) ----------
  const AU = { ctx: null, master: null };
  function audio() {
    if (!AU.ctx) {
      try {
        AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
        AU.master = AU.ctx.createGain(); AU.master.gain.value = .8; AU.master.connect(AU.ctx.destination);
      } catch { return null; }
    }
    if (AU.ctx.state === "suspended") AU.ctx.resume();
    return AU.ctx;
  }
  function tone(f, d, type = "sine", v = .12, delay = 0, slide = 0) {
    if (save.muted) return; const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(AU.master); o.start(t0); o.stop(t0 + d + .05);
  }
  function noise(d, v = .06, freq = 1000, q = 1, delay = 0, type = "bandpass") {
    if (save.muted) return; const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay, len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + d * .2); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    src.connect(f); f.connect(g); g.connect(AU.master); src.start(t0); src.stop(t0 + d + .05);
  }
  const sfx = {
    tap: () => tone(700, .07, "triangle", .07),
    pick: () => { tone(520, .08, "triangle", .1); tone(780, .1, "triangle", .1, .06); },
    place: () => tone(360, .14, "sine", .13, 0, .7),
    whisk: () => noise(1.1, .05, 3200, 2),
    stir: () => noise(.9, .05, 700, 1.5),
    sizzle: () => noise(1, .06, 5200, .7, 0, "highpass"),
    ding: () => { tone(1568, .7, "sine", .13); tone(2093, .9, "sine", .07, .02); },
    alert: () => { tone(880, .1, "square", .05); tone(880, .1, "square", .05, .16); },
    serve: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .26, "triangle", .1, i * .07)),
    wrong: () => { tone(300, .18, "square", .05); tone(220, .26, "square", .05, .13); },
    nope: () => tone(260, .12, "triangle", .07, 0, .8),
    meltdown: () => { tone(220, .55, "sawtooth", .07, 0, .45); noise(.5, .05, 400, 1); },
    burn: () => { noise(.7, .07, 1200, .6); tone(170, .4, "sawtooth", .045, 0, .6); },
    siren: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 740 : 988, .2, "square", .045, i * .21); },
    crash: () => { noise(.55, .12, 2600, .5); tone(120, .3, "triangle", .12, 0, .5); tone(1800, .2, "triangle", .05, .05, .6); },
    cheer: () => { noise(1.6, .07, 1400, .4); tone(660, .3, "triangle", .05, .2); },
    giggle: () => [900, 1150, 980, 1250].forEach((f, i) => tone(f, .09, "sine", .07, i * .09)),
    munch: () => { noise(.12, .08, 900, 2); noise(.12, .08, 900, 2, .18); noise(.12, .08, 900, 2, .36); },
    bzzt: () => noise(.4, .05, 2300, 5),
    toss: () => { tone(500, .2, "sine", .08, 0, .4); noise(.2, .04, 900, 1); },
    star: i => { tone([880, 1109, 1319][i] || 1319, .35, "triangle", .12); tone(([880, 1109, 1319][i] || 1319) * 2, .3, "sine", .04, .02); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .35, "triangle", .1, i * .1)),
    lose: () => [392, 349, 311, 262].forEach((f, i) => tone(f, .35, "triangle", .09, i * .16)),
    order: () => { tone(988, .09, "sine", .08); tone(1319, .12, "sine", .07, .08); },
  };

  // ---------- icon images for HTML ----------
  const ICONS = {};
  function icon(id) {
    if (ICONS[id]) return ICONS[id];
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    if (id === "max-pot") { g.translate(64, 122); ART.max(g, 0, 0, .95, { t: 1, act: "happy", pot: true, crumbs: true, expr: "grin" }); }
    else ART.food(g, id, 64, 70, 104, 0);
    return (ICONS[id] = c.toDataURL());
  }

  // ---------- state ----------
  let G = null, MG = null, T = 0, HINT = { text: "", glow: [] }, hintT = 0;
  const VIEW = { s: 1, ox: 0, oy: 0, k: 1 };
  let bg = null;

  function newSlot() { return { phase: "empty", item: null, t: 0, frac: 0, stage: 1, flipAnim: 0, servings: 0 }; }
  function newState(round) {
    const cfg = roundCfg(round);
    const s = {
      round, cfg, mode: "intro", t: 0, score: 0, served: 0, strikes: 0, combo: 0, bestCombo: 0,
      stats: { correct: 0, wrong: 0, burns: 0, soupBurn: 0, cutletBurn: 0, maxEvents: 0, maxCaught: 0, served: { soup: 0, frittata: 0, kugel: 0, cutlets: 0, cake: 0 }, meltdowns: [] },
      slots: { pot: newSlot(), pan1: newSlot(), pan2: newSlot(), ovenTop: newSlot(), ovenBot: newSlot() },
      pass: [null, null, null], mess: {}, slowT: 0,
      ariel: { x: 510, y: 748, dir: 1, path: [], target: null, queued: null, busy: 0, busyDur: 0, anim: null, animT: 0, animHold: 0, carry: null, walkPh: 0, onDone: null, frazzle: 0, wipeCD: 6, expr: null },
      fam: {},
      max: { state: round >= 3 ? "calm" : "nap", x: 170, y: 930, dir: 1, ph: 0, path: [], moving: false, gag: null, timer: 0, timerMax: 1, next: cfg.maxFirst || 999, snack: null, trail: 0 },
      bubbles: [], floats: [], parts: [], orderCD: 1.2, charmCD: rand(7, 11), shake: 0, ending: null, endT: 0, scarf: 0, tvCheer: 0,
    };
    for (const id of FAM_IDS) s.fam[id] = { id, active: cfg.fam.includes(id), state: "idle", order: null, patience: 1, stateT: 0, cd: rand(.2, 5), event: null, eventT: 0, eventDur: 1.6, plate: null, wrongT: 0, tOff: Math.random() * 10 };
    return s;
  }

  // ---------- helpers for text on canvas ----------
  function famHead(f) { const d = FAM[f.id], s = sOf(d.y); return [d.x, d.y - d.top * s]; }
  function bubble(target, text, dur = 2.2, style = {}) {
    G.bubbles = G.bubbles.filter(b => b.target !== target);
    G.bubbles.push({ target, text, t: 0, dur, style });
  }
  function say(text) { bubble("ariel", text, 1.8, { size: 21 }); }
  function float(text, x, y, col = "#FFFFFF", size = 34, dur = 1.3) { G.floats.push({ text, x, y, col, size, t: 0, dur }); }
  function burst(x, y, kind, n, col) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(80, 260);
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === "heart" ? 120 : 60), g: kind === "heart" ? -40 : kind === "smoke" ? -60 : 420,
        life: 0, max: rand(.7, 1.3), kind, col: col || pick(["#F9C74F", "#F28DB2", "#7FC8A9", "#6FA5D8", "#F07C4A"]), r: rand(4, 9), rot: rand(0, 6), vr: rand(-8, 8) });
    }
  }
  function toast(text, dur = 2.8) {
    const el = $("#toast"); el.textContent = text; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toast.tm); toast.tm = setTimeout(() => (el.hidden = true), dur * 1000);
  }

  // ---------- Ariel ----------
  function standPoint(tg) {
    if (tg.kind === "fam") return FAM[tg.id].stand;
    if (tg.id === "pass" && tg.slot != null) return [940 + tg.slot * 60, 790];
    return ST[tg.id].stand;
  }
  function route(x0, y0, x1, y1) {
    const cross = (y0 < 800 && y1 > 850) || (y1 < 800 && y0 > 850);
    if (cross && Math.min(x0, x1) < 1130) return [[1150, 792], [x1, y1]];
    return [[x1, y1]];
  }
  function goTo(tg) {
    const a = G.ariel;
    if (a.busy > 0) { a.queued = tg; sfx.tap(); return; }
    const p = plan(tg);
    if (p.fail != null) { if (p.fail) say(p.fail); sfx.nope(); return; }
    sfx.tap();
    a.target = tg; a.anim = null;
    const [sx, sy] = standPoint(tg);
    a.path = route(a.x, a.y, sx, sy);
  }
  function arrive() {
    const a = G.ariel, tg = a.target; a.target = null; if (!tg) return;
    if (tg.kind === "fam") a.dir = FAM[tg.id].x > a.x ? 1 : -1;
    const p = plan(tg);
    if (p.fail != null) { if (p.fail) say(p.fail); a.anim = "shrug"; a.animT = 0; a.animHold = .7; sfx.nope(); return; }
    a.busy = a.busyDur = p.dur; a.anim = p.anim; a.animT = 0; a.onDone = p.run;
    if (p.sfx) sfx[p.sfx]();
  }
  function plan(tg) {
    const a = G.ariel, h = a.carry, it = h && ITEMS[h];
    if (tg.kind === "fam") {
      const f = G.fam[tg.id], d = FAM[tg.id];
      if (!f.active) return { fail: `${d.name} isn't eating this round.` };
      if (f.state !== "waiting") return { fail: f.state === "eating" ? `${d.name} is busy eating!` : `${d.name} isn't hungry yet.` };
      if (!h) return { fail: `${d.name} wants ${DISHES[f.order].short}. Go cook it!` };
      if (!it.plated) return { fail: `Plate it first! (${it.hint})` };
      return { dur: .45, anim: "deliver", run: () => deliver(f) };
    }
    const id = tg.id, mk = messKey(id);
    if (G.mess[mk]) return { dur: 1.4, anim: "clean", sfx: "stir", run: () => { delete G.mess[mk]; float("Clean!", a.x, a.y - 220, "#7FE0B0"); burst(a.x, a.y - 120, "dot", 10, "#BFE6F7"); } };
    const slot = G.slots[id];
    switch (id) {
      case "fridge": case "pantry":
        if (h) return { fail: "Hands full! Use it or toss it." };
        if (!tg.pick) return { fail: "" };
        return { dur: .35, anim: "grab", sfx: "pick", run: () => { a.carry = tg.pick; } };
      case "mixer": {
        const out = { eggs: "eggmix", kugelfix: "kugelmix", cakefix: "batter" }[h];
        if (!out) return { fail: h ? (it.hint ? `Not here! ${it.hint}` : "Serve that first!") : "Grab ingredients from the Fridge or Pantry first." };
        return { dur: 1.3, anim: "mix", sfx: "whisk", run: () => { a.carry = out; } };
      }
      case "prep": {
        const out = { chicken: "breaded", batter: "cakeraw", kugelmix: "kugelraw" }[h];
        if (!out) return { fail: h ? (it.hint ? `Not here! ${it.hint}` : "Serve that first!") : "Nothing to prep yet." };
        return { dur: 1.1, anim: h === "chicken" ? "dredge" : h === "batter" ? "apples" : "dish", sfx: "stir", run: () => { a.carry = out; } };
      }
      case "plating": {
        const out = PLATE[h];
        if (!out) return { fail: !h ? "Bring cooked food here to plate it." : it.plated ? "Already plated. Serve it!" : `Not ready to plate. ${it.hint}` };
        return { dur: 1, anim: "plate", sfx: "place", run: () => { a.carry = out; burst(a.x + a.dir * 40, a.y - 130, "dot", 6, "#FFF3D1"); } };
      }
      case "pass": {
        if (h && it.plated) {
          const i = tg.slot != null && !G.pass[tg.slot] ? tg.slot : G.pass.indexOf(null);
          if (i < 0) return { fail: "The Serving Pass is full!" };
          return { dur: .35, anim: "place", sfx: "place", run: () => { G.pass[i] = a.carry; a.carry = null; } };
        }
        if (h) return { fail: "Only plated dishes go on the Serving Pass." };
        const i = tg.slot != null && G.pass[tg.slot] ? tg.slot : G.pass.findIndex(Boolean);
        if (i < 0) return { fail: "Nothing on the Serving Pass yet." };
        return { dur: .3, anim: "grab", sfx: "pick", run: () => { if (G.pass[i] && !a.carry) { a.carry = G.pass[i]; G.pass[i] = null; } } };
      }
      case "pot": {
        if (slot.phase === "empty") {
          if (h === "soupveg") return { dur: .45, anim: "place", sfx: "place", run: () => { a.carry = null; Object.assign(slot, newSlot(), { item: "soupveg", phase: "stir" }); } };
          return { fail: h ? "Only soup veggies go in the pot." : "The pot is empty. Soup veggies are in the Fridge." };
        }
        if (slot.phase === "stir") return { dur: 1, anim: "stir", sfx: "stir", run: () => { slot.phase = "cook"; slot.t = 0; } };
        if (slot.phase === "cook") return { fail: "The soup is simmering…" };
        if (slot.phase === "ready") {
          if (h) return { fail: "Hands full! You need a free hand to ladle." };
          // one pot of soup ladles two bowls
          return { dur: .7, anim: "stir", sfx: "place", run: () => { a.carry = "soup"; if (--slot.servings <= 0) Object.assign(slot, newSlot()); } };
        }
        return { dur: 1, anim: "clean", sfx: "stir", run: () => Object.assign(slot, newSlot()) };
      }
      case "pan1": case "pan2": {
        if (slot.phase === "empty") {
          if (h === "eggmix" || h === "breaded") return { dur: .45, anim: "place", sfx: "sizzle", run: () => { a.carry = null; Object.assign(slot, newSlot(), { item: h, phase: "cook" }); } };
          return { fail: h ? "That doesn't go in a frying pan." : "Nothing to fry yet." };
        }
        if (slot.phase === "cook") return { fail: slot.item === "breaded" ? "Sizzling… flip them when it says FLIP!" : "The frittata is cooking…" };
        if (slot.phase === "flip") return { dur: .5, anim: "flip", sfx: "sizzle", run: () => { slot.phase = "cook"; slot.stage = 2; slot.t = 0; slot.flipAnim = 1; } };
        if (slot.phase === "ready") {
          if (h) return { fail: "Hands full! Put that down first." };
          return { dur: .45, anim: "grab", sfx: "pick", run: () => { a.carry = COOK[slot.item].out; Object.assign(slot, newSlot()); } };
        }
        return { dur: 1, anim: "clean", sfx: "stir", run: () => Object.assign(slot, newSlot()) };
      }
      case "ovenTop": case "ovenBot": {
        if (slot.phase === "empty") {
          if (h === "kugelraw" || h === "cakeraw") return { dur: .5, anim: "oven", sfx: "place", run: () => { a.carry = null; Object.assign(slot, newSlot(), { item: h, phase: "cook" }); } };
          return { fail: h ? "That doesn't go in the oven." : "The oven is empty." };
        }
        if (slot.phase === "cook") return { fail: `Still baking… ${Math.ceil(COOK[slot.item].dur - slot.t)}s` };
        if (slot.phase === "ready") {
          if (h) return { fail: "Hands full! Put that down first." };
          return { dur: .5, anim: "oven", sfx: "pick", run: () => { a.carry = COOK[slot.item].out; Object.assign(slot, newSlot()); } };
        }
        return { dur: 1, anim: "clean", sfx: "stir", run: () => Object.assign(slot, newSlot()) };
      }
    }
    return { fail: "" };
  }

  function deliver(f) {
    const a = G.ariel, d = FAM[f.id], dish = a.carry, [hx, hy] = famHead(f);
    if (f.state !== "waiting" || !f.order || !dish) { say(`${d.name} isn't waiting anymore.`); return; }
    if (dish === f.order) {
      const pts = 100 + Math.round(f.patience * 60) + G.combo * 25;
      G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
      G.score += pts; G.served++; G.stats.correct++; G.stats.served[dish]++;
      f.state = "eating"; f.stateT = 3.4; f.plate = dish; f.order = null;
      a.carry = null; a.anim = "happy"; a.animT = 0; a.animHold = .8;
      float(`+${pts}`, hx, hy - 20, "#FFE58A", 40);
      if (G.combo >= 2) float(`Combo x${G.combo}!`, hx, hy - 70, "#FFB3CB", 30, 1.6);
      bubble(f.id, pick(LINES.thanks[f.id]), 2);
      burst(hx, hy + 60, "heart", 8, "#F28DB2");
      sfx.serve(); setTimeout(sfx.munch, 450);
      if (G.served >= G.cfg.goal) { G.ending = "win"; G.endT = 1.8; }
    } else {
      f.patience = Math.max(.03, f.patience - .15); f.wrongT = 1.4; G.combo = 0; G.stats.wrong++;
      bubble(f.id, LINES.wrong[f.id](DISHES[ITEMS[dish].dish].short, DISHES[f.order].short), 2.4, { bg: "#FFF4E0", border: "#F39237" });
      a.anim = "shrug"; a.animT = 0; a.animHold = .7;
      sfx.wrong();
    }
  }

  function updateAriel(dt) {
    const a = G.ariel;
    a.wipeCD -= dt;
    const hot = Object.values(G.fam).filter(f => f.state === "waiting" && f.patience < .4).length;
    a.frazzle += ((Math.min(1, hot / 3)) - a.frazzle) * Math.min(1, dt * 2);
    if (a.busy > 0) {
      a.busy -= dt; a.animT += dt;
      if (a.busy <= 0) {
        a.busy = 0; const fn = a.onDone; a.onDone = null; if (a.anim !== "happy") a.anim = null;
        if (fn) fn();
        if (a.queued) { const q = a.queued; a.queued = null; goTo(q); }
      }
      return;
    }
    if (a.anim) { a.animT += dt; if (a.animT >= a.animHold) a.anim = null; }
    if (a.path.length) {
      const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), sp = 700 * dt;
      if (Math.abs(dx) > 3) a.dir = dx > 0 ? 1 : -1;
      a.walkPh += dt * 17;
      if (d <= sp) { a.x = tx; a.y = ty; a.path.shift(); if (!a.path.length) arrive(); }
      else { a.x += dx / d * sp; a.y += dy / d * sp; }
    } else if (!a.anim && hot >= 2 && a.wipeCD <= 0) { a.anim = "wipe"; a.animT = 0; a.animHold = 1.2; a.wipeCD = 8; }
  }

  // ---------- cooking ----------
  function updateSlots(dt) {
    const speed = G.slowT > 0 ? .6 : 1;
    G.slowT = Math.max(0, G.slowT - dt);
    for (const [id, s] of Object.entries(G.slots)) {
      if (s.flipAnim > 0) s.flipAnim = Math.max(0, s.flipAnim - dt * 2.5);
      const ck = s.item && COOK[s.item];
      const [rx, ry] = ST[id].ring;
      if (s.phase === "cook") {
        s.t += dt * speed;
        s.frac = ck.flip ? (s.stage === 1 ? s.t / ck.dur * .5 : .5 + s.t / ck.dur * .5) : s.t / ck.dur;
        if (id === "pot" && Math.random() < dt * 3) G.parts.push({ x: rx + rand(-30, 30), y: 396, vx: rand(-10, 10), vy: -40, g: -30, life: 0, max: 1.4, kind: "steam", r: rand(6, 10) });
        if (s.t >= ck.dur) {
          if (ck.flip && s.stage === 1) { s.phase = "flip"; s.t = 0; sfx.alert(); float("FLIP!", rx, ry - 50, "#FFD27A", 34); }
          else {
            s.phase = "ready"; s.t = 0; s.frac = 1; s.servings = id === "pot" ? 2 : 1; sfx.ding();
            if (s.item === "kugelraw") float("DING!", rx, ry - 50, "#FFE58A", 48, 1.6);
          }
        }
      } else if (s.phase === "flip") {
        s.t += dt; if (s.t > 6) burn(id, s);
      } else if (s.phase === "ready") {
        s.t += dt;
        if (s.t > ck.grace * .55 && Math.random() < dt * 6) G.parts.push({ x: rx + rand(-20, 20), y: ry + 50, vx: rand(-10, 10), vy: -50, g: -20, life: 0, max: 1.3, kind: "smoke", r: rand(6, 11), col: "rgba(150,150,150,.7)" });
        if (s.t > ck.grace) burn(id, s);
      } else if (s.phase === "burnt" && Math.random() < dt * 8) {
        G.parts.push({ x: rx + rand(-20, 20), y: ry + 50, vx: rand(-10, 10), vy: -60, g: -20, life: 0, max: 1.6, kind: "smoke", r: rand(8, 14), col: "rgba(70,70,70,.7)" });
      }
    }
  }
  function burn(id, s) {
    s.phase = "burnt"; s.t = 0; G.stats.burns++;
    if (s.item === "soupveg") G.stats.soupBurn++;
    if (s.item === "breaded") G.stats.cutletBurn++;
    const [rx, ry] = ST[id].ring;
    float(id === "pot" ? "Boiled over!" : "Burnt!", rx, ry - 40, "#FF9E8A", 32);
    sfx.burn();
  }

  // ---------- family ----------
  function newOrder(f) {
    const ds = G.cfg.dishes, d = FAM[f.id];
    const dish = ds.includes(d.fav) && Math.random() < .5 ? d.fav : pick(ds);
    f.order = dish; f.patience = 1; f.state = "waiting"; f.wrongT = 0;
    bubble(f.id, LINES.order[f.id](DISHES[dish].short), 2.2);
    sfx.order();
  }
  function meltdown(f) {
    G.strikes++; G.combo = 0; f.state = "outburst"; f.stateT = 2.8; f.order = null; f.patience = 0; G.stats.meltdowns.push(f.id); G.shake = 14;
    bubble(f.id, pick(LINES.outburst[f.id]), 2.8, { bg: "#FFE3E3", border: "#E5484D", weight: 700, size: 24 });
    const [hx, hy] = famHead(f); burst(hx, hy + 40, "smoke", 10, "rgba(255,255,255,.9)");
    sfx.meltdown();
    if (G.strikes >= 3) { G.ending = "lose"; G.endT = 2.4; }
  }
  function updateFam(dt) {
    const cfg = G.cfg, list = Object.values(G.fam);
    const open = list.filter(f => f.state === "waiting").length;
    const drainBoost = G.max.state === "loose" ? 1.15 : 1;
    for (const f of list) {
      if (!f.active) continue;
      if (f.wrongT > 0) f.wrongT -= dt;
      if (f.state === "idle") f.cd -= dt;
      else if (f.state === "waiting") {
        f.patience -= dt / cfg.patience * drainBoost;
        if (f.patience <= 0) meltdown(f);
      } else { f.stateT -= dt; if (f.stateT <= 0) { f.state = "idle"; f.cd = rand(2.5, 6); f.plate = null; } }
    }
    G.orderCD -= dt;
    if (G.orderCD <= 0 && open < cfg.open && G.served + open < cfg.goal) {
      const idle = list.filter(f => f.active && f.state === "idle" && f.cd <= 0);
      if (idle.length) { newOrder(pick(idle)); G.orderCD = cfg.gap * rand(.8, 1.25); }
    }
    G.scarf += dt * .4;
  }
  function famEvents(dt) {
    for (const f of Object.values(G.fam)) { if (f.event) { f.eventT += dt; if (f.eventT > f.eventDur) f.event = null; } }
    G.tvCheer = Math.max(0, G.tvCheer - dt);
    G.charmCD -= dt;
    if (G.charmCD <= 0) { G.charmCD = rand(7, 12); charm(); }
  }
  function ev(f, name, dur) { f.event = name; f.eventT = 0; f.eventDur = dur; }
  function charm() {
    const F = G.fam, opts = [], playing = G.mode === "play";
    const ok = id => (F[id].state === "idle" || F[id].state === "waiting") && !F[id].event && F[id].wrongT <= 0;
    if (ok("ikey")) opts.push(() => { ev(F.ikey, "cheer", 1.8); bubble("ikey", pick(["TOUCHDOWN!!", "WHAT A CATCH!", "GO GO GO!"]), 1.8); if (F.ikey.state === "waiting") F.ikey.patience = Math.min(1, F.ikey.patience + .12); G.tvCheer = 1.8; sfx.cheer(); });
    if (ok("simon")) opts.push(() => {
      if (Math.random() < .45) { ev(F.simon, "tangle", 2.2); bubble("simon", "Who tied this wire in a knot?!", 2); }
      else bubble("simon", pick(["bzzt… CQ CQ… kshhh", "KB2… do you copy? …bzzt", "…73s from the Rosenbergs! bzzt"]), 2);
      sfx.bzzt();
    });
    if (ok("cari")) opts.push(() => { ev(F.cari, "gasp", 1.6); bubble("cari", pick(["OMG, 70% off!!", "Free shipping?! GASP.", "It comes in FOUR colors!"]), 1.8); });
    if (ok("nana")) opts.push(() => { ev(F.nana, "yarn", 2.4); bubble("nana", "Oy! My yarn!", 1.8); });
    if (ok("michael")) opts.push(() => { ev(F.michael, "switch", 1.4); bubble("michael", pick(["Hold on, switching ears.", "Can you hear me now?", "Yeah, she's cooking now."]), 1.8); });
    if (ok("sarah")) opts.push(() => { ev(F.sarah, "pose", 1.8); bubble("sarah", pick(["Flawless.", "Okay, THIS is the look.", "Is it too much? No."]), 1.8); });
    if (playing) {
      const sl = G.slots;
      if ([sl.ovenTop, sl.ovenBot].some(s => s.item === "cakeraw" && s.phase === "cook")) opts.push(() => {
        for (const f of Object.values(F)) if (f.state === "waiting") { f.patience = Math.min(1, f.patience + .06); const [hx, hy] = famHead(f); burst(hx, hy + 40, "heart", 3, "#F28DB2"); }
        const w = Object.values(F).filter(f => f.state === "waiting"); if (w.length) bubble(pick(w).id, "Mmm… is that apple cake?!", 2);
      });
      if (sl.pot.phase === "cook" || sl.pot.phase === "ready") opts.push(() => float("blub blub", 520, 350, "#FFF3D1", 26));
      const fry = ["pan1", "pan2"].find(id => sl[id].item === "breaded" && sl[id].phase === "cook");
      if (fry) opts.push(() => { float("SIZZLE!", ST[fry].ring[0], 360, "#FFD27A", 30); sfx.sizzle(); });
    }
    if (opts.length) pick(opts)();
  }

  // ---------- Max ----------
  function maxRoute(m, tx, ty) {
    if (m.y > 850 && ty < 800) return [[260, 752], [tx, ty]];
    if (m.y < 800 && ty > 850) return [[260, 752], [tx, ty]];
    return [[tx, ty]];
  }
  function startMaxLoose() {
    const m = G.max, cfg = G.cfg;
    m.state = "loose"; m.gag = pick(GAGS); m.timer = m.timerMax = cfg.maxTime; m.snack = null;
    m.path = maxRoute(m, m.gag.at[0], m.gag.at[1]);
    G.stats.maxEvents++;
    $("#maxText").textContent = m.gag.text; $("#maxAlert").hidden = false;
    sfx.siren(); closePicker();
  }
  function updateMax(dt) {
    const m = G.max; if (!G.cfg.max) return;
    if (m.state === "calm") { m.next -= dt; if (m.next <= 0) startMaxLoose(); return; }
    if (m.state !== "loose" && m.state !== "return") return;
    if (m.path.length) {
      const [tx, ty] = m.path[0], dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), sp = 300 * dt;
      m.moving = true; m.ph += dt * 16; if (Math.abs(dx) > 2) m.dir = dx > 0 ? 1 : -1;
      if (d <= sp) { m.x = tx; m.y = ty; m.path.shift(); } else { m.x += dx / d * sp; m.y += dy / d * sp; }
    } else if (m.state === "return") { m.state = "calm"; m.moving = false; m.next = rand(...G.cfg.maxGap); return; }
    else {
      m.moving = false;
      if (m.gag.draw.act === "run") {
        const [gx, gy] = m.gag.at, a = G.t * 2.6, nx = gx + Math.cos(a) * 60, ny = gy + Math.sin(a) * 12;
        m.dir = -Math.sin(a) >= 0 ? 1 : -1; m.x = nx; m.y = ny; m.ph += dt * 16;
      }
      if (m.gag.draw.flour && Math.random() < dt * 10) G.parts.push({ x: m.x + rand(-40, 40), y: m.y - rand(20, 90), vx: rand(-40, 40), vy: rand(-60, -10), g: 30, life: 0, max: 1, kind: "smoke", r: rand(8, 14), col: "rgba(255,255,255,.9)" });
      if (m.gag.draw.act === "bang" && Math.random() < dt * 2) float(pick(["BANG!", "CLANG!", "BONK!"]), m.x + rand(-40, 40), m.y - 150, "#FFD27A", 28, .8);
    }
    if (m.state === "loose") {
      m.timer -= dt;
      $("#maxBar").style.width = `${Math.max(0, m.timer / m.timerMax) * 100}%`;
      if (m.timer <= 0) maxMess();
    }
  }
  function maxMess() {
    const m = G.max, g = m.gag;
    const waiting = Object.values(G.fam).filter(f => f.state === "waiting");
    const r = Math.random();
    if (r < .6 || !waiting.length) {
      G.mess[g.st] = { kind: g.mess, t: 14 };
      toast(`Max made a mess at the ${MESS_AREA[g.st].label}! Tap it to clean up.`);
    } else if (r < .82) {
      const f = pick(waiting), d = FAM[f.id];
      f.patience = Math.max(.05, f.patience - .25);
      bubble(f.id, `MAX! Give me back my ${d.thing}!`, 2.4, { bg: "#FFF4E0", border: "#F39237" });
      toast(`Max ran off with ${d.name}'s ${d.thing}!`);
    } else {
      G.slowT = 10; toast("Max hid the oven mitts! Cooking is slower for a bit.");
    }
    sfx.crash(); G.shake = 10;
    burst(m.x, m.y - 60, "dot", 14, "#FFFFFF");
    m.state = "return"; m.path = maxRoute(m, 170, 930); m.gag = null;
    $("#maxAlert").hidden = true;
  }

  // ---------- Feed Max mini-game ----------
  const ZONE = { x0: 500, x1: 1420, y0: 380, y1: 780 };
  const SNACK_BTN = i => ({ x: 960 + (i - 2) * 196 - 84, y: 818, w: 168, h: 150 });
  let seenFeedMax = false;
  function startFeedMax() {
    if (!G || G.mode !== "play" || G.max.state !== "loose") return;
    closePicker();
    G.mode = "feedmax";
    MG = { t: 0, dur: 12, want: pick(SNACKS), hold: null, ax: 640, ay: 700, tx: 640, ty: 700, adir: 1, aph: 0, amove: false,
      mx: 1220, my: 520, mdir: -1, mph: 0, mtx: 1100, mty: 500, retarget: 1, dash: 0, cool: 0, state: "play", endT: 0, msg: "", msgT: 0, first: !seenFeedMax, down: false };
    MG.msg = `Want ${SNACK_NAME[MG.want].toLowerCase()}!`; MG.msgT = 2;
    seenFeedMax = true;
    $("#maxAlert").hidden = true; $("#bottom").hidden = true;
    sfx.giggle();
  }
  function updateMG(dt) {
    const M = MG; M.t += dt;
    if (M.state !== "play") {
      if (M.state === "fail") { M.mx += 420 * dt; M.mdir = 1; M.mph += dt * 15; }
      M.endT -= dt; if (M.endT <= 0) endFeedMax(); return;
    }
    M.msgT -= dt; M.cool -= dt; M.dash = Math.max(0, M.dash - dt);
    const dx = M.tx - M.ax, dy = M.ty - M.ay, d = Math.hypot(dx, dy), sp = 620 * dt;
    M.amove = d > 5;
    if (M.amove) { M.ax += dx / d * Math.min(sp, d); M.ay += dy / d * Math.min(sp, d); M.aph += dt * 17; if (Math.abs(dx) > 3) M.adir = dx > 0 ? 1 : -1; }
    const da = dist(M.ax, M.ay, M.mx, M.my);
    let vx, vy, spd;
    if (da < 250) {
      vx = (M.mx - M.ax) / (da || 1); vy = (M.my - M.ay) / (da || 1);
      const wob = Math.sin(M.t * 5) * .6; const px = -vy * wob, py = vx * wob; vx += px; vy += py;
      const n = Math.hypot(vx, vy) || 1; vx /= n; vy /= n; spd = M.dash > 0 ? 440 : 300;
    } else {
      M.retarget -= dt;
      if (M.retarget <= 0 || dist(M.mx, M.my, M.mtx, M.mty) < 20) { M.mtx = rand(ZONE.x0 + 20, ZONE.x1 - 20); M.mty = rand(ZONE.y0 + 10, ZONE.y1 - 10); M.retarget = rand(.8, 1.8); }
      const tx = M.mtx - M.mx, ty = M.mty - M.my, n = Math.hypot(tx, ty) || 1; vx = tx / n; vy = ty / n; spd = M.dash > 0 ? 440 : 210;
    }
    M.mx = clamp(M.mx + vx * spd * dt, ZONE.x0 + 10, ZONE.x1 - 10); M.my = clamp(M.my + vy * spd * dt, ZONE.y0, ZONE.y1);
    M.mph += dt * 15; if (Math.abs(vx) > .2) M.mdir = vx > 0 ? 1 : -1;
    if (da < 95 && M.cool <= 0) {
      if (M.hold === M.want) {
        M.state = "win"; M.endT = 2; const bonus = 150 + Math.round((M.dur - M.t) * 10);
        G.score += bonus; G.stats.maxCaught++; M.msg = "Yummy! Thank you!"; M.msgT = 3; M.bonus = bonus;
        burst(M.mx, M.my - 100, "heart", 12, "#F28DB2"); sfx.win(); setTimeout(sfx.munch, 300);
      } else if (M.hold) {
        M.msg = `Noooo! ${SNACK_NAME[M.want]}!`; M.msgT = 1.6; M.hold = null; M.dash = 1.2; M.cool = .8; sfx.nope();
        burst(M.mx, M.my - 80, "dot", 8);
      } else {
        M.msg = `Hee hee! Want ${SNACK_NAME[M.want].toLowerCase()}!`; M.msgT = 1.6; M.dash = 1; M.cool = .8; sfx.giggle();
      }
    }
    if (M.t >= M.dur && M.state === "play") { M.state = "fail"; M.endT = 1.6; M.msg = "Hee hee hee! Bye!"; M.msgT = 2; M.mtx = ZONE.x1 + 200; sfx.giggle(); }
  }
  function endFeedMax() {
    const won = MG.state === "win", snack = MG.want; MG = null;
    G.mode = "play"; $("#bottom").hidden = false;
    const m = G.max;
    if (won) {
      m.state = "return"; m.snack = snack; m.gag = null; m.path = maxRoute(m, 170, 930);
      toast("Max is happy! Back to cooking.", 2);
    } else maxMess();
  }
  function mgPointer(x, y, down) {
    const M = MG; if (!M || M.state !== "play") return;
    if (down) {
      for (let i = 0; i < 5; i++) {
        const b = SNACK_BTN(i);
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { M.hold = SNACKS[i]; sfx.pick(); M.down = false; return; }
      }
    }
    if (y > 800) return;
    M.tx = clamp(x, ZONE.x0, ZONE.x1); M.ty = clamp(y + 40, ZONE.y0, ZONE.y1);
  }

  // ---------- rounds and screens ----------
  const SCREENS = ["#menu", "#howto", "#intro", "#pause", "#win", "#lose"];
  function show(sel) { for (const s of SCREENS) $(s).hidden = s !== sel; }
  function setPlayUI(on) { $("#hud").hidden = !on; $("#bottom").hidden = !on; if (!on) { $("#maxAlert").hidden = true; closePicker(); } }

  function toMenu() {
    G = newState(3); G.mode = "menu";
    for (const f of Object.values(G.fam)) f.active = false;
    Object.assign(G.ariel, { x: 560, y: 748, carry: "cake", dir: 1 });
    Object.assign(G.max, { state: "peek", x: 1606, y: 926 });
    G.charmCD = 1.5;
    setPlayUI(false); show("#menu"); MG = null;
    $("#continueBtn").hidden = save.highRound <= 1;
    $("#continueBtn").textContent = `CONTINUE: ROUND ${save.highRound}`;
    $("#menuMeta").innerHTML = totalStars() ? `★ ${totalStars()} Rosenberg Stars<br>Best round score: ${save.highScore.toLocaleString()}` : "";
  }
  function startRound(n) {
    G = newState(n); MG = null;
    const cfg = G.cfg;
    $("#introKicker").textContent = `Round ${n}`;
    $("#introTitle").textContent = cfg.title;
    $("#introText").textContent = cfg.text;
    $("#introMenu").innerHTML = cfg.dishes.map(d => `<div class="${cfg.newDishes.includes(d) && n > 1 ? "new" : ""}"><img src="${icon(d)}" alt=""><br>${DISHES[d].short}</div>`).join("");
    $("#introGoal").textContent = `Serve ${cfg.goal} dishes · 3 meltdowns and it's over`;
    setPlayUI(false); show("#intro");
    syncHud(true);
  }
  function beginPlay() {
    G.mode = "play"; show(null); setPlayUI(true); syncHud(true); updateCarry(true);
    audio();
  }
  function pause() {
    if (!G || (G.mode !== "play" && G.mode !== "feedmax")) return;
    G.prevMode = G.mode; G.mode = "paused"; closePicker(); show("#pause");
  }
  function resume() { G.mode = G.prevMode || "play"; show(null); }

  function finish() {
    const won = G.ending === "win";
    G.mode = won ? "win" : "lose"; G.ending = null;
    setPlayUI(false); closePicker();
    const a = G.ariel; Object.assign(a, { x: 1440, y: 884, dir: -1, path: [], busy: 0, carry: null, anim: won ? "happy" : "wipe", animT: 0, animHold: 1e9, target: null, queued: null });
    a.expr = won ? "proud" : "worried";
    G.bubbles = []; G.floats = [];
    for (const f of Object.values(G.fam)) {
      f.wrongT = 0; f.event = null;
      if (won) { f.state = "eating"; f.plate = FAM[f.id].fav; } else { f.state = f.active ? "outburst" : "idle"; }
    }
    Object.assign(G.max, won ? { state: "party", x: 1556, y: 910, path: [] } : { state: "pot", x: 1556, y: 910, path: [] });
    if (won) showWin(); else showLose();
  }
  function showWin() {
    const st = G.stats, cfg = G.cfg, t = G.t;
    const awards = [];
    if (t <= cfg.par) awards.push(["Fastest Cook", `${Math.round(t)}s`]);
    if (G.strikes === 0 && st.wrong === 0) awards.push(["Best Host", "no meltdowns"]);
    if (st.maxEvents > 0 && st.maxCaught === st.maxEvents) awards.push(["Max Tamer", `${st.maxCaught}/${st.maxEvents}`]);
    if (st.served.soup > 0 && st.soupBurn === 0) awards.push(["Soup Saver", `${st.served.soup} bowls`]);
    if (st.served.cutlets > 0 && st.cutletBurn === 0) awards.push(["Cutlet Champion", `${st.served.cutlets} plates`]);
    if (st.served.cake > 0) awards.push(["Apple Cake Hero", `${st.served.cake} slices`]);
    const timeBonus = Math.max(0, Math.round((cfg.par - t) * 5));
    const hostBonus = G.strikes === 0 ? 200 : 0, burnBonus = st.burns === 0 ? 150 : 0, awardBonus = awards.length * 100;
    G.score += timeBonus + hostBonus + burnBonus + awardBonus;
    const stars = 1 + (G.strikes === 0 ? 1 : 0) + (awards.length >= 2 ? 1 : 0);
    const prev = save.best[G.round] || 0, gained = Math.max(0, stars - prev);
    save.best[G.round] = Math.max(prev, stars);
    save.highRound = Math.max(save.highRound, G.round + 1);
    save.highScore = Math.max(save.highScore, G.score);
    persist();
    try { const k = "rosenbergWorld.stars"; localStorage.setItem(k, String((+localStorage.getItem(k) || 0) + gained)); } catch {}

    $("#winKicker").textContent = `Round ${G.round} complete`;
    const rows = [
      ["Dishes served", `${G.served}`], ["Best combo", `x${G.bestCombo}`],
      ...(st.maxEvents ? [["Max rescues", `${st.maxCaught} of ${st.maxEvents}`]] : []),
      ["Time", `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`],
      ...(timeBonus ? [["Speed bonus", `+${timeBonus}`]] : []), ...(hostBonus ? [["Happy family bonus", "+200"]] : []), ...(burnBonus ? [["No-burn bonus", "+150"]] : []),
    ];
    $("#winStats").innerHTML = rows.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join("");
    $("#winAwards").innerHTML = awards.map(([k, v], i) => `<span class="award" style="animation-delay:${.6 + i * .15}s">🏅 ${k} <small>+100 · ${v}</small></span>`).join("") || `<span class="muted">No awards this time. Try a faster, calmer kitchen!</span>`;
    $("#winScore").textContent = G.score.toLocaleString();
    $("#winStarLine").textContent = gained ? `+${gained} Rosenberg Star${gained > 1 ? "s" : ""}! You have ${totalStars()} in all.` : `${totalStars()} Rosenberg Stars in all. Beat your best (${prev}★) to earn more.`;
    const spans = [...$("#winStars").children]; spans.forEach(s => s.classList.remove("on"));
    spans.forEach((s, i) => { if (i < stars) setTimeout(() => { s.classList.add("on"); sfx.star(i); }, 500 + i * 380); });
    show("#win"); sfx.win();
    for (let i = 0; i < 4; i++) setTimeout(() => G && G.mode === "win" && burst(rand(1150, 1850), rand(300, 500), "confetti", 30), i * 500);
  }
  function showLose() {
    const names = G.stats.meltdowns.map(id => FAM[id].name);
    const uniq = [...new Set(names)];
    const list = uniq.length > 1 ? `${uniq.slice(0, -1).join(", ")} and ${uniq[uniq.length - 1]}` : uniq[0];
    $("#loseKicker").textContent = `Round ${G.round}`;
    $("#loseReason").textContent = `Three hungry meltdowns! ${list} got too hungry waiting for dinner.`;
    $("#loseMax").textContent = pick(MAX_MOMENTS);
    $("#loseMaxImg").src = icon("max-pot");
    $("#loseScore").textContent = G.score.toLocaleString();
    show("#lose"); sfx.lose();
  }

  // ---------- HUD ----------
  const hudCache = {};
  function setText(sel, v, bump) {
    if (hudCache[sel] === v) return; const el = $(sel);
    el.textContent = v; if (bump && hudCache[sel] !== undefined) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    hudCache[sel] = v;
  }
  function syncHud(force) {
    if (!G) return;
    if (force) for (const k in hudCache) delete hudCache[k];
    setText("#hRound", String(G.round));
    setText("#hScore", G.score.toLocaleString(), true);
    setText("#hServed", `${G.served}/${G.cfg.goal}`, true);
    setText("#hStars", String(totalStars()));
    [...$("#hStrikes").children].forEach((el, i) => el.classList.toggle("on", i < G.strikes));
    const combo = $("#hCombo");
    if (G.combo >= 2) { combo.hidden = false; setText("#hCombo", `🔥 x${G.combo}`); } else combo.hidden = true;
    // order queue
    const waiting = Object.values(G.fam).filter(f => f.state === "waiting").sort((a, b) => a.patience - b.patience);
    const key = waiting.map(f => f.id + f.order).sort().join("|");
    const q = $("#queue");
    if (key !== hudCache.queue || force) {
      hudCache.queue = key;
      q.innerHTML = "";
      for (const f of waiting) {
        const b = document.createElement("button"); b.className = "q-chip"; b.dataset.id = f.id; b.type = "button";
        b.innerHTML = `<img src="${icon(f.order)}" alt=""><span class="q-name">${FAM[f.id].name}</span><span class="q-bar"><i></i></span>`;
        b.onclick = () => { if (G.mode === "play") goTo({ kind: "fam", id: f.id }); };
        q.appendChild(b);
      }
    }
    for (const el of q.children) {
      const f = G.fam[el.dataset.id]; if (!f) continue;
      const m = moodOf(f.patience); el.className = `q-chip m${m}`;
      el.querySelector("i").style.width = `${Math.max(0, f.patience) * 100}%`;
    }
  }
  let lastCarry = undefined;
  function updateCarry(force) {
    const h = G.ariel.carry;
    if (h === lastCarry && !force) return; lastCarry = h;
    $("#tossBtn").disabled = !h;
    if (!h) { $("#carryImg").src = ""; $("#carryName").textContent = "Hands free"; $("#carrySteps").innerHTML = ""; return; }
    const it = ITEMS[h], dish = DISHES[it.dish];
    $("#carryImg").src = icon(h);
    $("#carryName").textContent = it.name;
    $("#carrySteps").innerHTML = dish.steps.map((s, i) => `<span class="${i < it.done ? "done" : i === it.done ? "now" : ""}">${s}</span>`).join("") + `<span class="${it.plated ? "now" : ""}">Serve</span>`;
  }

  function computeHint() {
    const a = G.ariel, h = a.carry;
    if (G.max.state === "loose") return { text: "MAX IS LOOSE! Tap Max (or FEED MAX) before he wrecks something!", glow: ["max"], alert: true };
    const waiting = Object.values(G.fam).filter(f => f.state === "waiting").sort((p, q) => p.patience - q.patience);
    if (h) {
      const it = ITEMS[h];
      if (it.plated) {
        const who = waiting.find(f => f.order === h);
        if (who) return { text: `Serve the ${DISHES[it.dish].short} to ${FAM[who.id].name}!`, glow: ["fam:" + who.id] };
        return { text: `No one's waiting for ${DISHES[it.dish].short} right now. Park it on the Serving Pass.`, glow: ["pass"] };
      }
      let glow = [it.go];
      if (it.go === "pan") glow = ["pan1", "pan2"].filter(id => G.slots[id].phase === "empty");
      if (it.go === "oven") glow = ["ovenTop", "ovenBot"].filter(id => G.slots[id].phase === "empty");
      if (it.go === "pot") glow = G.slots.pot.phase === "empty" ? ["pot"] : [];
      if (!glow.length) return { text: `The ${it.go === "oven" ? "ovens are" : it.go === "pot" ? "pot is" : "pans are"} busy. Wait for one to finish, or toss it.`, glow: [] };
      return { text: it.hint, glow };
    }
    const slots = Object.entries(G.slots);
    const flip = slots.find(([, s]) => s.phase === "flip"); if (flip) return { text: "Flip the cutlets before they burn!", glow: [flip[0]], alert: true };
    const stir = slots.find(([, s]) => s.phase === "stir"); if (stir) return { text: "Give the soup a stir to start it simmering.", glow: ["pot"] };
    const ready = slots.filter(([, s]) => s.phase === "ready").sort((p, q) => q[1].t - p[1].t)[0];
    if (ready) { const [id, s] = ready; return { text: id === "pot" ? `Soup's ready! Tap the pot to ladle a bowl (${s.servings} left).` : `The ${DISHES[ITEMS[s.item].dish].short} is ready! Take it out.`, glow: [id] }; }
    const burnt = slots.find(([, s]) => s.phase === "burnt"); if (burnt) return { text: "Something burned! Tap it to clean up.", glow: [burnt[0]] };
    const onPass = waiting.find(f => G.pass.includes(f.order));
    if (onPass) return { text: `Grab the ${DISHES[onPass.order].short} from the Serving Pass for ${FAM[onPass.id].name}.`, glow: ["pass"] };
    const inProg = {};
    for (const [id, s] of slots) if (s.item) inProg[ITEMS[s.item].dish] = (inProg[ITEMS[s.item].dish] || 0) + (id === "pot" && s.phase !== "burnt" ? 2 : 1);
    for (const d of G.pass) if (d) inProg[d] = (inProg[d] || 0) + 1;
    for (const f of waiting) {
      if (inProg[f.order] > 0) { inProg[f.order]--; continue; }
      const d = DISHES[f.order];
      return { text: `${FAM[f.id].name} wants ${d.name}. Get ${ITEMS[d.ing].name.toLowerCase()} from the ${d.src === "fridge" ? "Fridge" : "Pantry"}.`, glow: [d.src] };
    }
    const mk = Object.keys(G.mess)[0]; if (mk) return { text: "Clean up Max's mess!", glow: MESS_AREA[mk].ids };
    if (slots.some(([, s]) => s.phase === "cook")) return { text: "Everything's cooking… get ready to grab it!", glow: [] };
    return { text: waiting.length ? "Keep it coming!" : "Waiting for the next hungry family member…", glow: [] };
  }

  // ---------- picker ----------
  function openPicker(id) {
    const items = id === "fridge" ? ["soupveg", "eggs", "chicken"] : ["kugelfix", "cakefix"];
    const needed = new Set(Object.values(G.fam).filter(f => f.state === "waiting").map(f => f.order));
    $("#pickerTitle").textContent = id === "fridge" ? "What from the Fridge?" : "What from the Pantry?";
    const box = $("#pickerItems"); box.innerHTML = "";
    for (const it of items) {
      const dish = ITEMS[it].dish, avail = G.cfg.dishes.includes(dish);
      const b = document.createElement("button"); b.type = "button";
      b.className = "pick" + (avail && needed.has(dish) ? " want" : ""); b.disabled = !avail;
      b.innerHTML = `<img src="${icon(it)}" alt=""><b>${ITEMS[it].name}</b><small>${avail ? "for " + DISHES[dish].short : "Later round"}</small>`;
      b.onclick = e => { e.stopPropagation(); closePicker(); if (G.mode === "play") goTo({ kind: "station", id, pick: it }); };
      box.appendChild(b);
    }
    openPickerId = id;
    const pk = $("#picker"); pk.style.left = (id === "fridge" ? 190 : 320) + "px"; pk.style.top = "180px"; pk.hidden = false;
    sfx.tap();
  }
  let openPickerId = null;
  function closePicker() { $("#picker").hidden = true; openPickerId = null; }

  // ---------- input ----------
  function toStage(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / VIEW.s, (e.clientY - r.top) / VIEW.s]; }
  function hitTest(x, y) {
    const m = G.max;
    if (m.state === "loose" && dist(x, y, m.x, m.y - 55 * sOf(m.y)) < 90) return { kind: "max" };
    for (let i = 0; i < 3; i++) if (x >= 910 + i * 60 && x < 970 + i * 60 && y >= 755 && y <= 840) return { kind: "station", id: "pass", slot: i };
    // bodies first (front row wins), then the order bubbles floating above heads
    const ids = [...FAM_IDS].sort((a, b) => FAM[b].y - FAM[a].y);
    for (const id of ids) {
      const d = FAM[id], s = sOf(d.y);
      if (Math.abs(x - d.x) <= d.hw * s && y >= d.y - d.top * s && y <= d.y + 10) return { kind: "fam", id };
    }
    for (const id of ids) {
      const d = FAM[id], s = sOf(d.y), top = d.y - d.top * s;
      if (G.fam[id].state === "waiting" && Math.abs(x - d.x) <= 56 && y >= top - 110 && y < top) return { kind: "fam", id };
    }
    for (const id of HIT_ORDER) { const [rx, ry, rw, rh] = ST[id].r; if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return { kind: "station", id }; }
    return null;
  }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    if (!G) return;
    const [x, y] = toStage(e);
    if (G.mode === "feedmax") { MG.down = true; mgPointer(x, y, true); return; }
    if (G.mode !== "play" || G.ending) return;
    const wasOpen = $("#picker").hidden ? null : openPickerId; closePicker();
    const hit = hitTest(x, y);
    if (!hit) return;
    if (hit.kind === "max") { startFeedMax(); return; }
    if (hit.kind === "station" && (hit.id === "fridge" || hit.id === "pantry") && !G.mess[hit.id]) {
      if (G.ariel.carry) { say("Hands full! Use it or toss it."); sfx.nope(); return; }
      if (wasOpen === hit.id) return;
      openPicker(hit.id);
      return;
    }
    goTo(hit);
  });
  cv.addEventListener("pointermove", e => { if (G && G.mode === "feedmax" && MG && MG.down) { const [x, y] = toStage(e); mgPointer(x, y, false); } });
  addEventListener("pointerup", () => { if (MG) MG.down = false; });

  $("#playBtn").onclick = () => { audio(); sfx.pick(); startRound(1); };
  $("#continueBtn").onclick = () => { audio(); sfx.pick(); startRound(save.highRound); };
  $("#howBtn").onclick = () => { sfx.tap(); showHow("#menu"); };
  $("#backBtn").onclick = () => {
    let same = false; try { same = document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
    if (same && history.length > 1) history.back(); else location.href = "../";
  };
  let howReturn = "#menu";
  function showHow(from) { howReturn = from; show("#howto"); }
  $("#howClose").onclick = () => { sfx.tap(); show(howReturn); };
  $("#introGo").onclick = () => { sfx.pick(); beginPlay(); };
  $("#pauseBtn").onclick = () => { sfx.tap(); pause(); };
  $("#resumeBtn").onclick = () => { sfx.tap(); resume(); };
  $("#restartBtn").onclick = () => { sfx.tap(); startRound(G.round); };
  $("#pauseHowBtn").onclick = () => { sfx.tap(); showHow("#pause"); };
  $("#quitBtn").onclick = () => { sfx.tap(); toMenu(); };
  $("#nextBtn").onclick = () => { sfx.pick(); startRound(G.round + 1); };
  $("#winMenuBtn").onclick = () => { sfx.tap(); toMenu(); };
  $("#retryBtn").onclick = () => { sfx.pick(); startRound(G.round); };
  $("#loseMenuBtn").onclick = () => { sfx.tap(); toMenu(); };
  $("#feedBtn").onclick = () => startFeedMax();
  $("#tossBtn").onclick = () => {
    const a = G && G.ariel; if (!a || !a.carry || a.busy > 0 || G.mode !== "play") return;
    a.carry = null; burst(a.x + a.dir * 30, a.y - 130, "smoke", 8, "rgba(255,255,255,.9)"); float("Tossed!", a.x, a.y - 240, "#FFFFFF", 26); sfx.toss();
  };
  const syncMute = () => { const b = $("#muteBtn"); b.classList.toggle("off", save.muted); b.setAttribute("aria-label", save.muted ? "Sound off" : "Sound on"); };
  $("#muteBtn").onclick = () => { save.muted = !save.muted; persist(); syncMute(); if (!save.muted) sfx.tap(); };
  syncMute();
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") { if (G && G.mode === "paused") resume(); else pause(); } });
  let rotateOk = false;
  $("#rotateOk").onclick = () => { rotateOk = true; $("#rotate").hidden = true; };

  // how-to recipe rows
  const buildRecipes = () => $("#recipes").innerHTML = [
    ["soup", ["soupveg", "Pot", "Stir", "Simmer", "soup"]],
    ["frittata", ["eggs", "eggmix", "Pan", "frittata_c", "frittata"]],
    ["kugel", ["kugelfix", "kugelmix", "kugelraw", "Oven", "kugel"]],
    ["cutlets", ["chicken", "breaded", "Fry + FLIP", "cutlets_c", "cutlets"]],
    ["cake", ["cakefix", "batter", "cakeraw", "Oven", "cake"]],
  ].map(([d, flow]) => `<div class="recipe"><b>${DISHES[d].name}</b><div class="flow">${flow.map((s, i) => (i ? "<em>›</em>" : "") + (ITEMS[s] ? `<span><img src="${icon(s)}" alt="">${ITEMS[s].name.replace(/, ready to bake/, "")}</span>` : `<span>${s}</span>`)).join("")}</div></div>`).join("");
  buildRecipes();

  // ---------- update ----------
  function updateFx(dt) {
    if (!G) return;
    for (const p of G.parts) { p.life += dt; p.vx *= .98; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr ? p.vr * dt : 0; }
    G.parts = G.parts.filter(p => p.life < p.max);
    for (const b of G.bubbles) b.t += dt; G.bubbles = G.bubbles.filter(b => b.t < b.dur);
    for (const f of G.floats) f.t += dt; G.floats = G.floats.filter(f => f.t < f.dur);
    G.shake = Math.max(0, G.shake - dt * 30);
    if (G.max.state === "nap" && Math.random() < dt * .8) G.floats.push({ text: "z", x: G.max.x + 20, y: G.max.y - 90, col: "#FFFFFF", size: 28, t: 0, dur: 1.6 });
  }
  function update(dt) {
    T += dt;
    if (!G) return;
    updateFx(dt);
    switch (G.mode) {
      case "play":
        G.t += dt;
        updateAriel(dt);
        if (G.ending) { G.endT -= dt; if (G.endT <= 0) finish(); }
        else {
          updateSlots(dt); updateFam(dt); updateMax(dt); famEvents(dt);
          for (const k of Object.keys(G.mess)) { G.mess[k].t -= dt; if (G.mess[k].t <= 0) delete G.mess[k]; }
        }
        hintT -= dt;
        if (hintT <= 0) {
          hintT = .2; HINT = computeHint();
          const el = $("#hint"); if (el.textContent !== HINT.text) el.textContent = HINT.text; el.classList.toggle("alert", !!HINT.alert);
        }
        syncHud(); updateCarry();
        break;
      case "feedmax": updateMG(dt); syncHud(); break;
      case "menu": case "intro": famEvents(dt); break;
      case "win": case "lose":
        G.ariel.animT += dt;
        if (G.mode === "win" && Math.random() < dt * 1.5) burst(rand(1100, 1850), rand(260, 420), "confetti", 6);
        break;
    }
  }

  // ---------- draw ----------
  function famOpts(f) {
    const mood = f.state === "waiting" ? moodOf(f.patience) : 0;
    return { t: T + f.tOff, mood, state: f.wrongT > 0 ? "wrong" : f.state, event: f.event, eventT: f.eventT, blink: ((T + f.tOff) % 4.3) < .12, plate: f.plate, scarf: G.scarf };
  }
  function drawMax(c) {
    const m = G.max, s = sOf(m.y) * .95;
    const o = { t: T, act: "sit", dir: m.dir, ph: m.ph, blink: (T % 3.7) < .12 };
    switch (m.state) {
      case "nap": o.act = "nap"; break;
      case "calm": o.act = m.snack ? "eat" : "sit"; o.snack = m.snack; break;
      case "loose": if (m.moving) o.act = "run"; else Object.assign(o, m.gag.draw); break;
      case "return": o.act = "run"; o.expr = "grin"; o.snack = m.snack; break;
      case "peek": o.act = "peek"; o.look = [-1.5, 0]; o.expr = "sly"; o.dir = 1; break;
      case "party": o.act = "happy"; o.crumbs = true; o.snack = "cookie"; break;
      case "pot": o.act = "bang"; o.pot = true; o.expr = "grin"; break;
    }
    if (m.state === "loose" && m.gag && !m.moving) {
      if (m.gag.draw.towel) { c.save(); c.translate(m.x - m.dir * 40, m.y - 8); c.rotate(-m.dir * .15); ART.box(c, -34, -8, 68, 16, 5, "#F4F0EA"); for (let i = 0; i < 3; i++) ART.line(c, [-26 + i * 24, -8, -26 + i * 24, 8], 4, "#6FA5D8"); c.restore(); }
      if (m.gag.draw.paper) { c.save(); c.beginPath(); c.moveTo(388, 470); c.bezierCurveTo(400, 620, m.x - 60, m.y - 40, m.x, m.y - 50); c.strokeStyle = "#FFFFFF"; c.lineWidth = 12; c.stroke(); c.restore(); }
    }
    ART.max(c, m.x, m.y, s, o);
    if (m.state === "loose") {
      const p = .5 + .5 * Math.sin(T * 8);
      c.save(); c.globalAlpha = .5 + .5 * p; c.beginPath(); c.ellipse(m.x, m.y, 60, 16, 0, 0, Math.PI * 2); c.strokeStyle = "#E5484D"; c.lineWidth = 4; c.stroke(); c.restore();
      ART.badge(c, m.x, m.y - 150 * s, "TAP MAX!", "#E5484D", T);
    }
  }
  function drawGlow(c) {
    const p = .5 + .5 * Math.sin(T * 6);
    for (const g of HINT.glow || []) {
      if (g === "max") continue;
      if (g.startsWith("fam:")) {
        const f = G.fam[g.slice(4)], [hx, hy] = famHead(f), bounce = Math.abs(Math.sin(T * 5)) * 12;
        c.save(); c.translate(hx, hy - 118 - bounce);
        c.beginPath(); c.moveTo(-18, -22); c.lineTo(18, -22); c.lineTo(18, 0); c.lineTo(30, 0); c.lineTo(0, 28); c.lineTo(-30, 0); c.lineTo(-18, 0); c.closePath();
        c.fillStyle = "#F2C230"; c.shadowColor = "rgba(242,194,48,.8)"; c.shadowBlur = 18; c.fill(); c.shadowBlur = 0; c.strokeStyle = "#FFFFFF"; c.lineWidth = 4; c.stroke();
        c.restore();
        continue;
      }
      const st = ST[g]; if (!st) continue;
      const [rx, ry, rw, rh] = st.r;
      c.save(); ART.rr(c, rx - 4, ry - 4, rw + 8, rh + 8, 18);
      c.shadowColor = `rgba(255,214,110,${.6 + .4 * p})`; c.shadowBlur = 26; c.strokeStyle = `rgba(255,222,130,${.7 + .3 * p})`; c.lineWidth = 5; c.stroke();
      c.shadowBlur = 0; c.fillStyle = `rgba(255,240,190,${.08 + .08 * p})`; c.fill(); c.restore();
    }
  }
  function drawSlotUI(c) {
    for (const [id, s] of Object.entries(G.slots)) {
      if (s.phase === "empty") continue;
      const [x, y] = ST[id].ring, ck = s.item && COOK[s.item];
      if (s.phase === "cook") ART.ring(c, x, y, 17, s.frac, G.slowT > 0 ? "#9E8AD0" : "#6FA5D8");
      else if (s.phase === "stir") ART.badge(c, x, y - 4, "STIR!", "#6FA5D8", T);
      else if (s.phase === "flip") { ART.ring(c, x, y + 30, 17, 1 - s.t / 6, "#E5484D"); ART.badge(c, x, y - 18, "FLIP!", "#F39237", T); }
      else if (s.phase === "ready") {
        const left = 1 - s.t / ck.grace, hurry = left < .45;
        ART.ring(c, x, y + 30, 17, left, hurry ? "#E5484D" : "#4CC38A");
        ART.badge(c, x, y - 18, (hurry ? "HURRY!" : "READY!") + (s.servings > 1 ? " ×2" : ""), hurry ? "#E5484D" : "#4CC38A", T, true);
      } else if (s.phase === "burnt") ART.badge(c, x, y - 4, id === "pot" ? "BOILED OVER" : "BURNT", "#6B6B6B", T, false);
    }
  }
  function drawScene(c) {
    const a = G.ariel;
    c.save();
    if (G.shake > 0) c.translate(rand(-1, 1) * G.shake, rand(-1, 1) * G.shake);
    if (bg) c.drawImage(bg, 0, 0, W, H);
    ART.tv(c, T, G.tvCheer > 0);
    ART.radioGlow(c, T, G.fam.simon.state === "waiting" && moodOf(G.fam.simon.patience) >= 2);
    const sf = G.fam.sarah;
    ART.mirrorReflection(c, () => { c.save(); c.translate(1132, 616); c.scale(-.74, .74); ART.sarah(c, 0, 0, .85, { ...famOpts(sf), reflection: true }); c.restore(); });
    ART.pot(c, 520, G.slots.pot, T);
    ART.pan(c, 620, G.slots.pan1, T); ART.pan(c, 708, G.slots.pan2, T);
    ART.oven(c, "ovenTop", G.slots.ovenTop, T); ART.oven(c, "ovenBot", G.slots.ovenBot, T);
    ART.mixerWork(c, T, a.anim === "mix");
    if (G.mode === "play") drawGlow(c);

    const ents = [];
    for (const id of FAM_IDS) { const d = FAM[id], f = G.fam[id]; ents.push({ y: d.y, draw: () => d.draw(c, d.x, d.y, sOf(d.y), famOpts(f)) }); }
    ents.push({ y: 912, draw: () => ART.island(c, T) });
    ents.push({ y: 918, draw: () => ART.servingPass(c, G.pass, T) });
    ents.push({ y: 1000, draw: () => ART.plant(c) });
    ents.push({ y: a.y, draw: () => ART.ariel(c, a.x, a.y, sOf(a.y) * 1.08, { t: T, dir: a.dir, moving: a.path.length > 0 && a.busy <= 0, walkPh: a.walkPh, anim: a.anim, animT: a.animT, carry: a.carry, frazzle: a.frazzle, blink: (T % 3.9) < .12, expr: a.expr }) });
    ents.push({ y: G.max.y, draw: () => drawMax(c) });
    ents.sort((p, q) => p.y - q.y).forEach(e => e.draw());
    for (const [k, m] of Object.entries(G.mess)) { const [mx, my] = MESS_AREA[k].at; ART.mess(c, mx, my, m.kind, T); }

    if (G.mode === "play" || G.mode === "paused" || G.mode === "feedmax") {
      drawSlotUI(c);
      for (const id of FAM_IDS) {
        const f = G.fam[id]; if (f.state !== "waiting") continue;
        const [hx, hy] = famHead(f); ART.orderBubble(c, hx, hy - 6, f.order, f.patience, T, 1);
        if (moodOf(f.patience) === 3) ART.steam(c, hx + 44, hy + 50, 26, T * 1.6, .8);
      }
      if (a.busy > 0 && a.busyDur >= .6) {
        const s = sOf(a.y) * 1.08, bx = a.x - 44, by = a.y - 268 * s;
        ART.box(c, bx - 4, by - 4, 96, 22, 11, "rgba(42,29,51,.85)");
        ART.box(c, bx, by, 88 * (1 - a.busy / a.busyDur), 14, 7, "#7FE0B0");
      }
    }
    for (const b of G.bubbles) {
      let x, y;
      if (b.target === "ariel") { const s = sOf(a.y) * 1.08; x = a.x; y = a.y - 262 * s; }
      else { const f = G.fam[b.target]; [x, y] = famHead(f); y -= f.state === "waiting" ? 104 : 6; }
      const k = Math.min(1, b.t * 6), out = b.dur - b.t < .25 ? (b.dur - b.t) / .25 : 1;
      c.save(); c.globalAlpha = out;
      ART.speech(c, x, y, b.text, { ...b.style, scale: .6 + .4 * k * (1 + .08 * Math.sin(k * Math.PI)), clampX: [40, 1880] });
      c.restore();
    }
    for (const p of G.parts) {
      const k = p.life / p.max; c.save(); c.globalAlpha = 1 - k;
      if (p.kind === "heart") { c.translate(p.x, p.y); c.scale(p.r / 8, p.r / 8); c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(-10, -5, -4, -12, 0, -6); c.bezierCurveTo(4, -12, 10, -5, 0, 3); c.fillStyle = p.col; c.fill(); }
      else if (p.kind === "confetti") { c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); }
      else if (p.kind === "smoke" || p.kind === "steam") { c.globalAlpha = (1 - k) * .7; ART.dot(c, p.x, p.y, p.r * (1 + k * 1.5), p.col || "rgba(255,255,255,.8)"); }
      else ART.dot(c, p.x, p.y, p.r * (1 - k * .5), p.col);
      c.restore();
    }
    for (const f of G.floats) {
      const k = f.t / f.dur; c.save(); c.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
      c.font = `700 ${f.size}px ${ART.FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 7; c.strokeStyle = "rgba(60,30,40,.75)"; c.lineJoin = "round"; const yy = f.y - k * 60;
      c.strokeText(f.text, f.x, yy); c.fillStyle = f.col; c.fillText(f.text, f.x, yy);
      c.restore();
    }
    c.restore();
  }
  function drawMG(c) {
    const M = MG;
    c.fillStyle = "rgba(30,15,40,.6)"; c.fillRect(0, 0, W, H);
    c.save(); c.shadowColor = "rgba(0,0,0,.4)"; c.shadowBlur = 50; c.shadowOffsetY = 20;
    ART.box(c, 400, 112, 1120, 890, 48, ART.lin(c, 0, 112, 0, 1002, "#FFFDF8", "#F4EADB")); c.restore();
    ART.rr(c, 400, 112, 1120, 890, 48); c.strokeStyle = "#C9A45C"; c.lineWidth = 4; c.stroke();
    ART.text(c, "FEED MAX!", 960, 168, 60, "#3B2946", 700);
    ART.text(c, M.first ? "Tap the snack Max wants, then tap or drag to catch him!" : `Max wants: ${SNACK_NAME[M.want]}`, 960, 222, 26, "#7A6658", 500);
    const left = Math.max(0, 1 - M.t / M.dur);
    ART.box(c, 480, 250, 960, 16, 8, "#EDE3D3"); ART.box(c, 480, 250, 960 * left, 16, 8, left < .3 ? "#E5484D" : "#F39237");
    ART.text(c, `${Math.ceil(M.dur - M.t)}s`, 1466, 258, 20, "#7A6658", 700, "left");
    // playroom
    c.save(); ART.rr(c, 460, 284, 1000, 520, 36); c.clip();
    c.fillStyle = ART.lin(c, 0, 284, 0, 804, "#F6E8E1", "#E8D6CC"); c.fillRect(460, 284, 1000, 520);
    c.fillStyle = ART.lin(c, 0, 360, 0, 804, "#D9B38A", "#C99B6E"); c.fillRect(460, 360, 1000, 444);
    c.save(); c.translate(960, 600); c.scale(1, .36); ART.dot(c, 0, 0, 440, "#BFE3D6"); c.beginPath(); c.arc(0, 0, 400, 0, Math.PI * 2); c.setLineDash([20, 16]); c.strokeStyle = "#FFFFFF"; c.lineWidth = 8; c.stroke(); c.setLineDash([]); c.restore();
    for (const [bx, by, col, ch] of [[540, 372, "#F07C4A", "A"], [566, 360, "#6FA5D8", "B"], [1370, 380, "#F9C74F", "C"]]) { ART.box(c, bx - 16, by - 16, 32, 32, 6, col); ART.text(c, ch, bx, by + 1, 20, "#FFFFFF", 700); }
    c.save(); c.translate(1340, 330); ART.dot(c, 0, 0, 30, "#F28DB2"); ART.dot(c, 0, 0, 20, "#FFFFFF"); ART.dot(c, 0, 0, 10, "#6FA5D8"); c.restore();
    c.restore();
    // characters depth-sorted
    const ents = [
      { y: M.ay, draw: () => ART.ariel(c, M.ax, M.ay, 1, { t: T, dir: M.adir, moving: M.amove, walkPh: M.aph, carry: M.hold, blink: (T % 3.9) < .12, expr: M.state === "win" ? "happy" : null }) },
      { y: M.my, draw: () => {
        const o = { t: T, dir: M.mdir, ph: M.mph, blink: (T % 3.7) < .12 };
        if (M.state === "win") Object.assign(o, { act: "eat", snack: M.want, expr: "eat" });
        else Object.assign(o, { act: "run", expr: M.dash > 0 ? "grin" : "sly" });
        ART.max(c, M.mx, M.my, 1.15, o);
      } },
    ];
    ents.sort((p, q) => p.y - q.y).forEach(e => e.draw());
    // want bubble
    if (M.state === "play") {
      const bx = M.mx, by = M.my - 170;
      c.save(); c.shadowColor = "rgba(0,0,0,.25)"; c.shadowBlur = 12; ART.box(c, bx - 44, by - 88, 88, 80, 24, "#FFFFFF"); c.restore();
      c.beginPath(); c.moveTo(bx - 10, by - 9); c.lineTo(bx + 10, by - 9); c.lineTo(bx, by + 6); c.fillStyle = "#FFFFFF"; c.fill();
      ART.food(c, M.want, bx, by - 50, 60, T);
    }
    if (M.msgT > 0) ART.speech(c, M.mx, M.my - (M.state === "play" ? 262 : 170), M.msg, { size: 24, weight: 700, border: "#F39237" });
    if (M.state === "win") { ART.speech(c, 960, 520, `Max is happy! +${M.bonus}`, { size: 38, weight: 700, bg: "#E9FFF3", border: "#4CC38A" }); }
    if (M.state === "fail") { ART.speech(c, 960, 520, "Max got away!", { size: 38, weight: 700, bg: "#FFE9E6", border: "#E5484D" }); }
    // snack tray
    for (let i = 0; i < 5; i++) {
      const b = SNACK_BTN(i), sel = M.hold === SNACKS[i];
      c.save(); c.shadowColor = "rgba(120,90,50,.35)"; c.shadowBlur = 10; c.shadowOffsetY = 5;
      ART.box(c, b.x, b.y, b.w, b.h, 30, sel ? ART.lin(c, 0, b.y, 0, b.y + b.h, "#FBE7B0", "#E5C27A") : ART.lin(c, 0, b.y, 0, b.y + b.h, "#FFFFFF", "#F1E7D8"));
      c.restore();
      if (sel) { ART.rr(c, b.x, b.y, b.w, b.h, 30); c.strokeStyle = "#9C7634"; c.lineWidth = 4; c.stroke(); }
      ART.food(c, SNACKS[i], b.x + b.w / 2, b.y + 60, 70, T);
      ART.text(c, SNACK_NAME[SNACKS[i]], b.x + b.w / 2, b.y + b.h - 22, 21, "#3A2A24", 600);
    }
  }
  function draw() {
    const c = ctx;
    c.setTransform(VIEW.k, 0, 0, VIEW.k, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!G) return;
    drawScene(c);
    if (G.mode === "feedmax" && MG) drawMG(c);
  }

  // ---------- sizing ----------
  function renderBg() {
    bg = document.createElement("canvas"); bg.width = Math.round(W * VIEW.k); bg.height = Math.round(H * VIEW.k);
    const b = bg.getContext("2d"); b.scale(VIEW.k, VIEW.k); ART.background(b);
  }
  function resize() {
    const vw = innerWidth, vh = innerHeight, s = Math.min(vw / W, vh / H);
    const cw = W * s, ch = H * s, ox = (vw - cw) / 2, oy = (vh - ch) / 2, dpr = Math.min(2, devicePixelRatio || 1);
    Object.assign(VIEW, { s, ox, oy, k: s * dpr });
    Object.assign(cv.style, { left: ox + "px", top: oy + "px", width: cw + "px", height: ch + "px" });
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    ui.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
    renderBg();
    $("#rotate").hidden = rotateOk || !(vh > vw * 1.05);
  }
  addEventListener("resize", resize);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  resize();
  toMenu();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { renderBg(); for (const k in ICONS) delete ICONS[k]; buildRecipes(); });
  requestAnimationFrame(frame);

  // small hook for automated checks
  window.__cookout = { get G() { return G; }, get MG() { return MG; }, startRound, beginPlay, startFeedMax, goTo, finish, tick: update, ITEMS, COOK, DISHES };
})();
