# @sutra/consent

Framework-neutral consent boundary for SUTRA external peer/MCP contact.

It shows the destination origin, contact kind, public purpose and **field labels** intended for disclosure before an operation may run. The module defaults to per-contact approval. A session-scoped approval is remembered only when the user explicitly selects that scope, and only for the exact origin/kind/purpose/disclosure/network tuple.

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
