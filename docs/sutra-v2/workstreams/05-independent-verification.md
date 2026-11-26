# Independent verification and replay

**Candidate / draft / no merge or release.** Parent: `092c7971602ee9e294e467efbb0d72c44121e480`.

## Existing open gates
V2-P07-WASM, V2-D01, V2-D02, V2-D03, V2-O04, V2-LK14

## Initial slice
Add a separate verification manifest and acceptance plan for exact replay profiles, not a wrapper around same implementation.

State: Acceptance contract only; implementation pending.

## Next dependency-ready work
Implement independent rational/interval profile parity, mutation corpus, clean build evidence and resource bounds.

## Acceptance and adversaries
Independent implementation rejects forged receipt, missing input and stale pins; no universal truth or certification.

## Verification boundary
Child JS regression is not full integration evidence. Maintain exact source revision, actual job and failure evidence in this file. No automatic authority, deployment, paid inference, or merge. Shared central registers are updated on integration; original open gates remain open.
