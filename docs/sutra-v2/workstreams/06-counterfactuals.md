# Counterfactuals and adversarial challenge

Draft development only. Parent: `092c7971602ee9e294e467efbb0d72c44121e480`.

Existing open gates: V2-LK05, V2-LK06, V2-F05.

Initial slice: Generate material counterexamples, preserve explicit finite search coverage, and test invariant versus reversed conditional outcomes.

State: acceptance contract; implementation pending.

Acceptance: Challenge coincident arithmetic and incomplete worlds; distinguish found witness from proof of absence.

No merge, release, live inference or external contact authorized. Child JS CI is scoped; full integration gates remain mandatory. Record exact source and CI evidence here.


## Parallel session candidate
Implement actual grid expansion audit: recompute both pinned grids, require identical axes/order and immutable prefix, report newly discovered conditional witness pairs. Test joint-only witness discovered at budget 4 vs 3; changed axis ordering refused. No proof of equivalence or empirical completeness.
Exact child CI pending.


## V2-182 candidate
Domain expansion audit matches normalized assignments rather than order-local world IDs, recomputes exact common world rows and witnesses, and reports old evaluated worlds lost to truncation. Tests reordering/adding values, finite budget omission, and non-superset refusal. No empirical completeness claim.
Exact child CI pending.


## V2-183 candidate — resumable streaming counterfactual search
Add a separate large-domain search profile with up to six axes × 32 declared values, total domain capped at 1,000,000,000 assignments, but each call evaluates at most 4,096 worlds and never materializes the Cartesian product. Mixed-radix random access supports deterministic resume; candidate graphs are compiled once, unchanged candidates reuse baseline, chunks expose exact contiguous coverage, and merge refuses overlap or identity drift. The search may stop after all eligible pairs have witnesses, but only full domain exhaustion permits the bounded statement “no witness in this declared domain”; incomplete prefixes never imply equivalence. Regression searches a 262,144-world domain with <=128 evaluations and bounded output, then exhausts a 64-world domain via two chunks. Complexity remains linear in evaluated worlds/candidates; this is bounded scalability, not sublinear semantic proof. Exact child CI pending.


### V2-183 CI correction
Run 45757607945 failed because the regression incorrectly required a distinguishing witness inside the first 128 mixed-radix assignments of the 262,144-world scalability case. Incomplete chunks are specifically allowed to contain no witness. Correct the assertion to require explicit incomplete/non-equivalence qualification, and require an actual witness only after the separate 64-world domain is fully exhausted. Search implementation and coverage rules are unchanged. Prior failure retained; corrected CI pending.
