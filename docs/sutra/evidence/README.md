# Evidence conventions

Store concise durable evidence needed to reproduce or assess a task. Do not commit raw private research notes, identity records, provider credentials, full private prompts or huge generated browser recordings. Public evidence is redacted and linked to the actual source revision.

Suggested organization as evidence is produced:

- `conformance/`: public-artifact, browser-local execution, peer loading, denial and budget results.
- `evaluation/`: frozen cases, scoring rubric and actual per-case outcomes.
- `browser/`: real browser versions and physical/emulated distinctions.
- `community/`: versioned clean-install instructions, actual trial counts/timings/interventions.
- `release/`: public URL checks, build/source manifests and staging rollback results.

Do not create fake result files to fill these directories. Empty/missing categories mean evidence is not yet present.

## Verified task record example

This is a template, not a completed task. Replace the timestamp, revision, artifact and description with observed values and ensure the corresponding checkbox is `[x]`.

```json
{
  "state": "verified",
  "verified_at": "2026-11-23T20:00:00+05:45",
  "evidence": [
    {
      "artifact": "docs/sutra/evidence/conformance/ACTUAL_RESULT.md",
      "description": "Actual command, observed result and scope of verification",
      "result": "pass",
      "source_revision": "REPLACE_WITH_ACTUAL_40_CHARACTER_SHA",
      "observed_at": "2026-11-23T20:00:00+05:45"
    }
  ]
}
```

A local path must exist and a public URL must identify actual evidence. Prefer immutable URLs/hashes for release claims. A metadata checker can detect missing files and record fields; it cannot determine that an observation is truthful or a claim is semantically supported. The assistant must inspect the evidence.

## Stale or failed evidence

Append failed results to the session history and relevant evidence report. Reopen a verified task if dependent source/media/configuration changes invalidate it. Retain old evidence as history, but do not count it as proof of the current candidate. State what changed and exactly which checks must run again.
