# Differential Proof Capsule verification

The test corpus is seeded with actual browser-exported current and historical capsules and the actual browser-downloaded Python verifier archive. It checks 77 explicit expected outcomes, not agreement alone: 13 accepted cases and 64 refusals. All accepted cases require the same capsule, payload, case and history digests plus the same target state. All refusals require matching reason and Python exit status. The corpus exercises exact retained digest mismatch, valid historical/alternate state with its own pin, re-encoding, size boundaries, strict UTF-8, duplicate members including escaped aliases, schema closure, invalid numerical representations, case identity, semantic forgery, copied identity and invalid event history.

The producer's numeric profile uses safe integral platform Number values; it is not a lexical number-canonicality requirement. A semantically equivalent but byte-different encoding has a different capsule pin. Exact original bytes are bound by an independently retained digest. A valid alternate state plus its replacement pin is accepted; no claim is made about freshness or authenticity of the replacement pin. These fixed cases do not prove equivalence over every possible wire string.

Run the same test offline from the repository root:

`node packages/sutra-knowledge/examples/capsule-parity.mjs CURRENT_JSON CURRENT_PIN HISTORICAL_JSON HISTORICAL_PIN DOWNLOADED_VERIFIER.pyz`
