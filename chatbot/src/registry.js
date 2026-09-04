import { decodeValue } from './state.js';
import { randomMove, applyMove, buildRpsCard } from './actions/rps.js';
import { normalizeVote, recordVote, buildVoteCard, summarize } from './actions/vote.js';
import { buildFormCard, recordSubmission, summarizeForm } from './actions/form.js';
import { buildHomeCard } from './actions/home.js';
import {
  getSet, buildQuizHomeCard, buildQuestionCard, buildRevealCard, buildResultCard, balancedSeed,
} from './actions/quiz.js';
import { buildFactCard } from './actions/fact.js';
import { getTest, buildTestHomeCard, buildTestQuestionCard, buildTestResultCard, addCounters } from './actions/test.js';
import { buildHangmanCard, newHangmanGame, playTurn } from './actions/hangman.js';
import { buildStoryHomeCard, buildStoryCard } from './actions/story.js';
import { buildBallCard } from './actions/ball.js';
import { buildRefreshCard } from './actions/refresh.js';
import { buildCalmHomeCard, buildCalmStepCard } from './actions/calm.js';
import { getSession, setSession } from './store.js';
import { card, markdown, button, columnSet, linkButton, note } from './cards.js';
import { voteCsv, formCsv, sendCsvFile, exportSheetDoc } from './feishu-docs.js';

// 玩法 action -> 返回新卡片，通过回调 ACK 原地换卡。
// 全部是本地确定性计算（不调 AI），天然满足卡片回调 3 秒超时限制。
const gameHandlers = {
  quiz_home: () => buildQuizHomeCard(),
  quiz_new: (p) => {
    const set = getSet(p.set);
    return set ? buildQuestionCard(set, balancedSeed(set), 0, 0) : buildQuizHomeCard();
  },
  quiz_ans: (p) => {
    const set = getSet(p.set);
    if (!set || !set.questions[p.i]) return buildQuizHomeCard();
    return buildRevealCard(set, p.seed, p.i, p.k, p.sc || 0);
  },
  quiz_next: (p) => {
    const set = getSet(p.set);
    if (!set) return buildQuizHomeCard();
    const i = p.i | 0;
    if (i >= set.questions.length) return buildResultCard(set, p.sc || 0, p.seed);
    return buildQuestionCard(set, p.seed, i, p.sc || 0);
  },
  test_home: () => buildTestHomeCard(),
  test_new: (p) => {
    const t = getTest(p.t);
    return t ? buildTestQuestionCard(t, 0, {}) : buildTestHomeCard();
  },
  test_ans: (p) => {
    const t = getTest(p.t);
    const opt = t?.questions[p.i]?.options[p.k];
    if (!t) return buildTestHomeCard();
    if (!opt) return buildTestQuestionCard(t, 0, {});
    const c = addCounters(p.c, opt.w);
    const nextI = (p.i | 0) + 1;
    return nextI >= t.questions.length ? buildTestResultCard(t, c) : buildTestQuestionCard(t, nextI, c);
  },
  hang_new: () => buildHangmanCard(newHangmanGame()),
  hang: (p) => playTurn(p, p.l),
  story_home: () => buildStoryHomeCard(),
  story_go: (p) => buildStoryCard(p.s, p.n),
  fact: () => buildFactCard(),
  ball: (p) => buildBallCard(p.f | 0, p.r | 0, p.z | 0),
  refresh: (p) => buildRefreshCard(p?.x),
  calm_home: () => buildCalmHomeCard(),
  calm: (p) => buildCalmStepCard(p?.id, p?.s | 0),
};

// 底部导航 action -> 发一张新卡片（不原地换卡，避免误点打断进行中的游戏）
const navHandlers = {
  nav_home: () => buildHomeCard(true),
  nav_quiz: () => buildQuizHomeCard(),
  nav_test: () => buildTestHomeCard(),
  nav_hang: () => buildHangmanCard(newHangmanGame()),
  nav_story: () => buildStoryHomeCard(),
};

export async function confirmCard(step) {
  let message = '确认执行该操作吗？';
  if (step?.kind === 'publish_vote') {
    const s = getSession(step.sessionId);
    message = `即将在群里公布「${s?.q || ''}」的结果。`;
  } else if (step?.kind === 'publish_form') {
    const s = getSession(step.sessionId);
    message = `即将在群里公布「${s?.title || ''}」的报名汇总。`;
  } else if (step?.kind === 'export_vote') {
    const s = getSession(step.sessionId);
    message = `确认把「${s?.q || '投票'}」的投票结果导出为表格并发送到当前会话吗？`;
  } else if (step?.kind === 'export_form') {
    const s = getSession(step.sessionId);
    message = `确认把「${s?.title || '报名表'}」的报名汇总导出为表格并发送到当前会话吗？`;
  }
  return card({
    template: 'red',
    icon: 'help',
    iconColor: 'red',
    title: '需要你确认',
    subtitle: '以下动作不可撤回',
    tags: [{ text: '人工确认', color: 'red' }],
    elements: [
      markdown(message),
      columnSet([
        button('确认执行', { a: 'confirm_exec', p: step }, 'danger', { icon: 'confirm' }),
        button('取消', { a: 'confirm_cancel', p: step }, 'text', { icon: 'cancel' }),
      ]),
    ],
  });
}

// 进程重启后内存会话（store.js 的 Map）即清空，但飞书里的旧卡片还在。
// 此时点旧卡按钮没有状态可改，必须返回明确的过期提示卡，而不是静默无反应。
export function expiredCard() {
  return card({
    template: 'grey',
    icon: 'info',
    iconColor: 'grey',
    title: '这张卡片已过期',
    subtitle: '机器人重启后，进行中的投票 / 报名状态没有保留',
    tags: [{ text: '已过期', color: 'neutral' }],
    elements: [
      markdown('这张卡片来自重启前的会话，按钮已失效。请重新发起一个新的投票或报名。'),
      columnSet([button('回到玩法主页', { a: 'nav_home', p: {} }, 'primary', { icon: 'list', width: 'fill' })]),
    ],
  });
}

async function executeConfirmed(channel, evt, step) {
  if (step?.kind === 'publish_vote') {
    const s = getSession(step.sessionId);
    if (!s) return expiredCard();
    // 展开 s 保留 kind 等元信息：normalizeVote 只返回业务字段，
    // 直接覆盖会让结束后的投票在导出时被当成报名表
    const closed = { ...s, ...normalizeVote(s), closed: true };
    setSession(step.sessionId, closed);
    await channel.send(evt.chatId, { text: summarize(closed) }, { replyTo: evt.messageId });
    return buildVoteCard(closed, step.sessionId);
  }
  if (step?.kind === 'publish_form') {
    const s = getSession(step.sessionId);
    if (!s) return expiredCard();
    const closed = { ...s, closed: true };
    setSession(step.sessionId, closed);
    await channel.send(evt.chatId, { text: summarizeForm(closed) }, { replyTo: evt.messageId });
    return buildFormCard(closed, step.sessionId);
  }
  // 导出类：立即 ACK「导出中」卡片（满足 3 秒回调超时），实际导出走后台，完成后另发链接卡
  if (step?.kind === 'export_vote' || step?.kind === 'export_form') {
    const s = getSession(step.sessionId);
    if (!s) return expiredCard();
    runExportSession(channel, evt, s).catch((err) => console.error('[export]', err));
    return exportingCard(s);
  }
  return undefined;
}

function sessionTitle(session) {
  // 不依赖 kind：早期会话可能缺 kind（状态归一化曾把 kind 丢掉），标题兜底取 q / title
  return session?.q || session?.title || '汇总';
}

// 「导出中」占位卡：确认后立即 ACK 的中间态
export function exportingCard(session) {
  return card({
    template: 'blue',
    icon: 'record',
    iconColor: 'blue',
    title: '正在导出表格',
    subtitle: sessionTitle(session),
    tags: [{ text: '导出中', color: 'blue' }],
    elements: [
      markdown('汇总正在生成为表格，完成后会发送到这里。优先生成云空间在线表格，不可用时改发 CSV 文件（Excel 可直接打开）。'),
      note('通常在 3 秒内完成'),
    ],
  });
}

// 导出完成卡（在线表格）：带「打开表格」链接按钮
export function exportedSheetCard(session, doc) {
  return card({
    template: 'green',
    icon: 'doc',
    iconColor: 'green',
    title: '已导出在线表格',
    subtitle: sessionTitle(session),
    tags: [{ text: '完成', color: 'green' }],
    elements: [
      markdown(`「${sessionTitle(session)}」的汇总已生成为云空间在线表格，组织内成员可直接查看。`),
      columnSet([linkButton('打开表格', doc.url, 'primary')]),
    ],
  });
}

// 导出完成卡（CSV 群文件）：文件消息发出后补一张说明卡（不与确认卡的兜底重放竞争）
export function exportedCard(session, file) {
  return card({
    template: 'green',
    icon: 'doc',
    iconColor: 'green',
    title: '已导出汇总表格',
    subtitle: sessionTitle(session),
    tags: [{ text: '完成', color: 'green' }],
    elements: [
      markdown(`「${sessionTitle(session)}」的汇总已生成为 **${file.fileName}**，见上方文件消息，点击即可下载。`),
      note('CSV 表格用 Excel 或飞书表格打开即为整齐的行列视图'),
    ],
  });
}

// 后台导出：生成 CSV -> 优先导入云空间在线表格 -> 失败降级为 CSV 群文件 -> 发完成卡。
// 注意：drive import_tasks 在本租户实测整体不可用（任务秒败无错误信息），
// 所以 csv->sheet 只作为优先尝试，任何失败都静默降级为 CSV 群文件，可靠性优先。
export async function runExportSession(channel, evt, session) {
  try {
    const csv = session.kind === 'vote' ? voteCsv(session) : formCsv(session);
    const fileName = docFileName(session);
    if (channel.rawClient?.drive) {
      try {
        const doc = await exportSheetDoc(channel.rawClient, csv, { fileName, pollTimeoutMs: 15_000 });
        await channel.send(evt.chatId, { card: exportedSheetCard(session, doc) }, { replyTo: evt.messageId });
        return;
      } catch (err) {
        console.warn('[export] 在线表格导入失败，降级为 CSV 群文件：', err?.message ?? err);
      }
    }
    const file = await sendCsvFile(channel.rawClient, evt.chatId, csv, { fileName });
    await channel.send(evt.chatId, { card: exportedCard(session, file) }, { replyTo: evt.messageId });
  } catch (err) {
    console.error('[export]', err);
    await channel
      .send(evt.chatId, { text: `导出失败：${err?.message ?? err}` }, { replyTo: evt.messageId })
      .catch(() => {});
  }
}

function docFileName(session) {
  const cleaned = String(sessionTitle(session) || '汇总')
    .replace(/[\\/:*?"<>|\r\n]+/g, '-')
    .trim();
  return `${cleaned.slice(0, 40) || '汇总'}-汇总.csv`;
}

// 同一张卡片的自增序号：回调 ACK 若未即时渲染，3.5s 后兜底重放一次，
// 但期间若有更新的交互（序号已变）则跳过，避免旧状态覆盖新状态。
const cardSeq = new Map();

export async function handleAction(channel, evt) {
  const decoded = decodeValue(evt.action?.value);
  if (!decoded) {
    console.warn('[cardAction] 无法识别的 value，已忽略：', JSON.stringify(evt.action?.value));
    return undefined;
  }
  const { action, payload } = decoded;
  let nextCard;

  if (gameHandlers[action]) {
    nextCard = gameHandlers[action](payload);
  } else if (navHandlers[action]) {
    await channel.send(evt.chatId, { card: navHandlers[action]() });
    return undefined;
  } else if (action === 'rps') {
    const bot = randomMove();
    const res = applyMove(payload.s, payload.c, bot);
    nextCard = buildRpsCard(res.score, { choice: res.choice, bot: res.bot, result: res.result, text: res.text });
  } else if (action === 'rps_reset') {
    nextCard = buildRpsCard();
  } else if (action === 'help_rps') {
    await channel.send(evt.chatId, { card: buildRpsCard() });
    return undefined;
  } else if (action === 'vote') {
    const current = payload.sessionId ? getSession(payload.sessionId) : payload;
    if (!current) {
      nextCard = expiredCard();
    } else {
      const next = recordVote(current, payload.choice);
      if (payload.sessionId) setSession(payload.sessionId, next);
      nextCard = buildVoteCard(next, payload.sessionId);
    }
  } else if (action === 'form_submit') {
    const s = getSession(payload.sessionId);
    if (!s) {
      nextCard = expiredCard();
    } else if (!s.closed) {
      const formValue = evt.raw?.action?.form_value ?? evt.action?.form_value;
      const operatorName = evt.operator?.name ?? evt.raw?.operator?.name;
      console.log('[cardAction] form_submit form_value：', JSON.stringify(formValue), '| operator：', operatorName || evt.operator?.openId);
      const next = recordSubmission(s, formValue, evt.operator?.openId, { operatorName });
      setSession(payload.sessionId, next);
      nextCard = buildFormCard(next, payload.sessionId);
    }
  } else if (action === 'form_close') {
    const s = getSession(payload.sessionId);
    if (!s) {
      nextCard = expiredCard();
    } else if (!s.closed) {
      nextCard = await confirmCard({ kind: 'publish_form', sessionId: payload.sessionId });
    }
  } else if (action === 'export') {
    if (payload?.kind === 'export_vote' || payload?.kind === 'export_form') {
      const s = getSession(payload.sessionId);
      nextCard = s ? await confirmCard({ kind: payload.kind, sessionId: payload.sessionId }) : expiredCard();
    }
  } else if (action === 'confirm') {
    nextCard = await confirmCard(payload);
  } else if (action === 'confirm_exec') {
    nextCard = await executeConfirmed(channel, evt, payload);
  } else if (action === 'confirm_cancel') {
    if (payload?.kind === 'publish_vote' || payload?.kind === 'export_vote') {
      const current = payload.sessionId ? getSession(payload.sessionId) : payload.v;
      nextCard = current ? buildVoteCard(current, payload.sessionId) : expiredCard();
    } else if (payload?.kind === 'publish_form' || payload?.kind === 'export_form') {
      const s = payload.sessionId ? getSession(payload.sessionId) : null;
      nextCard = s ? buildFormCard(s, payload.sessionId) : expiredCard();
    }
  }

  // 诊断：每个回调的结局都打到终端，方便排查「点了没反应」类问题
  console.log('[cardAction] 分支结局：', action, '→', nextCard ? `换卡「${nextCard?.header?.title?.content ?? '?'}」` : '无响应（undefined）');

  if (nextCard) {
    const seq = (cardSeq.get(evt.messageId) ?? 0) + 1;
    cardSeq.set(evt.messageId, seq);
    const timer = setTimeout(() => {
      if (cardSeq.get(evt.messageId) !== seq) return;
      channel.updateCard(evt.messageId, nextCard).catch((err) => {
        console.error('[cardAction] 兜底更新失败：', err?.message ?? err);
      });
    }, 3500);
    timer.unref();
  }
  return nextCard;
}
