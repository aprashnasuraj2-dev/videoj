# SUTRA permission-sensitive asset inventory

Created 2026-11-26.

Purpose: identify assets/categories that require a separate ownership, license or permission basis **before public inclusion**. This is an inventory, not proof that permission has been obtained.

## Rule

If an asset falls into a category below and its permission basis is not documented, it must remain excluded from the public release/submission candidate.

A technical file existing in the repository is not by itself proof of the right to publish it in a competition submission.

## Inventory

| Asset/category | Current SUTRA status | Permission basis required before public inclusion | Default when unresolved |
| --- | --- | --- | --- |
| Pre-existing DHAGO/player source reused by SUTRA | Technically reused through an explicit adapter | Confirm entrant/team right to reuse/publish the relevant pre-existing code under the competition submission | Keep ownership gate open; do not describe it as newly authored SUTRA code |
| Vendored nsDeploy runtime subset | Pinned third-party upstream code | Follow the recorded Apache-2.0 license and NOTICE/attribution requirements | Retain exact license/NOTICE and upstream attribution; do not claim authorship |
| npm dependencies such as Video.js HTML/mux-video, Vite, Playwright | Third-party packages/tooling | Follow package licenses/terms; do not redistribute outside their permitted terms | Keep dependency attribution/license records; do not claim authorship |
| Final lesson/training video | **Not yet supplied as rights-cleared final content** | Permission from the footage/content owner and any other applicable rights holder | Use synthetic fixture only; do not publish unapproved real footage |
| Narration/voice recording | Final entrant/reviewer narration not yet supplied | Permission from the speaker/recording owner; competition video narration must be by the actual entrant/authorized representative where required | Do not reuse unrelated/third-party voice recordings |
| Written training guide/checklist used as factual comparison | Final reviewed guide not yet supplied | Owner/license permission to reproduce the included excerpt/derivative in the release | Keep synthetic guide fixture only |
| Employer internal documents, SOPs, training manuals, dashboards or screenshots | No final employer material approved | Explicit employer/owner permission, including permission for public competition distribution where applicable | Exclude |
| Employer/customer logos, trademarks and brand marks | No approval recorded | Trademark/brand permission when not covered by competition/nominative-use rules | Exclude or replace with neutral SUTRA labeling |
| Customer names, IDs, account numbers, phone numbers, addresses or service records | Not needed for the product | Separate lawful basis/consent would be required; these are unnecessary for the planned learner | Exclude entirely |
| Incidental people in footage/photos | Final footage not yet selected | Consent/release or other valid rights basis appropriate to the recording/use | Use footage without identifiable incidental people or obtain permission |
| Vehicle plates, computer screens, maps, tickets, work orders or documents visible in footage | Final footage not yet selected | Owner/privacy/security review and permission where identifying/proprietary data is visible | Blur/remove/replace before use |
| Copyrighted music, stock video/images, third-party slides or diagrams | Not required by the current learner | Valid license that permits the intended public competition/video use | Exclude unless the license is recorded |
| Public web article/manual excerpts beyond a minimal link/reference | Not part of the current final content | Applicable copyright/license permission for reproduction | Link/cite only as permitted; do not copy large protected passages |
| Third-party API/data feeds added later | None required for the local evidence core | Terms/API authorization for the exact public use | Do not add until terms are reviewed |
| Provider/model names and service marks in explanatory UI/report | Used only as factual configuration references where applicable | Follow provider trademark/terms rules; avoid implying endorsement | Keep wording factual and configuration-specific |
| Screenshots for Devpost/demo/video | Final screenshots not yet captured | Every visible included asset must already be rights-cleared for the submission/demo | Capture only from the final approved SUTRA candidate |

## Public-release permission record

Before any final public candidate is frozen, create a release-specific record for every non-synthetic asset that is actually included. That record should contain only the minimum public-safe outcome:

- asset identifier/category;
- permission/license status: approved / excluded / unresolved;
- applicable license or owner category;
- any attribution requirement;
- release candidate path/hash if included;
- reviewer/date of the permission decision.

Do **not** commit private contracts, identity documents, private emails, signatures, raw consent forms, customer records or employer-confidential material merely to prove the gate. Store sensitive evidence outside the public repository and record only the public-safe decision/reference needed for audit.

## Current outcome

At the time of this inventory:
- synthetic timing media/source/guide fixtures remain the only development content basis;
- no rights-cleared final training lesson/guide/narration is claimed;
- no employer/customer material is approved for public inclusion;
- technical upstream license/NOTICE handling is recorded separately;
- the final public-content rights gate remains open.

This inventory supports only the **listing** requirements in P001-05 and P015-04. It does not satisfy P001-04, P015-01/02/03/05/06/07/09/10, or any final content-rights claim.
