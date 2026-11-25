#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Controllo encoding icemanai-sito (compito #251)."""
from __future__ import annotations
import pathlib, re, sys
DEFAULT_ROOT = pathlib.Path(__file__).resolve().parent
GLOB = ("*.html", "*.js", "*.css", "*.xml")
BAD_SEQUENCES = ["\u00c3\u00a8", "\u00c2\u00b7", "\u00e2\u20ac\u2122", "qualit\u00c3", "Un\u00e3"]
BAD_LITERAL = ["\u00e2\u20ac\u2122", "\u00c3\u00a8", "\u00c2\u00b7", "qualit\u00c3", "n\u00c3\u00a9", "gi\u00c3"]
BAD_PATTERNS = [
    (re.compile(r"\\u00[bB][0-9a-fA-F]{2}"), "escape u00b in sorgente"),
    (re.compile(r"\\u00[eE][0-9a-fA-F]{2}"), "escape u00e in HTML/JS"),
    (re.compile(r"(?<![a-zA-Z])Quantita(?![a-zA-Z])"), "Quantita senza accento"),
    (re.compile(r"finch\\u00e9"), "finch letterale u00e9"),
]
SKIP_DIRS = {".git", "anteprime", "node_modules", "fixture_corrotto"}
def resolve_root():
    if len(sys.argv) > 1 and sys.argv[1] == "--caso-negativo":
        return (DEFAULT_ROOT.parent.parent / "area_lavoro" / "compito251" / "fixture_corrotto").resolve()
    if len(sys.argv) > 1:
        return pathlib.Path(sys.argv[1]).resolve()
    return DEFAULT_ROOT
def scan_file(path):
    text = path.read_text(encoding="utf-8")
    issues = []
    for seq in BAD_SEQUENCES + BAD_LITERAL:
        if seq in text:
            issues.append("seq " + repr(seq))
    for rx, msg in BAD_PATTERNS:
        if rx.search(text):
            issues.append(msg)
    if path.suffix == ".html" and "<meta charset" in text and "utf-8" not in text[:2500].lower():
        issues.append("charset")
    return issues
def main():
    root = resolve_root()
    if not root.is_dir():
        print("missing", root); return 2
    hits = []
    for pattern in GLOB:
        for path in root.rglob(pattern):
            if root.resolve() != (DEFAULT_ROOT.parent.parent / "area_lavoro" / "compito251" / "fixture_corrotto").resolve() and any(p in SKIP_DIRS for p in path.parts): continue
            if path.name == "verifica_encoding_pre_publish.py": continue
            for issue in scan_file(path):
                hits.append(f"{path.relative_to(root)}: {issue}")
    if hits:
        print("ENCODING CHECK FAILED", root)
        for h in hits: print(h)
        return 1
    print("ENCODING CHECK OK", root); return 0
if __name__ == "__main__": raise SystemExit(main())