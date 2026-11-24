# SUTRA content profile

A data-only, same-origin content boundary shared by the learner and release tooling. It binds a content version to a SHA-256 source catalog, one primary source/cue, media paths and an optional/reviewed written-guide claim. The loader uses bounded credentialless JSON GETs, rejects redirects/path escape and verifies the exact catalog bytes before exposing source data.

`mode: synthetic` is development evidence only. `mode: reviewed` requires a written-guide claim structurally, but does not prove licensing, reviewer competence or factual truth. Those remain private/human release evidence.

This package contains no media, no provider key and no UI.
Schema 1 deliberately binds one mounted source, one transcript and one media artifact. Extra catalog sources are rejected until a profile schema can independently bind their transcript/media artifacts. Generic standalone source tools still support bounded multi-source catalogs. In reviewed mode, the media, transcript and guide digest must appear as an exact path segment, not a substring or fragment. A digest-shaped path is not proof of what a remote server actually serves.
