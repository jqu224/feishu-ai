import { card, button, hr, columnSet, textLine, chart, note } from '../cards.js';

export function normalizeVote(v) {
  const options = Array.isArray(v.options)
    ? v.options.filter((o) => typeof o === 'string' && o.trim()).slice(0, 8)
    : [];
  const tally = {};
  for (const o of options) tally[o] = Number(v.tally?.[o]) || 0;
  return {
    q: String(v.q || '请投票').slice(0, 200),
    options,
    tally,
    closed: Boolean(v.closed),
    votes: Number(v.votes) || Object.values(tally).reduce((a, b) => a + b, 0),
  };
}

export function recordVote(v, choice) {
  const next = normalizeVote(v);
  if (!next.closed && next.options.includes(choice)) {
    next.tally[choice] = (next.tally[choice] || 0) + 1;
    next.votes += 1;
  }
  // 保留 kind / chatId / messageId 等会话元信息：normalizeVote 只返回业务字段，
  // 不展开原对象会把 kind 丢掉，后续导出会被误判成报名表（2026-09-04 线上事故）
  return { ...v, ...next };
}

export function summarize(v) {
  const nv = normalizeVote(v);
  const total = Object.values(nv.tally).reduce((a, b) => a + b, 0);
  const rows = nv.options.map((o) => `${o}：${nv.tally[o]} 票`).join('，');
  return `「${nv.q}」结果（共 ${total} 票）：${rows || '暂无'}`;
}

export function buildVoteCard(v, sessionId) {
  const nv = normalizeVote(v);
  const total = Object.values(nv.tally).reduce((a, b) => a + b, 0);
  const elements = [];

  if (!nv.closed) {
    // Slack poll 行：选项按钮（weight 4）+ 右侧内联票数（weight 1），不在底部重复汇总
    for (const o of nv.options) {
      const count = nv.tally[o];
      elements.push(
        columnSet([
          {
            content: button(
              o,
              sessionId
                ? { a: 'vote', p: { sessionId, choice: o } }
                : { a: 'vote', p: { ...nv, choice: o } },
              'default',
              { width: 'fill' }
            ),
            weight: 4,
          },
          {
            content: {
              tag: 'div',
              text: {
                tag: 'plain_text',
                content: `${count} 票`,
                text_size: 'notation',
                text_align: 'center',
                text_color: count > 0 ? 'default' : 'grey',
              },
            },
            weight: 1,
            verticalAlign: 'center',
          },
        ])
      );
    }
    elements.push(hr());
    if (sessionId) {
      elements.push(
        columnSet([
          button('结束并公布结果', { a: 'confirm', p: { kind: 'publish_vote', sessionId } }, 'danger_text', { icon: 'done' }),
          button('导出为表格', { a: 'export', p: { kind: 'export_vote', sessionId } }, 'text', { icon: 'doc' }),
        ])
      );
    } else {
      elements.push(
        button('结束并公布结果', { a: 'confirm', p: { kind: 'publish_vote', v: nv } }, 'danger_text', { icon: 'done' })
      );
    }
  } else {
    // 结果图表化：VChart 条形图直观对比各选项票数（总票数在 header 徽标）
    elements.push(chart({ values: nv.options.map((o) => ({ name: o, value: nv.tally[o] })) }));
    // 领先者宣告行：图表已展示全部票数，这里只点出结果，不再复述明细
    const max = Math.max(0, ...nv.options.map((o) => nv.tally[o]));
    const winners = nv.options.filter((o) => nv.tally[o] === max && max > 0);
    if (winners.length === 1) {
      elements.push(textLine(`结果：「${winners[0]}」以 ${max} 票领先`, { icon: 'done', iconColor: 'turquoise', color: 'turquoise' }));
    } else if (winners.length > 1) {
      elements.push(textLine(`结果：${winners.map((o) => `「${o}」`).join('、')} 各 ${max} 票并列`, { icon: 'done', iconColor: 'turquoise', color: 'turquoise' }));
    } else {
      elements.push(textLine('结果：暂无有效投票', { icon: 'done', iconColor: 'grey', color: 'grey' }));
    }
    if (sessionId) {
      elements.push(
        hr(),
        columnSet([button('导出为表格', { a: 'export', p: { kind: 'export_vote', sessionId } }, 'default', { icon: 'doc' })]),
        note('导出的表格包含完整统计表与结论')
      );
    }
  }

  return card({
    template: 'turquoise',
    icon: 'poll',
    iconColor: 'turquoise',
    title: '投票',
    subtitle: nv.q,
    tags: [
      nv.closed ? { text: '已结束', color: 'neutral' } : { text: '进行中', color: 'turquoise' },
      { text: `已投 ${total} 票`, color: 'neutral' },
    ],
    elements,
  });
}
