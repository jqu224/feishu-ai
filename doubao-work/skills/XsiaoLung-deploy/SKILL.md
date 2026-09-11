---
name: XsiaoLung-deploy
description: 把 onboarding 素材（HTML 交互工作台、题库 CSV/Excel、四张地图文档）一键部署到飞书云空间文件夹，生成多维表格 Base、电子表格、飞书文档与 HTML 文件并交付链接。当用户想要部署 onboarding、发布到飞书、生成 Base、上传工作台 HTML、把题库变成多维表格、一键生成入职资料包、同步到云空间 XsiaoLung-AI 文件夹时使用。关键词：部署、发布、飞书、云空间、多维表格、Base、HTML、Excel、CSV、入职资料包、onboarding、文件夹、上传、导入。
---

# 小笼部署 · onboarding 素材一键部署到飞书

把一套 onboarding 素材（交互工作台 HTML + 题库数据 + 四张地图文档）一键部署到用户飞书云空间的目标文件夹，产出可分享的链接包。

## 前置条件

- 需要飞书云空间写权限（豆包工作内置的飞书能力 / 连接器授权即可，不需要自建连接器）
- 本地素材就绪：`onboarding-workbench.html`、题库 CSV、四张地图 Markdown（或用户指定的等价文件）
- 目标文件夹：默认 `XsiaoLung-AI/`（不存在则创建）；用户指定其他文件夹时用用户指定的

## 部署清单（共 6 件，缺哪件就说明哪件没有）

| # | 产物 | 类型 | 来源 |
|---|---|---|---|
| 1 | 问答题库 Base（多维表格） | bitable | 题库 CSV 导入 |
| 2 | 问答题库 Excel（电子表格） | sheet | 题库 CSV 导入 |
| 3 | 交互工作台 HTML | file（原格式上传，保留 .html 预览） | onboarding-workbench.html |
| 4 | 01-提问路径（Mock） | docx | 地图 01 Markdown 导入 |
| 5 | 02-技术栈与软件（Mock） | docx | 地图 02 Markdown 导入 |
| 6 | 03-组件与网址（Mock） | docx | 地图 03 Markdown 导入 |
| 7 | 04-入职日程与组织（Mock） | docx | 地图 04 Markdown 导入 |

> 说明：HTML 用「上传」而不是「导入成 docx」——上传保留 .html 原格式，飞书云文档支持预览视图渲染；导入会转成文档丢失交互。

## 部署流程

### 第 1 步：确认目标位置

- 用户没给位置 → 用默认 `XsiaoLung-AI/`，搜索不到就先创建
- 用户给了文件夹链接 → 解析 folder_token
- 已存在同名文件 → 询问是否覆盖或改名前缀，不静默覆盖

### 第 2 步：创建 / 复用文件夹

```bash
lark-cli drive +create-folder --name "XsiaoLung-AI" --format json
```

记录返回的 `folder_token` 和 `url`。

### 第 3 步：串行导入与上传（同一文件夹必须串行，不要并发）

顺序执行，每步拿到返回的 `url`：

```bash
# 题库 → Base（多维表格）
lark-cli drive +import --file <题库.csv> --type bitable --folder-token <FOLDER_TOKEN> --name "小笼Onboarding-问答题库Base" --format json

# 题库 → Excel（电子表格）
lark-cli drive +import --file <题库.csv> --type sheet --folder-token <FOLDER_TOKEN> --name "小笼Onboarding-问答题库Excel" --format json

# HTML 工作台（原格式上传，保持 .html）
lark-cli drive +upload --file <workbench.html> --folder-token <FOLDER_TOKEN> --name "小笼Onboarding-交互工作台.html" --format json

# 四张地图 → 飞书文档（逐份导入）
lark-cli drive +import --file <01-提问路径.md> --type docx --folder-token <FOLDER_TOKEN> --name "01-提问路径（Mock）" --format json
# ... 02 / 03 / 04 同理
```

导入返回超时但有 `ticket` 时，用 `lark-cli drive +task_result --scenario import --ticket <TICKET>` 继续查。

### 第 4 步：核验与交付

- 用 `lark-cli drive +inspect --url <各产物url>` 逐个确认资源存在（type/title 正确）
- 交付一张「部署清单」表：产物名 + 类型 + 链接 + 用途
- 明确标注 mock 数据边界（虚构演示数据，真实使用时替换为用户自己的 onboarding 文档）

## 边界与注意事项

- 不覆盖已存在文件，除非用户明确要求
- 目标文件夹不存在就创建（创建是写操作，创建前告知用户）
- 部署的是演示素材（Mock）时，交付说明里必须标注「虚构数据，仅测试演示」
- 不需要自建连接器：飞书云空间能力走豆包工作内置授权
- 批量导入到同一文件夹必须串行，报 `232140101/232140100/233523001` 时等几秒重试，最多 3 次
