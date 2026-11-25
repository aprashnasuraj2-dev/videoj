---- MODULE FenceAdmission ----
EXTENDS Naturals, TLC

CONSTANT MaxVersion

VARIABLES authority, fence, local, reserved, effects, ack
vars == <<authority, fence, local, reserved, effects, ack>>
None == [before |-> MaxVersion + 1, after |-> MaxVersion + 1]
IntentSet == {None} \cup {[before |-> b, after |-> b + 1] : b \in 0..(MaxVersion - 1)}

Init ==
    /\ authority = 0
    /\ fence = 0
    /\ local = None
    /\ reserved = None
    /\ effects = 0
    /\ ack = 0

PrepareLocal ==
    /\ local = None
    /\ reserved = None
    /\ authority = fence
    /\ authority < MaxVersion
    /\ local' = [before |-> authority, after |-> authority + 1]
    /\ UNCHANGED <<authority, fence, reserved, effects, ack>>

Reserve ==
    /\ local # None
    /\ reserved = None
    /\ authority = fence
    /\ authority = local.before
    /\ reserved' = local
    /\ UNCHANGED <<authority, fence, local, effects, ack>>

AbortReserved ==
    /\ local # None
    /\ reserved = local
    /\ authority = fence
    /\ authority = local.before
    /\ local' = None
    /\ reserved' = None
    /\ UNCHANGED <<authority, fence, effects, ack>>

CommitAuthority ==
    /\ local # None
    /\ reserved = local
    /\ authority = local.before
    /\ fence = local.before
    /\ authority' = local.after
    /\ effects' = effects + 1
    /\ UNCHANGED <<fence, local, reserved, ack>>

FinalizeFence ==
    /\ local # None
    /\ reserved = local
    /\ authority = local.after
    /\ fence = local.before
    /\ fence' = local.after
    /\ reserved' = None
    /\ UNCHANGED <<authority, local, effects, ack>>

ClearLocal ==
    /\ local # None
    /\ reserved = None
    /\ authority = fence
    /\ authority = local.after
    /\ local' = None
    /\ UNCHANGED <<authority, fence, reserved, effects, ack>>

Acknowledge ==
    /\ local = None
    /\ reserved = None
    /\ authority = fence
    /\ ack < authority
    /\ ack' = authority
    /\ UNCHANGED <<authority, fence, local, reserved, effects>>

Crash == UNCHANGED vars

Next ==
    \/ PrepareLocal
    \/ Reserve
    \/ AbortReserved
    \/ CommitAuthority
    \/ FinalizeFence
    \/ ClearLocal
    \/ Acknowledge
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ authority \in 0..MaxVersion
    /\ fence \in 0..MaxVersion
    /\ effects \in 0..MaxVersion
    /\ ack \in 0..MaxVersion
    /\ local \in IntentSet
    /\ reserved \in IntentSet

FenceNotAhead == fence <= authority
GapBound == authority - fence <= 1
EffectsMatchAuthority == effects = authority
AckNotAhead == ack <= fence
ReservationOwned == reserved = None \/ reserved = local
LocalCoherent ==
    \/ local = None
    \/ /\ local.after = local.before + 1
       /\ authority \in {local.before, local.after}
       /\ fence \in {local.before, local.after}
       /\ fence <= authority
AdmissionBeforeEffect ==
    (authority # fence) =>
        /\ local # None
        /\ reserved = local
        /\ local.before = fence
        /\ local.after = authority

Safe ==
    /\ TypeOK
    /\ FenceNotAhead
    /\ GapBound
    /\ EffectsMatchAuthority
    /\ AckNotAhead
    /\ ReservationOwned
    /\ LocalCoherent
    /\ AdmissionBeforeEffect

\* Mutant 1: persist an effect without first winning independent admission.
CommitWithoutReservation ==
    /\ local # None
    /\ reserved = None
    /\ authority = local.before
    /\ fence = local.before
    /\ authority' = local.after
    /\ effects' = effects + 1
    /\ UNCHANGED <<fence, local, reserved, ack>>

\* Mutant 2: advance the fence before the authority/effect exists.
FinalizeEarly ==
    /\ local # None
    /\ reserved = local
    /\ authority = local.before
    /\ fence = local.before
    /\ fence' = local.after
    /\ reserved' = None
    /\ UNCHANGED <<authority, local, effects, ack>>

\* Mutant 3: lose the only admission evidence while authority is ahead.
DropReservation ==
    /\ authority > fence
    /\ reserved = local
    /\ reserved' = None
    /\ UNCHANGED <<authority, fence, local, effects, ack>>

\* Mutant 4: report completion before the independent fence catches up.
AcknowledgeEarly ==
    /\ authority > fence
    /\ ack < authority
    /\ ack' = authority
    /\ UNCHANGED <<authority, fence, local, reserved, effects>>

BypassNext == Next \/ CommitWithoutReservation
EarlyNext == Next \/ FinalizeEarly
DropNext == Next \/ DropReservation
AckNext == Next \/ AcknowledgeEarly

BypassSpec == Init /\ [][BypassNext]_vars
EarlySpec == Init /\ [][EarlyNext]_vars
DropSpec == Init /\ [][DropNext]_vars
AckSpec == Init /\ [][AckNext]_vars

FairSpec ==
    Spec
    /\ WF_vars(Reserve)
    /\ WF_vars(AbortReserved)
    /\ WF_vars(CommitAuthority)
    /\ WF_vars(FinalizeFence)
    /\ WF_vars(ClearLocal)
    /\ WF_vars(Acknowledge)

PreparedEventuallySettles ==
    (local # None) ~> (local = None /\ authority = fence)

SettledEventuallyAcknowledged ==
    (local = None /\ reserved = None /\ authority = fence) ~> (ack = authority)

====
