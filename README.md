<p align="center">
  <a href="./README.md"><img src="https://img.shields.io/badge/lang-English-1f6feb?style=for-the-badge&labelColor=0d1117" alt="English" /></a>
  <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/lang-中文-8b949e?style=for-the-badge&labelColor=0d1117" alt="中文" /></a>
</p>

<h1 align="center">feishu-ai</h1>

<p align="center">
  <strong>Agent-native Card UI on Feishu Open Platform</strong><br />
  <em>Conversation is the interface — interactive cards that generate, stream, and mutate in place.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-chatbot%20167%20pass-22c55e?style=flat-square&logo=vitest&logoColor=white" alt="chatbot tests" />
  <img src="https://img.shields.io/badge/tests-doubao--work%208%20pass-22c55e?style=flat-square&logo=vitest&logoColor=white" alt="doubao-work tests" />
  <img src="https://img.shields.io/badge/verify-design%20%7C%20control%20%7C%20MCP-0ea5e9?style=flat-square" alt="verify" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Feishu-Card%20v2%20%2B%20CardKit-00d6b9?style=flat-square" alt="Feishu Card" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" />
</p>

<p align="center">
  Contest entry for <strong>Feishu AI Showcase</strong> · Topic <code>#飞书AI绝活大会</code>
</p>

---

## Positioning

Most Feishu bots reply with **text**. This project replies with **Agent UI**:

| Layer | What it means on Feishu |
| --- | --- |
| **Generate** | Natural language → Card JSON (vote / form / info) via an OpenAI-compatible model |
| **Stream** | CardKit typewriter streaming for chat replies (fallback to static cards) |
| **Mutate in place** | Interaction callbacks + ACK atomic card updates — no page jump, no new spam messages |
| **Human-in-the-loop** | Publish / export / destructive actions require an explicit confirm card |
| **Persist** | Summaries export to Feishu Sheets / Drive (CSV fallback when tenant blocks Sheets) |

Built on the official stack: [Lark Node SDK](https://www.npmjs.com/package/@larksuiteoapi/node-sdk) · Feishu Card v2 · long-connection BOT · optional [Doubao Work](https://www.feishu.cn/content/article/7677519271848610746) MCP connector.

## Repository layout

| Package | Role | Docs |
| --- | --- | --- |
| [`chatbot/`](chatbot/README.md) | **Core** — long-connection BOT, card interactions, session store, AI + preset games | [chatbot/README.md](chatbot/README.md) |
| [`doubao-work/`](doubao-work/README.md) | **Skill pack (flagship)** — doc-QA knowledge-base skill (public Feishu docs → Q&A, zero setup) + optional MCP connector / interactive cards | [doubao-work/README.md](doubao-work/README.md) |
| [`knowledge/`](knowledge/README.md) | Quiz CSV corpora (Feishu / Doubao / Agent / industry timelines) | [knowledge/README.md](knowledge/README.md) |

**Boundary (by design):** card click callbacks only reach the process that owns the Feishu WebSocket. `doubao-work/` never talks to Feishu directly — it calls a localhost control API on `chatbot/`, so interaction state stays correct.

```text
Feishu group ──WS──► chatbot/ (Card v2 · CardKit · store)
                         ▲
                         │  Bearer control API (127.0.0.1)
                         │
Doubao Work ──MCP──► doubao-work/ (connector + skill)
```

## Capabilities at a glance

**AI-generated cards (needs `AI_API_KEY`)**

- Vote · roster form · generative info card · conversational card edits (“add option: juice”)
- Streaming chat · confirm gate · VChart results · one-click export

**Preset play hub (works offline — no AI)**

- Quiz banks · MBTI / DISC / SBTI / slacking index · Hangman · branching story · RPS · fact draw

**Design system**

- Material 3–inspired roles on Card v2 tokens · zero decorative emoji in copy (enforced by `design.test.js`) · Lucide-style icons via Feishu icon library / custom upload

## Verify

Static verification snapshot (Node built-in test runner):

| Suite | Command | Result |
| --- | --- | --- |
| chatbot | `cd chatbot && npm test` | **167 pass / 0 fail** |
| doubao-work | `cd doubao-work && npm test` | **8 pass / 0 fail** |
| Design regression | emoji / layout contracts in `chatbot/test/design.test.js` | covered |
| Control API | auth · create vote/form · roster ≤100 | covered |
| MCP round-trip | tools/list · create_* · session status/export | covered |

```bash
cd chatbot && npm test
cd ../doubao-work && npm test
```

## Quick start

```bash
cd chatbot
cp .env.example .env   # FEISHU_APP_ID / FEISHU_APP_SECRET ; optional AI_API_KEY
npm install
npm start
```

Feishu developer console setup (scopes, events, bot menu): see [chatbot/README.md](chatbot/README.md).  
Doubao Work connector + buddy teaming: see [doubao-work/README.md](doubao-work/README.md).

## Contest materials

- Awards plan & competitive scan — [chatbot/docs/AWARDS-PLAN.md](chatbot/docs/AWARDS-PLAN.md)
- 3-minute demo script — [chatbot/docs/DEMO.md](chatbot/docs/DEMO.md)
- Card design contracts — [chatbot/SPIRIT.md](chatbot/SPIRIT.md) · [chatbot/docs/DESIGN.md](chatbot/docs/DESIGN.md)
- **Dual-track submissions (real practice / skill creation)** — [submissions/README.md](submissions/README.md)

## License

[MIT](LICENSE)
