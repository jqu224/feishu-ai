// 小笼 AI 的豆包工作 MCP 连接器。
// 传输：默认 Streamable HTTP（127.0.0.1:3999/mcp，豆包工作自定义连接器的标准接法）；
// `--stdio` 切 stdio（本地命令模式兜底）。工具全部代理到主 BOT 的控制 API。
import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createControlClient } from './client.js';

const TOOL_DEFS = [
  {
    name: 'create_vote',
    description: '在飞书群里发起一张可交互投票卡（成员点击即投、原地统计）。返回 session_id，可用 get_session_status 查询实时票数。',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '投票问题，如「下午茶喝什么？」' },
        options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8, description: '选项 2-8 个' },
        chat_id: { type: 'string', description: '目标群/单聊 chat_id（oc 开头），不填用默认会话' },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'create_roster_form',
    description: '全员报名统计表：给定名单（≤100 人），在群里发一张「姓名下拉 + 能否参加」报名卡，按人去重统计。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '表单标题，默认「报名统计」' },
        names: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100, description: '成员名单，1-100 个，自动去重' },
        chat_id: { type: 'string', description: '目标群/单聊 chat_id，不填用默认会话' },
      },
      required: ['names'],
    },
  },
  {
    name: 'create_form',
    description: '自定义报名/收集表单卡。字段支持单行文本与下拉选择（下拉选项 ≤100 个）。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '表单标题' },
        fields: {
          type: 'array',
          maxItems: 6,
          description: '字段列表（≤6 个）',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: '字段名，如「姓名」' },
              type: { type: 'string', enum: ['text', 'select'], description: '文本或下拉' },
              required: { type: 'boolean', description: '是否必填' },
              options: { type: 'array', items: { type: 'string' }, description: 'select 字段的选项（≤100 个）' },
            },
            required: ['label'],
          },
        },
        chat_id: { type: 'string', description: '目标群/单聊 chat_id，不填用默认会话' },
      },
      required: ['title', 'fields'],
    },
  },
  {
    name: 'get_session_status',
    description: '查询投票/报名会话的实时状态（票数分布或提交人数）。',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: '创建工具返回的 session_id' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'export_session_summary',
    description: '导出投票/报名会话的文本汇总（含每人明细），适合直接粘贴到文档或继续加工。',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: '创建工具返回的 session_id' },
      },
      required: ['session_id'],
    },
  },
];

// control 依赖注入：生产传 createControlClient() 的实例，测试传 mock
export function createMcpServer({ control, name = 'XsiaoLung-doubao-work' }) {
  const server = new Server({ name, version: '0.1.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      let data;
      if (name === 'create_vote') {
        if (!args.question || !Array.isArray(args.options) || args.options.length < 2) {
          throw new Error('question 和至少 2 个 options 必填');
        }
        data = await control.createVote(args);
      } else if (name === 'create_roster_form') {
        if (!Array.isArray(args.names) || !args.names.length) {
          throw new Error('names 至少需要 1 个名字');
        }
        data = await control.createRosterForm(args);
      } else if (name === 'create_form') {
        if (!args.title || !Array.isArray(args.fields) || !args.fields.length) {
          throw new Error('title 和至少 1 个 field 必填');
        }
        data = await control.createForm(args);
      } else if (name === 'get_session_status') {
        if (!args.session_id) throw new Error('session_id 必填');
        data = await control.getSession(args.session_id);
      } else if (name === 'export_session_summary') {
        if (!args.session_id) throw new Error('session_id 必填');
        data = await control.exportSession(args.session_id);
      } else {
        return { content: [{ type: 'text', text: `未知工具：${name}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `调用失败：${err.message}` }], isError: true };
    }
  });

  return server;
}

export function loadEnv(env = process.env) {
  return {
    controlUrl: env.CONTROL_URL?.trim() || 'http://127.0.0.1:3777',
    controlToken: env.CONTROL_TOKEN?.trim() || '',
    mcpToken: env.MCP_TOKEN?.trim() || '',
    mcpPort: Number(env.MCP_PORT) || 3999,
    stdio: process.argv.includes('--stdio') || env.MCP_TRANSPORT === 'stdio',
  };
}

// 无状态 HTTP 模式：每个请求独立的 server + transport（官方 stateless 模式，
// 单个 transport 复用会在第二条请求上报 500）
// port：显式传入的监听端口；未传时回退 mcpPort（main 的 cfg 键名），两者都没有则 0=随机端口
export async function startHttpMcp({ port, mcpPort, mcpToken, control }) {
  const listenPort = port ?? mcpPort;
  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/mcp') {
      res.writeHead(404).end();
      return;
    }
    if (req.method !== 'POST' || (mcpToken && req.headers.authorization !== `Bearer ${mcpToken}`)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized（检查连接器的 Authorization Header 与 MCP_TOKEN 是否一致）' }));
      return;
    }
    let body;
    for await (const chunk of req) body = body ? Buffer.concat([body, chunk]) : chunk;
    try {
      const server = createMcpServer({ control });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body ? JSON.parse(body.toString('utf8')) : undefined);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });

  await new Promise((resolve) => httpServer.listen(listenPort, '127.0.0.1', resolve));
  return httpServer;
}

export async function main(env = process.env, argv = process.argv) {
  const cfg = { ...loadEnv(env), stdio: argv.includes('--stdio') || env.MCP_TRANSPORT === 'stdio' };
  const control = createControlClient(cfg);
  if (cfg.stdio) {
    const server = createMcpServer({ control });
    await server.connect(new StdioServerTransport());
    console.error('XsiaoLung-doubao-work MCP 已启动（stdio）');
  } else {
    const httpServer = await startHttpMcp(cfg);
    // 打印实际绑定的端口（listen(0) 会随机分配），避免日志与真实端口不一致
    const bound = httpServer.address();
    console.log(`XsiaoLung-doubao-work MCP 已启动：http://127.0.0.1:${bound.port}/mcp`);
    console.log(`上游控制 API：${cfg.controlUrl}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
