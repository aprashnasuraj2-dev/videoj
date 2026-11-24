# Session 0033 — local streamed-model premature completion refusal

Observed 2026-11-24T06:47:55Z on tested code `221bf89a836b3299cfd924fbd5ff5aaf49659afe`, draft SUTRA PR #49, no deployment, real model, paid inference or public third-party contact.

## Correctness change

The Node-loopback self-hosted system test now runs three different integration scenarios using **real local HTTP connections to a fake model**, not a model or vendor service:
1. Completed SSE traverses bounded adapter → quota Worker → authenticated local gateway → fake tool-calling engine → two-agent runtime.
2. User abort closes the held-open model stream, releases the Worker quota lease and never retries.
3. **New X007-15**: the fake model returns HTTP 200 and a convincing text fragment, then ends without a valid finish reason or `[DONE]`. The client must reject the incomplete stream; a partial answer is not promoted to completed. Exactly one model request and one quota reservation are observed; lease released. This is a negative-path transport test, not a claim about answer quality.

Evidence: [Learner shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342978228/job/138270748475) 100 app + **96 action/inference/API** +112 pinned runtime +8 peer = **316 automated tests passed**, 10 Chromium browser integration profiles. All **19 workflows** passed at the exact revision, including seven independent [gateway tests](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342978086) and headless Chromium/Firefox/WebKit compatibility.

## Repeated exact-profile measurements

Chromium headless at 1280×800, 1 Mbps up/down, 150 ms latency: gzip shell **458,664 bytes**, transcript usable **2,913ms**, video ready **3,556ms** after explicit click, native seek **66ms**, zero media requests before explicit click. One complete MP4 HTTP body **8,327 bytes**; browser-CDP media byte count remains **null/unobserved** (do not claim zero).

## Release/user/quality boundary

**609/1,000 original; 645/1,037 total verified; 45 fully verified phases, 6 historical omissions, 1 hardware blocked check.** The local zero-model path is real and no per-token provider bill, but cannot invent semantic knowledge or establish truth. The optional self-hosted model chain remains fake-model protocol-tested only; a real approved local GPU/model, exact tool-call compatibility, full cost measurements, rights-cleared original media, human reviewers and real-world pilot are outstanding. P078-02 remains pending and all deployment/public inference/release/submission gates remain closed.
