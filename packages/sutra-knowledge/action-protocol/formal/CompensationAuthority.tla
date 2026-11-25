---- MODULE CompensationAuthority ----
EXTENDS Naturals, TLC

None == "none"
Primary == "primary"
Compensation == "compensation"

VARIABLES priorApplied, separateAuth, grantClass, admitted, compensationEffects
vars == <<priorApplied, separateAuth, grantClass, admitted, compensationEffects>>

Init == /\ priorApplied \in BOOLEAN
        /\ separateAuth = FALSE
        /\ grantClass = None
        /\ admitted = FALSE
        /\ compensationEffects = 0

IssueCompGrant == /\ grantClass = None
                  /\ grantClass' = Compensation
                  /\ UNCHANGED <<priorApplied, separateAuth, admitted, compensationEffects>>

IssuePrimaryGrant == /\ grantClass = None
                     /\ grantClass' = Primary
                     /\ UNCHANGED <<priorApplied, separateAuth, admitted, compensationEffects>>

AuthorizeCausalCompensation == /\ priorApplied
                               /\ ~separateAuth
                               /\ separateAuth' = TRUE
                               /\ UNCHANGED <<priorApplied, grantClass, admitted, compensationEffects>>

DispatchCompensation == /\ priorApplied
                        /\ separateAuth
                        /\ grantClass = Compensation
                        /\ ~admitted
                        /\ admitted' = TRUE
                        /\ compensationEffects' = 1
                        /\ UNCHANGED <<priorApplied, separateAuth, grantClass>>

RetrySameCompensation == /\ admitted
                         /\ compensationEffects = 1
                         /\ UNCHANGED vars

Status == UNCHANGED vars

SafeNext == IssueCompGrant \/ IssuePrimaryGrant \/ AuthorizeCausalCompensation \/
            DispatchCompensation \/ RetrySameCompensation \/ Status
SafeSpec == Init /\ [][SafeNext]_vars

TypeOK == /\ priorApplied \in BOOLEAN
          /\ separateAuth \in BOOLEAN
          /\ grantClass \in {None, Primary, Compensation}
          /\ admitted \in BOOLEAN
          /\ compensationEffects \in 0..1

CompensationRequiresCausalAuthority ==
    compensationEffects = 0 \/
    (priorApplied /\ separateAuth /\ grantClass = Compensation /\ admitted)

AtMostOneCompensationEffect == compensationEffects <= 1

DispatchWithoutSeparateAuth == /\ priorApplied
                               /\ ~separateAuth
                               /\ grantClass = Compensation
                               /\ compensationEffects = 0
                               /\ admitted' = TRUE
                               /\ compensationEffects' = 1
                               /\ UNCHANGED <<priorApplied, separateAuth, grantClass>>
NoAuthNext == SafeNext \/ DispatchWithoutSeparateAuth
NoAuthSpec == Init /\ [][NoAuthNext]_vars

DispatchPrimaryAsCompensation == /\ priorApplied
                                 /\ separateAuth
                                 /\ grantClass = Primary
                                 /\ compensationEffects = 0
                                 /\ admitted' = TRUE
                                 /\ compensationEffects' = 1
                                 /\ UNCHANGED <<priorApplied, separateAuth, grantClass>>
PrimaryNext == SafeNext \/ DispatchPrimaryAsCompensation
PrimarySpec == Init /\ [][PrimaryNext]_vars

DispatchWithoutPriorApplied == /\ ~priorApplied
                               /\ compensationEffects = 0
                               /\ admitted' = TRUE
                               /\ compensationEffects' = 1
                               /\ UNCHANGED <<priorApplied, separateAuth, grantClass>>
NoPriorNext == SafeNext \/ DispatchWithoutPriorApplied
NoPriorSpec == Init /\ [][NoPriorNext]_vars

====
