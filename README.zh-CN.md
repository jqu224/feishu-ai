<p align="center">
  <a href="./README.md"><img src="https://img.shields.io/badge/lang-English-8b949e?style=for-the-badge&labelColor=0d1117" alt="English" /></a>
  <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/lang-中文-1f6feb?style=for-the-badge&labelColor=0d1117" alt="中文" /></a>
</p>

<h1 align="center">feishu-ai</h1>

<p align="center">
  <strong>飞书开放平台上的 Agent 原生卡片界面</strong><br />
  <em>对话即界面 — 可交互卡片在会话内生成、流式输出、原地更新。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-chatbot%20167%20pass-22c55e?style=flat-square&logo=vitest&logoColor=white" alt="chatbot tests" />
  <img src="https://img.shields.io/badge/tests-doubao--work%208%20pass-22c55e?style=flat-square&logo=vitest&logoColor=white" alt="doubao-work tests" />
  <img src="https://img.shields.io/badge/verify-design%20%7C%20control%20%7C%20MCP-0ea5e9?style=flat-square" alt="verify" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Feishu-Card%20v2%20%2B%20CardKit-00d6b9?style=flat-square" alt="Feishu Card" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" />
</p>

<p align="center">
  <strong>飞书 AI 绝活大会</strong>参赛仓库 · 话题 <code>#飞书AI绝活大会</code>
</p>

---

## 定位

多数飞书机器人回复的是**文字**。本项目回复的是 **Agent UI**：

| 层级 | 在飞书上的含义 |
| --- | --- |
| **生成 Generate** | 自然语言 → 卡片 JSON（投票 / 报名 / 信息卡），经 OpenAI 兼容接口 |
| **流式 Stream** | CardKit 打字机流式聊天气泡（失败自动降级为静态卡） |
| **原地更新 Mutate** | 交互回调 + ACK 原子换卡 — 不跳转、不刷屏新消息 |
| **人工确认 HITL** | 发布 / 导出 / 破坏性操作必须先过确认卡 |
| **结果沉淀 Persist** | 汇总导出飞书表格 / 云文档（租户限制时降级 CSV） |

技术栈对齐官方能力：[飞书 Node SDK](https://www.npmjs.com/package/@larksuiteoapi/node-sdk) · 卡片 v2 · 长连接机器人 · 可选 [豆包工作](https://www.feishu.cn/content/article/7677519271848610746) MCP 连接器。

## 仓库结构

| 子项目 | 职责 | 文档 |
| --- | --- | --- |
| [`chatbot/`](chatbot/README.md) | **主项目** — 长连接 BOT、卡片交互、会话 store、AI + 预制玩法 | [chatbot/README.md](chatbot/README.md) |
| [`doubao-work/`](doubao-work/README.md) | **技能包（主推）** — 文档问答知识库 Skill（公开飞书文档 → 问答，零门槛）+ 可选 MCP 连接器/交互卡片 | [doubao-work/README.md](doubao-work/README.md) |
| [`knowledge/`](knowledge/README.md) | 答题 CSV 题库（飞书 / 豆包 / Agent / 行业编年史） | [knowledge/README.md](knowledge/README.md) |

**分层边界（刻意设计）：** 卡片点击回调只会到达持有飞书 WebSocket 的进程。`doubao-work/` 不直连飞书，只调 `chatbot/` 的本机控制 API，交互状态才正确。

```text
飞书群 ──长连接──► chatbot/（Card v2 · CardKit · store）
                         ▲
                         │  Bearer 控制 API（127.0.0.1）
                         │
豆包工作 ──MCP──► doubao-work/（连接器 + 技能）
```

## 能力速览

**AI 生成卡片（需要 `AI_API_KEY`）**

- 投票 · 报名/名单表 · 生成式信息卡 · 对话式改卡（「加个选项：果茶」）
- 流式对话 · 确认闸门 · VChart 结果 · 一键导出

**预制玩法中心（可离线，无需 AI）**

- 进阶题库 · MBTI / DISC / SBTI / 摸鱼指数 · 猜单词 · 分支剧情 · 猜拳 · 冷知识

**设计系统**

- Material 3 角色映射到 Card v2 token · 文案零装饰 emoji（`design.test.js` 回归）· Lucide 风格图标（图标库 / 自定义上传）

## 校验 Verify

静态校验快照（Node 内置 test runner）：

| 套件 | 命令 | 结果 |
| --- | --- | --- |
| chatbot | `cd chatbot && npm test` | **167 pass / 0 fail** |
| doubao-work | `cd doubao-work && npm test` | **8 pass / 0 fail** |
| 设计回归 | `chatbot/test/design.test.js` 的 emoji / 布局契约 | 已覆盖 |
| 控制 API | 鉴权 · 建投票/表单 · 名单 ≤100 | 已覆盖 |
| MCP 往返 | tools/list · create_* · 会话状态/导出 | 已覆盖 |

```bash
cd chatbot && npm test
cd ../doubao-work && npm test
```

## 快速开始

```bash
cd chatbot
cp .env.example .env   # 填入 FEISHU_APP_ID / FEISHU_APP_SECRET，可选 AI_API_KEY
npm install
npm start
```

飞书开发者后台（权限、事件、机器人菜单）见 [chatbot/README.md](chatbot/README.md)。  
豆包工作连接器与伙伴组队见 [doubao-work/README.md](doubao-work/README.md)。

## 参赛材料

- 冲奖规划与竞品扫描 — [chatbot/docs/AWARDS-PLAN.md](chatbot/docs/AWARDS-PLAN.md)
- 3 分钟 demo 脚本 — [chatbot/docs/DEMO.md](chatbot/docs/DEMO.md)
- 卡片设计契约 — [chatbot/SPIRIT.md](chatbot/SPIRIT.md) · [chatbot/docs/DESIGN.md](chatbot/docs/DESIGN.md)
- **双赛道投稿材料（真实实践 / Skill 创作）** — [submissions/README.md](submissions/README.md)

## 许可证

[MIT](LICENSE)
