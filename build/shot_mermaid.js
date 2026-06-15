const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = '#/t2-u1'; });
  // mermaid の SVG が描画されるまで待つ
  let ok = false;
  try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 15000 }); ok = true; } catch (e) {}
  await p.waitForTimeout(600);
  await p.evaluate(() => { const f = document.querySelector('figure.mermaid-fig'); if (f) f.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'mermaid_check.png') });
  const cnt = await p.evaluate(() => document.querySelectorAll('figure.mermaid-fig svg').length);
  await b.close();
  console.log('mermaid SVG 描画:', ok, '/ 図の数:', cnt, '/ console errors:', errors.length);
  errors.slice(0, 10).forEach(e => console.log(' -', e));
})();
