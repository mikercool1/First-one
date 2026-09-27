# Witch Mountain

A spelling hike up a 2.5D mountain with the Rosenberg kids (Reuben, Jonah, Ellie or Max).

Open `index.html` in a browser. No install, no server. Works on iPad (landscape or portrait) and phones.

## How it plays

- Walk up the switchback trail. There is a witch on every landing, one every 100 ft, nine in all.
- Each witch shows a picture in her crystal ball. Spell the word with the on-screen keyboard (or a
  real keyboard) and press CHECK. The tiles show how many letters the word has, and "Hear it" says
  the word out loud.
- **Right:** she huffs and flies off on her broom, and you keep climbing.
- **Wrong:** the correct spelling flips up in the tiles, she cackles, zaps you, and you roll down to
  the landing below. The word you missed comes back two witches later.
- Reach the top (1,000 ft), plant your flag, and see your time, stars (5 minus roll-downs, at least 1)
  and the words to practice.

## Files

- `words.js`: the spelling words, each with its picture (an emoji) and a tier. Tier 1 words go to
  the low witches, tier 3 to the high ones. Add or remove words here.
- `mountain.js`: the mountain, trail, landings, witches, cauldrons, clouds, snow and effects.
- `game.js`: the climb, the spelling card, keyboard, sounds, camera and end screen.
- `chars.js`: the kids, copied from Rosenberg World so they look the same as in the other games.

## Adding it to Rosenberg World

Copy the folder to `rosenberg-world/games/witch-mountain/` and add
`<script src="../rw-bridge.js"></script>` to `index.html`. The game already reports its score and
stars to `RosenbergBridge` at the top, starts as whoever is playing, and has the hidden
"BACK TO ROSENBERG WORLD" button on the end screen.

When Jonah is playing, the witches use `WM.EASY_WORDS` in `words.js` instead: kindergarten and 1st-grade words
(three-letter words at the bottom, easy four-letter words in the middle, first-grade blends near the top).
