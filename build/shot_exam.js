const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exam.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('dialog', d => d.accept());
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const start = await p.evaluate(() => ({
    setCards: document.querySelectorAll('.set-card').length,
    modeBtns: document.querySelectorAll('.ms-btn').length,
    activeMode: document.querySelector('.ms-btn.active') ? document.querySelector('.ms-btn.active').dataset.mode : '(none)',
    title: document.querySelector('.exam-hero h1').textContent,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_start.png') });

  // ===== 一括回答モード：セット1 =====
  await p.evaluate(() => document.querySelector('.ms-btn[data-mode="all"]').click());
  await p.evaluate(() => document.querySelectorAll('.set-card')[0].click());
  await p.waitForTimeout(400);
  const quiz = await p.evaluate(() => ({
    qCards: document.querySelectorAll('.q-card').length,
    opts: document.querySelectorAll('.q-card .opt').length,
    multi: document.querySelectorAll('.q-card .q-multi').length,
    codeBlocks: document.querySelectorAll('.q-card .code-block').length,
    highlighted: document.querySelectorAll('.q-card .token').length,
    gradeBtnVisible: !document.getElementById('gradeBtn').hidden,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_quiz.png') });

  // 全問に回答（1/3 はわざと不正解）
  const answered = await p.evaluate(() => {
    const data = window.__EXAM__.sets[0].questions;
    let cnt = 0;
    document.querySelectorAll('.q-card').forEach((card, i) => {
      const n = +card.dataset.n;
      const q = data.find(x => x.n === n);
      const opts = card.querySelectorAll('.opt');
      if (i % 3 === 0) {
        const wrong = [...opts].find(o => !q.answer.includes(o.dataset.key));
        if (wrong) { wrong.click(); cnt++; }
      } else {
        q.answer.forEach(k => { const o = [...opts].find(x => x.dataset.key === k); if (o) o.click(); });
        cnt++;
      }
    });
    return { cnt, barText: document.getElementById('barText').textContent };
  });

  // 問題一覧パネル（一括モード）：開いて Q30 へスクロールジャンプ
  const navAll = await p.evaluate(() => {
    window.scrollTo(0, 0);
    document.getElementById('qnavBtn').click();
    const btns = document.querySelectorAll('.qn-btn');
    const r = { panelOpen: !document.getElementById('qnavPanel').hidden, count: btns.length,
      doneMarked: document.querySelectorAll('.qn-btn.done').length };
    btns[29].click();
    return r;
  });
  await p.waitForTimeout(800);
  navAll.scrolled = await p.evaluate(() => window.scrollY > 500);

  await p.evaluate(() => document.getElementById('gradeBtn').click());
  await p.waitForTimeout(500);
  const result = await p.evaluate(() => ({
    pct: document.querySelector('.score-ring .pct') ? document.querySelector('.score-ring .pct').textContent : '(none)',
    verdict: document.querySelector('.verdict') ? document.querySelector('.verdict').textContent : '(none)',
    correctCards: document.querySelectorAll('.q-card.is-correct').length,
    wrongCards: document.querySelectorAll('.q-card.is-wrong').length,
    explainsShown: document.querySelectorAll('.q-card.graded .explain').length,
    barHidden: document.getElementById('quizBar').hidden,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_result.png') });

  const filtered = await p.evaluate(() => {
    document.getElementById('wrongOnly').click();
    return [...document.querySelectorAll('.q-card')].filter(c => c.style.display !== 'none').length;
  });

  // ===== 1問1答モード：セット4 =====
  await p.evaluate(() => document.getElementById('backBtn').click());
  await p.evaluate(() => document.querySelector('.ms-btn[data-mode="one"]').click());
  await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelectorAll('.set-card')[3].click());
  await p.waitForTimeout(400);
  const one1 = await p.evaluate(() => ({
    qCards: document.querySelectorAll('.q-card').length,
    barText: document.getElementById('barText').textContent,
    oneBtnVisible: !document.getElementById('oneBtn').hidden,
    oneBtnDisabled: document.getElementById('oneBtn').disabled,
    skipVisible: !document.getElementById('skipBtn').hidden,
    gradeHidden: document.getElementById('gradeBtn').hidden,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_one_start.png') });

  // 問題一覧パネル（1問1答モード）：Q10 へジャンプ → Q1 へ戻る
  await p.evaluate(() => document.getElementById('qnavBtn').click());
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'exam_qnav.png') });
  const navOne = await p.evaluate(() => {
    const btns = document.querySelectorAll('.qn-btn');
    const r = { count: btns.length, current: document.querySelectorAll('.qn-btn.current').length };
    btns[9].click(); // Q10 へ
    r.jumped = +document.querySelector('.q-card').dataset.n;
    r.closedAfterJump = document.getElementById('qnavPanel').hidden;
    r.barText = document.getElementById('barText').textContent;
    document.getElementById('qnavBtn').click();
    document.querySelectorAll('.qn-btn')[0].click(); // Q1 へ戻る
    r.back = +document.querySelector('.q-card').dataset.n;
    return r;
  });

  // 1問目（複数選択）：正解を選んで「回答する」→即時フィードバック
  const one2 = await p.evaluate(() => {
    const qs = window.__EXAM__.sets[3].questions;
    const card = document.querySelector('.q-card');
    const q = qs.find(x => x.n === +card.dataset.n);
    const opts = [...card.querySelectorAll('.opt')];
    q.answer.forEach(k => { const o = opts.find(x => x.dataset.key === k); if (o) o.click(); });
    if (q.multi) document.getElementById('oneBtn').click(); // 回答する
    return {
      graded: card.classList.contains('graded'),
      correct: card.classList.contains('is-correct'),
      explainVisible: getComputedStyle(card.querySelector('.explain')).display !== 'none',
      oneBtnLabel: document.getElementById('oneBtn').textContent,
      skipHidden: document.getElementById('skipBtn').hidden,
    };
  });
  await p.screenshot({ path: path.join(OUT, 'exam_one_graded.png') });

  // 2問目はわざと不正解、3問目はスキップ
  const one3 = await p.evaluate(() => {
    document.getElementById('oneBtn').click(); // 次へ
    const qs = window.__EXAM__.sets[3].questions;
    let card = document.querySelector('.q-card');
    let q = qs.find(x => x.n === +card.dataset.n);
    const wrong = [...card.querySelectorAll('.opt')].filter(o => !q.answer.includes(o.dataset.key)).slice(0, q.multi ? q.answer.length : 1);
    wrong.forEach(o => o.click());
    if (q.multi) document.getElementById('oneBtn').click();
    const wrongShown = card.classList.contains('is-wrong');
    document.getElementById('oneBtn').click();  // 次へ（3問目）
    const before = +document.querySelector('.q-card').dataset.n;
    document.getElementById('skipBtn').click(); // スキップ
    const after = +document.querySelector('.q-card').dataset.n;
    return { wrongShown, skipMoved: before !== after, barText: document.getElementById('barText').textContent };
  });

  // 残り全問を正解で完走 → 結果画面
  const one4 = await p.evaluate(() => {
    const qs = window.__EXAM__.sets[3].questions;
    let guard = 0;
    while (!document.getElementById('quizBar').hidden && guard < 300) {
      guard++;
      const card = document.querySelector('.q-card');
      const q = qs.find(x => x.n === +card.dataset.n);
      const opts = [...card.querySelectorAll('.opt')];
      q.answer.forEach(k => { const o = opts.find(x => x.dataset.key === k); if (o) o.click(); });
      const btn = document.getElementById('oneBtn');
      if (q.multi) btn.click(); // 回答する
      btn.click();              // 次へ / 結果を見る
    }
    return {
      finished: document.getElementById('quizBar').hidden,
      pct: document.querySelector('.score-ring .pct') ? document.querySelector('.score-ring .pct').textContent : '(none)',
      allCards: document.querySelectorAll('.q-card').length,
      gradedCards: document.querySelectorAll('.q-card.graded').length,
      guard,
    };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'exam_one_result.png') });

  // ダークモード
  await p.click('#themeToggle');
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'exam_dark.png') });

  await b.close();
  console.log('START:', JSON.stringify(start));
  console.log('QUIZ(all):', JSON.stringify(quiz));
  console.log('ANSWERED(all):', JSON.stringify(answered));
  console.log('RESULT(all):', JSON.stringify(result));
  console.log('wrongOnly後の表示問数:', filtered);
  console.log('NAV(all):', JSON.stringify(navAll));
  console.log('NAV(one):', JSON.stringify(navOne));
  console.log('ONE開始:', JSON.stringify(one1));
  console.log('ONE即時判定:', JSON.stringify(one2));
  console.log('ONE誤答/スキップ:', JSON.stringify(one3));
  console.log('ONE完走:', JSON.stringify(one4));
  console.log('console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
