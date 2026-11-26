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


## Parallel session — candidate
Implement verified append-only history extension: both separately pinned snapshots fully replayed; exact ordered version prefix and every previous branch head's descendant ancestry required. Tests cover valid append/fork and independently valid sibling/rollback refusal. No durable storage or global freshness. Next: transactional persistent store with external checkpoint and crash/restart tests.
Exact child CI pending.


## Durable local history candidate
Actual Linux private-directory store with immutable pinned snapshots, O_EXCL writer lock, separately retained expected HEAD, replay before commit, fsync barriers and atomic HEAD rename. Concurrent two-instance CAS, restart, orphan reuse, tamper, stale lock and coordinated rollback counterexample tests. A killed process can leave a lock requiring operator recovery; no automatic lock stealing, hostile same-user filesystem, NFS, Windows or external freshness claim. Publication can be ambiguous on I/O failure after rename; inspect using independently retained pins rather than blind retry. Exact child CI pending.


## Cross-process durability adversary
Run two separate Node OS processes against the same private filesystem history head, each proposing a different valid descendant. Exactly one may commit; the loser must refuse due to an existing lock or changed head, and an explicit stale retry must refuse. This tests local process isolation and CAS rather than shared in-memory serialization. Actual power loss and cross-host filesystem remain unverified. Exact CI pending.


## V2-182 candidate
Content-addressed snapshot publication now fsyncs a unique staging inode and links it exclusively into the immutable namespace before HEAD publication; partial writes cannot poison the final name. Reused exact orphan inode fsynced, byte-cap preflight, nonblocking reads refuse nonregular files. Regression covers corrupt final refusal without overwriting, retained partial stage and explicit offline correction. Simulated artifact state, not actual power-loss proof. Linux trusted private directory only; stale lock operator recovery and external freshness remain open.
Exact child CI pending.


## V2-182 real killed-writer challenge
Test-only subprocess instrumentation wraps actual Node filesystem link/rename calls and sends SIGKILL to the writer at before immutable publication, before HEAD rename, and after HEAD rename. Verify exact old or new state, stale lock refusal, and explicit offline lock removal after the process exits. No production injection hook; no power-loss/hardware flush proof, no automatic lock stealing, no external freshness. Exact child CI pending.


## V2-182 candidate — kernel-managed writer lock
Add explicit fresh-directory Linux `kernel-flock` store profile using fixed `/usr/bin/flock`, inherited descriptor and permanent marker inode. Kernel releases the advisory lock on process death; no lock-file deletion, no auto migration, no fallback to the legacy O_EXCL protocol. Legacy writes to flock directories refuse. Real SIGKILL test at all three publication phases with automatic subsequent writer acquisition and exact retained head checks. Trusted local filesystem and host executable required; no NFS/hostile directory/power-loss or external freshness claim. Helper startup overhead unmeasured. Exact child CI pending.
