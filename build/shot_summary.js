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
  const stats = await p.evaluate(() => ({
    navTopics: document.querySelectorAll('.nav-topic').length,
    navLeaf: document.querySelectorAll('.nav-topic.leaf').length,
    navUnits: document.querySelectorAll('.nav-unit').length,
    h2: document.querySelectorAll('#doc h2').length,
    h3: document.querySelectorAll('#doc h3').length,
    topbarLinks: document.querySelectorAll('.topbar .summary-link').length,
    mermaid: document.querySelectorAll('figure.mermaid-fig svg').length,
    mermaidFailed: document.querySelectorAll('figure.diagram pre').length,
  }));
  await p.screenshot({ path: path.join(OUT, 'summary_top.png') });
  // H3 を持たないセクション（leaf）の見出しクリックでスクロールするか
  const leafJump = await p.evaluate(() => {
    const leaf = document.querySelector('.nav-topic.leaf > button');
    const label = leaf ? leaf.textContent.trim() : '(none)';
    if (leaf) leaf.click();
    return label;
  });
  await p.waitForTimeout(700);
  // H3 サブ項目クリックでスクロール（ナビ動作確認）
  await p.evaluate(() => { const u = document.querySelectorAll('.nav-unit')[2]; if (u) u.click(); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'summary_mid.png') });
  const active = await p.evaluate(() => {
    const a = document.querySelector('.nav-unit.active') || document.querySelector('.nav-topic > button.active');
    return a ? a.textContent.trim() : '(none)';
  });
  // 検索フィルター動作確認
  const filtered = await p.evaluate(() => {
    const inp = document.getElementById('searchInput');
    inp.value = 'トリガー'; inp.dispatchEvent(new Event('input'));
    return document.getElementById('searchCount').textContent;
  });
  await p.evaluate(() => { const inp = document.getElementById('searchInput'); inp.value = ''; inp.dispatchEvent(new Event('input')); });
  // ダーク
  await p.click('#themeToggle');
  try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 15000 }); } catch (e) {}
  await p.waitForTimeout(700);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(OUT, 'summary_dark.png') });
  // モバイル表示でドロワーが開くか
  await p.setViewportSize({ width: 390, height: 840 });
  await p.waitForTimeout(300);
  await p.click('#menuToggle');
  await p.waitForTimeout(400);
  const drawerOpen = await p.evaluate(() => document.getElementById('sidebar').classList.contains('open'));
  await p.screenshot({ path: path.join(OUT, 'summary_mobile.png') });
  await b.close();
  console.log(JSON.stringify(stats));
  console.log('leaf jump:', leafJump, '/ active:', active, '/ filter "トリガー":', filtered, '/ mobile drawer open:', drawerOpen, '/ console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
