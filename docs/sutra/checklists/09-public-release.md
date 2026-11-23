# 09. Public release and open-source handoff

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **31 Dec 2026-4 Jan 2027**. This is a target window, not proof of work.

A stable public site and a usable community release.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 081 - Prepare separate deployable bundles

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 08,12,31,80. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Build app and peer artifacts with source SHA, artifact hashes and build instructions. Keep provider secrets out of bundles and include public media checksums or licensed media links.
- **Phase exit:** A clean extraction matches the checksums; a SUTRA build cannot alter existing player outputs.

- [ ] `SUTRA-P081-01` Build separate caller and peer outputs from the frozen source
- [ ] `SUTRA-P081-02` Include source SHA and deterministic asset inventory in release manifests
- [ ] `SUTRA-P081-03` Calculate content hashes of graphs, runtime files and media references
- [ ] `SUTRA-P081-04` Check static bundles contain no credentials or private inputs
- [ ] `SUTRA-P081-05` Ensure source integration cannot empty other player output directories
- [ ] `SUTRA-P081-06` Provide build/install instructions matching actual package locations
- [ ] `SUTRA-P081-07` Verify a clean extraction matches the manifest checksums
- [ ] `SUTRA-P081-08` Keep deployment configuration placeholders distinct from real secrets
- [ ] `SUTRA-P081-09` Produce and review the phase artifact: dist-sutra/, dist-sutra-peer/ and release manifests.
- [ ] `SUTRA-P081-10` Close phase 081 only after its applicable tasks have evidence and its exit condition is observed: A clean extraction matches the checksums; a SUTRA build cannot alter existing player outputs.

## Phase 082 - Stage new Cloudflare projects

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 19,65,81. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Deploy previews for the two new projects with selected media and inference routes. Test direct graph/runtime URLs and browser CORS before changing custom domains.
- **Phase exit:** The public artifacts return expected JSON/JS types, no SPA HTML fallback, and no protected login wall.

- [ ] `SUTRA-P082-01` Create separate preview targets for caller and peer packages
- [ ] `SUTRA-P082-02` Apply intended headers and media/inference routing on staging
- [ ] `SUTRA-P082-03` Open graph, manifest and runtime URLs directly without the app shell
- [ ] `SUTRA-P082-04` Check JSON/JS content types and absence of SPA HTML fallbacks
- [ ] `SUTRA-P082-05` Verify browser CORS from a different origin
- [ ] `SUTRA-P082-06` Verify no login wall, private network dependency or hidden key setup
- [ ] `SUTRA-P082-07` Run the integrated live task against staging with capped model spend
- [ ] `SUTRA-P082-08` Record staging source SHA and artifact hashes before promotion
- [ ] `SUTRA-P082-09` Produce and review the phase artifact: Staging URLs and route validation.
- [ ] `SUTRA-P082-10` Close phase 082 only after its applicable tasks have evidence and its exit condition is observed: The public artifacts return expected JSON/JS types, no SPA HTML fallback, and no protected login wall.

## Phase 083 - Release caller and peer across distinct registrable domains

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Architecture correction:** `SUTRA-DECISION-0010`. The caller may use the approved AafnaiPatro origin, but the guide/peer must be hosted on a different registrable domain. A sibling `*.aafnaipatro.com` peer is not acceptable evidence because domain-scoped cookies and same-site policy weaken the boundary claim.
- **Intent:** Promote only approved staging artifacts after all major gates pass. Keep the peer static and isolated from Patro Worker quota/domain cookies.
- **Phase exit:** Caller and peer serve the exact approved candidates over HTTPS on different registrable domains; browser evidence shows credential-free peer artifact GETs and existing Patro/DHAGO/DETOUR routes remain intact.

- [ ] `SUTRA-P083-01` Select and verify an HTTPS peer host on a different registrable domain from the caller
- [ ] `SUTRA-P083-02` Verify the peer host is static/public-artifact only and isolated from Patro Worker quota/domain cookies
- [ ] `SUTRA-P083-03` Inspect caller and peer custom-domain/route precedence before promotion
- [ ] `SUTRA-P083-04` Promote only the exact tested caller and peer artifacts after staging succeeds
- [ ] `SUTRA-P083-05` Verify HTTPS, CORS, manifest/graph hashes and signed-out loading on both origins
- [ ] `SUTRA-P083-06` Re-run the BYOK key-canary proof and confirm the peer origin receives no router credential
- [ ] `SUTRA-P083-07` Smoke-check existing Patro, DHAGO and DETOUR routes
- [ ] `SUTRA-P083-08` Record rollback targets and deployed artifact hashes; do not treat a source merge as production proof
- [ ] `SUTRA-P083-09` Produce the production URL/hash/CORS/browser-boundary release record
- [ ] `SUTRA-P083-10` Close phase 083 only after distinct-registrable-domain behavior is observed in a real browser.

## Phase 084 - Publish the evidence-first community release

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 60,76,80,83.
- **Intent:** Publish the versioned Web Annotation media-evidence profile/validator as the primary reusable contribution. Include the consent inspector and static peer only as examples. After stable public SUTRA/peer URLs exist, submit the site to the official `cognizant-ai-labs/agentic-web` `docs/agentic_websites.md` directory via a truthful pull request.
- **Phase exit:** The evidence tool is publicly downloadable without account/key/SUTRA corpus, one clean outside install is reproducible, and the official-directory PR is filed only with working public URLs.

- [ ] `SUTRA-P084-01` Create a versioned public release asset for the evidence profile, validator, fixtures and cue-link helper
- [ ] `SUTRA-P084-02` Include standards mapping, synthetic examples and actual runnable CLI/browser entry points
- [ ] `SUTRA-P084-03` Publish a quickstart usable without an account, player clone or private key
- [ ] `SUTRA-P084-04` Retain upstream/repository license, NOTICE and third-party attribution
- [ ] `SUTRA-P084-05` Check the evidence package contains no private learner media, router credential or SUTRA-only service dependency
- [ ] `SUTRA-P084-06` Re-run the documented clean-host install on the exact release version
- [ ] `SUTRA-P084-07` Record public package/source URLs and immutable release hashes
- [ ] `SUTRA-P084-08` Prepare the official `docs/agentic_websites.md` entry with accurate feature/boundary wording and working caller/peer links
- [ ] `SUTRA-P084-09` File the upstream directory pull request only after the public URLs are stable; record its URL/status
- [ ] `SUTRA-P084-10` Close phase 084 only after the community release and truthful directory submission are evidenced.

## Phase 085 - Write the technical implementation report

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 79-84. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Explain browser versus server responsibilities, artifact resolution, consent, evidence validation, privacy, hosting, measured performance and current limits. Include exact reproduction commands.
- **Phase exit:** Every implementation claim has a source path or test evidence; advertised features match the deployed build.

- [ ] `SUTRA-P085-01` Explain browser graph execution versus server inference responsibilities
- [ ] `SUTRA-P085-02` Document artifact resolution, peer policy and registered actions
- [ ] `SUTRA-P085-03` Describe cue validation, context filtering and reviewed receipts
- [ ] `SUTRA-P085-04` Report actual evaluation, cost and browser results with dates
- [ ] `SUTRA-P085-05` Include clean installation and reproduction commands
- [ ] `SUTRA-P085-06` Document media hosting, cache behavior and quota assumptions
- [ ] `SUTRA-P085-07` Link implementation claims to source paths or observed checks
- [ ] `SUTRA-P085-08` State current limits and untested environments without marketing guarantees
- [ ] `SUTRA-P085-09` Produce and review the phase artifact: Technical_Report.md and PDF-ready report content.
- [ ] `SUTRA-P085-10` Close phase 085 only after its applicable tasks have evidence and its exit condition is observed: Every implementation claim has a source path or test evidence; advertised features match the deployed build.

## Phase 086 - Write the community impact report

- **Baseline effort:** 1.5 person-hours; **owner:** E+P.
- **Original phase dependencies:** 74-76,84. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Document the builder problem, each reusable artifact, installation results, license, external trial counts and next maintenance steps. Separate usability feedback from adoption or operational impact.
- **Phase exit:** The report contains actual evidence and limitations; same-owner demo origins are not counted as external adopters.

- [ ] `SUTRA-P086-01` Explain which builder problem each reusable tool solves
- [ ] `SUTRA-P086-02` Link versioned source, license, documentation and working example
- [ ] `SUTRA-P086-03` Report actual outside-builder counts, install times and interventions
- [ ] `SUTRA-P086-04` Separate installation usability from production adoption
- [ ] `SUTRA-P086-05` Summarize target-user task results with sample-size limitations
- [ ] `SUTRA-P086-06` Identify limitations and a realistic maintenance boundary
- [ ] `SUTRA-P086-07` Avoid counting same-owner origins as community users
- [ ] `SUTRA-P086-08` Create a short truthful section usable in the final Devpost description
- [ ] `SUTRA-P086-09` Produce and review the phase artifact: Community_Tools_and_Impact.md with public links.
- [ ] `SUTRA-P086-10` Close phase 086 only after its applicable tasks have evidence and its exit condition is observed: The report contains actual evidence and limitations; same-owner demo origins are not counted as external adopters.

## Phase 087 - Verify clean reproducibility

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 81,84-86. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Use a clean checkout at the tagged revision to install, build and run core checks. Scan distributed source, generated assets, trace exports and archives for secret canaries and private content.
- **Phase exit:** A fresh builder can reproduce the release; no management token, provider key or participant personal data remains in public assets.

- [ ] `SUTRA-P087-01` Start from a clean checkout at the final candidate revision
- [ ] `SUTRA-P087-02` Run documented dependency installation and app/peer builds
- [ ] `SUTRA-P087-03` Run required player checks if shared player source changed
- [ ] `SUTRA-P087-04` Verify Open Kit commands without the learner application
- [ ] `SUTRA-P087-05` Inspect distributed archives, bundles and trace exports for secrets
- [ ] `SUTRA-P087-06` Record environment, commands, exit codes and evidence locations
- [ ] `SUTRA-P087-07` Ensure lockfiles and pinned runtime are sufficient for reproduction
- [ ] `SUTRA-P087-08` Report missing hardware/network verification as untested rather than passing
- [ ] `SUTRA-P087-09` Produce and review the phase artifact: Reproduction log and artifact-scan findings.
- [ ] `SUTRA-P087-10` Close phase 087 only after its applicable tasks have evidence and its exit condition is observed: A fresh builder can reproduce the release; no management token, provider key or participant personal data remains in public assets.

## Phase 088 - Add a genuinely usable contributor path

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 84,87. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Provide a quickstart, sample issues, compatibility boundaries, security reporting and a minimal changelog. Avoid claiming an ongoing support commitment that cannot be met.
- **Phase exit:** A newcomer knows what to run, what to reuse and where to report a problem without reading the entire product codebase.

- [ ] `SUTRA-P088-01` Write a short clean-install and first-invocation contributor path
- [ ] `SUTRA-P088-02` Explain package boundaries and supported compatibility versions
- [ ] `SUTRA-P088-03` Provide minimal reproducible issue-reporting guidance
- [ ] `SUTRA-P088-04` Describe safe security reporting without publishing exploit secrets
- [ ] `SUTRA-P088-05` Document contribution scope and examples suitable for newcomers
- [ ] `SUTRA-P088-06` Keep changelog entries tied to public versions
- [ ] `SUTRA-P088-07` Avoid promises of indefinite hosted support or response times
- [ ] `SUTRA-P088-08` Check a new reader can locate tool entry points quickly
- [ ] `SUTRA-P088-09` Produce and review the phase artifact: CONTRIBUTING and maintenance notes for SUTRA/Open Kit.
- [ ] `SUTRA-P088-10` Close phase 088 only after its applicable tasks have evidence and its exit condition is observed: A newcomer knows what to run, what to reuse and where to report a problem without reading the entire product codebase.

## Phase 089 - Rehearse rollback and judging availability

- **Baseline effort:** 1.5 person-hours; **owner:** E+P.
- **Intent:** Restore the previous SUTRA build on staging, verify media/inference compatibility and calculate funded headroom through judging. Treat the browser-direct BYOK route as an independent resilience path if funded inference throttles; never silently move a user key to the funded host or vice versa.
- **Phase exit:** Rollback is reproducible; the funded path is budgeted through the rechecked judging window and the BYOK path remains independently usable with explicit user configuration.

- [ ] `SUTRA-P089-01` Retain a verified previous SUTRA build and source/media references
- [ ] `SUTRA-P089-02` Rehearse restoring it on staging rather than mutating unrelated production
- [ ] `SUTRA-P089-03` Check rollback preserves valid graph/runtime/media/evidence-profile combinations
- [ ] `SUTRA-P089-04` Estimate judging-period funded-model requests and available funding
- [ ] `SUTRA-P089-05` Verify public caller, peer, media, funded inference and BYOK setup paths independently
- [ ] `SUTRA-P089-06` Simulate funded-path throttling/unavailability and confirm configured BYOK still routes only to the selected browser router
- [ ] `SUTRA-P089-07` Recheck official judging end time in Nepal and UTC
- [ ] `SUTRA-P089-08` Document provider drift/outages and manual recovery without pretending background monitoring exists
- [ ] `SUTRA-P089-09` Produce the rollback runbook, funded-availability budget and BYOK fallback proof
- [ ] `SUTRA-P089-10` Close phase 089 only after rollback plus independent funded/BYOK availability behavior are evidenced.

## Phase 090 - Close the public-release milestone

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 81-89. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Review public URL, network artifacts, runtime file, community assets and clean-visitor task. Recheck organizer pages and the live entry form.
- **Phase exit:** No mock/live ambiguity, broken release link, missing attribution or unreported critical issue remains.

- [ ] `SUTRA-P090-01` Recheck current official rules and entry-form fields
- [ ] `SUTRA-P090-02` Open caller, peer, runtime, JSON and tool URLs signed out
- [ ] `SUTRA-P090-03` Run the live judge task without private setup
- [ ] `SUTRA-P090-04` Confirm all mandatory conformance evidence matches the public candidate
- [ ] `SUTRA-P090-05` Check attribution and absence of unauthorized public material
- [ ] `SUTRA-P090-06` Remove mock/live ambiguity and inaccurate deployment claims
- [ ] `SUTRA-P090-07` Record final public-release blockers and resolution evidence
- [ ] `SUTRA-P090-08` Freeze the public release before creating final promotional footage
- [ ] `SUTRA-P090-09` Produce and review the phase artifact: Milestone F release checklist and final evidence links.
- [ ] `SUTRA-P090-10` Close phase 090 only after its applicable tasks have evidence and its exit condition is observed: No mock/live ambiguity, broken release link, missing attribution or unreported critical issue remains.
