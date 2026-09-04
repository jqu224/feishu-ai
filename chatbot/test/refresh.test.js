// 提神活动回归测试：100 张图形的结构纪律、手工马赛克不被误改、
// 生成图形「浅色底 + 渐变」像素纪律、卡片渲染契约（紧凑行距 / 橙色板 / 换一张按钮）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { REFRESH_SHAPES } from '../src/data/refresh.js';
import { buildRefreshCard } from '../src/actions/refresh.js';

const HANDMADE = REFRESH_SHAPES.filter((s) => s.id.startsWith('hand-'));
const GENERATED = REFRESH_SHAPES.filter((s) => s.id.startsWith('gen-'));

// 遍历卡片 JSON，收集所有 markdown 内容与按钮节点
function walk(node, out = { markdowns: [], buttons: [] }) {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  if (node.tag === 'markdown' && typeof node.content === 'string') out.markdowns.push(node.content);
  if (node.tag === 'button') out.buttons.push(node);
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') walk(v, out);
  }
  return out;
}

test('REFRESH_SHAPES 恰好 100 个（25 手工 + 75 生成）、id 唯一、行宽一致', () => {
  assert.equal(REFRESH_SHAPES.length, 100);
  assert.equal(HANDMADE.length, 25);
  assert.equal(GENERATED.length, 75);
  const ids = new Set(REFRESH_SHAPES.map((s) => s.id));
  assert.equal(ids.size, 100, 'id 有重复');
  for (const s of REFRESH_SHAPES) {
    const widths = new Set(s.lines.map((l) => [...l].length));
    assert.equal(widths.size, 1, `${s.id} 行宽不一致`);
  }
});

test('25 张 HANDMADE 内容未被改动（首行快照抽查）', () => {
  const byId = new Map(HANDMADE.map((s) => [s.id, s]));
  assert.equal(byId.get('hand-sunrise').lines[0], '⬜⬜🟡🟡🟡⬜⬜');
  assert.equal(byId.get('hand-smiley').lines[0], '⬜🟡🟡🟡🟡🟡⬜');
  assert.equal(byId.get('hand-bike').lines[0], '⬜⬜⬜🟫🟫⬜⬜');
});

test('每张 GENERATED 图形含浅色底且颜色数 ≥2', () => {
  for (const s of GENERATED) {
    const colors = new Set([...s.lines.join('')]);
    assert.ok(colors.has('⬜'), `${s.id} 缺少 ⬜ 浅色画布`);
    assert.ok(colors.size >= 2, `${s.id} 颜色数不足 2`);
  }
});

test('buildRefreshCard：schema 2.0、橙色板、正文无段落间距、带「再换一个」按钮', () => {
  const card = buildRefreshCard();
  assert.equal(card.schema, '2.0');
  assert.equal(card.header.template, 'orange');
  const { markdowns, buttons } = walk(card);
  assert.ok(markdowns.length > 0, '卡片缺少图形正文');
  for (const m of markdowns) {
    assert.ok(!m.includes('\n\n'), `markdown 含段落间距（\\n\\n）：${m.slice(0, 40)}…`);
  }
  const again = buttons.find((b) => b.text?.content === '再换一个');
  assert.ok(again, '缺少「再换一个」按钮');
  assert.equal(again.behaviors?.[0]?.type, 'callback');
  assert.equal(again.behaviors?.[0]?.value?.a, 'refresh');
});

test('buildRefreshCard(excludeId) 不会抽到同一张', () => {
  for (let round = 0; round < 200; round++) {
    const excludeId = REFRESH_SHAPES[Math.floor(Math.random() * REFRESH_SHAPES.length)].id;
    const { buttons } = walk(buildRefreshCard(excludeId));
    const again = buttons.find((b) => b.text?.content === '再换一个');
    assert.notEqual(again.behaviors[0].value.p.x, excludeId, `第 ${round} 轮抽到了被排除的 ${excludeId}`);
  }
});
