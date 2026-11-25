---- MODULE WitnessBridgeLossy ----
EXTENDS WitnessBridge

\* The original profile forces acknowledgement before any later Prepare.
\* The Go coordinator does not have that guard: a crash or failed final
\* attestation after ClearIntent can be followed by another status/contact.
PrepareWithoutAck ==
    /\ intent = None
    /\ authority = witness
    /\ authority < MaxVersion
    /\ intent' = [before |-> authority, after |-> authority + 1]
    /\ UNCHANGED <<authority, witness, ack>>

LossyNext ==
    \/ PrepareWithoutAck
    \/ CommitAuthority
    \/ AdvanceWitness
    \/ ClearIntent
    \/ AbortPrepared
    \/ Acknowledge
    \/ Crash

LossySpec == Init /\ [][LossyNext]_vars

LossyFairSpec ==
    LossySpec
    /\ WF_vars(CommitAuthority)
    /\ WF_vars(AdvanceWitness)
    /\ WF_vars(ClearIntent)
    /\ WF_vars(AbortPrepared)
    /\ WF_vars(Acknowledge)

\* Acknowledgement is a monotonic high-water mark, not a per-request receipt.
\* With no further contact, a continuously enabled acknowledgement can settle.
\* Endless Prepare/Abort cycles can defeat unconditional acknowledgement
\* under weak fairness; keep that negative control separately.
QuiescentEventuallyAcknowledged ==
    (<>[](intent = None /\ authority = witness)) => <>[](ack = authority)

====
