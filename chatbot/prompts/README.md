# Prompt 模板说明

`card-generator.md` 是意图分类的系统提示词，`chat.md` 是闲聊人设的系统提示词（两者都由 `src/prompt.js` 在运行时读取）；它们也是你交给评委复用的「skill prompt 模板」。

## 如何扩展

1. 在 `prompts/card-generator.md` 中新增一个 `kind` 及其 JSON 字段。
2. 在 `src/ai.js` 的 `parseIntent` 中解析并校验新字段。
3. 在 `src/registry.js` 中注册对应按钮的 `a` 动作处理，完成「点击 → 原地更新卡片」。

## 示例

- 投票：「发起一个下午茶投票：奶茶 / 咖啡 / 果茶」→ `vote`
- 报名表：「收集团建报名：姓名、能否参加、忌口」→ `form`
- 信息卡：「用卡片介绍一下量子计算」→ `info`
- 闲聊 / 提问：「用一句话解释什么是 AGUI」→ `chat`（由 `chat.md` 人设流式回复，打字机卡片输出）
- 猜拳：「猜拳」→ 走内置关键词，不经过 LLM，保证零延迟、可离线演示
