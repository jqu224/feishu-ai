// 把豆包答题题库（src/data/trivia-*.js）导出为 CSV，落到仓库根 knowledge/ 目录。
// 一份一套题 + 一份全量汇总；带 BOM 方便 Excel / 飞书表格直接打开。
// 用法：node scripts/export-quiz-csv.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRIVIA_SETS } from '../src/data/trivia.js';

const outDir = fileURLToPath(new URL('../../knowledge/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const HEADERS = ['题库ID', '题库名称', '题号', '难度', '题干', '选项A', '选项B', '选项C', '选项D', '正确答案', '答案内容', '解析'];
const LETTERS = ['A', 'B', 'C', 'D'];

// 难度按题号三段划分（题库本身由浅入深排列）
function difficulty(i, n) {
  const r = (i + 1) / n;
  return r <= 1 / 3 ? '入门' : r <= 2 / 3 ? '进阶' : '硬核';
}

// CSV 转义：含逗号/引号/换行的字段包双引号，内部双引号翻倍
function cell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowToLine(row) {
  return row.map(cell).join(',');
}

function setRows(set) {
  return set.questions.map((q, i) => [
    set.id,
    set.title,
    i + 1,
    difficulty(i, set.questions.length),
    q.q,
    q.options[0] ?? '',
    q.options[1] ?? '',
    q.options[2] ?? '',
    q.options[3] ?? '',
    LETTERS[q.answer],
    q.options[q.answer],
    q.explain,
  ]);
}

const BOM = '﻿';
let total = 0;
const allLines = [rowToLine(HEADERS)];

TRIVIA_SETS.forEach((set, idx) => {
  const lines = [rowToLine(HEADERS), ...setRows(set).map(rowToLine)];
  const name = `豆包答题-${String(idx + 1).padStart(2, '0')}-${set.title}.csv`;
  writeFileSync(outDir + name, BOM + lines.join('\r\n') + '\r\n');
  allLines.push(...setRows(set).map(rowToLine));
  total += set.questions.length;
  console.log(`写出 ${name}（${set.questions.length} 题）`);
});

writeFileSync(outDir + '豆包答题-00-全部题目.csv', BOM + allLines.join('\r\n') + '\r\n');
console.log(`写出 豆包答题-00-全部题目.csv（共 ${total} 题）`);
console.log(`目录：${outDir}`);
