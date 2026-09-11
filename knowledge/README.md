# knowledge/ — 知识内容 CSV 约定

**规则（用户 2026-09-04 定）：每次做 knowledge（知识/题库）内容，产出 CSV，本地备份一份（本目录），同时上传到飞书云文档文件夹一份。**

- 远端文件夹：https://bcnjqnq5052g.feishu.cn/drive/folder/HlwSfYthplS0DYdKVgzc4ydfnMe
  （folder_token：`HlwSfYthplS0DYdKVgzc4ydfnMe`；机器人应用已通过上级目录共享获得权限）
- 本地备份：本目录（`feishu-ai/knowledge/`）

## 当前内容

豆包答题题库（9 套：7 套 × 14 题 + 2 套 × 5 题 + 1 份全量汇总，共 108 题），列结构：
`题库ID, 题库名称, 题号, 难度(入门/进阶/硬核), 题干, 选项A-D, 正确答案, 答案内容, 解析`

| 序号 | 题库 | 题数 |
|---|---|---|
| 01 | 飞书新手上路 | 14 |
| 02 | 飞书进阶玩家 | 14 |
| 03 | 豆包工作上手指南 | 14 |
| 04 | Agent 架构通识 | 14 |
| 05 | 字节跳动编年史 | 14 |
| 06 | 字节范与企业文化 | 14 |
| 07 | 字节跳动入职指南 | 14 |
| 08 | 互联网编年史 | 5 |
| 09 | 互联网边缘问答 | 5 |

## 重新生成与上传

```bash
cd chatbot
node scripts/export-quiz-csv.mjs                          # 从 src/data/trivia-*.js 重新生成 CSV 到本目录
node --env-file-if-exists=.env scripts/upload-knowledge-csv.mjs   # 上传本目录全部 CSV 到上面的飞书文件夹并核对
```
