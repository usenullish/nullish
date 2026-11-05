# nullish

An open source, self-hostable accounting, invoicing and banking software for Swiss businesses, built to work with AI agents.

> [!WARNING]
> **Status: alpha.** Things move fast, expect breaking changes.

## Development

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
