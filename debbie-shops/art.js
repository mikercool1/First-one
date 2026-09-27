// Debbie Shops: all character and prop artwork as SVG strings.
// Billy is drawn from a fullness value (0 slim to 1 very full), so he can grow smoothly.

const ART = (() => {
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Billy ----------
  // Local coordinates: centered on x = 0, seated on the couch (hips near y = 330).
  // s: { f, mood, mouth, eyes, arm (0..1 raise to mouth), chew, lean, sweat }
  function billy(s) {
    const f = s.f;
    const skin = "url(#gSkinB)", skinFlat = "#E2AE84", skinDk = "#C98E62";
    const hair = "#6B4527", sweater = "#22324A", sweaterHi = "#2F4466", pants = "#CDBB9C";
    const bw = 21 + 30 * f;              // half belly width
    const sw = 26 + 6 * f;               // half shoulder width
    const hemY = 336 - 9 * Math.max(0, f - 0.55);
    const lw = 10 + 5 * f;               // leg half width
    const lean = s.lean || 0;            // leans back when defeated
    let o = `<g transform="rotate(${-lean * 6} 0 340)">`;

    // legs (seated, knees forward)
    for (const side of [-1, 1]) {
      const x = side * (lw + 3);
      o += `<path d="M${x - lw} 332 L${x + lw} 332 L${x + lw + 1} 358 L${x - lw - 1} 358 Z" fill="${pants}"/>`;
      o += `<path d="M${x - lw + 2} 356 L${x + lw - 2} 356 L${x + lw - 3} 396 L${x - lw + 3} 396 Z" fill="#BFAB89"/>`;
      o += `<path d="M${x - lw + 1} 394 Q${x - lw - 2} 404 ${x - 2} 404 L${x + lw + 6 * side} 404 Q${x + lw + 7 * side} 398 ${x + lw - 2} 394 Z" fill="#5A3A28"/>`;
      o += `<rect x="${x - lw + 2}" y="394" width="${2 * lw - 4}" height="3" fill="#EDE3D3"/>`;
    }
    // belt + hips
    o += `<rect x="${-bw + 5}" y="${hemY - 2}" width="${2 * bw - 10}" height="12" rx="5" fill="${pants}"/>`;
    o += `<rect x="${-bw + 7}" y="${hemY + 1}" width="${2 * bw - 14}" height="4" rx="2" fill="#4A3223"/><rect x="-3" y="${hemY}" width="6" height="6" rx="1" fill="#C9A45C"/>`;
    // tummy peeking out when things get tight
    if (f > 0.62) {
      const gap = (f - 0.62) * 22;
      o += `<path d="M${-bw + 9} ${hemY - gap} Q0 ${hemY + 4} ${bw - 9} ${hemY - gap} L${bw - 9} ${hemY} L${-bw + 9} ${hemY} Z" fill="${skinFlat}"/>`;
      o += `<circle cx="0" cy="${hemY - gap * 0.35}" r="1.2" fill="${skinDk}"/>`;
    }
    // sweater torso
    const hemTop = hemY - (f > 0.62 ? (f - 0.62) * 22 : 0);
    o += `<path d="M${-sw} 248 C${-sw - 3} 268 ${-bw - 3} 282 ${-bw} 304 C${-bw + 1} 322 ${-bw + 6} ${hemTop} ${-bw + 10} ${hemTop}
      Q0 ${hemTop + 5} ${bw - 10} ${hemTop} C${bw - 6} ${hemTop} ${bw - 1} 322 ${bw} 304 C${bw + 3} 282 ${sw + 3} 268 ${sw} 248 Q0 238 ${-sw} 248 Z" fill="${sweater}"/>`;
    o += `<ellipse cx="${-bw * 0.28}" cy="300" rx="${bw * 0.45}" ry="22" fill="${sweaterHi}" opacity=".55"/>`;
    o += `<path d="M${-bw + 10} ${hemTop - 1} Q0 ${hemTop + 4} ${bw - 10} ${hemTop - 1}" stroke="#1A2638" stroke-width="3" fill="none"/>`;
    // strain lines
    if (f > 0.4) {
      const a = Math.min(1, (f - 0.4) * 2);
      o += `<g stroke="#162233" stroke-width="1.2" fill="none" opacity="${a}"><path d="M${-bw + 4} 296 q6 4 10 0 M${-bw + 3} 312 q6 4 10 0 M${bw - 4} 296 q-6 4 -10 0 M${bw - 3} 312 q-6 4 -10 0"/></g>`;
    }
    // collar + zip
    o += `<path d="M-10 244 L0 262 L10 244" fill="#F6F2EA"/><path d="M-11 243 L-3 258 L0 254 L3 258 L11 243" fill="none" stroke="#1A2638" stroke-width="2"/>`;
    o += `<path d="M0 260 L0 ${Math.min(292, hemTop - 20)}" stroke="#9AA6B8" stroke-width="1.5"/><rect x="-1.8" y="262" width="3.6" height="7" rx="1" fill="#C9D1DD"/>`;

    // arms
    const armW = 13 + 5 * f;
    const shL = [-sw + 3, 254], shR = [sw - 3, 254];
    // Billy's left arm (viewer's right) rests on his thigh
    const eR = [bw + 7, 300], hR = [bw - 4, 334];
    o += `<path d="M${shR[0]} ${shR[1]} Q${eR[0] + 4} ${eR[1] - 16} ${eR[0]} ${eR[1]} L${hR[0]} ${hR[1]}" stroke="${sweater}" stroke-width="${armW}" stroke-linecap="round" fill="none"/>`;
    o += `<circle cx="${hR[0]}" cy="${hR[1] + 2}" r="${6.5 + f}" fill="${skinFlat}"/>`;
    // his right arm (viewer's left) lifts food to his mouth
    const a = s.arm || 0;
    const hRest = [-bw + 4, 334], hUp = [-9, 232];
    const hand = [lerp(hRest[0], hUp[0], a), lerp(hRest[1], hUp[1], a)];
    const elbow = [lerp(-bw - 7, -bw - 12, a), lerp(300, 284, a)];
    o += `<path d="M${shL[0]} ${shL[1]} Q${elbow[0] - 4} ${elbow[1] - 16} ${elbow[0]} ${elbow[1]} L${hand[0]} ${hand[1]}" stroke="${sweater}" stroke-width="${armW}" stroke-linecap="round" fill="none"/>`;
    o += `<circle cx="${hand[0]}" cy="${hand[1] + 2}" r="${6.5 + f}" fill="${skinFlat}"/>`;

    // neck + head
    const cheek = f * 5 + (s.chew ? 2.5 : 0);
    const hx = 0, hy = 206;
    o += `<g transform="rotate(${-lean * 10} 0 240)">`;
    o += `<rect x="-8" y="222" width="16" height="24" rx="6" fill="${skinDk}"/>`;
    // double chin
    if (f > 0.45) o += `<path d="M${-12 - f * 4} 228 Q0 ${236 + f * 8} ${12 + f * 4} 228" fill="${skinFlat}" stroke="${skinDk}" stroke-width="1"/>`;
    o += `<ellipse cx="${-19 - cheek}" cy="${hy + 3}" rx="4" ry="6" fill="${skinDk}"/><ellipse cx="${19 + cheek}" cy="${hy + 3}" rx="4" ry="6" fill="${skinDk}"/>`;
    o += `<path d="M${-19 - cheek} ${hy - 6} Q${-20 - cheek} ${hy + 18} ${-8} ${hy + 25} Q0 ${hy + 28} 8 ${hy + 25} Q${20 + cheek} ${hy + 18} ${19 + cheek} ${hy - 6} Q${18} ${hy - 30} 0 ${hy - 30} Q${-18} ${hy - 30} ${-19 - cheek} ${hy - 6} Z" fill="${skin}"/>`;
    // hair: polished side part
    o += `<path d="M-21 ${hy - 2} Q-25 ${hy - 36} 2 ${hy - 36} Q24 ${hy - 36} 21 ${hy - 4} Q19 ${hy - 20} 8 ${hy - 22} Q-6 ${hy - 20} -14 ${hy - 26} Q-17 ${hy - 14} -21 ${hy - 2} Z" fill="${hair}"/>`;
    o += `<path d="M-14 ${hy - 26} Q2 ${hy - 20} 14 ${hy - 24}" stroke="#8A5E38" stroke-width="1.6" fill="none"/>`;
    o += `<path d="M-4 ${hy - 34} Q10 ${hy - 38} 18 ${hy - 26}" stroke="#8A5E38" stroke-width="1.4" fill="none"/>`;
    // face
    o += face(s, hx, hy);
    if (s.sweat) o += `<path d="M24 ${hy - 14} q3 6 0 9 q-3 -3 0 -9 Z" fill="#9FD1F2" stroke="#6FAAD6" stroke-width=".6"/>`;
    o += `</g></g>`;
    return o;
  }

  function face(s, hx, hy) {
    let o = "";
    const ey = hy - 1, ex = 8;
    const brow = { calm: [0, 0], concern: [3, -1], shock: [-5, -5], aghast: [-7, -7], resigned: [2, 2], defeated: [4, 3], happy: [-1, -1] }[s.mood] || [0, 0];
    // brows: [inner offset, outer offset]
    o += `<path d="M${-ex - 6} ${ey - 9 + brow[1]} L${-ex + 4} ${ey - 10 + brow[0] * -0.4 - (s.mood === "concern" ? 3 : 0)}" stroke="#5A3A20" stroke-width="2.4" stroke-linecap="round"/>`;
    o += `<path d="M${ex + 6} ${ey - 9 + brow[1]} L${ex - 4} ${ey - 10 + brow[0] * -0.4 - (s.mood === "concern" ? 3 : 0)}" stroke="#5A3A20" stroke-width="2.4" stroke-linecap="round"/>`;
    // eyes
    const eyes = s.eyes || "normal";
    for (const side of [-1, 1]) {
      const x = side * ex;
      if (eyes === "wide") o += `<circle cx="${x}" cy="${ey}" r="4.4" fill="#fff"/><circle cx="${x}" cy="${ey}" r="1.9" fill="#1E140C"/>`;
      else if (eyes === "half") o += `<ellipse cx="${x}" cy="${ey + 1}" rx="3.2" ry="2" fill="#1E140C"/><path d="M${x - 4.5} ${ey - 0.5} L${x + 4.5} ${ey - 0.5}" stroke="#C98E62" stroke-width="2.4"/>`;
      else if (eyes === "closed") o += `<path d="M${x - 4} ${ey} Q${x} ${ey + 3} ${x + 4} ${ey}" stroke="#1E140C" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      else if (eyes === "happy") o += `<path d="M${x - 4} ${ey + 1} Q${x} ${ey - 3} ${x + 4} ${ey + 1}" stroke="#1E140C" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      else if (eyes === "x") o += `<path d="M${x - 3} ${ey - 3} L${x + 3} ${ey + 3} M${x + 3} ${ey - 3} L${x - 3} ${ey + 3}" stroke="#1E140C" stroke-width="1.8" stroke-linecap="round"/>`;
      else o += `<ellipse cx="${x}" cy="${ey}" rx="2.6" ry="3" fill="#1E140C"/><circle cx="${x + 0.9}" cy="${ey - 1}" r=".9" fill="#fff"/>`;
    }
    // nose
    o += `<path d="M0 ${hy - 2} L-2 ${hy + 8} Q0 ${hy + 10} 3 ${hy + 9}" stroke="#B87C52" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    // mouth
    const my = hy + 16, m = s.mouth || "flat";
    if (m === "smile") o += `<path d="M-6 ${my - 1} Q0 ${my + 4} 6 ${my - 1}" stroke="#7A3A28" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    else if (m === "o") o += `<ellipse cx="0" cy="${my + 1}" rx="3.6" ry="4.6" fill="#5A2418"/>`;
    else if (m === "gape") o += `<path d="M-7 ${my - 2} Q0 ${my - 3} 7 ${my - 2} Q6 ${my + 10} 0 ${my + 10} Q-6 ${my + 10} -7 ${my - 2} Z" fill="#5A2418"/><rect x="-5" y="${my - 2}" width="10" height="2.4" fill="#fff"/>`;
    else if (m === "chew") o += s.chew ? `<ellipse cx="0" cy="${my}" rx="5" ry="2" fill="#7A3A28"/>` : `<path d="M-5 ${my} Q0 ${my + 2} 5 ${my}" stroke="#7A3A28" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    else if (m === "open") o += `<ellipse cx="0" cy="${my + 1}" rx="6" ry="5" fill="#5A2418"/>`;
    else if (m === "frown") o += `<path d="M-6 ${my + 2} Q0 ${my - 3} 6 ${my + 2}" stroke="#7A3A28" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    else if (m === "wobble") o += `<path d="M-7 ${my} q2.5 -2 5 0 t5 0 t4 0" stroke="#7A3A28" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    else o += `<path d="M-5 ${my} L5 ${my}" stroke="#7A3A28" stroke-width="2" stroke-linecap="round"/>`;
    return o;
  }

  // ---------- Debbie ----------
  // Local coordinates: feet at (0, 0), about 200 tall. s: { walk, reach (radians), eyes, pose }
  function debbie(s) {
    const skin = "url(#gSkinD)", skinFlat = "#F4CDB0";
    const w = s.walk || 0;
    let o = "";
    // legs + heels
    for (const [side, ph] of [[-1, 1], [1, -1]]) {
      const ang = Math.sin(w) * 14 * ph;
      o += `<g transform="rotate(${ang} ${side * 6} -88)">
        <path d="M${side * 6 - 4.5} -88 L${side * 6 + 4.5} -88 L${side * 6 + 3} -8 L${side * 6 - 3} -8 Z" fill="${skinFlat}"/>
        <path d="M${side * 6 - 5} -8 L${side * 6 + 9} -6 Q${side * 6 + 12} -2 ${side * 6 + 10} 0 L${side * 6 - 4} 0 Z" fill="#1A1414"/>
        <path d="M${side * 6 - 4} -4 L${side * 6 - 5} 3" stroke="#1A1414" stroke-width="2"/>
      </g>`;
    }
    // coat (back panel)
    o += `<path d="M-26 -168 Q-40 -120 -38 -64 L38 -64 Q40 -120 26 -168 Z" fill="#B98A5B"/>`;
    // black dress
    o += `<path d="M-15 -166 Q-18 -126 -14 -112 Q-30 -80 -30 -70 L30 -70 Q30 -80 14 -112 Q18 -126 15 -166 Z" fill="#17131A"/>`;
    o += `<path d="M-14 -112 Q0 -106 14 -112" stroke="#C9A45C" stroke-width="2.4" fill="none"/>`;
    // coat front panels + lapels
    o += `<path d="M-26 -168 Q-38 -120 -36 -62 L-20 -60 Q-22 -110 -14 -150 Z" fill="#CFA06D"/>`;
    o += `<path d="M26 -168 Q38 -120 36 -62 L20 -60 Q22 -110 14 -150 Z" fill="#C3945F"/>`;
    o += `<path d="M-14 -168 L-20 -134 L-12 -140 Z M14 -168 L20 -134 L12 -140 Z" fill="#A87A48"/>`;
    // handbag on her left arm (viewer's right)
    o += `<path d="M24 -118 Q34 -134 44 -118" stroke="#C9A45C" stroke-width="1.8" fill="none"/>`;
    o += `<rect x="22" y="-118" width="26" height="20" rx="4" fill="#E8C4B8"/><path d="M22 -112 L48 -112" stroke="#D2A596"/><circle cx="35" cy="-110" r="2" fill="#C9A45C"/>`;
    o += `<path d="M24 -166 Q34 -140 30 -118" stroke="#C3945F" stroke-width="10" stroke-linecap="round" fill="none"/>`;
    o += `<circle cx="31" cy="-116" r="4.5" fill="${skinFlat}"/>`;
    // reaching arm (her right, viewer's left)
    const r = s.reach || 0, sh = [-22, -162], L1 = 34, L2 = 32;
    const a1 = r * 0.9, a2 = r * 1.1;
    const el = [sh[0] - Math.sin(a1) * L1, sh[1] + Math.cos(a1) * L1];
    const hd = [el[0] - Math.sin(a2) * L2, el[1] + Math.cos(a2) * L2];
    o += `<path d="M${sh[0]} ${sh[1]} L${el[0]} ${el[1]} L${hd[0]} ${hd[1]}" stroke="#CFA06D" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    o += `<circle cx="${hd[0]}" cy="${hd[1]}" r="4.5" fill="${skinFlat}"/><circle cx="${hd[0] + 1}" cy="${hd[1] - 3}" r="1.3" fill="#E8C766"/>`;
    // neck + hair back
    o += `<rect x="-5" y="-182" width="10" height="16" rx="4" fill="${skinFlat}"/>`;
    o += `<path d="M-26 -196 Q-34 -164 -26 -142 Q-18 -148 -16 -170 L16 -170 Q18 -148 26 -142 Q34 -164 26 -196 Z" fill="#3E2519"/>`;
    // head
    o += `<ellipse cx="0" cy="-194" rx="15" ry="17.5" fill="${skin}"/>`;
    // hair front: glossy blowout with a side sweep
    o += `<path d="M-17 -190 Q-20 -222 2 -222 Q22 -222 19 -192 Q14 -208 0 -210 Q-6 -200 -17 -190 Z" fill="#553222"/>`;
    o += `<path d="M-2 -219 Q10 -214 16 -198" stroke="#8A5A3C" stroke-width="2" fill="none"/><path d="M-12 -206 Q-4 -214 4 -216" stroke="#8A5A3C" stroke-width="1.5" fill="none"/>`;
    // sunglasses perched on her head
    o += `<g transform="translate(0 -214)"><ellipse cx="-7" cy="0" rx="6.5" ry="4" fill="#1A1414"/><ellipse cx="7" cy="0" rx="6.5" ry="4" fill="#1A1414"/><path d="M-1 0 L1 0" stroke="#1A1414" stroke-width="2"/><ellipse cx="-9" cy="-1.5" rx="2" ry="1" fill="#fff" opacity=".4"/></g>`;
    // earrings
    o += `<circle cx="-15" cy="-186" r="3.4" fill="none" stroke="#E0BD6A" stroke-width="1.4"/><circle cx="15" cy="-186" r="3.4" fill="none" stroke="#E0BD6A" stroke-width="1.4"/>`;
    // face: always serene
    const eyes = s.eyes || "happy";
    for (const side of [-1, 1]) {
      const x = side * 6;
      if (eyes === "open") o += `<ellipse cx="${x}" cy="-194" rx="2.2" ry="2.8" fill="#2A1A14"/><path d="M${x - 3.5} -197 L${x - 5} -199 M${x + 3.5} -197 L${x + 5} -199" stroke="#2A1A14" stroke-width="1"/>`;
      else o += `<path d="M${x - 3.5} -193 Q${x} -197 ${x + 3.5} -193" stroke="#2A1A14" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M${x + side * 3.5} -194 l${side * 2} -1.5" stroke="#2A1A14" stroke-width="1.1"/>`;
      o += `<path d="M${x - 4} -201 Q${x} -203 ${x + 4} -201" stroke="#3A2418" stroke-width="1.3" fill="none"/>`;
    }
    o += `<ellipse cx="-9" cy="-187" rx="3.4" ry="2" fill="#F2A0A0" opacity=".45"/><ellipse cx="9" cy="-187" rx="3.4" ry="2" fill="#F2A0A0" opacity=".45"/>`;
    o += `<path d="M-5 -183 Q0 -178 5 -183 Q0 -181 -5 -183 Z" fill="#B8243F"/>`;
    return { svg: o, hand: hd };
  }

  // ---------- luggage cart ----------
  function cart(bagsOn) {
    let o = "";
    o += `<g stroke="url(#gGold)" stroke-width="3.5" fill="none" stroke-linecap="round">
      <path d="M-44 -8 L-44 -128 M44 -8 L44 -128"/>
      <path d="M-44 -128 Q-44 -150 0 -150 Q44 -150 44 -128"/>
      <path d="M-44 -104 L44 -104" stroke-width="2"/>
    </g>`;
    o += `<rect x="-52" y="-12" width="104" height="8" rx="3" fill="#B08A48"/><rect x="-50" y="-12" width="100" height="2.5" fill="#F1DA9E"/>`;
    for (const x of [-42, 42]) o += `<circle cx="${x}" cy="0" r="6" fill="#2A2420"/><circle cx="${x}" cy="0" r="2.2" fill="#C9A45C"/>`;
    o += bagsOn;
    return o;
  }

  // ---------- shopping bags + boxes ----------
  const BRANDS = [
    { c: "#F3E9DC", t: "#1E1E1E", h: "#1E1E1E", name: "MAISON VELOURS" },
    { c: "#161416", t: "#E8D3A2", h: "#E8D3A2", name: "NOIR NEUF" },
    { c: "#EDB9AA", t: "#FFFFFF", h: "#FFFFFF", name: "ÉTOILE" },
    { c: "#A9D6D0", t: "#FFFFFF", h: "#5E8F89", name: "BELLAMY" },
    { c: "#E2733A", t: "#FFFFFF", h: "#7A3514", name: "SAINT-ARGENT", box: true },
    { c: "#FFFFFF", t: "#B08A48", h: "#B08A48", name: "LUXE & CO" },
    { c: "#2F4A3F", t: "#E8D3A2", h: "#E8D3A2", name: "VALMONT" },
    { c: "#D8B872", t: "#FFFFFF", h: "#FFFFFF", name: "AURÉLIE" },
    { c: "#6B1E2E", t: "#F1D9B5", h: "#F1D9B5", name: "CASSIS", box: true },
    { c: "#1F2B44", t: "#FFFFFF", h: "#C9A45C", name: "OSTRAVA" },
  ];
  // Bag with its bottom center at (0, 0).
  function bag(brand, w = 34, h = 40, open = 0) {
    const b = brand;
    if (b.box) {
      let o = `<rect x="${-w / 2}" y="${-h * 0.7}" width="${w}" height="${h * 0.7}" rx="2" fill="${b.c}"/>`;
      o += `<rect x="${-w / 2 - 2}" y="${-h * 0.7 - 6 - open * 14}" width="${w + 4}" height="8" rx="2" fill="${b.c}" stroke="rgba(0,0,0,.12)" transform="rotate(${-open * 18} ${-w / 2} ${-h * 0.7})"/>`;
      o += `<rect x="-2.5" y="${-h * 0.7}" width="5" height="${h * 0.7}" fill="${b.h}" opacity=".85"/>`;
      if (!open) o += `<path d="M0 ${-h * 0.7 - 5} q-9 -9 -12 -2 q3 5 12 2 q9 -9 12 -2 q-3 5 -12 2" fill="${b.h}"/>`;
      o += `<text x="0" y="${-h * 0.3}" text-anchor="middle" font-family="Playfair Display, Didot, Georgia, serif" font-size="${w * 0.1}" letter-spacing="1" fill="${b.t}">${b.name}</text>`;
      o += `<rect x="${-w / 2}" y="${-h * 0.7}" width="${w * 0.3}" height="${h * 0.7}" fill="#fff" opacity=".12"/>`;
      return o;
    }
    let o = "";
    if (open) {
      o += `<path d="M${-w * 0.28} ${-h} L${-w * 0.1} ${-h - 16 * open} L0 ${-h} L${w * 0.12} ${-h - 18 * open} L${w * 0.3} ${-h}" fill="#FFFFFF" stroke="#EADFD0"/>`;
      o += `<path d="M${-w * 0.2} ${-h} L${-w * 0.02} ${-h - 11 * open} L${w * 0.14} ${-h}" fill="#F6D6CE"/>`;
    }
    o += `<path d="M${-w * 0.28} ${-h + 1} Q${-w * 0.28} ${-h - 14} ${-w * 0.08} ${-h - 14} Q${w * 0.02} ${-h - 14} ${-w * 0.02} ${-h + 1}" stroke="${b.h}" stroke-width="1.8" fill="none"/>`;
    o += `<path d="M${w * 0.28} ${-h + 1} Q${w * 0.28} ${-h - 14} ${w * 0.08} ${-h - 14} Q${-w * 0.02} ${-h - 14} ${w * 0.02} ${-h + 1}" stroke="${b.h}" stroke-width="1.8" fill="none"/>`;
    o += `<path d="M${-w / 2} 0 L${-w / 2 + 2} ${-h} L${w / 2 - 2} ${-h} L${w / 2} 0 Z" fill="${b.c}"/>`;
    o += `<path d="M${-w / 2 + 2} ${-h} L${w / 2 - 2} ${-h} L${w / 2 - 1.6} ${-h + 5} L${-w / 2 + 1.6} ${-h + 5} Z" fill="rgba(0,0,0,.08)"/>`;
    o += `<path d="M${-w / 2} 0 L${-w / 2 + 2} ${-h} L${-w / 2 + w * 0.22} ${-h} L${-w / 2 + w * 0.2} 0 Z" fill="#fff" opacity=".14"/>`;
    o += `<text x="0" y="${-h * 0.46}" text-anchor="middle" font-family="Playfair Display, Didot, Georgia, serif" font-size="${Math.max(3.4, w * 0.105)}" letter-spacing="${w * 0.02}" fill="${b.t}">${b.name}</text>`;
    o += `<path d="M${-w * 0.2} ${-h * 0.36} L${w * 0.2} ${-h * 0.36}" stroke="${b.t}" stroke-width=".5" opacity=".6"/>`;
    return o;
  }
  // a pile of bags on the cart platform
  function pile(brands) {
    let o = "";
    brands.forEach((b, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = -28 + col * 28 + (row % 2 ? 8 : 0), y = -12 - row * 30;
      const w = 26 + ((i * 7) % 6), h = 28 + ((i * 5) % 8);
      o += `<g transform="translate(${x} ${y}) rotate(${((i * 37) % 13) - 6})">${bag(b, w, h)}</g>`;
    });
    return o;
  }

  // ---------- the luxury items that come out of the bag ----------
  function item(kind) {
    const g = "url(#gGold)";
    switch (kind) {
      case "dress": return `<path d="M-8 -30 L8 -30 L10 -16 L22 26 Q0 32 -22 26 L-10 -16 Z" fill="#B5475A"/><path d="M-10 -16 Q0 -10 10 -16" stroke="${g}" stroke-width="2" fill="none"/><path d="M-6 -30 L-10 -38 M6 -30 L10 -38" stroke="#B5475A" stroke-width="2"/><path d="M-4 0 L-10 24 M6 2 L10 24" stroke="#fff" opacity=".25"/>`;
      case "shoes": return `<path d="M-26 8 Q-24 -8 -6 -4 L14 6 Q24 8 26 14 L-18 14 Z" fill="#1A1414"/><path d="M-24 10 L-26 26" stroke="#1A1414" stroke-width="3"/><path d="M-26 12 Q-24 -6 -6 -2" stroke="#fff" stroke-width="1" opacity=".3" fill="none"/><path d="M-22 14 L26 14" stroke="#B5475A" stroke-width="2.2"/>`;
      case "jacket": return `<path d="M-24 -26 L-8 -30 L0 -18 L8 -30 L24 -26 L30 22 L16 26 L14 -4 L12 28 L-12 28 L-14 -4 L-16 26 L-30 22 Z" fill="#6B4527"/><path d="M-8 -30 L0 -8 L8 -30" stroke="#3E2715" stroke-width="2" fill="none"/><circle cx="-4" cy="4" r="1.6" fill="${g}"/><circle cx="-4" cy="14" r="1.6" fill="${g}"/>`;
      case "handbag": return `<path d="M-14 -12 Q-14 -34 0 -34 Q14 -34 14 -12" stroke="${g}" stroke-width="3" fill="none"/><rect x="-26" y="-14" width="52" height="38" rx="7" fill="#E8C4B8"/><path d="M-26 -2 L26 -2" stroke="#D2A596"/><rect x="-6" y="-6" width="12" height="8" rx="2" fill="${g}"/><path d="M-20 4 L-20 20 M-10 4 L-10 20 M0 4 L0 20 M10 4 L10 20 M20 4 L20 20" stroke="#D9AFA2" stroke-width=".8"/>`;
      case "sunglasses": return `<path d="M-30 -4 Q-30 12 -16 12 Q-4 12 -4 -2 L-30 -4 Z M30 -4 Q30 12 16 12 Q4 12 4 -2 L30 -4 Z" fill="#1A1414"/><path d="M-4 -2 Q0 -6 4 -2" stroke="${g}" stroke-width="2.5" fill="none"/><path d="M-30 -4 L-36 -8 M30 -4 L36 -8" stroke="${g}" stroke-width="2.5"/><ellipse cx="-20" cy="0" rx="5" ry="2.5" fill="#fff" opacity=".3"/><ellipse cx="14" cy="0" rx="5" ry="2.5" fill="#fff" opacity=".3"/>`;
      case "sweater": return `<path d="M-14 -28 Q0 -22 14 -28 L32 -14 L26 0 L18 -6 L18 28 L-18 28 L-18 -6 L-26 0 L-32 -14 Z" fill="#E9DCC6"/><path d="M-14 -28 Q0 -18 14 -28" stroke="#D6C4A6" stroke-width="3" fill="none"/><path d="M-18 24 L18 24" stroke="#D6C4A6" stroke-width="3"/><path d="M-10 -8 q5 5 10 0 t10 0 M-10 4 q5 5 10 0 t10 0" stroke="#D6C4A6" fill="none"/>`;
      case "vase": return `<path d="M-8 -30 L8 -30 L6 -22 Q24 -8 16 18 Q12 28 0 28 Q-12 28 -16 18 Q-24 -8 -6 -22 Z" fill="#FBF7F0" stroke="#D9CAB5"/><path d="M-12 4 Q0 12 12 4" stroke="${g}" stroke-width="2" fill="none"/><path d="M-4 -30 Q-10 -46 -18 -48 M2 -30 Q6 -48 14 -50" stroke="#6C8A5C" stroke-width="1.6" fill="none"/><circle cx="-18" cy="-48" r="3" fill="#E8C4B8"/><circle cx="14" cy="-50" r="3" fill="#F2E3B3"/>`;
      case "boots": return `<path d="M-18 -30 L-2 -30 L-2 12 L20 16 Q28 18 26 26 L-20 26 Z" fill="#3A2418"/><path d="M-18 -30 L-2 -30" stroke="${g}" stroke-width="3"/><path d="M-20 26 L-20 30 L-12 30 L-12 26" fill="#1A1010"/><path d="M-14 -24 L-14 16" stroke="#fff" opacity=".2" stroke-width="2"/>`;
      default: return "";
    }
  }

  // ---------- food ----------
  function slice(x, y, r = 0) {
    return `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 -24 L18 16 Q0 22 -18 16 Z" fill="#F6C85F"/><path d="M-18 16 Q0 22 18 16 L16 20 Q0 27 -16 20 Z" fill="#D59A4A"/><path d="M0 -24 L16 12 Q0 17 -16 12 Z" fill="#E6A83B" opacity=".25"/><circle cx="-4" cy="2" r="3.2" fill="#C0392B"/><circle cx="6" cy="8" r="3" fill="#C0392B"/><circle cx="1" cy="-10" r="2.6" fill="#C0392B"/><circle cx="-8" cy="11" r="2.4" fill="#C0392B"/></g>`;
  }
  function food(kind) {
    switch (kind) {
      case "slice": return slice(0, 0, -10);
      case "slices": return slice(-10, 2, -18) + slice(10, 0, 14);
      case "burger": return `<g transform="translate(-10 0)"><path d="M-20 -4 Q-20 -24 0 -24 Q20 -24 20 -4 Z" fill="#E1A04A"/><g fill="#FFF3D0"><ellipse cx="-8" cy="-16" rx="1.5" ry=".8"/><ellipse cx="2" cy="-19" rx="1.5" ry=".8"/><ellipse cx="9" cy="-13" rx="1.5" ry=".8"/></g><path d="M-22 -4 L22 -4 L18 1 L-18 1 Z" fill="#6DBA4A"/><rect x="-20" y="0" width="40" height="7" rx="3" fill="#6B3A22"/><path d="M-21 6 L21 6 L17 10 L-15 12 Z" fill="#F4C542"/><path d="M-19 10 Q0 18 19 10 L19 13 Q0 20 -19 13 Z" fill="#D8923E"/></g>
        <g transform="translate(20 4)"><path d="M-10 -6 L10 -6 L8 14 L-8 14 Z" fill="#C0392B"/>${[-6, -2, 2, 6].map((x, i) => `<rect x="${x - 1.5}" y="${-16 - (i % 2) * 4}" width="3" height="14" fill="#F4C542"/>`).join("")}<path d="M-10 -6 L10 -6" stroke="#fff" stroke-width="1.2"/></g>`;
      case "chinese": return `<path d="M-18 -14 L18 -14 L13 18 L-13 18 Z" fill="#FBF7F0" stroke="#D9CAB5"/><path d="M-18 -14 L-12 -26 L12 -26 L18 -14" fill="#F1EBE0" stroke="#D9CAB5"/><path d="M-2 -26 Q0 -36 2 -26" stroke="#9C8A6F" fill="none"/><path d="M-6 2 L0 -4 L6 2 L0 8 Z" fill="#C0392B" opacity=".8"/><path d="M6 -30 L22 -44 M10 -30 L26 -42" stroke="#8A5A2E" stroke-width="2"/><path d="M-12 -14 q3 -6 6 0 q3 -6 6 0 q3 -6 6 0" stroke="#E0B25A" stroke-width="2.5" fill="none"/>`;
      case "sandwich": return `<path d="M-26 12 L26 12 L24 18 L-24 18 Z" fill="#D8A15A"/>${["#E25B45", "#F4C542", "#6DBA4A", "#E8A0A0", "#C94B3B", "#F4C542", "#6DBA4A", "#E8A0A0"].map((c, i) => `<rect x="-25" y="${8 - i * 5}" width="50" height="5" rx="2" fill="${c}"/>`).join("")}<path d="M-26 -32 Q0 -40 26 -32 L26 -28 L-26 -28 Z" fill="#D8A15A"/><path d="M0 -40 L0 -56" stroke="#C9A45C" stroke-width="1.6"/><path d="M0 -56 L8 -52 L0 -48 Z" fill="#B5475A"/>`;
      case "pasta": return `<ellipse cx="0" cy="8" rx="30" ry="10" fill="#FBF7F0" stroke="#D9CAB5"/><path d="M-20 4 Q-10 -18 0 -20 Q14 -18 20 4 Q0 12 -20 4 Z" fill="#F2C86A"/><path d="M-14 0 q6 -10 12 0 t12 0 M-12 -8 q6 -8 12 0 t10 0" stroke="#E0AE4A" stroke-width="1.5" fill="none"/><path d="M-10 -12 Q0 -20 10 -12 Q0 -4 -10 -12 Z" fill="#C0392B"/><ellipse cx="4" cy="-16" rx="4" ry="2" fill="#6DBA4A"/>`;
      case "pancakes": return `${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="0" cy="${12 - i * 7}" rx="24" ry="6" fill="${i % 2 ? "#E3A456" : "#D08E43"}"/>`).join("")}<ellipse cx="0" cy="-25" rx="24" ry="6" fill="#EDB566"/><path d="M-14 -26 Q-18 -10 -14 0 M10 -26 Q14 -14 12 -4" stroke="#8A4A18" stroke-width="3" fill="none" opacity=".85"/><rect x="-5" y="-33" width="10" height="7" rx="1.5" fill="#FFF3C4"/><circle cx="7" cy="-32" r="3" fill="#C0392B"/><ellipse cx="0" cy="18" rx="30" ry="6" fill="#FBF7F0" stroke="#D9CAB5"/>`;
      case "halfcake": return `<ellipse cx="0" cy="16" rx="32" ry="7" fill="#FBF7F0" stroke="#D9CAB5"/><path d="M-26 12 L-26 -12 L0 -18 L0 8 Z" fill="#F6E1E4"/><path d="M0 -18 L26 -10 L26 12 L0 8 Z" fill="#5B2C1E"/><path d="M0 -12 L26 -4 M0 -2 L26 6" stroke="#F6E1E4" stroke-width="2.5"/><path d="M-26 -12 L0 -18 L26 -10 L0 -4 Z" fill="#FBEFF2"/><circle cx="-12" cy="-14" r="3" fill="#C0392B"/>`;
      case "cake": return `<ellipse cx="0" cy="18" rx="38" ry="8" fill="#FBF7F0" stroke="#D9CAB5"/><rect x="-30" y="-14" width="60" height="30" rx="4" fill="#F6E1E4"/><path d="M-30 -8 q6 8 12 0 t12 0 t12 0 t12 0 t12 0" fill="#FBEFF2" stroke="#EBC6CE"/><ellipse cx="0" cy="-14" rx="30" ry="7" fill="#FBEFF2"/><rect x="-20" y="-26" width="40" height="14" rx="3" fill="#F6E1E4"/><ellipse cx="0" cy="-26" rx="20" ry="5" fill="#FBEFF2"/>${[-12, -4, 4, 12].map((x) => `<circle cx="${x}" cy="-27" r="2.6" fill="#C0392B"/>`).join("")}<rect x="-1.2" y="-40" width="2.4" height="12" fill="#A9D6D0"/><path d="M0 -46 q3 3 0 6 q-3 -3 0 -6 Z" fill="#F7B733"/>`;
      default: return "";
    }
  }
  // what's left behind after eating
  function remnant(kind) {
    switch (kind) {
      case "slice": case "slices": return `<rect x="-16" y="-3" width="32" height="6" fill="#E9D8BE" stroke="#CDB594"/><path d="M-10 -3 L10 -3" stroke="#C0392B" stroke-width="1"/>`;
      case "burger": return `<path d="M-8 0 L8 0 L6 -6 L-6 -6 Z" fill="#F4F0E8" stroke="#D9CAB5"/><path d="M-4 -4 L4 -2" stroke="#C0392B"/>`;
      case "chinese": return `<path d="M-7 0 L7 0 L9 -12 L-9 -12 Z" fill="#FBF7F0" stroke="#D9CAB5"/><path d="M4 -12 L12 -20" stroke="#8A5A2E" stroke-width="1.4"/>`;
      case "sandwich": return `<path d="M-6 0 L10 0 L4 -5 Z" fill="#D8A15A"/><path d="M0 -8 L0 -16" stroke="#C9A45C"/>`;
      default: return `<ellipse cx="0" cy="0" rx="13" ry="3.5" fill="#FBF7F0" stroke="#D9CAB5"/><circle cx="-3" cy="-1" r="1" fill="#C0392B"/><circle cx="4" cy="0" r=".8" fill="#8A4A18"/>`;
    }
  }

  const tissue = () => `<path d="M-10 0 L-6 -12 L0 -4 L4 -14 L10 0 Z" fill="#FFFFFF" stroke="#EADFD0"/><path d="M-6 0 L-2 -8 L3 0 Z" fill="#F6D6CE"/>`;
  const receipt = (len) => `<path d="M-4 0 L4 0 L4 ${-len} L-4 ${-len} Z" fill="#FFFFFF" stroke="#E4DACB" stroke-width=".6"/>${Array.from({ length: Math.floor(len / 5) }, (_, i) => `<path d="M-2.4 ${-3 - i * 5} L2.4 ${-3 - i * 5}" stroke="#C9BFB2" stroke-width=".6"/>`).join("")}`;

  return { billy, debbie, cart, bag, pile, item, food, remnant, tissue, receipt, BRANDS };
})();
