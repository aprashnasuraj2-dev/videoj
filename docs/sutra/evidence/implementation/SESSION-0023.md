# Session 0023 — peer CORS/redirect and targeted revalidation

Observed 2026-11-24T08:50:00+05:45.

Exact product/browser revision `0ef8a613c1c8d6db522d50a1088f9528ad055d4b` proves credentialless Chromium two-origin manifest/graph access, zero-contact denial, wrong-name refusal, strict redirect refusal, local lesson survival, and public peer JSON CORS without credentials. Phase 034 receives P034-02..09 only; P034-01/10 remain open because loopback is not staging/public HTTPS evidence.

Phase 037 closes: current design refuses redirects rather than silently carrying approval to a new origin; session approvals are exact origin/kind/purpose/disclosure/network tuples; redirect fixtures contact no second destination and preserve the local learner.

Targeted CI revision `0e57504bac43f13e4a8c6d66de9e5963884458fb` passed all ten workflows after narrowing specialized browser/evaluation triggers, crediting P079-07.

Added 14 original verified checks. Counts: **587/1,000 original; 596/1,009 total; 43/100 fully verified phases; 6 omissions**.
