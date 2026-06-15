const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
const target = process.argv[2] || 't2-u1';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate((t) => { location.hash = '#/' + t; }, target);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'pilot_top.png') });
  await page.screenshot({ path: path.join(OUT, 'pilot_full.png'), fullPage: true });
  // ダーク
  await page.click('#themeToggle');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'pilot_dark_full.png'), fullPage: true });
  await browser.close();
  console.log('スクショ完了 / コンソールエラー:', errors.length);
  errors.slice(0, 15).forEach(e => console.log(' -', e));
})();
