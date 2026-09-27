(() => {
'use strict';

/* ---------- Static data ---------- */

// id: [abbr, short name, full name, color]
const TEAMS = {
  108: ['LAA', 'Angels', 'Los Angeles Angels', '#BA0021'],
  109: ['ARI', 'D-backs', 'Arizona Diamondbacks', '#A71930'],
  110: ['BAL', 'Orioles', 'Baltimore Orioles', '#DF4601'],
  111: ['BOS', 'Red Sox', 'Boston Red Sox', '#BD3039'],
  112: ['CHC', 'Cubs', 'Chicago Cubs', '#0E3386'],
  113: ['CIN', 'Reds', 'Cincinnati Reds', '#C6011F'],
  114: ['CLE', 'Guardians', 'Cleveland Guardians', '#00385D'],
  115: ['COL', 'Rockies', 'Colorado Rockies', '#333366'],
  116: ['DET', 'Tigers', 'Detroit Tigers', '#0C2340'],
  117: ['HOU', 'Astros', 'Houston Astros', '#EB6E1F'],
  118: ['KC', 'Royals', 'Kansas City Royals', '#004687'],
  119: ['LAD', 'Dodgers', 'Los Angeles Dodgers', '#005A9C'],
  120: ['WSH', 'Nationals', 'Washington Nationals', '#AB0003'],
  121: ['NYM', 'Mets', 'New York Mets', '#FF5910'],
  133: ['ATH', 'Athletics', 'Athletics', '#003831'],
  134: ['PIT', 'Pirates', 'Pittsburgh Pirates', '#FDB827'],
  135: ['SD', 'Padres', 'San Diego Padres', '#2F241D'],
  136: ['SEA', 'Mariners', 'Seattle Mariners', '#0C2C56'],
  137: ['SF', 'Giants', 'San Francisco Giants', '#FD5A1E'],
  138: ['STL', 'Cardinals', 'St. Louis Cardinals', '#C41E3A'],
  139: ['TB', 'Rays', 'Tampa Bay Rays', '#092C5C'],
  140: ['TEX', 'Rangers', 'Texas Rangers', '#003278'],
  141: ['TOR', 'Blue Jays', 'Toronto Blue Jays', '#134A8E'],
  142: ['MIN', 'Twins', 'Minnesota Twins', '#002B5C'],
  143: ['PHI', 'Phillies', 'Philadelphia Phillies', '#E81828'],
  144: ['ATL', 'Braves', 'Atlanta Braves', '#CE1141'],
  145: ['CWS', 'White Sox', 'Chicago White Sox', '#27251F'],
  146: ['MIA', 'Marlins', 'Miami Marlins', '#00A3E0'],
  147: ['NYY', 'Yankees', 'New York Yankees', '#0C2340'],
  158: ['MIL', 'Brewers', 'Milwaukee Brewers', '#12284B'],
};
const DIVISIONS = { 200: 'AL West', 201: 'AL East', 202: 'AL Central', 203: 'NL West', 204: 'NL East', 205: 'NL Central' };
const LEAGUE_ID = { AL: 103, NL: 104 };

const now0 = new Date();
const SEASON = now0.getMonth() < 2 ? now0.getFullYear() - 1 : now0.getFullYear();
const API = 'https://statsapi.mlb.com/api/v1';

const ROUNDS = {
  WC: { name: 'Wild Card', bestOf: 3, pts: 1, type: 'F', dates: 'Sep 29 – Oct 1', start: '2026-09-29T12:00:00' },
  DS: { name: 'Division Series', bestOf: 5, pts: 2, type: 'D', dates: 'Starts Oct 3', start: '2026-10-03T12:00:00' },
  CS: { name: 'Championship Series', bestOf: 7, pts: 4, type: 'L', dates: 'Starts Oct 11', start: '2026-10-11T12:00:00' },
  WS: { name: 'World Series', bestOf: 7, pts: 8, type: 'W', dates: 'Starts Oct 23', start: '2026-10-23T12:00:00' },
};
const TYPE_BEST_OF = { F: 3, D: 5, L: 7, W: 7 };

// Bracket slots in dependency order. #1 meets the 4/5 winner, #2 meets the 3/6 winner.
const SLOTS = [];
for (const L of ['AL', 'NL']) {
  SLOTS.push({ id: `${L}-WC45`, L, round: 'WC', from: [{ seed: 4 }, { seed: 5 }], short: `${L} WC #4 v #5` });
  SLOTS.push({ id: `${L}-WC36`, L, round: 'WC', from: [{ seed: 3 }, { seed: 6 }], short: `${L} WC #3 v #6` });
  SLOTS.push({ id: `${L}-DS1`, L, round: 'DS', from: [{ seed: 1 }, { slot: `${L}-WC45` }], short: `${L}DS (#1 side)` });
  SLOTS.push({ id: `${L}-DS2`, L, round: 'DS', from: [{ seed: 2 }, { slot: `${L}-WC36` }], short: `${L}DS (#2 side)` });
  SLOTS.push({ id: `${L}-CS`, L, round: 'CS', from: [{ slot: `${L}-DS1` }, { slot: `${L}-DS2` }], short: `${L}CS` });
}
SLOTS.push({ id: 'WS', L: null, round: 'WS', from: [{ slot: 'AL-CS' }, { slot: 'NL-CS' }], short: 'World Series' });
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const CHILDREN = {};
for (const s of SLOTS) for (const f of s.from) if (f.slot) (CHILDREN[f.slot] ||= []).push(s.id);

const COLUMNS = [
  { key: 'AL-WC', L: 'AL', round: 'WC', title: 'AL Wild Card', slots: ['AL-WC45', 'AL-WC36'] },
  { key: 'AL-DS', L: 'AL', round: 'DS', title: 'AL Division Series', slots: ['AL-DS1', 'AL-DS2'] },
  { key: 'AL-CS', L: 'AL', round: 'CS', title: 'ALCS', slots: ['AL-CS'] },
  { key: 'WS', L: null, round: 'WS', title: 'World Series', slots: ['WS'] },
  { key: 'NL-CS', L: 'NL', round: 'CS', title: 'NLCS', slots: ['NL-CS'] },
  { key: 'NL-DS', L: 'NL', round: 'DS', title: 'NL Division Series', slots: ['NL-DS1', 'NL-DS2'] },
  { key: 'NL-WC', L: 'NL', round: 'WC', title: 'NL Wild Card', slots: ['NL-WC45', 'NL-WC36'] },
];

// Used only when the live feed can't be reached. Per MLB.com's playoff picture, Sep 27, 2026.
const SNAPSHOT = {
  asOf: 'Sep 27, 2026',
  seeds: { AL: [null, 139, 114, 117, 147, 111, 145], NL: [null, 158, 119, 144, 135, 112, 143] },
  teams: {
    139: { clinch: 'div' }, 114: { clinch: 'div' }, 117: { clinch: '', div: 200 },
    147: { clinch: 'in' }, 111: { clinch: 'in' }, 145: { clinch: 'in' },
    158: { clinch: 'div' }, 119: { clinch: 'div' }, 144: { clinch: 'div' },
    135: { clinch: 'in' }, 112: { clinch: 'in' }, 143: { clinch: '' },
  },
  hunt: { AL: [{ id: 140, note: 'chasing HOU for the AL West' }], NL: [{ id: 109, note: 'chasing PHI for the last Wild Card' }] },
};

/* ---------- State ---------- */

let data = {
  source: 'snapshot', updated: null, error: null,
  seeds: SNAPSHOT.seeds, teams: SNAPSHOT.teams, hunt: SNAPSHOT.hunt,
  series: new Map(),
};

const STORE_KEY = 'mlbBracket.v1';
let store = loadStore();

function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && s.brackets && Object.keys(s.brackets).length) {
      if (!s.brackets[s.active]) s.active = Object.keys(s.brackets)[0];
      return s;
    }
  } catch (e) { /* storage unavailable */ }
  return { active: 'b1', brackets: { b1: { name: 'My bracket', picks: {} } } };
}
let storageOk = true;
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); storageOk = true; }
  catch (e) { storageOk = false; }
  updateSavedNote();
}
const active = () => store.brackets[store.active];

/* ---------- Helpers ---------- */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abbr = id => (TEAMS[id] ? TEAMS[id][0] : '?');
const short = id => (TEAMS[id] ? TEAMS[id][1] : 'TBD');
const color = id => (TEAMS[id] ? TEAMS[id][3] : 'var(--line)');
const logo = id => `https://www.mlbstatic.com/team-logos/${id}.svg`;
const logoImg = (id, cls = 'logo') => id
  ? `<img class="${cls}" src="${logo(id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
  : `<span class="${cls} blank"></span>`;
const pairKey = (type, a, b) => `${type}:${Math.min(a, b)}-${Math.max(a, b)}`;

function seedOf(id) {
  for (const L of ['AL', 'NL']) {
    const i = data.seeds[L].indexOf(id);
    if (i > 0) return { L, seed: i };
  }
  return null;
}
function record(id) {
  const t = data.teams[id];
  return t && t.w != null ? `${t.w}-${t.l}` : '';
}
function fmtTime(iso, tbd) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return tbd ? `${day}, time TBD` : `${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

/* ---------- Live data ---------- */

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function parseStandings(json) {
  const teams = {}, byLeague = { 103: [], 104: [] };
  for (const rec of json.records || []) {
    const lg = rec.league && rec.league.id;
    const div = rec.division && rec.division.id;
    for (const tr of rec.teamRecords || []) {
      const id = tr.team.id;
      const row = {
        id, div, w: tr.wins, l: tr.losses, pct: parseFloat(tr.winningPercentage) || 0,
        divRank: parseInt(tr.divisionRank, 10) || 99,
        wcRank: parseInt(tr.wildCardRank, 10) || 99,
        leagueRank: parseInt(tr.leagueRank, 10) || 99,
        gb: tr.gamesBack, wcgb: tr.wildCardGamesBack,
        elim: tr.eliminationNumber, wcElim: tr.wildCardEliminationNumber,
        clinch: tr.divisionChamp ? 'div' : tr.clinched ? 'in' : '',
      };
      teams[id] = row;
      if (byLeague[lg]) byLeague[lg].push(row);
    }
  }
  const seeds = {}, hunt = {};
  for (const L of ['AL', 'NL']) {
    const rows = byLeague[LEAGUE_ID[L]];
    const byPct = (a, b) => b.pct - a.pct || a.leagueRank - b.leagueRank;
    const leaders = [], seenDiv = new Set();
    for (const r of [...rows].sort((a, b) => a.divRank - b.divRank || byPct(a, b))) {
      if (!seenDiv.has(r.div)) { seenDiv.add(r.div); leaders.push(r); }
    }
    leaders.sort(byPct);
    const leaderIds = new Set(leaders.map(r => r.id));
    const others = rows.filter(r => !leaderIds.has(r.id)).sort((a, b) => a.wcRank - b.wcRank || byPct(a, b));
    const wc = others.slice(0, 3);
    seeds[L] = [null, ...leaders.slice(0, 3).map(r => r.id), ...wc.map(r => r.id)];
    const h = [];
    for (const lead of leaders) {
      if (lead.clinch) continue;
      const rival = rows.filter(r => r.div === lead.div && r.id !== lead.id && r.elim !== 'E').sort(byPct)[0];
      if (rival) h.push({ id: rival.id, note: `${rival.gb === '-' ? 'tied' : rival.gb + ' GB'} in the ${DIVISIONS[lead.div] || 'division'}` });
    }
    for (const r of others.slice(3)) {
      if (h.length >= 4 || r.wcElim === 'E') continue;
      if (h.some(x => x.id === r.id)) continue;
      h.push({ id: r.id, note: `${r.wcgb === '-' ? 'tied' : r.wcgb + ' GB'} for a Wild Card` });
    }
    hunt[L] = h;
  }
  if (seeds.AL.length < 7 || seeds.NL.length < 7) throw new Error('Standings incomplete');
  return { seeds, teams, hunt };
}

function buildSeries(games) {
  const map = new Map(), seen = new Set();
  for (const g of games) {
    if (!TYPE_BEST_OF[g.gameType] || seen.has(g.gamePk)) continue;
    seen.add(g.gamePk);
    const home = g.teams.home, away = g.teams.away;
    const h = home.team.id, a = away.team.id;
    const key = pairKey(g.gameType, h, a);
    let s = map.get(key);
    if (!s) {
      s = { type: g.gameType, need: Math.ceil(TYPE_BEST_OF[g.gameType] / 2), wins: { [h]: 0, [a]: 0 }, games: [], started: false, live: null, next: null, winner: null };
      map.set(key, s);
    }
    s.games.push(g);
    const state = g.status.abstractGameState;
    if (state === 'Final' && (home.isWinner || away.isWinner)) {
      s.wins[home.isWinner ? h : a]++;
      s.started = true;
    } else if (state === 'Live') {
      s.started = true;
      s.live = g;
    }
  }
  for (const s of map.values()) {
    const ids = Object.keys(s.wins).map(Number);
    s.winner = ids.find(id => s.wins[id] >= s.need) || null;
    s.next = s.games
      .filter(g => g.status.abstractGameState === 'Preview' && !/postponed|cancel/i.test(g.status.detailedState))
      .sort((x, y) => new Date(x.gameDate) - new Date(y.gameDate))[0] || null;
  }
  return map;
}

let timer = null, refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  setFeed('loading');
  const standingsUrl = `${API}/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`;
  const rangeUrl = `${API}/schedule?sportId=1&season=${SEASON}&startDate=${SEASON}-09-28&endDate=${SEASON}-11-20&hydrate=linescore`;
  const postUrl = `${API}/schedule/postseason?sportId=1&season=${SEASON}&hydrate=linescore`;
  const [st, r1, r2] = await Promise.allSettled([getJSON(standingsUrl), getJSON(rangeUrl), getJSON(postUrl)]);
  try {
    if (st.status !== 'fulfilled') throw st.reason;
    const parsed = parseStandings(st.value);
    const games = [];
    for (const r of [r1, r2]) {
      if (r.status !== 'fulfilled') continue;
      for (const d of r.value.dates || []) games.push(...(d.games || []));
    }
    data = { ...data, ...parsed, series: buildSeries(games), source: 'live', updated: new Date(), error: null };
  } catch (e) {
    data.error = e && e.message ? e.message : 'unavailable';
  }
  refreshing = false;
  render();
  scheduleRefresh();
}
function scheduleRefresh() {
  clearTimeout(timer);
  const anyLive = [...data.series.values()].some(s => s.live);
  timer = setTimeout(refresh, anyLive ? 45e3 : 5 * 60e3);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (!data.updated || Date.now() - data.updated > 60e3)) refresh();
});

function setFeed(mode) {
  const dot = $('feedDot'), txt = $('feedText');
  dot.className = 'dot';
  if (mode === 'loading') { txt.textContent = data.updated ? txt.textContent : 'Loading the real bracket…'; return; }
  if (data.source === 'live') {
    const t = data.updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (data.error) { dot.classList.add('warn'); txt.textContent = `Last updated ${t} · retrying`; }
    else { dot.classList.add('live'); txt.textContent = `Live from MLB · updated ${t}`; }
  } else {
    dot.classList.add('warn');
    txt.textContent = `Can't reach MLB right now · showing seeds as of ${SNAPSHOT.asOf}`;
  }
}

/* ---------- Bracket logic ---------- */

function computeActual() {
  const parts = {}, win = {}, ser = {}, out = new Set();
  for (const s of SLOTS) {
    parts[s.id] = s.from.map(f => (f.seed ? data.seeds[s.L][f.seed] || null : win[f.slot] || null));
    const [a, b] = parts[s.id];
    ser[s.id] = a && b ? data.series.get(pairKey(ROUNDS[s.round].type, a, b)) || null : null;
    win[s.id] = ser[s.id] ? ser[s.id].winner : null;
    if (win[s.id]) out.add(win[s.id] === a ? b : a);
  }
  return { parts, win, ser, out };
}

function computeUser(picks, act) {
  const parts = {}, win = {}, pick = {}, locked = {};
  for (const s of SLOTS) {
    const p = s.from.map(f => (f.seed ? data.seeds[s.L][f.seed] || null : win[f.slot] || null));
    parts[s.id] = p;
    const ser = act.ser[s.id];
    locked[s.id] = !!(ser && ser.started) || !!act.win[s.id];
    const choice = picks[s.id];
    pick[s.id] = choice != null && p.includes(choice) ? choice : null;
    // A locked series you never picked still sends its real winner forward.
    const fallback = locked[s.id] && act.win[s.id] && p.includes(act.win[s.id]) ? act.win[s.id] : null;
    win[s.id] = pick[s.id] || fallback;
  }
  return { parts, win, pick, locked };
}

function grade(user, act, late) {
  let pts = 0, max = 0, right = 0, decided = 0, possible = 0;
  const result = {};
  for (const s of SLOTS) {
    const p = user.pick[s.id], w = act.win[s.id], val = ROUNDS[s.round].pts;
    max += val;
    if (!p) { result[s.id] = null; continue; }
    if (late[s.id]) { result[s.id] = 'late'; continue; }
    if (w) {
      decided++;
      if (p === w) { right++; pts += val; result[s.id] = 'correct'; } else result[s.id] = 'wrong';
    } else if (act.out.has(p)) {
      decided++; result[s.id] = 'wrong';
    } else { result[s.id] = 'pending'; possible += val; }
  }
  return { pts, max, right, decided, possibleMax: pts + possible, result };
}

function descendants(id) {
  const out = [], stack = [...(CHILDREN[id] || [])];
  while (stack.length) { const c = stack.pop(); out.push(c); stack.push(...(CHILDREN[c] || [])); }
  return out;
}

function choose(slotId, teamId) {
  const act = computeActual();
  const user = computeUser(active().picks, act);
  const b = active(), picks = b.picks, late = (b.late ||= {});
  const old = user.pick[slotId];
  if (user.locked[slotId]) {
    if (old && !late[slotId] && !confirm("This series has already started. If you change this pick it won't score. Change it?")) return;
    if (!old) toast("Series already underway: this pick moves your bracket along but won't score.");
  }
  if (old === teamId) { delete picks[slotId]; delete late[slotId]; }
  else {
    picks[slotId] = teamId;
    if (user.locked[slotId]) late[slotId] = true; else delete late[slotId];
  }
  if (old) {
    // Drop later picks that relied on the team you just replaced (on-time picks in started series stay).
    for (const d of descendants(slotId)) {
      if (picks[d] === old && (!user.locked[d] || late[d])) { delete picks[d]; delete late[d]; }
    }
  }
  active().updated = Date.now();
  saveStore();
  render();
}

function fillBySeed() {
  const picks = active().picks;
  let n = 0;
  for (const s of SLOTS) {
    const act = computeActual();
    const user = computeUser(picks, act);
    if (user.pick[s.id] || user.locked[s.id]) continue;
    const [a, b] = user.parts[s.id];
    if (!a || !b) continue;
    const sa = seedOf(a), sb = seedOf(b);
    let fav = sa.seed <= sb.seed ? a : b;
    if (sa.seed === sb.seed) {
      const ta = data.teams[a] || {}, tb = data.teams[b] || {};
      fav = (tb.pct || 0) > (ta.pct || 0) ? b : a;
    }
    picks[s.id] = fav; n++;
  }
  active().updated = Date.now();
  saveStore(); render();
  toast(n ? `Filled ${n} pick${n === 1 ? '' : 's'} with the higher seed.` : 'Nothing left to fill.');
}

/* ---------- Rendering ---------- */

const LOCK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4Zm2 0h4V5a2 2 0 1 0-4 0v2Z"/></svg>';

function placeholder(f) {
  const src = SLOT[f.slot];
  return `<div class="team empty"><span class="seed">–</span>${logoImg(null)}<span class="nm"><b>TBD</b><small>Pick the ${esc(src.short)} winner</small></span><span class="sw"></span><span class="mark"></span></div>`;
}

function seriesFooter(s, act, user) {
  const ser = act.ser[s.id];
  const ap = act.parts[s.id], up = user.parts[s.id];
  const bits = [];
  const realDiffers = ap[0] && ap[1] && !(up.includes(ap[0]) && up.includes(ap[1]));
  if (realDiffers) bits.push(`<span class="real">Real: ${abbr(ap[0])} vs ${abbr(ap[1])}</span>`);
  if (ser) {
    const [a, b] = ap;
    const wa = ser.wins[a] || 0, wb = ser.wins[b] || 0;
    if (ser.winner) {
      const lo = ser.winner === a ? wb : wa;
      bits.push(`${abbr(ser.winner)} won ${ser.wins[ser.winner]}–${lo}`);
    } else if (ser.live) {
      const g = ser.live, ls = g.linescore || {};
      const inn = ls.currentInningOrdinal ? ` · ${ls.isTopInning === false ? 'Bot' : 'Top'} ${ls.currentInningOrdinal}` : '';
      bits.push(`<span class="live">LIVE</span> G${g.seriesGameNumber || ''} ${abbr(g.teams.away.team.id)} ${g.teams.away.score ?? 0}, ${abbr(g.teams.home.team.id)} ${g.teams.home.score ?? 0}${inn}`);
    } else {
      if (wa !== wb) bits.push(`${abbr(wa > wb ? a : b)} leads ${Math.max(wa, wb)}–${Math.min(wa, wb)}`);
      else if (wa > 0) bits.push(`Tied ${wa}–${wb}`);
      if (ser.next) bits.push(`G${ser.next.seriesGameNumber || ''} ${fmtTime(ser.next.gameDate, ser.next.status.startTimeTBD)}`);
    }
  } else {
    bits.push(`Best of ${ROUNDS[s.round].bestOf} · ${ROUNDS[s.round].dates}`);
  }
  const lock = user.locked[s.id] ? `<span class="lock" title="New picks here won't score">${LOCK_SVG}Locked</span>` : '';
  return `<footer class="foot"><span>${bits.join(' · ')}</span>${lock}</footer>`;
}

function renderCard(s, act, user, g) {
  const ser = act.ser[s.id];
  const ap = act.parts[s.id];
  const rows = s.from.map((f, i) => {
    const id = user.parts[s.id][i];
    if (!id) return placeholder(f);
    const sd = seedOf(id);
    const isPick = user.pick[s.id] === id;
    const res = isPick ? g.result[s.id] : null;
    const cls = ['team'];
    if (isPick) cls.push('picked');
    if (res === 'correct') cls.push('correct');
    if (res === 'wrong') cls.push('wrong');
    if (res === 'late') cls.push('late');
    if (act.out.has(id)) cls.push('out');
    const inReal = ser && ap.includes(id);
    if (inReal && ser.winner === id) cls.push('won');
    const wins = inReal ? ser.wins[id] || 0 : '';
    const mark = res === 'correct' ? '✓' : res === 'wrong' ? '✗' : '';
    const sub = [res === 'late' ? 'Late pick' : '', record(id) || (sd ? `#${sd.seed} ${sd.L}` : '')].filter(Boolean).join(' · ');
    const label = `${TEAMS[id] ? TEAMS[id][2] : 'Team'}${isPick ? ', your pick' : ''}`;
    return `<button type="button" class="${cls.join(' ')}" style="--tc:${color(id)}" data-slot="${s.id}" data-team="${id}" aria-pressed="${isPick}" aria-label="${esc(label)}" >
      <span class="seed">${sd ? sd.seed : ''}</span>${logoImg(id)}
      <span class="nm"><b>${esc(short(id))}</b><small>${esc(sub)}</small></span>
      <span class="sw">${wins}</span><span class="mark">${mark}</span></button>`;
  }).join('');
  return `<article class="card${s.round === 'WS' ? ' ws' : ''}">${rows}${seriesFooter(s, act, user)}</article>`;
}

function render() {
  setFeed();
  const act = computeActual();
  const b = active();
  const user = computeUser(b.picks, act);
  const g = grade(user, act, b.late || {});

  $('bracket').innerHTML = COLUMNS.map(c => `
    <section class="col ${c.L ? c.L.toLowerCase() : ''}" data-col="${c.key}">
      <div class="col-head"><h3>${c.title}</h3><small>Best of ${ROUNDS[c.round].bestOf} · ${ROUNDS[c.round].dates}</small></div>
      <div class="cards">${c.slots.map(id => renderCard(SLOT[id], act, user, g)).join('')}</div>
    </section>`).join('');

  // Champion banner
  const champ = user.pick.WS;
  const picked = SLOTS.filter(s => user.pick[s.id]).length;
  if (champ) {
    const res = g.result.WS;
    const tag = res === 'correct' ? 'Called it!' : res === 'wrong' ? (act.win.WS ? `${short(act.win.WS)} won it all` : 'Eliminated') : `${picked}/${SLOTS.length} picks`;
    const opp = user.parts.WS.find(t => t && t !== champ);
    $('champ').innerHTML = `${logoImg(champ)}<div><div class="lbl">Your champion</div><div class="who">${esc(TEAMS[champ][2])}</div><div class="sub">${opp ? `over the ${esc(short(opp))} in the World Series` : ''}</div></div><span class="tag">${esc(tag)}</span>`;
  } else {
    $('champ').innerHTML = `${logoImg(null)}<div><div class="lbl">Your champion</div><div class="who">Still deciding</div><div class="sub">Tap a team in each series to move it on. ${picked}/${SLOTS.length} picks made.</div></div>`;
  }

  // Score
  $('score').innerHTML = `<div><b>${g.pts}</b><span>Points</span></div><div><b>${g.right}/${g.decided}</b><span>Correct</span></div><div><b>${g.possibleMax}</b><span>Max left</span></div>`;

  renderPicker();
  renderPicture();
}

function renderPicker() {
  const sel = $('bracketSelect');
  sel.innerHTML = Object.entries(store.brackets).map(([id, b]) => `<option value="${id}"${id === store.active ? ' selected' : ''}>${esc(b.name || 'Untitled')}</option>`).join('');
  const name = $('bracketName');
  if (document.activeElement !== name) name.value = active().name || '';
  $('deleteBtn').disabled = Object.keys(store.brackets).length < 2;
  updateSavedNote();
}
function updateSavedNote() {
  $('savedNote').textContent = storageOk
    ? 'Picks save automatically on this device. Use Share link to keep a copy or send it to friends.'
    : "This browser won't let the page save. Use Share link to keep your picks.";
}

function renderPicture() {
  const pill = t => {
    const c = (data.teams[t] || {}).clinch;
    return c === 'div' ? '<span class="pill div">Division ✓</span>' : c === 'in' ? '<span class="pill in">Clinched</span>' : '<span class="pill prov">Provisional</span>';
  };
  $('picture').innerHTML = ['AL', 'NL'].map(L => {
    const items = data.seeds[L].slice(1).map((id, i) => `<li><span class="s">${i + 1}</span>${logoImg(id)}<span>${esc(TEAMS[id][2])}</span><span class="r">${record(id)}</span>${pill(id)}</li>`).join('');
    const hunt = (data.hunt[L] || []).map(h => `<b>${esc(short(h.id))}</b> ${esc(h.note)}${record(h.id) ? ` (${record(h.id)})` : ''}`).join(' · ');
    return `<div class="league ${L.toLowerCase()}"><h3>${L === 'AL' ? 'American League' : 'National League'}</h3><ol>${items}</ol>${hunt ? `<p class="hunt">In the hunt: ${hunt}</p>` : ''}</div>`;
  }).join('');
  const provisional = ['AL', 'NL'].some(L => data.seeds[L].slice(1).some(id => !(data.teams[id] || {}).clinch));
  $('pictureNote').textContent = provisional
    ? 'Provisional seeds can still change. If a team drops out, picks involving it clear from your bracket.'
    : 'Field is set. #1 plays the 4/5 winner; #2 plays the 3/6 winner.';
}

/* ---------- Sharing ---------- */

function encodeShare(b) {
  const json = JSON.stringify({ v: 1, s: SEASON, n: b.name, p: b.picks, l: Object.keys(b.late || {}) });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeShare(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const obj = JSON.parse(decodeURIComponent(escape(atob(b64))));
  const picks = {};
  for (const [k, v] of Object.entries(obj.p || {})) if (SLOT[k] && TEAMS[v]) picks[k] = Number(v);
  const late = {};
  for (const k of obj.l || []) if (picks[k] != null) late[k] = true;
  return { name: String(obj.n || 'Shared bracket').slice(0, 40), picks, late };
}
function importFromHash() {
  const m = location.hash.match(/[#&]b=([A-Za-z0-9_-]+)/);
  if (!m) return;
  try {
    const { name, picks, late } = decodeShare(m[1]);
    const same = Object.entries(store.brackets).find(([, b]) => b.name === name && JSON.stringify(b.picks) === JSON.stringify(picks));
    if (same) { store.active = same[0]; }
    else {
      const id = 'b' + Date.now().toString(36);
      store.brackets[id] = { name, picks, late, updated: Date.now() };
      store.active = id;
      toast(`Loaded “${name}”.`);
    }
    saveStore();
  } catch (e) { toast("That share link couldn't be read."); }
  history.replaceState(null, '', location.pathname + location.search);
}

async function copyText(text, ok) {
  try { await navigator.clipboard.writeText(text); toast(ok); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    let done = false;
    try { done = document.execCommand('copy'); } catch (_) { /* no-op */ }
    ta.remove();
    toast(done ? ok : 'Copy failed — your browser blocked the clipboard.');
  }
}

function picksAsText() {
  const act = computeActual();
  const user = computeUser(active().picks, act);
  const lines = [`${active().name} — ${SEASON} MLB postseason`];
  for (const s of SLOTS) {
    const p = user.pick[s.id];
    const opp = p ? user.parts[s.id].find(t => t && t !== p) : null;
    const label = s.round === 'WS' ? 'World Series' : s.round === 'CS' ? `${s.L}CS` : `${s.L} ${ROUNDS[s.round].name}`;
    lines.push(`${label}: ${p ? `${TEAMS[p][2]}${opp ? ` over ${short(opp)}` : ''}` : '—'}`);
  }
  if (user.pick.WS) lines.push(`Champion: ${TEAMS[user.pick.WS][2]}`);
  return lines.join('\n');
}

/* ---------- UI wiring ---------- */

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

$('bracket').addEventListener('click', e => {
  const btn = e.target.closest('button[data-slot]');
  if (btn && !btn.disabled) choose(btn.dataset.slot, Number(btn.dataset.team));
});
$('bracketSelect').addEventListener('change', e => { store.active = e.target.value; saveStore(); render(); });
$('bracketName').addEventListener('input', e => {
  active().name = e.target.value.slice(0, 40) || 'Untitled';
  saveStore();
  const opt = $('bracketSelect').querySelector(`option[value="${store.active}"]`);
  if (opt) opt.textContent = active().name;
});
$('newBtn').addEventListener('click', () => {
  const id = 'b' + Date.now().toString(36);
  store.brackets[id] = { name: `Bracket ${Object.keys(store.brackets).length + 1}`, picks: {}, updated: Date.now() };
  store.active = id;
  saveStore(); render();
  $('bracketName').focus(); $('bracketName').select();
});
$('deleteBtn').addEventListener('click', () => {
  if (Object.keys(store.brackets).length < 2) return;
  if (!confirm(`Delete “${active().name}”? This can't be undone.`)) return;
  delete store.brackets[store.active];
  store.active = Object.keys(store.brackets)[0];
  saveStore(); render();
});
$('clearBtn').addEventListener('click', () => {
  const act = computeActual();
  const user = computeUser(active().picks, act);
  const late = active().late || {};
  const unlocked = SLOTS.filter(s => active().picks[s.id] != null && (!user.locked[s.id] || late[s.id]));
  if (!unlocked.length) { toast('No open picks to clear.'); return; }
  if (!confirm(`Clear ${unlocked.length} open pick${unlocked.length === 1 ? '' : 's'}? Picks in series that already started stay.`)) return;
  for (const s of unlocked) { delete active().picks[s.id]; delete late[s.id]; }
  saveStore(); render();
});
$('chalkBtn').addEventListener('click', fillBySeed);
$('shareBtn').addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}#b=${encodeShare(active())}`;
  copyText(url, 'Share link copied. Opening it loads this bracket.');
});
$('copyBtn').addEventListener('click', () => copyText(picksAsText(), 'Picks copied as text.'));
$('refreshBtn').addEventListener('click', refresh);
window.addEventListener('hashchange', () => { importFromHash(); render(); });

$('season').textContent = SEASON;
importFromHash();
render();
refresh();
})();
