# Prompt: "Buckets" — Brunson vs. Wemby times tables

Build a one-screen browser game that helps Reuben memorize the 8 and 9 times tables
(8×1 through 8×9 and 9×1 through 9×9: 18 facts). It should feel like a sports video
game, but be dead simple to play.

## The game
- A one-on-one basketball matchup: Jalen Brunson (the player) vs. Victor Wembanyama.
- A multiplication question appears in huge type, e.g. **8 × 7**.
- Reuben types the answer on a big on-screen number pad (or keyboard).
- **5-second shot clock.** It counts down in red LED digits.
- **Right answer:** Brunson shoots over Wemby, swish, Brunson +1.
- **Wrong answer or time runs out:** Wemby swats the shot ("REJECTED!"), Wemby +1,
  and the correct fact is shown big for a moment (8 × 7 = 56) so it sinks in.
- **First to 11 wins.** Then "Run it back."

## Learning rules
- Questions come from a shuffled deck of the 18 facts.
- A missed fact comes back again a few questions later.
- The answer submits automatically once enough digits are typed; Enter/Shoot also works.
- The end screen shows all 18 facts as a grid: green = got it, red = missed, so it's
  obvious what to practice.
- Remember wins/losses and each fact's record on the device (localStorage).

## Look and feel
- Night-game arena: dark stands with crowd lights, spotlights, glossy hardwood,
  glass backboard, jumbotron-style scoreboard with glowing digits.
- Cartoon players in the same style: Brunson in blue with orange trim (#11),
  Wemby comically tall in black and silver (#1). No team logos.
- Short, punchy animations: jump shot, ball arc, net swish, giant arm block,
  "+1" pops, screen shake on a block, confetti when Brunson wins.
- Crowd/swish/buzzer sounds (synthesized, mute button).
- Works great on a phone in portrait: scoreboard, court, question, keypad.

## Keep it simple
One file. No accounts, no menus beyond Start and Run It Back.
