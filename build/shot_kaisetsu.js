const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'kaisetsu.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  // チャンク描画の完了（統計行に表示件数が出る）を待つ
  await p.waitForFunction(() => document.getElementById('statLine').textContent.includes('表示'));
  await p.waitForTimeout(600);

  const init = await p.evaluate(() => ({
    tabs: document.querySelectorAll('.tab-btn').length,
    activeTab: document.querySelector('.tab-btn.active').textContent,
    cards: document.querySelectorAll('.q-card').length,
    correctOpts: document.querySelectorAll('.opt.correct').length,
    explains: document.querySelectorAll('.explain').length,
    codeBlocks: document.querySelectorAll('.code-block').length,
    highlighted: document.querySelectorAll('.token').length,
    stat: document.getElementById('statLine').textContent,
  }));
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_all.png') });

  // ===== セットタブ切替（SET 2 = カテゴリ付き） =====
  await p.evaluate(() => document.querySelectorAll('.tab-btn')[2].click());
  await p.waitForTimeout(500);
  const tab2 = await p.evaluate(() => ({
    cards: document.querySelectorAll('.q-card').length,
    cats: document.querySelectorAll('.q-cat').length,
    setBadge: document.querySelector('.q-set').textContent,
    savedTab: localStorage.getItem('sfpd-kaisetsu-tab'),
  }));
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_set2.png') });

  // ===== 検索（全セット横断） =====
  await p.evaluate(() => document.querySelectorAll('.tab-btn')[0].click());
  await p.waitForTimeout(500);
  await p.fill('#searchBox', 'ガバナ制限');
  await p.waitForTimeout(600);
  const search = await p.evaluate(() => ({
    cards: document.querySelectorAll('.q-card').length,
    stat: document.getElementById('statLine').textContent,
    clearVisible: getComputedStyle(document.getElementById('clearBtn')).display !== 'none',
  }));
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_search.png') });
  await p.evaluate(() => document.getElementById('clearBtn').click());
  await p.waitForTimeout(500);
  const cleared = await p.evaluate(() => document.querySelectorAll('.q-card').length);

  // ===== 覚えたチェック =====
  const learn = await p.evaluate(() => {
    const card = document.querySelector('.q-card');
    card.querySelector('.learn-btn').click();
    return {
      learnedClass: card.classList.contains('learned'),
      btnActive: card.querySelector('.learn-btn').classList.contains('active'),
      stored: localStorage.getItem('sfpd-kaisetsu-learned'),
      stat: document.getElementById('statLine').textContent,
    };
  });
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_learned.png') });

  // 覚えた問題を隠す → カードが1枚減る
  const before = await p.evaluate(() => document.querySelectorAll('.q-card').length);
  await p.evaluate(() => document.getElementById('hideLearned').click());
  await p.waitForTimeout(600);
  const hidden = await p.evaluate(() => ({
    cards: document.querySelectorAll('.q-card').length,
    firstId: document.querySelector('.q-card').id,
  }));
  // フィルタ ON のまま別カードを「覚えた」→ 即座に消える
  const hideOnLearn = await p.evaluate(() => {
    const n = document.querySelectorAll('.q-card').length;
    document.querySelector('.q-card .learn-btn').click();
    return { before: n, after: document.querySelectorAll('.q-card').length };
  });
  await p.evaluate(() => document.getElementById('hideLearned').click());
  await p.waitForTimeout(600);

  // ===== 自己チェックモード =====
  await p.evaluate(() => document.getElementById('selfCheck').click());
  await p.waitForTimeout(200);
  const self1 = await p.evaluate(() => {
    const card = document.querySelector('.q-card:not(.learned)');
    return {
      hideAns: document.getElementById('qList').classList.contains('hide-ans'),
      explainHidden: getComputedStyle(card.querySelector('.explain')).display === 'none',
      revealVisible: getComputedStyle(card.querySelector('.reveal-btn')).display !== 'none',
      correctNeutral: getComputedStyle(card.querySelector('.opt.correct')).backgroundColor ===
        getComputedStyle(card.querySelector('.opt:not(.correct)') || card.querySelector('.opt.correct')).backgroundColor,
    };
  });
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_selfcheck.png') });
  const self2 = await p.evaluate(() => {
    const card = document.querySelector('.q-card:not(.learned)');
    card.querySelector('.reveal-btn').click();
    return {
      revealed: card.classList.contains('revealed'),
      explainShown: getComputedStyle(card.querySelector('.explain')).display !== 'none',
    };
  });
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_revealed.png') });
  await p.evaluate(() => document.getElementById('selfCheck').click());

  // ===== 空結果表示 =====
  await p.fill('#searchBox', 'zzzzzz該当なしzzzzzz');
  await p.waitForTimeout(600);
  const empty = await p.evaluate(() => ({
    cards: document.querySelectorAll('.q-card').length,
    emptyShown: !document.getElementById('emptyMsg').hidden,
  }));
  await p.evaluate(() => document.getElementById('clearBtn').click());
  await p.waitForTimeout(500);

  // ===== リロード後の永続化（タブ・覚えた） =====
  await p.evaluate(() => document.querySelectorAll('.tab-btn')[3].click());
  await p.waitForTimeout(400);
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => document.getElementById('statLine').textContent.includes('表示'));
  await p.waitForTimeout(400);
  const persist = await p.evaluate(() => ({
    activeTab: document.querySelector('.tab-btn.active').textContent,
    stat: document.getElementById('statLine').textContent,
    learnedCards: document.querySelectorAll('.q-card.learned').length,
  }));

  // ===== ダークモード =====
  await p.click('#themeToggle');
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'kaisetsu_dark.png') });

  await b.close();
  console.log('INIT:', JSON.stringify(init));
  console.log('TAB(set2):', JSON.stringify(tab2));
  console.log('SEARCH:', JSON.stringify(search), 'クリア後:', cleared);
  console.log('LEARN:', JSON.stringify(learn));
  console.log('HIDE:', JSON.stringify({ before, after: hidden.cards, firstId: hidden.firstId }));
  console.log('HIDE中に覚えた→即非表示:', JSON.stringify(hideOnLearn));
  console.log('SELFCHECK:', JSON.stringify(self1));
  console.log('REVEAL:', JSON.stringify(self2));
  console.log('EMPTY:', JSON.stringify(empty));
  console.log('PERSIST:', JSON.stringify(persist));
  console.log('console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
