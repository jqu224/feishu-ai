import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireLock, lockFileFor } from '../src/lock.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'botlock-'));

test('同 App 第二次拿锁被拒绝，并给出 kill 提示', () => {
  const dir = tmp();
  const first = acquireLock({ appId: 'cli_a', dir });
  assert.throws(() => acquireLock({ appId: 'cli_a', dir, pid: process.pid + 999 }), /已有 bot 在运行/);
  assert.throws(() => acquireLock({ appId: 'cli_a', dir, pid: process.pid + 999 }), /kill/);
  first.release();
  rmSync(dir, { recursive: true, force: true });
});

test('不同 App 互不影响', () => {
  const dir = tmp();
  const a = acquireLock({ appId: 'cli_a', dir });
  const b = acquireLock({ appId: 'cli_b', dir });
  assert.ok(existsSync(lockFileFor(dir, 'cli_a')));
  assert.ok(existsSync(lockFileFor(dir, 'cli_b')));
  a.release();
  b.release();
  rmSync(dir, { recursive: true, force: true });
});

test('陈锁（PID 已死）直接覆盖', () => {
  const dir = tmp();
  // 写一个几乎不可能存活的 PID
  writeFileSync(lockFileFor(dir, 'cli_a'), JSON.stringify({ pid: 2 ** 22, appId: 'cli_a' }));
  const lock = acquireLock({ appId: 'cli_a', dir });
  assert.ok(lock.file);
  lock.release();
  rmSync(dir, { recursive: true, force: true });
});

test('release 删除锁文件后可再次拿锁；不会误删别人的锁', () => {
  const dir = tmp();
  const first = acquireLock({ appId: 'cli_a', dir });
  first.release();
  assert.ok(!existsSync(lockFileFor(dir, 'cli_a')));
  const second = acquireLock({ appId: 'cli_a', dir });
  first.release(); // 重复 release 不应删掉 second 的锁
  assert.ok(existsSync(lockFileFor(dir, 'cli_a')));
  second.release();
  rmSync(dir, { recursive: true, force: true });
});
