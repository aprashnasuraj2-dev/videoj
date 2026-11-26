# SUTRA physical touch-device evidence gate

This tool validates the **future** manual record for phase 077. It cannot operate a phone and it does not turn emulation into physical evidence.

A real observer must use an available physical iPhone or Android device and record:
- neutral device-record ID only;
- platform, OS/browser versions;
- exact candidate source SHA and media SHA-256;
- explicit-timezone observation timestamp;
- pass/fail/unsupported/untested for page load, direct lookup, media decode, play/pause, native seek, captions, fullscreen, consent denial, review preview/save, export, narrow scrolling, touch targets and error recovery.

Core touch result requires page load, direct lookup, media decode, play/pause, native seek, consent denial, review preview/save, narrow scrolling, touch targets and error recovery all to pass. Fullscreen/captions/export remain visible even when a browser reports them unsupported/untested; nothing is silently normalized away.

The required attestation says the observation occurred on a physical touch device. Software cannot prove that statement. Do not store device serial numbers, user names, Apple/Google accounts, phone numbers or screenshots containing private content in the public record.

CLI: `node tools/sutra-device-check/cli.mjs DEVICE_RECORD.json > validated.json`.

The template is deliberately invalid until real observation fields are filled.


## Device-ready acceptance kit

Build the exact static candidate and run the preflight before handing it to a reviewer:

`cd apps/sutra && npm ci && npm run build && cd ../..`

`node tools/sutra-device-check/preflight.mjs apps/sutra/dist > device-bundle-preflight.json`

The CI workflow performs the same build/preflight and uploads `apps/sutra/dist` as a private workflow artifact named **sutra-device-ready-static-bundle**. This is a test bundle, not a public release.

After a real physical-device observation, validate the device record:

`node tools/sutra-device-check/cli.mjs DEVICE_RECORD.json > validated-device.json`

Use the returned `recordHash` in a neutral reviewer feedback file based on `reviewer-feedback.template.json`, then validate it:

`node tools/sutra-device-check/reviewer-cli.mjs REVIEWER_FEEDBACK.json > validated-reviewer.json`

The reviewer record intentionally accepts only neutral IDs plus the physical-device record hash. Names, email addresses, phone numbers, account IDs and device serial numbers are not schema fields.

`feedback-endpoint.mjs` provides a bounded `POST /reviewer-feedback` handler contract with an injected append sink for an authorized future review environment. It rejects Authorization/Cookie-bearing requests, query strings and non-schema fields. It is **not deployed here**; deployment remains behind the project release gate.

Automated preflight proves only that the static candidate and validation tools are ready. Actual physical touch behavior, human reviewer acceptance and screen-reader acceptance remain external observations and must never be inferred from CI.
