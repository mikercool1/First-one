# Rosenberg World

The home base for the Rosenberg family games. Reuben, Jonah, Ellie and Max walk around a cartoon
neighborhood, find hidden Rosenberg Stars, tap things to see what happens, and go through
doors into mini-games.

Open `index.html` in a browser. No install, no server. Landscape iPad is the main target.

## Adding a finished game ("Add this game to Rosenberg World")

1. Copy the game into `games/<game-name>/`.
2. In the game's `index.html`, add `<script src="../rw-bridge.js"></script>`. When a round ends, call
   `RosenbergBridge.report({ score, stars })`; the game keeps its own end screen and the stars are
   banked right away. Add a hidden `<button data-rw-back hidden>BACK TO ROSENBERG WORLD</button>`
   next to the game's Play Again button; the bridge shows it only inside the world.
   (`RosenbergBridge.finish(...)` hands straight back to the world instead.) All of this does nothing
   when the game is opened on its own, so the same file still works standalone.
3. In `js/games.js`, set `entry: "games/<game-name>/index.html"` on the game's entry.

That's all. The building, sign, map pin, PLAY card, results screen (score, stars, Play Again,
Back to Rosenberg World), high score and star payout already exist. When the player comes back,
they walk out of that game's door and the stars they earned fly into the total.

`games/_template/` is a small working example of the bridge.

### A brand-new game with no building yet

There are 7 future slots (`futureGame01` to `futureGame07` in `js/games.js`). Each one already has
a locked place in the world: the Hoops Gym, Field House, Mystery Cave,
the Dock, Winter Mountain, Mystery Island and the construction lot. To open one, give it a `title`, `icon`, `color`, set `unlocked: true` and an `entry`.
The construction lot shows "???" until then; after that its sign shows the game's title
automatically (that's how the Mystery Plaza building became The Word Game).

### Games written as a JS module

Instead of `entry`, a game can have `mount(container, api)`. It draws into `container` and calls
`api.finish({ score, stars })` or `api.exit()`. `api.player` says who is playing, and
`api.save(key, value)` / `api.load(key)` give the game its own saved slot. Return a cleanup function
if the game needs to stop timers.

### Collectibles from games

Register an item with `RW.collection.add({ id, name, icon, hint })` (for example in `games.js`),
then return it from a game: `RosenbergBridge.finish({ score, stars, collectibles: ["my-item"] })`.
It shows up in the Collection Book.

## Linked games

Every linked game is also one tap away from the ALL GAMES button in the HUD.


| Where in the world | Game | Folder |
| --- | --- | --- |
| Backyard Baseball field | Backyard Baseball | `games/backyard-baseball` |
| The family car in the driveway | Fish Friday | `games/lox-run` |
| Basketball court (Sports Complex) | Buckets | `games/buckets` |
| Ariel's Kitchen | Ariel's Passover Cookout | `games/ariel-passover-cookout` |
| Fart Man Landing Zone | Fart Man Lander | `games/fart-man-lander` |
| The big white rocket (Fart Man Landing Zone) | Lunar Lander | `games/lunar-lander` |
| Math Blaster Academy | Reuben's Math Blaster | `games/math-blaster` |
| Soccer field (Sports Complex) | Backyard Soccer | `games/backyard-soccer` |
| Beach volleyball court | Jonah's Volley | `games/jonahs-volley` |
| Mystery Plaza building | The Word Game | `games/word-game` |
| Rosenberg House front door | The Game Room (Sarah, the bookshelf: Rosenboggle and The Word Game) | `games/game-room`, `games/rosenboggle` |
| Baha Bay water park (main gate) | Splash Down | `games/water-slide` |
| Baha Bay Lazy River hut (and the floating tubes) | Lazy River Pirates | `games/lazy-river` |
| Rosenberg Arcade (and its orange cabinet) | Max-Man | `games/max-man` |
| Tennis court (Sports Complex) | Jonah's Tennis | `games/jonahs-tennis` |
| Rosenberg Raceway (and the go-kart) | Racecar Rally | `games/racecar` |

The Game Room is a small hub of its own: games on its bookshelf are opened with `&room=1`, and any
`data-rw-room` button in them (hidden by default) goes back to the room. Rosenboggle's dictionary
is `games/rosenboggle/words.js` (common English words, rude words removed).

These are copies of each game made for the hub. A later update to a game elsewhere in the repo
needs copying in here again (keeping its `rw-bridge.js` lines).

## Files

- `js/games.js`: **the game registry. The one file to edit when adding games.**
- `js/world.js`: destinations (every door and map pin), buildings, props, hidden stars and what
  everything does when tapped.
- `js/life.js`: the backyard dog, family cameos, Max, cars, birds, sky and mountains, title sequence.
- `js/engine.js`: camera, touch controls, walking and pathfinding, effects, render loop.
- `js/art.js`: characters, creatures and props, all drawn in code.
- `js/buildings.js`, `js/ground.js`: building art and the ground (paths, fields, water).
- `js/ui.js`: title, character select, HUD, map, Collection Book, game host, results.
- `js/registry.js`, `js/core.js`, `js/audio.js`: registry plumbing, saved progress, sounds.

## Progress and player memory

Picking Reuben, Jonah, Ellie or Max on the character screen logs in to that player's own profile:
their Rosenberg Stars, hidden stars found, collectibles, secrets, house upgrades, high scores
and play time are all kept separately, on this device (`localStorage`). The character cards show
each kid's stars and time played, and the game remembers who played last.

Play time is counted per player: time exploring the world, time in each mini-game, and time per
day. The 📊 button on the character screen (or FAMILY STATS in the Collection Book) shows it all.
"Reset all progress" at the bottom of the Collection Book erases every player on the device.

House upgrades unlock by each player's star total: Dog House 10, Pool 25, Treehouse 40,
Giant Slide 60, Sport Court 80.

Add `?dev` to the URL to get a "Test finish" button on placeholder game screens, which runs
the full results and star flow.
