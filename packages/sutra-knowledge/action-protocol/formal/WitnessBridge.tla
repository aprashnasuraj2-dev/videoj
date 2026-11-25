---- MODULE WitnessBridge ----
EXTENDS Naturals, TLC

CONSTANT MaxVersion

VARIABLES authority, witness, intent

vars == <<authority, witness, intent>>
None == [before |-> MaxVersion + 1, after |-> MaxVersion + 1]
IntentSet == {None} \cup {[before |-> b, after |-> b + 1] : b \in 0..(MaxVersion - 1)}

Init ==
    /\ authority = 0
    /\ witness = 0
    /\ intent = None

Prepare ==
    /\ intent = None
    /\ authority = witness
    /\ authority < MaxVersion
    /\ intent' = [before |-> authority, after |-> authority + 1]
    /\ UNCHANGED <<authority, witness>>

CommitAuthority ==
    /\ intent # None
    /\ authority = intent.before
    /\ witness = intent.before
    /\ authority' = intent.after
    /\ UNCHANGED <<witness, intent>>

AdvanceWitness ==
    /\ intent # None
    /\ authority = intent.after
    /\ witness = intent.before
    /\ witness' = intent.after
    /\ UNCHANGED <<authority, intent>>

ClearIntent ==
    /\ intent # None
    /\ authority = intent.after
    /\ witness = intent.after
    /\ intent' = None
    /\ UNCHANGED <<authority, witness>>

AbortPrepared ==
    /\ intent # None
    /\ authority = intent.before
    /\ witness = intent.before
    /\ intent' = None
    /\ UNCHANGED <<authority, witness>>

Crash ==
    UNCHANGED vars

Next ==
    \/ Prepare
    \/ CommitAuthority
    \/ AdvanceWitness
    \/ ClearIntent
    \/ AbortPrepared
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ authority \in 0..MaxVersion
    /\ witness \in 0..MaxVersion
    /\ intent \in IntentSet

WitnessNotAhead == witness <= authority

GapBound == authority - witness <= 1

IntentCoherent ==
    \/ intent = None
    \/ /\ intent.after = intent.before + 1
       /\ authority \in {intent.before, intent.after}
       /\ witness \in {intent.before, intent.after}
       /\ witness <= authority

RecoverableGap ==
    (authority # witness) =>
        /\ intent # None
        /\ intent.before = witness
        /\ intent.after = authority

Safe == TypeOK /\ WitnessNotAhead /\ GapBound /\ IntentCoherent /\ RecoverableGap

\* Mutant 1: acknowledge witness head before the authority snapshot exists.
AdvanceWitnessEarly ==
    /\ intent # None
    /\ authority = intent.before
    /\ witness = intent.before
    /\ witness' = intent.after
    /\ UNCHANGED <<authority, intent>>

\* Mutant 2: admit another authority mutation before reconciling the first gap.
DoubleCommit ==
    /\ authority > witness
    /\ authority < MaxVersion
    /\ authority' = authority + 1
    /\ intent' = [before |-> authority, after |-> authority + 1]
    /\ UNCHANGED witness

\* Mutant 3: erase the only durable recovery evidence while the witness is behind.
ClearIntentEarly ==
    /\ intent # None
    /\ authority = intent.after
    /\ witness = intent.before
    /\ intent' = None
    /\ UNCHANGED <<authority, witness>>

EarlyNext == Next \/ AdvanceWitnessEarly
DoubleNext == Next \/ DoubleCommit
ClearNext == Next \/ ClearIntentEarly

EarlySpec == Init /\ [][EarlyNext]_vars
DoubleSpec == Init /\ [][DoubleNext]_vars
ClearSpec == Init /\ [][ClearNext]_vars

FairSpec ==
    Spec
    /\ WF_vars(CommitAuthority)
    /\ WF_vars(AdvanceWitness)
    /\ WF_vars(ClearIntent)
    /\ WF_vars(AbortPrepared)

PreparedEventuallySettles ==
    (intent # None) ~> (intent = None /\ authority = witness)

====
