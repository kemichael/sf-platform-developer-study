const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = '#/t2-u1'; });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const f = document.querySelector('figure.diagram'); if (f) f.scrollIntoView({block:'center'}); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'diag_check.png') });
  await b.close();
  console.log('done');
})();
