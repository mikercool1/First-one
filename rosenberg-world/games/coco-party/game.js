"use strict";
// Cocoa Party: run the hot chocolate stand. A customer walks up and orders, you tap "Make the cocoa!",
// build it one step at a time in the full-screen builder, press Done, and hand it over.
// Same game as Frozenbergs with a winter skin. The family (Ariel, Sarah, Molly, Max) and the kids
// come from the Ariel Passover Cookout art, bundled up in winter clothes.

(() => {
  const $ = (s) => document.querySelector(s);
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const LW = 720;
  const TOPZ = 330;                // the order ticket hangs in the sky above the stand
  let LH = 1000 + TOPZ, DY = TOPZ; // taller phones get more sky; DY pushes the scene down
  const SPEED = location.hash.includes("fast") ? 0.2 : 1;   // test hook
  const PER_DAY = 8;
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
  const CUPS = Object.entries(COCOA_ART.CUPS).map(([k, c]) => ({ k, n: c.n }));
  const COCOAS = Object.entries(COCOA_ART.COCOAS).map(([k, f]) => ({ k, ...f }));
  const TOPS = [{ k: "marsh", n: "Marshmallows" }, { k: "whip", n: "Whipped Cream" }, { k: "sauce", n: "Chocolate Sauce" }];
  const TOP_ORDER = TOPS.map((t) => t.k);
  const CC = COCOA_ART.COCOAS;
  const nameOf = (list, k) => list.find((x) => x.k === k)?.n ?? k;
  const TOP_COL = { marsh: "#FFF4EA", whip: "#F4EEF2", sauce: "#4A2414" };
  const CUP_COL = { mug: "#D8443B", paper: "#B98548", glass: "#BFE0F2" };

  // ---------- people ----------
  const MAKERS = { reuben: "Reuben", jonah: "Jonah", ellie: "Ellie", max: "Max" };
  const KID_S = 2.3;
  // hold: where the customer holds the cocoa, relative to their feet. head: top of their head.
  const PEOPLE = {
    ariel: { name: "Ariel", s: 1.75, head: 430, hold: [-58, -250], thanks: "So cozy!" },
    sarah: { name: "Sarah", s: 1.75, head: 440, hold: [-30, -300], thanks: "Mmm, so warm!" },
    molly: { name: "Molly", s: 1.75, head: 430, hold: [-32, -300], thanks: "Just what I needed!" },
    max: { name: "Max", s: 2.0, head: 250, hold: [-44, -120], thanks: "Mine! Hot! Mine!" },
    reuben: { name: "Reuben", kid: true, head: 136 * KID_S, hold: [-40, -150], thanks: "Home run cocoa!" },
    jonah: { name: "Jonah", kid: true, head: 118 * KID_S, hold: [-38, -132], thanks: "Yum yum!" },
    ellie: { name: "Ellie", kid: true, head: 98 * KID_S, hold: [-34, -112], thanks: "Yummy!" },
  };

  const LINES = {
    greet: ["Hi {me}!", "Brrr! Hi {me}!", "It's freezing out!", "Cocoa time!", "{me}! Warm me up!"],
    surprise: ["Surprise me! Pile it HIGH!", "You pick, {me}! Load it up!", "Chef's choice! Make it fancy!"],
    3: ["PERFECT!", "Exactly right!", "Wow! That's it!"],
    2: ["So close! Yum!", "Almost exactly!", "Ooh, I'll take it!"],
    1: ["Hmm… not quite.", "That's… different.", "Well, it's warm!"],
    0: ["That's not what I asked for!", "Huh?! Did you hear me?", "Um… okay…"],
    s3: ["WHOA! A cocoa mountain!", "You're an artist!", "Best cocoa EVER!"],
    s2: ["Fun! I love it!", "Ooh, fancy!"],
    s1: ["Cozy! Kinda plain though.", "Nice, but pile it higher!"],
    s0: ["That's… it?", "Plain. Very plain."],
  };

  // ---------- sound ----------
  let muted = false; try { muted = localStorage.getItem("cocoparty.muted") === "1"; } catch { }
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
    pour: () => { tone(260, .45, "sine", .08, 0, 520); tone(390, .35, "triangle", .03, .05, 700); },
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
    maker: null, day: 1, served: 0, tips: 0, dayTips: 0, dayStars: 0, gallery: [],
    queue: [], cust: null, order: null, phase: "idle", pt: 0, patience: 1,
    build: null, history: [], step: 0, dropT: 1, result: null, floats: [], snow: [],
  };
  try {
    const s = localStorage.getItem("cocoparty.maker"); if (MAKERS[s]) G.maker = s;
    // inside Rosenberg World, whoever is playing makes the cocoa (they can still switch)
    const rw = window.RosenbergBridge && RosenbergBridge.player; if (MAKERS[rw]) G.maker = rw;
    G.tips = Number(localStorage.getItem("cocoparty.tips")) || 0;
  } catch { }
  const me = () => MAKERS[G.maker];
  const emptyBuild = () => ({ cup: null, cocoa: null, tops: [] });

  function makeOrder(day, surprise) {
    if (surprise) return { surprise: true };
    const nTops = rand(day > 1 ? 1 : 0, Math.min(3, day + 1));
    const tops = shuffle([...TOP_ORDER]).slice(0, nTops);
    return { cup: pick(CUPS).k, cocoa: pick(COCOAS).k, tops: TOP_ORDER.filter((k) => tops.includes(k)) };
  }

  function grade(order, b) {
    if (order.surprise) return .25 + b.tops.length / 3 * .75;
    const want = new Set(order.tops), got = new Set(b.tops), union = new Set([...want, ...got]);
    const topScore = union.size ? [...want].filter((t) => got.has(t)).length / union.size : 1;
    return ((order.cup === b.cup ? 1 : 0) + (order.cocoa === b.cocoa ? 2 : 0) + topScore * 2) / 5;
  }
  const starsFor = (s) => (s >= .99 ? 3 : s >= .7 ? 2 : s >= .4 ? 1 : 0);

  // What the order says, as short lines with a colour chip each.
  function orderItems(o) {
    const items = [{ t: nameOf(CUPS, o.cup), c: CUP_COL[o.cup], part: "cup" }];
    items.push({ t: CC[o.cocoa].n, c: CC[o.cocoa].c, part: "cocoa" });
    for (const k of o.tops) items.push({ t: nameOf(TOPS, k), c: TOP_COL[k], part: "top", k });
    return items;
  }
  function itemDone(it, b) {
    if (it.part === "cup") return b.cup === G.order.cup;
    if (it.part === "cocoa") return b.cocoa === G.order.cocoa;
    return b.tops.includes(it.k);
  }

  // ---------- scene ----------
  const Y = (y) => y + DY;

  function sky(c) {
    c.fillStyle = ART.lin(c, 0, 0, 0, Y(640), "#6F95C9", "#A9C2E4", "#E9D9E4", "#FBE6D8"); c.fillRect(0, 0, LW, Y(660));
    const sx = 612, sy = Math.max(80, Y(130) - DY * .6);
    ART.dot(c, sx, sy, 150, ART.rad(c, sx, sy, 150, "rgba(255,230,210,.55)", "rgba(255,230,210,0)"));
    ART.dot(c, sx, sy, 40, ART.rad(c, sx, sy, 40, "#FFF8EC", "#FFD9B0"));
    for (const [bx, by, sc, sp] of [[80, .22, 1, 5], [420, .12, .8, 4], [760, .3, 1.15, 6]]) {
      const x = ((bx + T * sp) % 960) - 120, y = Math.max(60, Y(by * 1000) - DY * .5);
      c.save(); c.translate(x, y); c.scale(sc, sc);
      for (const [dx, dy, r] of [[-40, 8, 28], [-10, -8, 38], [30, 0, 32], [60, 10, 22]]) ART.dot(c, dx, dy + 6, r, "rgba(150,160,190,.45)");
      for (const [dx, dy, r] of [[-40, 8, 28], [-10, -8, 38], [30, 0, 32], [60, 10, 22]]) ART.dot(c, dx, dy, r, ART.radF(c, dx - r * .3, dy - r * .5, dx, dy, r * 1.2, "#FFFFFF", "#E6EBF5"));
      c.restore();
    }
  }
  function hills(c) {
    c.beginPath(); c.moveTo(0, Y(600));
    for (let x = 0; x <= LW; x += 40) c.lineTo(x, Y(560 + Math.sin(x / 90) * 22 + Math.sin(x / 37) * 6));
    c.lineTo(LW, Y(700)); c.lineTo(0, Y(700)); c.closePath(); c.fillStyle = ART.lin(c, 0, Y(540), 0, Y(660), "#FFFFFF", "#DCE6F2"); c.fill();
    for (const [x, y, r] of [[26, 560, 70], [118, 590, 56], [640, 548, 78], [712, 590, 60]]) pine(c, x, Y(y), r);
    c.fillStyle = ART.lin(c, 0, Y(620), 0, Y(720), "#F4F8FD", "#D6E2F0"); c.fillRect(0, Y(624), LW, 100);
    snowman(c, 668, Y(700));
  }
  function pine(c, x, y, r) {
    ART.box(c, x - 7, y + r * .6, 14, r * .6, 4, "#6A4024");
    for (let i = 0; i < 3; i++) {
      const w = r * (1 - i * .24), ty = y - r * .55 + i * -r * .42, by = y + r * .7 - i * r * .5;
      c.beginPath(); c.moveTo(x, ty - r * .2); c.lineTo(x + w * .78, by); c.lineTo(x - w * .78, by); c.closePath();
      c.fillStyle = ART.lin(c, x - w, 0, x + w, 0, "#2F7A55", "#1F5E41", "#174A33"); c.fill();
      // snow on each layer
      c.beginPath(); c.moveTo(x, ty - r * .2); c.lineTo(x + w * .34, ty + r * .22); c.quadraticCurveTo(x + w * .15, ty + r * .12, x, ty + r * .2);
      c.quadraticCurveTo(x - w * .15, ty + r * .12, x - w * .34, ty + r * .22); c.closePath(); c.fillStyle = "#FFFFFF"; c.fill();
      c.beginPath(); c.moveTo(x - w * .78, by); c.quadraticCurveTo(x, by - r * .12, x + w * .78, by); c.quadraticCurveTo(x, by + r * .06, x - w * .78, by); c.fillStyle = "rgba(255,255,255,.9)"; c.fill();
    }
  }
  function snowman(c, x, y) {
    ART.shadow(c, x, y, 40, 8, .18);
    for (const [dy, r] of [[-30, 32], [-80, 24], [-118, 17]]) ART.dot(c, x, y + dy, r, ART.radF(c, x - r * .35, y + dy - r * .4, x, y + dy, r * 1.2, "#FFFFFF", "#DDE7F3"));
    ART.dot(c, x - 6, y - 122, 2.6, "#2A2230"); ART.dot(c, x + 6, y - 122, 2.6, "#2A2230");
    c.beginPath(); c.moveTo(x, y - 116); c.lineTo(x + 16, y - 113); c.lineTo(x, y - 111); c.closePath(); c.fillStyle = "#FF8A2A"; c.fill();
    for (const dy of [-90, -78, -66]) ART.dot(c, x, y + dy, 2.8, "#2A2230");
    ART.box(c, x - 22, y - 102, 44, 8, 4, "#E4473F");
    ART.box(c, x + 6, y - 100, 9, 26, 4, "#E4473F");
    ART.box(c, x - 14, y - 136, 28, 5, 2, "#2A2230"); ART.box(c, x - 10, y - 156, 20, 22, 3, "#2A2230");
    ART.line(c, [x - 22, y - 84, x - 48, y - 102], 3, "#6A4024"); ART.line(c, [x + 22, y - 84, x + 46, y - 106], 3, "#6A4024");
  }
  function sidewalk(c) {
    const top = Y(716);
    c.fillStyle = ART.lin(c, 0, top, 0, LH, "#E4E9F1", "#CCD4E0"); c.fillRect(0, top, LW, LH - top);
    c.fillStyle = "#FFFFFF"; c.fillRect(0, top - 8, LW, 10); c.fillStyle = "rgba(110,120,150,.22)"; c.fillRect(0, top + 2, LW, 3);
    c.save(); c.beginPath(); c.rect(0, top, LW, LH - top); c.clip();
    c.strokeStyle = "rgba(120,130,160,.25)"; c.lineWidth = 2;
    for (let k = 1; k < 12; k++) { const y = top + Math.pow(k, 1.5) * 16; c.beginPath(); c.moveTo(0, y); c.lineTo(LW, y); c.stroke(); }
    const vx = 360, vy = Y(420);
    for (let i = -8; i <= 16; i++) { const bx = -600 + i * 120; c.beginPath(); c.moveTo(lerp(vx, bx, (top - vy) / (LH + 200 - vy)), top); c.lineTo(bx, LH + 200); c.stroke(); }
    // little drifts of snow along the path
    for (const [x, y, w] of [[40, 60, 70], [700, 140, 90], [150, 260, 60], [640, 420, 80]]) ART.ell(c, x, top + y, w, 10, "rgba(255,255,255,.75)");
    c.restore();
  }

  function kioskBack(c) {
    // side wall (we see the right side, so the stand feels solid): a log cabin
    c.beginPath(); c.moveTo(500, Y(300)); c.lineTo(588, Y(268)); c.lineTo(588, Y(750)); c.lineTo(500, Y(790)); c.closePath();
    c.fillStyle = ART.lin(c, 500, 0, 588, 0, "#7A4A2C", "#5E3820"); c.fill();
    c.strokeStyle = "rgba(40,20,10,.3)"; c.lineWidth = 2;
    for (let i = 1; i < 16; i++) { const y0 = Y(300) + i * 31, y1 = Y(268) + i * 30.5; c.beginPath(); c.moveTo(500, y0); c.lineTo(588, y1); c.stroke(); }
    // front wall: horizontal logs
    c.fillStyle = ART.lin(c, 36, 0, 500, 0, "#9C6440", "#B07550", "#8E5836"); c.fillRect(36, Y(300), 464, 490);
    for (let y = Y(300); y < Y(790); y += 28) {
      c.fillStyle = "rgba(255,220,180,.12)"; c.fillRect(36, y + 3, 464, 6);
      c.fillStyle = "rgba(50,25,10,.28)"; c.fillRect(36, y + 25, 464, 3);
    }
    // window: the cozy inside of the stand
    const wx = 68, wy = Y(378), ww = 400, wh = 250;
    c.save(); ART.rr(c, wx, wy, ww, wh, 18); c.clip();
    c.fillStyle = ART.lin(c, 0, wy, 0, wy + wh, "#FFE7B8", "#F6C98E"); c.fillRect(wx, wy, ww, wh);
    c.fillStyle = "rgba(255,255,255,.18)"; for (let x = wx + 10; x < wx + ww; x += 28) c.fillRect(x, wy, 12, wh);
    // shelf with mugs and marshmallow jars
    ART.box(c, wx + 14, wy + 74, ww - 28, 10, 3, ART.lin(c, 0, wy + 74, 0, wy + 84, "#B07550", "#7A4A2C"));
    ["#D8443B", "#FFFFFF", "#2F7A55", "#D8443B"].forEach((col, i) => {
      const x = wx + 44 + i * 36, y = wy + 74;
      ART.box(c, x - 13, y - 28, 26, 28, 5, col, "rgba(0,0,0,.18)", 1.5);
      c.beginPath(); c.arc(x + 14, y - 14, 7, -Math.PI / 2, Math.PI / 2); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
    });
    [0, 1, 2].forEach((i) => {
      const x = wx + 220 + i * 48, y = wy + 72;
      ART.box(c, x - 16, y - 40, 32, 40, 8, "rgba(255,255,255,.55)");
      c.save(); ART.rr(c, x - 14, y - 30, 28, 28, 6); c.clip();
      for (let j = 0; j < 8; j++) ART.box(c, x - 13 + (j % 3) * 9, y - 28 + Math.floor(j / 3) * 9, 8, 7, 2, j % 3 ? "#FFFFFF" : "#FFD6E2");
      c.restore();
      ART.box(c, x - 17, y - 46, 34, 9, 4, "#D8443B");
    });
    // chalk menu
    ART.box(c, wx + ww - 100, wy + 104, 84, 100, 10, "#3B3445", "#B07550", 5);
    ART.text(c, "MENU", wx + ww - 58, wy + 124, 17, "#FFFFFF", 700);
    COCOAS.forEach((f, i) => { ART.dot(c, wx + ww - 72 + i * 28, wy + 156, 11, f.c); ART.dot(c, wx + ww - 72 + i * 28, wy + 152, 5, "rgba(255,255,255,.35)"); });
    ART.text(c, "☕ + ❄", wx + ww - 58, wy + 186, 16, "#FFFFFF", 700);
    // twinkly lights
    c.beginPath(); c.moveTo(wx, wy + 16); c.quadraticCurveTo(wx + ww / 2, wy + 50, wx + ww, wy + 16); c.strokeStyle = "#3A5A3E"; c.lineWidth = 2; c.stroke();
    for (let i = 1; i < 12; i++) {
      const u = i / 12, x = wx + ww * u, y = wy + 16 + 34 * 2 * u * (1 - u) + 6;
      const on = (Math.sin(T * 3 + i * 1.7) + 1) / 2, col = ["#FFE066", "#FF6A5E", "#7FE0A0"][i % 3];
      ART.dot(c, x, y + 2, 12, ART.rad(c, x, y + 2, 12, `rgba(255,240,200,${.25 + on * .35})`, "rgba(255,240,200,0)"));
      ART.ell(c, x, y + 2, 4.5, 6, col);
    }
    // frost in the corners of the glass
    for (const [fx, fy] of [[wx, wy + wh], [wx + ww, wy + wh]]) ART.dot(c, fx, fy, 60, ART.rad(c, fx, fy, 60, "rgba(255,255,255,.75)", "rgba(255,255,255,0)"));
    c.restore();
    ART.rr(c, wx, wy, ww, wh, 18); c.strokeStyle = "#FFF6EA"; c.lineWidth = 9; c.stroke();
    // a wreath on the side wall
    const rx = 544, ry = Y(420);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ART.dot(c, rx + Math.cos(a) * 20, ry + Math.sin(a) * 24, 8, i % 2 ? "#2F7A55" : "#1F5E41"); }
    for (const a of [.4, 2.2, 4.1]) ART.dot(c, rx + Math.cos(a) * 20, ry + Math.sin(a) * 24, 3.5, "#E4473F");
    ART.box(c, rx - 8, ry + 18, 16, 10, 4, "#E4473F");
  }

  function counter(c) {
    // top slab
    c.beginPath(); c.moveTo(18, Y(632)); c.lineTo(44, Y(604)); c.lineTo(500, Y(604)); c.lineTo(596, Y(572)); c.lineTo(596, Y(588)); c.lineTo(518, Y(632)); c.closePath();
    c.fillStyle = ART.lin(c, 0, Y(572), 0, Y(632), "#FFFFFF", "#EEE6DE"); c.fill();
    c.fillStyle = ART.lin(c, 0, Y(632), 0, Y(650), "#E8D8C8", "#C4A88E"); c.fillRect(18, Y(632), 500, 18);
    c.beginPath(); c.moveTo(518, Y(632)); c.lineTo(596, Y(588)); c.lineTo(596, Y(604)); c.lineTo(518, Y(650)); c.closePath(); c.fillStyle = "#B4987E"; c.fill();
    // a little snow piled on the ends of the counter
    ART.ell(c, 34, Y(628), 22, 7, "#FFFFFF"); ART.ell(c, 584, Y(582), 16, 5, "#FFFFFF");
    // front, with a warm display window of cocoa pots
    c.fillStyle = ART.lin(c, 36, 0, 500, 0, "#C8403A", "#E25248", "#B8352F"); c.fillRect(36, Y(650), 464, 140);
    c.beginPath(); c.moveTo(500, Y(650)); c.lineTo(588, Y(604)); c.lineTo(588, Y(750)); c.lineTo(500, Y(790)); c.closePath(); c.fillStyle = "#8E2A25"; c.fill();
    const gx = 58, gy = Y(664), gw = 420, gh = 100;
    ART.box(c, gx - 6, gy - 6, gw + 12, gh + 12, 16, ART.lin(c, 0, gy, 0, gy + gh, "#FFF6EA", "#D9C4AE"));
    c.save(); ART.rr(c, gx, gy, gw, gh, 12); c.clip();
    c.fillStyle = ART.lin(c, 0, gy, 0, gy + gh, "#FFF1D8", "#F2D3A8"); c.fillRect(gx, gy, gw, gh);
    // two big pots: dark and white cocoa
    COCOAS.forEach((f, i) => {
      const x = gx + 70 + i * 140, y = gy + 50;
      ART.box(c, x - 46, y, 92, 46, 8, ART.lin(c, x - 46, 0, x + 46, 0, "#7C8592", "#E4E8EE", "#6A7380"));
      ART.ell(c, x, y, 46, 11, "#AEB6C4");
      ART.ell(c, x, y + 1, 41, 8, ART.radF(c, x - 10, y - 3, x, y, 42, f.h, f.c, f.d));
      for (let k = 0; k < 3; k++) {
        const ph = (T * .5 + k / 3 + i * .2) % 1, sx = x - 18 + k * 18, sy = y - 6 - ph * 34;
        c.save(); c.globalAlpha = Math.sin(ph * Math.PI) * .6;
        c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 8, sy - 8, sx, sy - 18); c.lineWidth = 4; c.lineCap = "round"; c.strokeStyle = "#FFFFFF"; c.stroke(); c.restore();
      }
      ART.text(c, i ? "WHITE" : "COCOA", x, y + 28, 14, "#3B3445", 700);
    });
    // jar of marshmallows + whipped cream can
    const jx = gx + 360, jy = gy + 50;
    ART.box(c, jx - 26, jy - 14, 52, 58, 10, "rgba(255,255,255,.6)", "rgba(160,120,100,.4)", 2);
    for (let j = 0; j < 12; j++) COCOA_ART.marsh(c, jx - 16 + (j % 4) * 11, jy + 34 - Math.floor(j / 4) * 12, (j % 3 - 1) * .3, .75, j % 4 === 1);
    c.fillStyle = "rgba(255,255,255,.4)";
    for (const x0 of [gx + 40, gx + 230]) { c.beginPath(); c.moveTo(x0, gy); c.lineTo(x0 + 40, gy); c.lineTo(x0 - 20, gy + gh); c.lineTo(x0 - 60, gy + gh); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = "#8E2A25"; c.fillRect(36, Y(772), 464, 18);
    // snow drift against the base of the stand
    for (let x = 24; x < 600; x += 44) ART.ell(c, x, Y(792), 34, 12, "#FFFFFF");
  }

  function awning(c) {
    const x0t = 24, x1t = 512, yt = Y(284), x0b = 4, x1b = 532, yb = Y(360), n = 10;
    // side of the awning
    c.beginPath(); c.moveTo(x1t, yt); c.lineTo(598, Y(256)); c.lineTo(612, Y(326)); c.lineTo(x1b, yb); c.closePath(); c.fillStyle = "#A8302A"; c.fill();
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      c.beginPath(); c.moveTo(lerp(x0t, x1t, u0), yt); c.lineTo(lerp(x0t, x1t, u1), yt); c.lineTo(lerp(x0b, x1b, u1), yb); c.lineTo(lerp(x0b, x1b, u0), yb); c.closePath();
      c.fillStyle = i % 2 ? "#FFF6EA" : "#D8443B"; c.fill();
    }
    c.fillStyle = ART.lin(c, 0, yt, 0, yb, "rgba(90,20,20,.22)", "rgba(90,20,20,0)"); c.fillRect(0, yt, 540, yb - yt);
    // scallops, with icicles
    for (let i = 0; i < n; i++) {
      const cx = lerp(x0b, x1b, (i + .5) / n), w = (x1b - x0b) / n / 2;
      ART.ell(c, cx, yb + 6, w, 16, "rgba(60,20,20,.18)");
      c.beginPath(); c.ellipse(cx, yb, w, 18, 0, 0, Math.PI); c.fillStyle = i % 2 ? "#FFF6EA" : "#D8443B"; c.fill();
      for (const [dx, len] of [[-w * .5, 14 + (i * 7) % 12], [w * .3, 22 + (i * 5) % 10]]) {
        c.beginPath(); c.moveTo(cx + dx - 4, yb + 14); c.lineTo(cx + dx + 4, yb + 14); c.lineTo(cx + dx, yb + 14 + len); c.closePath();
        c.fillStyle = ART.lin(c, 0, yb + 14, 0, yb + 14 + len, "rgba(235,245,255,.95)", "rgba(190,220,245,.8)"); c.fill();
      }
    }
    // a thick layer of snow on top
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(x0t - 6, yt + 2);
    for (let x = x0t - 6; x <= x1t + 6; x += 24) c.quadraticCurveTo(x + 12, yt - 18 - Math.sin(x) * 4, x + 24, yt + 2);
    c.lineTo(x1t + 6, yt + 6); c.lineTo(x0t - 6, yt + 6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x1t + 4, yt); c.lineTo(598, Y(252)); c.lineTo(600, Y(262)); c.lineTo(x1t + 4, yt + 6); c.closePath(); c.fill();
  }

  function sign(c) {
    const x = 74, y = Y(148), w = 400, h = 112;
    ART.box(c, 150, y + h - 4, 12, 40, 4, "#7A4A2C"); ART.box(c, 386, y + h - 4, 12, 40, 4, "#7A4A2C");
    ART.box(c, x + 8, y + 12, w, h, 30, "#8E2A25");
    ART.box(c, x, y, w, h, 30, ART.lin(c, 0, y, 0, y + h, "#FFFDF8", "#FBEBDD"), "#D8443B", 6);
    c.font = `400 70px ${DISPLAY}`; c.textBaseline = "middle"; c.textAlign = "left";
    const a = "Cocoa ", b = "Party", wa = c.measureText(a).width, wb = c.measureText(b).width, tx = x + w / 2 - (wa + wb) / 2, ty = y + h / 2 + 6;
    for (let d = 6; d > 0; d--) { c.fillStyle = d > 3 ? "#3A1C0E" : "#5A2E18"; c.fillText(a, tx + d * .5, ty + d); c.fillStyle = d > 3 ? "#7A1E1A" : "#A8302A"; c.fillText(b, tx + wa + d * .5, ty + d); }
    c.lineWidth = 6; c.strokeStyle = "#FFFFFF"; c.lineJoin = "round"; c.strokeText(a, tx, ty); c.strokeText(b, tx + wa, ty);
    c.fillStyle = ART.lin(c, 0, ty - 30, 0, ty + 30, "#A8693E", "#6B3A1E"); c.fillText(a, tx, ty);
    c.fillStyle = ART.lin(c, 0, ty - 30, 0, ty + 30, "#FF6A5E", "#D8352C"); c.fillText(b, tx + wa, ty);
    // snow on the sign
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(x + 20, y + 4);
    for (let sx = x + 20; sx < x + w - 20; sx += 30) c.quadraticCurveTo(sx + 15, y - 14 - (sx % 7), sx + 30, y + 4);
    c.closePath(); c.fill();
    // a spinning snowflake
    const sp = (Math.sin(T * 2) + 1) / 2;
    c.save(); c.translate(x + w - 30, y + 30); c.rotate(T * .8); c.globalAlpha = .5 + sp * .5;
    c.strokeStyle = "#7FB8E6"; c.lineWidth = 3; c.lineCap = "round";
    for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.moveTo(8, 0); c.lineTo(11, -4); c.moveTo(8, 0); c.lineTo(11, 4); c.moveTo(-8, 0); c.lineTo(-11, -4); c.moveTo(-8, 0); c.lineTo(-11, 4); c.stroke(); }
    c.restore();
  }

  function statue(c) {
    const bob = Math.sin(T * 1.6) * 3;
    COCOA_ART.drink(c, { cup: "mug", cocoa: "dark", tops: ["whip", "marsh", "sauce"] }, 556, Y(150) + bob, .72, T);
  }

  // gentle falling snow over the whole scene
  function snowfall(c) {
    for (let i = 0; i < 70; i++) {
      const r = 1.6 + (i % 4) * 1.1, sp = 18 + (i % 5) * 10;
      const x = ((i * 137.5) % LW + Math.sin(T * .8 + i) * 18 + LW) % LW;
      const y = ((i * 97.3) % LH + T * sp) % LH;
      ART.dot(c, x, y, r, `rgba(255,255,255,${.55 + (i % 3) * .15})`);
    }
  }

  // ---------- characters ----------
  function makerPose() {
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
  // Max makes cocoa too: he's drawn with the family art, stirring with his spoon
  function maxAct(p) { return p.pose === "jump" || p.pose === "cheer" ? "happy" : p.pose === "wave" ? "reach" : p.exp ? "peek" : "stir"; }
  function drawMaker(c) {
    if (!G.maker) return;
    if (G.maker === "max") {
      const p = makerPose();
      ART.max(c, 262, Y(622) + 36, 2.3, { t: T, act: maxAct(p), dir: 1, blink: T % 4.1 < .12, look: [1, 0], prop: "spoon", expr: p.exp === "annoyed" ? "meh" : undefined });
      return;
    }
    const K = KIDS_ART.KIDS[G.maker];
    KIDS_ART.draw(c, G.maker, 262, Y(622) + K.L * KID_S * .45, KID_S, makerPose(), T);
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
      COCOA_ART.drink(c, r.build, x + P.hold[0] * dir, y + P.hold[1], .38, T, { rot: -.08 * dir });
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
    for (const cx of [120, LW - 120]) { c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, y + 8); c.strokeStyle = "#8C6A5E"; c.lineWidth = 3; c.stroke(); }
    c.save(); c.shadowColor = "rgba(40,20,60,.35)"; c.shadowBlur = 26; c.shadowOffsetY = 10;
    ART.rr(c, x, y, w, h, 26); c.fillStyle = "#FFFFFF"; c.fill(); c.restore();
    c.save(); ART.rr(c, x, y, w, h, 26); c.clip();
    c.fillStyle = ART.lin(c, 0, y, 0, y + 64, "#8A4A2A", "#6B3A1E"); c.fillRect(x, y, w, 64);
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
        const ms = Math.min(.8, bodyH / 250);
        COCOA_ART.drink(c, emptyBuild(), x + 96, bodyY + bodyH / 2 - 60 * ms, ms, T, { mystery: true });
        c.font = `700 40px ${FONT}`;
        wrap(c, G.surpriseLine, w - 240).forEach((l, i) => ART.text(c, l, x + 200, bodyY + 64 + i * 50, 40, "#3B2342", 700, "left"));
      } else {
        const up = COCOA_ART.above(o) + 30, tall = COCOA_ART.DEPTH + up;
        const cs = Math.min(1.05, (bodyH - 26) / tall);
        COCOA_ART.drink(c, o, x + 90, bodyY + 14 + up * cs, cs, T);
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
    COCOA_ART.drink(c, G.result.build, x, y, lerp(.5, .38, k), T, { rot: Math.sin(k * Math.PI) * .15 });
  }
  function drawFloats(c) {
    for (const f of G.floats) {
      const a = Math.min(1, 2 - f.t * 1.3);
      c.save(); c.globalAlpha = Math.max(0, a);
      c.font = `400 56px ${DISPLAY}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 8; c.strokeStyle = "#FFFFFF"; c.lineJoin = "round"; c.strokeText(f.s, f.x, f.y - f.t * 70);
      c.fillStyle = "#2E9E5B"; c.fillText(f.s, f.x, f.y - f.t * 70);
      c.restore();
    }
  }

  function render() {
    const c = ctx;
    sky(c); hills(c); sidewalk(c);
    ART.shadow(c, 300, Y(792), 330, 20, .25);
    statue(c);
    kioskBack(c);
    drawMaker(c);
    counter(c);
    awning(c);
    sign(c);
    drawCustomer(c);
    drawFlight(c);
    drawSpeech(c);
    snowfall(c);
    drawTicket(c);
    drawFloats(c);
  }

  // ---------- flow ----------
  function setPhase(p) { G.phase = p; G.pt = 0; }
  function nextCustomer() {
    if (!G.queue.length) {
      G.queue = shuffle(Object.keys(PEOPLE).filter((k) => k !== G.maker));
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
    G.build = emptyBuild(); G.history = []; G.step = 0; G.dropT = 1;
    $("#builder").hidden = false;
    renderOrderCard(); renderSteps(); renderOpts(); updateButtons();
    sfx.open(); sizePreview();
  }

  function finish() {
    const b = G.build;
    if (!b.cup) { sfx.nope(); goStep(0); return toast("Pick a cup first!"); }
    if (!b.cocoa) { sfx.nope(); goStep(1); return toast("Pour the cocoa!"); }
    $("#builder").hidden = true;
    const score = grade(G.order, b), stars = starsFor(score);
    const speed = stars > 0 ? (G.patience > .5 ? 1 : G.patience > .2 ? .5 : 0) : 0;
    const tip = [.25, 1.5, 2.5, 4][stars] + speed + (G.order.surprise ? b.tops.length * .25 : 0);
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
      try { localStorage.setItem("cocoparty.tips", G.tips.toFixed(2)); } catch { }
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
    G.dropT = Math.min(1, G.dropT + dt * 1.6);

    render();
    if (!$("#builder").hidden) renderPreview();
    if (!$("#startOverlay").hidden) renderPickers();
    requestAnimationFrame(tick);
  }

  // ---------- builder UI ----------
  const STEPS = [{ k: "cup", n: "Cup" }, { k: "cocoa", n: "Cocoa" }, { k: "tops", n: "Toppings" }];
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  function paintIcon(cvs, kind, key) {
    const d = dpr(), w = cvs.clientWidth || 76, h = cvs.clientHeight || 70;
    cvs.width = w * d; cvs.height = h * d;
    const c = cvs.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
    const s = Math.min(w / 110, h / 100);
    COCOA_ART.icon(c, kind, key, w / 2, h / 2 + 6 * s, s * .95, 0);
  }
  function goStep(i) { G.step = i; renderSteps(); renderOpts(); updateButtons(); }
  function stepDone(i) {
    const b = G.build;
    return [!!b.cup, !!b.cocoa, b.tops.length > 0][i];
  }
  function renderSteps() {
    $("#steps").innerHTML = STEPS.map((s, i) => `<button class="step${stepDone(i) ? " done" : ""}" data-step="${i}" aria-current="${i === G.step}"><b>${i + 1}</b>${s.n}</button>`).join("");
  }
  function optionList() {
    const st = STEPS[G.step].k, b = G.build;
    if (st === "cup") return CUPS.map((o) => ({ kind: "cup", key: o.k, n: o.n, on: b.cup === o.k }));
    if (st === "cocoa") return COCOAS.map((o) => ({ kind: "cocoa", key: o.k, n: o.n, on: b.cocoa === o.k }));
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
    const up = o.surprise ? 20 : COCOA_ART.above(o) + 6, s = Math.min(w / 150, h / (COCOA_ART.DEPTH + up + 8));
    COCOA_ART.drink(c, o.surprise ? emptyBuild() : o, w / 2 - 6 * s, up * s + 4, s, 0, { mystery: o.surprise, noSteam: true });
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
    const s = Math.min(h / 300, w / 230), px = w / 2, py = h - 22;
    ART.ell(c, px, py + 6, 80 * s + 30, 16, "rgba(90,40,20,.18)");
    ART.ell(c, px, py, 80 * s + 24, 14, ART.lin(c, px - 100, 0, px + 100, 0, "#E0CFC0", "#FFFFFF", "#D2BCA8"));
    ART.ell(c, px, py - 2, 50 * s + 10, 7, "rgba(160,120,90,.25)");
    COCOA_ART.drink(c, G.build, px - 8 * s, py - (COCOA_ART.DEPTH + 2) * s, s, T, { dropT: G.dropT });
  }

  function push() { G.history.push(structuredClone(G.build)); }
  function choose(o) {
    const b = G.build;
    if (o.kind === "cup") { push(); b.cup = o.key; sfx.tap(); setTimeout(() => G.step === 0 && goStep(1), 280); }
    else if (o.kind === "cocoa") {
      if (!b.cup) { sfx.nope(); goStep(0); return toast("Pick a cup first!"); }
      push(); b.cocoa = o.key; G.dropT = 0; sfx.pour(); setTimeout(() => G.step === 1 && goStep(2), 650);
    } else {
      if (!b.cocoa) { sfx.nope(); goStep(1); return toast("Pour the cocoa first!"); } push(); b.tops = b.tops.includes(o.key) ? b.tops.filter((x) => x !== o.key) : TOP_ORDER.filter((x) => x === o.key || b.tops.includes(x)); sfx.tap(); }
    renderSteps(); renderOpts(); updateButtons();
  }

  $("#opts").addEventListener("click", (e) => { const t = e.target.closest(".opt"); if (t) choose(optionList()[+t.dataset.i]); });
  $("#steps").addEventListener("click", (e) => { const t = e.target.closest(".step"); if (t) { sfx.tap(); goStep(+t.dataset.step); } });
  $("#nextBtn").addEventListener("click", () => { sfx.tap(); goStep(Math.min(STEPS.length - 1, G.step + 1)); });
  $("#undoBtn").addEventListener("click", () => {
    if (!G.history.length) return;
    G.build = G.history.pop(); sfx.tap(); renderSteps(); renderOpts(); updateButtons();
  });
  $("#doneBtn").addEventListener("click", finish);
  $("#makeBtn").addEventListener("click", openBuilder);

  // ---------- HUD / overlays ----------
  function renderHud() {
    $("#dayLbl").textContent = `Day ${G.day}`;
    $("#tipLbl").textContent = money(G.tips);
    $("#cupDots").innerHTML = Array.from({ length: PER_DAY }, (_, i) => `<i class="${i < G.served ? "on" : ""}"></i>`).join("");
  }
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  const RANKS = [[.9, "Legendary Cocoa Maker!"], [.75, "Marshmallow Master!"], [.55, "Whipped Cream Captain!"], [.35, "Cocoa Apprentice!"], [0, "Lukewarm Beginner!"]];
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
      const b = G.gallery[i].build, up = COCOA_ART.above(b), s = Math.min(w / 150, h / (COCOA_ART.DEPTH + up + 20));
      COCOA_ART.drink(c, b, w / 2 - 6 * s, h / 2 + (up - COCOA_ART.DEPTH) * s / 2, s, 0, { noSteam: true });
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
      if (id === "max") ART.max(c, w / 2, h - 10, h / 150, { t: T, act: G.maker === id ? "happy" : "stir", dir: 1, blink: T % 4.1 < .12, prop: "spoon" });
      else KIDS_ART.draw(c, id, w / 2, h - 10, h / 128, G.maker === id ? { pose: "jump", face: 1 } : { pose: "wave", face: 1 }, T);
    });
  }
  $("#pickers").innerHTML = Object.entries(MAKERS).map(([k, n]) => `<button class="pick" data-maker="${k}" aria-pressed="${G.maker === k}"><canvas data-id="${k}"></canvas><b>${n}</b></button>`).join("");
  function syncStart() {
    $("#startBtn").disabled = !G.maker;
    $("#startBtn").textContent = G.maker ? `Open the stand!` : "Pick a cocoa maker";
    $("#pickers").querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b.dataset.maker === G.maker));
  }
  $("#pickers").addEventListener("click", (e) => {
    const t = e.target.closest(".pick"); if (!t) return;
    G.maker = t.dataset.maker; sfx.tap(); syncStart();
    try { localStorage.setItem("cocoparty.maker", G.maker); } catch { }
  });
  $("#startBtn").addEventListener("click", () => {
    if (!G.maker) return;
    $("#startOverlay").hidden = true; sfx.open(); nextCustomer();
  });
  $("#muteBtn").addEventListener("click", (e) => {
    muted = !muted; e.currentTarget.classList.toggle("off", muted);
    try { localStorage.setItem("cocoparty.muted", muted ? "1" : "0"); } catch { }
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
