# SUTRA content profile

A data-only, same-origin content boundary shared by the learner and release tooling. It binds a content version to a SHA-256 source catalog, one primary source/cue, media paths and an optional/reviewed written-guide claim. The loader uses bounded credentialless JSON GETs, rejects redirects/path escape and verifies the exact catalog bytes before exposing source data.

`mode: synthetic` is development evidence only. `mode: reviewed` requires a written-guide claim structurally, but does not prove licensing, reviewer competence or factual truth. Those remain private/human release evidence.

This package contains no media, no provider key and no UI.