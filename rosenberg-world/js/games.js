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
    id: "lunarLander",
    title: "Lunar Lander",
    subtitle: "Steer with your finger and land softly on the moon.",
    destination: "lunar",
    unlocked: true,
    entry: "games/lunar-lander/index.html",
    color: "#3A4E9C",
    icon: "🌙",
  });

  G.register({
    id: "grandpasGarden",
    title: "Grampa's Garden",
    subtitle: "Pick Grampa Simon's red tomatoes before they fall!",
    destination: "garden",
    unlocked: true,
    entry: "games/grandpas-garden/index.html",
    color: "#D8342A",
    icon: "🍅",
  });

  G.register({
    id: "frozenbergs",
    title: "Frozenbergs",
    subtitle: "Run the ice cream stand! Build each cone just like the order.",
    destination: "icecream",
    unlocked: true,
    entry: "games/frozenbergs/index.html",
    color: "#E8558A",
    icon: "🍦",
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
    id: "splitTheUprights",
    title: "Split the Uprights",
    subtitle: "Field goals only: longer kicks, stronger wind",
    destination: "football",
    unlocked: true,
    entry: "games/field-goal/index.html",
    color: "#F2C230",
    icon: "🏈",
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
    id: "gameRoom",
    title: "The Game Room",
    subtitle: "Sarah's got games: Rosenboggle and The Word Game",
    destination: "gameroom",
    unlocked: true,
    entry: "games/game-room/index.html",
    color: "#8A3A26",
    icon: "🎲",
    menu: true, // a room of games: its games get their own ALL GAMES cards instead
  });

  // Games on the Game Room shelf: no door of their own (room: where they live)
  G.register({
    id: "rosenboggle",
    title: "Rosenboggle",
    subtitle: "Shake the letters and find as many words as you can!",
    room: "gameroom",
    unlocked: true,
    entry: "games/rosenboggle/index.html",
    color: "#E8622A",
    icon: "🔠",
  });

  G.register({
    id: "wordGame",
    title: "The Word Game",
    subtitle: "Chain words in a category. Beat the computer!",
    room: "gameroom",
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
    id: "lazyRiver",
    title: "Lazy River Pirates",
    subtitle: "Float the Baha Mar lazy river and race Dad!",
    destination: "lazyriver",
    unlocked: true,
    entry: "games/lazy-river/index.html",
    color: "#0B8FB0",
    icon: "🏴‍☠️",
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

  // ---------------- Witch Mountain, Frogger and the hotel ----------------
  // Their places are in the world (Witch Mountain in the north, the Frog Pond by the road, the
  // hotel on Baha Mar). The hotel is still coming: set unlocked: true and entry when it arrives.
  G.register({
    id: "witchMountain",
    title: "Witch Mountain",
    subtitle: "Hike up the mountain and spell each witch's word!",
    destination: "witchmtn",
    unlocked: true,
    entry: "games/witch-mountain/index.html",
    color: "#7B3FE4",
    icon: "🧙",
  });

  G.register({
    id: "bahaMarHotel",
    title: "Checking In",
    subtitle: "Work the front desk at Baha Mar: the right bracelets for every guest!",
    destination: "hotel",
    unlocked: true,
    entry: "games/checking-in/index.html",
    color: "#E86A8A",
    icon: "🏨",
  });

  // Ice Mountain (bottom-left): winter games on their way
  G.register({
    id: "hotChocolate",
    title: "Cocoa Party",
    subtitle: "Run the hot chocolate stand on Ice Mountain!",
    destination: "hotchoc",
    unlocked: true,
    entry: "games/coco-party/index.html",
    color: "#8A5A3C",
    icon: "☕",
  });
  G.register({
    id: "sledHill",
    title: "Max's Bunny Hill",
    subtitle: "Sled down the icy hill and stack bunnies on Max's hat!",
    destination: "sledhill",
    unlocked: true,
    entry: "games/maxs-bunny-hill/index.html",
    color: "#E8453C",
    icon: "🐰",
  });
  G.register({
    id: "iceHockey",
    title: "Rosenberg Ice Hockey",
    subtitle: "1-on-1 on the ice! Skate, steal the puck and shoot past the goalie.",
    destination: "icerink",
    unlocked: true,
    entry: "games/rosenberg-hockey/index.html",
    color: "#2F6BD6",
    icon: "🏒",
  });
  G.register({
    id: "miniGolf",
    title: "Rosenberg Mini Golf",
    subtitle: "Three floating-island holes. Pull back and let go to putt!",
    destination: "minigolf",
    unlocked: true,
    entry: "games/mini-golf/index.html",
    color: "#2EB872",
    icon: "⛳",
  });
  G.register({ id: "skiRun", title: "Ski Run", subtitle: "", destination: "skirun", unlocked: false, entry: null, color: "#2F6BD6", icon: "⛷️" });

  G.register({
    id: "frogger",
    title: "Rosenberg Crossing",
    subtitle: "Frogger! Hop across the street and the river to hug the family.",
    destination: "frogpond",
    unlocked: true,
    entry: "games/frogger/index.html",
    color: "#2EB872",
    icon: "🐸",
  });

  // Future games: register the game here with a destination, then give that destination a
  // door in js/world.js (see "A brand-new game" in README.md).
})();
