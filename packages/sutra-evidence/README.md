# SUTRA media-evidence profile — 0.2.0 candidate

A dependency-free, browser-callable evidence format for linking an exact excerpt to an exact moment in media without inventing a SUTRA-only interchange envelope.

The public profile uses the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/): an `Annotation` targets a `SpecificResource` selected by a `FragmentSelector`. The selector follows [Media Fragments URI 1.0](https://www.w3.org/TR/media-frags/) with an explicit temporal value such as `t=12,18`, representing the half-open interval `[12,18)`. Resource integrity is kept in a small sidecar manifest using [SRI](https://www.w3.org/TR/sri/) style `sha256-<base64-digest>` strings.

**A matching hash proves byte equality, not factual truth, publisher trust, semantic support, authorship or operational safety.**

## 15-minute quickstart target

No player, SUTRA learner app, API key, account or private service is required.

```sh
node --test packages/sutra-evidence/test/annotation.test.mjs
node packages/sutra-evidence/annotation-cli.mjs \
  packages/sutra-evidence/examples/annotation.json \
  packages/sutra-evidence/examples/integrity-manifest.json \
  packages/sutra-evidence/examples/transcript-v3.vtt
```

A successful fixture prints `level: "transcript_verified"` and the deterministic cue URL:

```text
https://example.invalid/sutra/media/synthetic-timing.mp4#t=12,18
```

The example domain is intentionally non-routable. Fixtures are synthetic project-authored data.

## Browser API

```js
import {
  validateAnnotationProfile,
  validateEvidenceBytes,
  verifyIntegrity,
  cueHref
} from './packages/sutra-evidence/index.js';

const shape = validateAnnotationProfile(annotation, { manifest });
const bytes = await validateEvidenceBytes(annotation, {
  manifest,
  resources: { [transcriptUrl]: transcriptBytes }
});
const link = cueHref(annotation);
```

Validation levels:

- `annotation_shape`: W3C-shaped annotation/profile constraints pass; no integrity manifest was supplied.
- `manifest_bound`: the annotation and sidecar manifest agree structurally, but supplied bytes have not all been checked.
- `transcript_verified`: the supplied transcript bytes match the manifest SHA-256, and the named WebVTT cue exactly matches the annotation’s ID, interval and quotation.
- `invalid`: a stable error code identifies the failed boundary without echoing untrusted values.

Media bytes may also be supplied to `validateEvidenceBytes`; each supplied resource is hashed in Web Crypto before being counted as verified. The current minimum quickstart requires the transcript bytes because the synthetic MP4 is an app fixture rather than a community-package dependency.

## Tiny cue link

```js
import { mountCueLink } from './packages/sutra-evidence/cue-link.js';
mountCueLink(document.querySelector('#citation'), annotation, {
  label: 'Jump to cited moment'
});
```

The helper creates a normal anchor using the standards-derived `#t=start,end` fragment. It imports no player and owns no seek implementation.

## Integrity sidecar

The sidecar is intentionally small: profile ID, source version, and one media plus one transcript resource with SRI-style SHA-256 metadata. It is not a signature, identity system or trust score. Signature/publisher authentication can be layered independently.

The package never fetches arbitrary URLs, stores keys, executes peer code, grants consent or sends model requests. Hosts decide how to retrieve the resources whose bytes are supplied for hashing.

## Legacy compatibility

`validateReceipt()`, `receipt.schema.json`, `examples/receipt.json`, and `examples/sources.json` remain temporarily for the pre-0.2 SUTRA learner migration. They are **not** the flagship public interchange format. New code should use the Web Annotation profile.

Run the legacy check only when maintaining old fixtures:

```sh
node packages/sutra-evidence/cli.mjs packages/sutra-evidence/examples/receipt.json packages/sutra-evidence/examples/sources.json
```

Use the repository Apache-2.0 license and retain applicable notices when redistributing.
