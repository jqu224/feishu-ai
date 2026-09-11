# 赛道二 · Skill 创作｜把一套方法变成别人也能用的 Skill

## 投稿标题

**小笼文档问答（XsiaoLung-doc-qa）：给 AI 一个公开的飞书文档链接，它就还你一个问答知识库**

## 一、这是什么（30 秒理解）

一个**零门槛、可复用**的豆包工作 Skill：把「公开的飞书文档 → 可问答的知识库」这套方法固化成 5 步流程——

```
抓取正文 → 按标题分块 → 建问答索引 → 带出处回答 → 可选基于文档出题
```

**不需要 MCP、不需要本地服务、不需要写代码**，只依赖豆包工作内置的联网能力。适合：培训答疑、新人上手、FAQ、活动资料检索、知识考核。

## 二、Skill 本体

- 源码：`doubao-work/skills/XsiaoLung-doc-qa/`（SKILL.md + references/example-run.md + references/troubleshooting.md）
- 打包：`doubao-work/dist/XsiaoLung-doc-qa.zip`（导入即用）
- 标准 Agent Skill 结构：frontmatter（name / description ≤1024 字符，含检索词：文档问答、知识库、飞书文档、FAQ、出题、答疑、培训） + 五步工作流 + 边界与注意事项

## 三、简单的使用说明（3 步）

1. **导入**：豆包电脑版侧边栏「技能 · 连接器 · 伙伴」→ 技能 → 导入 `XsiaoLung-doc-qa.zip`；
2. **给链接**：把公开的飞书文档链接发给豆包工作（文档分享权限需设为「互联网上获得链接的人可阅读」；不愿公开就粘贴正文）；
3. **问答**：任意提问（回答带出处），或说「基于文档出 5 道题」「总结这份文档的要点」。

## 四、一次真实运行结果

> 运行时间：2026-09-05 ｜ 输入文档：[人人「豆」能成为高手｜直播精华文档](https://larkcommunity.feishu.cn/wiki/PeQwwfzeoimpsRkWdGFcytsgnSf)（真实公开链接）

| 步骤 | 结果 |
|---|---|
| ① 抓取正文 | ✅ 公开链接直接拿到全文（标题 + 表格 + 链接） |
| ② 结构化分块 | ✅ 5 块：网页/应用、技能/Skill、数据分析、PPT、通用资源 |
| ③ 建问答索引 | ✅ 输出「📇 知识库：…（共 5 块）」索引 |
| ④ 带出处回答 | ✅ 4 组问答全部引原文、标出处（见下） |
| ⑤ 基于文档出题 | ✅ 生成 3 道题（判断/单选/多选），每题标注出处块 |

**问答实录摘录**：

- 问「直播里推荐了哪些 PPT 技能？」→ 列出 13 个技能及 GitHub 链接（出处：块 4「PPT 专场 · 宝藏 PPT 技能」）
- 问「有哪些去掉 AI 味的写作技能？」→ human-writing / Humanizer / Creator Buddy（出处：块 2「免费开源文案类 Skill 合集」）
- 问「豆包工作在哪下载？」→ https://www.doubao.com/work（出处：块 5「通用资源」）

完整记录：[evidence/example-run.md](evidence/example-run.md)

## 五、为什么值得复用

- **输入是公开链接，人人都给得起**：把文档分享设成「互联网可读」即可，不需要对方装任何东西。
- **输出是活的**：不是一份静态摘要，而是持续可问、可出题的知识库；文档更新后重新抓一遍就刷新。
- **可迁移**：换任何文档（培训手册、产品 FAQ、活动资料）30 秒再建一个库。

## 六、表单补充资料（直接粘贴）

> 补充资料 · Skill 创作：填写 Skill 链接或使用说明（多个链接换行）

```
https://github.com/jqu224/feishu-ai/tree/main/doubao-work/skills/XsiaoLung-doc-qa（Skill 源码：SKILL.md + references）
https://github.com/jqu224/feishu-ai/blob/main/doubao-work/dist/XsiaoLung-doc-qa.zip（Skill 打包 zip，导入即用）
使用说明（3 步）：① 豆包工作「技能·连接器·伙伴」→ 技能 → 导入 XsiaoLung-doc-qa.zip；② 把公开的飞书文档链接发给豆包工作（文档权限设为「互联网上获得链接的人可阅读」）；③ 任意提问，回答带出处；也可说「基于文档出 5 道题」。
一次真实运行结果：https://github.com/jqu224/feishu-ai/blob/main/doubao-work/skills/XsiaoLung-doc-qa/references/example-run.md（对真实公开文档实跑：抓取→分块→建索引→问答→出题）
```

> ⚠️ 权限检查：GitHub 仓库需 push 并设为 public（源码、zip、运行结果三个链接才能打开）；若 zip 未推送，可先把 zip 上传到豆包工作技能库后，在表单里贴「使用说明」文字即可。
