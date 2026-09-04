# AGUI 卡片机器人补齐到可提交（投票为主、报名表附带，不接多维表格）

## 摘要

在现有仓库（已有猜拳、AI 投票、信息卡、确认闸门，测试 16 条全绿）上补齐黑客松提交版：新增「报名表」表单卡片作为附带的真实场景，把「投票」作为 demo 主菜并修掉多人并发丢票问题；确认闸门覆盖报名汇总。所有结果只展示在聊天流（卡片 + 文本），用户可直接改聊天框，不接 bitable。AI 只做单次意图生成，卡片回调全部本地确定性处理。

## 关键改动

- **新增 form 意图与受限 DSL**：`prompts/card-generator.md` 增加 `kind=form` schema（`title` + `fields[]`，`field` 支持 `text`/`select`，`select` 有 `options`）；`src/ai.js` 的 `parseIntent` 校验并回退 `help`。新增 `src/actions/form.js` 负责表单卡构建与汇总。
- **表单卡片构建**：`src/cards.js` 增加 `input`、`select_static`、`form` 构建器。表单卡把 `tag:"form"` 直接放在 `body.elements` 根节点，内嵌输入框/下拉选择器 + 提交/重置按钮；提交按钮用 `form_action_type:"submit"`，并在 `behaviors` 里带回调 `value={a:"form_submit",p:{sessionId,...}}`；表单内各交互组件 `name` 全局唯一。
- **状态改进程内会话存储**：新增 `src/store.js` 的 `Map<sessionId,state>`。投票和报名不再把 tally/名单塞回按钮 value，只携带 `sessionId` + 本次操作，回调时从 store 取当前态 → 累加 → 重建卡片，保证多人并发不互相覆盖。猜拳保留无状态。
- **回调闭环**：`src/registry.js` 增加并调整动作——`vote` 走 store 累加；`form_submit` 读取 `evt.action.form_value` 的键值对 → 归一化 → 按 `operator.open_id` 去重 → 追加报名 → `updateCard` 展示已报名名单并保留表单；`form_close` 走确认闸门，确认后发送文本汇总到群里并把卡片标记为已结束。
- **确认闸门复用**：投票「结束并公布」沿用现有确认卡；报名「结束并汇总」使用同一套 confirm 流程，最终以 text 发到聊天（可手动编辑），不做 bitable。
- **文档同步**：更新 `prompts/README.md`、`README.md`、`docs/DEMO.md`，主菜改为投票、报名表附带，去掉 bitable 描述，保留 `FEISHU_APP_ID/SECRET` + 可选 `AI_API_KEY` 配置说明。

## 测试计划

- `parseIntent`：合法 form、非法字段、select 选项过滤、未知 kind 回退 help。
- 表单卡结构：含 `tag:"form"`、提交按钮 `form_action_type:"submit"`、input/select `name` 全局唯一、`required` 正确。
- 归一化与汇总：表单 value 去空、类型映射、按 open_id 去重、多人提交排序与汇总文本。
- store 并发：同一 `sessionId` 连续 `vote`/`form_submit` 正确累加，不同 `sessionId` 互相隔离。
- 回归：猜拳、投票、信息卡、确认闸门现有测试保持通过，新增约 5 条测试，`npm test` 全绿。

## 假设与默认选择

- 不接多维表格；所有结果以聊天流里的卡片和文本呈现，用户可直接改聊天内容。
- 会话状态用进程内 `Map`，进程重启会丢失在途投票/报名，demo 可接受；README 不再声称「无状态」。
- AI 使用默认 deepseek 兼容接口，只做单次意图生成；表单提交与投票统计不做 AI 二次调用。
- 报名 demo 用「姓名 / 能否参加 / 忌口」场景，字段由 AI 在受限 form DSL 内生成。
