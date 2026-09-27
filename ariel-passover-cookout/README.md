# Ariel Passover Cookout

A touch-first cooking and time-management game in the Rosenberg World style. Ariel cooks Passover dishes in a big upscale kitchen while the family waits around the house getting hungrier. Every now and then Max gets loose.

Open `index.html` in a browser. No build step. It plays best in landscape (iPad or desktop) and works with touch or a mouse.

## How it plays
- Tap the Fridge or Pantry and pick an ingredient. Ariel walks there on her own. Glowing stations show the next step.
- Take each dish through its recipe (mix, prep, stove or oven), plate it at the island, then tap whoever ordered it.
- Ariel carries one thing at a time. The Serving Pass holds up to three finished plates. A pot of soup ladles two bowls.
- Patience bars go green, yellow, orange, red. An empty bar is a meltdown. Three meltdowns end the round.
- From round 3, **MAX IS LOOSE!** Tap him to play Feed Max: pick the snack he wants, then catch him. If you ignore him, he makes a mess (tap it to clean), steals something, or slows the kitchen.

## Rounds
1. Soup and Frittata for Ikey, Simon and Michael.
2. Cari and Nana arrive. Adds Mushroom Kugel and Cari's Chicken Cutlets.
3. Everyone, all five dishes including Arlene's Apple Cake, and Max wakes up.
4. and up: more orders at once, faster requests, less patience, more Max.

Each round you win earns 1 to 3 Rosenberg Stars and awards (Fastest Cook, Best Host, Max Tamer, Soup Saver, Cutlet Champion, Apple Cake Hero). Progress is saved in `localStorage` (`arielCookout.v1`). Stars are also added to a shared `rosenbergWorld.stars` counter.

## Files
- `art.js`: every drawing (house, stations, characters, food), on canvas.
- `game.js`: game state, cooking, family, Max, Feed Max, input, synthesized sound, screens.
- `index.html`, `styles.css`: HUD, menus and cards.
