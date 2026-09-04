// 端到端：MCP HTTP 传输 → 控制 API → 会话落库 + 卡片产出。
// 覆盖 startHttpMcp / startControlServer（根包）/ client.js 的真实 HTTP 链路。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startHttpMcp } from '../src/server.js';
import { createControlClient } from '../src/client.js';
import { startControlServer } from '../../chatbot/src/control.js';
import { getSession, resetSessions } from '../../chatbot/src/store.js';

test('HTTP 全链路：MCP client → 插件 server → BOT 控制 API → 卡片落库', async () => {
  resetSessions();
  const sends = [];
  const channel = { send: async (chatId, input) => sends.push({ chatId, input }) };

  const controlServer = await startControlServer(channel, {
    control: { enabled: true, port: 0, token: 'ctrl-tok', defaultChatId: 'oc_e2e' },
  });
  const controlPort = controlServer.address().port;

  const mcpServer = await startHttpMcp({
    port: 0,
    mcpToken: 'mcp-tok',
    control: createControlClient({
      controlUrl: `http://127.0.0.1:${controlPort}`,
      controlToken: 'ctrl-tok',
    }),
  });
  const mcpPort = mcpServer.address().port;

  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${mcpPort}/mcp`), {
    requestInit: { headers: { Authorization: 'Bearer mcp-tok' } },
  });
  const client = new Client({ name: 'e2e-client', version: '0.0.1' });

  try {
    await client.connect(transport);

    // 错误 token 应被拒绝
    const bad = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${mcpPort}/mcp`), {
      requestInit: { headers: { Authorization: 'Bearer wrong' } },
    });
    await assert.rejects(new Client({ name: 'bad', version: '0' }).connect(bad));
    bad.close();

    // 100 人报名全链路
    const names = Array.from({ length: 100 }, (_, i) => `成员${i + 1}`);
    const res = await client.callTool({
      name: 'create_roster_form',
      arguments: { title: '全员大会报名', names },
    });
    assert.equal(res.isError, undefined);
    const { session_id, roster_size } = JSON.parse(res.content[0].text);
    assert.equal(roster_size, 100);
    assert.equal(sends.length, 1);
    assert.equal(sends[0].chatId, 'oc_e2e');
    assert.equal(sends[0].input.card.header.template, 'wathet');

    // 会话真的落在 BOT store，查询与导出走通
    const s = getSession(session_id);
    assert.equal(s.kind, 'form');
    const status = await client.callTool({ name: 'get_session_status', arguments: { session_id } });
    assert.equal(JSON.parse(status.content[0].text).submission_count, 0);
    const exported = await client.callTool({ name: 'export_session_summary', arguments: { session_id } });
    assert.match(JSON.parse(exported.content[0].text).text, /全员大会报名/);
  } finally {
    await client.close();
    for (const srv of [mcpServer, controlServer]) {
      srv.closeAllConnections?.();
      srv.close();
    }
  }
});
