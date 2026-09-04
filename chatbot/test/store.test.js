import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, getSession, setSession, deleteSession, resetSessions } from '../src/store.js';

test('newSession 生成唯一 id 并可读写', () => {
  const a = newSession({ q: 'a' });
  const b = newSession({ q: 'b' });
  assert.notEqual(a.id, b.id);
  assert.equal(getSession(a.id).q, 'a');
});

test('setSession 保留 id', () => {
  const a = newSession({ q: 'a' });
  setSession(a.id, { q: 'b' });
  assert.equal(getSession(a.id).q, 'b');
  assert.equal(getSession(a.id).id, a.id);
});

test('deleteSession 清除会话', () => {
  resetSessions();
  const a = newSession({});
  assert.equal(deleteSession(a.id), true);
  assert.equal(getSession(a.id), undefined);
  resetSessions();
});

test('getLatestSession 返回最近创建的会话', async () => {
  const { getLatestSession } = await import('../src/store.js');
  resetSessions();
  newSession({ q: 'a' });
  newSession({ q: 'b' });
  assert.equal(getLatestSession().q, 'b');
  resetSessions();
  assert.equal(getLatestSession(), undefined);
});
