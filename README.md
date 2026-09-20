<div align="center"><img src="docs/assets/hero.svg" width="100%" alt="feishu-ai — Agent-native Card UI on Feishu Open Platform" /></div>

<div align="center">
<pre>~/feishu-ai (main*)  chatbot 167 pass · doubao-work 8 pass  card-v2 · cardkit · mcp</pre>
</div>

<div align="center">

[![English](https://img.shields.io/badge/lang-English-909BFF?style=for-the-badge&labelColor=0d1117)](./README.md)
[![中文](https://img.shields.io/badge/lang-%E4%B8%AD%E6%96%87-8b949e?style=for-the-badge&labelColor=0d1117)](./README.zh-CN.md)

</div>

## feishu-ai

**Agent-native Card UI on Feishu Open Platform**
— conversation is the interface: interactive cards that generate, stream, and mutate in place.

[![tests chatbot](https://img.shields.io/badge/tests-chatbot%20167%20pass-909BFF?style=flat-square&logo=vitest&logoColor=white)](chatbot/)
[![tests doubao-work](https://img.shields.io/badge/tests-doubao--work%208%20pass-909BFF?style=flat-square&logo=vitest&logoColor=white)](doubao-work/)
[![verify](https://img.shields.io/badge/verify-design%20%7C%20control%20%7C%20MCP-00B89F?style=flat-square)](chatbot/test/design.test.js)
[![node](https://img.shields.io/badge/node-%3E%3D18-8b949e?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![card](https://img.shields.io/badge/Feishu-Card%20v2%20%2B%20CardKit-8b949e?style=flat-square)](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-structure)
[![license](https://img.shields.io/badge/license-MIT-8b949e?style=flat-square)](LICENSE)

Most Feishu bots reply with **text** — this project replies with **Agent UI**.

## Tips for getting started

| | |
| --- | --- |
| **Read** | [chatbot/README.md](chatbot/README.md) — Feishu console setup (scopes, events, bot menu) and the architecture tour |
| **Run** | `cd chatbot && cp .env.example .env && npm install && npm start` — the bot connects over a WebSocket long connection |
| **Output** | playable cards land directly in your Feishu chat; `npm run preview` exports every card shape as JSON to `chatbot/preview/` |

---

## Positioning

| Layer | What it means on Feishu |
| --- | --- |
| **Generate** | Natural language → Card JSON (vote / roster form / info) via an OpenAI-compatible model |
| **Stream** | CardKit typewriter streaming for chat replies (fallback to static cards) |
| **Mutate in place** | Interaction callbacks + ACK atomic card updates — no page jump, no new spam messages |
| **Human-in-the-loop** | Publish / export / destructive actions require an explicit confirm card |
| **Persist** | Summaries export to Feishu Sheets / Drive (CSV fallback when tenant blocks Sheets) |

## Pipeline

```text
Feishu group ──WS──► chatbot/ (Card v2 · CardKit · store)
                         ▲
                         │  Bearer control API (127.0.0.1)
                         │
Doubao Work ──MCP──► doubao-work/ (connector + skill)
```

| Stage | Path | Contract / gate |
| --- | --- | --- |
| **1 · Event** | Feishu group → `chatbot/` over WebSocket long connection | card click callbacks only reach the process that owns the socket |
| **2 · Generate** | natural language → Card JSON (vote / form / info) | needs `AI_API_KEY`; schema + header template enum validated |
| **3 · Interact** | button value `{a, p}` round-trips verbatim | local deterministic handler → ACK atomic swap within the 3s callback budget |
| **4 · Extend** | Doubao Work → MCP → `doubao-work/` → localhost control API (Bearer) | `doubao-work/` never talks to Feishu directly; session state stays in the `chatbot/` store |
| **5 · Persist** | store → Feishu Sheets / Drive export (CSV fallback) | **confirm card** required before publish / export / destructive actions |

## Repository layout

| Package | Role | Docs |
| --- | --- | --- |
| [`chatbot/`](chatbot/README.md) | **Core** — long-connection BOT, card interactions, session store, AI + preset games | [chatbot/README.md](chatbot/README.md) |
| [`doubao-work/`](doubao-work/README.md) | **Skill pack (flagship)** — doc-QA knowledge-base skill (public Feishu docs → Q&A, zero setup) + optional MCP connector / interactive cards | [doubao-work/README.md](doubao-work/README.md) |
| [`knowledge/`](knowledge/README.md) | Quiz CSV corpora (Feishu / Doubao / Agent / industry timelines) | [knowledge/README.md](knowledge/README.md) |

## Contracts & verification

| Contract | Enforced by |
| --- | --- |
| Zero decorative emoji in card copy (ASCII art exempt) | `chatbot/test/design.test.js` |
| Header icons only from the registry, unique within a card | `chatbot/test/design.test.js` |
| Header template inside the legal enum, topic palette respected | `chatbot/test/design.test.js` |
| Option-tab colors unique per category (12-color palette ceiling) | `chatbot/test/design.test.js` |
| Every interactive element carries `behaviors` | `chatbot/test/design.test.js` |
| Control API Bearer auth · roster ≤ 100 · 404 fallbacks | `chatbot/test/control.test.js` |
| MCP round-trip: tools/list · create_* · session status/export | `doubao-work` e2e |

| Suite | Result |
| --- | --- |
| chatbot (`npm test`) | **167 pass / 0 fail** |
| doubao-work (`npm test`) | **8 pass / 0 fail** |

## Usage

```bash
cd chatbot
cp .env.example .env   # FEISHU_APP_ID / FEISHU_APP_SECRET ; optional AI_API_KEY
npm install
npm start

npm test               # 167 cases: business logic + game state machines + design contracts
npm run preview        # export all card shapes as JSON for the card builder
```

```bash
cd doubao-work && npm test   # 8 cases: connector unit + e2e
```

## For consumers & platforms

| Consumer | What you get | Entry |
| --- | --- | --- |
| **Doubao Work users** | XsiaoLung skill pack: doc-QA knowledge base (flagship, zero config) + interactive cards + deploy/onboarding guides | [doubao-work/README.md](doubao-work/README.md) |
| **Feishu group admins** | Preset play hub that works offline — quiz banks, personality tests, Hangman, story, RPS | [chatbot/README.md](chatbot/README.md) |
| **Agent / quiz builders** | CSV corpora for Feishu, Doubao, Agent and industry timelines | [knowledge/README.md](knowledge/README.md) |

## Contest materials

| Material | Link |
| --- | --- |
| Awards plan & competitive scan | [chatbot/docs/AWARDS-PLAN.md](chatbot/docs/AWARDS-PLAN.md) |
| 3-minute demo script | [chatbot/docs/DEMO.md](chatbot/docs/DEMO.md) |
| Card design contracts | [chatbot/SPIRIT.md](chatbot/SPIRIT.md) · [chatbot/docs/DESIGN.md](chatbot/docs/DESIGN.md) |
| Dual-track submissions (real practice / skill creation) | [submissions/README.md](submissions/README.md) |

## License

[MIT](LICENSE)
