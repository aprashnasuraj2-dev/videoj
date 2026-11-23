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


## Browser-direct BYOK

`createOpenRouterByokAdapter({ key, model })` is the caller-funded path. It is intentionally narrower than an arbitrary OpenAI-compatible endpoint:

- fixed router origin: `https://openrouter.ai`;
- exact chat endpoint: `/api/v1/chat/completions`;
- key held only in the adapter closure and removable with `clear()`;
- browser request uses `credentials: "omit"`, `redirect: "error"`, `cache: "no-store"` and `referrerPolicy: "no-referrer"`;
- the key appears only in the router `Authorization` header and is never a public adapter property;
- provider errors are converted to stable codes without response bodies or key values.

This source/test checkpoint does **not** claim that production browser CORS, a real account/key, a particular model, pricing or quota were verified. Those require a controlled live browser check. The funded same-origin adapter remains independent, so either path can be disabled without silently switching credentials or origins.
