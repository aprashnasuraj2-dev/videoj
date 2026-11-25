#!/usr/bin/env python3
"""Independent reference implementation of the narrow exact-quantity wire profile.

Uses Python Fraction/hashlib and depth-first evaluation instead of the JS kernel.
No import, subprocess or network dependency on the producer. This is an
independently implemented consumer maintained by the same project, not external adoption.
"""
import hashlib
import json
import math
import re
import sys
from fractions import Fraction

KERNEL = "sutra-exact-quantity/0.1.0"
IDENTIFIER = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,63}", re.ASCII)
RATIONAL = re.compile(r"-?(?:0|[1-9][0-9]{0,47})(?:/[1-9][0-9]{0,47})?", re.ASCII)


def fail():
    raise ValueError("invalid graph or unsupported wire profile")


def pairs(items):
    result = {}
    for k, v in items:
        if k in result:
            fail()
        result[k] = v
    return result


def number(s):
    # All numeric JSON fields in this profile must be safe integral values.
    # JavaScript JSON.parse treats 1.0 and 1e0 identically to 1.
    x = float(s) if "." in s or "e" in s.lower() else int(s)
    if not math.isfinite(x) or x != int(x) or abs(x) > 2**53-1 or (x == 0 and s.startswith("-")):
        fail()
    return int(x)


def load(text, cap):
    if not isinstance(text, str) or len(text.encode("utf-16-le")) // 2 > cap:
        fail()
    value = json.loads(text, object_pairs_hook=pairs, parse_int=number,
                       parse_float=number, parse_constant=lambda _: fail())
    # The producer rejects nesting above 12 for graph wire.
    if cap == 65536:
        stack = [(value, 0)]
        while stack:
            item, depth = stack.pop()
            if depth > 12:
                fail()
            if isinstance(item, dict):
                stack.extend((v, depth + 1) for v in item.values())
            elif isinstance(item, list):
                stack.extend((v, depth + 1) for v in item)
    return value


def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(obj):
    return "sha256:" + hashlib.sha256(canonical(obj).encode("utf-8")).hexdigest()


def keys(o, expected):
    return isinstance(o, dict) and set(o) == set(expected)


def ident(v):
    return isinstance(v, str) and IDENTIFIER.fullmatch(v) is not None


def dim(v):
    return isinstance(v, list) and len(v) == 3 and all(type(x) is int and -16 <= x <= 16 for x in v)


def rat(v):
    if not isinstance(v, str) or not RATIONAL.fullmatch(v) or v.startswith("-0"):
        fail()
    return Fraction(v)


def quantity(r, d, status):
    return {"status": status, "value": f"{r.numerator}/{r.denominator}", "dimension": d}


def outcome(status, reason):
    return {"status": status, "reason": reason}


def calculate(node, receipts):
    if node["kind"] == "input":
        return quantity(rat(node["value"]), node["dimension"], "assumption_declared")
    a, b = [r["outcome"] for r in receipts]
    if "value" not in a or "value" not in b:
        return outcome("blocked", "DEPENDENCY_NOT_QUANTITY")
    op = node["op"]
    if (node["kind"] == "constraint" or op in ("add", "sub")) and a["dimension"] != b["dimension"]:
        return outcome("incompatible", "DIMENSION_MISMATCH")
    x, y = Fraction(a["value"]), Fraction(b["value"])
    if node["kind"] == "constraint":
        match = {"eq": x == y, "le": x <= y, "lt": x < y, "ge": x >= y, "gt": x > y}[op]
        return {"status": "constraint_satisfied" if match else "constraint_refuted", "comparison": op}
    d = a["dimension"]
    if op in ("mul", "div"):
        d = [u + (v if op == "mul" else -v) for u, v in zip(d, b["dimension"])]
        if not dim(d):
            return outcome("indeterminate", "DIMENSION_LIMIT")
    if op == "div" and y == 0:
        return outcome("indeterminate", "DIVISION_BY_ZERO")
    r = {"add": lambda: x+y, "sub": lambda: x-y, "mul": lambda: x*y, "div": lambda: x/y}[op]()
    if abs(r.numerator).bit_length() > 512 or r.denominator.bit_length() > 512:
        return outcome("indeterminate", "RATIONAL_LIMIT")
    return quantity(r, d, "computed")


def recompute(graph_text):
    g = load(graph_text, 65536)
    if not keys(g, ("schemaVersion", "nodes")) or type(g["schemaVersion"]) is not int or g["schemaVersion"] != 1:
        fail()
    if not isinstance(g["nodes"], list) or not 1 <= len(g["nodes"]) <= 256:
        fail()
    nodes = {}
    for n in g["nodes"]:
        if not isinstance(n, dict) or not ident(n.get("id")) or n["id"] in nodes:
            fail()
        k = n.get("kind")
        if k == "input":
            if not keys(n, ("id", "kind", "value", "dimension", "basis")) or not dim(n["dimension"]):
                fail()
            basis = n["basis"]
            # JS trim includes BOM, not U+0085; reproduce the declared profile.
            whitespace = " \t\n\r\v\f\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
            if (not isinstance(basis, str) or not basis.strip(whitespace) or
                    len(basis.encode("utf-16-le")) // 2 > 160 or
                    any(ord(ch) < 32 or ord(ch) == 127 for ch in basis)):
                fail()
            rat(n["value"])
        elif k in ("derive", "constraint"):
            if not keys(n, ("id", "kind", "op", "args")) or n["op"] not in (
                    ("add", "sub", "mul", "div") if k == "derive" else ("eq", "le", "lt", "ge", "gt")):
                fail()
            if not isinstance(n["args"], list) or len(n["args"]) != 2 or not all(ident(a) for a in n["args"]):
                fail()
        else:
            fail()
        nodes[n["id"]] = n
    receipts, depths, visiting = {}, {}, set()

    def visit(i):
        if i in visiting or i not in nodes or len(visiting) >= 32:
            fail()
        if i in receipts:
            return receipts[i]
        visiting.add(i)
        n = nodes[i]
        args = n.get("args", [])
        if any(j not in nodes or nodes[j]["kind"] == "constraint" for j in args):
            fail()
        deps = [visit(j) for j in args]
        depth = 1 + max((depths[j] for j in args), default=0)
        if depth > 32:
            fail()
        depths[i] = depth
        refs = [{"id": r["id"], "receiptDigest": r["receiptDigest"]} for r in deps]
        body = {"id": i, "nodeDigest": digest({"kernel": KERNEL, "node": n, "dependencies": refs}),
                "dependencies": refs, "outcome": calculate(n, deps)}
        receipt = dict(body, receiptDigest=digest(body))
        receipts[i] = receipt
        visiting.remove(i)
        return receipt

    ordered = [visit(i) for i in sorted(nodes)]
    report = {"schemaVersion": 1, "kernel": KERNEL,
              "graphDigest": digest({"kernel": KERNEL, "nodes": [
                  {"id": r["id"], "nodeDigest": r["nodeDigest"]} for r in ordered]}),
              "receipts": ordered}
    result = canonical(report)
    if len(result.encode("utf-16-le")) // 2 > 262144:
        fail()
    return result


def replay(graph_text, report_text):
    try:
        return isinstance(report_text, str) and recompute(graph_text) == report_text
    except (ValueError, TypeError, OverflowError, UnicodeError, RecursionError):
        return False


def main():
    # File is generated by producer; explicit oracle labels are checked, not trusted
    # as authority in the report. Bound the bundle read independently.
    if len(sys.argv) != 2:
        raise SystemExit("usage: verify.py observation-bundle.json")
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        raw = f.read(1048577)
    bundle = load(raw, 1048576)
    cases = bundle["cases"]
    if not isinstance(cases, list) or not 1 <= len(cases) <= 100:
        fail()
    results = []
    for case in cases:
        got = replay(case["graph"], case["report"])
        if type(case["expected"]) is not bool or got != case["expected"]:
            raise SystemExit("REFERENCE_REPLAY_MISMATCH: " + case["id"])
        results.append({"id": case["id"], "accepted": got})
    print(json.dumps({"implementation": "python-fraction-hashlib", "cases": results}, indent=2))


if __name__ == "__main__":
    main()
