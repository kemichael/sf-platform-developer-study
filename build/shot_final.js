const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
const targets = (process.argv[2] || 't3-u1,t12-u2,t13-u1').split(',');
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 1200 } });
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  for (const t of targets) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, t);
    try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 12000 }); } catch (e) {}
    await p.waitForTimeout(500);
    await p.evaluate(() => { const f = document.querySelector('figure.mermaid-fig'); if (f) f.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, 'final_' + t + '.png') });
  }
  await b.close();
  console.log('完了 / console errors:', errors.length);
  errors.slice(0, 10).forEach(e => console.log(' -', e));
})();
