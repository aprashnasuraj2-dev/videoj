# Independent offline verifier distribution

The build emits `sutra-proof-verifier.pyz` and `sutra-proof-verifier.pyz.sha256` alongside the static application. The archive is an inspectable ZIP application with deterministic member order, fixed metadata, a manifest of exact source hashes, license, notice and instructions. It contains the independent Python Proof Capsule verifier and only its standard-library dependencies. Python 3.10 or newer is required.

## Verification ceremony

1. Obtain the verifier from a source you independently trust; compare its exact SHA-256 with a digest retained through that trusted channel. The downloadable digest is a convenience, not a publisher signature.
2. Retain the capsule digest separately when accepting a state. Download or otherwise transfer the exact Proof Capsule bytes.
3. Run in an isolated directory: `python3 -I -S sutra-proof-verifier.pyz sutra-proof-capsule.json --pin-file sutra-proof-capsule.sha256`. Alternatively supply `--pin sha256:<64 lowercase hexadecimal digits>` explicitly. No implicit or self-declared digest is accepted.
4. Exit code 0 means the scoped fixed model and history reproduce exactly against the retained pin; 1 means refusal; 2 means input/argument error. Do not equate reproduction with empirical truth, source independence, freshness, authorization, or authentic publisher identity.

The candidate tests deterministic rebuilds, byte equality of packaged sources, actual browser downloads and execution of the downloaded archive. An old capsule still verifies against its own historical pin. A malicious replacement of both a verifier and its accompanying digest is outside same-origin distribution's trust guarantees.
