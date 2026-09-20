// 设计规范回归测试：守住「卡片内零 emoji、图标必须来自注册表、色彩/模板枚举合法」。
// 这些断言对应 README 的设计系统章节，改卡片样式前先在这里加用例。
// 例外：变形球、提神活动卡片的 emoji 是画面像素（玩法本体），只参与图标/模板/按钮检查，不参与零 emoji 检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRpsCard } from '../src/actions/rps.js';
import { buildVoteCard, summarize } from '../src/actions/vote.js';
import { buildFormCard, summarizeForm } from '../src/actions/form.js';
import { helpCard, infoCard } from '../src/bot.js';
import { confirmCard } from '../src/registry.js';
import { buildHomeCard } from '../src/actions/home.js';
import {
  getSet, balancedSeed, correctDisplayIndex, buildQuizHomeCard, buildQuestionCard, buildRevealCard, buildResultCard,
} from '../src/actions/quiz.js';
import { buildFactCard } from '../src/actions/fact.js';
import { getTest, buildTestHomeCard, buildTestQuestionCard, buildTestResultCard } from '../src/actions/test.js';
import { buildHangmanCard, newHangmanGame, applyGuess } from '../src/actions/hangman.js';
import { buildStoryHomeCard, buildStoryCard } from '../src/actions/story.js';
import { buildBallCard } from '../src/actions/ball.js';
import { buildRefreshCard } from '../src/actions/refresh.js';
import { buildCalmHomeCard, buildCalmStepCard } from '../src/actions/calm.js';
import { icon, ICON_NAMES } from '../src/icons.js';
import { newSession, resetSessions } from '../src/store.js';

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const TOKEN_RE = /^[a-z0-9]+(-[a-z0-9]+)*_(outlined|filled|colorful)$/;
const HEADER_TEMPLATES = new Set([
  'blue', 'wathet', 'turquoise', 'green', 'yellow', 'orange', 'red',
  'carmine', 'violet', 'purple', 'indigo', 'grey', 'default',
]);

async function allCards() {
  resetSessions();
  const voteSession = newSession({ kind: 'vote', q: '下午茶', options: ['奶茶', '咖啡', '果茶'], tally: { 奶茶: 2, 咖啡: 1 }, closed: false, votes: 3 });
  const formState = {
    title: '周五团建报名',
    fields: [
      { name: 'f1', label: '姓名', type: 'text', required: true },
      { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['能', '不能'] },
    ],
    submissions: [{ openId: 'u1', values: { f1: '张三', f2: '能' }, at: 0 }],
    closed: false,
  };
  const set = getSet('feishu-basics');
  const seed = balancedSeed(set);
  const mbti = getTest('mbti');
  const work = getTest('work');
  const rosterNames = Array.from({ length: 100 }, (_, i) => `成员${i + 1}`);
  const rosterState = {
    title: '全员报名统计',
    fields: [
      { name: 'f1', label: '姓名', type: 'select', required: true, options: rosterNames },
      { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['报名', '不报名'] },
    ],
    submissions: [],
    closed: false,
  };
  return [
    ['rps-idle', buildRpsCard()],
    ['rps-after-move', buildRpsCard({ w: 3, l: 1, d: 2 }, { choice: 'rock', bot: 'scissors', result: 'win', text: '你赢了' })],
    ['vote-open', buildVoteCard(voteSession, voteSession.id)],
    ['vote-closed', buildVoteCard({ ...voteSession, closed: true }, voteSession.id)],
    ['form-open', buildFormCard(formState, 's_x')],
    ['form-closed', buildFormCard({ ...formState, closed: true }, 's_x')],
    ['form-roster-100', buildFormCard(rosterState, 's_roster')],
    ['help-on', helpCard(true)],
    ['help-off', helpCard(false)],
    ['info', infoCard({ kind: 'info', title: '发布通知', content: '**正文**', buttons: [{ text: '查看', url: 'https://a' }] })],
    ['confirm', await confirmCard({ kind: 'publish_vote', sessionId: voteSession.id })],
    ['home', buildHomeCard(true)],
    ['quiz-home', buildQuizHomeCard()],
    ['quiz-question', buildQuestionCard(set, seed, 0, 0)],
    ['quiz-reveal-right', buildRevealCard(set, seed, 0, correctDisplayIndex(set, seed, 0), 0)],
    ['quiz-reveal-wrong', buildRevealCard(set, seed, 0, (correctDisplayIndex(set, seed, 0) + 1) % set.questions[0].options.length, 0)],
    ['quiz-result', buildResultCard(set, 7, seed)],
    ['fact', buildFactCard(5)],
    ['test-home', buildTestHomeCard()],
    ['test-question-mbti', buildTestQuestionCard(mbti, 3, { E: 2 })],
    ['test-question-work', buildTestQuestionCard(work, 0, {})],
    ['test-result', buildTestResultCard(mbti, { E: 3, I: 0, S: 3, N: 0, T: 3, F: 0, J: 3, P: 0 })],
    ['hangman-new', buildHangmanCard(newHangmanGame(11))],
    ['hangman-mid', buildHangmanCard({ w: 0, g: 0b101, x: 2 })],
    ['story-home', buildStoryHomeCard()],
    ['story-node', buildStoryCard('puppy', 'phone')],
    ['story-ending', buildStoryCard('puppy', 'end_heart')],
    ['ball-0', buildBallCard(0)],
    ['ball-2', buildBallCard(2)],
    ['refresh', buildRefreshCard()], // 随机抽图形：设计断言对 100 张任意一张都成立
    ['calm-home', buildCalmHomeCard()],
    ['calm-step-box', buildCalmStepCard('box', 3)],
    ['calm-step-ground', buildCalmStepCard('ground', 8)],
    ['calm-done', buildCalmStepCard('box', 17)], // s === steps.length → 完成卡
  ];
}

// emoji 像素是变形球/提神活动的画面本体（SPIRIT 豁免），不参与零 emoji 检查
const EMOJI_EXEMPT = new Set(['ball-0', 'ball-2', 'refresh']);

// 遍历卡片 JSON，收集所有文本与图标节点
function walk(node, texts, iconNodes) {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, texts, iconNodes);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (typeof node.content === 'string') texts.push(node.content);
  if (node.tag === 'standard_icon' || node.tag === 'custom_icon') iconNodes.push(node);
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') walk(v, texts, iconNodes);
  }
}

test('所有卡片文本零 emoji（变形球画面像素除外）', async () => {
  for (const [name, cardJson] of await allCards()) {
    if (EMOJI_EXEMPT.has(name)) continue;
    const texts = [];
    const iconNodes = [];
    walk(cardJson, texts, iconNodes);
    for (const text of texts) {
      assert.ok(!EMOJI_RE.test(text), `${name} 的文本含 emoji：${text}`);
    }
  }
});

test('聊天摘要文本零 emoji', () => {
  const voteText = summarize({ q: '下午茶', options: ['奶茶', '咖啡'], tally: { 奶茶: 2, 咖啡: 1 } });
  assert.ok(!EMOJI_RE.test(voteText));
  const formText = summarizeForm({ title: '报名', fields: [], submissions: [] });
  assert.ok(!EMOJI_RE.test(formText));
});

test('卡片内图标只能来自注册表且 token 合法', async () => {
  for (const [name, cardJson] of await allCards()) {
    const texts = [];
    const iconNodes = [];
    walk(cardJson, texts, iconNodes);
    for (const ic of iconNodes) {
      if (ic.tag === 'standard_icon') {
        assert.match(ic.token, TOKEN_RE, `${name} 的 token 命名不合法：${ic.token}`);
        const fromRegistry = ICON_NAMES.some((n) => icon(n)?.token === ic.token);
        assert.ok(fromRegistry, `${name} 使用了注册表之外的 token：${ic.token}`);
      } else {
        assert.match(ic.img_key, /^img_/, `${name} 的 custom_icon 缺少合法 img_key`);
      }
    }
  }
});

test('header template 在合法枚举内', async () => {
  for (const [, cardJson] of await allCards()) {
    assert.ok(HEADER_TEMPLATES.has(cardJson.header.template), `非法 template：${cardJson.header.template}`);
  }
});

// SPIRIT.md 第六节：一个 topic 一个色板；选项卡（题库/测试套件/冷知识）一卡一色，全局选项卡互不撞色
test('topic 配色符合色板表', async () => {
  const EXPECTED = {
    home: 'indigo',
    // quiz-question/quiz-result 取 feishu-basics 题库的主题色 green；reveal 的绿/橙是状态反馈色（SPIRIT 豁免）
    'quiz-home': 'blue', 'quiz-question': 'green', 'quiz-reveal-right': 'green', 'quiz-reveal-wrong': 'orange', 'quiz-result': 'green',
    fact: 'wathet', // 冷知识独立冰蓝色板，不再与答题共享 blue
    'test-home': 'purple', 'test-question-mbti': 'purple', 'test-question-work': 'orange', 'test-result': 'purple',
    'hangman-new': 'green', 'hangman-mid': 'green',
    'story-home': 'carmine', 'story-node': 'carmine', 'story-ending': 'carmine',
    'rps-idle': 'yellow', 'rps-after-move': 'yellow',
    'vote-open': 'turquoise', 'vote-closed': 'turquoise',
    'form-open': 'wathet', 'form-closed': 'wathet', 'form-roster-100': 'wathet',
    info: 'violet',
    confirm: 'red',
    'ball-0': 'grey', 'ball-2': 'grey',
    refresh: 'orange',
    'calm-home': 'turquoise', 'calm-step-box': 'turquoise', 'calm-step-ground': 'turquoise', 'calm-done': 'turquoise',
  };
  // quiz-reveal 的绿/橙与 quiz-result 的绿是「状态反馈色」，SPIRIT 豁免，不算撞色
  for (const [name, cardJson] of await allCards()) {
    if (name.startsWith('help-')) continue; // help 卡即 home 卡，同色板
    const expected = EXPECTED[name];
    assert.ok(expected, `${name} 未登记配色预期`);
    assert.equal(cardJson.header.template, expected, `${name} 的配色应为 ${expected}`);
  }
});

// 选项卡级配色（2026-09 用户决策）：题库之间、测试之间互不撞色。
// 全局互不重复已不可行：卡片 template 色板只有 12 种，而选项卡已有 14+ 张，
// 因此收缩为「同一列表内互不重复」，跨列表（题库 vs 测试 vs 冷知识）允许复用。
test('选项卡配色类别内不撞色', async () => {
  const { TRIVIA_SETS } = await import('../src/data/trivia.js');
  const { TESTS } = await import('../src/data/tests.js');
  const groups = [
    ['题库', TRIVIA_SETS.map((s) => [s.title, s.color])],
    ['测试', TESTS.map((t) => [t.title, t.color])],
    ['冷知识', [['冷知识', 'wathet']]],
  ];
  for (const [groupName, entries] of groups) {
    for (const [label, c] of entries) assert.ok(c, `${groupName} ${label} 缺少主题色`);
    const colors = entries.map(([, c]) => c);
    assert.equal(new Set(colors).size, colors.length, `${groupName}选项卡配色撞车：${colors.join(', ')}`);
  }
});

// SPIRIT.md 第五节：每张卡 header 必须有 icon，且同卡 icon 不重复。
// 豁免：home/help 卡——用户明确要求每个玩法按钮带与导览行同款前缀图标，
// 图标在 textLine 与按钮之间成对重复属刻意设计（2026-09 用户决策，优先级高于 SPIRIT 第五节）。
test('每卡 header 有 icon 且同卡 icon 不重复', async () => {
  for (const [name, cardJson] of await allCards()) {
    assert.ok(cardJson.header.icon, `${name} 的 header 缺少 icon`);
    if (name === 'home' || name.startsWith('help-')) continue; // 主页卡 icon 重复为用户指定的刻意设计
    const texts = [];
    const iconNodes = [];
    walk(cardJson, texts, iconNodes);
    const ids = iconNodes.map((ic) => ic.token || ic.img_key);
    assert.equal(new Set(ids).size, ids.length, `${name} 内 icon 重复：${ids.join(', ')}`);
  }
});

// SPIRIT.md 第四节：底部导航行 5 按钮强制一行（flex none），手机端不错位
test('底部导航行 flex_mode=none', async () => {
  for (const [name, cardJson] of await allCards()) {
    const last = cardJson.body.elements.at(-1);
    if (!last || last.tag !== 'column_set') continue; // home/confirm/info 等无导航行
    if (last.columns.length === 5) {
      assert.equal(last.flex_mode, 'none', `${name} 的底部导航行必须 flex_mode=none`);
    }
  }
});

// SPIRIT.md 第七节：结局卡必须有庆祝 ASCII（平庸结局除外）
test('结局卡带庆祝 ASCII 特效', async () => {
  const cards = new Map(await allCards());
  assert.ok(JSON.stringify(cards.get('quiz-result')).includes('| winner |'), '答题成绩卡应有奖杯 ASCII');
  assert.ok(JSON.stringify(cards.get('test-result')).includes('* ˘ *'), '测试结果卡应有星光 ASCII');
  assert.ok(JSON.stringify(cards.get('story-ending')).includes('————'), '剧情结局卡应有烟花 ASCII');
});

test('所有交互按钮都带 behaviors', async () => {
  function collectButtons(node, acc = []) {
    if (Array.isArray(node)) {
      node.forEach((n) => collectButtons(n, acc));
      return acc;
    }
    if (!node || typeof node !== 'object') return acc;
    if (node.tag === 'button' && !node.form_action_type) {
      acc.push(node);
      assert.ok(Array.isArray(node.behaviors) && node.behaviors.length > 0, `按钮缺少 behaviors：${JSON.stringify(node.text)}`);
    }
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') collectButtons(v, acc);
    }
    return acc;
  }
  let totalButtons = 0;
  for (const [, cardJson] of await allCards()) {
    totalButtons += collectButtons(cardJson).length;
  }
  assert.ok(totalButtons >= 15, '按钮收集逻辑异常：全卡片集合几乎没有按钮');
});

// 结构回归：column 的 elements 里不允许出现裸字符串。
// 真实事故：columnSet 曾把 markdown 元素（顶层带 content 字段）误判为权重规格并解包成
// 裸字符串，飞书「更新卡片」接口直接 400（发送接口却宽容）——表现为按钮点了没反应。
test('column 内元素必须是对象（禁止裸字符串）', async () => {
  // 额外补一张「猜词猜错两个字母后」的卡：初始卡全按钮没问题，猜错后键盘格变 markdown 才触发该 bug
  const midGame = buildHangmanCard(applyGuess(applyGuess({ w: 15, g: 0, x: 0 }, 'L').state, 'U').state);
  const cards = [...(await allCards()), ['hangman-mid-game', midGame]];

  function checkColumns(node, name) {
    if (Array.isArray(node)) return node.forEach((n) => checkColumns(n, name));
    if (!node || typeof node !== 'object') return;
    if (node.tag === 'column' && Array.isArray(node.elements)) {
      for (const el of node.elements) {
        assert.ok(el && typeof el === 'object', `${name} 的 column 内出现非对象元素：${JSON.stringify(el)}`);
      }
    }
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') checkColumns(v, name);
    }
  }
  for (const [name, cardJson] of cards) checkColumns(cardJson, name);
});
