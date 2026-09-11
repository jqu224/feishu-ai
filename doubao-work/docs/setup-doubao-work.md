# 进阶接入手册：MCP 连接器 → 交互卡片 → 伙伴小队

> 本手册面向需要「豆包工作直接在飞书群发可点击卡片」的进阶场景。
> 只想用文档问答知识库（`XsiaoLung-doc-qa`）的话，不需要读这一篇——导入 Skill 就能用。

## 架构回顾

```
飞书群 ──长连接──► chatbot/（主 BOT：卡片交互回调、会话状态、发卡）
                         ▲
                         │  Bearer 控制 API（127.0.0.1:3777）
                         │
豆包工作 ──MCP──► doubao-work/（连接器：5 个工具，默认 127.0.0.1:3999/mcp）
```

卡片点击回调只会送到持有飞书长连接的 BOT 进程，所以插件必须走「豆包 → 本地控制 API → BOT 建卡」，不能直接发卡。

## 第 1 步：启动主 BOT（chatbot/）

`chatbot/` 的 `.env`：

```bash
MCP_ENABLED=1
CONTROL_PORT=3777
CONTROL_TOKEN=换成一段随机字符串
FEISHU_DEFAULT_CHAT_ID=oc_xxxxxxxx   # 默认目标群/单聊，不填则 MCP 调用必须传 chat_id
```

```bash
npm start
# 日志出现「豆包工作控制 API 已启动：http://127.0.0.1:3777」即成功
```

## 第 2 步：启动 MCP 连接器（doubao-work/）

```bash
cd doubao-work
npm install
cp .env.example .env   # CONTROL_TOKEN 填与主 BOT 一致的值；MCP_TOKEN 自定义一段随机字符串
npm start              # HTTP 模式（推荐，对应豆包工作自定义连接器）
# 或 npm run start:stdio   # 本地命令模式兜底
```

## 第 3 步：豆包工作里配置自定义连接器

豆包电脑版侧边栏 → **「技能 · 连接器 · 伙伴」** → 右上角「新建」→「新建自定义连接器」：

| 字段 | 值 |
|---|---|
| 服务器名称 | 小笼卡片 |
| 传输类型 | HTTP |
| 服务器 URL | `http://127.0.0.1:3999/mcp` |
| 自定义 Header 名称 | `Authorization` |
| 自定义 Header 值 | `Bearer ` + 你的 MCP_TOKEN（注意 Bearer 后有一个空格） |

保存后新建工作任务，在输入框下方「连接器」里勾选「小笼卡片」，试一句：

> 请用小笼卡片发起投票：下午茶喝什么？选项：奶茶、咖啡、果茶

若豆包工作拒绝保存 `http://127.0.0.1` 地址，改用 `npm run start:stdio` 的本地命令模式，或用 cloudflared 把 3999 端口临时转成 https 再填。

## 第 4 步：安装技能包

「技能 · 连接器 · 伙伴」→ 技能 → 新建/导入本地技能文件 → 选择 `skills/XsiaoLung-card/`（SKILL.md 会带出 references/）。装到你的工作伙伴上即可。

## 第 5 步：创建工作伙伴（单伙伴）

「我的伙伴」→ 新建伙伴，建议配置：

- **人设**：「你是收集与统计专员，负责在飞书群里发起投票和报名统计，主动记录 session_id 并汇报进度。」
- **技能**：勾选 `XsiaoLung-card`
- **连接器**：勾选「小笼卡片」

## 第 6 步：组队（Agents and Teams，可选）

「我的伙伴」→ 组队，官方机制是「复杂任务自动拆解为子任务并行接力，上一棒产出自动交给下一棒」。推荐编成（配置卡见 [`agents/`](../agents/)）：

| 伙伴 | 角色 | 用的能力 |
|---|---|---|
| 名单伙伴 | 生成/整理名单（如 100 个组员名字） | 豆包内置技能 |
| 小笼助手 | 接住名单 → 调 `create_roster_form` 建卡发群 → 汇报 session_id | `XsiaoLung-card` + 连接器 |

示例指令：「让名单伙伴生成我们组的 100 个成员名单，然后交给小笼助手在群里发起报名统计」。

## 冒烟验证清单

| 一句话测试 | 预期结果 |
|---|---|
| `npm run ping`（在 doubao-work/） | 输出 `✔ MCP 端点存活` + 5 个工具名 |
| 「发起投票：奶茶/咖啡/果茶」 | 飞书群里出现可点击投票卡，返回 session_id |
| 「报名统计到哪了」+ session_id | 返回提交人数 / 票数分布 |
| 「导出结果」+ session_id | 返回文本汇总（含每人明细） |

## 已知边界

- 自定义连接器仅在配置它的这台电脑生效（豆包工作官方限制），换设备要重配。
- 会话状态在主 BOT 内存里，BOT 重启后旧 `session_id` 失效，需要重新建卡。
- 卡片点击发生在飞书侧，豆包面板看不到点击明细，查进度一律 `get_session_status`。
