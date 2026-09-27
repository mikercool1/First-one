// Checking In: the front desk at Baha Mar, Rosenberg World.
// A 2.5D lobby drawn on a canvas with a simple perspective camera standing behind the desk.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const TAU = Math.PI * 2;
  const store = {
    get(k, d) { try { const v = localStorage.getItem("checkingIn." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("checkingIn." + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  const stage = $("#stage"), cv = $("#scene"), ctx = cv.getContext("2d"), deskEl = $("#desk");

  // ---------- hotels ----------
  const HOTELS = {
    rosewood: { key: "rosewood", name: "Rosewood", color: "gray", band: "#A7ADB5", dark: "#6C737C", drink: true },
    hyatt: { key: "hyatt", name: "Grand Hyatt", color: "blue", band: "#2E7CF0", dark: "#1A4FA0", drink: false },
    sls: { key: "sls", name: "SLS", color: "pink", band: "#FF5AAE", dark: "#C22E7B", drink: false },
  };
  const HOTEL_KEYS = Object.keys(HOTELS);

  // ---------- shifts ----------
  const SHIFT_HOURS = 4;
  function params(n) {
    return {
      len: 75 + 6 * Math.min(n - 1, 5),                 // seconds of arrivals
      spawn: Math.max(3.2, 8.5 - 1.05 * (n - 1)),       // seconds between parties
      patience: Math.max(24, 58 - 6 * (n - 1)),         // seconds before a walkout
      maxParty: Math.min(4, n + 1),
      pro: n >= 3,                                      // bins lose their hotel names
    };
  }
  const SHIFT_NAMES = ["", "the afternoon arrivals", "the 5 PM rush", "the dinner crowd", "the late flights", "the wedding party", "the conference", "spring break"];

  // ---------- camera: world meters -> screen ----------
  // x: left/right, y: up, z: distance from the camera. The camera is high behind the desk, looking into the lobby.
  const CH = 3.2, CZ = 3.45, CTOP = 1.05, DESK_Z = 4.0, WALL_Z = 14;
  let W = 0, H = 0, DPR = 1, HY = 0, F = 1, CE = 0, STRIP = 0, ITEM_Y = 0, ISC = 1;
  const proj = (x, y, z) => ({ x: W / 2 + (F * x) / z, y: HY + (F * (CH - y)) / z, s: F / z });

  // ---------- the queue path (snakes through the stanchions to the desk) ----------
  const PATH = [[-3.6, 13.6], [-2.0, 11.8], [2.0, 11.8], [2.0, 9.4], [-2.0, 9.4], [-2.0, 7.0], [0.4, 7.0], [0, 5.6], [0, DESK_Z]];
  const SEGS = []; let PL = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az);
    SEGS.push({ ax, az, bx, bz, len, start: PL }); PL += len;
  }
  function pathAt(s) {
    s = clamp(s, 0, PL);
    for (const g of SEGS) if (s <= g.start + g.len) { const t = (s - g.start) / g.len; return [lerp(g.ax, g.bx, t), lerp(g.az, g.bz, t)]; }
    return PATH[PATH.length - 1].slice();
  }
  const SPACING = 1.9, MAXQ = Math.floor((PL - 1.4) / SPACING) + 1;
  const CLUSTER = [[0, 0], [0.44, 0.24], [-0.44, 0.24], [0.02, 0.5]];
  const ROPES = [
    { z: 10.6, xs: [-2.8, -1.8, -0.8, 0.2, 1.2] },
    { z: 8.2, xs: [-1.2, -0.2, 0.8, 1.8, 2.8] },
    { z: 6.1, xs: [-2.6, -1.65, -0.7] },
    { z: 6.1, xs: [0.95, 1.85, 2.75] },
  ];
  const PLANTS = [[-2.75, 6.0], [2.8, 6.3], [-4.9, 12.9], [4.7, 12.6]];

  // ---------- guests ----------
  const SKIN = ["#F7D7BA", "#EFC19C", "#DDA57E", "#BE845C", "#94603F", "#6E452C"];
  const HAIRC = ["#2A1B12", "#4A2E1C", "#7A4B26", "#C08A45", "#E6C77E", "#8A8F96", "#171717", "#A8432A"];
  const TOPS = ["#FF6F61", "#2EC4B6", "#FFB703", "#3A86FF", "#8E5BE8", "#FB8B24", "#06D6A0", "#F4F1DE", "#EF476F", "#118AB2", "#FFFFFF", "#9ED8DB"];
  const BOTTOMS = ["#F4F1DE", "#2B2D42", "#6C8EAD", "#D4A373", "#264653", "#E9C46A", "#FFFFFF"];
  const SHOES = ["#FFFFFF", "#2B2D42", "#C9A27A", "#EF476F"];
  const CASES = ["#264653", "#E76F51", "#2A9D8F", "#F4A261", "#6D597A", "#1D3557", "#E9C46A"];
  const SURNAMES = ["Rolle", "Knowles", "Ferguson", "Patel", "Garcia", "Kim", "O'Brien", "Nguyen", "Cohen", "Moss", "Russo", "Okafor", "Silva", "Larsen", "Dubois", "Tanaka", "Levy", "Brooks", "Bethel", "Cartwright", "Moreau", "Ali", "Schwartz", "Dean"];
  const VIPS = [
    { name: "Mike Rosenberg", size: 1, looks: [{ hair: "short", hairC: "#4A2E1C", hat: null }] },
    { name: "Debbie & Billy", size: 2, looks: [{ hair: "long", hairC: "#3B2415", dress: true, top: "#FF6F61", shades: true }, { hair: "short", hairC: "#6B4A2E", top: "#9ED8DB" }] },
    { name: "The Rosenbergs", size: 4 },
    { name: "Reuben & crew", size: 3 },
    { name: "Adam", size: 1 },
    { name: "Marshall", size: 1 },
  ];
  const LINES = {
    greet: (g) => pick([
      `Hi! Checking in at the ${HOTELS[g.hotel].name}.`,
      `${g.size > 1 ? "We're" : "I'm"} at the ${HOTELS[g.hotel].name}!`,
      `Hello! ${HOTELS[g.hotel].name}, please.`,
      `Made it! ${HOTELS[g.hotel].name} reservation.`,
    ]),
    grumble: ["Is this line moving?", "Come on…", "We've been here forever.", "Ugh.", "Seriously?", "My drink is getting warm.", "The beach is RIGHT there."],
    storm: ["Forget it!", "We're going to Atlantis!", "Unbelievable!", "I'm leaving!", "Worst. Check-in. Ever.", "I'll sleep on the beach!"],
    happy: ["Thank you!", "Perfect!", "Beach time!", "You're the best!", "Paradise!", "Pool, here we come!"],
    rosewood: ["Ooh, welcome drinks!", "Cheers!", "Now THIS is service.", "Fancy!"],
  };

  function makeLook(kid, over) {
    const L = {
      kid, hf: kid ? rand(0.58, 0.68) : rand(0.93, 1.06), width: rand(0.92, 1.12),
      skin: pick(SKIN), hairC: pick(HAIRC),
      hair: kid ? pick(["short", "pony", "curly", "short"]) : pick(["short", "short", "long", "bun", "curly", "bald", "pony"]),
      top: pick(TOPS), accent: pick(TOPS), pattern: pick(["plain", "plain", "stripe", "floral"]),
      legs: pick(BOTTOMS), shorts: Math.random() < 0.55, dress: !kid && Math.random() < 0.16, shoe: pick(SHOES),
      hat: Math.random() < 0.3 ? pick(["straw", "cap", "straw"]) : null,
      shades: Math.random() < 0.3, seed: rand(0, 100),
    };
    if (L.accent === L.top) L.accent = "#FFFFFF";
    return Object.assign(L, over || {});
  }
  function partySize(max) {
    const w = [3, 4, 2, 1.6].slice(0, max), tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i + 1; }
    return 1;
  }

  // ---------- state ----------
  const G = {
    mode: "title", t: 0, shift: 1, time: 0, tips: 0, lives: 3, streak: 0,
    guests: 0, parties: 0, sParties: 0, sGuests: 0, sTips: 0, sWalk: 0,
    spawnT: 0.6, lastCall: false, queue: [], leavers: [], items: [], floats: [], parts: [], shake: 0, nextId: 1, overT: 0,
  };
  window.__checkingIn = G; // handy for poking at the game from the console

  function makeGroup(demo) {
    const pr = params(G.shift);
    const vip = !demo && Math.random() < 0.12 ? pick(VIPS) : null;
    const hotel = pick(HOTEL_KEYS);
    const size = vip ? vip.size : partySize(demo ? 3 : pr.maxParty);
    const sur = pick(SURNAMES);
    const name = vip ? vip.name : size === 1 ? `${pick(["Mr.", "Ms.", "Dr."])} ${sur}` : `${sur} party`;
    const members = [];
    for (let i = 0; i < size; i++) {
      const kid = !vip?.looks && size >= 3 && i >= 2 && Math.random() < 0.65;
      const m = { L: makeLook(kid, vip?.looks?.[i]), phase: rand(0, TAU), cx: CLUSTER[i][0], cz: CLUSTER[i][1], dx: (i - (size - 1) / 2) * 0.5, dz: (i % 2) * 0.22 };
      m.ox = m.cx; m.oz = m.cz; members.push(m);
    }
    const max = pr.patience + 3 * size;
    const [x, z] = pathAt(0);
    return {
      id: G.nextId++, hotel, size, name, vip: !!vip, members, s: 0, x, z, pat: max, max,
      atDesk: false, moving: false, back: false, alpha: 0, grumbled: false, demo: !!demo,
      suitcase: Math.random() < 0.75 ? pick(CASES) : null, bubble: null, banded: false, drinks: false,
    };
  }

  // ---------- speech bubbles ----------
  const bubblesEl = $("#bubbles");
  function say(g, text, secs = 2.4, mood = "") {
    if (!g.bubble) { g.bubble = document.createElement("div"); bubblesEl.appendChild(g.bubble); }
    const b = g.bubble;
    b.className = "bubble" + (mood ? " " + mood : "") + (g.atDesk || g.leaving ? "" : " small");
    b.textContent = text;
    requestAnimationFrame(() => b.classList.add("show"));
    g.bubbleT = secs;
  }
  function dropBubble(g) { if (g.bubble) { g.bubble.remove(); g.bubble = null; } }
  function placeBubble(g) {
    if (!g.bubble) return;
    let sx = 0, top = Infinity;
    g.members.forEach((m) => {
      const p = proj(g.x + m.ox, m.L.hf * 1.78 + 0.14, g.z + m.oz);
      sx += p.x; top = Math.min(top, p.y);
    });
    sx /= g.members.length;
    const half = Math.min(W * 0.29, 115);
    g.bubble.style.left = clamp(sx, half + 6, W - half - 6) + "px";
    g.bubble.style.top = Math.max(top - 4, 70) + "px";
    g.bubble.style.opacity = g.alpha < 0.5 ? "0" : "";
  }

  // ---------- sound (synthesized) ----------
  let ac = null, out = null, muted = store.get("muted", false);
  function actx() {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      out = ac.createGain(); out.gain.value = muted ? 0 : 1; out.connect(ac.destination);
    } catch { ac = null; }
    return ac;
  }
  function tone(f, d, type = "sine", v = 0.06, delay = 0, slide = 0, at = null) {
    const a = actx(); if (!a) return;
    const t = at != null ? at : a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, v = 0.06, delay = 0, freq = 2000, type = "bandpass", at = null) {
    const a = actx(); if (!a) return;
    const len = Math.max(1, Math.floor(a.sampleRate * d)), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    const t = at != null ? at : a.currentTime + delay;
    src.buffer = buf; fl.type = type; fl.frequency.value = freq; g.gain.value = v;
    src.connect(fl).connect(g).connect(out); src.start(t);
  }
  const sfx = {
    band() { tone(1500, 0.05, "square", 0.025); noise(0.05, 0.05, 0, 3500); tone(900, 0.08, "triangle", 0.04, 0.02); },
    drink() { tone(2350, 0.25, "sine", 0.05); tone(3520, 0.18, "sine", 0.025, 0.01); noise(0.06, 0.03, 0, 6000, "highpass"); },
    undo() { tone(500, 0.1, "triangle", 0.05, 0, 0.6); },
    bell() { tone(1318, 0.9, "sine", 0.09); tone(2637, 0.5, "sine", 0.03); tone(3950, 0.3, "sine", 0.015); },
    arrive() { tone(1046, 0.35, "sine", 0.05); tone(784, 0.5, "sine", 0.05, 0.16); },
    good() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.28, "triangle", 0.06, 0.12 + i * 0.07)); },
    bad() { tone(150, 0.32, "sawtooth", 0.06); tone(142, 0.32, "sawtooth", 0.05, 0.02); },
    grumble() { tone(210, 0.25, "sawtooth", 0.03, 0, 0.7); },
    storm() { noise(0.35, 0.18, 0, 180, "lowpass"); tone(300, 0.6, "sawtooth", 0.05, 0.05, 0.4); },
    shiftDone() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.4, "triangle", 0.06, i * 0.1)); },
    nope() { tone(260, 0.12, "square", 0.03); },
  };

  // Steel-drum lobby music: a little calypso loop scheduled ahead on the audio clock.
  const MEL = [72, 0, 76, 79, 0, 76, 74, 0, 77, 0, 81, 0, 79, 77, 76, 0, 74, 0, 79, 83, 0, 81, 79, 0, 76, 74, 72, 0, 67, 0, 72, 0];
  const BASS = [48, 55, 48, 55, 53, 60, 53, 60, 55, 62, 55, 62, 48, 55, 48, 43];
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const music = { on: false, step: 0, next: 0, timer: 0 };
  function steel(f, t, v) { [[1, 1], [2.01, 0.42], [3.93, 0.16]].forEach(([h, g]) => tone(f * h, 0.5 / h + 0.08, "sine", v * g, 0, 0, t)); }
  function musicTick() {
    const a = ac; if (!a || !music.on) return;
    const beat = 60 / 116 / 2;
    if (music.next < a.currentTime) music.next = a.currentTime + 0.05;
    while (music.next < a.currentTime + 0.3) {
      const st = music.step % 32, n = MEL[st], t = music.next;
      if (n) steel(mtof(n), t, 0.03);
      if (st % 2 === 0) tone(mtof(BASS[st >> 1] - 12) * 2, 0.32, "triangle", 0.045, 0, 0, t);
      if (st % 2 === 1) noise(0.04, 0.012, 0, 7000, "highpass", t);
      music.next += beat; music.step++;
    }
  }
  function startMusic() { if (!actx() || music.on) return; if (ac.state === "suspended") ac.resume(); music.on = true; music.timer = setInterval(musicTick, 80); }

  const muteBtn = $("#mute");
  function applyMute() { muteBtn.classList.toggle("muted", muted); muteBtn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound"); if (out) out.gain.value = muted ? 0 : 1; }
  muteBtn.addEventListener("click", () => { muted = !muted; store.set("muted", muted); actx(); applyMute(); muteBtn.blur(); });
  applyMute();

  // ---------- layout ----------
  let bg = null, fg = null, OUT = null;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(200, r.width); H = Math.max(300, r.height);
    DPR = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const ctrl = deskEl.offsetHeight;
    STRIP = clamp(H * 0.12, 58, 104);
    CE = H - ctrl - STRIP;
    HY = H * 0.055;
    F = Math.max(120, (CE - HY) / ((CH - CTOP) / CZ));
    ITEM_Y = CE + STRIP * 0.72;
    const itemZ = (F * (CH - CTOP)) / (ITEM_Y - HY);
    ISC = F / itemZ;
    bg = renderBackground();
    fg = renderCounter();
  }

  function layer() {
    const c = document.createElement("canvas");
    c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    const x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0);
    return [c, x];
  }
  const floorPt = (x, z) => proj(x, 0, z);
  function quad(c, pts) { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); }
  function wallRect(x0, y0, x1, y1) { const a = proj(x0, y1, WALL_Z), b = proj(x1, y0, WALL_Z); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; }

  const PANES = [[-2.55, -1.2], [-1.1, 0.25], [0.35, 1.7], [1.8, 3.15]];
  const WIN_Y = [0.95, 3.35];
  const DOOR = [-4.35, -2.9, 2.55];

  function renderBackground() {
    const [c, x] = layer();
    const floorY = proj(0, 0, WALL_Z).y;
    // back wall
    let g = x.createLinearGradient(0, 0, 0, floorY);
    g.addColorStop(0, "#F7EADB"); g.addColorStop(1, "#F0D9C2");
    x.fillStyle = g; x.fillRect(0, 0, W, floorY + 1);
    // wainscot of teal slats with a brass rail
    const wy = proj(0, 0.9, WALL_Z).y;
    x.fillStyle = "#1F7A80"; x.fillRect(0, wy, W, floorY - wy + 1);
    x.strokeStyle = "rgba(255,255,255,.12)"; x.lineWidth = 1;
    for (let wx = -30; wx <= 30; wx += 0.32) { const p = proj(wx, 0, WALL_Z); if (p.x < -2 || p.x > W + 2) continue; x.beginPath(); x.moveTo(p.x, wy + 2); x.lineTo(p.x, floorY); x.stroke(); }
    x.fillStyle = "#D4A64A"; x.fillRect(0, wy - 2, W, 3);
    // directory board (colors of the three hotels)
    const d = wallRect(3.45, 1.1, 4.45, 2.55);
    x.fillStyle = "#0E5E6F"; x.fillRect(d.x, d.y, d.w, d.h);
    x.strokeStyle = "#D4A64A"; x.lineWidth = 2; x.strokeRect(d.x, d.y, d.w, d.h);
    [HOTELS.rosewood, HOTELS.hyatt, HOTELS.sls].forEach((h, i) => {
      const yy = d.y + d.h * (0.2 + i * 0.28);
      x.strokeStyle = h.band; x.lineWidth = Math.max(2, d.h * 0.06);
      x.beginPath(); x.ellipse(d.x + d.w * 0.22, yy, d.w * 0.1, d.h * 0.045, 0, 0, TAU); x.stroke();
      x.fillStyle = "rgba(255,255,255,.85)"; x.fillRect(d.x + d.w * 0.4, yy - 1, d.w * 0.46, Math.max(2, d.h * 0.04));
    });
    // wall sconces between panes
    for (const sx of [-4.9, 3.3]) {
      const p = proj(sx, 2.3, WALL_Z), rr = proj(0, 0, WALL_Z).s * 0.9;
      const gl = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      gl.addColorStop(0, "rgba(255,230,170,.7)"); gl.addColorStop(1, "rgba(255,230,170,0)");
      x.fillStyle = gl; x.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
    }
    // cut the windows and door out; the animated outdoors shows through
    x.globalCompositeOperation = "destination-out";
    x.fillStyle = "#000";
    OUT = { x0: W, y0: H, x1: 0, y1: 0 };
    const holes = PANES.map(([a, b]) => wallRect(a, WIN_Y[0], b, WIN_Y[1])).concat([wallRect(DOOR[0], 0, DOOR[1], DOOR[2])]);
    holes.forEach((h) => {
      x.fillRect(h.x, h.y, h.w, h.h);
      OUT.x0 = Math.min(OUT.x0, h.x); OUT.y0 = Math.min(OUT.y0, h.y); OUT.x1 = Math.max(OUT.x1, h.x + h.w); OUT.y1 = Math.max(OUT.y1, h.y + h.h);
    });
    x.globalCompositeOperation = "source-over";
    // frames
    x.strokeStyle = "#FFFFFF"; x.lineWidth = Math.max(2, proj(0, 0, WALL_Z).s * 0.07);
    holes.slice(0, 4).forEach((h) => { x.strokeRect(h.x, h.y, h.w, h.h); x.beginPath(); x.moveTo(h.x, h.y + h.h * 0.34); x.lineTo(h.x + h.w, h.y + h.h * 0.34); x.stroke(); });
    const dh = holes[4];
    x.strokeStyle = "#D4A64A"; x.lineWidth = Math.max(2.5, proj(0, 0, WALL_Z).s * 0.09); x.strokeRect(dh.x, dh.y, dh.w, dh.h);
    x.beginPath(); x.moveTo(dh.x + dh.w / 2, dh.y); x.lineTo(dh.x + dh.w / 2, dh.y + dh.h); x.lineWidth = 1.5; x.stroke();

    // marble floor tiles in perspective
    const T = 1.0;
    for (let z = 3.0; z < WALL_Z; z += T) {
      const z2 = Math.min(WALL_Z, z + T);
      for (let tx = -24; tx < 24; tx += T) {
        const a = floorPt(tx, z), b = floorPt(tx + T, z);
        if (b.x < 0 || a.x > W) continue;
        const odd = (Math.round(tx / T) + Math.round(z / T)) & 1;
        x.fillStyle = odd ? "#EEDFCB" : "#F7EEE2";
        quad(x, [a, b, floorPt(tx + T, z2), floorPt(tx, z2)]); x.fill();
      }
    }
    x.strokeStyle = "rgba(160,130,95,.18)"; x.lineWidth = 1;
    for (let z = 3.0; z <= WALL_Z; z += T) { const p = floorPt(0, z); x.beginPath(); x.moveTo(0, p.y); x.lineTo(W, p.y); x.stroke(); }
    for (let tx = -24; tx <= 24; tx += T) { const a = floorPt(tx, 3), b = floorPt(tx, WALL_Z); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }

    // compass-rose medallion inlaid under the queue
    const ring = (r, fill, alpha) => {
      x.beginPath();
      for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU, p = floorPt(Math.cos(a) * r, 9.4 + Math.sin(a) * r * 0.9); i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); }
      x.globalAlpha = alpha; x.fillStyle = fill; x.fill(); x.globalAlpha = 1;
    };
    ring(3.0, "#2EC4B6", 0.28); ring(2.72, "#F7EEE2", 1); ring(2.5, "#D4A64A", 0.35); ring(2.3, "#F4E6D2", 1);
    x.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, r = i % 2 ? 0.7 : 2.2, p = floorPt(Math.cos(a) * r, 9.4 + Math.sin(a) * r * 0.9);
      i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y);
    }
    x.closePath(); x.globalAlpha = 0.35; x.fillStyle = "#FF6F61"; x.fill(); x.globalAlpha = 1;
    ring(0.45, "#0E5E6F", 0.5);

    // sunlight spilling through the windows onto the floor
    PANES.forEach(([a, b]) => {
      x.fillStyle = "rgba(255,246,214,.22)";
      quad(x, [floorPt(a, WALL_Z), floorPt(b, WALL_Z), floorPt(b + 1.4, WALL_Z - 5.5), floorPt(a + 1.4, WALL_Z - 5.5)]); x.fill();
    });
    g = x.createLinearGradient(0, floorY, 0, CE);
    g.addColorStop(0, "rgba(255,248,230,.25)"); g.addColorStop(1, "rgba(120,80,40,.06)");
    x.fillStyle = g; x.fillRect(0, floorY, W, CE - floorY);
    // baseboard
    x.fillStyle = "#0B4F58"; x.fillRect(0, floorY - 2, W, 3);
    return c;
  }

  function renderCounter() {
    const [c, x] = layer();
    // marble countertop from the far edge to the bottom of the screen
    let g = x.createLinearGradient(0, CE, 0, H);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.3, "#F6F1EA"); g.addColorStop(1, "#E4DACB");
    x.fillStyle = g; x.fillRect(0, CE, W, H - CE);
    x.save(); x.beginPath(); x.rect(0, CE, W, H - CE); x.clip();
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = `rgba(120,110,100,${rand(0.06, 0.14)})`; x.lineWidth = rand(0.6, 1.6);
      let px = rand(-40, W), py = CE + rand(0, H - CE);
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 4; k++) { const nx = px + rand(40, 120), ny = py + rand(-30, 30); x.quadraticCurveTo((px + nx) / 2 + rand(-20, 20), (py + ny) / 2 + rand(-20, 20), nx, ny); px = nx; py = ny; }
      x.stroke();
    }
    x.restore();
    // far edge: brass trim and the shadow it throws on the marble
    g = x.createLinearGradient(0, CE, 0, CE + 18);
    g.addColorStop(0, "rgba(60,40,20,.14)"); g.addColorStop(1, "rgba(60,40,20,0)");
    x.fillStyle = g; x.fillRect(0, CE, W, 18);
    x.fillStyle = "#B0832E"; x.fillRect(0, CE - 3, W, 3);
    x.fillStyle = "#F2D48A"; x.fillRect(0, CE - 3, W, 1.2);
    // hibiscus in a glass vase on the left, a brass nameplate on the right
    const s = ISC, vx = 26, vy = ITEM_Y + 2;
    x.fillStyle = "rgba(200,235,240,.55)"; x.strokeStyle = "rgba(120,170,180,.7)"; x.lineWidth = 1.2;
    x.beginPath(); x.roundRect(vx - s * 0.05, vy - s * 0.14, s * 0.1, s * 0.14, 4); x.fill(); x.stroke();
    x.strokeStyle = "#2F8F5B"; x.lineWidth = 2;
    [[-0.07, -0.26], [0.01, -0.3], [0.08, -0.24]].forEach(([dx, dy]) => { x.beginPath(); x.moveTo(vx, vy - s * 0.12); x.quadraticCurveTo(vx + dx * s * 0.4, vy + dy * s * 0.6, vx + dx * s, vy + dy * s); x.stroke(); });
    [[-0.07, -0.26, "#E63946"], [0.01, -0.3, "#FF5AAE"], [0.08, -0.24, "#FF6F61"]].forEach(([dx, dy, col]) => {
      const fx = vx + dx * s, fy = vy + dy * s;
      x.fillStyle = col;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; x.beginPath(); x.ellipse(fx + Math.cos(a) * s * 0.022, fy + Math.sin(a) * s * 0.022, s * 0.026, s * 0.016, a, 0, TAU); x.fill(); }
      x.fillStyle = "#FFD166"; x.beginPath(); x.arc(fx, fy, s * 0.01, 0, TAU); x.fill();
    });
    const nw = Math.min(88, s * 0.42), nh = Math.max(15, s * 0.07), nx = W - nw - 12, ny = ITEM_Y - nh;
    g = x.createLinearGradient(nx, ny, nx, ny + nh);
    g.addColorStop(0, "#5B3A1E"); g.addColorStop(1, "#3A2412");
    x.fillStyle = g; x.beginPath(); x.roundRect(nx, ny, nw, nh, 3); x.fill();
    x.fillStyle = "#F2D48A"; x.font = `800 ${Math.round(nh * 0.5)}px Outfit, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("BAHA MAR", nx + nw / 2, ny + nh / 2 + 1);
    return c;
  }

  // ---------- the outdoors through the windows ----------
  function drawOutside(c) {
    const { x0, y0, x1, y1 } = OUT, w = x1 - x0, h = y1 - y0, t = G.t;
    const unit = proj(0, 0, WALL_Z).s; // pixels per meter on the back wall
    const horizon = proj(0, 1.7, WALL_Z).y;
    let g = c.createLinearGradient(0, y0, 0, horizon);
    g.addColorStop(0, "#5EC4EA"); g.addColorStop(1, "#D6F3F7");
    c.fillStyle = g; c.fillRect(x0, y0, w, horizon - y0 + 1);
    // sun + clouds
    const sx = x0 + w * 0.76, sy = y0 + (horizon - y0) * 0.3;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, unit * 1.2);
    sg.addColorStop(0, "rgba(255,250,220,1)"); sg.addColorStop(0.3, "rgba(255,240,180,.9)"); sg.addColorStop(1, "rgba(255,240,180,0)");
    c.fillStyle = sg; c.fillRect(sx - unit * 1.2, sy - unit * 1.2, unit * 2.4, unit * 2.4);
    c.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < 3; i++) {
      const cx = x0 + ((i * 97 + t * 5) % (w + 80)) - 40, cy = y0 + (horizon - y0) * (0.25 + i * 0.18);
      c.beginPath(); c.ellipse(cx, cy, unit * 0.6, unit * 0.14, 0, 0, TAU); c.ellipse(cx + unit * 0.25, cy - unit * 0.1, unit * 0.3, unit * 0.14, 0, 0, TAU); c.fill();
    }
    // the curved Baha Mar towers far across the lagoon
    const tw = unit * 0.9;
    [[0.08, 1.7, "#FDF6EE"], [0.2, 2.2, "#FFFFFF"], [0.33, 1.9, "#F8EFE6"]].forEach(([fx, th, col]) => {
      const bx = x0 + w * fx, top = horizon - unit * th;
      c.fillStyle = col; c.beginPath(); c.moveTo(bx, horizon); c.lineTo(bx, top + tw * 0.4); c.quadraticCurveTo(bx + tw / 2, top - tw * 0.25, bx + tw, top + tw * 0.4); c.lineTo(bx + tw, horizon); c.fill();
      c.fillStyle = "rgba(94,196,234,.35)";
      for (let r = top + tw * 0.5; r < horizon - 3; r += Math.max(3, unit * 0.13)) c.fillRect(bx + 2, r, tw - 4, 1);
    });
    // the sea
    const sandY = proj(0, 1.05, WALL_Z).y;
    g = c.createLinearGradient(0, horizon, 0, sandY);
    g.addColorStop(0, "#1BA9C4"); g.addColorStop(0.5, "#2ECFD8"); g.addColorStop(1, "#7FE6E0");
    c.fillStyle = g; c.fillRect(x0, horizon, w, sandY - horizon + 1);
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const yy = horizon + ((i * 0.37) % 1) * (sandY - horizon), xx = x0 + ((i * 53 + t * (6 + (i % 3) * 3)) % (w + 40)) - 20;
      const len = unit * (0.2 + (i % 4) * 0.1) * (0.6 + Math.sin(t * 2 + i) * 0.4);
      c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + len, yy); c.stroke();
    }
    // sand
    g = c.createLinearGradient(0, sandY, 0, y1);
    g.addColorStop(0, "#FFF1CF"); g.addColorStop(1, "#F2D9A6");
    c.fillStyle = g; c.fillRect(x0, sandY, w, y1 - sandY);
    c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(x0, sandY, w, 1.5);
    // flamingos strolling
    for (let i = 0; i < 2; i++) {
      const fx = x0 + ((t * 7 + i * (w * 0.5 + 60)) % (w + 80)) - 40;
      flamingo(c, fx, sandY + unit * (0.35 + i * 0.1), unit * 0.95, t * 3 + i);
    }
    // palms in front
    [[0.02, 2.7], [0.46, 2.3], [0.62, 2.9], [0.97, 2.5]].forEach(([fx, hgt], i) => palm(c, x0 + w * fx, sandY + unit * 0.5, unit * hgt, t, i));
  }
  function flamingo(c, x, y, s, step) {
    const lift = Math.max(0, Math.sin(step)) * s * 0.06;
    c.strokeStyle = "#D9577A"; c.lineWidth = Math.max(1, s * 0.03); c.lineCap = "round";
    c.beginPath(); c.moveTo(x, y - s * 0.55); c.lineTo(x - s * 0.02, y); c.moveTo(x + s * 0.02, y - s * 0.55); c.lineTo(x + s * 0.06, y - lift); c.stroke();
    c.fillStyle = "#F48FB1"; c.beginPath(); c.ellipse(x, y - s * 0.62, s * 0.2, s * 0.09, -0.15, 0, TAU); c.fill();
    c.strokeStyle = "#F48FB1"; c.lineWidth = Math.max(1.2, s * 0.045);
    c.beginPath(); c.moveTo(x + s * 0.14, y - s * 0.66); c.quadraticCurveTo(x + s * 0.34, y - s * 0.84, x + s * 0.2, y - s * 1.0); c.stroke();
    c.fillStyle = "#F48FB1"; c.beginPath(); c.arc(x + s * 0.21, y - s * 1.02, s * 0.05, 0, TAU); c.fill();
    c.strokeStyle = "#2B2D42"; c.lineWidth = Math.max(1, s * 0.03); c.beginPath(); c.moveTo(x + s * 0.25, y - s * 1.02); c.lineTo(x + s * 0.3, y - s * 0.96); c.stroke();
  }
  function palm(c, x, y, hgt, t, i) {
    const sway = Math.sin(t * 0.9 + i * 1.7) * hgt * 0.03, topX = x + hgt * 0.12 + sway, topY = y - hgt;
    c.strokeStyle = "#8A6A45"; c.lineWidth = Math.max(2, hgt * 0.05); c.lineCap = "round";
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + hgt * 0.02, y - hgt * 0.6, topX, topY); c.stroke();
    c.strokeStyle = "#2E8B57"; c.lineWidth = Math.max(1.5, hgt * 0.045);
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.55 + Math.sin(t * 1.3 + k + i) * 0.06, len = hgt * (0.38 + (k % 2) * 0.08);
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.55 + len * 0.3;
      c.beginPath(); c.moveTo(topX, topY); c.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.6 - len * 0.1, ex, ey); c.stroke();
    }
  }

  // ---------- lobby props ----------
  function drawPost(c, x, z) {
    const p = proj(x, 0, z), k = p.s;
    c.fillStyle = "rgba(70,45,25,.18)"; c.beginPath(); c.ellipse(p.x, p.y, k * 0.2, k * 0.05, 0, 0, TAU); c.fill();
    c.fillStyle = "#B0832E"; c.beginPath(); c.ellipse(p.x, p.y - k * 0.02, k * 0.15, k * 0.04, 0, 0, TAU); c.fill();
    const g = c.createLinearGradient(p.x - k * 0.03, 0, p.x + k * 0.03, 0);
    g.addColorStop(0, "#9C7634"); g.addColorStop(0.45, "#F2D48A"); g.addColorStop(1, "#9C7634");
    c.fillStyle = g; c.fillRect(p.x - k * 0.025, p.y - k * 0.95, k * 0.05, k * 0.93);
    c.fillStyle = "#F2D48A"; c.beginPath(); c.arc(p.x, p.y - k * 0.97, k * 0.045, 0, TAU); c.fill();
  }
  function drawRope(c, x1, x2, z) {
    const a = proj(x1, 0.88, z), b = proj(x2, 0.88, z), sag = a.s * 0.14;
    c.strokeStyle = "#0E6F7A"; c.lineWidth = Math.max(1.5, a.s * 0.045); c.lineCap = "round";
    c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag * 2, b.x, b.y); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = Math.max(0.6, a.s * 0.012);
    c.beginPath(); c.moveTo(a.x, a.y - 1); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag * 2 - 1, b.x, b.y - 1); c.stroke();
  }
  function drawPlant(c, x, z, i) {
    const p = proj(x, 0, z), k = p.s, t = G.t;
    c.fillStyle = "rgba(70,45,25,.2)"; c.beginPath(); c.ellipse(p.x, p.y, k * 0.36, k * 0.08, 0, 0, TAU); c.fill();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(p.x - k * 0.3, p.y - k * 0.6); c.lineTo(p.x + k * 0.3, p.y - k * 0.6); c.lineTo(p.x + k * 0.22, p.y); c.lineTo(p.x - k * 0.22, p.y); c.fill();
    c.fillStyle = "#D4A64A"; c.fillRect(p.x - k * 0.3, p.y - k * 0.62, k * 0.6, k * 0.05);
    const top = p.y - k * 2.1, tx = p.x + Math.sin(t * 0.7 + i) * k * 0.03;
    c.strokeStyle = "#7C5A38"; c.lineWidth = k * 0.07; c.lineCap = "round";
    c.beginPath(); c.moveTo(p.x, p.y - k * 0.6); c.quadraticCurveTo(p.x - k * 0.05, p.y - k * 1.4, tx, top); c.stroke();
    for (let f = 0; f < 8; f++) {
      const a = -Math.PI / 2 + (f - 3.5) * 0.46 + Math.sin(t * 1.1 + f + i * 2) * 0.05, len = k * (0.75 + (f % 2) * 0.2);
      c.strokeStyle = f % 2 ? "#2E8B57" : "#3FA56B"; c.lineWidth = k * 0.09;
      c.beginPath(); c.moveTo(tx, top);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, top + Math.sin(a) * len * 0.5 - k * 0.2, tx + Math.cos(a) * len, top + Math.sin(a) * len * 0.35 + len * 0.45);
      c.stroke();
    }
  }
  function drawSuitcase(c, x, z, col) {
    const p = proj(x, 0, z), k = p.s;
    c.fillStyle = "rgba(70,45,25,.18)"; c.beginPath(); c.ellipse(p.x, p.y, k * 0.2, k * 0.05, 0, 0, TAU); c.fill();
    c.strokeStyle = "#555"; c.lineWidth = k * 0.02;
    c.beginPath(); c.moveTo(p.x - k * 0.06, p.y - k * 0.5); c.lineTo(p.x - k * 0.06, p.y - k * 0.78); c.lineTo(p.x + k * 0.06, p.y - k * 0.78); c.lineTo(p.x + k * 0.06, p.y - k * 0.5); c.stroke();
    c.fillStyle = col; c.beginPath(); c.roundRect(p.x - k * 0.16, p.y - k * 0.54, k * 0.32, k * 0.5, k * 0.04); c.fill();
    c.fillStyle = "rgba(255,255,255,.18)";
    for (let i = -1; i <= 1; i++) c.fillRect(p.x + i * k * 0.08 - k * 0.012, p.y - k * 0.5, k * 0.024, k * 0.42);
    c.fillStyle = "#222"; c.beginPath(); c.arc(p.x - k * 0.1, p.y - k * 0.02, k * 0.025, 0, TAU); c.arc(p.x + k * 0.1, p.y - k * 0.02, k * 0.025, 0, TAU); c.fill();
  }

  // ---------- people ----------
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`; }
  function shade(h, amt) { return mix(h, amt < 0 ? "#000000" : "#FFFFFF", Math.abs(amt)); }
  function limb(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }

  function drawPerson(c, L, sx, sy, s, o) {
    const k = s * L.hf, bw = L.width, t = G.t;
    const p = o.p == null ? 1 : o.p;
    const anger = clamp((0.42 - p) / 0.42, 0, 1), fury = p < 0.16;
    const mv = o.moving ? 1 : 0;
    const jx = fury ? Math.sin(t * 42 + L.seed) * 0.014 * k : 0;
    const bob = mv * Math.abs(Math.sin(o.phase)) * 0.03 * k + (o.hop || 0) * k;
    const x = sx + jx, y = sy - bob;
    const hip = y - 0.86 * k, sh = y - 1.4 * k;
    c.save();
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.lineCap = "round"; c.lineJoin = "round";
    c.fillStyle = "rgba(70,45,25,.22)"; c.beginPath(); c.ellipse(sx, sy, 0.27 * k * bw, 0.075 * k, 0, 0, TAU); c.fill();

    // legs
    for (const side of [-1, 1]) {
      const lift = mv * Math.max(0, Math.sin(o.phase + (side > 0 ? Math.PI : 0))) * 0.08 * k;
      const lx = x + side * 0.07 * k * bw, fy = y - lift;
      c.strokeStyle = L.skin; c.lineWidth = 0.085 * k; limb(c, lx, hip, lx, fy - 0.04 * k);
      if (!L.dress) { c.strokeStyle = L.legs; c.lineWidth = 0.105 * k; limb(c, lx, hip, lx, L.shorts ? hip + 0.34 * k : fy - 0.07 * k); }
      c.fillStyle = L.shoe; c.beginPath(); c.ellipse(lx, fy - 0.025 * k, 0.055 * k, 0.03 * k, 0, 0, TAU); c.fill();
    }

    // back hair (long) sits behind everything above the waist
    const hc = y - 1.575 * k, rx = 0.118 * k, ry = 0.135 * k;
    if (!o.back && L.hair === "long") { c.fillStyle = L.hairC; c.beginPath(); c.roundRect(x - rx * 1.2, hc - ry * 0.6, rx * 2.4, ry * 2.6, rx * 0.8); c.fill(); }

    // arms (skin, then sleeves)
    const hands = [];
    for (const side of [-1, 1]) {
      const swing = mv * Math.sin(o.phase + (side < 0 ? Math.PI : 0));
      const shx = x + side * 0.19 * k * bw, shy = sh + 0.04 * k;
      let hx = x + side * 0.25 * k * bw, hy = y - 0.84 * k - swing * 0.04 * k;
      if (side > 0 && o.drink) { hx = x + 0.2 * k * bw; hy = y - 1.05 * k; }
      hands.push([hx, hy, shx, shy]);
      c.strokeStyle = L.skin; c.lineWidth = 0.075 * k; limb(c, shx, shy, hx, hy);
      c.strokeStyle = L.top; c.lineWidth = 0.1 * k; limb(c, shx, shy, lerp(shx, hx, 0.32), lerp(shy, hy, 0.32));
      c.fillStyle = L.skin; c.beginPath(); c.arc(hx, hy, 0.042 * k, 0, TAU); c.fill();
    }

    // torso or dress
    const wT = 0.4 * k * bw, wB = (L.dress ? 0.56 : 0.34) * k * bw, bot = L.dress ? y - 0.48 * k : hip + 0.03 * k;
    c.beginPath();
    c.moveTo(x - wT / 2, sh + wT * 0.14); c.quadraticCurveTo(x - wT / 2, sh, x - wT / 2 + wT * 0.2, sh);
    c.lineTo(x + wT / 2 - wT * 0.2, sh); c.quadraticCurveTo(x + wT / 2, sh, x + wT / 2, sh + wT * 0.14);
    c.lineTo(x + wB / 2, bot); c.lineTo(x - wB / 2, bot); c.closePath();
    c.fillStyle = L.top; c.fill();
    if (L.pattern !== "plain") {
      c.save(); c.clip(); c.fillStyle = L.accent; c.strokeStyle = L.accent;
      if (L.pattern === "stripe") { c.lineWidth = 0.028 * k; for (let yy = sh + 0.05 * k; yy < bot; yy += 0.075 * k) limb(c, x - wB, yy, x + wB, yy); }
      else { for (let i = 0; i < 7; i++) { const fx = x + (((i * 37) % 10) / 10 - 0.5) * wB, fy = sh + ((i * 0.13) % 1) * (bot - sh); c.beginPath(); c.arc(fx, fy, 0.03 * k, 0, TAU); c.fill(); } }
      c.restore();
    }
    c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(x - wB / 2, bot - 0.03 * k, wB, 0.03 * k);

    // wrist band (the room key) on the left wrist, welcome drink in the right hand
    if (o.band) {
      const [hx, hy, shx, shy] = hands[0], bx = lerp(shx, hx, 0.86), byy = lerp(shy, hy, 0.86);
      c.strokeStyle = o.band; c.lineWidth = 0.034 * k;
      c.beginPath(); c.ellipse(bx, byy, 0.05 * k, 0.022 * k, 0, 0, TAU); c.stroke();
    }
    if (o.drink) {
      const [hx, hy] = hands[1];
      drawGlass(c, hx, hy + 0.03 * k, k * 0.55, 1);
    }

    // neck and head
    c.fillStyle = shade(L.skin, -0.08); c.fillRect(x - 0.035 * k, sh - 0.07 * k, 0.07 * k, 0.09 * k);
    const face = mix(L.skin, "#E4573F", anger * 0.45);
    if (o.back) {
      c.fillStyle = L.hair === "bald" ? L.skin : L.hairC;
      c.beginPath(); c.ellipse(x, hc, rx, ry, 0, 0, TAU); c.fill();
      if (L.hair === "long") { c.beginPath(); c.roundRect(x - rx * 1.1, hc, rx * 2.2, ry * 1.8, rx * 0.6); c.fill(); }
      if (L.hair === "bun") { c.beginPath(); c.arc(x, hc - ry * 0.6, 0.06 * k, 0, TAU); c.fill(); }
      if (L.hair === "pony") { c.beginPath(); c.ellipse(x, hc + ry * 0.9, 0.04 * k, 0.11 * k, 0, 0, TAU); c.fill(); }
    } else {
      c.fillStyle = face;
      c.beginPath(); c.arc(x - rx, hc + 0.01 * k, 0.03 * k, 0, TAU); c.arc(x + rx, hc + 0.01 * k, 0.03 * k, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(x, hc, rx, ry, 0, 0, TAU); c.fill();
      // hair
      c.fillStyle = L.hairC;
      if (L.hair === "curly") {
        for (let a = -3.3; a <= 0.15; a += 0.42) { c.beginPath(); c.arc(x + Math.cos(a) * rx * 0.95, hc - 0.02 * k + Math.sin(a) * ry * 0.9, 0.05 * k, 0, TAU); c.fill(); }
      } else if (L.hair !== "bald") {
        c.beginPath(); c.ellipse(x, hc - 0.025 * k, rx * 1.06, ry * 0.88, 0, Math.PI * 1.02, Math.PI * 1.98); c.fill();
        c.beginPath(); c.ellipse(x - rx * 0.3, hc - ry * 0.55, rx * 0.7, ry * 0.3, -0.25, 0, TAU); c.fill();
        if (L.hair === "long") { c.fillRect(x - rx * 1.08, hc - 0.03 * k, 0.045 * k, 0.2 * k); c.fillRect(x + rx * 1.08 - 0.045 * k, hc - 0.03 * k, 0.045 * k, 0.2 * k); }
        if (L.hair === "bun") { c.beginPath(); c.arc(x, hc - ry - 0.035 * k, 0.058 * k, 0, TAU); c.fill(); }
        if (L.hair === "pony") { c.beginPath(); c.ellipse(x + rx * 1.05, hc + 0.03 * k, 0.038 * k, 0.1 * k, -0.3, 0, TAU); c.fill(); }
      } else {
        c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.ellipse(x - rx * 0.3, hc - ry * 0.6, rx * 0.3, ry * 0.15, -0.3, 0, TAU); c.fill();
      }
      // face
      const ey = hc + 0.005 * k, ex = 0.045 * k;
      if (L.shades) {
        c.fillStyle = "#17171A";
        c.beginPath(); c.roundRect(x - ex - 0.034 * k, ey - 0.022 * k, 0.068 * k, 0.042 * k, 0.012 * k); c.roundRect(x + ex - 0.034 * k, ey - 0.022 * k, 0.068 * k, 0.042 * k, 0.012 * k); c.fill();
        c.strokeStyle = "#17171A"; c.lineWidth = 0.012 * k; limb(c, x - ex + 0.03 * k, ey - 0.01 * k, x + ex - 0.03 * k, ey - 0.01 * k);
      } else {
        c.fillStyle = "#2A1B12";
        if (fury) { c.strokeStyle = "#2A1B12"; c.lineWidth = 0.014 * k; limb(c, x - ex - 0.018 * k, ey, x - ex + 0.018 * k, ey); limb(c, x + ex - 0.018 * k, ey, x + ex + 0.018 * k, ey); }
        else { c.beginPath(); c.ellipse(x - ex, ey, 0.015 * k, 0.019 * k, 0, 0, TAU); c.ellipse(x + ex, ey, 0.015 * k, 0.019 * k, 0, 0, TAU); c.fill(); }
      }
      c.strokeStyle = shade(L.hairC === "#E6C77E" ? "#A07A40" : L.hairC, -0.1); c.lineWidth = 0.014 * k;
      const bY = ey - 0.045 * k;
      limb(c, x - ex - 0.03 * k, bY - (1 - anger) * 0.008 * k, x - ex + 0.022 * k, bY + anger * 0.03 * k);
      limb(c, x + ex + 0.03 * k, bY - (1 - anger) * 0.008 * k, x + ex - 0.022 * k, bY + anger * 0.03 * k);
      const my = hc + 0.068 * k;
      c.strokeStyle = "#7A2E2A"; c.lineWidth = 0.014 * k;
      if (fury) { c.fillStyle = "#5A1D1A"; c.beginPath(); c.ellipse(x, my + 0.005 * k, 0.03 * k, 0.02 * k, 0, 0, TAU); c.fill(); }
      else if (p > 0.55) { c.beginPath(); c.arc(x, my - 0.025 * k, 0.038 * k, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); c.fillStyle = "rgba(255,120,120,.28)"; c.beginPath(); c.arc(x - 0.07 * k, my - 0.02 * k, 0.022 * k, 0, TAU); c.arc(x + 0.07 * k, my - 0.02 * k, 0.022 * k, 0, TAU); c.fill(); }
      else if (p > 0.3) limb(c, x - 0.028 * k, my, x + 0.028 * k, my);
      else { c.beginPath(); c.arc(x, my + 0.03 * k, 0.034 * k, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
      if (fury) {
        const vx = x + rx * 0.85, vy = hc - ry * 0.85, v = 0.028 * k;
        c.strokeStyle = "#E63946"; c.lineWidth = 0.016 * k;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.arc(vx + Math.cos(a) * v * 1.4, vy + Math.sin(a) * v * 1.4, v, a + Math.PI * 0.75, a + Math.PI * 1.25); c.stroke(); }
      }
    }
    // hats
    if (L.hat === "straw") {
      c.fillStyle = "#E9C98B";
      c.beginPath(); c.ellipse(x, hc - ry * 0.55, 0.25 * k, 0.055 * k, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(x, hc - ry * 0.6, 0.13 * k, 0.11 * k, 0, Math.PI, TAU); c.fill();
      c.fillStyle = L.accent; c.fillRect(x - 0.13 * k, hc - ry * 0.6 - 0.035 * k, 0.26 * k, 0.03 * k);
    } else if (L.hat === "cap") {
      c.fillStyle = L.accent;
      c.beginPath(); c.ellipse(x, hc - ry * 0.4, rx * 1.1, ry * 0.8, 0, Math.PI, TAU); c.fill();
      if (!o.back) { c.fillStyle = shade(L.accent, -0.2); c.beginPath(); c.ellipse(x, hc - ry * 0.42, 0.13 * k, 0.035 * k, 0, 0, TAU); c.fill(); }
    }
    c.restore();
  }

  function drawGlass(c, x, y, s, a) {
    // a tall welcome drink: glass, sunset-colored juice, straw and an orange wheel. (x, y) = base center; s = px per meter
    c.save(); c.globalAlpha *= a;
    const w = 0.075 * s, h = 0.17 * s;
    c.fillStyle = "rgba(60,40,20,.15)"; c.beginPath(); c.ellipse(x, y, w * 0.7, w * 0.18, 0, 0, TAU); c.fill();
    const g = c.createLinearGradient(0, y - h * 0.8, 0, y);
    g.addColorStop(0, "#FFC15E"); g.addColorStop(0.6, "#FF7A59"); g.addColorStop(1, "#E8436B");
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w * 0.46, y - h * 0.78); c.lineTo(x + w * 0.46, y - h * 0.78); c.lineTo(x + w * 0.38, y); c.lineTo(x - w * 0.38, y); c.fill();
    c.strokeStyle = "rgba(150,190,200,.9)"; c.lineWidth = Math.max(1, s * 0.006);
    c.beginPath(); c.moveTo(x - w * 0.5, y - h); c.lineTo(x - w * 0.38, y); c.lineTo(x + w * 0.38, y); c.lineTo(x + w * 0.5, y - h); c.stroke();
    c.strokeStyle = "#FF5AAE"; c.lineWidth = Math.max(1.2, s * 0.01);
    c.beginPath(); c.moveTo(x + w * 0.1, y - h * 0.4); c.lineTo(x + w * 0.35, y - h * 1.25); c.stroke();
    c.fillStyle = "#FFB347"; c.beginPath(); c.arc(x + w * 0.5, y - h * 0.95, w * 0.3, 0, TAU); c.fill();
    c.fillStyle = "#FFE08A"; c.beginPath(); c.arc(x + w * 0.5, y - h * 0.95, w * 0.2, 0, TAU); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x - w * 0.36, y - h * 0.9, w * 0.1, h * 0.8);
    c.restore();
  }
  function drawBand(c, x, y, s, hotel, a) {
    const H0 = HOTELS[hotel], rx = 0.078 * s, ry = 0.034 * s;
    c.save(); c.globalAlpha *= a;
    c.fillStyle = "rgba(60,40,20,.14)"; c.beginPath(); c.ellipse(x, y + ry * 0.5, rx * 1.05, ry * 1.1, 0, 0, TAU); c.fill();
    c.lineWidth = 0.026 * s;
    c.strokeStyle = H0.dark; c.beginPath(); c.ellipse(x, y + 1.2, rx, ry, 0, 0, TAU); c.stroke();
    c.strokeStyle = H0.band; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 0.008 * s; c.beginPath(); c.ellipse(x, y - 1, rx * 0.95, ry * 0.9, 0, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect(x - 0.022 * s, y + ry - 0.016 * s, 0.044 * s, 0.026 * s, 0.006 * s); c.fill();
    c.restore();
  }

  // ---------- group helpers ----------
  const desk = () => { const g = G.queue[0]; return g && g.atDesk ? g : null; };
  function memberPos(g, m) { return [g.x + m.ox, g.z + m.oz]; }

  function spawn(demo) {
    const g = makeGroup(demo);
    G.queue.push(g);
    return g;
  }
  function removeFromQueue(g) { const i = G.queue.indexOf(g); if (i >= 0) G.queue.splice(i, 1); }

  function arrive(g) {
    g.atDesk = true;
    if (g.demo) return;
    say(g, LINES.greet(g), 2.6);
    sfx.arrive();
    showMonitor(g);
  }

  function storm(g) {
    if (g.leaving) return;
    removeFromQueue(g);
    if (g.atDesk) { clearItems("back"); showMonitor(null); }
    g.atDesk = false; g.leaving = true;
    say(g, pick(LINES.storm), 2.2, "mad");
    G.leavers.push({ g, kind: "storm", wait: 0.35, speed: 2.6, i: 0, pts: [[Math.min(g.x, -1.2), Math.max(g.z, 12.4)], [-3.62, 13.7], [-3.62, 14.8]] });
    G.lives--; G.sWalk++; G.streak = 0;
    G.shake = 0.45;
    sfx.storm();
    updateHud(true);
    if (G.lives <= 0) { G.mode = "ending"; G.overT = 1.6; }
  }

  // ---------- items on the counter ----------
  const binEls = [...document.querySelectorAll(".bin[data-band]")], drinkBtn = $("#drinkBtn");
  const liveItems = () => G.items.filter((i) => i.state === "fly" || i.state === "rest");

  function addItem(kind, hotel, btn) {
    if (G.mode !== "play") return;
    if (!desk()) { nudge("No one at the desk yet"); sfx.nope(); return; }
    const same = liveItems().filter((i) => i.kind === kind);
    if (same.length >= 6) { nudge("That's plenty"); sfx.nope(); return; }
    const r = btn.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const fx = r.left - sr.left + r.width / 2, fy = r.top - sr.top + r.height * 0.35;
    G.items.push({ kind, hotel, state: "fly", t: 0, fx, fy, x: fx, y: fy, tx: fx, ty: ITEM_Y, a: 1, sc: 1, id: Math.random() });
    btn.classList.add("tap"); setTimeout(() => btn.classList.remove("tap"), 90);
    kind === "band" ? sfx.band() : sfx.drink();
  }
  function undo() {
    if (G.mode !== "play") return;
    const live = liveItems(); if (!live.length) return;
    const it = live[live.length - 1];
    it.state = "back"; it.t = 0; it.fx = it.x; it.fy = it.y;
    sfx.undo();
  }
  function clearItems(how, targets) {
    liveItems().forEach((it, i) => {
      it.state = how; it.t = -i * 0.04; it.fx = it.x; it.fy = it.y;
      if (targets) { const tg = targets[i % targets.length]; it.gx = tg[0]; it.gy = tg[1]; }
    });
  }
  function layoutItems() {
    const live = liveItems(), bands = live.filter((i) => i.kind === "band"), drinks = live.filter((i) => i.kind === "drink");
    const bw = 0.19 * ISC, dw = 0.13 * ISC, gap = bands.length && drinks.length ? 0.12 * ISC : 0;
    const total = bands.length * bw + drinks.length * dw + gap;
    const f = Math.min(1, (W - 150) / Math.max(1, total));
    let cx = W / 2 - (total * f) / 2;
    bands.forEach((it) => { it.tx = cx + (bw * f) / 2; it.ty = ITEM_Y - 0.03 * ISC; cx += bw * f; });
    cx += gap * f;
    drinks.forEach((it) => { it.tx = cx + (dw * f) / 2; it.ty = ITEM_Y + 0.02 * ISC; cx += dw * f; });
  }
  function updateItems(dt) {
    layoutItems();
    for (const it of G.items) {
      if (it.state === "fly") {
        it.t = Math.min(1, it.t + dt / 0.3);
        const e = 1 - Math.pow(1 - it.t, 3), cx = (it.fx + it.tx) / 2, cy = Math.min(it.fy, it.ty) - 70;
        it.x = (1 - e) * (1 - e) * it.fx + 2 * (1 - e) * e * cx + e * e * it.tx;
        it.y = (1 - e) * (1 - e) * it.fy + 2 * (1 - e) * e * cy + e * e * it.ty;
        if (it.t >= 1) it.state = "rest";
      } else if (it.state === "rest") {
        it.x = lerp(it.x, it.tx, 1 - Math.exp(-dt * 14)); it.y = lerp(it.y, it.ty, 1 - Math.exp(-dt * 14));
      } else if (it.state === "give") {
        it.t += dt / 0.45; const e = clamp(it.t, 0, 1);
        it.x = lerp(it.fx, it.gx, e); it.y = lerp(it.fy, it.gy, e) - Math.sin(e * Math.PI) * 40;
        it.sc = 1 - e * 0.5; it.a = e > 0.75 ? (1 - e) / 0.25 : 1;
        if (it.t >= 1) it.state = "gone";
      } else if (it.state === "back") {
        it.t += dt / 0.35; const e = clamp(it.t, 0, 1);
        it.x = it.fx; it.y = it.fy + e * e * 60; it.a = 1 - e;
        if (it.t >= 1) it.state = "gone";
      }
    }
    G.items = G.items.filter((i) => i.state !== "gone");
  }
  function drawItems(c) {
    const order = G.items.slice().sort((a, b) => (a.kind === "drink") - (b.kind === "drink"));
    for (const it of order) {
      const s = ISC * (it.sc || 1);
      if (it.kind === "band") drawBand(c, it.x, it.y, s, it.hotel, it.a);
      else drawGlass(c, it.x, it.y, s, it.a);
    }
  }

  // ---------- check-in ----------
  const checkBtn = $("#checkin"), monitor = $("#monitor");
  function checkIn() {
    if (G.mode !== "play") return;
    checkBtn.classList.remove("ring"); void checkBtn.offsetWidth; checkBtn.classList.add("ring");
    sfx.bell();
    const g = desk();
    if (!g) { nudge("Wait for a guest to reach the desk"); return; }
    const H0 = HOTELS[g.hotel], live = liveItems();
    const bands = live.filter((i) => i.kind === "band"), drinks = live.filter((i) => i.kind === "drink");
    const n = g.size, colorName = H0.color[0].toUpperCase() + H0.color.slice(1);
    let err = null;
    if (!live.length) err = pick(["Um… our room keys?", "Aren't we forgetting something?", "Bracelets, please?"]);
    else if (bands.some((b) => b.hotel !== g.hotel)) err = `We're at the ${H0.name}! ${colorName} bands, please.`;
    else if (bands.length < n) err = n === 1 ? "I need a bracelet!" : `There are ${n} of us!`;
    else if (bands.length > n) err = n === 1 ? "It's just me!" : `We're only ${n}!`;
    else if (H0.drink && drinks.length < n) err = drinks.length ? "Drinks for everyone, please!" : "Where's our welcome drink?";

    if (err) {
      g.pat -= g.max * 0.2;
      G.streak = 0;
      say(g, err, 2.8, "mad");
      clearItems("back");
      sfx.bad();
      monitor.classList.remove("wrong"); void monitor.offsetWidth; monitor.classList.add("wrong");
      if (g.pat <= 0) storm(g);
      return;
    }

    // success
    const p = clamp(g.pat / g.max, 0, 1);
    G.streak++;
    const mult = 1 + Math.min(G.streak - 1, 4) * 0.25;
    const extra = H0.drink ? 0 : drinks.length;
    let tip = (10 * n + Math.round(18 * p)) * mult * (g.vip ? 2 : 1) - extra * 5;
    tip = Math.max(0, Math.round(tip));
    G.tips += tip; G.sTips += tip; G.guests += n; G.sGuests += n; G.parties++; G.sParties++;

    const targets = g.members.map((m) => { const [mx, mz] = memberPos(g, m), pp = proj(mx, m.L.hf * 1.2, mz); return [pp.x, pp.y]; });
    clearItems("give", targets);
    g.banded = H0.band; g.drinks = H0.drink;
    removeFromQueue(g);
    g.atDesk = false; g.leaving = true; g.pat = g.max;
    say(g, H0.drink ? pick(LINES.rosewood) : extra ? "Free drinks? Don't mind if I do!" : pick(LINES.happy), 1.8, "happy");
    G.leavers.push({ g, kind: "happy", wait: 0.55, speed: 1.8, i: 0, pts: [[1.3, 4.5], [2.9, 5.2], [6.5, 6.4]] });
    showMonitor(null);
    sfx.good();

    const head = proj(g.x, 2.0, g.z);
    addFloat(`+${money(tip)}`, head.x, head.y, "#0B8F80", 1.3);
    if (G.streak >= 3) addFloat(`${G.streak} in a row ×${mult.toFixed(2).replace(/0$/, "")}`, head.x, head.y + 26, "#C0892B", 1);
    if (g.vip) addFloat("VIP ×2", head.x, head.y - 26, "#C0892B", 1);
    if (extra) addFloat(`−$${extra * 5} drinks`, head.x + 60, head.y + 10, "#D94A4A", 0.9);
    confetti(head.x, head.y + 30, 18);
    updateHud(true);
  }

  // ---------- floats, particles ----------
  function addFloat(text, x, y, color, size) { G.floats.push({ text, x, y, color, size, life: 1.4 }); }
  function confetti(x, y, n) {
    const cols = ["#FF6F61", "#2EC4B6", "#FFB703", "#FF5AAE", "#3A86FF", "#F2D48A"];
    for (let i = 0; i < n; i++) G.parts.push({ kind: "conf", x, y, vx: rand(-120, 120), vy: rand(-220, -80), life: rand(0.8, 1.3), c: pick(cols), r: rand(2, 4), rot: rand(0, TAU) });
  }
  function updateParts(dt) {
    for (const p of G.parts) {
      p.life -= dt;
      if (p.kind === "conf") { p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 10; }
    }
    G.parts = G.parts.filter((p) => p.life > 0);
    for (const f of G.floats) { f.life -= dt; f.y -= 34 * dt; }
    G.floats = G.floats.filter((f) => f.life > 0);
  }
  function drawParts(c) {
    for (const p of G.parts) {
      c.save(); c.globalAlpha = clamp(p.life, 0, 1) * (p.kind === "steam" ? 0.55 : 1);
      if (p.kind === "conf") { c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); }
      else { c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
      c.restore();
    }
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const f of G.floats) {
      c.save(); c.globalAlpha = clamp(f.life / 0.5, 0, 1);
      c.font = `800 ${Math.round(20 * f.size)}px Outfit, sans-serif`;
      c.lineWidth = 5; c.strokeStyle = "rgba(255,255,255,.95)"; c.strokeText(f.text, f.x, f.y);
      c.fillStyle = f.color; c.fillText(f.text, f.x, f.y);
      c.restore();
    }
  }

  // ---------- UI ----------
  const toastEl = $("#toast");
  let toastTimer = 0;
  function toast(html, secs = 2.4) {
    toastEl.innerHTML = html; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), secs * 1000);
  }
  function nudge(text) { toast(text, 1.2); }

  const mIdle = $("#mIdle"), mRes = $("#mRes"), mBar = $("#mBar");
  function showMonitor(g) {
    mIdle.hidden = !!g; mRes.hidden = !g;
    checkBtn.classList.toggle("idle", !g);
    if (!g) { mIdle.textContent = G.mode === "play" && G.time >= params(G.shift).len && !G.queue.length ? "Lobby's clear" : "Next guest, please…"; return; }
    $("#mName").textContent = g.name;
    const h = $("#mHotel"); h.textContent = HOTELS[g.hotel].name; h.className = "m-hotel " + g.hotel;
    $("#mParty").textContent = g.size; $("#mPartyLbl").textContent = g.size === 1 ? "guest" : "guests";
    $("#mVip").hidden = !g.vip;
  }
  let hudCache = "";
  function updateHud(bump) {
    const pr = params(G.shift);
    const frac = clamp(G.time / pr.len, 0, 1), mins = Math.floor(frac * SHIFT_HOURS * 60);
    const hh = 3 + Math.floor(mins / 60), mm = mins % 60;
    const clock = `${hh > 12 ? hh - 12 : hh}:${String(mm - (mm % 5)).padStart(2, "0")} PM`;
    $("#shiftBar").style.width = frac * 100 + "%";
    const key = [G.tips, G.shift, clock, G.lives].join("|");
    if (key === hudCache) return;
    hudCache = key;
    const tipsEl = $("#tips");
    tipsEl.textContent = money(G.tips);
    if (bump) { tipsEl.classList.remove("bump"); void tipsEl.offsetWidth; tipsEl.classList.add("bump"); }
    $("#shiftLbl").textContent = `Shift ${G.shift}`;
    $("#clock").textContent = clock;
    const lives = $("#lives");
    [...lives.children].forEach((el, i) => el.classList.toggle("lost", i >= G.lives));
    if (bump && G.sWalk) { lives.classList.remove("hit"); void lives.offsetWidth; lives.classList.add("hit"); }
  }

  // ---------- flow ----------
  function resetLobby() {
    [...G.queue, ...G.leavers.map((l) => l.g)].forEach(dropBubble);
    G.queue = []; G.leavers = []; G.items = []; G.floats = []; G.parts = [];
    showMonitor(null);
  }
  function startGame() {
    actx(); startMusic();
    Object.assign(G, { shift: 1, tips: 0, lives: 3, streak: 0, guests: 0, parties: 0 });
    resetLobby();
    $("#title").hidden = true; $("#over").hidden = true;
    beginShift();
  }
  function beginShift() {
    const pr = params(G.shift);
    Object.assign(G, { mode: "play", time: 0, spawnT: 0.8, lastCall: false, sParties: 0, sGuests: 0, sTips: 0, sWalk: 0 });
    deskEl.classList.toggle("pro", pr.pro);
    $("#shiftEnd").hidden = true;
    hudCache = ""; updateHud(false); showMonitor(null);
    if (!G.queue.length) spawn(false).s = PL - 2 * SPACING - 0.5;   // someone's already waiting when the shift starts
    const name = SHIFT_NAMES[G.shift] || "the night shift";
    if (G.shift === 3) toast(`<b>Pro desk:</b> the bins only show colors now.<br>Gray = Rosewood · Blue = Grand Hyatt · Pink = SLS`, 4.2);
    else toast(`Shift ${G.shift}: <b>${name}</b>`, 2.2);
  }
  function endShift() {
    G.mode = "shiftEnd";
    sfx.shiftDone();
    const perfect = G.sWalk === 0;
    if (perfect && G.lives < 3) G.lives++;
    $("#seKicker").textContent = `Shift ${G.shift} complete`;
    $("#seTitle").textContent = perfect ? "Not a single walkout." : G.sWalk === 1 ? "One got away." : "Rough one.";
    $("#seParties").textContent = G.sParties; $("#seGuests").textContent = G.sGuests;
    $("#seTips").textContent = money(G.sTips); $("#seWalk").textContent = G.sWalk;
    const next = G.shift + 1, np = params(next);
    let note = `Up next: <b>${SHIFT_NAMES[next] || "the night shift"}</b>. Busier, and less patient.`;
    if (perfect) note = (G.lives === 3 ? "Perfect shift! " : "Perfect shift! <b>+1 walkout back.</b> ") + note;
    if (np.pro && !params(G.shift).pro) note += " The bins lose their hotel names — know your colors.";
    $("#seNote").innerHTML = note;
    $("#shiftEnd").hidden = false;
    updateHud(false);
  }
  function gameOver() {
    G.mode = "over";
    const best = Math.max(store.get("best", 0), G.tips);
    store.set("best", best); store.set("bestShift", Math.max(store.get("bestShift", 0), G.shift));
    $("#ovTitle").textContent = pick(["Three walkouts.", "The lobby revolted.", "Guests to Atlantis: 3."]);
    $("#ovLede").textContent = pick(["The manager sent you to the beach to think about it.", "Somebody get this desk agent a welcome drink.", "Take five. The flamingos will cover the desk."]);
    $("#ovShift").textContent = G.shift; $("#ovGuests").textContent = G.guests;
    $("#ovTips").textContent = money(G.tips); $("#ovBest").textContent = money(best);
    $("#over").hidden = false;
    showMonitor(null);
  }
  function showBest() {
    const b = store.get("best", 0);
    $("#bestLine").textContent = b ? `Best: ${money(b)} in tips · reached shift ${store.get("bestShift", 1)}` : "";
  }

  // ---------- update ----------
  function update(dt) {
    G.t += dt;
    const pr = params(G.shift);
    if (G.mode === "play") {
      G.time += dt;
      if (G.time < pr.len) {
        G.spawnT -= dt;
        if (G.spawnT <= 0 && G.queue.length < MAXQ) { spawn(false); G.spawnT = pr.spawn * rand(0.75, 1.25); }
      } else if (!G.lastCall) { G.lastCall = true; toast("Last arrivals of the shift!", 1.8); }
      for (const g of G.queue.slice()) {
        g.pat -= dt;
        const p = g.pat / g.max;
        if (!g.grumbled && p < 0.33) { g.grumbled = true; say(g, pick(LINES.grumble), 2, "mad"); sfx.grumble(); }
        if (p < 0.16 && Math.random() < dt * 9) {
          const m = g.members[0], [mx, mz] = memberPos(g, m), hp = proj(mx, m.L.hf * 1.78, mz);
          G.parts.push({ kind: "steam", x: hp.x + rand(-8, 8), y: hp.y, vx: rand(-10, 10), vy: rand(-45, -25), r: 3, life: 0.8 });
        }
        if (g.pat <= 0) storm(g);
      }
      if (G.time >= pr.len && !G.queue.length && !G.leavers.length) endShift();
      updateHud(false);
      const dg = desk();
      if (dg) { const p = clamp(dg.pat / dg.max, 0, 1); mBar.style.width = p * 100 + "%"; mBar.className = p < 0.3 ? "low" : p < 0.55 ? "mid" : ""; }
    } else if (G.mode === "title") {
      G.spawnT -= dt;
      if (G.spawnT <= 0 && G.queue.length < 6) { spawn(true); G.spawnT = rand(2.5, 4); }
      const d = desk();
      if (d && (d.demoT = (d.demoT || 0) + dt) > 3.5) {   // the demo desk agent checks people in by magic
        removeFromQueue(d); d.atDesk = false; d.leaving = true; d.banded = HOTELS[d.hotel].band; d.drinks = HOTELS[d.hotel].drink;
        G.leavers.push({ g: d, kind: "happy", wait: 0.2, speed: 1.8, i: 0, pts: [[1.3, 4.5], [2.9, 5.2], [6.5, 6.4]] });
      }
    } else if (G.mode === "ending") {
      G.overT -= dt;
      if (G.overT <= 0) gameOver();
    }

    // queue movement
    G.queue.forEach((g, i) => {
      const target = PL - i * SPACING, prev = g.s;
      g.s = Math.min(target, g.s + clamp(1.6 + (target - g.s) * 0.3, 1.6, 3.4) * dt);   // hurry to close gaps
      const moved = g.s - prev;
      g.moving = moved > 1e-4; g.back = false;
      [g.x, g.z] = pathAt(g.s);
      g.alpha = clamp(g.s / 0.8, 0, 1);
      const d = clamp((g.s - (PL - 1.6)) / 1.6, 0, 1);
      g.members.forEach((m) => { m.ox = lerp(m.cx, m.dx, d); m.oz = lerp(m.cz, m.dz, d); m.phase += moved * 7; });
      if (i === 0 && !g.atDesk && g.s >= PL - 1e-3) arrive(g);
    });
    // leavers
    for (const L of G.leavers) {
      const g = L.g;
      if (L.wait > 0) { L.wait -= dt; g.moving = false; continue; }
      const [tx, tz] = L.pts[L.i], dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz), step = L.speed * dt;
      g.moving = true; g.back = dz > 0.7 * d;
      if (d <= step) { g.x = tx; g.z = tz; L.i++; if (L.i >= L.pts.length) L.done = true; }
      else { g.x += (dx / d) * step; g.z += (dz / d) * step; }
      g.members.forEach((m) => { m.phase += step * 7; m.ox = lerp(m.ox, m.cx, 1 - Math.exp(-dt * 4)); m.oz = lerp(m.oz, m.cz, 1 - Math.exp(-dt * 4)); });
      if (L.kind === "storm") g.alpha = clamp((14.5 - g.z) / 0.7, 0, 1);
    }
    G.leavers = G.leavers.filter((L) => { if (L.done) dropBubble(L.g); return !L.done; });
    // bubbles
    [...G.queue, ...G.leavers.map((l) => l.g)].forEach((g) => {
      if (!g.bubble) return;
      g.bubbleT -= dt;
      if (g.bubbleT <= 0) { g.bubble.classList.remove("show"); if (g.bubbleT < -0.3) dropBubble(g); }
    });

    updateItems(dt);
    updateParts(dt);
    G.shake = Math.max(0, G.shake - dt);
  }

  // ---------- render ----------
  function render() {
    const c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    if (G.shake > 0) c.translate(Math.sin(G.t * 70) * G.shake * 10, Math.cos(G.t * 53) * G.shake * 5);
    drawOutside(c);
    c.drawImage(bg, 0, 0, W, H);

    // everything standing on the floor, far to near
    const list = [];
    ROPES.forEach((r) => {
      for (let i = 0; i < r.xs.length; i++) {
        list.push({ z: r.z, f: () => drawPost(c, r.xs[i], r.z) });
        if (i) list.push({ z: r.z - 0.001, f: () => drawRope(c, r.xs[i - 1], r.xs[i], r.z) });
      }
    });
    PLANTS.forEach(([x, z], i) => list.push({ z, f: () => drawPlant(c, x, z, i) }));
    const groups = [...G.queue, ...G.leavers.map((l) => l.g)];
    groups.forEach((g) => {
      const p = g.leaving ? 1 : clamp(g.pat / g.max, 0, 1);
      if (g.suitcase && !g.back && g.z > 5.2) { const [lx, lz] = memberPos(g, g.members[0]); list.push({ z: lz + 0.03, f: () => drawSuitcase(c, lx + 0.3, lz + 0.03, g.suitcase) }); }
      g.members.forEach((m) => {
        const [mx, mz] = memberPos(g, m);
        list.push({
          z: mz, f: () => {
            const pp = proj(mx, 0, mz);
            drawPerson(c, m.L, pp.x, pp.y, pp.s, { phase: m.phase, moving: g.moving, p, back: g.back, alpha: g.alpha, band: g.banded || null, drink: g.drinks });
          },
        });
      });
    });
    list.sort((a, b) => b.z - a.z).forEach((d) => d.f());

    // patience meters and VIP stars over the heads of the people in line
    if (G.mode === "play" || G.mode === "ending") {
      G.queue.forEach((g) => {
        if (g.atDesk || g.alpha < 0.3) return;
        const m = g.members[0], [mx, mz] = memberPos(g, m), hp = proj(mx, m.L.hf * 1.78 + 0.22, mz);
        const p = clamp(g.pat / g.max, 0, 1), w = Math.max(26, hp.s * 0.55), h = Math.max(4, hp.s * 0.06);
        c.fillStyle = "rgba(8,62,74,.55)"; c.beginPath(); c.roundRect(hp.x - w / 2 - 1.5, hp.y - 1.5, w + 3, h + 3, h); c.fill();
        c.fillStyle = p > 0.55 ? "#2EC4B6" : p > 0.3 ? "#FFB703" : "#FF5A4E";
        c.beginPath(); c.roundRect(hp.x - w / 2, hp.y, Math.max(h, w * p), h, h / 2); c.fill();
        if (g.vip) star(c, hp.x - w / 2 - 9, hp.y + h / 2, 6);
      });
    }
    const dg = desk();
    if (dg && dg.vip) { const m = dg.members[0], [mx, mz] = memberPos(dg, m), hp = proj(mx, m.L.hf * 1.78 + 0.2, mz); star(c, hp.x, hp.y, 9); }

    drawParts(c);
    c.drawImage(fg, 0, 0, W, H);
    drawItems(c);
    groups.forEach(placeBubble);
  }
  function star(c, x, y, r) {
    c.fillStyle = "#F2C14E"; c.strokeStyle = "#9C7634"; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.stroke();
  }

  // ---------- input ----------
  binEls.forEach((b) => b.addEventListener("click", () => { addItem("band", b.dataset.band, b); b.blur(); }));
  drinkBtn.addEventListener("click", () => { addItem("drink", null, drinkBtn); drinkBtn.blur(); });
  $("#undo").addEventListener("click", (e) => { undo(); e.currentTarget.blur(); });
  checkBtn.addEventListener("click", () => { checkIn(); checkBtn.blur(); });
  $("#startBtn").addEventListener("click", startGame);
  $("#againBtn").addEventListener("click", startGame);
  $("#nextBtn").addEventListener("click", () => { G.shift++; beginShift(); });
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (G.mode !== "play") {
      if (k === "enter" || k === " ") {
        const btn = ["#startBtn", "#nextBtn", "#againBtn"].map((s) => $(s)).find((b) => b.offsetParent);
        if (btn) { e.preventDefault(); btn.click(); }
      }
      return;
    }
    if (k === "1" || k === "2" || k === "3") { e.preventDefault(); const b = binEls[+k - 1]; addItem("band", b.dataset.band, b); }
    else if (k === "4" || k === "d") { e.preventDefault(); addItem("drink", null, drinkBtn); }
    else if (k === "backspace" || k === "z" || k === "u") { e.preventDefault(); undo(); }
    else if (k === "enter" || k === " ") { e.preventDefault(); checkIn(); }
  });

  // ---------- go ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  new ResizeObserver(() => resize()).observe(stage);
  resize();
  showBest();
  showMonitor(null);
  updateHud(false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fg = renderCounter(); });
  requestAnimationFrame(frame);
})();
