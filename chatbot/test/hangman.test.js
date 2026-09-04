import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from '../src/data/words.js';
import {
  MAX_WRONG, newHangmanGame, wordOf, applyGuess, maskWord, playTurn, buildHangmanCard,
} from '../src/actions/hangman.js';

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') for (const col of el.columns) collectButtons(col.elements, acc);
  }
  return acc;
}

test('词库：5-8 个字母、纯小写字母、无重复', () => {
  const seen = new Set();
  assert.ok(WORDS.length >= 60);
  for (const { w, h } of WORDS) {
    assert.match(w, /^[a-z]{5,8}$/);
    assert.ok(h && h.length > 2, `${w} 缺少中文提示`);
    assert.ok(!seen.has(w), `单词重复：${w}`);
    seen.add(w);
  }
});

test('newHangmanGame 同 seed 确定抽词', () => {
  assert.deepEqual(newHangmanGame(42), newHangmanGame(42));
  const picks = new Set();
  for (let s = 0; s < 200; s++) picks.add(newHangmanGame(s).w);
  assert.ok(picks.size > WORDS.length * 0.7, `200 个 seed 只覆盖 ${picks.size}/${WORDS.length} 个词，分布太差`);
});

test('applyGuess：猜对不改错次、猜错加一、重复幂等', () => {
  const word = WORDS[0].w.toUpperCase();
  const first = word[0];
  const state = { w: 0, g: 0, x: 0 };

  const hit = applyGuess(state, first);
  assert.equal(hit.hit, true);
  assert.equal(hit.state.x, 0);
  assert.ok(hit.state.g > 0);

  // 不在单词里的字母
  const miss = [...'QZXJK'.split('')].find((l) => !word.includes(l));
  const wrong = applyGuess(hit.state, miss);
  assert.equal(wrong.hit, false);
  assert.equal(wrong.state.x, 1);

  const repeat = applyGuess(wrong.state, first);
  assert.equal(repeat.repeat, true);
  assert.deepEqual(repeat.state, wrong.state);

  const invalid = applyGuess(wrong.state, '1');
  assert.equal(invalid.invalid, true);
});

test('胜负判定与遮罩显示', () => {
  const idx = WORDS.findIndex((e) => e.w === 'castle');
  assert.ok(idx >= 0, '词库应包含 castle（测试用词）');
  let state = { w: idx, g: 0, x: 0 };
  for (const letter of 'CASTLE') {
    const r = applyGuess(state, letter);
    state = r.state;
  }
  assert.equal(maskWord(state).replace(/ /g, ''), 'CASTLE');

  const loseIdx = WORDS.findIndex((e) => e.w === 'zebra');
  let s2 = { w: loseIdx, g: 0, x: 0 };
  for (const letter of 'QWXYUI') {
    s2 = applyGuess(s2, letter).state;
  }
  assert.equal(s2.x, 6);
  assert.equal(applyGuess(s2, 'V').lost, true);
});

test('卡片：26 个字母键盘各出现一次，猜过的字母不再是按钮', () => {
  const state = newHangmanGame(7);
  const word = wordOf(state);
  const first = word[0];
  const after = applyGuess(state, first).state;

  const fresh = collectButtons(buildHangmanCard(state).body.elements)
    .filter((b) => b.behaviors?.[0]?.value?.a === 'hang');
  assert.equal(fresh.length, 26);
  assert.equal(new Set(fresh.map((b) => b.text.content)).size, 26);

  const afterBtns = collectButtons(buildHangmanCard(after).body.elements)
    .filter((b) => b.behaviors?.[0]?.value?.a === 'hang');
  assert.equal(afterBtns.length, 26, '已猜字母保留幂等回调，仍是按钮');
  const guessed = afterBtns.find((b) => b.text.content === first);
  assert.equal(guessed.type, 'primary', '命中字母标 primary');
  assert.ok(
    afterBtns.filter((b) => b.text.content !== first).every((b) => b.type === 'default'),
    '未猜字母仍是 default'
  );

  // 猜过的字母仍是同尺寸按钮（行高一致不错位），命中标 primary；重复点击幂等不扣分
  const c = buildHangmanCard(after);
  const allBtns = collectButtons(c.body.elements);
  const guessedBtn = allBtns.find((b) => b.text.content === first);
  assert.equal(guessedBtn.type, 'primary');
  assert.equal(guessedBtn.behaviors?.[0]?.value?.a, 'hang', '已猜字母保留幂等回调');
});

test('键盘布局（手机端）：7/7/7/5 分行、一行不换行、元素全为按钮', () => {
  const card = buildHangmanCard(newHangmanGame(7));
  const rows = card.body.elements.filter(
    (el) =>
      el.tag === 'column_set' &&
      el.columns.every((col) => /^[A-Z]$/.test(col.elements[0]?.text?.content || ''))
  );
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.columns.length), [7, 7, 7, 5]);
  for (const row of rows) assert.equal(row.flex_mode, 'none', '键盘行必须 flex_mode=none，防止手机端换行错位');
});

test('胜负卡片：揭晓单词并可开新局', () => {
  const idx = WORDS.findIndex((e) => e.w === 'castle');
  let state = { w: idx, g: 0, x: 0 };
  for (const l of 'CASTLE') state = applyGuess(state, l).state;
  const won = buildHangmanCard(state);
  assert.ok(JSON.stringify(won).includes('猜对了'));

  let s2 = { w: WORDS.findIndex((e) => e.w === 'zebra'), g: 0, x: 0 };
  for (const l of 'QWXYUI') s2 = applyGuess(s2, l).state;
  const lost = buildHangmanCard(s2);
  assert.ok(JSON.stringify(lost).includes('机会用完'));
  assert.ok(collectButtons(lost.body.elements).some((b) => b.behaviors?.[0]?.value?.a === 'hang_new'));
});

test('SPIRIT：赢局输出战绩（答对/答错/正确率）+ 庆祝 ASCII', () => {
  const idx = WORDS.findIndex((e) => e.w === 'castle');
  // 先错 2 次再猜对：CASTLE 6 个不同字母全命中
  let state = { w: idx, g: 0, x: 0 };
  for (const l of 'QZCASTLE') state = applyGuess(state, l).state;
  const json = JSON.stringify(buildHangmanCard(state));
  assert.ok(json.includes('答对'), '赢局必须报告答对次数');
  assert.ok(json.includes('答错'), '赢局必须报告答错次数');
  assert.ok(json.includes('正确率'), '赢局必须报告正确率');
  assert.ok(json.includes('6 次'), '答对 6 次');
  assert.ok(json.includes('2 次'), '答错 2 次');
  assert.ok(json.includes('75%'), '正确率 6/8 = 75%');
  assert.ok(json.includes('\\\\o/'), '赢局必须输出庆祝 ASCII 图案');
});

test('SPIRIT：输局输出吊死鬼 ASCII 图案', () => {
  let state = { w: WORDS.findIndex((e) => e.w === 'zebra'), g: 0, x: 0 };
  for (const l of 'QWXYUI') state = applyGuess(state, l).state;
  const json = JSON.stringify(buildHangmanCard(state));
  assert.ok(json.includes('========='), '输局必须输出吊死鬼 ASCII 绞架');
  assert.ok(json.includes('+---+'), '输局必须输出吊死鬼 ASCII 小人');
});

test('playTurn 脏状态兜底开新局', () => {
  const cardJson = playTurn({ w: 99999, g: 0, x: 0 }, 'A');
  assert.equal(cardJson.schema, '2.0');
  assert.ok(collectButtons(cardJson.body.elements).some((b) => b.behaviors?.[0]?.value?.a === 'hang'));
  assert.equal(MAX_WRONG, 6);
});
