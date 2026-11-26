# Held-out evaluation protocol implementation

A dedicated held-out namespace now exists separately from the public development regression set. No human-reviewed set is claimed.

The protocol code validates the exact 20 answerable / 10 unanswerable / 10 conflict distribution, emits blind packets without expected answers, requires all 40 case IDs in a structural review attestation before freeze, hashes the exact frozen content, refuses missing scored rows, and creates append-only correction records with a parent hash and reason.

Synthetic unit tests exercise the protocol mechanics only. They are not review evidence and must not be counted as P053-01/02/03/05/10. Human review and real corpus adjudication remain required.