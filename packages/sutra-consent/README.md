# @sutra/consent

Framework-neutral consent boundary for SUTRA external peer/MCP contact.

It shows the destination origin, contact kind, public purpose and **field labels** intended for disclosure before an operation may run. The module defaults to per-contact approval. A session-scoped approval is remembered only when the user explicitly selects that scope, and only for the exact origin/kind/purpose/disclosure/network/resource tuple. The GET helper binds the canonical full resource URL (including a public query, if present) before displaying the decision; raw resource paths and queries are deliberately omitted from redacted events. At most 128 session grants are retained.

`perform()` is the generic boundary for peer or MCP operations. `fetchJsonWithConsent()` is a bounded public-JSON helper: GET only, credentials omitted, redirects rejected, same consented origin, UTF-8 JSON and a 64 KiB hard ceiling.

The event export deliberately records no request text, tool arguments, model output, credentials, response bodies or failure messages. Disclosure inputs are names such as `network name`; do not pass values or private context.

This makes permission visible and inspectable. It does **not** establish publisher reputation, factual truth, endpoint safety, or independent adoption.

## Minimal use

```js
import {createConsentInspector,fetchJsonWithConsent} from './index.js';

const inspector=createConsentInspector({
  decide: async intent => showYourConsentUi(intent)
});

const manifest=await fetchJsonWithConsent({
  inspector,
  contact:{
    origin:'https://peer.example/',
    kind:'peer_manifest',
    purpose:'Load the declared peer manifest',
    disclosure:['network name'],
    network:'checklist'
  },
  url:'https://peer.example/agent-manifest.json'
});
```

See `examples/` for a plain-browser integration that uses a simulated transport and therefore makes no third-party request.

`authorize(input, {signal})` and `perform(input, effect, {signal})` accept optional cancellation. The decision callback receives `{signal}` as a second argument and the effect receives its effective signal as a second argument. `clearSession()` revokes pending approvals and signals running effects; a late decision cannot restore a revoked grant. An already initiated external request cannot be undone, so cancellation is not evidence of zero external effects. The public GET helper cancels unread or late bodies and rejects partial or redirected responses.
