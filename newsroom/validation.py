"""Editorial checks and safe manifest loading. No web facts are manufactured here."""
from __future__ import annotations
import json
from pathlib import Path
from datetime import date
from urllib.parse import urlparse
from .i18n import SUPPORTED_LANGUAGES, language, required_locale, has_devanagari

VALID_KINDS = {"reported", "inference", "scenario", "speculation"}
VALID_LAYOUTS = {"cover", "stat", "bars", "compare", "explainer", "closing"}

class ManifestError(ValueError):
    pass


def load(path: Path) -> dict:
    try:
        obj = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise ManifestError(f"Cannot read JSON manifest: {e}") from e
    validate(obj)
    return obj


def validate(obj: dict) -> None:
    errors = []
    if not isinstance(obj, dict):
        raise ManifestError("Project manifest must be an object")
    metadata = obj.get("metadata", {})
    for k in ("title", "as_of", "publisher"):
        if not str(metadata.get(k, "")).strip():
            errors.append(f"metadata.{k} is required")
    try:
        date.fromisoformat(metadata.get("as_of", ""))
    except (TypeError, ValueError):
        errors.append("metadata.as_of must be ISO date YYYY-MM-DD")
    if metadata.get("publisher", "").strip().lower() in {"al jazeera", "reuters", "bbc", "bloomberg"}:
        errors.append("Do not impersonate an established newsroom or imply affiliation")
    lang = language(metadata)
    if lang not in SUPPORTED_LANGUAGES:
        errors.append(f"metadata.language must be one of {sorted(SUPPORTED_LANGUAGES)}")
    sources = obj.get("sources", [])
    if not isinstance(sources, list):
        errors.append("sources must be an array")
        sources = []
    source_ids = set()
    for i, src in enumerate(sources):
        if not isinstance(src, dict):
            errors.append(f"sources[{i}] must be object")
            continue
        sid = str(src.get("id", ""))
        if not sid or sid in source_ids:
            errors.append(f"sources[{i}].id must be unique and nonempty")
        source_ids.add(sid)
        url = str(src.get("url", ""))
        if urlparse(url).scheme not in {"http", "https"} or not urlparse(url).netloc:
            errors.append(f"sources[{i}].url must be a real HTTP(S) source URL")
        if not src.get("title"):
            errors.append(f"sources[{i}].title required")
        if not src.get("published"):
            errors.append(f"sources[{i}].published required (date or 'undated')")
    scenes = obj.get("scenes", [])
    if not isinstance(scenes, list) or not 3 <= len(scenes) <= 30:
        errors.append("Provide 3–30 ordered scenes")
        scenes = []
    for i, s in enumerate(scenes):
        if not isinstance(s, dict):
            errors.append(f"scenes[{i}] must be object")
            continue
        for f in ("headline", "voiceover", "layout"):
            if not str(s.get(f, "")).strip():
                errors.append(f"scenes[{i}].{f} required")
        if s.get("layout") not in VALID_LAYOUTS:
            errors.append(f"scenes[{i}].layout must be one of {sorted(VALID_LAYOUTS)}")
        for name in ("cue_start", "cue_end"):
            if name in s and (not isinstance(s[name], (float, int)) or s[name] < 0):
                errors.append(f"scenes[{i}].{name} must be nonnegative number")
        if s.get("cue_end", float("inf")) <= s.get("cue_start", -1):
            errors.append(f"scenes[{i}] cue_end must exceed cue_start")
        if not isinstance(s.get("claims", []), list):
            errors.append(f"scenes[{i}].claims must be array")
        for j, cl in enumerate(s.get("claims", [])):
            if not isinstance(cl, dict):
                errors.append(f"scenes[{i}].claims[{j}] must be object")
                continue
            kind = cl.get("kind")
            if kind not in VALID_KINDS:
                errors.append(f"scenes[{i}].claims[{j}].kind invalid")
            if not cl.get("text"):
                errors.append(f"scenes[{i}].claims[{j}].text is required")
            cites = cl.get("source_ids", [])
            if not isinstance(cites, list):
                errors.append(f"scenes[{i}].claims[{j}].source_ids must be array")
                continue
            for sid in cites:
                if sid not in source_ids:
                    errors.append(f"scenes[{i}].claims[{j}] cites unknown source {sid}")
            if kind == "reported" and not cites:
                errors.append(f"scenes[{i}].claims[{j}] reported claims MUST cite at least one source")
            if kind in {"scenario", "speculation", "inference"} and not cl.get("qualifier"):
                errors.append(f"scenes[{i}].claims[{j}] analysis needs explicit qualifier")
        if s.get("layout") == "bars":
            bars = s.get("bars", [])
            if not isinstance(bars, list) or len(bars) < 2 or any(not isinstance(b, dict) or not isinstance(b.get("value"), (int, float)) or not b.get("label") for b in bars):
                errors.append(f"scenes[{i}].bars needs 2+ labelled numerical values")
        if s.get("layout") == "compare" and not (s.get("left") and s.get("right")):
            errors.append(f"scenes[{i}] compare requires left and right objects")
    voice = obj.get("voice", {})
    if not isinstance(voice, dict):
        errors.append("voice must be object")
    if lang in {"ne", "ne-en"}:
        locale = str(voice.get("locale", ""))
        if locale.lower() not in {"ne", "ne-np"}:
            errors.append("Nepali production requires voice.locale ne-NP (actual Nepali audio, not Hindi translation)")
        if not any(has_devanagari(s.get("voiceover", "")) for s in scenes):
            errors.append("Nepali production requires genuine Nepali-language narration, not an English-only storyboard")
    if voice.get("mode", "natural_external") != "natural_external":
        errors.append("Only natural_external voice mode supported; robotic automatic fallback is intentionally prohibited")
    if errors:
        raise ManifestError("Invalid project manifest:\n - " + "\n - ".join(errors))


def source_ledger(obj: dict) -> str:
    info = obj['metadata']
    lines = [f"# Editorial evidence record — {info['title']}", "", f"Cutoff: {info['as_of']}", f"Publisher: {info['publisher']} (independent explainer)", f"Language: {language(info)}", "", "## Source register", ""]
    for s in obj['sources']:
        lines.extend([f"- **{s['id']} — {s['title']}** ({s['published']}): {s['url']}",f"  - Note: {s.get('note','No note supplied')}"])
    lines.extend(["", "## Claims, evidence and editorial boundary", ""])
    for i, sc in enumerate(obj['scenes'], 1):
        for cl in sc.get('claims', []):
            lines.append(f"- Scene {i:02d} / **{cl['kind'].upper()}**: {cl['text']}")
            lines.append(f"  - Sources: {', '.join(cl.get('source_ids', [])) or 'not applicable'}")
            if cl.get('qualifier'): lines.append(f"  - Qualification: {cl['qualifier']}")
    lines.extend(["", "## Production policy", "- Reported facts must be verified against the dated source before rendering; syntactic validation cannot prove a source is truthful.", "- Scenario/inference/speculation must not be stated as reported data.", "- No implied affiliation with a named media outlet. No unsupported predictions or invented deadlines.", "- Verify media rights before importing external audio, images, or footage.", "- AI narration is synthetic, not an actual reporter.", ""])
    return "\n".join(lines)