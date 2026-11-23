# SUTRA Guide peer

Independent static package for the SUTRA peer publication surface.

- Exact published network: `checklist`.
- Front agent: `checklist`; narrow helper: `source_select`.
- Public artifacts: `agents/agent-manifest.json`, `checklist.network.json`, `links.json`.
- No caller UI imports, private agent server, model credential or executable peer bundle.
- Current content is an engineering fixture. Actual rights-cleared lesson corpus provenance and factual review are pending.
- Proposed production origin is configuration only; nothing here proves deployment, HTTPS/CORS behavior or independent adoption.

`npm run build` produces `dist/` with only the static page/config/source assets and public agent files. `npm run preview` serves that build on loopback and adds permissive CORS only to files under `/agents/` for local cross-origin testing.

The caller and proposed peer production origins are under the same project owner. That disclosure prevents a two-origin test from being misrepresented as independent community adoption.
