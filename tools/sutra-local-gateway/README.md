# SUTRA loopback inference gateway — developer tool (not deployed)

Node 22+ module, **zero NPM dependencies**, separate from the public learner bundle. Implements a fixed, bounded `POST /v1/chat/completions` bridge to a loopback-only Ollama or llama.cpp OpenAI-compatible server; it never accepts a caller URL, never forwards an Origin header, and requires an operator-only bearer token. It does **not** run a model itself, select or download weights, offer TLS on the internet, or guarantee a particular model handles tools.

## Prerequisites

- Operator-controlled computer/server with licensed model weights, measured VRAM, secure reverse-proxy or authenticated HTTPS tunnel, egress capacity and operator authorization. The selected model must demonstrably support tool-calling SSE; ordinary text generation is not enough for SUTRA's agentic graph.
- An Ollama or llama.cpp server bound to `127.0.0.1:11434` with OpenAI-compatible `/v1/chat/completions`. Never expose that bare endpoint to the internet.
- Random 32+ character private gateway token, exact `SUTRA_GATEWAY_MODEL`, and operator-controlled HTTPS public hostname forwarded to this loopback gateway. Do not use user-supplied domain names or browser storage to configure secrets.

## Local-only example (never a production launch command)

```sh
export SUTRA_GATEWAY_TOKEN='<operator generated 32+ character token>'
export SUTRA_GATEWAY_MODEL='<exact downloaded local tool-model id>'
export SUTRA_GATEWAY_PORT=8443
export SUTRA_GATEWAY_UPSTREAM_PORT=11434
node tools/sutra-local-gateway/gateway.mjs
```

This binds **only** `127.0.0.1:8443`, HTTP, on the operator machine. It cannot be used directly as a publicly reachable Cloudflare Worker upstream. An authenticated TLS reverse proxy/tunnel with a certificate and firewall must be separately provisioned and tested after release authorization. Configure the Worker with the *HTTPS* gateway URL, secret token and exact approved model using `SUTRA_INFERENCE_BACKEND=self_hosted`; the Worker continues to enforce its own quota, catalog identity and request validation. The gateway forwards at most 33,792 request bytes and 262,144 response bytes, one call to the fixed loopback port, up to 30 seconds, no retries. A gateway bearer token is **not** a substitute for network isolation and accounting. Tests use a fake local model server, not a real GPU.

`node --test tools/sutra-local-gateway/*.test.mjs`

For hands-on model acceptance, verify tool-call stream format, explicit output bounds, cancellation propagation, prompt/receipt correctness, p50/p95 latency under 1/2/4 concurrent users, electricity and 30-minute sustained-service behavior before enabling a public upstream. Release still prohibited.
