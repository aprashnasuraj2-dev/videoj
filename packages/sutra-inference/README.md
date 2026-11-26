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
