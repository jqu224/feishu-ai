// 解压模块回归测试：6 个练习的内容结构、步骤流推进契约、完成卡庆祝、
// 配色与图标纪律（turquoise + wind）、回调接线（calm_home / calm）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { CALM_EXERCISES, getCalmExercise } from '../src/data/calm.js';
import { buildCalmHomeCard, buildCalmStepCard, startCalmTicker, stopCalmTicker } from '../src/actions/calm.js';
import { handleAction } from '../src/registry.js';

function walk(node, out = { markdowns: [], buttons: [], texts: [] }) {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  if (node.tag === 'markdown' && typeof node.content === 'string') out.markdowns.push(node.content);
  if (node.tag === 'button') out.buttons.push(node);
  if (typeof node.content === 'string') out.texts.push(node.content);
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') walk(v, out);
  }
  return out;
}

const noopChannel = { send: async () => ({}), updateCard: async () => ({}) };
const evt = (value) => ({ chatId: 'c1', messageId: 'm1', action: { value } });

test('恰好 6 个练习、id 唯一、覆盖呼吸/着陆/冥想三大类', () => {
  assert.equal(CALM_EXERCISES.length, 6);
  const ids = new Set(CALM_EXERCISES.map((e) => e.id));
  assert.equal(ids.size, 6);
  for (const required of ['box', 'b478', 'ground', 'mindful', 'scan', 'muscle']) {
    assert.ok(ids.has(required), `缺少练习 ${required}`);
  }
});

test('步骤数符合内容设计：box 17（1 引导 + 4 轮 × 4 段）、b478 13、54321 16（1 + 5+4+3+2+1）', () => {
  assert.equal(getCalmExercise('box').steps.length, 17);
  assert.equal(getCalmExercise('b478').steps.length, 13);
  assert.equal(getCalmExercise('ground').steps.length, 16);
  for (const id of ['mindful', 'scan', 'muscle']) {
    assert.ok(getCalmExercise(id).steps.length >= 5, `${id} 步骤太少`);
  }
});

test('详情页 2×3 田字格：3 行 columnSet、每行 2 列、按钮为 primary 且指进步骤 0', () => {
  const card = buildCalmHomeCard();
  assert.equal(card.header.template, 'turquoise');
  const rows = card.body.elements.filter(
    (e) =>
      e.tag === 'column_set' &&
      e.columns?.length === 2 &&
      e.columns[0].elements?.[0]?.tag === 'button' &&
      e.columns[0].elements[0].behaviors?.[0]?.value?.a === 'calm'
  );
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.columns.length, 2);
    for (const col of row.columns) {
      const btn = col.elements[0];
      assert.equal(btn.type, 'primary');
      assert.equal(btn.width, 'fill');
      assert.equal(btn.behaviors[0].value.a, 'calm');
      assert.equal(btn.behaviors[0].value.p.s, 0);
      // 单元格 = 按钮 + notation 说明（SPIRIT 四.5）
      const desc = col.elements[1];
      assert.equal(desc?.text?.text_size, 'notation');
    }
  }
});

test('手动步骤卡有推进按钮指向下一步；timed 步骤卡只有「停止」且渲染倒计时大数字', () => {
  const box = getCalmExercise('box');
  for (let s = 0; s < box.steps.length; s++) {
    const card = buildCalmStepCard('box', s);
    assert.equal(card.header.template, 'turquoise');
    assert.equal(card.header.text_tag_list[0].text.content, `第 ${s + 1} / ${box.steps.length} 步`);
    const { buttons, markdowns } = walk(card);
    if (box.steps[s].secs != null) {
      const stop = buttons.find((b) => b.behaviors?.[0]?.value?.a === 'calm_stop');
      assert.ok(stop, `第 ${s} 步（timed）缺「停止」按钮`);
      assert.ok(
        !buttons.some((b) => b.behaviors?.[0]?.value?.a === 'calm'),
        `第 ${s} 步（timed）不该有推进按钮`
      );
      assert.match(markdowns.join('\n'), new RegExp(`# ${box.steps[s].secs}`), 'timed 步骤应渲染满秒倒计时');
    } else {
      const next = buttons.find((b) => b.behaviors?.[0]?.value?.a === 'calm');
      assert.ok(next, `第 ${s} 步缺推进按钮`);
      assert.equal(next.behaviors[0].value.p.s, s + 1);
    }
  }
});

test('呼吸步骤卡带呼吸条与轮次；54321 步骤卡带进度圆点', () => {
  const boxPhase = walk(buildCalmStepCard('box', 1)).markdowns.join('\n');
  assert.match(boxPhase, /吸气|屏息|呼气/);
  assert.match(boxPhase, /第 1 \/ 4 轮/);
  assert.match(boxPhase, /[▁▃▅▇█]/);
  assert.match(boxPhase, /# 4/); // 倒计时大数字
  const groundStep = walk(buildCalmStepCard('ground', 3)).markdowns.join('\n');
  assert.match(groundStep, /[●○]/);
  assert.match(groundStep, /已找到 \d \/ 5/);
});

test('s 越界落完成卡：庆祝 ASCII + 再做一次 / 换个练习', () => {
  const card = buildCalmStepCard('box', 17);
  const raw = JSON.stringify(card);
  assert.ok(raw.includes('* ˘ *'), '完成卡应有 sparkle 庆祝 ASCII');
  const { buttons } = walk(card);
  assert.ok(buttons.find((b) => b.text?.content === '再做一次'), '缺「再做一次」');
  const another = buttons.find((b) => b.text?.content === '换个练习');
  assert.equal(another?.behaviors?.[0]?.value?.a, 'calm_home');
});

test('未知练习 id 回落到解压主页', () => {
  const card = buildCalmStepCard('nope', 0);
  assert.equal(card.header.title.content, '解压');
});

test('回调接线：calm_home 与 calm 都能原地换卡', async () => {
  const home = await handleAction(noopChannel, evt({ a: 'calm_home', p: {} }));
  assert.equal(home?.header?.title?.content, '解压');
  const step = await handleAction(noopChannel, evt({ a: 'calm', p: { id: 'ground', s: 2 } }));
  assert.match(step?.header?.title?.content ?? '', /54321 着陆/);
  assert.equal(step?.header?.text_tag_list?.[0]?.text?.content, '第 3 / 16 步');
});

test('解压全部文本零 emoji（呼吸条/圆点是几何字符，不是 emoji）', () => {
  const EMOJI_RE = /\p{Extended_Pictographic}/u;
  for (const e of CALM_EXERCISES) {
    for (let s = 0; s <= e.steps.length; s++) {
      const { texts } = walk(buildCalmStepCard(e.id, s));
      for (const t of texts) {
        assert.ok(!EMOJI_RE.test(t), `${e.id} 第 ${s} 步含 emoji：${t}`);
      }
    }
  }
});

// ---------- 节拍器：timed 步骤自动倒计时 ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 全量跑测试时事件循环拥挤，固定 sleep 不可靠；轮询等条件达成
async function waitFor(cond, timeoutMs = 3000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > timeoutMs) throw new Error('waitFor 超时');
    await sleep(10);
  }
}

function fakeChannel() {
  const updates = [];
  return {
    updates,
    updateCard: async (messageId, cardJson) => {
      updates.push(cardJson);
      return {};
    },
  };
}

test('节拍器自动推倒计时：每秒一推，段尽自动进下一段，全程结束落完成卡', async () => {
  const ch = fakeChannel();
  // box 从第 1 步（第一个吸气段）开始：16 个 timed 段 × 4 秒，tickMs=2ms 加速
  startCalmTicker(ch, 'm-tick', 'box', 1, 2);
  await waitFor(() => ch.updates.at(-1)?.header?.subtitle?.content === '练习完成');
  stopCalmTicker('m-tick');
  assert.ok(ch.updates.length >= 60, `推卡次数异常：${ch.updates.length}`);
  // 第一推是倒计时 3（ACK 卡已展示满秒 4）
  assert.match(JSON.stringify(ch.updates[0]), /# 3/);
  // 最后一推是完成卡
  const last = ch.updates.at(-1);
  assert.ok(JSON.stringify(last).includes('* ˘ *'), '最后一推应是带庆祝的完成卡');
  // 完成后不再推
  const n = ch.updates.length;
  await sleep(30);
  assert.equal(ch.updates.length, n, '完成后节拍器应已停止');
});

test('节拍器在 timed → 手动段切换后自动停止（握拳放松尾段）', async () => {
  const ch = fakeChannel();
  // muscle：第 1-6 步 timed（5+10+5+10+5+10 秒），第 7 步是手动收尾
  startCalmTicker(ch, 'm-muscle', 'muscle', 1, 2);
  await waitFor(() => JSON.stringify(ch.updates.at(-1) ?? '').includes('深呼吸一次'));
  stopCalmTicker('m-muscle');
  const n = ch.updates.length;
  await sleep(30);
  assert.equal(ch.updates.length, n, '进入手动段后节拍器应停止');
});

test('stopCalmTicker 立即停推（用户点「停止」）', async () => {
  const ch = fakeChannel();
  startCalmTicker(ch, 'm-stop', 'box', 1, 2);
  await sleep(15);
  stopCalmTicker('m-stop');
  const n = ch.updates.length;
  assert.ok(n > 0 && n < 10, `停止前应只推了少量几次，实际 ${n}`);
  await sleep(20);
  assert.equal(ch.updates.length, n, '停止后不应再有推卡');
});
