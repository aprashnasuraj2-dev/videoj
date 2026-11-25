---- MODULE FenceAvailability ----
EXTENDS Naturals, TLC, FiniteSets

Clients == {"A", "B"}
None == "none"

VARIABLES owner, alive, dispatched, effects, fence
vars == <<owner, alive, dispatched, effects, fence>>

Init ==
    /\ owner = None
    /\ alive = {}
    /\ dispatched = {}
    /\ effects = {}
    /\ fence = 0

Reserve(c) ==
    /\ c \in Clients
    /\ owner = None
    /\ fence = 0
    /\ owner' = c
    /\ alive' = alive \cup {c}
    /\ UNCHANGED <<dispatched, effects, fence>>

Dispatch(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \notin dispatched
    /\ dispatched' = dispatched \cup {c}
    /\ UNCHANGED <<owner, alive, effects, fence>>

LoseOwner(c) ==
    /\ owner = c
    /\ c \in alive
    /\ alive' = alive \ {c}
    /\ UNCHANGED <<owner, dispatched, effects, fence>>

AbortOwned(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \notin dispatched
    /\ owner' = None
    /\ alive' = alive \ {c}
    /\ UNCHANGED <<dispatched, effects, fence>>

Deliver(c) ==
    /\ c \in dispatched
    /\ c \notin effects
    /\ effects' = effects \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, fence>>

FinalizeOwned(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \in effects
    /\ fence = 0
    /\ owner' = None
    /\ alive' = alive \ {c}
    /\ fence' = 1
    /\ UNCHANGED <<dispatched, effects>>

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

AtMostOneEffect == Cardinality(effects) <= 1
FinalizedHasOneEffect == fence = 1 => Cardinality(effects) = 1
OwnedOrQuiescent == owner = None => fence = 1 \/ dispatched = effects

Safe == TypeOK /\ AtMostOneEffect /\ FinalizedHasOneEffect /\ OwnedOrQuiescent

\* Unsafe administrative recovery: clear a reservation merely because its
\* owning coordinator lost local evidence. If the old external dispatch is
\* delayed, another clone can reserve and both effects can later arrive.
StealOrphan(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ owner' = None
    /\ UNCHANGED <<alive, dispatched, effects, fence>>

StealNext == Next \/ \E c \in Clients : StealOrphan(c)
StealSpec == Init /\ [][StealNext]_vars

FairSpec ==
    Spec
    /\ \A c \in Clients : WF_vars(Dispatch(c))
    /\ \A c \in Clients : WF_vars(AbortOwned(c))
    /\ \A c \in Clients : WF_vars(Deliver(c))
    /\ \A c \in Clients : WF_vars(FinalizeOwned(c))

PendingEventuallySettles == (owner # None) ~> (owner = None)

====
