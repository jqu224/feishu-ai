import test from 'node:test';
import assert from 'node:assert/strict';
import { judge, applyMove, randomMove, buildRpsCard, MOVES } from '../src/actions/rps.js';

test('judge 判定胜负', () => {
  assert.equal(judge('rock', 'scissors'), 'win');
  assert.equal(judge('rock', 'paper'), 'lose');
  assert.equal(judge('rock', 'rock'), 'draw');
  assert.equal(judge('scissors', 'paper'), 'win');
  assert.equal(judge('paper', 'rock'), 'win');
});

test('applyMove 累计比分', () => {
  const a = applyMove({ w: 0, l: 0, d: 0 }, 'rock', 'scissors');
  assert.equal(a.result, 'win');
  assert.deepEqual(a.score, { w: 1, l: 0, d: 0 });

  const b = applyMove(a.score, 'rock', 'paper');
  assert.equal(b.result, 'lose');
  assert.deepEqual(b.score, { w: 1, l: 1, d: 0 });
});

test('randomMove 只返回合法出拳', () => {
  for (let i = 0; i < 100; i++) {
    assert.ok(MOVES.includes(randomMove()));
  }
});

test('buildRpsCard 展示上局双方出拳与结果', () => {
  const card = buildRpsCard({ w: 1, l: 0, d: 0 }, { choice: 'rock', bot: 'scissors', result: 'win', text: '你赢了' });
  const serialized = JSON.stringify(card);
  assert.ok(serialized.includes('你出石头'), '应提示用户出了什么');
  assert.ok(serialized.includes('我出剪刀'), '应提示 AI 出了什么');
  assert.ok(serialized.includes('你赢了'), '应提示本局结果');
});

test('buildRpsCard 缺少 result 时也能看出上局提示缺失', () => {
  const card = buildRpsCard({ w: 1, l: 0, d: 0 }, { choice: 'rock', bot: 'scissors', text: '你赢了' });
  assert.ok(!JSON.stringify(card).includes('你出石头'), '不传 result 时上局行不会渲染（回归防护）');
});
