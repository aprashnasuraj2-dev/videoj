---- MODULE WitnessBridge ----
EXTENDS Naturals, TLC

CONSTANT MaxVersion

VARIABLES authority, witness, intent, ack

vars == <<authority, witness, intent, ack>>
None == [before |-> MaxVersion + 1, after |-> MaxVersion + 1]
IntentSet == {None} \cup {[before |-> b, after |-> b + 1] : b \in 0..(MaxVersion - 1)}

Init ==
    /\ authority = 0
    /\ witness = 0
    /\ intent = None
    /\ ack = 0

Prepare ==
    /\ intent = None
    /\ authority = witness
    /\ ack = authority
    /\ authority < MaxVersion
    /\ intent' = [before |-> authority, after |-> authority + 1]
    /\ UNCHANGED <<authority, witness, ack>>

CommitAuthority ==
    /\ intent # None
    /\ authority = intent.before
    /\ witness = intent.before
    /\ authority' = intent.after
    /\ UNCHANGED <<witness, intent, ack>>

AdvanceWitness ==
    /\ intent # None
    /\ authority = intent.after
    /\ witness = intent.before
    /\ witness' = intent.after
    /\ UNCHANGED <<authority, intent, ack>>

ClearIntent ==
    /\ intent # None
    /\ authority = intent.after
    /\ witness = intent.after
    /\ intent' = None
    /\ UNCHANGED <<authority, witness, ack>>

AbortPrepared ==
    /\ intent # None
    /\ authority = intent.before
    /\ witness = intent.before
    /\ intent' = None
    /\ UNCHANGED <<authority, witness, ack>>

Acknowledge ==
    /\ intent = None
    /\ authority = witness
    /\ ack < authority
    /\ ack' = authority
    /\ UNCHANGED <<authority, witness, intent>>

Crash ==
    UNCHANGED vars

Next ==
    \/ Prepare
    \/ CommitAuthority
    \/ AdvanceWitness
    \/ ClearIntent
    \/ AbortPrepared
    \/ Acknowledge
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ authority \in 0..MaxVersion
    /\ witness \in 0..MaxVersion
    /\ ack \in 0..MaxVersion
    /\ intent \in IntentSet

WitnessNotAhead == witness <= authority
AckNotAhead == ack <= witness
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

Safe == TypeOK /\ WitnessNotAhead /\ AckNotAhead /\ GapBound /\ IntentCoherent /\ RecoverableGap

\* Mutant 1: advance the witness head before the authority snapshot exists.
AdvanceWitnessEarly ==
    /\ intent # None
    /\ authority = intent.before
    /\ witness = intent.before
    /\ witness' = intent.after
    /\ UNCHANGED <<authority, intent, ack>>

\* Mutant 2: admit another authority mutation before reconciling the first gap.
DoubleCommit ==
    /\ authority > witness
    /\ authority < MaxVersion
    /\ authority' = authority + 1
    /\ intent' = [before |-> authority, after |-> authority + 1]
    /\ UNCHANGED <<witness, ack>>

\* Mutant 3: erase the only durable recovery evidence while the witness is behind.
ClearIntentEarly ==
    /\ intent # None
    /\ authority = intent.after
    /\ witness = intent.before
    /\ intent' = None
    /\ UNCHANGED <<authority, witness, ack>>

\* Mutant 4: expose a completed acknowledgement before the witness catches up.
AcknowledgeEarly ==
    /\ authority > witness
    /\ ack < authority
    /\ ack' = authority
    /\ UNCHANGED <<authority, witness, intent>>

EarlyNext == Next \/ AdvanceWitnessEarly
DoubleNext == Next \/ DoubleCommit
ClearNext == Next \/ ClearIntentEarly
AckNext == Next \/ AcknowledgeEarly

EarlySpec == Init /\ [][EarlyNext]_vars
DoubleSpec == Init /\ [][DoubleNext]_vars
ClearSpec == Init /\ [][ClearNext]_vars
AckSpec == Init /\ [][AckNext]_vars

FairSpec ==
    Spec
    /\ WF_vars(CommitAuthority)
    /\ WF_vars(AdvanceWitness)
    /\ WF_vars(ClearIntent)
    /\ WF_vars(AbortPrepared)
    /\ WF_vars(Acknowledge)

PreparedEventuallySettles ==
    (intent # None) ~> (intent = None /\ authority = witness)

SettledEventuallyAcknowledged ==
    (intent = None /\ authority = witness) ~> (ack = authority)

====
