import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVote, recordVote, summarize, buildVoteCard } from '../src/actions/vote.js';

test('recordVote 累计且不改原对象', () => {
  const v = { q: '下午茶', options: ['奶茶', '咖啡'], tally: {}, closed: false };
  const next = recordVote(v, '奶茶');
  assert.equal(next.tally['奶茶'], 1);
  assert.equal(v.tally['奶茶'], undefined);
  assert.equal(next.votes, 1);
});

// 回归（2026-09-04 线上事故）：normalizeVote 只返回业务字段，recordVote 必须
// 保留 kind 等会话元信息，否则投过票的会话在导出时被误判成报名表，导出空数据
test('recordVote 保留 kind / chatId / messageId 等会话元信息', () => {
  const v = { kind: 'vote', q: '下午茶', options: ['奶茶', '咖啡'], tally: {}, closed: false, votes: 0, chatId: 'c1', messageId: 'm1' };
  const next = recordVote(v, '奶茶');
  assert.equal(next.kind, 'vote');
  assert.equal(next.chatId, 'c1');
  assert.equal(next.messageId, 'm1');
  assert.equal(next.tally['奶茶'], 1);
});

test('closed 后不再计票', () => {
  const v = { q: 'x', options: ['a', 'b'], tally: { a: 1 }, closed: true };
  const next = recordVote(v, 'b');
  assert.equal(next.tally['b'], 0);
  assert.equal(next.votes, 1);
});

test('summarize 输出统计', () => {
  const v = { q: '下午茶', options: ['奶茶', '咖啡'], tally: { 奶茶: 2, 咖啡: 1 } };
  assert.match(summarize(v), /下午茶/);
  assert.match(summarize(v), /奶茶：2 票/);
  assert.match(summarize(v), /咖啡：1 票/);
});

test('buildVoteCard 为卡片 v2 结构', () => {
  const c = buildVoteCard({ q: '下午茶', options: ['奶茶', '咖啡'] });
  assert.equal(c.schema, '2.0');
  assert.ok(Array.isArray(c.body.elements));
});

test('normalizeVote 过滤非法选项', () => {
  const v = normalizeVote({ q: 'x', options: ['a', ' ', 3, 'b'] });
  assert.deepEqual(v.options, ['a', 'b']);
});

test('closed 投票卡图表化并带导出按钮', () => {
  const c = buildVoteCard(
    { q: '下午茶', options: ['奶茶', '咖啡'], tally: { 奶茶: 2, 咖啡: 1 }, closed: true, votes: 3 },
    's_chart'
  );
  const chartEl = c.body.elements.find((el) => el.tag === 'chart');
  assert.ok(chartEl, '结束后应展示图表');
  assert.deepEqual(chartEl.chart_spec.data, [
    { id: 'data', values: [{ name: '奶茶', value: 2 }, { name: '咖啡', value: 1 }] },
  ]);
  assert.ok(JSON.stringify(c).includes('"export_vote"'), '结束卡应有导出按钮');
});

test('open 投票卡有 sessionId 才带导出按钮', () => {
  const withId = buildVoteCard({ q: 'x', options: ['a', 'b'], tally: {}, closed: false }, 's_y');
  assert.ok(JSON.stringify(withId).includes('"export_vote"'));
  const withoutId = buildVoteCard({ q: 'x', options: ['a', 'b'], tally: {}, closed: false });
  assert.ok(!JSON.stringify(withoutId).includes('"export_vote"'), '无 sessionId 的旧卡不应出现导出按钮');
});
