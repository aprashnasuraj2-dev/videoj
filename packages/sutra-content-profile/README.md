# SUTRA content profile

A data-only, same-origin content boundary shared by the learner and release tooling. It binds a content version to a SHA-256 source catalog, one primary source/cue, media paths and an optional/reviewed written-guide claim. The loader uses bounded credentialless JSON GETs, rejects redirects/path escape and verifies the exact catalog bytes before exposing source data.

`mode: synthetic` is development evidence only. `mode: reviewed` requires a written-guide claim structurally, but does not prove licensing, reviewer competence or factual truth. Those remain private/human release evidence.

This package contains no media, no provider key and no UI.
Schema 1 deliberately binds one mounted source, one transcript and one media artifact. Extra catalog sources are rejected until a profile schema can independently bind their transcript/media artifacts. Generic standalone source tools still support bounded multi-source catalogs. In reviewed mode, the media, transcript and guide digest must appear as an exact path segment, not a substring or fragment. A digest-shaped path is not proof of what a remote server actually serves.

Explicit playback uses a complete credentialless, no-redirect GET, exact MP4/WebM MIME, bounded decoded bytes and SHA-256 before the native player sees a blob. Reviewed media is capped at 24 MiB and synthetic media at 1 MiB; the learner exposes a cancel action. At 1 Mbps 24 MiB takes about 201 seconds before protocol overhead, so transcript-first use remains available. A larger source requires a separately designed verified chunk/stream contract or re-encoding; never fall back to unverified remote playback. This bounds bytes, not peak browser RSS or decoding safety.
