# 示例与故障排查

## 端到端示例

### 1. 生成名单 → 报名统计（组队场景）

豆包工作里多个伙伴组队时，推荐任务拆法：

1. **名单伙伴**（内置技能即可）：「生成我们组的 100 个成员名单」→ 产出 100 个名字的数组。
2. **小笼伙伴**（绑定了本技能 + 连接器）：接住上一棒产出的名单，调 `create_roster_form`：

```json
{
  "title": "团建报名统计",
  "names": ["成员1", "成员2", "..."]
}
```

3. 用户在飞书群里看到报名卡，成员选自己名字 + 报名/不报名，提交按人去重。
4. 用户回豆包工作问「统计到哪了」→ 小笼伙伴用返回的 `session_id` 调 `get_session_status`，播报 `submission_count`；要明细就 `export_session_summary`。

### 2. 下午茶投票

「发起投票：今天下午茶喝什么？奶茶 / 咖啡 / 果茶 / 都不喝」

→ `create_vote`，`options` 4 项。返回后告知用户「卡片已发到群里，session_id 是 xxx」。

### 3. 新人信息收集

「收集团建信息：姓名（必填）、手机号（必填）、交通方式（大巴/自驾/地铁）、忌口（选填）」

→ `create_form`：

```json
{
  "title": "团建信息收集",
  "fields": [
    { "label": "姓名", "type": "text", "required": true },
    { "label": "手机号", "type": "text", "required": true },
    { "label": "交通方式", "type": "select", "required": true, "options": ["大巴", "自驾", "地铁"] },
    { "label": "忌口", "type": "text", "required": false }
  ]
}
```

## 故障排查

| 现象 | 原因与处理 |
|---|---|
| 工具返回 `控制 API 401` | 插件 `.env` 的 `CONTROL_TOKEN` 与主 BOT `.env` 不一致；改成一致后重启两边。 |
| 工具返回 `ECONNREFUSED 127.0.0.1:3777` | 主 BOT 没启动或没开 `MCP_ENABLED=1`；在主 BOT 目录（`chatbot/`）`npm start`。 |
| 工具返回 `session 不存在` | 机器人进程重启过，内存会话丢了；重新建一张卡。 |
| `缺少 chat_id` | 主 BOT（`chatbot/`）的 `.env` 没配 `FEISHU_DEFAULT_CHAT_ID`，且调用没传 `chat_id`。chat_id 是 `oc` 开头的字符串，可从机器人日志的回调事件里找到。 |
| 连接器保存后工具调不通 | 检查豆包工作连接器的 Authorization Header 值是否为 `Bearer <MCP_TOKEN>`（Bearer 后有空格），URL 是否 `http://127.0.0.1:3999/mcp`，且新建工作任务时勾选了该连接器。 |
| 超过 100 人 | 飞书下拉选择上限 100；拆成多张卡，或改用 `create_form` 的 text 字段自由填写。 |

## 边界

- 卡片的点击交互（投票、提交表单）发生在飞书里，由主 BOT 处理，豆包工作面板里看不到点击明细——查进度一律走 `get_session_status`。
- 会话状态在机器人内存里，机器人重启后 `session_id` 失效，需要重新建卡。
