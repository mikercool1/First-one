"use strict";
// Ariel Passover Cookout: someone asks for a dish, you tap the matching picture, Ariel serves it.
// Ten happy eaters and Passover is saved. No timer, no losing.

(() => {
  const $ = s => document.querySelector(s);
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const LW = 720, LH = 900, GOAL = 10;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  const FOOD = { soup: "Soup", frittata: "Frittata", kugel: "Kugel", cutlets: "Cutlets", cake: "Apple Cake", cookie: "Cookie", apple: "Apple", sippy: "Sippy Cup", matzah: "Matzah" };
  const DISHES = ["soup", "frittata", "kugel", "cutlets", "cake"], SNACKS = ["cookie", "apple", "sippy", "matzah"];
  const WHO = {
    ikey: { name: "Ikey", fav: "soup", draw: ART.ikey, top: 215, couch: true, thanks: "Touchdown!" },
    simon: { name: "Simon", fav: "soup", draw: ART.simon, top: 215, thanks: "10-4, yummy!" },
    cari: { name: "Cari", fav: "cutlets", draw: ART.cari, top: 215, thanks: "Obsessed!" },
    nana: { name: "Nana", fav: "kugel", draw: ART.nana, top: 262, thanks: "Delicious, sweetheart!" },
    michael: { name: "Michael", fav: "frittata", draw: ART.michael, top: 215, couch: true, thanks: "Perfect, thanks!" },
    sarah: { name: "Sarah", fav: "cake", draw: ART.sarah, top: 250, thanks: "Fabulous!" },
    max: { name: "Max", top: 125, thanks: "Yummy!" },
  };
  const NOPE = ["Not that one!", "Hmm, no!", "Try again!"];
  const CX = 480, CY = 800, SCALE = 1.9;   // where the eater sits
  const AX = 150, AY = 820;                 // where Ariel waits

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
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .35, "triangle", .1, i * .1)),
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
    const fam = shuffle(Object.keys(WHO).filter(k => k !== "max"));
    const line = [...fam, ...shuffle([...fam]).slice(0, 2)];
    line.splice(3, 0, "max"); line.splice(7, 0, "max");
    G = {
      mode: "play", served: 0, mistakes: 0,
      queue: line.slice(0, GOAL).map(id => ({ id, want: id === "max" ? pick(SNACKS) : Math.random() < .6 ? WHO[id].fav : pick(DISHES) })),
      cur: null, phase: "in", t: 0, shake: 0, say: null, sayT: 0, arielX: AX, carry: null, hearts: [],
    };
    nextEater();
    drawPlates();
  }
  function nextEater() {
    G.cur = G.queue[G.served]; G.phase = "in"; G.t = 0; G.say = null; G.carry = null;
    $("#choices").innerHTML = "";
  }
  function showChoices() {
    const want = G.cur.want, pool = G.cur.id === "max" ? SNACKS : DISHES;
    const opts = shuffle([want, ...shuffle(pool.filter(d => d !== want)).slice(0, 2)]);
    const box = $("#choices"); box.innerHTML = "";
    for (const d of opts) {
      const b = document.createElement("button"); b.type = "button"; b.className = "choice";
      b.innerHTML = `<img src="${icon(d)}" alt="">${FOOD[d]}`;
      b.onclick = () => choose(d, b);
      box.appendChild(b);
    }
  }
  function choose(d, btn) {
    if (!G || G.phase !== "wait") return;
    if (d === G.cur.want) {
      [...$("#choices").children].forEach(b => (b.disabled = true));
      G.phase = "serve"; G.t = 0; G.carry = d; G.say = null; sfx.yes();
    } else {
      G.mistakes++; G.shake = .5; G.say = pick(NOPE); G.sayT = 1.2;
      btn.disabled = true; btn.classList.add("nope"); sfx.no();
    }
  }
  function drawPlates() {
    $("#plates").innerHTML = Array.from({ length: GOAL }, (_, i) => `<i class="${i < G.served ? "on" : ""}"></i>`).join("");
    $("#count").textContent = `${G.served} / ${GOAL}`;
  }

  function update(dt) {
    T += dt;
    if (!G || G.mode !== "play") return;
    G.t += dt; G.shake = Math.max(0, G.shake - dt); G.sayT -= dt;
    for (const h of G.hearts) { h.t += dt; h.y -= 60 * dt; h.x += Math.sin(h.t * 5 + h.k) * 30 * dt; }
    G.hearts = G.hearts.filter(h => h.t < 1.4);
    switch (G.phase) {
      case "in": if (G.t > .6) { G.phase = "wait"; G.t = 0; showChoices(); sfx.hi(); } break;
      case "serve":
        G.arielX = AX + (330 - AX) * ease(G.t / .5);
        if (G.t > .5) {
          G.phase = "eat"; G.t = 0; G.carry = null; G.say = WHO[G.cur.id].thanks; G.sayT = 1.6;
          for (let i = 0; i < 8; i++) G.hearts.push({ x: CX + rand(-80, 80), y: CY - 260, t: rand(-.4, 0), k: rand(0, 6) });
        }
        break;
      case "eat":
        G.arielX = 330 + (AX - 330) * ease(G.t / .5);
        if (G.t > 1.6) { G.served++; drawPlates(); G.phase = "out"; G.t = 0; }
        break;
      case "out": if (G.t > .45) { if (G.served >= GOAL) win(); else nextEater(); } break;
    }
  }
  function win() {
    G.mode = "win"; $("#choices").innerHTML = "";
    const stars = G.mistakes === 0 ? 3 : G.mistakes <= 3 ? 2 : 1;
    [...$("#stars").children].forEach((s, i) => s.classList.toggle("on", i < stars));
    $("#winText").textContent = G.mistakes === 0 ? "Every dish was right the first time!" : "You fed the whole family, and Max got his snacks too!";
    $("#win").hidden = false; sfx.win();
  }

  // ---------- drawing ----------
  function room(c) {
    c.fillStyle = ART.lin(c, 0, 0, 0, 640, "#FBF1E8", "#EED9CE"); c.fillRect(0, 0, LW, 640);
    c.fillStyle = ART.lin(c, 0, 620, 0, LH, "#D9AE80", "#C4935F"); c.fillRect(0, 620, LW, LH - 620);
    for (let y = 654; y < LH; y += 34) { c.fillStyle = "rgba(110,70,40,.15)"; c.fillRect(0, y, LW, 2); }
    c.fillStyle = "#FFF8F2"; c.fillRect(0, 606, LW, 16);
    // window with the Passover moon
    c.save(); ART.rr(c, 50, 120, 170, 230, 85); c.clip();
    c.fillStyle = ART.lin(c, 0, 120, 0, 350, "#28305C", "#7D6696", "#E8A98C"); c.fillRect(50, 120, 170, 230);
    ART.dot(c, 170, 185, 22, "#FFF6DA"); c.restore();
    ART.rr(c, 50, 120, 170, 230, 85); c.strokeStyle = "#FFFFFF"; c.lineWidth = 10; c.stroke();
    // banner
    const word = "CHAG SAMEACH", cols = ["#2E4A6E", "#C9A45C", "#9C3D4A", "#7FA88B"];
    c.beginPath(); c.moveTo(20, 40); c.quadraticCurveTo(360, 90, 700, 40); c.strokeStyle = "#C9A45C"; c.lineWidth = 2; c.stroke();
    let k = 0;
    for (let i = 0; i < word.length; i++) {
      if (word[i] === " ") continue;
      const u = (k + .5) / 11, x = 20 + u * 680, y = 40 + Math.sin(u * Math.PI) * 24;
      c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x + 20, y); c.lineTo(x, y + 44); c.closePath(); c.fillStyle = cols[k % 4]; c.fill();
      ART.text(c, word[i], x, y + 14, 18, "#FFFFFF", 700); k++;
    }
    // rug
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
    const eating = G.phase === "eat";
    if (cur.id === "max") {
      const moving = G.phase === "in" || G.phase === "out";
      ART.max(c, x, CY + 10, 2.3, { t: T, dir: G.phase === "out" ? 1 : -1, ph: T * 16, blink: T % 3.7 < .12,
        act: moving ? "run" : eating ? "eat" : "reach", snack: eating ? cur.want : null, expr: eating ? "eat" : G.shake > 0 ? "gasp" : "grin" });
      return x;
    }
    if (w.couch) couch(c, x, CY, SCALE);
    w.draw(c, x, CY, SCALE, { t: T, mood: 0, state: eating ? "eating" : G.shake > 0 ? "wrong" : "idle", plate: cur.want, blink: T % 4.3 < .12, scarf: 30 });
    return x;
  }
  function bubble(c, x) {
    const w = WHO[G.cur.id], s = G.cur.id === "max" ? 2.3 : SCALE;
    const by = Math.max(210, CY - w.top * s - 16), bob = Math.sin(T * 3) * 4;
    c.save(); c.translate(Math.min(x, LW - 110), by + bob);
    c.shadowColor = "rgba(60,30,10,.3)"; c.shadowBlur = 20; c.shadowOffsetY = 6;
    ART.box(c, -95, -196, 190, 186, 40, "#FFFFFF"); c.shadowColor = "transparent";
    c.beginPath(); c.moveTo(-16, -12); c.lineTo(16, -12); c.lineTo(0, 12); c.closePath(); c.fillStyle = "#FFFFFF"; c.fill();
    ART.text(c, `${w.name} wants`, 0, -172, 22, "#7A6658", 600);
    ART.food(c, G.cur.want, 0, -106, 130, T);
    ART.text(c, FOOD[G.cur.want], 0, -38, 28, "#3A2A24", 700);
    c.restore();
  }
  function draw() {
    const c = ctx;
    c.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
    room(c);
    if (!G) {
      // title scene: Ariel with a cake, Max sneaking in
      ART.ariel(c, 230, 820, 1.9, { t: T, dir: 1, carry: "cake", blink: T % 3.9 < .12 });
      ART.max(c, 540, 830, 2.2, { t: T, act: "peek", dir: -1, look: [-1.5, 0], expr: "sly", blink: T % 3.7 < .12 });
      return;
    }
    if (G.mode === "win") {
      ART.ariel(c, 240, 820, 1.9, { t: T, dir: 1, anim: "happy", animT: T, expr: "proud", blink: T % 3.9 < .12 });
      ART.max(c, 500, 830, 2.3, { t: T, act: "happy", crumbs: true, snack: "cookie", dir: -1 });
      return;
    }
    const ex = drawEater(c);
    const moving = G.phase === "serve" || (G.phase === "eat" && G.t < .5);
    ART.ariel(c, G.arielX, AY, 1.9, { t: T, dir: G.phase === "eat" ? -1 : 1, moving, walkPh: T * 17, carry: G.carry,
      anim: G.phase === "eat" && G.t > .5 ? "happy" : null, animT: G.t, blink: T % 3.9 < .12 });
    if (G.phase === "wait") bubble(c, ex);
    if (G.say && G.sayT > 0) {
      const eat = G.phase === "eat";
      ART.speech(c, eat ? ex : ex - 150, eat ? 360 : 560, G.say, { size: 30, weight: 700, border: eat ? "#4CC38A" : "#F39237", clampX: [20, LW - 20] });
    }
    for (const h of G.hearts) {
      if (h.t < 0) continue;
      c.save(); c.globalAlpha = 1 - h.t / 1.4; c.translate(h.x, h.y); c.scale(2.2, 2.2);
      c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(-10, -5, -4, -12, 0, -6); c.bezierCurveTo(4, -12, 10, -5, 0, 3); c.fillStyle = "#F28DB2"; c.fill(); c.restore();
    }
  }

  // ---------- layout ----------
  function resize() {
    const box = $("#scene").getBoundingClientRect(), s = Math.min(box.width / LW, box.height / LH), dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = `${Math.floor(LW * s)}px`; cv.style.height = `${Math.floor(LH * s)}px`;
    cv.width = Math.floor(LW * s * dpr); cv.height = Math.floor(LH * s * dpr);
  }
  addEventListener("resize", resize);

  // ---------- buttons ----------
  const start = () => { $("#start").hidden = true; $("#win").hidden = true; newGame(); tone(660, .1); };
  $("#play").onclick = start;
  $("#again").onclick = start;
  $("#back").onclick = () => {
    let same = false; try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
    if (same && history.length > 1) history.back(); else location.href = "../";
  };
  const syncMute = () => { $("#mute").classList.toggle("off", muted); $("#mute").setAttribute("aria-label", muted ? "Sound off" : "Sound on"); };
  $("#mute").onclick = () => { muted = !muted; try { localStorage.setItem("arielCookout.muted", muted ? "1" : "0"); } catch {} syncMute(); };
  syncMute();
  $("#plates").innerHTML = "<i></i>".repeat(GOAL);

  let last = performance.now();
  function frame(now) { update(Math.min(.05, (now - last) / 1000)); last = now; draw(); requestAnimationFrame(frame); }
  resize();
  if (document.fonts) document.fonts.ready.then(() => { for (const k in icons) delete icons[k]; });
  requestAnimationFrame(frame);

  window.__cookout = { get G() { return G; } };
})();
