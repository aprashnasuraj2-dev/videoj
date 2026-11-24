# Milestone B interoperability review — local/browser evidence, public HTTPS blocked

Reviewed product revision: `0ef8a613c1c8d6db522d50a1088f9528ad055d4b`, all ten then-current project workflows green.

This review distinguishes **observable browser/runtime conformance mechanics** from the still-missing independently reachable HTTPS replay. It does not call loopback “public interoperability.”

## Observed mandatory mechanics

| Behavior | Current evidence | Result |
| --- | --- | --- |
| Two-agent publication and grounded internal invocation | local learner/source network + source MCP browser/runtime tests | Pass in controlled project environment |
| Exact named second-origin network load | Chromium two-loopback-origin peer test | Pass |
| Caller-local execution of peer agents | peer trace identifies caller-local learner and peer network while caller supplies model driver | Pass |
| Denied peer origin | consent before manifest; denial leaves zero peer request | Pass |
| Wrong named network | manifest may load, graph is not accepted/fallback-selected | Pass |
| Invalid/malformed graph | compile/load tests fail before model execution | Pass |
| Cyclic graph | runtime compile refuses before execution | Pass |
| Agent/model budgets | typed limit stops, incomplete outcome, actual counters | Pass |
| Caller router/model policy | peer/caller hostile model hints cannot override host model selection | Pass |
| Private context | default deny; exact destination-bound upstream/downstream grants; canary tests | Pass |
| Redirect expansion | external artifact redirect is rejected and next origin is never contacted | Pass |
| Third-party read-only MCP | separate discovery/call consent; bounded result; CORS/timeout fail closed | Pass |
| Unsupported executable/REST capabilities | rejected rather than silently trusted | Pass |

## Evidence binding

Key dated evidence:
- Session 0016: shared budgets + Chromium/Firefox/WebKit baseline;
- Session 0017: exact symbolic links, bounded public reads, publication inventory;
- Session 0018/21: source/evidence hardening and exact green learner revision;
- CORS/redirect policy review: browser two-origin transport boundary;
- current risk register: public HTTPS and independent adoption remain open blockers.

All observed behaviors above are development/project evidence. They are not organizer certification.

## Core vs extensions

Core claim:
- public/declarative network artifacts;
- exact network selection;
- browser graph execution/internal delegation;
- caller-owned model policy;
- consent-before-contact;
- bounded/typed failure;
- evidence/source boundary.

Project extensions that must not be described as normative requirements:
- SUTRA receipt schema and review cards;
- private-context allowlist format;
- source-MCP synthetic catalog profile;
- learner UI/localization;
- provider quota implementation;
- Open Kit convenience packages;
- project-specific trace format.

## Blocking gap

**P040-01 remains open:** the full interoperability checklist has not been replayed on the authorized public HTTPS caller + peer origins.

Because that observation is missing, **P040-10 remains open** even though the controlled two-origin/browser mechanics pass. No public deployment is authorized merely to close the percentage.

The eventual HTTPS replay must use the exact release candidate, record origin/asset revisions, repeat denial/invalid/cycle/budget/context/router cases, and compare results to this local baseline. A failure blocks Milestone B rather than being waived.
