import test from 'node:test';
import assert from 'node:assert/strict';
import { TRIVIA_SETS } from '../src/data/trivia.js';
import {
  getSet, displayOrder, correctDisplayIndex, answerLetters, balancedSeed,
  buildQuizHomeCard, buildQuestionCard, buildRevealCard, buildResultCard,
} from '../src/actions/quiz.js';

const set = getSet('feishu-basics');

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') for (const col of el.columns) collectButtons(col.elements, acc);
  }
  return acc;
}

function hasNav(cardJson) {
  return collectButtons(cardJson.body.elements).some((b) => b.behaviors?.[0]?.value?.a === 'nav_home');
}

test('题库数据合法：4-8 套题、每套 10-20 题、答案下标在选项内、选项唯一、有解析', () => {
  assert.ok(TRIVIA_SETS.length >= 4 && TRIVIA_SETS.length <= 8, '题库种类应在 4-8 之间');
  for (const s of TRIVIA_SETS) {
    assert.ok(s.questions.length >= 10 && s.questions.length <= 20, `${s.id} 题量应在 10-20 之间`);
    s.questions.forEach((q, i) => {
      assert.ok(q.q.length > 5, `${s.id} 第 ${i} 题题干过短`);
      assert.ok(q.options.length >= 3 && q.options.length <= 4, `${s.id} 第 ${i} 题选项数应为 3-4`);
      assert.equal(new Set(q.options).size, q.options.length, `${s.id} 第 ${i} 题选项重复`);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, `${s.id} 第 ${i} 题答案下标非法`);
      assert.ok(q.explain.length > 5, `${s.id} 第 ${i} 题缺少解析`);
    });
  }
});

test('displayOrder 与正确位映射自洽', () => {
  for (let i = 0; i < set.questions.length; i++) {
    const order = displayOrder(set, 999, i);
    const ck = correctDisplayIndex(set, 999, i);
    assert.equal(order[ck], set.questions[i].answer);
  }
});

test('乱序分布：正确答案不会总落在同一个字母', () => {
  const counts = {};
  const perQuestion = set.questions.map(() => ({}));
  const games = 200;
  for (let g = 0; g < games; g++) {
    const seed = 1000 + g;
    answerLetters(set, seed).forEach((l, i) => {
      counts[l] = (counts[l] || 0) + 1;
      perQuestion[i][l] = (perQuestion[i][l] || 0) + 1;
    });
  }
  const total = games * set.questions.length;
  for (const [l, n] of Object.entries(counts)) {
    assert.ok(n / total < 0.4, `字母 ${l} 占比 ${(n / total).toFixed(2)} 过高`);
  }
  // 单题也要分散：任一题目任一字母占比 < 70%（题号固定但 seed 变化）
  for (const dist of perQuestion) {
    for (const n of Object.values(dist)) {
      assert.ok(n / games < 0.7, '单题正确字母过于集中');
    }
  }
});

test('乱序分布：无 ABCD 固定循环', () => {
  // 连续题目使用同一循环模式（如 ABCDABCD..）的序列应几乎不出现
  const patterns = new Set();
  for (let g = 0; g < 50; g++) {
    patterns.add(answerLetters(set, 5000 + g).join(''));
  }
  assert.ok(patterns.size > 40, '不同 seed 的答案序列应几乎互不相同');
});

test('balancedSeed：任何字母的正确次数不超过题数的三分之一', () => {
  const cap = Math.max(3, Math.ceil(set.questions.length / 3));
  for (let t = 0; t < 20; t++) {
    const seed = balancedSeed(set);
    const counts = {};
    for (const l of answerLetters(set, seed)) counts[l] = (counts[l] || 0) + 1;
    assert.ok(Math.max(...Object.values(counts)) <= cap, `seed ${seed} 分布失衡：${JSON.stringify(counts)}`);
  }
});

test('题目卡：选项是原选项的一个排列，且不泄露答案', () => {
  const cardJson = buildQuestionCard(set, 777, 3, 2);
  assert.equal(cardJson.schema, '2.0');
  assert.ok(hasNav(cardJson));
  const opts = collectButtons(cardJson.body.elements)
    .filter((b) => b.behaviors?.[0]?.value?.a === 'quiz_ans')
    .map((b) => b.text.content.replace(/^[A-D]\. /, ''));
  const expected = set.questions[3].options;
  assert.equal(opts.length, expected.length);
  assert.deepEqual([...opts].sort(), [...expected].sort());
  // 所有选项按钮同 type，视觉上不暗示正确答案
  const types = collectButtons(cardJson.body.elements)
    .filter((b) => b.behaviors?.[0]?.value?.a === 'quiz_ans')
    .map((b) => b.type);
  assert.equal(new Set(types).size, 1);
});

test('题目卡：选项按田字格排布，每行最多两列', () => {
  const cardJson = buildQuestionCard(set, 777, 0, 0);
  const gridRows = cardJson.body.elements.filter((el) => {
    if (el.tag !== 'column_set') return false;
    const btns = [];
    for (const col of el.columns) collectButtons(col.elements, btns);
    return btns.some((b) => b.behaviors?.[0]?.value?.a === 'quiz_ans');
  });
  const n = set.questions[0].options.length;
  assert.equal(gridRows.length, Math.ceil(n / 2), '4 个选项应排成 2 行田字格');
  for (const row of gridRows) assert.ok(row.columns.length <= 2, '田字格每行最多两列');
});

test('揭晓卡：答对计分、答错不加分并给出正确答案', () => {
  const seed = 321;
  const i = 0;
  const ck = correctDisplayIndex(set, seed, i);
  const right = buildRevealCard(set, seed, i, ck, 1);
  assert.ok(right.body.elements.some((el) => el.tag === 'div' && el.text?.content?.includes('回答正确')));
  const next = collectButtons(right.body.elements).find((b) => b.behaviors?.[0]?.value?.a === 'quiz_next');
  assert.equal(next.behaviors[0].value.p.sc, 2);

  const wrong = buildRevealCard(set, seed, i, (ck + 1) % set.questions[i].options.length, 1);
  assert.ok(wrong.body.elements.some((el) => el.tag === 'div' && el.text?.content?.includes('回答错误')));
  const next2 = collectButtons(wrong.body.elements).find((b) => b.behaviors?.[0]?.value?.a === 'quiz_next');
  assert.equal(next2.behaviors[0].value.p.sc, 1);
});

test('最后一题的揭晓卡显示「查看成绩」', () => {
  const seed = 8;
  const last = set.questions.length - 1;
  const ck = correctDisplayIndex(set, seed, last);
  const c = buildRevealCard(set, seed, last, ck, 5);
  const btn = collectButtons(c.body.elements).find((b) => b.behaviors?.[0]?.value?.a === 'quiz_next');
  assert.match(btn.text.content, /查看成绩/);
});

test('结算卡称号分档', () => {
  const n = set.questions.length;
  assert.ok(buildResultCard(set, n, 1).header.text_tag_list.some((t) => t.text.content.includes('六边形战士')));
  assert.ok(buildResultCard(set, Math.floor(n * 0.8), 1).header.text_tag_list.some((t) => t.text.content.includes('高级玩家')));
  assert.ok(buildResultCard(set, Math.floor(n * 0.5), 1).header.text_tag_list.some((t) => t.text.content.includes('进阶练习生')));
  assert.ok(buildResultCard(set, 1, 1).header.text_tag_list.some((t) => t.text.content.includes('默认选项选手')));
});

test('答题主页与结算卡都带导航', () => {
  assert.ok(hasNav(buildQuizHomeCard()));
  assert.ok(hasNav(buildResultCard(set, 3, 1)));
});
