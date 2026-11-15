# Phase 10 — final verification and packaging

## Independent path around owner/account blockers

Steps 090 and 091 remain open for fresh-human and account/form evidence. Per `CONTINUE.md`, that does not block release verification, mandatory-control testing, secret/rights scanning or reusable-package proof.

## Steps 092–095 implementation — 2026-11-15

### 092 exact public release

The gate reads `mux-release-origin.json` and opens the exact public URL in a fresh signed-out Chromium context on GitHub-hosted infrastructure. It requires the Worker source/dist headers to match the frozen release, records pinned `@videojs/html 10.4.0`, checks real Mux media/captions, executes the signature round trip and probes the independent same-origin MP4 with a byte range.

### 093 mandatory controls

Desktop keyboard exercises play/pause, seek/time, mute, fullscreen and Settings/Escape focus restoration. A separate 375×667 touch-enabled Chromium context taps play/pause, a real point on the seek surface, mute and fullscreen while checking the time face. The bright alternate-media route must retain all five controls. This is exact-public browser evidence, not a claim of physical iOS/Android testing.

### 094 bundle / rights / secret scan

The build audit rejects management credential environment names, Mux management API endpoints and Basic-authorization hooks from emitted text assets. It also rejects internal source/report directories and the Mux provisioner from `dist`, checks public config keys for secret-like fields, validates the exact showcase SHA/provenance, verifies Apache-2.0 for the entry, accepts only the pinned permissive production dependency licenses currently present, and audits `npm pack --dry-run` boundaries.

### 095 reusable package

The package README now includes pack/install/build instructions, a host-owned video+caption example, feature limits and media/license boundaries. The existing package-host test creates the tarball, installs it in a fresh temporary host, uses replacement media/captions and runs the signature across Chromium/Firefox/WebKit. CI additionally preserves the final `.tgz` on success.
