# Continue with SUTRA — V2 execution contract

“Continue with SUTRA” means:

> Resolve the exact current repository head, inspect exact-head CI, then continue the next dependency-ready item in `docs/sutra-v2/CHECKLIST.md`.

## Product mission

SUTRA is a living computational knowledge system for discovering, challenging, maintaining, revising and acting on important knowledge.

Integrated product flow:

**question/evidence → materially distinct interpretations → review → conditional computation → consequential clarification → persistent investigation → challenge/counterexample → changed evidence → impact report → independently replayable export**

Models are replaceable proposal generators, not authority.

## Work selection

1. Read the current repository head and the active checklist.
2. Reconcile exact CI for that head.
3. Resume the active `[~]` task when valid; otherwise select the first dependency-ready `[ ]` task.
4. If a task has a genuine external blocker, continue another independent task.
5. Add newly discovered engineering work to the V2 checklist with a stable ID and acceptance condition.
6. Do not use closed or historical branches as execution queues.

## Execution loop

**inspect → design → implement → adversarially challenge → verify exact source → register → commit → re-read remote → continue**

Do not stop at a status report while safe, authorized engineering remains.

## Evidence states

- **Candidate:** implementation exists but required evidence is incomplete.
- **Scoped verified:** exact immutable source passed the stated component checks.
- **Integrated verified:** the current combined product passed required integration evidence.
- **Externally validated:** required human, device, provider, public or expert evidence was actually collected.

Never promote one state to another by inference.

## Checkpoint transaction

After a material change, keep source, tests, checklist, machine progress and affected roadmap state consistent. Record exact failures and limitations. Read back the remote commit before claiming it is saved.

## Authority boundaries

Continuation does not authorize paid inference, real provider credentials, production/DNS changes, public deployment, outreach, official submission or fabricated external evidence unless the user explicitly authorizes that action.
