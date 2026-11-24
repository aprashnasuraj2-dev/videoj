# SUTRA reviewed content pack compiler

This tool packages **already rights-declared and human-reviewed** lesson inputs into the public content shape shared by the learner and Worker. It does not create or infer rights, factual review, cue timing, or claim semantics.

Inputs are a private content manifest accepted by `sutra-content-intake`, the actual media/transcript/HTML guide files, and public semantic metadata containing reviewed cues plus one narrow video claim and one matching written-guide claim.

The output is a new directory only. Media, transcript and guide use SHA-256-addressed public paths; captions and chapters are generated from the reviewed cue list; `content-profile.json` and `source-catalog.json` pass the same validator used by the learner and Worker. The compiler requires each cue text to occur verbatim in the transcript and the declared guide anchor/excerpt to occur in the HTML guide.

The pack record is non-sensitive and contains only hashes/public paths plus the intake record hash. Legal sufficiency, reviewer competence, semantic truth, accessibility of the underlying lesson, and public deployment remain external evidence.

CLI: `node tools/sutra-content-pack/cli.mjs CONTENT_MANIFEST.json SEMANTIC_METADATA.json CONTENT_ROOT OUTPUT_DIR`.

The output must be integrated into the SUTRA public tree in a separate explicit change; this compiler never overwrites an existing app directory.
