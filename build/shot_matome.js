const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'matome.html').replace(/\\/g, '/');
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
  const stats = await p.evaluate(() => ({
    mermaid: document.querySelectorAll('figure.mermaid-fig svg').length,
    failed: document.querySelectorAll('figure.diagram pre').length,
    navTopics: document.querySelectorAll('.nav-topic').length,
    navUnits: document.querySelectorAll('.nav-unit').length,
    callouts: document.querySelectorAll('.callout').length,
    trivia: document.querySelectorAll('.callout.trivia').length,
    h2: document.querySelectorAll('#doc h2').length,
    h3: document.querySelectorAll('#doc h3').length,
  }));
  await p.screenshot({ path: path.join(OUT, 'matome_top.png') });
  // 単元クリックでスクロール（ナビ動作確認）
  await p.evaluate(() => { const u = document.querySelectorAll('.nav-unit')[20]; if (u) u.click(); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'matome_mid.png') });
  const active = await p.evaluate(() => { const a = document.querySelector('.nav-unit.active'); return a ? a.textContent : '(none)'; });
  // ダーク
  await p.click('#themeToggle');
  try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 15000 }); } catch (e) {}
  await p.waitForTimeout(700);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(OUT, 'matome_dark.png') });
  await b.close();
  console.log(JSON.stringify(stats));
  console.log('active after click:', active, '/ console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
