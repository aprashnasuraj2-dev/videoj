# SUTRA reviewed content pack compiler

This tool packages **already rights-declared and human-reviewed** lesson inputs into the public content shape shared by the learner and Worker. It does not create or infer rights, factual review, cue timing, or claim semantics.

Inputs are a private content manifest accepted by `sutra-content-intake`, the actual media/transcript/HTML guide files, and public semantic metadata containing reviewed cues plus one narrow video claim and one matching written-guide claim.

The output is a new directory only. Media and transcript use SHA-256-addressed public paths; the original reviewed guide HTML is never published as executable markup. The compiler emits a small CSP-locked, escaped excerpt page whose hash-addressed path binds the original reviewed guide-input SHA-256; captions and chapters are generated from the reviewed cue list; `content-profile.json` and `source-catalog.json` pass the same validator used by the learner and Worker. The compiler requires each cue text to occur verbatim in the transcript and the declared guide anchor/excerpt to occur in the HTML guide.

The pack record is non-sensitive and contains only published hashes/public paths plus the intake record hash. The safe guide excerpt itself records the original reviewed guide-input SHA-256, while the intake record binds that input and its rights declaration. Legal sufficiency, reviewer competence, semantic truth, accessibility of the underlying lesson, and public deployment remain external evidence.

CLI: `node tools/sutra-content-pack/cli.mjs CONTENT_MANIFEST.json SEMANTIC_METADATA.json CONTENT_ROOT OUTPUT_DIR`.

The output must be integrated into the SUTRA public tree in a separate explicit change; this compiler never overwrites an existing app directory.

The source root and each intermediate input directory must be real directories (no symlink ancestors within the root). The physical output parent is resolved and output must not overlap the source tree. This assumes a trusted, stable input filesystem during compilation; it is not a guarantee against concurrent path replacement by another process.

The compiler's output must fit the browser's complete verification budget: media <=24 MiB, transcript <=2 MiB, catalog <=256 KiB and profile <=32 KiB. Larger private originals can remain in intake; re-encode and re-review the exact derivative rather than publishing an unplayable or unverified artifact.
