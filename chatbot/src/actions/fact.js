// 「抽一条冷知识」：随机抽取预制冷知识，点击换一条原地换卡。
// 配色 wathet：「冷」知识配冰蓝，与答题 topic 的 blue 分开（选项卡级配色不撞色，SPIRIT.md 第六节）。
import { card, button, columnSet, textLine, withNav } from '../cards.js';
import { FACTS } from '../data/facts.js';
import { pickBySeed, randomSeed } from '../rng.js';

export function buildFactCard(seed = randomSeed()) {
  const fact = pickBySeed(seed, FACTS);
  return card({
    template: 'wathet',
    icon: 'snowflake',
    iconColor: 'wathet',
    title: '冷知识',
    subtitle: '你知道吗',
    tags: [{ text: `第 ${FACTS.indexOf(fact) + 1} 条`, color: 'wathet' }],
    elements: withNav([
      textLine(fact, { size: 'normal' }),
      columnSet([button('换一条', { a: 'fact', p: {} }, 'primary', { icon: 'reset' })]),
    ]),
  });
}
