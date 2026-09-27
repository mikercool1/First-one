"use strict";
// Ariel Passover Cookout: a memory game. Each person asks for two dishes; you see them for
// three seconds, then they hide and you tap the two you remember. Max is always running around,
// photobombing the order and leaping at Ariel to steal food. Serve 10 before you lose all 3 hearts.

(() => {
  const $ = s => document.querySelector(s);
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const LW = 720, GOAL = 10, HEARTS = 3, SHOW = 3;
  let LH = 900, DY = 0; // the room grows taller on tall phones; DY pushes the scene down
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  const FOOD = { soup: "Soup", frittata: "Frittata", kugel: "Kugel", cutlets: "Cutlets", cake: "Apple Cake" };
  const SHORT = { soup: "Soup", frittata: "Frittata", kugel: "Kugel", cutlets: "Cutlets", cake: "Cake" };
  const DISHES = Object.keys(FOOD);
  const KID = 2.5; // Backyard Baseball kids are drawn small; scale them up to stand with the grown-ups
  const WHO = {
    ikey: { name: "Ikey", fav: "soup", draw: ART.ikey, top: 215 * 1.9, couch: true, thanks: "Touchdown!" },
    simon: { name: "Grandpa", fav: "soup", draw: ART.simon, top: 215 * 1.9, thanks: "10-4, yummy!" },
    cari: { name: "Grandma", fav: "cutlets", draw: ART.cari, top: 215 * 1.9, thanks: "Delicious!" },
    nana: { name: "Nana", fav: "kugel", draw: ART.nana, top: 262 * 1.9, thanks: "Perfect, sweetheart!" },
    michael: { name: "Michael", fav: "frittata", draw: ART.michael, top: 215 * 1.9, couch: true, thanks: "Thanks, Ariel!" },
    sarah: { name: "Sarah", fav: "cake", draw: ART.sarah, top: 250 * 1.9, thanks: "So good!" },
    molly: { name: "Molly", fav: "kugel", draw: ART.molly, top: 245 * 1.9, thanks: "Yum, thank you!" },
    reuben: { name: "Reuben", fav: "cutlets", kid: true, top: 136 * KID, thanks: "Home run!" },
    jonah: { name: "Jonah", fav: "frittata", kid: true, top: 118 * KID, thanks: "Yum yum!" },
    ellie: { name: "Ellie", fav: "cake", kid: true, top: 98 * KID, thanks: "Yummy!" },
  };
  const NOPE = ["Not that one!", "Hmm, no!", "That's not it!"];
  const MAX_SAYS = ["Wheee!", "Mine!", "Hee hee!", "Yummy!", "Catch me!"];
  const CX = 480, CY = 800, SCALE = 1.9;   // where the eater sits
  const AX = 150, AY = 820;                 // where Ariel waits
  const MY = 885;                           // Max runs along the front of the room

  // ---------- sound ----------
  let muted = false; try { muted = localStorage.getItem("arielCookout.muted") === "1"; } catch {}
  let actx = null;
  function tone(f, d, type = "triangle", v = .1, delay = 0) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume();
      const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + d + .05);
    } catch {}
  }
  const sfx = {
    yes: () => [523, 659, 784].forEach((f, i) => tone(f, .25, "triangle", .1, i * .07)),
    one: () => tone(784, .15, "triangle", .09),
    no: () => { tone(330, .15, "sine", .08); tone(262, .2, "sine", .08, .12); },
    hi: () => tone(880, .12, "sine", .06),
    hide: () => { tone(700, .08, "sine", .05); tone(520, .12, "sine", .05, .08); },
    tick: () => tone(1200, .05, "sine", .04),
    ouch: () => { tone(300, .2, "sawtooth", .05); tone(200, .35, "sawtooth", .05, .15); },
    shoo: () => [900, 1150, 980, 1250].forEach((f, i) => tone(f, .09, "sine", .07, i * .08)),
    dash: () => { tone(200, .08, "square", .03); tone(260, .08, "square", .03, .1); tone(320, .08, "square", .03, .2); },
    boing: () => { tone(300, .25, "sine", .07); tone(600, .2, "sine", .04, .05); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .35, "triangle", .1, i * .1)),
    lose: () => [392, 349, 311, 262].forEach((f, i) => tone(f, .35, "triangle", .08, i * .16)),
  };

  // ---------- icons for the buttons ----------
  const icons = {};
  function icon(id) {
    if (icons[id]) return icons[id];
    const c = document.createElement("canvas"); c.width = c.height = 160;
    ART.food(c.getContext("2d"), id, 80, 88, 130, 0);
    return (icons[id] = c.toDataURL());
  }

  // ---------- game state ----------
  // phases: in → show (3s to memorize) → pick (tap both) → serve → eat → out
  let G = null, T = 0;
  function newGame() {
    G = {
      mode: "play", served: 0, hearts: HEARTS, lastId: null, bag: [],
      cur: null, phase: "in", t: 0, pat: 1, shake: 0, say: null, sayT: 0, sayAt: null, arielX: AX, hearts2: [],
      max: newMax(), firstShow: true,
    };
    buildButtons(); nextEater(); syncTop();
  }
  const patienceSecs = () => Math.max(6, 11 - G.served * .45);

  function nextEater() {
    if (!G.bag.length) G.bag = shuffle(Object.keys(WHO));
    let id = G.bag.pop(); if (id === G.lastId && G.bag.length) { G.bag.unshift(id); id = G.bag.pop(); }
    G.lastId = id;
    const first = Math.random() < .5 ? WHO[id].fav : pick(DISHES);
    const second = pick(DISHES.filter(d => d !== first));
    G.cur = { id, want: [first, second], got: [] };
    G.phase = "in"; G.t = 0; G.pat = 1; G.say = null;
    setButtons(false);
  }

  // all five dishes are always on the buttons, so you have to remember, not just match
  function buildButtons() {
    const box = $("#choices"); box.innerHTML = "";
    for (const d of DISHES) {
      const b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.dataset.d = d;
      b.innerHTML = `<img src="${icon(d)}" alt="">${SHORT[d]}`;
      onTap(b, () => choose(d, b));
      box.appendChild(b);
    }
  }
  function setButtons(on) {
    for (const b of $("#choices").children) { b.disabled = !on; b.classList.remove("got"); }
  }
  function choose(d, btn) {
    if (!G || G.phase !== "pick") return;
    const cur = G.cur;
    if (cur.want.includes(d) && !cur.got.includes(d)) {
      cur.got.push(d); btn.classList.add("got"); sfx.one();
      if (cur.got.length === cur.want.length) { setButtons(false); G.phase = "serve"; G.t = 0; G.say = null; sfx.yes(); }
    } else if (cur.got.includes(d)) {
      btn.classList.add("nope"); setTimeout(() => btn.classList.remove("nope"), 400);
    } else {
      G.pat -= .25; G.shake = .5; G.say = pick(NOPE); G.sayT = 1.2; G.sayAt = "eater";
      btn.classList.remove("nope"); void btn.offsetWidth; btn.classList.add("nope"); sfx.no();
    }
  }
  function loseHeart() {
    G.hearts--; syncTop();
    const el = $("#hearts"); el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit");
  }
  function syncTop() {
    $("#plates").innerHTML = Array.from({ length: GOAL }, (_, i) => `<i class="${i < G.served ? "on" : ""}"></i>`).join("");
    $("#count").textContent = `${G.served} / ${GOAL}`;
    $("#hearts").innerHTML = Array.from({ length: HEARTS }, (_, i) => `<span class="${i < G.hearts ? "" : "gone"}">♥</span>`).join("");
  }

  // ---------- Max: always on screen ----------
  function newMax() { return { state: "wander", x: 600, y: 0, tx: 400, dir: -1, ph: 0, t: 0, re: 1, cd: rand(3, 5), talk: null, talkT: 0, grab: null, spin: 0 }; }
  function maxSay(text, dur = 1.1) { G.max.talk = text; G.max.talkT = dur; }
  function updateMax(dt) {
    const m = G.max;
    m.t += dt; m.talkT -= dt;
    const run = (tx, speed) => {
      const dx = tx - m.x, step = speed * dt;
      if (Math.abs(dx) <= step) { m.x = tx; return true; }
      m.x += Math.sign(dx) * step; m.dir = Math.sign(dx); m.ph += dt * (speed > 200 ? 20 : 14); return false;
    };
    switch (m.state) {
      case "wander": {
        m.y = -Math.abs(Math.sin(m.t * 7)) * 10; // bouncy toddler waddle
        m.re -= dt;
        if (run(m.tx, 150) || m.re <= 0) { m.tx = rand(40, 680); m.re = rand(1, 2.4); if (Math.random() < .3) maxSay(pick(MAX_SAYS)); }
        if (G.phase === "pick") m.cd -= dt;
        if (m.cd <= 0) { m.state = "dash"; m.t = 0; sfx.dash(); maxSay("Mine!", .8); }
        break;
      }
      case "photobomb": {
        // a huge jump right in front of the order bubble while you're trying to remember it
        const k = Math.min(1, m.t / 1.1);
        m.x = m.x0 + (m.x1 - m.x0) * k; m.y = -Math.sin(k * Math.PI) * 500; m.dir = Math.sign(m.x1 - m.x0) || 1;
        if (k >= 1) { m.y = 0; m.state = "wander"; m.t = 0; }
        break;
      }
      case "dash":
        m.y = 0;
        if (run(AX + 110, 230 + G.served * 12)) { m.state = "leap"; m.t = 0; m.x0 = m.x; }
        break;
      case "leap": {
        const k = Math.min(1, m.t / .6);
        m.x = m.x0 + (AX + 20 - m.x0) * k; m.y = -Math.sin(k * Math.PI) * 180; m.dir = -1;
        if (k >= 1) steal();
        break;
      }
      case "tumble": {
        // shooed: he bounces back, spinning, and goes right back to causing trouble
        m.spin += dt * 14; m.x += 380 * dt; m.y = -Math.sin(Math.min(1, m.t / .7) * Math.PI) * 90;
        if (m.t > .7) { m.state = "wander"; m.t = 0; m.spin = 0; m.y = 0; m.cd = Math.max(1.4, rand(2.2, 4.5) - G.served * .12); m.tx = rand(300, 680); }
        break;
      }
      case "flee":
        m.y = -Math.abs(Math.sin(m.t * 12)) * 8;
        if (run(700, 300)) { m.state = "wander"; m.t = 0; m.grab = null; m.cd = Math.max(1.4, rand(2.5, 5) - G.served * .12); m.tx = rand(300, 600); }
        break;
    }
  }
  function steal() {
    const m = G.max, cur = G.cur;
    m.state = "flee"; m.t = 0; m.y = 0;
    if (G.phase === "pick" && cur.got.length) {
      const d = cur.got.pop(); m.grab = d;
      const b = $(`.choice[data-d="${d}"]`); if (b) b.classList.remove("got");
      G.say = `Max took the ${FOOD[d].toLowerCase()}! Tap it again!`;
    } else {
      m.grab = pick(DISHES); G.pat -= .3;
      G.say = "Max snatched a snack!";
    }
    G.sayT = 1.8; G.sayAt = "ariel"; maxSay("Hee hee!"); sfx.ouch();
  }
  function maybePhotobomb() {
    const m = G.max;
    if (m.state !== "wander" || Math.random() > Math.min(.85, .45 + G.served * .05)) return;
    m.state = "photobomb"; m.t = -rand(.3, 1.1); m.x0 = m.x; m.x1 = CX + rand(-60, 60);
    setTimeout(() => G && G.max.state === "photobomb" && (sfx.boing(), maxSay("Look at me!", 1)), 400);
  }
  function tapCanvas(e) {
    if (!G || G.mode !== "play") return;
    const m = G.max;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH - DY;
    if (Math.hypot(x - m.x, y - (MY - 70 + m.y)) > 120) return;
    if (m.state === "dash" || m.state === "leap") { m.state = "tumble"; m.t = 0; G.say = "Shoo, Max!"; G.sayT = 1.1; G.sayAt = "ariel"; sfx.shoo(); maxSay("Whoa!", .8); }
    else if (m.state === "wander") { maxSay("Hee hee!", .8); sfx.boing(); }
  }
  cv.addEventListener("pointerdown", tapCanvas);

  function update(dt) {
    T += dt;
    if (!G || G.mode !== "play") return;
    G.t += dt; G.shake = Math.max(0, G.shake - dt); G.sayT -= dt;
    for (const h of G.hearts2) { h.t += dt; h.y -= 60 * dt; h.x += Math.sin(h.t * 5 + h.k) * 30 * dt; }
    G.hearts2 = G.hearts2.filter(h => h.t < 1.4);
    if (G.phase !== "over") updateMax(dt);
    switch (G.phase) {
      case "in":
        if (G.t > .6) {
          G.phase = "show"; G.t = 0; sfx.hi(); maybePhotobomb();
          if (G.firstShow) { G.say = "Remember both!"; G.sayT = 2; G.sayAt = "ariel"; G.firstShow = false; }
        }
        break;
      case "show": {
        const before = Math.ceil(SHOW - (G.t - dt)), now = Math.ceil(SHOW - G.t);
        if (now < before && now > 0) sfx.tick();
        if (G.t >= SHOW) { G.phase = "pick"; G.t = 0; setButtons(true); sfx.hide(); }
        break;
      }
      case "pick":
        G.pat -= dt / patienceSecs();
        if (G.pat <= 0) {
          G.phase = "grumpy"; G.t = 0; G.say = "Hmph! Too slow!"; G.sayT = 1.4; G.sayAt = "eater";
          setButtons(false); loseHeart(); sfx.ouch();
        }
        break;
      case "grumpy": if (G.t > 1.4) { G.phase = G.hearts <= 0 ? "over" : "out"; G.t = 0; } break;
      case "serve":
        G.arielX = AX + (330 - AX) * ease(G.t / .5);
        if (G.t > .5) {
          G.phase = "eat"; G.t = 0; G.say = WHO[G.cur.id].thanks; G.sayT = 1.4; G.sayAt = "eater";
          for (let i = 0; i < 8; i++) G.hearts2.push({ x: CX + rand(-80, 80), y: CY - 260, t: rand(-.4, 0), k: rand(0, 6) });
        }
        break;
      case "eat":
        G.arielX = 330 + (AX - 330) * ease(G.t / .5);
        if (G.t > 1.3) { G.served++; syncTop(); G.phase = "out"; G.t = 0; }
        break;
      case "out": if (G.t > .45) { if (G.served >= GOAL) win(); else nextEater(); } break;
      case "over": if (G.t > .9) lose(); break;
    }
  }
  function win() {
    G.mode = "win"; setButtons(false);
    [...$("#stars").children].forEach((s, i) => s.classList.toggle("on", i < G.hearts));
    $("#winText").textContent = G.hearts === HEARTS ? "Not a single heart lost. What a memory!" : "You fed the whole family!";
    $("#win").hidden = false; sfx.win();
  }
  function lose() {
    G.mode = "lose"; setButtons(false);
    $("#loseText").textContent = `You served ${G.served} of ${GOAL}. The family's still hungry!`;
    $("#lose").hidden = false; sfx.lose();
  }

  // ---------- drawing ----------
  // wall decor is laid out on the full-height canvas; the floor and everyone on it sit DY lower
  function wall(c) {
    c.fillStyle = ART.lin(c, 0, 0, 0, LH, "#FBF1E8", "#EED9CE"); c.fillRect(0, 0, LW, LH);
    const word = "CHAG SAMEACH", cols = ["#2E4A6E", "#C9A45C", "#9C3D4A", "#7FA88B"];
    c.beginPath(); c.moveTo(20, 40); c.quadraticCurveTo(360, 90, 700, 40); c.strokeStyle = "#C9A45C"; c.lineWidth = 2; c.stroke();
    let k = 0;
    for (let i = 0; i < word.length; i++) {
      if (word[i] === " ") continue;
      const u = (k + .5) / 11, x = 20 + u * 680, y = 40 + Math.sin(u * Math.PI) * 24;
      c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x + 20, y); c.lineTo(x, y + 44); c.closePath(); c.fillStyle = cols[k % 4]; c.fill();
      ART.text(c, word[i], x, y + 14, 18, "#FFFFFF", 700); k++;
    }
    const py = 150 + DY * .45;
    c.beginPath(); c.moveTo(480, 0); c.lineTo(480, py - 40); c.strokeStyle = "#9C7634"; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.moveTo(430, py); c.quadraticCurveTo(432, py - 42, 480, py - 44); c.quadraticCurveTo(528, py - 42, 530, py); c.closePath();
    c.fillStyle = ART.lin(c, 430, 0, 530, 0, "#9C7634", "#F1DA9E", "#C9A45C"); c.fill();
    ART.ell(c, 480, py, 50, 8, "#FFF3D1");
    ART.dot(c, 480, py + 10, 170, ART.rad(c, 480, py + 10, 170, "rgba(255,230,170,.35)", "rgba(255,230,170,0)"));
    const wy = 120 + DY * .8;
    c.save(); ART.rr(c, 50, wy, 170, 230, 85); c.clip();
    c.fillStyle = ART.lin(c, 0, wy, 0, wy + 230, "#28305C", "#7D6696", "#E8A98C"); c.fillRect(50, wy, 170, 230);
    ART.dot(c, 170, wy + 65, 22, "#FFF6DA"); c.restore();
    ART.rr(c, 50, wy, 170, 230, 85); c.strokeStyle = "#FFFFFF"; c.lineWidth = 10; c.stroke();
  }
  function room(c) {
    c.fillStyle = ART.lin(c, 0, 620, 0, 900, "#D9AE80", "#C4935F"); c.fillRect(0, 620, LW, 280);
    for (let y = 654; y < 900; y += 34) { c.fillStyle = "rgba(110,70,40,.15)"; c.fillRect(0, y, LW, 2); }
    c.fillStyle = "#FFF8F2"; c.fillRect(0, 606, LW, 16);
    c.save(); c.translate(CX - 40, 850); c.scale(1, .2); ART.dot(c, 0, 0, 330, "#2E4A6E"); ART.dot(c, 0, 0, 312, "#F4EBDD"); c.restore();
  }
  function couch(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    ART.box(c, -112, -150, 224, 110, 32, ART.lin(c, 0, -150, 0, -40, "#4B8E7F", "#2E6255"));
    ART.box(c, -116, -68, 232, 46, 16, "#3F7D6F");
    for (const sd of [-1, 1]) ART.box(c, sd * 112 - 20, -112, 40, 106, 18, "#356E62");
    c.restore();
  }
  function drawEater(c) {
    const cur = G.cur, w = WHO[cur.id];
    let x = CX;
    if (G.phase === "in") x = LW + 260 - (LW + 260 - CX) * ease(G.t / .6);
    if (G.phase === "out") x = CX + (LW + 300 - CX) * ease(G.t / .45);
    if (G.shake > 0) x += Math.sin(G.shake * 40) * 10;
    const eating = G.phase === "eat", grumpy = G.phase === "grumpy" || G.phase === "over", moving = G.phase === "in" || G.phase === "out";
    if (w.kid) {
      let P = { pose: "idle", face: -1, exp: "smile" };
      if (moving) P = { pose: "run", face: G.phase === "out" ? 1 : -1, ph: T * 14 };
      else if (eating) P = { pose: "cheer", face: -1 };
      else if (grumpy) P = cur.id === "ellie" ? { pose: "knees", face: -1 } : { pose: "hips", face: -1 };
      else if (G.shake > 0) P = { pose: "idle", face: -1, exp: "O" };
      KIDS_ART.draw(c, cur.id, x, CY + 10, KID, P, T);
      if (eating) { ART.food(c, cur.want[0], x - 60, CY - 150, 80, T); ART.food(c, cur.want[1], x + 10, CY - 170, 80, T); }
      return x;
    }
    if (w.couch) couch(c, x, CY, SCALE);
    w.draw(c, x, CY, SCALE, { t: T, mood: 0, state: eating ? "eating" : grumpy ? "outburst" : G.shake > 0 ? "wrong" : "idle", plate: cur.want[0], blink: T % 4.3 < .12, scarf: 30 });
    return x;
  }
  function bubble(c, x) {
    const cur = G.cur, w = WHO[cur.id], showing = G.phase === "show";
    const by = Math.max(250, CY - w.top - 16), bob = Math.sin(T * 3) * 4;
    c.save(); c.translate(Math.min(Math.max(x, 190), LW - 180), by + bob);
    c.shadowColor = "rgba(60,30,10,.3)"; c.shadowBlur = 20; c.shadowOffsetY = 6;
    ART.box(c, -170, -226, 340, 216, 44, "#FFFFFF"); c.shadowColor = "transparent";
    c.beginPath(); c.moveTo(-16, -12); c.lineTo(16, -12); c.lineTo(0, 12); c.closePath(); c.fillStyle = "#FFFFFF"; c.fill();
    ART.text(c, showing ? `${w.name} wants…` : `What did ${w.name} want?`, 0, -200, 22, "#7A6658", 600);
    cur.want.forEach((d, i) => {
      const sx = i ? 78 : -78;
      if (showing) {
        ART.food(c, d, sx, -130, 130, T);
        ART.text(c, FOOD[d], sx, -64, 25, "#3A2A24", 700);
      } else {
        // after the reveal: two slots that fill in as you remember them
        const got = cur.got[i];
        ART.box(c, sx - 62, -178, 124, 124, 30, got ? "#EAF8F0" : "#F4EADB");
        if (got) { ART.food(c, got, sx, -122, 110, T); ART.text(c, "✓", sx + 44, -164, 26, "#2E9E6A", 700); }
        else ART.text(c, "?", sx, -114, 76, "#C9A45C", 700);
      }
    });
    if (showing) {
      // three-second countdown
      const left = Math.max(0, 1 - G.t / SHOW);
      ART.box(c, -130, -38, 260, 14, 7, "#EEE5D8"); ART.box(c, -130, -38, 260 * left, 14, 7, "#6FA5D8");
    } else {
      const p = Math.max(0, G.pat), col = p > .5 ? "#4CC38A" : p > .25 ? "#F2B230" : "#E5484D";
      ART.box(c, -130, -38, 260, 14, 7, "#EEE5D8"); ART.box(c, -130, -38, 260 * p, 14, 7, col);
    }
    c.restore();
    if (showing) {
      const bx = Math.min(Math.max(x, 190), LW - 180);
      ART.speech(c, bx, by + bob - 236, `Remember!  ${Math.ceil(SHOW - G.t)}`, { size: 26, weight: 700, bg: "#2E4A6E", col: "#FFFFFF", clampX: [20, LW - 20] });
    }
  }
  function drawMax(c) {
    const m = G.max, my = MY + m.y, attacking = m.state === "dash" || m.state === "leap";
    let act = "run";
    if (m.state === "wander" && Math.abs(m.x - m.tx) < 2) act = "happy";
    if (m.state === "leap" || m.state === "photobomb") act = "reach";
    c.save();
    if (m.state === "tumble") { c.translate(m.x, my - 50); c.rotate(m.spin); c.translate(-m.x, -(my - 50)); }
    ART.max(c, m.x, my, 1.7, { t: T, act, dir: m.dir, ph: m.ph, expr: attacking ? "sly" : m.state === "tumble" ? "gasp" : "grin", blink: T % 3.7 < .12 });
    c.restore();
    if (m.grab && m.state === "flee") ART.food(c, m.grab, m.x + 10, my - 150, 70, T);
    if (attacking) {
      const p = .5 + .5 * Math.sin(T * 9);
      c.save(); c.globalAlpha = .5 + .5 * p; c.beginPath(); c.ellipse(m.x, my - 70, 80, 90, 0, 0, Math.PI * 2); c.strokeStyle = "#E5484D"; c.lineWidth = 5; c.stroke(); c.restore();
      ART.speech(c, m.x, my - 170, "Tap Max!", { size: 24, weight: 700, border: "#E5484D", clampX: [10, LW - 10] });
    } else if (m.talk && m.talkT > 0) {
      ART.speech(c, m.x, my - 160, m.talk, { size: 22, weight: 700, border: "#F9C74F", clampX: [10, LW - 10] });
    }
  }
  function draw() {
    const c = ctx;
    c.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
    wall(c);
    c.translate(0, DY);
    room(c);
    if (!G || G.mode === "lose") {
      ART.ariel(c, 230, 820, 1.9, { t: T, dir: 1, carry: G ? null : "cake", anim: G ? "wipe" : null, animT: T, blink: T % 3.9 < .12 });
      ART.max(c, 540, 830, 2.2, { t: T, act: G ? "happy" : "peek", pot: !!G, dir: -1, look: [-1.5, 0], expr: G ? "grin" : "sly", blink: T % 3.7 < .12 });
      return;
    }
    if (G.mode === "win") {
      KIDS_ART.draw(c, "jonah", 420, 830, 2.7, { pose: "armsUp", face: -1 }, T);
      KIDS_ART.draw(c, "reuben", 610, 830, 2.7, { pose: "cheer", face: -1 }, T);
      ART.ariel(c, 200, 830, 1.9, { t: T, dir: 1, anim: "happy", animT: T, expr: "proud", blink: T % 3.9 < .12 });
      KIDS_ART.draw(c, "ellie", 320, 860, 2.7, { pose: "jump", face: -1 }, T);
      ART.max(c, 520, 880, 2.1, { t: T, act: "happy", crumbs: true, snack: "cookie", dir: -1 });
      return;
    }
    const ex = drawEater(c);
    const walking = G.phase === "serve" || (G.phase === "eat" && G.t < .5), carrying = G.phase === "serve";
    ART.ariel(c, G.arielX, AY, 1.9, { t: T, dir: G.phase === "eat" ? -1 : 1, moving: walking, walkPh: T * 17, carry: carrying ? G.cur.want[0] : null,
      anim: G.phase === "eat" && G.t > .5 ? "happy" : G.phase === "grumpy" ? "wipe" : null, animT: G.t, blink: T % 3.9 < .12 });
    if (carrying) ART.food(c, G.cur.want[1], G.arielX + 24, AY - 300, 110, T);
    const bombing = G.max.state === "photobomb" && G.max.t > 0;
    if (!bombing) drawMax(c);
    if (G.phase === "show" || G.phase === "pick") bubble(c, ex);
    if (bombing) drawMax(c); // Max leaps in front of the order while you're memorizing it
    if (G.say && G.sayT > 0) {
      const atEater = G.sayAt === "eater";
      ART.speech(c, atEater ? ex : AX + 60, atEater ? 360 : 470, G.say, { size: 26, weight: 700, border: G.phase === "eat" ? "#4CC38A" : "#F39237", clampX: [20, LW - 20] });
    }
    for (const h of G.hearts2) {
      if (h.t < 0) continue;
      c.save(); c.globalAlpha = 1 - h.t / 1.4; c.translate(h.x, h.y); c.scale(2.2, 2.2);
      c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(-10, -5, -4, -12, 0, -6); c.bezierCurveTo(4, -12, 10, -5, 0, 3); c.fillStyle = "#F28DB2"; c.fill(); c.restore();
    }
  }

  // ---------- layout ----------
  function resize() {
    const box = $("#scene").getBoundingClientRect();
    LH = Math.round(Math.min(1300, Math.max(900, box.height / box.width * LW))); DY = LH - 900;
    const s = Math.min(box.width / LW, box.height / LH), dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = `${Math.floor(LW * s)}px`; cv.style.height = `${Math.floor(LH * s)}px`;
    cv.width = Math.floor(LW * s * dpr); cv.height = Math.floor(LH * s * dpr);
  }
  addEventListener("resize", resize);

  // ---------- buttons ----------
  // every button reacts to a finger lifting or a click, whichever the browser sends first
  function onTap(el, fn) {
    let lastT = 0;
    const go = e => { const now = performance.now(); if (now - lastT < 450) return; lastT = now; e.preventDefault(); fn(e); };
    el.addEventListener("pointerup", go); el.addEventListener("click", go);
  }
  const start = () => { for (const id of ["#start", "#win", "#lose"]) $(id).hidden = true; newGame(); tone(660, .1); };
  onTap($("#play"), start);
  onTap($("#again"), start);
  onTap($("#retry"), start);
  $("#back").onclick = () => {
    let same = false; try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
    if (same && history.length > 1) history.back(); else location.href = "../";
  };
  const syncMute = () => { $("#mute").classList.toggle("off", muted); $("#mute").setAttribute("aria-label", muted ? "Sound off" : "Sound on"); };
  onTap($("#mute"), () => { muted = !muted; try { localStorage.setItem("arielCookout.muted", muted ? "1" : "0"); } catch {} syncMute(); });
  syncMute();
  $("#plates").innerHTML = "<i></i>".repeat(GOAL);
  $("#hearts").innerHTML = "<span>♥</span>".repeat(HEARTS);

  let last = performance.now(), reported = false;
  function frame(now) {
    requestAnimationFrame(frame);
    try { update(Math.min(.05, (now - last) / 1000)); draw(); }
    catch (err) { if (!reported) { reported = true; console.error(err); } }
    last = now;
  }
  resize();
  if (document.fonts) document.fonts.ready.then(() => { for (const k in icons) delete icons[k]; for (const b of $("#choices").children) b.querySelector("img").src = icon(b.dataset.d); });
  requestAnimationFrame(frame);

  window.__cookout = { get G() { return G; } };
})();
