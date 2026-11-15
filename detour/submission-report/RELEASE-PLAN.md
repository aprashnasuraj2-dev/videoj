# DETOUR public release plan

Adopted 2026-11-15 Nepal time. Execute with the release milestones when the build and media are ready.

| Milestone | Decision and evidence |
| --- | --- |
| Phase 8, media and Mux bonus | Prepare a DETOUR-owned, rights-cleared on-demand asset. Keep independently playable same-origin MP4 as the core release path. Then use Mux for an optional HTTPS HLS path. Keep upload credentials in server-side secret storage and expose only the public playback ID. Claim the bonus only after a signed-out browser plays and seeks the Mux video, the hold/return path passes on the actual adapter, the MP4 recovery is proven, and the public ID is recorded for judging. |
| Public build and domain | Candidate: `detour.aafnaipatro.com`. Use the Cloudflare Patro connection when the release is ready. Recheck ownership and conflicts then, deploy an immutable DETOUR-only static build via a dedicated Pages Direct Upload project, and attach only this custom hostname. Verify TLS, byte-range playback, captions, both seek paths, and the deployed source SHA from a signed-out session. Record rollback to the exact earlier deployment. If Pages cannot serve the verified bundle or video, evaluate a DETOUR-only R2 origin. |
| Durable evidence and handover | At release milestones place meaningful browser recordings, non-reproducible evidence, and the exact candidate/handover package in a DETOUR-specific Google Drive folder in the owner’s storage. Record Drive file IDs, SHA-256, source SHA and access verification in the release handoff. Keep sharing as configured for the selected folder. Deduplicate using revision and checksums. |

DHAGO deployments and archives have their own scope. A proposed domain, Mux asset, verified live-site bonus, or Drive package becomes a completed release item only after the corresponding verification evidence exists.

- [Mux public playback IDs](https://www.mux.com/docs/api-reference/video/playback-id)
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
