# SUTRA judging availability and manual recovery — pre-release runbook

Observed: 2026-11-26.

Official rule source rechecked:
https://cognizant-agenticweb.devpost.com/rules

This is a **planning/runbook artifact only**. It does not claim that SUTRA is deployed, that a previous production build has been rehearsed, that provider funding exists, or that monitoring is scheduled.

## Official judging window

The official rules currently state:
- judging begins: **2027-01-11 10:00 Pacific Time**;
- judging ends: **2027-01-18 17:00 Pacific Time**;
- winners are announced on or around **2027-01-19 08:00 Pacific Time**.

For the judging end, Pacific Time is PST (UTC-08:00) on 18 January 2027:

- **2027-01-19 01:00 UTC**
- **2027-01-19 06:45 Asia/Kathmandu (UTC+05:45)**

The final release checklist must recheck this official source again before submission/judging. A calendar conversion is not evidence that the organizer schedule cannot change.

## Availability objective

If a public SUTRA release is later authorized, the judging-period objective is:

1. keep the static learner, public agent artifacts, media/source evidence and reproduction documentation available without private setup;
2. keep the local evidence path useful even when optional inference is unavailable;
3. keep any enabled inference backend within a measured, funded and rate-limited operating envelope;
4. retain one known-good compatible release tuple: source revision + static bundle + agent artifacts + content/media hashes + inference contract/configuration;
5. recover manually from a bad provider/configuration/deployment without changing unrelated Patro, DHAGO or DETOUR routes.

This objective is not yet an availability result.

## Residual provider and infrastructure risks

### Hosted provider drift

Mechanisms:
- provider changes model behavior or tool-call format while retaining a model name;
- model/version is retired or becomes unavailable;
- rate limits or account policy change;
- upstream latency grows enough to exceed the SUTRA request/lease budget;
- provider returns partial or malformed streaming events;
- credential expires/revokes;
- price changes make the planned daily cap unaffordable.

Current mitigation:
- exact operator model allowlist;
- server-only credential;
- bounded output and concurrency;
- strict SSE/terminal/token checks;
- no automatic retry;
- local evidence path remains independent of model completion.

Remaining gap:
- no authorized live funded provider sample/economics yet.

### Self-hosted provider drift

Mechanisms:
- gateway certificate/DNS failure;
- model/engine update changes tool behavior;
- physical GPU/CPU instability, thermal throttling or insufficient memory;
- host reboot/process failure;
- upstream token expires;
- WAN link between Worker and gateway degrades.

Current mitigation:
- exact HTTPS gateway shape and server-side token;
- explicit backend configuration;
- fail-closed provider status;
- local evidence path remains available.

Remaining gap:
- no accepted real hardware/TLS measurement; `SUTRA-X007-08` remains blocked.

### Static hosting / route drift

Mechanisms:
- Pages/Worker route precedence changes;
- stale HTML references a newer/older graph/content artifact;
- wrong content type or SPA fallback replaces JSON/JS;
- cache policy serves incompatible mutable artifacts;
- custom-domain mapping collides with an existing AafnaiPatro route.

Current mitigation:
- immutable versioned agent/release paths;
- revalidation for mutable index/agent/media paths;
- API-only dynamic ingress tests;
- release-candidate identity/hash gates;
- separate proposed caller/peer projects.

Remaining gap:
- no public SUTRA production origins or production route sample exist yet.

### Quota/funding exhaustion

Mechanisms:
- many visitors consume daily call/token limits early;
- per-client abuse uses the global budget;
- ambiguous failed calls consume reserved capacity;
- judge traffic differs from development assumptions;
- judging lasts longer than the funded window.

Current mitigation:
- global/client/concurrency/input/output quota limits;
- conservative reservation accounting;
- optional inference can fail closed while local evidence remains usable.

Remaining gap:
- actual provider price, expected judge request distribution and available funding are not approved/measured, so P089-04/P089-05 remain open.

## Manual recovery sequence after an authorized public release

Use this order to avoid turning a provider incident into a broader site outage.

### A. Classify the failure

From a clean signed-out browser and direct artifact requests, determine whether the failure is:
1. static site unavailable;
2. agent/runtime/content artifact mismatch;
3. media unavailable;
4. inference status disabled/misconfigured;
5. inference provider/gateway failure;
6. quota/funding exhaustion;
7. browser-specific regression.

Do not infer the layer from one generic UI error.

### B. Preserve the local evidence path

If optional inference is the failing layer:
- disable/leave disabled inference rather than routing to an unapproved fallback;
- confirm local source lookup, transcript/evidence and review behavior still work;
- keep the UI explicit that inference is unavailable;
- do not reuse stale completed model action authority.

This may reduce optional capability but preserves the evidence-linked core rather than creating an unsafe hidden fallback.

### C. Verify artifact identity before rollback

Before changing a release, record:
- current public source/release identity;
- graph/manifest/content/media hashes;
- current inference contract identity/configuration;
- the last verified compatible candidate.

Never combine a previous static bundle with a different graph/content/media identity merely because each existed separately.

### D. Restore only the SUTRA release tuple

After a future rollback rehearsal has established an exact procedure:
- restore the known-good SUTRA caller/peer/static artifacts as a compatible tuple;
- restore only the corresponding SUTRA service/configuration if required;
- re-run direct artifact type/hash checks and the signed-out core task;
- smoke-check existing Patro/DHAGO/DETOUR routes before considering recovery complete.

This runbook does **not** authorize production mutation and does not supply cloud credentials.

### E. Provider-specific recovery

For hosted-provider failure:
- confirm credential/model availability out of band using the approved operator process;
- do not widen the model allowlist automatically;
- do not increase quotas to hide repeated provider failures;
- restore inference only after a capped clean-session check passes.

For self-hosted failure:
- verify TLS identity, exact endpoint, engine/model version and hardware health;
- do not expose a LAN/HTTP endpoint as an emergency shortcut;
- restore only the exact approved gateway/model combination.

### F. Record the incident

Record:
- UTC and Nepal timestamps;
- affected layer;
- source/release/config identities;
- observed browser/provider error class;
- manual actions;
- whether any user/model request had already left the system;
- restored behavior and remaining limitations.

Do not store raw provider credentials, network addresses, private prompts or unnecessary user identifiers.

## No scheduled-monitoring claim

No automated judging-period monitor, pager, scheduled health check or background recovery job is claimed by this repository state.

Before release, a participant may separately choose to configure monitoring. Until that actually exists, the submission/report must say **manual recovery runbook**, not “24/7 monitoring” or “automatic failover.”

## Still required before P089 can close

This artifact supports only:
- P089-06 official judging-end recheck/conversion;
- P089-07 provider drift/outage residual-risk documentation;
- P089-08 manual recovery steps without pretending monitoring is scheduled.

Still pending:
- P089-01 retained verified previous public SUTRA build;
- P089-02 staging rollback rehearsal;
- P089-03 observed compatible rollback;
- P089-04 judging-period model-request/funding estimate;
- P089-05 confirmed public site/peer/media/default-inference availability;
- P089-09 complete rollback + availability-budget artifact;
- P089-10 phase exit.

No release, rollback, provider purchase or monitoring configuration was performed while writing this runbook.
