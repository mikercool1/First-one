// Rosenberg Mini Golf: the three holes.
//
// Each hole is a small floating island drawn on a grid of 1×1 tiles.
//   ' ' sky (no island)      '.' grass            '~' pond (decoration)
//   'g' putting green        'T' tee (green)      'H' cup (green)
//   's' sand                 'w' water hazard     'b' wooden bridge over water
//   'M' under the windmill   't' tunnel through the windmill
//   '1'-'4' green with one corner cut on a diagonal (1 = bottom-right missing,
//           2 = bottom-left, 3 = top-left, 4 = top-right); the cut half is grass.
// Walls go up automatically wherever green meets anything that isn't green.
// hp(x, y) is the height of the playing surface, hd(x, y) of the grass around it.
(() => {
  const bump = (x, y, cx, cy, r, h) => h * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (r * r));
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const roll = (x, y, a) => a * (Math.sin(x * 1.3 + y * 0.4) * Math.cos(y * 0.9 - x * 0.2));

  // Hole 3's ramp climbs from the lower corridor (y = 12) up to the moon terrace (y = 7).
  const RAMP_TOP = 7, RAMP_BOT = 12, TERRACE = 1.2;
  const ramp = (y) => TERRACE * smooth((RAMP_BOT - y) / (RAMP_BOT - RAMP_TOP));

  window.HOLES = [
    {
      name: "Windmill Meadow",
      par: 2,
      blurb: "Straight through the windmill. Mind the sails.",
      map: [
        "  .......  ",
        " ..3ggg4.. ",
        " .3ggHgg4. ",
        " .ggggggg. ",
        " .ggggggg. ",
        " .ggggggg. ",
        " .ssMtMgg. ",
        " .ssMtMgg. ",
        " .ggggggg. ",
        " .2ggggg1. ",
        " ..ggggg.. ",
        " ~.ggggg.. ",
        " ~~ggggg.. ",
        " ~~ggggg.. ",
        " ..ggggg.. ",
        " ..2gTg1.. ",
        " ......... ",
        "  .......  ",
      ],
      hp: (x, y) => -bump(x, y, 5.5, 2.5, 1.35, 0.26) + bump(x, y, 3.35, 12.6, 0.75, 0.3) + bump(x, y, 7.65, 12.6, 0.75, 0.3),
      hd: (x, y) => roll(x, y, 0.07),
      windmill: { x0: 4, x1: 7, y0: 6, y1: 8, hub: 1.22, blade: 1.2, speed: 1.2 },
      objects: [
        { type: "tree", x: 1.4, y: 3.2, s: 1.0 },
        { type: "tree", x: 9.3, y: 4.3, s: 0.85 },
        { type: "pine", x: 9.4, y: 11.2, s: 1.0 },
        { type: "tree", x: 9.2, y: 13.8, s: 0.8 },
        { type: "pine", x: 2.7, y: 0.5, s: 0.7 },
        { type: "bush", x: 8.3, y: 0.7, s: 0.9 },
        { type: "bush", x: 1.3, y: 8.4, s: 0.8 },
        { type: "bush", x: 9.4, y: 8.6, s: 0.75 },
        { type: "rock", x: 2.6, y: 16.5, s: 0.7 },
        { type: "bush", x: 7.6, y: 16.4, s: 0.8 },
        { type: "reeds", x: 2.2, y: 11.4, s: 1 },
        { type: "reeds", x: 1.3, y: 14.3, s: 0.9 },
        { type: "fence", x0: 4.2, y0: 16.9, x1: 6.8, y1: 16.9 },
      ],
      critters: "butterflies",
      flowers: ["#FFFFFF", "#FFD84D", "#FF8FB1", "#B79CFF"],
      theme: {
        sky: ["#5FAEE6", "#A6D6F3", "#FBE6C9"], sun: { x: 0.82, y: 0.14, c: "#FFF6D0" }, cloud: "#FFFFFF",
        grass: "#8BCB6B", green: "#4CB462", sand: "#ECD59C", water: "#46A9DC", beach: "#ECD8A6",
        wallTop: "#EBC48E", wallSide: "#B7773F", lip: "#5E9E48",
        earth: ["#B07A52", "#80553A", "#4E3627"], light: [-0.5, -0.55, 0.9], mist: "#FDF1E0",
      },
    },
    {
      name: "Lagoon Crossing",
      par: 3,
      blurb: "Brave the bridge, or take the long way round.",
      map: [
        " ......... ",
        " .3ggggg4. ",
        " .gHggggg. ",
        " .ggggggg. ",
        "..ggggggg..",
        ".3ggggggg4.",
        ".g.wwbww.g.",
        ".g.wwbww.g.",
        ".s.wwbww.g.",
        ".s.wwbww.g.",
        ".g.wwbww.g.",
        ".2ggggggg1.",
        "..ggggggg~.",
        "..ggggggg~.",
        "..ggggggg~.",
        "..2ggTgg1~.",
        " ........~ ",
      ],
      hp: (x, y) => -bump(x, y, 3.5, 2.5, 1.3, 0.24),
      hd: (x, y) => roll(x, y, 0.06),
      objects: [
        { type: "palm", x: 1.2, y: 1.6, s: 1.05, lean: -0.35 },
        { type: "palm", x: 9.6, y: 3.6, s: 0.95, lean: 0.4 },
        { type: "palm", x: 2.5, y: 8.6, s: 0.85, lean: 0.2 },
        { type: "palm", x: 0.6, y: 12.9, s: 1.0, lean: -0.3 },
        { type: "bush", x: 8.5, y: 7.2, s: 0.7, c: "#3E9D4A" },
        { type: "rock", x: 9.5, y: 11.4, s: 0.8 },
        { type: "rock", x: 8.4, y: 16.3, s: 0.6 },
        { type: "torch", x: 2.4, y: 5.3 },
        { type: "torch", x: 8.6, y: 5.3 },
        { type: "torch", x: 2.4, y: 11.7 },
        { type: "torch", x: 8.6, y: 11.7 },
        { type: "bush", x: 2.3, y: 16.3, s: 0.8, c: "#3E9D4A" },
      ],
      lilies: [[3.5, 6.6], [6.7, 7.4], [3.8, 9.5], [7.3, 9.9], [4.3, 8.1]],
      critters: "fish",
      flowers: ["#FF5A6E", "#FFB23F", "#FFFFFF", "#FF7BD1"],
      theme: {
        sky: ["#1E9ED8", "#7ED3EC", "#FFDDA0"], sun: { x: 0.2, y: 0.2, c: "#FFF0B8" }, cloud: "#FFFDF6",
        grass: "#7FCB58", green: "#33B36A", sand: "#F4DDA2", water: "#1CB7C8", beach: "#F5E2B0",
        wallTop: "#F7F2E6", wallSide: "#D6C6A8", lip: "#5CA544",
        earth: ["#DDA36A", "#AE6F42", "#6B4228"], light: [0.45, -0.55, 0.9], mist: "#FFF1D6",
      },
    },
    {
      name: "Lantern Hill",
      par: 3,
      blurb: "Slip past the bamboo, climb the hill, find the moon.",
      map: [
        "...........",
        ".3gggggg4..",
        ".gggggggg..",
        ".ggggggHg..",
        ".gggggggg..",
        ".gggggggg..",
        ".ggggggg1..",
        ".gg........",
        ".gg........",
        ".gg..~~~...",
        ".gg..~~~~..",
        ".gg........",
        ".gggggggg4.",
        ".2gggggggg.",
        "..2gggggT1.",
        "...........",
        " ......... ",
      ],
      hp: (x, y) => {
        if (y > RAMP_BOT) return 0;
        if (y > RAMP_TOP) return ramp(y);
        // the moon crater: a ring-shaped rim around the cup
        const d = Math.hypot(x - 7.5, y - 3.5);
        return TERRACE + 0.24 * Math.exp(-((d - 1.05) ** 2) / 0.13) - 0.06 * Math.exp(-(d * d) / 0.3);
      },
      hd: (x, y) => {
        if (x < 1.01 || (x < 3.01 && y > RAMP_TOP && y < RAMP_BOT)) return ramp(Math.max(y, RAMP_TOP));
        return TERRACE * smooth((8.6 - y) / 2) + roll(x, y, 0.04);
      },
      chevrons: [[2, 10.2], [2, 8.4]],
      spinner: { x: 5.5, y: 13.5, r: 1.36, speed: 1.15 },
      bumpers: [{ x: 2.3, y: 2.5, r: 0.3 }, { x: 4.6, y: 1.9, r: 0.3 }, { x: 4.4, y: 5.1, r: 0.3 }],
      objects: [
        { type: "torii", x0: 0.72, x1: 3.28, y: 7.35 },
        { type: "lantern", x: 9.5, y: 1.5 },
        { type: "lantern", x: 9.5, y: 5.6 },
        { type: "lantern", x: 0.45, y: 9.2 },
        { type: "lantern", x: 3.6, y: 11.4 },
        { type: "lantern", x: 9.5, y: 11.5 },
        { type: "cherry", x: 5.2, y: 7.8, s: 0.95 },
        { type: "cherry", x: 9.6, y: 8.6, s: 0.8 },
        { type: "pine", x: 0.5, y: 0.5, s: 0.75, bonsai: true },
        { type: "rock", x: 4.1, y: 9.4, s: 0.7 },
        { type: "rock", x: 1.6, y: 15.4, s: 0.6 },
        { type: "bush", x: 7.4, y: 15.5, s: 0.7, c: "#2F6A4C" },
      ],
      critters: "fireflies",
      flowers: ["#FFB3D1", "#FFE08A", "#FFFFFF"],
      theme: {
        sky: ["#120E33", "#35205E", "#94416F", "#F28D63"], stars: true, moon: { x: 0.8, y: 0.13 }, cloud: "#C9A0C8",
        grass: "#3F7B5E", green: "#389C6E", sand: "#CDB88F", water: "#2D6690", beach: "#CDB88F",
        wallTop: "#D8573F", wallSide: "#8E2A26", lip: "#2F6048",
        earth: ["#5E4B72", "#3E3152", "#211A30"], light: [0.45, -0.6, 0.85], mist: "#F2B08C", night: true,
      },
    },
  ];
})();
