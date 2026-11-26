# Persistent knowledge and revision

**Candidate / draft / no merge or release.** Parent: `092c7971602ee9e294e467efbb0d72c44121e480`.

## Existing open gates
V2-K07, V2-LK08, V2-LK09, V2-LK10, V2-LK11

## Initial slice
Implement exact reverse-dependency revision closure over the same admitted kernel graph; compare predicted affected nodes with actual incremental execution.

State: Implementation candidate; exact child CI pending.

## Next dependency-ready work
Connect to typed evidence/version graph; crash-safe storage, stale CAS, simultaneous correction and withdrawal, independent scaling and replay.

## Acceptance and adversaries
Reordered graph does not invalidate; changed/removed nodes and descendants classified; full replay equals incremental, no storage or semantic authority.

## Verification boundary
Child JS regression is not full integration evidence. Maintain exact source revision, actual job and failure evidence in this file. No automatic authority, deployment, paid inference, or merge. Shared central registers are updated on integration; original open gates remain open.
