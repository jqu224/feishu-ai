<div align="center"><img src="docs/assets/hero.svg" width="100%" alt="feishu-ai — 飞书开放平台上的 Agent 原生卡片界面" /></div>

<div align="center">
<pre>~/feishu-ai (main*)  chatbot 167 通过 · doubao-work 8 通过  卡片v2 · CardKit · MCP</pre>
</div>

<div align="center">

[![English](https://img.shields.io/badge/lang-English-8b949e?style=for-the-badge&labelColor=0d1117)](./README.md)
[![中文](https://img.shields.io/badge/lang-%E4%B8%AD%E6%96%87-002566?style=for-the-badge&labelColor=0d1117)](./README.zh-CN.md)

</div>

## feishu-ai

**飞书开放平台上的 Agent 原生卡片界面**
—— 对话即界面：可交互卡片在会话内生成、流式输出、原地更新。

[![tests chatbot](https://img.shields.io/badge/tests-chatbot%20167%20pass-002566?style=flat-square&logo=vitest&logoColor=white)](chatbot/)
[![tests doubao-work](https://img.shields.io/badge/tests-doubao--work%208%20pass-002566?style=flat-square&logo=vitest&logoColor=white)](doubao-work/)
[![verify](https://img.shields.io/badge/verify-design%20%7C%20control%20%7C%20MCP-002566?style=flat-square)](chatbot/test/design.test.js)
[![node](https://img.shields.io/badge/node-%3E%3D18-555555?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![card](https://img.shields.io/badge/Feishu-Card%20v2%20%2B%20CardKit-555555?style=flat-square)](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-structure)
[![license](https://img.shields.io/badge/license-MIT-555555?style=flat-square)](LICENSE)

多数飞书机器人回复的是**文字** —— 本项目回复的是 **Agent UI**。

## 上手三步

| | |
| --- | --- |
| **读什么** | [chatbot/README.md](chatbot/README.md) —— 飞书开发者后台配置（权限、事件、机器人菜单）与架构导览 |
| **怎么跑** | `cd chatbot && cp .env.example .env && npm install && npm start` —— 长连接接入，跑起来即用 |
| **产出在哪** | 玩法卡片直接发进飞书群；`npm run preview` 把所有卡片形态导出为 JSON 到 `chatbot/preview/` |

---

## 定位

| 层级 | 在飞书上的含义 |
| --- | --- |
| **生成 Generate** | 自然语言 → 卡片 JSON（投票 / 报名 / 信息卡），经 OpenAI 兼容接口 |
| **流式 Stream** | CardKit 打字机流式聊天气泡（失败自动降级为静态卡） |
| **原地更新 Mutate** | 交互回调 + ACK 原子换卡 — 不跳转、不刷屏新消息 |
| **人工确认 HITL** | 发布 / 导出 / 破坏性操作必须先过确认卡 |
| **结果沉淀 Persist** | 汇总导出飞书表格 / 云文档（租户限制时降级 CSV） |

## 链路

```text
飞书群 ──长连接──► chatbot/（Card v2 · CardKit · store）
                         ▲
                         │  Bearer 控制 API（127.0.0.1）
                         │
豆包工作 ──MCP──► doubao-work/（连接器 + 技能）
```

| 阶段 | 路径 | 契约 / 闸门 |
| --- | --- | --- |
| **1 · 事件** | 飞书群 → `chatbot/`（WebSocket 长连接） | 卡片点击回调只会到达持有连接的进程 |
| **2 · 生成** | 自然语言 → 卡片 JSON（投票 / 表单 / 信息卡） | 需要 `AI_API_KEY`；schema 与 header 模板枚举校验 |
| **3 · 交互** | 按钮 value `{a, p}` 原样往返 | 本地确定性处理 → 3 秒回调预算内 ACK 原子换卡 |
| **4 · 扩展** | 豆包工作 → MCP → `doubao-work/` → 本机控制 API（Bearer） | `doubao-work/` 不直连飞书；会话状态留在 `chatbot/` store |
| **5 · 沉淀** | store → 飞书表格 / 云文档导出（降级 CSV） | 发布 / 导出 / 破坏性操作必须先过**确认卡** |

## 仓库结构

| 子项目 | 职责 | 文档 |
| --- | --- | --- |
| [`chatbot/`](chatbot/README.md) | **主项目** — 长连接 BOT、卡片交互、会话 store、AI + 预制玩法 | [chatbot/README.md](chatbot/README.md) |
| [`doubao-work/`](doubao-work/README.md) | **技能包（主推）** — 文档问答知识库 Skill（公开飞书文档 → 问答，零门槛）+ 可选 MCP 连接器/交互卡片 | [doubao-work/README.md](doubao-work/README.md) |
| [`knowledge/`](knowledge/README.md) | 答题 CSV 题库（飞书 / 豆包 / Agent / 行业编年史） | [knowledge/README.md](knowledge/README.md) |

## 契约与校验

| 契约 | 执行方 |
| --- | --- |
| 卡片文案零装饰 emoji（字符画豁免） | `chatbot/test/design.test.js` |
| 图标只能来自注册表，同卡不重复 | `chatbot/test/design.test.js` |
| header 模板在合法枚举内，话题配色符合色板 | `chatbot/test/design.test.js` |
| 选项卡配色类别内互不重复（色板共 12 色） | `chatbot/test/design.test.js` |
| 所有交互按钮都带 `behaviors` | `chatbot/test/design.test.js` |
| 控制 API Bearer 鉴权 · 名单 ≤ 100 · 404 兜底 | `chatbot/test/control.test.js` |
| MCP 往返：tools/list · create_* · 会话状态/导出 | `doubao-work` e2e |

| 套件 | 结果 |
| --- | --- |
| chatbot（`npm test`） | **167 pass / 0 fail** |
| doubao-work（`npm test`） | **8 pass / 0 fail** |

## 用法

```bash
cd chatbot
cp .env.example .env   # 填入 FEISHU_APP_ID / FEISHU_APP_SECRET，可选 AI_API_KEY
npm install
npm start

npm test               # 167 个用例：业务逻辑 + 玩法状态机 + 设计规范回归
npm run preview        # 导出全部卡片形态 JSON，粘贴到卡片搭建工具真机预览
```

```bash
cd doubao-work && npm test   # 8 个用例：连接器单元 + e2e
```

## 给消费者与平台

| 消费者 | 你能得到什么 | 入口 |
| --- | --- | --- |
| **豆包工作用户** | XsiaoLung 技能包：文档问答知识库（主推，零配置）+ 交互卡片 + 部署/上手指南 | [doubao-work/README.md](doubao-work/README.md) |
| **飞书群管理员** | 可离线运行的预制玩法中心 —— 题库、人格测试、猜单词、剧情、猜拳 | [chatbot/README.md](chatbot/README.md) |
| **Agent / 出题开发者** | 飞书、豆包、Agent 与行业编年史 CSV 题库 | [knowledge/README.md](knowledge/README.md) |

## 参赛材料

| 材料 | 链接 |
| --- | --- |
| 冲奖规划与竞品扫描 | [chatbot/docs/AWARDS-PLAN.md](chatbot/docs/AWARDS-PLAN.md) |
| 3 分钟 demo 脚本 | [chatbot/docs/DEMO.md](chatbot/docs/DEMO.md) |
| 卡片设计契约 | [chatbot/SPIRIT.md](chatbot/SPIRIT.md) · [chatbot/docs/DESIGN.md](chatbot/docs/DESIGN.md) |
| 双赛道投稿材料（真实实践 / Skill 创作） | [submissions/README.md](submissions/README.md) |

## 许可证

[MIT](LICENSE)
