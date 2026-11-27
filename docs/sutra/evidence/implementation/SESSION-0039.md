# SUTRA session 0039 — bounded waits for noncooperating local mutation

Observed 2026-11-24T17:10:50.352+05:45. Development-only SUTRA PR #49. Previous Session 0038 was reconciled with its source identity and checklist. Incremental source commit `d49d0afd0acf8305526f2ebed3b1a09a62e54a47` modifies `apps/sutra/src/review-mutation.js` and `apps/sutra/test/review-mutation.test.mjs`; no other project/player code, cloud account, service, route, provider or real participant was contacted.

## Risk and mechanism

A Web Locks request can hold an exclusive lock while its callback awaits a promise that does not settle. Merely aborting its acquisition signal does not prove a callback already entered will stop, and returning a normal result after pagehide would claim false completion. Automatically releasing the lock while the callback continues could allow the late write to race a new write.

The mutation queue now separately races the caller's waiting period against the scoped deadline/navigation signal. If the lock callback **has not begun**, the caller rejects before application-owned mutation. If callback execution **has begun**, a timeout or navigation revocation settles the caller as **unknown** without an automatic replay. The original exclusive lock callback remains owned by the browser until the effect itself settles or the document goes away. A later attempted app-owned mutation cannot slip into that still-held lock. Detached promise rejection is observed to avoid unhandled errors.

A new unit fault injects an intentionally never-resolving effect, checks the waiting caller is rejected after its deadline with unknown outcome, then proves a subsequent mutation also times out without executing behind an improperly released exclusive lock. Other unit cases cover stale queued and post-entry pagehide revocation.

## Exact verification and limitations

Source `d49d0afd0acf8305526f2ebed3b1a09a62e54a47`: **19/19 workflow conclusions successful**. [Learner job](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45383760754/job/138409250738) executed all app unit/build, package/runtime/peer suites, vendor integrity checks and ten Chromium browser integrations. [Headless browser matrix](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45383760924) executed Chromium, Firefox and WebKit jobs. [Progress register](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45383760661) also passed. No local npm command was executed in this connector-only session, no physical touch/screen-reader or actual two-device test, and no external host was contacted. An untrusted or unrelated same-origin script may still mutate storage outside this cooperative lock, and already-initiated effects cannot be undone. Exact source matching does not establish factual truth.

No new original task or phase is marked complete. The existing `SUTRA-X009-02` verification is strengthened with new exact-SHA evidence. Totals remain 609/1000 original, 661/1053 overall, 45 complete phases, six omissions, one hardware blocker and 385 pending. `SUTRA-P078-02` remains incomplete until its broader consent/source-version/inference product gates have actual evidence. All public release, inference spend and submission gates remain closed.
