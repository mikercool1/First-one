"use strict";
// 360 Snowboarding: the eight boards, drawn from above.
// BOARDS.draw(c, id, len, wid, t): centred at 0,0, nose pointing right.
const BOARDS = (() => {
  const TAU = Math.PI * 2;
  const LIST = [
    { id: "fire", name: "FIRE BOARD" },
    { id: "ice", name: "ICE BOARD" },
    { id: "watermelon", name: "WATERMELON BOARD" },
    { id: "lightning", name: "LIGHTNING BOARD" },
    { id: "galaxy", name: "GALAXY BOARD" },
    { id: "shark", name: "SHARK BOARD" },
    { id: "gold", name: "GOLD BOARD" },
    { id: "coco", name: "COCO BOARD" },
  ];
  // board outline: a long capsule with slightly tapered, upturned ends
  function outline(c, L, W) {
    const r = W / 2;
    c.beginPath();
    c.moveTo(-L / 2 + r, -r);
    c.quadraticCurveTo(0, -r * 0.82, L / 2 - r, -r);
    c.arc(L / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
    c.quadraticCurveTo(0, r * 0.82, -L / 2 + r, r);
    c.arc(-L / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
    c.closePath();
  }
  function star(c, x, y, r, k = 0.45) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * k : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }

  function art(c, id, L, W, t) {
    const h = W / 2;
    switch (id) {
      case "fire": {
        c.fillStyle = "#17171C"; c.fillRect(-L / 2, -h, L, W);
        const flame = (x0, len, col) => {
          c.fillStyle = col; c.beginPath(); c.moveTo(x0, -h);
          for (let k = 0; k <= 6; k++) { const x = x0 + (k / 6) * len, tip = k % 2 ? -h * 0.1 + Math.sin(t * 6 + k) * h * 0.08 : -h; c.lineTo(x, tip); }
          c.lineTo(x0 + len, h);
          for (let k = 6; k >= 0; k--) { const x = x0 + (k / 6) * len * 0.92, tip = k % 2 ? h * 0.1 : h; c.lineTo(x, tip); }
          c.closePath(); c.fill();
        };
        flame(-L / 2, L * 0.62, "#E8421A"); flame(-L / 2, L * 0.46, "#FF8A1A"); flame(-L / 2, L * 0.3, "#FFD23F");
        break;
      }
      case "ice": {
        c.fillStyle = lin(c, 0, -h, 0, h, ["#E8F8FF", "#8FD6FF", "#3F9FE0"]); c.fillRect(-L / 2, -h, L, W);
        c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = Math.max(1, W * 0.04);
        for (let k = 0; k < 7; k++) { const x = -L / 2 + (k + 0.5) * L / 7; c.beginPath(); c.moveTo(x - W * 0.3, -h); c.lineTo(x + W * 0.2, 0); c.lineTo(x - W * 0.1, h); c.stroke(); }
        c.save(); c.translate(L * 0.05, 0); c.strokeStyle = "#FFFFFF"; c.lineWidth = Math.max(1.5, W * 0.06);
        for (let k = 0; k < 6; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(h * 0.8, 0); c.moveTo(h * 0.5, 0); c.lineTo(h * 0.65, -h * 0.18); c.moveTo(h * 0.5, 0); c.lineTo(h * 0.65, h * 0.18); c.stroke(); }
        c.restore();
        break;
      }
      case "watermelon": {
        c.fillStyle = "#2E9A4E"; c.fillRect(-L / 2, -h, L, W);
        c.fillStyle = "#FFFFFF"; c.fillRect(-L / 2, -h * 0.72, L, h * 1.44);
        c.fillStyle = "#FF5C7A"; c.fillRect(-L / 2, -h * 0.6, L, h * 1.2);
        c.fillStyle = "#1E1E24";
        for (let k = 0; k < 11; k++) { const x = -L / 2 + (k + 0.5) * L / 11, y = (k % 2 ? -1 : 1) * h * 0.28; c.beginPath(); c.ellipse(x, y, W * 0.05, W * 0.09, k % 2 ? 0.4 : -0.4, 0, TAU); c.fill(); }
        break;
      }
      case "lightning": {
        c.fillStyle = "#1D2250"; c.fillRect(-L / 2, -h, L, W);
        const bolt = (x, col, s) => { c.fillStyle = col; c.beginPath(); c.moveTo(x - W * 0.3 * s, -h); c.lineTo(x + W * 0.25 * s, -h); c.lineTo(x, -h * 0.05); c.lineTo(x + W * 0.35 * s, -h * 0.05); c.lineTo(x - W * 0.3 * s, h); c.lineTo(x - W * 0.05 * s, h * 0.1); c.lineTo(x - W * 0.4 * s, h * 0.1); c.closePath(); c.fill(); };
        for (let k = 0; k < 4; k++) bolt(-L * 0.36 + k * L * 0.24, k % 2 ? "#FFE14D" : "#FFFFFF", 1);
        c.globalAlpha = 0.35 + Math.abs(Math.sin(t * 5)) * 0.4; c.strokeStyle = "#FFE14D"; c.lineWidth = Math.max(1, W * 0.05); outline(c, L * 0.96, W * 0.86); c.stroke(); c.globalAlpha = 1;
        break;
      }
      case "galaxy": {
        c.fillStyle = lin(c, -L / 2, 0, L / 2, 0, ["#1B0B3A", "#5B2A9E", "#2A1263", "#9B3FC4"]); c.fillRect(-L / 2, -h, L, W);
        for (let k = 0; k < 26; k++) { const x = -L / 2 + ((k * 97) % 100) / 100 * L, y = (((k * 61) % 100) / 100 - 0.5) * W; c.fillStyle = k % 5 ? "rgba(255,255,255,.85)" : "#FFD23F"; c.beginPath(); c.arc(x, y, Math.max(0.8, W * (k % 3 ? 0.015 : 0.03)), 0, TAU); c.fill(); }
        c.save(); c.translate(L * 0.18, 0); c.fillStyle = "#FF8FC7"; c.beginPath(); c.arc(0, 0, h * 0.42, 0, TAU); c.fill();
        c.strokeStyle = "#FFD9A8"; c.lineWidth = Math.max(1, W * 0.05); c.beginPath(); c.ellipse(0, 0, h * 0.8, h * 0.2, -0.3, 0, TAU); c.stroke(); c.restore();
        c.fillStyle = "#FFFFFF"; star(c, -L * 0.22, -h * 0.2, h * 0.3); c.fill();
        break;
      }
      case "shark": {
        c.fillStyle = "#5C7C9A"; c.fillRect(-L / 2, -h, L, W);
        c.fillStyle = "#F2F6FA"; c.beginPath(); c.moveTo(-L / 2, h * 0.1); c.quadraticCurveTo(0, h * 0.2, L / 2, h * 0.05); c.lineTo(L / 2, h); c.lineTo(-L / 2, h); c.closePath(); c.fill();
        // grin with teeth near the nose
        c.fillStyle = "#8A1E2E"; c.beginPath(); c.moveTo(L * 0.22, h * 0.15); c.quadraticCurveTo(L * 0.34, h * 0.75, L * 0.46, h * 0.1); c.closePath(); c.fill();
        c.fillStyle = "#FFFFFF"; for (let k = 0; k < 5; k++) { const x = L * 0.24 + k * L * 0.045; c.beginPath(); c.moveTo(x, h * 0.16); c.lineTo(x + L * 0.02, h * 0.36); c.lineTo(x + L * 0.04, h * 0.16); c.closePath(); c.fill(); }
        c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(L * 0.36, -h * 0.35, W * 0.11, 0, TAU); c.fill(); c.fillStyle = "#1E1E24"; c.beginPath(); c.arc(L * 0.37, -h * 0.33, W * 0.06, 0, TAU); c.fill();
        c.fillStyle = "#3E5A76"; c.beginPath(); c.moveTo(-L * 0.08, -h * 0.1); c.lineTo(-L * 0.18, -h); c.lineTo(L * 0.06, -h * 0.1); c.closePath(); c.fill();
        c.strokeStyle = "rgba(30,50,70,.4)"; c.lineWidth = Math.max(1, W * 0.03); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(L * 0.1 - k * L * 0.04, -h * 0.5); c.lineTo(L * 0.08 - k * L * 0.04, h * 0.05); c.stroke(); }
        break;
      }
      case "gold": {
        c.fillStyle = lin(c, 0, -h, 0, h, ["#FFF6C2", "#FFD23F", "#C98A12", "#FFE58A"]); c.fillRect(-L / 2, -h, L, W);
        const sx = ((t * 0.6) % 1.6 - 0.3) * L - L / 2;
        c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.moveTo(sx, -h); c.lineTo(sx + W * 0.5, -h); c.lineTo(sx + W * 0.1, h); c.lineTo(sx - W * 0.4, h); c.closePath(); c.fill();
        c.fillStyle = "#FFFFFF";
        for (let k = 0; k < 5; k++) { const x = -L * 0.4 + k * L * 0.2, s = 0.5 + Math.abs(Math.sin(t * 4 + k)) * 0.6; star(c, x, (k % 2 ? -1 : 1) * h * 0.4, W * 0.12 * s, 0.3); c.fill(); }
        c.strokeStyle = "#A8740A"; c.lineWidth = Math.max(1, W * 0.04); outline(c, L * 0.94, W * 0.8); c.stroke();
        break;
      }
      case "coco": {
        // Coco Party: hot cocoa brown, whipped cream swirl, marshmallows and a steaming mug
        c.fillStyle = lin(c, -L / 2, 0, L / 2, 0, ["#5A3320", "#8A5A3C", "#5A3320"]); c.fillRect(-L / 2, -h, L, W);
        c.fillStyle = "#FFF4E6"; c.beginPath(); c.moveTo(-L / 2, -h * 0.25);
        for (let k = 0; k <= 12; k++) c.lineTo(-L / 2 + (k / 12) * L, -h * 0.25 + Math.sin(k * 1.4) * h * 0.2);
        c.lineTo(L / 2, -h * 0.55); c.lineTo(-L / 2, -h * 0.55); c.closePath(); c.fill();
        for (let k = 0; k < 7; k++) { const x = -L * 0.42 + k * L * 0.13; c.fillStyle = k % 2 ? "#FFD3E6" : "#FFFFFF"; c.beginPath(); c.ellipse(x, h * 0.45, W * 0.09, W * 0.07, 0.3, 0, TAU); c.fill(); }
        c.save(); c.translate(L * 0.02, h * 0.05);
        c.fillStyle = "#FF4F8B"; c.fillRect(-W * 0.22, -h * 0.35, W * 0.44, h * 0.6); c.strokeStyle = "#FF4F8B"; c.lineWidth = Math.max(1.5, W * 0.05); c.beginPath(); c.arc(W * 0.26, -h * 0.05, W * 0.1, -1.3, 1.3); c.stroke();
        c.fillStyle = "#FFFFFF"; c.font = `700 ${Math.max(6, W * 0.2)}px Fredoka, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("C", 0, -h * 0.05);
        c.restore();
        c.fillStyle = "#FFFFFF"; c.font = `400 ${Math.max(6, W * 0.26)}px "Lilita One", Fredoka, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("COCO", -L * 0.26, h * 0.02); c.fillText("PARTY", L * 0.3, h * 0.02);
        break;
      }
    }
  }
  function draw(c, id, L, W, t = 0) {
    c.save();
    outline(c, L, W); c.clip();
    art(c, id, L, W, t);
    // glossy top light
    c.fillStyle = "rgba(255,255,255,.14)"; c.fillRect(-L / 2, -W / 2, L, W * 0.2);
    c.restore();
    c.lineWidth = Math.max(1.2, W * 0.05); c.strokeStyle = "rgba(20,20,30,.75)"; outline(c, L, W); c.stroke();
    // bindings
    c.fillStyle = "rgba(20,24,40,.85)";
    for (const x of [-L * 0.2, L * 0.2]) { c.beginPath(); c.ellipse(x, 0, W * 0.2, W * 0.36, 0, 0, TAU); c.fill(); }
  }
  return { LIST, draw };
})();
