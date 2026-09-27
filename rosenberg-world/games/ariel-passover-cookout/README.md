# Ariel Passover Cookout

A tap game for the family, made for a phone held upright. Open `index.html`; there's no build step.

- Each person asks for **two dishes**. You see them for 3 seconds, then they hide behind "? ?".
- All five dishes are always on the buttons, so you have to remember. Tap both to serve them.
- A wrong tap costs patience. If someone's patience bar runs out they leave grumpy and you lose a heart.
- **Max is always running around.** He jumps in front of the order while you're memorizing it, and every few
  seconds he dashes and leaps at Ariel to steal. Tap him to knock him back. If he gets you, he takes back a
  dish you already picked (tap it again), or snatches a snack and costs patience.
- It speeds up as you go: shorter patience and a faster, pushier Max.
- Serve 10 to save Passover. Stars = hearts left. Lose all 3 hearts and you try again.

Eaters: Grandpa (Simon), Grandma (Cari), Nana, Michael, Ikey, Sarah, Molly, and Reuben, Jonah and Ellie.

- `art.js` draws Ariel, the grown-ups, Max and the food.
- `kids.js` is Reuben, Jonah and Ellie, copied from Backyard Baseball so they match exactly.
- `game.js` runs the game.
