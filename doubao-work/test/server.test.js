import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/server.js';
import { createControlClient } from '../src/client.js';

function mockControl() {
  const calls = [];
  return {
    calls,
    createVote: async (args) => {
      calls.push(['create_vote', args]);
      return { session_id: 's_vote1', chat_id: 'oc_x' };
    },
    createForm: async (args) => {
      calls.push(['create_form', args]);
      return { session_id: 's_form1', chat_id: 'oc_x' };
    },
    createRosterForm: async (args) => {
      calls.push(['create_roster_form', args]);
      return { session_id: 's_roster1', chat_id: 'oc_x', roster_size: args.names.length };
    },
    getSession: async (id) => {
      calls.push(['getSession', id]);
      return { session_id: id, kind: 'vote', votes: 3 };
    },
    exportSession: async (id) => {
      calls.push(['exportSession', id]);
      return { session_id: id, text: '汇总文本' };
    },
  };
}

async function connect() {
  const control = mockControl();
  const server = createMcpServer({ control });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.1' });
  await Promise.all([server.connect(serverT), client.connect(clientT)]);
  return { control, client };
}

test('tools/list 返回 5 个工具且 schema 完整', async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    'create_form',
    'create_roster_form',
    'create_vote',
    'export_session_summary',
    'get_session_status',
  ]);
  for (const tool of tools) {
    assert.ok(tool.description, `${tool.name} 缺 description`);
    assert.equal(tool.inputSchema.type, 'object');
  }
  const roster = tools.find((t) => t.name === 'create_roster_form');
  assert.equal(roster.inputSchema.properties.names.maxItems, 100);
});

test('create_vote 往返：参数透传 mock 控制 API', async () => {
  const { control, client } = await connect();
  const res = await client.callTool({
    name: 'create_vote',
    arguments: { question: '下午茶', options: ['奶茶', '咖啡'] },
  });
  assert.equal(res.isError, undefined);
  const data = JSON.parse(res.content[0].text);
  assert.equal(data.session_id, 's_vote1');
  assert.deepEqual(control.calls[0], ['create_vote', { question: '下午茶', options: ['奶茶', '咖啡'] }]);
});

test('create_roster_form 100 人名单往返', async () => {
  const { control, client } = await connect();
  const names = Array.from({ length: 100 }, (_, i) => `成员${i + 1}`);
  const res = await client.callTool({
    name: 'create_roster_form',
    arguments: { title: '团建报名', names },
  });
  const data = JSON.parse(res.content[0].text);
  assert.equal(data.roster_size, 100);
  assert.equal(control.calls[0][1].names.length, 100);
});

test('参数缺失返回 isError 而不是抛断连', async () => {
  const { client } = await connect();
  const res = await client.callTool({ name: 'create_vote', arguments: { question: 'x' } });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /至少 2 个 options/);
});

test('get_session_status / export_session_summary', async () => {
  const { control, client } = await connect();
  const status = await client.callTool({ name: 'get_session_status', arguments: { session_id: 's1' } });
  assert.equal(JSON.parse(status.content[0].text).votes, 3);
  const exported = await client.callTool({ name: 'export_session_summary', arguments: { session_id: 's1' } });
  assert.match(exported.content[0].text, /汇总文本/);
  assert.deepEqual(control.calls.map((c) => c[0]), ['getSession', 'exportSession']);
});

test('createControlClient 发送 Bearer 头并解析错误体', async () => {
  const requests = [];
  const fakeFetch = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/fail')) return { ok: false, status: 400, statusText: 'Bad', json: async () => ({ error: '参数错误' }) };
    return { ok: true, status: 200, json: async () => ({ ok: 1 }) };
  };
  const control = createControlClient({ controlUrl: 'http://127.0.0.1:3777', controlToken: 'tok', fetchImpl: fakeFetch });
  await control.getSession('abc');
  assert.equal(requests[0].url, 'http://127.0.0.1:3777/sessions/abc');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer tok');
  await assert.rejects(control.getSession('fail'), /控制 API 400：参数错误/);
  assert.throws(() => createControlClient({ controlToken: '' }), /CONTROL_TOKEN/);
});
