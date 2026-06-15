const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
const targets = (process.argv[2] || 't2-u1,t13-u1,t14-u3').split(',');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  for (const t of targets) {
    await page.evaluate((x) => { location.hash = '#/' + x; }, t);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'v2_' + t + '_top.png') });
    await page.screenshot({ path: path.join(OUT, 'v2_' + t + '_full.png'), fullPage: true });
  }
  await browser.close();
  console.log('スクショ完了 / コンソールエラー:', errors.length);
  errors.slice(0, 15).forEach(e => console.log(' -', e));
})();
