# 设计语言笔记：Ant Design X + Material 3 → 飞书卡片

> 回答「把 Ant Design 新出的 AI Chatbox 设计语言、谷歌 Material 3 的内容给我看一下」，
> 并落地成**本机器人卡片系统**（`src/cards.js`）的设计准则。
> 两个体系都不引入任何实际依赖——借思想，不借组件。

## 一、Ant Design X（@ant-design/x）

**是什么**：Ant Design 官方的 AI 界面组件库（React），slogan「AI 体验新秩序」，定位「AGI 混合界面（GUI + 自然会话）」，设计理论基础是 **RICH 范式**。当前 2.x（如 2.9.0）要求 antd v6 + React ≥18；官网 https://x.ant.design（中文路径带 `-cn`）。

### RICH 范式（与我们最相关的部分）

| 角色 | 含义 | 在本项目里的对应 |
| --- | --- | --- |
| **R**ole 角色 | 给 AI 明确人设与边界 | `prompts/chat.md` 的机器人人设；卡片 header 图标 + 主题色区分角色（投票 / 报名 / 玩法） |
| **I**ntent 意图 | 识别用户意图再决定交互形态 | `prompts/card-generator.md` 意图分类：vote / form / info / game / chat |
| **C**hat 会话 | 对话是主界面，状态在会话流里演进 | 卡片原地更新 = 会话内状态演进；流式打字机 = 会话感 |
| **H**ybrid-UI 混合界面 | 自然语言与 GUI 组件混合 | 一句话生成投票卡；预制玩法 + 底部导航补足「不想说话」的场景 |

### 组件清单（设计参考）

- **Bubble**（对话气泡：variant/shape/打字机/流式标记）、**Sender**（输入框：语音/附件/快捷键）、**Conversations**（会话列表）、**Welcome / Prompts**（空态引导与预设问题）、**ThoughtChain / Think**（思维链可视化）、**Attachments**、**Suggestion**、**Actions**、**CodeHighlighter**、**Sources**。
- 数据流：`@ant-design/x-sdk` 的 useXChat（会话状态机，消息 status：local/loading/updating/success/error/abort）+ XRequest/XStream（SSE 流式请求）。
- 官方口径：**主要面向桌面端**，移动端建议 Grid 断点 + small 尺寸自查。

### 借鉴到飞书卡片的点

1. **流式是 AI 界面的第一交互**：Bubble 的 typing/streaming 对应飞书流式卡片（cardkit 打字机），`SSEParser` + `streamChat` 即 XRequest/XStream 的最小等价物。
2. **状态机思维**：消息有生命周期（生成中 / 成功 / 中断），卡片也一样——我们的「导出中 → 完成 / 失败」三态卡、流式卡失败时 SDK 自动追加「生成中断」脚注，都是这个思想。
3. **空态引导（Welcome/Prompts）**：玩法中心主页卡就是机器人的 Welcome 页——列能力 + 一键按钮，不让用户面对空输入框。
4. **混合界面**：能点的不让打字（底部导航），能说一句的不让填表（自然语言生成卡片）。

## 二、Material 3 / Material You

**是什么**：Google 的设计系统升级版（m3.material.io），核心是动态取色与色调表面；2025 年进化为 **M3 Expressive**（弹簧动效、形状变形、强调排版）。

### 核心机制

- **Tonal Palette**：每个色相生成 tone 0–100 的色阶；色彩按**角色**取名：primary / secondary / tertiary / error + 各自的 on-* 前景色，保证对比度。
- **Surface 层级**：surface-container 五级（lowest / low / 默认 / high / highest），light 模式 tone 100→90 递减变暗，**dark 模式 tone 4→22 递增变亮**——暗色下「越上层越亮」，用色调海拔代替阴影表达层级。
- **Type Scale**：Display / Headline / Title / Body / Label 五角色 × Large/Medium/Small 共 15 档。
- **Shape Scale**：圆角档位 4 / 8 / 12 / 16 / 28dp（Material Web 简化为 4 / 6 / 8）。
- **State Layers**：hover/press 用半透明主色叠加表达状态。
- Web 实现现状：`@material/web` 已进入维护模式（**M3 Expressive 未在 Web 落地**）；MUI 也没有完整的 M3 支持——纯 Web 项目想用 M3 多靠 `@material/material-color-utilities` 生成 token。

### 借鉴到飞书卡片的点（`src/cards.js` 的设计纪律）

| M3 机制 | 飞书卡片落地 |
| --- | --- |
| 色彩角色制 | header `template` = primary（按玩法分色）；语义强调只走 `text_color`（on-surface 角色），**禁止给表面乱上 hue** |
| 中性 surface-container | 统计块等容器一律 `grey-50` 色阶（`statRow`），不搞多色 pastel 拼接——dark 模式下它自动映射为对应的深色表面 |
| Type Scale 档位 | `textLine` 的 `text_size` 档位（heading-2 大数字 / notation 辅助标签）对应 M3 的 Display/Label 分层 |
| 层级进结构不进阴影 | 状态、计数进 header `text_tag_list`（chip），正文不重复元信息——卡片的信息层级靠「header → 正文 → note」三段而不是装饰 |
| 单色纪律 | 同一卡片正文行图标保持主题色单色调，禁止彩虹图标 |
| 克制动效 | M3 Expressive 的弹簧感在卡片里没有对应物；动效预算全部给**流式打字机**（唯一一处、也是最高感知的一处） |

### 明确不做的

- 不在 React 里同时引入 @material/web 与 AntD X（前者维护模式且与本项目无关）。
- 不追 M3 Expressive 的形状变形/弹簧动效——飞书卡片没有对应能力，强行模拟只会增加噪音。

## 三、一套话术（给评委讲设计时用）

「我们调研了 Ant Design X 的 RICH 范式和 Material 3 的 tonal surface 体系，把两件事翻译进了飞书卡片的原生能力里：**RICH 的 C 和 H**——对话即界面、卡片原地演进、AI 回复流式打字机；**M3 的角色化色彩与层级纪律**——主题色只上 header、表面统一中性色阶、状态进徽标、图标单色调。全部落在声明式 JSON 上，零 emoji、零自定义字体，暗色模式自动适配。」

## 四、参考链接

**Ant Design X**：官网 https://x.ant.design ｜ 组件总览 https://x.ant.design/components/overview-cn ｜ RICH 介绍 https://x.ant.design/docs/react/introduce-cn ｜ FAQ（桌面端口径）https://x.ant.design/docs/react/faq-cn ｜ Playground https://x.ant.design/docs/playground/independent-cn/

**Material 3**：官网 https://m3.material.io ｜ 色彩角色 https://m3.material.io/styles/color/system/roles ｜ Shape https://m3.material.io/styles/shape/corner-radius-scale ｜ Type https://m3.material.io/styles/typography/type-scale-tokens ｜ 暗色表面 https://m3.material.io/blog/tone-based-surface-color-m3 ｜ Expressive https://m3.material.io/blog/building-with-m3-expressive ｜ @material/web 维护模式声明 https://m3.material.io/develop/web
