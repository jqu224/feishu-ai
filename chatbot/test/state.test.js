import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeValue, decodeValue } from '../src/state.js';

test('encode/decode 对象回环', () => {
  const v = encodeValue('rps', { c: 'rock', s: { w: 1, l: 0, d: 0 } });
  const d = decodeValue(v);
  assert.equal(d.action, 'rps');
  assert.equal(d.payload.c, 'rock');
});

test('decode JSON 字符串', () => {
  const d = decodeValue(JSON.stringify({ a: 'vote', p: { choice: '奶茶' } }));
  assert.equal(d.action, 'vote');
  assert.equal(d.payload.choice, '奶茶');
});

test('decode 垃圾输入返回 null', () => {
  assert.equal(decodeValue(null), null);
  assert.equal(decodeValue(undefined), null);
  assert.equal(decodeValue('not json'), null);
  assert.equal(decodeValue(42), null);
  assert.equal(decodeValue({}), null);
  assert.equal(decodeValue([]), null);
});
