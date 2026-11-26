# SUTRA product scope decision — one inspectable learner journey

## Product thesis

SUTRA is an evidence-linked learning workflow for a technician reviewing a short lesson: find the exact source moment, inspect the written-source evidence separately, preserve disagreement or missing information, and explicitly save the reviewed reference. Portable agent/peer composition is valuable only when it lets a caller inspect a separately published guide capability without surrendering model policy, consent, source identity or local action control.

The mechanism is not “more agents.” Literal retrieval is deliberately zero-model when deterministic lookup is sufficient. Agent composition is reserved for work that benefits from a separate evidence/guide capability.

## Alternatives considered

| Product shape | Strength | Failure under SUTRA constraints | Decision |
| --- | --- | --- | --- |
| Generic chatbot over video/transcript | Fast to build; familiar UX | Weak source identity, easy to blur model text with evidence, little agentic-web differentiation | Rejected as primary product |
| Infrastructure-only graph/peer inspector | Strong conformance visibility | Judges can verify plumbing but not a coherent learner outcome | Keep only as optional developer lab |
| Full LMS/training platform | Broad surface area | Accounts, course management, permissions and analytics multiply scope without proving the hero task | Rejected |
| SUTRA evidence-linked learner + portable guide | Visible end-to-end outcome plus inspectable agentic composition | Requires strict evidence/consent boundaries and real content review | Selected |

**Counterexample:** if manual transcript search plus opening the written checklist is as fast and evidence-accurate as SUTRA, the product has not earned its extra orchestration. The eventual paired user test must report that result even if manual search wins.

## One hero workflow

1. Viewer asks or searches for a lesson step.
2. Deterministic source lookup finds exact cue evidence when literal matching is sufficient.
3. Optional inference may interpret the evidence but cannot turn model text into source proof.
4. Video cue and written-guide excerpt remain separate, versioned records.
5. Missing/conflicting evidence stays visibly unresolved.
6. User explicitly previews and confirms the exact receipt before local persistence.
7. Optional interoperability lab demonstrates peer loading/consent after the learner task, not in its critical path.

### Deferred journeys

Not minimum release: course enrollment, progress tracking, quizzes, certificates, customer records, billing, payments, operational device writes, customer/device inventory, arbitrary web search/crawling, autonomous peer writes, organizational admin, instructor dashboards, social/community features, recommendation feeds and generalized multi-course knowledge management.

## Minimum / optional / deferred

| Class | Included |
| --- | --- |
| **Must-have** | Transcript-first evidence retrieval, exact cue/source identity, actual media seek, source comparison, explicit uncertainty, reviewed local receipt, browser graph execution, caller-owned inference policy, consent-before-contact, bounded execution, reusable evidence/consent/starter tools |
| **Optional if already safe** | English/Nepali-draft UI, synthetic provider demonstration, developer peer inspector, redacted trace export |
| **Deferred** | BYOK, accounts, payments, certification, arbitrary external crawling, autonomous external writes, production analytics, course/LMS breadth |

Optional features are removable before any correctness/security gate.

## BYOK decision

**Direct BYOK is out of the minimum release.**

Why:
- Challenge/judge access must not depend on the judge supplying a personal key.
- Site-funded inference is already the intended default path.
- BYOK adds credential entry, storage/memory lifecycle, CORS/router selection, destination disclosure and canary-leak surfaces.
- No measured hero-task benefit requires BYOK.
- The current direct exact-word path already works without any model.

This is a scope decision, not evidence that funded inference is ready. The funded path remains a release blocker until a capped real provider test measures model identifier, token usage, price basis and exhaustion behavior.

### Evidence that would reverse the BYOK decision

Reconsider only if **all** are true:
1. The required free judge path remains independently satisfied.
2. A clear user need emerges that funded inference cannot serve.
3. A permitted browser router is tested with explicit CORS and exact destination policy.
4. Keys remain memory-only and are absent from peer artifacts, URLs, traces, analytics, exports and local persistence.
5. Physical/human acceptance does not reveal a usability or privacy regression.
6. The added surface does not displace a mandatory release gate.

## Exit boundary

The minimum release has **no accounts, payments, certification, arbitrary crawling or autonomous external writes**. It can read bounded project-approved source data and explicitly approved public peer artifacts. Local review persistence is user-confirmed and browser-local. A successful source-consistency check is never represented as operational certification or factual truth.
