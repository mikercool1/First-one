// Rattle: classic 4x4 word dice against a 3 minute sand timer.
// Every word found earns one Rosenberg Star, banked in Rosenberg World through rw-bridge.js.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ROUND_SECS = 180;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bridge = window.RosenbergBridge || { inWorld: false, player: null, report() {}, onLeave() {} };

  // ---------- dictionary ----------
  function decode(s) {
    const out = [];
    let prev = "", i = 0;
    while (i < s.length) {
      const p = s.charCodeAt(i) - 48;
      let j = ++i;
      while (j < s.length) { const c = s.charCodeAt(j); if (c >= 48 && c <= 57) break; j++; }
      prev = prev.slice(0, p) + s.slice(i, j);
      out.push(prev);
      i = j;
    }
    return out;
  }
  const WORDS = decode(window.RATTLE_WORDS || "");
  const DICT = new Set(WORDS);
  const COMMON = new Set(decode(window.RATTLE_COMMON || ""));
  function hasPrefix(p) {
    let lo = 0, hi = WORDS.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (WORDS[m] < p) lo = m + 1; else hi = m; }
    return lo < WORDS.length && WORDS[lo].startsWith(p);
  }

  // ---------- the classic 16 dice ----------
  const DICE = ["AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
                "DISTTY", "EEGHNW", "EEINSU", "EHRTVW", "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ"];
  const ADJ = [];
  for (let i = 0; i < 16; i++) {
    const r = i >> 2, c = i & 3, n = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 4 && cc >= 0 && cc < 4) n.push(rr * 4 + cc);
    }
    ADJ.push(n);
  }
  const isAdj = (a, b) => ADJ[a].includes(b);
  const faceText = (f) => (f === "Q" ? "qu" : f.toLowerCase());
  const faceHTML = (f) => (f === "Q" ? 'Q<small>u</small>' : f);

  function roll() {
    const order = DICE.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return order.map((d) => d[Math.floor(Math.random() * 6)]);
  }
  function solve(b) {
    const found = new Set(), used = new Array(16).fill(false);
    const walk = (i, w) => {
      w += faceText(b[i]);
      if (!hasPrefix(w)) return;
      if (w.length >= 3 && DICT.has(w)) found.add(w);
      used[i] = true;
      for (const n of ADJ[i]) if (!used[n]) walk(n, w);
      used[i] = false;
    };
    for (let i = 0; i < 16; i++) walk(i, "");
    return found;
  }
  // A lively board: reroll a few times if the dice land stingy.
  function goodBoard() {
    let best = null, bestN = -1;
    for (let k = 0; k < 12; k++) {
      const b = roll(), s = solve(b);
      let n = 0; s.forEach((w) => { if (COMMON.has(w)) n++; });
      if (n > bestN) { best = { b, s }; bestN = n; }
      if (n >= 30) break;
    }
    return best;
  }
  const points = (len) => (len <= 4 ? 1 : len === 5 ? 2 : len === 6 ? 3 : len === 7 ? 5 : 11);

  // ---------- sound ----------
  let ac = null;
  function audio() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { ac = null; }
    return ac;
  }
  function tone(freq, dur, type = "sine", vol = 0.18, when = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function click(vol = 0.3, rate = 1) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * 0.03, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const src = a.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 3;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(bp).connect(g).connect(a.destination); src.start();
  }
  function rattle(ms) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * 0.03, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const now = a.currentTime;
    for (let k = 0; k < 48; k++) {
      const t = now + Math.random() * (ms / 1000) * (k < 38 ? 0.7 : 1);
      const src = a.createBufferSource(); src.buffer = buf; src.playbackRate.value = 0.7 + Math.random() * 0.8;
      const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 3200; bp.Q.value = 4;
      const g = a.createGain(); g.gain.value = 0.22 + Math.random() * 0.3;
      src.connect(bp).connect(g).connect(a.destination); src.start(t);
    }
  }
  const sfx = {
    add: (n) => { click(0.25, 0.9 + n * 0.08); tone(420 + n * 55, 0.07, "triangle", 0.06); },
    good: (len) => { [0, 4, 7, 12].slice(0, Math.min(4, len - 1)).forEach((s, k) => tone(523 * Math.pow(2, s / 12), 0.22, "triangle", 0.14, k * 0.07)); },
    big: () => { [0, 4, 7, 12, 16, 19].forEach((s, k) => tone(523 * Math.pow(2, s / 12), 0.3, "triangle", 0.15, k * 0.06)); },
    bad: () => { tone(160, 0.22, "square", 0.08); tone(120, 0.26, "square", 0.07, 0.08); },
    dup: () => { tone(330, 0.12, "sine", 0.1); tone(330, 0.12, "sine", 0.08, 0.14); },
    tick: () => click(0.35, 1.6),
    bell: () => { [0, 0.18, 0.36].forEach((w) => { tone(880, 0.9, "sine", 0.16, w); tone(1320, 0.6, "sine", 0.06, w); }); },
  };

  // ---------- build the board ----------
  const board = $("board");
  const cells = [];
  (function build() {
    const sh = document.createElement("div"); sh.className = "tshadow"; board.appendChild(sh);
    [3, 6, 9, 12, 15].forEach((k) => { const s = document.createElement("div"); s.className = "slab"; s.style.setProperty("--k", k); board.appendChild(s); });
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement("div"); cell.className = "cell"; cell.dataset.i = i;
      const die = document.createElement("div"); die.className = "die";
      const cube = document.createElement("div"); cube.className = "cube";
      for (let k = 0; k < 12; k++) { const s = document.createElement("div"); s.className = "slice"; s.style.setProperty("--i", k); cube.appendChild(s); }
      const lid = document.createElement("div"); lid.className = "lid";
      const g = document.createElement("span"); g.className = "glyph";
      lid.appendChild(g); cube.appendChild(lid); die.appendChild(cube); cell.appendChild(die); board.appendChild(cell);
      cells.push({ cell, die, cube, glyph: g });
    }
  })();
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg"); svg.setAttribute("class", "path"); board.appendChild(svg);

  // ---------- state ----------
  const S = {
    phase: "intro",          // intro | shaking | play | over
    board: "PLAYWORDDICEGAME".split(""),
    solutions: new Set(),
    found: [],
    foundSet: new Set(),
    score: 0,
    stars: 0,
    path: [],
    mode: null,              // "drag" | "tap" | "type"
    endAt: 0,
    reported: false,
    lastTick: -1,
  };

  function paintBoard() { cells.forEach((c, i) => { c.glyph.innerHTML = faceHTML(S.board[i]); }); }
  paintBoard();

  // ---------- path + ribbon ----------
  const ribbon = $("ribbon");
  function currentWord() { return S.path.map((i) => faceText(S.board[i])).join(""); }
  function drawPath() {
    cells.forEach((c, i) => c.die.classList.toggle("sel", S.path.includes(i)));
    svg.setAttribute("width", board.offsetWidth); svg.setAttribute("height", board.offsetHeight);
    svg.innerHTML = "";
    if (S.path.length) {
      const w = cells[0].cell.offsetWidth;
      const pt = (i) => [cells[i].cell.offsetLeft + w / 2, cells[i].cell.offsetTop + w / 2];
      const pts = S.path.map((i) => pt(i).join(",")).join(" ");
      [[w * 0.24, "rgba(240,100,42,.22)"], [w * 0.09, "rgba(240,100,42,.62)"], [w * 0.025, "rgba(255,236,190,.85)"]].forEach(([sw, col]) => {
        const p = document.createElementNS(svgNS, "polyline");
        p.setAttribute("points", pts); p.setAttribute("stroke", col); p.setAttribute("stroke-width", sw); svg.appendChild(p);
      });
      const [lx, ly] = pt(S.path[S.path.length - 1]);
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", lx); dot.setAttribute("cy", ly); dot.setAttribute("r", w * 0.1);
      dot.setAttribute("fill", "#FFE7B0"); dot.setAttribute("stroke", "#F0642A"); dot.setAttribute("stroke-width", w * 0.035);
      svg.appendChild(dot);
    }
    // ribbon
    ribbon.innerHTML = "";
    ribbon.className = "ribbon";
    const w = currentWord();
    S.path.forEach((i) => { const m = document.createElement("span"); m.className = "mini"; m.innerHTML = faceHTML(S.board[i]); ribbon.appendChild(m); });
    if (w.length >= 3) {
      const h = document.createElement("span"); h.className = "hint";
      if (S.foundSet.has(w)) { ribbon.classList.add("dup"); h.textContent = "got it"; }
      else if (DICT.has(w)) { ribbon.classList.add("ok"); h.textContent = "+" + points(w.length); }
      if (h.textContent) ribbon.appendChild(h);
    }
    const manual = S.phase === "play" && S.path.length && S.mode !== "drag";
    $("enter").hidden = !manual; $("clear").hidden = !manual;
  }

  // ---------- input: drag, tap, type ----------
  function dieAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return -1;
    const d = el.closest(".die");
    if (!d) return -1;
    return +d.parentNode.dataset.i;
  }
  function extend(i) {
    const p = S.path;
    if (i < 0) return;
    if (p.length >= 2 && p[p.length - 2] === i) { p.pop(); drawPath(); return; }
    if (p.includes(i)) return;
    if (p.length && !isAdj(p[p.length - 1], i)) return;
    p.push(i); sfx.add(p.length); drawPath();
  }
  let drag = null;
  board.addEventListener("pointerdown", (e) => {
    if (S.phase !== "play") return;
    const i = dieAt(e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault();
    audio();
    try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (S.mode === "tap" && S.path.length) {
      const p = S.path, last = p[p.length - 1];
      if (i === last) { submit(); return; }
      const at = p.indexOf(i);
      if (at >= 0) { p.length = at + 1; drawPath(); return; }
      if (isAdj(last, i)) { extend(i); return; }
    }
    S.mode = "drag"; S.path = []; typed = "";
    drag = { id: e.pointerId, start: i, moved: false };
    extend(i);
  });
  board.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id || S.phase !== "play") return;
    const i = dieAt(e.clientX, e.clientY);
    if (i >= 0 && i !== S.path[S.path.length - 1]) { drag.moved = true; extend(i); }
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (S.phase !== "play") return;
    if (!d.moved && S.path.length === 1) { S.mode = "tap"; drawPath(); return; } // tap mode: pick dice one by one
    submit();
  }
  board.addEventListener("pointerup", endDrag);
  board.addEventListener("pointercancel", (e) => { if (drag && e.pointerId === drag.id) { drag = null; clearPath(); } });

  // typing: find a path on the board that spells what you type
  let typed = "";
  function findPath(word) {
    const used = new Array(16).fill(false);
    const go = (i, pos, acc) => {
      const t = faceText(S.board[i]);
      if (!word.startsWith(t, pos)) return null;
      acc.push(i); used[i] = true;
      if (pos + t.length === word.length) return acc.slice();
      for (const n of ADJ[i]) if (!used[n]) { const r = go(n, pos + t.length, acc); if (r) return r; }
      acc.pop(); used[i] = false;
      return null;
    };
    for (let i = 0; i < 16; i++) { const r = go(i, 0, []); if (r) return r; }
    return null;
  }
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (S.phase !== "play") {
      if ((e.key === "Enter" || e.key === " ") && document.activeElement === document.body) {
        if (S.phase === "intro" || S.phase === "over") { e.preventDefault(); startRound(); }
      }
      return;
    }
    if (/^[a-z]$/i.test(e.key)) {
      const next = typed + e.key.toLowerCase();
      const p = findPath(next) || (next.endsWith("q") ? findPath(next + "u") : null);
      if (p) { typed = next.endsWith("q") && !findPath(next) ? next + "u" : next; S.path = p; S.mode = "type"; sfx.add(p.length); drawPath(); }
      else sfx.dup();
      e.preventDefault();
    } else if (e.key === "Backspace") {
      typed = typed.slice(0, -1); if (typed.endsWith("q")) typed = typed.slice(0, -1);
      S.path = typed ? findPath(typed) || [] : []; S.mode = typed ? "type" : null; drawPath(); e.preventDefault();
    } else if (e.key === "Enter") { if (S.path.length) submit(); e.preventDefault(); }
    else if (e.key === "Escape") clearPath();
  });
  $("enter").addEventListener("click", () => { if (S.path.length) submit(); });
  $("clear").addEventListener("click", clearPath);
  function clearPath() { S.path = []; S.mode = null; typed = ""; drawPath(); }

  // ---------- scoring a word ----------
  const toasts = $("toasts");
  function toast(html, cls) {
    const t = document.createElement("span"); t.className = "toast " + cls; t.innerHTML = html;
    toasts.appendChild(t);
    setTimeout(() => t.remove(), 1600);
    return t;
  }
  function flash(idx, cls, ms) {
    idx.forEach((i) => { const d = cells[i].die; d.classList.remove(cls); void d.offsetWidth; d.classList.add(cls); });
    setTimeout(() => idx.forEach((i) => cells[i].die.classList.remove(cls)), ms);
  }
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  function flyStar(fromEl) {
    const chip = $("starChip");
    const a = fromEl.getBoundingClientRect(), b = chip.getBoundingClientRect();
    const s = document.createElement("div"); s.className = "flystar"; s.innerHTML = STAR;
    document.body.appendChild(s);
    const sx = a.left + a.width / 2, sy = a.top + a.height / 2, tx = b.left + b.width / 2, ty = b.top + b.height / 2;
    const land = () => { s.remove(); $("stars").textContent = S.stars; chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop"); tone(1568, 0.12, "sine", 0.08); };
    if (reduce || !s.animate) { land(); return; }
    s.animate([
      { transform: `translate(${sx}px,${sy}px) scale(.5)`, opacity: 0 },
      { transform: `translate(${sx}px,${sy - 30}px) scale(1.3)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${(sx + tx) / 2}px,${Math.min(sy, ty) - 60}px) scale(1.1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${tx}px,${ty}px) scale(.7)`, opacity: 1 },
    ], { duration: 800, easing: "cubic-bezier(.5,0,.4,1)" }).onfinish = land;
  }
  function submit() {
    const idx = S.path.slice(), w = currentWord();
    S.path = []; S.mode = null; typed = "";
    drawPath();
    if (S.phase !== "play" || !idx.length) return;
    if (idx.length === 1) return;
    if (w.length < 3) { toast("Words need 3 letters or more", "dup"); sfx.dup(); return; }
    const W = w.toUpperCase();
    if (S.foundSet.has(w)) { toast(`<b>${W}</b> is already on your pad`, "dup"); flash(idx, "dupe", 500); sfx.dup(); return; }
    if (!DICT.has(w)) { toast(`<b>${W}</b> isn't in the dictionary`, "no"); flash(idx, "bad", 460); sfx.bad(); return; }
    const pts = points(w.length);
    S.found.push(w); S.foundSet.add(w); S.score += pts; S.stars += 1;
    $("score").textContent = S.score;
    flash(idx, "found", 650);
    const t = w.length >= 7 ? toast(`<b>+${pts}</b> ${W} · long word!`, "gold") : toast(`<b>+${pts}</b> ${W}`, "plus");
    if (w.length >= 7) sfx.big(); else sfx.good(w.length);
    setTimeout(() => flyStar(t), 250);
    addToPad(w, pts);
  }
  function addToPad(w, pts) {
    const li = document.createElement("li");
    li.className = "new" + (w.length >= 6 ? " long" : "");
    li.innerHTML = `<span>${w}</span><span>${pts}</span>`;
    $("found").prepend(li);
    $("found").scrollTop = 0;
    $("padEmpty").hidden = true;
    $("count").textContent = S.found.length;
  }

  // ---------- turning the board (letters stay upright) ----------
  $("turn").addEventListener("click", () => {
    if (S.phase === "shaking" || drag) return;
    const old = S.board.slice();
    S.board = S.board.map((_, i) => { const r = i >> 2, c = i & 3; return old[(3 - c) * 4 + r]; });
    S.path = S.path.map((i) => { const r = i >> 2, c = i & 3; return c * 4 + (3 - r); });
    typed = ""; paintBoard(); drawPath();
    click(0.3, 0.6);
    if (!reduce) board.animate([{ transform: "rotateX(32deg) rotateZ(-90deg) scale(.92)" }, { transform: "rotateX(32deg)" }], { duration: 420, easing: "cubic-bezier(.3,1.4,.5,1)" });
  });

  // ---------- hourglass ----------
  const sandTop = $("sandTop"), sandBot = $("sandBot"), stream = $("stream"), glass = $("glass");
  function setSand(frac) { // frac = time left, 1 -> 0
    sandTop.style.transform = `scaleY(${Math.max(0.02, frac)})`;
    sandBot.style.transform = `scaleY(${0.06 + 0.94 * (1 - frac)})`;
  }
  function flipGlass() {
    setSand(0);
    if (reduce || !glass.animate) { setSand(1); return; }
    glass.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(180deg)" }], { duration: 650, easing: "cubic-bezier(.5,0,.3,1)" })
      .onfinish = () => setSand(1);
  }

  // ---------- round flow ----------
  function shake(then) {
    S.phase = "shaking";
    clearPath();
    const next = goodBoard();
    const dur = reduce ? 0 : 1250;
    rattle(dur || 300);
    if (!reduce) board.animate([
      { transform: "rotateX(32deg)" }, { transform: "rotateX(29deg) rotateZ(-2deg) translateX(-8px)" },
      { transform: "rotateX(34deg) rotateZ(2deg) translateX(8px)" }, { transform: "rotateX(30deg) rotateZ(-1deg)" }, { transform: "rotateX(32deg)" },
    ], { duration: 700, easing: "ease-in-out" });
    cells.forEach((c, i) => {
      const swap = () => { c.glyph.innerHTML = faceHTML(next.b[i]); };
      if (reduce) { swap(); return; }
      const up = 60 + Math.random() * 90, kx = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)), ky = Math.random() < 0.5 ? -1 : 1, kz = Math.random() * 40 - 20;
      c.cube.animate([
        { transform: "translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)" },
        { transform: `translateZ(${up}px) rotateX(${kx * 200}deg) rotateY(${ky * 160}deg) rotateZ(${kz}deg)`, offset: 0.42 },
        { transform: `translateZ(${up * 0.18}px) rotateX(${kx * 340}deg) rotateY(${ky * 330}deg) rotateZ(${kz * 0.3}deg)`, offset: 0.78 },
        { transform: `translateZ(0px) rotateX(${kx * 360}deg) rotateY(${ky * 360}deg) rotateZ(0deg)` },
      ], { duration: dur, delay: Math.random() * 160, easing: "cubic-bezier(.3,.6,.4,1)" });
      setTimeout(swap, dur * 0.45);
    });
    setTimeout(() => { S.board = next.b; S.solutions = next.s; then(); }, dur + 220);
  }
  function startRound() {
    if (S.phase === "shaking" || S.phase === "play") return;
    audio();
    $("intro").hidden = true; $("over").hidden = true;
    S.found = []; S.foundSet = new Set(); S.score = 0; S.stars = 0; S.reported = false; S.lastTick = -1;
    $("found").innerHTML = ""; $("padEmpty").hidden = false; $("count").textContent = "";
    $("score").textContent = "0"; $("stars").textContent = "0"; $("time").textContent = "3:00";
    $("timeChip").classList.remove("low");
    flipGlass();
    shake(() => {
      S.phase = "play";
      S.endAt = performance.now() + ROUND_SECS * 1000;
      stream.setAttribute("opacity", "1");
      toast("GO!", "go");
      tone(784, 0.18, "triangle", 0.14); tone(1047, 0.3, "triangle", 0.14, 0.12);
      requestAnimationFrame(tick);
    });
  }
  function tick(now) {
    if (S.phase !== "play") return;
    const left = Math.max(0, (S.endAt - now) / 1000);
    const secs = Math.ceil(left);
    $("time").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    setSand(left / ROUND_SECS);
    stream.setAttribute("opacity", (now / 120) % 2 < 1 ? "1" : ".7");
    if (secs <= 10 && secs !== S.lastTick) { S.lastTick = secs; $("timeChip").classList.add("low"); if (secs > 0) sfx.tick(); }
    if (left <= 0) { endRound(); return; }
    requestAnimationFrame(tick);
  }
  function report() {
    if (S.reported) return;
    S.reported = true;
    bridge.report({ score: S.score, stars: S.stars });
    saveLocal();
  }
  function endRound() {
    S.phase = "over";
    if (drag) drag = null;
    clearPath();
    stream.setAttribute("opacity", "0");
    $("timeChip").classList.remove("low");
    sfx.bell();
    report();
    // results
    $("rScore").textContent = S.score;
    $("rWords").textContent = S.found.length;
    $("rStars").textContent = "+" + S.stars;
    const best = S.found.slice().sort((a, b) => b.length - a.length)[0];
    $("rNote").textContent = (best ? `Best word: ${best.toUpperCase()}. ` : "No words this time. Give the dice another shake! ")
      + (bridge.inWorld ? (S.stars ? `Your ${S.stars} Rosenberg Star${S.stars === 1 ? "" : "s"} will fly into Rosenberg World when you go back.` : "")
        : (S.stars ? `You earned ${S.stars} Rosenberg Star${S.stars === 1 ? "" : "s"}.` : ""));
    const all = [...S.solutions];
    const everyday = all.filter((w) => COMMON.has(w) || S.foundSet.has(w));
    const show = everyday.sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 30);
    $("missedTitle").textContent = `The dice held ${all.length} word${all.length === 1 ? "" : "s"}. Here are some:`;
    $("missed").innerHTML = show.map((w) => `<span class="${S.foundSet.has(w) ? "got" : ""}">${w.toUpperCase()}</span>`).join("");
    setTimeout(() => { $("over").hidden = false; $("again").focus({ preventScroll: true }); }, reduce ? 0 : 900);
  }
  // Leaving Rosenberg World mid-round still banks the stars found so far.
  if (bridge.onLeave) bridge.onLeave(() => { if (S.phase === "play" && S.stars) report(); });

  function saveLocal() {
    try {
      const key = "rattle." + (bridge.player || "solo");
      const rec = JSON.parse(localStorage.getItem(key) || "{}");
      rec.best = Math.max(rec.best || 0, S.score);
      rec.stars = (rec.stars || 0) + S.stars;
      localStorage.setItem(key, JSON.stringify(rec));
    } catch (e) { /* storage unavailable */ }
  }

  if (/[?&]dev\b/.test(location.search)) window.__rattle = { S, startRound, endRound };
  $("start").addEventListener("click", startRound);
  $("again").addEventListener("click", startRound);
  addEventListener("resize", drawPath);
  if (document.fonts) document.fonts.ready.then(drawPath);
  drawPath();
})();
