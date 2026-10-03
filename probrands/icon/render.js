const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.goto('file://' + __dirname + '/icon.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  console.log(await p.evaluate(() => [document.fonts.check('900 40px "Big Shoulders Display"'), document.fonts.check('700 20px "JetBrains Mono"')]));
  await p.screenshot({ path: __dirname + '/icon-1024.png' });
  for (const s of [512, 180, 32]) { const q = await b.newPage({ viewport: { width: s, height: s } }); await q.setContent(`<html><body style="margin:0"><img src="data:image/png;base64,${require('fs').readFileSync(__dirname + '/icon-1024.png').toString('base64')}" style="width:${s}px;height:${s}px;display:block"></body></html>`); await q.waitForTimeout(200); await q.screenshot({ path: __dirname + `/icon-${s}.png` }); }
  await b.close();
})();
