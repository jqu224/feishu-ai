# 飞书卡片美化指南：CardKit、模板与 JSON 的边界

> 回答「飞书如何改变卡片的审美？能不能把 JSON 格式改掉？」——结论先说：
> **JSON 是飞书卡片的传输协议，换不掉；但你可以完全不手写 JSON。**

## 一、三条不手写 JSON 的路

### 1. CardKit 可视化搭建工具（推荐起步）

入口：**https://open.feishu.cn/cardkit**

- 拖拽搭建卡片，**双端实时预览**（桌面端 / 移动端），不用发消息就能看效果。
- 支持 **AI 一键生成卡片**：描述需求，直接产出卡片结构。
- 大纲树定位组件、案例库、协作者协同。
- 搭好后一键**复制卡片 JSON 源码**或导出 `.card` 文件，也可以导入现有 `.json` / `.card` 二次编辑。
- 本项目的用法：`npm run preview` 把所有卡片形态导出到 `preview/*.json`，逐个粘贴到 CardKit 里真机预览——不需要启动机器人。

### 2. 卡片模板 + 变量 + 版本管理（推荐长期维护）

把「设计」和「数据」分离：在 CardKit 里把卡片发布为**模板**，组件绑定变量；代码发送时只传 `template_id` 和变量值：

```json
{
  "type": "template",
  "data": {
    "template_id": "AAq0jxU1xxxx",
    "template_version_name": "1.0.1",
    "template_variable": { "question": "下午茶喝什么", "total": 3 }
  }
}
```

- 改设计在 CardKit 里改，**发布新版本即生效**，不用改代码、不用重新部署。
- 注意：新增变量后必须发布新版本；模板只能通过搭建工具创建管理（官方未开放模板 CRUD API）。
- 代价：模板里的交互按钮 value 也要在工具里配，动态复杂逻辑（如本项目「按钮 value 携带 sessionId」）不如纯代码灵活。**本项目选择纯代码构建（`src/cards.js`），模板适合设计相对静态的场景。**

### 3. 代码构建助手（本项目方案）

`src/cards.js` 把 JSON 包成语义化函数（`card / button / textLine / statRow / chart / note / columnSet`），AI 只输出受约束的意图 JSON，由代码映射成卡片——LLM 永远不直接产出 UI。

## 二、卡片本身的美化能力（JSON 2.0）

| 能力 | 支持 | 本项目用法 |
| --- | --- | --- |
| header 主题色 | 14 种 `template`（blue/turquoise/indigo/violet/orange/…） | 玩法分色：猜拳 indigo、投票 turquoise、报名 blue、信息 violet、确认 orange |
| header 图标 | `standard_icon`（飞书图标库）或 `custom_icon`（`img_key`） | `src/icons.js` 注册表统一管理 |
| header 徽标 | `text_tag_list`，最多 3 个，带颜色 | 状态进 header：进行中 / 已结束 / 已投 N 票 |
| 字号 | `text_size`（heading-0 ~ notation 档位） | `textLine()` 的 size 参数 |
| 文字颜色 | `text_color` 语义枚举 | 语义强调（领先选项 turquoise） |
| 明暗分端字号/颜色 | `config.style`（text_size 分 pc/mobile，color 分 light/dark） | 预留未启用（见下「慎用」） |
| 卡片宽度 | `config.width_mode`：default(600px) / compact(400px) / fill | 默认 |
| 分栏 | `column_set`（可嵌套，支持 weight 权重） | 投票行的「按钮 4 + 票数 1」权重分栏 |
| 统计块 | column + `background_style` 色阶 + 居中大数字 | `statRow()` |
| 图表 | `chart` 组件（VChart 声明式 spec，bar/line/pie/雷达/词云等 13 种） | 投票结束后的票数条形图 `chart()` |
| 备注 | `note` 组件（灰色小字） | `note()` |
| 暗色模式 | 自动跟随客户端明暗 | 语义色自动适配 |
| 内联彩色标签 | markdown 里 `<text_tag>` | `chip()` |

**做不到的**：自定义字体族、卡片整体圆角、卡片整体背景色（官方均未开放）；卡片里跑 JS（图表 spec 只能纯声明）。

**慎用的**：`config.style` 的明暗分端自定义颜色是 2.0 新字段，旧客户端兼容性存疑，本项目保持语义色（自动适配明暗）更稳。

## 三、流式卡片（打字机）——AI 审美的另一半

静态卡片再好看也只是「通知」；AI 体验需要**流式**。飞书官方链路（cardkit v1）：

1. 创建卡片实体（`POST /open-apis/cardkit/v1/cards`，`streaming_mode: true`，markdown 组件带 `element_id`）；
2. 用 `card_id` 发消息；
3. `PUT …/elements/{element_id}/content` 传**全量文本**——若旧文本是新文本的前缀，客户端自动打字机续写（默认 70ms/字）；
4. 结束后把 `streaming_mode` 置 false（收掉光标；不关也会在 10 分钟后自动关）。

本项目直接用 SDK 的 `channel.stream()`（`@larksuiteoapi/node-sdk` 已封装节流、超长滚动换卡、失败收尾），见 `src/bot.js` 的 `streamChatReply`。

限制：卡片实体只能发送一次、有效期 14 天、收到交互回调后要先关流式才能改卡片、需要 `cardkit:card:write` 权限、客户端 7.20+。

## 四、参考链接

- 卡片搭建工具：https://open.feishu.cn/cardkit
- 卡片 JSON 2.0 结构：https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-structure
- 组件清单（2.0）：https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components-overview
- 图表组件（VChart）：https://open.feishu.cn/document/feishu-cards/card-json-v2-components/content-components/chart
- 图标库枚举：https://open.feishu.cn/document/feishu-cards/enumerations-for-icons
- 流式更新卡片：https://open.feishu.cn/document/cardkit-v1/streaming-updates-openapi-overview
- 卡片模板（CardKit 文档）：https://open.feishu.cn/document/feishu-cards/feishu-card-cardkit/feishu-cardkit-overview
