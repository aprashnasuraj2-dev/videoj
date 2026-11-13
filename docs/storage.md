# Durable asset storage

Owner-selected folder: https://drive.google.com/drive/folders/1uBHKAcUv2G8mfn3e9Q01A-F1Cp5U7RL5

| Artifact | Durable destination | Rule |
|---|---|---|
| Skin source, build configuration, concise evidence and license | Git repository | Review branch / PR; no management secrets |
| Final playback video | Mux | Upload after design readiness; secret-backed API; verify actual playback |
| Screenshots, browser traces, recordings, large development evidence | Selected Google Drive folder | Save meaningful milestones with source SHA; no secrets |
| Submission candidate / final handover archive | Selected Google Drive folder | Source revision, checksums, visuals and truthful readiness status |

GitHub Actions artifacts are a temporary transport, not durable storage. Preserve useful non-reproducible evidence in Drive before ending a milestone. Record Drive file IDs and URLs here or in a revision manifest. Do not publish folder permissions or change sharing implicitly.

## Verified saved milestone

- `DHAGO_development_evidence_76d3f2d_2026-11-13.zip`
- File ID: `1bZDIuoGtCn7PznegoKwQNVz147R9xWHF`
- URL: https://drive.google.com/file/d/1bZDIuoGtCn7PznegoKwQNVz147R9xWHF/view?usp=drivesdk
- 12,992,294 bytes, verified by Drive metadata in the requested parent folder.
- Contains development screenshots/traces and build; represents 12/15 tests passing, not a final submission.

## CI archive configuration

`Archive candidate to Google Drive` is manual-only and reads OAuth credentials from `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`. The OAuth user must have write access to the exact folder and a Drive scope permitting listing and creating files there. The connected ChatGPT Google Drive session works for direct saves; it does not automatically supply GitHub runner credentials. The Mux token cannot authorize Google Drive. No Google runner credentials were inspected or confirmed.

The script uses resumable Drive upload sessions, verifies returned MD5 against source bytes, computes SHA-256 receipts and refuses conflicting or duplicate filenames. It uploads only allowlisted versioned archives from `handoff/`. Secrets and signed upload-session URLs are omitted from logs. Large interrupted uploads fail visibly; a rerun lists completed archives before creating new ones. No asset is deleted.

Workflow archives include failed-test evidence too and therefore never imply that the entry is final or passing. Source ZIP is from the exact checked-out commit; final artifacts require final QA and live URLs. Mux provisioning remains a separate manual workflow until the owner is ready for upload.

Submission drafts live under `submission/` in Git. Their manifest deliberately leaves public URL, Mux bonus, final visuals and receipt empty until verified. Candidate source archives in Drive are labeled development candidates, never final entries.

## Verified passing milestone

- `DHAGO_verified_17-tests_1cae217_2026-11-13.zip`
- File ID: `1fUf7yYmot1i2tddyq99ibkZAYb5SIS7e`
- URL: https://drive.google.com/file/d/1fUf7yYmot1i2tddyq99ibkZAYb5SIS7e/view?usp=drivesdk
- Contains the passing 17-test Chromium run and captured visuals for revision `1cae2171eb523142279f70c258378537fa34c818`. Later mobile polish requires its own fresh evidence.

- Additional mobile review milestone: file `1NwJoy_L9d6Vsfp4DRE-43w3XF5AuUfaY`, https://drive.google.com/file/d/1NwJoy_L9d6Vsfp4DRE-43w3XF5AuUfaY/view?usp=drivesdk . Revision 2ed92ded passed behavior checks; its screenshot review led to the subsequent Settings label correction. Retained as development evidence, not final visual approval.

## 2026-11-13 source-aligned evidence

- `DHAGO_30tests_exact_main_72ec6c3.zip` — verified Google Drive file ID `13UnLqOuiAQQOBXKoh_IesPHtFROkIUyb`: https://drive.google.com/file/d/13UnLqOuiAQQOBXKoh_IesPHtFROkIUyb/view . Contains clean-build assets, 30/30 Chromium results, desktop/mobile captures and the 30-second control walkthrough for the exact source release.
- `DHAGO_public_smoke_72ec6c3_pre_release.zip` — verified Drive file ID `1-Ffj4BKuOx3ojES86hMyLiZD5cx-xFPx`: https://drive.google.com/file/d/1-Ffj4BKuOx3ojES86hMyLiZD5cx-xFPx/view . It documents Mux playback and journal seeking **before** the full R2 bundle switch; it cannot substitute for post-publication testing.
- The immutable `dist-72ec6c324f64` Git branch includes the release-manifest with SHA-256 for all 78 files. The final public R2 build matches 76 text SHA-256 hashes plus exact original film/poster MD5 object IDs and sizes. Prior entry points are saved in the DHAGO-only R2 prefix `releases/2026-11-13-pre72ec6c/`.

## Native thread release evidence awaiting durable archive

- Source `a6492362b634799f3f23611e95eb88d003474d1f`, PR #6 [passing 35-test run 43461387053](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43461387053), merged main [run 43461852782](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43461852782), immutable [dist staging 43461852795](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43461852795). The staged branch holds SHA-256 manifest/source-derived static assets and remains in Git; the 14-day CI evidence ZIP is **not** durable Drive storage. Owner-selected folder is unchanged.
- Seven new hashed assets and three new HTML entry points have been R2-verified. Backup prefix: `releases/2026-11-13-prea6492362/`. This document makes **no claim** that a final 35-test archive is already in Google Drive. Copy verified visual/browser evidence to the selected Drive folder before final handoff, recording the new Drive file ID and hash.

## Portable source handoff packaging

The manual/one-shot `.github/workflows/verified-handoff.yml` archives **only tracked Git source**, then unpacks into a clean directory, performs `npm ci`, TypeScript checks and a production build, verifies the Apache license/NOTICE, original media and competition handoff notes, and attaches the immutable production release-manifest for `a6492362b634`. It writes SHA-256 checksum receipts and a reproducibility note. Never package `node_modules`, untracked credentials or duplicate built `dist`. Its artifact is temporary until uploaded to the selected Drive folder.

After the workflow passes, record artifact checksum, Drive ID and source SHA and reconcile step #89. The competition receipt remains null.
