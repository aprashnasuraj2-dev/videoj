# SUTRA Open Kit — private engineering candidate

This is a reproducible source distribution, not an official challenge certification, published package, live provider or final submission archive. MANIFEST.json binds all files to a source commit and records package versions, entry points, SHA-256 and file lengths. It detects byte drift; it is not a cryptographic publisher signature and cannot establish factual truth. The source repository is https://github.com/aprashnasuraj2-dev/videoj.

| Artifact | Purpose | Quickstart from artifact directory |
| --- | --- | --- |
| evidence-validator | Receipt schema and exact catalog consistency checks | node cli.mjs examples/receipt.json examples/sources.json |
| consent-inspector | Framework-neutral per-contact consent and redacted events | import createConsentInspector from index.js; serve the examples directory through a local static HTTP host |
| publisher-starter | Two-agent example, publication and safe local action | npm install --ignore-scripts --offline; npm run verify:vendor; npm test; npm start |

All artifacts are Apache-2.0; retain upstream LICENSE.txt, NOTICE.md and UPSTREAM.json in the starter runtime. Node 22+ and modern browsers are supported in this tested development profile; no provider key or learner app is required. Synthetic data is not real content provenance or human evaluation.

Troubleshooting: schema/receipt errors mean no consistency claim; use the independent expected catalog. Exact-name errors require a unique manifest entry, not a prefix or guessed fallback. CORS failures require correct public JSON headers on an explicitly approved origin, not disabled browser security. Consent denial is terminal for that operation; do not retry automatically. Router failures are incomplete results; scripted fixtures must never impersonate live inference. The profile does not support arbitrary executable peer code, authenticated/session/SSE MCP, remote writes or funded default inference.

Project verification: run the evidence CLI, consent example, starter tests and vendor verification. These are SUTRA project checks, not an official certification suite. The builder rejects untracked source files by design and checks bounded secret patterns, file paths and UTF-8 content; this is not a universal secret detector. Keep the candidate private until actual rights review, participant eligibility, public HTTPS, production interoperability, live budget, human acceptance and release authorization have evidence.
