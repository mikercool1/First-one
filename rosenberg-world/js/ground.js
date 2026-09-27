// Rosenberg World: the ground. Grass, paths, fields, sand and water.
// The ground is painted into cached chunks (it never changes); water sparkle is drawn live on top.

(() => {
  const RW = window.RW, A = RW.art, U = RW.util;
  const TAU = Math.PI * 2;

  // ---------- layout of flat things ----------
  const shoreX = (y) => 4265 + Math.sin(y / 180) * 26 + Math.sin(y / 67 + 1) * 12;
  const STREAM = [[520, 1080], [500, 1250], [430, 1420], [470, 1600], [440, 1760], [455, 1905], [420, 2060], [470, 2250], [430, 2450], [455, 2700], [420, 3000], [440, 3400]];
  const L = RW.layout = {
    shoreX,
    stream: STREAM,
    bridgeY: 1905,
    home: { x: 2450, y: 1080 },          // home plate
    fenceR: 430,                          // outfield fence radius from home plate
    hill: { x: 3700, y: 790, rx: 440, ry: 250 },
    track: { x: 640, y: 760, rx: 320, ry: 175 },
    plaza: { x: 3500, y: 1760, r: 250 },
    waterFenceY: 2760,
    paths: [
      // main boulevard, west trail out of the woods to the beach
      { w: 100, pts: [[-120, 1880], [110, 1895], [300, 1905], [620, 1900], [1000, 1900], [1420, 1900], [2450, 1900], [3200, 1900], [3900, 1880], [4080, 1860]], kind: "stone" },
      // Rosenberg House front walk and driveway
      { w: 58, pts: [[2450, 1712], [2450, 1900]], kind: "stone" },
      // kitchen front walk
      { w: 58, pts: [[1420, 1732], [1420, 1900]], kind: "stone" },
      // around the house to the backyard and baseball
      { w: 70, pts: [[2080, 1900], [2060, 1700], [2090, 1450], [2200, 1230], [2450, 1170]], kind: "stone" },
      { w: 70, pts: [[2960, 1900], [2980, 1640], [2930, 1330], [2700, 1190], [2450, 1170]], kind: "stone" },
      // north lane: math blaster → baseball → fart man
      { w: 76, pts: [[640, 1030], [1000, 1010], [1450, 960], [1800, 1010], [2090, 1100], [2200, 1230]], kind: "stone" },
      { w: 76, pts: [[2930, 1330], [3000, 1100], [3300, 1000], [3720, 950], [4050, 1000]], kind: "stone" },
      // up to the gondola
      { w: 64, pts: [[3300, 1000], [3230, 800], [3160, 620], [3160, 500]], kind: "stone" },
      // kitchen to math blaster
      { w: 64, pts: [[1420, 1900], [1250, 1600], [1300, 1250], [1450, 960]], kind: "stone" },
      // plaza links
      { w: 76, pts: [[3500, 1520], [3500, 1900]], kind: "stone" },
      { w: 70, pts: [[3740, 1760], [3960, 1640], [4100, 1560]], kind: "stone" },
      // south: sports avenue, arcade avenue, lower street
      { w: 86, pts: [[1500, 1900], [1500, 2350], [1480, 2700], [1500, 3040]], kind: "stone" },
      { w: 80, pts: [[2450, 1900], [2300, 2020], [2270, 2350], [2300, 2640]], kind: "stone" },
      { w: 86, pts: [[1500, 2680], [2000, 2650], [2450, 2640], [3000, 2660], [3550, 2690], [3900, 2640], [4080, 2560]], kind: "stone" },
      { w: 70, pts: [[3900, 1880], [3860, 2250], [3880, 2640]], kind: "stone" },
      // woods trails: to the cave, south-west out of the map, to the treehouse
      { w: 56, pts: [[600, 1900], [640, 1700], [560, 1560], [330, 1540]], kind: "dirt" },
      { w: 52, pts: [[300, 1905], [240, 2080], [110, 2240], [-120, 2300]], kind: "dirt" },
      { w: 52, pts: [[620, 1900], [680, 2060], [700, 2200]], kind: "dirt" },
      { w: 50, pts: [[330, 1540], [200, 1400], [110, 1330], [-120, 1300]], kind: "dirt" },
      // raceway gate
      { w: 70, pts: [[640, 1030], [640, 960]], kind: "stone" },
      // beach boardwalk to the dock
      { w: 70, pts: [[3900, 2250], [4100, 2340], [4270, 2352]], kind: "board" },
    ],
  };

  // ---------- grass tile ----------
  let grassPattern = null;
  function makeGrass(c) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const g = cv.getContext("2d");
    g.fillStyle = "#8CD06A"; g.fillRect(0, 0, 256, 256);
    const rnd = U.seeded(42);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * 256, y = rnd() * 256, r = 20 + rnd() * 40;
      g.fillStyle = rnd() < 0.5 ? "rgba(255,255,200,.06)" : "rgba(40,110,40,.05)";
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 260; i++) {
      const x = rnd() * 256, y = rnd() * 256;
      g.strokeStyle = rnd() < 0.5 ? "rgba(60,140,60,.35)" : "rgba(190,240,150,.4)";
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 3); g.stroke();
    }
    grassPattern = c.createPattern(cv, "repeat");
  }

  function smoothPath(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last[0], last[1]);
  }
  L.smoothPath = smoothPath;

  const PATH_COLORS = {
    stone: ["#CDB690", "#F1E4C8", "#E6D5B2"],
    dirt: ["#A98452", "#D2AE78", "#C49D66"],
    board: ["#8E6440", "#D8A870", "#C48F58"],
  };

  // ---------- painters, in order ----------
  function paintBase(c, x0, y0, x1, y1) {
    c.fillStyle = grassPattern;
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
    // big soft light and shade blotches so the grass never looks tiled
    const rnd = U.seeded(Math.floor(x0 / 97) * 7919 + Math.floor(y0 / 89) * 104729 + 3);
    for (let i = 0; i < 5; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), r = 140 + rnd() * 200;
      c.fillStyle = A.rad(c, x, y, 0, x, y, r, [rnd() < 0.55 ? "rgba(255,255,190,.10)" : "rgba(30,100,50,.08)", "rgba(0,0,0,0)"]);
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function paintAreas(c) {
    // north meadow (lighter, flowery) and the woods floor (deeper green)
    c.fillStyle = A.rad(c, 700, 1800, 100, 500, 1800, 900, ["rgba(40,110,60,.45)", "rgba(40,110,60,.25)", "rgba(40,110,60,0)"]);
    c.fillRect(-400, 900, 1700, 1900);
    c.fillStyle = A.rad(c, 2450, 450, 50, 2450, 450, 900, ["rgba(210,255,170,.25)", "rgba(210,255,170,0)"]);
    c.fillRect(1400, -200, 2200, 1300);

    // Fart Man hill: a raised mound with a lit top
    const H = L.hill;
    c.save();
    c.fillStyle = "rgba(40,90,50,.25)";
    A.ell(c, H.x, H.y + 26, H.rx + 10, H.ry + 6); c.fill();
    c.fillStyle = A.lin(c, 0, H.y - H.ry, 0, H.y + H.ry, ["#B7E88A", "#94D26E", "#74B658"]);
    A.ell(c, H.x, H.y, H.rx, H.ry); c.fill();
    c.fillStyle = "rgba(255,255,255,.18)";
    A.ell(c, H.x - 60, H.y - 70, H.rx * 0.6, H.ry * 0.4); c.fill();
    c.restore();

    // raceway infield + track
    const T = L.track;
    c.fillStyle = "#5E6272"; A.ell(c, T.x, T.y, T.rx + 46, T.ry + 42); c.fill();
    // curbs
    c.save();
    c.lineWidth = 10; c.setLineDash([22, 22]);
    c.strokeStyle = "#E8453C"; A.ell(c, T.x, T.y, T.rx + 44, T.ry + 40); c.stroke();
    c.strokeStyle = "#FFFFFF"; c.lineDashOffset = 22; A.ell(c, T.x, T.y, T.rx + 44, T.ry + 40); c.stroke();
    c.setLineDash([]);
    c.restore();
    c.fillStyle = A.lin(c, 0, T.y - T.ry, 0, T.y + T.ry, ["#8FD36C", "#76BF5A"]);
    A.ell(c, T.x, T.y, T.rx - 44, T.ry - 44); c.fill();
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 3; c.setLineDash([26, 20]);
    A.ell(c, T.x, T.y, T.rx, T.ry); c.stroke(); c.setLineDash([]);
    // checkered start line
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
      c.fillStyle = (i + j) % 2 ? "#222" : "#FFF";
      c.fillRect(T.x - 6 + j * 8, T.y + T.ry - 44 + i * 11, 8, 11);
    }
    text(c, "ROSENBERG RACEWAY", T.x, T.y, 26, "rgba(255,255,255,.55)");

    // baseball: mown outfield wedge, dirt infield, bases
    const Hm = L.home, R = L.fenceR;
    c.save();
    c.beginPath(); c.moveTo(Hm.x, Hm.y); c.arc(Hm.x, Hm.y, R, -Math.PI * 0.75, -Math.PI * 0.25); c.closePath();
    c.fillStyle = "#79C95C"; c.fill();
    c.clip();
    for (let i = -8; i < 8; i++) {
      c.fillStyle = i % 2 ? "rgba(255,255,255,.07)" : "rgba(0,60,0,.05)";
      c.beginPath(); c.moveTo(Hm.x, Hm.y); c.arc(Hm.x, Hm.y, R + 20, -Math.PI / 2 + i * 0.1, -Math.PI / 2 + (i + 1) * 0.1); c.closePath(); c.fill();
    }
    c.restore();
    // warning track
    c.strokeStyle = "#C99A62"; c.lineWidth = 26;
    c.beginPath(); c.arc(Hm.x, Hm.y, R - 14, -Math.PI * 0.75, -Math.PI * 0.25); c.stroke();
    // infield dirt
    const d = 132;
    c.fillStyle = "#D5A56C";
    c.beginPath(); c.moveTo(Hm.x, Hm.y + 22); c.arc(Hm.x, Hm.y, 205, -Math.PI * 0.75, -Math.PI * 0.25); c.closePath(); c.fill();
    c.fillStyle = "#7DCB5E";
    c.beginPath(); c.moveTo(Hm.x, Hm.y - 26); c.lineTo(Hm.x + d * 0.62, Hm.y - d * 0.72); c.lineTo(Hm.x, Hm.y - d * 1.36); c.lineTo(Hm.x - d * 0.62, Hm.y - d * 0.72); c.closePath(); c.fill();
    // foul lines
    c.strokeStyle = "#FFFFFF"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(Hm.x, Hm.y); c.lineTo(Hm.x + Math.cos(-Math.PI / 4) * R, Hm.y + Math.sin(-Math.PI / 4) * R); c.stroke();
    c.beginPath(); c.moveTo(Hm.x, Hm.y); c.lineTo(Hm.x + Math.cos(-Math.PI * 0.75) * R, Hm.y + Math.sin(-Math.PI * 0.75) * R); c.stroke();
    // mound, bases
    c.fillStyle = "#C9955C"; A.ell(c, Hm.x, Hm.y - d * 0.7, 22, 13); c.fill();
    c.fillStyle = "#FFFFFF"; c.fillRect(Hm.x - 7, Hm.y - d * 0.7 - 2, 14, 4);
    [[d * 0.66, -d * 0.7], [0, -d * 1.4], [-d * 0.66, -d * 0.7]].forEach(([bx, by]) => {
      c.save(); c.translate(Hm.x + bx, Hm.y + by); c.scale(1, 0.62); c.rotate(Math.PI / 4);
      c.fillStyle = "#FFFFFF"; c.fillRect(-9, -9, 18, 18); c.restore();
    });
    // batter's boxes
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 2;
    c.strokeRect(Hm.x - 44, Hm.y - 16, 26, 34); c.strokeRect(Hm.x + 18, Hm.y - 16, 26, 34);

    // backyard patio & driveway
    c.fillStyle = "#D9C7A7"; A.rr(c, 2320, 1262, 150, 56, 12); c.fill();
    c.strokeStyle = "rgba(120,90,60,.15)"; c.lineWidth = 1.5;
    for (let x = 2345; x < 2470; x += 25) { c.beginPath(); c.moveTo(x, 1265); c.lineTo(x, 1315); c.stroke(); }
    c.fillStyle = A.lin(c, 2740, 0, 2890, 0, ["#8A90A0", "#A3A9B8", "#8A90A0"]);
    A.rr(c, 2740, 1690, 150, 230, 10); c.fill();
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2; c.setLineDash([12, 10]);
    c.beginPath(); c.moveTo(2815, 1700); c.lineTo(2815, 1905); c.stroke(); c.setLineDash([]);
    // three-point arc painted on the driveway
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 3;
    c.beginPath(); c.arc(2885, 1735, 100, Math.PI * 0.55, Math.PI * 1.02); c.stroke();

    // mystery plaza
    const Pz = L.plaza;
    c.fillStyle = "#CDB690"; c.beginPath(); c.arc(Pz.x, Pz.y, Pz.r + 8, 0, TAU); c.fill();
    c.fillStyle = A.rad(c, Pz.x, Pz.y, 20, Pz.x, Pz.y, Pz.r, ["#F7EBD2", "#E9D8B6"]);
    c.beginPath(); c.arc(Pz.x, Pz.y, Pz.r, 0, TAU); c.fill();
    c.strokeStyle = "rgba(160,130,90,.25)"; c.lineWidth = 2;
    for (let r = 60; r < Pz.r; r += 45) { c.beginPath(); c.arc(Pz.x, Pz.y, r, 0, TAU); c.stroke(); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; c.beginPath(); c.moveTo(Pz.x + Math.cos(a) * 60, Pz.y + Math.sin(a) * 60); c.lineTo(Pz.x + Math.cos(a) * Pz.r, Pz.y + Math.sin(a) * Pz.r); c.stroke(); }
    // construction lot dirt
    c.fillStyle = "#C79C69"; A.rr(c, 3690, 1985, 320, 200, 16); c.fill();
    c.fillStyle = "rgba(90,60,30,.18)";
    [[3760, 2050, 30], [3900, 2120, 22], [3950, 2030, 16]].forEach(([x, y, r]) => { A.ell(c, x, y, r, r * 0.5); c.fill(); });

    // playground mulch
    c.fillStyle = "#E3B37A"; A.rr(c, 1930, 2040, 300, 250, 30); c.fill();
    c.fillStyle = "rgba(255,255,255,.12)"; A.rr(c, 1940, 2050, 280, 60, 24); c.fill();

    // sports complex fields
    field(c, 920, 2080, 460, 260, "soccer");
    field(c, 900, 2670, 500, 290, "football");
    court(c, 1560, 2080, 300, 190, "#E3894A", "#3A7BD5");
    court(c, 1560, 2600, 300, 200, "#5AAE6B", "#3F86C9", true);

    // fart man launch pad
    const px = 3720, py = 830;
    c.fillStyle = "#6D7385"; A.ell(c, px, py, 104, 58); c.fill();
    c.fillStyle = "#8C93A6"; A.ell(c, px, py - 4, 96, 52); c.fill();
    c.save(); A.ell(c, px, py - 4, 96, 52); c.clip();
    for (let i = -10; i < 10; i++) { c.fillStyle = i % 2 ? "#F2C230" : "#2B2F3A"; c.beginPath(); c.moveTo(px + i * 24, py - 60); c.lineTo(px + i * 24 + 24, py - 60); c.lineTo(px + i * 24 - 16, py + 60); c.lineTo(px + i * 24 - 40, py + 60); c.closePath(); c.fill(); }
    c.fillStyle = "#9AA1B4"; A.ell(c, px, py - 4, 76, 40); c.fill();
    c.restore();
    text(c, "F", px, py - 4, 44, "rgba(255,255,255,.8)");
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 4; A.ell(c, px, py - 4, 60, 32); c.stroke();
  }

  function field(c, x, y, w, h, kind) {
    c.fillStyle = "#6FC257"; A.rr(c, x - 12, y - 12, w + 24, h + 24, 14); c.fill();
    c.save(); A.rr(c, x, y, w, h, 6); c.clip();
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "#6DBF55" : "#7CCB62"; c.fillRect(x + (i * w) / 10, y, w / 10 + 1, h); }
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 3;
    c.strokeRect(x, y, w, h);
    if (kind === "soccer") {
      c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.stroke();
      c.beginPath(); A.ell(c, x + w / 2, y + h / 2, 44, 30); c.stroke();
      c.strokeRect(x, y + h / 2 - 60, 60, 120); c.strokeRect(x + w - 60, y + h / 2 - 60, 60, 120);
    } else {
      for (let i = 1; i < 10; i++) { c.globalAlpha = i === 5 ? 1 : 0.6; c.beginPath(); c.moveTo(x + (i * w) / 10, y); c.lineTo(x + (i * w) / 10, y + h); c.stroke(); }
      c.globalAlpha = 1;
      c.fillStyle = "rgba(200,50,50,.6)"; c.fillRect(x, y, 40, h); c.fillRect(x + w - 40, y, 40, h);
      text(c, "R", x + 20, y + h / 2, 28, "#FFFFFF"); text(c, "W", x + w - 20, y + h / 2, 28, "#FFFFFF");
    }
  }
  function court(c, x, y, w, h, col, inner, tennis) {
    c.fillStyle = A.shade(col, -0.15); A.rr(c, x - 14, y - 14, w + 28, h + 28, 12); c.fill();
    c.fillStyle = col; A.rr(c, x, y, w, h, 4); c.fill();
    c.fillStyle = inner; c.fillRect(x + 20, y + 16, w - 40, h - 32);
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 3;
    c.strokeRect(x + 20, y + 16, w - 40, h - 32);
    if (tennis) {
      c.beginPath(); c.moveTo(x + 20, y + h / 2); c.lineTo(x + w - 20, y + h / 2); c.stroke();
      c.beginPath(); c.moveTo(x + w / 2, y + 40); c.lineTo(x + w / 2, y + h - 40); c.stroke();
      c.strokeRect(x + 50, y + 40, w - 100, h - 80);
    } else {
      c.beginPath(); c.moveTo(x + 20, y + h / 2); c.lineTo(x + w - 20, y + h / 2); c.stroke();
      c.beginPath(); c.arc(x + w / 2, y + h / 2, 26, 0, TAU); c.stroke();
      c.strokeRect(x + w / 2 - 34, y + 16, 68, 50); c.strokeRect(x + w / 2 - 34, y + h - 66, 68, 50);
    }
  }

  function paintWater(c) {
    // stream with soft banks
    c.lineCap = "round"; c.lineJoin = "round";
    smoothPath(c, STREAM); c.strokeStyle = "#6E9A5A"; c.lineWidth = 78; c.stroke();
    smoothPath(c, STREAM); c.strokeStyle = "#B99A6C"; c.lineWidth = 66; c.stroke();
    smoothPath(c, STREAM); c.strokeStyle = "#4FB3E8"; c.lineWidth = 50; c.stroke();
    smoothPath(c, STREAM); c.strokeStyle = "#7DD0F5"; c.lineWidth = 26; c.stroke();

    // beach sand
    c.beginPath();
    c.moveTo(shoreX(-400) - 330, -400);
    for (let y = -400; y <= 3600; y += 40) c.lineTo(shoreX(y) - 300 + Math.sin(y / 130) * 30, y);
    c.lineTo(6000, 3600); c.lineTo(6000, -400); c.closePath();
    c.fillStyle = A.lin(c, 3950, 0, 4280, 0, ["#F2DDA8", "#F8E8BE", "#F0D9A0"]);
    c.fill();
    // wet sand + ocean
    c.beginPath();
    c.moveTo(shoreX(-400), -400);
    for (let y = -400; y <= 3600; y += 30) c.lineTo(shoreX(y) - 18, y);
    c.lineTo(6000, 3600); c.lineTo(6000, -400); c.closePath();
    c.fillStyle = "#DCC38C"; c.fill();
    c.beginPath();
    c.moveTo(shoreX(-400), -400);
    for (let y = -400; y <= 3600; y += 30) c.lineTo(shoreX(y), y);
    c.lineTo(6000, 3600); c.lineTo(6000, -400); c.closePath();
    c.fillStyle = A.lin(c, 4260, 0, 5000, 0, [[0, "#7FDDE6"], [0.08, "#4EC3DD"], [0.35, "#2A9BD0"], [1, "#1B6FB4"]]);
    c.fill();
    // mystery island shallows
    c.fillStyle = "rgba(140,230,240,.6)"; A.ell(c, 4780, 1180, 190, 105); c.fill();
    c.fillStyle = "#F4DEA6"; A.ell(c, 4780, 1170, 140, 72); c.fill();
    c.fillStyle = "#7CC766"; A.ell(c, 4785, 1160, 105, 52); c.fill();

    // water world pool and lazy river, behind its fence
    c.fillStyle = "#E4D8C2"; A.rr(c, 3140, 2780, 820, 420, 30); c.fill();
    c.fillStyle = "#3CC3E8"; A.rr(c, 3420, 2860, 260, 130, 40); c.fill();
    c.fillStyle = "#7FDDF5"; A.rr(c, 3432, 2870, 236, 40, 20); c.fill();
    c.strokeStyle = "#3CC3E8"; c.lineWidth = 46;
    A.ell(c, 3550, 3050, 360, 90); c.stroke();
    c.strokeStyle = "#8BE3F7"; c.lineWidth = 12; c.setLineDash([30, 30]);
    A.ell(c, 3550, 3050, 360, 90); c.stroke(); c.setLineDash([]);
  }

  function paintPaths(c) {
    c.lineCap = "round"; c.lineJoin = "round";
    L.paths.forEach((p) => { smoothPath(c, p.pts); c.strokeStyle = PATH_COLORS[p.kind][0]; c.lineWidth = p.w + 12; c.stroke(); });
    L.paths.forEach((p) => { smoothPath(c, p.pts); c.strokeStyle = PATH_COLORS[p.kind][1]; c.lineWidth = p.w; c.stroke(); });
    L.paths.forEach((p) => {
      smoothPath(c, p.pts); c.strokeStyle = PATH_COLORS[p.kind][2]; c.lineWidth = p.w * 0.5;
      c.setLineDash(p.kind === "board" ? [4, 14] : [2, 26]); c.stroke(); c.setLineDash([]);
    });
    // road beyond the southern hedge
    c.fillStyle = "#6B7080"; c.fillRect(-500, 3130, 6000, 110);
    c.fillStyle = "#8A8F9E"; c.fillRect(-500, 3122, 6000, 10); c.fillRect(-500, 3240, 6000, 10);
    c.strokeStyle = "#F2D14B"; c.lineWidth = 4; c.setLineDash([40, 30]);
    c.beginPath(); c.moveTo(-500, 3185); c.lineTo(5500, 3185); c.stroke(); c.setLineDash([]);
    // sidewalk and far lawns
    c.fillStyle = "#E3DCCB"; c.fillRect(-500, 3250, 6000, 30);
  }

  function paintDetails(c, x0, y0, x1, y1) {
    // tiny flower dots and clover in the grass, seeded per chunk
    const rnd = U.seeded(Math.floor(x0) * 31 + Math.floor(y0) * 17 + 11);
    const cols = ["#FFFFFF", "#FFE066", "#FF8FB1", "#C3A6FF"];
    for (let i = 0; i < 26; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
      if (!isGrass(x, y)) continue;
      c.fillStyle = cols[Math.floor(rnd() * cols.length)];
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 10, 2.2, 0, TAU); c.fill(); }
    }
  }
  // rough test used only for decoration
  function isGrass(x, y) {
    if (x > shoreX(y) - 330) return false;
    if (Math.abs(y - 1900) < 60) return false;
    return true;
  }

  function text(c, s, x, y, size, col) { A.text(c, s, x, y, size, col, { weight: 700 }); }

  // Paint everything flat into a context already translated to world coordinates.
  L.paintGround = (c, x0, y0, x1, y1, details = true) => {
    if (!grassPattern) makeGrass(c);
    c.save();
    c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    paintBase(c, x0, y0, x1, y1);
    paintAreas(c);
    paintWater(c);
    paintPaths(c);
    if (details) paintDetails(c, x0, y0, x1, y1);
    c.restore();
  };

  // ---------- chunk cache ----------
  const CH = 512;
  const chunks = new Map();
  let chunkScale = 0;
  L.drawGround = (c, vx0, vy0, vx1, vy1, scale, budget = 3) => {
    if (scale !== chunkScale) { chunks.clear(); chunkScale = scale; }
    const cx0 = Math.floor(vx0 / CH), cy0 = Math.floor(vy0 / CH), cx1 = Math.floor(vx1 / CH), cy1 = Math.floor(vy1 / CH);
    const now = performance.now();
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const key = cx + "," + cy;
      let ch = chunks.get(key);
      if (!ch && budget > 0) {
        budget--;
        const cv = document.createElement("canvas");
        const px = Math.ceil(CH * scale);
        cv.width = cv.height = px;
        const g = cv.getContext("2d");
        g.scale(scale, scale);
        g.translate(-cx * CH, -cy * CH);
        L.paintGround(g, cx * CH, cy * CH, (cx + 1) * CH, (cy + 1) * CH);
        ch = { cv, used: now };
        chunks.set(key, ch);
      }
      if (ch) { ch.used = now; c.drawImage(ch.cv, cx * CH, cy * CH, CH + 0.6, CH + 0.6); }
      else { c.fillStyle = "#8CD06A"; c.fillRect(cx * CH, cy * CH, CH + 1, CH + 1); }
    }
    if (chunks.size > 40) for (const [k, ch] of chunks) if (now - ch.used > 8000) chunks.delete(k);
  };
  L.warmGround = (x0, y0, x1, y1, scale) => {
    // pre-build chunks (used during the title screen)
    const tmp = document.createElement("canvas").getContext("2d");
    L.drawGround(tmp, x0, y0, x1, y1, scale, 99);
  };

  // ---------- live water shimmer ----------
  L.drawWaterLive = (c, t, vx0, vy0, vx1, vy1) => {
    // shoreline foam
    if (vx1 > 3900) {
      c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 5; c.lineCap = "round";
      const off = Math.sin(t * 1.3) * 10;
      c.beginPath();
      for (let y = Math.max(-400, vy0 - 40); y <= vy1 + 40; y += 24) {
        const x = shoreX(y) + 4 + off + Math.sin(y / 40 + t * 2) * 3;
        y === Math.max(-400, vy0 - 40) ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
      // swells
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 3;
      for (let i = 0; i < 26; i++) {
        const y = vy0 + ((i * 137 + t * 12) % (vy1 - vy0 + 200)) - 100;
        const x = shoreX(y) + 60 + ((i * 263) % 600);
        const w = 20 + (i % 3) * 10, ph = Math.sin(t * 2 + i);
        c.globalAlpha = 0.4 + ph * 0.3;
        c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - 6, x + w, y); c.stroke();
      }
      c.globalAlpha = 1;
    }
    // stream sparkle
    if (vx0 < 700) {
      c.fillStyle = "rgba(255,255,255,.7)";
      for (let i = 0; i < STREAM.length - 1; i++) {
        const [ax, ay] = STREAM[i], [bx, by] = STREAM[i + 1];
        if (Math.max(ay, by) < vy0 - 50 || Math.min(ay, by) > vy1 + 50) continue;
        for (let k = 0; k < 3; k++) {
          const u = ((t * 0.35 + k / 3 + i * 0.17) % 1);
          const x = ax + (bx - ax) * u + Math.sin(t * 3 + k) * 8, y = ay + (by - ay) * u;
          A.ell(c, x, y, 7, 2); c.fill();
        }
      }
    }
  };
})();
