"use strict";
// Ariel Passover Cookout: someone asks for a dish, you tap the matching picture, Ariel serves it.
// The catch: everyone's patience runs down, their order bubble hides after a moment (remember it!),
// and Max sneaks in to grab food unless you tap him. Serve 10 before you lose all 3 hearts.

(() => {
  const $ = s => document.querySelector(s);
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const LW = 720, GOAL = 10, HEARTS = 3;
  let LH = 900, DY = 0; // the room grows taller on tall phones; DY pushes the scene down
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  const FOOD = { soup: "Soup", frittata: "Frittata", kugel: "Kugel", cutlets: "Cutlets", cake: "Apple Cake" };
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
  const NOPE = ["Not that one!", "Hmm, no!", "Try again!"];
  const CX = 480, CY = 800, SCALE = 1.9;   // where the eater sits
  const AX = 150, AY = 820;                 // where Ariel waits
  const MY = 880;                           // Max creeps along the front of the room

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
    no: () => { tone(330, .15, "sine", .08); tone(262, .2, "sine", .08, .12); },
    hi: () => tone(880, .12, "sine", .06),
    hide: () => tone(620, .1, "sine", .05),
    ouch: () => { tone(300, .2, "sawtooth", .05); tone(200, .35, "sawtooth", .05, .15); },
    shoo: () => [900, 1150, 980, 1250].forEach((f, i) => tone(f, .09, "sine", .07, i * .08)),
    sneak: () => { tone(200, .08, "square", .03); tone(240, .08, "square", .03, .18); },
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
  let G = null, T = 0;
  function newGame() {
    G = {
      mode: "play", served: 0, hearts: HEARTS, lastId: null, bag: [],
      cur: null, phase: "in", t: 0, pat: 1, shake: 0, say: null, sayT: 0, arielX: AX, carry: null, hearts2: [],
      max: null, seenMemory: false,
    };
    nextEater(); syncTop();
  }
  // difficulty climbs with every dish served
  const patienceSecs = () => Math.max(5.5, 10 - G.served * .5);
  const memoryAfter = () => G.served < 3 ? Infinity : Math.max(1.1, 2.6 - (G.served - 3) * .2);
  const choiceCount = () => G.served < 5 ? 3 : 4;

  function nextEater() {
    if (!G.bag.length) G.bag = shuffle(Object.keys(WHO));
    let id = G.bag.pop(); if (id === G.lastId && G.bag.length) { G.bag.unshift(id); id = G.bag.pop(); }
    G.lastId = id;
    G.cur = { id, want: Math.random() < .55 ? WHO[id].fav : pick(DISHES) };
    G.phase = "in"; G.t = 0; G.pat = 1; G.say = null; G.carry = null;
    $("#choices").innerHTML = "";
  }
  function showChoices() {
    const want = G.cur.want, n = choiceCount();
    const opts = shuffle([want, ...shuffle(DISHES.filter(d => d !== want)).slice(0, n - 1)]);
    const box = $("#choices"); box.innerHTML = ""; box.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    for (const d of opts) {
      const b = document.createElement("button"); b.type = "button"; b.className = "choice";
      b.innerHTML = `<img src="${icon(d)}" alt="">${FOOD[d]}`;
      onTap(b, () => choose(d, b));
      box.appendChild(b);
    }
    // Max tries to snatch food on most orders, and more often as it goes
    if (!G.max && Math.random() < Math.min(.95, .6 + G.served * .05)) sendMax(rand(.5, 2));
  }
  function sendMax(delay) {
    G.max = { state: "wait", x: -90, y: 0, delay, speed: 70 + G.served * 7, ph: 0, t: 0, grab: null };
  }
  function choose(d, btn) {
    if (!G || G.phase !== "wait") return;
    if (d === G.cur.want) {
      [...$("#choices").children].forEach(b => (b.disabled = true));
      G.phase = "serve"; G.t = 0; G.carry = d; G.say = null; sfx.yes();
    } else {
      G.pat -= .25; G.shake = .5; G.say = pick(NOPE); G.sayT = 1.2;
      btn.disabled = true; btn.classList.add("nope"); sfx.no();
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

  function updateMax(dt) {
    const m = G.max; if (!m) return;
    m.t += dt; m.ph += dt * 14;
    if (m.state === "wait") { m.delay -= dt; if (m.delay <= 0) { m.state = "sneak"; sfx.sneak(); } return; }
    if (m.state === "sneak") {
      m.x += m.speed * dt;
      if (m.x >= AX - 120) { m.state = "leap"; m.t = 0; m.x0 = m.x; sfx.sneak(); }
      return;
    }
    if (m.state === "leap") {
      // a big jump up at the food in Ariel's hands
      const k = Math.min(1, m.t / .7);
      m.x = m.x0 + (AX - 20 - m.x0) * k; m.y = -Math.sin(k * Math.PI) * 170;
      if (k >= 1) {
        m.y = 0; m.state = "grab"; m.grab = pick(DISHES); loseHeart(); sfx.ouch();
        G.say = `Max grabbed the ${FOOD[m.grab].toLowerCase()}!`; G.sayT = 1.8; G.sayAt = "ariel";
        if (G.hearts <= 0) { G.phase = "over"; G.t = 0; }
      }
      return;
    }
    // running away, either shooed or with his loot
    m.x -= 420 * dt; m.y = Math.min(0, m.y + 600 * dt);
    if (m.x < -120) {
      const again = m.state === "shoo" && G.phase === "wait" && Math.random() < .5;
      G.max = null;
      if (again) sendMax(rand(.8, 1.6)); // he doesn't give up easily
    }
  }
  function tapCanvas(e) {
    if (!G || G.mode !== "play" || !G.max || (G.max.state !== "sneak" && G.max.state !== "leap")) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH - DY;
    if (Math.hypot(x - G.max.x, y - (MY - 70 + G.max.y)) < 120) { G.max.state = "shoo"; G.say = "Shoo, Max!"; G.sayT = 1.2; G.sayAt = "ariel"; sfx.shoo(); }
  }
  cv.addEventListener("pointerdown", tapCanvas);

  function update(dt) {
    T += dt;
    if (!G || G.mode !== "play") return;
    G.t += dt; G.shake = Math.max(0, G.shake - dt); G.sayT -= dt;
    for (const h of G.hearts2) { h.t += dt; h.y -= 60 * dt; h.x += Math.sin(h.t * 5 + h.k) * 30 * dt; }
    G.hearts2 = G.hearts2.filter(h => h.t < 1.4);
    updateMax(dt);
    switch (G.phase) {
      case "in": if (G.t > .6) { G.phase = "wait"; G.t = 0; showChoices(); sfx.hi(); } break;
      case "wait": {
        const before = G.t - dt;
        if (before < memoryAfter() && G.t >= memoryAfter()) { sfx.hide(); if (!G.seenMemory) { G.seenMemory = true; G.say = "Remember what they want!"; G.sayT = 1.8; G.sayAt = "ariel"; } }
        G.pat -= dt / patienceSecs();
        if (G.pat <= 0) {
          G.phase = "grumpy"; G.t = 0; G.say = "Hmph! Too slow!"; G.sayT = 1.4; G.sayAt = "eater";
          [...$("#choices").children].forEach(b => (b.disabled = true));
          loseHeart(); sfx.ouch();
        }
        break;
      }
      case "grumpy": if (G.t > 1.4) { if (G.hearts <= 0) { G.phase = "over"; G.t = 0; } else { G.phase = "out"; G.t = 0; } } break;
      case "serve":
        G.arielX = AX + (330 - AX) * ease(G.t / .5);
        if (G.t > .5) {
          G.phase = "eat"; G.t = 0; G.carry = null; G.say = WHO[G.cur.id].thanks; G.sayT = 1.4; G.sayAt = "eater";
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
    G.mode = "win"; G.max = null; $("#choices").innerHTML = "";
    [...$("#stars").children].forEach((s, i) => s.classList.toggle("on", i < G.hearts));
    $("#winText").textContent = G.hearts === HEARTS ? "Not a single heart lost. Amazing!" : "You fed the whole family!";
    $("#win").hidden = false; sfx.win();
  }
  function lose() {
    G.mode = "lose"; G.max = null; $("#choices").innerHTML = "";
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
    // brass pendant light over the table, hanging lower when there is room
    const py = 150 + DY * .45;
    c.beginPath(); c.moveTo(480, 0); c.lineTo(480, py - 40); c.strokeStyle = "#9C7634"; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.moveTo(430, py); c.quadraticCurveTo(432, py - 42, 480, py - 44); c.quadraticCurveTo(528, py - 42, 530, py); c.closePath();
    c.fillStyle = ART.lin(c, 430, 0, 530, 0, "#9C7634", "#F1DA9E", "#C9A45C"); c.fill();
    ART.ell(c, 480, py, 50, 8, "#FFF3D1");
    ART.dot(c, 480, py + 10, 170, ART.rad(c, 480, py + 10, 170, "rgba(255,230,170,.35)", "rgba(255,230,170,0)"));
    // window with the Passover moon
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
      if (eating) ART.food(c, cur.want, x - 40, CY - 150, 90, T);
      return x;
    }
    if (w.couch) couch(c, x, CY, SCALE);
    w.draw(c, x, CY, SCALE, { t: T, mood: 0, state: eating ? "eating" : grumpy ? "outburst" : G.shake > 0 ? "wrong" : "idle", plate: cur.want, blink: T % 4.3 < .12, scarf: 30 });
    return x;
  }
  function bubble(c, x) {
    const w = WHO[G.cur.id], hidden = G.t >= memoryAfter();
    const by = Math.max(210, CY - w.top - 16), bob = Math.sin(T * 3) * 4;
    c.save(); c.translate(Math.min(x, LW - 110), by + bob);
    c.shadowColor = "rgba(60,30,10,.3)"; c.shadowBlur = 20; c.shadowOffsetY = 6;
    ART.box(c, -95, -206, 190, 196, 40, "#FFFFFF"); c.shadowColor = "transparent";
    c.beginPath(); c.moveTo(-16, -12); c.lineTo(16, -12); c.lineTo(0, 12); c.closePath(); c.fillStyle = "#FFFFFF"; c.fill();
    ART.text(c, `${w.name} wants`, 0, -182, 22, "#7A6658", 600);
    if (hidden) {
      ART.dot(c, 0, -118, 50, "#F4EADB");
      ART.text(c, "?", 0, -114, 76, "#C9A45C", 700);
      ART.text(c, "Remember?", 0, -52, 24, "#3A2A24", 700);
    } else {
      ART.food(c, G.cur.want, 0, -116, 130, T);
      ART.text(c, FOOD[G.cur.want], 0, -50, 28, "#3A2A24", 700);
    }
    // patience bar
    const p = Math.max(0, G.pat), col = p > .5 ? "#4CC38A" : p > .25 ? "#F2B230" : "#E5484D";
    ART.box(c, -70, -32, 140, 12, 6, "#EEE5D8");
    ART.box(c, -70, -32, 140 * p, 12, 6, col);
    c.restore();
  }
  function drawMax(c) {
    const m = G.max; if (!m || m.state === "wait") return;
    const sneaking = m.state === "sneak" || m.state === "leap", my = MY + m.y;
    ART.max(c, m.x, my, 1.7, { t: T, act: m.state === "leap" ? "reach" : "run", dir: sneaking ? 1 : -1, ph: m.ph, expr: sneaking ? "sly" : "grin", blink: T % 3.7 < .12 });
    if (m.state === "grab") ART.food(c, m.grab, m.x - 10, MY - 150, 70, T);
    if (sneaking) {
      const p = .5 + .5 * Math.sin(T * 9);
      c.save(); c.globalAlpha = .5 + .5 * p; c.beginPath(); c.ellipse(m.x, my - 70, 80, 90, 0, 0, Math.PI * 2); c.strokeStyle = "#E5484D"; c.lineWidth = 5; c.stroke(); c.restore();
      ART.speech(c, m.x + 20, my - 170, m.state === "leap" ? "Tap me! Quick!" : "Tap me!", { size: 22, weight: 700, border: "#E5484D", clampX: [10, LW - 10] });
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
    const moving = G.phase === "serve" || (G.phase === "eat" && G.t < .5);
    ART.ariel(c, G.arielX, AY, 1.9, { t: T, dir: G.phase === "eat" ? -1 : 1, moving, walkPh: T * 17, carry: G.carry,
      anim: G.phase === "eat" && G.t > .5 ? "happy" : G.phase === "grumpy" ? "wipe" : null, animT: G.t, blink: T % 3.9 < .12 });
    drawMax(c);
    if (G.phase === "wait") bubble(c, ex);
    if (G.say && G.sayT > 0) {
      const atEater = G.sayAt === "eater" || (!G.sayAt && G.phase !== "wait");
      const good = G.phase === "eat";
      ART.speech(c, atEater ? ex : AX + 40, atEater ? 360 : 400, G.say, { size: 28, weight: 700, border: good ? "#4CC38A" : "#F39237", clampX: [20, LW - 20] });
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

  let last = performance.now();
  let reported = false;
  function frame(now) {
    requestAnimationFrame(frame);
    try { update(Math.min(.05, (now - last) / 1000)); draw(); }
    catch (err) { if (!reported) { reported = true; console.error(err); } }
    last = now;
  }
  resize();
  if (document.fonts) document.fonts.ready.then(() => { for (const k in icons) delete icons[k]; });
  requestAnimationFrame(frame);

  window.__cookout = { get G() { return G; } };
})();
