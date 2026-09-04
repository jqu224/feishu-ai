import { card, button, columnSet, hr, textLine, statRow } from '../cards.js';

export const MOVES = ['rock', 'scissors', 'paper'];
export const NAME = { rock: '石头', scissors: '剪刀', paper: '布' };

const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
const RESULT_TEXT = { win: '你赢了', lose: '我赢了', draw: '平局' };
const RESULT_STYLE = { win: { color: 'green', tagColor: 'green' }, lose: { color: 'red', tagColor: 'carmine' }, draw: { color: 'default', tagColor: 'neutral' } };

export function judge(user, bot) {
  if (user === bot) return 'draw';
  return BEATS[user] === bot ? 'win' : 'lose';
}

export function randomMove(random = Math.random) {
  return MOVES[Math.floor(random() * MOVES.length)];
}

export function applyMove(score = {}, choice, bot) {
  const safeScore = { w: score.w || 0, l: score.l || 0, d: score.d || 0 };
  const result = judge(choice, bot);
  const next = { ...safeScore };
  if (result === 'win') next.w += 1;
  else if (result === 'lose') next.l += 1;
  else next.d += 1;
  return { score: next, bot, choice, result, text: RESULT_TEXT[result] };
}

export function buildRpsCard(score = {}, last = null) {
  const safe = { w: score.w || 0, l: score.l || 0, d: score.d || 0 };
  const rounds = safe.w + safe.l + safe.d;
  // 中性表面：三个 tile 统一 grey-50，只有上局结果对应的数字用语义色高亮
  const highlight = !last?.result ? null : last.result === 'win' ? 'w' : last.result === 'lose' ? 'l' : null;
  const elements = [
    statRow([
      { label: '胜', value: safe.w, tone: 'grey-50', color: highlight === 'w' ? 'green' : 'default' },
      { label: '负', value: safe.l, tone: 'grey-50', color: highlight === 'l' ? 'red' : 'default' },
      { label: '平', value: safe.d, tone: 'grey-50', color: 'default' },
    ]),
  ];

  if (last?.result) {
    const style = RESULT_STYLE[last.result] || RESULT_STYLE.draw;
    elements.push(
      textLine(`上局：你出${NAME[last.choice] || '？'}，我出${NAME[last.bot] || '？'} · ${last.text || ''}`.replace(/ · $/, ''), {
        icon: 'record',
        iconColor: style.color === 'default' ? 'grey' : style.color,
        color: style.color,
      })
    );
  }

  elements.push(
    columnSet(
      MOVES.map((m) => button(NAME[m], { a: 'rps', p: { c: m, s: safe } }, 'default', { icon: m, size: 'large', width: 'fill' }))
    ),
    hr(),
    columnSet([button('重置战绩', { a: 'rps_reset', p: {} }, 'danger_text', { icon: 'reset' })])
  );

  return card({
    template: 'yellow',
    icon: 'play',
    iconColor: 'yellow',
    title: '石头剪刀布',
    subtitle: last ? '' : '点击按钮出拳，战绩实时累计',
    tags: [{ text: `已玩 ${rounds} 局`, color: rounds ? 'yellow' : 'neutral' }],
    elements,
  });
}
