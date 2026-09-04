# 飞书 AI 绝活大会 · 参赛仓库

「对话即界面」：一句话在飞书群里生成并原地更新可交互卡片。本仓库包含两个独立子项目：

| 子项目 | 是什么 | 文档 |
| --- | --- | --- |
| [`chatbot/`](chatbot/README.md) | **主项目**：AGUI 卡片交互机器人（飞书长连接 BOT）。AI 投票/报名表/信息卡/对话式改卡/流式打字机，外加答题、人格测试、猜单词、剧情等预制玩法，全程不离开会话 | [chatbot/README.md](chatbot/README.md) |
| [`doubao-work/`](doubao-work/README.md) | **扩展包**：豆包工作（原飞书 aily）插件——MCP 连接器 + 技能包 + 伙伴组队，让豆包面板里的一句话直接变成飞书群里的可交互卡片 | [doubao-work/README.md](doubao-work/README.md) |

两者关系：`doubao-work/` 不持有飞书凭证，通过 `chatbot/` 暴露的本地控制 API 建卡；`chatbot/` 可完全独立运行，不依赖插件包。

## 快速开始

```bash
cd chatbot
cp .env.example .env   # 填入 FEISHU_APP_ID / FEISHU_APP_SECRET，可选填 AI_API_KEY
npm install
npm start
```

详细配置（飞书开发者后台、权限、事件订阅）见 [chatbot/README.md](chatbot/README.md)；豆包工作联动见 [doubao-work/README.md](doubao-work/README.md)。

## 参赛材料

- 冲奖规划与竞品扫描：[chatbot/docs/AWARDS-PLAN.md](chatbot/docs/AWARDS-PLAN.md)
- 3 分钟 demo 脚本：[chatbot/docs/DEMO.md](chatbot/docs/DEMO.md)
- 设计系统规范（所有卡片通用）：[chatbot/SPIRIT.md](chatbot/SPIRIT.md)
- 话题：**#飞书 AI 绝活大会**（小红书 / 抖音 / B 站 / 视频号任一）
