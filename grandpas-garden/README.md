# Grandpa's Garden

Grandpa Simon's tomatoes grow very fast. Pick the red ones, leave the green ones, and race
Reuben, Jonah, Ellie and Max to fill your basket before the minute runs out.

Open `index.html` in a browser. It needs no install and no server. It works on a landscape iPad
and on a phone held upright.

## How it plays

- Choose your kid and a level. Grandpa tells you how many tomatoes he needs for Grandma's salad.
- Each kid has a raised bed. Yours is at the front, and the other three kids pick their own
  beds behind you.
- A tomato starts as a yellow flower, then grows **green**, blushes orange and turns **red**.
- **Red:** tap it and it flies into your basket (+1). It glows so you can spot it.
- **Green:** leave it alone. If you pick it, it gets thrown away and you lose one tomato from
  your basket.
- A red tomato stays on the vine for 2 to 4 seconds, depending on the level. Just before it
  falls it shakes and darkens, then it drops and splats. A fallen tomato can't be picked.
- The round is **60 seconds**. Reach Grandpa's number to finish the salad and unlock "Next level".

## The levels, and the math behind them

Every tomato spot repeats one cycle: flower (regrow) → green (grow) → red (ripe) → picked or
fallen → flower again.

| Level  | Spots (plants × tomatoes) | Green for | Red for   | Flower for | Grandpa needs |
|--------|---------------------------|-----------|-----------|------------|---------------|
| Easy   | 8  (4 × 2)                | 4–5 s     | 3.5–4 s   | 3–5 s      | **20**        |
| Medium | 12 (4 × 3)                | 3–4 s     | 2.5–3.5 s | 2–4 s      | **35**        |
| Hard   | 15 (5 × 3)                | 2.5–3.5 s | 2–2.5 s   | 1.5–3 s    | **50**        |

A spot finishes its cycle about every 8–11 s on Easy, 6–8 s on Medium and 4.5–6 s on Hard. That
works out to roughly 40 red tomatoes in a minute on Easy, 75 on Medium and 120 on Hard. No
player can pick them all, so the real limit is how fast you can spot and tap them.

The targets come from simulating 400 one-minute rounds per level with four kinds of player.
Each player needs some reaction time before they notice a tomato has turned red, has a gap
between taps, and sometimes misses:

| Player | Time between taps | Reaction | Misses |
|--------|-------------------|----------|--------|
| Slow (little kid) | 2.0 s | 0.8 s | 15% |
| Average           | 1.3 s | 0.6 s | 10% |
| Fast              | 0.9 s | 0.45 s | 6% |
| Pro               | 0.6 s | 0.3 s | 3% |

Here is how many tomatoes each player picked on average, and how often they reached the target:

| Level (target) | Slow | Average | Fast | Pro |
|----------------|------|---------|------|-----|
| Easy (20)      | 23 · 91% | 36 · 100% | 45 · 100% | 48 · 100% |
| Medium (35)    | 24 · 0%  | 38 · 95%  | 58 · 100% | 86 · 100% |
| Hard (50)      | 24 · 0%  | 39 · 0%   | 59 · 100% | 91 · 100% |

So each level is a clear step up:

- **Easy:** a little kid tapping about once every 2 seconds almost always gets there. Red
  tomatoes stay for about 4 seconds.
- **Medium:** you need a steady tap about every 1.3 seconds, and red tomatoes only last about
  3 seconds.
- **Hard:** you need a quick tap about every second, and red tomatoes fall after about 2 seconds.

The three computer kids use the same model, with one a bit slower than the target pace, one
about at it and one a bit faster. Who gets which speed is shuffled every round, so there is
always a race. Picking a green tomato isn't in the simulation. It costs a tomato, so careless
tapping makes every level harder.

## Files

- `index.html`: page, HUD and menus
- `game.js`: the garden, tomatoes, levels, computer kids, sound and screens
- `chars.js`: the character rig from Rosenberg World (`rosenberg-world/js/art.js`), cut down to
  Reuben, Jonah, Ellie, Max and Grandpa Simon, so they look the same as in the other games

Best scores and your last kid and level are saved on the device.

## Adding it to Rosenberg World

The game already calls `RosenbergBridge.report({ score, stars })` when a round ends (stars = the
level number when you reach the target) and has the hidden `data-rw-back` button. Copy the
folder into `rosenberg-world/games/grandpas-garden/`, add
`<script src="../rw-bridge.js"></script>` before `chars.js`, and register it in `js/games.js`.
