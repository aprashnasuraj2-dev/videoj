# SUTRA Guide peer

Independent static package for the SUTRA peer publication surface.

- Exact published network: `checklist`.
- Front agent: `checklist`; narrow helper: `source_select`.
- Public artifacts: `agents/agent-manifest.json`, `checklist.network.json`, `links.json`.
- No caller UI imports, private agent server, model credential or executable peer bundle.
- Current content is an engineering fixture. Actual rights-cleared lesson corpus provenance and factual review are pending.
- No production peer origin is assigned yet. Release requires a verified HTTPS host on a **different registrable domain** from the caller; a sibling `aafnaipatro.com` subdomain is intentionally rejected as the target architecture.

`npm run build` produces `dist/` with only the static page/config/source assets and public agent files. `npm run preview` serves that build on loopback and adds permissive CORS only to files under `/agents/` for local cross-origin testing.

The caller and future peer may still be operated by the same project owner. Different registrable domains strengthen browser/cookie isolation, but they still do **not** establish independent community adoption. That requires an outside builder/entrant observation.
