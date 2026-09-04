# AGUI 卡片交互机器人（飞书 AI 绝活大会 · chatbot）

> 本目录是参赛仓库的**主项目**（飞书 BOT 本体）；仓库根目录与豆包工作插件包的说明见 [`../README.md`](../README.md) 和 [`../doubao-work/`](../doubao-work/README.md)。

一个「对话即界面」的飞书机器人：用户在群里说一句话，AI 在对话流里**实时生成并原地更新可交互卡片**——投票、报名、信息卡、小游戏都在卡片里完成，全程不跳转、不离开会话。

## 解决的问题

团队群里每天有大量轻量协作（下午茶投票、活动报名、接龙、抽签、暖场小游戏）。传统方式是打字接龙或跳问卷工具：信息散、易漏、难统计。

AGUI 把这类高频需求变成一句话：`@机器人 发起一个下午茶投票：奶茶 / 咖啡 / 果茶`，AI 生成投票卡，成员点击即投，结果原地统计；「结束并公布」还要求**人工确认**后才发布。

## 能力

**预制玩法中心（无 AI 也能玩，全程点卡片、不用打字）**：

- **豆包答题**：5 大进阶题库（飞书新手/进阶、豆包工作实操、Agent 架构、字节跳动编年史，每套 14 题由浅入深），题库入口 2×N 田字格排布、每套题独立主题色，答题选项 2×2 田字格排布，每局按 seed 独立乱序（正确答案不会总在 A，也不会出现 ABCD 循环），逐题判分 + 解析 + 结算称号（六边形战士 / 高级玩家 / 进阶练习生 / 默认选项选手）。Slogan：默认选项是给初学者的，我们学点高级的。
- **人格测试**：一套引擎跑四套题——MBTI 16 型（12 题）、DISC 职场人格（20 题四选一，D/I/S/C 计分，平分自动组合双主导型）、SBTI 沙雕人格（干饭 / 社牛 / 夜猫 / 搞钱组合出 16 种称号）、职场摸鱼指数（4 档结局）。
- **猜单词（hangman）**：CET 四六级词库（80 词、5-8 字母、带中文提示），底部 26 字母键盘，猜错 6 次判负，重复点不扣分。
- **互动剧情**：预制分支对话树《年下奶狗的深夜来电》，9 个选择节点、8 个结局，可反复重开刷结局。
- **变形球**：emoji 画面像素的点击变形彩蛋（球 → 心 → 星 → 方块）。
- **抽条冷知识**：预制冷知识池随机一条，一键换一条。

**AI 生成卡片与流式对话**：

- **AI 流式对话（打字机卡片）**：普通聊天 / 提问 → 飞书**原生流式卡片**逐字打出回复（cardkit v1 打字机，默认 70ms/字），像真 AI 聊天；超长自动滚动换卡，失败自动降级为静态卡。
- **AI 投票**：自然语言 → AI 生成投票卡 → 点击 → 原地统计 → 人工确认后公布结果，结束后用 **VChart 条形图**展示票数对比。
- **对话式改卡**：卡片发出后还能用自然语言继续改——「加个选项：果茶」「把标题换成周五下午茶」「报名表加一个部门字段」，AI 解析成受限 edit 操作集（加删选项/字段、改标题），原卡片**原地更新**并回复改动清单；越界操作（重复选项、删到不足 2 项、改已结束的卡）逐条拒绝并说明原因。
- **AI 报名表**：自然语言 → AI 生成表单卡（输入框 / 选择器）→ 提交 → 原地汇总 → 人工确认后公布结果。
- **AI 信息卡（生成式 UI）**：自然语言 → AI 生成标题、Markdown 正文与链接按钮；正文渐进式补全（骨架先出，按钮即刻可点）。
- **汇总一键导出**：投票 / 报名卡上的「导出为表格」按钮（经人工确认）或直接发「导出文档」→ 优先生成云空间在线表格（组织内可读），租户限制不可用时自动降级为 CSV 群文件，Excel / 飞书表格双击即开。
- **人工确认闸门**：发布类动作先出「确认/取消」卡，确认后才执行，满足「发送/删除/发布/改权限等保留人工确认」的完成度要求。
- **猜拳小游戏**：点击石头/剪刀/布，卡片原地更新胜负与累计战绩，支持重置。

## 免打字交互：底部导航

所有玩法卡片底部都有一行导航按钮（主页 / 答题 / 测试 / 猜词 / 剧情），点击即切换玩法；导航按钮**发新卡片**而不是原地换卡，误点不会打断进行中的游戏。游戏内部按钮才原地换卡（回调 ACK 原子更新）。

预设关键词可以直达玩法（也写进了 AI 意图的 `game` 类别，自然语言同样可达）：

| 发送 | 进入 |
| --- | --- |
| 答题 / 豆包 / 冷知识 / quiz | 豆包答题 |
| 测试 / MBTI / DISC / SBTI / 人格 | 人格测试 |
| 猜词 / 猜单词 / 单词 / hangman | 猜单词 |
| 剧情 / 小说 / 奶狗 / 恋爱 | 互动剧情 |
| 变形球 | 变形球 |
| 玩法 / 主页 / 菜单 / 游戏 / 帮助 | 玩法中心主页 |

### 输入框左下角的机器人菜单（可选，控制台配置）

要让会话输入框左下角出现真正的菜单按钮，在[飞书开发者后台](https://open.feishu.cn/app) → 应用能力 → 机器人 → **机器人菜单**里添加（代码无法设置，只能控制台配置）：

| 菜单名 | 指令 |
| --- | --- |
| 玩法中心 | `玩法` |
| 来一局答题 | `答题` |
| 测测人格 | `测试` |
| 猜单词 | `猜词` |
| 看剧情 | `剧情` |

指令与上表关键词一一对应，配置后点菜单即直达对应玩法卡片。

## 设计系统（Material 3 风格）

卡片视觉对齐 Material 3 Expressive 的表达方式，全部落在飞书卡片 v2 原生能力上：

- **零 emoji**：文案、按钮、标题一律不带 emoji，语义图标走飞书图标库（Lucide 风格圆角线性图标）或自定义上传图标；`test/design.test.js` 用 `\p{Extended_Pictographic}` 正则做回归兜底。唯一豁免是「变形球」——emoji 是该玩法的画面像素（球/心/星/方块本身），不算文案。
- **色彩角色**：header template 承担主题色（猜拳 indigo / 投票 turquoise / 报名 blue / 信息 violet / 确认 orange），对应 M3 的 primary 角色。`-50` 色阶只用 `grey-50` 作为统一的 surface-container 中性表面（statRow 统计块等），禁止多 hue pastel 拼接；语义强调只通过数字/文字的 `text_color` 表达（on-surface 角色）。计数/状态一律进 header 的 `text_tag_list`，body 不放重复的元信息行；同一卡片正文行图标保持单色调（该卡片主题色），禁止彩虹图标。
- **排版层级**：`statRow()` 输出「大数字 + notation 标签」的统计块；`textLine()` 支持字号档位（heading-0 ~ notation）与前缀图标，承担正文行。
- **组件语义**：状态胶囊进 header 的 `text_tag_list`（进行中 / 已结束 / 已玩 N 局），破坏性操作用 `danger_text` 文字按钮，主操作用 `primary` 填充按钮。

图标是两层策略（`src/icons.js`）：

1. 默认用飞书[图标库](https://open.feishu.cn/document/feishu-cards/enumerations-for-icons)的 `standard_icon` token（如 `refresh_outlined`、`poll_outlined`），零配置。
2. 要用纯 Lucide 资产时（如猜拳的 石头/剪刀/布，图标库无对应 token）：把 Lucide PNG（建议 96px）按语义命名放进 `assets/icons/`（`rock.png` = grab、`scissors.png` = scissors、`paper.png` = hand），运行 `npm run icons:upload` 上传生成 `icons.json`，对应语义自动切换为 `custom_icon`。

### 预览与测试

```bash
npm test             # 97 个用例：业务逻辑 + 玩法状态机 + 设计规范回归（零 emoji、图标白名单、模板枚举、behaviors）
npm run preview      # 导出全部卡片形态 JSON 到 preview/，粘贴到卡片搭建工具真机预览
npm run icons:upload # 可选：上传 assets/icons/*.png 生成 icons.json（Lucide 通道）
```

设计语言出处与映射见 [`docs/DESIGN.md`](docs/DESIGN.md)（Ant Design X RICH 范式 + Material 3 → 飞书卡片准则）；卡片美化与 CardKit / 模板玩法见 [`docs/CARD-KIT.md`](docs/CARD-KIT.md)。

## 免费接入哪个 AI

飞书机器人通道免费；AI 层接任意 OpenAI 兼容模型，只需改 `.env` 三行。免费推荐：

| 平台 | 模型 | 免费额度 | `AI_API_BASE` | `AI_MODEL` |
| --- | --- | --- | --- | --- |
| 智谱（推荐默认） | GLM-4-Flash | 永久免费 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 硅基流动 | Qwen3-8B 等 | 免费档 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen3-8B` |
| 阿里云百炼 | Qwen Flash | 新用户约 100 万 token/90 天 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-flash` |
| 火山方舟（豆包） | Doubao-lite | 新用户 50 万/30 天 | `https://ark.cn-beijing.volces.com/api/v3` | 你的 Endpoint ID |

> 火山方舟与飞书同属字节，讲「飞书 + 豆包」叙事最顺；但它的 `AI_MODEL` 要填在线推理的 Endpoint ID，略多一步。演示想零成本最省事用智谱 GLM-4-Flash。

## 快速开始

### 1. 飞书开发者后台

1. 打开 [飞书开放平台](https://open.feishu.cn/app)，创建「企业自建应用」。
2. 在「凭证与基础信息」复制 `App ID` 和 `App Secret`。
3. 添加应用能力 → 开通「机器人」。
4. 权限管理里开通：
   - 基础：`im:message`、`im:message:send_as_bot`
   - 流式打字机卡片：`cardkit:card:write`（卡片实体创建与流式更新）
   - 导出汇总文件（可选）：开通 `im:resource`（上传群文件需要）
5. 事件与回调 → 订阅方式选「使用长连接接收事件」，订阅事件：
   - `im.message.receive_v1`（接收消息）
   - `card.action.trigger`（卡片回传交互）
6. 创建版本并发布，确保机器人对你所在的单聊/群可见。

> 卡片为 JSON 2.0 结构 + 流式更新 + 图表组件，需要**飞书客户端 7.20+**（更低版本只能看到卡片标题）。

> 备注（2026-09-04 实测）：`drive import_tasks`（md/docx 导入在线文档）在本租户任务秒败且无错误信息，判定为租户级限制。导出已改为「CSV -> 在线表格（sheet）优先，失败自动降级为 CSV 群文件」：csv->sheet 走同一 import_tasks 通道，若该租户限制对它同样生效，会自动落到 CSV 群文件，不影响用户拿到数据。

### 2. 本地运行

```bash
cp .env.example .env   # 填入 FEISHU_APP_ID / FEISHU_APP_SECRET，可选填 AI_API_KEY
npm install
npm start
```

看到 `✅ AGUI 卡片机器人已启动（长连接模式）` 即成功。

### 3. 试用

- 发 `玩法` 或任意未知指令 → 玩法中心主页，所有玩法点按钮进入（也可以直接发 `答题` / `测试` / `猜词` / `剧情` / `变形球`）。
- 单聊/群里 `@机器人 猜拳` → 出拳，看战绩实时更新。
- 填了 `AI_API_KEY` 后：`@机器人 发起一个下午茶投票：奶茶 / 咖啡 / 果茶`。
- 报名表：`@机器人 收集团建报名：姓名、能否参加、忌口`。
- 随便聊天（如「用一句话解释什么是 AGUI」）→ 流式打字机卡片逐字回复。
- 投票 / 报名进行中或结束后点「导出为表格」，或直接发「导出文档」→ 群里收到在线表格链接（或降级为 .csv 群文件）+ 完成说明卡。

## 目录结构

```text
src/
  index.js          入口：加载配置、连接长连接
  bot.js            消息与卡片事件装配 + 玩法关键词快路由
  registry.js       动作注册表：按钮 value → 原地更新卡片 / 导航发新卡
  ai.js             LLM 意图生成与解析（OpenAI 兼容，含 game/chat/edit 意图 + SSE 流式 streamChat）
  edit.js           对话式改卡：edit ops 应用到在途投票/报名会话的纯函数（越界操作逐条拒绝）
  prompt.js         读取 prompts/*.md 作为系统提示词
  feishu-docs.js    汇总导出：Markdown 生成 + 群文件发送（含在线文档导出的保留实现）
  cards.js          卡片 v2 JSON 构建助手（M3 风格设计套件 + 底部导航 navRow）
  icons.js          图标注册表：standard_icon 默认 + icons.json 自定义（Lucide）覆盖
  rng.js            种子随机（mulberry32）：seed 复现乱序/抽题，答题乱序防规律
  state.js          按钮 value 编解码（无状态：状态随按钮传递）
  store.js          进程内会话状态（投票/报名按 sessionId 存储）
  control.js        本地控制 API：豆包工作插件（doubao-work/）的建卡通道
  actions/home.js   玩法中心主页
  actions/quiz.js   豆包答题（田字格选项 + 乱序判分状态机）
  actions/test.js   人格测试引擎（MBTI/DISC/SBTI/职场共用）
  actions/hangman.js 猜单词（26 字母位掩码键盘）
  actions/story.js  互动剧情（分支对话树）
  actions/ball.js   变形球彩蛋
  actions/fact.js   抽条冷知识
  actions/rps.js    猜拳
  actions/vote.js   投票
  actions/form.js   报名表
data/               预制内容：trivia 题库 / tests 题库 / words 词库 / stories 剧情 / facts 冷知识 / ball 帧
prompts/            可复用的 skill prompt 模板
scripts/            preview（导出卡片 JSON）/ icons:upload（上传 Lucide 图标）
preview/            npm run preview 生成的卡片 JSON（gitignore）
test/               node --test 单元测试 + 设计规范回归
SPIRIT.md           卡片设计系统与玩法结局反馈规范（所有载体通用）
```

> 豆包工作插件包已迁至仓库根目录的兄弟包 [`../doubao-work/`](../doubao-work/README.md)，不再属于本目录。

## 豆包工作插件（../doubao-work/）

BOT 与豆包工作（原飞书 aily 的「技能 · 连接器 · 伙伴」体系）的联动放在**同仓库的兄弟包** [`../doubao-work/`](../doubao-work/README.md)：MCP 连接器（5 个建卡/查询工具）+ SkillHub 格式技能包 + 伙伴组队方案。BOT 这边只需在 `.env` 开 `MCP_ENABLED=1` 并设 `CONTROL_TOKEN`，插件通过本地控制 API 远程建卡，飞书凭证不出 BOT 进程。配置步骤见 [../doubao-work/README.md](../doubao-work/README.md)。

## 参赛材料

- 3 分钟 demo 脚本与前后对比数据模板见 [`docs/DEMO.md`](docs/DEMO.md)。
- 视频发布到小红书 / 抖音 / B 站 / 视频号之一，带上话题 **#飞书 AI 绝活大会**。

## 设计要点

- **会话状态**：投票与报名表用进程内 `Map` 按 `sessionId` 存储，多人并发点击也能正确累加；玩法（猜拳/答题/测试/猜词/剧情）保持无状态、进度随按钮 value 往返，重启不丢。
- **单实例锁**：启动时在项目根写 `.bot-<appId>.pid`（按 App ID 隔离，不同 App 互不影响）。检测到同 App 活实例会直接退出并提示 `kill <PID>`——飞书长连接会把事件分流到多个实例，这是「按钮点了没反应」的头号原因；进程退出（含 Ctrl+C / kill）自动放锁，陈锁（PID 已死）自动覆盖。
- **回调秒回**：卡片交互只做本地确定性计算 + ACK 原子换卡，AI 调用只发生在消息入口，避开 3 秒超时；预制玩法零 AI 依赖，无 key 也能完整演示。
- **乱序防规律**：答题的选项顺序由 `seed` 派生的逐题独立排列决定（mulberry32），并做分布均衡校验（任一字母的正确次数 ≤ 题数 1/3），正确答案不会总落在 A，也不会出现 ABCD 循环；`test/quiz.test.js` 跑 200 局分布回归。
- **导航不打断**：底部导航按钮一律发新卡，游戏内部按钮才原地换卡，误点导航不会冲掉进行中的对局。
- **组件白名单**：AI 只输出受约束的意图 JSON（vote/form/info/game/chat），再由代码映射到卡片组件，不把 LLM 原始输出直接当 UI。
- **流式即聊天感**：chat/help 意图走 cardkit 流式卡片（SDK 封装节流与滚动换卡），AI 流式增量直接管道进打字机；只要输出过一段就不降级，半截回复优于报错。
- **导出走后台**：导出涉及文件上传（秒级），回调里先 ACK「导出中」卡满足 3 秒超时，完成后另发文件消息 + 完成卡，不与确认卡的兜底重放竞争。
