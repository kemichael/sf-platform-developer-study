(function () {
  'use strict';
  const DATA = window.__EXAM__ || { sets: [] };
  const LS_THEME = 'sfpd-theme';
  const ansKey = id => 'sfpd-exam-ans-' + id;
  const bestKey = id => 'sfpd-exam-best-' + id;
  const PASS = 68; // 合格ライン（%）

  // ----- テーマ（他ページとキー共有） -----
  const applyTheme = th => { document.documentElement.setAttribute('data-theme', th); localStorage.setItem(LS_THEME, th); };
  applyTheme(localStorage.getItem(LS_THEME) || 'light');
  document.getElementById('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const prismLang = l => { l = (l || '').toLowerCase(); if (l === 'soql') return 'sql'; if (l === 'xml') return 'markup'; if (l === 'js') return 'javascript'; return l; };

  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  // Markdown 文字列 → HTML（コードブロックは Prism でハイライト）
  function mdHTML(md) {
    return window.marked ? marked.parse(md || '') : escapeHtml(md || '');
  }
  function enhanceCode(host) {
    host.querySelectorAll('pre > code').forEach(code => {
      const pre = code.parentElement;
      const cls = (code.className || '').match(/language-([\w-]+)/);
      const pl = prismLang(cls ? cls[1] : '');
      if (pl && window.Prism && Prism.languages[pl]) {
        code.className = 'language-' + pl;
        try { Prism.highlightElement(code); } catch (e) {}
      }
      const block = document.createElement('div'); block.className = 'code-block';
      const bar = document.createElement('div'); bar.className = 'code-bar';
      bar.innerHTML = '<span class="code-lang">' + escapeHtml((cls ? cls[1] : 'コード').toUpperCase()) +
        '</span><button class="copy-btn" type="button"><svg class="ico"><use href="#i-copy"/></svg><span class="ct">コピー</span></button>';
      pre.parentNode.insertBefore(block, pre); block.appendChild(bar); block.appendChild(pre);
      bar.querySelector('.copy-btn').addEventListener('click', function () {
        const txt = code.textContent, lbl = this.querySelector('.ct');
        const ok = () => { this.classList.add('copied'); lbl.textContent = 'コピー完了'; setTimeout(() => { this.classList.remove('copied'); lbl.textContent = 'コピー'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok).catch(() => {});
      });
    });
  }

  // ----- DOM 参照 -----
  const startScreen = document.getElementById('startScreen');
  const quizScreen = document.getElementById('quizScreen');
  const quizBar = document.getElementById('quizBar');
  const setGrid = document.getElementById('setGrid');
  const questionsEl = document.getElementById('questions');
  const resultMount = document.getElementById('resultMount');
  const quizTitle = document.getElementById('quizTitle');
  const answeredCount = document.getElementById('answeredCount');
  const totalCount = document.getElementById('totalCount');
  const answeredBar = document.getElementById('answeredBar');

  // ----- 状態 -----
  let curSet = null;       // 現在のセット
  let answers = {};        // { 問番号: [選択した letter, ...] }
  let graded = false;

  function loadAnswers(id) {
    try { return JSON.parse(localStorage.getItem(ansKey(id)) || '{}'); } catch (e) { return {}; }
  }
  function saveAnswers() {
    if (curSet) localStorage.setItem(ansKey(curSet.id), JSON.stringify(answers));
  }
  function getBest(id) {
    const v = parseInt(localStorage.getItem(bestKey(id)), 10);
    return isNaN(v) ? null : v;
  }

  // ----- スタート画面 -----
  function renderStart() {
    setGrid.innerHTML = '';
    DATA.sets.forEach((s, i) => {
      const best = getBest(s.id);
      const savedAns = loadAnswers(s.id);
      const answered = Object.keys(savedAns).filter(k => (savedAns[k] || []).length).length;
      const card = document.createElement('button');
      card.className = 'set-card';
      card.innerHTML =
        '<span class="sc-badge"><svg class="ico" style="width:13px;height:13px"><use href="#i-edit"/></svg>SET ' + (i + 1) + '</span>' +
        '<span class="sc-title">' + escapeHtml(s.title) + '</span>' +
        '<span class="sc-meta">' +
          '<span>' + s.questions.length + ' 問</span>' +
          (best != null ? '<span class="sc-best">最高 ' + best + '%</span>' : '') +
          (answered && best == null ? '<span>回答途中 ' + answered + '/' + s.questions.length + '</span>' : '') +
        '</span>' +
        '<span class="sc-go">' + (answered ? '続きから' : 'スタート') + '<svg class="ico"><use href="#i-arrow-right"/></svg></span>';
      card.addEventListener('click', () => startSet(s));
      setGrid.appendChild(card);
    });
  }

  // ----- 試験開始 -----
  function startSet(s) {
    curSet = s;
    answers = loadAnswers(s.id);
    graded = false;
    quizTitle.textContent = s.title;
    resultMount.innerHTML = '';
    renderQuestions();
    startScreen.hidden = true;
    quizScreen.hidden = false;
    quizBar.hidden = false;
    totalCount.textContent = s.questions.length;
    updateAnswered();
    window.scrollTo(0, 0);
  }

  function renderQuestions() {
    questionsEl.innerHTML = '';
    curSet.questions.forEach(q => {
      const card = document.createElement('div');
      card.className = 'q-card';
      card.id = 'q-' + q.n;
      card.dataset.n = q.n;

      const top = document.createElement('div');
      top.className = 'q-top';
      top.innerHTML = '<span class="q-num">' + q.n + '</span>' +
        (q.category ? '<span class="q-cat">' + escapeHtml(q.category) + '</span>' : '') +
        (q.multi ? '<span class="q-multi">複数選択</span>' : '') +
        '<span class="q-mark ok"><svg class="ico"><use href="#i-check"/></svg>正解</span>' +
        '<span class="q-mark ng"><svg class="ico"><use href="#i-x"/></svg>不正解</span>';
      card.appendChild(top);

      const text = document.createElement('div');
      text.className = 'q-text';
      text.innerHTML = mdHTML(q.text);
      enhanceCode(text);
      card.appendChild(text);

      const opts = document.createElement('div');
      opts.className = 'opts';
      q.options.forEach(o => {
        const opt = document.createElement('div');
        opt.className = 'opt' + (q.multi ? ' multi' : '');
        opt.dataset.key = o.key;
        const selected = (answers[q.n] || []).includes(o.key);
        if (selected) opt.classList.add('selected');
        opt.innerHTML = '<span class="mark">' + o.key + '</span><span class="otext">' + mdHTML(o.text).replace(/^<p>|<\/p>\s*$/g, '') + '</span>';
        enhanceCode(opt);
        opt.addEventListener('click', () => onSelect(q, o.key, opt, opts));
        opts.appendChild(opt);
      });
      card.appendChild(opts);

      const exp = document.createElement('div');
      exp.className = 'explain';
      exp.innerHTML = '<div class="explain-head"><svg class="ico"><use href="#i-bulb"/></svg>解説</div>' +
        '<div class="explain-body"></div>';
      card.appendChild(exp);

      questionsEl.appendChild(card);
    });
  }

  function onSelect(q, key, optEl, optsEl) {
    if (graded) return;
    let sel = answers[q.n] || [];
    if (q.multi) {
      if (sel.includes(key)) sel = sel.filter(k => k !== key);
      else sel = sel.concat(key);
      optEl.classList.toggle('selected');
    } else {
      sel = [key];
      optsEl.querySelectorAll('.opt').forEach(o => o.classList.toggle('selected', o === optEl));
    }
    answers[q.n] = sel;
    saveAnswers();
    updateAnswered();
  }

  function updateAnswered() {
    const total = curSet.questions.length;
    const done = curSet.questions.filter(q => (answers[q.n] || []).length).length;
    answeredCount.textContent = done;
    answeredBar.style.width = (done / total * 100) + '%';
  }

  // 選択の正誤判定（多肢選択は集合一致）
  function isCorrect(q) {
    const sel = (answers[q.n] || []).slice().sort();
    const ans = (q.answer || []).slice().sort();
    return sel.length === ans.length && sel.every((v, i) => v === ans[i]);
  }

  // ----- 採点 -----
  function grade() {
    const unanswered = curSet.questions.filter(q => !(answers[q.n] || []).length).length;
    if (unanswered > 0) {
      if (!confirm('未回答が ' + unanswered + ' 問あります。このまま採点しますか？\n（未回答は不正解として扱われます）')) return;
    }
    graded = true;
    let correct = 0;
    curSet.questions.forEach(q => {
      const card = document.getElementById('q-' + q.n);
      const opts = card.querySelector('.opts');
      opts.classList.add('graded');
      card.classList.add('graded');
      const ok = isCorrect(q);
      if (ok) correct++;
      card.classList.add(ok ? 'is-correct' : 'is-wrong');
      const sel = answers[q.n] || [];
      opts.querySelectorAll('.opt').forEach(opt => {
        const k = opt.dataset.key;
        const isAns = (q.answer || []).includes(k);
        const isSel = sel.includes(k);
        if (isAns) opt.classList.add('correct');
        else if (isSel) opt.classList.add('wrong');
      });
      const body = card.querySelector('.explain-body');
      const correctLabel = (q.answer || []).join('・');
      body.innerHTML = '<p><b>正解：' + correctLabel + '</b></p>' + mdHTML(q.explanation);
      enhanceCode(body);
    });
    const total = curSet.questions.length;
    const pct = Math.round(correct / total * 100);
    // ベストスコア更新
    const prevBest = getBest(curSet.id);
    if (prevBest == null || pct > prevBest) localStorage.setItem(bestKey(curSet.id), String(pct));
    renderResult(correct, total, pct);
    quizBar.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderResult(correct, total, pct) {
    const pass = pct >= PASS;
    const ringColor = pass ? 'var(--ok)' : 'var(--bad)';
    const panel = document.createElement('div');
    panel.className = 'result';
    panel.innerHTML =
      '<div class="score-ring" style="--p:' + pct + ';--ring-color:' + ringColor + '">' +
        '<div class="inner"><span class="pct">' + pct + '%</span><span class="pl">正解率</span></div>' +
      '</div>' +
      '<div class="result-info">' +
        '<div class="verdict ' + (pass ? 'pass' : 'fail') + '">' + (pass ? '合格ライン到達！🎉' : 'もう少し！') + '</div>' +
        '<div class="detail">' + total + ' 問中 <b>' + correct + ' 問</b>正解（合格ライン ' + PASS + '%）</div>' +
        '<div class="result-actions">' +
          '<button class="btn primary" id="retryBtn"><svg class="ico"><use href="#i-refresh"/></svg>もう一度挑戦</button>' +
          '<button class="btn" id="toStartBtn"><svg class="ico"><use href="#i-arrow-left"/></svg>セット選択へ</button>' +
          '<label class="filter-toggle"><input type="checkbox" id="wrongOnly">間違えた問題だけ表示</label>' +
        '</div>' +
      '</div>';
    resultMount.innerHTML = '';
    resultMount.appendChild(panel);

    document.getElementById('retryBtn').addEventListener('click', retry);
    document.getElementById('toStartBtn').addEventListener('click', showStart);
    document.getElementById('wrongOnly').addEventListener('change', e => {
      const on = e.target.checked;
      curSet.questions.forEach(q => {
        const card = document.getElementById('q-' + q.n);
        card.style.display = (on && isCorrect(q)) ? 'none' : '';
      });
    });
  }

  function retry() {
    answers = {};
    saveAnswers();
    graded = false;
    resultMount.innerHTML = '';
    renderQuestions();
    quizBar.hidden = false;
    updateAnswered();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showStart() {
    quizScreen.hidden = true;
    quizBar.hidden = true;
    startScreen.hidden = false;
    curSet = null;
    renderStart();
    window.scrollTo(0, 0);
  }

  // ----- イベント -----
  document.getElementById('backBtn').addEventListener('click', showStart);
  document.getElementById('gradeBtn').addEventListener('click', grade);

  // ----- 初期化 -----
  renderStart();
})();
