# SUTRA prior-art and falsification register

As of 2026-11-26. Initial source-checked coverage, not a systematic review or novelty clearance. The four supplied ACL references and five foundational references were examined at abstract or standard overview level; no claim of full-paper reproduction.

## Positioning boundary

SUTRA does not invent semantic disambiguation, paraphrase verification, execution-based program testing, provenance, belief revision, dependency tracking or incremental computation. The research hypothesis is whether the integrated, model-replaceable investigation workflow preserves material distinctions and accountable revision with less review effort and fewer unsupported decisive conclusions at matched resources. Existing 16-case synthetic pilot ties a simple enumerate-all baseline; no competitive advantage is established.

## PA01 — Semantic Parsing of Ambiguous Input through Paraphrasing and Verification (2015)

Arthur, Neubig, Sakti, Toda, Nakamura. [Source](https://aclanthology.org/Q15-1041/) · inspected publisher abstract.

- Established work: Jointly generate a meaning representation and a less ambiguous paraphrase from ambiguous input; language-model scores support verification.
- Current SUTRA boundary: controlled-roundtrip.js reconstructs admitted target instructions; does not generate intended meaning or score paraphrases.
- Proposed falsification experiment: Blindly label material qualifiers lost or altered in rendered instructions; compare generated paraphrase with controlled instruction reconstruction.
- Open gap: No automatic semantic parser or independent human semantic evaluation.

## PA02 — Towards Transparent Interactive Semantic Parsing via Step-by-Step Correction (2022)

Mo, Lewis, Sun, White. [Source](https://aclanthology.org/2022.findings-acl.28/) · inspected publisher abstract.

- Established work: Stepwise natural-language explanation of predicted logical forms with user corrections in knowledge-base question answering; introduces INSPIRED dialogue dataset.
- Current SUTRA boundary: clarification-plan.js and clarification-preview.js separate exact declared alternatives and compatibility; workspace supports explicit correction.
- Proposed falsification experiment: Matched user tasks: time, number of corrections, residual material errors, accessibility and unsupported answers versus stepwise interactive baseline.
- Open gap: No real user study or automatic interpretation repair.

## PA03 — Weakly Supervised Semantic Parsing with Execution-based Spurious Program Filtering (2023)

Lee, Kim, Jung. [Source](https://aclanthology.org/2023.emnlp-main.425/) · inspected publisher abstract.

- Established work: Represents programs by results over multiple inputs and uses majority voting to filter semantically divergent programs in weak supervision.
- Current SUTRA boundary: semantic-counterfactual.js and semantic-witness-search.js expose differing formal behavior; deliberately do not vote away alternatives.
- Proposed falsification experiment: Same candidate pool and same perturbation budget: compare observed-only, execution-signature majority, and retained distinguishing-witness workflows on wrong-program detection and minority correct interpretation retention.
- Open gap: No measured automatic parser performance or held-out result.

## PA04 — Disambiguate First, Parse Later: Generating Interpretations for Ambiguity Resolution in Semantic Parsing (2025)

Saparina, Lapata. [Source](https://aclanthology.org/2025.findings-acl.863/) · inspected publisher abstract.

- Established work: Generates preferred natural-language disambiguations, then fills missing interpretations before logical-form mapping; SQL execution supports interpretation annotation.
- Current SUTRA boundary: semantic-investigation.js keeps caller-supplied meaning declarations and unresolved facets before and after calculation.
- Proposed falsification experiment: Measure interpretation recall and precision on independently annotated ambiguous questions; compare same generation budgets, keeping missing interpretations visible.
- Open gap: Current supplied-candidate mode cannot establish interpretation recall over all plausible meanings.

## PA05 — A Truth Maintenance System (1979)

Doyle. [Source](https://dspace.mit.edu/entities/publication/5377b306-4ecc-4687-b1f5-78cbb4a0543a) · inspected institutional abstract.

- Established work: Maintains reasons for program beliefs and revises belief state by tracing dependencies and assumptions.
- Current SUTRA boundary: investigation-revision.js tracks admitted dependencies and scoped impact while retaining exact historical input versions.
- Proposed falsification experiment: Compare targeted invalidation with full replay and a simple reason-maintenance baseline under source withdrawal, reintroduction and conflicting branches.
- Open gap: Not a general truth maintenance implementation; no full belief closure or dependency-directed search claim.

## PA06 — An assumption-based TMS (1986)

de Kleer. [Source](https://doi.org/10.1016/0004-3702(86)90080-9) · inspected publisher abstract.

- Established work: Maintains assumption sets rather than only individual justifications.
- Current SUTRA boundary: semantic-world-grid.js enumerates bounded supplied candidate and hypothetical quantity assignments.
- Proposed falsification experiment: Compare support and counterexample sets against exhaustive finite oracle, measure truncation and repeated assumption reuse.
- Open gap: No ATMS implementation equivalence or general minimal environment algorithm claim.

## PA07 — Logic of Belief Revision (2023)

Stanford Encyclopedia of Philosophy (survey). [Source](https://plato.stanford.edu/archives/spr2023/entries/logic-belief-revision/) · inspected scholarly survey.

- Established work: AGM distinguishes belief change operations and characterizes them with rationality postulates over logically closed belief sets.
- Current SUTRA boundary: investigation-history.js and sibling-branch-contrast.js preserve conflicting versions rather than enforce global belief consistency.
- Proposed falsification experiment: Explicitly compare withdrawal, restoration, incompatible branches, and preserved unresolved evidence; define scoped invariants before invoking belief-revision postulates.
- Open gap: Not an AGM theory implementation or rationality postulate compliance claim.

## PA08 — A consistent semantics of self-adjusting computation (2013)

Acar, Blume, Donham. [Source](https://www.cambridge.org/core/journals/journal-of-functional-programming/article/consistent-semantics-of-selfadjusting-computation/441A28C813BDA23B57F1ED2BB1A7E36E) · inspected publisher abstract.

- Established work: Formal correctness and consistency of self-adjusting computation; machine-checked semantics.
- Current SUTRA boundary: revision-reuse-audit.js checks projected cached reports against fresh replay of admitted exact graphs.
- Proposed falsification experiment: Matched full replay versus actual incremental execution on shared DAGs, simultaneous edits and interrupted updates; compare full output, runtime and memory.
- Open gap: SUTRA currently still replays full versions, no end-to-end incremental performance or formal equivalence theorem.

## PA09 — PROV-DM: The PROV Data Model (2013)

Moreau and Missier (editors), W3C. [Source](https://www.w3.org/TR/prov-dm/) · inspected normative recommendation introduction and model overview.

- Established work: Standard provenance vocabulary distinguishes entities, activities, agents, derivation and responsibility.
- Current SUTRA boundary: Source spans, declared lineage and version digests track restricted provenance and dependency relationships.
- Proposed falsification experiment: Map admitted evidence, computation and reviewer declaration into a PROV-compatible interchange profile; test round-trip without inventing agents or source authenticity.
- Open gap: No full PROV conformance, signature trust or empirical source independence.

## Uncovered areas

- Program synthesis and constraint solving
- Formal argumentation
- Statistical and causal inference
- Decision theory and robust optimization
- Modern competing persistent investigation products and research systems
- Full-text methodological comparison and license evaluation for reusable datasets

Keep external benchmark licensing, author/reviewer separation, matched budgets, and no fabricated performance. Prior-art gate remains open.
