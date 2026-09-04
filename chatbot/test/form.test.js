import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeForm,
  recordSubmission,
  summarizeForm,
  buildFormCard,
} from '../src/actions/form.js';

function sampleForm() {
  return normalizeForm({
    title: '周五团建报名',
    fields: [
      { label: '姓名', type: 'text', required: true },
      { label: '能否参加', type: 'select', required: true, options: ['能', '不能'] },
      { label: '忌口', type: 'text', required: false },
    ],
  });
}

function collectTag(elements, tag, acc = []) {
  for (const el of elements) {
    if (el.tag === tag) acc.push(el);
    if (el.tag === 'form') collectTag(el.elements, tag, acc);
    if (el.tag === 'column_set') {
      for (const col of el.columns) collectTag(col.elements, tag, acc);
    }
  }
  return acc;
}

test('normalizeForm 过滤非法字段并生成稳定 name', () => {
  const f = normalizeForm({
    title: 'x',
    fields: [
      { label: '姓名', type: 'text' },
      { label: '选择', type: 'select', options: ['a', ' ', 'b'] },
      { label: '无效', type: 'select', options: ['a'] },
    ],
  });
  assert.deepEqual(
    f.fields.map((x) => x.name),
    ['f1', 'f2']
  );
  assert.deepEqual(f.fields[1].options, ['a', 'b']);
});

test('recordSubmission 按 openId 去重更新', () => {
  let s = sampleForm();
  s = recordSubmission(s, { f1: '张三', f2: '能', f3: '无' }, 'u1');
  s = recordSubmission(s, { f1: '李四', f2: '不能', f3: '不吃辣' }, 'u2');
  s = recordSubmission(s, { f1: '张三', f2: '不能', f3: '海鲜' }, 'u1');
  assert.equal(s.submissions.length, 2);
  assert.equal(s.submissions[0].values.f2, '不能');
});

// 回归（2026-09-04）：recordSubmission 必须保留 kind / chatId 等会话元信息
test('recordSubmission 保留 kind / chatId 等会话元信息', () => {
  const s = { ...sampleForm(), kind: 'form', chatId: 'c1', messageId: 'm1' };
  const next = recordSubmission(s, { f1: '张三', f2: '能', f3: '无' }, 'u1');
  assert.equal(next.kind, 'form');
  assert.equal(next.chatId, 'c1');
  assert.equal(next.messageId, 'm1');
  assert.equal(next.submissions.length, 1);
});

test('closed 后不再记录提交', () => {
  let s = { ...sampleForm(), closed: true };
  s = recordSubmission(s, { f1: '张三', f2: '能' }, 'u1');
  assert.equal(s.submissions.length, 0);
});

test('buildFormCard 包含 form 容器与提交按钮', () => {
  const c = buildFormCard(sampleForm(), 's_test');
  assert.equal(c.schema, '2.0');
  const forms = collectTag(c.body.elements, 'form');
  assert.equal(forms.length, 1);
  assert.equal(forms[0].name, 'form_s_test');

  const inputs = collectTag(c.body.elements, 'input');
  assert.equal(inputs.length, 2);
  const selects = collectTag(c.body.elements, 'select_static');
  assert.equal(selects.length, 1);

  const submit = collectTag(c.body.elements, 'button').find((b) => b.form_action_type === 'submit');
  assert.ok(submit);
  assert.deepEqual(submit.behaviors[0].value, { a: 'form_submit', p: { sessionId: 's_test' } });
});

test('summarizeForm 输出提交数与字段', () => {
  let s = sampleForm();
  s = recordSubmission(s, { f1: '张三', f2: '能', f3: '无' }, 'u1');
  const text = summarizeForm(s);
  assert.match(text, /周五团建报名/);
  assert.match(text, /共 1 人提交/);
  assert.match(text, /张三/);
  assert.match(text, /忌口：无/);
});
