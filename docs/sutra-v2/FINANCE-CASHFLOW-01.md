# Finance investigation 01 — operating cash vs cash-flow proxy

**Question:** Does the increase in Microsoft consolidated operating cash flow in FY2026 establish that operating cash flow minus cash additions to property and equipment increased?

Source | FY2025 USD million | FY2026 USD million
---|---:|---:
Net cash from operations | 136,162 | 182,935
Cash additions to property and equipment (outflow magnitude) | 64,551 | 115,948
Derived OCF − cash PPE proxy | 71,611 | 66,987

Reported historical source fields: [FY2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/789019/000095017025100235/msft-20250630.htm) and [FY2026 Form 10-K](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm), Part II Item 8, Cash Flows Statements, accessed 2026-11-25. FY2026 includes comparative FY2025 figures. The files are original issuer reports filed with the SEC; publication and access do not make an independent empirical replication. Numeric facts are manually transcribed; the normalized extract digest is not a digest of the SEC-hosted document. No full filing reproduced or license claim made.

The exact change is +46,773 − 51,397 = −4,624 USD million. The old and new amounts for OCF and PPE define four explicitly hypothetical combinations; the three combinations other than the actual reported pair are not real alternative FY2026 reports or forecasts. The baseline FY2025 values start as declared assumptions and are admitted through field reads. The operating-cash-only state retains two worlds with opposite proxy decisions. Cash PPE is the decisive field in this finite model. Full readings produce one surviving assignment and refute the nondecreasing-proxy claim. The two filings share one conservative issuer root; withdrawal is a hypothetical dependence check, not a reason to ignore a valid filing.

The proxy omits other investing flows, acquisitions, noncash financing leases, and financing payments; it is not a universally defined FCF or GAAP metric. No causal claim about AI investments, future returns, investment recommendation, or valuation follows. Currency/period semantics are declared, not verified by the current physical-dimension kernel. The illustrative field cost does not represent acquisition cost; bundled source economics is open. Independent replay verifies arithmetic and normalized pinned bytes, not original document authenticity, completeness or freshness.

Implementation: `packages/sutra-knowledge/microsoft-cashflow.js`; test: `test/microsoft-cashflow.test.mjs`; browser fixture and separate Python replay are included. Exact-source CI pending; no independent human review or production use claimed.

## Receipt-derived threshold

The graph derives `delta = proxy26 − proxy25` and `ppe_limit = ocf26 − proxy25`. With the reported FY2026 OCF, the maximum cash PPE compatible with the nondecreasing-proxy rule is 111,324 USD million; reported cash PPE exceeds that threshold by 4,624. The UI obtains exact values from the actual replayed candidate graph receipts, not a stored verdict. Operating-only inputs leave 66,987 and 118,384 as the two proxy candidates. Threshold arithmetic is a conditional identity, not a forecast or a claim that PPE can be varied independently.
