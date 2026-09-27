// Rosenberg World: sounds. Everything is synthesized with WebAudio, so there are no files to load.
// RW.sfx.play("chime") and friends. Muting is saved with progress.

(() => {
  const RW = window.RW;
  let ac = null, master = null, musicGain = null, musicTimer = null, noiseBuf = null;
  let gestured = false; // browsers only allow audio after the first tap

  function ensure() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = RW.store.muted ? 0 : 0.8;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, dur, { type = "sine", vol = 0.25, at = 0, slide = 0, attack = 0.01, out = master } = {}) {
    const t = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.2, at = 0, freq = 1200, q = 1, type = "bandpass", sweep = 0 } = {}) {
    const t = ac.currentTime + at;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const SOUNDS = {
    tap: () => tone(660, 0.08, { type: "triangle", vol: 0.15 }),
    pop: () => { tone(420, 0.12, { type: "sine", vol: 0.3, slide: 2.2 }); },
    chime: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.35, { type: "triangle", vol: 0.18, at: i * 0.06 })),
    magic: () => [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => tone(f, 0.5, { type: "sine", vol: 0.14, at: i * 0.07 })),
    whoosh: () => noise(0.5, { vol: 0.25, freq: 400, sweep: 6, q: 0.8 }),
    honk: () => { tone(392, 0.28, { type: "square", vol: 0.1 }); tone(494, 0.28, { type: "square", vol: 0.08 }); },
    bark: () => { tone(300, 0.1, { type: "sawtooth", vol: 0.14, slide: 0.55 }); tone(280, 0.12, { type: "sawtooth", vol: 0.12, slide: 0.5, at: 0.18 }); },
    splash: () => { noise(0.45, { vol: 0.3, freq: 2400, sweep: 0.3, q: 0.6 }); tone(700, 0.12, { vol: 0.08, slide: 0.4 }); },
    boing: () => tone(180, 0.4, { type: "sine", vol: 0.3, slide: 3.2 }),
    bigBoing: () => { tone(120, 0.9, { type: "sine", vol: 0.32, slide: 6 }); tone(240, 0.9, { type: "triangle", vol: 0.1, slide: 6 }); },
    swish: () => noise(0.35, { vol: 0.22, freq: 3000, sweep: 0.5, q: 2 }),
    bounce: () => tone(140, 0.12, { type: "sine", vol: 0.3, slide: 0.6 }),
    kick: () => { noise(0.08, { vol: 0.35, freq: 800, q: 1 }); tone(110, 0.14, { vol: 0.3, slide: 0.5 }); },
    crack: () => { noise(0.1, { vol: 0.45, freq: 2600, q: 3 }); tone(900, 0.08, { type: "square", vol: 0.1, slide: 0.5 }); },
    rustle: () => noise(0.4, { vol: 0.18, freq: 3500, q: 0.7 }),
    paper: () => { for (let i = 0; i < 4; i++) noise(0.07, { vol: 0.14, freq: 4000 + i * 400, q: 2, at: i * 0.06 }); },
    sizzle: () => noise(0.9, { vol: 0.12, freq: 5000, type: "highpass" }),
    chirp: () => { tone(2600, 0.07, { vol: 0.08, slide: 1.4 }); tone(3000, 0.07, { vol: 0.07, slide: 1.3, at: 0.1 }); },
    fart: () => {
      // a silly rubbery "pfffrrt" rocket boost
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.7);
      lfo.frequency.value = 28; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
      f.type = "lowpass"; f.frequency.value = 600;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
    },
    giggle: () => [880, 988, 880, 1047].forEach((f, i) => tone(f, 0.09, { type: "triangle", vol: 0.1, at: i * 0.09, slide: 1.1 })),
    lock: () => { tone(220, 0.1, { type: "square", vol: 0.08 }); tone(180, 0.14, { type: "square", vol: 0.08, at: 0.1 }); },
    unlock: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: "triangle", vol: 0.16, at: i * 0.09 })),
    cheer: () => { noise(1.2, { vol: 0.16, freq: 1500, q: 0.4 }); [523, 659, 784].forEach((f, i) => tone(f, 0.4, { type: "triangle", vol: 0.12, at: 0.1 + i * 0.1 })); },
    step: () => tone(90, 0.05, { vol: 0.05 }),
    sparkle: () => [1568, 2093, 2637].forEach((f, i) => tone(f, 0.2, { type: "sine", vol: 0.08, at: i * 0.05 })),
    rumble: () => noise(1.4, { vol: 0.2, freq: 180, q: 0.5, type: "lowpass" }),
  };

  // A soft, looping pentatonic tune. Quiet on purpose.
  const MELODY = [
    [0, 2], [4, 1], [7, 1], [9, 2], [7, 2], [4, 1], [2, 1], [4, 2], [0, 2],
    [2, 1], [4, 1], [7, 2], [4, 1], [2, 1], [0, 4],
  ];
  const BASS = [0, 0, 5, 5, 7, 7, 0, 0];
  function startMusic() {
    if (musicTimer || !ac) return;
    const beat = 0.34, root = 392;
    let next = ac.currentTime + 0.2;
    const bar = () => {
      let t = 0;
      MELODY.forEach(([n, len]) => {
        const f = root * Math.pow(2, n / 12);
        tone(f, len * beat * 0.95, { type: "triangle", vol: 0.12, at: next - ac.currentTime + t * beat, out: musicGain, attack: 0.02 });
        t += len;
      });
      BASS.forEach((n, i) => tone((root / 4) * Math.pow(2, n / 12), beat * 3.5, { type: "sine", vol: 0.2, at: next - ac.currentTime + i * 4 * beat, out: musicGain, attack: 0.04 }));
      next += 32 * beat;
    };
    bar();
    musicTimer = setInterval(() => { if (next - ac.currentTime < 2) bar(); }, 500);
  }

  RW.sfx = {
    unlock() { gestured = true; if (ensure()) startMusic(); },
    play(name) {
      if (RW.store.muted || !SOUNDS[name] || !gestured) return;
      if (!ensure()) return;
      try { SOUNDS[name](); } catch (e) { /* audio hiccup; ignore */ }
    },
    setMuted(m) {
      RW.store.muted = m; RW.persist();
      if (ac) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.05);
    },
    // Games take over the speakers; the hub tune pauses while one is open.
    duck(on) { if (ac) musicGain.gain.setTargetAtTime(on ? 0 : 0.16, ac.currentTime, 0.2); },
  };
})();
