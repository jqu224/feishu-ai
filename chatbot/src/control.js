// 本地控制 API：豆包工作插件（doubao-work/）与 BOT 的唯一通道。
// 插件不持有飞书凭证、不直接发消息——卡片必须由持有长连接的 BOT 进程发出，
// 会话状态也只在 BOT 内存 store 里，交互回调才能原地更新。
// 鉴权：Authorization: Bearer CONTROL_TOKEN；仅绑定 127.0.0.1。
import { createServer } from 'node:http';
import { newSession, getSession } from './store.js';
import { buildVoteCard, summarize } from './actions/vote.js';
import { buildFormCard, summarizeForm } from './actions/form.js';

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function normalizeNames(names) {
  const seen = new Set();
  const out = [];
  for (const n of Array.isArray(names) ? names : []) {
    const v = String(n).trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// 纯逻辑层：返回 { status, data }，不碰 HTTP 对象，便于单测
export async function handleControl(method, url, body, channel, config) {
  const defaultChatId = config.control.defaultChatId;

  if (method === 'POST' && url === '/tools/create_vote') {
    const { question, options, chat_id } = body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return { status: 400, data: { error: 'question 和至少 2 个 options 必填' } };
    }
    const chatId = chat_id || defaultChatId;
    if (!chatId) return { status: 400, data: { error: '缺少 chat_id，且未配置 FEISHU_DEFAULT_CHAT_ID' } };
    const session = newSession({ kind: 'vote', q: question, options, tally: {}, closed: false, votes: 0 });
    await channel.send(chatId, { card: buildVoteCard(session, session.id) });
    return { status: 200, data: { session_id: session.id, chat_id: chatId } };
  }

  if (method === 'POST' && url === '/tools/create_form') {
    const { title, fields, chat_id } = body;
    if (!title || !Array.isArray(fields) || !fields.length) {
      return { status: 400, data: { error: 'title 和至少 1 个 field 必填' } };
    }
    const chatId = chat_id || defaultChatId;
    if (!chatId) return { status: 400, data: { error: '缺少 chat_id，且未配置 FEISHU_DEFAULT_CHAT_ID' } };
    const session = newSession({ kind: 'form', title, fields, submissions: [], closed: false });
    await channel.send(chatId, { card: buildFormCard(session, session.id) });
    return { status: 200, data: { session_id: session.id, chat_id: chatId } };
  }

  if (method === 'POST' && url === '/tools/create_roster_form') {
    const { title, names, chat_id } = body;
    const roster = normalizeNames(names);
    if (!roster.length) return { status: 400, data: { error: 'names 至少需要 1 个名字' } };
    if (roster.length > 100) {
      return { status: 400, data: { error: `names 最多 100 个（去重后 ${roster.length} 个）` } };
    }
    const chatId = chat_id || defaultChatId;
    if (!chatId) return { status: 400, data: { error: '缺少 chat_id，且未配置 FEISHU_DEFAULT_CHAT_ID' } };
    const session = newSession({
      kind: 'form',
      title: title || '报名统计',
      fields: [
        { label: '姓名', type: 'select', required: true, options: roster },
        { label: '能否参加', type: 'select', required: true, options: ['报名', '不报名'] },
      ],
      submissions: [],
      closed: false,
    });
    await channel.send(chatId, { card: buildFormCard(session, session.id) });
    return { status: 200, data: { session_id: session.id, chat_id: chatId, roster_size: roster.length } };
  }

  if (method === 'GET' && url?.startsWith('/sessions/')) {
    const [, , id, action] = url.split('/');
    const s = id ? getSession(id) : null;
    if (!s) return { status: 404, data: { error: 'session 不存在（可能机器人重启丢失）' } };
    if (action === 'export') {
      const text = s.kind === 'vote' ? summarize(s) : summarizeForm(s);
      return { status: 200, data: { session_id: id, kind: s.kind || 'form', text } };
    }
    const status =
      s.kind === 'vote'
        ? { question: s.q, tally: s.tally, votes: s.votes }
        : { title: s.title, submission_count: s.submissions?.length || 0 };
    return { status: 200, data: { session_id: id, kind: s.kind || 'form', closed: Boolean(s.closed), ...status } };
  }

  return { status: 404, data: { error: 'not found' } };
}

export function startControlServer(channel, config) {
  const server = createServer(async (req, res) => {
    const write = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };
    const url = new URL(req.url, 'http://127.0.0.1').pathname.replace(/\/+$/, '') || '/';
    if (req.headers.authorization !== `Bearer ${config.control.token}`) {
      return write(401, { error: 'unauthorized' });
    }
    try {
      const raw = req.method === 'POST' ? await readBody(req) : '';
      const body = raw ? JSON.parse(raw) : {};
      const result = await handleControl(req.method, url, body, channel, config);
      write(result.status, result.data);
    } catch (err) {
      write(err.message === 'body too large' ? 413 : 500, { error: err.message });
    }
  });
  return new Promise((resolve) => {
    server.listen(config.control.port, '127.0.0.1', () => resolve(server));
  });
}
