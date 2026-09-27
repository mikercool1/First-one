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

  G.register({
    id: "backyardSoccer",
    title: "Backyard Soccer",
    subtitle: "One-on-one: pick your kicker",
    destination: "soccer",
    unlocked: true,
    entry: "games/backyard-soccer/index.html",
    color: "#2E8B57",
    icon: "⚽",
  });

  G.register({
    id: "jonahsVolley",
    title: "Jonah's Volley",
    subtitle: "Volleyball: Jonah vs. Ellie or Reuben",
    destination: "volleyball",
    unlocked: true,
    entry: "games/jonahs-volley/index.html",
    color: "#F2A93B",
    icon: "🏐",
  });

  G.register({
    id: "wordGame",
    title: "The Word Game",
    subtitle: "Chain words in a category. Beat the computer!",
    destination: "plaza-building",
    unlocked: true,
    entry: "games/word-game/index.html",
    color: "#2F5BEA",
    icon: "🔤",
  });

  G.register({
    id: "splashDown",
    title: "Splash Down",
    subtitle: "Inner-tube water slides: lean into the turns!",
    destination: "waterworld",
    unlocked: true,
    entry: "games/water-slide/index.html",
    color: "#1E9FD9",
    icon: "🛟",
  });

  G.register({
    id: "maxMan",
    title: "Max-Man",
    subtitle: "Gobble every Cheerio. Dodge Bath Time and Bedtime!",
    destination: "arcade",
    unlocked: true,
    entry: "games/max-man/index.html",
    color: "#F2A93B",
    icon: "🍪",
  });

  G.register({
    id: "jonahsTennis",
    title: "Jonah's Tennis",
    subtitle: "Backyard tennis: Jonah vs. Ellie or Reuben",
    destination: "sports-tennis",
    unlocked: true,
    entry: "games/jonahs-tennis/index.html",
    color: "#2EB872",
    icon: "🎾",
  });

  G.register({
    id: "racecarRally",
    title: "Racecar Rally",
    subtitle: "Pick a car and race the family!",
    destination: "raceway",
    unlocked: true,
    entry: "games/racecar/index.html",
    color: "#E8453C",
    icon: "🏎️",
  });

  // ---------------- future game slots ----------------
  // Each is already placed in the world with a locked building, gate or cabinet.

  const future = [
    ["futureGame01", "sports-hoops", "🏀"],
    ["futureGame02", "sports-stadium", "🏈"],
    ["futureGame03", "woods-cave", "🔦"],
    ["futureGame04", "beach-dock", "⛵"],
    ["futureGame05", "gondola", "🏔️"],
    ["futureGame06", "island", "🏝️"],
    ["futureGame07", "plaza-lot", "🚧"],
  ];
  future.forEach(([id, destination, icon]) => G.register({ id, title: "", destination, unlocked: false, icon }));
})();
