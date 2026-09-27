# Rosenberg World

The home base for the Rosenberg family games. Reuben, Jonah, Ellie and Max walk around a cartoon
neighborhood, find hidden Rosenberg Stars, tap things to see what happens, and go through
doors into mini-games.

Open `index.html` in a browser. No install, no server. Landscape iPad is the main target.

## Install it on the iPad (PWA)

Rosenberg World is also an installable web app that works offline.

1. Host this repository on GitHub Pages: on GitHub, **Settings → Pages → Build and deployment →
   Deploy from a branch**, pick the branch with this folder and `/ (root)`, and save. The app is then at
   `https://mikercool1.github.io/First-one/rosenberg-world/`.
2. On the iPad, open that address in **Safari**, tap **Share → Add to Home Screen**, then **Add**.
3. Open it from the Home Screen icon: it runs full screen, and after the first visit every game
   works without Wi-Fi.

`manifest.webmanifest` names the app and its icons (`icons/`). `sw.js` is the service worker that keeps
every file on the iPad; the list it keeps is `sw-files.js`, made by `node tools/build-sw.js`. **Run that
after changing any file**, so installed iPads pick up the new version (they update the next time the
app is opened online). The installed app keeps its own saved progress, separate from the claude.ai link.

## Adding a finished game ("Add this game to Rosenberg World")

1. Copy the game into `games/<game-name>/`.
2. In the game's `index.html`, add `<script src="../rw-bridge.js"></script>`. When a round ends, call
   `RosenbergBridge.report({ score, stars })`; the game keeps its own end screen and the stars are
   banked right away. Add a hidden `<button data-rw-back hidden>BACK TO ROSENBERG WORLD</button>`
   next to the game's Play Again button; the bridge shows it only inside the world.
   (`RosenbergBridge.finish(...)` hands straight back to the world instead.) All of this does nothing
   when the game is opened on its own, so the same file still works standalone.
3. In `js/games.js`, set `entry: "games/<game-name>/index.html"` on the game's entry.
4. Run `node tools/build-sw.js` so the installed iPad app includes the new files.

That's all. The building, sign, map pin, PLAY card, ALL GAMES card (the HUD's first button), high score and star payout
already exist. When the player comes back,
they walk out of that game's door and the stars they earned fly into the total.

`games/_template/` is a small working example of the bridge.

### One kid's game

Add `only: "ellie"` (or any kid) to a game in `js/games.js` and only that kid can play it: everyone
else gets a friendly "This is Ellie's!" and it's left off their map and ALL GAMES list.

### A brand-new game with no building yet

1. Register it in `js/games.js` with a new `destination` id.
2. In `js/world.js`, add that id to `DESTINATIONS` (where its door is, where you come back out, its
   map pin), and give it something to tap: a building, sign or prop with `tap: portalTap("<id>")`.
   The Frozenbergs ice cream stand (`buildIceCream`) is a small, complete example.
3. Optionally add it to a signpost in `buildSignposts()`.

### Coming soon: Ice Mountain's winter games

The bottom-left corner of the world is **Ice Mountain**: snow on the ground, snowy pines, a frozen
stream you can walk across, falling snow and a snowman, reached by the snowy trail past the
treehouse (the ICE MOUNTAIN arch marks the way in). Cocoa Party, Max's Bunny Hill and Rosenberg Ice Hockey are open; one place waits for its game:

| Place | Game id in `js/games.js` | Destination |
| --- | --- | --- |
| Ski Run (a big snowy peak with slalom flags and a moving ski lift) | `skiRun` | `skirun` | (hidden until it's unlocked)

Switch one on: copy the game into `games/<name>/` (with the bridge lines) and in `js/games.js` set
`unlocked: true` and `entry`. The ribbon then shows the game's title, and it appears on the map and
in ALL GAMES.

### A game for the Game Room shelf

Give it `room: "gameroom"` instead of a `destination`, and add a card for it in
`games/game-room/index.html`. It gets its own card in ALL GAMES.

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

Tap a building (or its pin on the map) and you walk in and the game starts. Every game is also
one tap away from the ALL GAMES button in the HUD. When you leave a game you walk back out of its
door and the stars you earned fly into your total.


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
| Football field goalposts and the FIELD GOALS sign (Sports Complex) | Split the Uprights | `games/field-goal` |
| Beach volleyball court | Jonah's Volley | `games/jonahs-volley` |
| Rosenberg House front door | The Game Room: Rosenboggle and The Word Game | `games/game-room`, `games/rosenboggle`, `games/word-game` |
| Splash Down slide park on Baha Mar (gate, slides or splash pool) | Splash Down | `games/water-slide` |
| Lazy River loop on Baha Mar, east of Splash Down (tiki hut, water or tubes) | Lazy River Pirates | `games/lazy-river` |

Baha Mar is an island out in the ocean. Take the sea plane at the end of the beach dock ("FLY TO
BAHA MAR"), or just tap the island; the plane on the island flies you home. The flight lives in
`world.flyTo` in `js/world.js`, the island's shape is `RW.layout.island` in `js/ground.js`.
| Rosenberg Arcade (and its orange cabinet) | Max-Man | `games/max-man` |
| Tennis court (Sports Complex) | Jonah's Tennis | `games/jonahs-tennis` |
| Rosenberg Raceway (and the go-kart) | Racecar Rally | `games/racecar` |
| Frozenbergs ice cream stand (Baha Mar, on the promenade) | Frozenbergs | `games/frozenbergs` |
| Cocoa Party hut (Ice Mountain, a log cabin with a steaming mug) | Cocoa Party | `games/coco-party` |
| Bunny Hill (Ice Mountain, the sled hill someone keeps whooshing down) | Max's Bunny Hill | `games/maxs-bunny-hill` |
| Ice Rink (bottom-left of Ice Mountain, kids skating laps) | Rosenberg Ice Hockey | `games/rosenberg-hockey` |
| Windmill mini golf course (between the Star Shop and the arcade) | Rosenberg Mini Golf | `games/mini-golf` |
| Ellie's Ballet House (the pink princess tower in the woods; **Ellie only**) | Tiptoe, Gallop or March | `games/ellie-ballet` |
| Baha Mar Hotel (the east end of the island) | Checking In | `games/checking-in` |
| Grampa Simon's garden (between the Kitchen and the Raceway) | Grandpa's Garden | `games/grandpas-garden` |
| Witch Mountain (a spooky purple mountain in the woods; tap it or its glowing cave door) | Witch Mountain | `games/witch-mountain` |
| The Frog Pond (by the road, south of the arcade) | Rosenberg Crossing (Frogger) | `games/frogger` |

The Game Room is a small hub of its own: games on its bookshelf are opened with `&room=1`, and any
`data-rw-room` button in them (hidden by default) goes back to the room. Rosenboggle's dictionary
is `games/rosenboggle/words.js` (common English words, rude words removed).

**These are the one copy of each game.** Every game here also works opened on its own
(for example `rosenberg-world/games/max-man/index.html`), so update games here, not in a separate
folder. The old standalone links at the top of the repo (`index.html` for The Word Game, `buckets/`,
`lox-run/`) now just open the copy in here.

## The family

- Grandma **Cari** and Grampa **Simon** have three kids: **Molly**, **Michael** and **Ariel**.
- Molly married **Ikey**; their son is **Max**.
- Michael married **Sarah**; their kids are **Reuben**, **Jonah** and **Ellie**.
- **Nana** is Sarah's mom.

So for Reuben, Jonah and Ellie: Sarah is Mom, Michael is Dad, Molly and Ariel are aunts, Ikey is an
uncle, and Max is their cousin. For Max: Molly is Mom, Ikey is Dad, Sarah is Aunt Sarah and Michael
is Uncle Michael. The tree is `RW.FAMILY` in `js/core.js`, and `RW.callName(who, kid)` says what a kid
calls someone ("Mom", "Aunt Molly", "Grampa Simon"). Tap a family member in the world and your kid
greets them that way.

## Star Shop

The Star Shop (next to the plaza) is a full-page store with three sections, cheapest first.
Buying something puts it on right away, and everything is saved per player.

- **Rides**: Skateboard, Scooter, ATV and Motorbike (5 stars each); Hoverboard 20, Golf Cart 25,
  Unicorn 40, and two big goals, the Go-Kart 50 and the Jetpack 100. The jetpack flies over everything
  (buildings, trees, the sea, straight to Baha Mar); take it off and you land on the nearest open ground. Once you own a ride, the RIDE
  button (bottom right) picks what you ride, or walking.
- **Pets** follow you everywhere, even onto the sea plane, and say hello when tapped: Puppy 10,
  Kitten 10, Bunny 15, Penguin 20, and the Baby Dragon 75 (a big goal: it flies and puffs little flames).
- **Hats**: six for 1 star, Bunny Ears, Chef Hat and Flower Crown for 2, Wizard Hat, Top Hat and
  Hockey Helmet for 3, the Halo for 5 and the Golden Crown for 25.
- Things you're saving up for show a progress bar; big goals (50+) get a gold badge and confetti.

- The catalog (names, prices, ride speeds) is `RW.SHOP` in `js/core.js`; the art is `A.drawHat`,
  `A.drawRide` and `A.drawPet` in `js/art.js`; the pet that follows you is `buildPet()` in `js/world.js`.
- The number at the top of the screen is stars you can spend. House upgrades and Family Stats use
  the stars you've ever earned (`RW.save.earned`), so shopping never un-builds anything.

## Finding your way

- **Signposts** stand at the main crossroads, with at most three big arrow boards each. A board uses
  the game's own name (Frozenbergs, Checking In, Rosenberg Crossing…); tap it and you walk there
  (Baha Mar walks you to the sea plane). Tap the post itself to open the map.
- **Jet ski**: it waits at a little dock on the north end of the beach (the beach signpost points to
  it). Tap it to hop on; drag or tap the water to drive anywhere on the sea. Tap any land (Baha Mar,
  the beach, a game) to drive to the shore, hop off and walk on; the jet ski stays where you left it,
  and zips back to meet you if you take the sea plane. `buildJetski()` in `js/world.js`; the water
  rules (`E.isWater`, `E.mountJetski`) are in `js/engine.js`.
- **Pinch to zoom** out to see where you are: every place gets a name label and a YOU arrow marks
  you. The NORMAL button snaps back.
- **ALL GAMES** (bottom-left) opens the list of every game; its second tab is the MAP, with a pin for every game.
- **Area names** pop up at the bottom of the screen as you walk into a neighbourhood.
- The neighbourhoods, their colors and where their signs send you are `PLACES` in `js/world.js`;
  the posts are in `buildSignposts()`.

## Files

- `js/games.js`: **the game registry. The one file to edit when adding games.**
- `js/world.js`: destinations (every door and map pin), buildings, props, hidden stars and what
  everything does when tapped.
- `js/life.js`: the backyard dog, family cameos, Max, cars, birds, sky and mountains, title sequence.
- `js/engine.js`: camera, touch controls, walking and pathfinding, effects, render loop.
- `js/art.js`: characters, creatures and props, all drawn in code.
- `js/buildings.js`, `js/ground.js`: building art and the ground (paths, fields, water).
- `js/ui.js`: title, character select, HUD, map, Collection Book, game host.
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
Giant Slide 60, Sport Court 80. Only built upgrades and the next one to earn are shown in the yard.

Add `?dev` to the URL to get a "Test finish" button on placeholder game screens, which runs
the full star flow.
