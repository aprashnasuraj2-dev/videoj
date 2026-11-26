# 09. Public release and open-source handoff

> **RETIRED SUTRA1 EXECUTION QUEUE (2026-11-26).** The user retired all remaining unchecked SUTRA1 tasks. This file now preserves verified/omitted/blocked historical evidence only. Do not resume work from this file; use [`docs/sutra-v2/CHECKLIST.md`](../../sutra-v2/CHECKLIST.md).

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


## Phase 082 - Stage new Cloudflare projects

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 19,65,81. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Deploy previews for the two new projects with selected media and inference routes. Test direct graph/runtime URLs and browser CORS before changing custom domains.
- **Phase exit:** The public artifacts return expected JSON/JS types, no SPA HTML fallback, and no protected login wall.


## Phase 083 - Release on the AafnaiPatro subdomains

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 82. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Map only the approved new subdomains after staging passes. Recheck existing route precedence and compare deployed source hashes to the candidate.
- **Phase exit:** Both new origins serve the intended candidate over HTTPS; existing public player and Patro routes pass a smoke check.


## Phase 084 - Publish the reusable community release

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 60,76,80,83. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Create public versioned Open Kit source and downloadable release assets in videoj. Include standalone install examples, license/NOTICE and public docs. An npm release is optional.
- **Phase exit:** Each tool is available without an account, private key or SUTRA-only corpus; one clean independent installation is reproducible.


## Phase 085 - Write the technical implementation report

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 79-84. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Explain browser versus server responsibilities, artifact resolution, consent, evidence validation, privacy, hosting, measured performance and current limits. Include exact reproduction commands.
- **Phase exit:** Every implementation claim has a source path or test evidence; advertised features match the deployed build.


## Phase 086 - Write the community impact report

- **Baseline effort:** 1.5 person-hours; **owner:** E+P.
- **Original phase dependencies:** 74-76,84. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Document the builder problem, each reusable artifact, installation results, license, external trial counts and next maintenance steps. Separate usability feedback from adoption or operational impact.
- **Phase exit:** The report contains actual evidence and limitations; same-owner demo origins are not counted as external adopters.


## Phase 087 - Verify clean reproducibility

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 81,84-86. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Use a clean checkout at the tagged revision to install, build and run core checks. Scan distributed source, generated assets, trace exports and archives for secret canaries and private content.
- **Phase exit:** A fresh builder can reproduce the release; no management token, provider key or participant personal data remains in public assets.


## Phase 088 - Add a genuinely usable contributor path

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 84,87. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Provide a quickstart, sample issues, compatibility boundaries, security reporting and a minimal changelog. Avoid claiming an ongoing support commitment that cannot be met.
- **Phase exit:** A newcomer knows what to run, what to reuse and where to report a problem without reading the entire product codebase.


## Phase 089 - Rehearse rollback and judging availability

- **Baseline effort:** 1.5 person-hours; **owner:** E+P.
- **Original phase dependencies:** 83,87. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Restore the previous SUTRA build on staging, verify media/inference compatibility and calculate funded headroom through the judging period. Keep the last known good artifacts.
- **Phase exit:** Rollback is reproducible; site and funded default inference are planned through at least 19 Jan Nepal time, subject to rechecked official dates.


## Phase 090 - Close the public-release milestone

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 81-89. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Review public URL, network artifacts, runtime file, community assets and clean-visitor task. Recheck organizer pages and the live entry form.
- **Phase exit:** No mock/live ambiguity, broken release link, missing attribution or unreported critical issue remains.

