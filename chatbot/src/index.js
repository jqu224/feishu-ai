import { loadConfig } from './config.js';
import { createBot, wireCardActionAck } from './bot.js';
import { startControlServer } from './control.js';
import { acquireLockOrExit } from './lock.js';

async function main() {
  const config = loadConfig();
  // 同一个飞书 App 只允许一个实例：多实例会导致长连接事件分流、按钮失灵
  acquireLockOrExit(config, new URL('..', import.meta.url).pathname);
  const channel = createBot(config);
  await channel.connect();
  wireCardActionAck(channel);
  if (config.control.enabled) {
    if (!config.control.token) {
      console.warn('MCP_ENABLED=1 但未配置 CONTROL_TOKEN，控制 API 未启动');
    } else {
      await startControlServer(channel, config);
      console.log(`豆包工作控制 API 已启动：http://127.0.0.1:${config.control.port}`);
    }
  }
  console.log('AGUI 卡片机器人已启动（长连接模式）');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
