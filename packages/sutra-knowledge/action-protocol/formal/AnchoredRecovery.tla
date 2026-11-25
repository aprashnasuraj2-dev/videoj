------------------------- MODULE AnchoredRecovery -------------------------
EXTENDS Naturals, Sequences, FiniteSets
CONSTANT Mode
Clients == 1..2
Keys == 1..3
Allowed == 1..2
Heads == {<<>>} \cup {<<k>> : k \in Keys} \cup {<<k,l>> : k \in Keys, l \in Keys}
Messages == [caller: Clients, key: Keys, head: Heads]
VARIABLES history, published, spent, pending, acked
vars == <<history, published, spent, pending, acked>>
Entries(h) == {h[i] : i \in 1..Len(h)}
Prefix(a,b) == Len(a) <= Len(b) /\ a = SubSeq(b,1,Len(a))
Total == spent[1]+spent[2]
CanContact(c) ==
 /\ spent[c] < (IF Mode = "budget" THEN 3 ELSE 2)
 /\ Total < (IF Mode = "budget" THEN 4 ELSE 3)
Init ==
 /\ history = <<>>
 /\ published = {<<>>}
 /\ spent = [c \in Clients |-> 0]
 /\ pending = {}
 /\ acked = {}
Dispatch(c,k) ==
 /\ CanContact(c)
 /\ spent' = [spent EXCEPT ![c] = @+1]
 /\ pending' = pending \cup {[caller |-> c, key |-> k, head |-> history]}
 /\ UNCHANGED <<history,published,acked>>
Drop(m) ==
 /\ m \in pending
 /\ pending' = pending \ {m}
 /\ UNCHANGED <<history,published,spent,acked>>
Status(c,k) ==
 /\ CanContact(c)
 /\ spent' = [spent EXCEPT ![c] = @+1]
 /\ acked' = IF k \in Entries(history) THEN acked \cup {k} ELSE acked
 /\ UNCHANGED <<history,published,pending>>
Deliver(m,ack) ==
 /\ m \in pending
 /\ pending' = pending \ {m}
 /\ UNCHANGED spent
 /\ IF (m.key \in Allowed \/ Mode = "unauthorized") /\
       (m.head = history \/ Mode = "stale")
    THEN IF m.key \in Entries(history)
         THEN /\ UNCHANGED <<history,published>>
              /\ acked' = IF ack THEN acked \cup {m.key} ELSE acked
         ELSE IF Len(m.head) < 2 /\ m.key \notin Entries(m.head)
              THEN /\ history' = Append(m.head,m.key)
                   /\ published' = published \cup {history'}
                   /\ acked' = IF ack THEN acked \cup {m.key} ELSE acked
              ELSE UNCHANGED <<history,published,acked>>
    ELSE UNCHANGED <<history,published,acked>>
Rollback ==
 /\ Mode = "rollback"
 /\ Len(history) > 0
 /\ history' = SubSeq(history,1,Len(history)-1)
 /\ UNCHANGED <<published,spent,pending,acked>>
Crash == UNCHANGED vars
Next ==
 \/ \E c \in Clients,k \in Keys: Dispatch(c,k) \/ Status(c,k)
 \/ \E m \in Messages: Drop(m) \/ \E ack \in BOOLEAN: Deliver(m,ack)
 \/ Rollback
 \/ Crash
Spec == Init /\ [][Next]_vars
TypeOK ==
 /\ history \in Heads
 /\ published \subseteq Heads
 /\ spent \in [Clients -> 0..3]
 /\ pending \subseteq Messages
 /\ acked \subseteq Keys
Authorized == Entries(history) \subseteq Allowed
Unique == Cardinality(Entries(history)) = Len(history)
BoundedContacts == Total <= 3 /\ \A c \in Clients: spent[c] <= 2
ReceiptSound == acked \subseteq Entries(history)
NoRollback == \A h \in published: Prefix(h,history)
NoFork == \A h,j \in published: Prefix(h,j) \/ Prefix(j,h)
=============================================================================
