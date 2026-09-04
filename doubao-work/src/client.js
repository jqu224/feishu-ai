// BOT 控制 API 客户端：插件侧唯一的出站通道。
// 插件不持有飞书凭证；建卡必须经 BOT 的本地控制 API（见 ../chatbot/src/control.js），
// 这样卡片由持有长连接的 BOT 发出，会话落库在 BOT，交互回调才能原地更新。
export function createControlClient({ controlUrl, controlToken, fetchImpl = fetch } = {}) {
  const base = (controlUrl || 'http://127.0.0.1:3777').replace(/\/+$/, '');
  if (!controlToken) throw new Error('缺少 CONTROL_TOKEN（与主 BOT .env 中一致）');

  async function call(path, { method = 'GET', body } = {}) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${controlToken}`,
        'Content-Type': 'application/json',
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`控制 API ${res.status}：${data.error || res.statusText}`);
    }
    return data;
  }

  return {
    createVote: ({ question, options, chat_id }) =>
      call('/tools/create_vote', { method: 'POST', body: { question, options, chat_id } }),
    createForm: ({ title, fields, chat_id }) =>
      call('/tools/create_form', { method: 'POST', body: { title, fields, chat_id } }),
    createRosterForm: ({ title, names, chat_id }) =>
      call('/tools/create_roster_form', { method: 'POST', body: { title, names, chat_id } }),
    getSession: (sessionId) => call(`/sessions/${encodeURIComponent(sessionId)}`),
    exportSession: (sessionId) => call(`/sessions/${encodeURIComponent(sessionId)}/export`),
  };
}
