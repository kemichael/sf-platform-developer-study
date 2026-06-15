/*
 * コールアウト記法の正規化スクリプト
 * `> [!種別] ...` のマーカー行の直後に空の `>` 行が無い場合、挿入する。
 * これにより marked がヘッダーと本文を別段落に分割でき、[!手順] の番号リストも
 * 正しく <ol> として描画される。全 .md を対象にその場で修正する。
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'base-text');
const MARKER = /^>\s*\[!(用語|例|ポイント|注意|手順|まとめ)\]/;
const EMPTY_Q = /^>\s*$/;
const QUOTED = /^>/;

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (ent.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

let filesChanged = 0, insertions = 0;
for (const file of walk(SRC)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const res = [];
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    res.push(lines[i]);
    if (MARKER.test(lines[i])) {
      const next = lines[i + 1];
      // 次行が引用行(>)だが空引用(>のみ)でない＝本文が直結している → 空の > を挿入
      if (next !== undefined && QUOTED.test(next) && !EMPTY_Q.test(next)) {
        res.push('>');
        changed = true;
        insertions++;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(file, res.join('\n'), 'utf8');
    filesChanged++;
  }
}
console.log(`正規化完了: ${filesChanged} ファイル修正 / ${insertions} 箇所に空の > 行を挿入`);
