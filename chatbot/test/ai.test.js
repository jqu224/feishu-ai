import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent } from '../src/ai.js';

test('parseIntent 解析 vote', () => {
  const i = parseIntent(JSON.stringify({ kind: 'vote', question: '下午茶', options: ['奶茶', '咖啡'] }));
  assert.equal(i.kind, 'vote');
  assert.deepEqual(i.options, ['奶茶', '咖啡']);
});

test('parseIntent 解析 info 并过滤非法按钮', () => {
  const raw = JSON.stringify({
    kind: 'info',
    title: 'T',
    content: '正文',
    buttons: [{ text: 'A', url: 'https://a' }, { text: 'B' }],
  });
  const i = parseIntent(raw);
  assert.equal(i.kind, 'info');
  assert.deepEqual(i.buttons, [{ text: 'A', url: 'https://a' }]);
});

test('parseIntent 对非法输入回退 help', () => {
  assert.equal(parseIntent('not json').kind, 'help');
  assert.equal(parseIntent(JSON.stringify({ kind: 'vote', question: '', options: ['a'] })).kind, 'help');
  assert.equal(parseIntent(JSON.stringify({ kind: 'nope' })).kind, 'help');
});

test('parseIntent 解析 form 并规范字段', () => {
  const raw = JSON.stringify({
    kind: 'form',
    title: '周五团建报名',
    fields: [
      { label: '姓名', type: 'text', required: true },
      { label: '能否参加', type: 'select', required: true, options: ['能', '不能', ' '] },
      { label: '忌口', type: 'text', required: false },
    ],
  });
  const i = parseIntent(raw);
  assert.equal(i.kind, 'form');
  assert.equal(i.title, '周五团建报名');
  assert.equal(i.fields.length, 3);
  assert.deepEqual(
    i.fields.map((f) => f.name),
    ['f1', 'f2', 'f3']
  );
  assert.deepEqual(i.fields[1].options, ['能', '不能']);
});

test('parseIntent 对非法 form 回退 help', () => {
  assert.equal(parseIntent(JSON.stringify({ kind: 'form', title: '', fields: [] })).kind, 'help');
  assert.equal(
    parseIntent(
      JSON.stringify({ kind: 'form', title: 'x', fields: [{ label: 'a', type: 'select', options: ['a'] }] })
    ).kind,
    'help'
  );
});

test('parseIntent 解析 chat（只分类不带内容）', () => {
  assert.equal(parseIntent('{"kind":"chat"}').kind, 'chat');
  const withContent = parseIntent('{"kind":"chat","content":"多余内容"}');
  assert.equal(withContent.kind, 'chat');
  assert.equal(withContent.content, undefined);
});

test('SSEParser 处理半包、[DONE] 与非 JSON 行', async () => {
  const { SSEParser } = await import('../src/ai.js');
  const p = new SSEParser();
  assert.deepEqual(p.push('data: {"choices":[{"delta":{"content":"A"}}]}\n'), ['A']);
  assert.deepEqual(p.push('data: {"choices":[{"delta":{"conte'), []);
  assert.deepEqual(p.push('nt":"B"}}]}\ndata: [DONE]\n\n'), ['B']);
  assert.deepEqual(p.push(': keep-alive\ndata: not-json\n'), []);
  assert.deepEqual(p.push('data: {"choices":[{"delta":{}}]}\n'), []);
});

test('streamChat 逐段产出 SSE 增量', async () => {
  const { streamChat } = await import('../src/ai.js');
  const chunks = [
    'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
    'data: {"choices":[{"del',
    'ta":{"content":"好"}}]}\n\ndata: [DONE]\n\n',
  ];
  const body = new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
      c.close();
    },
  });
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response(body, { status: 200 });
  try {
    const out = [];
    for await (const delta of streamChat('在吗', { key: 'k' })) out.push(delta);
    assert.deepEqual(out, ['你', '好']);
  } finally {
    globalThis.fetch = orig;
  }
});

test('streamChat 缺 key 时直接报错', async () => {
  const { streamChat } = await import('../src/ai.js');
  await assert.rejects(() => streamChat('hi', {}).next(), /AI_API_KEY/);
});
