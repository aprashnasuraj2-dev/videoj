# Hybrid semantic interpretation (development candidate)

The existing closed grammar is retained. The new hybrid interface admits competing meanings of open-language questions from an explicitly selected model or other caller, using only reviewed binding IDs and exact quote spans. It never treats the output of a language model as a verified fact. The package does not initiate external model requests.

1. Use `prepareHybridSemantic(input,{sourceIds})` to inspect the bounded local disclosure packet and its exact digest. No sources are selected by default.
2. An authorized caller can transmit the reviewed packet to a chosen language model, or construct an explicitly untrusted proposal locally. Use its response schema; return the exact packet digest, all plausible interpretations and missing context. Do not include private information or credentials.
3. Use `evaluateHybridSemantic(input,{sourceIds,approvedPacketPin,responseText})` to rederive the packet, reject drift and fabricated references, evaluate eligible operations through the actual reviewed compiler, and expose conditional divergences and clarification questions. All results retain mandatory semantic review.

This is an integration boundary, not evidence of live provider performance. The tests use explicit fixture proposals, not generated model responses. The pilot must separately measure real model precision/recall, independent human adjudication, abstention, cost and latency on scenario-separated cases. No semantic approval or automatic adoption is supported.

## Approved local model transport

The reviewed workspace now contains a local-only hybrid panel. Select sources, prepare the disclosure packet, inspect it, and import an untrusted JSON response. No browser-to-model network contact occurs. To obtain a response using an existing local Ollama or compatible endpoint, use `apps/sutra-v2/local-semantic.mjs` with a local JSON config containing version `sutra-local-semantic/v1`, exact sealed contractText and contractPin, sourceIds, connection {id,label,protocol,endpoint,model,authMode,credentialEnv}, maxOutputTokens (128–4096), timeoutMs (100–30000). Only literal loopback HTTP addresses are admitted. Use `authMode: "none", credentialEnv: null` for a genuinely unauthenticated local endpoint. For bearer or Anthropic authentication set an environment variable named SUTRA_LOCAL_…; never put credentials in the config.

```sh
node apps/sutra-v2/local-semantic.mjs --plan < semantic-config.json
node apps/sutra-v2/local-semantic.mjs --execute-local --approve-local-disclosure --approve-plan sha256:EXACT_DISPLAYED_PLAN_PIN < semantic-config.json > semantic-response.json
```

The runner performs one bounded request, validates the response through the actual hybrid engine, emits the raw admitted response for local import, and writes a digest/conditional disposition to stderr. It does not establish that the local process does not forward requests. No automatic retries or external model execution are claimed. The native fixture tests transport/consent only. The numerical readiness scorer consumes external labels with adjudicated resolution linked to the exact prediction digest, separately from model predictions; attestation pins must still be independently authenticated. Numerical thresholds do not authorize deployment.
