# xiaolong-doubao-work

小笼 AI 的**豆包工作插件包**（独立于主 BOT `../chatbot/` 的插件包）。让豆包工作里的「技能 · 连接器 · 伙伴」直接指挥小笼：在豆包面板里说一句话，飞书群里就出现可交互的投票/报名卡片，成员提交后回豆包问结果。

两个包的分工：

| 包 | 职责 | 凭证 |
|---|---|---|
| `../chatbot/`（主 BOT） | 飞书长连接、卡片交互回调、会话状态、发卡 | `FEISHU_APP_ID/SECRET` |
| `doubao-work/`（本包） | MCP 连接器 + 技能包，把豆包的意图翻译成对主 BOT 的建卡调用 | 不碰飞书凭证，只有两层本地 Token |

> 为什么这样分层：卡片点击回调只会送到持有飞书长连接的 BOT 进程，会话状态也在它的内存里。插件直接发卡会「建了卡但点不了」。所以插件 → 本地控制 API → BOT 建卡落库，交互链路零改动。

## 三个组成物（对应豆包工作「技能 · 连接器 · 伙伴」）

1. **连接器**：`src/server.js`，MCP server（Streamable HTTP，默认 `http://127.0.0.1:3999/mcp`），提供 5 个工具：`create_vote` / `create_roster_form` / `create_form` / `get_session_status` / `export_session_summary`。
2. **技能包**：`skills/xiaolong-card/`（SKILL.md + references），上传到豆包工作技能库，教伙伴何时调哪个工具。description 覆盖「投票/报名/表单/名单/统计/收集」等检索词，`/` 手动指定与 AI 自动匹配都能命中。
3. **伙伴（Buddy）**：豆包工作里的「工作伙伴」（原飞书 aily），绑定连接器 + 安装技能后成为一个「收集统计专员」；多个伙伴可组队（Teams），复杂任务自动拆解接力。

## 快速开始

### 1. 启动主 BOT（控制 API 随起）

主 BOT（`../chatbot/`）的 `.env`：

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

### 2. 启动本包 MCP 连接器

```bash
cd doubao-work
npm install
cp .env.example .env   # CONTROL_TOKEN 填与主 BOT 一致的值；MCP_TOKEN 自定义一段随机字符串
npm start              # HTTP 模式（推荐，对应豆包工作自定义连接器）
# 或 npm run start:stdio   # 本地命令模式兜底
```

### 3. 豆包工作里配置自定义连接器

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

### 4. 安装技能包

「技能 · 连接器 · 伙伴」→ 技能 → 新建/导入本地技能文件 → 选择 `skills/xiaolong-card/`（SKILL.md 会带出 references）。装到你的工作伙伴上即可。

### 5. 创建工作伙伴（单伙伴）

「我的伙伴」→ 新建伙伴，建议配置：

- **人设**：「你是收集与统计专员，负责在飞书群里发起投票和报名统计，主动记录 session_id 并汇报进度。」
- **技能**：勾选 `xiaolong-card`
- **连接器**：勾选「小笼卡片」

### 6. 组队（Agents and Teams）

「我的伙伴」→ 组队，官方机制是「复杂任务自动拆解为子任务并行接力，上一棒产出自动交给下一棒」。推荐编成：

| 伙伴 | 角色 | 用的能力 |
|---|---|---|
| 名单伙伴 | 生成/整理名单（如 100 个组员名字） | 豆包内置技能 |
| 小笼助手 | 接住名单 → 调 `create_roster_form` 建卡发群 → 汇报 session_id | 本连接器 + 技能 |

示例指令：「让名单伙伴生成我们组的 100 个成员名单，然后交给小笼助手在群里发起报名统计」。

## 工具一览

| 工具 | 参数 | 返回 |
|---|---|---|
| `create_vote` | `question`, `options`(2-8), `chat_id?` | `session_id` |
| `create_roster_form` | `names`(1-100 自动去重), `title?`, `chat_id?` | `session_id`, `roster_size` |
| `create_form` | `title`, `fields[]`(≤6, select 选项≤100), `chat_id?` | `session_id` |
| `get_session_status` | `session_id` | 票数分布 / 提交人数 |
| `export_session_summary` | `session_id` | 文本汇总（含每人明细） |

## 测试

```bash
npm test    # 单元（InMemoryTransport）+ 端到端（真 HTTP：MCP → 控制 API → 卡片落库）
```

## 已知边界

- 自定义连接器仅在配置它的这台电脑生效（豆包工作官方限制），换设备要重配。
- 会话状态在主 BOT 内存里，BOT 重启后旧 `session_id` 失效。
- 卡片点击发生在飞书侧，豆包面板看不到点击明细，查进度一律 `get_session_status`。
