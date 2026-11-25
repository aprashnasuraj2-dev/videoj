---- MODULE GrantPolicyFreshness ----
EXTENDS Naturals, TLC

CONSTANT MaxVersion

NoCheck == MaxVersion + 1
NoDispatch == MaxVersion + 1
VARIABLES book, witness, intent, checked, maxWitness,
          lastDispatchBook, lastDispatchWitness, lastDispatchCheck

vars == <<book, witness, intent, checked, maxWitness,
          lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>
None == [before |-> MaxVersion + 1, after |-> MaxVersion + 1]
IntentSet == {None} \cup {[before |-> b, after |-> b + 1] : b \in 0..(MaxVersion - 1)}

Init ==
    /\ book = 0
    /\ witness = 0
    /\ intent = None
    /\ checked = NoCheck
    /\ maxWitness = 0
    /\ lastDispatchBook = NoDispatch
    /\ lastDispatchWitness = NoDispatch
    /\ lastDispatchCheck = NoCheck

PrepareMutation ==
    /\ intent = None
    /\ book = witness
    /\ book < MaxVersion
    /\ intent' = [before |-> book, after |-> book + 1]
    /\ checked' = NoCheck
    /\ UNCHANGED <<book, witness, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

CommitBook ==
    /\ intent # None
    /\ book = intent.before
    /\ witness = intent.before
    /\ book' = intent.after
    /\ checked' = NoCheck
    /\ UNCHANGED <<witness, intent, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

AdvanceWitness ==
    /\ intent # None
    /\ book = intent.after
    /\ witness = intent.before
    /\ witness' = intent.after
    /\ maxWitness' = intent.after
    /\ UNCHANGED <<book, intent, checked,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

ClearIntent ==
    /\ intent # None
    /\ book = witness
    /\ book = intent.after
    /\ intent' = None
    /\ UNCHANGED <<book, witness, checked, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

FreshCheck ==
    /\ intent = None
    /\ book = witness
    /\ checked' = witness
    /\ UNCHANGED <<book, witness, intent, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

Dispatch ==
    /\ intent = None
    /\ checked = book
    /\ checked = witness
    /\ lastDispatchBook' = book
    /\ lastDispatchWitness' = witness
    /\ lastDispatchCheck' = checked
    /\ checked' = NoCheck
    /\ UNCHANGED <<book, witness, intent, maxWitness>>

\* Storage attacker can restore only the GrantBook to an older valid version.
\* This is a reachable fail-closed state: no fresh check/dispatch is enabled.
RollbackBook ==
    /\ intent = None
    /\ witness > 0
    /\ book = witness
    /\ book' = witness - 1
    /\ checked' = NoCheck
    /\ UNCHANGED <<witness, intent, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

ReloadCurrentBook ==
    /\ intent = None
    /\ book < witness
    /\ book' = witness
    /\ checked' = NoCheck
    /\ UNCHANGED <<witness, intent, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

Crash == UNCHANGED vars

Next ==
    \/ PrepareMutation
    \/ CommitBook
    \/ AdvanceWitness
    \/ ClearIntent
    \/ FreshCheck
    \/ Dispatch
    \/ RollbackBook
    \/ ReloadCurrentBook
    \/ Crash

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ book \in 0..MaxVersion
    /\ witness \in 0..MaxVersion
    /\ maxWitness \in 0..MaxVersion
    /\ checked \in (0..MaxVersion) \cup {NoCheck}
    /\ lastDispatchBook \in (0..MaxVersion) \cup {NoDispatch}
    /\ lastDispatchWitness \in (0..MaxVersion) \cup {NoDispatch}
    /\ lastDispatchCheck \in (0..MaxVersion) \cup {NoCheck}
    /\ intent \in IntentSet

WitnessMonotonic == witness = maxWitness

ForwardMutationRecoverable ==
    (book > witness) =>
        /\ intent # None
        /\ intent.before = witness
        /\ intent.after = book

NoStaleDispatch ==
    (lastDispatchBook = NoDispatch) \/
    (lastDispatchBook = lastDispatchWitness)

DispatchWasFresh ==
    (lastDispatchBook = NoDispatch) \/
    /\ lastDispatchCheck = lastDispatchBook
    /\ lastDispatchCheck = lastDispatchWitness

Safe == TypeOK /\ WitnessMonotonic /\ ForwardMutationRecoverable /\ NoStaleDispatch /\ DispatchWasFresh

\* Mutant 1: accept an old static signed policy view after book-only rollback,
\* then dispatch against that replay rather than the live witness.
ReplayOldView ==
    /\ intent = None
    /\ book < witness
    /\ checked' = book
    /\ UNCHANGED <<book, witness, intent, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

DispatchReplayed ==
    /\ intent = None
    /\ book < witness
    /\ checked = book
    /\ lastDispatchBook' = book
    /\ lastDispatchWitness' = witness
    /\ lastDispatchCheck' = checked
    /\ checked' = NoCheck
    /\ UNCHANGED <<book, witness, intent, maxWitness>>

\* Mutant 2: skip the freshness check entirely.
DispatchWithoutCheck ==
    /\ intent = None
    /\ book = witness
    /\ checked = NoCheck
    /\ lastDispatchBook' = book
    /\ lastDispatchWitness' = witness
    /\ lastDispatchCheck' = checked
    /\ UNCHANGED <<book, witness, intent, checked, maxWitness>>

\* Retained limitation: an attacker that can restore both signed trust domains
\* defeats the local monotonic guarantee unless a third external root remembers
\* the maximum witness version.
CoordinatedRollback ==
    /\ intent = None
    /\ witness > 0
    /\ book = witness
    /\ book' = witness - 1
    /\ witness' = witness - 1
    /\ checked' = NoCheck
    /\ UNCHANGED <<intent, maxWitness,
                   lastDispatchBook, lastDispatchWitness, lastDispatchCheck>>

ReplayNext == Next \/ ReplayOldView \/ DispatchReplayed
NoCheckNext == Next \/ DispatchWithoutCheck
CoordinatedNext == Next \/ CoordinatedRollback

ReplaySpec == Init /\ [][ReplayNext]_vars
NoCheckSpec == Init /\ [][NoCheckNext]_vars
CoordinatedSpec == Init /\ [][CoordinatedNext]_vars

====
