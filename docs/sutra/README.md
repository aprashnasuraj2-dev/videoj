# SUTRA project workspace

SUTRA is the planned evidence-linked learning companion for the Open Agentic Web Challenge. The source repository is `aprashnasuraj2-dev/videoj`; the proposed release uses new AafnaiPatro Cloudflare origins. Existing DHAGO and DETOUR remain independent player projects.

**Status at bootstrap:** planning and resume infrastructure only. No SUTRA app, peer, inference service, community package or public release exists at the inspected code baseline. Read current status before repeating that historical statement.

## Continue with SUTRA

When the user says **“continue with sutra”** (case-insensitive), read the repository instructions and [continuation procedure](CONTINUE.md), inspect [progress.json](progress.json), [PROGRESS.md](PROGRESS.md) and the relevant detailed checklist, verify the last recorded state against source/evidence, then carry out the next dependency-ready work. Do not merely repeat the plan or stop at a status report.

## Working documents

| Document | Purpose |
| --- | --- |
| [CHECKLIST.md](CHECKLIST.md) | Index of 100 phases expanded into 1,000 initial stable task IDs |
| [PROGRESS.md](PROGRESS.md) | Current checkpoint, next actions, actual blockers and limitations |
| [progress.json](progress.json) | Machine-readable cursor, evidence and release/submission records |
| [CONTINUE.md](CONTINUE.md) | Resume, verify, execute and checkpoint procedure |
| [SESSIONS.md](SESSIONS.md) | Append-only history of completed work and observations |
| [DECISIONS.md](DECISIONS.md) | Rationale, optional omissions, scope changes and reversals |
| [COVERAGE.md](COVERAGE.md) | Cross-cutting requirement coverage, acceptance targets and evidence rules |
| [BASELINE.md](BASELINE.md) | PDF provenance, known source revision, rules/spec and planning assumptions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | SUTRA clean-install, component entry points, issue/security and contribution boundaries |
| [CHANGELOG.md](CHANGELOG.md) | Pre-release changelog policy; no invented public versions |
| [evidence/README.md](evidence/README.md) | Evidence conventions without private data or fabricated outcomes |

## Read-only progress commands

```bash
node docs/sutra/tools/progress.mjs status
node docs/sutra/tools/progress.mjs next
node docs/sutra/tools/progress.mjs check
```

The script reads the tracker and exits nonzero for inconsistent IDs, missing closure evidence, broken internal documentation links or invalid cursor state. It does not run product checks or write any state.

## Scope and limits

The checklist is comprehensive initial coverage, not a guarantee against unknown failures. Add discoveries to [added scope](checklists/11-added-scope.md) and record revised acceptance when justified. Do product work and use the register as a handoff; never substitute tracker activity for implementation or verification.

Target final ZIP handoff: **9 January 2027**. Official deadline baseline: **11 January 2027, 21:45 Asia/Kathmandu (16:00 UTC)**, subject to live re-verification. Proposed origins `sutra.aafnaipatro.com` and `sutra-guide.aafnaipatro.com` are not established deployment facts.
