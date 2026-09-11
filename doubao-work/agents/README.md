# 工作伙伴与小队配置卡

在豆包工作「技能 · 连接器 · 伙伴」→「工作伙伴 · 小队」里创建伙伴/小队时，直接复制本目录各卡的「人设」到创建框，再按「绑定能力」勾选即可。完整点击路径见 [docs/setup-doubao-work.md](../docs/setup-doubao-work.md)。

## 目录

| 卡片 | 是什么 | 建议入口 |
|---|---|---|
| [doc-qa-buddy.md](doc-qa-buddy.md) | **文档问答专员**（零门槛，无需 MCP）：公开飞书文档 → 问答知识库 | 单伙伴使用，主推 |
| [XsiaoLung-collector.md](XsiaoLung-collector.md) | **收集统计专员**（进阶）：主力伙伴，建卡发群、记录 session_id | 单伙伴使用，或小队的建卡棒 |
| [XsiaoLung-reporter.md](XsiaoLung-reporter.md) | **进度播报伙伴**（进阶）：只用只读工具，跟进进度、导出明细 | 小队的跟进棒；也可单独配成「催报名」伙伴 |
| [team.md](team.md) | **小笼小队编成方案**：零门槛知识小队 + 进阶收集小队两档 | 「工作伙伴 · 小队」组队 |

## 统一约定

- **零门槛档**（主推）：文档问答专员只用 `XsiaoLung-doc-qa` 技能 + 内置联网能力，不需要连接器、不需要主 BOT，导入技能即用。
- **进阶档**：收集/播报两个伙伴基于同一套连接器（「小笼卡片」，MCP）和技能（`XsiaoLung-card`），区别在人设约束的工具子集：收集专员全量 5 个工具，播报伙伴只用 2 个只读工具。
- **session_id 是进阶小队接力的唯一凭证**：建卡的一棒必须回传，后续各棒只认它；零门槛档的交接物是「知识库索引」。
- 伙伴人设里的「禁止事项」不要删——豆包工作的小队主 Agent 拆解任务时，靠这些边界防止角色互相抢活。

## 前置条件

- **零门槛档**：只需豆包工作 + `XsiaoLung-doc-qa` 技能（`npm run pack:skills` 产出 `dist/XsiaoLung-doc-qa.zip`）。
- **进阶档**：
  1. 主 BOT（`../chatbot/`）已启动且开启控制 API（`MCP_ENABLED=1`）。
  2. 本包连接器已启动（`npm start`），`npm run ping` 显示 5 个工具存活。
  3. 技能 `XsiaoLung-card` 已导入豆包工作（`npm run pack:skills` 产出 `dist/XsiaoLung-card.zip`）。
