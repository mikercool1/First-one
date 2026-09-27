# Perfect Sunday

Four friends. Four neighborhoods. Ten Happiness Points.

Open `index.html` in a browser to play. No install, no server.

## Files

- `characters.js` — Adam, Marshall, Billy and Mike: descriptions, abilities, lines, victory text and avatars. `DAY` at the top sets the day name ("Sunday").
- `worlds.js` — the four worlds, board layout (`BOARD_PATTERN`) and space names.
- `events.js` — every card. Each card is one object; the comment at the top explains the fields. Add or edit cards there.
- `script.js` — the game engine (turns, dice, cards, abilities, CPU choices, victory screen).
- `styles.css` — the look.

## Tuning

- Win target: `WIN_AT` near the top of `script.js`.
- Game length: more `"a"` (Annoyance) spaces in `BOARD_PATTERN` make games longer; more `"h"` make them shorter.
