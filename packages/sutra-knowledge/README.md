# @sutra/knowledge — restricted exact-quantity kernel

First SUTRA 2.0 executable vertical slice, not a general theorem prover. Browser-native ES modules and Web Crypto; Node 24 test runner; no external dependency, model, network request or executable input. Reuses the existing SUTRA consent package's duplicate-key bounded wire parser directly. The package stays private until portability and browser integration gates pass.

```sh
node --test packages/sutra-knowledge/test/*.test.mjs
node packages/sutra-knowledge/examples/observatory.mjs
```

A graph declares assumed exact rational quantities in SI base dimensions [length, mass, time], two-operand arithmetic or a two-operand constraint. Inputs are **assumption_declared** (not evidence verified); derive results are **computed**; constraints are conditional and may be satisfied, refuted or incompatible. Missing/invalid graph references reject admission; an invalid quantity operation blocks dependent operations. No implicit conversion or semantic inference. SI scaling is the caller's responsibility. No general formal proof, probability, uncertainty interval, clinical or physical safety claim. The beam example assumes a formula and uses synthetic inputs.

Deterministic receipt identities bind node, kernel identifier, ordered dependency receipt identities and actual outcome. This is a restricted canonical JSON profile, not general RFC 8785 conformance. Exact replay recomputes using the same implementation in a fresh instance; an independently implemented consumer remains a separate gate. Digest is integrity, not publisher authenticity. A trusted in-process cache reuses unchanged receipts and never imports supplied reports as cache. Transitive dependency identities change even if a numeric output happens to remain equal.

Limits: 64 Ki UTF-16 characters of graph JSON, 256 nodes, binary edges, depth 32, 48 decimal digits per input numerator/denominator, 512-bit normalized rationals, dimension exponents ±16, bounded canonical report. Kahn traversal sorts the bounded ready queue; this version still visits and hashes every node, so reported avoided **calculations** are not an end-to-end latency claim. Cycles and constraint-as-quantity dependencies fail admission. No untrusted executable callbacks. There is no external evidence resolver yet.

The Observatory CLI asserts a real deterministic state change, exact incremental recomputation and rejection of modified/stale receipt artifacts. It is not a browser agent, deployment test, or novelty claim.

## Separate reference implementation

`reference/verify.py` recomputes full canonical receipts from the graph using Python Fraction, hashlib and DFS rather than the JavaScript implementation. Run `node packages/sutra-knowledge/examples/export-challenges.mjs > challenges.json` then `python3 packages/sutra-knowledge/reference/verify.py challenges.json`. Exact positive controls, stale/forged digests/outcomes, ambiguous JSON and Unicode/dimensional fixtures are checked. This is independently implemented but same-project, not independently operated. CI required before credit.
