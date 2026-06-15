const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'summary.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 20000 }); } catch (e) {}
  await p.waitForTimeout(800);
  const mcount = await p.evaluate(() => document.querySelectorAll('figure.mermaid-fig svg').length);
  const failed = await p.evaluate(() => document.querySelectorAll('figure.diagram pre').length);
  await p.screenshot({ path: path.join(OUT, 'summary_top.png') });
  // 中ほど（実行順序あたり）
  await p.evaluate(() => { const hs = document.querySelectorAll('h2'); if (hs[3]) hs[3].scrollIntoView(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'summary_mid.png') });
  // ダーク
  await p.click('#themeToggle');
  try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 15000 }); } catch (e) {}
  await p.waitForTimeout(700);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(OUT, 'summary_dark.png') });
  await b.close();
  console.log('mermaid描画:', mcount, '/ 失敗(pre化):', failed, '/ console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
