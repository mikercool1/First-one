# Rosenberg World

The home base for the Rosenberg family games. Reuben, Jonah and Ellie walk around a cartoon
neighborhood, find hidden Rosenberg Stars, tap things to see what happens, and go through
doors into mini-games.

Open `index.html` in a browser. No install, no server. Landscape iPad is the main target.

## Adding a finished game ("Add this game to Rosenberg World")

1. Copy the game into `games/<game-name>/`.
2. In the game's `index.html`, add `<script src="../rw-bridge.js"></script>`. When a round ends, call
   `RosenbergBridge.finish({ score, stars })`. `RosenbergBridge.exit()` quits without a result.
   Both do nothing when the game is opened on its own, so the same file still works standalone.
3. In `js/games.js`, set `entry: "games/<game-name>/index.html"` on the game's entry.

That's all. The building, sign, map pin, PLAY card, results screen (score, stars, Play Again,
Back to Rosenberg World), high score and star payout already exist. When the player comes back,
they walk out of that game's door and the stars they earned fly into the total.

`games/_template/` is a small working example of the bridge.

### A brand-new game with no building yet

There are 12 future slots (`futureGame01` to `futureGame12` in `js/games.js`). Each one already has
a locked place in the world: the Hoops Gym, Field House, Tennis Club, Arcade, Raceway, Mystery Cave,
Water World, the Dock, Winter Mountain, Mystery Island, the Mystery Plaza building and the
construction lot. To open one, give it a `title`, `icon`, `color`, set `unlocked: true` and an `entry`.
The Mystery Plaza building and the construction lot show "???" until then; after that their signs
show the game's title automatically.

### Games written as a JS module

Instead of `entry`, a game can have `mount(container, api)`. It draws into `container` and calls
`api.finish({ score, stars })` or `api.exit()`. `api.player` says who is playing, and
`api.save(key, value)` / `api.load(key)` give the game its own saved slot. Return a cleanup function
if the game needs to stop timers.

### Collectibles from games

Register an item with `RW.collection.add({ id, name, icon, hint })` (for example in `games.js`),
then return it from a game: `RosenbergBridge.finish({ score, stars, collectibles: ["my-item"] })`.
It shows up in the Collection Book.

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

## Progress

Stars, collectibles, secrets, high scores and the last player are saved on the device
(`localStorage`). "Reset all progress" is at the bottom of the Collection Book.
House upgrades unlock by star total: Dog House 10, Pool 25, Treehouse 40, Giant Slide 60,
Sport Court 80.

Add `?dev` to the URL to get a "Test finish" button on placeholder game screens, which runs
the full results and star flow.
