# BYOK omission decision — 2026-11-24

Direct browser BYOK is intentionally **not shipped** in the SUTRA minimum release candidate.

The product-scope decision rejects it because the judge path must work without personal credentials, literal lookup already works with zero model calls, and BYOK adds browser credential entry, router/CORS selection, in-memory lifecycle, destination disclosure and leak-testing surfaces without a measured hero-task benefit.

Current learner behavior:
- no API-key/token/password input exists;
- no BYOK credential is stored in localStorage/sessionStorage;
- provider UI explicitly says no personal API key is accepted;
- review storage remains the only intentional first-party localStorage surface;
- caller model/router policy cannot be overridden by peer metadata.

Tasks that exist solely to implement a BYOK router/key lifecycle are therefore intentionally omitted, not failed and not silently left as mandatory debt.

Reversal conditions are in `PRODUCT-SCOPE-DECISION-2026-11-24.md`: free judge path must remain independently satisfied, a real user need must emerge, a permitted CORS router must be tested, credentials must remain isolated from peer/artifact/action/trace/analytics/export surfaces, acceptance must not regress, and the work must not displace mandatory gates.

This omission does **not** close the funded-provider requirement. SUTRA still needs an approved, capped site-funded inference path with real model/token/cost evidence before claiming live default inference.
