// Frozenbergs: build ice cream cones, hand them out, collect tips.
(() => {
  const $ = (s) => document.querySelector(s);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const money = (n) => "$" + n.toFixed(2);
  const SPEED = location.hash.includes("fast") ? 0.15 : 1;   // test hook
  const PER_DAY = 8;
  const MAX_SCOOPS = 4;

  // ---------- menu ----------
  const CONES = [
    { k: "waffle", n: "Waffle" },
    { k: "sugar", n: "Sugar" },
    { k: "cup", n: "Cup" },
  ];
  const FLAVORS = [
    { k: "vanilla", n: "Vanilla", c: "#FFF0C7", s: "#EBD29A" },
    { k: "choc", n: "Chocolate", tile: "Choco&shy;late", c: "#8A5534", s: "#6A3C22" },
    { k: "straw", n: "Strawberry", tile: "Straw&shy;berry", c: "#FFA9C3", s: "#EE7FA0" },
    { k: "mint", n: "Mint Chip", c: "#A9EBD3", s: "#7CD0B3", chips: true },
    { k: "blue", n: "Blue Moon", c: "#8EC2FF", s: "#629FEA" },
    { k: "mango", n: "Mango", c: "#FFC94D", s: "#F0A628" },
  ];
  const SAUCES = [
    { k: "fudge", n: "Fudge", c: "#4B2616" },
    { k: "caramel", n: "Caramel", c: "#D98A2B" },
    { k: "berry", n: "Raspberry", tile: "Rasp&shy;berry", c: "#D8315B" },
  ];
  const TOPS = [
    { k: "sprinkles", n: "Sprinkles" },
    { k: "chips", n: "Choc Chips" },
    { k: "whip", n: "Whipped Cream" },
    { k: "cherry", n: "Cherry" },
    { k: "wafer", n: "Wafer" },
  ];
  const F = Object.fromEntries(FLAVORS.map((f) => [f.k, f]));
  const S = Object.fromEntries(SAUCES.map((f) => [f.k, f]));
  const nameOf = (list, k) => list.find((x) => x.k === k)?.n ?? k;

  // ---------- drawing ----------
  // Tiny seeded RNG so sprinkles don't jump around every re-render.
  const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const hash = (str) => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 2147483647; return h || 1; };

  function scoopSVG(f, cy) {
    const fl = F[f];
    let out = `<g>`;
    out += `<ellipse cx="60" cy="${cy + 12}" rx="31" ry="9" fill="${fl.s}"/>`;
    for (const x of [35, 47, 60, 73, 85]) out += `<circle cx="${x}" cy="${cy + 15}" r="6.5" fill="${fl.s}"/>`;
    out += `<circle cx="60" cy="${cy}" r="27" fill="${fl.c}"/>`;
    for (const x of [36, 48, 60, 72, 84]) out += `<circle cx="${x}" cy="${cy + 12}" r="6.5" fill="${fl.c}"/>`;
    out += `<ellipse cx="50" cy="${cy - 11}" rx="9" ry="5" fill="#fff" opacity=".45" transform="rotate(-25 50 ${cy - 11})"/>`;
    if (fl.chips) {
      const r = seeded(hash("mint" + cy));
      for (let i = 0; i < 7; i++) {
        const x = 40 + r() * 40, y = cy - 14 + r() * 26;
        out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="4" height="3" rx="1" fill="#3B2214" transform="rotate(${(r() * 90) | 0} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }
    }
    return out + `</g>`;
  }

  function coneShape(k) {
    if (k === "waffle") return `<path d="M22 138 L98 138 L60 206 Z" fill="url(#pWaffle)" stroke="#B86E2C" stroke-width="2" stroke-linejoin="round"/>
      <rect x="17" y="130" width="86" height="13" rx="6.5" fill="#E08E43" stroke="#B86E2C" stroke-width="2"/>`;
    if (k === "sugar") return `<path d="M26 138 L94 138 L60 206 Z" fill="url(#gSugar)" stroke="#B87A38" stroke-width="2" stroke-linejoin="round"/>
      <path d="M43 150 L60 196 M60 142 L60 200 M77 150 L60 196" stroke="#C88A45" stroke-width="1.5" fill="none"/>
      <rect x="22" y="130" width="76" height="11" rx="3" fill="#F3C98A" stroke="#B87A38" stroke-width="2"/>`;
    if (k === "cup") return `<path d="M22 134 L98 134 L88 200 Q60 206 32 200 Z" fill="url(#pCup)" stroke="#D6557F" stroke-width="2" stroke-linejoin="round"/>
      <rect x="18" y="128" width="84" height="10" rx="5" fill="#FFFFFF" stroke="#D6557F" stroke-width="2"/>`;
    return `<path d="M22 138 L98 138 L60 206 Z" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="2.5" stroke-dasharray="6 6" stroke-linejoin="round"/>`;
  }

  function coneSVG(b, { mystery = false } = {}) {
    const n = b.scoops.length;
    const tcy = n ? 124 - (n - 1) * 25 : 138;      // centre of the top scoop
    let top = n ? tcy - 27 : 130;                   // highest drawn point so far
    const tops = new Set(b.tops);
    let body = coneShape(b.cone);

    b.scoops.forEach((f, i) => {
      if (i === n - 1 && tops.has("wafer")) {
        body += `<g transform="rotate(22 76 ${tcy - 10})"><rect x="70" y="${tcy - 50}" width="13" height="44" rx="2" fill="#F2C57C" stroke="#C48A3C" stroke-width="1.5"/>
          <path d="M70 ${tcy - 40}h13M70 ${tcy - 30}h13M70 ${tcy - 20}h13" stroke="#C48A3C" stroke-width="1.2"/></g>`;
      }
      body += scoopSVG(f, 124 - i * 25);
    });

    if (b.sauce) {
      const t = tcy - 2, c = S[b.sauce].c;
      let d = `M32 ${t} C32 ${t - 36} 88 ${t - 36} 88 ${t}`;
      for (const [x, len] of [[82, 9], [72, 17], [61, 7], [50, 14], [39, 10]]) {
        d += ` L${x + 3} ${t} L${x + 3} ${t + len} A3 3 0 0 1 ${x - 3} ${t + len} L${x - 3} ${t}`;
      }
      body += `<path d="${d} L32 ${t} Z" fill="${c}"/><path d="M42 ${t - 16} Q52 ${t - 24} 64 ${t - 23}" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }

    if (tops.has("whip")) {
      const y = top + 4;
      body += `<g fill="#FFFDF8" stroke="#E9DDE4" stroke-width="1.5">
        <ellipse cx="60" cy="${y}" rx="23" ry="8"/><ellipse cx="60" cy="${y - 7}" rx="17" ry="7"/><ellipse cx="60" cy="${y - 13}" rx="11" ry="6"/>
        <path d="M53 ${y - 16} Q60 ${y - 30} 64 ${y - 22} Q66 ${y - 18} 66 ${y - 16} Z"/></g>`;
      top = y - 24;
    }

    const r = seeded(hash(b.scoops.join() + b.tops.join()));
    const scatter = (count, fn) => {
      for (let i = 0; i < count; i++) {
        const a = Math.PI * (1.08 + r() * 0.84), rr = 12 + r() * 13;
        fn(60 + Math.cos(a) * rr, tcy - 6 + Math.sin(a) * rr * 0.9, r() * 180);
      }
    };
    if (tops.has("sprinkles")) {
      const cols = ["#FF4F86", "#2DBFAE", "#FFB020", "#7C6CF2", "#FFFFFF", "#4FA3FF"];
      scatter(16, (x, y, rot) => { body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7" height="2.6" rx="1.3" fill="${cols[(rot | 0) % cols.length]}" transform="rotate(${rot | 0} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; });
    }
    if (tops.has("chips")) {
      scatter(9, (x, y) => { body += `<path d="M${x.toFixed(1)} ${(y - 4).toFixed(1)} l3.5 5.5 h-7 Z" fill="#3E2213"/>`; });
    }
    if (tops.has("cherry")) {
      const cy = top - 4;
      body += `<path d="M60 ${cy - 6} Q62 ${cy - 20} 72 ${cy - 24}" stroke="#4E7A2B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="${cy}" r="9" fill="url(#gCherry)"/><circle cx="56.5" cy="${cy - 3}" r="2.5" fill="#fff" opacity=".7"/>`;
    }
    if (mystery) {
      body = coneShape(null) + `<text x="60" y="118" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="70" fill="#FF4F86">?</text>`;
    }
    return `<svg viewBox="0 -30 120 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${mystery ? "Surprise cone" : describe(b)}">${body}</svg>`;
  }

  function describe(b) {
    if (!b.cone && !b.scoops.length) return "An empty cone holder";
    const parts = [b.cone ? nameOf(CONES, b.cone) + (b.cone === "cup" ? "" : " cone") : "No cone"];
    if (b.scoops.length) parts.push(b.scoops.map((f) => F[f].n).join(", "));
    if (b.sauce) parts.push(S[b.sauce].n + " sauce");
    if (b.tops.length) parts.push(b.tops.map((t) => nameOf(TOPS, t)).join(", "));
    return parts.join(" with ");
  }

  // ---------- customers ----------
  const NAMES = ["Priya", "Leo", "Maya", "Sam", "Noa", "Otis", "Zara", "Eli", "Ruby", "Jonah", "Ivy", "Theo", "Lena", "Max", "Ada", "Milo", "Hana", "Gus", "Bea", "Ravi"];
  const SKIN = ["#F7D3B5", "#EDB98A", "#D08B5B", "#AE6A3E", "#7C4A2A", "#FBE0CB"];
  const HAIR = ["#2B1B12", "#5B3A1E", "#A8612B", "#E5B04A", "#1E1E2A", "#C9483A", "#8C8C9A"];
  const SHIRT = ["#4FA3FF", "#2DBFAE", "#FFB020", "#7C6CF2", "#FF6F61", "#56C271", "#FF8FB1"];
  const STYLES = ["short", "bob", "bun", "spiky", "cap", "curly", "long"];

  function customerSVG(c, mood = "wait") {
    const hair = {
      short: `<path d="M28 66 Q28 34 60 34 Q92 34 92 66 Q84 50 60 48 Q36 50 28 66Z" fill="${c.hair}"/>`,
      bob: `<path d="M26 82 Q22 34 60 34 Q98 34 94 82 L86 82 Q88 52 60 50 Q32 52 34 82Z" fill="${c.hair}"/>`,
      bun: `<circle cx="60" cy="30" r="12" fill="${c.hair}"/><path d="M28 66 Q28 36 60 36 Q92 36 92 66 Q82 50 60 50 Q38 50 28 66Z" fill="${c.hair}"/>`,
      spiky: `<path d="M28 64 L32 42 L40 48 L44 32 L54 44 L60 28 L66 44 L76 32 L80 48 L88 42 L92 64 Q80 50 60 50 Q40 50 28 64Z" fill="${c.hair}"/>`,
      cap: `<path d="M28 60 Q28 32 60 32 Q92 32 92 60Z" fill="${c.shirt}"/><path d="M60 58 L102 58 Q104 64 96 64 L60 64Z" fill="${c.shirt}"/><circle cx="60" cy="32" r="3" fill="#fff"/>`,
      curly: [30, 40, 52, 64, 76, 88, 34, 86].map((x, i) => `<circle cx="${x}" cy="${i > 5 ? 56 : 42 - (i % 2) * 6}" r="11" fill="${c.hair}"/>`).join(""),
      long: `<path d="M24 110 Q18 34 60 34 Q102 34 96 110 L86 110 Q88 54 60 50 Q32 54 34 110Z" fill="${c.hair}"/>`,
    }[c.style];
    const mouth = {
      wait: `<path d="M52 84 Q60 88 68 84" stroke="#3B2342" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      happy: `<path d="M50 80 Q60 94 70 80 Z" fill="#3B2342"/><path d="M54 86 Q60 91 66 86" fill="#FF7B8F"/>`,
      wow: `<ellipse cx="60" cy="85" rx="6" ry="7" fill="#3B2342"/>`,
      meh: `<path d="M52 85 H68" stroke="#3B2342" stroke-width="2.5" stroke-linecap="round"/>`,
      sad: `<path d="M52 88 Q60 80 68 88" stroke="#3B2342" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    }[mood];
    const eyes = mood === "happy"
      ? `<path d="M44 68 Q49 62 54 68 M66 68 Q71 62 76 68" stroke="#3B2342" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
      : `<circle cx="49" cy="67" r="3.6" fill="#3B2342"/><circle cx="71" cy="67" r="3.6" fill="#3B2342"/><circle cx="50" cy="66" r="1.2" fill="#fff"/><circle cx="72" cy="66" r="1.2" fill="#fff"/>`;
    const behind = c.style === "long" || c.style === "bob" ? hair : "";
    const front = behind ? `<path d="M30 60 Q36 44 60 44 Q84 44 90 60 Q80 50 60 50 Q40 50 30 60Z" fill="${c.hair}"/>` : hair;
    const apron = c.worker ? `<path d="M40 120 Q60 126 80 120 L84 150 L36 150Z" fill="#FFFFFF"/><path d="M40 120 L44 110 M80 120 L76 110" stroke="#FFFFFF" stroke-width="3"/>
      <text x="60" y="138" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="9" fill="#FF4F86">F</text>` : "";
    const hat = c.worker ? `<path d="M30 50 L36 26 Q60 18 84 26 L90 50 Q60 42 30 50Z" fill="#FFFFFF" stroke="#E9DDE4" stroke-width="1.5"/>
      <path d="M33 40 Q60 32 87 40" stroke="#FF7BA5" stroke-width="5" fill="none"/>` : "";
    return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-label="${c.name}${c.worker ? ", the scooper" : ", a customer"}">
      ${behind}
      <path d="M22 150 Q22 108 60 106 Q98 108 98 150Z" fill="${c.shirt}"/>
      <path d="M48 108 Q60 118 72 108" stroke="#ffffff66" stroke-width="3" fill="none"/>${apron}
      <rect x="52" y="92" width="16" height="16" rx="6" fill="${c.skin}"/>
      <circle cx="60" cy="68" r="30" fill="${c.skin}"/>
      <circle cx="30" cy="70" r="6" fill="${c.skin}"/><circle cx="90" cy="70" r="6" fill="${c.skin}"/>
      ${front}${hat}${eyes}
      <circle cx="42" cy="78" r="5" fill="#FF7B8F" opacity=".35"/><circle cx="78" cy="78" r="5" fill="#FF7B8F" opacity=".35"/>
      ${mouth}
    </svg>`;
  }

  const SCOOPERS = {
    jonah: { name: "Jonah Reuben", first: "Jonah", skin: "#F7D3B5", hair: "#4A2E18", shirt: "#2DBFAE", style: "short", worker: true },
    ellie: { name: "Ellie", first: "Ellie", skin: "#FBE0CB", hair: "#A8612B", shirt: "#7C6CF2", style: "long", worker: true },
  };

  function makeOrder(day, surprise) {
    if (surprise) return { surprise: true };
    const maxScoops = Math.min(MAX_SCOOPS, 1 + day);
    const scoops = Array.from({ length: rand(1, maxScoops) }, () => pick(FLAVORS).k);
    const sauce = Math.random() < Math.min(0.8, 0.25 + day * 0.15) ? pick(SAUCES).k : null;
    const tops = shuffle(TOPS.map((t) => t.k)).slice(0, rand(day > 1 ? 1 : 0, Math.min(3, day)));
    return { cone: pick(CONES).k, scoops, sauce, tops: TOPS.map((t) => t.k).filter((k) => tops.includes(k)) };
  }

  // ---------- scoring ----------
  function grade(order, b) {
    if (order.surprise) {
      const distinct = new Set(b.scoops).size;
      const score = Math.min(b.scoops.length, 3) / 3 * 0.35 + Math.min(distinct, 3) / 3 * 0.25 +
        (b.sauce ? 0.15 : 0) + Math.min(b.tops.length, 3) / 3 * 0.25;
      return score;
    }
    const left = [...order.scoops];
    let matched = 0;
    for (const f of b.scoops) { const i = left.indexOf(f); if (i >= 0) { left.splice(i, 1); matched++; } }
    const scoopScore = matched / Math.max(order.scoops.length, b.scoops.length);
    const want = new Set(order.tops), got = new Set(b.tops);
    const union = new Set([...want, ...got]);
    const shared = [...want].filter((t) => got.has(t)).length;
    const topScore = union.size ? shared / union.size : 1;
    return ((order.cone === b.cone ? 1 : 0) + scoopScore * 2 + (order.sauce === b.sauce ? 1 : 0) + topScore) / 5;
  }
  const starsFor = (s) => (s >= 0.99 ? 3 : s >= 0.7 ? 2 : s >= 0.4 ? 1 : 0);

  const LINES = {
    hi: ["Hi {me}! Can I get…", "Hey {me}! I'll have…", "{me}! My favorite scooper! I'd like…"],
    thanks: ["Thanks, {me}!", "You're the best, {me}!", "{me}, you did it again!"],
    greet: ["Hi! Can I get…", "Ooh, it's hot out. I'll have…", "One of these, please!", "My usual:", "Hello! I'd love…"],
    surprise: ["Surprise me! Make it wild!", "Chef's choice — go big!", "Dealer's choice! Something fun!", "I can't decide. You pick!"],
    3: ["PERFECT! You're a legend!", "Exactly right. Wow!", "This is a masterpiece!", "Best cone ever!"],
    2: ["Pretty close! Yum.", "Nice! Almost exactly it.", "Ooh, I'll take it!"],
    1: ["Hmm… that's not quite it.", "Interesting choice…", "Well, it's ice cream!"],
    0: ["That is… not what I asked for.", "Uh… I'll just eat it.", "Did you hear me?"],
    s3: ["WHOA. That's incredible!", "A tower of dreams!", "You're an artist!"],
    s2: ["Fun! I love it!", "Ooh, fancy!"],
    s1: ["Cute! Kinda simple though.", "Okay, that's nice."],
    s0: ["That's… it?", "Plain. Very plain."],
    slow: ["Still waiting…", "Any minute now?", "*taps foot*"],
  };

  // ---------- sound ----------
  let ctx = null, muted = false;
  function tone(freq, dur = 0.12, type = "sine", vol = 0.15, slideTo = null, delay = 0) {
    if (muted) return;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* no audio, no problem */ }
  }
  const sfx = {
    plop: () => tone(520, 0.12, "sine", 0.2, 180),
    tap: () => tone(880, 0.05, "triangle", 0.08),
    sauce: () => tone(300, 0.25, "sawtooth", 0.04, 200),
    ding: () => { tone(988, 0.15, "triangle", 0.12); tone(1319, 0.3, "triangle", 0.12, null, 0.12); },
    cash: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, "square", 0.05, null, i * 0.07)),
    sad: () => { tone(400, 0.2, "triangle", 0.1, 300); tone(300, 0.3, "triangle", 0.1, 200, 0.18); },
    nope: () => tone(160, 0.15, "square", 0.06),
  };

  // ---------- state ----------
  const me = () => SCOOPERS[state.scooper];
  const state = {
    scooper: null,
    day: 1, served: 0, tips: 0, dayTips: 0, dayStars: 0, gallery: [],
    customer: null, order: null, patience: 100, busy: true,
    build: { cone: null, scoops: [], sauce: null, tops: [] },
  };
  try { state.scooper = SCOOPERS[localStorage.getItem("frozenbergs.scooper")] ? localStorage.getItem("frozenbergs.scooper") : null; } catch { /* private mode */ }
  try { state.tips = Number(localStorage.getItem("frozenbergs.tips")) || 0; } catch { /* private mode */ }

  // ---------- UI ----------
  const el = {
    cone: $("#buildCone"), customer: $("#customer"), bubble: $("#bubble"), float: $("#float"),
    patience: $("#patienceBar"), serve: $("#serveBtn"), toast: $("#toast"),
  };

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  function chip(label, attrs, icon) {
    return `<button class="chip" ${attrs} aria-pressed="false">${icon}<span>${label}</span></button>`;
  }
  const topIcon = (k) => {
    const draw = {
      sprinkles: `<rect x="4" y="8" width="8" height="3" rx="1.5" fill="#FF4F86" transform="rotate(-20 8 9)"/><rect x="12" y="4" width="8" height="3" rx="1.5" fill="#2DBFAE" transform="rotate(30 16 5)"/><rect x="10" y="15" width="8" height="3" rx="1.5" fill="#FFB020" transform="rotate(-40 14 16)"/><rect x="3" y="16" width="7" height="3" rx="1.5" fill="#7C6CF2" transform="rotate(15 6 17)"/>`,
      chips: `<path d="M6 6 l4 6 h-8Z M16 5 l4 6 h-8Z M11 14 l4 6 h-8Z" fill="#3E2213"/>`,
      whip: `<ellipse cx="12" cy="18" rx="9" ry="3.5" fill="#fff" stroke="#DCCFD8"/><ellipse cx="12" cy="14" rx="6.5" ry="3" fill="#fff" stroke="#DCCFD8"/><path d="M9 12 Q12 3 14 9 L15 12Z" fill="#fff" stroke="#DCCFD8"/>`,
      cherry: `<path d="M12 12 Q13 5 18 3" stroke="#4E7A2B" stroke-width="2" fill="none"/><circle cx="11" cy="16" r="6" fill="url(#gCherry)"/>`,
      wafer: `<rect x="8" y="2" width="8" height="20" rx="1.5" fill="#F2C57C" stroke="#C48A3C" transform="rotate(20 12 12)"/>`,
    }[k];
    return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${draw}</svg>`;
  };
  const coneIcon = (k) => ({
    waffle: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6 H20 L12 23Z" fill="url(#pWaffle)" stroke="#B86E2C" stroke-width="1.5"/></svg>`,
    sugar: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 H19 L12 23Z" fill="url(#gSugar)" stroke="#B87A38" stroke-width="1.5"/></svg>`,
    cup: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7 H20 L18 21 H6Z" fill="url(#pCup)" stroke="#D6557F" stroke-width="1.5"/></svg>`,
  })[k];

  $("#coneChips").innerHTML = CONES.map((c) => chip(c.n, `data-cone="${c.k}"`, coneIcon(c.k))).join("");
  $("#flavorChips").innerHTML = FLAVORS.map((f) => chip(f.tile ?? f.n, `data-flavor="${f.k}"`, `<i class="sw" style="background:${f.c}"></i>`)).join("");
  $("#sauceChips").innerHTML = SAUCES.map((s) => chip(s.tile ?? s.n, `data-sauce="${s.k}"`, `<i class="sw" style="background:${s.c}"></i>`)).join("");
  $("#topChips").innerHTML = TOPS.map((t) => chip(t.n, `data-top="${t.k}"`, topIcon(t.k))).join("");

  function renderBuild(pop = false) {
    const b = state.build;
    el.cone.innerHTML = coneSVG(b);
    if (pop) { el.cone.classList.remove("pop"); void el.cone.offsetWidth; el.cone.classList.add("pop"); }
    document.querySelectorAll("[data-cone]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.cone === b.cone));
    document.querySelectorAll("[data-sauce]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.sauce === b.sauce));
    document.querySelectorAll("[data-top]").forEach((x) => x.setAttribute("aria-pressed", b.tops.includes(x.dataset.top)));
    document.querySelectorAll("[data-flavor]").forEach((x) => {
      const count = b.scoops.filter((f) => f === x.dataset.flavor).length;
      x.setAttribute("aria-pressed", count > 0);
      x.querySelector(".n")?.remove();
      if (count > 1) x.insertAdjacentHTML("beforeend", `<b class="n">×${count}</b>`);
    });
    $("#scoopCount").textContent = `${b.scoops.length} / ${MAX_SCOOPS}`;
    $("#undoBtn").disabled = !b.scoops.length;
  }

  function renderStats() {
    $("#dayPill").textContent = `Day ${state.day}`;
    $("#queuePill").textContent = `${Math.min(state.served + 1, PER_DAY)} / ${PER_DAY}`;
    $("#tipPill").textContent = money(state.tips);
  }

  function orderLines(o) {
    const counts = {};
    o.scoops.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
    const lines = [nameOf(CONES, o.cone) + (o.cone === "cup" ? "" : " cone")];
    for (const [f, n] of Object.entries(counts)) lines.push((n > 1 ? `${n}× ` : "") + F[f].n);
    if (o.sauce) lines.push(`<span>+</span> ${S[o.sauce].n} sauce`);
    for (const t of o.tops) lines.push(`<span>+</span> ${nameOf(TOPS, t)}`);
    return `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
  }

  function showOrder() {
    const c = state.customer, o = state.order;
    const text = o.surprise ? `<span class="say">${pick(LINES.surprise)}</span>` : orderLines(o);
    el.bubble.innerHTML = `<span class="who">${c.name}${o.surprise ? "" : " · " + (Math.random() < 0.4 ? pick(LINES.hi) : pick(LINES.greet)).replace("{me}", me().first)}</span>
      <div class="ticket">${coneSVG(o.surprise ? { cone: null, scoops: [], sauce: null, tops: [] } : o, { mystery: o.surprise })}<div>${text}</div></div>`;
    el.bubble.classList.remove("hide");
  }

  function say(html) {
    el.bubble.innerHTML = `<span class="who">${state.customer.name}</span>${html}`;
    el.bubble.classList.remove("hide");
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

  async function nextCustomer() {
    state.busy = true;
    state.build = { cone: null, scoops: [], sauce: null, tops: [] };
    renderBuild(); renderStats();
    el.cone.classList.remove("handoff");
    if (state.scooper) showScooper();

    // Every third-ish customer wants a surprise, never the very first one.
    const surprise = state.served > 0 && Math.random() < 0.28;
    state.customer = { name: pick(NAMES), skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT), style: pick(STYLES) };
    state.order = makeOrder(state.day, surprise);
    state.patience = 100;
    el.patience.style.width = "100%"; el.patience.className = "";

    el.bubble.classList.add("hide");
    el.customer.className = "customer away";
    el.customer.innerHTML = customerSVG(state.customer);
    void el.customer.offsetWidth;
    el.customer.className = "customer";
    await wait(650);
    sfx.tap();
    showOrder();
    state.busy = false;
    el.serve.disabled = false;
  }

  async function serve() {
    if (state.busy) return;
    const b = state.build;
    if (!b.cone) { sfx.nope(); return toast("Pick a cone first!"); }
    if (!b.scoops.length) { sfx.nope(); return toast("Add at least one scoop!"); }

    state.busy = true;
    el.serve.disabled = true;
    const score = grade(state.order, b);
    const stars = starsFor(score);
    const speedBonus = stars > 0 ? (state.patience > 50 ? 1 : state.patience > 20 ? 0.5 : 0) : 0;
    const tip = [0.25, 1.5, 2.5, 4][stars] + speedBonus + (state.order.surprise ? b.scoops.length * 0.25 : 0);

    state.gallery.push({ build: structuredClone(b), stars });
    el.cone.classList.add("handoff");
    sfx.ding();
    await wait(550);

    const mood = ["sad", "meh", "happy", "happy"][stars];
    el.customer.innerHTML = customerSVG(state.customer, stars === 3 ? "wow" : mood);
    el.customer.classList.add("bounce");
    const key = (state.order.surprise ? "s" : "") + stars;
    const thanks = stars >= 2 && Math.random() < 0.5 ? " " + pick(LINES.thanks).replace("{me}", me().first) : "";
    say(`<span class="say">${pick(LINES[key])}${thanks}</span><span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>`);
    showScooper(stars >= 2 ? "happy" : stars === 1 ? "meh" : "sad");
    if (stars === 0) sfx.sad(); else sfx.cash();

    state.tips += tip; state.dayTips += tip; state.dayStars += stars;
    try { localStorage.setItem("frozenbergs.tips", state.tips.toFixed(2)); } catch { /* ignore */ }
    el.float.textContent = "+" + money(tip);
    el.float.classList.remove("go"); void el.float.offsetWidth; el.float.classList.add("go");
    renderStats();

    await wait(700);
    if (stars >= 2) el.customer.innerHTML = customerSVG(state.customer, "happy");
    await wait(1100);
    el.bubble.classList.add("hide");
    el.customer.className = "customer leave";
    await wait(600);

    state.served++;
    if (state.served >= PER_DAY) endDay(); else nextCustomer();
  }

  const RANKS = [
    [0.9, "Legendary Scooper 🏆"], [0.75, "Sundae Superstar"], [0.55, "Cone Captain"],
    [0.35, "Scoop Apprentice"], [0, "Melty Beginner"],
  ];
  function endDay() {
    const ratio = state.dayStars / (PER_DAY * 3);
    $("#dayTitle").textContent = `Day ${state.day} closed!`;
    $("#dayWho").textContent = `Great shift, ${me().first}!`;
    $("#dayRank").textContent = RANKS.find(([min]) => ratio >= min)[1];
    $("#dayStars").textContent = `${state.dayStars}/${PER_DAY * 3}`;
    $("#dayTips").textContent = money(state.dayTips);
    $("#totalTips").textContent = money(state.tips);
    $("#gallery").innerHTML = state.gallery.map((g) =>
      `<figure>${coneSVG(g.build)}<figcaption>${"★".repeat(g.stars)}${"☆".repeat(3 - g.stars)}</figcaption></figure>`).join("");
    $("#nextDayBtn").textContent = `Open Day ${state.day + 1}`;
    $("#dayOverlay").hidden = false;
    sfx.ding();
  }

  // ---------- input ----------
  document.querySelector(".builder").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t || state.busy) return;
    const b = state.build;
    if (t.dataset.cone) { b.cone = t.dataset.cone; sfx.tap(); renderBuild(true); }
    else if (t.dataset.flavor) {
      if (b.scoops.length >= MAX_SCOOPS) { sfx.nope(); return toast("Whoa — 4 scoops is the max!"); }
      b.scoops.push(t.dataset.flavor); sfx.plop(); renderBuild(true);
    } else if (t.dataset.sauce) {
      b.sauce = b.sauce === t.dataset.sauce ? null : t.dataset.sauce; sfx.sauce(); renderBuild(true);
    } else if (t.dataset.top) {
      const k = t.dataset.top;
      b.tops = b.tops.includes(k) ? b.tops.filter((x) => x !== k) : TOPS.map((x) => x.k).filter((x) => x === k || b.tops.includes(x));
      sfx.tap(); renderBuild(true);
    } else if (t.id === "undoBtn") { b.scoops.pop(); sfx.tap(); renderBuild(); }
    else if (t.id === "resetBtn") { state.build = { cone: null, scoops: [], sauce: null, tops: [] }; sfx.tap(); renderBuild(); }
    else if (t.id === "serveBtn") serve();
  });

  $("#muteBtn").addEventListener("click", (e) => {
    muted = !muted;
    e.currentTarget.classList.toggle("off", muted);
    e.currentTarget.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  });

  function renderPicker() {
    $("#picker").innerHTML = Object.entries(SCOOPERS).map(([k, c]) =>
      `<button class="pick" data-scooper="${k}" aria-pressed="${state.scooper === k}">${customerSVG(c, state.scooper === k ? "happy" : "wait")}<b>${c.name}</b></button>`).join("");
    $("#startBtn").disabled = !state.scooper;
    $("#startBtn").textContent = state.scooper ? `Open the stand as ${me().first}` : "Pick your scooper";
  }
  $("#picker").addEventListener("click", (e) => {
    const t = e.target.closest("[data-scooper]");
    if (!t) return;
    state.scooper = t.dataset.scooper;
    try { localStorage.setItem("frozenbergs.scooper", state.scooper); } catch { /* ignore */ }
    sfx.tap(); renderPicker();
  });

  function showScooper(mood = "wait") {
    $("#scooper").innerHTML = customerSVG(me(), mood);
    $("#scooperName").textContent = me().name;
  }

  $("#startBtn").addEventListener("click", () => {
    if (!state.scooper) return;
    $("#startOverlay").hidden = true;
    showScooper();
    sfx.ding();
    nextCustomer();
  });

  $("#nextDayBtn").addEventListener("click", () => {
    $("#dayOverlay").hidden = true;
    Object.assign(state, { day: state.day + 1, served: 0, dayTips: 0, dayStars: 0, gallery: [] });
    nextCustomer();
  });

  // ---------- patience ----------
  let slowSaid = false;
  setInterval(() => {
    if (state.busy || !state.customer) return;
    const drain = (100 / 50) * (1 + (state.day - 1) * 0.12) / 5 / SPEED;   // ~50s on day 1
    state.patience = Math.max(0, state.patience - drain);
    el.patience.style.width = state.patience + "%";
    el.patience.className = state.patience < 20 ? "low" : state.patience < 50 ? "mid" : "";
    if (state.patience === 0 && !slowSaid) {
      slowSaid = true;
      el.customer.innerHTML = customerSVG(state.customer, "meh");
      toast(`${state.customer.name}: “${pick(LINES.slow)}”`);
    }
    if (state.patience > 0) slowSaid = false;
  }, 200);

  // ---------- boot ----------
  $("#heroCone").innerHTML = coneSVG({ cone: "waffle", scoops: ["straw", "mint", "choc"], sauce: "fudge", tops: ["sprinkles", "whip", "cherry"] });
  renderPicker(); renderBuild(); renderStats();
})();
