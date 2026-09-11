# 一次真实运行结果

> 运行时间：2026-09-05
> 运行环境：豆包工作（联网抓取能力）· 小笼文档问答 Skill（xiaolong-doc-qa）
> 输入文档：[人人「豆」能成为高手｜直播精华文档](https://larkcommunity.feishu.cn/wiki/PeQwwfzeoimpsRkWdGFcytsgnSf)（公开链接，互联网可读）

## 运行过程

### 第 1 步：抓取文档内容 ✅

输入公开链接，通过网页抓取成功拿到正文（公开链接的飞书文档页面包含完整正文内容，含标题、表格、链接）。未遇到权限问题。

### 第 2 步：结构化分块 ✅

按文档标题层级切块，共 5 块：

```
块 1　网页 / 系统 / 应用专场（含 9 个直播搭出的网站链接 + 技能&模板）
块 2　技能 / Skill 专场（含 9 个开源文案类 Skill + 若干示例作品链接）
块 3　数据分析专场（含 2 个资源：GitHub 仓库 + 拼豆表格 zip）
块 4　PPT 专场（含教程、宝藏 PPT 技能 13 个、汇报类 PPT 素材）
块 5　通用资源（豆包工作下载 + 蓝皮书）
```

### 第 3 步：建立问答索引 ✅

```
📇 知识库：人人「豆」能成为高手｜直播精华文档（共 5 块）
- 块 1　网页/系统/应用专场 → 可问：直播搭出了哪些网站？有什么网页模板？
- 块 2　技能/Skill 专场 → 可问：有哪些去AI味写作技能？有哪些免费开源 Skill？
- 块 3　数据分析专场 → 可问：数据分析有什么可用资源？
- 块 4　PPT 专场 → 可问：直播推荐了什么 PPT 技能？PPT 教程在哪？
- 块 5　通用资源 → 可问：豆包工作在哪下载？
```

## 问答实录（第 4 步：带出处的回答）

### 问 1：直播里推荐了哪些 PPT 技能？

答：直播的 PPT 专场整理了一批宝藏 PPT 技能，比较有代表性的有：

- **宝玉 slides 技能**：唯一用 AI 画图生成每一页，图片版 PPT，17 套风格（出处：[baoyu-slide-deck](https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-slide-deck)）
- **张咋啦 PPT 技能**：从零现场设计网页 PPT，先出 3 版首页让你挑，专避 AI 味的通用字体和紫渐变（出处：[frontend-slides](https://github.com/zarazhangrui/frontend-slides)）
- **归藏 PPT 技能**：为上台演讲配齐装备，演讲者视图、讲稿备注、计时排练、激光笔（出处：[guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)）
- **PPT Master**：唯一产出真正 .pptx，能在 PowerPoint 里继续改（出处：[ppt-master](https://github.com/hugohe3/ppt-master)）
- **Html-ppt-skill**：36 套主题加 31 种版式，按 S 键弹出提词器（出处：[html-ppt-skill](https://github.com/lewislulu/html-ppt-skill)）
- 还有花叔 Huashu、wise-ppt、humanize-ppt、htmledit.ai 等

（出处：块 4「PPT 专场 · 宝藏 PPT 技能」）

### 问 2：有哪些去掉 AI 味的写作技能？

答：文档里收录了 9 个免费开源文案类 Skill，去 AI 味方向的有：

- **human-writing**：中文去 AI 口癖，让稿子像具体的人写的（出处：[GitHub](https://github.com/KKKKhazix/human-writing)）
- **Humanizer**：中英双语，按 24 种 AI 写作痕迹逐条清除（出处：[GitHub](https://github.com/blader/humanizer)）
- **Creator Buddy**：公众号 10 个技能 + 小红书全套技能（出处：[GitHub](https://github.com/SpaceZephyr/creator-buddy)）

（出处：块 2「技能 / Skill 专场 · 免费开源文案类 Skill 合集」）

### 问 3：豆包工作在哪里下载？

答：文档开头写明：**立即下载豆包工作：https://www.doubao.com/work**；另外有学习资料《豆包工作蓝皮书》：https://doubaowork.homes。

（出处：块 5「通用资源」及文档开头）

### 问 4：数据分析专场有什么可用的东西？

答：文档数据分析专场收录了：

- **budget-sandbox-skill**（Marketing 预算沙箱）：https://github.com/WangDXXXX/budget-sandbox-skill
- **perler-bead-sheet.zip**（拼豆表格 Skill 包）
- 另外技能专场还有一个 6285 行的智能家居销售数据汇总总表（4 透视 + 6 图表）

（出处：块 3「数据分析专场」、块 2「技能 / Skill 专场」）

## 出题演示（第 5 步：基于文档出题）

基于本知识库生成 3 道题（每题标注出处）：

1. 【判断】直播 PPT 专场推荐了可以产出真正 .pptx 的技能。→ 正确（出处：块 4「PPT Master」）
2. 【单选】human-writing 这个技能的主要用途是？A. 生成 PPT B. 去 AI 味让稿子像人写的 C. 做小红书封面 D. 数据分析 → B（出处：块 2）
3. 【多选】以下哪些是文档 PPT 专场收录的宝藏 PPT 技能？A. 宝玉 slides B. 归藏 PPT C. ppt-master D. XRD-SKILL → A、B、C（出处：块 4；D 未在文档该块出现）

## 结论

一次真实运行完成：**公开链接 → 抓取正文 → 结构化分块 → 问答索引 → 带出处回答 + 出题**，全程 5 步闭环，无需 MCP、无需本地服务、无需写代码。
