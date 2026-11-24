# SUTRA paired learner-study gate

This tool prepares and scores the **future** ten-person target-user comparison. It does not recruit anyone, collect identities, determine eligibility, or claim user research has happened.

## Design

- exactly ten de-identified participant IDs `P01..P10`;
- within-participant comparison: SUTRA and manual transcript/checklist method;
- 5/5 first-method counterbalance;
- two matched task variants A/B, alternated across method order to reduce task-memory bias;
- recorded seed creates a deterministic assignment;
- every participant/method row is mandatory—slow/failing rows cannot be dropped;
- success requires valid evidence, not merely a fast answer.

The real study must use two human-reviewed task variants from the rights-cleared corpus. Until that exists, this tool is protocol readiness only.

## Observation fields

One row per participant/method:
- neutral participant ID;
- method and assigned variant;
- success;
- validEvidence;
- elapsed seconds to the final evidence decision;
- observer assistance count;
- criticalError.

Do not store participant names, email, employer, IP or demographic details in the public repo. Eligibility/consent evidence belongs in the approved study process, not the scoring file.

## Output

The scorer reports method success, valid-evidence count, unaided success, median time, median time-to-valid-evidence, assistance, critical errors, paired deltas and descriptive order-stratified deltas.

The predeclared product targets are:
- >=8/10 unaided SUTRA completion;
- no evidence-accuracy loss (this strict v1 scorer requires 10/10 valid evidence in **both** methods before comparing speed);
- >=30% lower median time-to-valid-evidence for SUTRA.

If evidence validity differs, the speed claim becomes null/fail. If manual search is faster, the negative result stays negative.

This arithmetic cannot prove task equivalence, participant eligibility, neutrality, consent or lack of coaching. Those are human-study evidence gates.
