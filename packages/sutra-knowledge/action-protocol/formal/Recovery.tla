---------------------------- MODULE Recovery ----------------------------
EXTENDS Naturals
CONSTANT Safe
Clients == {1, 2}
Phases == {"proposed", "unknown", "committed"}
VARIABLES ledger, effects, staged, phase, pending
vars == <<ledger, effects, staged, phase, pending>>
Init ==
 /\ ledger = FALSE
 /\ effects = 0
 /\ staged = FALSE
 /\ phase = [c \in Clients |-> "proposed"]
 /\ pending = {}
Dispatch(c) ==
 /\ phase[c] # "committed"
 /\ c \notin pending
 /\ phase' = [phase EXCEPT ![c] = "unknown"]
 /\ pending' = pending \cup {c}
 /\ UNCHANGED <<ledger, effects, staged>>
Drop(c) ==
 /\ c \in pending
 /\ pending' = pending \ {c}
 /\ UNCHANGED <<ledger, effects, staged, phase>>
Deliver(c, ack) ==
 /\ c \in pending
 /\ pending' = pending \ {c}
 /\ IF ledger
       THEN /\ UNCHANGED <<ledger, effects, staged>>
            /\ phase' = IF ack THEN [phase EXCEPT ![c] = "committed"] ELSE phase
       ELSE IF Safe
            THEN /\ ledger' = TRUE
                 /\ effects' = effects + 1
                 /\ staged' = FALSE
                 /\ phase' = IF ack THEN [phase EXCEPT ![c] = "committed"] ELSE phase
            ELSE /\ ~staged
                 /\ effects < 2
                 /\ effects' = effects + 1
                 /\ staged' = TRUE
                 /\ UNCHANGED <<ledger, phase>>
Finalize ==
 /\ staged
 /\ ledger' = TRUE
 /\ staged' = FALSE
 /\ UNCHANGED <<effects, phase, pending>>
Crash ==
 /\ staged' = FALSE
 /\ UNCHANGED <<ledger, effects, phase, pending>>
Status(c) ==
 /\ phase[c] = "unknown"
 /\ ledger
 /\ phase' = [phase EXCEPT ![c] = "committed"]
 /\ UNCHANGED <<ledger, effects, staged, pending>>
Next ==
 \/ \E c \in Clients: Dispatch(c) \/ Drop(c) \/ Status(c)
 \/ \E c \in Clients, ack \in BOOLEAN: Deliver(c, ack)
 \/ Finalize
 \/ Crash
Spec == Init /\ [][Next]_vars
TypeOK ==
 /\ ledger \in BOOLEAN
 /\ effects \in 0..2
 /\ staged \in BOOLEAN
 /\ phase \in [Clients -> Phases]
 /\ pending \subseteq Clients
AtMostOnce == effects <= 1
ReceiptSound == \A c \in Clients: phase[c] = "committed" => ledger /\ effects = 1
AtomicLedger == ledger = (effects = 1)
=============================================================================
