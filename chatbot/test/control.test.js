import test from 'node:test';
import assert from 'node:assert/strict';
import { handleControl, startControlServer } from '../src/control.js';
import { getSession, resetSessions } from '../src/store.js';

function makeConfig(overrides = {}) {
  return {
    control: {
      enabled: true,
      port: 0,
      token: 'test-token',
      defaultChatId: 'oc_default',
      ...overrides,
    },
  };
}

function makeChannel() {
  const sends = [];
  return {
    sends,
    channel: {
      send: async (chatId, input, opts) => sends.push({ chatId, input, opts }),
    },
  };
}

const CFG = makeConfig();

test('create_vote 建会话并发卡', async () => {
  resetSessions();
  const { channel, sends } = makeChannel();
  const { status, data } = await handleControl(
    'POST',
    '/tools/create_vote',
    { question: '下午茶', options: ['奶茶', '咖啡'] },
    channel,
    CFG
  );
  assert.equal(status, 200);
  assert.ok(data.session_id);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].chatId, 'oc_default');
  assert.equal(sends[0].input.card.header.template, 'turquoise');
  const s = getSession(data.session_id);
  assert.equal(s.kind, 'vote');
  assert.deepEqual(s.options, ['奶茶', '咖啡']);
});

test('create_roster_form 生成 100 人 select 报名卡', async () => {
  resetSessions();
  const { channel, sends } = makeChannel();
  const names = Array.from({ length: 120 }, (_, i) => `成员${i + 1}`);
  const { status, data } = await handleControl(
    'POST',
    '/tools/create_roster_form',
    { title: '团建报名', names: names.slice(0, 100).concat(['成员1']) }, // 重复项应去重
    channel,
    CFG
  );
  assert.equal(status, 200);
  assert.equal(data.roster_size, 100);
  const card = sends[0].input.card;
  const selects = [];
  (function walk(els) {
    for (const el of els) {
      if (el.tag === 'select_static') selects.push(el);
      if (el.tag === 'form') walk(el.elements);
    }
  })(card.body.elements);
  const nameSelect = selects.find((s) => s.options.length > 10);
  assert.ok(nameSelect, '应存在 100 选项的姓名下拉');
  assert.equal(nameSelect.options.length, 100);
});

test('create_roster_form 超过 100 人返回 400', async () => {
  const { channel } = makeChannel();
  const names = Array.from({ length: 101 }, (_, i) => `成员${i + 1}`);
  const { status } = await handleControl('POST', '/tools/create_roster_form', { names }, channel, CFG);
  assert.equal(status, 400);
});

test('参数校验与 chat_id 兜底', async () => {
  const { channel } = makeChannel();
  const cfgNoChat = makeConfig({ defaultChatId: '' });
  assert.equal((await handleControl('POST', '/tools/create_vote', { question: 'x', options: ['a'] }, channel, CFG)).status, 400);
  assert.equal((await handleControl('POST', '/tools/create_form', { title: 't', fields: [] }, channel, CFG)).status, 400);
  assert.equal((await handleControl('POST', '/tools/create_roster_form', { names: [] }, channel, CFG)).status, 400);
  const noChat = await handleControl('POST', '/tools/create_vote', { question: 'x', options: ['a', 'b'] }, channel, cfgNoChat);
  assert.equal(noChat.status, 400);
  assert.match(noChat.data.error, /chat_id/);
});

test('session 状态与导出', async () => {
  resetSessions();
  const { channel, sends } = makeChannel();
  const { data } = await handleControl(
    'POST',
    '/tools/create_roster_form',
    { names: ['张三', '李四'] },
    channel,
    CFG
  );
  // 模拟一次提交
  const { recordSubmission } = await import('../src/actions/form.js');
  const s = getSession(data.session_id);
  setSessionLike(s, recordSubmission(s, { f1: '张三', f2: '报名' }, 'u1'));

  const statusRes = await handleControl('GET', `/sessions/${data.session_id}`, {}, channel, CFG);
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.data.submission_count, 1);

  const exportRes = await handleControl('GET', `/sessions/${data.session_id}/export`, {}, channel, CFG);
  assert.equal(exportRes.status, 200);
  assert.match(exportRes.data.text, /共 1 人提交/);
  assert.match(exportRes.data.text, /张三/);
  assert.equal(sends.length, 1);
});

test('未知 session 404，未知路由 404', async () => {
  const { channel } = makeChannel();
  assert.equal((await handleControl('GET', '/sessions/s_missing', {}, channel, CFG)).status, 404);
  assert.equal((await handleControl('GET', '/whatever', {}, channel, CFG)).status, 404);
});

test('startControlServer 鉴权 401 与端到端 200', async () => {
  resetSessions();
  const { channel } = makeChannel();
  const server = await startControlServer(channel, makeConfig({ port: 0 }));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const denied = await fetch(`${base}/tools/create_vote`, {
    method: 'POST',
    headers: { Authorization: 'Bearer wrong' },
    body: JSON.stringify({ question: 'x', options: ['a', 'b'] }),
  });
  assert.equal(denied.status, 401);

  const ok = await fetch(`${base}/tools/create_vote`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '下午茶', options: ['奶茶', '咖啡'] }),
  });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(body.session_id);

  const status = await fetch(`${base}/sessions/${body.session_id}`, {
    headers: { Authorization: 'Bearer test-token' },
  });
  assert.equal(status.status, 200);
  const statusBody = await status.json();
  assert.equal(statusBody.kind, 'vote');
  server.close();
});

function setSessionLike(session, next) {
  Object.assign(session, next, { id: session.id });
}
