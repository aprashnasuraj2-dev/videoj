#!/usr/bin/env python3
"""Offline capsule verifier: external byte pin + independent synthetic-case replay.
No JavaScript execution, network, signatures, factual authority, or freshness claim.
"""
import json
import re
import sys
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
from verify import canonical, keys, KERNEL
from verify_conflict import bounded_load, rawhash, require
from verify_debugger import anchor, compact, replay, VERSION

FORMAT = "sutra-proof-capsule/v1"
PAYLOAD = "sutra-proof-payload/v1"
MAX_BYTES = 262144
PIN = re.compile(r"sha256:[a-f0-9]{64}", re.ASCII)
COMPUTATION = dict(debugger=VERSION, quantity=KERNEL, observationPolicy="finite-minimax/v1")
LIMITATIONS = [
    "Synthetic finite-world model and declared source lineage only.",
    "A digest must be retained independently of the capsule; a digest supplied only by an untrusted sender is not an authenticity guarantee.",
    "Replay does not establish external truth, observation independence, signer identity, or freshness.",
    "Older valid state with its older trusted digest remains verifiable; no monotonic witness is included."
]


def digest(data):
    return "sha256:" + sha256(data).hexdigest()


def refused(reason):
    return dict(status="REFUSED", reason=reason)


def wire(text, depth=32):
    obj = bounded_load(text, MAX_BYTES, depth)
    # Reject escaped lone surrogates even when they are in fields not consulted
    # by a particular verifier branch. The profile admits only valid Unicode.
    stack = [obj]
    while stack:
        value = stack.pop()
        if isinstance(value, str):
            value.encode("utf-8", errors="strict")
        elif isinstance(value, dict):
            stack.extend(value.keys()); stack.extend(value.values())
        elif isinstance(value, list):
            stack.extend(value)
    return obj


def verify(data, expected_pin):
    if not isinstance(expected_pin, str) or not PIN.fullmatch(expected_pin):
        return refused("PIN_REQUIRED")
    if not isinstance(data, bytes) or not 1 <= len(data) <= MAX_BYTES:
        return refused("SIZE_OR_TYPE")
    actual = digest(data)
    if actual != expected_pin:
        return refused("PIN_MISMATCH")
    try:
        envelope = wire(data.decode("utf-8", errors="strict"), 4)
        if (not keys(envelope, ("format", "payloadDigest", "payloadText")) or envelope["format"] != FORMAT
                or not isinstance(envelope["payloadDigest"], str) or not PIN.fullmatch(envelope["payloadDigest"])
                or not isinstance(envelope["payloadText"], str)):
            return refused("ENVELOPE_SCHEMA")
        payload_bytes = envelope["payloadText"].encode("utf-8")
        require(1 <= len(payload_bytes) <= MAX_BYTES)
        if digest(payload_bytes) != envelope["payloadDigest"]:
            return refused("PAYLOAD_MISMATCH")
        payload = wire(envelope["payloadText"])
        if (not keys(payload, ("format", "computation", "caseText", "caseDigest", "state", "limitations"))
                or payload["format"] != PAYLOAD or canonical(payload["computation"]) != canonical(COMPUTATION)
                or canonical(payload["limitations"]) != canonical(LIMITATIONS)
                or not keys(payload["state"], ("version", "events", "result"))
                or payload["state"]["version"] != VERSION or not isinstance(payload["state"]["events"], list)):
            return refused("PAYLOAD_SCHEMA")
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError, UnicodeError, RecursionError):
        return refused("WIRE_REFUSED")
    try:
        case_text = compact(anchor()[0])
        if payload["caseText"] != case_text or payload["caseDigest"] != rawhash(case_text):
            return refused("CASE_ANCHOR_MISMATCH")
        result = replay(payload["state"]["events"])
        if canonical(result) != canonical(payload["state"]["result"]):
            return refused("REPLAY_MISMATCH")
        return dict(status="VERIFIED", capsuleDigest=actual, payloadDigest=envelope["payloadDigest"],
                    caseDigest=result["caseDigest"], historyDigest=result["historyDigest"],
                    conclusion=result["claims"]["target"]["state"],
                    qualification="Exact snapshot and independent finite-model replay; not external truth or freshness.")
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError, UnicodeError, RecursionError):
        return refused("REPLAY_REFUSED")


def read_bytes(path):
    with Path(path).open("rb") as f:
        return f.read(MAX_BYTES + 1)


def read_pin(path):
    with Path(path).open(encoding="ascii") as f:
        return f.read(80).strip()


def rebind(envelope, payload):
    # Negative control: assume the attacker can rewrite both inner and outer
    # hashes. An independent model still refuses fabricated semantics.
    envelope["payloadText"] = compact(payload)
    envelope["payloadDigest"] = rawhash(envelope["payloadText"])
    data = compact(envelope).encode("utf-8")
    return data, digest(data)


def challenge(current, current_pin, old, old_pin):
    require(verify(current, current_pin).get("conclusion") == "REFUTED")
    require(verify(old, old_pin).get("conclusion") == "SUPPORTED")
    # Exactly one changed ASCII byte inside an observation value, not merely
    # invalid JSON. Preserve length and compare against the retained pin.
    match = re.search(rb"[01]/1", current)
    require(match is not None)
    pos = match.start(); mutated = bytearray(current)
    mutated[pos] = 49 if mutated[pos] == 48 else 48
    require(sum(a != b for a, b in zip(current, mutated)) == 1)
    require(verify(bytes(mutated), current_pin) == refused("PIN_MISMATCH"))
    require(verify(current + b" ", current_pin) == refused("PIN_MISMATCH"))
    require(verify(current, current_pin)["status"] == "VERIFIED")
    require(verify(old, current_pin) == refused("PIN_MISMATCH"))
    require(verify(old, old_pin)["status"] == "VERIFIED")
    print("ACCEPTED exact restored bytes; rejected byte and whitespace changes; old pin still verifies historical state (not freshness)")
    original = wire(current.decode("utf-8"), 4)
    source = wire(original["payloadText"])
    def change_result(p): p["state"]["result"]["claims"]["target"]["state"] = "SUPPORTED"
    def change_root(p): p["state"]["result"]["declaredRoots"] = 99
    def change_source(p): p["state"]["events"][0]["sourceText"] += " "
    def change_copy(p): next(e for e in p["state"]["events"] if e["type"] == "add_copies")["artifacts"][0]["text"] += " "
    def change_case(p): p["caseText"] += " "
    def change_scope(p): p["limitations"] = []
    for name, mutate, reason in (("forged conclusion", change_result, "REPLAY_MISMATCH"),
            ("forged roots", change_root, "REPLAY_MISMATCH"), ("source bytes", change_source, "REPLAY_REFUSED"),
            ("copy bytes", change_copy, "REPLAY_REFUSED"), ("case substitution", change_case, "CASE_ANCHOR_MISMATCH"),
            ("omitted limitations", change_scope, "PAYLOAD_SCHEMA")):
        payload = deepcopy(source); mutate(payload)
        data, pin = rebind(deepcopy(original), payload)
        require(verify(data, current_pin) == refused("PIN_MISMATCH"))
        require(verify(data, pin) == refused(reason))
        print("REJECTED rehashed", name)
    duplicate = b'{"format":"sutra-proof-capsule/v1","format":"sutra-proof-capsule/v1"}'
    require(verify(duplicate, digest(duplicate)) == refused("WIRE_REFUSED"))
    require(verify(b"\xff", digest(b"\xff")) == refused("WIRE_REFUSED"))
    require(verify(current, "") == refused("PIN_REQUIRED"))
    require(verify(bytes(MAX_BYTES + 1), current_pin) == refused("SIZE_OR_TYPE"))
    print("REJECTED duplicate keys, invalid UTF-8, absent pin and oversized input")


def main():
    args = sys.argv[1:]
    if len(args) == 5 and args[0] == "--challenge":
        challenge(read_bytes(args[1]), read_pin(args[2]), read_bytes(args[3]), read_pin(args[4]))
        return
    if len(args) != 2:
        raise SystemExit("usage: verify_capsule.py capsule.json sha256:<trusted hex>")
    result = verify(read_bytes(args[0]), args[1])
    print(json.dumps(result, indent=2))
    if result["status"] != "VERIFIED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
