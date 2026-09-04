// 豆包答题引擎。一局状态只有 {set, seed, i, sc}，塞进按钮 value 往返：
// seed 决定每题的选项排列（乱序），渲染和判题用同一 seed 复现，服务端零状态。
// 选项按 2×2 田字格排布（columnSet 两列），与飞书卡片的网格视觉语言一致。
import { card, markdown, button, columnSet, textLine, statRow, withNav, celebration } from '../cards.js';
import { TRIVIA_SETS } from '../data/trivia.js';
import { permutation, randomSeed } from '../rng.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const TITLES = [
  { min: 0.9, name: '六边形战士', color: 'green', desc: '默认选项困不住你，高级玩家认证到手。' },
  { min: 0.7, name: '高级玩家', color: 'turquoise', desc: '已经越过新手村，再刷一局冲满分。' },
  { min: 0.4, name: '进阶练习生', color: 'yellow', desc: '基本功在线，把解析再过一遍就更稳。' },
  { min: 0, name: '默认选项选手', color: 'neutral', desc: '默认选项是给初学者的——再来一局，学点高级的。' },
];

export function getSet(id) {
  return TRIVIA_SETS.find((s) => s.id === id);
}

// 第 i 题在该 seed 下的展示顺序：displayOrder[k] = 原始选项下标
export function displayOrder(set, seed, i) {
  return permutation(seed, i, set.questions[i].options.length);
}

// 正确答案出现在第几个展示位（即用户看到的字母）
export function correctDisplayIndex(set, seed, i) {
  return displayOrder(set, seed, i).indexOf(set.questions[i].answer);
}

export function answerLetters(set, seed) {
  return set.questions.map((_, i) => LETTERS[correctDisplayIndex(set, seed, i)]);
}

// 挑一个「分布均衡」的 seed：任何字母的正确次数不超过题目数的三分之一，
// 保证答案不会集中在同一个字母，也不会形成固定循环规律。
export function balancedSeed(set) {
  const cap = Math.max(3, Math.ceil(set.questions.length / 3));
  for (let t = 0; t < 100; t++) {
    const seed = randomSeed();
    const counts = {};
    for (const l of answerLetters(set, seed)) counts[l] = (counts[l] || 0) + 1;
    if (Math.max(...Object.values(counts)) <= cap) return seed;
  }
  return randomSeed();
}

function titleFor(ratio) {
  return TITLES.find((t) => ratio >= t.min) || TITLES[TITLES.length - 1];
}

// 入口列表页两列田字格：单元格 = primary 按钮 + 下方 notation 说明，
// 两个单元格一行（columnSet 默认 bisect），奇数个时最后一行只放一格（SPIRIT.md 第四节）
function grid(cells) {
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(columnSet(cells.slice(i, i + 2)));
  return rows;
}

export function buildQuizHomeCard() {
  // 不带 icon：header 已是 list 图标，同卡 icon 不重复（SPIRIT.md 第五节）
  const cells = TRIVIA_SETS.map((s) => [
    button(`${s.title}（${s.questions.length} 题）`, { a: 'quiz_new', p: { set: s.id } }, 'primary'),
    textLine(s.desc, { size: 'notation', color: 'grey' }),
  ]);
  return card({
    template: 'blue',
    icon: 'list',
    iconColor: 'blue',
    title: '豆包答题',
    subtitle: '默认选项是给初学者的，我们学点高级的。',
    tags: [{ text: `${TRIVIA_SETS.length} 大题库`, color: 'blue' }],
    elements: withNav([
      textLine('难度由浅入深 · 每题 4 个选项 · 田字格作答 · 选项每局随机乱序', { size: 'normal' }),
      ...grid(cells),
      columnSet([button('抽一条冷知识先看看', { a: 'fact', p: {} }, 'text', { icon: 'info' })]),
    ]),
  });
}

export function buildQuestionCard(set, seed, i, sc) {
  const q = set.questions[i];
  const order = displayOrder(set, seed, i);
  const optionButton = (k) => {
    const origIdx = order[k];
    return button(`${LETTERS[k]}. ${q.options[origIdx]}`, { a: 'quiz_ans', p: { set: set.id, seed, i, k, sc } }, 'default', {
      width: 'fill',
    });
  };
  // 田字格：选项两两一行（A B / C D），4 个选项正好 2×2；奇数个时末行独占整行
  const optionRows = [];
  for (let r = 0; r < order.length; r += 2) {
    optionRows.push(columnSet([optionButton(r), ...(r + 1 < order.length ? [optionButton(r + 1)] : [])]));
  }
  return card({
    template: set.color || 'blue',
    icon: 'list',
    iconColor: set.color || 'blue',
    title: set.title,
    subtitle: `第 ${i + 1} / ${set.questions.length} 题`,
    tags: [{ text: `得分 ${sc}`, color: sc > 0 ? set.color || 'blue' : 'neutral' }],
    elements: withNav([textLine(q.q, { size: 'normal' }), ...optionRows]),
  });
}

export function buildRevealCard(set, seed, i, k, sc) {
  const q = set.questions[i];
  const ck = correctDisplayIndex(set, seed, i);
  const correct = Number(k) === ck;
  const nextSc = sc + (correct ? 1 : 0);
  const last = i + 1 >= set.questions.length;
  const elements = [
    // 不带 icon：header 已是同款 done/cancel，同卡 icon 不重复（SPIRIT.md 第五节）
    textLine(correct ? '回答正确' : `回答错误，正确答案是 ${LETTERS[ck]}. ${q.options[q.answer]}`, {
      color: correct ? 'green' : 'red',
    }),
    markdown(`**解析**：${q.explain}`),
    statRow([
      { label: '得分', value: nextSc, tone: 'grey-50', color: 'blue' },
      { label: '进度', value: `${i + 1}/${set.questions.length}`, tone: 'grey-50', color: 'default' },
    ]),
    columnSet([
      button(last ? '查看成绩' : '下一题', { a: 'quiz_next', p: { set: set.id, seed, i: i + 1, sc: nextSc } }, 'primary', {
        icon: 'play',
      }),
    ]),
  ];
  return card({
    template: correct ? 'green' : 'orange',
    icon: correct ? 'done' : 'cancel',
    iconColor: correct ? 'green' : 'orange',
    title: set.title,
    subtitle: `第 ${i + 1} / ${set.questions.length} 题 · 已作答`,
    elements: withNav(elements),
  });
}

export function buildResultCard(set, sc, seed) {
  const ratio = sc / set.questions.length;
  const t = titleFor(ratio);
  return card({
    template: set.color || 'green',
    icon: 'done',
    iconColor: set.color || 'green',
    title: set.title,
    subtitle: '本局成绩',
    tags: [{ text: t.name, color: t.color === 'neutral' ? 'neutral' : t.color }],
    elements: withNav([
      // 正确率 ≥40% 才庆祝；平庸结局给鼓励不堆特效（SPIRIT.md 第七节）
      ...(ratio >= 0.4 ? [celebration('trophy')] : []),
      statRow([
        { label: '答对', value: sc, tone: 'grey-50', color: 'default' },
        { label: '总题数', value: set.questions.length, tone: 'grey-50', color: 'default' },
        { label: '正确率', value: `${Math.round(ratio * 100)}%`, tone: 'grey-50', color: 'blue' },
      ]),
      textLine(`获得称号「${t.name}」——${t.desc}`, { icon: 'record', iconColor: set.color || 'green', color: 'default' }),
      columnSet([
        button('再来一局（选项重新乱序）', { a: 'quiz_new', p: { set: set.id } }, 'primary', { icon: 'reset' }),
      ]),
      columnSet([button('换个题库', { a: 'quiz_home', p: {} }, 'text', { icon: 'list' })]),
    ]),
  });
}
