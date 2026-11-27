# SUTRA outside-builder trial scorer

This tool scores the **future** two-builder Open Kit adoption trial. It does not find developers, verify their identity, release the kit, or prove independence.

The two builders must use one exact released artifact/revision in their own environments with only the released quickstart. Public records use neutral IDs `B01` and `B02`; do not store names, emails, handles or employer details here.

Each trial records explicit-timezone start/end timestamps, environment summary, whether a valid result was obtained, every disclosed maintainer intervention, every blocker and bounded notes. Setup time is derived from timestamps rather than entered as a favorable number.

Target: both builders obtain a valid result in <=15 minutes. Slow/failed trials and interventions stay in the report. A valid negative product result is not a tooling failure.

The scorer requires an exact outside-project attestation but cannot prove independence or undisclosed coaching. That remains human evidence.

CLI: `node tools/sutra-builder-trial/cli.mjs trials.json > report.json`.
