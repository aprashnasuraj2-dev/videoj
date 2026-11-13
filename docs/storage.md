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
