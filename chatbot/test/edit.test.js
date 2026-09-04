import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent } from '../src/ai.js';
import { applyEditOps } from '../src/edit.js';

// —— parseIntent：edit 意图解析 ——

test('parseIntent 解析合法 edit：add_option / rename', () => {
  const intent = parseIntent(
    JSON.stringify({ kind: 'edit', ops: [{ op: 'add_option', value: '果茶' }, { op: 'rename', value: '新标题' }] })
  );
  assert.deepEqual(intent, {
    kind: 'edit',
    ops: [
      { op: 'add_option', value: '果茶' },
      { op: 'rename', value: '新标题' },
    ],
  });
});

test('parseIntent 解析 add_field（select 带 options）与 remove_field', () => {
  const intent = parseIntent(
    JSON.stringify({
      kind: 'edit',
      ops: [
        { op: 'add_field', label: '尺码', type: 'select', options: ['S', 'M', 'L'] },
        { op: 'remove_field', label: '忌口' },
      ],
    })
  );
  assert.equal(intent.kind, 'edit');
  assert.deepEqual(intent.ops[0], { op: 'add_field', label: '尺码', type: 'select', options: ['S', 'M', 'L'] });
  assert.deepEqual(intent.ops[1], { op: 'remove_field', label: '忌口' });
});

test('parseIntent：edit 空 ops 或非法 op 回退 help', () => {
  assert.equal(parseIntent(JSON.stringify({ kind: 'edit', ops: [] })).kind, 'help');
  assert.equal(parseIntent(JSON.stringify({ kind: 'edit', ops: [{ op: 'hack', value: 'x' }] })).kind, 'help');
  assert.equal(parseIntent(JSON.stringify({ kind: 'edit' })).kind, 'help');
});

test('parseIntent：add_option 缺 value、select 少于 2 个选项被过滤', () => {
  assert.equal(
    parseIntent(JSON.stringify({ kind: 'edit', ops: [{ op: 'add_option', value: '  ' }] })).kind,
    'help'
  );
  assert.equal(
    parseIntent(
      JSON.stringify({ kind: 'edit', ops: [{ op: 'add_field', label: '尺码', type: 'select', options: ['S'] }] })
    ).kind,
    'help'
  );
});

// —— applyEditOps：投票 ——

const voteSession = () => ({
  kind: 'vote',
  q: '下午茶喝什么',
  options: ['奶茶', '咖啡'],
  tally: { 奶茶: 2 },
  closed: false,
  votes: 2,
});

test('投票 add_option：正常追加，重复与超上限被拒绝', () => {
  const { next, applied, rejected } = applyEditOps(voteSession(), [
    { op: 'add_option', value: '果茶' },
    { op: 'add_option', value: '奶茶' },
  ]);
  assert.deepEqual(next.options, ['奶茶', '咖啡', '果茶']);
  assert.deepEqual(applied, ['加选项「果茶」']);
  assert.equal(rejected.length, 1);
});

test('投票 remove_option：删除并清 tally，只剩 2 个时拒绝', () => {
  const three = { ...voteSession(), options: ['奶茶', '咖啡', '果茶'] };
  const r1 = applyEditOps(three, [{ op: 'remove_option', value: '奶茶' }]);
  assert.deepEqual(r1.next.options, ['咖啡', '果茶']);
  assert.deepEqual(r1.next.tally, {});

  const r2 = applyEditOps(voteSession(), [{ op: 'remove_option', value: '奶茶' }]);
  assert.deepEqual(r2.next.options, ['奶茶', '咖啡']);
  assert.equal(r2.applied.length, 0);
  assert.equal(r2.rejected.length, 1);
});

test('投票 rename 与表单专属 op 的拒绝', () => {
  const { next, applied, rejected } = applyEditOps(voteSession(), [
    { op: 'rename', value: '今天喝啥' },
    { op: 'add_field', label: '部门', type: 'text', options: [] },
  ]);
  assert.equal(next.q, '今天喝啥');
  assert.equal(applied.length, 1);
  assert.equal(rejected.length, 1);
});

// —— applyEditOps：报名表 ——

const formSession = () => ({
  kind: 'form',
  title: '团建报名',
  fields: [
    { name: 'f1', label: '姓名', type: 'text', required: true, options: [] },
    { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['能', '不能'] },
  ],
  submissions: [],
  closed: false,
});

test('报名表 add_field：name 续号不重名，重复 label 拒绝', () => {
  const { next, applied, rejected } = applyEditOps(formSession(), [
    { op: 'add_field', label: '忌口', type: 'text', options: [] },
    { op: 'add_field', label: '姓名', type: 'text', options: [] },
  ]);
  assert.equal(next.fields.length, 3);
  assert.equal(next.fields[2].name, 'f3');
  assert.equal(next.fields[2].label, '忌口');
  assert.equal(next.fields[2].required, false);
  assert.equal(applied.length, 1);
  assert.equal(rejected.length, 1);
});

test('报名表 remove_field：剩 1 个时拒绝；rename 改标题', () => {
  const r1 = applyEditOps(formSession(), [{ op: 'remove_field', label: '姓名' }]);
  assert.deepEqual(r1.next.fields.map((f) => f.label), ['能否参加']);

  const one = { ...formSession(), fields: formSession().fields.slice(0, 1) };
  const r2 = applyEditOps(one, [{ op: 'remove_field', label: '姓名' }]);
  assert.equal(r2.next.fields.length, 1);
  assert.equal(r2.rejected.length, 1);

  const r3 = applyEditOps(formSession(), [{ op: 'rename', value: '周五羽毛球局' }]);
  assert.equal(r3.next.title, '周五羽毛球局');
});

test('applyEditOps 不改动原会话对象', () => {
  const s = voteSession();
  applyEditOps(s, [{ op: 'add_option', value: '果茶' }]);
  assert.deepEqual(s.options, ['奶茶', '咖啡']);
});
