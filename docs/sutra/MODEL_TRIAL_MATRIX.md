# SUTRA local model trial matrix — preparation only

Observed 2026-11-24. These are **open-weight candidates**, not approved releases or loaded model assets. The Worker remains default-off. Catalog artifact sizes are not equivalent to VRAM, model quality or inference costs.

| Candidate | Published model download | License/source | Proposed role | Missing evidence |
| --- | ---: | --- | --- | --- |
| Qwen3.5 4B | Ollama reports roughly 3.3–4.0 GB | [Official Qwen3.5 4B](https://huggingface.co/Qwen/Qwen3.5-4B) lists Apache-2.0; [Ollama model catalog](https://ollama.com/library/qwen3.5) advertises tools | First cost-conscious operator hardware trial | Real memory, SSE/tool-call compatibility, factual citation accuracy, p95 latency |
| Qwen3.5 9B | Ollama reports roughly 6.6–7.6 GB | [Official Qwen3.5 9B](https://huggingface.co/Qwen/Qwen3.5-9B) lists Apache-2.0 | Quality comparison where memory allows | Higher memory, energy, concurrency and latency must justify better source fidelity |
| Qwen3 4B | Depends on quantization and engine | [Qwen3 4B official card](https://huggingface.co/Qwen/Qwen3-4B) documents function calling | Older, independently documented tool-call comparator | Exact quantization license, chat template, speed and real compatibility |

**Evidence classes:** Vendor model cards and Ollama catalog demonstrate announced model families, license and indicative download sizes. They are not SUTRA hands-on tests. The current 40-case SUTRA source set is synthetic development data and cannot select the strongest real language model. Never substitute external leaderboard rankings for human-reviewed SUTRA evidence.

## Operator-owned acceptance before enabling an actual local model

1. Freeze the exact model artifact SHA, quantization, license, tool parser, engine version, hardware and power measurements. Do not auto-download model weights from the learner.
2. Verify the source receipt contract: correct source/cue/hash/time, strict unsupported abstention, no fabricated quotations, and proper failure after incompatible streaming tool-call chunks.
3. Conduct 20 answerable, 10 unanswerable and 10 conflict/adversarial genuinely human-reviewed held-out questions, with rubric frozen before tuning. Show all failures and confidence intervals, not just pass rate.
4. Measure model load time, context tokens, prompt evaluation time, generation speed, run p50/p95, memory and sustained concurrency at 1, 2 and 4 clients; include partial/cancelled requests and gateway 429.
5. Measure real incremental equipment power, electricity tariff, hosting, bandwidth and operations. Full monthly cost = equipment amortization + electricity + networking + operations + Worker service. Zero vendor token bill does not equal zero infrastructure cost.
6. Retain the default citation-only path when unavailable. Admit an operator-supplied model only after authorization, full compatibility and actual quality evidence.

## Engine documentation and limitations

- [Ollama OpenAI compatibility](https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx) describes a subset of OpenAI-compatible Chat Completions with tool and streamed usage support. It does not establish SUTRA compatibility.
- [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) documents chat completions and function calling; correct Jinja template may be required.
- SUTRA's Worker and gateway expect an exact, bounded, streamed tool-call protocol. Failure must be incomplete, not silently retried or represented as verified.

This is a deployment-free evidence artifact; no model, public endpoint or paid service was contacted.
