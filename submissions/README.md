# 飞书 AI 绝活大会 · 双赛道投稿总览

> 截止：2026-09-11 ｜ 投稿入口：[征集表单](https://bytedance.larkoffice.com/share/base/form/shrcngQde5pOZl41HPJZmwBIzNa)
> 参赛项目：**小笼文档问答（XsiaoLung-doc-qa）** — 把公开的飞书文档变成可问答的知识库
> 话题标签：#飞书AI绝活大会 #豆包工作（发布到社媒时带上）

## 投哪两个赛道

| 赛道 | 投什么 | 对应文件 |
|---|---|---|
| **赛道一 · 真实实践** | 用豆包工作把「飞书 AI 绝活大会精华文档」做成一个问答知识库：真实问题 + 使用过程 + 最终成果 | [track1-real-practice.md](track1-real-practice.md) |
| **赛道二 · Skill 创作** | 把「文档 → 知识库问答」这套方法做成可复用的 Skill（XsiaoLung-doc-qa），附使用说明 + 一次真实运行结果 | [track2-skill-creation.md](track2-skill-creation.md) |

## 表单怎么填（重点）

征集表单的「补充资料」区，按赛道填，**多个链接请换行**，并确保**打开查看权限**（公开可读）。

### 赛道一（真实实践）→ 补充资料填：豆包工作成果、对话或 Demo 链接

直接粘贴下面的内容（**运行一次豆包工作后替换第 1 行的对话链接**，详见 track1 文件）：

```
https://www.doubao.com/thread/<你的对话链接ID>（豆包工作实跑记录：建库+问答全过程，替换此行）
https://larkcommunity.feishu.cn/wiki/PeQwwfzeoimpsRkWdGFcytsgnSf（被做成知识库的公开文档，互联网可读）
https://github.com/jqu224/feishu-ai（项目仓库，含技能源码与运行结果证据，需 push 且设为 public）
```

### 赛道二（Skill 创作）→ 补充资料填：Skill 链接或使用说明

直接粘贴下面的内容（**推送到 GitHub 后第 1 行即生效**，详见 track2 文件）：

```
https://github.com/jqu224/feishu-ai/tree/main/doubao-work/skills/XsiaoLung-doc-qa（Skill 源码：SKILL.md + references）
https://github.com/jqu224/feishu-ai/blob/main/doubao-work/dist/XsiaoLung-doc-qa.zip（Skill 打包 zip，导入即用）
使用说明（3 步）：① 豆包工作侧边栏「技能·连接器·伙伴」→ 技能 → 导入 XsiaoLung-doc-qa.zip；② 把公开的飞书文档链接发给豆包工作（文档分享权限设为「互联网上获得链接的人可阅读」）；③ 任意提问，回答带出处；也可说「基于文档出 5 道题」。
一次真实运行结果：https://github.com/jqu224/feishu-ai/blob/main/doubao-work/skills/XsiaoLung-doc-qa/references/example-run.md（对真实公开文档实跑：抓取→分块→建索引→问答→出题）
```

## 投稿前检查清单

- [ ] 豆包工作里**实际运行过一次**：导入 Skill → 给链接 → 提问（拿真实对话链接替换占位符）
- [ ] GitHub 仓库 **push 并设为 public**（否则链接打不开）
- [ ] 飞书文档分享权限 = **互联网上获得链接的人可阅读**（点链接自测一遍）
- [ ] 已发布到社媒并带 #飞书AI绝活大会 #豆包工作，把社媒链接也放进补充资料（加分）
- [ ] 表单里两个赛道分别提交（一个表单可多次提交或分别填两赛道）

## 为什么这个方案能打（一句话）

> 别人的 Skill 要装 MCP、要配服务器；我的 Skill 只需要**一个公开的飞书文档链接**——把文档变成数据库，让 AI 读文档、答问题、出考题。零门槛，人人能抄。
