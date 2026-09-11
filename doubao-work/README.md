# xiaolong-doubao-work

小笼 AI 的**豆包工作技能包**。核心是一个**零门槛的 Skill**：把任何一份公开的飞书文档变成可问答的知识库——导入技能、粘一个链接、随便问。**不需要 MCP、不需要本地服务、不需要写代码**，豆包工作内置的联网能力就够了。

> 为什么是 Skill 优先：MCP 连接器对普通人太难、传播性差。而「公开文档链接 → 问答知识库」人人都能用，也是社区里验证过的用法（很多 HTML 应用就是把飞书文档当后端数据库）。

## 技能清单

| 技能 | 用途 | 门槛 |
|---|---|---|
| **[`xiaolong-doc-qa`](skills/xiaolong-doc-qa/)**（主推） | 公开飞书文档 → 问答知识库：抓取、分块、建索引、带出处回答、基于文档出题 | **零门槛**：导入 Skill + 一个公开链接，纯内置能力 |
| [`xiaolong-card`](skills/xiaolong-card/)（进阶） | 飞书群里发起可交互投票/报名/表单卡片 | 需 MCP 连接器 + 主 BOT，适合动手党 |

## 快速开始（30 秒上手）

### 1. 导入技能

豆包电脑版侧边栏 → **「技能 · 连接器 · 伙伴」** → 技能 → 新建/导入本地技能文件 → 选择 `skills/xiaolong-doc-qa/`（SKILL.md 会带出 references/）。也可以在豆包工作中用「技能」搜索关键词 `文档问答 / 知识库` 自动匹配。

### 2. 给一个公开文档链接

把你要问答的飞书文档分享权限设为**「互联网上获得链接的人可阅读」**，然后把链接发给豆包工作：

> 把这篇文章变成知识库：https://xxx.feishu.cn/docx/xxxxx

豆包工作会先给你一份「知识库索引」（分块清单），确认后就能提问了。

### 3. 开始问答

> 直播里推荐了哪些 PPT 技能？
> 基于这份文档出 5 道题
> 总结这份文档的要点

每条回答都带出处（哪个章节），还能基于文档出题做考核。一次真实运行示例见 [`xiaolong-doc-qa/references/example-run.md`](skills/xiaolong-doc-qa/references/example-run.md)。

## 进阶（可选）：交互卡片 + MCP 连接器

想让豆包工作直接在飞书群里发**可点击的投票/报名卡片**（点击即投、原地统计），才需要走到这一层。`xiaolong-card` 技能 + `src/` MCP 连接器（5 个工具）负责这件事，依赖主 BOT（`../chatbot/`）的控制 API。完整接法见 **[docs/setup-doubao-work.md](docs/setup-doubao-work.md)**。

```
飞书群 ──长连接──► chatbot/（Card v2 · 卡片交互回调）
                         ▲
                         │  Bearer 控制 API（127.0.0.1）
                         │
豆包工作 ──MCP──► doubao-work/（连接器 + xiaolong-card 技能）
```

## 工具一览（进阶连接器）

| 工具 | 参数 | 返回 |
|---|---|---|
| `create_vote` | `question`, `options`(2-8), `chat_id?` | `session_id` |
| `create_roster_form` | `names`(1-100 自动去重), `title?`, `chat_id?` | `session_id`, `roster_size` |
| `create_form` | `title`, `fields[]`(≤6, select 选项≤100), `chat_id?` | `session_id` |
| `get_session_status` | `session_id` | 票数分布 / 提交人数 |
| `export_session_summary` | `session_id` | 文本汇总（含每人明细） |

## 打包与测试

```bash
npm run pack:skills     # 校验 frontmatter 并打包 skills/* → dist/*.zip（个人端导入/企业端上传都用它）
npm test                # 连接器单元 + 端到端（MCP → 控制 API → 卡片落库）
npm run ping            # 探测本地 MCP 端点是否存活（接进阶连接器时自查用）
```

打包产物：`dist/xiaolong-doc-qa.zip`（零门槛技能）· `dist/xiaolong-card.zip`（进阶技能）。

## 目录结构

```
doubao-work/
├── skills/
│   ├── xiaolong-doc-qa/          # 【主推】文档问答知识库：SKILL.md + references/（示例运行 + 排查）
│   └── xiaolong-card/            # 【进阶】飞书群交互卡片：SKILL.md + references/examples.md
├── src/                          # 进阶 MCP 连接器（server.js / client.js）
├── scripts/
│   ├── pack-skills.mjs           # 技能打包 + 校验
│   └── ping.mjs                  # MCP 端点存活探测
├── docs/
│   └── setup-doubao-work.md      # 进阶接入手册（连接器 → 技能 → 伙伴）
├── test/                         # 单元 + 端到端测试
└── package.json
```

## 已知边界

- 文档问答依赖文档公开：链接必须是「互联网上获得链接的人可阅读」，否则抓不到正文（可改粘贴内容）。
- 进阶连接器仅在配置它的这台电脑生效（豆包工作官方限制），换设备要重配；交互卡片点击发生在飞书侧，查进度走 `get_session_status`。
- 会话状态在主 BOT 内存里，BOT 重启后旧 `session_id` 失效。
