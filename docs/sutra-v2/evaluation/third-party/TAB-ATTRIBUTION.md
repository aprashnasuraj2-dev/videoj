# TAB — expert-checked linguistic ambiguity evidence

Source: https://github.com/amazon-science/tab-dataset at `2e9d70c3c44037ef7e6a2c96bf8efb31bd6aed0e`. Upstream license: **CC BY-SA 4.0**.

SUTRA preserves byte-for-byte only TAB's five main linguistic files: syntax PP (74), syntax VP (243), syntax conjunction (127), discourse anaphora (21) and discourse ellipsis (45), totaling 510 ambiguous prompts with possible interpretations/questions. Fairness, complex, combination and miscellaneous artifacts are intentionally excluded from SUTRA's semantic-family evidence.

TAB's README states that it expands/modifies the LAVA corpus. The associated ACL 2023 paper (Mehrabi et al., “Resolving ambiguities in text-to-image generative models”) describes expert annotation and cross-checking. These are visualizable linguistic ambiguities; most do **not** map one-to-one to SUTRA's 20 semantic ambiguity families. SUTRA therefore treats PP/VP attachment, conjunction and ellipsis mainly as related external linguistic evidence, not as proof for unrelated families such as units, denominator choice or causal interpretation.
