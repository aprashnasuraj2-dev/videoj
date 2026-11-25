---- MODULE GrantLifecycle ----
EXTENDS Naturals, TLC

CONSTANT StartEpoch, ExpiryEpoch, MaxEpoch

VARIABLES epoch, revoked, admitted, phase, effects, reconciled

vars == <<epoch, revoked, admitted, phase, effects, reconciled>>
Phases == {"idle", "dispatching"}

Init ==
    /\ epoch = 0
    /\ revoked = FALSE
    /\ admitted = FALSE
    /\ phase = "idle"
    /\ effects = 0
    /\ reconciled = FALSE

Active ==
    /\ ~revoked
    /\ epoch >= StartEpoch
    /\ epoch <= ExpiryEpoch

AdvanceEpoch ==
    /\ epoch < MaxEpoch
    /\ epoch' = epoch + 1
    /\ UNCHANGED <<revoked, admitted, phase, effects, reconciled>>

ReserveDispatch ==
    /\ phase = "idle"
    /\ Active
    /\ admitted' = TRUE
    /\ phase' = "dispatching"
    /\ UNCHANGED <<epoch, revoked, effects, reconciled>>

Commit ==
    /\ phase = "dispatching"
    /\ effects' = IF effects = 0 THEN 1 ELSE effects
    /\ phase' = "idle"
    /\ UNCHANGED <<epoch, revoked, admitted, reconciled>>

FailBeforeEffect ==
    /\ phase = "dispatching"
    /\ phase' = "idle"
    /\ UNCHANGED <<epoch, revoked, admitted, effects, reconciled>>

Revoke ==
    /\ phase = "idle"
    /\ ~revoked
    /\ revoked' = TRUE
    /\ UNCHANGED <<epoch, admitted, phase, effects, reconciled>>

Reconcile ==
    /\ admitted
    /\ ~reconciled
    /\ reconciled' = TRUE
    /\ UNCHANGED <<epoch, revoked, admitted, phase, effects>>

Crash == UNCHANGED vars

Next ==
    \/ AdvanceEpoch
    \/ ReserveDispatch
    \/ Commit
    \/ FailBeforeEffect
    \/ Revoke
    \/ Reconcile
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ epoch \in 0..MaxEpoch
    /\ revoked \in BOOLEAN
    /\ admitted \in BOOLEAN
    /\ phase \in Phases
    /\ effects \in 0..1
    /\ reconciled \in BOOLEAN

DispatchAuthorized ==
    (phase = "dispatching") =>
        /\ ~revoked
        /\ epoch >= StartEpoch
        /\ epoch <= ExpiryEpoch

AtMostOneEffect == effects <= 1
ReconcileRequiresAdmission == reconciled => admitted

Safe == TypeOK /\ DispatchAuthorized /\ AtMostOneEffect /\ ReconcileRequiresAdmission

\* Mutant 1: a revoked grant is admitted.
ReserveRevoked ==
    /\ phase = "idle"
    /\ revoked
    /\ admitted' = TRUE
    /\ phase' = "dispatching"
    /\ UNCHANGED <<epoch, revoked, effects, reconciled>>

\* Mutant 2: an expired grant is admitted.
ReserveExpired ==
    /\ phase = "idle"
    /\ epoch > ExpiryEpoch
    /\ admitted' = TRUE
    /\ phase' = "dispatching"
    /\ UNCHANGED <<epoch, revoked, effects, reconciled>>

\* Mutant 3: status/reconciliation is allowed without durable dispatch admission.
ReconcileUnadmitted ==
    /\ ~admitted
    /\ ~reconciled
    /\ reconciled' = TRUE
    /\ UNCHANGED <<epoch, revoked, admitted, phase, effects>>

\* Mutant 4: revocation interleaves after the last grant check while dispatch is active.
RevokeDuringDispatch ==
    /\ phase = "dispatching"
    /\ ~revoked
    /\ revoked' = TRUE
    /\ UNCHANGED <<epoch, admitted, phase, effects, reconciled>>

\* Mutant 5: retry can create a second effect.
DuplicateEffect ==
    /\ phase = "dispatching"
    /\ effects = 1
    /\ effects' = 2
    /\ phase' = "idle"
    /\ UNCHANGED <<epoch, revoked, admitted, reconciled>>

RevokedSpec == Init /\ [][Next \/ ReserveRevoked]_vars
ExpiredSpec == Init /\ [][Next \/ ReserveExpired]_vars
ReconcileSpec == Init /\ [][Next \/ ReconcileUnadmitted]_vars
RaceSpec == Init /\ [][Next \/ RevokeDuringDispatch]_vars
DuplicateSpec == Init /\ [][Next \/ DuplicateEffect]_vars

====
