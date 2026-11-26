# Current revision-bound engineering metrics — 0ef8a613

Exact product revision: `0ef8a613c1c8d6db522d50a1088f9528ad055d4b`. All ten PR workflows passed on this revision, including the full learner shell, Chromium/Firefox/WebKit matrix, engineering evaluation, neutral consumer, impact classifier, ingress and community candidates.

## Grounding baseline

20/20 synthetic literal retrieval cases matched the expected cue set in both paths; 10/10 synthetic adversarial comparison cases reached expected safe handling. Direct lookup median was 0.030092 ms in-process with zero scripted model calls and zero source RPCs. Delegated path median was 3.519918 ms, 90 scripted model calls total (4.5 median/case) and 90 source RPCs. Real provider tokens, paid cost and semantic precision remain **null/unmeasured**.

## Client laboratory profile

Chromium Headless 151.0.7922.34, 1280x800, shaped to 1 Mbps down/up and 150 ms latency:
- shell gzip: 418,268 bytes;
- transcript usable: 1,911 ms;
- encoded bytes at transcript: 192,406;
- media requests before explicit load: 0;
- video ready after click: 3,470 ms;
- incremental encoded transfer after explicit video action: 381,454 bytes;
- native seek feedback: 61 ms.

These are CI laboratory measurements, not public internet or field latency.

## Desktop-engine matrix

Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5 each passed the matrix on the exact source/media revision. Physical touch and human screen-reader testing remain untested.

## Evidence freshness

The metric registry is rebound to the exact measured revision instead of carrying Session 0018 values forward. Later documentation-only commits do not invalidate product metrics under the impact map. A future mapped product change marks the affected metric family stale until remeasurement/revalidation.

No production, human, live-provider or independent-adoption claim follows from these measurements.
