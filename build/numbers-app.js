(function () {
  'use strict';
  const LS_THEME = 'sfpd-theme';

  // テーマ（本編とキー共有）
  const applyTheme = th => { document.documentElement.setAttribute('data-theme', th); localStorage.setItem(LS_THEME, th); };
  applyTheme(localStorage.getItem(LS_THEME) || 'light');

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CALLOUTS = {
    '用語': { cls: 'term', label: '用語解説', icon: 'i-book' },
    '例': { cls: 'example', label: '具体例', icon: 'i-bulb' },
    'ポイント': { cls: 'tip', label: '試験ポイント', icon: 'i-target' },
    '注意': { cls: 'warning', label: '注意', icon: 'i-alert' },
    '手順': { cls: 'steps', label: '操作手順', icon: 'i-list' },
    'まとめ': { cls: 'summary', label: 'まとめ', icon: 'i-flag' },
    '豆知識': { cls: 'trivia', label: '豆知識', icon: 'i-star' },
  };

  function transformCallouts(host) {
    host.querySelectorAll('blockquote').forEach(bq => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;
      const m = firstP.textContent.match(/^\s*\[!(用語|例|ポイント|注意|手順|まとめ|豆知識)\]\s*(.*)$/);
      if (!m) return;
      const def = CALLOUTS[m[1]];
      const title = (m[2] || '').trim();
      const box = document.createElement('div'); box.className = 'callout ' + def.cls;
      const head = document.createElement('div'); head.className = 'callout-head';
      head.innerHTML = '<svg class="ico"><use href="#' + def.icon + '"/></svg><span>' + escapeHtml(def.label) + (title ? '：' + escapeHtml(title) : '') + '</span>';
      const body = document.createElement('div'); body.className = 'callout-body';
      firstP.remove();
      while (bq.firstChild) body.appendChild(bq.firstChild);
      box.appendChild(head); box.appendChild(body);
      bq.parentNode.replaceChild(box, bq);
    });
  }

  function enhance(host) {
    transformCallouts(host);
    host.querySelectorAll('table').forEach(tb => { const w = document.createElement('div'); w.className = 'table-wrap'; tb.parentNode.insertBefore(w, tb); w.appendChild(tb); });
  }

  // ----- サイドバー（カテゴリのフラットなリスト）の構築 -----
  // このページは H2（カテゴリ）が主単位で H3 が少ないため、
  // 各 H2 を直接ジャンプできるフラットなナビにする。
  const nav = document.getElementById('nav');
  let items = []; // { id, el, btn, label }

  function buildNav(host) {
    const heads = [].slice.call(host.querySelectorAll('h2'));
    nav.innerHTML = '';
    items = [];
    const list = document.createElement('div'); list.className = 'nav-flat';
    heads.forEach((h2, i) => {
      const id = 'cat-' + i; h2.id = id;
      const numMatch = h2.textContent.match(/^\s*(\d+)\.\s*(.*)$/);
      const num = numMatch ? numMatch[1] : (i + 1);
      const label = numMatch ? numMatch[2] : h2.textContent;
      const btn = document.createElement('button');
      btn.className = 'nav-cat'; btn.dataset.id = id;
      btn.innerHTML = '<span class="cat-num">' + escapeHtml(String(num)) + '</span>' +
        '<span class="cat-title">' + escapeHtml(label) + '</span>';
      btn.addEventListener('click', () => {
        document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeDrawer();
      });
      list.appendChild(btn);
      items.push({ id, el: h2, btn, label });
    });
    nav.appendChild(list);
  }

  // ----- スクロールスパイ -----
  let activeId = null;
  function syncActive() {
    if (!items.length) return;
    const offset = 90; // ヘッダー高さ + 余白
    let current = items[0];
    for (const it of items) {
      if (it.el.getBoundingClientRect().top - offset <= 0) current = it; else break;
    }
    if (current.id === activeId) return;
    activeId = current.id;
    items.forEach(it => it.btn.classList.toggle('active', it.id === activeId));
    const act = nav.querySelector('.nav-cat.active');
    if (act) act.scrollIntoView({ block: 'nearest' });
  }

  // ----- カテゴリの絞り込み（サイドバー検索） -----
  const searchInput = document.getElementById('searchInput');
  const searchCount = document.getElementById('searchCount');
  function applyFilter() {
    const q = (searchInput.value || '').trim().toLowerCase();
    let hit = 0;
    items.forEach(it => {
      const match = !q || it.label.toLowerCase().includes(q);
      it.btn.style.display = match ? '' : 'none';
      if (match) hit++;
    });
    searchCount.textContent = q ? hit + ' 件' : '';
  }
  searchInput.addEventListener('input', applyFilter);
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
    if (e.key === 'Escape' && document.activeElement === searchInput) { searchInput.value = ''; applyFilter(); searchInput.blur(); }
  });

  // ----- モバイル用ドロワー -----
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const menuToggle = document.getElementById('menuToggle');
  function closeDrawer() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  if (menuToggle) menuToggle.addEventListener('click', () => { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); });
  if (scrim) scrim.addEventListener('click', closeDrawer);

  // ----- レンダリング -----
  function render() {
    const host = document.getElementById('doc');
    host.innerHTML = window.marked ? marked.parse(window.__DOC__ || '') : '';
    enhance(host);
    buildNav(host);
    activeId = null;
    syncActive();
    applyFilter();
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { syncActive(); ticking = false; });
  }, { passive: true });

  render();
})();
