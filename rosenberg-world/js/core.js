// Rosenberg World: core. Namespace, helpers, event bus and the saved progress.
// Everything else hangs off window.RW.

window.RW = window.RW || {};

(() => {
  const RW = window.RW;

  // The playable world. Ground coordinates: x to the right, y toward the viewer.
  RW.WORLD = { W: 5000, H: 3400, minX: 110, maxX: 4300, minY: 360, maxY: 3060 };

  // ---------- helpers ----------
  const U = RW.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    easeOutBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    seeded(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; },
  };
  RW.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  RW.dev = /[?&]dev\b/.test(location.search);

  // ---------- event bus ----------
  const handlers = {};
  RW.bus = {
    on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
    emit(evt, data) { (handlers[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
  };

  // ---------- saved progress: one profile per player ----------
  // Stored on this device only. If storage is blocked the game still works; it just forgets.
  // Picking Reuben, Jonah or Ellie on the character screen "logs in" to that player's profile.
  const KEY = "rosenbergWorld.save.v2";
  const OLD_KEY = "rosenbergWorld.save.v1";
  const fresh = () => ({
    stars: 0,            // Rosenberg Stars total (the currency)
    foundStars: {},      // hidden world stars already collected, by id
    collectibles: {},    // collection book items found, by id
    secrets: {},         // secret jokes discovered, by id
    games: {},           // per game: { plays, highScore, starsEarned, lastScore }
    built: {},           // house upgrades already celebrated
    gameData: {},        // small per-game save slots
    time: { world: 0, games: {}, days: {}, sessions: 0, first: 0, last: 0 }, // seconds played
  });
  const freshStore = () => ({ version: 2, muted: false, last: null, profiles: {} });
  function loadStore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(freshStore(), JSON.parse(raw));
      // first run after the update: move the old single save into whoever played last
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const o = JSON.parse(old), st = freshStore();
        const who = o.character || "reuben";
        st.muted = !!o.muted; st.last = o.character || null;
        st.profiles[who] = Object.assign(fresh(), { stars: o.stars || 0, foundStars: o.foundStars || {}, collectibles: o.collectibles || {}, secrets: o.secrets || {}, games: o.games || {}, built: o.built || {}, gameData: o.gameData || {} });
        return st;
      }
    } catch (e) { /* private mode or blocked storage */ }
    return freshStore();
  }
  RW.store = loadStore();
  RW.profileId = null;
  // Switch the active player. RW.save always points at the active player's progress.
  RW.useProfile = (id) => {
    const P = RW.store.profiles;
    P[id] = Object.assign(fresh(), P[id] || {});
    P[id].time = Object.assign(fresh().time, P[id].time || {});
    RW.save = P[id];
    RW.profileId = id;
    return RW.save;
  };
  RW.profile = (id) => RW.store.profiles[id] || null;
  RW.useProfile(RW.store.last || "reuben");
  RW.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(RW.store)); } catch (e) { /* ignore */ } };
  RW.resetSave = () => { RW.store = freshStore(); RW.persist(); location.reload(); };

  // Time played, counted in seconds against the active player.
  RW.addTime = (secs, gameId) => {
    const t = RW.save.time, day = RW.today();
    if (gameId) t.games[gameId] = (t.games[gameId] || 0) + secs; else t.world += secs;
    t.days[day] = (t.days[day] || 0) + secs;
    t.last = Date.now(); if (!t.first) t.first = t.last;
  };
  RW.today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  RW.fmtTime = (secs) => {
    secs = Math.round(secs || 0);
    if (secs < 60) return secs + "s";
    const m = Math.floor(secs / 60), h = Math.floor(m / 60);
    return h ? `${h}h ${m % 60}m` : `${m}m`;
  };
  RW.totalTime = (pr) => { if (!pr) return 0; const t = pr.time || {}; return (t.world || 0) + Object.values(t.games || {}).reduce((a, b) => a + b, 0); };

  // All star changes go through here so the HUD, upgrades and the book stay in sync.
  RW.addStars = (n, source) => {
    if (!n) return;
    RW.save.stars = Math.max(0, RW.save.stars + n);
    RW.persist();
    RW.bus.emit("stars", { total: RW.save.stars, added: n, source });
  };
})();
