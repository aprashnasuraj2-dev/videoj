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
