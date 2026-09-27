// Witch Mountain: the game. Walk up the switchbacks; every landing has a witch who shows a picture.
// Spell it right and she flies off in a huff. Spell it wrong and she rolls you down to the landing below.

(() => {
  "use strict";
  const A = window.RW.art, WM = window.WM;
  const $ = (s) => document.querySelector(s);
  const cv = $("#stage"), c = cv.getContext("2d");
  const KIDS = ["reuben", "jonah", "ellie", "max"];
  const KS = 1.25; // kid scale in the world
  const WALK = 175, STOP = 74;

  // ---------- saved stuff ----------
  const SAVE = "witchmtn.v1";
  let rec = { player: "reuben", muted: false, best: {} };
  try { rec = Object.assign(rec, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch {}
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(rec)); } catch {} };
  if (window.RosenbergBridge && RosenbergBridge.player && KIDS.includes(RosenbergBridge.player)) rec.player = RosenbergBridge.player;

  // ---------- sound (all synthesized) ----------
  let ac = null;
  const audio = () => {
    if (rec.muted) return null;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch { ac = null; }
    return ac;
  };
  function tone(f, dur, type = "sine", vol = 0.2, at = 0, slide = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol = 0.2, at = 0, freq = 1200, q = 0.8, sweep = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + at, n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t0 + dur);
    g.gain.value = vol; s.connect(f).connect(g).connect(a.destination); s.start(t0);
  }
  const SFX = {
    key: () => tone(900 + Math.random() * 200, 0.05, "triangle", 0.06),
    back: () => tone(420, 0.06, "triangle", 0.06),
    step: () => noise(0.05, 0.05, 0, 700, 1.2),
    right: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.16, i * 0.08)),
    wrong: () => { tone(220, 0.18, "square", 0.08); tone(185, 0.3, "square", 0.08, 0.16); },
    cackle: () => { for (let i = 0; i < 6; i++) { tone(980 - i * 40, 0.1, "sawtooth", 0.06, i * 0.13, -260); tone(1470 - i * 60, 0.08, "square", 0.025, i * 0.13, -300); } },
    zap: () => { tone(1500, 0.35, "sawtooth", 0.09, 0, -1300); noise(0.4, 0.12, 0, 2400, 0.6, -2000); },
    thud: () => { tone(120, 0.12, "sine", 0.25, 0, -60); noise(0.1, 0.1, 0, 300, 1); },
    whoosh: () => noise(0.7, 0.14, 0, 400, 0.7, 2200),
    huff: () => { tone(330, 0.12, "square", 0.05); tone(247, 0.2, "square", 0.05, 0.1); },
    meet: () => { tone(392, 0.15, "triangle", 0.1); tone(311, 0.25, "triangle", 0.1, 0.12); },
    fanfare: () => [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42], [784, 0.62], [1047, 0.76]].forEach(([f, at]) => { tone(f, 0.3, "triangle", 0.16, at); tone(f / 2, 0.3, "sine", 0.1, at); }),
  };
  function say(word) {
    try {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word); u.rate = 0.8; u.pitch = 1.05;
      speechSynthesis.speak(u);
    } catch {}
  }

  // ---------- state ----------
  const G = {
    mode: "title", t: 0, player: rec.player,
    kid: { s: 0, x: 0, a: 0, dir: 1, walk: false, pose: null, pt: 0, spin: 0, hop: 0, target: 0 },
    ci: 0, // the next witch (index into WM.stations)
    witches: [], word: null, typed: "", asked: 0, right: 0, falls: 0, missed: [], retry: [], used: new Set(),
    startedAt: 0, endedAt: 0, bubbles: [], zap: null, shake: 0, planted: false, timers: [],
  };
  const cam = { x: 0, a: 900, k: 1, fx: 0, fy: 0 };
  const after = (sec, fn) => G.timers.push({ at: G.t + sec, fn });

  function resetClimb() {
    G.timers = []; G.bubbles = []; G.zap = null; G.planted = false;
    G.ci = 0; G.typed = ""; G.word = null; G.asked = 0; G.right = 0; G.falls = 0; G.missed = []; G.retry = []; G.used = new Set();
    G.witches = WM.stations.map((st, i) => ({ W: WM.WITCHES[i % WM.WITCHES.length], x: st.x + st.side * 34, a: st.a + 2, dir: -st.side, pose: "idle", gone: false, fly: null, t0: Math.random() * 5 }));
    Object.assign(G.kid, { s: 0, dir: 1, walk: false, pose: null, spin: 0, hop: 0 });
    placeKid();
  }
  function placeKid() { const p = WM.at(G.kid.s); G.kid.x = p.x; G.kid.a = p.a; }

  // ---------- word picking ----------
  function pickWord() {
    const due = G.retry.findIndex((r) => r.due <= G.asked);
    if (due >= 0) return G.retry.splice(due, 1)[0].word;
    const tier = G.ci < 3 ? 1 : G.ci < 6 ? 2 : 3;
    // Jonah (6) gets kindergarten and 1st-grade words; everyone else the 3rd-grade list
    const list = G.player === "jonah" && WM.EASY_WORDS ? WM.EASY_WORDS : WM.WORDS;
    let pool = list.filter((w) => w.tier === tier && !G.used.has(w.w));
    if (!pool.length) pool = list.filter((w) => !G.used.has(w.w));
    if (!pool.length) { G.used.clear(); pool = list.slice(); }
    const w = pool[Math.floor(Math.random() * pool.length)];
    G.used.add(w.w);
    return w;
  }

  // ---------- flow ----------
  function walkTo(s) { G.kid.target = s; G.kid.walk = true; G.kid.pose = null; G.mode = "walk"; }
  function nextLeg() {
    if (G.ci >= WM.stations.length) { walkTo(WM.summitS); G.mode = "summitWalk"; return; }
    walkTo(WM.stations[G.ci].s - STOP);
  }
  function arrive() {
    G.kid.walk = false;
    if (G.mode === "summitWalk") return reachSummit();
    const w = G.witches[G.ci];
    G.mode = "meet"; w.pose = "ask"; SFX.meet();
    G.kid.dir = Math.sign(w.x - G.kid.x) || 1;
    bubble("witch", pickLine(G.asked === 0 ? ["Halt, little hiker!", "Nobody passes Witch Hazel!"] : ASK));
    after(0.9, ask);
  }
  const ASK = ["Spell THIS, dearie!", "Heh heh… spell it!", "No spelling, no passing!", "Spell it or roll!", "Try THIS one!", "What's in my crystal ball?"];
  const PASS = ["Hmph! Fine.", "Curses! Correct!", "Bah! Go on then.", "Lucky guess…", "NOOO! Right again!", "Rats and bats!"];
  const WRONG = ["HEE HEE HEE!", "Down you go!", "Wrong! Wheee!", "Ha! Roll, roll, roll!"];
  const OW = ["Whoa…", "Dizzy!", "Ow! Again!", "I got this!"];
  const YAY = ["Yes!", "Easy!", "Bye, witch!", "Nailed it!"];
  const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function ask() {
    G.word = pickWord(); G.asked++; G.typed = ""; G.mode = "ask";
    const w = G.witches[G.ci];
    $("#qPic").textContent = G.word.e; $("#qPic").setAttribute("aria-label", "picture");
    $("#qWitch").textContent = w.W.name;
    $("#qCount").textContent = `Witch ${G.ci + 1} of ${WM.stations.length}`;
    $("#qMsg").textContent = `${G.word.w.length} letters`; $("#qMsg").className = "qmsg";
    const q = $("#quiz"); q.classList.remove("away"); q.hidden = false;
    $("#kb").hidden = false;
    renderTiles();
    WM.puff(w.x + w.dir * 30, w.a + 60, 14, "rgba(180,140,255,.6)", 60, 0.9, 10, 20);
  }
  function renderTiles(state) {
    const box = $("#tiles"), n = G.word.w.length;
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      d.className = "tile";
      const ch = G.typed[i] || "";
      d.textContent = ch;
      if (ch) d.classList.add("full");
      if (!state && i === G.typed.length) d.classList.add("cur");
      if (state === "good") { d.classList.add("good"); d.style.animationDelay = i * 0.05 + "s"; }
      if (state === "bad") d.classList.add(ch === G.word.w[i] ? "good" : "bad");
      if (state === "fix") { d.textContent = G.word.w[i]; d.classList.add(G.typed[i] === G.word.w[i] ? "good" : "fix"); d.style.animationDelay = i * 0.07 + "s"; }
      box.appendChild(d);
    }
    const go = $("#kb .go"); if (go) go.disabled = G.typed.length < n;
  }
  function type(ch) {
    if (G.mode !== "ask") return;
    if (ch === "back") { if (G.typed) { G.typed = G.typed.slice(0, -1); SFX.back(); renderTiles(); } return; }
    if (ch === "go") return check();
    if (G.typed.length >= G.word.w.length) return;
    G.typed += ch; SFX.key(); renderTiles();
  }
  function check() {
    if (G.mode !== "ask" || G.typed.length < G.word.w.length) return;
    G.mode = "judge"; $("#kb").hidden = true;
    const w = G.witches[G.ci];
    if (G.typed === G.word.w) {
      G.right++; SFX.right(); renderTiles("good");
      $("#qMsg").textContent = "Correct!"; $("#qMsg").className = "qmsg good";
      WM.sparkle(G.kid.x, G.kid.a + 70, 22, ["#FFD23F", "#FFFFFF", "#7CF3A0"]);
      G.kid.pose = "celebrate"; G.kid.pt = 0;
      bubble("kid", pickLine(YAY));
      after(0.5, () => { w.pose = "huff"; SFX.huff(); bubble("witch", pickLine(PASS)); });
      after(1.3, hideQuiz);
      after(1.6, () => { w.pose = "fly"; w.dir = -w.dir; w.fly = { t: 0 }; SFX.whoosh(); WM.puff(w.x, w.a + 20, 18, "rgba(200,180,255,.7)", 90, 0.9, 12, 30); });
      after(2.1, () => { G.kid.pose = null; G.ci++; nextLeg(); });
    } else {
      SFX.wrong(); renderTiles("bad"); $("#tiles").classList.add("shake");
      $("#qMsg").textContent = "Not quite…"; $("#qMsg").className = "qmsg bad";
      if (!G.missed.some((m) => m.w === G.word.w)) G.missed.push(G.word);
      G.retry.push({ word: G.word, due: G.asked + 2 });
      after(0.6, () => {
        $("#tiles").classList.remove("shake"); renderTiles("fix");
        $("#qMsg").textContent = `It's spelled ${G.word.w.toUpperCase()}`; $("#qMsg").className = "qmsg";
        say(G.word.w);
      });
      after(1.9, () => { w.pose = "cackle"; SFX.cackle(); bubble("witch", pickLine(WRONG)); });
      after(2.6, () => { w.pose = "zap"; SFX.zap(); G.zap = { t: 0 }; G.shake = 0.4; G.kid.pose = "fall"; });
      after(3.0, () => { G.zap = null; rollDown(); });
      after(4.6, hideQuiz);
    }
  }
  function hideQuiz() {
    const q = $("#quiz"); if (q.hidden) return;
    q.classList.add("away");
    setTimeout(() => { q.hidden = true; q.classList.remove("away"); }, 340);
  }
  function rollDown() {
    const w = G.witches[G.ci];
    w.pose = "cackle";
    after(1.2, () => { if (!w.gone) w.pose = "idle"; });
    G.falls++;
    const to = G.ci > 0 ? WM.stations[G.ci - 1].s + 10 : 0;
    G.mode = "roll";
    G.roll = { from: G.kid.s, to, t: 0, dur: Math.min(3, 1.1 + (G.kid.s - to) / 520), lastThud: 0 };
    G.kid.pose = "fall";
  }
  function landed() {
    G.mode = "dizzy"; G.kid.spin = 0; G.kid.pose = "shrug"; G.shake = 0.25; SFX.thud();
    WM.puff(G.kid.x, G.kid.a + 6, 16, "rgba(200,170,120,.8)", 90, 0.8, 10, 10);
    bubble("kid", pickLine(OW));
    after(1.3, () => { G.kid.pose = null; nextLeg(); });
  }
  function reachSummit() {
    G.mode = "summit"; G.endedAt = G.t; G.planted = true;
    G.kid.pose = "celebrate"; G.kid.dir = 1;
    SFX.fanfare();
    WM.confetti(0, WM.SUMMIT + 60, 120);
    WM.sparkle(0, WM.SUMMIT + 60, 30, ["#FFD23F", "#FFFFFF"]);
    bubble("kid", "I made it to the top!");
    after(1.2, () => WM.confetti(-80, WM.SUMMIT + 80, 60));
    after(2.0, () => WM.confetti(80, WM.SUMMIT + 80, 60));
    after(3.0, showEnd);
  }

  // ---------- speech bubbles ----------
  function bubble(who, text) {
    G.bubbles = G.bubbles.filter((b) => b.who !== who);
    G.bubbles.push({ who, text, t: 0, life: 2.4, wi: G.ci });
  }

  // ---------- end screen ----------
  function starsFor() { return Math.max(1, 5 - G.falls); }
  function showEnd() {
    G.mode = "end";
    const secs = Math.round(G.endedAt - G.startedAt), stars = starsFor();
    const name = A.CHARS[G.player].name;
    $("#endTitle").textContent = G.falls === 0 ? "Perfect climb!" : "You made it!";
    $("#endLead").textContent = G.falls === 0
      ? `${name} spelled every word and not one witch rolled ${name === "Ellie" ? "her" : "him"} down.`
      : `${name} reached the top of Witch Mountain. The witches are furious.`;
    $("#endStars").textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
    $("#endStars").setAttribute("aria-label", `${stars} of 5 stars`);
    $("#endTime").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    $("#endRight").textContent = G.right;
    $("#endFalls").textContent = G.falls;
    const pr = $("#practice"); pr.innerHTML = "";
    G.missed.forEach((m) => { const s = document.createElement("span"); s.innerHTML = `<span class="e">${m.e}</span>${m.w}`; pr.appendChild(s); });
    $("#practiceBox").hidden = !G.missed.length;
    const b = rec.best[G.player] || {};
    if (b.falls == null || G.falls < b.falls || (G.falls === b.falls && secs < b.secs)) rec.best[G.player] = { falls: G.falls, secs };
    rec.player = G.player; save();
    $("#endScreen").hidden = false;
    if (window.RosenbergBridge) RosenbergBridge.report({ score: G.right * 100 - G.falls * 25, stars });
  }

  // ---------- title ----------
  function buildKids() {
    const box = $("#kids"); box.innerHTML = "";
    KIDS.forEach((id) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "kid"; b.dataset.id = id;
      b.setAttribute("aria-pressed", String(id === G.player));
      const cvs = document.createElement("canvas"); cvs.width = cvs.height = 180;
      const best = rec.best[id];
      b.append(cvs);
      const nm = document.createElement("b"); nm.textContent = A.CHARS[id].name; b.append(nm);
      const sm = document.createElement("small"); sm.textContent = best ? (best.falls === 0 ? "★ perfect climb" : `best: ${best.falls} roll-down${best.falls === 1 ? "" : "s"}`) : ""; b.append(sm);
      A.portrait(cvs, id, { t: 0.4 });
      b.onclick = () => { G.player = id; box.querySelectorAll(".kid").forEach((k) => k.setAttribute("aria-pressed", String(k.dataset.id === id))); SFX.key(); };
      box.append(b);
    });
  }
  function start() {
    audio();
    rec.player = G.player; save();
    $("#titleScreen").hidden = true; $("#endScreen").hidden = true; $("#hud").hidden = false;
    A.portrait($("#hudFace"), G.player, { t: 0.4 });
    resetClimb();
    G.startedAt = G.t;
    cam.x = 0; cam.a = 160;
    G.mode = "walk";
    after(0.4, () => bubble("kid", "Here I go!"));
    nextLeg();
  }
  $("#startBtn").onclick = start;
  $("#againBtn").onclick = start;
  $("#swapBtn").onclick = () => { $("#endScreen").hidden = true; $("#hud").hidden = true; G.mode = "title"; buildKids(); $("#titleScreen").hidden = false; };
  $("#hearBtn").onclick = () => { if (G.word) say(G.word.w); };

  // ---------- keyboard ----------
  function buildKb() {
    const kb = $("#kb"); kb.innerHTML = "";
    const rows = ["qwertyuiop", "asdfghjkl", "<zxcvbnm>"];
    rows.forEach((r) => {
      const row = document.createElement("div"); row.className = "r";
      for (const ch of r) {
        const k = document.createElement("button"); k.type = "button"; k.className = "key";
        if (ch === "<") { k.classList.add("wide"); k.textContent = "⌫"; k.setAttribute("aria-label", "Delete"); k.dataset.k = "back"; }
        else if (ch === ">") { k.classList.add("wide", "go"); k.textContent = "CHECK"; k.dataset.k = "go"; }
        else { k.textContent = ch; k.dataset.k = ch; }
        row.append(k);
      }
      kb.append(row);
    });
    kb.addEventListener("pointerdown", (e) => {
      const k = e.target.closest(".key"); if (!k || k.disabled) return;
      e.preventDefault(); type(k.dataset.k);
    });
  }
  window.addEventListener("keydown", (e) => {
    if (G.mode !== "ask" || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    let k = null;
    if (/^[a-z]$/.test(key)) k = key; else if (key === "backspace") k = "back"; else if (key === "enter") k = "go";
    if (!k) return;
    e.preventDefault(); type(k);
    const btn = $(`#kb [data-k="${k}"]`); if (btn) { btn.classList.add("hit"); setTimeout(() => btn.classList.remove("hit"), 110); }
  });

  // ---------- mute ----------
  const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="#2B2340" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="#2B2340" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  function paintMute() { const b = $("#muteBtn"); b.innerHTML = rec.muted ? ICON_OFF : ICON_ON; b.setAttribute("aria-label", rec.muted ? "Sound on" : "Sound off"); }
  $("#muteBtn").onclick = () => { rec.muted = !rec.muted; save(); paintMute(); };

  // ---------- sizing ----------
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  window.addEventListener("resize", resize);

  // where on screen is free while the spelling card and keyboard are up
  function freeRect() {
    const q = $("#quiz"), kb = $("#kb");
    let x0 = 0, x1 = W, y0 = 60, y1 = H;
    if (!q.hidden) {
      const r = q.getBoundingClientRect();
      if (r.left > W * 0.4) x1 = r.left - 8; else y0 = Math.max(y0, r.bottom + 8);
    }
    if (!kb.hidden) y1 = kb.getBoundingClientRect().top;
    else if (!q.hidden && x1 < W) y1 = H;
    return { x0, x1, y0, y1 };
  }

  // ---------- update ----------
  function update(dt) {
    G.t += dt;
    for (let i = 0; i < G.timers.length; i++) { const tm = G.timers[i]; if (G.t >= tm.at) { G.timers.splice(i--, 1); tm.fn(); } }
    const k = G.kid;
    if (k.walk) {
      const d = k.target - k.s, v = WALK * dt;
      if (Math.abs(d) <= v) { k.s = k.target; placeKid(); arrive(); }
      else {
        const before = Math.floor(k.s / 36);
        k.s += Math.sign(d) * v; placeKid();
        if (Math.floor(k.s / 36) !== before) SFX.step();
        const ahead = WM.at(k.s + 6 * Math.sign(d));
        if (Math.abs(ahead.x - k.x) > 0.4) k.dir = Math.sign(ahead.x - k.x);
      }
    }
    if (G.mode === "roll") {
      const r = G.roll; r.t += dt;
      const f = Math.min(1, r.t / r.dur), e = f * f * (3 - 2 * f);
      const px = k.x;
      k.s = r.from + (r.to - r.from) * e; placeKid();
      k.spin += (k.x - px) / 30;
      k.hop = Math.abs(Math.sin(r.t * 9)) * 16 * (1 - f);
      if (r.t - r.lastThud > 0.28 && f < 0.95) { r.lastThud = r.t; SFX.thud(); WM.puff(k.x, k.a + 4, 5, "rgba(200,170,120,.7)", 50, 0.6, 8, 10); }
      if (f >= 1) { k.hop = 0; landed(); }
    }
    // witches
    for (const w of G.witches) if (w.fly) {
      w.fly.t += dt;
      w.x += w.dir * (70 + w.fly.t * 90) * dt; w.a += (110 + w.fly.t * 160) * dt;
      if (Math.random() < 0.5) WM.sparkle(w.x - w.dir * 40, w.a + 16, 1, [w.W.eye, "#FFFFFF"], 30);
      if (w.fly.t > 3) { w.fly = null; w.gone = true; }
    }
    G.bubbles.forEach((b) => (b.t += dt));
    G.bubbles = G.bubbles.filter((b) => b.t < b.life);
    if (G.zap) G.zap.t += dt;
    G.shake = Math.max(0, G.shake - dt);
    WM.stepParts(dt);
    updateCam(dt);
    // HUD
    const ft = G.mode === "summit" || G.mode === "end" ? 1000 : WM.FT(k.a);
    const hf = $("#hudFt"), txt = `${ft.toLocaleString()} FT`;
    if (hf.textContent !== txt) hf.textContent = txt;
    const fl = $("#hudFalls"); if (fl.textContent !== String(G.falls)) fl.textContent = G.falls;
  }

  function updateCam(dt) {
    const base = Math.max(0.5, Math.min(1.5, Math.min(W / 760, H / 620)));
    let tx, ta, tk, fx = W / 2, fy = H * 0.58;
    const k = G.kid;
    if (G.mode === "title") {
      const p = (Math.sin(G.t * 0.12 - 1.2) + 1) / 2;
      tx = 0; ta = 300 + p * (WM.SUMMIT - 300); tk = base * 0.72; fy = H * 0.5;
    } else if (G.mode === "summit" || G.mode === "end") {
      tx = 0; ta = WM.SUMMIT + 40; tk = base * 1.25; fy = G.mode === "end" ? H * 0.3 : H * 0.62;
    } else if (G.mode === "ask" || G.mode === "judge" || G.mode === "meet") {
      const w = G.witches[G.ci], r = freeRect();
      tx = (k.x + w.x) / 2; ta = k.a + 70;
      tk = Math.max(0.45, Math.min(base * 1.9, (r.x1 - r.x0) / 360, (r.y1 - r.y0) / 230));
      fx = (r.x0 + r.x1) / 2; fy = (r.y0 + r.y1) / 2 + 20;
    } else {
      tx = k.x * 0.7; ta = k.a + 90; tk = W > 700 ? base * 0.8 : Math.max(base, W / 540);
    }
    const e = 1 - Math.exp(-dt * (G.mode === "roll" ? 6 : 3.2));
    cam.x += (tx - cam.x) * e; cam.a += (ta - cam.a) * e; cam.k += (tk - cam.k) * e;
    cam.fx = cam.fx ? cam.fx + (fx - cam.fx) * e : fx; cam.fy = cam.fy ? cam.fy + (fy - cam.fy) * e : fy;
  }

  // ---------- render ----------
  const toScreen = (x, a) => [cam.fx + (x - cam.x) * cam.k, cam.fy - (a - cam.a) * cam.k];
  function render() {
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    WM.drawBackdrop(c, W, H, cam, G.t);
    const sh = G.shake > 0 ? G.shake * 22 : 0;
    const ox = sh ? (Math.random() - 0.5) * sh : 0, oy = sh ? (Math.random() - 0.5) * sh : 0;
    c.setTransform(DPR * cam.k, 0, 0, DPR * cam.k, DPR * (cam.fx - cam.x * cam.k + ox), DPR * (cam.fy + cam.a * cam.k + oy));
    const view = { up: (cam.fy / cam.k) + 200, down: ((H - cam.fy) / cam.k) + 200 };
    WM.drawWorld(c, cam, G.t, view);
    WM.drawSummit(c, G.t, G.planted, A.CHARS[G.player].color);
    // witches (cauldrons first)
    G.witches.forEach((w, i) => {
      const st = WM.stations[i];
      if (Math.abs(st.a - cam.a) > view.up + 200) return;
      WM.cauldron(c, st.x + st.side * 78, st.a + 12, G.t + i, w.W.eye);
    });
    const drawKid = () => {
      if (G.mode === "title") return;
      const k = G.kid;
      c.save();
      c.translate(k.x, -k.a);
      c.scale(KS, KS);
      if (G.mode === "roll") {
        A.shadow(c, 0, 1, 22, 6, 0.3);
        c.translate(0, -26 - k.hop / KS);
        c.rotate(k.spin);
        c.translate(0, 26);
      }
      const moving = k.walk ? 1 : 0;
      A.drawChar(c, A.CHARS[G.player], { t: G.t, move: moving, side: moving ? 1 : 0.45, dir: k.dir, pose: k.pose, pt: G.t, blink: (G.t % 3.6) < 0.12 });
      if (G.mode === "dizzy") {
        for (let j = 0; j < 3; j++) {
          const an = G.t * 6 + (j * Math.PI * 2) / 3;
          c.fillStyle = "#FFD23F"; A.starPath(c, Math.cos(an) * 20, -96 + Math.sin(an) * 5, 5, 5, 0.45); c.fill();
        }
      }
      c.restore();
    };
    // draw higher things first so nearer (lower) things overlap them
    const items = G.witches.filter((w) => !w.gone).map((w) => ({ a: w.a, draw: () => {
      c.save(); c.translate(w.x, -w.a); c.scale(1.15, 1.15);
      const tip = WM.drawWitch(c, w.W, { t: G.t + w.t0, dir: w.dir, pose: w.pose });
      w.tip = { x: w.x + tip.x * 1.15, a: w.a - tip.y * 1.15 };
      c.restore();
    } }));
    items.push({ a: G.kid.a - 1, draw: drawKid });
    items.sort((p, q) => q.a - p.a).forEach((it) => it.draw());
    if (G.zap) {
      const w = G.witches[G.ci];
      if (w && w.tip) WM.bolt(c, w.tip.x, w.tip.a, G.kid.x, G.kid.a + 50, G.t, "#B98CFF");
    }
    WM.drawParts(c);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    WM.frontClouds(c, W, H, cam, G.t);
    WM.snow(c, W, H, G.t, Math.min(1, Math.max(0, (cam.a - WM.SUMMIT * 0.62) / (WM.SUMMIT * 0.25))));
    drawBubbles();
    if (G.mode !== "title") drawMeter();
  }

  function drawBubbles() {
    for (const b of G.bubbles) {
      let x, a;
      if (b.who === "kid") { x = G.kid.x; a = G.kid.a + 138; }
      else { const w = G.witches[b.wi]; if (!w || w.gone) continue; x = w.x; a = w.a + 190; }
      let [sx, sy] = toScreen(x, a);
      const f = Math.min(1, b.t / 0.15), out = Math.max(0, (b.t - (b.life - 0.25)) / 0.25);
      c.save();
      c.globalAlpha = 1 - out;
      c.font = `700 ${Math.round(Math.max(15, Math.min(22, cam.k * 16)))}px ${A.FONT}`;
      const tw = c.measureText(b.text).width, bw = tw + 26, bh = Math.max(34, cam.k * 30);
      const fr = freeRect();
      sx = Math.max(fr.x0 + bw / 2 + 8, Math.min(fr.x1 - bw / 2 - 8, sx));
      sy = Math.max(bh + fr.y0 + 4, sy);
      c.translate(sx, sy); c.scale(0.7 + 0.3 * f, 0.7 + 0.3 * f);
      const witch = b.who === "witch";
      c.fillStyle = witch ? "#2E1F4F" : "#FFFFFF";
      A.rr(c, -bw / 2, -bh, bw, bh, bh / 2); c.fill();
      c.beginPath(); c.moveTo(-8, -2); c.lineTo(0, 12); c.lineTo(8, -2); c.fill();
      c.strokeStyle = witch ? "#B98CFF" : "rgba(43,35,64,.2)"; c.lineWidth = 2.5;
      A.rr(c, -bw / 2, -bh, bw, bh, bh / 2); c.stroke();
      c.fillStyle = witch ? "#E9DBFF" : "#2B2340"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(b.text, 0, -bh / 2 + 1);
      c.restore();
    }
  }

  // progress: a rope with a hat for each witch, on the right edge
  function drawMeter() {
    const x = W - 26, y0 = H * 0.78, y1 = Math.max(110, H * 0.2);
    if (!$("#kb").hidden && W < 700) return;
    c.save();
    c.lineCap = "round";
    c.strokeStyle = "rgba(43,35,64,.3)"; c.lineWidth = 10; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke();
    c.strokeStyle = "#FFFDF6"; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke();
    const n = WM.stations.length;
    const yAt = (a) => y0 + (y1 - y0) * Math.max(0, Math.min(1, a / WM.SUMMIT));
    WM.stations.forEach((st, i) => {
      const y = yAt(st.a), passed = i < G.ci;
      c.fillStyle = passed ? "#4CC06A" : "#45237F";
      c.beginPath(); c.moveTo(x - 9, y + 3); c.lineTo(x + 9, y + 3); c.lineTo(x + 1, y - 13); c.closePath(); c.fill();
      c.fillRect(x - 11, y + 2, 22, 3);
      if (passed) { c.fillStyle = "#fff"; c.font = `700 9px ${A.FONT}`; c.textAlign = "center"; c.fillText("✓", x + 1, y - 2); }
    });
    void n;
    A.goldStar(c, x, y1 - 12, 9, G.t);
    const ky = yAt(G.kid.a);
    c.beginPath(); c.arc(x, ky, 13, 0, Math.PI * 2); c.fillStyle = A.CHARS[G.player].color; c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke();
    c.drawImage($("#hudFace"), x - 11, ky - 11, 22, 22);
    c.restore();
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    try { update(dt); render(); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }
  resize(); buildKb(); buildKids(); paintMute(); resetClimb();
  requestAnimationFrame(frame);
  window.__WM = G; // for testing
})();
