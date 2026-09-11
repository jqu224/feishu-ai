// 解压：文字互动练习。交互分两种（数据层 src/data/calm.js 注释有完整说明）：
// - timed 步骤：服务器节拍器每秒 updateCard 推倒计时，自动切下一段（呼吸/握拳放松），
//   进行中的卡片只有「停止」——用户 2026-09 明确：呼吸不该靠手动点。
// - 手动步骤：点按钮走一步（54321 / 正念数息 / 身体扫描）。
import { card, markdown, button, columnSet, textLine, withNav, celebration } from '../cards.js';
import { CALM_EXERCISES, getCalmExercise } from '../data/calm.js';

// 详情页：2×3 田字格入口列表（SPIRIT.md 第四节第 5 条：
// 单元格 = 一个 primary 按钮 + 按钮下方一行 notation/grey 说明，两个单元格一行）
export function buildCalmHomeCard() {
  const rows = [];
  for (let i = 0; i < CALM_EXERCISES.length; i += 2) {
    rows.push(
      columnSet(
        CALM_EXERCISES.slice(i, i + 2).map((e) => [
          button(e.name, { a: 'calm', p: { id: e.id, s: 0 } }, 'primary', { width: 'fill' }),
          textLine(e.desc, { size: 'notation', color: 'grey' }),
        ])
      )
    );
  }
  return card({
    template: 'turquoise',
    icon: 'wind',
    iconColor: 'turquoise',
    title: '解压',
    subtitle: '6 个跟着做就好的练习',
    tags: [{ text: '呼吸 · 着陆 · 冥想', color: 'turquoise' }],
    elements: withNav([
      textLine('呼吸练习点一次「开始」就自动倒计时；着陆与冥想按自己的节奏点下一步。', {
        size: 'notation',
        color: 'grey',
      }),
      ...rows,
    ]),
  });
}

// 完成卡：SPIRIT.md 第七节——结局原地重写 + 庆祝 ASCII（sparkle，安静气质）+ 正能量反馈
function doneCard(ex) {
  return card({
    template: 'turquoise',
    icon: 'wind',
    iconColor: 'turquoise',
    title: `解压 · ${ex.name}`,
    subtitle: '练习完成',
    tags: [{ text: '完成', color: 'turquoise' }],
    elements: withNav([
      celebration('sparkle'),
      textLine(ex.done, { align: 'center' }),
      columnSet([
        button('再做一次', { a: 'calm', p: { id: ex.id, s: 0 } }, 'primary', { icon: 'reset', width: 'fill' }),
        button('换个练习', { a: 'calm_home', p: {} }, 'default', { icon: 'list', width: 'fill' }),
      ]),
    ]),
  });
}

// 步骤卡：s 越界（含完成态 s === steps.length）都有确定落点。
// left：timed 步骤当前剩余秒数（节拍器每秒重渲染时传入；缺省 = 满秒数，即刚进入该段）。
export function buildCalmStepCard(id, s = 0, left) {
  const ex = getCalmExercise(id);
  if (!ex) return buildCalmHomeCard();
  const total = ex.steps.length;
  const i = Math.max(0, Math.floor(s) || 0);
  if (i >= total) return doneCard(ex);
  const step = ex.steps[i];
  const timed = step.secs != null;
  const content = typeof step.md === 'function' ? step.md(left ?? step.secs) : step.md;
  return card({
    template: 'turquoise',
    icon: 'wind',
    iconColor: 'turquoise',
    title: `解压 · ${ex.name}`,
    subtitle: ex.caption,
    tags: [{ text: `第 ${i + 1} / ${total} 步`, color: 'turquoise' }],
    elements: withNav([
      markdown(content),
      timed
        ? columnSet([button('停止', { a: 'calm_stop', p: { id: ex.id } }, 'default', { icon: 'cancel', width: 'fill' })])
        : columnSet([button(step.btn, { a: 'calm', p: { id: ex.id, s: i + 1 } }, 'primary', { width: 'fill' })]),
    ]),
  });
}

// ---------- 服务器节拍器：timed 步骤的自动倒计时 ----------
// 每次回调 ACK 当前段卡片后启动；每秒 updateCard 刷新倒计时，段尽自动进下一段，
// 手动段/完成卡出现时自动停止。tickers 以 messageId 为键：同一张卡上的任何新回调
// （停止 / 回主页 / 重进练习）都会先 stopCalmTicker 顶替旧节拍器，旧 interval 自检落空即停。
const tickers = new Map(); // messageId -> { timer }

export function stopCalmTicker(messageId) {
  const t = tickers.get(messageId);
  if (t) {
    clearInterval(t.timer);
    tickers.delete(messageId);
  }
}

// tickMs 可注入（测试用毫秒级节拍）；生产默认 1 秒一拍
export function startCalmTicker(channel, messageId, id, s, tickMs = 1000) {
  stopCalmTicker(messageId);
  const ex = getCalmExercise(id);
  if (!ex) return;
  let step = Math.max(0, Math.floor(s) || 0);
  let left = ex.steps[step]?.secs;
  if (left == null) return;
  const mine = {};
  const push = () =>
    channel.updateCard(messageId, buildCalmStepCard(id, step, left)).catch((err) => {
      console.error('[calm-tick]', err?.message ?? err);
    });
  const timer = setInterval(() => {
    if (tickers.get(messageId) !== mine) {
      clearInterval(timer); // 已被顶替（用户点了别的），静默退出
      return;
    }
    left -= 1;
    if (left > 0) {
      push();
      return;
    }
    // 本段结束，进下一步
    step += 1;
    const next = ex.steps[step];
    if (!next) {
      stopCalmTicker(messageId);
      channel.updateCard(messageId, buildCalmStepCard(id, step)).catch((err) => {
        console.error('[calm-tick]', err?.message ?? err);
      });
      return;
    }
    left = next.secs ?? null;
    push();
    if (left == null) stopCalmTicker(messageId); // 下一段是手动步骤：推完即停，等用户点
  }, tickMs);
  timer.unref?.();
  mine.timer = timer;
  tickers.set(messageId, mine);
}
