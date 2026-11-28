# Hybrid semantic interpretation (development candidate)

The existing closed grammar is retained. The new hybrid interface admits competing meanings of open-language questions from an explicitly selected model or other caller, using only reviewed binding IDs and exact quote spans. It never treats the output of a language model as a verified fact. The package does not initiate external model requests.

1. Use `prepareHybridSemantic(input,{sourceIds})` to inspect the bounded local disclosure packet and its exact digest. No sources are selected by default.
2. An authorized caller can transmit the reviewed packet to a chosen language model, or construct an explicitly untrusted proposal locally. Use its response schema; return the exact packet digest, all plausible interpretations and missing context. Do not include private information or credentials.
3. Use `evaluateHybridSemantic(input,{sourceIds,approvedPacketPin,responseText})` to rederive the packet, reject drift and fabricated references, evaluate eligible operations through the actual reviewed compiler, and expose conditional divergences and clarification questions. All results retain mandatory semantic review.

This is an integration boundary, not evidence of live provider performance. The tests use explicit fixture proposals, not generated model responses. The pilot must separately measure real model precision/recall, independent human adjudication, abstention, cost and latency on scenario-separated cases. No semantic approval or automatic adoption is supported.
