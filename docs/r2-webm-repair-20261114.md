# Cloudflare R2 legacy compatibility media — repair attestation

Date: 2026-11-14 UTC. Scope: dedicated `dhago-studio-static` R2 bucket; **no Patro application worker or bucket changed**.

## Trigger

The latest immutable pre-film manifest, [`dist-eae52d9e0c9e/release-manifest.json`](https://github.com/aprashnasuraj2-dev/videoj/blob/dist-eae52d9e0c9e/release-manifest.json), expects 84 objects. Initial R2 inventory contained 83/84 object names. Missing: `media/studies-in-thread.webm`, the original-film VP9/Opus fallback.

## Repair performed and verified

- Source: `published-dist/media/studies-in-thread.webm` on immutable GitHub branch `dist-eae52d9e0c9e`.
- Exact expected and retrieved size: **7,447,211 bytes**.
- Expected SHA-256: `ddce647b448edddd15c9837321d7fcbbbc49cafa3a91904f26c63c006f70c52c`.
- A one-time, isolated Cloudflare Worker with a binding solely to `dhago-studio-static` fetched the immutable source, rejected any length/hash mismatch, uploaded that one missing key, and re-read the object to confirm the **same SHA-256**.
- The Cloudflare R2 object inventory subsequently confirmed `media/studies-in-thread.webm`, size **7,447,211**, `Content-Type: video/webm`.
- The temporary Worker was **deleted after verification**. No durable Worker/route was introduced.
- No homepage HTML, old Mux ID, public stream, Journal or unrelated R2 asset was replaced.

**Evidence:** SHA-256 comparison was computed on the actual remote source and post-upload R2 bytes; this is a byte-level verification rather than an ETag-only assertion.

## Remaining release boundaries

The R2 bucket now has all 84 **file names** expected by the older `eae52d9e0c9e` manifest, but `index.html` remains a different-length build (current R2 4,766 bytes vs manifest 6,542 bytes). Other same-size file names have **not all been independently SHA-256 checked**. Do not claim byte-for-byte `eae52d9e0c9e` release parity.

The newer fibre-to-fabric film remains on [draft PR #13](https://github.com/aprashnasuraj2-dev/videoj/pull/13), not in this old release. The new film's Mux playback ID remains unset. The restored WebM belongs to the **predecessor film**, not to the candidate.
