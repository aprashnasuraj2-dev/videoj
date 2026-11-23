# SUTRA controlled read-only MCP fixture

A zero-dependency local service used only to exercise browser MCP interoperability.

- Endpoint: `/mcp`.
- Protocol: JSON-RPC over HTTP using MCP protocol version `2025-06-18`.
- One intended tool: `lookup`; a second published tool exists deliberately so caller-side allow-list filtering can be tested.
- Read-only: no write, mutation, authentication, account, provider key, database, filesystem tool or arbitrary fetch capability.
- CORS: permits one configured caller origin, POST/OPTIONS, and only the headers required by this fixture. It never sets `Access-Control-Allow-Credentials`.
- Responses are synthetic and explicitly `truthStatus: "unverified"`.

This is test infrastructure, not a public MCP service and not production-availability evidence.
