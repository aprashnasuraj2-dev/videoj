# Guided challenge — local synthetic case

The first screen offers a real investigation, not a prerecorded demonstration. The single primary action follows the current computed state. Manual exploration is always available; deviation from the guided history offers explicit reset. Reset is never automatic.

1. Start with original observation and separate control.
2. Withdraw original; conclusion becomes underdetermined, control survives.
3. Restore and reread original; supported again.
4. Add nine declared copies: ten artifacts, one declared root.
5. Introduce conflicting independent-declared reading; globally conflicted, conditional supports visible.
6. Hypothetically withdraw original lineage; not automatic adjudication.
7. Execute recommended decisive second-variable observation; refuted.
8. Export exact Proof Capsule.
9. Request separate trusted pin download. A browser request is not confirmed disk storage.
10. Verify current exact bytes and semantics locally.
11. Tamper one byte and require PIN_MISMATCH.
12. Restore original and verify again.

The guide does not create evidence, synthesize verdicts, or resolve contradictions automatically. The case is finite and synthetic; declared lineage is not discovered provenance. Proof Capsule v1 authenticates exact bytes relative to a separately trusted digest and replays the case, not freshness, identity, or empirical truth. Automated Chromium timing is not a measured human completion rate. No network or paid inference is required.


## Competition browser demonstration — verified fixture, not live service

The canonical V2 browser workspace exercises three published graphs, not a separate presentation mockup. Use the orbital workspace's browser planning, reviewed-evidence and peer-consultation controls. Each requires explicit preparation and approval; the grounded run requires an exact selected source span.

| Demonstration | Expected observed fixture result |
| --- | --- |
| Browser investigation | Planner and critic delegate and complete; 3 inference requests. Missing delegation is refused. |
| Grounded reviewed investigation | One exact local read, 4 inference requests; a widened quote is refused before follow-up. Unselected source text is not disclosed. |
| Cross-origin guide consultation | Separate manifest and graph approvals; denial at the first or second step stops further contact. Approval of both causes precisely two credentialless GETs to a second loopback origin and 5 caller-router fixture requests. |
| Evidence revision | Admitted acquisition metadata remains bound to unchanged text and history; changing text removes stale acquisition metadata. |
| Independent verification | Export the existing Proof Capsule and use its separately retained pin; tampering must fail. |

Reproducible evidence at revision `5a79a688434f60a974ec15c07eb40c3f68782c8e`: [browser CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46005959181), [three fixture receipts and screenshots](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46005959181/artifacts/15201796510), [orbital viewport screenshots](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46005959181/artifacts/15201996409). Artifacts expire according to Actions retention. The receipt includes configuration identity, graph identity, tool/agent/consent events and counts, not private evidence or prompt bodies. The runner injects SSE inference responses; no live provider or public peer is asserted.

### Protected live verification (not executed in this session)

After review and approved integration to main, dispatch [SUTRA credentialed live model smoke](https://github.com/aprashnasuraj2-dev/videoj/actions/workflows/sutra-live-model-smoke.yml) on main, with the protected sutra-live-research environment, `approve=true`, `native=true`, `structured=false` and explicit provider/model choices. Native mode allows a maximum of two bounded inference requests per selected provider; billing may apply. Inspect redacted response digests, tool result admission, citation checks, and each provider's result. A native JSON smoke pass is not evidence of live browser SSE compatibility. Only after an approved deployed router and guide have passed public identity checks should a live browser run replace the fixture demonstration. Never present fixture outputs as live or substitute a failed provider silently.

The evidence package currently establishes local candidate behavior and independently reproduced tests, not competition conformance, submission acceptance, or public service readiness.


## Browser import / invocation contract (candidate)

The source-level ESM entry used by the actual Vite workspace is `apps/sutra-v2/src/browser-investigation.js`. A browser bundler imports `prepareBrowserInvestigation` from that module. It uses the unchanged pinned nsDeploy kernel at `486ecf26aa8775963f9b765f894734bef1ac9817` and SUTRA's restricted host adapter. It is not a standalone public CDN module or Node replacement. The built index references the generated module asset; the runtime executes the graph retrieved from the manifest, not an independently handwritten graph.

```js
const prepared = await prepareBrowserInvestigation({
  origin: location.origin,
  objective: "Identify what evidence is missing."
});
// Render prepared.preview and obtain explicit user approval before calling:
const result = await prepared.run({signal, onEvent});
```

For a reviewed evidence run, pass `selection: {sourceId, sourceText, start, end}` and a synchronous `getSelection()` returning the currently selected coordinates and text. Only the approved exact span is read by the local capability. A critic call before a successful read, or without the exact quote in its request, is refused. The quote remains untrusted evidence, not an instruction or verified fact. No approved route may be silently replaced. Preparation is bounded and execution is one-shot; a changed input requires a fresh plan.

For a peer consultation, pass `peer: true` and optionally `callerPeerUrl` as a separate tab-local override for the exact `checklist` network. The default is the publisher's `links.json`; the caller's override never mutates those bytes, never changes the network name, and cannot authorize a GET. Production only admits the configured guide URL; alternate loopback URLs are for local development. The host must supply `decidePeer(contact,{signal})` and obtain independent user approval before each manifest and graph retrieval. There is no public arbitrary-peer route or durable override store.

The preview and redacted completed receipt include network/front, pinned upstream runtime commit, SHA-256 of the exact retrieved local manifest/definition/link bytes, SHA-256 of the resolved execution graph, model and route-contract pin, caller/publisher binding source and bounded execution events. Local raw byte digests are not peer artifact digests, signatures, freshness, independent provenance, billing or truth attestations. The evidence/peer paths still need an approved live publisher-funded router to run outside an injected transport fixture.

## Independent replay from actual browser downloads

1. Export the proof capsule and its pin separately in the guided debugger; retain the trusted pin outside the capsule. Obtain the verifier and verifier digest from a separately trusted reviewed build/revision. Do not trust two files supplied by the same untrusted sender merely because their digests agree.
2. In an empty directory, use a trusted Python 3.10+ executable, verify the archive bytes against the independently retained verifier SHA-256 (the pin file includes a `sha256:` prefix), then execute the isolated zipapp:

```sh
python3 -I -S -c 'import hashlib,pathlib; p=pathlib.Path("sutra-proof-verifier.pyz"); assert "sha256:"+hashlib.sha256(p.read_bytes()).hexdigest()==pathlib.Path("sutra-proof-verifier.pyz.sha256").read_text().strip()'
python3 -I -S sutra-proof-verifier.pyz capsule-current.json --pin-file capsule-current.sha256
```

Use the exact original capsule for verification. A byte mutation under the original trusted pin must refuse; a forged result with a recomputed digest must refuse on deterministic replay. A historical capsule may verify with its own pin but must not verify against a newer pin. The independent standard-library verifier replays the bounded case; it does not certify empirical truth, freshness, signatures, source independence or external authority. No provider access is required. The workspace workflow now preserves the actual downloaded archive, both capsules, their pins, replay log and tested revision, and fails independently if this ceremony does not pass.
