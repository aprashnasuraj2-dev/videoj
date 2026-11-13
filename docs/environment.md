# Environment and provenance

- Workspace created 2026-11-13; Node v24.22.1, npm 11.9.0, Git 2.52.0.
- Official CLI @videojs/cli@10.4.0. `agents init --framework html` printed version-matched instructions. `agents skills` is an instruction printer; no installed plugin is claimed.
- Read official videojs-skin and videojs-ui guidance via the connected GitHub app. Existing approved plan supplies the original direction and setup choices.
- Generated the official starter with `npx @videojs/cli@10.4.0 skin create ../dhago-starter --name DHAGO --framework html --styling css --base scaffold --preset video --package-manager npm --no-install --yes` and copied source/workbench into this repo. Preserved custom repository AGENTS.md and checklist.
- Exact package versions will be retained in package-lock.json; installed package docs take priority over live examples.
- Chromium and Playwright are available in this workspace. Device testing and Mux owner identity are not inferred from tool availability.
- Empty repo initialization used GitHub create-file. Subsequent snapshots use GitHub Git tree/commit/ref APIs because terminal push has no credentials. Do not expose access tokens to work around this.
- Source code is already repository-backed and is not duplicated into unrelated artifact storage.
