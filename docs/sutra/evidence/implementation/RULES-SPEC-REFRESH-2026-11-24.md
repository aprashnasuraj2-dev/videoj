# Rules/spec refresh — 2026-11-24

Official rules and the upstream agentic-web repository were rechecked after substantial SUTRA implementation.

- Submission deadline remains **11 January 2027 08:00 PST / 16:00 UTC / 21:45 Nepal**.
- Stage one remains pass/fail open-agentic-web conformance; stage two remains four equally weighted criteria.
- Public site, conforming JSON, browser runtime, interaction interface, English materials, screenshots and a public YouTube browser demo under two minutes with the entrant explaining the project remain required.
- The official submission requirements call LLM/key configuration **optional**.
- Rules still name the specification as of submission-period start. Launch Profile 0.2 remains the formal baseline.
- Current upstream head is `d67755e762545de983e38a395ec45d89b77c9311`; the Profile 0.3 spec blob is still `b72fcdf433e323e30a6052e9e0c0718b835672c1`.
- Exact launch 0.2 → current 0.3 spec text differences remain non-behavioral: version/date, reference URLs and typo fixes.
- Current Profile 0.3 explicitly permits publisher-funded default inference and says BYOK is optional when that default path runs the network.
- Current upstream implementation guidance now documents `publisher_funded: true` and a server-side proxy that receives no visitor key.

Source-precedence decision: Official Rules → pinned MVP spec → README/examples/skills. README wording is not allowed to silently add a BYOK requirement that the rules/spec make optional.

This refresh does not establish entrant eligibility or public conformance; those remain later human/release gates.