# Active development tree

The SUTRA-only draft branch retains apps/sutra-v2, apps/sutra, apps/sutra-peer, SUTRA packages, services, deployment tooling, and all historical SUTRA engineering evidence. The historical standalone product trees, root player build/configuration, demo/test trees and workflows are retired from the active branch. Their prior Git revisions remain intact.

The learner depended on the historical root media implementation. Sixteen original blobs are relocated under apps/sutra/src/media-player, preserving attribution and exact bytes. Its adapter imports the local implementation. The root npm package is a dependency-free SUTRA command dispatcher; app-scoped lockfiles remain authoritative.

This change does not change the default branch, repository name, public deployment or production route. Exact clean build, browser and inherited learner acceptance checks remain required. Historical docs/sutra/REPOSITORY_MAP.md describes the earlier tree, not this candidate.
