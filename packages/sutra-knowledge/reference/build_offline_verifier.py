#!/usr/bin/env python3
"""Build a deterministic, inspectable, standard-library-only verifier zipapp."""
import json
import sys
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
NAME='sutra-proof-verifier.pyz'
FORMAT='sutra-proof-verifier-bundle/v1'
SOURCES={'__main__.py':'offline_main.py','verify.py':'verify.py','verify_conflict.py':'verify_conflict.py',
         'verify_debugger.py':'verify_debugger.py','verify_capsule.py':'verify_capsule.py',
         'verify_pinned_investigation.py':'verify_pinned_investigation.py','verify_aligned_capsule.py':'verify_aligned_capsule.py',
         'verify_trial_partition.py':'verify_trial_partition.py','verify_trial_snapshot.py':'verify_trial_snapshot.py',
         'verify_reviewed_compiler.py':'verify_reviewed_compiler.py','verify_reviewed_snapshot.py':'verify_reviewed_snapshot.py',
         'verify_reviewed_contrast.py':'verify_reviewed_contrast.py','verify_living_version.py':'verify_living_version.py',
         'verify_world_grid.py':'verify_world_grid.py','verify_investigation_history.py':'verify_investigation_history.py','verify_robust_acquisition.py':'verify_robust_acquisition.py','verify_reviewed_interval.py':'verify_reviewed_interval.py','verify_reviewed_binomial.py':'verify_reviewed_binomial.py','verify_reviewed_fisher.py':'verify_reviewed_fisher.py'}
README=b'''SUTRA Proof Capsule v1 / independent offline verifier\n\nRequires Python 3.10+; no third-party packages, network, or browser.\nRun from any directory:\n  python3 -I -S sutra-proof-verifier.pyz capsule.json --pin-file capsule.sha256\nOr supply the separately trusted digest with --pin sha256:<64 lowercase hex>.\nExit 0 = verified; 1 = refused; 2 = input/argument error.\nThe digest must be retained independently of the capsule.\nFor a caller-pinned aligned capsule, also supply --aligned --case-pin sha256:<trusted case digest>.\nThe fixed and aligned profiles are separate; the latter requires both pins.\nFor a research trial snapshot: --trial --source-pin sha256:<trusted normalized source digest>\nplus --after-source-pin for a version comparison. The snapshot digest is still mandatory.\nFor a reviewed compiler report: --reviewed --contract-pin sha256:<trusted contract digest>\nplus the independently retained snapshot digest. A verified report may have a refuted or blocked target.\nFor a living investigation version: --living --pin-file version.sha256.\nFor a bounded history: --history --pin-file history.sha256. No storage or lock assurance.\nFor robust acquisition: --acquisition --pin-file policy-report.sha256 --version-pin ... --plan-pin ... --policy-pin ... .\nFor exact interval enclosure: --interval --pin-file report.sha256 --version-pin ... --plan-pin ... .\nFor conditional two-group arithmetic: --fisher --pin-file report.sha256 --version-pin ... --plan-pin ... .
For conditional binomial arithmetic: --binomial --pin-file report.sha256 --version-pin ... --plan-pin ... .\nFor a synthetic world grid: --world-grid --pin-file grid.sha256 --version-pin sha256:<trusted version> --plan-pin sha256:<trusted plan>. Fresh replay does not certify cache use.\nThe independent replay reconstructs admitted conditional computations and source-linked declarations, not intended meaning or producer-specific refusal diagnostics.\nThe verifier checks exact bytes and replays the selected finite model; it does not establish\nempirical truth, independent source identity, signatures, freshness, or external authority.\nThis archive is inspectable as ZIP and includes source hashes. Its own digest must be\ntrusted separately; a digest delivered by the same untrusted sender is not authenticity.\nNever execute a verifier received from an untrusted source without independent review.\n'''


def expected_files():
    files={name:(HERE/source).read_bytes() for name,source in SOURCES.items()}
    for name in ('LICENSE','NOTICE'):
        files[name]=(ROOT/name).read_bytes()
    files['README.txt']=README
    return files


def digest(data):
    return 'sha256:'+sha256(data).hexdigest()


def make_bundle():
    files=expected_files()
    manifest=dict(format=FORMAT,files={name:digest(data) for name,data in sorted(files.items())})
    files['MANIFEST.json']=(json.dumps(manifest,sort_keys=True,separators=(',',':'))+'\n').encode('utf-8')
    output=BytesIO()
    with ZipFile(output,'w',compression=ZIP_STORED) as archive:
        for name,data in sorted(files.items()):
            info=ZipInfo(name,date_time=(1980,1,1,0,0,0))
            info.create_system=3
            info.external_attr=0o100644<<16
            info.compress_type=ZIP_STORED
            archive.writestr(info,data)
    return output.getvalue()


def build(out):
    out=Path(out)
    out.mkdir(parents=True,exist_ok=True)
    data=make_bundle()
    (out/NAME).write_bytes(data)
    (out/(NAME+'.sha256')).write_bytes((digest(data)+'\n').encode('ascii'))
    return digest(data)


if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: build_offline_verifier.py OUTPUT_DIR')
    print(build(sys.argv[1]))
