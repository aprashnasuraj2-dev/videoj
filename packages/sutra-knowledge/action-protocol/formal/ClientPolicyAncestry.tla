---- MODULE ClientPolicyAncestry ----
EXTENDS Naturals, Sequences, TLC

CONSTANT MaxVersion, HeadMax

VARIABLES history, pinSeq, pinHead, checked, effects, lastEffectPinned,
          maxEver, lastEffectSeq

vars == <<history, pinSeq, pinHead, checked, effects, lastEffectPinned,
          maxEver, lastEffectSeq>>

CurrentSeq == Len(history) - 1
CurrentHead == history[Len(history)]
HeadSeen(h) == \E i \in 1..Len(history) : history[i] = h
PinnedMember ==
    /\ pinSeq <= CurrentSeq
    /\ history[pinSeq + 1] = pinHead

Init ==
    /\ history = <<0>>
    /\ pinSeq = 0
    /\ pinHead = 0
    /\ checked = FALSE
    /\ effects = 0
    /\ lastEffectPinned = TRUE
    /\ maxEver = 0
    /\ lastEffectSeq = 0

Advance(h) ==
    /\ h \in 1..HeadMax
    /\ CurrentSeq < MaxVersion
    /\ ~HeadSeen(h)
    /\ history' = Append(history, h)
    /\ checked' = FALSE
    /\ maxEver' = Max(maxEver, CurrentSeq + 1)
    /\ UNCHANGED <<pinSeq, pinHead, effects, lastEffectPinned, lastEffectSeq>>

\* Returning client can move its pin forward only if its old exact pin is still
\* an ancestor of the current witness history.
ObserveCurrent ==
    /\ PinnedMember
    /\ pinSeq <= CurrentSeq
    /\ pinSeq' = CurrentSeq
    /\ pinHead' = CurrentHead
    /\ checked' = FALSE
    /\ UNCHANGED <<history, effects, lastEffectPinned, maxEver, lastEffectSeq>>

\* Coordinated rollback of the local policy book+witness removes the suffix.
\* The returning client pin and external max-ever memory do not roll back.
CoordinatedRollback ==
    /\ Len(history) > 1
    /\ history' = SubSeq(history, 1, Len(history) - 1)
    /\ checked' = FALSE
    /\ UNCHANGED <<pinSeq, pinHead, effects, lastEffectPinned, maxEver, lastEffectSeq>>

MembershipCheck ==
    /\ PinnedMember
    /\ checked' = TRUE
    /\ UNCHANGED <<history, pinSeq, pinHead, effects, lastEffectPinned, maxEver, lastEffectSeq>>

Dispatch ==
    /\ checked
    /\ effects' = effects + 1
    /\ lastEffectPinned' = PinnedMember
    /\ lastEffectSeq' = CurrentSeq
    /\ checked' = FALSE
    /\ UNCHANGED <<history, pinSeq, pinHead, maxEver>>

Crash == UNCHANGED vars

Next ==
    \/ \E h \in 1..HeadMax : Advance(h)
    \/ ObserveCurrent
    \/ CoordinatedRollback
    \/ MembershipCheck
    \/ Dispatch
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ Len(history) \in 1..(MaxVersion + 1)
    /\ history[1] = 0
    /\ \A i \in 1..Len(history) : history[i] \in 0..HeadMax
    /\ pinSeq \in 0..MaxVersion
    /\ pinHead \in 0..HeadMax
    /\ checked \in BOOLEAN
    /\ effects \in Nat
    /\ lastEffectPinned \in BOOLEAN
    /\ maxEver \in 0..MaxVersion
    /\ lastEffectSeq \in 0..MaxVersion

NoUnpinnedEffect == lastEffectPinned
ReturningPinNeverAhead == pinSeq <= maxEver
Safe == TypeOK /\ NoUnpinnedEffect /\ ReturningPinNeverAhead

\* Mutant: compare only numeric sequence. After rollback, a different branch can
\* advance past pinSeq even though the exact pinned head is absent.
NumericCheck ==
    /\ CurrentSeq >= pinSeq
    /\ checked' = TRUE
    /\ UNCHANGED <<history, pinSeq, pinHead, effects, lastEffectPinned, maxEver, lastEffectSeq>>

NumericNext == Next \/ NumericCheck
NumericSpec == Init /\ [][NumericNext]_vars

\* Permanent limitation: a freshly provisioned client has no retained prior pin
\* and may accept the current rolled pair as its starting trust root.
ProvisionFresh ==
    /\ pinSeq' = CurrentSeq
    /\ pinHead' = CurrentHead
    /\ checked' = FALSE
    /\ UNCHANGED <<history, effects, lastEffectPinned, maxEver, lastEffectSeq>>

ProvisionNext ==
    \/ \E h \in 1..HeadMax : Advance(h)
    \/ CoordinatedRollback
    \/ ProvisionFresh
    \/ MembershipCheck
    \/ Dispatch
    \/ Crash

ProvisionSpec == Init /\ [][ProvisionNext]_vars
NoEffectBelowExternalMax == effects = 0 \/ lastEffectSeq >= maxEver

====
