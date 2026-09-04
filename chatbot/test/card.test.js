import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRpsCard } from '../src/actions/rps.js';
import { button } from '../src/cards.js';

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') {
      for (const col of el.columns) collectButtons(col.elements, acc);
    }
  }
  return acc;
}

test('buildRpsCard 结构', () => {
  const c = buildRpsCard({ w: 1, l: 2, d: 3 });
  assert.equal(c.schema, '2.0');
  assert.equal(c.header.title.content, '石头剪刀布');
  const buttons = collectButtons(c.body.elements);
  assert.equal(buttons.length, 4);
  const labels = buttons.map((b) => b.text.content).join('');
  assert.match(labels, /石头/);
  assert.match(labels, /剪刀/);
  assert.match(labels, /布/);
  assert.match(labels, /重置/);
});

test('button 回调行为', () => {
  const b = button('奶茶', { a: 'vote', p: {} });
  assert.equal(b.tag, 'button');
  assert.equal(b.behaviors[0].type, 'callback');
  assert.deepEqual(b.behaviors[0].value, { a: 'vote', p: {} });
});

test('chart 生成 VChart 条形图组件', async () => {
  const { chart } = await import('../src/cards.js');
  const el = chart({ values: [{ name: '奶茶', value: 3 }, { name: '咖啡', value: 1 }] });
  assert.equal(el.tag, 'chart');
  assert.equal(el.chart_spec.type, 'bar');
  assert.equal(el.chart_spec.direction, 'horizontal');
  assert.deepEqual(el.chart_spec.data, [
    { id: 'data', values: [{ name: '奶茶', value: 3 }, { name: '咖啡', value: 1 }] },
  ]);
  assert.equal(el.chart_spec.xField, 'value');
  assert.equal(el.chart_spec.yField, 'name');
});

test('note 生成备注组件（schema 2.0 用 div 实现，v1 note 组件已下线）', async () => {
  const { note } = await import('../src/cards.js');
  assert.deepEqual(note('提示文案'), {
    tag: 'div',
    text: { tag: 'plain_text', content: '提示文案', text_size: 'notation', text_color: 'grey' },
  });
});
