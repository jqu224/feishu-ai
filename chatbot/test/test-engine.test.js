import test from 'node:test';
import assert from 'node:assert/strict';
import { TESTS } from '../src/data/tests.js';
import { getTest, addCounters, buildTestHomeCard, buildTestQuestionCard, buildTestResultCard } from '../src/actions/test.js';

const mbti = getTest('mbti');
const sbti = getTest('sbti');
const work = getTest('work');

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') for (const col of el.columns) collectButtons(col.elements, acc);
  }
  return acc;
}

test('题库结构：每题 2-4 个选项且选项带权重', () => {
  for (const t of TESTS) {
    assert.ok(t.questions.length >= 8, `${t.id} 题量不足`);
    assert.equal(typeof t.resolve, 'function');
    t.questions.forEach((q, i) => {
      assert.ok(q.options.length >= 2 && q.options.length <= 4, `${t.id} 第 ${i} 题选项数非法`);
      q.options.forEach((o) => {
        assert.ok(typeof o.t === 'string' && o.t.length > 0);
        assert.ok(o.w && Object.keys(o.w).length > 0, `${t.id} 第 ${i} 题选项缺权重`);
      });
    });
  }
});

test('addCounters 累加且不修改原对象', () => {
  const c = { E: 1 };
  const out = addCounters(c, { E: 1, I: 2 });
  assert.deepEqual(out, { E: 2, I: 2 });
  assert.deepEqual(c, { E: 1 });
});

test('MBTI：16 种组合全部有结果且四字母正确', () => {
  for (const e of ['E', 'I']) for (const s of ['S', 'N']) for (const t of ['T', 'F']) for (const j of ['J', 'P']) {
    const r = mbti.resolve({ E: e === 'E' ? 3 : 0, I: e === 'I' ? 3 : 0, S: s === 'S' ? 3 : 0, N: s === 'N' ? 3 : 0, T: t === 'T' ? 3 : 0, F: t === 'F' ? 3 : 0, J: j === 'J' ? 3 : 0, P: j === 'P' ? 3 : 0 });
    assert.equal(r.key, e + s + t + j);
    assert.ok(r.name.includes(e + s + t + j));
    assert.ok(r.desc.length > 5);
  }
});

test('MBTI：平票时取前一维度（>= 判定稳定）', () => {
  const r = mbti.resolve({ E: 1, I: 1, S: 1, N: 1, T: 1, F: 1, J: 1, P: 1 });
  assert.equal(r.key, 'ESTJ');
});

test('SBTI：四个维度组合出 16 种互不相同的沙雕人格', () => {
  const names = new Set();
  for (const fan of ['FAN', 'FIT']) for (const niu of ['NIU', 'KONG']) for (const ye of ['YE', 'YANG']) for (const q of ['QIAN', 'LIAN']) {
    const r = sbti.resolve({ [fan]: 2, [niu]: 2, [ye]: 2, [q]: 2 });
    assert.ok(r.name.includes('型'));
    assert.ok(r.desc.length > 10);
    names.add(r.name);
  }
  assert.equal(names.size, 16);
});

test('职场摸鱼指数：分数分档边界正确', () => {
  assert.ok(work.resolve({ FISH: 0 }).name.includes('卷王预备役'));
  assert.ok(work.resolve({ FISH: 5 }).name.includes('卷王预备役'));
  assert.ok(work.resolve({ FISH: 6 }).name.includes('稳定输出'));
  assert.ok(work.resolve({ FISH: 12 }).name.includes('带薪养生'));
  assert.ok(work.resolve({ FISH: 17 }).name.includes('带薪养生'));
  assert.ok(work.resolve({ FISH: 18 }).name.includes('躺平仙人'));
  assert.ok(work.resolve({ FISH: 24 }).name.includes('躺平仙人'));
});

test('DISC：20 题、每题 4 选项且恰好覆盖 D/I/S/C 各一次', () => {
  const disc = getTest('disc');
  assert.ok(disc, '缺 DISC 题库');
  assert.equal(disc.questions.length, 20);
  disc.questions.forEach((q, i) => {
    assert.equal(q.options.length, 4, `第 ${i} 题选项数应为 4`);
    const dims = q.options.map((o) => Object.keys(o.w)).flat().sort();
    assert.deepEqual(dims, ['C', 'D', 'I', 'S'], `第 ${i} 题应恰好覆盖 D/I/S/C 各一次`);
  });
});

test('DISC：单一主导取最高分', () => {
  const disc = getTest('disc');
  const r = disc.resolve({ D: 9, I: 3, S: 4, C: 4 });
  assert.ok(r.key.includes('D'));
  assert.ok(r.name.includes('指挥官'));
  assert.ok(r.desc.includes('D 9 · I 3 · S 4 · C 4'), 'desc 第一行应放四项得分明细');
  const i = disc.resolve({ D: 1, I: 8, S: 6, C: 5 });
  assert.ok(i.key.includes('I'));
  assert.ok(i.name.includes('社交家'));
});

test('DISC：前两名平分给出双主导组合', () => {
  const disc = getTest('disc');
  const r = disc.resolve({ D: 5, I: 5, S: 5, C: 5 });
  assert.equal(r.key.length, 2, '平分应给出双字母 key');
  assert.ok(r.key.includes('D') && r.key.includes('I'));
  const sc = disc.resolve({ D: 2, I: 3, S: 7, C: 7 });
  assert.equal(sc.key, 'SC');
});

test('DISC：计数全缺失时不崩且有结果', () => {
  const disc = getTest('disc');
  const r = disc.resolve({});
  assert.ok(r.key && r.name && r.color && r.desc);
  assert.ok(r.desc.includes('D 0 · I 0 · S 0 · C 0'));
});

test('答题卡带进度与导航，选项按钮携带计数器往返', () => {
  const c = buildTestQuestionCard(mbti, 5, { E: 2 });
  assert.equal(c.schema, '2.0');
  assert.equal(c.header.subtitle.content, '第 6 / 12 题');
  const opts = collectButtons(c.body.elements).filter((b) => b.behaviors?.[0]?.value?.a === 'test_ans');
  assert.equal(opts.length, 2);
  assert.deepEqual(opts[0].behaviors[0].value.p.c, { E: 2 });
  assert.ok(collectButtons(c.body.elements).some((b) => b.behaviors?.[0]?.value?.a === 'nav_home'));
});

test('测试选项平铺：2 个两列、3 个三列、4 个 2×2（SPIRIT 第四节）', () => {
  const disc = getTest('disc');
  const two = buildTestQuestionCard(mbti, 0, {});
  const row2 = two.body.elements.find((el) => el.tag === 'column_set' && el.columns.length === 2);
  assert.ok(row2, '2 选项应一行两列');
  const three = buildTestQuestionCard(work, 0, {});
  const row3 = three.body.elements.find((el) => el.tag === 'column_set' && el.columns.length === 3);
  assert.ok(row3, '3 选项应一行三列');
  const four = buildTestQuestionCard(disc, 0, {});
  const rows = four.body.elements.filter((el) => el.tag === 'column_set' && el.columns.length === 2);
  assert.equal(rows.length, 2, '4 选项应为 2×2 两行两列');
});

test('结果卡展示人格并可重测', () => {
  const r = buildTestResultCard(sbti, { FAN: 2, NIU: 2, YE: 2, QIAN: 2 });
  const btns = collectButtons(r.body.elements);
  assert.ok(btns.some((b) => b.behaviors?.[0]?.value?.a === 'test_new'));
  assert.ok(r.body.elements.some((el) => el.tag === 'markdown' && el.content.includes('干饭')));
});

test('测试主页列出全部测试', () => {
  const c = buildTestHomeCard();
  for (const t of TESTS) {
    assert.ok(collectButtons(c.body.elements).some((b) => b.text.content.includes(t.title)));
  }
});
