# DETOUR

Build a reusable Video.js v10 skin where viewers can **keep their place, explore any other moment, and return in one action**. One conventional seek bar shows the current position and a separate held mark. The visible “Return to [time]” action is the player’s signature. “Stay here” clears the mark without seeking.

## Start here

1. Read the current [100-step checklist](CHECKLIST.md) and [progress](PROGRESS.md) from the same freshly fetched `detour` head.
2. Use the [continuation instructions](CONTINUE.md) to resume the current phase and next actionable step.
3. Update the checklist and progress with evidence as work lands. Keep release evidence in [submission-report/](submission-report/README.md).

## Product direction

- **Player first.** Keep one source-scoped held point, five essential controls and real player state. Preserve normal play/pause, seeking, captions, keyboard and touch. The mark survives arbitrary seeks and clears on successful return, deliberate dismissal or a source change.
- **Own identity.** Use graphite, a bright angular hold marker and tabular time. Lead with a playable player or a real capture. Keep DHAGO’s woven interaction, footage, visual system, live routes and release workflows out of DETOUR.
- **Prove the behavior early.** First build a rough real v10 MP4 prototype. Demonstrate a 42s → 18s → 42s round trip, held origin through two seeks, and “Stay here” without movement. Test first-use recognition, narrow touch and keyboard before adding polish. Backup: [Pausepoint](CHECKLIST.md#02--concept-definition-and-signature-interaction), an explicit one-time pause at a viewer-chosen timestamp.
- **Ship in order.** Core skin → replacement-media mount → public anonymous playback and real-device evidence → optional Mux or real-site bonus → owner handoff. See the [rules register](submission-report/RULES.md) for release constraints. DETOUR can develop and rehearse while second-entry eligibility is being resolved.

The original [planning PDF](https://chatgpt.com/library?file_id=libfile_d2f57bf1472081918779a4349d0ed582&account_id=personal) is a historical reference. Checklist state, wording and resume position live on this branch.
