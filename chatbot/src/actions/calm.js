// 解压：文字互动练习。飞书卡片跑不了计时器/动画，
// 改为「点一下走一步」的实时交互——每一步由服务器换卡，节奏由用户自己掌握
// （呼吸类反而因此不会催人：点下一段的间隔就是那一段的时长）。
// 交互形态与变形球/提神活动同宗：markdown 正文 + 按钮回调原地换卡。
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
      textLine('每一步点一下，卡片带你一步一步走完。呼吸、着陆、冥想，挑一个现在就开始。', {
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

// 步骤卡：s 越界（含完成态 s === steps.length）都有确定落点
export function buildCalmStepCard(id, s = 0) {
  const ex = getCalmExercise(id);
  if (!ex) return buildCalmHomeCard();
  const total = ex.steps.length;
  const i = Math.max(0, Math.floor(s) || 0);
  if (i >= total) return doneCard(ex);
  const step = ex.steps[i];
  return card({
    template: 'turquoise',
    icon: 'wind',
    iconColor: 'turquoise',
    title: `解压 · ${ex.name}`,
    subtitle: ex.caption,
    tags: [{ text: `第 ${i + 1} / ${total} 步`, color: 'turquoise' }],
    elements: withNav([
      markdown(step.md),
      columnSet([button(step.btn, { a: 'calm', p: { id: ex.id, s: i + 1 } }, 'primary', { width: 'fill' })]),
    ]),
  });
}
