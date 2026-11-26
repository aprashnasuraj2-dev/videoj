# SUTRA bounded inference adapter

`createProviderAdapter({origin, model})` implements the existing runtime model
contract. It posts only to `/api/infer` on the caller's exact origin. There is no
key or arbitrary upstream URL parameter. The model must also be allowed by the
server. A completed result requires a supported terminal finish reason **and**
`[DONE]`. Truncated, filtered, cancelled, oversized or malformed responses fail.

The parser supports the fixed provider's single-choice JSON data-line stream,
including fragmented UTF-8 and function arguments. It is not a general SSE client.
A total 256 KiB stream, 16,000 content characters, two tool calls and 8,000 argument
characters per call bound memory. Unknown provider fields are discarded.

Run `npm test` here. Tests inject a transport and perform no paid provider calls.
See `services/sutra-api/README.md` for the disabled server/operator boundary.

The default-inference browser SSE boundary accepts only a complete HTTP 200 text/event-stream from the fixed exact same-origin chat endpoint, with no cookies, redirects or cache. Incomplete/partial response status and content-range refuse completion; late noncooperative responses and rejected error streams are disposed. The protocol remains bounded in decoded bytes and model calls, but none of these controls proves upstream model truth or privacy practices.

The SSE boundary uses the dependency-free duplicate-member scanner shipped in the sibling `sutra-consent/strict-json.js` module. A chunk containing duplicate decoded JSON field names, or ambiguous fully assembled tool arguments, cannot certify completion. This source package is tested in the monorepo; no new standalone inference distribution is claimed.

## Extensible protocol workspace candidate
`createProtocolWorkspace` layers a user-configurable connection catalog and trusted protocol adapters over the existing vault and resource ledger. Built-in bounded non-streaming OpenAI-compatible and Anthropic Messages JSON profiles coexist with arbitrary trusted adapter IDs. An injected exchange is mandatory; no HTTP client, default network route, real key UI or hosted relay is provided. The exchange owns destination/authentication/consent/egress enforcement. Custom adapters are trusted host code, not user/model-supplied executable data. Request body bytes are calculated before reservation; response completion/usage must be admitted. Local loopback descriptors require a separate local transport. No claim of live provider interoperability or currency billing.

## Explicit Node-only loopback model connector (candidate)
`createLoopbackModelExchange({routes,deadlineMs})` is a separately invoked trusted-host transport for exact literal `127.0.0.1` or `[::1]` HTTP endpoints on explicitly approved ports 1024–65535, paths, protocols and model IDs. It supports no-key, approved bearer or Anthropic-key authentication, finite non-streaming JSON, bounded deadlines and bytes, no DNS/proxy/redirect/fallback, and explicit shutdown. Integrate only as the injected exchange of `createProtocolWorkspace` after operator approval. Never expose this local transport through a hosted relay or browser. Tests use local synthetic HTTP servers, not actual model inference or external providers. Local process identity, model ownership, OS compromise, upstream computation and paid billing are not authenticated by this transport.

### V2-159 — Native Ollama bounded wire

Native `/api/chat` adapter is selectable in the scripted Studio and admitted by the explicit Node loopback runner. The finite `options.num_predict` cap is enforced again at the socket boundary; only terminal `done: true`, `done_reason: stop`, text-only responses and bounded `eval_count` are admitted. Native route tests use a real literal-loopback fixture server, not a genuine model. No external hosted transport, real key, or offline-model guarantee is added. API reference: https://docs.ollama.com/api/chat and https://docs.ollama.com/modelfile. Exact revision CI pending.
