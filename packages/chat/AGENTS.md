# chat

LLM chat, e.g. the prompt that serves as the dashboard of the client.

- Talks to any OpenAI-compatible endpoint (Ollama in development, see `docker-compose.dev.yml`) with the official `openai` package. The endpoint, model and key come from `nullish-env`, so switching provider is configuration, not code. No Vercel libraries.
- Reaches the data only through an MCP client handed over by the caller. The package depends on neither `engine`, `db` nor `server`: row-level security is enforced on the MCP side, and the chat chooses which of the MCP tools to expose for each domain.
- The caller (`server`) connects the MCP client to its own MCP server in-process and owns the HTTP endpoint and the streaming.

## Domains

The chat works either inside one organization or without one, and never switches during a conversation.

- **Inside an organization**, every tool is offered. The chat sets `_organizationId` on each call, so the model cannot pass another one.
- **Without an organization**, only read-only tools are offered (`readOnlyHint: true`). The model passes `_organizationId` itself, e.g. to answer "where do I have open invoices?" across the user's organizations.

Why no writing without an organization: the model picks the organization, and row-level security only keeps it within the user's own ones, not on the one they meant. A wrong read costs a second question. A wrong write leaves a record to find and delete, or a journal entry to reverse. Inside an organization, the page fixes the target. Writing without one would first need the chat to show the chosen organization and wait for a confirmation.

Organizations are created through the wizard only, not through the chat.
