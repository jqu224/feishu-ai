// 人格测试引擎（MBTI / SBTI / 职场摸鱼指数共用）。
// 计数器对象随按钮 value 往返：选项点击 -> 累加权重 -> 直接进入下一题。
import { card, markdown, button, columnSet, textLine, withNav, celebration, tileButtons } from '../cards.js';
import { TESTS, resultMarkdown } from '../data/tests.js';

export function getTest(id) {
  return TESTS.find((t) => t.id === id);
}

export function addCounters(counters, weights) {
  const next = { ...(counters || {}) };
  for (const [key, value] of Object.entries(weights || {})) {
    next[key] = (next[key] || 0) + value;
  }
  return next;
}

// 入口列表页田字格：每个单元格 = primary 按钮 + 下方 notation 说明，
// 两个单元格一行（columnSet 默认 bisect），奇数个时最后一行只放一格（SPIRIT.md 第四节）
function grid(cells) {
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(columnSet(cells.slice(i, i + 2)));
  return rows;
}

export function buildTestHomeCard() {
  const cells = TESTS.map((t) => [
    button(`${t.title}（${t.questions.length} 题）`, { a: 'test_new', p: { t: t.id } }, 'primary'),
    textLine(t.desc, { size: 'notation', color: 'grey' }),
  ]);
  return card({
    template: 'purple',
    icon: 'chart',
    iconColor: 'purple',
    title: '人格测试',
    subtitle: '选一个最贴近你的答案',
    elements: withNav(grid(cells)),
  });
}

export function buildTestQuestionCard(test, i, counters) {
  const q = test.questions[i];
  return card({
    template: test.color || 'purple',
    icon: 'chart',
    iconColor: test.color || 'purple',
    title: test.title,
    subtitle: `第 ${i + 1} / ${test.questions.length} 题`,
    elements: withNav([
      textLine(q.q, { size: 'normal' }),
      ...tileButtons(
        q.options.map((opt, k) =>
          button(opt.t, { a: 'test_ans', p: { t: test.id, i, k, c: counters || {} } }, 'default', { width: 'fill' })
        )
      ),
    ]),
  });
}

export function buildTestResultCard(test, counters) {
  const result = test.resolve(counters);
  return card({
    template: test.color || 'purple',
    icon: 'done',
    iconColor: test.color || 'purple',
    title: test.title,
    subtitle: '测试结果',
    tags: [{ text: result.key, color: test.color || 'purple' }],
    elements: withNav([
      celebration('sparkle'),
      markdown(resultMarkdown(result)),
      columnSet([button('再测一次', { a: 'test_new', p: { t: test.id } }, 'primary', { icon: 'reset' })]),
      columnSet([button('换个测试', { a: 'test_home', p: {} }, 'text', { icon: 'chart' })]),
    ]),
  });
}
