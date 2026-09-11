#!/usr/bin/env node
// 探测本地 MCP 端点是否存活——接入豆包工作时的自查手段。
// 用法：npm run ping                     # 用 .env 里的 MCP_PORT / MCP_TOKEN
//       MCP_PORT=3999 MCP_TOKEN=xxx npm run ping
import { loadEnv } from '../src/server.js';

const cfg = loadEnv();
const url = `http://127.0.0.1:${cfg.mcpPort}/mcp`;

async function main() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // MCP Streamable HTTP 要求 Accept 同时声明两种媒体类型，缺一个会被拒 406
      Accept: 'application/json, text/event-stream',
      ...(cfg.mcpToken ? { Authorization: `Bearer ${cfg.mcpToken}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
  if (res.status === 401) {
    console.error(`✘ MCP 端点 ${url} 拒绝鉴权（401）：Authorization 应为「Bearer <MCP_TOKEN>」，注意 Bearer 后有空格`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`✘ MCP 端点 ${url} 返回 ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  const names = (body?.result?.tools ?? []).map((t) => t.name);
  console.log(`✔ MCP 端点存活：${url}`);
  console.log(`  工具（${names.length} 个）：${names.join(' / ')}`);
}

main().catch((err) => {
  console.error(`✘ MCP 端点 ${url} 不可达：${err.message}`);
  console.error('  请确认已启动 npm start（连接器进程）');
  process.exit(1);
});
