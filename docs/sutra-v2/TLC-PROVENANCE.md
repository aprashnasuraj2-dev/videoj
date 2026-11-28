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

## 2026-11-27 — replace rolling prerelease with stable content-pinned candidate

The later exact [CI failure](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46073146699/job/140754593310) received 4511362 bytes and SHA-256 `18e0d9caa517a6553ef50c7105191b1bfcfe5cc630bdbceefc087093e0520ce3`; the previously pinned 4511244-byte artifact was refused. The upstream [README](https://github.com/tlaplus/tlaplus/blob/master/README.md) explicitly identifies v1.8.0 as a rolling per-master-commit prerelease. Repeatedly changing the accepted digest to the most recent received bytes is not a reproducibility solution.

Select the stable Xenophanes v1.7.4 release (2024-08-05) as a new development candidate, not a claim that older and newer TLC are interchangeable.

- Upstream [release](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4), tag commit `5a47802b5c391f59ecdd44117981f4ff8c0656ba`.
- Live upstream [release API](https://api.github.com/repos/tlaplus/tlaplus/releases/tags/v1.7.4) retrieved through an independent read-only HTTP reader on 2026-11-27: [asset 184694200](https://api.github.com/repos/tlaplus/tlaplus/releases/assets/184694200), uploader github-actions[bot], 2274532 bytes, updated 2024-08-08T13:30:40Z. GitHub's digest field is null for this older asset.
- Published SHA-1: `bee4a54f3ee3d4afc347c3240ec2d9e93b075104` (upstream release checksum).
- Independently corroborated SHA-256: `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` ([SourceForge mirror checksum](https://sourceforge.net/projects/tlaplus.mirror/files/v1.7.4/tla2tools.jar/download), [GitHub Agentic Workflows verification](https://github.github.io/gh-aw/specs/experiments-broker-specification/), [independent toolchain lock](https://github.com/libersoft-org/libersystem/blob/main/toolchain.lock)).
- Download only from the pinned upstream release URL, enforce exact size and both digests before executing; never use the mirror as an automatic fallback. Retain the complete safe/mutant/liveness model suite, single-worker setting and independent Python checks unchanged.

This is an explicitly scoped dependency migration, not dynamic trust in a received JAR or a production dependency approval. Local binary download was unavailable (DNS); exact CI must retrieve matching bytes and pass the full existing model suite. No compatibility or formal proof claim until that occurs. If any model or expected negative control fails, preserve the failure and investigate; do not weaken assertions to accommodate the older checker. Upstream provenance is corroborated but not a signed reproducible-build attestation.
