export function loadConfig(env = process.env) {
  const appId = env.FEISHU_APP_ID?.trim();
  const appSecret = env.FEISHU_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error(
      '缺少 FEISHU_APP_ID / FEISHU_APP_SECRET。请复制 .env.example 为 .env 并填写开发者后台凭证。'
    );
  }
  return {
    appId,
    appSecret,
    ai: {
      base: env.AI_API_BASE?.trim() || 'https://open.bigmodel.cn/api/paas/v4',
      key: env.AI_API_KEY?.trim() || '',
      model: env.AI_MODEL?.trim() || 'glm-4-flash',
    },
    // 豆包工作插件通道：开启后本地控制 API 随机器人启动（详见 doubao-work/README.md）
    control: {
      enabled: env.MCP_ENABLED === '1',
      port: Number(env.CONTROL_PORT) || 3777,
      token: env.CONTROL_TOKEN?.trim() || '',
      defaultChatId: env.FEISHU_DEFAULT_CHAT_ID?.trim() || '',
    },
  };
}
