// Perfect Sunday: the four worlds. Same board, different paint and labels.

// Board pattern: 20 spaces in a loop. h=Happy a=Annoyance e=Event f=Friend p=Perfect Moment
const BOARD_PATTERN = ["h", "a", "e", "f", "a", "h", "e", "a", "f", "e", "p", "a", "e", "a", "f", "h", "e", "a", "f", "a"];

const SPACE_TYPES = {
  h: { key: "happy", name: "Happy", icon: "❤️", color: "#FF5C8A" },
  a: { key: "annoy", name: "Annoyance", icon: "😤", color: "#8B6CD9" },
  e: { key: "event", name: "Event", icon: "🎴", color: "#2F86F6" },
  f: { key: "friend", name: "Friend", icon: "👥", color: "#16B3A0" },
  p: { key: "perfect", name: "Perfect Moment", icon: "⭐", color: "#FFB81C" },
};

const WORLDS = {
  wilmot: {
    id: "wilmot",
    name: "Wilmot Woods",
    area: "Scarsdale",
    home: "mike",
    homeNote: "Mike's natural rabbit-hole habitat",
    ground: "#7DC47A",
    groundDeep: "#4E9A55",
    labels: {
      h: ["Coffee", "Playground", "Backyard", "Park", "Driveway"],
      a: ["Bad Contractor", "School Pickup", "Leaf Blowers", "Renovation", "Traffic", "HOA Email"],
      e: ["House for Sale", "Grocery Run", "Beautiful House", "Random Neighbor", "Second Floor"],
      f: ["Neighbor's House", "Block Party", "Carpool", "Backyard BBQ"],
      p: ["Perfect Lawn", "Leaf Pile"],
    },
  },
  prospect: {
    id: "prospect",
    name: "Prospect Park",
    area: "Brooklyn",
    home: "adam",
    homeNote: "Adam's home turf",
    ground: "#93C966",
    groundDeep: "#5E9A3E",
    labels: {
      h: ["Coffee Shop", "Bakery", "Park Bench", "Family Walk", "Playground"],
      a: ["Youths", "Airport Car", "Stroller Jam", "E-Bikes", "Alt-Side Parking", "Car Alarm"],
      e: ["Sushi", "LEGO Delivery", "Brownstone", "Grand Army", "Bookstore"],
      f: ["Stoop Hang", "Long Meadow", "Brunch", "Picnic"],
      p: ["Prospect Park", "Quiet Morning"],
    },
  },
  river: {
    id: "river",
    name: "The River",
    area: "Irvington",
    home: "marshall",
    homeNote: "Marshall's home turf",
    ground: "#6FB7D9",
    groundDeep: "#3C82B0",
    labels: {
      h: ["River Walk", "Waterfront", "Main Street", "Park", "Scenic View"],
      a: ["Metro-North", "Other Rivertown", "Hills", "Parking", "Saw Mill Traffic", "Tourists"],
      e: ["Coyote", "Irvington Restaurant", "BBQ", "Aqueduct Trail", "Farm Stand"],
      f: ["Neighbor", "Family Day", "Deck Hang", "Little League"],
      p: ["Hudson Sunset", "The View"],
    },
  },
  ues: {
    id: "ues",
    name: "Upper East Side",
    area: "Manhattan",
    home: "billy",
    homeNote: "Billy's home turf",
    ground: "#E3D5BE",
    groundDeep: "#B79F7C",
    labels: {
      h: ["Boutique", "Central Park", "Doorman", "Fashion", "Townhouse"],
      a: ["Bad Renovation", "$19 Juice", "Crosstown Bus", "Scaffolding", "Tourists", "Double-Parked"],
      e: ["Citarella", "Golf Shop", "Open House", "Restaurant", "Madison Ave"],
      f: ["Museum Mile", "Dinner Party", "Lobby", "Bistro"],
      p: ["Fifth Avenue", "Beautiful Apartment"],
    },
  },
};

const WORLD_ORDER = ["wilmot", "prospect", "river", "ues"];

function buildBoard(worldId) {
  const w = WORLDS[worldId];
  const used = { h: 0, a: 0, e: 0, f: 0, p: 0 };
  return BOARD_PATTERN.map((t, i) => {
    const list = w.labels[t];
    const label = list[used[t]++ % list.length];
    return { i, t, type: SPACE_TYPES[t].key, label };
  });
}

// Cartoon scene for each world (board center, world picker, title).
function sceneSVG(worldId) {
  const tree = (x, y, s = 1, c = "#3F9E4D") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="0" width="6" height="16" rx="2" fill="#7A5134"/><circle cx="0" cy="-6" r="14" fill="${c}"/><circle cx="-9" cy="2" r="9" fill="${c}"/><circle cx="9" cy="2" r="9" fill="${c}"/></g>`;
  let s = "";
  if (worldId === "wilmot") {
    s += `<rect width="320" height="180" fill="#BDE6FF"/><circle cx="270" cy="34" r="18" fill="#FFE27A"/>`;
    s += `<path d="M0 112 Q80 86 160 104 T320 96 V180 H0 Z" fill="#8FD18A"/><path d="M0 140 Q100 120 200 136 T320 128 V180 H0 Z" fill="#74C170"/>`;
    s += `<path d="M-10 176 C60 150 110 170 160 150 S260 130 330 142" stroke="#D9D2C2" stroke-width="16" fill="none"/><path d="M-10 176 C60 150 110 170 160 150 S260 130 330 142" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="8 8" fill="none"/>`;
    s += `<g transform="translate(40 76)"><rect x="0" y="16" width="62" height="36" fill="#FFFFFF"/><path d="M-6 18 L31 -6 L68 18 Z" fill="#46506A"/><rect x="26" y="32" width="11" height="20" fill="#D6453D"/><rect x="8" y="24" width="10" height="10" fill="#9CC9F0"/><rect x="45" y="24" width="10" height="10" fill="#9CC9F0"/><rect x="48" y="-2" width="7" height="12" fill="#8A4B3A"/></g>`;
    s += `<g transform="translate(196 72)"><rect x="0" y="18" width="70" height="38" fill="#C9D6E6"/><path d="M-6 20 L35 -4 L76 20 Z" fill="#6A4E3B"/><rect x="30" y="36" width="11" height="20" fill="#2F4A6B"/><rect x="8" y="26" width="12" height="10" fill="#FFFFFF"/><rect x="50" y="26" width="12" height="10" fill="#FFFFFF"/></g>`;
    s += `<g transform="translate(118 132)"><rect x="0" y="0" width="44" height="18" rx="6" fill="#20242E"/><rect x="6" y="-8" width="30" height="12" rx="4" fill="#20242E"/><rect x="9" y="-6" width="11" height="8" rx="2" fill="#8FC7F2"/><rect x="23" y="-6" width="10" height="8" rx="2" fill="#8FC7F2"/><circle cx="10" cy="18" r="5" fill="#111"/><circle cx="34" cy="18" r="5" fill="#111"/></g>`;
    s += tree(16, 96, 1) + tree(128, 88, 1.1, "#2F8A45") + tree(292, 90, 1.2) + tree(176, 100, .8, "#58B25F");
    s += `<g transform="translate(270 122)"><rect x="0" y="0" width="3" height="22" fill="#6B6B6B"/><rect x="-14" y="-6" width="32" height="12" rx="2" fill="#FFFFFF" stroke="#C0392B" stroke-width="2"/><text x="2" y="3" font-size="6" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#C0392B">FOR SALE</text></g>`;
  } else if (worldId === "prospect") {
    s += `<rect width="320" height="180" fill="#FFE6C9"/><circle cx="60" cy="36" r="16" fill="#FFD166"/>`;
    const bs = ["#8B5A3C", "#9C6644", "#7D4E33", "#A06A48"];
    for (let i = 0; i < 4; i++) {
      const x = 160 + i * 40;
      s += `<rect x="${x}" y="40" width="40" height="110" fill="${bs[i]}"/><rect x="${x}" y="36" width="40" height="6" fill="#5C3A26"/>`;
      for (let r = 0; r < 3; r++) s += `<rect x="${x + 7}" y="${52 + r * 26}" width="10" height="16" fill="#FFF3D6"/><rect x="${x + 23}" y="${52 + r * 26}" width="10" height="16" fill="#FFF3D6"/>`;
      s += `<path d="M${x + 12} 150 L${x + 16} 132 H${x + 30} V150 Z" fill="#6B4430"/>`;
    }
    s += `<path d="M0 118 Q70 96 150 116 V180 H0 Z" fill="#7CBF5A"/><rect x="0" y="150" width="320" height="30" fill="#CFC6B6"/><rect x="0" y="148" width="320" height="4" fill="#B7AD9C"/>`;
    s += tree(24, 104, 1.3, "#3E8E3E") + tree(70, 96, 1.5, "#4DA34A") + tree(122, 108, 1.1, "#3E8E3E");
    s += `<g transform="translate(88 150)" stroke="#2A2F45" stroke-width="3" fill="none"><circle cx="0" cy="14" r="9"/><circle cx="30" cy="14" r="9"/><path d="M0 14 L12 0 L24 0 L30 14 M12 0 L16 14 L24 0 M10 -4 H16"/></g>`;
    s += `<g transform="translate(40 150)"><rect x="0" y="0" width="20" height="14" rx="5" fill="#2F6FE4"/><circle cx="4" cy="17" r="4" fill="#222"/><circle cx="17" cy="17" r="4" fill="#222"/><path d="M20 2 L28 -10" stroke="#222" stroke-width="3"/></g>`;
  } else if (worldId === "river") {
    s += `<defs><linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB36B"/><stop offset="1" stop-color="#FF8FA3"/></linearGradient></defs>`;
    s += `<rect width="320" height="180" fill="url(#rsky)"/><circle cx="220" cy="78" r="22" fill="#FFE08A"/>`;
    s += `<path d="M0 78 L40 70 L90 74 L150 66 L210 72 L260 64 L320 70 V98 H0 Z" fill="#6D5A8C"/>`;
    s += `<rect x="0" y="96" width="320" height="42" fill="#4D8FD6"/><path d="M20 108 H70 M120 116 H190 M230 106 H290 M60 126 H110 M200 128 H260" stroke="#9CC8F2" stroke-width="3" stroke-linecap="round"/><path d="M196 100 L244 100 L232 104 L208 104 Z" fill="#FFE08A" opacity=".6"/>`;
    s += `<path d="M0 136 Q160 126 320 138 V180 H0 Z" fill="#5FAF5A"/><rect x="0" y="146" width="320" height="5" fill="#8B7B6B"/><path d="M0 145 H320 M0 152 H320" stroke="#5A4E42" stroke-width="1.5"/>`;
    s += tree(26, 150, 1.1, "#357D3E") + tree(290, 152, 1.2, "#357D3E") + tree(140, 156, .8, "#468F48");
    s += `<g transform="translate(200 158)"><path d="M0 8 Q4 0 14 2 L22 2 L26 -4 L28 2 L30 -4 L30 4 Q30 10 22 10 L6 10 L-4 16 Q-6 8 0 8 Z" fill="#9E7B55"/><path d="M4 10 L2 18 M10 10 L10 18 M18 10 L18 18 M22 10 L24 18" stroke="#9E7B55" stroke-width="2.5"/></g>`;
  } else {
    s += `<rect width="320" height="180" fill="#D9E4FF"/>`;
    const blds = [[0, 30, 70, "#E8D8C0"], [70, 50, 60, "#C9B79C"], [130, 20, 76, "#EFE3CF"], [206, 44, 56, "#D2C0A2"], [262, 26, 58, "#E6D6BB"]];
    for (const [x, y, w, c] of blds) {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${150 - y}" fill="${c}"/><rect x="${x}" y="${y}" width="${w}" height="5" fill="rgba(0,0,0,.12)"/>`;
      for (let yy = y + 14; yy < 118; yy += 16) for (let xx = x + 8; xx < x + w - 8; xx += 14) s += `<rect x="${xx}" y="${yy}" width="8" height="10" fill="#6E7FA6" opacity=".55"/>`;
    }
    s += `<path d="M20 118 H60 L64 126 H16 Z" fill="#2F6B4F"/><path d="M142 116 H194 L198 126 H138 Z" fill="#2F6B4F"/><rect x="18" y="126" width="3" height="24" fill="#8C7A5B"/><rect x="57" y="126" width="3" height="24" fill="#8C7A5B"/>`;
    s += `<rect x="0" y="150" width="320" height="30" fill="#BDB6AA"/><rect x="0" y="148" width="320" height="4" fill="#9E978A"/>`;
    s += `<g transform="translate(160 128)"><rect x="-5" y="0" width="10" height="20" rx="2" fill="#1F3557"/><circle cx="0" cy="-5" r="5" fill="#EBC199"/><rect x="-6" y="-11" width="12" height="4" rx="1" fill="#1F3557"/><rect x="-3" y="-13" width="6" height="3" fill="#E0A21B"/></g>`;
    s += `<g transform="translate(230 154)"><rect x="0" y="0" width="46" height="16" rx="5" fill="#F7C31B"/><rect x="8" y="-8" width="28" height="10" rx="3" fill="#F7C31B"/><rect x="11" y="-6" width="10" height="7" fill="#9CC9F0"/><rect x="24" y="-6" width="9" height="7" fill="#9CC9F0"/><circle cx="10" cy="16" r="4.5" fill="#222"/><circle cx="36" cy="16" r="4.5" fill="#222"/></g>`;
    s += tree(96, 146, 1.1, "#3E8E3E") + tree(300, 146, 1, "#4DA34A");
  }
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}
