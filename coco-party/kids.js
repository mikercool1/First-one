"use strict";
// Reuben, Jonah and Ellie, copied from Backyard Baseball so they look exactly the same in every game.
// Coco Party: bundled up for the snow in puffy coats, snow pants, boots, mittens, scarves and hats.
// KIDS_ART.draw(c, id, x, y, scale, pose, t) with pose { pose, exp, face, ph }. Origin at the feet.
const KIDS_ART = (() => {
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function RR(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function C(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
function E(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot, 0, TAU); }
function rgr(c, x, y, r, c0, c1) { const gr = c.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r * 1.05); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
function lgr(c, x0, y0, x1, y1, stops) { const gr = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; }
function fs(c, fill, stroke, lw) { c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke(); } }
function limb(c, x1, y1, x2, y2, bend, w, col, ol) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
  const cx = (x1 + x2) / 2 - dy / d * bend, cy = (y1 + y2) / 2 + dx / d * bend;
  c.lineCap = 'round';
  if (ol) { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.lineWidth = w + 3; c.strokeStyle = ol; c.stroke(); }
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.lineWidth = w; c.strokeStyle = col; c.stroke();
}
function smoothPath(c, pts, sx = 1, sy = 1) {
  const n = pts.length; c.beginPath();
  const m = i => [(pts[i][0] + pts[(i + 1) % n][0]) / 2 * sx, (pts[i][1] + pts[(i + 1) % n][1]) / 2 * sy];
  const s0 = m(n - 1); c.moveTo(s0[0], s0[1]);
  for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(pts[i][0] * sx, pts[i][1] * sy, e[0], e[1]); }
  c.closePath();
}
// ---------- characters ----------
const KIDS = {
  reuben: { name: 'REUBEN', tag: '#99', L: 46, T: 40, R: 23, sw: 15, legW: 11, skin: '#FFD8BE', skinD: '#E3A887', hair: '#F4D273', hairD: '#CFA23C', iris: '#3F86D9',
    shirt: '#FFFFFF', shirtD: '#D9E0EF', trim: '#1F2F6B', pants: '#F3F4F8', pantsD: '#C3C9D8', sock: '#1F2F6B', shoe: '#22326F', shoeD: '#111B45',
    num: '99', batLen: 80, batFat: 7.5, speed: 5.8, forgive: 1, color: '#1F2F6B', seed: 0.3, grip: '#1F2F6B' },
  jonah: { name: 'JONAH', tag: '#10', L: 36, T: 33, R: 22, sw: 13, legW: 9.5, skin: '#FFDCC6', skinD: '#E6AC8C', hair: '#7B4A26', hairD: '#4F2D13', iris: '#6A4526',
    shirt: '#FFFFFF', stripe: '#79C6F2', shirtD: '#D3E2EC', trim: '#1B1F33', shorts: '#1E2336', sock: '#FFFFFF', shoe: '#FF6A3D', shoeD: '#C44018',
    num: '10', batLen: 66, batFat: 6.5, speed: 5.6, forgive: 1.12, color: '#2F93D8', seed: 1.7, grip: '#1B1F33' },
  ellie: { name: 'ELLIE', tag: '', noBrows: true, L: 22, T: 30, R: 21.5, sw: 11, legW: 7.5, skin: '#FFE1CF', skinD: '#EBB39A', hair: '#5B2330', hairD: '#35121C', iris: '#6B3A2E',
    dress: '#F28AA8', dressD: '#C9607F', dressL: '#FFB9CB', sock: '#FFFFFF', shoe: '#FF9EBB', shoeD: '#D9678A',
    batLen: 92, batFat: 15, speed: 4.5, forgive: 1.32, color: '#E8559B', seed: 2.9, grip: '#E8559B' },
};
const ORDER = ['reuben', 'jonah', 'ellie'];
// winter outfits, in each kid's own colours
const WINTER = {
  reuben: { coat: '#2A3E8C', coatL: '#4A63B8', coatD: '#16224F', pants: '#2B2F3D', pantsD: '#15171F', boot: '#6B4A2E', bootD: '#3E2A18',
    hat: '#1F2F6B', hatD: '#101A44', band: '#FFFFFF', pom: '#FFFFFF', scarf: '#E4473F', scarfD: '#A8302A', mitt: '#E4473F', mittD: '#A8302A' },
  jonah: { coat: '#FF7A3D', coatL: '#FFA673', coatD: '#C44F18', pants: '#1E2336', pantsD: '#0C0F1C', boot: '#2F93D8', bootD: '#1B5E91',
    hat: '#79C6F2', hatD: '#3F8FC0', band: '#FFFFFF', pom: '#FF7A3D', scarf: '#79C6F2', scarfD: '#3F8FC0', mitt: '#79C6F2', mittD: '#3F8FC0' },
  ellie: { coat: '#F28AA8', coatL: '#FFB9CB', coatD: '#C9607F', pants: '#8A5AC8', pantsD: '#5E3A94', boot: '#FFFFFF', bootD: '#C9CFDA',
    hat: '#FFFFFF', hatD: '#D9DEE8', band: '#F28AA8', pom: '#FF9EBB', scarf: '#8A5AC8', scarfD: '#5E3A94', mitt: '#8A5AC8', mittD: '#5E3A94' },
};
// a pom-pom beanie, drawn in head space (radius R)
function beanie(c, W, R) {
  c.beginPath(); c.moveTo(-R * 1.06, -R * .3);
  c.bezierCurveTo(-R * 1.12, -R * 1.5, R * 1.12, -R * 1.5, R * 1.06, -R * .3); c.closePath();
  fs(c, lgr(c, -R, 0, R, 0, [W.hat, W.hat, W.hatD]), W.hatD, 1.6);
  c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1.4;
  for (const k of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.moveTo(k * R, -R * .5); c.quadraticCurveTo(k * R * 1.05, -R * .9, k * R * .7, -R * 1.2); c.stroke(); }
  RR(c, -R * 1.12, -R * .56, R * 2.24, R * .36, R * .16); fs(c, lgr(c, 0, -R * .56, 0, -R * .2, [W.band, shadeOf(W.band)]), shadeOf(shadeOf(W.band)), 1.4);
  c.strokeStyle = 'rgba(0,0,0,.1)'; c.lineWidth = 1.2; for (let x = -R; x < R; x += R * .2) { c.beginPath(); c.moveTo(x, -R * .52); c.lineTo(x, -R * .24); c.stroke(); }
  C(c, 0, -R * 1.34, R * .3); fs(c, rgr(c, 0, -R * 1.34, R * .3, '#FFFFFF', W.pom), shadeOf(W.pom), 1.2);
}

// swing keyframes: [sw, handX, handY, batVX, batVY, thickness]
const SWK = [
  [0.00, -10, -2, -0.30, -0.95, 1],
  [0.22, -6, 8, -0.95, -0.30, 1],
  [0.34, 4, 14, -0.12, -0.18, 1.35],
  [0.44, 14, 12, 1.00, -0.08, 1],
  [0.60, 12, 4, 0.45, -0.35, 0.85],
  [0.80, 2, -4, -0.55, -0.55, 0.85],
  [1.00, -4, -8, -0.45, -0.85, 1],
];
function swingKey(sw) {
  for (let i = 0; i < SWK.length - 1; i++) {
    const a = SWK[i], b = SWK[i + 1];
    if (sw <= b[0]) { const t = smooth((sw - a[0]) / (b[0] - a[0])); return a.map((v, j) => lerp(v, b[j], t)); }
  }
  return SWK[SWK.length - 1];
}

function drawBat(c, hx, hy, vx, vy, len, fat, id, th = 1, comp = 0) {
  const a = Math.atan2(vy, vx), L = len * Math.min(1.05, Math.hypot(vx, vy)) * (1 - comp * 0.1);
  const w = fat * th * (1 + comp * 0.4);
  c.save(); c.translate(hx, hy); c.rotate(a);
  c.beginPath(); c.moveTo(-7, -2.4); c.lineTo(L * 0.42, -w * 0.3);
  c.quadraticCurveTo(L * 0.78, -w * 0.56, L - w * 0.5, -w * 0.5);
  c.arc(L - w * 0.5, 0, w * 0.5, -Math.PI / 2, Math.PI / 2);
  c.quadraticCurveTo(L * 0.78, w * 0.56, L * 0.42, w * 0.3); c.lineTo(-7, 2.4); c.closePath();
  const wood = id === 'ellie' ? ['#FFF1D2', '#F4CF8E', '#C9924F'] : ['#FBE0AE', '#E0A865', '#AF7337'];
  fs(c, lgr(c, 0, -w / 2, 0, w / 2, wood), 'rgba(110,64,24,.55)', 2);
  c.fillStyle = 'rgba(255,255,255,.45)'; RR(c, L * 0.5, -w * 0.38, L * 0.4, w * 0.16, w * 0.08); c.fill();
  c.fillStyle = KIDS[id] ? KIDS[id].grip : '#333'; RR(c, -7, -3, L * 0.26, 6, 3); c.fill();
  C(c, -8, 0, 3.6); fs(c, KIDS[id] ? KIDS[id].grip : '#333');
  c.restore();
}

function drawEyes(c, K, fx, ey, R, look, blink, exp, t) {
  const lx = look[0] * R * 0.07, ly = look[1] * R * 0.07;
  const eyes = [[fx - R * 0.3, 1], [fx + R * 0.42, 0.82]];
  for (const [ex, sc] of eyes) {
    const rx = R * 0.22 * sc, ry = R * 0.28;
    if (blink || exp === 'wail' || exp === 'happy') {
      c.beginPath(); c.lineCap = 'round'; c.lineWidth = R * 0.075; c.strokeStyle = '#3A2A2A';
      if (exp === 'wail') { c.moveTo(ex - rx, ey - ry * 0.4); c.lineTo(ex + rx * 0.6, ey); c.lineTo(ex - rx, ey + ry * 0.4); }
      else if (exp === 'happy') { c.arc(ex, ey + ry * 0.2, rx * 0.9, Math.PI * 1.1, Math.PI * 1.9); }
      else { c.arc(ex, ey, rx * 0.9, Math.PI * 0.1, Math.PI * 0.9); }
      c.stroke(); continue;
    }
    const wide = exp === 'O' ? 1.15 : 1;
    E(c, ex, ey, rx * wide, ry * wide); fs(c, '#FFFFFF', 'rgba(60,40,40,.35)', R * 0.04);
    c.save(); E(c, ex, ey, rx * wide, ry * wide); c.clip();
    C(c, ex + lx * sc, ey + ly, R * 0.17 * sc); c.fillStyle = K.iris; c.fill();
    C(c, ex + lx * sc, ey + ly, R * 0.1 * sc); c.fillStyle = '#1A1320'; c.fill();
    C(c, ex + lx * sc - R * 0.06, ey + ly - R * 0.08, R * 0.06); c.fillStyle = '#fff'; c.fill();
    if (exp === 'annoyed') { c.fillStyle = K.skin; c.fillRect(ex - rx * 1.2, ey - ry * 1.3, rx * 2.4, ry * 1.15); c.strokeStyle = '#3A2A2A'; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(ex - rx, ey - ry * 0.15); c.lineTo(ex + rx, ey - ry * 0.15); c.stroke(); }
    c.restore();
  }
  if (K.noBrows) return;
  // brows
  c.strokeStyle = K.hairD; c.lineWidth = R * 0.085; c.lineCap = 'round';
  const bt = exp === 'mad' ? 0.28 : exp === 'annoyed' ? 0.12 : exp === 'wail' ? -0.3 : exp === 'O' ? -0.12 : 0;
  for (const [ex, sc, s] of [[fx - R * 0.3, 1, -1], [fx + R * 0.42, 0.82, 1]]) {
    const by = ey - R * 0.42 - (exp === 'O' ? R * 0.08 : 0);
    c.beginPath(); c.moveTo(ex - R * 0.16 * sc, by + (s < 0 ? bt : -bt) * R * -0.3); c.lineTo(ex + R * 0.16 * sc, by + (s < 0 ? -bt : bt) * R * -0.3 + (s > 0 ? 0 : 0)); c.stroke();
  }
}
function drawMouth(c, x, y, R, exp, t) {
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#6B2A2A'; c.lineWidth = R * 0.075;
  switch (exp) {
    case 'grin': case 'happy': {
      c.beginPath(); c.moveTo(x - R * 0.34, y - R * 0.04); c.quadraticCurveTo(x, y + R * 0.5, x + R * 0.34, y - R * 0.04); c.closePath();
      fs(c, '#8A2F36'); c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(x - R * 0.4, y - R * 0.1, R * 0.8, R * 0.12);
      E(c, x + R * 0.04, y + R * 0.3, R * 0.2, R * 0.12); c.fillStyle = '#FF8A95'; c.fill(); c.restore(); break;
    }
    case 'O': E(c, x, y + R * 0.1, R * 0.12, R * 0.16); fs(c, '#8A2F36'); break;
    case 'wail': { const o = Math.sin(t * 18) * R * 0.03; E(c, x, y + R * 0.12, R * 0.26, R * 0.2 + o); fs(c, '#8A2F36'); E(c, x, y + R * 0.24, R * 0.14, R * 0.07); c.fillStyle = '#FF8A95'; c.fill(); break; }
    case 'annoyed': c.beginPath(); c.moveTo(x - R * 0.2, y + R * 0.1); c.lineTo(x + R * 0.2, y + R * 0.04); c.stroke(); break;
    case 'mad': c.beginPath(); c.arc(x, y + R * 0.3, R * 0.22, Math.PI * 1.18, Math.PI * 1.82); c.stroke(); break;
    case 'smirk': c.beginPath(); c.moveTo(x - R * 0.18, y + R * 0.04); c.quadraticCurveTo(x + R * 0.06, y + R * 0.16, x + R * 0.3, y - R * 0.06); c.stroke(); break;
    case 'determined': c.beginPath(); c.moveTo(x - R * 0.14, y + R * 0.08); c.quadraticCurveTo(x, y + R * 0.12, x + R * 0.16, y + R * 0.06); c.stroke(); break;
    default: c.beginPath(); c.arc(x, y - R * 0.08, R * 0.24, Math.PI * 0.18, Math.PI * 0.82); c.stroke();
  }
}

const JONAH_HAIR = [[-1.0, 0.15], [-1.08, -0.45], [-0.85, -0.95], [-0.55, -1.28], [-0.22, -1.08], [0.05, -1.42], [0.3, -1.12], [0.62, -1.28], [0.74, -0.95], [1.02, -0.88], [0.97, -0.55], [1.0, -0.3], [0.72, -0.45], [0.46, -0.3], [0.16, -0.5], [-0.2, -0.36], [-0.5, -0.42], [-0.7, -0.1], [-0.8, 0.22]];
const ELLIE_HAIR = [[-1.06, 0.32], [-1.14, -0.4], [-0.84, -1.0], [-0.2, -1.22], [0.48, -1.12], [0.95, -0.76], [1.1, -0.26], [1.02, -0.14], [0.82, -0.2], [0.62, -0.15], [0.42, -0.21], [0.22, -0.15], [0.02, -0.21], [-0.18, -0.15], [-0.4, -0.21], [-0.62, -0.13], [-0.8, 0.38]];

let curFace = 1;
function drawHead(c, id, exp, look, blink, t, tilt = 0) {
  const K = KIDS[id], R = K.R;
  c.save(); c.rotate(tilt);
  // back hair
  if (id === 'reuben') { c.fillStyle = K.hair; E(c, -R * 0.45, R * 0.12, R * 0.66, R * 0.62); c.fill(); }
  if (id === 'ellie') {
    const sw = Math.sin(t * 3 + 1) * 0.12;
    for (const sd of [-1, 1]) {
      c.save(); c.translate(sd * R * 0.9, -R * 0.86); c.rotate(-sd * (2.05 + sw));
      c.beginPath(); c.moveTo(-R * 0.16, 0); c.quadraticCurveTo(-R * 0.42, R * 0.4, -R * 0.3, R * 0.72);
      c.lineTo(-R * 0.12, R * 0.58); c.lineTo(0, R * 0.8); c.lineTo(R * 0.12, R * 0.6); c.lineTo(R * 0.3, R * 0.74);
      c.quadraticCurveTo(R * 0.42, R * 0.4, R * 0.16, 0); c.closePath();
      fs(c, rgr(c, 0, R * 0.3, R * 0.7, '#8A4250', K.hair), K.hairD, 1.5);
      c.strokeStyle = 'rgba(255,200,210,.25)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-R * 0.06, R * 0.12); c.quadraticCurveTo(-R * 0.14, R * 0.4, -R * 0.08, R * 0.62); c.stroke();
      c.restore();
    }
  }
  // ear
  E(c, -R * 0.72, R * 0.1, R * 0.19, R * 0.25); fs(c, K.skin, K.skinD, 1.6);
  E(c, -R * 0.72, R * 0.12, R * 0.08, R * 0.13); c.fillStyle = K.skinD; c.fill();
  // head
  C(c, 0, 0, R); fs(c, rgr(c, 0, 0, R, '#FFF1E6', K.skin), K.skinD, 1.8);
  // hair / cap
  if (id === 'reuben') {
    c.fillStyle = K.hair;
    for (const [hx, hy, r] of [[-0.95, -0.02, 0.2], [-0.82, 0.22, 0.17], [-0.62, -0.12, 0.18], [0.38, -0.2, 0.14], [0.6, -0.16, 0.12]]) { C(c, hx * R, hy * R, r * R); c.fill(); }
  } else if (id === 'jonah') {
    const w = Math.sin(t * 5) * 0.03;
    smoothPath(c, JONAH_HAIR.map(([x, y], i) => [x, y + (i % 2 ? w : -w)]), R, R);
    fs(c, rgr(c, 0, -R * 0.8, R * 1.1, '#A56A3C', K.hair), K.hairD, 1.8);
    c.strokeStyle = 'rgba(255,220,180,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 0.4, -R * 0.95); c.quadraticCurveTo(R * 0.1, -R * 1.1, R * 0.5, -R * 0.9); c.stroke();
  } else {
    smoothPath(c, ELLIE_HAIR, R, R);
    fs(c, rgr(c, 0, -R * 0.8, R * 1.1, '#8A4250', K.hair), K.hairD, 1.8);
    c.strokeStyle = 'rgba(255,200,210,.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 0.5, -R * 0.9); c.quadraticCurveTo(R * 0.1, -R * 1.12, R * 0.6, -R * 0.8); c.stroke();
    c.strokeStyle = 'rgba(40,10,20,.3)'; c.lineWidth = 1.2; for (const bx of [-0.5, -0.1, 0.3, 0.7]) { c.beginPath(); c.moveTo(bx * R, -R * 0.55); c.lineTo(bx * R + 1, -R * 0.2); c.stroke(); }
    for (const sd of [-1, 1]) for (const [bx, by] of [[0.86, -0.88], [0.98, -0.74]]) { C(c, sd * bx * R, by * R, R * 0.12); fs(c, rgr(c, sd * bx * R, by * R, R * 0.12, '#FF9CC2', '#D63F77'), '#9E2355', 1.2); }
  }
  // face
  const fx = R * 0.2, ey = R * 0.12;
  C(c, fx - R * 0.55, R * 0.42, R * 0.17); c.fillStyle = 'rgba(255,120,130,.28)'; c.fill();
  C(c, fx + R * 0.62, R * 0.42, R * 0.13); c.fill();
  drawEyes(c, K, fx, ey, R, look, blink, exp, t);
  E(c, fx + R * 0.1, R * 0.34, R * 0.1, R * 0.08); c.fillStyle = K.skinD; c.fill();
  drawMouth(c, fx + R * 0.06, R * 0.58, R, exp, t);
  beanie(c, WINTER[id], R);
  if (exp === 'wail') { c.fillStyle = 'rgba(120,200,255,.85)'; const d = (t * 1.5) % 1; E(c, fx - R * 0.45, ey + R * 0.3 + d * R * 0.6, R * 0.07, R * 0.1); c.fill(); E(c, fx + R * 0.55, ey + R * 0.3 + ((d + 0.5) % 1) * R * 0.6, R * 0.06, R * 0.09); c.fill(); }
  c.restore();
}

// Main kid drawing, 3/4 view facing right. Origin at feet. Units: 100 = 1 world unit.
function drawKid(c, id, P, t) {
  const K = KIDS[id], L = K.L, T = K.T, R = K.R, sw = K.sw;
  const face = P.face || 1, pose = P.pose || 'idle';
  const tt = t + K.seed * 3;
  const blink = (tt % 3.4) < 0.13 && pose !== 'knees';
  let exp = P.exp || (id === 'ellie' ? 'grin' : 'smile'), look = P.look || [0.4, 0], tilt = 0;
  let jy = 0, crouch = 0, lean = 0;
  let fL = [-7, 0], fR = [7, 0], kneel = false;
  const S0y = -T + 8, sc = T / 40;
  let hN = [-10, S0y + 26], hF = [10, S0y + 26], bendN = 5, bendF = -5;
  let bat = null, glove = false, ball = false, point = false;
  const breathe = Math.sin(tt * 2.2) * 1.2;
  switch (pose) {
    case 'stance': case 'swing': {
      fL = [-15, 0]; fR = [13, 0]; crouch = 5;
      const sw = pose === 'swing' ? P.sw : 0;
      const k = swingKey(sw);
      let bvx = k[3], bvy = k[4];
      if (pose === 'stance') { const wg = Math.sin(tt * 3) * 0.06; bvx += wg; if (id === 'ellie') { bvx = -0.78 + Math.sin(tt * 2) * 0.06; bvy = -0.62; } }
      lean = pose === 'swing' ? lerp(-0.05, 0.12, clamp(sw * 2, 0, 1)) : (id === 'ellie' ? Math.sin(tt * 2) * 0.06 - 0.04 : -0.04);
      hN = [k[1] * sc, S0y + k[2] * sc]; hF = [hN[0] + bvx * 7, hN[1] + bvy * 7];
      bat = { x: hN[0], y: hN[1], vx: bvx, vy: bvy, th: k[5] };
      exp = P.exp || (id === 'ellie' ? 'grin' : 'determined'); look = [1, 0.1]; bendN = 8; bendF = 6;
      break;
    }
    case 'run': case 'runBall': {
      const ph = P.ph || 0, st = id === 'ellie' ? 8 : 14;
      fL = [Math.sin(ph) * st, -Math.max(0, Math.cos(ph)) * 7]; fR = [Math.sin(ph + Math.PI) * st, -Math.max(0, Math.cos(ph + Math.PI)) * 7];
      jy = -Math.abs(Math.sin(ph)) * (id === 'ellie' ? 3 : 5); lean = 0.16;
      hN = [-4 + Math.sin(ph + Math.PI) * 12, S0y + 22 + Math.cos(ph) * 4]; hF = [8 + Math.sin(ph) * 12, S0y + 20 - Math.cos(ph) * 4];
      bendN = -8; bendF = -8; exp = P.exp || 'grin'; look = [1, 0];
      if (pose === 'runBall') { hN = [-2, S0y - 30]; ball = true; exp = 'grin'; }
      break;
    }
    case 'armsUp': case 'jump': case 'lostMind': {
      const sp = pose === 'lostMind' ? 16 : 10, hop = pose === 'armsUp' ? 12 : pose === 'jump' ? 26 : 36;
      jy = -Math.abs(Math.sin(t * sp * 0.5 + K.seed)) * hop;
      const wv = Math.sin(t * sp) * 6;
      hN = [-20 + wv, S0y - 34]; hF = [20 - wv, S0y - 36]; bendN = 6; bendF = -6;
      fL = [-8, jy < -4 ? -4 : 0]; fR = [8, jy < -4 ? -6 : 0];
      exp = 'grin'; look = [0.3, -0.6];
      if (pose === 'lostMind') { lean = Math.sin(t * 9) * 0.25; exp = Math.sin(t * 4) > 0 ? 'grin' : 'O'; }
      break;
    }
    case 'cheer': {
      jy = -Math.abs(Math.sin(t * 5 + K.seed)) * 8;
      hN = [-16, S0y - 30 + Math.sin(t * 10) * 5]; hF = [14, S0y + 18]; exp = 'grin'; look = [0.6, -0.3];
      break;
    }
    case 'watch': {
      fL = [-9, 0]; fR = [11, 0];
      hN = [-14, -L + 2 - (-L) + S0y + 30]; hF = [16, S0y + 30]; tilt = -0.18; exp = id === 'reuben' ? 'smirk' : 'O'; look = [0.8, -1];
      break;
    }
    case 'lookUp': { hN = [-12, S0y + 28]; hF = [12, S0y + 28]; tilt = -0.22; exp = 'O'; look = [0.5, -1]; break; }
    case 'hips': { hN = [-17, S0y + 30]; hF = [15, S0y + 30]; bendN = -12; bendF = 12; exp = 'annoyed'; look = [1, 0.2]; tilt = 0.08; fL = [-11, 0]; fR = [11, 0]; break; }
    case 'knees': {
      kneel = true; crouch = L * 0.5;
      hN = [-24, S0y - 30 + Math.sin(t * 6) * 4]; hF = [22, S0y - 34 + Math.cos(t * 6) * 4]; exp = 'wail'; tilt = -0.22; lean = -0.12;
      break;
    }
    case 'point': {
      hN = [-16, S0y + 30]; bendN = -12; hF = [36, S0y + 2]; point = true; exp = 'mad'; look = [1, 0];
      jy = Math.sin(t * 14) > 0.7 ? -3 : 0; fL = [-8, 0]; fR = [9, jy];
      break;
    }
    case 'shoulder': {
      hN = [4, S0y + 4]; hF = [14, S0y + 30]; bat = { x: 4, y: S0y + 4, vx: -0.62, vy: -0.72, th: 1 }; exp = 'smirk'; look = [0.6, 0];
      fL = [-10, 0]; fR = [10, 0];
      break;
    }
    case 'glove': {
      hF = [16, S0y + 6]; hN = [2 + Math.sin(t * 6) * 2, S0y + 12]; glove = true; exp = 'grin'; bendF = -4;
      break;
    }
    case 'triumph': {
      const wob = Math.sin(t * 3) * 0.08;
      hN = [2, S0y - 26]; hF = [8, S0y - 30]; bat = { x: 2, y: S0y - 26, vx: 0.35 + wob, vy: -0.94, th: 1 }; exp = 'grin'; look = [0.4, -0.5];
      jy = -Math.abs(Math.sin(t * 3)) * 5; fL = [-10, 0]; fR = [10, 0];
      break;
    }
    case 'wave': { hF = [22, S0y - 30 + Math.sin(t * 8) * 4]; hN = [-12, S0y + 28]; exp = 'grin'; break; }
    default: {
      hN = [-13, S0y + 30 + breathe * 0.5]; hF = [13, S0y + 30 + breathe * 0.5];
      if (P.bat) { hN = [-6, S0y + 24]; bat = { x: -6, y: S0y + 24, vx: 0.4, vy: 0.92, th: 1 }; }
    }
  }
  c.save();
  c.scale(face, 1);
  c.translate(0, jy);
  const hipY = -L + crouch;
  // legs
  const W = WINTER[id], legCol = W.pants, legOl = W.pantsD;
  const legs = [[-4, fL, true], [4, fR, false]];
  for (const [hx, f, back] of legs) {
    const fx = f[0], fy = kneel ? -2 : f[1];
    if (kneel) {
      const kx = hx + 10, ky = -6;
      limb(c, hx, hipY, kx, ky, 0, K.legW, legCol, legOl); limb(c, kx, ky, kx - 18, -4, 0, K.legW - 1, legCol, legOl);
      E(c, kx - 22, -5, 9, 6); fs(c, W.boot, W.bootD, 1.5);
      continue;
    }
    limb(c, hx, hipY, fx, fy - 4, 5, K.legW, back ? shadeOf(legCol) : legCol, legOl);
    // snow boots with a fuzzy cuff
    limb(c, lerp(hx, fx, 0.68), lerp(hipY, fy - 4, 0.68), fx, fy - 4, 0, K.legW * 1.25, W.boot, W.bootD);
    E(c, fx + 4, fy - 4, K.legW * 1.15, K.legW * 0.62); fs(c, lgr(c, 0, fy - 9, 0, fy, [W.boot, W.bootD]), W.bootD, 1.4);
    E(c, lerp(hx, fx, 0.68), lerp(hipY, fy - 4, 0.68), K.legW * 0.8, K.legW * 0.34); fs(c, '#FFFFFF', '#D9DEE8', 1);
    c.fillStyle = '#3A2A20'; RR(c, fx - 6, fy - 2, K.legW * 2.2, 2.6, 1.2); c.fill();
  }
  c.save(); c.translate(0, hipY); c.rotate(lean);
  const shN = [-sw * 0.55, S0y], shF = [sw * 0.55, S0y];
  const skin = K.skin, sleeve = W.coat, armW = 9 * Math.max(0.85, sc);
  // far arm
  limb(c, shF[0], shF[1], hF[0], hF[1], bendF, armW, W.coatD, shadeOf(W.coatD));
  C(c, hF[0], hF[1], 5.4); fs(c, shadeOf(W.mitt), W.mittD, 1.3);
  if (glove) { c.save(); c.translate(hF[0] + 3, hF[1] - 2); E(c, 0, 0, 11, 13, 0.3); fs(c, rgr(c, 0, 0, 13, '#C98A4E', '#8A5424'), '#5E3512', 2); c.strokeStyle = '#5E3512'; c.lineWidth = 1.4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, -9); c.lineTo(i * 4, 2); c.stroke(); } c.restore(); }
  // torso
  if (id === 'ellie') {
    const wv = Math.sin(tt * 3) * 1.5;
    c.beginPath(); c.moveTo(-sw - 1, -T + 1); c.quadraticCurveTo(-sw - 3, -T * 0.4, -sw - 6 - wv, 8);
    c.quadraticCurveTo(0, 12 + wv, sw + 6 + wv, 8); c.quadraticCurveTo(sw + 3, -T * 0.4, sw + 1, -T + 1); c.quadraticCurveTo(0, -T - 4, -sw - 1, -T + 1); c.closePath();
    fs(c, lgr(c, -sw, 0, sw, 0, [W.coatL, W.coat, W.coatD]), W.coatD, 1.8);
    for (const by of [-T * 0.7, -T * 0.4, -T * 0.1]) { C(c, 3, by, 1.8); fs(c, '#FFFFFF', W.coatD, 0.8); }
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(-sw - 6 - wv, 8); c.quadraticCurveTo(0, 12 + wv, sw + 6 + wv, 8); c.lineTo(sw + 5 + wv, 5); c.quadraticCurveTo(0, 8 + wv, -sw - 5 - wv, 5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(150,50,80,.22)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -T * 0.55); c.quadraticCurveTo(-5 + wv, -T * 0.1, -4, 6); c.moveTo(6, -T * 0.4); c.quadraticCurveTo(8 - wv, -T * 0.05, 7, 7); c.stroke();
    c.beginPath(); c.moveTo(-6, -T + 0.5); c.quadraticCurveTo(0, -T + 6, 6, -T + 0.5); c.strokeStyle = K.dressD; c.lineWidth = 1.6; c.stroke();
    E(c, shN[0] - 1, shN[1] + 4, 8.5, 9.5, 0.3); fs(c, W.coatL, W.coatD, 1.4);
  } else {
    // puffy jacket: rounded quilted rows and a zipper
    RR(c, -sw - 2, -T - 1, sw * 2 + 4, T + 6, 11);
    c.save(); c.clip();
    c.fillStyle = lgr(c, -sw, 0, sw, 0, [W.coatL, W.coat, W.coatD]); c.fillRect(-sw - 4, -T - 4, sw * 2 + 8, T + 12);
    for (let y = -T + 9; y < 4; y += 9) { c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-sw - 2, y); c.quadraticCurveTo(0, y + 2.5, sw + 2, y); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-sw, y - 5); c.quadraticCurveTo(0, y - 3, sw, y - 5); c.stroke(); }
    c.restore();
    RR(c, -sw - 2, -T - 1, sw * 2 + 4, T + 6, 11); c.lineWidth = 1.8; c.strokeStyle = W.coatD; c.stroke();
    c.strokeStyle = shadeOf(W.coatD); c.lineWidth = 1.6; c.beginPath(); c.moveTo(sw * 0.3, -T + 2); c.lineTo(sw * 0.3, 4); c.stroke();
    RR(c, sw * 0.3 - 1.8, -T + 8, 3.6, 6, 1.4); c.fillStyle = '#D9DEE8'; c.fill();
    C(c, shN[0], shN[1] + 1, 8); fs(c, W.coatL, W.coatD, 1.4);
  }
  // scarf around the neck, one end hanging down the front
  const W2 = W;
  RR(c, -sw * 0.75, -T - 4, sw * 1.5, 8, 4); fs(c, W2.scarf, W2.scarfD, 1.3);
  c.save(); c.translate(-sw * 0.25, -T + 2); c.rotate(0.12 + Math.sin(tt * 2.4) * 0.05);
  RR(c, -3.2, 0, 6.4, T * 0.5, 2.5); fs(c, W2.scarf, W2.scarfD, 1.2);
  c.strokeStyle = W2.scarfD; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 1.4, T * 0.5); c.lineTo(i * 1.4, T * 0.5 + 3); c.stroke(); }
  c.restore();
  // head
  curFace = face; c.save(); c.translate(2, -T - R + 9); drawHead(c, id, exp, look, blink, tt, tilt); c.restore(); curFace = 1;
  // bat
  if (bat) drawBat(c, bat.x, bat.y, bat.vx, bat.vy, K.batLen, K.batFat, id, bat.th, P.comp || 0);
  // near arm
  limb(c, shN[0], shN[1], hN[0], hN[1], bendN, armW, sleeve, W.coatD);
  if (id === 'ellie') E(c, shN[0] - 1, shN[1] + 4, 8.5, 9.5, 0.3); else C(c, shN[0], shN[1] + 1, 7.5); fs(c, W.coatL, W.coatD, 1.3);
  // mitten with a little thumb
  C(c, hN[0], hN[1], 5.8); fs(c, W.mitt, W.mittD, 1.3);
  E(c, hN[0] + 4, hN[1] - 3, 2.4, 3.2, 0.5); fs(c, W.mitt, W.mittD, 1);
  if (point) { limb(c, hF[0], hF[1], hF[0] + 8, hF[1] - 1, 0, 3.6, W.mitt, W.mittD); }
  if (ball) drawBall(c, hN[0], hN[1] - 7, 7, 0, t);
  c.restore();
  c.restore();
}
function shadeOf(col) {
  const m = /^#(..)(..)(..)$/.exec(col); if (!m) return col;
  const f = v => Math.round(parseInt(v, 16) * 0.88).toString(16).padStart(2, '0');
  return '#' + f(m[1]) + f(m[2]) + f(m[3]);
}

// Neighbourhood kids (front view)
const NB = {
  pitcher: { L: 42, T: 36, R: 22, sw: 14, skin: '#F5C6A0', skinD: '#D69A74', shirt: '#4CC06A', shirtD: '#2F8E49', shorts: '#3C6FD1', cap: '#E84A4A', hair: '#E08A3C', shoe: '#FFFFFF' },
  frank: { L: 58, T: 54, R: 26, sw: 19, skin: '#F2C4A2', skinD: '#CF967A', shirt: '#2EC4B6', shirtD: '#1B8F84', shorts: '#D9C08F', cap: null, bald: true, hair: '#C9C9C9', shoe: '#7A4A26', flowers: true },
  fielder: { L: 40, T: 34, R: 21, sw: 13, skin: '#C98A5E', skinD: '#9C6440', shirt: '#FF9F3D', shirtD: '#D47414', shorts: '#5A4FCF', cap: null, hair: '#2A1A12', shoe: '#FFE14D' },
};
function drawBall(c, x, y, r) {
  C(c, x, y, r); fs(c, rgr(c, x, y, r, '#FFFFFF', '#E3E1DA'), 'rgba(90,80,70,.4)', Math.max(0.6, r * 0.08));
  c.strokeStyle = '#E0473F'; c.lineWidth = Math.max(0.6, r * 0.12);
  c.beginPath(); c.arc(x - r * 1.25, y, r * 0.95, -0.6, 0.6); c.stroke();
  c.beginPath(); c.arc(x + r * 1.25, y, r * 0.95, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
}
  function draw(c, id, x, y, s, P, t) { c.save(); c.translate(x, y); c.scale(s, s); shadowAt(c, 0, 1, 26, 6, .25); drawKid(c, id, P, t); c.restore(); }
  function shadowAt(c, x, y, rx, ry, a) { const gr = c.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(60,35,20,${a})`); gr.addColorStop(1, "rgba(60,35,20,0)"); c.fillStyle = gr; E(c, x, y, rx, ry); c.fill(); }
  return { draw, KIDS };
})();
