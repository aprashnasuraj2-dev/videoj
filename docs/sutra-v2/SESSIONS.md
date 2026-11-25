# SUTRA 2.0 sessions

## V2-001 — 2026-11-25
Reconciled v1 exact remote baseline `9bd76ef8bfd05f323592f21fe4b0841188861693`, 19/19 workflow conclusions successful. Preserved old branch and original checklist. Isolated v2 branch created. Added restricted data-only exact-quantity kernel, tests and deterministic Observatory CLI with conditional beam example. New code and assertions are candidate evidence until actual exact CI observed. No model call, browser peer composition, independent replay, deployment, human review or challenge acceptance is claimed. Next verify CI, then implement independent replay and actual runtime composition.

### First exact CI failure and correction

[Push run 45514643061](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45514643061/job/138870820701) at `fb1ddfff5b491db3ba1108fa3aec4643a62851e6`: 6/7 test groups passed, including beam mutation/reuse and 100 cross-multiplication cases. Duplicate JSON correctly threw SyntaxError; the test wrongly expected only TypeError, so the complete run failed and Observatory step was skipped. Preserve failure. Correct the assertion to recognize the parser's error contract; add independent Python Fraction/hashlib/DFS replay of actual canonical reports and adversarial variants. No new task credit until exact corrected run.
