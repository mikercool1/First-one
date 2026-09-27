// Rosenberg World: game registry plumbing.
// The actual list of games lives in games.js; this file only knows how to store them and their records.

(() => {
  const RW = window.RW;

  const DEFAULTS = {
    id: "",
    title: "",
    subtitle: "",
    destination: null,  // id of a destination in world.js (the building/portal the game lives in)
    room: null,         // OR the destination of a room of games it sits inside (e.g. the Game Room shelf)
    menu: false,        // true for a room of games (left out of ALL GAMES; its games are listed instead)
    unlocked: false,    // false = a locked future slot (padlock, COMING SOON)
    entry: null,        // URL of a finished game's index.html; opened full screen inside the hub
    mount: null,        // OR a function (container, api) => cleanup, for games written as a JS module
    color: "#2F6BFF",
    icon: "🎮",
    starsFor: null,     // optional (score) => stars, used when a game reports a score but no stars
    maxStars: 10,       // cap per play so a buggy game can't flood the bank
  };

  const list = [];
  const byId = {};

  RW.games = {
    list,
    register(def) {
      const g = Object.assign({}, DEFAULTS, def);
      if (!g.id) throw new Error("Game needs an id");
      if (byId[g.id]) Object.assign(byId[g.id], g);
      else { list.push(g); byId[g.id] = g; }
      return byId[g.id];
    },
    get: (id) => byId[id],
    forDestination: (destId) => list.find((g) => g.destination === destId),
    // "playable": the full game is connected. "placeholder": the door is open but the game isn't wired in yet.
    // "locked": a future slot.
    status(g) {
      if (!g || !g.unlocked) return "locked";
      return g.entry || g.mount ? "playable" : "placeholder";
    },
    stats(id) {
      return RW.save.games[id] || { plays: 0, highScore: 0, starsEarned: 0, lastScore: 0 };
    },
    // Called by the host when a game finishes. Updates records, banks stars and collectibles.
    record(id, result) {
      const g = byId[id];
      const st = Object.assign({ plays: 0, highScore: 0, starsEarned: 0, lastScore: 0 }, RW.save.games[id]);
      const score = Math.max(0, Math.round(Number(result.score) || 0));
      let stars = result.stars != null ? Number(result.stars) : g && g.starsFor ? g.starsFor(score) : 0;
      stars = Math.max(0, Math.min(g ? g.maxStars : 10, Math.round(stars || 0)));
      const newHigh = score > st.highScore && st.plays > 0;
      st.plays += 1;
      st.lastScore = score;
      st.highScore = Math.max(st.highScore, score);
      st.starsEarned += stars;
      RW.save.games[id] = st;
      const newItems = [];
      (result.collectibles || []).forEach((cid) => {
        if (RW.collection.byId[cid] && !RW.save.collectibles[cid]) { RW.save.collectibles[cid] = Date.now(); newItems.push(cid); }
      });
      RW.persist();
      if (stars) RW.addStars(stars, "game:" + id);
      return { score, stars, newHigh, newItems };
    },
  };

  // ---------- collection book ----------
  // Items for the Collection Book. Future games can add their own with RW.collection.add({...}).
  const items = [];
  const itemById = {};
  RW.collection = {
    items,
    byId: itemById,
    add(item) {
      const it = Object.assign({ id: "", name: "", icon: "❓", hint: "", from: "world" }, item);
      if (!itemById[it.id]) { items.push(it); itemById[it.id] = it; }
      return itemById[it.id];
    },
    has: (id) => !!RW.save.collectibles[id],
    // Returns true if newly found.
    give(id) {
      if (!itemById[id] || RW.save.collectibles[id]) return false;
      RW.save.collectibles[id] = Date.now();
      RW.persist();
      RW.bus.emit("collectible", itemById[id]);
      return true;
    },
  };
})();
