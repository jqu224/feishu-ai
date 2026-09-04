import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, randomSeed, shuffled, permutation, pickBySeed } from '../src/rng.js';

test('mulberry32 同 seed 序列完全一致', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

test('mulberry32 输出在 [0,1) 区间', () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = rand();
    assert.ok(v >= 0 && v < 1);
  }
});

test('shuffled 返回合法排列且不改原数组', () => {
  const src = [1, 2, 3, 4, 5];
  const out = shuffled(src, mulberry32(1));
  assert.deepEqual([...out].sort((x, y) => x - y), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
});

test('permutation 随 salt 独立变化（无固定循环）', () => {
  const perms = new Set();
  for (let salt = 0; salt < 20; salt++) {
    perms.add(permutation(123, salt, 4).join(''));
  }
  assert.ok(perms.size > 10, `20 个题号的排列应高度分散，实际只有 ${perms.size} 种`);
});

test('pickBySeed 确定性且落在集合内', () => {
  const arr = ['a', 'b', 'c'];
  assert.equal(pickBySeed(9, arr), pickBySeed(9, arr));
  assert.ok(arr.includes(pickBySeed(9, arr)));
});

test('randomSeed 在安全范围内', () => {
  for (let i = 0; i < 100; i++) {
    const s = randomSeed();
    assert.ok(Number.isInteger(s) && s >= 0 && s < 0x7fffffff);
  }
});
