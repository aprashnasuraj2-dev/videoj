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
