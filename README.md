<div align="center" style="display:flex;flex-direction:column;">
  <a href="https://nullish.ch">
    <img src="https://github.com/usenullish/nullish/raw/main/packages/client/public/social-image.jpg" width="100%" alt="nullish social banner" role="presentation"/>
  </a>
</div>

<br />

<p align="center">
  <a href="https://github.com/usenullish/nullish/actions/workflows/checks.yml"><img alt="Checks" src="https://img.shields.io/github/actions/workflow/status/usenullish/nullish/checks.yml?style=flat-square&label=checks"></a>
  <a href="https://github.com/usenullish/nullish/actions/workflows/tests.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/usenullish/nullish/tests.yml?style=flat-square&label=tests"></a>
  <a href="https://github.com/usenullish/nullish/actions/workflows/tests-e2e.yml"><img alt="E2E Tests" src="https://img.shields.io/github/actions/workflow/status/usenullish/nullish/tests-e2e.yml?style=flat-square&label=e2e"></a>
  <a href="https://github.com/usenullish/nullish"><img src="https://img.shields.io/github/last-commit/usenullish/nullish/main?commit&style=flat-square" alt="Last Commit" /></a>
</p>

## ⭐️ Description

[nullish](https://nullish.ch) is an accounting app for Switzerland, with all the boring stuff, like invoices, QR-bills, bank reconciliation, VAT and year-end closing, plus an assistant you can talk to.

It is open source and self-hostable.

> [!WARNING]
> **Status: alpha.** Things move fast, expect breaking changes.

- 🚀 Getting started [[Docs](https://nullish.ch/en/getting-started/)]
- 💬 Assistant [[Docs](https://nullish.ch/en/assistant/)]
- 🧾 Billing [[Docs](https://nullish.ch/en/billing/)]
- 🏦 Banking [[Docs](https://nullish.ch/en/banking/)]
- 📒 Accounting [[Docs](https://nullish.ch/en/accounting/)]
- 📦 Migration [[Docs](https://nullish.ch/en/migration/)]
- 🔌 REST API [[Docs](https://nullish.ch/en/developers/api/)]
- 🤖 MCP [[Docs](https://nullish.ch/en/developers/mcp/)]
- 🏠 Self-hosting [[Docs](https://nullish.ch/en/developers/self-hosting/)]

## 🧪 Local Development

> [!NOTE]
> Requires [Bun](https://bun.sh) and Docker.

```bash
bun install --frozen-lockfile
```

Run the database:

```bash
bun run db:run:dev
```

Run the API:

```bash
cd packages/server && bun run dev
```

Run the client:

```bash
cd packages/client && bun run dev
```

Optionally, run an LLM for the AI chat with [Ollama](https://ollama.com).

```bash
bun run llm:run:dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser and have fun!

## 💬 Contact

Email us at [hi@usenullish.com](mailto:hi@usenullish.com).
