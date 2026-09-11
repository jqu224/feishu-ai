# 豆包工作「Skill 优先 → 连接器进阶」落地计划
## 转向决策（2026-09-05，重要）
- **去掉 MCP 作为主路径**：MCP 对普通人门槛太高、传播性差。参赛与对外主推**纯 Skill**：`skills/xiaolong-doc-qa/`——把公开的飞书文档变成问答知识库（抓取 → 分块 → 建索引 → 带出处回答 → 出题），全程只依赖豆包工作内置联网能力，零配置。
- **公开飞书文档 = 问答数据库**：文档分享权限设为「互联网上获得链接的人可阅读」后，Skill 直接抓链接正文即可建库（已实测：公开 wiki 链接可抓取全文），不再需要 MCP 调飞书 API。
- MCP 连接器（`src/` + `xiaolong-card`）保留为**可选进阶**：需要「飞书群内可点击的投票/报名卡片」时才用，文档降级到 `docs/setup-doubao-work.md`。
- 参赛双赛道对应：Skill 创作 → `xiaolong-doc-qa`（可运行 + 使用说明 + 一次真实运行结果）；真实实践 → 用豆包工作把飞书文档做成问答知识库的完整过程与成果。
## 落地清单
| 交付物 | 路径 | 状态 |
|---|---|---|
| 文档问答 Skill（主推，零门槛） | `skills/xiaolong-doc-qa/`（SKILL.md + example-run.md + troubleshooting.md） | ✅ 完成 |
| 一次真实运行结果（公开文档实跑） | `skills/xiaolong-doc-qa/references/example-run.md` | ✅ 完成 |
| 交互卡片 Skill（进阶） | `skills/xiaolong-card/`（打磨后：组队检索词 + 伙伴协作模式） | ✅ 完成 |
| 技能打包/校验脚本 | `scripts/pack-skills.mjs` + `npm run pack:skills` + `dist/*.zip` | ✅ 完成 |
| MCP 端点探测 | `scripts/ping.mjs` + `npm run ping` | ✅ 完成 |
| 伙伴配置卡 ×2 + 小队编成 | `agents/`（doc-qa-buddy / xiaolong-collector / team） | ✅ 完成 |
| 进阶接入手册 | `docs/setup-doubao-work.md` | ✅ 完成 |
| README（Skill 优先路线图） | `doubao-work/README.md` | ✅ 完成 |
| 参赛投稿材料（两赛道） | `../submissions/`（track1 / track2 / README） | ✅ 完成 |
## 验证
- `npm test`：连接器单元 + e2e 全绿（7 pass）。
- `npm run pack:skills`：两个技能打包通过、frontmatter 校验通过。
- `npm run ping`：连接器启动后探测 MCP 端点（进阶自查）。
