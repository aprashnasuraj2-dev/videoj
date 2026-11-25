---- MODULE UpstreamTerminal ----
EXTENDS Naturals, TLC

None == "none"
Applied == "applied"
Closed == "closed"
Limit == 1

\* storeEffects belongs to the signed receiver snapshot. physicalEffects is an
\* outside-world count and deliberately does NOT roll back with receiver bytes.
VARIABLES terminal, storeEffects, physicalEffects
vars == <<terminal, storeEffects, physicalEffects>>

Init == /\ terminal = None
        /\ storeEffects = 0
        /\ physicalEffects = 0

Apply ==
    /\ terminal = None
    /\ storeEffects < Limit
    /\ terminal' = Applied
    /\ storeEffects' = storeEffects + 1
    /\ physicalEffects' = physicalEffects + 1

RetryApplied == /\ terminal = Applied /\ UNCHANGED vars

CloseUnapplied ==
    /\ terminal = None
    /\ terminal' = Closed
    /\ UNCHANGED <<storeEffects, physicalEffects>>

RetryClosed == /\ terminal = Closed /\ UNCHANGED vars
Status == UNCHANGED vars

Next == Apply \/ RetryApplied \/ CloseUnapplied \/ RetryClosed \/ Status
Spec == Init /\ [][Next]_vars

TypeOK == /\ terminal \in {None, Applied, Closed}
          /\ storeEffects \in 0..1
          /\ physicalEffects \in 0..2
TerminalMatchesStore == terminal = Applied => storeEffects = 1
ClosedHasNoStoreEffect == terminal = Closed => storeEffects = 0
StoreBudget == storeEffects <= Limit
AtMostOnePhysicalEffect == physicalEffects <= 1
Safe == TypeOK /\ TerminalMatchesStore /\ ClosedHasNoStoreEffect /\ StoreBudget /\ AtMostOnePhysicalEffect

\* Restore a valid older signed empty snapshot while the outside-world effect
\* remains. The local budget and terminal state are both rewound.
RollbackStore ==
    /\ terminal = Applied
    /\ terminal' = None
    /\ storeEffects' = 0
    /\ UNCHANGED physicalEffects
RollbackNext == Next \/ RollbackStore
RollbackSpec == Init /\ [][RollbackNext]_vars

\* A cloned signer+snapshot has its own local budget. This abstraction records
\* the second outside-world application without mutating canonical store bytes.
CloneApply ==
    /\ terminal = Applied
    /\ physicalEffects' = physicalEffects + 1
    /\ UNCHANGED <<terminal, storeEffects>>
CloneNext == Next \/ CloneApply
CloneSpec == Init /\ [][CloneNext]_vars

====
