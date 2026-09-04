// 对话式改卡：把 AI 解析出的 edit ops 应用到在途投票 / 报名会话上。
// 纯函数、本地确定性计算——不额外调 AI，方便单测，也保证消息入口之外的确定性。

const MAX_VOTE_OPTIONS = 8;
const MIN_VOTE_OPTIONS = 2;
const MAX_FORM_FIELDS = 6;
const MIN_FORM_FIELDS = 1;

// 返回 { next, applied: string[], rejected: string[] }；next 是应用后的新会话对象（未落库）。
// applied / rejected 是给人看的中文说明，直接拼进回复消息。
export function applyEditOps(session, ops) {
  const next = { ...session };
  if (session.kind === 'vote') next.options = [...session.options];
  if (session.kind === 'form') next.fields = session.fields.map((f) => ({ ...f }));
  const applied = [];
  const rejected = [];

  for (const op of ops || []) {
    if (next.kind === 'vote') applyVoteOp(next, op, applied, rejected);
    else if (next.kind === 'form') applyFormOp(next, op, applied, rejected);
    else rejected.push('只有投票和报名卡支持对话修改');
  }
  return { next, applied, rejected };
}

function applyVoteOp(session, op, applied, rejected) {
  const title = session.q;
  if (op.op === 'add_option') {
    if (session.options.includes(op.value)) {
      rejected.push(`选项「${op.value}」已存在`);
    } else if (session.options.length >= MAX_VOTE_OPTIONS) {
      rejected.push(`选项最多 ${MAX_VOTE_OPTIONS} 个，加不下「${op.value}」了`);
    } else {
      session.options.push(op.value);
      applied.push(`加选项「${op.value}」`);
    }
    return;
  }
  if (op.op === 'remove_option') {
    if (!session.options.includes(op.value)) {
      rejected.push(`没有选项「${op.value}」`);
    } else if (session.options.length <= MIN_VOTE_OPTIONS) {
      rejected.push(`至少保留 ${MIN_VOTE_OPTIONS} 个选项，「${op.value}」删不掉`);
    } else {
      session.options = session.options.filter((o) => o !== op.value);
      if (session.tally) delete session.tally[op.value];
      applied.push(`删选项「${op.value}」`);
    }
    return;
  }
  if (op.op === 'rename') {
    applied.push(`标题从「${title}」改为「${op.value}」`);
    session.q = op.value;
    return;
  }
  rejected.push(`投票卡不支持「${op.op}」这个操作`);
}

function applyFormOp(session, op, applied, rejected) {
  if (op.op === 'rename') {
    applied.push(`标题从「${session.title}」改为「${op.value}」`);
    session.title = op.value;
    return;
  }
  if (op.op === 'add_field') {
    if (session.fields.some((f) => f.label === op.label)) {
      rejected.push(`字段「${op.label}」已存在`);
      return;
    }
    if (session.fields.length >= MAX_FORM_FIELDS) {
      rejected.push(`字段最多 ${MAX_FORM_FIELDS} 个，加不下「${op.label}」了`);
      return;
    }
    const maxN = session.fields.reduce((m, f) => Math.max(m, Number(f.name?.slice(1)) || 0), 0);
    session.fields.push({
      name: `f${maxN + 1}`,
      label: op.label,
      type: op.type === 'select' ? 'select' : 'text',
      required: false,
      options: op.type === 'select' ? op.options : [],
    });
    applied.push(`加字段「${op.label}」`);
    return;
  }
  if (op.op === 'remove_field') {
    const idx = session.fields.findIndex((f) => f.label === op.label);
    if (idx < 0) {
      rejected.push(`没有字段「${op.label}」`);
    } else if (session.fields.length <= MIN_FORM_FIELDS) {
      rejected.push(`至少保留 ${MIN_FORM_FIELDS} 个字段，「${op.label}」删不掉`);
    } else {
      session.fields.splice(idx, 1);
      applied.push(`删字段「${op.label}」`);
    }
    return;
  }
  if (op.op === 'add_option' || op.op === 'remove_option') {
    rejected.push('报名卡没有选项可改，要改的是字段（add_field / remove_field）');
    return;
  }
  rejected.push(`报名卡不支持「${op.op}」这个操作`);
}
