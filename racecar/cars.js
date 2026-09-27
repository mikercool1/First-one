// Racecar Rally: the garage. Every car is drawn from BEHIND (you chase it
// down the road). Units: the car is 100 wide, origin at the bottom-center
// where the tires touch the road, negative y is up. `t` is seconds.
window.RC = window.RC || {};
(() => {
  const TAU = Math.PI * 2;

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function heart(c, x, y, s, fill) {
    c.beginPath(); c.moveTo(x, y + s * 0.55);
    c.bezierCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.55, y - s * 1.1, x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.55, y - s * 1.1, x + s * 1.2, y - s * 0.2, x, y + s * 0.55);
    c.fillStyle = fill; c.fill();
  }
  function star(c, x, y, r, fill, points = 5, inner = 0.45, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i * Math.PI) / points, rad = i % 2 ? r * inner : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  const sparkle = (c, x, y, r, fill) => star(c, x, y, r, fill, 4, 0.28, 0);
  function dot(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill(); }
  function vgrad(c, y0, y1, stops) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }
  function shadow(c, w) { c.beginPath(); c.ellipse(0, -1, w, 7, 0, 0, TAU); c.fillStyle = "rgba(0,0,0,.28)"; c.fill(); }
  function tire(c, x, y, w, h) {
    rr(c, x, y, w, h, 5); c.fillStyle = "#1C1C24"; c.fill();
    c.fillStyle = "rgba(255,255,255,.12)";
    for (let k = 1; k < 4; k++) c.fillRect(x + 2, y + (h * k) / 4, w - 4, 1.5);
  }
  function glass(c, path, tint) {
    path(); const g = c.createLinearGradient(-30, -80, 30, -40);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.35, tint); g.addColorStop(1, tint);
    c.fillStyle = g; c.fill();
    c.save(); path(); c.clip();
    c.fillStyle = "rgba(255,255,255,.45)";
    c.beginPath(); c.moveTo(-20, -90); c.lineTo(-8, -90); c.lineTo(-28, -30); c.lineTo(-40, -30); c.fill();
    c.restore();
  }
  function plate(c, text, color, y = -24) {
    rr(c, -21, y, 42, 11, 2); c.fillStyle = "#FFFFFF"; c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.stroke();
    c.fillStyle = color; c.font = "900 8px Nunito, system-ui, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 0, y + 6);
  }
  function lamp(c, x, y, w, h, on) {
    rr(c, x, y, w, h, Math.min(w, h) / 2); c.fillStyle = on; c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; rr(c, x + 1.5, y + 1, w * 0.45, h * 0.35, 2); c.fill();
  }

  const CARS = [
    {
      id: "ellie", owner: "Ellie", name: "Sparkle Heart", color: "#FF5FAE",
      tagline: "Pink and pretty with a big bow, heart lights and sparkles",
      honk: "Beep beep! 💖", horn: [[1175, 0.12], [1397, 0.18]], hornType: "triangle",
      trail: { kind: "heart", colors: ["#FF6FB5", "#FFB3D9", "#C58BFF", "#FFFFFF"] },
      exhaust: [[-22, -12], [22, -12]],
      draw(c, t) {
        shadow(c, 54);
        tire(c, -46, -22, 17, 22); tire(c, 29, -22, 17, 22);
        // bubbly body
        rr(c, -50, -48, 100, 38, 19);
        c.fillStyle = vgrad(c, -48, -10, ["#FFB3DA", "#FF6FB5", "#E84A98"]); c.fill();
        c.lineWidth = 2; c.strokeStyle = "#C23480"; c.stroke();
        // dome cabin
        const cab = () => { c.beginPath(); c.moveTo(-36, -44); c.bezierCurveTo(-34, -84, 34, -84, 36, -44); c.closePath(); };
        cab(); c.fillStyle = "#FFC6E3"; c.fill(); c.strokeStyle = "#C23480"; c.stroke();
        glass(c, () => { c.beginPath(); c.moveTo(-27, -47); c.bezierCurveTo(-25, -76, 25, -76, 27, -47); c.closePath(); }, "#BDE3FF");
        // big bow on the roof
        c.fillStyle = "#A259FF";
        c.beginPath(); c.ellipse(-12, -83, 12, 8, -0.35, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(12, -83, 12, 8, 0.35, 0, TAU); c.fill();
        c.fillStyle = "#8A3FF0";
        c.beginPath(); c.moveTo(-3, -80); c.lineTo(-10, -66); c.lineTo(-5, -68); c.lineTo(-2, -64); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(3, -80); c.lineTo(10, -66); c.lineTo(5, -68); c.lineTo(2, -64); c.closePath(); c.fill();
        dot(c, 0, -82, 5, "#D9A6FF");
        // heart taillights and decals
        heart(c, -35, -34, 8, "#FF2D6F"); heart(c, 35, -34, 8, "#FF2D6F");
        heart(c, -36, -36, 2.5, "rgba(255,255,255,.7)"); heart(c, 34, -36, 2.5, "rgba(255,255,255,.7)");
        heart(c, -18, -40, 3.4, "#FFFFFF"); heart(c, 18, -40, 3.4, "#FFFFFF");
        rr(c, -46, -16, 92, 7, 3.5); c.fillStyle = "#C23480"; c.fill();
        plate(c, "ELLIE ♥", "#E8438F", -28);
        // twinkles
        [[-54, -70], [52, -60], [-44, -92], [40, -94], [0, -100]].forEach(([x, y], i) => {
          const a = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.9);
          if (a > 0.2) sparkle(c, x, y, 3 + 5 * a, `rgba(255,255,255,${a.toFixed(2)})`);
        });
      },
    },
    {
      id: "jonah", owner: "Jonah", name: "Red Rocket GT", color: "#E3222B",
      tagline: "A real red sports car: low, wide, with a giant spoiler",
      honk: "VROOM VROOM! 🏁", horn: [[233, 0.14], [233, 0.22]], hornType: "sawtooth",
      trail: { kind: "spark", colors: ["#FF4A3D", "#FFB23D", "#FFE08A"] },
      exhaust: [[-26, -9], [-17, -9], [17, -9], [26, -9]],
      draw(c) {
        shadow(c, 58);
        tire(c, -52, -21, 21, 21); tire(c, 31, -21, 21, 21);
        c.beginPath();
        c.moveTo(-54, -12); c.lineTo(-52, -34); c.quadraticCurveTo(-50, -44, -38, -45);
        c.lineTo(38, -45); c.quadraticCurveTo(50, -44, 52, -34); c.lineTo(54, -12); c.closePath();
        c.fillStyle = vgrad(c, -45, -12, ["#FF6A5F", "#E3222B", "#A3101A"]); c.fill();
        c.lineWidth = 2; c.strokeStyle = "#7A0A12"; c.stroke();
        const cab = () => { c.beginPath(); c.moveTo(-32, -44); c.lineTo(-22, -63); c.lineTo(22, -63); c.lineTo(32, -44); c.closePath(); };
        cab(); c.fillStyle = "#C4161F"; c.fill(); c.stroke();
        glass(c, () => { c.beginPath(); c.moveTo(-25, -46); c.lineTo(-18, -60); c.lineTo(18, -60); c.lineTo(25, -46); c.closePath(); }, "#2A3346");
        // racing stripes
        for (const x of [-10, 4]) {
          c.fillStyle = "#FFFFFF"; c.fillRect(x - 1, -63, 8, 51);
          c.fillStyle = "#151515"; c.fillRect(x, -63, 6, 51);
        }
        // spoiler
        c.fillStyle = "#151515"; c.fillRect(-30, -58, 4, 14); c.fillRect(26, -58, 4, 14);
        rr(c, -56, -66, 112, 8, 3); c.fill();
        c.fillStyle = "#E3222B"; rr(c, -58, -70, 7, 16, 2); c.fill(); rr(c, 51, -70, 7, 16, 2); c.fill();
        // long taillights
        lamp(c, -50, -38, 26, 6, "#FF2A3A"); lamp(c, 24, -38, 26, 6, "#FF2A3A");
        // diffuser + quad exhausts
        rr(c, -44, -15, 88, 9, 3); c.fillStyle = "#1A1A1A"; c.fill();
        for (const x of [-26, -17, 17, 26]) { dot(c, x, -10, 3.6, "#9AA0AA"); dot(c, x, -10, 2, "#2A2A2A"); }
        plate(c, "JONAH", "#E3222B", -28);
      },
    },
    {
      id: "reuben", owner: "Reuben", name: "Blue Thunder", color: "#2F6BFF",
      tagline: "Bright blue with a lightning bolt, as quick as a flash",
      honk: "HONK HONK! ⚡", horn: [[330, 0.12], [415, 0.2]], hornType: "square",
      trail: { kind: "bolt", colors: ["#6FB6FF", "#FFFFFF", "#FFE14D"] },
      exhaust: [[-24, -11], [24, -11]],
      draw(c) {
        shadow(c, 55);
        tire(c, -48, -22, 18, 22); tire(c, 30, -22, 18, 22);
        rr(c, -50, -50, 100, 40, 10);
        c.fillStyle = vgrad(c, -50, -10, ["#78A8FF", "#2F6BFF", "#1542C0"]); c.fill();
        c.lineWidth = 2; c.strokeStyle = "#0F2F8A"; c.stroke();
        const cab = () => { c.beginPath(); c.moveTo(-38, -49); c.lineTo(-29, -76); c.lineTo(29, -76); c.lineTo(38, -49); c.closePath(); };
        cab(); c.fillStyle = "#2358E0"; c.fill(); c.stroke();
        glass(c, () => { c.beginPath(); c.moveTo(-30, -51); c.lineTo(-23, -72); c.lineTo(23, -72); c.lineTo(30, -51); c.closePath(); }, "#9CCBFF");
        rr(c, -32, -80, 64, 6, 3); c.fillStyle = "#1542C0"; c.fill();
        // white side stripes
        c.fillStyle = "#FFFFFF"; c.fillRect(-50, -45, 100, 3);
        // lightning bolt on the trunk
        c.save(); c.translate(0, -39); c.scale(0.5, 0.5); c.translate(0, 29.5);
        c.beginPath();
        c.moveTo(4, -44); c.lineTo(-9, -29); c.lineTo(-1, -29); c.lineTo(-6, -15); c.lineTo(9, -33); c.lineTo(1, -33); c.lineTo(6, -44); c.closePath();
        c.fillStyle = "#FFE14D"; c.fill(); c.strokeStyle = "#FFFFFF"; c.lineWidth = 2.5; c.stroke();
        c.restore();
        for (const x of [-38, 38]) { dot(c, x, -34, 7.5, "#FFFFFF"); dot(c, x, -34, 5.5, "#FF2A2A"); dot(c, x - 1.5, -36, 1.6, "rgba(255,255,255,.8)"); }
        rr(c, -48, -16, 96, 7, 3.5); c.fillStyle = "#0F2F8A"; c.fill();
        plate(c, "REUBEN", "#2F6BFF", -29);
      },
    },
    {
      id: "sunny", owner: null, name: "Sunny Zoom", color: "#FFC21A",
      tagline: "A happy yellow buggy with a smiling sun on the back",
      honk: "Toot toot! ☀️", horn: [[784, 0.1], [988, 0.1], [1175, 0.16]], hornType: "square",
      trail: { kind: "star", colors: ["#FFD23F", "#FF9F1C", "#FFFFFF"] },
      exhaust: [[0, -10]],
      draw(c, t) {
        shadow(c, 52);
        tire(c, -47, -24, 18, 24); tire(c, 29, -24, 18, 24);
        rr(c, -46, -50, 92, 40, 20);
        c.fillStyle = vgrad(c, -50, -10, ["#FFE77A", "#FFC21A", "#E89A00"]); c.fill();
        c.lineWidth = 2; c.strokeStyle = "#B87300"; c.stroke();
        const cab = () => { c.beginPath(); c.moveTo(-32, -48); c.bezierCurveTo(-30, -82, 30, -82, 32, -48); c.closePath(); };
        cab(); c.fillStyle = "#FFD84D"; c.fill(); c.stroke();
        glass(c, () => { c.beginPath(); c.moveTo(-24, -52); c.bezierCurveTo(-22, -74, 22, -74, 24, -52); c.closePath(); }, "#BDEBFF");
        // spare tire with a smiling sun
        dot(c, 0, -30, 14, "#2A2A2A");
        c.save(); c.translate(0, -30); c.rotate(t * 1.2); star(c, 0, 0, 12, "#FF8C1A", 10, 0.7, 0); c.restore();
        dot(c, 0, -30, 8.5, "#FFE45C");
        dot(c, -3, -32, 1.3, "#7A4A00"); dot(c, 3, -32, 1.3, "#7A4A00");
        c.beginPath(); c.arc(0, -30, 4, 0.3, Math.PI - 0.3); c.strokeStyle = "#7A4A00"; c.lineWidth = 1.5; c.stroke();
        for (const x of [-36, 36]) { dot(c, x, -36, 6, "#FF4D2E"); dot(c, x - 1.5, -38, 1.5, "rgba(255,255,255,.8)"); }
        rr(c, -44, -16, 88, 6, 3); c.fillStyle = "#B87300"; c.fill();
        plate(c, "SUNNY", "#E08600", -13);
      },
    },
    {
      id: "gator", owner: null, name: "Green Gator", color: "#27B356",
      tagline: "A giant monster truck with gator eyes on the roof",
      honk: "CHOMP CHOMP! 🐊", horn: [[98, 0.18], [98, 0.25]], hornType: "sawtooth",
      trail: { kind: "mud", colors: ["#7A5230", "#9B6B3D", "#5E3E22"] },
      exhaust: [[-20, -30], [20, -30]],
      draw(c) {
        shadow(c, 60);
        tire(c, -58, -38, 26, 38); tire(c, 32, -38, 26, 38);
        c.fillStyle = "#333"; c.fillRect(-34, -34, 68, 6);
        rr(c, -48, -72, 96, 36, 8);
        c.fillStyle = vgrad(c, -72, -36, ["#5ADB80", "#27B356", "#157A37"]); c.fill();
        c.lineWidth = 2; c.strokeStyle = "#0E5A27"; c.stroke();
        const cab = () => { rr(c, -34, -96, 68, 26, 7); };
        cab(); c.fillStyle = "#23A04D"; c.fill(); c.stroke();
        glass(c, () => rr(c, -27, -92, 54, 18, 5), "#B8F0C8");
        // gator eyes on the roof
        for (const x of [-18, 18]) { dot(c, x, -100, 9, "#27B356"); dot(c, x, -101, 6.5, "#FFFFFF"); dot(c, x + 1, -101, 3, "#111"); }
        // scales on the tailgate
        for (let x = -36; x <= 36; x += 12) for (const y of [-64, -56]) dot(c, x + (y === -56 ? 6 : 0), y, 2.8, "rgba(10,70,30,.35)");
        lamp(c, -46, -52, 10, 12, "#FF3B3B"); lamp(c, 36, -52, 10, 12, "#FF3B3B");
        plate(c, "GATOR", "#1D8F45", -50);
      },
    },
    {
      id: "comet", owner: null, name: "Purple Comet", color: "#7B4DFF",
      tagline: "A starry space racer with a real rocket on the back",
      honk: "Zoop zoop! 🚀", horn: [[400, 0.25]], hornType: "sine", hornSlide: 3,
      trail: { kind: "star", colors: ["#B69BFF", "#FFFFFF", "#7BE0FF"] },
      exhaust: [[0, -28]],
      draw(c, t) {
        shadow(c, 54);
        tire(c, -47, -20, 17, 20); tire(c, 30, -20, 17, 20);
        c.beginPath();
        c.moveTo(-50, -12); c.lineTo(-48, -40); c.quadraticCurveTo(-40, -50, -24, -50);
        c.lineTo(24, -50); c.quadraticCurveTo(40, -50, 48, -40); c.lineTo(50, -12); c.closePath();
        c.fillStyle = vgrad(c, -50, -12, ["#A88BFF", "#7B4DFF", "#4B23C4"]); c.fill();
        c.lineWidth = 2; c.strokeStyle = "#2E1485"; c.stroke();
        // bubble canopy
        c.beginPath(); c.ellipse(0, -52, 26, 20, 0, Math.PI, TAU);
        const g = c.createRadialGradient(-8, -64, 2, 0, -52, 26); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#6FC8FF");
        c.fillStyle = g; c.fill(); c.strokeStyle = "#2E1485"; c.stroke();
        // fins
        c.fillStyle = "#4B23C4";
        c.beginPath(); c.moveTo(-48, -40); c.lineTo(-58, -62); c.lineTo(-40, -48); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(48, -40); c.lineTo(58, -62); c.lineTo(40, -48); c.closePath(); c.fill();
        for (const [x, y, r] of [[-34, -26, 4], [34, -30, 3.5], [-20, -42, 3], [22, -18, 3], [-38, -40, 2.5]]) star(c, x, y, r, "#FFFFFF");
        // rocket nozzle with flicker
        dot(c, 0, -28, 11, "#555"); dot(c, 0, -28, 8, "#222");
        const f = 6 + Math.sin(t * 40) * 1.5;
        dot(c, 0, -28, f, "#FFB23D"); dot(c, 0, -28, f * 0.55, "#FFF3B0");
        for (const x of [-38, 38]) lamp(c, x - 6, -22, 12, 5, "#7BE0FF");
        plate(c, "COMET", "#6A3DF0", -14);
      },
    },
  ];

  RC.CARS = CARS;
  RC.byId = Object.fromEntries(CARS.map((c) => [c.id, c]));
  RC.art = { rr, heart, star, sparkle, dot, vgrad };
})();
