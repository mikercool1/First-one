// Racecar Rally: the garage. Every car draws itself top-down with its nose
// pointing +x, centered on (0, 0). `t` is seconds, for little animations.
window.RC = window.RC || {};
(() => {
  const TAU = Math.PI * 2;

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // Heart with its lobes toward +x, so it reads upright when the car faces up.
  function heart(c, x, y, s, fill, rot = Math.PI / 2) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(0, s * 0.5);
    c.bezierCurveTo(-s * 1.15, -s * 0.2, -s * 0.55, -s * 1.1, 0, -s * 0.42);
    c.bezierCurveTo(s * 0.55, -s * 1.1, s * 1.15, -s * 0.2, 0, s * 0.5);
    c.fillStyle = fill; c.fill(); c.restore();
  }
  function star(c, x, y, r, fill, points = 5, inner = 0.45, rot = 0) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i * Math.PI) / points, rad = i % 2 ? r * inner : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  const sparkle = (c, x, y, r, fill) => star(c, x, y, r, fill, 4, 0.28, 0);
  function shadow(c, L, W, r) {
    c.fillStyle = "rgba(20,40,20,.28)"; rr(c, -L / 2 + 1, -W / 2 + 4, L + 3, W, r); c.fill();
  }
  function tire(c, x, y, w, h) {
    c.fillStyle = "#1D1D24"; rr(c, x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.35); c.fill();
    c.fillStyle = "rgba(255,255,255,.16)"; c.fillRect(x - w / 2 + 2, y - h / 2 + 1, w - 4, 1.2);
  }
  function tires(c, fx, rx, y, w, h) {
    for (const x of [fx, rx]) for (const s of [-1, 1]) tire(c, x, s * y, w, h);
  }
  function glass(c, x, y, w, h, r, tint) {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, tint); g.addColorStop(1, "#FFFFFF");
    rr(c, x, y, w, h, r); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + w * 0.35, y + 2); c.lineTo(x + w * 0.75, y + h * 0.45); c.stroke();
  }
  function grad(c, y0, y1, stops) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }
  function lamp(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill(); }

  const CARS = [
    {
      id: "ellie", owner: "Ellie", name: "Sparkle Heart", color: "#FF5FAE",
      tagline: "Pink, pretty and super fun, with a bow on top",
      stats: { speed: 4, grip: 5, boost: 4 },
      trail: { kind: "heart", colors: ["#FF6FB5", "#FFB3D9", "#C58BFF", "#FFFFFF"] },
      draw(c, t) {
        const L = 46, W = 28;
        shadow(c, L, W, 12);
        tires(c, 13, -13, 13, 11, 6);
        rr(c, -L / 2, -W / 2, L, W, 12);
        c.fillStyle = grad(c, -W / 2, W / 2, ["#FFA8D5", "#FF6FB5", "#E84A98"]); c.fill();
        c.lineWidth = 1.5; c.strokeStyle = "#C23480"; c.stroke();
        for (const [x, y] of [[-16, -9.5], [-4, -10.5], [-16, 9.5], [-4, 10.5]]) heart(c, x, y, 2.6, "#FFFFFF");
        heart(c, 15, 0, 6, "#FFFFFF"); heart(c, 15.4, 0, 3.6, "#FF3D8B");
        glass(c, 3, -9, 7, 18, 3, "#C9E8FF");
        rr(c, -14, -9.5, 17, 19, 6); c.fillStyle = "#FFC6E3"; c.fill();
        // bow on the roof
        c.fillStyle = "#A259FF";
        c.beginPath(); c.ellipse(-5, -4.6, 3.3, 4.8, 0.55, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(-5, 4.6, 3.3, 4.8, -0.55, 0, TAU); c.fill();
        c.strokeStyle = "#A259FF"; c.lineWidth = 2; c.lineCap = "round";
        c.beginPath(); c.moveTo(-6, 0); c.lineTo(-12, -3.5); c.moveTo(-6, 0); c.lineTo(-12, 3.5); c.stroke();
        lamp(c, -5, 0, 2.3, "#D9A6FF");
        // headlights with eyelashes
        for (const s of [-1, 1]) {
          lamp(c, L / 2 - 3.5, s * 8, 2.9, "#FFF7C2");
          c.strokeStyle = "#7A1F55"; c.lineWidth = 1.1;
          c.beginPath();
          for (const k of [-1, 0, 1]) {
            c.moveTo(L / 2 - 3.5 + k * 1.8, s * 10.6);
            c.lineTo(L / 2 - 3.5 + k * 2.8, s * 13.2);
          }
          c.stroke();
        }
        for (const s of [-1, 1]) heart(c, -L / 2 + 2.5, s * 8, 2.3, "#FF2D6F");
        // twinkles
        const spots = [[20, -16], [-22, 15], [-6, -17], [8, 17]];
        spots.forEach(([x, y], i) => {
          const a = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
          if (a > 0.15) sparkle(c, x, y, 1.5 + 2.6 * a, `rgba(255,255,255,${a.toFixed(2)})`);
        });
      },
    },
    {
      id: "jonah", owner: "Jonah", name: "Red Rocket GT", color: "#E3222B",
      tagline: "A real red sports car: low, fast and loud",
      stats: { speed: 5, grip: 3, boost: 5 },
      trail: { kind: "spark", colors: ["#FF4A3D", "#FFB23D", "#FFE08A"] },
      draw(c) {
        const L = 56, W = 26;
        shadow(c, L, W, 8);
        tire(c, 16, -12.5, 12, 6); tire(c, 16, 12.5, 12, 6);
        tire(c, -16, -13.5, 14, 7); tire(c, -16, 13.5, 14, 7);
        c.beginPath();
        c.moveTo(-L / 2 + 3, -W / 2);
        c.lineTo(L / 2 - 14, -W / 2 + 1.5);
        c.quadraticCurveTo(L / 2, -W / 2 + 4, L / 2, 0);
        c.quadraticCurveTo(L / 2, W / 2 - 4, L / 2 - 14, W / 2 - 1.5);
        c.lineTo(-L / 2 + 3, W / 2);
        c.quadraticCurveTo(-L / 2, W / 2, -L / 2, W / 2 - 3);
        c.lineTo(-L / 2, -W / 2 + 3);
        c.quadraticCurveTo(-L / 2, -W / 2, -L / 2 + 3, -W / 2);
        c.closePath();
        c.fillStyle = grad(c, -W / 2, W / 2, ["#FF5A4F", "#E3222B", "#A3101A"]); c.fill();
        c.save(); c.clip();
        c.fillStyle = "#FFFFFF"; c.fillRect(-L / 2, -5.5, L, 3.2); c.fillRect(-L / 2, 2.3, L, 3.2);
        c.fillStyle = "#1A1A1A"; c.fillRect(-L / 2, -4.7, L, 1.6); c.fillRect(-L / 2, 3.1, L, 1.6);
        c.restore();
        // side vents
        c.strokeStyle = "#5C0A10"; c.lineWidth = 1.2;
        c.beginPath();
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { c.moveTo(-4 - k * 3, s * 9); c.lineTo(-7 - k * 3, s * 11.5); }
        c.stroke();
        // cockpit
        c.beginPath(); c.moveTo(1, -9.5); c.lineTo(12, -7); c.lineTo(12, 7); c.lineTo(1, 9.5); c.closePath();
        c.fillStyle = "#1C2230"; c.fill();
        c.strokeStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.moveTo(5, -6); c.lineTo(10, -2); c.stroke();
        rr(c, -13, -9, 14, 18, 4); c.fillStyle = "#C4161F"; c.fill();
        c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(-6, 0, 4.6, 0, TAU); c.fill();
        c.save(); c.translate(-6, 0); c.rotate(Math.PI / 2);
        c.fillStyle = "#E3222B"; c.font = "900 7px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("7", 0, 0.5); c.restore();
        // spoiler
        rr(c, -L / 2 - 3, -W / 2 - 2.5, 6, W + 5, 1.5); c.fillStyle = "#1A1A1A"; c.fill();
        c.fillStyle = "#E3222B"; c.fillRect(-L / 2 - 3, -W / 2 - 2.5, 6, 2.5); c.fillRect(-L / 2 - 3, W / 2, 6, 2.5);
        // slim headlights + taillights
        c.strokeStyle = "#FFF6D0"; c.lineWidth = 2.2; c.lineCap = "round";
        c.beginPath(); c.moveTo(L / 2 - 8, -9.5); c.lineTo(L / 2 - 3, -6); c.moveTo(L / 2 - 8, 9.5); c.lineTo(L / 2 - 3, 6); c.stroke();
        c.fillStyle = "#FF1F3A"; c.fillRect(-L / 2 + 3.5, -10, 2, 5); c.fillRect(-L / 2 + 3.5, 5, 2, 5);
      },
    },
    {
      id: "reuben", owner: "Reuben", name: "Blue Thunder", color: "#2F6BFF",
      tagline: "Bright blue with a lightning bolt on the hood",
      stats: { speed: 5, grip: 4, boost: 4 },
      trail: { kind: "ring", colors: ["#6FB6FF", "#FFFFFF", "#2F6BFF"] },
      draw(c) {
        const L = 50, W = 28;
        shadow(c, L, W, 9);
        tires(c, 15, -15, 13.5, 12, 6.5);
        rr(c, -L / 2, -W / 2, L, W, 9);
        c.fillStyle = grad(c, -W / 2, W / 2, ["#6A9DFF", "#2F6BFF", "#1542C0"]); c.fill();
        c.lineWidth = 1.5; c.strokeStyle = "#0F2F8A"; c.stroke();
        // white edge stripes
        c.fillStyle = "#FFFFFF"; c.fillRect(-L / 2 + 5, -W / 2 + 2, L - 12, 1.6); c.fillRect(-L / 2 + 5, W / 2 - 3.6, L - 12, 1.6);
        // lightning bolt on the hood (points forward)
        c.beginPath();
        c.moveTo(24, -2); c.lineTo(17, -6); c.lineTo(18.5, -1); c.lineTo(12, -4);
        c.lineTo(15, 3.5); c.lineTo(13.5, -0.5); c.lineTo(20, 2.5); c.lineTo(18.5, -2.5); c.closePath();
        c.fillStyle = "#FFE14D"; c.fill(); c.strokeStyle = "#FFFFFF"; c.lineWidth = 0.8; c.stroke();
        glass(c, 3, -10, 7.5, 20, 3, "#A8D4FF");
        rr(c, -15, -10, 18, 20, 5); c.fillStyle = "#2358E0"; c.fill();
        c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(-6, 0, 5, 0, TAU); c.fill();
        c.save(); c.translate(-6, 0); c.rotate(Math.PI / 2);
        c.fillStyle = "#2F6BFF"; c.font = "900 7.5px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("R", 0, 0.5); c.restore();
        glass(c, -21, -8, 4, 16, 2, "#A8D4FF");
        for (const s of [-1, 1]) { lamp(c, L / 2 - 3.5, s * 9, 2.8, "#FFFBE0"); c.fillStyle = "#FF2A2A"; c.fillRect(-L / 2 + 1, s * 9 - 2.5, 2, 5); }
      },
    },
    {
      id: "sunny", owner: null, name: "Sunny Zoom", color: "#FFC21A",
      tagline: "A happy yellow buggy with a smiley sun",
      stats: { speed: 4, grip: 5, boost: 4 },
      trail: { kind: "star", colors: ["#FFD23F", "#FF9F1C", "#FFFFFF"] },
      draw(c, t) {
        const L = 44, W = 28;
        shadow(c, L, W, 13);
        tires(c, 12, -12, 13, 11, 6.5);
        rr(c, -L / 2, -W / 2, L, W, 13);
        c.fillStyle = grad(c, -W / 2, W / 2, ["#FFE06A", "#FFC21A", "#E89A00"]); c.fill();
        c.lineWidth = 1.5; c.strokeStyle = "#B87300"; c.stroke();
        glass(c, 4, -9, 6.5, 18, 3, "#BDEBFF");
        // smiling sun on the roof, rays slowly spinning
        c.save(); c.translate(-6, 0); c.rotate(t * 0.8);
        star(c, 0, 0, 10, "#FF8C1A", 10, 0.62);
        c.restore();
        lamp(c, -6, 0, 6.2, "#FFE45C");
        c.save(); c.translate(-6, 0); c.rotate(Math.PI / 2);
        c.fillStyle = "#7A4A00"; lamp(c, -2, -1.4, 0.9, "#7A4A00"); lamp(c, 2, -1.4, 0.9, "#7A4A00");
        c.strokeStyle = "#7A4A00"; c.lineWidth = 1; c.beginPath(); c.arc(0, 0.6, 2.4, 0.2, Math.PI - 0.2); c.stroke();
        c.restore();
        for (const s of [-1, 1]) { lamp(c, L / 2 - 4, s * 8, 3, "#FFFFFF"); lamp(c, -L / 2 + 3, s * 8, 1.8, "#FF4D2E"); }
      },
    },
    {
      id: "gator", owner: null, name: "Green Gator", color: "#27B356",
      tagline: "A monster truck with giant wheels and big teeth",
      stats: { speed: 3, grip: 5, boost: 5 },
      trail: { kind: "mud", colors: ["#7A5230", "#9B6B3D", "#5E3E22"] },
      draw(c) {
        const L = 48, W = 26;
        shadow(c, L + 6, W + 10, 8);
        tires(c, 14, -14, 15.5, 17, 10);
        rr(c, -L / 2, -W / 2, L, W, 7);
        c.fillStyle = grad(c, -W / 2, W / 2, ["#5ADB80", "#27B356", "#157A37"]); c.fill();
        c.lineWidth = 1.5; c.strokeStyle = "#0E5A27"; c.stroke();
        // scales
        c.fillStyle = "rgba(10,70,30,.35)";
        for (let x = -18; x <= -2; x += 5) for (const y of [-7, 0, 7]) lamp(c, x, y, 1.6, "rgba(10,70,30,.35)");
        // teeth along the front bumper
        c.fillStyle = "#FFFFFF";
        c.beginPath();
        for (let y = -10; y < 10; y += 4) { c.moveTo(L / 2, y); c.lineTo(L / 2 - 4, y + 2); c.lineTo(L / 2, y + 4); }
        c.fill();
        glass(c, 4, -9, 7, 18, 2.5, "#B8F0C8");
        // googly eyes on the hood
        for (const s of [-1, 1]) { lamp(c, 16, s * 5, 3.6, "#FFFFFF"); lamp(c, 17.2, s * 5, 1.7, "#111111"); }
        rr(c, -L / 2 + 2, -W / 2 - 1.5, 5, W + 3, 1.5); c.fillStyle = "#333"; c.fill();
      },
    },
    {
      id: "comet", owner: null, name: "Purple Comet", color: "#7B4DFF",
      tagline: "A starry space racer with a rocket on the back",
      stats: { speed: 5, grip: 4, boost: 4 },
      trail: { kind: "star", colors: ["#B69BFF", "#FFFFFF", "#7BE0FF"] },
      draw(c, t) {
        const L = 52, W = 24;
        shadow(c, L, W, 10);
        tires(c, 15, -15, 12, 11, 6);
        // rocket flame
        const f = 6 + Math.sin(t * 30) * 2;
        c.beginPath(); c.moveTo(-L / 2 - 2, -4); c.lineTo(-L / 2 - 4 - f, 0); c.lineTo(-L / 2 - 2, 4); c.closePath();
        c.fillStyle = "#FFB23D"; c.fill();
        c.beginPath(); c.moveTo(-L / 2 - 2, -2); c.lineTo(-L / 2 - 2 - f * 0.6, 0); c.lineTo(-L / 2 - 2, 2); c.closePath();
        c.fillStyle = "#FFF3B0"; c.fill();
        c.beginPath();
        c.moveTo(-L / 2, -W / 2 + 2); c.lineTo(L / 2 - 16, -W / 2);
        c.quadraticCurveTo(L / 2 + 2, -4, L / 2 + 2, 0); c.quadraticCurveTo(L / 2 + 2, 4, L / 2 - 16, W / 2);
        c.lineTo(-L / 2, W / 2 - 2); c.closePath();
        c.fillStyle = grad(c, -W / 2, W / 2, ["#A88BFF", "#7B4DFF", "#4B23C4"]); c.fill();
        c.lineWidth = 1.5; c.strokeStyle = "#2E1485"; c.stroke();
        for (const [x, y, r] of [[18, -4, 2], [-18, 6, 1.6], [-10, -8, 1.4], [10, 7, 1.5], [-20, -5, 1.2]]) star(c, x, y, r * 1.6, "#FFFFFF", 5, 0.45, -Math.PI / 2);
        c.beginPath(); c.ellipse(0, 0, 11, 7, 0, 0, TAU);
        const g = c.createRadialGradient(3, -2, 1, 0, 0, 11); g.addColorStop(0, "#E6F7FF"); g.addColorStop(1, "#6FC8FF");
        c.fillStyle = g; c.fill(); c.strokeStyle = "#2E1485"; c.lineWidth = 1; c.stroke();
        rr(c, -L / 2 - 3, -5, 4, 10, 1.5); c.fillStyle = "#555"; c.fill();
        for (const s of [-1, 1]) lamp(c, L / 2 - 6, s * 6, 2, "#7BE0FF");
      },
    },
  ];

  // Stats (1–5) turned into driving numbers. Kept close so any car can win.
  for (const car of CARS) {
    const s = car.stats;
    car.phys = {
      maxSpeed: 350 + s.speed * 16,
      accel: 230 + s.boost * 18,
      turn: 2.45 + s.grip * 0.13,
      grip: 4.5 + s.grip * 1.1,
      boostTime: 0.85 + s.boost * 0.1,
    };
  }

  RC.CARS = CARS;
  RC.byId = Object.fromEntries(CARS.map((c) => [c.id, c]));
  RC.art = { rr, heart, star, sparkle };
})();
