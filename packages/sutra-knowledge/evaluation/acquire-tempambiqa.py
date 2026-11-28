#!/usr/bin/env python3
"""Explicit, pinned acquisition of external human temporal-ambiguity evidence.

No network on import or --self-test. No training, inference, or label rewriting.
The fetched Git commit authenticates the path/blob relationship; if a Git LFS
pointer is present, its SHA-256 authenticates the downloaded bytes instead.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import unittest

REPO = "https://huggingface.co/datasets/Bhawna/TempAmbiQA"
REV = "ba7839ca206d7b68d4d5322e8c286b649d8da587"
FILE = "TempAmbiQA.json"
MAX = 2 * 1024 * 1024
EXPECTED = {True: 3879, False: 4283}

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def git_blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key: " + key)
        result[key] = value
    return result

def validate(data, expected=EXPECTED):
    if not data or len(data) > MAX:
        raise ValueError("invalid dataset size")
    rows = json.loads(data.decode("utf-8"), object_pairs_hook=no_duplicates)
    if not isinstance(rows, list):
        raise ValueError("expected JSON array")
    counts = {True: 0, False: 0}
    distinct = set()
    conflicting = set()
    labels = {}
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"question", "is_ambiguous"}:
            raise ValueError("unexpected upstream schema")
        q, label = row["question"], row["is_ambiguous"]
        if not isinstance(q, str) or not q.strip() or len(q) > 2048 or type(label) is not bool:
            raise ValueError("invalid question or non-boolean annotation")
        q.encode("utf-8")  # reject unpaired surrogates rather than repairing source
        counts[label] += 1
        distinct.add(q)
        if q in labels and labels[q] != label:
            conflicting.add(q)
        labels[q] = label
    if counts != expected:
        raise ValueError("unexpected annotation distribution: " + repr(counts))
    return {"records": len(rows), "ambiguous": counts[True], "unambiguous": counts[False],
            "distinctQuestionStrings": len(distinct), "conflictingQuestionStrings": len(conflicting)}

def git(cwd, *args):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GIT_CONFIG_NOSYSTEM="1",
               GIT_CONFIG_GLOBAL=os.devnull, GIT_LFS_SKIP_SMUDGE="1")
    return subprocess.run(["git", "-c", "protocol.file.allow=never", "-c",
                           "protocol.ext.allow=never", *args], cwd=cwd, env=env,
                          check=True, timeout=120, stdout=subprocess.PIPE).stdout

def acquire():
    with tempfile.TemporaryDirectory(prefix="sutra-tempambiqa-") as tmp:
        git(tmp, "init", "--quiet")
        git(tmp, "fetch", "--no-tags", "--depth=1", REPO, REV)
        if git(tmp, "rev-parse", "FETCH_HEAD").decode().strip() != REV:
            raise ValueError("pinned revision mismatch")
        blob = git(tmp, "rev-parse", REV + ":" + FILE).decode().strip()
        size = int(git(tmp, "cat-file", "-s", blob))
        if not 0 < size <= MAX:
            raise ValueError("unexpected Git blob size")
        stored = git(tmp, "cat-file", "blob", blob)
        if len(stored) != size or git_blob(stored) != blob:
            raise ValueError("Git blob mismatch")
        if stored.startswith(b"version https://git-lfs.github.com/spec/v1\n"):
            lines = stored.decode("ascii").splitlines()
            if len(lines) != 3 or not lines[1].startswith("oid sha256:") or not lines[2].startswith("size "):
                raise ValueError("unsupported LFS pointer")
            digest, length = lines[1][11:], int(lines[2][5:])
            if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest) or not 0 < length <= MAX:
                raise ValueError("invalid LFS pointer")
            with urllib.request.urlopen(REPO + "/resolve/" + REV + "/" + FILE, timeout=30) as response:
                data = response.read(MAX + 1)
            if len(data) != length or sha256(data) != digest:
                raise ValueError("LFS object mismatch")
            mode = "git-lfs-sha256"
        else:
            data, mode = stored, "git-blob-sha1"
        return data, blob, mode

def install(output):
    data, blob, mode = acquire()
    stats = validate(data)
    record = {"schema": "sutra-external-human-temporal/v1", "source": REPO,
              "revision": REV, "upstreamPath": FILE, "upstreamGitBlob": blob,
              "integrityMode": mode, "sha256": sha256(data), "bytes": len(data),
              "license": "MIT (upstream dataset card)", "humanAnnotation": True,
              "split": "upstream-train; not independent held-out for models trained on this data",
              "scope": "temporal ambiguity only", "statistics": stats,
              "citation": "Piryani et al., Findings of EMNLP 2024, https://aclanthology.org/2024.findings-emnlp.562/"}
    raw_name, manifest_name = "tempambiqa-human-full-v1.json", "tempambiqa-human-manifest-v1.json"
    output = Path(output)
    # Publish the pair together by renaming a new directory; never replace existing data.
    if output.exists():
        raise FileExistsError("choose a new output directory")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix=".sutra-acquisition-") as tmp:
        stage = Path(tmp) / "verified"
        stage.mkdir()
        (stage / raw_name).write_bytes(data)
        (stage / manifest_name).write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        if output.exists():
            raise FileExistsError("output appeared during acquisition")
        stage.rename(output)
    return record

class OfflineTests(unittest.TestCase):
    def test_valid_and_conflicting_duplicates(self):
        data = b'[{"question":"Which year?","is_ambiguous":true},{"question":"Which year?","is_ambiguous":false}]'
        self.assertEqual(validate(data, {True:1,False:1})["conflictingQuestionStrings"], 1)
    def test_invalid(self):
        for data in [b'{}', b'[{"question":"x","is_ambiguous":1}]',
                     b'[{"question":"x","is_ambiguous":true,"is_ambiguous":false}]',
                     b'[{"question":" ","is_ambiguous":true}]',
                     b'[{"question":"x","is_ambiguous":true,"extra":0}]',
                     b'[{"question":"\\ud800","is_ambiguous":true}]',
                     b'[]', b'\xff']:
            with self.subTest(data=data), self.assertRaises((ValueError, UnicodeError)):
                validate(data, {True:1,False:0})
    def test_git_blob(self):
        self.assertEqual(git_blob(b''), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--output", type=Path, help="new directory for verified raw data and manifest")
    args = parser.parse_args()
    if args.self_test:
        if args.output:
            parser.error("--self-test and --output are mutually exclusive")
        unittest.main(argv=[__file__])
    elif args.output:
        print(json.dumps(install(args.output), indent=2))
    else:
        parser.error("specify --self-test or --output")
