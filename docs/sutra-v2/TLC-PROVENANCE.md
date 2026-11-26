# TLC dependency provenance — explicit development candidate migration

## Observation (2026-11-26)

The existing v1.8.0 URL previously matched the pinned SHA-256 `fdffef247f563ef6edbfd44958d2a82db79e7564e07cb673262d896353fa6713` in exact V2-167 CI. Repeated later runs failed at the checksum boundary. No mismatched JAR was executed and no formal assertions were removed. The previous binary's current availability and full build provenance have not been established.

The upstream [Clarke prerelease](https://github.com/tlaplus/tlaplus/releases/tag/v1.8.0) now reports publication at 02:14 UTC on 2026-11-26 and publishes SHA-1 `fc4b766626acf025b4661242f58e246d946b9d6b` for tla2tools.jar. The independently retrieved GitHub release API metadata, from the upstream repository, identifies:

- Release ID: 25926686; tag: v1.8.0; prerelease: true; author: lemmy; published: 2026-11-26T02:14:35Z.
- Asset ID: 793969300; uploader: github-actions[bot]; updated: 2026-11-26T02:13:04Z; length: 4511244 bytes.
- SHA-256: `67f9575c3b9ef7a0787b1bded34812862ffe79d711298e5a75b1a77720b19928`.
- Tag ref commit: `1138302995a41cc5649c0321992e4146d8ff06e2`.
- Metadata: https://api.github.com/repos/tlaplus/tlaplus/releases/tags/v1.8.0
- Asset metadata: https://api.github.com/repos/tlaplus/tlaplus/releases/assets/793969300
- Artifact: https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar

## Decision

For this development candidate only, explicitly migrate to the newly identified upstream asset. The script keeps a single statically pinned SHA-256, additionally requires exact byte length and the release page's published SHA-1, and runs the unchanged complete safe/unsafe formal suite only after all checks pass. No dynamic digest discovery or dual-pin fallback. The SHA-1 is supplemental release-page corroboration, not a substitute for SHA-256.

Independent binary retrieval in the current operator environment was unavailable. Exact new CI must retrieve and verify the bytes and run all models; until then the candidate is unverified. Publisher metadata is not a signed reproducible-build attestation, the artifact is a prerelease, and upstream compromise is not ruled out. This is not a production dependency approval or a claim that the old and new binaries behave identically. If any size/hash/model check fails, retain the failure, do not execute the rejected artifact, and investigate. The old pin and its historical successful CI remain part of the audit record.
