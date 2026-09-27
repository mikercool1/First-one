# Rosenberg Crossing

Frogger in Rosenberg World. Pick Reuben, Jonah, Ellie or Max, hop across the street and the Baha Bay
lazy river, and land on a family member's spot to give them a hug. Hug all five to go up a level.

Open `index.html` in a browser. No install, no server.

- `game.js`: the game and the 2.5D camera (a tilted perspective view; cars and logs are side-view
  sprites extruded toward the camera, people are upright cut-outs).
- `rw-art.js`: a copy of Rosenberg World's `js/art.js` (the family, dog, trees, props) plus the
  Rosenberg House from `js/buildings.js`, so everyone looks the same as in the world.

## Adding it to Rosenberg World

It already speaks the bridge: `index.html` loads `../rw-bridge.js`, reports `{ score, stars }` at
game over (one star per gold Rosenberg Star picked up plus one per level cleared, up to 10), and has
the hidden `data-rw-back` / `data-rw-room` buttons. Copy this folder to
`rosenberg-world/games/frogger/` and register it in `js/games.js` with `entry: "games/frogger/index.html"`.
Opened on its own, the missing `../rw-bridge.js` is harmless.

Add `?dev` to the URL to get `window.__crossing` for testing.
