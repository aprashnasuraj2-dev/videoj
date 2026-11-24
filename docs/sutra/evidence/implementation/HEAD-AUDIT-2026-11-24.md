# SUTRA observed-head audit — security, seek and automated accessibility

Observed code: `545f2c310beb9ac4e5e3a4e30603dd6640cf67d7`  
Observed learner/browser workflow: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45293913993/job/138109358437  
Observed at: 2026-11-24T05:48:49+05:45

This note credits only checks that were already implemented and actually green on the observed code. It does not turn laboratory or Chromium evidence into human, physical-device, public-HTTPS or factual-content evidence.

## Hostile peer containment

The runtime suite passed both **“untrusted peer graph cannot activate nested remote, MCP, executable, REST or private forwarding”** and **“host security boundary follows hostile peer instructions while runtime capabilities stay fixed.”** Caller-owned model routing, destination policy, write restrictions and private-context rules remain runtime controls rather than prompt suggestions. This supports `P038-01` and the phase-038 exit. Residual prompt/model manipulation risk remains documented; no universal prompt-injection immunity is claimed.

## Evidence seek boundary

The same run passed the seek-policy checks for missing/errored/unreadable media and specifically **live or unknown-duration media is explicitly nonseekable for evidence cues**. Browser integration independently observed native seek feedback within the existing one-second tolerance on supported media. This supports `P043-04` and closes phase 043.

## Ordinary player controls

The Chromium learner flow exercised actual native play/pause, mute/unmute, volume slider, caption-track activation, fullscreen enter/exit and evidence seek. This supports `P042-05`. It does not yet close phase 042 because source-change/decode-error coverage and remaining player acceptance tasks are still open.

## Optional execution details

The visible peer workbench keeps detailed routing/budget/contact/trace information inside a collapsed `<details>` inspector rather than requiring it for the learner's main evidence flow. This supports `P041-06`; it does not substitute for a fresh-viewer acceptance pass.

## Automated accessibility boundary

The dedicated Chromium audit observed:

- no duplicate IDs and no unnamed visible controls;
- deliberate live-region usage without making execution-budget fields live;
- sampled computed text contrast >= 4.5:1;
- reduced-motion behavior;
- keyboard movement into the peer control and focus restoration after modal denial;
- >=24 CSS px target size on the sampled core controls;
- media/transcript usability under reduced motion;
- 200% Chromium CSS zoom without horizontal clipping;
- 360 px layout without horizontal clipping.

This supports `P049-01` through `P049-06` and the phase artifact `P049-09`. It is a targeted automated Chromium regression, **not** a human screen-reader audit or physical touch-device test. `P049-07`, device/browser inventory `P049-08`, and the phase exit remain open.
