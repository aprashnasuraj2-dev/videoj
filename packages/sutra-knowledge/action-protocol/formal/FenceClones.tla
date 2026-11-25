---- MODULE FenceClones ----
EXTENDS Naturals, TLC, FiniteSets

Clients == {1, 2}

VARIABLES fence, intent, reserved, effects
vars == <<fence, intent, reserved, effects>>

Init ==
    /\ fence = 0
    /\ intent = {}
    /\ reserved = {}
    /\ effects = {}

Prepare(c) ==
    /\ c \in Clients
    /\ c \notin intent
    /\ intent' = intent \cup {c}
    /\ UNCHANGED <<fence, reserved, effects>>

Reserve(c) ==
    /\ c \in intent
    /\ fence = 0
    /\ reserved = {}
    /\ reserved' = {c}
    /\ UNCHANGED <<fence, intent, effects>>

Abort(c) ==
    /\ reserved = {c}
    /\ c \notin effects
    /\ reserved' = {}
    /\ UNCHANGED <<fence, intent, effects>>

Commit(c) ==
    /\ c \in reserved
    /\ c \notin effects
    /\ effects' = effects \cup {c}
    /\ UNCHANGED <<fence, intent, reserved>>

Finalize(c) ==
    /\ reserved = {c}
    /\ c \in effects
    /\ fence = 0
    /\ fence' = 1
    /\ reserved' = {}
    /\ UNCHANGED <<intent, effects>>

Crash == UNCHANGED vars

Next ==
    \/ \E c \in Clients : Prepare(c)
    \/ \E c \in Clients : Reserve(c)
    \/ \E c \in Clients : Abort(c)
    \/ \E c \in Clients : Commit(c)
    \/ \E c \in Clients : Finalize(c)
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ fence \in {0, 1}
    /\ intent \subseteq Clients
    /\ reserved \subseteq Clients
    /\ effects \subseteq Clients

AtMostOneAdmission == Cardinality(reserved) <= 1
AtMostOneEffect == Cardinality(effects) <= 1
EffectRequiresAdmission == effects # {} => (reserved = effects \/ fence = 1)
FinalizedHasEffect == fence = 1 => Cardinality(effects) = 1

Safe == TypeOK /\ AtMostOneAdmission /\ AtMostOneEffect /\ EffectRequiresAdmission /\ FinalizedHasEffect
EffectBound == TypeOK /\ AtMostOneEffect
AdmissionBound == TypeOK /\ EffectRequiresAdmission

\* Mutant 1: a second clone can join an existing reservation.
DoubleReserve(c) ==
    /\ c \in intent
    /\ fence = 0
    /\ reserved # {}
    /\ c \notin reserved
    /\ reserved' = reserved \cup {c}
    /\ UNCHANGED <<fence, intent, effects>>

\* Mutant 2: a clone persists its effect without owning admission.
CommitWithoutAdmission(c) ==
    /\ c \in intent
    /\ c \notin reserved
    /\ c \notin effects
    /\ effects' = effects \cup {c}
    /\ UNCHANGED <<fence, intent, reserved>>

DoubleNext == Next \/ \E c \in Clients : DoubleReserve(c)
BypassNext == Next \/ \E c \in Clients : CommitWithoutAdmission(c)
DoubleSpec == Init /\ [][DoubleNext]_vars
BypassSpec == Init /\ [][BypassNext]_vars

====
