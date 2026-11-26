# V2-182 combined verification candidate

Validation only; **do not merge**. Parent integration head `f6b69dffa78c6505ca2438291c7a966d3ff74eb2`. The ten independent child PRs remain authoritative and open. Exact source tree manifest is `combined-v2-182.json`. This separate branch materializes all 49 nonoverlapping files without touching the central branch. Dedicated workflow copies canonical knowledge/browser job bodies unchanged except event and exact head guard. No deploy, live inference or promotion; actual combined CI must be observed before any claim.


## First combined validation failure and correction
Impact classification run 45754410524 / job 139689544070 correctly refused the new unmapped JSON manifest. Add exact mapping of this manifest and the two validation workflow paths to the existing v2 suite; keep its canonical required workflow and unknown-file fail-closed behavior. Test that the combined workflow's entire job body is identical to the canonical job body after stripping only the exact validation-branch guard. Do not suppress or erase the original failure. New revision CI pending.

## 2026-11-26 — V2-183 reuse-first combined refresh
Parent: `5cbab6abcfcb448b133bc286e02cfb26ce9123c7`. Exact child heads and one resolved HTML overlap are in the manifest. The two HTML changes are pure insertions at distinct base offsets; no removed base bytes, 834 unique IDs. Preserve prior validation-only files and exact impact mappings, retain all child tests, and keep canonical knowledge/browser job bodies unchanged. Previous cancelled runs retained as historical observations; exact new CI pending. Do not merge this PR or treat it as broad gate completion.
