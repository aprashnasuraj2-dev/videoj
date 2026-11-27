# Active SUTRA V2 repository map

The active tree contains one product: SUTRA V2.

| Path | Responsibility |
| --- | --- |
| `apps/sutra-v2/` | Browser investigation workspace and standalone build |
| `packages/sutra-knowledge/` | Knowledge representation, revision, computation, counterfactual and replay kernel |
| `packages/sutra-runtime/` | Bounded portable-agent execution |
| `packages/sutra-inference/` | Provider-neutral inference and credential/budget contracts |
| `packages/sutra-consent/` | Contact and disclosure authorization |
| `packages/sutra-evidence/` | Evidence contracts and validation primitives |
| `packages/sutra-content-profile/` | Bounded content/source profile primitives |
| `packages/sutra-source-tools/` | Source capability primitives |
| `packages/sutra-actions/` | Scoped action contracts |
| `services/sutra-api/` | Service-side bounded adapters |
| `docs/sutra-v2/` | Current mandate, roadmap, security and verification documents |
| `.github/workflows/sutra-v2-*.yml` | Active V2 verification |

The root package is a dependency-free command dispatcher. The browser app owns its pinned Vite/Playwright toolchain.

Removed products and development experiments remain available only through Git history.
