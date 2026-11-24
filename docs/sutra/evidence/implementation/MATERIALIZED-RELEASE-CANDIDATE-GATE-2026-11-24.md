# Materialized Stage-One candidate pipeline

The release-candidate gate now has a filesystem materializer and CLI rather than only an in-memory transform. It creates a separate candidate tree, refuses symlinks/overlap/path escape, removes superseded development graph variants, writes model-bound SHA-256 release graphs, replaces manifest/links, binds the stable public runtime and UI hashes, and emits a non-self-referential candidate inventory.

CI builds the current development bundle, runs the release-gate tests, then verifies that the intentionally incomplete checked-in release template cannot materialize a candidate.

No release config satisfying the live-provider, clean-judge-path and budget/reserve requirements exists. No deployment occurs.