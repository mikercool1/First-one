// Perfect Sunday: the four friends.
// Each character: who they are, what they love, their passive + special,
// their short lines, their victory screen, and their cartoon avatar.

const DAY = "Sunday";

const CHARACTERS = {
  adam: {
    id: "adam",
    name: "Adam",
    color: "#2F6FE4",
    bg: "#BFD7FF",
    blurb: "Brooklyn dad. Product executive. Understated about everything, including the IPO.",
    interests: ["LEGO", "Star Wars", "Sushi", "Rhubarb pie", "Penn", "Peace and quiet"],
    passive: {
      name: "Curmudgeon",
      text: "+1 extra Happiness from quiet, LEGO, nerdy, sushi or cozy family moments.",
      tags: ["quiet", "lego", "nerd", "sushi", "family"],
    },
    special: {
      name: "These Youths",
      text: "Once per game, cancel a negative event completely.",
      line: "Youths.",
    },
    lines: {
      happy: ["Nice.", "Good.", "This is fine. This is good.", "Quiet. Finally."],
      sad: ["Youths.", "Ugh.", "Why is it like this.", "Unnecessary."],
      turn: ["Okay.", "Let's see.", "Fine."],
    },
    victory: {
      sub: "LEGO acquired. Sushi excellent. Youths avoided.",
      footer: "IPO status: still “we’ll see.”",
    },
  },
  marshall: {
    id: "marshall",
    name: "Marshall",
    color: "#2E9B57",
    bg: "#C9EBC7",
    blurb: "Irvington loyalist. Family guy. Unconvinced there is good food anywhere else in Westchester.",
    interests: ["The Hudson", "Rivertowns", "Parks", "BBQ", "Family", "Coyotes"],
    passive: {
      name: "Rivertown Pride",
      text: "+1 extra Happiness from parks, the river, Rivertown restaurants and scenic outdoor moments.",
      tags: ["park", "river", "rivertown", "outdoor"],
    },
    special: {
      name: "Let's Just Stay Up Here",
      text: "Once per game, reject a bad card and draw a new one.",
      line: "Why don't we just stay up here?",
    },
    lines: {
      happy: ["I mean, come on.", "This is what I'm saying.", "Why would we leave?"],
      sad: ["Where?", "Is it by the river? No?", "Hm."],
      turn: ["Alright.", "Let's go.", "Easy."],
    },
    victory: {
      sub: "He never left the Rivertowns.",
      footer: "Why would he?",
    },
  },
  billy: {
    id: "billy",
    name: "Billy",
    color: "#E0A21B",
    bg: "#FFE3A6",
    blurb: "Handsome. Polished. Real estate developer. Will notice your shoes before your face.",
    interests: ["Golf", "Architecture", "Interior design", "Fashion", "Citarella", "Etiquette"],
    passive: {
      name: "Good Taste",
      text: "+1 extra Happiness from golf, fashion, design, beautiful houses and high-end groceries.",
      tags: ["golf", "fashion", "design", "house", "fancy"],
    },
    special: {
      name: "Mulligan",
      text: "Once per game, undo a bad space: go back, roll again.",
      line: "Mulligan.",
    },
    lines: {
      happy: ["Beautiful.", "Now that's done right.", "Acceptable. Very acceptable."],
      sad: ["That's terrible.", "No.", "Who approved this?"],
      turn: ["Watch this.", "Quiet, please.", "Okay."],
    },
    victory: {
      sub: "72°. Perfect greens. Nobody spoke during the backswing.",
      footer: "Everyone’s shoes were acceptable.",
    },
  },
  mike: {
    id: "mike",
    name: "Mike",
    color: "#F0643C",
    bg: "#FFC9B5",
    blurb: "Warm, social, and physically unable to wonder about something casually.",
    interests: ["Research", "Yankees", "Restaurants", "Travel hacks", "Houses", "Being right"],
    passive: {
      name: "Rabbit Hole",
      text: "On Event cards, may LOOK INTO IT instead. Roll 3–6: +2. Roll 1–2: +1, but miss a turn.",
      tags: [],
    },
    special: {
      name: "Wait, Let Me Check",
      text: "Once per game, draw a second card and keep the better one.",
      line: "Hang on.",
    },
    lines: {
      happy: ["See?", "I looked it up.", "This is actually fascinating."],
      sad: ["Wait.", "That can't be right.", "Hold on, let me check."],
      turn: ["Okay, so…", "Interesting.", "Wait."],
    },
    victory: {
      sub: "Following extensive research.",
      footer: "Optimal outcome confirmed.",
    },
  },
};

const CHAR_ORDER = ["adam", "marshall", "billy", "mike"];

// ---------- Avatars ----------
// One shared cartoon template; hair, build and wardrobe differ per friend.
// mood: "neutral" | "happy" | "sad" | "annoyed" | "talk"

const SKIN = { adam: "#F2C9A5", marshall: "#F1C09A", billy: "#E9B98F", mike: "#F4C7A1" };
const HAIR = { adam: "#5B3A24", marshall: "#A24E26", billy: "#7A5230", mike: "#5E3C22" };

function avatarSVG(id, mood = "neutral", opts = {}) {
  const skin = SKIN[id], hair = HAIR[id], c = CHARACTERS[id];
  const shade = "rgba(120,60,30,.18)";
  const wide = id === "mike";
  const hx = 100, hy = id === "adam" ? 90 : 94;
  const rx = wide ? 54 : id === "billy" ? 42 : 45;
  const ry = id === "adam" ? 56 : wide ? 52 : 51;
  const eyeY = id === "adam" ? 104 : 102;
  const ex = wide ? 23 : 19;
  if (mood === "neutral" && id === "mike") mood = "talk";

  let s = "";
  if (!opts.noBg) s += `<circle cx="100" cy="100" r="100" fill="${c.bg}"/>`;

  // body / wardrobe
  const body = wide
    ? "M8 206 C10 150 52 134 100 134 C148 134 190 150 192 206 Z"
    : "M28 206 C30 156 62 142 100 142 C138 142 170 156 172 206 Z";
  if (id === "adam") {
    s += `<path d="${body}" fill="#3B5A8C"/><path d="M78 146 Q100 166 122 146" fill="none" stroke="#2C476F" stroke-width="6"/>`;
    s += `<g transform="translate(128 168) rotate(-8)"><rect x="0" y="4" width="22" height="12" rx="2" fill="#E5322D"/><rect x="3" y="0" width="6" height="5" rx="1.5" fill="#E5322D"/><rect x="13" y="0" width="6" height="5" rx="1.5" fill="#E5322D"/></g>`;
  } else if (id === "marshall") {
    s += `<path d="${body}" fill="#3E7B4F"/><path d="M100 150 L100 206" stroke="#2D5E3B" stroke-width="4"/><path d="M84 142 L100 158 L116 142" fill="#2D5E3B"/><rect x="96" y="160" width="8" height="12" rx="2" fill="#C9D6CC"/>`;
  } else if (id === "billy") {
    s += `<path d="${body}" fill="#1F3557"/><path d="M78 144 L100 170 L92 146 Z M122 144 L100 170 L108 146 Z" fill="#FFFFFF"/><circle cx="100" cy="176" r="2.6" fill="#E9EEF7"/><circle cx="100" cy="188" r="2.6" fill="#E9EEF7"/><circle cx="138" cy="170" r="6" fill="#FFFFFF" stroke="#D6DCE8" stroke-width="1.5"/><circle cx="136" cy="168" r=".9" fill="#C7CFDD"/><circle cx="140" cy="171" r=".9" fill="#C7CFDD"/>`;
  } else {
    s += `<path d="${body}" fill="#26324F"/>`;
    for (let x = 30; x <= 170; x += 12) s += `<path d="M${x} 150 L${x} 206" stroke="#3E4C73" stroke-width="2"/>`;
  }
  // neck
  s += `<rect x="${hx - 13}" y="${hy + ry - 22}" width="26" height="30" rx="8" fill="${skin}"/><rect x="${hx - 13}" y="${hy + ry - 22}" width="26" height="12" fill="${shade}"/>`;
  // ears
  s += `<circle cx="${hx - rx + 2}" cy="${eyeY + 2}" r="10" fill="${skin}"/><circle cx="${hx + rx - 2}" cy="${eyeY + 2}" r="10" fill="${skin}"/>`;
  // head
  if (id === "billy") {
    s += `<path d="M58 88 C58 50 78 42 100 42 C122 42 142 50 142 88 C142 118 134 136 118 144 C110 148 90 148 82 144 C66 136 58 118 58 88 Z" fill="${skin}"/>`;
  } else {
    s += `<ellipse cx="${hx}" cy="${hy}" rx="${rx}" ry="${ry}" fill="${skin}"/>`;
  }
  if (wide) s += `<path d="M76 142 Q100 154 124 142" fill="none" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>`;
  // stubble
  if (id === "marshall") {
    s += `<path d="M57 100 Q60 146 100 146 Q140 146 143 100 Q134 126 118 128 Q100 120 82 128 Q66 126 57 100 Z" fill="${hair}" opacity=".26"/>`;
    s += `<path d="M84 116 Q100 110 116 116 Q100 120 84 116 Z" fill="${hair}" opacity=".32"/>`;
  }

  // hair
  if (id === "adam") {
    const curls = [[60, 66, 11], [63, 52, 13], [74, 41, 14], [89, 34, 14], [104, 32, 14], [119, 35, 14], [132, 44, 13], [140, 57, 12], [142, 70, 10], [82, 44, 10], [112, 40, 10]];
    s += curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hair}"/>`).join("");
    s += `<path d="M70 42 q6 -6 12 0 M98 30 q6 -6 12 0 M124 38 q6 -6 12 0" stroke="#7A5236" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  } else if (id === "marshall") {
    const curls = [[56, 88, 11], [57, 72, 13], [63, 57, 14], [75, 46, 15], [90, 40, 15], [106, 39, 15], [121, 43, 15], [134, 52, 14], [142, 66, 13], [144, 82, 11], [84, 56, 11], [100, 54, 11], [116, 56, 11], [70, 64, 10], [130, 64, 10]];
    s += curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hair}"/>`).join("");
    s += `<path d="M80 40 q6 -6 12 0 M110 38 q6 -6 12 0 M60 66 q5 -6 10 -1 M132 60 q5 -6 10 0" stroke="#C06A3C" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  } else if (id === "billy") {
    s += `<path d="M55 90 C48 48 74 28 104 30 C134 31 152 48 146 88 C142 70 134 60 120 58 C104 56 86 54 74 44 C70 60 62 70 55 90 Z" fill="${hair}"/>`;
    s += `<path d="M74 44 C88 52 104 54 120 56" stroke="#9A6D43" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M92 34 C110 30 130 36 140 50" stroke="#9A6D43" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  } else {
    s += `<path d="M46 88 C42 50 70 34 100 34 C130 34 158 50 154 88 C148 68 136 60 120 62 C110 52 92 54 84 60 C70 60 54 68 46 88 Z" fill="${hair}"/>`;
    s += `<path d="M96 36 q8 -12 16 -2" stroke="${hair}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  }

  // brows
  const bc = id === "marshall" ? "#8A3E1C" : "#4A2E1B";
  const bL = hx - ex, bR = hx + ex, by = eyeY - 15;
  let brows;
  if (mood === "happy") brows = `M${bL - 9} ${by + 1} Q${bL} ${by - 6} ${bL + 9} ${by + 1} M${bR - 9} ${by + 1} Q${bR} ${by - 6} ${bR + 9} ${by + 1}`;
  else if (mood === "sad") brows = `M${bL - 9} ${by + 2} L${bL + 8} ${by - 4} M${bR - 8} ${by - 4} L${bR + 9} ${by + 2}`;
  else if (mood === "annoyed") brows = `M${bL - 9} ${by - 3} L${bL + 8} ${by + 3} M${bR - 8} ${by + 3} L${bR + 9} ${by - 3}`;
  else if (mood === "talk") brows = `M${bL - 9} ${by - 2} Q${bL} ${by - 9} ${bL + 9} ${by - 3} M${bR - 9} ${by} L${bR + 9} ${by}`;
  else if (id === "marshall") brows = `M${bL - 9} ${by} L${bL + 9} ${by} M${bR - 9} ${by - 1} Q${bR} ${by - 8} ${bR + 9} ${by - 3}`;
  else brows = `M${bL - 9} ${by} Q${bL} ${by - 4} ${bL + 9} ${by} M${bR - 9} ${by} Q${bR} ${by - 4} ${bR + 9} ${by}`;
  s += `<path d="${brows}" stroke="${bc}" stroke-width="${id === "marshall" ? 5 : 4.5}" fill="none" stroke-linecap="round"/>`;

  // eyes
  const eye = (x) => mood === "happy"
    ? `<path d="M${x - 7} ${eyeY + 2} Q${x} ${eyeY - 7} ${x + 7} ${eyeY + 2}" stroke="#2A1C14" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${x}" cy="${eyeY}" rx="7" ry="${mood === "annoyed" ? 5 : 8}" fill="#FFFFFF"/><circle cx="${x + (id === "mike" ? 1 : 0)}" cy="${eyeY + 1}" r="4.6" fill="#2A1C14"/><circle cx="${x + 1.6}" cy="${eyeY - 1}" r="1.5" fill="#FFFFFF"/>`;
  s += eye(bL) + eye(bR);
  if (mood === "annoyed") s += `<path d="M${bL - 8} ${eyeY - 5} L${bL + 8} ${eyeY - 3} M${bR - 8} ${eyeY - 3} L${bR + 8} ${eyeY - 5}" stroke="${skin}" stroke-width="4"/>`;

  // nose
  s += `<path d="M100 ${eyeY + 4} Q${id === "billy" ? 106 : 108} ${eyeY + 14} 99 ${eyeY + 17}" stroke="rgba(120,60,30,.45)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // cheeks
  if (mood === "happy" || id === "marshall" || id === "mike") s += `<circle cx="${bL - 6}" cy="${eyeY + 16}" r="7" fill="#F28B82" opacity=".3"/><circle cx="${bR + 6}" cy="${eyeY + 16}" r="7" fill="#F28B82" opacity=".3"/>`;

  // mouth
  const my = eyeY + 27;
  if (mood === "happy") s += `<path d="M84 ${my - 3} Q100 ${my + 16} 116 ${my - 3} Z" fill="#7A2E24"/><path d="M87 ${my - 2} Q100 ${my + 3} 113 ${my - 2} Z" fill="#FFFFFF"/>`;
  else if (mood === "sad") s += `<path d="M88 ${my + 4} Q100 ${my - 5} 112 ${my + 4}" stroke="#7A2E24" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  else if (mood === "annoyed") s += `<path d="M88 ${my + 1} L112 ${my - 1}" stroke="#7A2E24" stroke-width="4" stroke-linecap="round"/>`;
  else if (mood === "talk") s += `<ellipse cx="100" cy="${my + 1}" rx="10" ry="7" fill="#7A2E24"/><ellipse cx="100" cy="${my + 4}" rx="6" ry="3" fill="#E4736A"/>`;
  else if (id === "billy") s += `<path d="M86 ${my - 2} Q102 ${my + 7} 116 ${my - 4}" stroke="#7A2E24" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  else if (id === "marshall") s += `<path d="M88 ${my} Q100 ${my + 4} 112 ${my - 2}" stroke="#7A2E24" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  else s += `<path d="M88 ${my} Q100 ${my + 6} 112 ${my}" stroke="#7A2E24" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  // Mike's phone
  if (id === "mike" && !opts.noProps) {
    s += `<g transform="rotate(-12 156 170)"><rect x="140" y="138" width="32" height="52" rx="6" fill="#1D2233"/><rect x="143" y="143" width="26" height="40" rx="3" fill="#7FD1FF"/><rect x="146" y="148" width="18" height="3" rx="1.5" fill="#FFFFFF"/><rect x="146" y="155" width="14" height="3" rx="1.5" fill="#FFFFFF" opacity=".8"/><rect x="146" y="162" width="16" height="3" rx="1.5" fill="#FFFFFF" opacity=".6"/></g><ellipse cx="152" cy="186" rx="15" ry="11" fill="${skin}"/>`;
  }

  const vb = opts.token ? "34 22 132 132" : "0 0 200 200";
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}
