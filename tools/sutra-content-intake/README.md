# SUTRA real-content intake gate

This tool is for the future rights-cleared lesson/video, transcript and written guide. It does not supply content and it cannot prove licensing or reviewer competence.

The CLI reads actual bounded files from a content root, refuses symlinks/path escape, computes SHA-256, and compares them with the manifest. The manifest also carries de-identified rights declarations and a human factual-review status.

A structurally complete result requires:
- matching media/transcript/guide bytes;
- declared basis for each asset (`owned`, `licensed`, or `written_permission`);
- an opaque rights evidence reference and explicit public-distribution declaration for each asset;
- a reviewed status with the fixed factual-review statement and timezone-bearing review time.

**Important:** `structuralIntakeComplete:true` means these fields and byte identities are structurally complete. It does not prove the rights documents are authentic, the declaration is legally sufficient, or the reviewer is competent/truthful. Those remain participant/human evidence gates.

Do not put contracts, reviewer names, email addresses or other private rights documents in the public manifest. Use an opaque private-record reference.

CLI: `node tools/sutra-content-intake/cli.mjs MANIFEST.json CONTENT_ROOT > assessed.json`.
