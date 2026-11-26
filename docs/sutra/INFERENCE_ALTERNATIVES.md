# SUTRA inference choices — operator architecture, not a release authorization

Observation: 24 November 2026. This is a design and tested-implementation record. SUTRA remains an isolated draft, with actual rights-cleared video, human factual review, public HTTPS, real hardware tests and operator model funding unverified. `source-consistent` does not mean factually true.

## Decision summary

**Default learner path:** deterministic local source retrieval. No model weights, prompt upload, provider account, or additional question-time network traffic. This already runs in the browser, produces exact catalog-matched receipts and deliberately abstains rather than inventing a semantic answer. It is a useful source-navigation product, **not** a language model.

**Operator-controlled generative enhancement:** explicitly configured self-hosted model through a private authenticated HTTPS gateway and the existing bounded Worker router. It is a genuine inference transport option, but model weights and an independent physical GPU are not provided in this repository. Tool-call semantics, end-to-end availability, inference quality, energy, actual token accounting and deployment costs require real tests.

**Conditional future experiment:** opt-in browser WebGPU local inference, only after a version-pinned, rights-compatible model bundle and safe weight download/cache policy pass device and low-bandwidth acceptance. No browser generative model is shipped in the present code; documentation is not a model.

## Tradeoff matrix

| Path | Per-question provider bill | Other cost and constraints | Actual state | Main counterexample |
| --- | --- | --- | --- | --- |
| Citation-only in-browser lexical evidence retrieval | **0** tokens / **0** inference API calls; **0** question-time network calls after source load | Client RAM/CPU, existing initial source/catalog transfer; bounded local index <=5,000 cues and <=160,000 distinct cue-token entries, 96 unique tokens/cue | **Implemented, automated browser/unit verified** | A meaningful paraphrase with no shared words must abstain; source text may be factually incorrect |
| Operator self-hosted Ollama/llama.cpp behind private TLS gateway | **0 external per-token API charges** | GPU/CPU capital, electrical energy, secure gateway, bandwidth, Cloudflare Worker and staff operations; throughput/latency measured only on live operator hardware | **Implemented optional transport, simulated SSE/tool integration tested; no real model deployed** | Small model misses required tool-call format or overloads hardware; failure must remain incomplete |
| In-browser WebGPU via WebLLM / Transformers.js | **0 model API calls** | Model download/cache may require multi-GB client storage/network; WebGPU compatibility, weight license, device thermal limits and cold-load time | **Considered, not implemented** | No WebGPU or low-memory mobile device; must never download remote weights without explicit opt-in |
| Free-tier third-party hosted APIs | May be zero within unspecified fair-use limits | Rate caps, revocation, account dependency, user-data handling, changing terms | **Not chosen as default** | Judging traffic or quota reset makes the demo fail |
| Externally billed hosted model | Nonzero unless funded/sponsored | Token/run cost, client abuse quota, vendor concentration | **Optional explicit backend only; disabled by default** | Key or budget exhaustion stops inference while local evidence still works |

## Data flow and authority

The learner validates a same-origin profile, catalog SHA-256, and transcript before offering source actions. A local question is tokenized via normalized Unicode grapheme components and ranked by source-term overlap, not generative semantics. Only a strict `read_cue` source capability can construct a citation; receipt validation is repeated before displaying seek and review actions. One phrase shared by multiple cues is shown as ambiguous. No prompted text can authorize a network destination or a new source.

The optional provider path remains same-origin to the browser. If the operator explicitly enables `self_hosted`, the Worker enforces origin, request schema, model allowlist, active concurrency, global/client/request-input/output limits, exact catalog precondition and streamed SSE response validation. The backend URL is an operator-owned canonical HTTPS `/v1/chat/completions`, not a visitor field or local LAN endpoint. Secret authorization remains Worker-only, and each inference attempt uses exactly the configured endpoint with `redirect: error`. No automatic retries. The default configuration has no backend: no paid model can silently take over.

**Self-hosted is not gratis compute.** Let `C_h` be monthly allocated equipment+hosting+energy+operations, `C_w` Worker/egress expense and `N` completed eligible questions; effective cost per completed question is `(C_h+C_w)/N`. That number is **unknown** until actual hardware, power price, workloads, concurrency and aborted runs are measured. Comparing only the external token invoice would systematically understate costs. At up to 8 model calls per composed task, 100 questions could request up to 800 model calls; existing daily quotas count actual calls, not whole sessions. The conservative quota is not a currency budget.

## Quality and release acceptance

1. Preserve the deterministic positive, no-match, ambiguity, malformed-catalog and adversarial cases as regression tests. These are engineering fixtures, not population-representative semantic scores.
2. Freeze rights-cleared video, written guide, transcription, cue IDs and claim provenance. Independently review source truth. Hash matching is not sufficient.
3. On a pinned real local model/engine/version, measure exact source-receipt match, false citation rate, unsupported-question abstention, tool-call validity, model call distribution, latency p50/p95, cancellation, quota exhaustion and gateway reconnect under simultaneous users. Record all failures and the number of observations.
4. Repeat on actual participant target devices and real bandwidth constraints. A cold multi-GB download cannot be hidden inside the existing 700 KiB / 5-second transcript-first performance target.
5. Retain the original unverified default for all clients when model/hardware is unavailable. Never silently switch to an unapproved provider.
6. Hold the release, public model, domain, outside adoption and submission gates until the user separately authorizes them and the relevant acceptance record passes.

### Vendor documentation inspected 2026-11-24

- WebLLM browser/WebGPU: https://webllm.mlc.ai/docs/user/get_started.html ; https://github.com/mlc-ai/web-llm
- llama.cpp server OpenAI chat completions and tool calling: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- Ollama local OpenAI-compatible mode: https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx
- Transformers.js WebGPU device caveats: https://huggingface.co/docs/transformers.js/en/guides/webgpu

All cited upstream capabilities are vendor documentation, not measurements of SUTRA hardware or model correctness.

### Implementation reconciliation, 2026-11-24

The no-model learner question route is first in the user journey, builds its bounded index only on first use, supports Nepali combining marks and creates exact local source receipts. The [model trial matrix](MODEL_TRIAL_MATRIX.md) scopes real Qwen open-weight comparisons without implying VRAM, tool accuracy or cost measurements. The separate loopback-only gateway passed seven contract tests, but real hardware, TLS deployment and meaningful model benchmark remain blocked.

### Source/secret boundaries verified on the current learner revision

Browser inference and catalog-source POSTs send no ambient cookies. Malformed nested tool-call envelopes are refused at the Worker **before** quota admission, and the loopback gateway revalidates roles, tool envelopes and context independently. A real Node HTTP integration tests cancellation propagation through the Worker and gateway into a local **fake** SSE model process; this is stronger than a mocked fetch but still not evidence of physical GPU/model quality. First-load HTML now exposes an accessible status while same-origin content bytes are validated and does not offer model, playback or review actions prematurely.
