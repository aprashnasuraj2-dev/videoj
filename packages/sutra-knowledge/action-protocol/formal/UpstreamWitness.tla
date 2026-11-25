---- MODULE UpstreamWitness ----
EXTENDS Naturals, TLC

None == "none"
Applied == "applied"

VARIABLES terminal, storeVersion, witnessVersion, intent, physicalEffects
vars == <<terminal, storeVersion, witnessVersion, intent, physicalEffects>>

Init == /\ terminal = None
        /\ storeVersion = 0
        /\ witnessVersion = 0
        /\ intent = FALSE
        /\ physicalEffects = 0

Prepare == /\ ~intent
           /\ terminal = None
           /\ storeVersion = witnessVersion
           /\ intent' = TRUE
           /\ UNCHANGED <<terminal, storeVersion, witnessVersion, physicalEffects>>

ApplyStore == /\ intent
              /\ terminal = None
              /\ storeVersion = witnessVersion
              /\ storeVersion = 0
              /\ terminal' = Applied
              /\ storeVersion' = 1
              /\ physicalEffects' = physicalEffects + 1
              /\ UNCHANGED <<witnessVersion, intent>>

AdvanceWitness == /\ intent
                  /\ terminal = Applied
                  /\ storeVersion = 1
                  /\ witnessVersion = 0
                  /\ witnessVersion' = 1
                  /\ intent' = FALSE
                  /\ UNCHANGED <<terminal, storeVersion, physicalEffects>>

AbortPrepared == /\ intent
                 /\ terminal = None
                 /\ storeVersion = witnessVersion
                 /\ intent' = FALSE
                 /\ UNCHANGED <<terminal, storeVersion, witnessVersion, physicalEffects>>

Status == UNCHANGED vars

RollbackStore == /\ terminal = Applied
                 /\ witnessVersion = 1
                 /\ terminal' = None
                 /\ storeVersion' = 0
                 /\ intent' = FALSE
                 /\ UNCHANGED <<witnessVersion, physicalEffects>>

SafeNext == Prepare \/ ApplyStore \/ AdvanceWitness \/ AbortPrepared \/ Status \/ RollbackStore
SafeSpec == Init /\ [][SafeNext]_vars

TypeOK == /\ terminal \in {None, Applied}
          /\ storeVersion \in 0..1
          /\ witnessVersion \in 0..1
          /\ intent \in BOOLEAN
          /\ physicalEffects \in 0..2
AtMostOnePhysicalEffect == physicalEffects <= 1

CloneApply == /\ terminal = Applied
              /\ physicalEffects' = physicalEffects + 1
              /\ UNCHANGED <<terminal, storeVersion, witnessVersion, intent>>
CloneNext == SafeNext \/ CloneApply
CloneSpec == Init /\ [][CloneNext]_vars

CoordinatedRollback == /\ terminal = Applied
                       /\ witnessVersion = 1
                       /\ terminal' = None
                       /\ storeVersion' = 0
                       /\ witnessVersion' = 0
                       /\ intent' = FALSE
                       /\ UNCHANGED physicalEffects
CoordinatedNext == SafeNext \/ CoordinatedRollback
CoordinatedSpec == Init /\ [][CoordinatedNext]_vars

====
