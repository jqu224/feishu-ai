import * as lark from '@larksuiteoapi/node-sdk';
import { buildRpsCard } from './actions/rps.js';
import { buildVoteCard } from './actions/vote.js';
import { buildFormCard } from './actions/form.js';
import { buildHomeCard } from './actions/home.js';
import { buildQuizHomeCard } from './actions/quiz.js';
import { buildFactCard } from './actions/fact.js';
import { buildTestHomeCard } from './actions/test.js';
import { buildHangmanCard, newHangmanGame } from './actions/hangman.js';
import { buildStoryHomeCard } from './actions/story.js';
import { buildBallCard } from './actions/ball.js';
import { buildRefreshCard } from './actions/refresh.js';
import { buildCalmHomeCard } from './actions/calm.js';
import { generateCardIntent, streamChat } from './ai.js';
import { newSession, getLatestSession, setSession } from './store.js';
import { applyEditOps } from './edit.js';
import { card, markdown, button, columnSet, hr, linkButton, textLine, note } from './cards.js';
import { randomSeed } from './rng.js';
import { handleAction, runExportSession } from './registry.js';

const RPS_RE = /猜拳|石头剪刀布|剪刀石头布|^\/play$/i;
// 文本指令直达导出：把最近一个投票 / 报名会话导出为飞书在线文档
const EXPORT_RE = /^\/?(导出文档|导出汇总|export\s*doc)$/i;

// 玩法关键词快路由：不用等 AI 分类，点按钮或发关键词都能直达。
export const GAME_BUILDERS = {
  quiz: buildQuizHomeCard,
  test: buildTestHomeCard,
  hangman: () => buildHangmanCard(newHangmanGame()),
  story: buildStoryHomeCard,
  ball: () => buildBallCard(0),
  refresh: () => buildRefreshCard(),
  calm: () => buildCalmHomeCard(),
  fact: () => buildFactCard(randomSeed()),
  home: () => buildHomeCard(true),
};

const GAME_ROUTES = [
  [/答题|豆包|冷知识|quiz/i, 'quiz'],
  [/测试|mbti|disc|sbti|人格/i, 'test'],
  [/猜词|猜单词|单词|hangman/i, 'hangman'],
  [/剧情|小说|奶狗|恋爱/i, 'story'],
  [/变形球|变形/i, 'ball'],
  [/提神|清醒一下|困了|醒醒/i, 'refresh'],
  [/解压|放松|冥想|深呼吸|焦虑|着陆/i, 'calm'],
  [/玩法|主页|菜单|游戏|帮助|help/i, 'home'],
];

export function gameCardFor(text) {
  for (const [re, key] of GAME_ROUTES) {
    if (re.test(text)) return GAME_BUILDERS[key]();
  }
  return null;
}

function isRpsTrigger(text) {
  return RPS_RE.test(text);
}

export function helpCard(aiEnabled) {
  return buildHomeCard(aiEnabled);
}

export function infoCard(intent, meta) {
  const elements = [markdown(intent.content)];
  if (intent.buttons?.length) {
    elements.push(
      columnSet(
        intent.buttons.map((b) =>
          linkButton(b.text, b.url, 'default')
        )
      )
    );
  }
  // footer 元信息（模型名 · 生成耗时）：对标 hermes-agent 的 geek 细节，AI-native 感
  if (meta?.model) {
    elements.push(note(`${meta.model} · ${(meta.ms / 1000).toFixed(1)}s 生成`));
  }
  return card({
    template: 'violet',
    icon: 'info',
    iconColor: 'violet',
    title: intent.title,
    tags: [{ text: 'AI 生成', color: 'violet' }],
    elements,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 流式聊天回复：AI 增量 -> 飞书原生打字机卡片（cardkit 流式更新）。
// 只要成功输出过一段就不再降级（半截回复比报错卡友好）；完全失败才发静态兜底卡。
export async function streamChatReply(channel, msg, ai) {
  let appended = false;
  try {
    await channel.stream(
      msg.chatId,
      {
        markdown: async (ctrl) => {
          for await (const delta of streamChat(msg.content, ai)) {
            appended = true;
            await ctrl.append(delta);
          }
        },
      },
      { replyTo: msg.messageId }
    );
  } catch (err) {
    console.error('[stream-chat]', err);
    if (!appended) {
      await channel.send(msg.chatId, { card: streamFallbackCard(err) }, { replyTo: msg.messageId }).catch(() => {});
    }
  }
}

// 信息卡渐进式输出：先发完整骨架（标题 / 按钮可见），正文分 8 段左右逐步补全
export async function streamInfoCard(channel, msg, intent, meta) {
  const build = (content) => infoCard({ ...intent, content: content || '生成中…' }, meta);
  try {
    await channel.stream(
      msg.chatId,
      {
        card: {
          initial: build(''),
          producer: async (ctrl) => {
            const step = Math.max(24, Math.ceil(intent.content.length / 8));
            for (let i = step; ; i += step) {
              await ctrl.update(build(intent.content.slice(0, i)));
              if (i >= intent.content.length) break;
              await sleep(150);
            }
          },
        },
      },
      { replyTo: msg.messageId }
    );
  } catch (err) {
    console.error('[stream-info]', err);
    await channel.send(msg.chatId, { card: infoCard(intent, meta) }, { replyTo: msg.messageId }).catch(() => {});
  }
}

function streamFallbackCard(err) {
  return card({
    template: 'grey',
    icon: 'info',
    iconColor: 'grey',
    title: '回复生成失败',
    tags: [{ text: 'AI 回复', color: 'neutral' }],
    elements: [
      markdown(`刚才的流式回复没能生成：${err?.message ?? err}`),
      note('可直接重发一次；投票 / 报名 / 玩法不受影响'),
    ],
  });
}

// 「导出文档」文本指令：导出最近一个投票 / 报名会话
async function handleExportCommand(channel, msg) {
  const latest = getLatestSession();
  if (!latest || (latest.kind !== 'vote' && latest.kind !== 'form')) {
    await channel.send(
      msg.chatId,
      { text: '还没有可导出的投票或报名。先说「发起一个投票：A / B」或「收集团建报名」试试。' },
      { replyTo: msg.messageId }
    );
    return;
  }
  void runExportSession(channel, { chatId: msg.chatId, messageId: msg.messageId }, latest);
}

// 「对话式改卡」：AI 判定用户想修改最近的投票 / 报名卡时走这里。
// 应用 ops → 落库 → 原地更新原卡片（updateCard），并回复一条改动说明。
// 原卡片更新失败时降级为发一张新卡，保证改动一定可见。
async function handleEditIntent(channel, msg, intent) {
  const latest = getLatestSession();
  if (!latest || (latest.kind !== 'vote' && latest.kind !== 'form')) {
    await channel.send(
      msg.chatId,
      { text: '还没有可修改的投票或报名。先说「发起一个投票：A / B」创建一个，再让我改。' },
      { replyTo: msg.messageId }
    );
    return;
  }
  if (latest.closed) {
    await channel.send(
      msg.chatId,
      { text: `「${latest.kind === 'vote' ? latest.q : latest.title}」已经结束公布了，改不了了。要不再发起一个新的？` },
      { replyTo: msg.messageId }
    );
    return;
  }

  const { next, applied, rejected } = applyEditOps(latest, intent.ops);
  const lines = [
    ...applied.map((a) => `✅ ${a}`),
    ...rejected.map((r) => `⚠️ ${r}`),
  ];
  if (!applied.length) {
    await channel.send(msg.chatId, { text: `没能改这张卡：\n${lines.join('\n')}` }, { replyTo: msg.messageId });
    return;
  }

  setSession(latest.id, next);
  const rebuilt = next.kind === 'vote' ? buildVoteCard(next, next.id) : buildFormCard(next, next.id);
  let updated = false;
  if (next.messageId) {
    updated = await channel
      .updateCard(next.messageId, rebuilt)
      .then(() => true)
      .catch((err) => {
        console.error('[edit] 原地更新失败，降级发新卡：', err?.message ?? err);
        return false;
      });
  }
  if (!updated) {
    const sent = await channel.send(next.chatId || msg.chatId, { card: rebuilt }).catch(() => null);
    if (sent?.messageId) setSession(next.id, { ...next, messageId: sent.messageId });
  }
  await channel.send(msg.chatId, { text: `已更新卡片：\n${lines.join('\n')}` }, { replyTo: msg.messageId });
}

export function createBot(config) {
  const channel = lark.createLarkChannel({
    appId: config.appId,
    appSecret: config.appSecret,
    domain: lark.Domain.Feishu,
    loggerLevel: lark.LoggerLevel.info,
    includeRawEvent: true,
    // 流式卡片（打字机）占位文案：SDK 默认是英文 "Thinking..."
    outbound: { streamInitialText: '思考中…' },
  });

  channel.on('message', async (msg) => {
    const text = (msg.content || '').trim();
    if (!text) return;
    try {
      if (isRpsTrigger(text)) {
        await channel.send(msg.chatId, { card: buildRpsCard() }, { replyTo: msg.messageId });
        return;
      }
      // 玩法关键词快路由：抢在 AI 分类之前，点击/关键词直达玩法卡片
      const gameCard = gameCardFor(text);
      if (gameCard) {
        await channel.send(msg.chatId, { card: gameCard }, { replyTo: msg.messageId });
        return;
      }
      if (EXPORT_RE.test(text)) {
        await handleExportCommand(channel, msg);
        return;
      }
      if (!config.ai.key) {
        await channel.send(msg.chatId, { card: buildHomeCard(false) }, { replyTo: msg.messageId });
        return;
      }
      const t0 = Date.now();
      const intent = await generateCardIntent(text, config.ai);
      const genMeta = { model: config.ai.model || 'glm-4-flash', ms: Date.now() - t0 };
      if (intent.kind === 'game') {
        await channel.send(msg.chatId, { card: GAME_BUILDERS[intent.game]() }, { replyTo: msg.messageId });
      } else if (intent.kind === 'edit') {
        await handleEditIntent(channel, msg, intent);
      } else if (intent.kind === 'vote') {
        const session = newSession({
          kind: 'vote',
          q: intent.question,
          options: intent.options,
          tally: {},
          closed: false,
          votes: 0,
        });
        const sent = await channel.send(msg.chatId, { card: buildVoteCard(session, session.id) }, { replyTo: msg.messageId });
        // 记录卡片位置，供「对话式改卡」原地更新（edit 意图）使用
        setSession(session.id, { ...session, chatId: msg.chatId, messageId: sent?.messageId });
      } else if (intent.kind === 'form') {
        const session = newSession({
          kind: 'form',
          title: intent.title,
          fields: intent.fields,
          submissions: [],
          closed: false,
        });
        const sent = await channel.send(msg.chatId, { card: buildFormCard(session, session.id) }, { replyTo: msg.messageId });
        setSession(session.id, { ...session, chatId: msg.chatId, messageId: sent?.messageId });
      } else if (intent.kind === 'info') {
        await streamInfoCard(channel, msg, intent, genMeta);
      } else {
        // chat / help：普通对话走流式打字机卡片，像真 AI 聊天
        await streamChatReply(channel, msg, config.ai);
      }
    } catch (err) {
      console.error('[message]', err);
      await channel
        .send(msg.chatId, { text: `出错了：${err.message}` }, { replyTo: msg.messageId })
        .catch(() => {});
    }
  });

  // 卡片回调不走 channel.on('cardAction')：SDK 内置分发会丢弃 handler 返回值，
  // 而 2.0 卡片在交互锁窗口内 updateCard 会被服务端静默丢弃。改为覆盖
  // dispatcher 上的 card.action.trigger，把新卡片放进回调 ACK 原子换卡。
  return channel;
}

// 注意：SDK 的 dispatcher.register 对重复 key 只打 error 日志但仍会覆盖（后注册生效），
// 所以下面这行「this card.action.trigger handle is registered」是预期内的噪音，不是失败。
export function wireCardActionAck(channel) {
  channel.dispatcher.register({
    'card.action.trigger': async (raw) => {
      console.log('[cardAction] 事件到达 dispatcher：', JSON.stringify(raw).slice(0, 300));
      const evt = lark.normalizeCardAction(raw, { includeRaw: true });
      if (!evt) {
        console.warn('[cardAction] normalizeCardAction 返回空，原始事件见上一行');
        return undefined;
      }
      console.log(
        '[cardAction] 收到回调',
        JSON.stringify({ messageId: evt.messageId, value: evt.action?.value })
      );
      try {
        // 官方同步响应格式：{card: {type: "raw", data: 卡片JSON}}，返回裸卡片不会被渲染
        const next = await handleAction(channel, evt);
        return next ? { card: { type: 'raw', data: next } } : undefined;
      } catch (err) {
        console.error('[cardAction]', err);
        return undefined;
      }
    },
  });
  console.log('卡片回调已切换为 ACK 原子换卡模式');
}
