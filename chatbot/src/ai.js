import { readPrompt } from './prompt.js';

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';

async function chatJson(base, key, model, messages) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
  const body = (responseFormat) =>
    JSON.stringify({
      model,
      response_format: responseFormat,
      temperature: 0.2,
      messages,
    });

  let res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: body({ type: 'json_object' }),
    signal: AbortSignal.timeout(20000),
  });

  // 个别免费模型不支持 json_object，降级为纯提示词约束（下游仍会 JSON.parse + 回退 help）。
  if (res.status === 400) {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: body(undefined),
      signal: AbortSignal.timeout(20000),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI 请求失败（${res.status}）：${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export async function generateCardIntent(text, ai = {}) {
  const base = (ai.base || DEFAULT_BASE).replace(/\/+$/, '');
  const content = await chatJson(base, ai.key, ai.model || 'glm-4-flash', [
    { role: 'system', content: readPrompt('card-generator') },
    { role: 'user', content: text },
  ]);
  return parseIntent(content);
}

// —— 流式对话（OpenAI 兼容 SSE）——

// SSE 增量解析器：把网络 chunk（可能半行）切成完整 data: 行，抽取 choices[0].delta.content。
// 独立成类便于对「半包拼接 / [DONE] / 非 JSON 心跳行」做单元测试。
export class SSEParser {
  constructor() {
    this.buf = '';
  }

  push(chunk) {
    this.buf += chunk;
    const deltas = [];
    let idx;
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).replace(/\r$/, '');
      this.buf = this.buf.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) deltas.push(delta);
      } catch {
        // 半包或 keep-alive 注释行，留在下个 chunk 拼接后再试
      }
    }
    return deltas;
  }
}

// 流式聊天：逐段产出 AI 回复文本（配合飞书流式卡片做打字机效果）。
// system 提示词来自 prompts/chat.md；失败直接抛错，由调用方决定降级方式。
export async function* streamChat(text, ai = {}, { signal } = {}) {
  const base = (ai.base || DEFAULT_BASE).replace(/\/+$/, '');
  if (!ai.key) throw new Error('缺少 AI_API_KEY，无法生成聊天回复');

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.key}`,
    },
    body: JSON.stringify({
      model: ai.model || 'glm-4-flash',
      stream: true,
      temperature: 0.6,
      messages: [
        { role: 'system', content: readPrompt('chat') },
        { role: 'user', content: text },
      ],
    }),
    signal: signal ?? AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`AI 请求失败（${res.status}）：${t.slice(0, 300)}`);
  }

  const parser = new SSEParser();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const delta of parser.push(decoder.decode(value, { stream: true }))) {
      yield delta;
    }
  }
}

const GAME_KINDS = new Set(['home', 'quiz', 'test', 'hangman', 'story', 'ball', 'fact']);

export function parseIntent(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { kind: 'help' };
  }
  if (!obj || typeof obj !== 'object') return { kind: 'help' };

  if (obj.kind === 'game') {
    const game = typeof obj.game === 'string' ? obj.game.trim().toLowerCase() : '';
    return GAME_KINDS.has(game) ? { kind: 'game', game } : { kind: 'help' };
  }

  // chat 只做分类不带内容：回复由 streamChat 流式生成，避免二次生成浪费
  if (obj.kind === 'chat') {
    return { kind: 'chat' };
  }

  if (obj.kind === 'vote') {
    const options = Array.isArray(obj.options)
      ? obj.options.filter((o) => typeof o === 'string' && o.trim()).map((o) => o.trim()).slice(0, 8)
      : [];
    const question = typeof obj.question === 'string' ? obj.question.trim() : '';
    if (!question || options.length < 2) return { kind: 'help' };
    return { kind: 'vote', question, options };
  }

  if (obj.kind === 'info') {
    const content = typeof obj.content === 'string' ? obj.content.trim() : '';
    if (!content) return { kind: 'help' };
    const title = typeof obj.title === 'string' ? obj.title.trim() : 'AI 生成卡片';
    const buttons = Array.isArray(obj.buttons)
      ? obj.buttons
          .filter((b) => b && typeof b.text === 'string' && typeof b.url === 'string')
          .map((b) => ({ text: b.text.slice(0, 40), url: b.url }))
          .slice(0, 3)
      : [];
    return { kind: 'info', title, content, buttons };
  }

  if (obj.kind === 'edit') {
    const ops = Array.isArray(obj.ops)
      ? obj.ops
          .filter((o) => o && typeof o === 'object' && typeof o.op === 'string')
          .slice(0, 5)
          .map((o) => {
            const op = o.op.trim();
            if (op === 'add_option' || op === 'remove_option' || op === 'rename') {
              const value = typeof o.value === 'string' ? o.value.trim().slice(0, 60) : '';
              return value ? { op, value } : null;
            }
            if (op === 'remove_field') {
              const label = typeof o.label === 'string' ? o.label.trim().slice(0, 40) : '';
              return label ? { op, label } : null;
            }
            if (op === 'add_field') {
              const label = typeof o.label === 'string' ? o.label.trim().slice(0, 40) : '';
              const type = o.type === 'select' ? 'select' : 'text';
              const options =
                type === 'select'
                  ? (Array.isArray(o.options) ? o.options : [])
                      .filter((v) => typeof v === 'string' && v.trim())
                      .map((v) => v.trim())
                      .slice(0, 8)
                  : [];
              if (!label) return null;
              if (type === 'select' && options.length < 2) return null;
              return { op, label, type, options };
            }
            return null;
          })
          .filter(Boolean)
      : [];
    return ops.length ? { kind: 'edit', ops } : { kind: 'help' };
  }

  if (obj.kind === 'form') {
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    const fields = Array.isArray(obj.fields)
      ? obj.fields
          .filter((f) => f && typeof f === 'object')
          .slice(0, 6)
          .map((f, i) => {
            const type = f.type === 'select' ? 'select' : 'text';
            const options =
              type === 'select'
                ? (Array.isArray(f.options) ? f.options : [])
                    .filter((o) => typeof o === 'string' && o.trim())
                    .map((o) => o.trim())
                    .slice(0, 8)
                : [];
            return {
              name: `f${i + 1}`,
              label: String(f.label || `字段${i + 1}`).trim().slice(0, 40),
              type,
              required: f.required === true,
              options,
            };
          })
          .filter((f) => f.type !== 'select' || f.options.length >= 2)
      : [];
    if (!title || fields.length < 1) return { kind: 'help' };
    return { kind: 'form', title, fields };
  }

  return { kind: 'help' };
}
