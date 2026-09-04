// 单实例锁：同一个飞书 App 只允许一个 bot 进程在跑。
//
// 背景：飞书长连接模式下，同一应用凭证挂多条长连接时，事件会在连接间分流——
// 消息到了进程 A、卡片回调到了进程 B，表现为「按钮点了没反应」/「卡片已过期」。
// 演示现场这是致命隐患，所以启动时必须先拿锁。
//
// 锁粒度按 App ID：锁文件为 <dir>/.bot-<appId>.pid，不同 App 的 bot 互不影响。
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH = 进程不存在（锁已过期）；EPERM = 进程存在但无权信号（视为存活）
    return err?.code === 'EPERM';
  }
}

export function lockFileFor(dir, appId) {
  return join(dir, `.bot-${appId || 'unknown'}.pid`);
}

// 拿到锁返回 { file, release() }；已被同 App 的活实例持有时抛错。
// dir 可注入便于测试；生产用项目根目录。
export function acquireLock({ appId, dir, pid = process.pid }) {
  const file = lockFileFor(dir, appId);
  if (existsSync(file)) {
    try {
      const held = JSON.parse(readFileSync(file, 'utf8'));
      if (held?.pid && held.pid !== pid && pidAlive(held.pid)) {
        throw new Error(
          `检测到同一个飞书 App（${appId}）已有 bot 在运行（PID ${held.pid}，启动于 ${held.startedAt || '未知时间'}）。\n` +
            `飞书长连接会把事件分流到多个实例，导致按钮失灵。请先执行：kill ${held.pid}`
        );
      }
      // PID 已死 = 上次异常退出留下的陈锁，直接覆盖
    } catch (err) {
      if (err.message.includes('已有 bot 在运行')) throw err;
      // 锁文件损坏也视为陈锁，直接覆盖
    }
  }
  const record = { pid, appId, startedAt: new Date().toISOString() };
  writeFileSync(file, JSON.stringify(record));

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      // 只删自己的锁（文件里还是自己的 pid 才删，避免误删后启动实例的锁）
      const current = JSON.parse(readFileSync(file, 'utf8'));
      if (current?.pid === pid) unlinkSync(file);
    } catch {
      // 锁文件已不存在或不可读，无需处理
    }
  };
  return { file, release };
}

// 挂在进程退出钩子上，正常退出 / Ctrl+C / kill 都自动放锁
export function acquireLockOrExit(config, dir) {
  try {
    const lock = acquireLock({ appId: config.appId, dir });
    const cleanup = () => lock.release();
    process.on('exit', cleanup);
    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.on(sig, () => {
        cleanup();
        process.exit(128 + (sig === 'SIGINT' ? 2 : 15));
      });
    }
    return lock;
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}
