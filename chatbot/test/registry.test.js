import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAction } from '../src/registry.js';
import { newSession, getSession, resetSessions } from '../src/store.js';

function makeChannel() {
  const updates = [];
  const sends = [];
  return {
    updates,
    sends,
    channel: {
      updateCard: async (messageId, card) => updates.push({ messageId, card }),
      send: async (chatId, input, opts) => sends.push({ chatId, input, opts }),
    },
  };
}

test('vote 使用 store 连续点击正确累加并返回新卡片', async () => {
  resetSessions();
  const s = newSession({ kind: 'vote', q: '下午茶', options: ['奶茶', '咖啡'], tally: {}, closed: false, votes: 0 });
  const { channel } = makeChannel();
  const evt = (choice) => ({
    messageId: 'm1',
    chatId: 'c1',
    action: { value: { a: 'vote', p: { sessionId: s.id, choice } } },
    operator: { openId: 'u1' },
  });
  const card1 = await handleAction(channel, evt('奶茶'));
  const card2 = await handleAction(channel, evt('咖啡'));
  const state = getSession(s.id);
  assert.equal(state.tally['奶茶'], 1);
  assert.equal(state.tally['咖啡'], 1);
  assert.equal(state.votes, 2);
  assert.equal(card1.schema, '2.0');
  assert.equal(card2.schema, '2.0');
  // 「已投 N 票」已按设计规范移入 header text_tag_list（状态进 header，body 不重复元信息）
  assert.ok(
    (card2.header.text_tag_list || []).some((t) => t.tag === 'text_tag' && t.text.content.includes('已投 2 票')),
    'header tags 应包含「已投 2 票」'
  );
  resetSessions();
});

test('form_submit 读 form_value 并按 openId 去重', async () => {
  resetSessions();
  const s = newSession({
    kind: 'form',
    title: '报名',
    fields: [
      { name: 'f1', label: '姓名', type: 'text', required: true },
      { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['能', '不能'] },
    ],
    submissions: [],
    closed: false,
  });
  const { channel } = makeChannel();
  const evt = (openId, formValue) => ({
    messageId: 'm1',
    chatId: 'c1',
    action: { value: { a: 'form_submit', p: { sessionId: s.id } }, form_value: formValue },
    operator: { openId },
  });
  await handleAction(channel, evt('u1', { f1: '张三', f2: '能' }));
  await handleAction(channel, evt('u2', { f1: '李四', f2: '不能' }));
  const returned = await handleAction(channel, evt('u1', { f1: '张三', f2: '不能' }));
  const state = getSession(s.id);
  assert.equal(state.submissions.length, 2);
  assert.equal(state.submissions[0].values.f2, '不能');
  assert.ok(returned.body.elements.some((el) => el.tag === 'markdown' && el.content.includes('已提交 2 份')));
  resetSessions();
});

test('form 结束汇总经过确认后发文本并关闭', async () => {
  resetSessions();
  const s = newSession({
    kind: 'form',
    title: '报名',
    fields: [{ name: 'f1', label: '姓名', type: 'text', required: true }],
    submissions: [],
    closed: false,
  });
  const { channel, sends } = makeChannel();
  await handleAction(
    channel,
    { messageId: 'm1', chatId: 'c1', action: { value: { a: 'form_submit', p: { sessionId: s.id } }, form_value: { f1: '张三' } }, operator: { openId: 'u1' } }
  );
  const closedCard = await handleAction(
    channel,
    { messageId: 'm1', chatId: 'c1', action: { value: { a: 'confirm_exec', p: { kind: 'publish_form', sessionId: s.id } } }, operator: { openId: 'u1' } }
  );
  assert.equal(getSession(s.id).closed, true);
  assert.equal(sends.length, 1);
  assert.match(sends[0].input.text, /共 1 人提交/);
  assert.match(sends[0].input.text, /张三/);
  assert.ok(
    closedCard.body.elements.some(
      (el) =>
        (el.tag === 'markdown' && el.content.includes('已结束并汇总')) ||
        (el.tag === 'div' && el.text?.content?.includes('已结束并汇总'))
    ),
    '关闭后的卡片应包含「已结束并汇总」提示'
  );
  resetSessions();
});

test('未知 value 返回 undefined 不抛错', async () => {
  const { channel } = makeChannel();
  const result = await handleAction(channel, {
    messageId: 'm1',
    chatId: 'c1',
    action: { value: 'garbage' },
    operator: { openId: 'u1' },
  });
  assert.equal(result, undefined);
});

test('export 经确认闸门后后台导出并发链接卡', async () => {
  resetSessions();
  const s = newSession({
    kind: 'vote',
    q: '下午茶',
    options: ['奶茶', '咖啡'],
    tally: { 奶茶: 2, 咖啡: 1 },
    closed: true,
    votes: 3,
  });
  const { channel, sends } = makeChannel();
  // rawClient 只注入 fake im、不含 drive：在线表格导入会被跳过，直接降级为 CSV 群文件
  const imCalls = [];
  channel.rawClient = {
    im: {
      v1: {
        file: {
          create: async ({ data }) => {
            imCalls.push(['file.create', data.file_name, data.file_type, Buffer.isBuffer(data.file)]);
            return { data: { file_key: 'fk1' } };
          },
        },
        message: {
          create: async ({ params, data }) => {
            imCalls.push(['message.create', params.receive_id_type, data.receive_id, data.msg_type, JSON.parse(data.content).file_key]);
            return {};
          },
        },
      },
    },
  };
  const evt = (p) => ({
    messageId: 'm1',
    chatId: 'c1',
    action: { value: { a: p.a, p: p.p } },
    operator: { openId: 'u1' },
  });

  const confirmResult = await handleAction(channel, evt({ a: 'export', p: { kind: 'export_vote', sessionId: s.id } }));
  assert.equal(confirmResult.header.title.content, '需要你确认');
  assert.match(JSON.stringify(confirmResult), /确认把「下午茶」的投票结果导出为表格/);

  const exporting = await handleAction(channel, evt({ a: 'confirm_exec', p: { kind: 'export_vote', sessionId: s.id } }));
  assert.equal(exporting.header.title.content, '正在导出表格');

  // 后台导出完成：先发 im 文件消息，再发完成说明卡（不占用回调 ACK）
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(
    imCalls.map((c) => c[0]),
    ['file.create', 'message.create'],
    '应先上传文件再发文件消息'
  );
  assert.equal(imCalls[0][1], '下午茶-汇总.csv');
  assert.equal(imCalls[0][2], 'stream');
  assert.equal(imCalls[0][3], true, '文件内容应为 Buffer');
  assert.deepEqual(imCalls[1].slice(1), ['chat_id', 'c1', 'file', 'fk1']);
  assert.equal(sends.length, 1, '应发送一条导出完成消息');
  const sent = sends[0].input.card;
  assert.equal(sent.header.title.content, '已导出汇总表格');
  assert.ok(JSON.stringify(sent).includes('下午茶-汇总.csv'), '完成卡应带文件名');
  resetSessions();
});

test('session 丢失（进程重启后点旧卡）返回过期提示卡而不是静默无反应', async () => {
  resetSessions();
  const { channel, sends } = makeChannel();
  const evt = (value) => ({
    messageId: 'm1',
    chatId: 'c1',
    action: { value },
    operator: { openId: 'u1' },
  });
  const cases = [
    { a: 'vote', p: { sessionId: 's_missing', choice: '奶茶' } },
    { a: 'form_submit', p: { sessionId: 's_missing' } },
    { a: 'form_close', p: { sessionId: 's_missing' } },
    { a: 'export', p: { kind: 'export_vote', sessionId: 's_missing' } },
    { a: 'export', p: { kind: 'export_form', sessionId: 's_missing' } },
    { a: 'confirm_exec', p: { kind: 'publish_form', sessionId: 's_missing' } },
    { a: 'confirm_exec', p: { kind: 'publish_vote', sessionId: 's_missing' } },
    { a: 'confirm_cancel', p: { kind: 'publish_form', sessionId: 's_missing' } },
  ];
  for (const value of cases) {
    const result = await handleAction(channel, evt(value));
    assert.equal(result?.header?.title?.content, '这张卡片已过期', `${value.a} 应返回过期提示卡`);
  }
  assert.equal(sends.length, 0, '过期提示走 ACK 换卡，不应另发消息');
  resetSessions();
});
