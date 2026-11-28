"""Independent finite-profile mapping artifact reconstruction, not a kernel or semantic proof."""
import hashlib
import json
import re
import sys
import unicodedata

MAX = 262144
ID = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,63}\Z")
RELATIONS = ("not greater than", "not higher than", "not less than", "not lower than",
             "no more than", "no less than", "greater than", "higher than",
             "less than", "lower than", "at least", "at most", "equal to")
PREFIXES = (("Is the signed relative change from ", 1),
            ("Is the signed difference from ", 1), ("Is the change from ", 2))
RESERVED = set("not no and or if unless because except than greater higher less lower equal least most more cause causes causal afterwards respectively".split())
CHANGE = set("change difference signed relative from to between percent percentage point points absolute growth increase decrease".split())

def require(ok, reason):
    if not ok:
        raise ValueError(reason)

def unique(pairs):
    out = {}
    for k, v in pairs:
        require(k not in out, "DUPLICATE_KEY")
        out[k] = v
    return out

def reject_constant(value):
    raise ValueError("NON_JSON_CONSTANT:" + value)

def pin(s):
    require(isinstance(s, str), "TEXT")
    b = s.encode("utf-8", errors="strict")
    require(0 < len(b) <= MAX, "BYTE_LIMIT")
    return "sha256:" + hashlib.sha256(b).hexdigest()

def parse(s):
    pin(s)
    return json.loads(s, object_pairs_hook=unique, parse_constant=reject_constant)

def shape(o, fields):
    require(isinstance(o, dict) and set(o) == set(fields), "SHAPE")

def units(s):
    return len(s.encode("utf-16-le")) // 2

def legal(s, change=False):
    if not isinstance(s, str) or not s or units(s) > 128:
        return False
    pieces = re.split(r"[ _-]", s)
    if any(not p or any(unicodedata.category(c)[0] not in "LMN" for c in p) for p in pieces):
        return False
    words = {p.lower() for p in pieces}
    return not words.intersection(RESERVED | (CHANGE if change else set()))

def operand(q, a, b, change):
    quote = q[a:b]
    return (units(q[:a]), units(q[:b]), quote) if legal(quote, change) else None

def positions(s, marker, start, end):
    i = s.find(marker, start)
    while 0 <= i < end:
        yield i
        i = s.find(marker, i + 1)

def matches(q):
    if units(q) > 1000 or not q.startswith("Is ") or not q.endswith("?"):
        return []
    chosen = next(((p, modes) for p, modes in PREFIXES if q.startswith(p)), None)
    prefix, modes = chosen or ("Is ", 1)
    start, end = len(prefix), len(q)-1
    result = []
    for rel in RELATIONS:
        marker = " " + rel + " "
        for i in positions(q, marker, start, end):
            right = operand(q, i+len(marker), end, bool(chosen))
            if not right:
                continue
            if not chosen:
                left = operand(q, start, i, False)
                if left:
                    result.append((1, modes, rel, {"left": left, "right": right}))
            else:
                for j in positions(q, " to ", start, i):
                    baseline = operand(q, start, j, True)
                    current = operand(q, j+4, i, True)
                    if baseline and current:
                        result.append((2, modes, rel, {"baseline": baseline, "current": current, "threshold": right}))
    return result

def verify(text, expected_artifact, expected_contract, expected_catalog):
    require(pin(text) == expected_artifact, "ARTIFACT_PIN")
    a = parse(text)
    shape(a, ("version", "contractText", "contractPin", "catalogText", "catalogPin", "preview"))
    require(a["version"] == "sutra-alias-intent-artifact/v1", "VERSION")
    require(pin(a["contractText"]) == a["contractPin"] == expected_contract, "CONTRACT_PIN")
    require(pin(a["catalogText"]) == a["catalogPin"] == expected_catalog, "CATALOG_PIN")
    contract, catalog = parse(a["contractText"]), parse(a["catalogText"])
    shape(catalog, ("version", "contractDigest", "aliases"))
    require(type(catalog["version"]) is int and catalog["version"] == 1 and catalog["contractDigest"] == expected_contract, "CATALOG")
    q = contract["question"]["text"]
    require(pin(q) == contract["question"]["digest"], "QUESTION_PIN")
    ids = {b["id"] for b in contract["bindings"]}
    require(len(ids) == len(contract["bindings"]), "DUPLICATE_BINDINGS")
    lookup = {}
    require(isinstance(catalog["aliases"], list) and len(catalog["aliases"]) <= 128, "ALIAS_LIMIT")
    for row in catalog["aliases"]:
        shape(row, ("alias", "bindingIds"))
        alias, bs = row["alias"], row["bindingIds"]
        require(legal(alias) and alias not in lookup, "ALIAS")
        require(isinstance(bs, list) and 0 < len(bs) <= 8, "BINDINGS")
        require(all(isinstance(b, str) and ID.fullmatch(b) and b in ids for b in bs) and len(set(bs)) == len(bs), "BINDING")
        lookup[alias] = sorted(bs)
    common = {"version": "sutra-alias-intent-induction/v1", "contractDigest": expected_contract,
              "catalogDigest": expected_catalog, "originalQuestion": q, "decisionAuthority": "NONE",
              "mappingAuthority": "CALLER_DECLARED_UNVERIFIED", "reviewRequired": True}
    found = matches(q)
    if len(found) != 1:
        p = dict(common, state="AMBIGUOUS_GRAMMAR" if found else "UNSUPPORTED_GRAMMAR",
                 planText=None, planPin=None, candidateCount=None, unresolved=[])
    else:
        version, count, rel, ops = found[0]
        plan = {"version": version, "contractDigest": expected_contract}
        missing = []
        for role, (start, end, quote) in ops.items():
            if quote not in lookup:
                missing.append(dict(role=role, quote=quote, start=start, end=end))
            else:
                bs = lookup[quote]
                count *= len(bs)
                plan[role] = dict(start=start, end=end, bindingIds=bs)
        if missing:
            p = dict(common, state="UNRESOLVED_BINDING", planText=None, planPin=None, candidateCount=None, unresolved=missing)
        elif count > 8:
            p = dict(common, state="CANDIDATE_LIMIT", planText=None, planPin=None, candidateCount=count, unresolved=[])
        else:
            plan_text = json.dumps(plan, ensure_ascii=False, separators=(",", ":"))
            p = dict(common, state="UNREVIEWED_PLAN", relation=rel, candidateCount=count,
                     unresolved=[], planText=plan_text, planPin=pin(plan_text))
    require(p == a["preview"], "PREVIEW_MISMATCH")
    return {"state": p["state"], "decisionAuthority": "NONE", "scope": "MAPPING_STRUCTURE_ONLY"}

if __name__ == "__main__":
    try:
        require(len(sys.argv) == 4, "EXPECTED_PINS_REQUIRED")
        raw = sys.stdin.buffer.read(MAX+1)
        require(len(raw) <= MAX, "BYTE_LIMIT")
        result = verify(raw.decode("utf-8", errors="strict"), *sys.argv[1:])
        print(json.dumps(result))
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError) as e:
        print("REFUSED: " + str(e), file=sys.stderr)
        sys.exit(1)
