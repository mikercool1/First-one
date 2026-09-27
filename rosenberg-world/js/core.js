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

  // ---------- saved progress ----------
  // Stored on this device only. If storage is blocked the game still works; it just forgets.
  const KEY = "rosenbergWorld.save.v1";
  const fresh = () => ({
    stars: 0,            // Rosenberg Stars total (the currency)
    character: null,     // last chosen player id
    foundStars: {},      // hidden world stars already collected, by id
    collectibles: {},    // collection book items found, by id
    secrets: {},         // secret jokes discovered, by id
    games: {},           // per game: { plays, highScore, starsEarned, lastScore }
    muted: false,
  });
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* private mode or blocked storage */ }
    return fresh();
  }
  RW.save = load();
  RW.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(RW.save)); } catch (e) { /* ignore */ } };
  RW.resetSave = () => { RW.save = fresh(); RW.persist(); location.reload(); };

  // All star changes go through here so the HUD, upgrades and the book stay in sync.
  RW.addStars = (n, source) => {
    if (!n) return;
    RW.save.stars = Math.max(0, RW.save.stars + n);
    RW.persist();
    RW.bus.emit("stars", { total: RW.save.stars, added: n, source });
  };
})();
