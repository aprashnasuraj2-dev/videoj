---- MODULE FenceAvailability ----
EXTENDS Naturals, TLC, FiniteSets

Clients == {"A", "B"}
None == "none"

VARIABLES owner, alive, dispatched, effects, fence, absence
vars == <<owner, alive, dispatched, effects, fence, absence>>

Init ==
    /\ owner = None
    /\ alive = {}
    /\ dispatched = {}
    /\ effects = {}
    /\ fence = 0
    /\ absence = {}

Reserve(c) ==
    /\ c \in Clients
    /\ owner = None
    /\ fence = 0
    /\ owner' = c
    /\ alive' = alive \cup {c}
    /\ UNCHANGED <<dispatched, effects, fence, absence>>

Dispatch(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \notin dispatched
    /\ dispatched' = dispatched \cup {c}
    /\ UNCHANGED <<owner, alive, effects, fence, absence>>

LoseOwner(c) ==
    /\ owner = c
    /\ c \in alive
    /\ alive' = alive \ {c}
    /\ UNCHANGED <<owner, dispatched, effects, fence, absence>>

AbortOwned(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \notin dispatched
    /\ owner' = None
    /\ alive' = alive \ {c}
    /\ UNCHANGED <<dispatched, effects, fence, absence>>

Deliver(c) ==
    /\ c \in dispatched
    /\ c \notin effects
    /\ effects' = effects \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, fence, absence>>

FinalizeOwned(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \in effects
    /\ fence = 0
    /\ owner' = None
    /\ alive' = alive \ {c}
    /\ fence' = 1
    /\ UNCHANGED <<dispatched, effects, absence>>

Crash == UNCHANGED vars

Next ==
    \/ \E c \in Clients : Reserve(c)
    \/ \E c \in Clients : Dispatch(c)
    \/ \E c \in Clients : LoseOwner(c)
    \/ \E c \in Clients : AbortOwned(c)
    \/ \E c \in Clients : Deliver(c)
    \/ \E c \in Clients : FinalizeOwned(c)
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ owner \in Clients \cup {None}
    /\ alive \subseteq Clients
    /\ dispatched \subseteq Clients
    /\ effects \subseteq Clients
    /\ fence \in {0, 1}
    /\ absence \subseteq Clients

AtMostOneEffect == Cardinality(effects) <= 1
FinalizedHasOneEffect == fence = 1 => Cardinality(effects) = 1
OwnedOrQuiescent == owner = None => fence = 1 \/ dispatched = effects
TruthfulAbsence == absence \cap dispatched = {}

Safe == TypeOK /\ AtMostOneEffect /\ FinalizedHasOneEffect /\ OwnedOrQuiescent
ProofSafe == Safe /\ TruthfulAbsence

\* Unsafe administrative recovery: clear a reservation merely because its
\* owning coordinator lost local evidence. If the old external dispatch is
\* delayed, another clone can reserve and both effects can later arrive.
StealOrphan(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ owner' = None
    /\ UNCHANGED <<alive, dispatched, effects, fence, absence>>

StealNext == Next \/ \E c \in Clients : StealOrphan(c)
StealSpec == Init /\ [][StealNext]_vars

FairSpec ==
    Spec
    /\ \A c \in Clients :
        /\ WF_vars(Dispatch(c))
        /\ WF_vars(AbortOwned(c))
        /\ WF_vars(Deliver(c))
        /\ WF_vars(FinalizeOwned(c))

PendingEventuallySettles == (owner # None) ~> (owner = None)

\* A separately trusted absence authority can clear only an orphan for which
\* it can truthfully attest that no dispatch occurred. This models an upstream
\* idempotency/status contract; it does not infer absence from time.
ProveAbsent(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ c \notin dispatched
    /\ c \notin absence
    /\ absence' = absence \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, effects, fence>>

ResolveProvenAbsent(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ c \in absence
    /\ owner' = None
    /\ absence' = absence \ {c}
    /\ UNCHANGED <<alive, dispatched, effects, fence>>

ProofNext ==
    Next
    \/ \E c \in Clients : ProveAbsent(c)
    \/ \E c \in Clients : ResolveProvenAbsent(c)

ProofSpec == Init /\ [][ProofNext]_vars
ProofFairSpec ==
    ProofSpec
    /\ \A c \in Clients :
        /\ WF_vars(ProveAbsent(c))
        /\ WF_vars(ResolveProvenAbsent(c))

UndispatchedOrphanEventuallySettles ==
    (owner # None /\ owner \notin alive /\ owner \notin dispatched) ~> (owner = None)

\* Negative control: a compromised/incorrect absence authority can attest
\* absence even after dispatch. Clearing that orphan can admit another writer
\* while the first delayed external effect remains deliverable.
LieAbsent(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ c \notin absence
    /\ absence' = absence \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, effects, fence>>

LieNext ==
    Next
    \/ \E c \in Clients : ProveAbsent(c)
    \/ \E c \in Clients : ResolveProvenAbsent(c)
    \/ \E c \in Clients : LieAbsent(c)

LieSpec == Init /\ [][LieNext]_vars

====
