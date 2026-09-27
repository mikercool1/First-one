// =====================================================================
//  ROSENBERG WORLD: GAME REGISTRY
//  This is the one file to edit when a finished mini-game joins the world.
// =====================================================================
//
//  HOW TO ADD A FINISHED GAME
//
//  1. Copy the game's folder into rosenberg-world/games/<game-name>/
//     (any relative URL works, e.g. "../buckets/index.html").
//  2. In the game's index.html add:   <script src="../rw-bridge.js"></script>
//     and when a round ends call:
//        RosenbergBridge.finish({ score: 1234, stars: 3 });
//     (optional: collectibles: ["baseball"]). RosenbergBridge.exit() quits with no result.
//  3. Below, find the game's entry and set   entry: "games/<game-name>/index.html"
//
//  The building, sign, map pin, results screen, high score and star payout already exist.
//
//  To open a NEW game in one of the future slots, fill in its entry below:
//  give it a title, set unlocked: true and an entry. The sign on its building
//  switches from "???" to the game's title automatically.
//
//  Destinations (where each game's door is) are listed in world.js → DESTINATIONS.
// =====================================================================

(() => {
  const G = window.RW.games;

  // ---------------- current games ----------------

  G.register({
    id: "backyardBaseball",
    title: "Backyard Baseball",
    subtitle: "Swing for the fence behind the Rosenberg House",
    destination: "baseball",
    unlocked: true,
    entry: "games/backyard-baseball/index.html",
    color: "#2E8B57",
    icon: "⚾",
    starsFor: (score) => Math.min(5, Math.floor(score / 3)),
  });

  G.register({
    id: "fartManLander",
    title: "Fart Man Lunar Lander",
    subtitle: "Land softly. Power responsibly.",
    destination: "fartman",
    unlocked: true,
    entry: "games/fart-man-lander/index.html",
    color: "#7B3FE4",
    icon: "🚀",
  });

  G.register({
    id: "mathBlaster",
    title: "Math Blaster",
    subtitle: "Reuben's multiplication mission",
    destination: "mathblaster",
    unlocked: true,
    entry: "games/math-blaster/index.html",
    color: "#1FA4E0",
    icon: "✖️",
  });

  G.register({
    id: "arielCookout",
    title: "Ariel's Passover Cookout",
    subtitle: "Something smells amazing",
    destination: "kitchen",
    unlocked: true,
    entry: "games/ariel-passover-cookout/index.html",
    color: "#E8743C",
    icon: "🍳",
  });

  G.register({
    id: "fishFriday",
    title: "Fish Friday",
    subtitle: "Hop in the car and deliver the lox",
    destination: "car",
    unlocked: true,
    entry: "games/lox-run/index.html",
    color: "#2F6BD6",
    icon: "🚗",
  });

  G.register({
    id: "buckets",
    title: "Buckets",
    subtitle: "8s and 9s times tables: Brunson vs. Wemby",
    destination: "court",
    unlocked: true,
    entry: "games/buckets/index.html",
    color: "#F58426",
    icon: "🏀",
  });

  // ---------------- future game slots ----------------
  // Each is already placed in the world with a locked building, gate or cabinet.

  const future = [
    ["futureGame01", "sports-hoops", "🏀"],
    ["futureGame02", "sports-stadium", "🏈"],
    ["futureGame03", "sports-tennis", "🎾"],
    ["futureGame04", "arcade", "🕹️"],
    ["futureGame05", "raceway", "🏎️"],
    ["futureGame06", "woods-cave", "🔦"],
    ["futureGame07", "waterworld", "🌊"],
    ["futureGame08", "beach-dock", "⛵"],
    ["futureGame09", "gondola", "🏔️"],
    ["futureGame10", "island", "🏝️"],
    ["futureGame11", "plaza-building", "❓"],
    ["futureGame12", "plaza-lot", "🚧"],
  ];
  future.forEach(([id, destination, icon]) => G.register({ id, title: "", destination, unlocked: false, icon }));
})();
