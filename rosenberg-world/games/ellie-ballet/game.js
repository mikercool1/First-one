// Tiptoe, Gallop or March: Ellie's ballet game in the princess tower.
// Music plays: sneaky music means tiptoe, trotting music (or a horse) means gallop,
// marching music means march. Tap the matching picture and Ellie dances around the studio.
(() => {
  "use strict";
  const A = RW.art, TAU = Math.PI * 2;
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Ellie in her pink leotard and tutu, with pink tights and ballet slippers
  const ELLIE = Object.assign({}, A.CHARS.ellie, {
    shirt: "#FF6FAE", tutu: true, bow: "#FF6FAE",
    legs: [[0, 1, "#FFC9DF"]], shoe: "#FFB0CF", shoeAccent: "#E57FA8",
  });
  const MOVES = ["tiptoe", "gallop", "march"];
  const SAY = { tiptoe: "Tiptoe, tiptoe!", gallop: "Gallop, gallop!", march: "March, march!" };
  const ROUNDS = 8;

  // ---------------------------------------------------------------------------
  // sound: every note is made right here (no files), so it works offline
  // ---------------------------------------------------------------------------
  let AC = null, master = null, muted = false;
  try { muted = localStorage.getItem("ellieBallet.muted") === "1"; } catch (e) { /* private mode */ }
  function audio() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return AC; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
    } catch (e) { AC = null; }
    return AC;
  }
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const N = { C2: 36, E2: 40, F2: 41, G2: 43, A2: 45, Bb2: 46, B2: 47, C3: 48, Cs3: 49, D3: 50, Eb3: 51, E3: 52, G3: 55, A3: 57, B3: 59,
    C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, G5: 79 };
  function tone(midi, t, dur, type = "triangle", vol = 0.2, attack = 0.005) {
    if (!AC) return;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = NOTE(midi);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(t, dur, vol, freq, q = 1, type = "bandpass") {
    if (!AC) return;
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  function kick(t, vol = 0.5) {
    if (!AC) return;
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
  }
  const clop = (t, hi) => { noise(t, 0.05, 0.35, hi ? 2300 : 1500, 8); tone(hi ? 84 : 79, t, 0.05, "sine", 0.12); };

  // Each song is a loop of steps; play(step, time) schedules that step's sounds.
  const SONGS = {
    // sneaky: soft pizzicato creeping up and down in a minor key
    tiptoe: {
      bpm: 104, perBeat: 2, len: 16,
      play(i, t) {
        const bass = { 0: N.E2, 2: N.G2, 4: N.A2, 5: N.Bb2, 6: N.B2, 8: N.E2, 10: N.G2, 12: N.D3, 13: N.Cs3, 14: N.C3 };
        if (bass[i] != null) tone(bass[i] + 12, t, 0.16, "triangle", 0.28, 0.003);
        const mel = { 1: N.B4, 3: N.E5, 9: N.B4, 11: N.G5, 15: N.E5 };
        if (mel[i] != null) tone(mel[i], t, 0.09, "sine", 0.12, 0.002);
        if (i % 2 === 1) noise(t, 0.03, 0.05, 6000, 2, "highpass");
      },
    },
    // trotting: a bright gallop in 6/8 with clip-clop hooves
    gallop: {
      bpm: 132, perBeat: 3, len: 24,
      play(i, t) {
        const beatPos = i % 3;
        if (beatPos === 0) clop(t, (i / 3) % 2 === 0);
        if (beatPos === 2) clop(t, false);
        const mel = { 0: N.G4, 2: N.G4, 3: N.G4, 5: N.C5, 6: N.E5, 8: N.E5, 9: N.D5, 11: N.C5, 12: N.G4, 14: N.G4, 15: N.G4, 17: N.C5, 18: N.E5, 20: N.D5, 21: N.C5 };
        if (mel[i] != null) tone(mel[i], t, beatPos === 0 ? 0.26 : 0.12, "square", 0.07);
        const bass = { 0: N.C3, 6: N.G2, 12: N.F2, 18: N.G2 };
        if (bass[i] != null) tone(bass[i], t, 0.3, "triangle", 0.25);
        if (i % 3 === 0 && i % 6 === 3) tone(bass[i - 3] != null ? bass[i - 3] + 7 : N.G2 + 12, t, 0.18, "triangle", 0.16);
      },
    },
    // marching: big drum, snare and a toy-trumpet tune
    march: {
      bpm: 116, perBeat: 2, len: 32,
      play(i, t) {
        if (i % 4 === 0) kick(t, 0.55);
        if (i % 4 === 2) noise(t, 0.12, 0.4, 2500, 0.8);
        if (i % 16 === 14 || i % 16 === 15) noise(t, 0.07, 0.22, 3000, 0.8);
        const mel = { 0: N.C4, 2: N.E4, 4: N.G4, 6: N.E4, 8: N.F4, 10: N.A4, 12: N.G4, 14: N.C5, 16: N.C5, 18: N.G4, 20: N.E4, 22: N.G4, 24: N.F4, 26: N.D4, 28: N.C4 };
        if (mel[i] != null) tone(mel[i] + 12, t, i === 28 ? 0.7 : 0.22, "square", 0.06, 0.01);
        const bass = { 0: N.C3, 4: N.G2, 8: N.F2, 12: N.G2, 16: N.C3, 20: N.G2, 24: N.G2, 28: N.C3 };
        if (bass[i] != null) tone(bass[i], t, 0.28, "triangle", 0.3);
      },
    },
  };
  let song = null, songStep = 0, nextT = 0, songTimer = 0;
  function playSong(name) {
    stopSong();
    if (!audio()) return;
    song = SONGS[name]; songStep = 0; nextT = AC.currentTime + 0.12;
    songTimer = setInterval(() => {
      const stepDur = 60 / song.bpm / song.perBeat;
      while (nextT < AC.currentTime + 0.15) { song.play(songStep % song.len, nextT); songStep++; nextT += stepDur; }
    }, 25);
  }
  function stopSong() { clearInterval(songTimer); song = null; }
  function sfxGood() { if (!audio()) return; const t = AC.currentTime; [N.C5, N.E5, N.G5].forEach((n, k) => tone(n + 12, t + k * 0.07, 0.25, "sine", 0.14)); }
  function sfxNope() { if (!audio()) return; const t = AC.currentTime; tone(N.E4, t, 0.15, "sine", 0.18); tone(N.C4, t + 0.13, 0.25, "sine", 0.16); }
  function sfxApplause() {
    if (!audio()) return;
    const t = AC.currentTime;
    for (let k = 0; k < 90; k++) noise(t + Math.random() * 2.4, 0.04, 0.12 + Math.random() * 0.1, 1500 + Math.random() * 2500, 1.5);
    [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5].forEach((n, k) => tone(n, t + k * 0.1, 0.5, "triangle", 0.12));
  }
  function speak(text) {
    if (muted) return;
    try { const u = new SpeechSynthesisUtterance(text); u.pitch = 1.35; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no voice */ }
  }
  const muteBtn = $("#mute");
  const syncMute = () => { muteBtn.textContent = muted ? "🔇" : "🔊"; if (master) master.gain.value = muted ? 0 : 0.9; };
  muteBtn.addEventListener("click", () => { muted = !muted; try { localStorage.setItem("ellieBallet.muted", muted ? "1" : "0"); } catch (e) { /* ignore */ } audio(); syncMute(); });
  syncMute();

  // ---------------------------------------------------------------------------
  // drawing helpers: the cue pictures and the button icons
  // ---------------------------------------------------------------------------
  function drawHorse(c, t, s = 1) {
    c.save(); c.scale(s, s);
    const g = Math.sin(t * 12);
    c.strokeStyle = "#7A4A26"; c.lineWidth = 9; c.lineCap = "round";
    [[-34, g], [-20, -g], [22, -g], [36, g]].forEach(([x, k]) => { c.beginPath(); c.moveTo(x, -30); c.lineTo(x + k * 14, 4); c.stroke(); });
    c.fillStyle = "#3A2414"; [[-34, g], [-20, -g], [22, -g], [36, g]].forEach(([x, k]) => { c.beginPath(); c.arc(x + k * 14, 5, 5, 0, TAU); c.fill(); });
    c.strokeStyle = "#5A3418"; c.lineWidth = 8; c.beginPath(); c.moveTo(-46, -46); c.quadraticCurveTo(-70, -40 + g * 6, -64, -14); c.stroke();
    c.fillStyle = "#A8703C"; c.beginPath(); c.ellipse(0, -44, 50, 22, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(30, -56); c.quadraticCurveTo(44, -90, 56, -98); c.lineTo(70, -86); c.quadraticCurveTo(56, -64, 48, -40); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(70, -92, 20, 12, 0.5, 0, TAU); c.fill();
    c.fillStyle = "#5A3418"; c.beginPath(); c.ellipse(52, -98, 6, 18, 0.7, 0, TAU); c.fill();
    c.fillStyle = "#2B1A10"; c.beginPath(); c.arc(68, -97, 3, 0, TAU); c.fill();
    c.fillStyle = "#8A5A2E"; c.beginPath(); c.moveTo(60, -106); c.lineTo(64, -118); c.lineTo(68, -104); c.fill();
    c.restore();
  }
  function drawSoldier(c, t, s = 1) {
    c.save(); c.scale(s, s);
    const k = Math.sin(t * 7);
    c.fillStyle = "#1F3D8A"; c.save(); c.translate(-8, -40); c.rotate(Math.max(0, k) * 0.8); c.fillRect(-6, 0, 12, 40); c.restore();
    c.save(); c.translate(8, -40); c.rotate(-Math.max(0, -k) * 0.8); c.fillRect(-6, 0, 12, 40); c.restore();
    c.fillStyle = "#1E1E24"; c.fillRect(-16, -2 - Math.max(0, k) * 10, 14, 6); c.fillRect(2, -2 - Math.max(0, -k) * 10, 14, 6);
    c.fillStyle = "#D8342A"; c.beginPath(); c.roundRect ? c.roundRect(-20, -86, 40, 50, 8) : c.rect(-20, -86, 40, 50); c.fill();
    c.fillStyle = "#FFFFFF"; c.fillRect(-20, -56, 40, 6); c.fillStyle = "#FFD23F"; [-74, -66].forEach((y) => { c.beginPath(); c.arc(0, y, 2.5, 0, TAU); c.fill(); });
    // drum
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.ellipse(26, -52, 16, 6, 0, 0, TAU); c.fill();
    c.fillStyle = "#3F6FD8"; c.fillRect(10, -52, 32, 20); c.fillStyle = "#FFD23F"; c.fillRect(10, -52, 32, 4);
    c.strokeStyle = "#8A5A2E"; c.lineWidth = 4; c.beginPath(); c.moveTo(18, -70 + k * 6); c.lineTo(26, -54); c.stroke();
    c.fillStyle = "#FFE1CF"; c.beginPath(); c.arc(0, -98, 13, 0, TAU); c.fill();
    c.fillStyle = "#E8453C"; c.beginPath(); c.arc(-7, -94, 3, 0, TAU); c.arc(7, -94, 3, 0, TAU); c.fill();
    c.fillStyle = "#1E1E24"; c.beginPath(); c.ellipse(0, -122, 15, 22, 0, 0, TAU); c.fill();
    c.fillStyle = "#FFD23F"; c.fillRect(-15, -104, 30, 4);
    c.restore();
  }
  function drawMouse(c, t, s = 1) {
    c.save(); c.scale(s, s);
    const k = Math.sin(t * 9), up = Math.abs(k) * 6;
    c.strokeStyle = "#B7A6B8"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(-34, -24); c.quadraticCurveTo(-64, -40, -58, -70); c.stroke();
    c.strokeStyle = "#9A8A9C"; c.lineWidth = 5;
    [[-14, k], [14, -k]].forEach(([x, q]) => { c.beginPath(); c.moveTo(x, -20); c.lineTo(x + q * 5, -2 - up); c.stroke(); });
    c.fillStyle = "#C7B8C9"; c.beginPath(); c.ellipse(0, -30 - up, 34, 22, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(34, -44 - up, 20, 16, 0.3, 0, TAU); c.fill();
    c.fillStyle = "#FFB7CF"; c.beginPath(); c.arc(26, -66 - up, 12, 0, TAU); c.fill();
    c.fillStyle = "#C7B8C9"; c.beginPath(); c.arc(26, -66 - up, 12, 0, TAU); c.fill(); c.fillStyle = "#FFB7CF"; c.beginPath(); c.arc(26, -66 - up, 7, 0, TAU); c.fill();
    c.fillStyle = "#2B2238"; c.beginPath(); c.arc(40, -48 - up, 3, 0, TAU); c.fill();
    c.fillStyle = "#FF8FB1"; c.beginPath(); c.arc(54, -42 - up, 3.5, 0, TAU); c.fill();
    // shhh: a finger to its lips
    c.strokeStyle = "#9A8A9C"; c.lineWidth = 4; c.beginPath(); c.moveTo(20, -30 - up); c.lineTo(48, -40 - up); c.stroke();
    c.restore();
  }
  // a pair of pointe shoes standing up on their toes, satin ribbons curling out of the top
  function drawSlipper(c, t, s = 1) {
    c.save(); c.scale(s, s);
    const shoe = (x, rot, sway) => {
      c.save(); c.translate(x, 0); c.rotate(rot);
      // ribbons
      c.strokeStyle = "#FF8FC0"; c.lineWidth = 4.5; c.lineCap = "round";
      c.beginPath(); c.moveTo(-8, -70); c.bezierCurveTo(-30, -84, -10, -100, -26 + sway, -118); c.stroke();
      c.beginPath(); c.moveTo(8, -70); c.bezierCurveTo(30, -86, 14, -104, 28 + sway, -120); c.stroke();
      // the satin shoe: narrow heel at the top, flat platform tip on the floor
      c.fillStyle = "#FFB3D2"; c.beginPath();
      c.moveTo(-15, -74); c.quadraticCurveTo(-19, -40, -10, -8); c.lineTo(-10, 0); c.lineTo(10, 0); c.lineTo(10, -8); c.quadraticCurveTo(19, -40, 15, -74); c.closePath(); c.fill();
      // opening where the foot goes, with a drawstring
      c.fillStyle = "#E97BAA"; c.beginPath(); c.ellipse(0, -72, 14, 6, 0, 0, TAU); c.fill();
      c.fillStyle = "#C85888"; c.beginPath(); c.ellipse(0, -71, 9, 3.5, 0, 0, TAU); c.fill();
      // flat platform on the floor and a satin shine
      c.fillStyle = "#E97BAA"; c.fillRect(-10, -4, 20, 5);
      c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-8, -60); c.quadraticCurveTo(-11, -32, -5, -12); c.stroke();
      // ribbons criss-crossing the ankle
      c.strokeStyle = "#FF8FC0"; c.lineWidth = 3; c.beginPath(); c.moveTo(-13, -60); c.lineTo(13, -50); c.moveTo(13, -60); c.lineTo(-13, -50); c.stroke();
      c.restore();
    };
    const sway = Math.sin(t * 3) * 4;
    shoe(-16, -0.14, sway); shoe(18, 0.12, -sway);
    c.restore();
  }
  function iconBg(c, w, col) {
    const g = c.createRadialGradient(w / 2, w * 0.4, w * 0.1, w / 2, w / 2, w * 0.7); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, col);
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  }
  function drawIcons(t) {
    document.querySelectorAll(".move").forEach((b) => {
      const cv = b.querySelector("canvas"), c = cv.getContext("2d"), w = cv.width, m = b.dataset.m;
      c.clearRect(0, 0, w, w);
      iconBg(c, w, m === "tiptoe" ? "#FFE0EE" : m === "gallop" ? "#F6E6D2" : "#E0E8FF");
      c.save(); c.translate(w / 2, w * 0.78);
      if (m === "tiptoe") { c.translate(0, -6); drawSlipper(c, t, 1.55); }
      else if (m === "gallop") { c.translate(-18, 0); drawHorse(c, t, 1.25); }
      else { c.translate(-10, 0); drawSoldier(c, t, 1.3); }
      c.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // the studio
  // ---------------------------------------------------------------------------
  const cv = $("#stage"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  addEventListener("resize", resize); resize();
  const floorTop = () => H * 0.5;
  // floor coordinates: u across (0..1), v front-to-back (0 = back wall, 1 = front)
  function floorXY(u, v) {
    const y = floorTop() + v * (H * 0.36);
    const half = (W * 0.36) + v * (W * 0.12);
    return [W / 2 + (u - 0.5) * 2 * half, y, 0.75 + v * 0.45];
  }
  function drawStudio(t) {
    const c = ctx, ft = floorTop();
    // wallpaper
    let g = c.createLinearGradient(0, 0, 0, ft); g.addColorStop(0, "#FFD3E6"); g.addColorStop(1, "#FFBFDB");
    c.fillStyle = g; c.fillRect(0, 0, W, ft);
    c.fillStyle = "rgba(255,255,255,.35)"; for (let x = 0; x < W; x += 46) c.fillRect(x, 0, 18, ft);
    c.fillStyle = "rgba(232,70,140,.18)";
    for (let y = 30; y < ft - 40; y += 70) for (let x = 23 + ((y / 70) % 2) * 23; x < W; x += 46) { c.beginPath(); c.moveTo(x, y + 4); c.bezierCurveTo(x - 7, y - 2, x - 3, y - 8, x, y - 3); c.bezierCurveTo(x + 3, y - 8, x + 7, y - 2, x, y + 4); c.fill(); }
    // tower windows (round, like a castle), with sky and a turret flag outside
    const win = (x) => {
      const r = Math.min(W, H) * 0.08, y = ft * 0.42;
      c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(x, y, r + 9, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
      g = c.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, "#8FD0FF"); g.addColorStop(1, "#D8F0FF"); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      c.fillStyle = "#FFFFFF"; const cx = x - r + ((t * 12 + x) % (r * 3)) - r * 0.5; c.beginPath(); c.arc(cx, y - r * 0.3, r * 0.22, 0, TAU); c.arc(cx + r * 0.25, y - r * 0.38, r * 0.26, 0, TAU); c.arc(cx + r * 0.5, y - r * 0.3, r * 0.2, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = "#FFFFFF"; c.lineWidth = 5; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
    };
    win(W * 0.16); win(W * 0.84);
    // big ballet mirror with a barre
    const mx = W * 0.3, mw = W * 0.4, my = ft * 0.18, mh = ft * 0.74;
    c.fillStyle = "#F2C1D8"; c.fillRect(mx - 10, my - 10, mw + 20, mh + 16);
    g = c.createLinearGradient(mx, my, mx + mw, my + mh); g.addColorStop(0, "#EAF6FF"); g.addColorStop(0.5, "#CFE6F5"); g.addColorStop(1, "#E4F2FC");
    c.fillStyle = g; c.fillRect(mx, my, mw, mh);
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.moveTo(mx + mw * 0.1, my); c.lineTo(mx + mw * 0.22, my); c.lineTo(mx + mw * 0.08, my + mh); c.lineTo(mx - 0 + mw * 0.0, my + mh); c.closePath(); c.fill();
    c.fillStyle = "#C98A4A"; c.fillRect(W * 0.08, ft * 0.8, W * 0.84, 10);
    c.fillStyle = "#A8703C"; [0.12, 0.5, 0.88].forEach((p) => c.fillRect(W * p - 4, ft * 0.8, 8, ft * 0.2));
    // crown moulding and a little crown sign
    c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, 12);
    // wooden floor in perspective
    c.fillStyle = "#E7B889"; c.beginPath(); c.moveTo(0, ft); c.lineTo(W, ft); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    c.strokeStyle = "rgba(150,95,50,.25)"; c.lineWidth = 2;
    for (let k = -8; k <= 8; k++) { const [x0] = floorXY(0.5 + k * 0.08, 0); c.beginPath(); c.moveTo(x0, ft); c.lineTo(W / 2 + (x0 - W / 2) * 2.2, H); c.stroke(); }
    for (let v = 0.1; v < 1.4; v += 0.18) { const y = ft + v * v * H * 0.28; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.ellipse(W / 2, ft + H * 0.18, W * 0.3, H * 0.06, 0, 0, TAU); c.fill();
    // velvet curtains
    const curtain = (side) => {
      const x0 = side < 0 ? 0 : W, w = W * 0.1;
      g = c.createLinearGradient(x0, 0, x0 - side * w, 0); g.addColorStop(0, "#C2185B"); g.addColorStop(1, "#E84A8C");
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 - side * w * 1.3, 0); c.quadraticCurveTo(x0 - side * w * 0.5, H * 0.45, x0 - side * w * 0.9, H); c.lineTo(x0, H); c.closePath(); c.fill();
      c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 3; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x0 - side * w * 0.3 * k, 0); c.quadraticCurveTo(x0 - side * w * 0.12 * k, H * 0.45, x0 - side * w * 0.26 * k, H); c.stroke(); }
      c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(x0 - side * w * 0.7, H * 0.46, 8, 0, TAU); c.fill();
    };
    curtain(-1); curtain(1);
    c.fillStyle = "#C2185B"; for (let x = 0; x < W; x += 60) { c.beginPath(); c.arc(x + 30, 12, 30, 0, Math.PI); c.fill(); }
    // the little music box on the floor
    const [bx, by] = floorXY(0.08, 0.15);
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect ? c.roundRect(bx - 34, by - 40, 68, 40, 8) : c.rect(bx - 34, by - 40, 68, 40); c.fill();
    c.fillStyle = "#FF6FAE"; c.fillRect(bx - 34, by - 22, 68, 6);
    c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(bx, by - 48, 8, 0, TAU); c.fill();
  }

  // ---------------------------------------------------------------------------
  // Ellie, sparkles and notes
  // ---------------------------------------------------------------------------
  const ellie = { u: 0.5, v: 0.5, tu: 0.5, tv: 0.5, dir: 1, t: 0, wobble: 0 };
  const parts = [];
  function burst(x, y, n, kind) {
    for (let k = 0; k < n; k++) {
      const a = rand(0, TAU), sp = rand(80, 260);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: rand(0.8, 1.4), max: 1.4, kind, col: pick(["#FFD23F", "#FF6FAE", "#FFFFFF", "#9AD7FF", "#C89BFF"]), rot: rand(0, TAU) });
    }
  }
  function drawStar(c, x, y, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  function stepEllie(dt) {
    ellie.t += dt;
    ellie.wobble = Math.max(0, ellie.wobble - dt);
    if (phase !== "dance") return;
    const sp = { tiptoe: 0.1, gallop: 0.42, march: 0.2 }[dancing];
    let du = ellie.tu - ellie.u, dv = ellie.tv - ellie.v, d = Math.hypot(du, dv * 1.6);
    if (d < 0.02) {
      if (dancing === "march") { ellie.tu = ellie.u < 0.5 ? 0.82 : 0.18; ellie.tv = rand(0.32, 0.64); }
      else if (dancing === "gallop") { const a = Math.atan2(ellie.v - 0.47, ellie.u - 0.5) + 1.3; ellie.tu = 0.5 + Math.cos(a) * 0.34; ellie.tv = 0.47 + Math.sin(a) * 0.18; }
      else { ellie.tu = U(ellie.u + rand(-0.18, 0.18)); ellie.tv = V(ellie.v + rand(-0.15, 0.15)); }
      du = ellie.tu - ellie.u; dv = ellie.tv - ellie.v; d = Math.hypot(du, dv * 1.6);
    }
    const k = Math.min(1, (sp * dt) / Math.max(d, 1e-4));
    ellie.u += du * k; ellie.v += dv * k;
    if (Math.abs(du) > 0.002) ellie.dir = du > 0 ? 1 : -1;
  }
  const U = (u) => Math.max(0.15, Math.min(0.85, u)), V = (v) => Math.max(0.28, Math.min(0.66, v)); // stays above the buttons
  function drawEllie(c) {
    const [x, y, s] = floorXY(ellie.u, ellie.v);
    const k = (H * 0.2 / 80) * s;
    c.fillStyle = "rgba(120,60,40,.18)"; c.beginPath(); c.ellipse(x, y + 2, 26 * k, 7 * k, 0, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.scale(k, k);
    if (ellie.wobble > 0) c.rotate(Math.sin(ellie.t * 30) * 0.08);
    let pose = "ballerina", side = 0;
    if (phase === "dance") { pose = dancing; side = 1; }
    else if (phase === "finale" || phase === "bravo") pose = "curtsy";
    A.drawChar(c, ELLIE, { t: ellie.t, move: 0, side, dir: ellie.dir, pose, pt: 0.5 });
    c.restore();
    return [x, y - 90 * k];
  }

  // ---------------------------------------------------------------------------
  // the game
  // ---------------------------------------------------------------------------
  let phase = "title", round = 0, style = null, dancing = null, firstTry = true, firstTries = 0, stars = 0;
  let showCue = true, listenT = 0, danceT = 0, finaleT = 0;
  const hud = $("#hud"), moves = $("#moves");
  function buildHud() { hud.innerHTML = ""; for (let k = 0; k < ROUNDS; k++) hud.appendChild(document.createElement("i")); }
  function start() {
    audio();
    round = 0; firstTries = 0; stars = 0; parts.length = 0;
    buildHud(); hud.hidden = false; moves.hidden = false;
    $("#title").hidden = true; $("#bravo").hidden = true;
    ellie.u = ellie.tu = 0.5; ellie.v = ellie.tv = 0.55;
    speak("Listen to the music, Ellie!");
    setTimeout(nextRound, 1400);
  }
  function nextRound() {
    const choices = MOVES.filter((m) => m !== style);
    style = pick(choices);
    showCue = round < 3 || Math.random() < 0.5;
    firstTry = true; listenT = 0; phase = "listen"; dancing = null;
    document.querySelectorAll(".move").forEach((b) => b.classList.remove("on", "hint"));
    playSong(style);
  }
  function tap(m, btn) {
    audio();
    if (phase === "listen") {
      if (m === style) {
        phase = "dance"; dancing = m; danceT = 0;
        btn.classList.add("on"); btn.classList.remove("hint");
        document.querySelectorAll(".move").forEach((b) => b.classList.remove("hint"));
        sfxGood(); speak(SAY[m]);
        if (firstTry) firstTries++;
        stars++; const icons = hud.querySelectorAll("i"); if (icons[stars - 1]) icons[stars - 1].classList.add("got");
        const [x, y, s] = floorXY(ellie.u, ellie.v); burst(x, y - 120 * s, 22, "star");
        ellie.tu = U(ellie.u + (Math.random() < 0.5 ? -0.3 : 0.3)); ellie.tv = V(ellie.v + rand(-0.2, 0.2));
      } else {
        firstTry = false; ellie.wobble = 0.6;
        sfxNope(); speak("Hmm, listen again!");
        btn.classList.remove("nope"); void btn.offsetWidth; btn.classList.add("nope");
      }
    } else if (phase === "dance" && m === dancing) {
      const [x, y, s] = floorXY(ellie.u, ellie.v); burst(x, y - 100 * s, 8, "star");
    }
  }
  document.querySelectorAll(".move").forEach((b) => b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); tap(b.dataset.m, b); }));
  function finale() {
    phase = "finale"; finaleT = 0; stopSong(); sfxApplause(); speak("Bravo, Ellie! What a beautiful dance!");
    moves.hidden = true;
    const n = Math.max(1, Math.min(5, Math.round((firstTries / ROUNDS) * 5)));
    if (window.RosenbergBridge) RosenbergBridge.report({ score: firstTries, stars: n });
    $("#bravoTxt").textContent = firstTries === ROUNDS ? "Every single dance was perfect!" : `You danced ${ROUNDS} dances and got ${firstTries} right the very first time!`;
  }
  function update(dt) {
    stepEllie(dt);
    if (phase === "listen") {
      listenT += dt;
      if (listenT > 9) document.querySelector(`.move[data-m="${style}"]`).classList.add("hint"); // a little help
    } else if (phase === "dance") {
      danceT += dt;
      if (danceT > 7) { round++; if (round >= ROUNDS) finale(); else nextRound(); }
    } else if (phase === "finale") {
      finaleT += dt;
      if (Math.random() < 0.5) parts.push({ x: rand(W * 0.1, W * 0.9), y: -20, vx: rand(-30, 30), vy: rand(80, 160), life: 4, max: 4, kind: "rose", col: pick(["#E8453C", "#FF6FAE", "#FFD23F"]), rot: rand(0, TAU) });
      if (finaleT > 3.2) { phase = "bravo"; $("#bravo").hidden = false; drawCard($("#bravoCv"), "curtsy"); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 3;
      if (p.kind === "star") p.vy += 300 * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }
  function drawCue(c, t) {
    if (phase !== "listen" && phase !== "dance") return;
    const cue = phase === "dance" ? dancing : showCue ? style : null;
    const r = Math.min(W, H) * 0.12, x = W / 2, y = floorTop() * 0.46;
    // music notes rising from the music box, in the song's colour
    const col = { tiptoe: "#FF6FAE", gallop: "#C98A4A", march: "#3F6FD8" }[style];
    const [bx, by] = floorXY(0.08, 0.15);
    for (let k = 0; k < 4; k++) {
      const u = (t * 0.5 + k / 4) % 1;
      c.globalAlpha = 1 - u; c.fillStyle = col; c.font = `700 ${26 + k * 3}px Fredoka, sans-serif`; c.textAlign = "center";
      c.fillText(k % 2 ? "♪" : "♫", bx + Math.sin(u * 6 + k) * 20, by - 60 - u * 120);
    }
    c.globalAlpha = 1;
    if (!cue) return;
    // a picture bubble in front of the mirror
    c.fillStyle = "rgba(255,255,255,.92)"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 6; c.stroke();
    c.save(); c.beginPath(); c.arc(x, y, r - 3, 0, TAU); c.clip();
    c.translate(x, y + r * 0.62);
    const s = r / 120;
    if (cue === "gallop") { c.translate(Math.sin(t * 2) * r * 0.2 - r * 0.1, 0); drawHorse(c, t, s); }
    else if (cue === "march") drawSoldier(c, t, s * 1.05);
    else { c.translate(Math.sin(t * 0.8) * r * 0.25 - r * 0.1, 0); drawMouse(c, t, s * 1.1); }
    c.restore();
  }
  function drawParts(c) {
    for (const p of parts) {
      c.globalAlpha = Math.min(1, p.life / p.max * 2);
      if (p.kind === "rose") {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.strokeStyle = "#3E9A46"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 22); c.stroke();
        c.fillStyle = p.col; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.arc(-2, -2, 3.5, 0, TAU); c.fill();
        c.restore();
      } else { c.fillStyle = p.col; drawStar(c, p.x, p.y, 9, p.rot); c.fill(); }
    }
    c.globalAlpha = 1;
  }
  // Ellie on the title and bravo cards
  function drawCard(canvas, pose) {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(10, Math.round(r.width * dpr)); canvas.height = Math.max(10, Math.round(r.height * dpr));
    const c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(255,111,174,.14)"; c.beginPath(); c.ellipse(w / 2, h * 0.93, w * 0.18, h * 0.06, 0, 0, TAU); c.fill();
    c.save(); c.translate(w / 2, h * 0.93); const k = h / 95; c.scale(k, k);
    A.drawChar(c, ELLIE, { t: performance.now() / 1000, move: 0, side: 0, dir: 1, pose, pt: 0.5 });
    c.restore();
  }

  let last = performance.now(), iconT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    update(dt);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawStudio(t);
    drawCue(ctx, t);
    drawEllie(ctx);
    drawParts(ctx);
    iconT += dt; if (iconT > 0.05 && !moves.hidden) { iconT = 0; drawIcons(t); }
    if (phase === "title" && !$("#title").hidden) drawCard($("#titleCv"), "ballerina");
    requestAnimationFrame(frame);
  }
  $("#play").addEventListener("click", start);
  $("#again").addEventListener("click", start);
  drawIcons(0);
  requestAnimationFrame(frame);
})();
