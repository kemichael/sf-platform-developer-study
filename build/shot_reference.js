const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'reference.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const stats = await p.evaluate(() => ({
    navTopics: document.querySelectorAll('.nav-topic').length,
    navUnits: document.querySelectorAll('.nav-unit').length,
    callouts: document.querySelectorAll('.callout').length,
    codeBlocks: document.querySelectorAll('.code-block').length,
    tables: document.querySelectorAll('#doc table').length,
    h2: document.querySelectorAll('#doc h2').length,
    h3: document.querySelectorAll('#doc h3').length,
    topbarLinks: document.querySelectorAll('.topbar .summary-link').length,
    highlighted: document.querySelectorAll('#doc code .token').length,
  }));
  await p.screenshot({ path: path.join(OUT, 'reference_top.png') });
  // 単元クリックでスクロール（ナビ動作確認）
  await p.evaluate(() => { const u = document.querySelectorAll('.nav-unit')[10]; if (u) u.click(); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'reference_mid.png') });
  const active = await p.evaluate(() => { const a = document.querySelector('.nav-unit.active'); return a ? a.textContent : '(none)'; });
  // 検索フィルター動作確認
  const filtered = await p.evaluate(() => {
    const inp = document.getElementById('searchInput');
    inp.value = 'トリガー'; inp.dispatchEvent(new Event('input'));
    return document.getElementById('searchCount').textContent;
  });
  await p.evaluate(() => { const inp = document.getElementById('searchInput'); inp.value = ''; inp.dispatchEvent(new Event('input')); });
  // ダーク
  await p.click('#themeToggle');
  await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(OUT, 'reference_dark.png') });
  await b.close();
  console.log(JSON.stringify(stats));
  console.log('active after click:', active, '/ filter "トリガー":', filtered, '/ console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
