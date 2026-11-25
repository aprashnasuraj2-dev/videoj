---- MODULE FenceAvailability ----
EXTENDS Naturals, TLC, FiniteSets

\* In this bounded model A/B are exact external idempotency identities, not
\* reusable human/client identities. A truthful closure permanently retires
\* that identity without application.
Clients == {"A", "B"}
None == "none"

VARIABLES owner, alive, dispatched, effects, fence, closed
vars == <<owner, alive, dispatched, effects, fence, closed>>

Init ==
    /\ owner = None
    /\ alive = {}
    /\ dispatched = {}
    /\ effects = {}
    /\ fence = 0
    /\ closed = {}

Reserve(c) ==
    /\ c \in Clients
    /\ owner = None
    /\ fence = 0
    /\ c \notin closed
    /\ owner' = c
    /\ alive' = alive \cup {c}
    /\ UNCHANGED <<dispatched, effects, fence, closed>>

Dispatch(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \notin dispatched
    /\ c \notin closed
    /\ dispatched' = dispatched \cup {c}
    /\ UNCHANGED <<owner, alive, effects, fence, closed>>

LoseOwner(c) ==
    /\ owner = c
    /\ c \in alive
    /\ alive' = alive \ {c}
    /\ UNCHANGED <<owner, dispatched, effects, fence, closed>>

AbortOwned(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \notin dispatched
    /\ owner' = None
    /\ alive' = alive \ {c}
    /\ UNCHANGED <<dispatched, effects, fence, closed>>

Deliver(c) ==
    /\ c \in dispatched
    /\ c \notin effects
    /\ effects' = effects \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, fence, closed>>

FinalizeOwned(c) ==
    /\ owner = c
    /\ c \in alive
    /\ c \in effects
    /\ fence = 0
    /\ owner' = None
    /\ alive' = alive \ {c}
    /\ fence' = 1
    /\ UNCHANGED <<dispatched, effects, closed>>

Crash == UNCHANGED vars

Next ==
    \/ \E cr \in Clients : Reserve(cr)
    \/ \E cd \in Clients : Dispatch(cd)
    \/ \E cl \in Clients : LoseOwner(cl)
    \/ \E ca \in Clients : AbortOwned(ca)
    \/ \E ce \in Clients : Deliver(ce)
    \/ \E cf \in Clients : FinalizeOwned(cf)
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ owner \in Clients \cup {None}
    /\ alive \subseteq Clients
    /\ dispatched \subseteq Clients
    /\ effects \subseteq Clients
    /\ fence \in {0, 1}
    /\ closed \subseteq Clients

AtMostOneEffect == Cardinality(effects) <= 1
FinalizedHasOneEffect == fence = 1 => Cardinality(effects) = 1
OwnedOrQuiescent == owner = None => fence = 1 \/ dispatched = effects
ClosureSound == closed \cap dispatched = {}

Safe == TypeOK /\ AtMostOneEffect /\ FinalizedHasOneEffect /\ OwnedOrQuiescent
ClosureSafe == Safe /\ ClosureSound

\* Unsafe administrative recovery: clear a reservation merely because its
\* owning coordinator lost local evidence. If the old external dispatch is
\* delayed, another identity can reserve and both effects can later arrive.
StealOrphan(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ owner' = None
    /\ UNCHANGED <<alive, dispatched, effects, fence, closed>>

StealNext == Next \/ \E cs \in Clients : StealOrphan(cs)
StealSpec == Init /\ [][StealNext]_vars

FairSpec ==
    Spec
    /\ \A cw \in Clients :
        /\ WF_vars(Dispatch(cw))
        /\ WF_vars(AbortOwned(cw))
        /\ WF_vars(Deliver(cw))
        /\ WF_vars(FinalizeOwned(cw))

PendingEventuallySettles == (owner # None) ~> (owner = None)

\* A separately trusted upstream/idempotency authority may permanently close
\* an exact orphan identity only when it has not been dispatched. The closure
\* remains durable in this model, so the identity can never dispatch later.
CloseUnapplied(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ c \notin dispatched
    /\ c \notin closed
    /\ closed' = closed \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, effects, fence>>

ResolveClosed(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ c \in closed
    /\ owner' = None
    /\ UNCHANGED <<alive, dispatched, effects, fence, closed>>

ClosureNext ==
    Next
    \/ \E cp \in Clients : CloseUnapplied(cp)
    \/ \E cc \in Clients : ResolveClosed(cc)

ClosureSpec == Init /\ [][ClosureNext]_vars
ClosureFairSpec ==
    ClosureSpec
    /\ \A ck \in Clients :
        /\ WF_vars(CloseUnapplied(ck))
        /\ WF_vars(ResolveClosed(ck))

UndispatchedOrphanEventuallySettles ==
    (owner # None /\ owner \notin alive /\ owner \notin dispatched) ~> (owner = None)

\* Negative control: a compromised/incorrect closure authority can claim that
\* a dispatched identity is permanently closed while its delayed effect is
\* still deliverable. Clearing that orphan can admit another identity and
\* permit two effects.
LieClosed(c) ==
    /\ owner = c
    /\ c \notin alive
    /\ c \notin closed
    /\ closed' = closed \cup {c}
    /\ UNCHANGED <<owner, alive, dispatched, effects, fence>>

LieNext ==
    Next
    \/ \E lp \in Clients : CloseUnapplied(lp)
    \/ \E lr \in Clients : ResolveClosed(lr)
    \/ \E ll \in Clients : LieClosed(ll)

LieSpec == Init /\ [][LieNext]_vars

====
