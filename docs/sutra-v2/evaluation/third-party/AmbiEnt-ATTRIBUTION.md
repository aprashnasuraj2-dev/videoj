# AmbiEnt external human-annotation attribution

SUTRA preserves two AmbiEnt artifacts byte-for-byte for semantic ambiguity evaluation.

- Upstream repository: https://github.com/alisawuffles/ambient
- Immutable upstream commit: `1fcb43effda068f3047d46b6f9ff0e50e0ee1c1b`
- Full corpus: `AmbiEnt/ambient_full.jsonl` — 1,645 records — upstream Git blob `a936db483d95b4d896a21c47ec7bff44c19aeefc`
- Ambiguity-type analysis corpus: `AmbiEnt/analysis/category_annotations.jsonl` — 100 records — upstream Git blob `58e1aac10ddf95b5fb3861f842cdc6fd80ed5077`
- Raw linguist annotation corpus: `AmbiEnt/linguist_annotations.jsonl` — 2,020 records / 4,090 annotation entries — upstream Git blob `3b5f5a950ab81dd0294e3fc59f94568c8e6ac2c6`
- Paper: Liu et al., “We’re Afraid Language Models Aren’t Modeling Ambiguity,” EMNLP 2023, DOI 10.18653/v1/2023.emnlp-main.51.
- License: CC BY 4.0.

The upstream repository describes AmbiEnt as linguist-annotated. SUTRA does not relabel these records and does not present model output or same-project replay as human annotation. These files are evaluation evidence only and do not grant semantic authority to any SUTRA output.
