// 表格导出：CSV 生成 + 云空间导入/群文件发送流程（注入 fake client，不打真实 API）
import test from 'node:test';
import assert from 'node:assert/strict';
import { voteCsv, formCsv, exportSheetDoc, sendCsvFile } from '../src/feishu-docs.js';

function makeFakeClient({ getResult } = {}) {
  const calls = [];
  return {
    calls,
    // 未配置 FEISHU_FOLDER_TOKEN 时，实现会通过通用 request 取根目录 token
    request: async ({ method, url }) => {
      calls.push(['rootFolder', method, url]);
      return { data: { token: 'root_tok' } };
    },
    drive: {
      v1: {
        media: {
          // 实现传「普通对象 + Buffer」（SDK 走 axios，spec FormData 会被序列化成空 body）
          uploadAll: async ({ data }) => {
            calls.push(['upload', data.file_name, data.parent_type, data.size, data.extra]);
            return { data: { file_token: 'ftok' } };
          },
        },
        importTask: {
          create: async ({ data }) => {
            calls.push(['import', data]);
            return { data: { ticket: 'tk1' } };
          },
          get: async ({ path }) => {
            calls.push(['poll', path.ticket]);
            return { data: { result: getResult } };
          },
        },
        permissionPublic: {
          patch: async (args) => {
            calls.push(['perm', args.path.token, args.params?.type]);
            return {};
          },
        },
      },
    },
  };
}

test('voteCsv 生成统计表与结论', () => {
  const csv = voteCsv({
    q: '下午茶',
    options: ['奶茶', '咖啡'],
    tally: { 奶茶: 3, 咖啡: 1 },
    closed: true,
    votes: 4,
  });
  assert.ok(csv.startsWith('\uFEFF'), '应带 BOM，Excel 打开中文不乱码');
  assert.match(csv, /投票结果,下午茶/);
  assert.match(csv, /总票数,4/);
  assert.match(csv, /选项,票数,占比/);
  assert.match(csv, /奶茶,3,75%/);
  assert.match(csv, /咖啡,1,25%/);
  assert.match(csv, /结论,领先选项：奶茶/);
});

test('voteCsv 无人投票时给空态结论', () => {
  const csv = voteCsv({ q: 'x', options: ['a', 'b'], tally: {}, closed: true });
  assert.match(csv, /暂无人投票/);
});

test('voteCsv 单元格转义：逗号与引号', () => {
  const csv = voteCsv({ q: '选"哪个"', options: ['a,b', 'c'], tally: { 'a,b': 1, c: 0 }, closed: true, votes: 1 });
  assert.match(csv, /"a,b",1,100%/);
  assert.match(csv, /选""哪个""/);
});

test('formCsv 空提交与明细表', () => {
  const empty = formCsv({
    title: '报名',
    fields: [{ name: 'f1', label: '姓名', type: 'text' }],
    submissions: [],
  });
  assert.match(empty, /报名汇总,报名/);
  assert.match(empty, /暂无提交记录/);

  const csv = formCsv({
    title: '团建',
    fields: [
      { name: 'f1', label: '姓名', type: 'text' },
      { name: 'f2', label: '能否参加', type: 'select', options: ['能', '不能'] },
    ],
    submissions: [
      { openId: 'u1', values: { f1: '张三', f2: '能' }, at: 0 },
      { openId: 'u2', values: { f1: '李,四', f2: '' }, at: 0 },
    ],
  });
  assert.match(csv, /已提交,2 份/);
  assert.match(csv, /#,姓名,能否参加,提交时间/);
  assert.match(csv, /1,张三,能,/);
  // 逗号转义与未填空值
  assert.match(csv, /2,"李,四",,/);
});

test('exportSheetDoc 全流程：上传 -> 导入 -> 轮询 -> 设权限', async () => {
  const client = makeFakeClient({ getResult: { job_status: 1, ticket_status: 0, token: 'sheettok', url: 'https://x/sheet', type: 'sheet' } });
  const doc = await exportSheetDoc(client, '\uFEFFa,b\r\n1,2\r\n', { fileName: 'a.csv', pollIntervalMs: 1 });
  assert.deepEqual(doc, { token: 'sheettok', url: 'https://x/sheet', type: 'sheet' });
  assert.deepEqual(
    client.calls.map((c) => c[0]),
    ['upload', 'rootFolder', 'import', 'poll', 'perm']
  );
  const [name, parentType, size, extra] = client.calls[0].slice(1);
  assert.equal(name, 'a.csv');
  assert.equal(parentType, 'ccm_import_open');
  assert.equal(size, String(Buffer.byteLength('\uFEFFa,b\r\n1,2\r\n', 'utf8')));
  assert.deepEqual(JSON.parse(extra), { obj_type: 'sheet', file_extension: 'csv' });
  const importBody = client.calls[2][1];
  assert.equal(importBody.file_extension, 'csv');
  assert.equal(importBody.file_token, 'ftok');
  assert.equal(importBody.type, 'sheet');
  assert.deepEqual(importBody.point, { mount_type: 1, mount_key: 'root_tok' });
  assert.equal(client.calls[4][1], 'sheettok');
  assert.equal(client.calls[4][2], 'sheet');
});

test('exportSheetDoc 导入失败与超时', async () => {
  const fail = makeFakeClient({ getResult: { job_status: 2 } });
  await assert.rejects(() => exportSheetDoc(fail, 'x', { fileName: 'a.csv' }), /导入任务失败/);
  const hang = makeFakeClient({ getResult: { job_status: 0 } });
  await assert.rejects(
    () => exportSheetDoc(hang, 'x', { fileName: 'a.csv', pollTimeoutMs: 5, pollIntervalMs: 1 }),
    /导入超时/
  );
});

test('exportSheetDoc 参数校验', async () => {
  await assert.rejects(() => exportSheetDoc(null, 'x'), /Client/);
  await assert.rejects(() => exportSheetDoc({ im: {} }, 'x'), /Client/);
});

test('sendCsvFile 上传文件并发送 file 消息', async () => {
  const calls = [];
  const client = {
    im: {
      v1: {
        file: {
          create: async ({ data }) => {
            calls.push(['upload', data.file_name, data.file_type, Buffer.isBuffer(data.file)]);
            return { data: { file_key: 'fk1' } };
          },
        },
        message: {
          create: async ({ params, data }) => {
            calls.push(['send', params.receive_id_type, data.receive_id, data.msg_type, JSON.parse(data.content).file_key]);
            return {};
          },
        },
      },
    },
  };
  const r = await sendCsvFile(client, 'c1', '\uFEFFa,b', { fileName: 'a.csv' });
  assert.deepEqual(r, { fileKey: 'fk1', fileName: 'a.csv' });
  assert.deepEqual(calls, [
    ['upload', 'a.csv', 'stream', true],
    ['send', 'chat_id', 'c1', 'file', 'fk1'],
  ]);
});

test('sendCsvFile 参数校验', async () => {
  await assert.rejects(() => sendCsvFile(null, 'c1', 'x'), /Client/);
  await assert.rejects(() => sendCsvFile({ im: {} }, '', 'x'), /chatId/);
});
