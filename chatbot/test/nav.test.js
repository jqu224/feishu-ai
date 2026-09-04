import test from 'node:test';
import assert from 'node:assert/strict';
import { navRow, withNav, hr, columnSet } from '../src/cards.js';
import { handleAction } from '../src/registry.js';
import { gameCardFor, helpCard } from '../src/bot.js';
import { buildBallCard } from '../src/actions/ball.js';
import { buildFactCard } from '../src/actions/fact.js';
import { getSet, balancedSeed, buildQuestionCard } from '../src/actions/quiz.js';
import { getTest, buildTestQuestionCard } from '../src/actions/test.js';
import { buildStoryCard } from '../src/actions/story.js';
import { WORDS } from '../src/data/words.js';
import { REFRESH_SHAPES } from '../src/data/refresh.js';

// 取词库第一个单词的首字母，避免测试硬编码
function WORD0() {
  return WORDS[0].w.toUpperCase()[0];
}

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') for (const col of el.columns) collectButtons(col.elements, acc);
  }
  return acc;
}

function makeChannel() {
  const sends = [];
  return {
    sends,
    channel: {
      updateCard: async () => {},
      send: async (chatId, input, opts) => sends.push({ chatId, input, opts }),
    },
  };
}

const evt = (value) => ({ messageId: 'm1', chatId: 'c1', action: { value }, operator: { openId: 'u1' } });

test('navRow 是五个 text 型小按钮，动作名正确', () => {
  const row = navRow();
  assert.equal(row.tag, 'column_set');
  const btns = row.columns.map((col) => col.elements[0]);
  assert.deepEqual(
    btns.map((b) => b.behaviors[0].value.a),
    ['nav_home', 'nav_quiz', 'nav_test', 'nav_hang', 'nav_story']
  );
  assert.ok(btns.every((b) => b.size === 'small'));
});

test('withNav 在元素末尾追加分隔线与导航', () => {
  const els = withNav([{ tag: 'markdown', content: 'x' }]);
  assert.equal(els.length, 3);
  assert.equal(els[0].content, 'x');
  assert.deepEqual(els[1], hr());
  assert.equal(els[2].tag, 'column_set');
});

test('导航回调：发新卡片、原卡片不动（返回 undefined）', async () => {
  const { channel, sends } = makeChannel();
  const result = await handleAction(channel, evt({ a: 'nav_home', p: {} }));
  assert.equal(result, undefined);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].input.card.header.title.content, 'AGUI 卡片机器人');

  const { sends: sends2 } = makeChannel();
  const ch2 = { updateCard: async () => {}, send: async (...a) => sends2.push(a) };
  await handleAction(ch2, evt({ a: 'nav_quiz', p: {} }));
  assert.equal(sends2.length, 1);
  assert.equal(sends2[0][1].card.header.title.content, '豆包答题');
});

test('玩法回调：答题/测试/猜词/剧情/变形球全部原地换卡', async () => {
  const { channel } = makeChannel();
  const set = getSet('feishu-basics');
  const seed = balancedSeed(set);

  const q = await handleAction(channel, evt({ a: 'quiz_ans', p: { set: 'feishu-basics', seed, i: 2, k: 0, sc: 1 } }));
  assert.equal(q.schema, '2.0');
  const n = await handleAction(channel, evt({ a: 'quiz_next', p: { set: 'feishu-basics', seed, i: 3, sc: 2 } }));
  assert.match(n.header.subtitle.content, /第 4 \/ 14 题/);
  const done = await handleAction(channel, evt({ a: 'quiz_next', p: { set: 'feishu-basics', seed, i: 14, sc: 13 } }));
  assert.equal(done.header.subtitle.content, '本局成绩');

  const t1 = await handleAction(channel, evt({ a: 'test_ans', p: { t: 'mbti', i: 0, k: 0, c: {} } }));
  assert.match(t1.header.subtitle.content, /第 2 \/ 12 题/);
  let c = {};
  const mbti = getTest('mbti');
  mbti.questions.forEach((qq, i) => {
    c = { ...c };
    for (const [k, v] of Object.entries(qq.options[0].w)) c[k] = (c[k] || 0) + v;
  });
  const last = await handleAction(
    channel,
    evt({ a: 'test_ans', p: { t: 'mbti', i: mbti.questions.length - 1, k: 0, c } })
  );
  assert.equal(last.header.subtitle.content, '测试结果');

  const h = await handleAction(channel, evt({ a: 'hang', p: { w: 0, g: 0, x: 0, l: WORD0() } }));
  assert.equal(h.schema, '2.0');
  const s = await handleAction(channel, evt({ a: 'story_go', p: { s: 'puppy', n: 'phone' } }));
  assert.equal(s.header.title.content, '年下奶狗的深夜来电');
  const b = await handleAction(channel, evt({ a: 'ball', p: { f: 4 } }));
  assert.match(b.header.subtitle.content, /解压疗愈小玩具/); // 变形球改为种子程序化生成，任意 f 都出一张新图
});

test('关键词路由：玩法直达，普通需求不误伤', () => {
  assert.match(gameCardFor('来一局豆包答题').header.title.content, /豆包答题/);
  assert.match(gameCardFor('抽条冷知识').header.title.content, /豆包答题/);
  assert.match(gameCardFor('测一下我的MBTI').header.title.content, /人格测试/);
  assert.match(gameCardFor('sbti是什么').header.title.content, /人格测试/);
  assert.match(gameCardFor('玩猜词').header.title.content, /猜单词/);
  assert.match(gameCardFor('我想看剧情').header.title.content, /互动剧情/);
  assert.match(gameCardFor('点一下变形球').header.title.content, /变形球/);
  assert.match(gameCardFor('玩法').header.title.content, /AGUI 卡片机器人/);
  assert.equal(gameCardFor('发起一个下午茶投票：奶茶 / 咖啡 / 果茶'), null);
  assert.equal(gameCardFor('收集团建报名：姓名、能否参加、忌口'), null);
});

test('helpCard 委托到主页卡片，玩法入口齐全', () => {
  const c = helpCard(true);
  const labels = collectButtons(c.body.elements).map((b) => b.text.content).join(' ');
  for (const label of ['豆包答题', '职场测试', '猜单词', '互动剧情', '抽条冷知识', '变形球']) {
    assert.ok(labels.includes(label), `主页缺少入口：${label}`);
  }
});

test('各玩法卡片全部带底部导航（主页本身即导航终点，无需 navRow）', () => {
  const set = getSet('feishu-basics');
  const mbti = getTest('mbti');
  const cards = [
    buildFactCard(3),
    buildQuestionCard(set, 1, 0, 0),
    buildTestQuestionCard(mbti, 0, {}),
    buildStoryCard('puppy', 'start'),
    buildBallCard(0),
  ];
  for (const c of cards) {
    assert.ok(
      collectButtons(c.body.elements).some((b) => b.behaviors?.[0]?.value?.a === 'nav_home'),
      `${c.header.title.content} 缺少底部导航`
    );
  }
});

test('提神活动：图形恰好 100 个，主页有入口', () => {
  assert.equal(REFRESH_SHAPES.length, 100);
  const c = helpCard(true);
  const labels = collectButtons(c.body.elements).map((b) => b.text.content).join(' ');
  assert.ok(labels.includes('提神活动'), '主页缺少入口：提神活动');
});

test('提神活动回调：{ a: refresh, p: {} } 原地换卡，标题含「提神」', async () => {
  const { channel } = makeChannel();
  const r = await handleAction(channel, evt({ a: 'refresh', p: {} }));
  assert.equal(r.schema, '2.0');
  assert.match(r.header.title.content, /提神/);
});
