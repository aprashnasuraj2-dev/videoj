# SUTRA v2 — conclusion debugger

SUTRA is a debugger for conclusions. Product objective: falsification-first investigative reasoning and reproducibility. Trust/runtime infrastructure: consent, causal integrity, monotonic witnesses, compensation and bounded recovery, as a separate second act. Competition objective: attack a conclusion, expose declared ancestry, compute what survives and a decisive next observation, then verify a portable Proof Capsule offline. No paid inference required.

The primary synthetic case is first in the browser. The older labs remain executable and their evidence markers remain intact.

Isolated from the legacy learner and all production routes. Reuse existing pinned Vite and Playwright versions from apps/sutra; no second dependency tree. Python 3.10+ is required for the independent verifier bundle. From repository root:

```sh
npm ci --prefix apps/sutra
rustup target add wasm32-unknown-unknown
node apps/sutra-v2/build.mjs
node --test apps/sutra-v2/test/build-contract.test.mjs
node apps/sutra/node_modules/playwright/cli.js install chromium
node apps/sutra-v2/test/browser.cjs
```

`build.mjs` is the canonical V2 artifact build. It reuses the pinned V1 Vite toolchain, compiles the local Rust support module, builds `apps/sutra-v2/dist`, stages only explicit inherited fixture bytes plus static security headers and a deterministic independent Python verifier zipapp, and refuses an artifact that does not identify as the V2 Knowledge Compiler. It does not deploy anything.

The actual browser graph calculation and mutation are local, with no model or network. The optional scripted planning path exercises the unchanged pinned agent runtime with two local agents; the model can only select a host-approved method, not supply a verdict or code. Two calculations share the assumed beam formula; they differ in whether the section moment is declared or derived. This is not independent scientific corroboration. Export contains exact graph and receipt text, and browser replay is same-kernel. Separate Python reference consumer is tested in CI. No public deployment, physical-device or human accessibility acceptance claimed.

The integrated learner uses the existing synthetic v1 timing fixture through the real content-profile and source-tool packages. The finite timing hypothesis question is resolved only at catalog-consistency level. Verified media bytes and native seek show the source interval, not empirical truth. Prediction feedback is not a measured learning outcome. No new media or original lesson claims.

Original synthetic subgroup lesson adds an actual second-origin fixture publisher under `peer/agents`. The browser harness serves it on a distinct loopback origin and exercises explicit contact consent. The caller locally derives observation partitions from its own graphs; the peer offers no source values or verdict. A host-pinned original synthetic table drives the subsequent comparison. No live inference or independent ownership claim.

The conflict laboratory uses the locally compiled Rust support lattice through a pointer-free WASM ABI. Only the locally admitted compatibility projection enters the module. The module never fetches a peer or interprets external code. V2 owns its static _headers contract: the wildcard policy permits 'wasm-unsafe-eval' but not JavaScript 'unsafe-eval'. The browser harness consumes the built policy with only a loopback peer exception; an external-script Chromium probe compares actual WASM compilation under the legacy and V2 policies. The Pages candidate adds only its approved guide origin. This is candidate verification, not deployed HTTPS evidence. The build embeds a SHA-256 pin in the application bundle; the loader streams at most 1 MiB, checks the digest and rejects all WASM imports before instantiation. This detects artifact mismatch, not compromise of the entire trusted build. If the module cannot load or disagrees with the existing surviving-world/conflict report, the transition fails closed. The legacy session export is unchanged; support analysis has a separate export, not an independent evidence receipt. No factual authority follows from conditional sufficient supports.

The built `dist/sutra-proof-verifier.pyz` is an inspectable source ZIP with a separately retained digest, exact source manifest, LICENSE and NOTICE. Verify outside the browser using `python3 -I -S sutra-proof-verifier.pyz sutra-proof-capsule.json --pin-file sutra-proof-capsule.sha256`. Trust the verifier independently; the digest distributed alongside it alone cannot authenticate a compromised publisher. CI checks deterministic rebuild and actual browser download bytes, then executes the downloaded verifier from an isolated directory. No deployment is performed.

## Living investigation candidate

The existing reviewed quantity workspace now supports manually declared candidate meanings, optional source-linked quantity references, sealed version input export with a separate digest, explicit baseline replay/import and corrected-source impact comparison. No automatic persistence or external contact; exports contain supplied text. Stage-order IDs require correspondence review. The initial browser journey remains a candidate until exact CI; independent version/impact replay and broader usability remain open.

## Provider-neutral Agent Studio candidate
The primary page includes a local scripted council with editable connection/model IDs, independently assignable roles (including a shared connection), explicit scope, bounded rounds/calls, actual conditional proof feedback and redacted trace export. The question is context, not an arbitrary semantic reasoning input; the reviewed case defines computations. Synthetic credentials and in-memory reservations are created per run; no production key entry, endpoint contact, billing, persistence or model inference. Browser tests cover divergence then convergence, forged verdict, budget refusal, custom identities and same-connection routes. Exact CI pending.
