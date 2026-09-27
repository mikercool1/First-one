// Racecar Rally: roadside things, painted once into little canvases and
// reused every frame, plus the sky for each of the three worlds.
(() => {
  const { rr, star, dot, heart } = RC.art;
  const TAU = Math.PI * 2;

  function mk(w, h, paint) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");
    paint(c, w, h);
    return cv;
  }
  const S = {}; // name -> { img, w (world width) }
  const add = (name, worldW, w, h, paint) => { S[name] = { img: mk(w, h, paint), w: worldW }; };

  // ---------- Sunny Meadow ----------
  add("tree", 1700, 220, 260, (c) => {
    c.fillStyle = "#7A4B2A"; rr(c, 96, 150, 28, 110, 8); c.fill();
    for (const [x, y, r, col] of [[110, 110, 80, "#2E9A45"], [70, 130, 55, "#3AAE50"], [150, 128, 58, "#34A34A"], [110, 70, 60, "#46BE5A"]]) dot(c, x, y, r, col);
    dot(c, 88, 64, 22, "rgba(255,255,255,.18)");
    for (const [x, y] of [[80, 120], [140, 100], [115, 150], [60, 150], [160, 150]]) dot(c, x, y, 7, "#FF4D4D");
  });
  add("pine", 1300, 160, 280, (c) => {
    c.fillStyle = "#6B3F22"; c.fillRect(70, 230, 20, 50);
    for (let k = 0; k < 4; k++) {
      const y = 30 + k * 55, w = 40 + k * 22;
      c.beginPath(); c.moveTo(80, y - 20); c.lineTo(80 + w, y + 60); c.lineTo(80 - w, y + 60); c.closePath();
      c.fillStyle = k % 2 ? "#23874A" : "#2A9A55"; c.fill();
    }
  });
  add("bush", 900, 200, 110, (c) => {
    for (const [x, y, r, col] of [[60, 70, 45, "#3AAE50"], [140, 70, 45, "#34A34A"], [100, 52, 50, "#46BE5A"]]) dot(c, x, y, r, col);
    for (const [x, y, col] of [[70, 45, "#FF7AB6"], [130, 40, "#FFD23F"], [100, 80, "#FFFFFF"], [150, 75, "#B69BFF"]]) dot(c, x, y, 7, col);
  });
  add("flowers", 700, 200, 80, (c) => {
    c.fillStyle = "#58C048"; c.beginPath(); c.ellipse(100, 65, 96, 15, 0, 0, TAU); c.fill();
    const cols = ["#FF7AB6", "#FFD23F", "#FFFFFF", "#B69BFF", "#FF8C5A"];
    for (let k = 0; k < 12; k++) {
      const x = 16 + k * 15, y = 30 + (k % 3) * 12, col = cols[k % 5];
      c.strokeStyle = "#2E8B3E"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, 66); c.stroke();
      for (let p = 0; p < 5; p++) dot(c, x + Math.cos(p * 1.26) * 6, y + Math.sin(p * 1.26) * 6, 5, col);
      dot(c, x, y, 4, "#FFE45C");
    }
  });
  const house = (wall, roof) => (c) => {
    c.fillStyle = wall; c.fillRect(30, 120, 240, 150);
    c.beginPath(); c.moveTo(10, 130); c.lineTo(150, 20); c.lineTo(290, 130); c.closePath(); c.fillStyle = roof; c.fill();
    c.fillStyle = "#8A5A3A"; rr(c, 125, 185, 50, 85, 6); c.fill(); dot(c, 165, 230, 4, "#FFD23F");
    for (const x of [55, 205]) { c.fillStyle = "#FFFFFF"; c.fillRect(x - 4, 156, 48, 48); c.fillStyle = "#9CD8FF"; c.fillRect(x, 160, 40, 40); c.fillStyle = "#FFFFFF"; c.fillRect(x + 18, 160, 4, 40); c.fillRect(x, 178, 40, 4); }
    c.fillStyle = "#FFFFFF"; dot(c, 150, 90, 18, "#FFFFFF"); heart(c, 150, 92, 10, roof);
    c.fillStyle = "#B94A3A"; c.fillRect(215, 35, 26, 60);
  };
  add("houseP", 2700, 300, 270, house("#FFD6E8", "#FF5FAE"));
  add("houseB", 2700, 300, 270, house("#D6E6FF", "#2F6BFF"));
  add("houseY", 2700, 300, 270, house("#FFF1C2", "#E3222B"));

  // ---------- Sunny Beach ----------
  add("palm", 1900, 240, 340, (c) => {
    c.strokeStyle = "#A8743F"; c.lineWidth = 22; c.lineCap = "round";
    c.beginPath(); c.moveTo(110, 335); c.quadraticCurveTo(100, 200, 140, 80); c.stroke();
    c.strokeStyle = "#8C5E30"; c.lineWidth = 3;
    for (let y = 300; y > 100; y -= 22) { c.beginPath(); c.moveTo(96, y); c.lineTo(122, y - 6); c.stroke(); }
    const leaf = (a, len, col) => {
      c.save(); c.translate(140, 80); c.rotate(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -32, len, 14); c.quadraticCurveTo(len * 0.5, -6, 0, 0);
      c.fillStyle = col; c.fill(); c.restore();
    };
    [[-2.9, 110, "#2E9A45"], [-2.2, 100, "#3AAE50"], [-1.3, 80, "#46BE5A"], [-0.5, 100, "#3AAE50"], [0.2, 110, "#2E9A45"], [-3.5, 90, "#46BE5A"]].forEach(([a, l, col]) => leaf(a, l, col));
    dot(c, 132, 92, 9, "#7A4B2A"); dot(c, 148, 94, 9, "#6B3F22"); dot(c, 140, 102, 9, "#7A4B2A");
  });
  add("umbrella", 1300, 220, 220, (c) => {
    c.fillStyle = "#EEE"; c.fillRect(106, 70, 8, 150);
    for (let k = 0; k < 6; k++) {
      c.beginPath(); c.moveTo(110, 30);
      c.arc(110, 100, 100, Math.PI + (k * Math.PI) / 6, Math.PI + ((k + 1) * Math.PI) / 6);
      c.closePath(); c.fillStyle = k % 2 ? "#FFFFFF" : ["#FF3D7F", "#2F6BFF", "#FFC21A"][k / 2]; c.fill();
    }
    c.fillStyle = "#FF8C5A"; rr(c, 20, 196, 130, 18, 6); c.fill();
    c.fillStyle = "#FFFFFF"; c.fillRect(20, 202, 130, 5);
  });
  add("surf", 500, 80, 260, (c) => {
    c.beginPath(); c.ellipse(40, 130, 34, 126, 0, 0, TAU); c.fillStyle = "#34D3E0"; c.fill();
    c.fillStyle = "#FF5FAE"; c.fillRect(6, 110, 68, 18); c.fillStyle = "#FFE45C"; c.fillRect(6, 132, 68, 8);
    star(c, 40, 60, 14, "#FFFFFF");
  });
  add("castle", 1200, 240, 170, (c) => {
    c.fillStyle = "#E8C27A";
    c.fillRect(30, 70, 180, 100); c.fillRect(10, 40, 50, 130); c.fillRect(180, 40, 50, 130); c.fillRect(95, 20, 50, 150);
    c.fillStyle = "#D4A95A";
    for (const x of [10, 30, 50, 180, 200, 220, 95, 115, 135]) c.fillRect(x, x > 90 && x < 150 ? 10 : 30, 10, 12);
    c.fillStyle = "#8A5A3A"; rr(c, 105, 120, 30, 50, 14); c.fill();
    c.strokeStyle = "#555"; c.lineWidth = 3; c.beginPath(); c.moveTo(120, 20); c.lineTo(120, -0); c.stroke();
    c.fillStyle = "#FF3D7F"; c.beginPath(); c.moveTo(121, 0); c.lineTo(145, 6); c.lineTo(121, 13); c.fill();
  });
  add("ball", 520, 120, 120, (c) => {
    dot(c, 60, 60, 56, "#FFFFFF");
    for (const [a, col] of [[0, "#FF3D7F"], [2.1, "#2F6BFF"], [4.2, "#FFC21A"]]) {
      c.beginPath(); c.moveTo(60, 60); c.arc(60, 60, 56, a, a + 1.05); c.closePath(); c.fillStyle = col; c.fill();
    }
    dot(c, 44, 40, 10, "rgba(255,255,255,.6)");
  });

  // ---------- Candy Land ----------
  const lolly = (a, b) => (c) => {
    c.fillStyle = "#FFFFFF"; c.fillRect(92, 160, 16, 180);
    dot(c, 100, 100, 92, a);
    c.strokeStyle = b; c.lineWidth = 16; c.lineCap = "round";
    c.beginPath();
    for (let k = 0; k < 90; k++) { const ang = k * 0.2, r = k * 0.95; c.lineTo(100 + Math.cos(ang) * r, 100 + Math.sin(ang) * r); }
    c.stroke();
    dot(c, 70, 66, 16, "rgba(255,255,255,.45)");
  };
  add("lollyA", 1300, 200, 340, lolly("#FF5FAE", "#FFFFFF"));
  add("lollyB", 1300, 200, 340, lolly("#7B4DFF", "#FFE45C"));
  add("cane", 900, 150, 330, (c) => {
    const path = () => { c.beginPath(); c.moveTo(50, 330); c.lineTo(50, 80); c.arc(90, 80, 40, Math.PI, 0); c.lineTo(130, 110); };
    c.lineCap = "round";
    path(); c.strokeStyle = "#FFFFFF"; c.lineWidth = 30; c.stroke();
    path(); c.setLineDash([22, 22]); c.strokeStyle = "#FF2D55"; c.stroke(); c.setLineDash([]);
  });
  add("cupcake", 1200, 220, 240, (c) => {
    c.beginPath(); c.moveTo(35, 130); c.lineTo(185, 130); c.lineTo(165, 240); c.lineTo(55, 240); c.closePath(); c.fillStyle = "#4FC3F7"; c.fill();
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 4;
    for (let x = 55; x < 180; x += 22) { c.beginPath(); c.moveTo(x, 132); c.lineTo(x + 4, 238); c.stroke(); }
    for (const [x, y, r] of [[60, 120, 34], [160, 120, 34], [110, 110, 44], [85, 80, 32], [135, 80, 32], [110, 55, 30]]) dot(c, x, y, r, "#FFB3D9");
    for (let k = 0; k < 14; k++) { c.fillStyle = ["#FFE45C", "#7B4DFF", "#27B356", "#FFFFFF"][k % 4]; c.save(); c.translate(50 + (k * 37) % 120, 50 + (k * 23) % 90); c.rotate(k); c.fillRect(-5, -2, 10, 4); c.restore(); }
    dot(c, 110, 24, 16, "#E3222B"); dot(c, 104, 18, 5, "rgba(255,255,255,.7)");
  });
  const gum = (col) => (c) => {
    c.beginPath(); c.moveTo(10, 150); c.bezierCurveTo(10, 10, 170, 10, 170, 150); c.closePath(); c.fillStyle = col; c.fill();
    for (let k = 0; k < 24; k++) dot(c, 30 + (k * 41) % 120, 50 + (k * 29) % 95, 3, "rgba(255,255,255,.7)");
  };
  add("gumG", 800, 180, 150, gum("#35D07F"));
  add("gumO", 800, 180, 150, gum("#FF9F1C"));
  add("cone", 900, 160, 300, (c) => {
    c.beginPath(); c.moveTo(20, 140); c.lineTo(140, 140); c.lineTo(80, 300); c.closePath(); c.fillStyle = "#E3A857"; c.fill();
    c.strokeStyle = "#C4873A"; c.lineWidth = 3;
    for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(30 + k * 25, 140); c.lineTo(80 + k * 6 - 12, 290); c.stroke(); }
    dot(c, 80, 115, 55, "#FFB3D9"); dot(c, 80, 60, 45, "#A8E6CF"); dot(c, 80, 20, 20, "#FFFFFF");
    dot(c, 80, 4, 10, "#E3222B");
  });

  // ---------- shared ----------
  function billboard(text, bg, fg, emoji) {
    return mk(420, 260, (c) => {
      c.fillStyle = "#6B6F7A"; c.fillRect(80, 150, 16, 110); c.fillRect(324, 150, 16, 110);
      rr(c, 10, 10, 400, 160, 18); c.fillStyle = "#FFFFFF"; c.fill();
      rr(c, 22, 22, 376, 136, 12); c.fillStyle = bg; c.fill();
      for (let k = 0; k < 14; k++) dot(c, 24 + k * 28.6, 16, 5, k % 2 ? "#FFE45C" : "#FFFFFF");
      c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "54px Bungee, 'Arial Black', sans-serif";
      let size = 54;
      while (c.measureText(text).width > 340 && size > 20) { size -= 2; c.font = `${size}px Bungee, 'Arial Black', sans-serif`; }
      c.fillText(text, 210, emoji ? 72 : 92);
      if (emoji) { c.font = "44px system-ui, sans-serif"; c.fillText(emoji, 210, 128); }
    });
  }
  const BOARDS = [
    ["GO ELLIE!", "#FF5FAE", "#FFFFFF", "💖🎀💖"],
    ["JONAH ROCKS", "#E3222B", "#FFFFFF", "🏎️🔥"],
    ["REUBEN RULES", "#2F6BFF", "#FFFFFF", "⚡⚡⚡"],
    ["ROSENBERG", "#FFC21A", "#1B1F3B", "🏁 RACEWAY 🏁"],
    ["ZOOM ZOOM!", "#7B4DFF", "#FFFFFF", "⭐🚀⭐"],
    ["YOU CAN DO IT", "#27B356", "#FFFFFF", "👍😄👍"],
  ];
  // Bungee may still be loading; paint the boards again once fonts are ready.
  const paintBoards = () => BOARDS.forEach(([t, bg, fg, e], k) => { S["board" + k] = { img: billboard(t, bg, fg, e), w: 2800 }; });
  paintBoards();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintBoards);

  add("crowd", 3200, 420, 200, (c) => {
    c.fillStyle = "#8A93A8"; c.fillRect(0, 60, 420, 140);
    for (let r = 0; r < 4; r++) { c.fillStyle = r % 2 ? "#9AA3B8" : "#7E879C"; c.fillRect(0, 60 + r * 35, 420, 35); }
    const cols = ["#FF5FAE", "#2F6BFF", "#E3222B", "#FFC21A", "#27B356", "#7B4DFF", "#FFFFFF"];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 15; k++) {
      const x = 16 + k * 27 + (r % 2) * 12, y = 58 + r * 35;
      c.fillStyle = cols[(k * 3 + r * 5) % 7]; rr(c, x - 9, y + 4, 18, 22, 6); c.fill();
      dot(c, x, y, 8, ["#F2C9A0", "#C98E62", "#8D5A3B", "#FFDDBB"][(k + r) % 4]);
      if ((k + r) % 3 === 0) { c.strokeStyle = cols[(k + r) % 7]; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + 14, y - 12); c.stroke(); }
    }
    c.fillStyle = "#FF3D7F"; c.fillRect(0, 50, 420, 12);
  });
  add("balloons", 900, 160, 320, (c) => {
    c.strokeStyle = "#FFFFFF"; c.lineWidth = 2;
    const b = [[50, 60, "#FF5FAE"], [110, 50, "#2F6BFF"], [80, 105, "#FFC21A"], [40, 135, "#27B356"], [120, 125, "#E3222B"]];
    for (const [x, y] of b) { c.beginPath(); c.moveTo(x, y + 32); c.quadraticCurveTo(x + 8, 220, 80, 318); c.stroke(); }
    for (const [x, y, col] of b) { c.beginPath(); c.ellipse(x, y, 26, 32, 0, 0, TAU); c.fillStyle = col; c.fill(); dot(c, x - 9, y - 12, 7, "rgba(255,255,255,.5)"); }
  });

  RC.SPR = S;
  RC.ZONE_SPRITES = [
    { near: ["tree", "tree", "pine", "bush", "flowers", "flowers", "bush"], far: ["houseP", "houseB", "houseY", "tree", "pine"] },
    { near: ["palm", "palm", "umbrella", "surf", "ball", "castle"], far: ["palm", "umbrella", "castle"] },
    { near: ["lollyA", "lollyB", "cane", "gumG", "gumO", "cupcake", "cone"], far: ["lollyA", "cupcake", "cone", "lollyB"] },
  ];
  RC.BOARD_COUNT = BOARDS.length;

  // ---------- worlds ----------
  RC.ZONES = [
    {
      name: "Sunny Meadow", emoji: "🌻",
      sky: ["#4FB8FF", "#BFEAFF"], haze: "#D8F2FF",
      grass: ["#7ED957", "#71CC4B"], rumble: ["#E8322E", "#FFFFFF"], road: ["#6E7382", "#686D7C"], lane: "#FFFFFF",
    },
    {
      name: "Sunny Beach", emoji: "🏖️",
      sky: ["#23C4E8", "#D6FAFF"], haze: "#E4FCFF",
      grass: ["#F6DE9E", "#EFD38C"], rumble: ["#FF9F43", "#FFFFFF"], road: ["#707586", "#6A6F80"], lane: "#FFFFFF",
    },
    {
      name: "Candy Land", emoji: "🍭",
      sky: ["#FF8FC8", "#FFE6F3"], haze: "#FFE9F5",
      grass: ["#FFB8DB", "#FFA8D2"], rumble: ["#FF3D8B", "#FFFFFF"], road: ["#9A82D8", "#9179CF"], lane: "#FFE45C",
    },
  ];

  // A wide strip of sky + far scenery for each world, painted per screen size.
  RC.paintBackdrop = function (z, W, H) {
    const zone = RC.ZONES[z];
    const bw = Math.ceil(W * 2), bh = Math.ceil(H);
    return mk(bw, bh, (c) => {
      const g = c.createLinearGradient(0, 0, 0, bh);
      g.addColorStop(0, zone.sky[0]); g.addColorStop(1, zone.sky[1]);
      c.fillStyle = g; c.fillRect(0, 0, bw, bh);
      const base = bh, u = Math.min(W, H) / 400;
      // sun
      const sx = bw * 0.3, sy = base * 0.35;
      dot(c, sx, sy, 60 * u, "rgba(255,255,255,.35)"); dot(c, sx, sy, 38 * u, z === 2 ? "#FFF3B0" : "#FFF7C2");
      // clouds
      const cloud = (x, y, s, col) => { for (const [dx, dy, r] of [[0, 0, 22], [24, -10, 26], [50, 0, 20], [24, 6, 22]]) dot(c, x + dx * s, y + dy * s, r * s, col); };
      for (let k = 0; k < 7; k++) {
        const x = ((k * 0.37 + 0.05) % 1) * bw, y = base * (0.12 + ((k * 0.29) % 0.4));
        cloud(x, y, u * (0.8 + (k % 3) * 0.3), z === 2 ? (k % 2 ? "#FFFFFF" : "#FFD1EA") : "rgba(255,255,255,.92)");
      }
      // far hills, tiled so the strip wraps seamlessly
      const hills = (amp, yb, col, n, seed) => {
        c.beginPath(); c.moveTo(0, bh);
        for (let x = 0; x <= bw; x += 8) {
          const a = (x / bw) * TAU;
          const y = yb - amp * (0.55 + 0.25 * Math.sin(a * n + seed) + 0.2 * Math.sin(a * (n * 2 + 1) + seed * 2));
          c.lineTo(x, y);
        }
        c.lineTo(bw, bh); c.closePath(); c.fillStyle = col; c.fill();
      };
      if (z === 0) {
        hills(90 * u, base, "#9ED98A", 3, 1); hills(55 * u, base, "#7CC76A", 5, 2);
      } else if (z === 1) {
        hills(70 * u, base - 22 * u, "#8FCFA0", 2, 3);
        c.fillStyle = "#2BA8E0"; c.fillRect(0, base - 30 * u, bw, 30 * u);
        c.fillStyle = "rgba(255,255,255,.6)";
        for (let k = 0; k < 40; k++) c.fillRect(((k * 97) % bw), base - 24 * u + (k % 4) * 6 * u, 18 * u, 2 * u);
      } else {
        // ice cream mountains with icing tops
        c.save();
        for (const [amp, col, n, s] of [[130 * u, "#C9A2FF", 4, 0.5], [80 * u, "#FF9ACB", 6, 1.7]]) {
          c.beginPath(); c.moveTo(0, bh);
          for (let x = 0; x <= bw; x += 8) {
            const a = (x / bw) * TAU;
            c.lineTo(x, base - amp * (0.5 + 0.5 * Math.abs(Math.sin(a * n + s))));
          }
          c.lineTo(bw, bh); c.closePath(); c.fillStyle = col; c.fill();
        }
        c.restore();
      }
    });
  };
})();
