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

## CloudflareB Pages candidate
The isolated Pages config and built `_headers` apply restrictive browser headers and scope credentialless public CORS to `/agents/*`; the guide has no Functions or Worker binding. The proposed hostname still belongs to the Patro DNS account, and only a later approved Pages domain association/DNS-only CNAME can establish public HTTPS. No domain, public project, or independent adoption is claimed by this configuration.
