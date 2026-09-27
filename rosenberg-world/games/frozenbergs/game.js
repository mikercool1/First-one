"use strict";
// Frozenbergs: run the ice cream stand. A customer walks up and orders, you tap "Make the cone!",
// build it one step at a time in the full-screen builder, press Done, and hand it over.
// The family (Ariel, Sarah, Molly, Max) and the kids come from the Ariel Passover Cookout art.

(() => {
  const $ = (s) => document.querySelector(s);
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const LW = 720;
  const TOPZ = 330;                // the order ticket hangs in the sky above the stand
  let LH = 1000 + TOPZ, DY = TOPZ; // taller phones get more sky; DY pushes the scene down
  const SPEED = location.hash.includes("fast") ? 0.2 : 1;   // test hook
  const PER_DAY = 8, MAX_SCOOPS = 4;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const money = (n) => "$" + n.toFixed(2);
  const FONT = "Fredoka, ui-rounded, system-ui, sans-serif";
  const DISPLAY = `"Lilita One", Fredoka, sans-serif`;
  let T = 0;

  // ---------- menu ----------
  const CONES = [{ k: "waffle", n: "Waffle" }, { k: "sugar", n: "Sugar" }, { k: "cup", n: "Cup" }];
  const FLAVORS = Object.entries(CONE_ART.FLAVORS).map(([k, f]) => ({ k, ...f }));
  const SAUCES = [{ k: null, n: "No sauce" }, ...Object.entries(CONE_ART.SAUCES).map(([k, s]) => ({ k, ...s }))];
  const TOPS = [
    { k: "sprinkles", n: "Sprinkles" }, { k: "chips", n: "Choc Chips" }, { k: "whip", n: "Whipped Cream" },
    { k: "cherry", n: "Cherry" }, { k: "wafer", n: "Wafer" },
  ];
  const TOP_ORDER = TOPS.map((t) => t.k);
  const F = CONE_ART.FLAVORS, S = CONE_ART.SAUCES;
  const nameOf = (list, k) => list.find((x) => x.k === k)?.n ?? k;
  const SHORT = { vanilla: "Vanilla", choc: "Choc", straw: "Straw", mint: "Mint", blue: "Blue", mango: "Mango" };
  const TOP_COL = { sprinkles: "#FF4F86", chips: "#4A2614", whip: "#F4EEF2", cherry: "#E0183C", wafer: "#E8B566" };
  const CONE_COL = { waffle: "#E09A4D", sugar: "#F3CE92", cup: "#FF7FA8" };

  // ---------- people ----------
  const SCOOPERS = { reuben: "Reuben", jonah: "Jonah", ellie: "Ellie", max: "Max" };
  const KID_S = 2.3;
  // hold: where the customer holds the cone, relative to their feet. head: top of their head.
  const PEOPLE = {
    ariel: { name: "Ariel", s: 1.75, head: 430, hold: [-58, -250], thanks: "Delicious!" },
    sarah: { name: "Sarah", s: 1.75, head: 440, hold: [-30, -300], thanks: "So good!" },
    molly: { name: "Molly", s: 1.75, head: 430, hold: [-32, -300], thanks: "Yum, thank you!" },
    max: { name: "Max", s: 2.0, head: 250, hold: [-44, -120], thanks: "Mine! Mine!" },
    reuben: { name: "Reuben", kid: true, head: 136 * KID_S, hold: [-40, -150], thanks: "Home run!" },
    jonah: { name: "Jonah", kid: true, head: 118 * KID_S, hold: [-38, -132], thanks: "Yum yum!" },
    ellie: { name: "Ellie", kid: true, head: 98 * KID_S, hold: [-34, -112], thanks: "Yummy!" },
  };

  const LINES = {
    greet: ["Hi {me}!", "Hey {me}!", "Hi! It's hot out!", "Yum, ice cream!", "{me}! My favorite!"],
    surprise: ["Surprise me! Make it WILD!", "You pick, {me}! Go big!", "Chef's choice! Something fun!"],
    3: ["PERFECT!", "Exactly right!", "Wow! That's it!"],
    2: ["So close! Yum!", "Almost exactly!", "Ooh, I'll take it!"],
    1: ["Hmm… not quite.", "That's… different.", "Well, it's ice cream!"],
    0: ["That's not what I asked for!", "Huh?! Did you hear me?", "Um… okay…"],
    s3: ["WHOA! A tower of dreams!", "You're an artist!", "Best cone EVER!"],
    s2: ["Fun! I love it!", "Ooh, fancy!"],
    s1: ["Cute! Kinda plain though.", "Nice, but make it wilder!"],
    s0: ["That's… it?", "Plain. Very plain."],
  };

  // ---------- sound ----------
  let muted = false; try { muted = localStorage.getItem("frozenbergs.muted") === "1"; } catch { }
  let actx = null;
  function tone(f, d, type = "triangle", v = .1, delay = 0, slide = null) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume();
      const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + d + .05);
    } catch { }
  }
  const sfx = {
    tap: () => tone(880, .06, "triangle", .07),
    plop: () => tone(560, .16, "sine", .16, 0, 170),
    sauce: () => tone(320, .3, "sawtooth", .03, 0, 190),
    hi: () => { tone(660, .1, "sine", .07); tone(880, .14, "sine", .07, .09); },
    open: () => [523, 659, 784].forEach((f, i) => tone(f, .16, "triangle", .07, i * .05)),
    whoosh: () => tone(300, .35, "sine", .06, 0, 900),
    cash: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, .14, "square", .045, i * .07)),
    yay: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "triangle", .1, i * .08)),
    sad: () => { tone(392, .22, "triangle", .1, 0, 300); tone(300, .35, "triangle", .1, .2, 200); },
    nope: () => tone(170, .16, "square", .06),
  };

  // ---------- state ----------
  const G = {
    scooper: null, day: 1, served: 0, tips: 0, dayTips: 0, dayStars: 0, gallery: [],
    queue: [], cust: null, order: null, phase: "idle", pt: 0, patience: 1,
    build: null, history: [], step: 0, dropT: 1, result: null, floats: [], touchedSauce: false,
  };
  try {
    const s = localStorage.getItem("frozenbergs.scooper"); if (SCOOPERS[s]) G.scooper = s;
    // inside Rosenberg World, whoever is playing is the scooper (they can still switch)
    const rw = window.RosenbergBridge && RosenbergBridge.player; if (SCOOPERS[rw]) G.scooper = rw;
    G.tips = Number(localStorage.getItem("frozenbergs.tips")) || 0;
  } catch { }
  const me = () => SCOOPERS[G.scooper];
  const emptyBuild = () => ({ cone: null, scoops: [], sauce: null, tops: [] });

  function makeOrder(day, surprise) {
    if (surprise) return { surprise: true };
    const maxScoops = Math.min(MAX_SCOOPS, 1 + day);
    const scoops = Array.from({ length: rand(1, maxScoops) }, () => pick(FLAVORS).k);
    const sauce = Math.random() < Math.min(.8, .3 + day * .15) ? pick(SAUCES.slice(1)).k : null;
    const nTops = rand(day > 1 ? 1 : 0, Math.min(3, day));
    const tops = shuffle([...TOP_ORDER]).slice(0, nTops);
    return { cone: pick(CONES).k, scoops, sauce, tops: TOP_ORDER.filter((k) => tops.includes(k)) };
  }

  function grade(order, b) {
    if (order.surprise) {
      const distinct = new Set(b.scoops).size;
      return Math.min(b.scoops.length, 3) / 3 * .35 + Math.min(distinct, 3) / 3 * .25 + (b.sauce ? .15 : 0) + Math.min(b.tops.length, 3) / 3 * .25;
    }
    const left = [...order.scoops]; let matched = 0;
    for (const f of b.scoops) { const i = left.indexOf(f); if (i >= 0) { left.splice(i, 1); matched++; } }
    const scoopScore = matched / Math.max(order.scoops.length, b.scoops.length);
    const want = new Set(order.tops), got = new Set(b.tops), union = new Set([...want, ...got]);
    const topScore = union.size ? [...want].filter((t) => got.has(t)).length / union.size : 1;
    return ((order.cone === b.cone ? 1 : 0) + scoopScore * 2 + (order.sauce === b.sauce ? 1 : 0) + topScore) / 5;
  }
  const starsFor = (s) => (s >= .99 ? 3 : s >= .7 ? 2 : s >= .4 ? 1 : 0);

  // What the order says, as short lines with a colour chip each.
  function orderItems(o) {
    const items = [{ t: nameOf(CONES, o.cone) + (o.cone === "cup" ? "" : " cone"), c: CONE_COL[o.cone], part: "cone" }];
    const counts = {};
    o.scoops.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
    for (const [f, n] of Object.entries(counts)) items.push({ t: (n > 1 ? n + "× " : "") + F[f].n, c: F[f].c, part: "scoop", f, n });
    if (o.sauce) items.push({ t: S[o.sauce].n + " sauce", c: S[o.sauce].c, part: "sauce" });
    for (const k of o.tops) items.push({ t: nameOf(TOPS, k), c: TOP_COL[k], part: "top", k });
    return items;
  }
  function itemDone(it, b) {
    if (it.part === "cone") return b.cone === G.order.cone;
    if (it.part === "scoop") return b.scoops.filter((x) => x === it.f).length === it.n;
    if (it.part === "sauce") return b.sauce === G.order.sauce;
    return b.tops.includes(it.k);
  }

  // ---------- scene ----------
  const Y = (y) => y + DY;

  function sky(c) {
    c.fillStyle = ART.lin(c, 0, 0, 0, Y(640), "#5BB8F0", "#9AD7FA", "#DDF4FF"); c.fillRect(0, 0, LW, Y(660));
    const sx = 612, sy = Math.max(80, Y(100) - DY * .6);
    ART.dot(c, sx, sy, 150, ART.rad(c, sx, sy, 150, "rgba(255,244,200,.65)", "rgba(255,244,200,0)"));
    ART.dot(c, sx, sy, 46, ART.rad(c, sx, sy, 46, "#FFFBE6", "#FFE58A"));
    for (const [bx, by, sc, sp] of [[80, .22, 1, 7], [420, .12, .8, 5], [760, .3, 1.15, 9]]) {
      const x = ((bx + T * sp) % 960) - 120, y = Math.max(60, Y(by * 1000) - DY * .5);
      c.save(); c.translate(x, y); c.scale(sc, sc);
      for (const [dx, dy, r] of [[-40, 8, 28], [-10, -8, 38], [30, 0, 32], [60, 10, 22]]) ART.dot(c, dx, dy + 6, r, "rgba(170,210,240,.5)");
      for (const [dx, dy, r] of [[-40, 8, 28], [-10, -8, 38], [30, 0, 32], [60, 10, 22]]) ART.dot(c, dx, dy, r, ART.radF(c, dx - r * .3, dy - r * .5, dx, dy, r * 1.2, "#FFFFFF", "#F2F9FF"));
      c.restore();
    }
  }
  function hills(c) {
    c.beginPath(); c.moveTo(0, Y(600));
    for (let x = 0; x <= LW; x += 40) c.lineTo(x, Y(560 + Math.sin(x / 90) * 22 + Math.sin(x / 37) * 6));
    c.lineTo(LW, Y(700)); c.lineTo(0, Y(700)); c.closePath(); c.fillStyle = ART.lin(c, 0, Y(540), 0, Y(660), "#A8DE94", "#8CCB7C"); c.fill();
    for (const [x, y, r] of [[26, 560, 70], [118, 590, 56], [640, 548, 78], [712, 590, 60]]) tree(c, x, Y(y), r);
    c.fillStyle = ART.lin(c, 0, Y(620), 0, Y(720), "#86CF72", "#6BB85C"); c.fillRect(0, Y(624), LW, 100);
  }
  function tree(c, x, y, r) {
    ART.box(c, x - 8, y, 16, r * 1.1, 6, ART.lin(c, x - 8, 0, x + 8, 0, "#8A5A34", "#6A4024"));
    for (const [dx, dy, k] of [[-.55, .1, .7], [.55, .15, .68], [0, -.35, .85], [0, .2, .9]]) {
      const cx = x + dx * r, cy = y + dy * r, rr = r * k;
      ART.dot(c, cx, cy, rr, ART.radF(c, cx - rr * .35, cy - rr * .45, cx, cy, rr * 1.2, "#9BE07E", "#5DB24E", "#3F8C38"));
    }
  }
  function sidewalk(c) {
    const top = Y(716);
    c.fillStyle = ART.lin(c, 0, top, 0, LH, "#F4E6EA", "#E7D2D9"); c.fillRect(0, top, LW, LH - top);
    c.fillStyle = "#FFF6F8"; c.fillRect(0, top - 6, LW, 8); c.fillStyle = "rgba(150,100,120,.25)"; c.fillRect(0, top + 2, LW, 3);
    c.save(); c.beginPath(); c.rect(0, top, LW, LH - top); c.clip();
    c.strokeStyle = "rgba(160,110,130,.28)"; c.lineWidth = 2;
    for (let k = 1; k < 12; k++) { const y = top + Math.pow(k, 1.5) * 16; c.beginPath(); c.moveTo(0, y); c.lineTo(LW, y); c.stroke(); }
    const vx = 360, vy = Y(420);
    for (let i = -8; i <= 16; i++) { const bx = -600 + i * 120; c.beginPath(); c.moveTo(lerp(vx, bx, (top - vy) / (LH + 200 - vy)), top); c.lineTo(bx, LH + 200); c.stroke(); }
    c.restore();
  }

  function kioskBack(c) {
    // side wall (we see the right side, so the stand feels solid)
    c.beginPath(); c.moveTo(500, Y(300)); c.lineTo(588, Y(268)); c.lineTo(588, Y(750)); c.lineTo(500, Y(790)); c.closePath();
    c.fillStyle = ART.lin(c, 500, 0, 588, 0, "#E86A93", "#C94E77"); c.fill();
    c.strokeStyle = "rgba(120,20,60,.18)"; c.lineWidth = 2;
    for (let i = 1; i < 5; i++) { const x = 500 + i * 17.6, y0 = Y(300) - i * 6.4, y1 = Y(790) - i * 8; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
    // front wall
    c.fillStyle = ART.lin(c, 36, 0, 500, 0, "#FFB6CB", "#FFC7D7", "#FF9FBD"); c.fillRect(36, Y(300), 464, 490);
    c.fillStyle = "rgba(255,255,255,.35)"; for (let x = 52; x < 500; x += 36) c.fillRect(x, Y(300), 3, 490);
    // window: inside of the stand
    const wx = 68, wy = Y(378), ww = 400, wh = 250;
    c.save(); ART.rr(c, wx, wy, ww, wh, 18); c.clip();
    c.fillStyle = ART.lin(c, 0, wy, 0, wy + wh, "#D2F4EF", "#A9E2D8"); c.fillRect(wx, wy, ww, wh);
    c.fillStyle = "rgba(255,255,255,.35)"; for (let x = wx + 10; x < wx + ww; x += 28) c.fillRect(x, wy, 12, wh);
    // shelf with cone stacks and topping jars
    ART.box(c, wx + 14, wy + 74, ww - 28, 10, 3, ART.lin(c, 0, wy + 74, 0, wy + 84, "#E9B77B", "#B98548"));
    for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) {
      const x = wx + 44 + s * 34, y = wy + 72 - k * 9;
      c.beginPath(); c.moveTo(x - 12, y - 18); c.lineTo(x + 12, y - 18); c.lineTo(x, y); c.closePath(); c.fillStyle = k % 2 ? "#E6A45A" : "#D38C42"; c.fill();
    }
    const jars = [["#FF4F86", "#FFE14D"], ["#E0183C", "#E0183C"], ["#4A2614", "#6B3A20"], ["#7C6CF2", "#2DBFAE"]];
    jars.forEach(([a, b], i) => {
      const x = wx + 200 + i * 46, y = wy + 72;
      ART.box(c, x - 16, y - 40, 32, 40, 8, "rgba(255,255,255,.55)");
      c.save(); ART.rr(c, x - 14, y - 26, 28, 24, 6); c.clip();
      for (let j = 0; j < 14; j++) ART.dot(c, x - 12 + (j * 7) % 26, y - 22 + (j * 5) % 20, 3.2, j % 2 ? a : b);
      c.restore();
      ART.box(c, x - 17, y - 46, 34, 9, 4, "#FF9DBC");
    });
    // chalk menu
    ART.box(c, wx + ww - 100, wy + 104, 84, 100, 10, "#3B3445", "#B98548", 5);
    ART.text(c, "MENU", wx + ww - 58, wy + 124, 17, "#FFFFFF", 700);
    FLAVORS.forEach((f, i) => { ART.dot(c, wx + ww - 82 + (i % 3) * 24, wy + 152 + Math.floor(i / 3) * 28, 9, f.c); });
    // twinkly lights
    c.beginPath(); c.moveTo(wx, wy + 16); c.quadraticCurveTo(wx + ww / 2, wy + 50, wx + ww, wy + 16); c.strokeStyle = "#5A4A5E"; c.lineWidth = 2; c.stroke();
    for (let i = 1; i < 12; i++) {
      const u = i / 12, x = wx + ww * u, y = wy + 16 + 34 * 2 * u * (1 - u) + 6;
      const on = (Math.sin(T * 3 + i * 1.7) + 1) / 2, col = ["#FFE066", "#FF8FB1", "#8AF0DF"][i % 3];
      ART.dot(c, x, y + 2, 12, ART.rad(c, x, y + 2, 12, `rgba(255,240,200,${.25 + on * .35})`, "rgba(255,240,200,0)"));
      ART.ell(c, x, y + 2, 4.5, 6, col);
    }
    c.restore();
    ART.rr(c, wx, wy, ww, wh, 18); c.strokeStyle = "#FFFFFF"; c.lineWidth = 9; c.stroke();
  }

  function counter(c) {
    // top slab
    c.beginPath(); c.moveTo(18, Y(632)); c.lineTo(44, Y(604)); c.lineTo(500, Y(604)); c.lineTo(596, Y(572)); c.lineTo(596, Y(588)); c.lineTo(518, Y(632)); c.closePath();
    c.fillStyle = ART.lin(c, 0, Y(572), 0, Y(632), "#FFFFFF", "#F1E8EE"); c.fill();
    c.fillStyle = ART.lin(c, 0, Y(632), 0, Y(650), "#F6DDE7", "#D9B4C4"); c.fillRect(18, Y(632), 500, 18);
    c.beginPath(); c.moveTo(518, Y(632)); c.lineTo(596, Y(588)); c.lineTo(596, Y(604)); c.lineTo(518, Y(650)); c.closePath(); c.fillStyle = "#C7A0B2"; c.fill();
    // front with freezer
    c.fillStyle = ART.lin(c, 36, 0, 500, 0, "#63CFC3", "#86E2D7", "#4DBBAF"); c.fillRect(36, Y(650), 464, 140);
    c.beginPath(); c.moveTo(500, Y(650)); c.lineTo(588, Y(604)); c.lineTo(588, Y(750)); c.lineTo(500, Y(790)); c.closePath(); c.fillStyle = "#3E9D93"; c.fill();
    const gx = 58, gy = Y(664), gw = 420, gh = 100;
    ART.box(c, gx - 6, gy - 6, gw + 12, gh + 12, 16, ART.lin(c, 0, gy, 0, gy + gh, "#F4F7FB", "#B8C2D0"));
    c.save(); ART.rr(c, gx, gy, gw, gh, 12); c.clip();
    c.fillStyle = ART.lin(c, 0, gy, 0, gy + gh, "#E9F8FF", "#BFE2F2"); c.fillRect(gx, gy, gw, gh);
    FLAVORS.forEach((f, i) => {
      const x = gx + 35 + i * 70, y = gy + 50;
      ART.box(c, x - 30, y, 60, 44, 6, ART.lin(c, x - 30, 0, x + 30, 0, "#C4CBD8", "#F4F6FA", "#AEB6C4"));
      ART.ell(c, x, y, 30, 10, "#AEB6C4");
      c.beginPath(); c.ellipse(x, y - 3, 27, 16, 0, Math.PI, Math.PI * 2); c.ellipse(x, y - 1, 27, 7, 0, 0, Math.PI);
      c.fillStyle = ART.radF(c, x - 8, y - 14, x, y - 4, 30, f.h, f.c, f.d); c.fill();
      if (f.chips) for (const [dx, dy] of [[-10, -8], [6, -12], [14, -4], [-2, -3]]) ART.dot(c, x + dx, y + dy, 2.2, "#3A1F10");
      ART.text(c, SHORT[f.k], x, y + 28, 14, "#5A6070", 700);
    });
    c.fillStyle = "rgba(255,255,255,.4)";
    for (const x0 of [gx + 40, gx + 230]) { c.beginPath(); c.moveTo(x0, gy); c.lineTo(x0 + 40, gy); c.lineTo(x0 - 20, gy + gh); c.lineTo(x0 - 60, gy + gh); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = "#3FA89C"; c.fillRect(36, Y(772), 464, 18);
  }

  function awning(c) {
    const x0t = 24, x1t = 512, yt = Y(284), x0b = 4, x1b = 532, yb = Y(360), n = 10;
    // side of the awning
    c.beginPath(); c.moveTo(x1t, yt); c.lineTo(598, Y(256)); c.lineTo(612, Y(326)); c.lineTo(x1b, yb); c.closePath(); c.fillStyle = "#D9567F"; c.fill();
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      c.beginPath(); c.moveTo(lerp(x0t, x1t, u0), yt); c.lineTo(lerp(x0t, x1t, u1), yt); c.lineTo(lerp(x0b, x1b, u1), yb); c.lineTo(lerp(x0b, x1b, u0), yb); c.closePath();
      c.fillStyle = i % 2 ? "#FFFFFF" : "#FF6F9C"; c.fill();
    }
    c.fillStyle = ART.lin(c, 0, yt, 0, yb, "rgba(120,20,60,.22)", "rgba(120,20,60,0)"); c.fillRect(0, yt, 540, yb - yt);
    // scallops
    for (let i = 0; i < n; i++) {
      const cx = lerp(x0b, x1b, (i + .5) / n), w = (x1b - x0b) / n / 2;
      ART.ell(c, cx, yb + 6, w, 16, "rgba(90,20,50,.18)");
      c.beginPath(); c.ellipse(cx, yb, w, 18, 0, 0, Math.PI); c.fillStyle = i % 2 ? "#FFFFFF" : "#FF6F9C"; c.fill();
    }
    c.fillStyle = "#E85A88"; c.fillRect(x0t - 4, yt - 8, x1t - x0t + 8, 10);
  }

  function sign(c) {
    const x = 74, y = Y(148), w = 400, h = 112;
    ART.box(c, 150, y + h - 4, 12, 40, 4, "#B98548"); ART.box(c, 386, y + h - 4, 12, 40, 4, "#B98548");
    ART.box(c, x + 8, y + 12, w, h, 30, "#C94E77");
    ART.box(c, x, y, w, h, 30, ART.lin(c, 0, y, 0, y + h, "#FFFFFF", "#FFE6EF"), "#FF6F9C", 6);
    c.font = `400 70px ${DISPLAY}`; c.textBaseline = "middle"; c.textAlign = "left";
    const a = "Frozen", b = "bergs", wa = c.measureText(a).width, wb = c.measureText(b).width, tx = x + w / 2 - (wa + wb) / 2, ty = y + h / 2 + 4;
    for (let d = 6; d > 0; d--) { c.fillStyle = d > 3 ? "#8E2F55" : "#B8406A"; c.fillText(a, tx + d * .5, ty + d); c.fillStyle = d > 3 ? "#16706A" : "#1E9487"; c.fillText(b, tx + wa + d * .5, ty + d); }
    c.lineWidth = 6; c.strokeStyle = "#FFFFFF"; c.lineJoin = "round"; c.strokeText(a, tx, ty); c.strokeText(b, tx + wa, ty);
    c.fillStyle = ART.lin(c, 0, ty - 30, 0, ty + 30, "#FF86AE", "#FF3D7A"); c.fillText(a, tx, ty);
    c.fillStyle = ART.lin(c, 0, ty - 30, 0, ty + 30, "#5EE8D5", "#1FAE9E"); c.fillText(b, tx + wa, ty);
    const sp = (Math.sin(T * 2) + 1) / 2;
    c.save(); c.translate(x + w - 34, y + 26); c.rotate(T); c.globalAlpha = .4 + sp * .6;
    c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 13, a2 = i * Math.PI / 4; c.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); } c.closePath(); c.fillStyle = "#FFE066"; c.fill(); c.restore();
  }

  function statue(c) {
    const bob = Math.sin(T * 1.6) * 3;
    CONE_ART.cone(c, { cone: "waffle", scoops: ["straw", "choc"], sauce: null, tops: ["sprinkles", "cherry"] }, 560, Y(192) + bob, .66, T);
  }

  // ---------- characters ----------
  function scooperPose() {
    const r = G.result;
    if (G.phase === "give") return { pose: "wave", face: 1 };
    if (G.phase === "react" && r) {
      if (r.stars === 3) return { pose: "jump", face: 1 };
      if (r.stars === 2) return { pose: "cheer", face: 1 };
      if (r.stars === 1) return { pose: "idle", face: 1, exp: "annoyed" };
      return { pose: "idle", face: 1, exp: "O" };
    }
    if (G.phase === "idle" || G.phase === "closed") return { pose: "wave", face: 1 };
    return { pose: "idle", face: 1, look: [1, 0] };
  }
  // Max scoops too: he's drawn with the family art, stirring with his spoon
  function maxAct(p) { return p.pose === "jump" || p.pose === "cheer" ? "happy" : p.pose === "wave" ? "reach" : p.exp ? "peek" : "stir"; }
  function drawScooper(c) {
    if (!G.scooper) return;
    if (G.scooper === "max") {
      const p = scooperPose();
      ART.max(c, 262, Y(622) + 36, 2.3, { t: T, act: maxAct(p), dir: 1, blink: T % 4.1 < .12, look: [1, 0], prop: "spoon", expr: p.exp === "annoyed" ? "meh" : undefined });
      return;
    }
    const K = KIDS_ART.KIDS[G.scooper];
    KIDS_ART.draw(c, G.scooper, 262, Y(622) + K.L * KID_S * .45, KID_S, scooperPose(), T);
  }

  function custX() {
    const home = 620;
    if (G.phase === "in") return lerp(LW + 180, home, ease(G.pt / .9));
    if (G.phase === "out") return lerp(home, LW + 200, ease(G.pt / .9));
    return home;
  }
  function drawCustomer(c) {
    const cu = G.cust; if (!cu) return;
    const P = PEOPLE[cu], x = custX(), y = Y(946);
    const walking = G.phase === "in" || G.phase === "out";
    const r = G.phase === "react" || G.phase === "out" ? G.result : null;
    const mood = r ? (r.stars >= 2 ? "happy" : r.stars === 1 ? "meh" : "sad") : "wait";
    const blink = (T + x * .01) % 4.1 < .12;
    if (P.kid) {
      let pose = { pose: "idle", face: -1, look: [1, -.3] };
      if (walking) pose = { pose: "run", face: G.phase === "out" ? 1 : -1, ph: T * 14 };
      else if (mood === "happy") pose = r.stars === 3 ? { pose: "jump", face: -1 } : { pose: "cheer", face: -1 };
      else if (mood === "meh") pose = { pose: "lookUp", face: -1 };
      else if (mood === "sad") pose = cu === "ellie" ? { pose: "knees", face: -1 } : { pose: "hips", face: -1 };
      KIDS_ART.draw(c, cu, x, y, KID_S, pose, T);
    } else if (cu === "ariel") {
      ART.ariel(c, x, y, P.s, { t: T, dir: G.phase === "out" ? 1 : -1, moving: walking, walkPh: T * 17, blink,
        anim: mood === "happy" ? "happy" : mood === "meh" ? "shrug" : mood === "sad" ? "wipe" : null, animT: T, carry: r ? "none" : null });
    } else if (cu === "max") {
      ART.max(c, x, y, P.s, { t: T, act: walking ? "run" : mood === "happy" ? "happy" : "sit", dir: G.phase === "out" ? 1 : -1, ph: T * 14,
        expr: mood === "happy" ? "grin" : mood === "sad" ? "wail" : mood === "meh" ? "meh" : "sly", blink, look: [-1.5, 0] });
    } else {
      ART[cu](c, x, y, P.s, { t: T, blink, plate: "none", mood: 0,
        state: mood === "happy" ? "eating" : mood === "meh" ? "wrong" : mood === "sad" ? "outburst" : "idle" });
    }
    if (r) {
      const dir = G.phase === "out" && (P.kid || cu === "ariel" || cu === "max") ? -1 : 1;
      CONE_ART.cone(c, r.build, x + P.hold[0] * dir, y + P.hold[1], .36, T, { rot: -.12 * dir });
    }
  }

  // ---------- bubbles ----------
  function wrap(c, str, maxW) {
    const words = str.split(" "), lines = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  // The order ticket hangs at the top of the scene, big and easy to read.
  function drawTicket(c) {
    const cu = G.cust; if (!cu) return;
    const showOrder = G.phase === "order" || G.phase === "give" || (G.phase === "in" && G.pt > .5);
    const showResult = G.phase === "react" && G.result;
    if (!showOrder && !showResult) return;
    const P = PEOPLE[cu], x = 18, w = LW - 36, y = 16, h = Math.min(DY - 34, 330);
    const swing = Math.sin(T * 1.8) * .006;
    c.save(); c.translate(LW / 2, 0); c.rotate(swing); c.translate(-LW / 2, 0);
    // string + clips
    for (const cx of [120, LW - 120]) { c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, y + 8); c.strokeStyle = "#8C6A7E"; c.lineWidth = 3; c.stroke(); }
    c.save(); c.shadowColor = "rgba(40,20,60,.35)"; c.shadowBlur = 26; c.shadowOffsetY = 10;
    ART.rr(c, x, y, w, h, 26); c.fillStyle = "#FFFFFF"; c.fill(); c.restore();
    c.save(); ART.rr(c, x, y, w, h, 26); c.clip();
    c.fillStyle = ART.lin(c, 0, y, 0, y + 64, "#FF6F9C", "#FF4F86"); c.fillRect(x, y, w, 64);
    c.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 20; i++) c.fillRect(x + i * 44, y, 20, 64);
    c.restore();
    for (const cx of [120, LW - 120]) { ART.box(c, cx - 16, y - 6, 32, 22, 6, ART.lin(c, 0, y - 6, 0, y + 16, "#E2E6EE", "#A9B1BF")); }
    if (showOrder) {
      const o = G.order;
      ART.text(c, o.surprise ? `${P.name} says:` : `${P.name}'s order`, x + 28, y + 34, 38, "#FFFFFF", 700, "left");
      // patience bar in the header
      const pw = 200, px = x + w - pw - 26, py = y + 25;
      ART.box(c, px, py, pw, 18, 9, "rgba(255,255,255,.4)");
      const pc = G.patience > .5 ? "#7BF0DA" : G.patience > .2 ? "#FFD35C" : "#FFFFFF";
      if (G.patience > .02) ART.box(c, px, py, pw * G.patience, 18, 9, pc);
      const bodyY = y + 64, bodyH = h - 64;
      if (o.surprise) {
        CONE_ART.cone(c, emptyBuild(), x + 100, bodyY + bodyH * .52, Math.min(.62, bodyH / 330), T, { mystery: true });
        c.font = `700 40px ${FONT}`;
        wrap(c, G.surpriseLine, w - 240).forEach((l, i) => ART.text(c, l, x + 200, bodyY + 64 + i * 50, 40, "#3B2342", 700, "left"));
      } else {
        const n = o.scoops.length, tall = 150 + 44 * (1.36 + 1.28 * (n - 1)) + (o.tops.includes("whip") ? 70 : 0) + (o.tops.includes("cherry") ? 34 : 0);
        const cs = Math.min(.62, (bodyH - 26) / tall);
        CONE_ART.cone(c, o, x + 96, bodyY + 12 + (tall - 150) * cs, cs, T);
        const items = orderItems(o), cols = items.length > 5 ? 2 : 1;
        const rows = Math.ceil(items.length / cols), lh = Math.min(50, (bodyH - 24) / rows), fs = Math.min(38, lh * .8);
        items.forEach((it, i) => {
          const col = Math.floor(i / rows), row = i % rows;
          const ix = x + 196 + col * 250, iy = bodyY + 14 + lh * (row + .5);
          ART.dot(c, ix, iy, fs * .38, it.c); c.beginPath(); c.arc(ix, iy, fs * .38, 0, Math.PI * 2); c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 2; c.stroke();
          ART.text(c, it.t, ix + fs * .62, iy + 1, fs, "#3B2342", 700, "left");
        });
      }
    } else {
      const r = G.result;
      ART.text(c, P.name, x + 28, y + 34, 38, "#FFFFFF", 700, "left");
      ART.text(c, "+" + money(r.tip), x + w - 28, y + 34, 38, "#FFFFFF", 700, "right");
      c.font = `700 44px ${FONT}`;
      const lines = wrap(c, r.line, w - 60).slice(0, 2);
      const bodyY = y + 64, bodyH = h - 64;
      lines.forEach((l, i) => ART.text(c, l, LW / 2, bodyY + bodyH * .3 + (i - (lines.length - 1) / 2) * 52, 44, "#3B2342", 700));
      for (let i = 0; i < 3; i++) star(c, LW / 2 + (i - 1) * 96, bodyY + bodyH * .74, 38, i < r.stars, Math.min(1, Math.max(0, (G.pt / SPEED - i * .18) * 4)));
    }
    c.restore();
  }
  // A small "Hi!" next to the customer while they wait.
  function drawSpeech(c) {
    if (!G.cust || G.phase !== "order" || !G.greet) return;
    const P = PEOPLE[G.cust], x = custX(), hy = Y(946) - P.head + 30;
    c.font = `700 30px ${FONT}`;
    const tw = c.measureText(G.greet).width, w = tw + 44, h = 60, bx = Math.max(8, x - 70 - w), by = hy - 10 + Math.sin(T * 2.4) * 3;
    c.save(); c.shadowColor = "rgba(60,20,50,.25)"; c.shadowBlur = 14; c.shadowOffsetY = 5;
    ART.rr(c, bx, by, w, h, 30); c.fillStyle = "#FFFFFF"; c.fill(); c.restore();
    c.beginPath(); c.moveTo(bx + w - 30, by + 16); c.lineTo(bx + w + 26, by + 34); c.lineTo(bx + w - 26, by + h - 12); c.closePath(); c.fillStyle = "#FFFFFF"; c.fill();
    ART.text(c, G.greet, bx + w / 2, by + h / 2 + 1, 30, "#3B2342", 700);
  }
  function star(c, x, y, r, on, k) {
    c.save(); c.translate(x, y); if (on) c.scale(k, k);
    c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
    c.fillStyle = on ? ART.lin(c, 0, -r, 0, r, "#FFE27A", "#FFAA1A") : "#EFE3E9"; c.fill();
    if (on) { c.lineWidth = 3; c.strokeStyle = "#E08A00"; c.stroke(); }
    c.restore();
  }

  function drawFlight(c) {
    if (G.phase !== "give" || !G.result) return;
    const k = ease(G.pt / .8), P = PEOPLE[G.cust];
    const x0 = 360, y0 = Y(560), x1 = custX() + P.hold[0], y1 = Y(946) + P.hold[1];
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 120;
    CONE_ART.cone(c, G.result.build, x, y, lerp(.5, .36, k), T, { rot: Math.sin(k * Math.PI) * .3 });
  }
  function drawFloats(c) {
    for (const f of G.floats) {
      const a = Math.min(1, 2 - f.t * 1.3);
      c.save(); c.globalAlpha = Math.max(0, a);
      c.font = `400 56px ${DISPLAY}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 8; c.strokeStyle = "#FFFFFF"; c.lineJoin = "round"; c.strokeText(f.s, f.x, f.y - f.t * 70);
      c.fillStyle = "#1FAE9E"; c.fillText(f.s, f.x, f.y - f.t * 70);
      c.restore();
    }
  }

  function render() {
    const c = ctx;
    sky(c); hills(c); sidewalk(c);
    ART.shadow(c, 300, Y(792), 330, 20, .25);
    statue(c);
    kioskBack(c);
    drawScooper(c);
    counter(c);
    awning(c);
    sign(c);
    drawCustomer(c);
    drawFlight(c);
    drawSpeech(c);
    drawTicket(c);
    drawFloats(c);
  }

  // ---------- flow ----------
  function setPhase(p) { G.phase = p; G.pt = 0; }
  function nextCustomer() {
    if (!G.queue.length) {
      G.queue = shuffle(Object.keys(PEOPLE).filter((k) => k !== G.scooper));
      const force = /cust=(\w+)/.exec(location.hash); if (force && PEOPLE[force[1]]) G.queue = [force[1]];   // test hook
      if (G.queue[0] === G.cust) G.queue.push(G.queue.shift());
    }
    G.cust = G.queue.shift();
    const surprise = G.served > 0 && Math.random() < .25;
    G.order = makeOrder(G.day, surprise);
    G.greet = surprise ? "" : pick(LINES.greet).replace("{me}", me());
    G.surpriseLine = pick(LINES.surprise).replace("{me}", me());
    G.patience = 1; G.result = null;
    setPhase("in");
    renderHud();
  }

  function openBuilder() {
    if (G.phase !== "order") return;
    G.build = emptyBuild(); G.history = []; G.step = 0; G.dropT = 1; G.touchedSauce = false;
    $("#builder").hidden = false;
    renderOrderCard(); renderSteps(); renderOpts(); updateButtons();
    sfx.open(); sizePreview();
  }

  function finish() {
    const b = G.build;
    if (!b.cone) { sfx.nope(); goStep(0); return toast("Pick a cone first!"); }
    if (!b.scoops.length) { sfx.nope(); goStep(1); return toast("Add at least one scoop!"); }
    $("#builder").hidden = true;
    const score = grade(G.order, b), stars = starsFor(score);
    const speed = stars > 0 ? (G.patience > .5 ? 1 : G.patience > .2 ? .5 : 0) : 0;
    const tip = [.25, 1.5, 2.5, 4][stars] + speed + (G.order.surprise ? b.scoops.length * .25 : 0);
    let line = pick(LINES[(G.order.surprise ? "s" : "") + stars]);
    if (stars >= 2) line += " " + (Math.random() < .5 ? `Thanks, ${me()}!` : PEOPLE[G.cust].thanks);
    G.result = { build: structuredClone(b), stars, tip, line };
    G.gallery.push({ build: G.result.build, stars });
    setPhase("give"); sfx.whoosh();
    $("#makeBtn").disabled = true;
  }

  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    T += dt;
    const sdt = dt / SPEED;
    G.pt += sdt;
    if (G.phase === "in" && G.pt > .9) { setPhase("order"); sfx.hi(); $("#makeBtn").disabled = false; }
    if (G.phase === "order") G.patience = Math.max(0, G.patience - sdt / (60 - Math.min(24, G.day * 4)));
    if (G.phase === "give" && G.pt > .8) {
      setPhase("react");
      const r = G.result;
      if (r.stars === 0) sfx.sad(); else if (r.stars === 3) sfx.yay(); else sfx.cash();
      G.tips += r.tip; G.dayTips += r.tip; G.dayStars += r.stars;
      try { localStorage.setItem("frozenbergs.tips", G.tips.toFixed(2)); } catch { }
      G.floats.push({ s: "+" + money(r.tip), x: custX() - 40, y: Y(946) - PEOPLE[G.cust].head - 50, t: 0 });
      renderHud();
    }
    if (G.phase === "react" && G.pt > 2.8) setPhase("out");
    if (G.phase === "out" && G.pt > .9) {
      G.served++; G.cust = null; G.result = null; renderHud();
      if (G.served >= PER_DAY) { setPhase("closed"); endDay(); } else nextCustomer();
    }
    for (const f of G.floats) f.t += dt;
    G.floats = G.floats.filter((f) => f.t < 1.6);
    G.dropT = Math.min(1, G.dropT + dt * 3.2);

    render();
    if (!$("#builder").hidden) renderPreview();
    if (!$("#startOverlay").hidden) renderPickers();
    requestAnimationFrame(tick);
  }

  // ---------- builder UI ----------
  const STEPS = [{ k: "cone", n: "Cone" }, { k: "scoops", n: "Scoops" }, { k: "sauce", n: "Sauce" }, { k: "tops", n: "Toppings" }];
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  function paintIcon(cvs, kind, key) {
    const d = dpr(), w = cvs.clientWidth || 76, h = cvs.clientHeight || 70;
    cvs.width = w * d; cvs.height = h * d;
    const c = cvs.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
    const s = Math.min(w / 110, h / 100);
    CONE_ART.icon(c, kind, key, w / 2, h / 2 + (kind === "cone" ? 4 : 6) * s, s * (kind === "cone" ? .78 : .95), 0);
  }
  function goStep(i) { G.step = i; renderSteps(); renderOpts(); updateButtons(); }
  function stepDone(i) {
    const b = G.build;
    return [!!b.cone, b.scoops.length > 0, b.sauce !== null || G.touchedSauce, b.tops.length > 0][i];
  }
  function renderSteps() {
    $("#steps").innerHTML = STEPS.map((s, i) => `<button class="step${stepDone(i) ? " done" : ""}" data-step="${i}" aria-current="${i === G.step}"><b>${i + 1}</b>${s.n}</button>`).join("");
  }
  function optionList() {
    const st = STEPS[G.step].k, b = G.build;
    if (st === "cone") return CONES.map((o) => ({ kind: "cone", key: o.k, n: o.n, on: b.cone === o.k }));
    if (st === "scoops") return FLAVORS.map((o) => ({ kind: "flavor", key: o.k, n: o.n, count: b.scoops.filter((f) => f === o.k).length }));
    if (st === "sauce") return SAUCES.map((o) => ({ kind: "sauce", key: o.k, n: o.n, on: G.touchedSauce && b.sauce === o.k }));
    return TOPS.map((o) => ({ kind: "top", key: o.k, n: o.n, on: b.tops.includes(o.k) }));
  }
  function renderOpts() {
    const opts = optionList();
    $("#opts").innerHTML = opts.map((o, i) => `<button class="opt" data-i="${i}" aria-pressed="${!!(o.on || o.count)}"><canvas aria-hidden="true"></canvas><span>${o.n}</span>${o.count > 0 ? `<b class="n">${o.count}</b>` : ""}</button>`).join("");
    [...$("#opts").querySelectorAll("canvas")].forEach((cvs, i) => paintIcon(cvs, opts[i].kind, opts[i].key));
  }
  function updateButtons() {
    $("#undoBtn").disabled = !G.history.length;
    $("#nextBtn").style.visibility = G.step < STEPS.length - 1 ? "visible" : "hidden";
    renderOrderList();
  }
  function renderOrderCard() {
    const o = G.order, P = PEOPLE[G.cust];
    $("#orderWho").textContent = o.surprise ? `${P.name} says:` : `${P.name} wants:`;
    const cvs = $("#orderCv"), d = dpr(), w = cvs.clientWidth || 64, h = cvs.clientHeight || 92;
    cvs.width = w * d; cvs.height = h * d;
    const c = cvs.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
    const s = h / 440;
    CONE_ART.cone(c, o.surprise ? emptyBuild() : o, w / 2, h * (o.surprise ? .5 : .62), o.surprise ? s * 1.3 : s * 1.05, 0, { mystery: o.surprise });
    renderOrderList();
  }
  function renderOrderList() {
    const o = G.order;
    if (o.surprise) { $("#orderBody").innerHTML = `<div class="surprise">${G.surpriseLine}</div>`; return; }
    $("#orderBody").innerHTML = `<ul>${orderItems(o).map((it) => `<li class="${itemDone(it, G.build) ? "ok" : ""}"><i style="background:${it.c}"></i>${it.t}</li>`).join("")}</ul>`;
  }
  function sizePreview() {
    const cvs = $("#prevCv"), d = dpr();
    cvs.width = cvs.clientWidth * d; cvs.height = cvs.clientHeight * d;
  }
  function renderPreview() {
    const cvs = $("#prevCv"), c = cvs.getContext("2d"), d = dpr();
    const w = cvs.width / d, h = cvs.height / d;
    if (!w || !h) return;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h * .55); c.rotate(T * .15);
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -h); c.lineTo(40, -h); c.closePath(); c.fillStyle = "rgba(255,255,255,.35)"; c.fill(); }
    c.restore();
    const s = Math.min(h / 470, w / 260), px = w / 2, py = h - 22;
    ART.ell(c, px, py + 6, 90 * s + 30, 16, "rgba(120,40,80,.18)");
    ART.ell(c, px, py, 90 * s + 24, 14, ART.lin(c, px - 100, 0, px + 100, 0, "#D8C7D6", "#FFFFFF", "#C9B4C6"));
    CONE_ART.cone(c, G.build, px, py - 156 * s, s, T, { dropT: G.dropT });
  }

  function push() { G.history.push({ b: structuredClone(G.build), s: G.touchedSauce }); }
  function choose(o) {
    const b = G.build;
    if (o.kind === "cone") { push(); b.cone = o.key; sfx.tap(); setTimeout(() => G.step === 0 && goStep(1), 280); }
    else if (o.kind === "flavor") {
      if (b.scoops.length >= MAX_SCOOPS) { sfx.nope(); return toast("4 scoops is the max!"); }
      push(); b.scoops.push(o.key); G.dropT = 0; sfx.plop();
    } else if (o.kind === "sauce") { push(); b.sauce = o.key; G.touchedSauce = true; sfx.sauce(); setTimeout(() => G.step === 2 && goStep(3), 280); }
    else { push(); b.tops = b.tops.includes(o.key) ? b.tops.filter((x) => x !== o.key) : TOP_ORDER.filter((x) => x === o.key || b.tops.includes(x)); sfx.tap(); }
    renderSteps(); renderOpts(); updateButtons();
  }

  $("#opts").addEventListener("click", (e) => { const t = e.target.closest(".opt"); if (t) choose(optionList()[+t.dataset.i]); });
  $("#steps").addEventListener("click", (e) => { const t = e.target.closest(".step"); if (t) { sfx.tap(); goStep(+t.dataset.step); } });
  $("#nextBtn").addEventListener("click", () => { sfx.tap(); goStep(Math.min(STEPS.length - 1, G.step + 1)); });
  $("#undoBtn").addEventListener("click", () => {
    if (!G.history.length) return;
    const h = G.history.pop(); G.build = h.b; G.touchedSauce = h.s; sfx.tap(); renderSteps(); renderOpts(); updateButtons();
  });
  $("#doneBtn").addEventListener("click", finish);
  $("#makeBtn").addEventListener("click", openBuilder);

  // ---------- HUD / overlays ----------
  function renderHud() {
    $("#dayLbl").textContent = `Day ${G.day}`;
    $("#tipLbl").textContent = money(G.tips);
    $("#coneDots").innerHTML = Array.from({ length: PER_DAY }, (_, i) => `<i class="${i < G.served ? "on" : ""}"></i>`).join("");
  }
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  const RANKS = [[.9, "Legendary Scooper!"], [.75, "Sundae Superstar!"], [.55, "Cone Captain!"], [.35, "Scoop Apprentice!"], [0, "Melty Beginner!"]];
  function endDay() {
    const ratio = G.dayStars / (PER_DAY * 3);
    $("#dayTitle").textContent = `Day ${G.day} done!`;
    $("#dayRank").textContent = `${RANKS.find(([m]) => ratio >= m)[1]} Great job, ${me()}!`;
    $("#sStars").textContent = `${G.dayStars}/${PER_DAY * 3}`;
    $("#sTips").textContent = money(G.dayTips);
    $("#sTotal").textContent = money(G.tips);
    $("#gallery").innerHTML = G.gallery.map((g) => `<figure><canvas></canvas><figcaption>${"★".repeat(g.stars)}${"☆".repeat(3 - g.stars)}</figcaption></figure>`).join("");
    $("#nextDayBtn").textContent = `Open Day ${G.day + 1}`;
    $("#dayOverlay").hidden = false;
    if (window.RosenbergBridge) RosenbergBridge.report({ score: G.dayStars, stars: ratio >= .75 ? 3 : ratio >= .5 ? 2 : 1 });
    [...$("#gallery").querySelectorAll("canvas")].forEach((cvs, i) => {
      const d = dpr(), w = cvs.clientWidth, h = cvs.clientHeight; cvs.width = w * d; cvs.height = h * d;
      const c = cvs.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
      CONE_ART.cone(c, G.gallery[i].build, w / 2, h * .62, h / 440, 0);
    });
    sfx.yay();
  }
  $("#nextDayBtn").addEventListener("click", () => {
    $("#dayOverlay").hidden = true;
    Object.assign(G, { day: G.day + 1, served: 0, dayTips: 0, dayStars: 0, gallery: [] });
    nextCustomer();
  });

  function renderPickers() {
    [...$("#pickers").querySelectorAll("canvas")].forEach((cvs) => {
      const id = cvs.dataset.id, d = dpr(), w = cvs.clientWidth, h = cvs.clientHeight;
      if (!w) return;
      if (cvs.width !== Math.round(w * d)) { cvs.width = Math.round(w * d); cvs.height = Math.round(h * d); }
      const c = cvs.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
      if (id === "max") ART.max(c, w / 2, h - 10, h / 150, { t: T, act: G.scooper === id ? "happy" : "stir", dir: 1, blink: T % 4.1 < .12, prop: "spoon" });
      else KIDS_ART.draw(c, id, w / 2, h - 10, h / 128, G.scooper === id ? { pose: "jump", face: 1 } : { pose: "wave", face: 1 }, T);
    });
  }
  $("#pickers").innerHTML = Object.entries(SCOOPERS).map(([k, n]) => `<button class="pick" data-scooper="${k}" aria-pressed="${G.scooper === k}"><canvas data-id="${k}"></canvas><b>${n}</b></button>`).join("");
  function syncStart() {
    $("#startBtn").disabled = !G.scooper;
    $("#startBtn").textContent = G.scooper ? `Open the stand!` : "Pick a scooper";
    $("#pickers").querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b.dataset.scooper === G.scooper));
  }
  $("#pickers").addEventListener("click", (e) => {
    const t = e.target.closest(".pick"); if (!t) return;
    G.scooper = t.dataset.scooper; sfx.tap(); syncStart();
    try { localStorage.setItem("frozenbergs.scooper", G.scooper); } catch { }
  });
  $("#startBtn").addEventListener("click", () => {
    if (!G.scooper) return;
    $("#startOverlay").hidden = true; sfx.open(); nextCustomer();
  });
  $("#muteBtn").addEventListener("click", (e) => {
    muted = !muted; e.currentTarget.classList.toggle("off", muted);
    try { localStorage.setItem("frozenbergs.muted", muted ? "1" : "0"); } catch { }
  });
  $("#muteBtn").classList.toggle("off", muted);

  // ---------- sizing ----------
  function resize() {
    const st = $("#stage"), app = $(".app"), cs = getComputedStyle(app);
    const box = { width: app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), height: st.getBoundingClientRect().height };
    LH = Math.round(Math.min(1560, Math.max(1000 + TOPZ, box.height / box.width * LW))); DY = LH - 1000;
    const s = Math.min(box.width / LW, box.height / LH), d = dpr();
    cv.style.width = LW * s + "px"; cv.style.height = LH * s + "px";
    st.style.width = Math.floor(LW * s) + "px";
    cv.width = Math.round(LW * s * d); cv.height = Math.round(LH * s * d);
    ctx.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
    if (!$("#builder").hidden) sizePreview();
  }
  addEventListener("resize", resize);
  resize(); renderHud(); syncStart();
  requestAnimationFrame(tick);
})();
