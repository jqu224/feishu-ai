import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBallCard } from '../src/actions/ball.js';
import {
  generateBall, transformBall, rotateGridCW, zoomGrid,
  ZOOM_K, ZOOM_LABEL, ZOOM_MIN, ZOOM_MAX,
} from '../src/data/ball.js';

const N = 13;

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') for (const col of el.columns) collectButtons(col.elements, acc);
  }
  return acc;
}

test('生成器：seed 0 固定疗愈球，任意 seed 行宽一致', () => {
  assert.equal(generateBall(0).mode.id, 'heal');
  for (const s of [0, 1, 2, 3, 42, 999]) {
    const { lines } = generateBall(s);
    assert.equal(lines.length, N);
    for (const l of lines) assert.equal([...l].length, N, `seed ${s} 行宽应为 ${N}`);
  }
});

test('旋转：顺时针 4 次回到原图，非对称图案落点正确', () => {
  const g = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => (y === 0 && x === 0 ? '🟥' : '⚪')));
  const once = rotateGridCW(g);
  assert.equal(once[0][N - 1], '🟥', '左上角顺时针 90° 应到右上角');
  let g4 = g;
  for (let i = 0; i < 4; i++) g4 = rotateGridCW(g4);
  assert.deepEqual(g4, g, '旋转 4 次应等于原图');
});

test('缩放：k=1 恒等；放大取中心区铺满；缩小收进中心且四周留白', () => {
  const full = Array.from({ length: N }, () => Array.from({ length: N }, () => '🟦'));
  assert.deepEqual(zoomGrid(full, 1), full);
  // 放大 ×2：全蓝图中心放一个红点，放大后红点应扩散成中心区域
  const dot = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => (x === 6 && y === 6 ? '🟥' : '⚪')));
  const zoomed = zoomGrid(dot, ZOOM_K[1]); // ×2
  assert.equal(zoomed[6][6], '🟥', '中心点放大后仍在中心');
  assert.equal([...zoomed.map((r) => r.join(''))[0]].every((c) => c === '⚪'), true, '边缘不受中心缩放影响');
  // 缩小 ÷2：全蓝图缩小后四角应留白
  const shrunk = zoomGrid(full, ZOOM_K[-1]);
  assert.equal(shrunk[0][0], '⚪', '缩小后四角留白');
  assert.equal(shrunk[6][6], '🟦', '缩小后中心仍有图案');
  for (const row of shrunk) assert.equal(row.length, N);
});

test('transformBall：旋转取模 4、缩放钳制在档位内', () => {
  const base = transformBall(7, 0, 0);
  assert.deepEqual(transformBall(7, 4, 0).lines, base.lines, 'r=4 应等价 r=0');
  assert.equal(transformBall(7, 0, 99).zoom, ZOOM_MAX);
  assert.equal(transformBall(7, 0, -99).zoom, ZOOM_MIN);
  assert.equal(transformBall(7).rot, 0);
  assert.equal(transformBall(7).zoom, 0);
  for (const [r, z] of [[1, 1], [3, -2], [2, 2]]) {
    const { lines } = transformBall(7, r, z);
    for (const l of lines) assert.equal([...l].length, N, `r=${r} z=${z} 行宽应一致`);
  }
});

test('操作行：变/转/放大/缩小 4 枚按钮单行横排（flex none）', () => {
  const c = buildBallCard(3, 1, 1);
  const row = c.body.elements.find((el) => el.tag === 'column_set' && el.columns.length === 4);
  assert.ok(row, '应有 4 列操作行');
  assert.equal(row.flex_mode, 'none', '操作行强制单行');
  const btns = row.columns.map((col) => col.elements[0]);
  assert.deepEqual(btns.map((b) => b.text.content), ['变！', '转', '放大', '缩小']);
  for (const b of btns) {
    assert.equal(b.behaviors[0].value.a, 'ball');
    assert.equal(b.width, 'fill');
  }
  // 「变」换图且不带 r/z（复位视角）；其余保留当前视角
  assert.deepEqual(btns[0].behaviors[0].value.p, { f: 4 });
  assert.deepEqual(btns[1].behaviors[0].value.p, { f: 3, r: 2, z: 1 });
  assert.deepEqual(btns[2].behaviors[0].value.p, { f: 3, r: 1, z: 2 });
  assert.deepEqual(btns[3].behaviors[0].value.p, { f: 3, r: 1, z: 0 });
});

test('终端状态行：--rot/--zoom 标志与缩放档位表随状态出现', () => {
  const plain = JSON.stringify(buildBallCard(3).body.elements);
  assert.ok(!plain.includes('--rot'), '默认状态不带 --rot');
  assert.ok(!plain.includes('--zoom'), '默认状态不带 --zoom');
  const moved = JSON.stringify(buildBallCard(3, 1, 2).body.elements);
  assert.ok(moved.includes('--rot 90'), '旋转后命令行带 --rot 90');
  assert.ok(moved.includes(`--zoom ${ZOOM_LABEL[2]}`), '缩放后命令行带 --zoom ×3');
  assert.ok(moved.includes('█'), '满档缩放应显示 █ 档位');
});

test('导航与卡片骨架不受操作行影响', () => {
  const c = buildBallCard(0);
  assert.equal(c.schema, '2.0');
  assert.equal(c.header.template, 'grey');
  assert.ok(collectButtons(c.body.elements).some((b) => b.behaviors?.[0]?.value?.a === 'nav_home'));
});
