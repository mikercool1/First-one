// Dumps the app's DNA scoring for every owner (run after build_import.py): node dump_dna.js dna.json
// Uses the imported data only; DNA overrides saved in the app are not included.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out/data');
const docs = {};
for (const dir of ['data','sku']) for (const f of fs.readdirSync(path.join(__dirname, 'out', dir))) docs[dir + '/' + f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', dir, f)));
const mock = `
window.__docs = ${JSON.stringify(docs)};
(() => {
  const D = window.__docs, subs = [];
  const snapDoc = p => ({ id: p.split('/').pop(), exists: p in D, data: () => D[p] ? JSON.parse(JSON.stringify(D[p])) : undefined });
  const fire = () => subs.forEach(s => s());
  const colSnap = c => ({ docs: Object.keys(D).filter(k => k.startsWith(c + '/') && k.split('/').length === 2).map(snapDoc) });
  const docRef = p => ({ id: p.split('/').pop(), get: async () => snapDoc(p), set: async v => { D[p] = JSON.parse(JSON.stringify(v)); setTimeout(fire); }, update: async v => { D[p] = { ...(D[p] || {}), ...v }; setTimeout(fire); }, delete: async () => { delete D[p]; setTimeout(fire); }, onSnapshot: fn => { const s = () => fn(snapDoc(p)); subs.push(s); setTimeout(s); return () => {}; } });
  const colRef = c => { const q = { limit: () => q, doc: id => docRef(c + '/' + id), get: async () => colSnap(c), onSnapshot: fn => { const s = () => fn(colSnap(c)); subs.push(s); setTimeout(s); return () => {}; } }; return q; };
  window.claude = { use: async n => n === 'db' ? { doc: docRef, collection: colRef } : n === 'user' ? { can: async () => true } : n === 'sample' ? Object.assign(async () => ({text:''}), { json: async () => ({ pull: { v: 1, why: 'mock' }, itw: { v: 1, why: 'mock' }, major: { v: 2, why: 'mock' }, pro_pct: 70 }) }) : null };
})();`;
(async () => {
  const b = await chromium.launch();
  const errs = [];
  let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'); const cut = html.lastIndexOf('})();\n</script>'); html = html.slice(0, cut) + 'window.__X = { TESTS, CO, dnaOf };\n' + html.slice(cut);
  
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('pageerror', e.message));
  await pg.addInitScript(mock);
  await pg.route('http://t/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset=utf8></head><body>' + html + '</body></html>' }));
  await pg.route(/fonts/, r => r.abort());
  await pg.goto('http://t/#screen'); await pg.waitForTimeout(1500);
  const out = await pg.evaluate(() => { const { TESTS, CO, dnaOf } = window.__X; return {
    tests: TESTS.map(t => ({ k: t.k, t: t.t, q: t.q, w: t.w })),
    cos: [...CO.values()].map(c => { const d = dnaOf(c); return { id: c.id, name: c.name, otype: c.otype, oclass: c.oclass, sponsor: c.sponsor || "", parent: c.parent || "",
      model: c.model || "", trade: c.trade || "", hq: c.hq || "", verified: !!c.verified, skus: c.skus || 0, nbrands: (c.brands || []).length, pro_pct: c.judge?.pro_pct ?? null,
      rev: c.rev ?? null, score: d.score, band: d.band, out: d.out, tests: d.tests.map(t => ({ k: t.k, v: t.v, why: t.why, src: t.src })) }; }),
  }; });
  fs.writeFileSync(process.argv[2], JSON.stringify(out));
  console.log(out.cos.length);
  await b.close();
})();